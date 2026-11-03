import React, { useCallback, useEffect, useState } from "react";
import elderlyService from "../../services/elderlyService";
import type { ElderlyProfileDto } from "../../types/elderly";
import attendanceService from "../../services/attendanceService";
import type { AttendanceItem } from "../../services/attendanceService";

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatTime = (value?: string | null) => value
  ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  : "—";

const FamilyAttendanceView: React.FC = () => {
  const [profiles, setProfiles] = useState<ElderlyProfileDto[]>([]);
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [elderlyResponse, attendanceList] = await Promise.all([
        elderlyService.getMyElderlyProfiles(),
        attendanceService.getByDate(localDate()),
      ]);
      setProfiles(elderlyResponse.data ?? []);
      setRecords(attendanceList);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không tải được thông tin điểm danh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const recordByElderly = new Map(records.map((record) => [record.elderlyId, record]));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Điểm danh người thân</h2>
          <p className="mt-1 text-sm text-slate-500">Theo dõi thời gian đến và rời trung tâm của người thân.</p>
        </div>
        <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Hôm nay · {new Date().toLocaleDateString("vi-VN")}</span>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-semibold text-slate-800">Danh sách điểm danh</h3><p className="mt-1 text-xs text-slate-500">Trạng thái và thời gian được cập nhật từ trung tâm.</p></div>
        {loading ? <p className="p-6 text-sm text-slate-500">Đang tải dữ liệu…</p> : profiles.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Bạn chưa có hồ sơ người thân liên kết.</p> : (
          <div className="divide-y divide-slate-100">
            {profiles.map((elderly) => {
              const record = recordByElderly.get(elderly.elderlyId);
              const checkedOut = Boolean(record?.checkOutAt);
              return <article key={elderly.elderlyId} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h4 className="font-semibold text-slate-900">{elderly.fullName}</h4><p className="mt-1 text-sm text-slate-500">{elderly.centerName || "Trung tâm chăm sóc"}{elderly.relationship ? ` · ${elderly.relationship}` : ""}</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${!record ? "bg-slate-100 text-slate-600" : checkedOut ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-700"}`}>{!record ? "Chưa check-in" : checkedOut ? "Đã check-out" : "Đang ở trung tâm"}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Giờ đến</p><p className="mt-1 text-sm font-semibold">{formatTime(record?.checkInAt)}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Giờ rời trung tâm</p><p className="mt-1 text-sm font-semibold">{formatTime(record?.checkOutAt)}</p></div>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default FamilyAttendanceView;
