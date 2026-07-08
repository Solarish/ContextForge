# แนวคิด ContextForge

[Updated by: codex | Time: 2026-05-25 08:54:27 +0700]

## สรุป

ContextForge คือรูปแบบการจัดการความรู้สำหรับโปรเจคที่มีหลาย repo, หลาย agent, และมีเอกสารจำนวนมากจน agent มักตกบริบท

แนวคิดหลักคือแยกหน้าที่ให้ชัด:

```text
Canonical Report = ความจริงหลักของโปรเจค
LLM Wiki = แผนที่นำทาง concept และ business logic
Gateway = runtime เดียวที่เปิด dashboard, REST API, MCP (+ orchestrator)
MCP Tools = ทางเข้าหลักที่ agent ใช้ดึง context และส่งไม้ต่อ
Dashboard = หน้าให้มนุษย์ดูสถานะ source, issue, mindmap, drift, และ agent run
```

> **สองชั้น (Two Layers):** ContextForge V1 คือ **context layer** — บังคับให้ agent
> โหลด source ให้ครบก่อนทำงาน. V2 เพิ่ม **orchestration layer** — ให้ agent หลายตัว
> ส่งงานต่อกันเองผ่าน session channel และให้มนุษย์คุม/kill run ได้จาก dashboard เดียว
> (รายละเอียดใน `06-orchestrator.md`)

## เหตุผล

ปัญหาที่รูปแบบนี้แก้:

- Agent อ่านไฟล์ไม่ครบ แล้วตัดสินใจจาก context เก่า
- Wiki กับ report drift กัน
- เอกสารสำคัญอยู่ในหลายที่ แต่ไม่มี source gate บังคับโหลด
- คนเห็นภาพรวมยาก ต้องไล่เปิด Markdown หลายไฟล์
- Agent ใหม่เสียเวลา search ซ้ำทุกครั้ง
- Issue, decision, mindmap ไม่ผูกกลับ source evidence

## หลักการ

1. Report เป็น source of truth
   - แก้ architecture, issue, checkpoint, decision ที่นี่ก่อน
   - ทุกไฟล์สำคัญควรมี stamp ว่าใครแก้และเมื่อไร

2. Wiki เป็น navigation ไม่ใช่ truth
   - Wiki ช่วยหา concept เร็ว
   - อ่านเฉพาะหน้าที่ link จาก `index.md`
   - ถ้า Wiki ขัดกับ Report ให้ถือว่า Report ชนะ

3. MCP ต้องเป็น gate ไม่ใช่แค่ search
   - ก่อน agent plan/write ต้องเรียก context bundle
   - ถ้า source สำคัญไม่ครบ ต้อง return `blocked_missing_sources`
   - ถ้ามี drift ต้อง return `conflict_needs_user`

4. Docker ทำให้ runtime ไม่กระจัดกระจาย
   - Dashboard, REST API, MCP server อยู่ container เดียว
   - Mount report และ wiki แบบชัดเจน
   - Deploy หรือย้ายเครื่องง่าย

5. Mindmap คือ human decision artifact
   - ใช้แสดง relationship, issue, blocker, ownership
   - ต้องมี source panel และ issue links
   - ไม่ใช้สีอย่างเดียว ต้องมี label/shape/pattern สำหรับ accessibility

## ข้อดี

- Agent ไม่ต้องเดาว่าควรอ่านไฟล์ไหนก่อน
- ลด context drift ระหว่าง Markdown, Wiki, และ code
- ทำให้ issue/decision มี provenance ชัดเจน
- Human เห็นภาพรวมผ่าน dashboard/mindmap
- ใช้ซ้ำกับโปรเจคอื่นได้ เพราะแยก report/wiki/gateway ออกจากกัน
- Docker ทำให้ setup ง่ายกว่า manual local service หลายตัว
- MCP ทำให้ agent ใช้ข้อมูลเร็วกว่าไล่ grep เองทุกครั้ง

## ข้อเสีย

