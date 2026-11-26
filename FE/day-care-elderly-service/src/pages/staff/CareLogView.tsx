import React, { useEffect, useMemo, useState } from "react";
import careLogService from "../../services/careLogService";
import type { CareLogDay, CareLogEntry, DoseRecord, StaffElderlyToday, StaffIncident } from "../../services/careLogService";
import CareLogDataDetails from "../../components/CareLogDataDetails";
import { careTypeLabels, incidentStatusLabels, incidentTypeLabels, severityLabels } from "../../lib/careLogLabels";
import scheduleService, { CONDITION_LABELS, ROLE_LABELS, STATUS_LABELS } from "../../services/scheduleService";
import type { ScheduleDay, ScheduleItem, ScheduleStatus, ScheduleWeek } from "../../services/scheduleService";

const statusClass: Record<ScheduleStatus, string> = {
  Done: "bg-emerald-50 text-emerald-700",
  Skipped: "bg-slate-100 text-slate-600",
  Overdue: "bg-rose-50 text-rose-700",
  Pending: "bg-amber-50 text-amber-800",
};

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const typeLabels = careTypeLabels;
/** Loại staff tự ghi được (CareLogTypes.Manual ở BE). */
const MANUAL_TYPES = ["MEAL", "HYGIENE", "NAP", "MOOD", "ACTIVITY", "NOTE"];

/** Hộp thoại đang mở: chốt ngày, đóng sự cố (cần kết quả xử lý), bỏ qua hoạt động trong lịch (cần lý do). */
type PendingDialog = { kind: "close" } | { kind: "resolve"; incident: StaffIncident } | { kind: "skip"; item: ScheduleItem } | null;

const timeLabel = (value: string) => new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
type CareSection = "schedule" | "journal" | "health" | "medication" | "incidents";

const errorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  const validationErrors = data?.errors ?? data?.Errors;
  if (Array.isArray(validationErrors) && validationErrors.length) return validationErrors.join("; ");
  if (validationErrors && typeof validationErrors === "object") {
    const validationMessages = Object.values(validationErrors).flatMap((value) => Array.isArray(value) ? value : [value]).filter((value) => typeof value === "string");
    if (validationMessages.length) return validationMessages.join("; ");
  }
  const message = data?.message ?? data?.Message ?? data?.detail ?? data?.title;
  if (typeof message === "string" && message.trim()) return message;
  return error?.response?.status ? `${fallback} (HTTP ${error.response.status})` : fallback;
};

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
  const [doses, setDoses] = useState<DoseRecord[]>([]);
  const [incidents, setIncidents] = useState<StaffIncident[]>([]);
  const [doseNotes, setDoseNotes] = useState<Record<number, string>>({});
  const [incidentType, setIncidentType] = useState("OTHER");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [activeSection, setActiveSection] = useState<CareSection>("schedule");
  const [dialog, setDialog] = useState<PendingDialog>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [schedule, setSchedule] = useState<ScheduleDay | null>(null);
  const [week, setWeek] = useState<ScheduleWeek | null>(null);
  /** Hoạt động trong lịch đang được ghi (form Nhật ký / Chỉ số sẽ gắn PackageActivityId) */
  const [linkActivity, setLinkActivity] = useState<ScheduleItem | null>(null);

  const refreshExtras = async () => {
    const [doseRows, incidentRows] = await Promise.all([careLogService.getTodayDoses(), careLogService.getIncidents(undefined, 30)]);
    setDoses(doseRows);
    setIncidents(incidentRows);
  };

  const loadSchedule = async (elderlyId = selectedId) => {
    if (elderlyId === null) { setSchedule(null); setWeek(null); return; }
    try {
      const [dayRows, weekRows] = await Promise.all([scheduleService.getStaffDay(elderlyId, date), scheduleService.getStaffWeek(elderlyId, date)]);
      setSchedule(dayRows); setWeek(weekRows);
    } catch (err: any) {
      setSchedule(null); setWeek(null);
      setError((current) => current || errorMessage(err, "Không tải được lịch hoạt động."));
    }
  };

  const refreshDay = async (elderlyId = selectedId) => {
    if (elderlyId !== null) setDay(await careLogService.getDay(elderlyId, date));
    await Promise.all([refreshExtras(), loadSchedule(elderlyId)]);
  };

  /** Bấm "Ghi" trên 1 hoạt động: mở đúng form (Chỉ số hoặc Nhật ký) đã điền sẵn loại và tên hoạt động. */
  const startRecording = (item: ScheduleItem) => {
    setLinkActivity(item); setNotice(""); setError("");
    if (item.careType === "VITALS") { setActiveSection("health"); return; }
    setCareType(MANUAL_TYPES.includes(item.careType) ? item.careType : "NOTE");
    setDescription(`${item.activityName}: `);
    setActiveSection("journal");
  };

  const skipActivity = async () => {
    if (dialog?.kind !== "skip" || !selectedId || !resolveNote.trim()) return;
    const { item } = dialog;
    setSaving(true); setError(""); setNotice("");
    try {
      await careLogService.addEntry(selectedId, { careType: "SKIP", description: resolveNote.trim(), isInternal: false, packageActivityId: item.packageActivityId });
      setDialog(null); setResolveNote("");
      setNotice(`Đã bỏ qua "${item.activityName}".`);
      await refreshDay(selectedId);
    } catch (err: any) { setError(errorMessage(err, "Không bỏ qua được hoạt động.")); }
    finally { setSaving(false); }
  };

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
    let cancelled = false;
    Promise.all([careLogService.getTodayDoses(), careLogService.getIncidents(undefined, 30)])
      .then(([doseRows, incidentRows]) => { if (!cancelled) { setDoses(doseRows); setIncidents(incidentRows); } })
      .catch((err: any) => { if (!cancelled) setError((current) => current || err?.response?.data?.message || "Không tải được thuốc hoặc sự cố."); });
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

  useEffect(() => { setLinkActivity(null); void loadSchedule(selectedId); }, [selectedId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(() => elderly.find((person) => person.elderlyId === selectedId) ?? null, [elderly, selectedId]);

  // CL-06: xác nhận y tế (MEDICAL_DONE) rồi chốt care log (CLOSE); sau khi chốt BE khóa ghi
  const runDayAction = async (action: "medical" | "close") => {
    if (!selected) return;
    setDialog(null);
    setSaving(true); setError(""); setNotice("");
    try {
      if (action === "medical") await careLogService.markMedicalDone(selected.elderlyId);
      else await careLogService.closeDay(selected.elderlyId);
      setElderly(await careLogService.getTodayElderly());
      await refreshDay(selected.elderlyId);
      setNotice(action === "medical" ? "Đã xác nhận phần y tế hôm nay." : "Đã chốt care log hôm nay.");
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.message || (action === "medical" ? "Không xác nhận được phần y tế." : "Không chốt được care log."));
    } finally { setSaving(false); }
  };
  const isToday = date === localDate();

  const resolveIncident = async () => {
    if (dialog?.kind !== "resolve" || !resolveNote.trim()) return;
    const { incident } = dialog;
    setSaving(true); setError(""); setNotice("");
    try {
      await careLogService.updateIncident(incident.incidentId, "Resolved", resolveNote.trim());
      await refreshExtras();
      setDialog(null); setResolveNote("");
      setNotice("Đã đóng sự cố.");
    } catch (err: any) { setError(err?.response?.data?.message || "Không cập nhật được sự cố."); }
    finally { setSaving(false); }
  };
  const vitalsToday = (day?.entries ?? []).filter((entry) => entry.careType === "VITALS").sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !description.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const linked = linkActivity;
      const entry: CareLogEntry = await careLogService.addEntry(selectedId, {
        careType, description: description.trim(), notes: notes.trim() || undefined, isInternal: internal,
        packageActivityId: linked && linked.careType !== "VITALS" ? linked.packageActivityId : undefined,
      });
      setDay((current) => current ? { ...current, entries: [...current.entries, entry].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)) } : current);
      setDescription(""); setNotes(""); setLinkActivity(null);
      setNotice(linked ? `Đã ghi "${linked.activityName}".` : "Đã lưu ghi nhận chăm sóc.");
      const people = await careLogService.getTodayElderly(); setElderly(people);
      await loadSchedule(selectedId);
      if (linked) setActiveSection("schedule");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể lưu carelog. Vui lòng thử lại.");
    } finally { setSaving(false); }
  };

  const handleVitals = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const numeric = (key: string) => { const raw = String(form.get(key) ?? "").trim(); return raw ? Number(raw) : undefined; };
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await careLogService.recordVitals(selectedId, {
        systolicBp: numeric("systolicBp"), diastolicBp: numeric("diastolicBp"), heartRate: numeric("heartRate"),
        spO2: numeric("spO2"), temperature: numeric("temperature"), bloodGlucose: numeric("bloodGlucose"),
        notes: String(form.get("notes") ?? "").trim() || undefined,
        packageActivityId: linkActivity?.careType === "VITALS" ? linkActivity.packageActivityId : undefined,
      });
      setNotice(result.warnings.length ? `Đã lưu chỉ số. Cảnh báo: ${result.warnings.join("; ")}` : "Đã lưu chỉ số sức khỏe.");
      formElement.reset();
      setLinkActivity(null);
      await refreshDay(selectedId);
    } catch (err: any) { setError(errorMessage(err, "Không ghi được chỉ số.")); }
    finally { setSaving(false); }
  };

  const handleCreateIncident = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !incidentDescription.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await careLogService.createIncident({ elderlyId: selectedId, incidentType, description: incidentDescription.trim() });
      setIncidentDescription(""); setNotice("Đã gửi báo cáo sự cố."); await refreshExtras();
    } catch (err: any) { setError(err?.response?.data?.message || "Không gửi được báo cáo sự cố."); }
    finally { setSaving(false); }
  };

  const uploadEntryPhotos = async (entry: CareLogEntry, files: FileList | null) => {
    if (!files?.length) return;
    setSaving(true); setError(""); setNotice("");
    try { await careLogService.uploadPhotos(entry.careLogId, Array.from(files)); await refreshDay(); setNotice("Đã tải ảnh lên."); }
    catch (err: any) { setError(err?.response?.data?.message || "Không tải được ảnh."); }
    finally { setSaving(false); }
  };

  const removePhoto = async (photoId: number) => {
    setSaving(true); setError("");
    try { await careLogService.deletePhoto(photoId); await refreshDay(); setNotice("Đã xóa ảnh."); }
    catch (err: any) { setError(err?.response?.data?.message || "Không xóa được ảnh."); }
    finally { setSaving(false); }
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
            <ul className="divide-y divide-slate-100">{elderly.map((person) => <li key={person.elderlyId}><button type="button" onClick={() => { setSelectedId(person.elderlyId); setNotice(""); }} className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${selectedId === person.elderlyId ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : ""}`}><span className="block font-medium text-slate-800">{person.fullName}</span><span className="mt-1 block text-xs text-slate-500">{person.entryCount} ghi nhận{person.checkInAt ? ` · Check-in ${timeLabel(person.checkInAt)}` : ""}</span>{person.allergies && <span className="mt-1 block text-xs text-amber-700">Dị ứng: {person.allergies}</span>}</button></li>)}</ul>}
        </section>

        <div className="space-y-5">
          {selected && <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">{selected.fullName}</h3><p className="mt-1 text-sm text-slate-500">{selected.mobilityStatus ? `Vận động: ${selected.mobilityStatus}` : ""}{selected.checkInAt ? ` · Check-in ${timeLabel(selected.checkInAt)}` : ""}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{day?.entries.length ?? 0} ghi nhận hôm nay</span>{selected.isMedicalDone && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Y tế: đã xác nhận</span>}{selected.isClosed && <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white">Đã chốt</span>}{isToday && !selected.isClosed && (!selected.isMedicalDone ? <button type="button" disabled={saving} onClick={() => void runDayAction("medical")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-40">Xác nhận y tế xong</button> : <button type="button" disabled={saving} onClick={() => setDialog({ kind: "close" })} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Chốt care log</button>)}</div></div>{selected.isClosed && isToday && <p className="mt-2 text-xs text-slate-500">Care log hôm nay đã chốt — không ghi thêm được.</p>}</section>}

          <nav aria-label="Mục care log" className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-5">
            {([["schedule", "Lịch hôm nay", schedule ? `${schedule.doneCount}/${schedule.requiredCount}` : "–"], ["journal", "Nhật ký", day?.entries.length ?? 0], ["health", "Chỉ số", day?.entries.filter((entry) => entry.careType === "VITALS").length ?? 0], ["medication", "Thuốc", doses.filter((dose) => selectedId === null || dose.elderlyId === selectedId).length], ["incidents", "Sự cố", incidents.filter((incident) => selectedId === null || incident.elderlyId === selectedId).length]] as const).map(([key, label, count]) => <button key={key} type="button" onClick={() => setActiveSection(key)} aria-current={activeSection === key ? "page" : undefined} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${activeSection === key ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}><span>{label}</span><span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${activeSection === key ? "bg-white/20" : "bg-slate-100"}`}>{count}</span></button>)}
          </nav>

          <section className={`rounded-xl border border-slate-200 bg-white p-4 ${activeSection === "schedule" ? "" : "hidden"}`}>
            {!selected ? <p className="text-sm text-slate-500">Chọn người cao tuổi để xem lịch.</p>
              : !schedule ? <p className="text-sm text-slate-500">Đang tải lịch...</p>
              : !schedule.packageId ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Cụ chưa có gói dịch vụ còn hiệu lực trong ngày này nên chưa có lịch hoạt động.</p>
              : <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">Lịch hoạt động · gói {schedule.packageName}</h3>
                    <p className="mt-1 text-xs text-slate-500">Đã làm {schedule.doneCount}/{schedule.requiredCount} việc bắt buộc{schedule.skippedCount ? ` · bỏ qua ${schedule.skippedCount}` : ""}{schedule.chronicConditions.length ? ` · bệnh nền: ${schedule.chronicConditions.map((c) => CONDITION_LABELS[c] ?? c).join(", ")}` : ""}</p>
                  </div>
                  {week && week.activityMinutesPlanned > 0 && <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">Tuần này: {week.activityMinutesDone}/{week.activityMinutesPlanned} phút hoạt động</p>}
                </div>
                {schedule.items.length === 0 ? <p className="py-5 text-center text-sm text-slate-500">Không có hoạt động trong ngày này (Chủ nhật hoặc lịch gói trống).</p> :
                  <ol className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">{schedule.items.map((item) => (
                    <li key={item.packageActivityId} className="flex flex-wrap items-start gap-3 px-3 py-3">
                      <span className="w-24 shrink-0 text-xs font-semibold text-slate-600">{item.startTime}–{item.endTime}</span>
                      <div className="min-w-[12rem] flex-1">
                        <p className="text-sm font-medium text-slate-800">{item.activityName}{!item.isRequired && <span className="ml-1 text-xs font-normal text-slate-400">(tùy chọn)</span>}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{typeLabels[item.careType] ?? item.careType}{item.targetMinutes ? ` · ${item.targetMinutes} phút` : ""} · {ROLE_LABELS[item.performerRole] ?? item.performerRole}{item.conditionCode ? ` · cụ ${CONDITION_LABELS[item.conditionCode] ?? item.conditionCode}` : ""}</p>
                        {item.purpose && <p className="mt-0.5 text-xs text-slate-500">Để: {item.purpose}</p>}
                        {item.note && item.status !== "Pending" && <p className="mt-1 text-xs text-slate-600">{item.status === "Skipped" ? "Lý do bỏ qua: " : ""}{item.note}{item.staffName ? ` · ${item.staffName}` : ""}{item.recordedAt ? ` · ${timeLabel(item.recordedAt)}` : ""}</p>}
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                        {isToday && !selected.isClosed && (item.status === "Pending" || item.status === "Overdue") && <>
                          <button type="button" disabled={saving} onClick={() => startRecording(item)} className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40">Ghi</button>
                          <button type="button" disabled={saving} onClick={() => { setResolveNote(""); setDialog({ kind: "skip", item }); }} className="rounded-lg border px-2.5 py-1 text-xs">Bỏ qua</button>
                        </>}
                      </div>
                    </li>
                  ))}</ol>}
                {week && week.items.length > 0 && <details className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-700">Tổng kết tuần {new Date(week.weekStart).toLocaleDateString("vi-VN")} – {new Date(week.weekEnd).toLocaleDateString("vi-VN")}</summary>
                  <ul className="mt-2 space-y-1">{week.items.map((w) => <li key={w.activityName} className="flex justify-between gap-3"><span>{w.activityName}</span><span className="shrink-0 font-medium">{w.doneSessions}/{w.plannedSessions} buổi · {w.doneMinutes}/{w.plannedMinutes} phút{w.skippedSessions ? ` · bỏ ${w.skippedSessions}` : ""}</span></li>)}</ul>
                </details>}
              </>}
          </section>

          <section className={`rounded-xl border border-slate-200 bg-white p-4 ${activeSection === "journal" ? "" : "hidden"}`}>
            <h3 className="font-semibold text-slate-800">Thêm ghi nhận</h3>
            {linkActivity && linkActivity.careType !== "VITALS" && <p className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">Đang ghi cho hoạt động trong lịch: <b>{linkActivity.startTime} {linkActivity.activityName}</b><button type="button" onClick={() => setLinkActivity(null)} className="underline">Bỏ gắn</button></p>}
            {date !== localDate() ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Chỉ xem được lịch sử của ngày đã qua; thao tác ghi nhận dành cho hôm nay.</p> : <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Loại chăm sóc<select value={careType} onChange={(event) => setCareType(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{MANUAL_TYPES.map((key) => <option key={key} value={key}>{typeLabels[key]}</option>)}</select></label>
              <div className="hidden md:block" />
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Nội dung<textarea required maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Ví dụ: Ăn hết 80% khẩu phần, tinh thần vui vẻ..." className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Ghi chú thêm<textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Thông tin bổ sung (không bắt buộc)" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} className="rounded border-slate-300 text-teal-600" />Ghi chú nội bộ, gia đình không xem được</label>
              <div className="md:col-span-2"><button type="submit" disabled={!selectedId || !description.trim() || saving || loadingDay} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu ghi nhận"}</button></div>
            </form>}
          </section>

          <section className={`rounded-xl border border-slate-200 bg-white ${activeSection === "journal" ? "" : "hidden"}`}>
            <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-semibold text-slate-800">Lịch sử trong ngày</h3></div>
            {loadingDay ? <p className="p-4 text-sm text-slate-500">Đang tải carelog...</p> : !selected ? <p className="p-4 text-sm text-slate-500">Chọn người cao tuổi để xem nhật ký.</p> : (day?.entries ?? []).length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Chưa có ghi nhận cho ngày này.</p> :
              <ol className="divide-y divide-slate-100">{[...(day?.entries ?? [])].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map((entry: CareLogEntry) => <li key={entry.careLogId} className="px-4 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{typeLabels[entry.careType] ?? entry.careType}</span>{entry.isInternal && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Nội bộ</span>}</div><time className="text-xs text-slate-500">{timeLabel(entry.recordedAt)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{entry.description}</p>{entry.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.notes}</p>}<CareLogDataDetails data={entry.data} /><p className="mt-2 text-xs text-slate-400">Ghi bởi {entry.staffName || "Nhân viên"}</p>{entry.photos?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{entry.photos.map((photo) => <div key={photo.photoId} className="relative"><a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt="Ảnh ghi nhận chăm sóc" className="h-20 w-20 rounded-lg object-cover" /></a>{date === localDate() && <button type="button" onClick={() => void removePhoto(photo.photoId)} disabled={saving} className="absolute -right-2 -top-2 rounded-full bg-rose-600 px-1.5 py-0.5 text-xs text-white" aria-label="Xóa ảnh">×</button>}</div>)}</div>}{date === localDate() && <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">+ Thêm ảnh<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={saving} onChange={(event) => { void uploadEntryPhotos(entry, event.target.files); event.currentTarget.value = ""; }} /></label>}</li>)}</ol>}
          </section>

          <section className={`rounded-xl border border-slate-200 bg-white p-4 ${activeSection === "health" ? "" : "hidden"}`}>
            <h3 className="font-semibold text-slate-800">Đo chỉ số sức khỏe</h3><p className="mt-1 text-xs text-slate-500">Chỉ số vượt ngưỡng sẽ tự tạo cảnh báo và thông báo cho gia đình.</p>
            {linkActivity?.careType === "VITALS" && <p className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">Đang ghi cho hoạt động trong lịch: <b>{linkActivity.startTime} {linkActivity.activityName}</b><button type="button" onClick={() => setLinkActivity(null)} className="underline">Bỏ gắn</button></p>}
            <form onSubmit={handleVitals} className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[["systolicBp", "Huyết áp tâm thu (mmHg)"], ["diastolicBp", "Huyết áp tâm trương (mmHg)"], ["heartRate", "Nhịp tim (lần/phút)"], ["spO2", "SpO₂ (%)"], ["temperature", "Nhiệt độ (°C)"], ["bloodGlucose", "Đường huyết (mmol/L)"]].map(([name, label]) => <label key={name} className="text-sm font-medium text-slate-700">{label}<input name={name} type="number" min={name === "systolicBp" ? 40 : name === "diastolicBp" ? 20 : name === "heartRate" ? 20 : name === "spO2" ? 50 : name === "temperature" ? 30 : 0.5} max={name === "systolicBp" ? 300 : name === "diastolicBp" ? 200 : name === "heartRate" ? 250 : name === "spO2" ? 100 : name === "temperature" ? 45 : 40} step={name === "temperature" || name === "bloodGlucose" ? "0.1" : "1"} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>)}
              <label className="text-sm font-medium text-slate-700 sm:col-span-2 xl:col-span-3">Ghi chú<textarea name="notes" maxLength={1000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              <button type="submit" disabled={saving || !selectedId || date !== localDate()} className="w-fit rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Lưu chỉ số</button>
            </form>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-sm font-semibold text-slate-800">Các lần đo trong ngày ({vitalsToday.length})</h4>
              {vitalsToday.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">Chưa có lần đo nào trong ngày này.</p> :
                <ol className="mt-2 space-y-3">{vitalsToday.map((entry) => <li key={entry.careLogId} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-slate-800">{entry.description}</p><time className="text-xs text-slate-500">{timeLabel(entry.recordedAt)}</time></div>{entry.notes && <p className="mt-1 text-sm text-slate-600">{entry.notes}</p>}<CareLogDataDetails data={entry.data} /><p className="mt-2 text-xs text-slate-400">Đo bởi {entry.staffName || "Nhân viên"}</p></li>)}</ol>}
            </div>
          </section>

          <section className={`rounded-xl border border-slate-200 bg-white p-4 ${activeSection === "medication" ? "" : "hidden"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-slate-800">Thuốc hôm nay</h3><p className="mt-1 text-xs text-slate-500">Refused và Missed yêu cầu nhập lý do.</p></div><button type="button" onClick={() => void refreshExtras()} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-600">Làm mới</button></div>
            {doses.filter((dose) => selectedId === null || dose.elderlyId === selectedId).length === 0 ? <p className="py-5 text-center text-sm text-slate-500">Không có liều thuốc hôm nay cho người đang chọn.</p> : <div className="mt-3 space-y-3">{doses.filter((dose) => selectedId === null || dose.elderlyId === selectedId).map((dose) => <article key={dose.medicationRecordId} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium text-slate-800">{dose.medicationName} · {dose.dosage}</p><p className="text-xs text-slate-500">{dose.elderlyName} · {new Date(dose.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}{dose.instructions ? ` · ${dose.instructions}` : ""}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{dose.statusLabel || dose.status}</span></div>{dose.status.toLowerCase() === "pending" && <div className="mt-3 flex flex-wrap gap-2"><input value={doseNotes[dose.medicationRecordId] ?? ""} onChange={(event) => setDoseNotes((current) => ({ ...current, [dose.medicationRecordId]: event.target.value }))} placeholder="Lý do nếu từ chối / thiếu thuốc" className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />{(["Given", "Refused", "Missed"] as const).map((status) => <button key={status} type="button" disabled={saving || (status !== "Given" && !doseNotes[dose.medicationRecordId]?.trim())} onClick={async () => { setSaving(true); setError(""); try { await careLogService.updateDose(dose.medicationRecordId, status, doseNotes[dose.medicationRecordId]); setNotice(`Đã cập nhật thuốc: ${status}.`); await refreshDay(dose.elderlyId); } catch (err: any) { setError(err?.response?.data?.message || "Không cập nhật được liều thuốc."); } finally { setSaving(false); } }} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">{status}</button>)}</div>}</article>)}</div>}
          </section>

          <section className={`rounded-xl border border-slate-200 bg-white p-4 ${activeSection === "incidents" ? "" : "hidden"}`}>
            <h3 className="font-semibold text-slate-800">Báo sự cố / cảnh báo</h3>
            {selected && <form onSubmit={handleCreateIncident} className="mt-3 grid gap-3 md:grid-cols-[190px_1fr_auto]">
              <select value={incidentType} onChange={(event) => setIncidentType(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="OTHER">Sự cố khác</option><option value="STROKE">Nghi đột quỵ (khẩn)</option><option value="LOST">Mất dấu (khẩn)</option><option value="FALL">Ngã</option><option value="VITALS_ALERT">Cảnh báo chỉ số</option></select>
              <input value={incidentDescription} onChange={(event) => setIncidentDescription(event.target.value)} required maxLength={2000} placeholder={`Mô tả sự cố của ${selected.fullName}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="submit" disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Gửi báo cáo</button>
            </form>}
            <div className="mt-4 space-y-3">{incidents.filter((incident) => selectedId === null || incident.elderlyId === selectedId).length === 0 ? <p className="py-4 text-center text-sm text-slate-500">Không có sự cố trong 30 ngày gần nhất.</p> : incidents.filter((incident) => selectedId === null || incident.elderlyId === selectedId).map((incident) => <article key={incident.incidentId} className="rounded-lg border border-rose-100 bg-rose-50/50 p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-slate-800">{incidentTypeLabels[incident.incidentType] ?? incident.incidentType} · {incident.elderlyName}</p><span className="text-xs font-semibold text-rose-700">Mức {(severityLabels[incident.severity] ?? incident.severity).toLowerCase()} · {incidentStatusLabels[incident.status] ?? incident.status}</span></div><p className="mt-1 text-sm text-slate-700">{incident.description}</p><p className="mt-1 text-xs text-slate-500">Xảy ra {new Date(incident.occurredAt).toLocaleString("vi-VN")} · Báo bởi {incident.reportedByName}</p>{incident.resolutionNotes && <p className="mt-2 rounded-lg bg-white p-2 text-xs text-slate-600">Kết quả xử lý: {incident.resolutionNotes}</p>}{incident.status !== "Resolved" && <div className="mt-3 flex flex-wrap gap-2">{incident.status === "Open" && <button type="button" disabled={saving} onClick={async () => { setSaving(true); setError(""); try { await careLogService.updateIncident(incident.incidentId, "InProgress"); await refreshExtras(); setNotice("Đã nhận xử lý sự cố."); } catch (err: any) { setError(err?.response?.data?.message || "Không cập nhật được sự cố."); } finally { setSaving(false); } }} className="rounded-lg border px-3 py-1.5 text-xs">Nhận xử lý</button>}<button type="button" disabled={saving} onClick={() => { setResolveNote(""); setDialog({ kind: "resolve", incident }); }} className="rounded-lg border px-3 py-1.5 text-xs">Đánh dấu đã xử lý</button></div>}</article>)}</div>
          </section>

        </div>
      </div>

      {dialog && <div role="dialog" aria-modal="true" aria-labelledby="carelog-dialog-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !saving && setDialog(null)}>
        <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
          {dialog.kind === "close" ? <>
            <h3 id="carelog-dialog-title" className="text-base font-bold text-slate-900">Chốt care log hôm nay?</h3>
            <p className="mt-2 text-sm text-slate-600">Chốt care log của <b>{selected?.fullName}</b>. Sau khi chốt sẽ không ghi thêm được trong ngày.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setDialog(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button type="button" disabled={saving} onClick={() => void runDayAction("close")} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang chốt..." : "Chốt care log"}</button>
            </div>
          </> : dialog.kind === "skip" ? <form onSubmit={(event) => { event.preventDefault(); void skipActivity(); }}>
            <h3 id="carelog-dialog-title" className="text-base font-bold text-slate-900">Bỏ qua hoạt động</h3>
            <p className="mt-1 text-sm text-slate-600">{dialog.item.startTime} · {dialog.item.activityName}</p>
            <label className="mt-4 block text-sm font-medium text-slate-700">Lý do (gia đình xem được)<textarea autoFocus required maxLength={1000} rows={3} value={resolveNote} onChange={(event) => setResolveNote(event.target.value)} placeholder="Ví dụ: Đường huyết 17,2 mmol/L nên không cho tập" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setDialog(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button type="submit" disabled={saving || !resolveNote.trim()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Bỏ qua"}</button>
            </div>
          </form> : <form onSubmit={(event) => { event.preventDefault(); void resolveIncident(); }}>
            <h3 id="carelog-dialog-title" className="text-base font-bold text-slate-900">Đóng sự cố</h3>
            <p className="mt-1 text-sm text-slate-600">{incidentTypeLabels[dialog.incident.incidentType] ?? dialog.incident.incidentType} · {dialog.incident.elderlyName}</p>
            <label className="mt-4 block text-sm font-medium text-slate-700">Kết quả xử lý<textarea autoFocus required maxLength={1000} rows={3} value={resolveNote} onChange={(event) => setResolveNote(event.target.value)} placeholder="Ví dụ: Cho cụ nghỉ 15 phút, đo lại 140/88, đã báo gia đình" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setDialog(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button type="submit" disabled={saving || !resolveNote.trim()} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Đóng sự cố"}</button>
            </div>
          </form>}
        </div>
      </div>}
    </div>
  );
};

export default CareLogView;
