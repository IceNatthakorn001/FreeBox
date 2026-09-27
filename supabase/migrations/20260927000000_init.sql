-- =====================================================================
-- FreeBox: ตารางทั้งหมดของแอป (migration แรก)
--
-- วิธีใช้: เปิด Supabase > SQL Editor > วางทั้งไฟล์ > Run
-- กฎ: ต่อไปถ้าจะเปลี่ยนตาราง ให้สร้างไฟล์ migration ใหม่ (ชื่อขึ้นต้นด้วยวันเวลา)
--      ห้ามแก้ไฟล์นี้ย้อนหลัง จะได้รู้ประวัติว่าฐานข้อมูลเปลี่ยนมายังไง
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ฟังก์ชันช่วย: อัปเดต updated_at ให้อัตโนมัติทุกครั้งที่แก้แถว
--    ไม่ต้องจำไปใส่เองในโค้ดหน้าเว็บ ฐานข้อมูลทำให้เอง
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 2) categories: หมวดรายรับ-รายจ่าย เช่น อาหาร น้ำมัน เงินเดือน
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  -- default auth.uid() = ใส่ id ของคนที่ล็อกอินอยู่ให้เอง หน้าเว็บไม่ต้องส่งมา
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  type        text not null check (type in ('income', 'expense')),
  icon        text not null default '•',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz            -- ลบแบบซ่อน: มีค่า = ถูกลบแล้ว
);


-- ---------------------------------------------------------------------
-- 3) transactions: รายการเงินแต่ละรายการ
-- ---------------------------------------------------------------------
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occurred_at    timestamptz not null default now(),       -- เกิดขึ้นเมื่อไหร่ (timestamptz = เก็บเขตเวลาด้วย)
  amount_satang  bigint not null check (amount_satang >= 0), -- เงินเป็น "สตางค์" จำนวนเต็ม กันทศนิยมเพี้ยน
  type           text not null check (type in ('income', 'expense')),
  category_id    uuid references public.categories (id),
  note           text not null default '',
  source         text not null default 'manual' check (source in ('manual', 'email', 'bank')),
  external_id    text,          -- เลขอ้างอิงจากอีเมลธนาคาร ใช้กันรายการซ้ำ
  status         text not null default 'confirmed' check (status in ('confirmed', 'pending')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- อีเมลเดียวกันส่งมาซ้ำกี่รอบ ก็บันทึกได้แค่ครั้งเดียว (ต่อผู้ใช้หนึ่งคน)
-- รายการที่เพิ่มเอง external_id เป็น null ได้หลายแถว เพราะใน Postgres ค่า null ไม่นับว่าซ้ำกัน
alter table public.transactions
  add constraint transactions_user_external_id_key unique (user_id, external_id);

-- index ช่วยให้ดึง "รายการของฉัน เรียงตามวัน" ได้เร็ว
create index transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);


-- ---------------------------------------------------------------------
-- 4) homework: การบ้าน
-- ---------------------------------------------------------------------
create table public.homework (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject     text not null check (length(trim(subject)) > 0),
  detail      text not null default '',
  due_at      timestamptz not null,
  is_done     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index homework_user_due_idx on public.homework (user_id, due_at);


-- ---------------------------------------------------------------------
-- 5) notes: โน้ต
-- ---------------------------------------------------------------------
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default '',
  content     text not null default '',
  tags        text[] not null default '{}',   -- array ของข้อความ เช่น {'เรียน','ไอเดีย'}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index notes_user_updated_idx on public.notes (user_id, updated_at desc);


-- ---------------------------------------------------------------------
-- 6) ผูก trigger updated_at กับทุกตาราง
-- ---------------------------------------------------------------------
create trigger categories_updated_at   before update on public.categories   for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger homework_updated_at     before update on public.homework     for each row execute function public.set_updated_at();
create trigger notes_updated_at        before update on public.notes        for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 7) RLS (Row Level Security): ด่านความปลอดภัยที่สำคัญที่สุด
--
--    anon key ที่อยู่ในหน้าเว็บ ใครเปิด DevTools ก็เห็น
--    สิ่งที่กันไม่ให้คนอื่นอ่านข้อมูลเรา คือกฎตรงนี้ ไม่ใช่การซ่อนคีย์
--    กฎ: ทุกแถวอ่าน/เพิ่ม/แก้ได้เฉพาะเมื่อ user_id = คนที่ล็อกอินอยู่
--    ไม่มีกฎ delete เลย = ลบจริงจากหน้าเว็บไม่ได้ ต้องลบแบบซ่อน (deleted_at) เท่านั้น
-- ---------------------------------------------------------------------
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.homework     enable row level security;
alter table public.notes        enable row level security;

create policy "own rows: select" on public.categories for select using (user_id = auth.uid());
create policy "own rows: insert" on public.categories for insert with check (user_id = auth.uid());
create policy "own rows: update" on public.categories for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows: select" on public.transactions for select using (user_id = auth.uid());
create policy "own rows: insert" on public.transactions for insert with check (user_id = auth.uid());
create policy "own rows: update" on public.transactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows: select" on public.homework for select using (user_id = auth.uid());
create policy "own rows: insert" on public.homework for insert with check (user_id = auth.uid());
create policy "own rows: update" on public.homework for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows: select" on public.notes for select using (user_id = auth.uid());
create policy "own rows: insert" on public.notes for insert with check (user_id = auth.uid());
create policy "own rows: update" on public.notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 8) หมวดตั้งต้น: สมัครสมาชิกปุ๊บ มีหมวดให้ใช้ทันที
--    security definer = ฟังก์ชันนี้รันด้วยสิทธิ์เจ้าของฐานข้อมูล
--    จำเป็นเพราะตอนสมัคร ผู้ใช้ยังไม่ได้ล็อกอิน RLS จะไม่ยอมให้ insert
-- ---------------------------------------------------------------------
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, icon, sort_order) values
    (new.id, 'อาหาร',       'expense', '🍜', 1),
    (new.id, 'เดินทาง',     'expense', '⛽', 2),
    (new.id, 'ค่าหอ',       'expense', '🏠', 3),
    (new.id, 'ค่าโทรศัพท์', 'expense', '📱', 4),
    (new.id, 'ของใช้',      'expense', '🛒', 5),
    (new.id, 'อื่น ๆ',      'expense', '•',  99),
    (new.id, 'เงินเดือน/ค่าขนม', 'income', '💰', 1),
    (new.id, 'รายรับอื่น',  'income',  '•',  99);
  return new;
end;
$$;

create trigger on_auth_user_created_seed_categories
  after insert on auth.users
  for each row execute function public.seed_default_categories();
