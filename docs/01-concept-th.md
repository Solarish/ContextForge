# แนวคิด ContextForge

ContextForge เป็นประตูเข้าบริบทของหลายโครงการผ่าน MCP และเป็นคลังรายงาน HTML ถาวร แต่ละ `projectId` กำหนด Report, Wiki และกฎของตนเอง การค้นปกติอยู่ภายในโครงการที่เลือก ผลแรกเป็น metadata สั้น แล้ว agent อ่านเฉพาะเอกสารหรือหัวข้อที่จำเป็น

รายงานใหม่ส่งข้อมูลตาม schema พร้อมแหล่งอ้างอิงและชนิดแม่แบบ Server สร้าง snapshot และ URL กลาง รายงาน HTML เดิมอยู่ใน catalog เพื่ออ่านย้อนหลัง เครื่องมือ production และ secret อยู่ใน ContextForge Private Ops ซึ่งเป็น repo private แยกต่างหาก

Agent หลายตัวทำงานตามบทบาทที่ผู้ใช้มอบหมาย ไม่มีกระดาน session, CLI dispatcher หรือระบบ spawn agent ใน gateway
