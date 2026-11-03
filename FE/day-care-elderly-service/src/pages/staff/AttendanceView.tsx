import React, { useCallback, useEffect, useMemo, useState } from "react";
import attendanceService from "../../services/attendanceService";
import type { AttendanceDetail, AttendanceItem } from "../../services/attendanceService";
import staffAssignmentService from "../../services/staffAssignmentService";
import type { ElderlyInGroup } from "../../services/staffAssignmentService";

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const time = (value: string | null) => value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
const AttendanceView: React.FC = () => {
  const [date] = useState(localDate());
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [assigned, setAssigned] = useState<ElderlyInGroup[]>([]);
  const [present, setPresent] = useState<AttendanceItem[]>([]);
  const [history, setHistory] = useState<AttendanceItem[]>([]);
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [historyPerson, setHistoryPerson] = useState<ElderlyInGroup | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [list, group] = await Promise.all([attendanceService.getByDate(localDate()), staffAssignmentService.getMyCareGroup(localDate())]);
      setAttendance(list);
      setAssigned(group.data?.elderlyList ?? []);
      if (date === localDate()) setPresent(await attendanceService.getPresentToday());
      else setPresent(list.filter(x => x.checkInAt && !x.checkOutAt));
    } catch (err: any) { setError(err?.response?.data?.message || "Không tải được danh sách điểm danh."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const byElderly = useMemo(() => new Map(attendance.map(item => [item.elderlyId, item])), [attendance]);
  const doAction = async (person: ElderlyInGroup, action: "in" | "out") => {
    setBusyId(person.elderlyId); setError(""); setNotice("");
    try {
      if (action === "in") await attendanceService.checkIn(person.elderlyId);
      else await attendanceService.checkOut(person.elderlyId);
      setNotice(`${action === "in" ? "Check-in" : "Check-out"} ${person.fullName} thành công.`);
      await reload();
    } catch (err: any) { setError(err?.response?.data?.message || `Không thể ${action === "in" ? "check-in" : "check-out"} người cao tuổi.`); }
    finally { setBusyId(null); }
  };
  const openDetail = async (item: AttendanceItem) => {
    try { setDetail(await attendanceService.getDetail(item.attendanceId)); }
    catch (err: any) { setError(err?.response?.data?.message || "Không tải được chi tiết điểm danh."); }
  };
  const openHistory = async (person: ElderlyInGroup) => {
    setHistoryPerson(person); setHistory([]);
    try { setHistory(await attendanceService.getHistory(person.elderlyId)); }
    catch (err: any) { setError(err?.response?.data?.message || "Không tải được lịch sử điểm danh."); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Điểm danh người cao tuổi</h2><p className="mt-1 text-sm text-slate-500">Danh sách người được phân công trong hôm nay.</p></div><span className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">Hôm nay · {new Date().toLocaleDateString("vi-VN")}</span></div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{notice && <div role="status" className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{notice}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Được phân công</p><b className="text-2xl">{assigned.length}</b></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Đã check-in</p><b className="text-2xl">{attendance.filter(a=>a.checkInAt).length}</b></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Đang có mặt</p><b className="text-2xl">{present.length}</b></div></div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h3 className="font-semibold">Danh sách điểm danh trong ngày</h3><p className="mt-1 text-xs text-slate-500">Người cao tuổi được phân công trong ngày đã chọn</p></div>{loading?<p className="p-5 text-sm text-slate-500">Đang tải…</p>:assigned.length===0?<p className="p-8 text-center text-sm text-slate-500">Không có người cao tuổi được phân công ngày này.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Người cao tuổi</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3">Check-out</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody className="divide-y">{assigned.map(person=>{const item=byElderly.get(person.elderlyId);return <tr key={person.elderlyId}><td className="px-4 py-3 font-medium">{person.fullName}</td><td className="px-4 py-3">{time(item?.checkInAt??null)}</td><td className="px-4 py-3">{time(item?.checkOutAt??null)}</td><td className="px-4 py-3">{!item?"Chưa điểm danh":item.checkOutAt?"Đã check-out":"Đang có mặt"}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2">{!item?<button disabled={busyId===person.elderlyId} onClick={()=>void doAction(person,"in")} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{busyId===person.elderlyId?"Đang xử lý…":"Check-in"}</button>:!item.checkOutAt?<button disabled={busyId===person.elderlyId} onClick={()=>void doAction(person,"out")} className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Check-out</button>:<button onClick={()=>void openDetail(item)} className="rounded-md border px-3 py-1.5 text-xs">Chi tiết</button>}<button onClick={()=>void openHistory(person)} className="rounded-md border px-3 py-1.5 text-xs">Lịch sử</button></div></td></tr>;})}</tbody></table></div>}
    </section>
    {attendance.length>0&&<section className="rounded-xl border bg-white p-4"><h3 className="font-semibold">Chi tiết điểm danh hôm nay</h3><div className="mt-3 space-y-2">{attendance.map(item=><button key={item.attendanceId} onClick={()=>void openDetail(item)} className="flex w-full flex-wrap justify-between gap-2 rounded-lg border p-3 text-left hover:bg-slate-50"><span className="font-medium">{item.elderlyName}</span><span className="text-sm text-slate-500">Vào {time(item.checkInAt)} · Ra {time(item.checkOutAt)}</span></button>)}</div></section>}
    {detail&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setDetail(null);}}><section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"><div className="flex justify-between"><h3 className="text-lg font-bold">Chi tiết điểm danh · {detail.elderlyName}</h3><button onClick={()=>setDetail(null)} aria-label="Đóng">✕</button></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><dt>Ngày</dt><dd>{detail.attendanceDate}</dd><dt>Check-in</dt><dd>{time(detail.checkInAt)}</dd><dt>Check-out</dt><dd>{time(detail.checkOutAt)}</dd><dt>Trạng thái</dt><dd>{detail.status}</dd></dl></section></div>}
    {historyPerson&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setHistoryPerson(null);}}><section className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"><div className="flex justify-between"><h3 className="text-lg font-bold">Lịch sử điểm danh · {historyPerson.fullName}</h3><button onClick={()=>setHistoryPerson(null)} aria-label="Đóng">✕</button></div>{history.length===0?<p className="py-8 text-center text-sm text-slate-500">Chưa có lịch sử điểm danh.</p>:<ul className="mt-4 divide-y">{history.map(item=><li key={item.attendanceId} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{new Date(`${item.attendanceDate}T00:00:00`).toLocaleDateString("vi-VN")}</span><span>Vào {time(item.checkInAt)} · Ra {time(item.checkOutAt)}</span><button onClick={()=>{setHistoryPerson(null);void openDetail(item);}} className="text-teal-700 hover:underline">Chi tiết</button></li>)}</ul>}</section></div>}
  </div>;
};

export default AttendanceView;
