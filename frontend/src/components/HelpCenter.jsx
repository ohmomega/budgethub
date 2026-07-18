import React, { useState } from 'react';
import {
  HelpCircle,
  Building2,
  Layers,
  FileSpreadsheet,
  LayoutDashboard,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  CornerDownLeft,
  Lock,
  CheckSquare,
  Download,
  Sparkles,
  ChevronDown,
  Lightbulb,
  ArrowRight,
  MousePointerClick,
  DatabaseBackup,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

// A self-contained, always-available user guide. Written so a first-time,
// non-technical user can follow it top-to-bottom. Bilingual (TH/EN) driven by
// the `lang` prop; every string lives in the `L` dictionary below.
const L = {
  TH: {
    title: 'คู่มือการใช้งาน',
    subtitle: 'อ่านทีละหัวข้อเพื่อเรียนรู้การใช้งาน BudgetHub ตั้งแต่เริ่มต้น',
    reopenSetup: 'เปิดตัวช่วยตั้งค่าเริ่มต้น',
    tip: 'เคล็ดลับ',
    stepsLabel: 'ขั้นตอน',
    sections: {
      start: 'เริ่มต้นใช้งาน (3 ขั้นตอน)',
      dept: 'การจัดการแผนก',
      cc: 'การจัดการศูนย์ต้นทุน',
      grid: 'การกรอกข้อมูลในแผ่นงบประมาณ',
      dashboard: 'แผงควบคุมและรายงาน',
      backup: 'สำรอง & กู้คืนข้อมูล',
      faq: 'คำถามที่พบบ่อย',
    },
    startIntro: 'ครั้งแรกที่เปิดโปรแกรม ให้ทำ 3 ขั้นตอนนี้ตามลำดับ จากนั้นก็เริ่มกรอกงบประมาณได้เลย',
    startSteps: [
      'สร้าง "แผ่นงบประมาณ" (เมนู แผ่นงบประมาณ) — เลือกเดือน/ปี เพื่อเริ่มต้น',
      'สร้าง "แผนก" ที่เมนู "จัดการแผนก" หรือเพิ่มจากในแผ่นงานก็ได้',
      'เพิ่ม "ศูนย์ต้นทุน" — สร้างจากเมนูศูนย์ต้นทุน หรือพิมพ์รหัสใหม่ในช่องศูนย์ต้นทุนของแต่ละแถว',
    ],
    deptSteps: [
      'ไปที่เมนู "จัดการแผนก" กดปุ่ม "เพิ่มแผนก" แล้วพิมพ์ชื่อแผนก (เช่น บัญชี) — ระบบจะสร้างรหัสให้อัตโนมัติ',
      'กดไอคอนดินสอเพื่อแก้ไขชื่อแผนก หรือกดปุ่มสถานะเพื่อเปิด/ระงับการใช้งาน',
      'ลบแผนกได้ด้วยไอคอนถังขยะ โดยจะมีหน้าต่างให้ยืนยันก่อนเสมอ',
      'แผนกที่ยังมีข้อมูลงบประมาณอยู่จะลบไม่ได้ ต้องลบข้อมูล/แผ่นงานของแผนกนั้นให้หมดก่อน จึงจะลบแผนกได้',
      'นอกจากนี้ยังเพิ่ม/แก้ไข/ลบแผนกได้จากในแผ่นงาน (ปุ่มไอคอนอาคาร ＋ และฟันเฟือง ที่มุมขวาบน)',
    ],
    deptTip: 'จัดการแผนกได้ทั้งที่หน้า "จัดการแผนก" และจากในแผ่นงานโดยตรง — แต่แผนกที่ยังมีข้อมูลอยู่จะลบไม่ได้จนกว่าจะลบข้อมูลนั้นก่อน',
    ccSteps: [
      'ไปที่เมนู "ศูนย์ต้นทุน" แล้วกดปุ่ม "สร้างศูนย์ต้นทุน"',
      'กรอกรหัสศูนย์ต้นทุน (เช่น 1234567890) และชื่อ แล้วกดบันทึก',
      'รหัสศูนย์ต้นทุนใช้ร่วมกันได้ทุกแผนก ไม่ต้องเลือกแผนกที่สังกัด',
      'หรือเพิ่มได้เร็ว ๆ จากในแผ่นงาน โดยคลิกช่อง "รหัสศูนย์ต้นทุน" แล้วกด "เพิ่มศูนย์ต้นทุนใหม่"',
    ],
    ccTip: 'ตอนนี้ "รหัสศูนย์ต้นทุน" แก้ไขได้แล้วหลังสร้าง (กดไอคอนดินสอเพื่อแก้ รหัสใหม่ต้องไม่ซ้ำกับที่มีอยู่)',
    gridSteps: [
      'เปิดแผ่นงบประมาณ แล้วกดปุ่ม "เพิ่มแถว" เพื่อเพิ่มรายการใหม่',
      'คลิกที่ช่องเพื่อพิมพ์ข้อมูล เช่น รหัสบัญชี ชื่อรายการ และจำนวนเงิน',
      'กด Enter เพื่อยืนยันข้อมูลในช่องนั้น หรือคลิกออกนอกช่องก็บันทึกอัตโนมัติ (กด Esc เพื่อยกเลิก)',
      'เลือกศูนย์ต้นทุนจากช่อง "รหัสศูนย์ต้นทุน" — พิมพ์เพื่อค้นหา หรือกด "เพิ่มศูนย์ต้นทุนใหม่" เพื่อสร้างทันที',
      'ภาษี 7% และราคารวม ระบบคำนวณให้อัตโนมัติ',
      'ติ๊กช่อง "ตัดงบทำการ" หากต้องการให้รายการนั้นถูกนับในยอดตัดงบ',
      'จัดลำดับแถวได้ด้วยการลากแถว หรือกดลูกศรขึ้น/ลง และลบแถวด้วยไอคอนถังขยะ',
      'เมื่อกด "ยืนยันแผ่นงาน" แผ่นงานจะถูกล็อก หากต้องการแก้ไขอีกครั้งให้กดปุ่ม "ยกเลิกการยืนยัน"',
    ],
    gridTip: 'ตารางถูกปรับให้พอดีหน้าจอแล้ว ไม่ต้องเลื่อนซ้าย-ขวา — กด Enter เพื่อยืนยันแต่ละช่องได้รวดเร็ว',
    dashboardSteps: [
      'หน้า "แผงควบคุม" แสดงยอดรวมสุทธิและยอดตัดงบของงวดล่าสุด พร้อมกราฟเปรียบเทียบ',
      'เลือกช่วงเวลาของกราฟได้ที่ปุ่ม "ทั้งปี" (ค่าเริ่มต้น) / "เดือนนี้" / "กำหนดเอง" — ถ้าเลือก "กำหนดเอง" จะเลือกได้หลายเดือนแบบไม่ต่อเนื่อง เช่น ก.พ., มิ.ย., ส.ค.',
      'หัวข้อกราฟจะเปลี่ยนเป็น "การเปรียบเทียบรายเดือน" เมื่อเลือกเดือนเดียว หรือ "การเปรียบเทียบรายปี" เมื่อเลือกทั้งปีหรือหลายเดือน',
      'กราฟ "สัดส่วนตามศูนย์ต้นทุน" ด้านขวาจะรวมข้อมูลตามช่วงเวลาที่เลือกไว้เช่นกัน ไม่ได้ยึดติดแค่เดือนปัจจุบันเหมือนเดิม',
      'กด "ดูรายงานสรุป" เพื่อดูกราฟทั้งปีแบบ 2 แท่งต่อเดือน — ยอดรวมสุทธิ (สีเขียว) และ งบทำการที่ตัด (สีชมพู)',
      'ส่งออกเป็นไฟล์ PDF, Excel หรือรูปภาพ (JPG) ได้ โดยกราฟในไฟล์ PDF และ JPG จะแสดง 2 แท่งเหมือนบนหน้าจอ',
      'ในแต่ละแผ่นงบประมาณ กดปุ่ม "ส่งออก PDF" หรือ "ส่งออก Excel" เพื่อบันทึกไฟล์รายงาน หรือที่หน้า "แผ่นงบประมาณ" ติ๊กเลือกได้หลายเดือน แล้วกด "ส่งออกที่เลือกเป็น Excel" เพื่อรวมเป็นไฟล์เดียว (หน้าสรุป + รายละเอียดของแต่ละเดือนที่เลือก)',
    ],
    backupSteps: [
      'ไปที่เมนู "สำรอง & กู้คืนข้อมูล" ทางแถบด้านซ้าย',
      'กด "ดาวน์โหลดไฟล์สำรองข้อมูล" เพื่อเก็บสำเนาข้อมูลทั้งหมด (ทุกแผนก ทุกแผ่นงบประมาณ) เป็นไฟล์เดียว — ไฟล์จะถูกบันทึกไว้ที่โฟลเดอร์ดาวน์โหลด (Downloads) ของเครื่องโดยอัตโนมัติ ย้ายไปเก็บที่อื่นได้ตามต้องการ เช่น ไดรฟ์ภายนอก',
      'เมื่อจะกู้คืนข้อมูล กด "เลือกไฟล์เพื่อกู้คืน" แล้วเลือกไฟล์ .bhbackup ที่เคยสำรองไว้ ระบบจะให้ยืนยันก่อนเสมอ เพราะการกู้คืนจะแทนที่ข้อมูลปัจจุบันทั้งหมดและย้อนกลับไม่ได้',
      'กู้คืนสำเร็จแล้ว โปรแกรมจะปิดและเปิดขึ้นใหม่ให้เองโดยอัตโนมัติ',
    ],
    backupAutoNote: 'นอกจากนี้ ทุกครั้งที่ปิดโปรแกรม ระบบจะสำรองข้อมูลให้อัตโนมัติเสมอ โดยเก็บไว้ 2 ไฟล์ล่าสุด (ไฟล์ปัจจุบันและไฟล์ก่อนหน้า) ไว้ในโฟลเดอร์ข้อมูลของโปรแกรมเอง ไม่ต้องกดอะไรเพิ่ม และไม่กินพื้นที่เครื่องเพิ่มขึ้นเรื่อย ๆ',
    backupTip: 'ไฟล์สำรองข้อมูลถูกเข้ารหัสและมีการตรวจสอบว่าไม่ถูกแก้ไข ระบบจะกู้คืนให้เฉพาะไฟล์ .bhbackup ของ BudgetHub เท่านั้น ไฟล์ประเภทอื่น หรือไฟล์ที่ถูกแก้ไข/เสียหาย จะถูกปฏิเสธทันทีเพื่อความปลอดภัยของข้อมูล',
    faq: [
      { q: 'กดปุ่ม "เพิ่มแถว" แล้วไม่มีอะไรเกิดขึ้น?', a: 'เป็นเพราะยังไม่มีแผนกในแผ่นงานนี้ ให้พิมพ์ชื่อแผนกในช่องที่ปรากฏแล้วกดเพิ่ม จากนั้นจึงกรอกรายการได้' },
      { q: 'ยืนยันแผ่นงานไปแล้ว แก้ไขได้ไหม?', a: 'ได้ กดปุ่ม "ยกเลิกการยืนยัน" ที่มุมขวาบนของแผ่นงาน แผ่นงานจะกลับมาเป็นแบบร่างและแก้ไขได้อีกครั้ง' },
      { q: 'แก้ไขรหัสศูนย์ต้นทุนได้ไหม?', a: 'ได้ กดไอคอนดินสอที่ศูนย์ต้นทุนนั้น แล้วแก้รหัสได้เลย (ต้องไม่ซ้ำกับรหัสอื่น)' },
      { q: 'ส่งออกหลายเดือนพร้อมกันได้ไหม?', a: 'ได้ ที่หน้า "แผ่นงบประมาณ" ติ๊กเลือกได้หลายเดือน แล้วกด "ส่งออกที่เลือกเป็น Excel" จะได้ไฟล์เดียวที่มีหน้าสรุปรวม ตามด้วยรายละเอียดของแต่ละเดือนที่เลือก' },
      { q: 'ไฟล์สำรองข้อมูลอัตโนมัติเก็บไว้ที่ไหน?', a: 'อยู่ในโฟลเดอร์ข้อมูลของโปรแกรมเอง (สร้างให้อัตโนมัติ ไม่ต้องเข้าไปยุ่ง) ถ้าต้องการไฟล์สำรองที่เลือกตำแหน่งเก็บเองได้ ให้ใช้ปุ่ม "ดาวน์โหลดไฟล์สำรองข้อมูล" ที่หน้า "สำรอง & กู้คืนข้อมูล" แทน ไฟล์จะไปอยู่ในโฟลเดอร์ดาวน์โหลด (Downloads)' },
      { q: 'กู้คืนไฟล์อื่นที่ไม่ใช่ของ BudgetHub ได้ไหม?', a: 'ไม่ได้ ระบบตรวจสอบไฟล์ก่อนกู้คืนเสมอ ถ้าไม่ใช่ไฟล์ .bhbackup ของ BudgetHub หรือไฟล์ถูกแก้ไข/เสียหาย จะถูกปฏิเสธทันทีเพื่อความปลอดภัยของข้อมูล' },
      { q: 'ข้อมูลเก็บไว้ที่ไหน?', a: 'ข้อมูลทั้งหมดถูกเก็บในเครื่องของคุณ (ออฟไลน์) ไม่ได้ส่งขึ้นอินเทอร์เน็ต' },
    ],
    goNow: 'ไปที่หน้านี้',
  },
  EN: {
    title: 'Help & User Guide',
    subtitle: 'Read section by section to learn BudgetHub from the ground up.',
    reopenSetup: 'Open the setup assistant',
    tip: 'Tip',
    stepsLabel: 'Steps',
    sections: {
      start: 'Getting started (3 steps)',
      dept: 'Managing departments',
      cc: 'Managing cost centers',
      grid: 'Filling in a budget sheet',
      dashboard: 'Dashboard & reports',
      backup: 'Backup & Restore',
      faq: 'Frequently asked questions',
    },
    startIntro: 'The first time you open the app, do these 3 steps in order, then you can start entering budgets.',
    startSteps: [
      'Create a Budget Sheet (Budget Sheets menu) — pick a month/year to begin.',
      'Create a Department — from the "Departments" page, or add one inside a sheet.',
      'Add a Cost Center — from the Cost Centers menu, or type a new code in a row’s cost-center cell.',
    ],
    deptSteps: [
      'Open the "Departments" menu, click "Add Department" and type a name (e.g. Accounting) — the code is generated automatically.',
      'Click the pencil icon to rename a department, or the status button to activate/suspend it.',
      'Delete a department with the trash icon — it always asks you to confirm first.',
      'A department that still has budget data cannot be deleted; remove its data / sheets first, then delete it.',
      'You can also add / edit / delete departments inside a sheet (the building ＋ and gear buttons at the top right).',
    ],
    deptTip: 'Manage departments from the "Departments" page or right inside a sheet — but a department that still has data can’t be deleted until you remove that data.',
    ccSteps: [
      'Open the "Cost Centers" menu and click "Create Cost Center".',
      'Enter the cost center code (e.g. 1234567890) and a name, then save.',
      'Cost center codes are shared across all departments — there’s no department to pick.',
      'Or add one quickly from the sheet: click a "Cost Center" cell and press "Add new cost center".',
    ],
    ccTip: 'The cost center code is now editable after creation (click the pencil icon) — the new code just has to be unique.',
    gridSteps: [
      'Open a budget sheet and click "Add Row" to add a new entry.',
      'Click a cell to type into it, e.g. account code, item name and amount.',
      'Press Enter to confirm a cell, or click away to auto-save (press Esc to cancel).',
      'Pick a cost center in the "Cost Center" cell — type to search, or press "Add new cost center" to create one instantly.',
      'VAT (7%) and the total are calculated automatically.',
      'Tick "Deduct Budget" to include a row in the deducted total.',
      'Reorder rows by dragging them or using the up/down arrows; delete a row with the trash icon.',
      'After "Finalize Sheet" the sheet is locked — to edit it again, click "Reopen".',
    ],
    gridTip: 'The table now fits your screen — no left/right scrolling. Press Enter to confirm each cell quickly.',
    dashboardSteps: [
      'The "Dashboard" shows the latest period’s net and deducted totals plus a comparison chart.',
      'Pick the chart\'s time range with "Whole Year" (default) / "This Month" / "Custom" — Custom lets you pick any set of months, e.g. Feb, Jun, Aug.',
      'The chart title switches to "Monthly Comparison" when exactly one month is selected, or "Yearly Comparison" for the whole year or several months.',
      'The "Allocation by Cost Center" panel on the right follows the same selected time range too, not just the current month like before.',
      'Click "View Summary Report" for the full-year chart with two bars per month — Net Total (teal) and Budget Cut (pink).',
      'Export it as PDF, Excel or an image (JPG) — the PDF and JPG charts show the same two bars as on screen.',
      'Inside any sheet, use "Export PDF" or "Export Excel" to save a report file — or on the "Budget Sheets" page, tick several months and click "Export Selected (Excel)" to combine them into one file (a summary page + one detail page per selected month).',
    ],
    backupSteps: [
      'Open the "Backup & Restore" menu on the left sidebar.',
      'Click "Download Backup File" to save a copy of all your data (every department, every budget sheet) as a single file — it saves to your Downloads folder automatically, and you can move it anywhere else afterwards, such as an external drive.',
      'To restore, click "Choose File to Restore" and pick a .bhbackup file you saved earlier. You\'ll always be asked to confirm first, since restoring replaces all current data and cannot be undone.',
      'Once restored, the app closes and reopens automatically.',
    ],
    backupAutoNote: 'On top of that, every time you close the app it automatically saves a backup, keeping the 2 most recent copies (the current one and the one before it) in the app\'s own data folder. No action needed, and it never uses more than 2 backup files\' worth of space.',
    backupTip: 'Backup files are encrypted and self-verifying. Only genuine BudgetHub .bhbackup files are accepted for restore — any other file type, or one that has been modified or corrupted, is rejected immediately to protect your data.',
    faq: [
      { q: 'I clicked "Add Row" and nothing happened?', a: 'There are no departments in this sheet yet. Type a department name in the box shown and add it, then you can enter rows.' },
      { q: 'I finalized a sheet — can I still edit it?', a: 'Yes. Click "Reopen" at the top right of the sheet; it returns to draft and becomes editable again.' },
      { q: 'Can I edit a cost center code?', a: 'Yes. Click the pencil icon on that cost center and change the code (it must not duplicate another one).' },
      { q: 'Can I export several months at once?', a: 'Yes. On the "Budget Sheets" page, tick several months and click "Export Selected (Excel)" — you get one file with a summary page followed by full details for each selected month.' },
      { q: 'Where is the automatic backup stored?', a: "In the app's own data folder (created automatically — you don't need to touch it). If you want a backup file you can choose where to keep, use the \"Download Backup File\" button on the Backup & Restore page instead; that one goes to your Downloads folder." },
      { q: 'Can I restore a file that isn\'t from BudgetHub?', a: 'No. Every file is checked before restoring — anything that isn\'t a genuine BudgetHub .bhbackup file, or has been modified or corrupted, is rejected immediately to protect your data.' },
      { q: 'Where is my data stored?', a: 'Everything is stored locally on your computer (offline). Nothing is sent to the internet.' },
    ],
    goNow: 'Open this page',
  },
};

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 h-6 w-6 rounded-full bg-[var(--color-primary-bg-light)] text-[var(--color-primary)] text-xs font-black flex items-center justify-center mt-0.5">
        {n}
      </span>
      <span className="text-sm text-slate-600 font-medium leading-relaxed">{children}</span>
    </li>
  );
}

