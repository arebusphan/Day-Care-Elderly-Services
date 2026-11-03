import React, { useEffect, useMemo, useState } from "react";
import elderlyService from "../../services/elderlyService";
import familyCareLogService from "../../services/familyCareLogService";
import type { CareLogDay, CareLogEntry } from "../../services/careLogService";
import type { CareLogDaySummary, DoseRecord, FamilyIncident, HealthHistory } from "../../services/familyCareLogService";
import type { ElderlyProfileDto } from "../../types/elderly";

const typeLabels: Record<string, string> = {
  MEAL: "Ăn uống",
  HYGIENE: "Vệ sinh",
  NAP: "Nghỉ ngơi",
  MOOD: "Tâm trạng",
  ACTIVITY: "Hoạt động",
  NOTE: "Ghi nhận",
  VITALS: "Chỉ số sức khỏe",
  MEDICATION: "Thuốc",
};

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatTime = (value: string) => new Date(value).toLocaleTimeString("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateParam = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

type TrackingSection = "timeline" | "health" | "incidents";

const FamilyHealthTrackingView: React.FC = () => {
  const [profiles, setProfiles] = useState<ElderlyProfileDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [days, setDays] = useState(30);
  const [refreshTick, setRefreshTick] = useState(0);
  const [today, setToday] = useState<CareLogDay | null>(null);
  const [timeline, setTimeline] = useState<CareLogDay[]>([]);
  const [history, setHistory] = useState<CareLogDaySummary[]>([]);
  const [health, setHealth] = useState<HealthHistory | null>(null);
  const [incidents, setIncidents] = useState<FamilyIncident[]>([]);
  const [activeSection, setActiveSection] = useState<TrackingSection>("timeline");
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    elderlyService.getMyElderlyProfiles()
      .then((response) => {
        if (cancelled) return;
        const people = response.data ?? [];
        setProfiles(people);
        setSelectedId((current) => current && people.some((person) => person.elderlyId === current)
          ? current
          : people[0]?.elderlyId ?? null);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.message || "Không tải được hồ sơ người thân.");
      })
      .finally(() => { if (!cancelled) setLoadingProfiles(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setTimeline([]);
      return;
    }

    let cancelled = false;
    setLoadingTimeline(true);
    setError("");
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - days + 1);
    Promise.all([
      familyCareLogService.getTimeline(selectedId, days),
      familyCareLogService.getDay(selectedId),
      familyCareLogService.getHistory(selectedId, dateParam(fromDate), dateParam(toDate)),
      familyCareLogService.getHealth(selectedId, days),
      familyCareLogService.getIncidents(days),
    ])
      .then(([timelineResult, todayResult, historyResult, healthResult, incidentResult]) => {
        if (cancelled) return;
        setTimeline(timelineResult);
        setToday(todayResult);
        setHistory(historyResult);
        setHealth(healthResult);
        setIncidents(incidentResult.filter((incident) => incident.elderlyId === selectedId));
      })
      .catch((err: any) => {
        if (!cancelled) {
          setTimeline([]);
          setToday(null);
          setHistory([]);
          setHealth(null);
          setIncidents([]);
          setError(err?.response?.data?.message || "Không tải được dòng thời gian chăm sóc.");
        }
      })
      .finally(() => { if (!cancelled) setLoadingTimeline(false); });
    return () => { cancelled = true; };
  }, [selectedId, days, refreshTick]);

  useEffect(() => {
    if (selectedId === null) return;
    const timer = window.setInterval(() => setRefreshTick((value) => value + 1), 15000);
    return () => window.clearInterval(timer);
  }, [selectedId]);


  const selected = useMemo(
    () => profiles.find((person) => person.elderlyId === selectedId) ?? null,
    [profiles, selectedId],
  );
  const entryCount = timeline.reduce((count, day) => count + day.entries.length, 0);
  const historyEntryCount = history.reduce((count, day) => count + day.entryCount, 0);
  const selectedIncidents = incidents.filter((incident) => incident.elderlyId === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Theo dõi sức khỏe</h2>
          <p className="mt-1 text-sm text-slate-500">Nhật ký chăm sóc do nhân viên ghi nhận; dữ liệu tự cập nhật sau mỗi 15 giây.</p>
        </div>
        <label className="text-sm font-medium text-slate-600">
          Khoảng thời gian
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value={7}>7 ngày gần nhất</option>
            <option value={30}>30 ngày gần nhất</option>
            <option value={90}>90 ngày gần nhất</option>
          </select>
        </label>
        <button type="button" onClick={() => setRefreshTick((value) => value + 1)} disabled={loadingTimeline} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loadingTimeline ? "Đang cập nhật…" : "Làm mới"}</button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {loadingProfiles ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Đang tải hồ sơ…</div>
        : profiles.length === 0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Bạn chưa có hồ sơ người thân liên kết.</div>
          : <>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="block max-w-md text-sm font-medium text-slate-700">
                Người thân
                <select value={selectedId ?? ""} onChange={(event) => setSelectedId(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  {profiles.map((person) => <option key={person.elderlyId} value={person.elderlyId}>{person.fullName}</option>)}
                </select>
              </label>
              {selected && <p className="mt-3 text-xs text-slate-500">Hiển thị dữ liệu {days} ngày gần nhất. Ghi chú nội bộ của nhân viên được ẩn.</p>}
            </section>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Ghi nhận hôm nay" value={today?.entries.length ?? 0} detail="trong ngày" />
              <SummaryCard label="Ngày có ghi nhận" value={history.length} detail={`${historyEntryCount} ghi nhận`} />
              <SummaryCard label="Chỉ số sức khỏe" value={health?.vitals.length ?? 0} detail="lần đo" />
              <SummaryCard label="Lịch sử thuốc" value={health?.doses.length ?? 0} detail="liều trong kỳ" />
              <SummaryCard label="Sự cố / cảnh báo" value={selectedIncidents.length} detail="ghi nhận" />
            </div>

            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
              <SectionButton active={activeSection === "timeline"} onClick={() => setActiveSection("timeline")}>Nhật ký ({entryCount})</SectionButton>
              <SectionButton active={activeSection === "health"} onClick={() => setActiveSection("health")}>Chỉ số & thuốc ({(health?.vitals.length ?? 0) + (health?.doses.length ?? 0)})</SectionButton>
              <SectionButton active={activeSection === "incidents"} onClick={() => setActiveSection("incidents")}>Sự cố ({selectedIncidents.length})</SectionButton>
            </div>

            {activeSection === "timeline" && <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <SectionHeader title="Dòng thời gian chăm sóc" subtitle={selected?.fullName} />
              {loadingTimeline ? <LoadingMessage />
                : timeline.length === 0 ? <EmptyMessage text="Chưa có ghi nhận chăm sóc trong khoảng thời gian này." />
                  : <div className="space-y-8">{timeline.map((day) => <TimelineDay key={day.date} day={day} summary={history.find((item) => item.date === day.date)} />)}</div>}
            </section>}

            {activeSection === "health" && <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
                <SectionHeader title="Các lần đo chỉ số" subtitle="Thông tin sức khỏe do nhân viên ghi nhận" />
                {loadingTimeline ? <LoadingMessage /> : !health?.vitals.length ? <EmptyMessage text="Chưa có lần đo chỉ số trong khoảng thời gian này." />
                  : <div className="space-y-4">{health.vitals.map((entry) => <TimelineEntry key={entry.careLogId} entry={entry} />)}</div>}
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
                <SectionHeader title="Lịch sử thuốc" subtitle="Liều đã đến hạn hoặc đã được ghi nhận" />
                {loadingTimeline ? <LoadingMessage /> : !health?.doses.length ? <EmptyMessage text="Chưa có liều thuốc trong khoảng thời gian này." />
                  : <div className="space-y-3">{health.doses.map((dose) => <DoseCard key={dose.medicationRecordId} dose={dose} />)}</div>}
              </section>
            </div>}

            {activeSection === "incidents" && <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <SectionHeader title="Sự cố và cảnh báo" subtitle="Các sự cố được báo cho gia đình" />
              {loadingTimeline ? <LoadingMessage /> : !selectedIncidents.length ? <EmptyMessage text="Không có sự cố hoặc cảnh báo trong khoảng thời gian này." />
                : <div className="space-y-3">{selectedIncidents.map((incident) => <IncidentCard key={incident.incidentId} incident={incident} />)}</div>}
            </section>}
          </>}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; detail: string }> = ({ label, value, detail }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <div className="mt-2 flex items-baseline gap-2"><span className="text-2xl font-bold text-slate-900">{value}</span><span className="text-xs text-slate-500">{detail}</span></div>
  </div>
);

const SectionButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
    {children}
  </button>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-4 border-b border-slate-100 pb-3">
    <h3 className="font-semibold text-slate-900">{title}</h3>
    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
  </div>
);