- ต้องดูแล context rules ไม่งั้น source gate จะตกเอกสารสำคัญ
- ถ้า refresh index ไม่สม่ำเสมอ agent อาจเห็นข้อมูลเก่า
- ต้องมีวินัยว่า Report คือ canonical ไม่อย่างนั้น Wiki จะกลายเป็น truth อีกชุด
- เพิ่ม runtime อีกชั้นหนึ่งที่ต้อง monitor
- ถ้า MCP tool ออกแบบกว้างเกินไป agent อาจได้ context มากเกินจำเป็น
- ต้องคิดเรื่อง secret/mount permission ให้ดี โดยเฉพาะถ้าเอาไปใช้กับโปรเจคจริง

## ควรใช้เมื่อไร

เหมาะกับ:

- โปรเจคหลาย repo
- งานที่มี agent หลายตัวช่วยกัน
- ระบบที่มี architecture decision เยอะ
- โปรเจคที่มี issue/checkpoint/handoff บ่อย
- งานที่ต้องให้ human ตัดสินใจจากภาพรวม

ไม่จำเป็นสำหรับ:

- repo เล็กไฟล์น้อย
- prototype ที่ยังไม่มี architecture คงที่
- งานเดี่ยวที่ไม่มี agent handoff

## Orchestration Layer (V2) — Multi-Agent Command Center

context layer อย่างเดียวแก้ปัญหา "agent อ่านไม่ครบ" แต่พอมี agent หลายค่าย
(เช่น หลาย CLI) ทำงานร่วมกัน จะเจอปัญหาใหม่: ใครทำอะไรอยู่, ส่งงานต่อกันยังไง,
แล้วมนุษย์จะหยุดมันตอนไหน. V2 เพิ่มชั้น orchestration ที่ **รวมอยู่ใน gateway process
เดียวกัน** (ไม่มี daemon แยก):

1. **Session Channel = ช่องส่งงานรอบต่อรอบ**
   - agent สื่อสารกันผ่าน "card" (`in_progress` / `blocked` / `needs_decision` / `done`)
   - ห้ามใช้ `reports/` หรือ `checkpoints/` สำหรับ status ประจำรอบ — ใช้ session card เท่านั้น
   - card เป็นกระดานประสานงาน ไม่ใช่หลักฐานว่างานเสร็จจริง ต้อง verify artifact เสมอ

2. **Self-Declared Roles = agent claim role เอง**
   - routing ยึด `participants` (role ที่ agent ประกาศเอง) เหนือค่า default ของ session
   - `lead` วางแผน/review, `worker` ลงมือ, `coordinator` = มนุษย์ (ผู้ตัดสินใจ)
   - claim role ที่ registry ไม่ให้ capability = permanent fail ไม่ retry

3. **Event-Driven Dispatch = ไม่ polling**
   - พอมี card ใหม่ → hook → dispatch agent ตัวถัดไปทันที (~ms) + มี fs.watch และ safety sweep กันพลาด

4. **Agent Registry = พ่วง agent ได้ทุกค่าย (hot reload)**
   - `agent-registry.json` ประกาศ agent, capabilities, concurrency, runner path, enable/disable
   - แก้ไฟล์แล้ว reload อัตโนมัติ ไม่ต้อง restart. runnerPath ต้องอยู่ใน allowed root เท่านั้น

5. **Multi-Level Kill Switch = มนุษย์คุมได้เสมอ**
   - Pause / kill รายเซสชัน / kill รายเอเจนต์ / Hard stop (ฆ่าทุกอย่าง + flip เป็น dry-run)
   - งานที่ใช้เงินจริงต้องจบด้วย cleanup + verify เสมอ ห้ามทิ้ง run ค้าง

6. **Env Control Plane = จัดการ secret ผ่าน gateway**
   - No raw secrets — โชว์แค่ presence/metadata. แก้ผ่าน `env_set`/`env_sync` เท่านั้น (audit ครบ)

## Golden Rule

```text
Agent ต้องไม่เริ่มจากการเดาไฟล์เอง
Agent ต้องเริ่มจาก context bundle และ source gate ก่อน
งานหลาย agent: claim role → อ่าน card ล่าสุดของ lead → แล้วค่อยลงมือ
```