function TipBox({ label, children }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl p-3.5">
      <Lightbulb className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 font-semibold leading-relaxed">
        <span className="font-black uppercase tracking-wide mr-1">{label}:</span>
        {children}
      </p>
    </div>
  );
}

function Section({ icon: Icon, title, children, action }) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[var(--color-primary-bg-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function HelpCenter({ lang, onNavigate, onOpenSetup }) {
  const t = L[lang] || L.TH;
  const goBtn = (tab) => (
    <button
      onClick={() => onNavigate && onNavigate(tab)}
      className="glass-btn-secondary text-xs font-bold py-1.5 px-3 shrink-0"
    >
      <span>{t.goNow}</span>
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md shadow-teal-600/10">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
          </div>
        </div>
        {onOpenSetup && (
          <button onClick={onOpenSetup} className="glass-btn-primary text-sm font-bold self-start md:self-center">
            <Sparkles className="h-4 w-4" />
            <span>{t.reopenSetup}</span>
          </button>
        )}
      </div>

      {/* 1. Getting started */}
      <Section icon={Sparkles} title={t.sections.start}>
        <p className="text-sm text-slate-500 font-medium mb-4">{t.startIntro}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: FileSpreadsheet, txt: t.startSteps[0], tab: 'sheets' },
            { icon: Building2, txt: t.startSteps[1], tab: 'departments' },
            { icon: Layers, txt: t.startSteps[2], tab: 'costcenters' },
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => onNavigate && onNavigate(s.tab)}
              className="text-left bg-slate-50 hover:bg-[var(--color-primary-bg-light)] border border-slate-200 hover:border-[var(--color-primary-light)] rounded-2xl p-4 transition group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="h-7 w-7 rounded-lg bg-white border border-slate-200 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-black text-slate-400">{t.stepsLabel} {i + 1}</span>
              </div>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">{s.txt}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* 2. Departments */}
      <Section icon={Building2} title={t.sections.dept} action={goBtn('departments')}>
        <ol className="space-y-2.5">
          {t.deptSteps.map((s, i) => <Step key={i} n={i + 1}>{s}</Step>)}
        </ol>
        <TipBox label={t.tip}>{t.deptTip}</TipBox>
      </Section>

      {/* 3. Cost centers */}
      <Section icon={Layers} title={t.sections.cc} action={goBtn('costcenters')}>
        <ol className="space-y-2.5">
          {t.ccSteps.map((s, i) => <Step key={i} n={i + 1}>{s}</Step>)}
        </ol>
        <TipBox label={t.tip}>
          <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /></span> {t.ccTip}
        </TipBox>
      </Section>

      {/* 4. The grid */}
      <Section icon={FileSpreadsheet} title={t.sections.grid} action={goBtn('sheets')}>
        <ol className="space-y-2.5">
          {t.gridSteps.map((s, i) => <Step key={i} n={i + 1}>{s}</Step>)}
        </ol>
        {/* Little visual legend of the row controls */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
          <span className="inline-flex items-center gap-1.5"><CornerDownLeft className="h-3.5 w-3.5 text-[var(--color-primary)]" /> Enter</span>
          <span className="inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5 text-[var(--color-primary)]" /> {lang === 'TH' ? 'เพิ่ม/แทรกแถว' : 'Add / insert row'}</span>
          <span className="inline-flex items-center gap-1.5"><ArrowUp className="h-3.5 w-3.5" /><ArrowDown className="h-3.5 w-3.5" /> {lang === 'TH' ? 'ย้ายแถว' : 'Move row'}</span>
          <span className="inline-flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5" /> {lang === 'TH' ? 'ลากเพื่อจัดลำดับ' : 'Drag to reorder'}</span>
          <span className="inline-flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> {lang === 'TH' ? 'ตัดงบทำการ' : 'Deduct budget'}</span>
          <span className="inline-flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5 text-rose-500" /> {lang === 'TH' ? 'ลบแถว' : 'Delete row'}</span>
        </div>
        <TipBox label={t.tip}>{t.gridTip}</TipBox>
      </Section>

      {/* 5. Dashboard & reports */}
      <Section icon={LayoutDashboard} title={t.sections.dashboard} action={goBtn('dashboard')}>
        <ol className="space-y-2.5">
          {t.dashboardSteps.map((s, i) => <Step key={i} n={i + 1}>{s}</Step>)}
        </ol>
        <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <Download className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          PDF • Excel • JPG
        </div>
      </Section>

      {/* 6. Backup & Restore */}
      <Section icon={DatabaseBackup} title={t.sections.backup} action={goBtn('backup')}>
        <ol className="space-y-2.5">
          {t.backupSteps.map((s, i) => <Step key={i} n={i + 1}>{s}</Step>)}
        </ol>
        <div className="mt-4 flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
          <RotateCcw className="h-4.5 w-4.5 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 font-semibold leading-relaxed">{t.backupAutoNote}</p>
        </div>
        <TipBox label={t.tip}>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /></span> {t.backupTip}
        </TipBox>
      </Section>

      {/* 7. FAQ */}
      <Section icon={HelpCircle} title={t.sections.faq}>
        <div className="divide-y divide-slate-100">
          {t.faq.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </Section>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer group"
      >
        <span className="text-sm font-bold text-slate-800 group-hover:text-[var(--color-primary)] transition">{q}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-sm text-slate-500 font-medium leading-relaxed pb-3 pr-6">{a}</p>
      )}
    </div>
  );
}