const LoadingMessage: React.FC = () => <p className="py-8 text-center text-sm text-slate-500">Đang tải dữ liệu chăm sóc…</p>;

const EmptyMessage: React.FC<{ text: string }> = ({ text }) => <p className="py-8 text-center text-sm text-slate-500">{text}</p>;

const statusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("resolved") || normalized.includes("đã xử lý") || normalized.includes("given") || normalized.includes("đã uống")) return "bg-teal-50 text-teal-700";
  if (normalized.includes("high") || normalized.includes("urgent") || normalized.includes("open") || normalized.includes("từ chối")) return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
};

const DoseCard: React.FC<{ dose: DoseRecord }> = ({ dose }) => (
  <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="font-semibold text-slate-800">{dose.medicationName}</h4><p className="mt-1 text-sm text-slate-600">Liều dùng: {dose.dosage}</p></div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(dose.statusLabel || dose.status)}`}>{dose.statusLabel || dose.status}</span>
    </div>
    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
      <div><dt className="text-slate-500">Lịch uống</dt><dd className="mt-0.5 font-medium text-slate-700">{new Date(dose.scheduledAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</dd></div>
      {dose.recordedAt && <div><dt className="text-slate-500">Đã ghi nhận lúc</dt><dd className="mt-0.5 font-medium text-slate-700">{formatTime(dose.recordedAt)}</dd></div>}
    </dl>
    {dose.instructions && <p className="mt-3 text-sm text-slate-600">Hướng dẫn: {dose.instructions}</p>}
    {dose.notes && <p className="mt-2 text-sm text-slate-600">Ghi chú: {dose.notes}</p>}
    {dose.staffName && <p className="mt-3 text-xs text-slate-400">Ghi nhận bởi {dose.staffName}</p>}
  </article>
);

const IncidentCard: React.FC<{ incident: FamilyIncident }> = ({ incident }) => (
  <article className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="font-semibold text-slate-900">{incident.incidentType}</h4><p className="mt-1 text-sm text-slate-700">{incident.description}</p></div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(incident.severity)}`}>{incident.severity}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      <span>{new Date(incident.occurredAt).toLocaleString("vi-VN")}</span>
      <span>Báo lúc: {new Date(incident.reportedAt).toLocaleString("vi-VN")}</span>
      <span>Trạng thái: {incident.status}</span>
      {incident.reportedByName && <span>Báo bởi: {incident.reportedByName}</span>}
    </div>
    {incident.resolutionNotes && <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-600">Xử lý: {incident.resolutionNotes}</p>}
    {incident.resolvedAt && <p className="mt-2 text-xs text-slate-400">Đã giải quyết {new Date(incident.resolvedAt).toLocaleString("vi-VN")}</p>}
  </article>
);

