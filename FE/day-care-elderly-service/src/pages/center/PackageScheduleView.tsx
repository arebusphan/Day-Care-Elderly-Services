import React, { useEffect, useMemo, useState } from "react";
import scheduleService, { CONDITION_LABELS, DAY_LABELS, ROLE_LABELS } from "../../services/scheduleService";
import type { PackageActivity, PackageScheduleSummary, UpsertPackageActivity } from "../../services/scheduleService";
import { careTypeLabels } from "../../lib/careLogLabels";

/** Loại care log dùng được cho 1 hoạt động trong lịch (CareLogTypes.Schedulable ở BE) */
const CARE_TYPES = ["ACTIVITY", "MEAL", "VITALS", "MOOD", "NAP", "HYGIENE", "NOTE"];

const emptyForm: UpsertPackageActivity = {
  dayOfWeek: null, startTime: "08:45", endTime: "09:30", activityName: "", purpose: "", careType: "ACTIVITY",
  targetMinutes: null, performerRole: "Any", isRequired: true, conditionCode: null, source: "",
};

const errorText = (err: any, fallback: string) => {
  const data = err?.response?.data;
  const errors: string[] | undefined = Array.isArray(data?.errors) ? data.errors : undefined;
  return errors?.length ? errors.join("; ") : data?.message || fallback;
};

