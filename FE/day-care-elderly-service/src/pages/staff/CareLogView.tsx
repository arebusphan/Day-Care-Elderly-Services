import React, { useEffect, useMemo, useState } from "react";
import careLogService from "../../services/careLogService";
import type { CareLogDay, CareLogEntry, StaffElderlyToday } from "../../services/careLogService";

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const typeLabels: Record<string, string> = {
  MEAL: "Ăn uống", HYGIENE: "Vệ sinh", NAP: "Nghỉ ngơi", MOOD: "Tâm trạng",
  ACTIVITY: "Hoạt động", NOTE: "Ghi chú", VITALS: "Chỉ số sức khỏe",
};

const timeLabel = (value: string) => new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const CareLogView: React.FC = () => {
  const [date, setDate] = useState(localDate);
  const [elderly, setElderly] = useState<StaffElderlyToday[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [day, setDay] = useState<CareLogDay | null>(null);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [careType, setCareType] = useState("NOTE");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [internal, setInternal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingPeople(true);
    setError("");
    careLogService.getTodayElderly().then((people) => {
      if (!cancelled) {
        setElderly(people);
        setSelectedId((current) => current && people.some((person) => person.elderlyId === current) ? current : people[0]?.elderlyId ?? null);
      }
    }).catch((err: any) => {
      if (!cancelled) setError(err?.response?.data?.message || err?.response?.data?.title || `Không tải được danh sách người cao tuổi hôm nay (HTTP ${err?.response?.status ?? "mất kết nối"}).`);
    }).finally(() => { if (!cancelled) setLoadingPeople(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedId === null) { setDay(null); return; }
    let cancelled = false;
    setLoadingDay(true);
    setError("");
    careLogService.getDay(selectedId, date).then((result) => { if (!cancelled) setDay(result); })
      .catch((err: any) => { if (!cancelled) { setDay(null); setError(err?.response?.data?.message || "Không tải được carelog ngày đã chọn."); } })
      .finally(() => { if (!cancelled) setLoadingDay(false); });
    return () => { cancelled = true; };
  }, [selectedId, date]);

  const selected = useMemo(() => elderly.find((person) => person.elderlyId === selectedId) ?? null, [elderly, selectedId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !description.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const entry: CareLogEntry = await careLogService.addEntry(selectedId, {
        careType, description: description.trim(), notes: notes.trim() || undefined, isInternal: internal,
      });
      setDay((current) => current ? { ...current, entries: [...current.entries, entry].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)) } : current);
      setDescription(""); setNotes(""); setNotice("Đã lưu ghi nhận chăm sóc.");
      const people = await careLogService.getTodayElderly(); setElderly(people);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể lưu carelog. Vui lòng thử lại.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-bold text-slate-900">Nhật ký chăm sóc</h2><p className="mt-1 text-sm text-slate-500">Ghi nhận tình trạng và hoạt động của người cao tuổi trong ngày.</p></div>
        <label className="text-sm font-medium text-slate-600">Ngày ghi nhận<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{notice}</div>}

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-semibold text-slate-800">Có mặt hôm nay</h3><p className="mt-0.5 text-xs text-slate-500">Dữ liệu từ backend điểm danh</p></div>
          {loadingPeople ? <p className="p-4 text-sm text-slate-500">Đang tải danh sách...</p> : elderly.length === 0 ? <p className="p-4 text-sm text-slate-500">Chưa có người cao tuổi check-in hôm nay.</p> :
            <ul className="divide-y divide-slate-100">{elderly.map((person) => <li key={person.elderlyId}><button type="button" onClick={() => { setSelectedId(person.elderlyId); setNotice(""); }} className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${selectedId === person.elderlyId ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : ""}`}><span className="block font-medium text-slate-800">{person.fullName}</span><span className="mt-1 block text-xs text-slate-500">{person.entryCount} ghi nhận · {person.isClosed ? "Đã chốt" : "Đang chăm sóc"}</span>{person.allergies && <span className="mt-1 block text-xs text-amber-700">Dị ứng: {person.allergies}</span>}</button></li>)}</ul>}
        </section>

        <div className="space-y-5">
          {selected && <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">{selected.fullName}</h3><p className="mt-1 text-sm text-slate-500">{selected.mobilityStatus ? `Vận động: ${selected.mobilityStatus}` : ""}{selected.checkInAt ? ` · Check-in ${timeLabel(selected.checkInAt)}` : ""}</p></div><div className="flex gap-2 text-xs"><span className={`rounded-full px-2.5 py-1 font-semibold ${day?.isMedicalDone ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600"}`}>{day?.isMedicalDone ? "Đã hoàn tất y tế" : "Y tế đang theo dõi"}</span><span className={`rounded-full px-2.5 py-1 font-semibold ${day?.isClosed ? "bg-slate-200 text-slate-700" : "bg-blue-50 text-blue-700"}`}>{day?.isClosed ? "Đã chốt ngày" : "Ngày đang mở"}</span></div></div></section>}

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-800">Thêm ghi nhận</h3>
            {day?.isClosed ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Carelog ngày này đã chốt, không thể ghi thêm.</p> : <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Loại chăm sóc<select value={careType} onChange={(event) => setCareType(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{Object.entries(typeLabels).filter(([key]) => key !== "VITALS").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <div className="hidden md:block" />
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Nội dung<textarea required maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Ví dụ: Ăn hết 80% khẩu phần, tinh thần vui vẻ..." className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Ghi chú thêm<textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Thông tin bổ sung (không bắt buộc)" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} className="rounded border-slate-300 text-teal-600" />Ghi chú nội bộ, gia đình không xem được</label>
              <div className="md:col-span-2"><button type="submit" disabled={!selectedId || !description.trim() || saving || loadingDay || day?.isClosed} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu ghi nhận"}</button></div>
            </form>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-semibold text-slate-800">Lịch sử trong ngày</h3></div>
            {loadingDay ? <p className="p-4 text-sm text-slate-500">Đang tải carelog...</p> : !selected ? <p className="p-4 text-sm text-slate-500">Chọn người cao tuổi để xem nhật ký.</p> : (day?.entries ?? []).length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Chưa có ghi nhận cho ngày này.</p> :
              <ol className="divide-y divide-slate-100">{[...(day?.entries ?? [])].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map((entry: CareLogEntry) => <li key={entry.careLogId} className="px-4 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{typeLabels[entry.careType] ?? entry.careType}</span>{entry.isInternal && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Nội bộ</span>}</div><time className="text-xs text-slate-500">{timeLabel(entry.recordedAt)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{entry.description}</p>{entry.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.notes}</p>}<p className="mt-2 text-xs text-slate-400">Ghi bởi {entry.staffName || "Nhân viên"}</p>{entry.photos?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{entry.photos.map((photo) => <a key={photo.photoId} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt="Ảnh ghi nhận chăm sóc" className="h-20 w-20 rounded-lg object-cover" /></a>)}</div>}</li>)}</ol>}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CareLogView;