const TimelineDay: React.FC<{ day: CareLogDay; summary?: CareLogDaySummary }> = ({ day, summary }) => (
  <section>
    <div className="mb-4 flex items-center gap-3">
      <span className="h-3 w-3 rounded-full bg-teal-600 ring-4 ring-teal-50" />
      <h4 className="font-semibold capitalize text-slate-800">{formatDate(day.date)}</h4>
      <span className="text-xs text-slate-400">{summary?.entryCount ?? day.entries.length} ghi nhận</span>
    </div>
    <ol className="ml-1.5 space-y-4 border-l-2 border-teal-100 pl-5 sm:ml-1.5 sm:pl-7">
      {[...day.entries].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map((entry) => <TimelineEntry key={entry.careLogId} entry={entry} />)}
    </ol>
  </section>
);

const TimelineEntry: React.FC<{ entry: CareLogEntry }> = ({ entry }) => (
  <li className="relative">
    <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow ring-1 ring-blue-200 sm:-left-[35px]" />
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-slate-200">{typeLabels[entry.careType] ?? entry.careType}</span>
        <time className="text-xs font-medium text-slate-500">{formatTime(entry.recordedAt)}</time>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm font-medium text-slate-800">{entry.description}</p>
      {entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{entry.notes}</p>}
      {entry.data && <DataDetails data={entry.data} />}
      {entry.photos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{entry.photos.map((photo) => <a key={photo.photoId} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt="Ảnh ghi nhận chăm sóc" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" /></a>)}</div>}
      {(entry.activityName || entry.jobTitle) && <p className="mt-3 text-xs text-slate-500">{entry.activityName && <>Hoạt động: {entry.activityName}</>}{entry.activityName && entry.jobTitle && " · "}{entry.jobTitle}</p>}
      <p className="mt-1 text-xs text-slate-400">Nhân viên: {entry.staffName || "Nhân viên chăm sóc"}</p>
    </article>
  </li>
);

const DataDetails: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const fields = Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (fields.length === 0) return null;
  return <dl className="mt-3 grid gap-x-4 gap-y-2 rounded-lg bg-white p-3 text-xs sm:grid-cols-2">{fields.map(([key, value]) => <div key={key} className="flex justify-between gap-3"><dt className="text-slate-500">{key}</dt><dd className="text-right font-medium text-slate-700">{String(value)}</dd></div>)}</dl>;
};

export default FamilyHealthTrackingView;