/** Quản lý / Admin: lịch hoạt động mẫu theo từng gói (đối tượng bệnh) */
const PackageScheduleView: React.FC = () => {
  const [packages, setPackages] = useState<PackageScheduleSummary[]>([]);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [activities, setActivities] = useState<PackageActivity[]>([]);
  const [dayFilter, setDayFilter] = useState<number | "all">("all");
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<{ id: number | null; form: UpsertPackageActivity } | null>(null);

  useEffect(() => {
    scheduleService.getPackages()
      .then((rows) => { setPackages(rows); setPackageId((current) => current ?? rows[0]?.packageId ?? null); })
      .catch((err) => setError(errorText(err, "Không tải được danh sách gói.")));
  }, []);

  const reload = async (id = packageId) => {
    if (id === null) return;
    setLoading(true); setError("");
    try { setActivities(await scheduleService.getActivities(id, true)); }
    catch (err) { setError(errorText(err, "Không tải được lịch hoạt động.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(packageId); }, [packageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => activities
    .filter((a) => showHidden || a.isActive)
    .filter((a) => dayFilter === "all" || a.dayOfWeek === null || a.dayOfWeek === dayFilter)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)), [activities, showHidden, dayFilter]);

  const minutesPerWeek = useMemo(() => activities
    .filter((a) => a.isActive && a.careType === "ACTIVITY" && a.conditionCode === null)
    .reduce((sum, a) => sum + (a.targetMinutes ?? 0) * (a.dayOfWeek === null ? 6 : 1), 0), [activities]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || packageId === null) return;
    const form = editing.form;
    const dto: UpsertPackageActivity = {
      ...form,
      purpose: form.purpose?.trim() || null,
      source: form.source?.trim() || null,
      targetMinutes: form.targetMinutes ? Number(form.targetMinutes) : null,
    };
    setSaving(true); setError("");
    try {
      if (editing.id === null) await scheduleService.createActivity(packageId, dto);
      else await scheduleService.updateActivity(editing.id, dto);
      setEditing(null);
      setNotice(editing.id === null ? "Đã thêm hoạt động." : "Đã cập nhật hoạt động.");
      await reload();
      setPackages(await scheduleService.getPackages());
    } catch (err) { setError(errorText(err, "Không lưu được hoạt động.")); }
    finally { setSaving(false); }
  };

  const toggle = async (activity: PackageActivity) => {
    setSaving(true); setError("");
    try {
      await scheduleService.setActive(activity.packageActivityId, !activity.isActive);
      setNotice(activity.isActive ? `Đã ẩn "${activity.activityName}".` : `Đã hiện lại "${activity.activityName}".`);
      await reload();
    } catch (err) { setError(errorText(err, "Không đổi được trạng thái.")); }
    finally { setSaving(false); }
  };

  const setField = <K extends keyof UpsertPackageActivity>(key: K, value: UpsertPackageActivity[K]) =>
    setEditing((current) => current ? { ...current, form: { ...current.form, [key]: value } } : current);

  const selected = packages.find((p) => p.packageId === packageId);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Lịch hoạt động theo gói</h2>
        <p className="mt-1 text-sm text-slate-500">Lịch mẫu cho từng đối tượng bệnh. Nhân viên thấy lịch này trong Carelog của từng cụ và đánh dấu việc đã làm.</p>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{notice}</div>}

      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">Gói dịch vụ
          <select value={packageId ?? ""} onChange={(e) => { setNotice(""); setPackageId(Number(e.target.value)); }} className="mt-1 block min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2">
            {packages.map((p) => <option key={p.packageId} value={p.packageId}>{p.packageName} ({p.activityCount})</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Thứ
          <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value === "all" ? "all" : Number(e.target.value))} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="all">Cả tuần</option>
            {Object.entries(DAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-600"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />Hiện cả hoạt động đã ẩn</label>
        <button type="button" disabled={packageId === null} onClick={() => { setNotice(""); setEditing({ id: null, form: { ...emptyForm, dayOfWeek: dayFilter === "all" ? null : dayFilter } }); }} className="ml-auto rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">+ Thêm hoạt động</button>
      </section>

      {selected && <p className="text-sm text-slate-600">Gói <b>{selected.packageName}</b>: {activities.filter((a) => a.isActive).length} dòng lịch đang dùng · tổng thời gian hoạt động ~{minutesPerWeek} phút/tuần (chưa tính hoạt động theo bệnh nền).</p>}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-6 text-sm text-slate-500">Đang tải lịch...</p> : visible.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Chưa có hoạt động nào.</p> :
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
              <th className="px-3 py-2">Giờ</th><th className="px-3 py-2">Thứ</th><th className="px-3 py-2">Hoạt động</th><th className="px-3 py-2">Loại</th><th className="px-3 py-2">Người làm</th><th className="px-3 py-2">Áp dụng</th><th className="px-3 py-2">Nguồn</th><th className="px-3 py-2" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((a) => (
                <tr key={a.packageActivityId} className={a.isActive ? "" : "bg-slate-50 text-slate-400"}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{a.startTime}–{a.endTime}</td>
                  <td className="px-3 py-2">{a.dayOfWeek === null ? "Mọi ngày" : DAY_LABELS[a.dayOfWeek]}</td>
                  <td className="px-3 py-2"><p className="font-medium text-slate-800">{a.activityName}{!a.isRequired && <span className="ml-1 text-xs font-normal text-slate-400">(tùy chọn)</span>}</p>{a.purpose && <p className="text-xs text-slate-500">{a.purpose}</p>}</td>
                  <td className="whitespace-nowrap px-3 py-2">{careTypeLabels[a.careType] ?? a.careType}{a.targetMinutes ? ` · ${a.targetMinutes}′` : ""}</td>
                  <td className="whitespace-nowrap px-3 py-2">{ROLE_LABELS[a.performerRole] ?? a.performerRole}</td>
                  <td className="whitespace-nowrap px-3 py-2">{a.conditionCode ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">Chỉ cụ {CONDITION_LABELS[a.conditionCode] ?? a.conditionCode}</span> : "Mọi cụ"}</td>
                  <td className="max-w-48 px-3 py-2 text-xs text-slate-500">{a.source}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button type="button" disabled={saving} onClick={() => { setNotice(""); setEditing({ id: a.packageActivityId, form: { dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime, activityName: a.activityName, purpose: a.purpose ?? "", careType: a.careType, targetMinutes: a.targetMinutes, performerRole: a.performerRole, isRequired: a.isRequired, conditionCode: a.conditionCode, source: a.source ?? "" } }); }} className="rounded-lg border px-2.5 py-1 text-xs">Sửa</button>
                    <button type="button" disabled={saving} onClick={() => void toggle(a)} className="ml-2 rounded-lg border px-2.5 py-1 text-xs">{a.isActive ? "Ẩn" : "Hiện"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
      </section>

      {editing && <div role="dialog" aria-modal="true" aria-labelledby="pkg-activity-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !saving && setEditing(null)}>
        <form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h3 id="pkg-activity-title" className="text-base font-bold text-slate-900">{editing.id === null ? "Thêm hoạt động" : "Sửa hoạt động"} · {selected?.packageName}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">Thứ
              <select value={editing.form.dayOfWeek ?? ""} onChange={(e) => setField("dayOfWeek", e.target.value === "" ? null : Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="">Mọi ngày (T2–T7)</option>
                {Object.entries(DAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Bắt đầu<input type="time" required value={editing.form.startTime} onChange={(e) => setField("startTime", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Kết thúc<input type="time" required value={editing.form.endTime} onChange={(e) => setField("endTime", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-3">Tên hoạt động<input required maxLength={150} value={editing.form.activityName} onChange={(e) => setField("activityName", e.target.value)} placeholder="Ví dụ: Vật lý trị liệu" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-3">Mục đích (để làm gì cho cụ)<input maxLength={500} value={editing.form.purpose ?? ""} onChange={(e) => setField("purpose", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Loại care log
              <select value={editing.form.careType} onChange={(e) => setField("careType", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">
                {CARE_TYPES.map((type) => <option key={type} value={type}>{careTypeLabels[type] ?? type}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Phút mục tiêu<input type="number" min={1} max={480} value={editing.form.targetMinutes ?? ""} onChange={(e) => setField("targetMinutes", e.target.value ? Number(e.target.value) : null)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Người làm
              <select value={editing.form.performerRole} onChange={(e) => setField("performerRole", e.target.value as UpsertPackageActivity["performerRole"])} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">
                {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Áp dụng cho
              <select value={editing.form.conditionCode ?? ""} onChange={(e) => setField("conditionCode", e.target.value || null)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="">Mọi cụ trong gói</option>
                {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>Chỉ cụ {label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Nguồn nghiên cứu<input maxLength={200} value={editing.form.source ?? ""} onChange={(e) => setField("source", e.target.value)} placeholder="Ví dụ: WHO 2020, NICE NG236" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-3"><input type="checkbox" checked={editing.form.isRequired} onChange={(e) => setField("isRequired", e.target.checked)} />Bắt buộc (tính vào số việc phải làm trong ngày)</label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </form>
      </div>}
    </div>
  );
};

export default PackageScheduleView;
