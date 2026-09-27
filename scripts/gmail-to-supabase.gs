/**
 * FreeBox: ส่งอีเมลแจ้งเตือนธนาคารจาก Gmail ไปที่ Supabase
 *
 * รันใน Google Apps Script (script.google.com) ด้วยบัญชี Google ของตัวเอง ฟรี ไม่ต้องมีเซิร์ฟเวอร์
 * วิธีติดตั้งทีละขั้น: ดู docs/SETUP.md หัวข้อ "ดึงอีเมลธนาคาร"
 *
 * การทำงาน (ทุก 10 นาที):
 *   1. หาอีเมลที่มีป้าย "bank" (ตั้งฟิลเตอร์ Gmail ให้ติดป้ายนี้กับอีเมลจากธนาคาร)
 *   2. ส่งเนื้อหาไปที่ Edge Function ingest-bank-email
 *   3. ส่งสำเร็จ → เปลี่ยนป้ายเป็น "bank-done" จะได้ไม่ส่งซ้ำรอบหน้า
 *      ส่งไม่สำเร็จ → ป้ายยังเป็น "bank" รอบหน้าลองใหม่เอง
 *
 * ค่าลับ (ตั้งที่ Project Settings > Script Properties ห้ามเขียนลงในโค้ดนี้):
 *   FUNCTION_URL   = https://<project>.supabase.co/functions/v1/ingest-bank-email
 *   INGEST_SECRET  = รหัสลับเดียวกับที่ตั้งใน Supabase
 */

var TODO_LABEL = 'bank';
var DONE_LABEL = 'bank-done';
var BATCH = 20; // ส่งทีละไม่เกิน 20 เธรด กันสคริปต์ทำงานนานเกินเวลาที่ Google ให้

function syncBankEmails() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('FUNCTION_URL');
  var secret = props.getProperty('INGEST_SECRET');
  if (!url || !secret) throw new Error('ยังไม่ได้ตั้ง FUNCTION_URL / INGEST_SECRET ใน Script Properties');

  var todo = GmailApp.getUserLabelByName(TODO_LABEL);
  if (!todo) throw new Error('ไม่พบป้าย "' + TODO_LABEL + '" ใน Gmail');
  var done = GmailApp.getUserLabelByName(DONE_LABEL) || GmailApp.createLabel(DONE_LABEL);

  var threads = todo.getThreads(0, BATCH);
  if (threads.length === 0) return;

  // เธรดหนึ่งอาจมีหลายอีเมล ส่งทุกฉบับ (ฝั่ง Supabase กันซ้ำด้วย external_id อยู่แล้ว)
  var emails = [];
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (m) {
      emails.push({
        id: m.getId(),
        from: m.getFrom(),
        subject: m.getSubject(),
        body: m.getPlainBody().slice(0, 5000), // ตัดให้สั้น ส่วนสำคัญอยู่ต้นอีเมลเสมอ
        date: m.getDate().toISOString(),
      });
    });
  });

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-ingest-secret': secret },
    payload: JSON.stringify({ emails: emails }),
    muteHttpExceptions: true, // ไม่ให้ error ตัดจบ จะได้อ่านข้อความตอบกลับและ log ไว้
  });

  if (res.getResponseCode() !== 200) {
    // ไม่ย้ายป้าย รอบหน้าจะลองใหม่ ดู log ได้ที่ Executions ใน Apps Script
    throw new Error('ส่งไม่สำเร็จ ' + res.getResponseCode() + ': ' + res.getContentText());
  }

  threads.forEach(function (thread) {
    thread.addLabel(done);
    thread.removeLabel(todo);
  });
  Logger.log(res.getContentText());
}

/** รันฟังก์ชันนี้ครั้งเดียว เพื่อตั้งเวลาให้ syncBankEmails ทำงานเองทุก 10 นาที */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncBankEmails') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncBankEmails').timeBased().everyMinutes(10).create();
}
