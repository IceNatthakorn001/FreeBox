import Card from './components/Card'

function App() {
  return (
    <div>
      <h1>FreeBox</h1>
      <Card title="เงิน" description="ใช้ไปวันนี้ 0 บาท" />
      <Card title="การบ้าน" description="ยังไม่มีการบ้าน" />
      <Card title="โน้ต" description="ยังไม่มีโน้ต" />
    </div>
  )
}

export default App