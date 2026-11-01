import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardList, Users, UserCheck, Zap, CheckCircle2,
  ChevronRight, ChevronLeft, AlertTriangle, RefreshCw,
  CheckCircle, XCircle, Clock, UserX, Loader2, Search,
  Plus, Trash2, ArrowRightLeft, ShieldCheck, HeartHandshake,
  UserCheck2, HelpCircle
} from "lucide-react";
import dailyPlanningService, {
  type DailyPlanSummary,
  type AttendanceForecastResult,
  type StaffAvailabilityResult,
  type GroupArrangementResult,
  type GroupMemberItem
} from "../../services/dailyPlanningService";

// ── Helpers ───────────────────────────────────────────────────────────────

function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STEPS = [
  { id: 0, label: "1. Attendance Forecast\nXác nhận người đến", icon: ClipboardList, short: "1. Điểm danh" },
  { id: 1, label: "2. Group Arrangement\nKiểm tra nhóm", icon: Users, short: "2. Xếp nhóm" },
  { id: 2, label: "3. Staff Availability\nXác nhận nhân viên", icon: UserCheck, short: "3. Nhân viên" },
  { id: 3, label: "4. Staff Assignment\nPhân công tự động", icon: Zap, short: "4. Phân công" },
  { id: 4, label: "5. Review & Publish\nKiểm tra & Công bố", icon: CheckCircle2, short: "5. Công bố" },
];

export const DailyPlanningWizard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getTomorrowString());
  const [currentStep, setCurrentStep] = useState(0);
  const [planSummary, setPlanSummary] = useState<DailyPlanSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step data cache
  const [attendanceData, setAttendanceData] = useState<AttendanceForecastResult | null>(null);
  const [groupData, setGroupData] = useState<GroupArrangementResult | null>(null);
  const [staffData, setStaffData] = useState<StaffAvailabilityResult | null>(null);

  const initPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dailyPlanningService.getOrInitPlan(selectedDate);
      if (res.success && res.data) {
        setPlanSummary(res.data);
        setAttendanceData(null);
        setGroupData(null);
        setStaffData(null);
      } else {
        setError(res.message);
      }
    } catch {
      setError("Không thể tải kế hoạch cho ngày đã chọn.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { initPlan(); }, [initPlan]);

  const planId = planSummary?.planId ?? 0;

  const refreshSummary = async () => {
    if (!planId) return;
    const res = await dailyPlanningService.getPlanSummary(planId);
    if (res.success && res.data) setPlanSummary(res.data);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Quy Trình Lập Kế Hoạch Chăm Sóc Hàng Ngày</h2>
            {planSummary && (
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                planSummary.status === "Published"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : planSummary.status === "ReadyToReview"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                {planSummary.statusLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình chuẩn 5 bước dành cho Quản lý Trung tâm chuẩn bị lịch cho ngày mai
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Ngày lập kế hoạch:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-xs"
          />
          <button
            onClick={initPlan}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {loading && !planSummary && (
        <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      )}

      {planSummary && (
        <>
          {/* Step Indicator Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs">
            <div className="flex items-center">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = currentStep === idx;
                const isPassed = currentStep > idx || planSummary.status === "Published";
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => setCurrentStep(idx)}
                      className={`flex flex-col items-center gap-1.5 flex-1 py-2 px-1 rounded-lg transition text-center cursor-pointer ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 font-semibold shadow-xs"
                          : isPassed
                          ? "text-emerald-600 hover:bg-emerald-50/50"
                          : "text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition ${
                        isActive
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                          : isPassed
                          ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                          : "bg-white border-slate-300 text-slate-400"
                      }`}>
                        {isPassed && !isActive ? <CheckCircle size={14} /> : <Icon size={14} />}
                      </div>
                      <span className="text-[11px] leading-tight whitespace-pre-line hidden md:block">
                        {step.label}
                      </span>
                      <span className="text-[10px] font-semibold md:hidden">{step.short}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 ${currentStep > idx ? "bg-emerald-500" : "bg-slate-200"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Wizard Content Body */}
          <div className="bg-white rounded-xl border border-slate-200 min-h-[460px] shadow-xs">
            {currentStep === 0 && (
              <Step1Attendance
                planId={planId}
                data={attendanceData}
                onDataLoaded={setAttendanceData}
                onChanged={refreshSummary}
              />
            )}
            {currentStep === 1 && (
              <Step2Groups
                planId={planId}
                data={groupData}
                onDataLoaded={setGroupData}
                onChanged={refreshSummary}
              />
            )}
            {currentStep === 2 && (
              <Step3StaffAvailability
                date={selectedDate}
                data={staffData}
                onDataLoaded={setStaffData}
                onChanged={refreshSummary}
              />
            )}
            {currentStep === 3 && (
              <Step4GenerateAssignment
                planId={planId}
                onAssigned={refreshSummary}
              />
            )}
            {currentStep === 4 && (
              <Step5ReviewPublish
                planId={planId}
                summary={planSummary}
                onPublished={(s) => setPlanSummary(s)}
              />
            )}
          </div>

          {/* Wizard Footer Navigation */}
          <div className="flex justify-between items-center py-1">
            <button
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
            >
              <ChevronLeft size={16} /> Quay lại Bước {currentStep > 0 ? currentStep : ""}
            </button>
            {currentStep < 4 && (
              <button
                onClick={() => setCurrentStep(s => Math.min(4, s + 1))}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-sm"
              >
                Tiếp tục Bước {currentStep + 2} <ChevronRight size={16} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// STEP 1: ATTENDANCE FORECAST
// ══════════════════════════════════════════════════════════════════════════

const Step1Attendance: React.FC<{
  planId: number;
  data: AttendanceForecastResult | null;
  onDataLoaded: (d: AttendanceForecastResult) => void;
  onChanged: () => void;
}> = ({ planId, data, onDataLoaded, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobilityFilter, setMobilityFilter] = useState("all");

  useEffect(() => {
    if (!data) {
      setLoading(true);
      dailyPlanningService.getAttendanceForecast(planId)
        .then(res => { if (res.success && res.data) onDataLoaded(res.data); })
        .finally(() => setLoading(false));
    }
  }, [planId, data, onDataLoaded]);

  const updateStatus = async (elderlyId: number, nextStatus: string) => {
    setUpdatingId(elderlyId);
    const res = await dailyPlanningService.updateAttendance(planId, elderlyId, nextStatus);
    if (res.success && res.data) {
      onDataLoaded(res.data);
      onChanged();
    }
    setUpdatingId(null);
  };

  const markAllExpected = async () => {
    if (!data) return;
    setLoading(true);
    const updates = data.items.map(i => ({ elderlyId: i.elderlyId, attendanceStatus: "Expected" }));
    const res = await dailyPlanningService.bulkUpdateAttendance(planId, updates);
    if (res.success && res.data) {
      onDataLoaded(res.data);
      onChanged();
    }
    setLoading(false);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter(item => {
      const matchSearch =
        item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.memberCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPackage = packageFilter === "all" || (item.servicePackageName || "").includes(packageFilter);
      const matchStatus = statusFilter === "all" || item.attendanceStatus === statusFilter;
      const matchMobility = mobilityFilter === "all" || item.mobilityStatus === mobilityFilter;
      return matchSearch && matchPackage && matchStatus && matchMobility;
    });
  }, [data, searchTerm, packageFilter, statusFilter, mobilityFilter]);

  if (loading && !data) return <LoadingState label="Đang tải danh sách điểm danh..." />;

  return (
    <div className="p-5">
      {/* Title & Quick Stats */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Bước 1: Attendance Forecast — Xác nhận người đến</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Xác định ngày mai có những người cao tuổi nào đến trung tâm: Expected, Absent, Not Confirmed
          </p>
        </div>
        {data && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              Expected: {data.totalExpected} (Normal: {data.totalNormal} | Support: {data.totalSupport})
            </span>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
              Absent: {data.totalAbsent}
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
              Not Confirmed: {data.totalNotConfirmed}
            </span>
            <button
              onClick={markAllExpected}
              disabled={loading}
              className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition"
            >
              Chọn tất cả Expected
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã cụ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={packageFilter}
          onChange={e => setPackageFilter(e.target.value)}
          className="py-1.5 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
        >
          <option value="all">Tất cả gói dịch vụ</option>
          <option value="Cơ bản">Gói Cơ bản</option>
          <option value="Phục hồi">Phục hồi chức năng</option>
          <option value="Sa sút">Sa sút trí tuệ</option>
          <option value="tai biến">Sau tai biến</option>
          <option value="Giai đoạn cuối">Giai đoạn cuối</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="py-1.5 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Expected">Expected (Đến)</option>
          <option value="Absent">Absent (Nghỉ)</option>
          <option value="NotConfirmed">Not Confirmed (Chưa xác nhận)</option>
        </select>
        <select
          value={mobilityFilter}
          onChange={e => setMobilityFilter(e.target.value)}
          className="py-1.5 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
        >
          <option value="all">Tất cả phân loại</option>
          <option value="Normal">Normal (Bình thường)</option>
          <option value="Support">Support (Cần hỗ trợ)</option>
        </select>
      </div>

      {/* Table list */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Mã & Họ tên</th>
              <th className="py-2.5 px-3">Phân loại</th>
              <th className="py-2.5 px-3">Gói Dịch Vụ</th>
              <th className="py-2.5 px-3">Care Group Hiện Tại</th>
              <th className="py-2.5 px-3">Trạng Thái Dự Kiến</th>
              <th className="py-2.5 px-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map(item => (
              <tr key={item.elderlyId} className={`hover:bg-slate-50/80 transition ${
                item.attendanceStatus === "Absent" ? "bg-rose-50/20" : ""
              }`}>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-slate-900">{item.fullName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{item.memberCode}</div>
                </td>
                <td className="py-2.5 px-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.mobilityStatus === "Support"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {item.mobilityStatus}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  {item.servicePackageName || "Gói Cơ bản"}
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  {item.careGroupName ? (
                    <span className="font-medium text-slate-800">{item.careGroupName}</span>
                  ) : (
                    <span className="text-slate-400 italic">Chưa xếp nhóm</span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    item.attendanceStatus === "Expected"
                      ? "bg-emerald-100 text-emerald-800"
                      : item.attendanceStatus === "Absent"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {item.attendanceStatus === "Expected" && <CheckCircle size={11} />}
                    {item.attendanceStatus === "Absent" && <XCircle size={11} />}
                    {item.attendanceStatus === "NotConfirmed" && <HelpCircle size={11} />}
                    {item.attendanceStatus}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                    <button
                      onClick={() => updateStatus(item.elderlyId, "Expected")}
                      disabled={updatingId === item.elderlyId}
                      className={`px-2 py-1 text-[11px] font-semibold transition ${
                        item.attendanceStatus === "Expected"
                          ? "bg-emerald-600 text-white font-bold"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Expected
                    </button>
                    <button
                      onClick={() => updateStatus(item.elderlyId, "Absent")}
                      disabled={updatingId === item.elderlyId}
                      className={`px-2 py-1 text-[11px] font-semibold border-l border-slate-200 transition ${
                        item.attendanceStatus === "Absent"
                          ? "bg-rose-600 text-white font-bold"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      onClick={() => updateStatus(item.elderlyId, "NotConfirmed")}
                      disabled={updatingId === item.elderlyId}
                      className={`px-2 py-1 text-[11px] font-semibold border-l border-slate-200 transition ${
                        item.attendanceStatus === "NotConfirmed"
                          ? "bg-amber-500 text-white font-bold"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Not Confirmed
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Không tìm thấy người cao tuổi nào phù hợp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// STEP 2: GROUP ARRANGEMENT
// ══════════════════════════════════════════════════════════════════════════

const Step2Groups: React.FC<{
  planId: number;
  data: GroupArrangementResult | null;
  onDataLoaded: (d: GroupArrangementResult) => void;
  onChanged: () => void;
}> = ({ planId, data, onDataLoaded, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState<"Normal" | "Support">("Normal");
  const [creating, setCreating] = useState(false);

  // Moving state
  const [movingElderly, setMovingElderly] = useState<GroupMemberItem | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<number>(0);

  useEffect(() => {
    if (!data) {
      setLoading(true);
      dailyPlanningService.getGroupArrangement(planId)
        .then(res => { if (res.success && res.data) onDataLoaded(res.data); })
        .finally(() => setLoading(false));
    }
  }, [planId, data, onDataLoaded]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    const res = await dailyPlanningService.createCareGroup(planId, newGroupName.trim(), newGroupType);
    if (res.success && res.data) {
      onDataLoaded(res.data);
      onChanged();
      setShowCreateModal(false);
      setNewGroupName("");
    }
    setCreating(false);
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa nhóm này?")) return;
    const res = await dailyPlanningService.deleteCareGroup(planId, groupId);
    if (res.success && res.data) {
      onDataLoaded(res.data);
      onChanged();
    }
  };

  const handleMoveElderly = async () => {
    if (!movingElderly || !targetGroupId) return;
    const res = await dailyPlanningService.moveElderlyToGroup(planId, movingElderly.elderlyId, targetGroupId);
    if (res.success && res.data) {
      onDataLoaded(res.data);
      onChanged();
      setMovingElderly(null);
    } else {
      alert(res.message || "Không thể chuyển nhóm.");
    }
  };

  if (loading && !data) return <LoadingState label="Đang tải cấu trúc nhóm..." />;

  const allGroups = data ? [...data.supportGroups, ...data.normalGroups] : [];

  return (
    <div className="p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Bước 2: Group Arrangement — Kiểm tra nhóm chăm sóc</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Đảm bảo danh sách người dự kiến đến được phân vào nhóm phù hợp (Normal: tối đa 10 người, Support: tối đa 4 người)
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
        >
          <Plus size={14} /> Tạo nhóm mới
        </button>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Unassigned List if any */}
          {data.unassigned.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" />
                  {data.unassigned.length} người cao tuổi chưa được xếp nhóm
                </p>
                <span className="text-[11px] text-amber-700">
                  (Sẽ được phân công tự động ở Bước 4 hoặc gán thủ công ngay)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.unassigned.map(u => (
                  <div
                    key={u.elderlyId}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs shadow-2xs"
                  >
                    <span className={`w-2 h-2 rounded-full ${u.mobilityStatus === "Support" ? "bg-amber-500" : "bg-blue-500"}`} />
                    <span className="font-medium text-slate-800">{u.fullName}</span>
                    <span className="text-[10px] text-slate-400">({u.mobilityStatus})</span>
                    <button
                      onClick={() => setMovingElderly(u)}
                      className="ml-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      + Vào nhóm
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allGroups.map(group => {
              const isSupport = group.groupType === "Support";
              return (
                <div
                  key={group.groupId}
                  className={`border rounded-xl p-4 flex flex-col justify-between transition shadow-xs ${
                    isSupport
                      ? "border-amber-200 bg-amber-50/20"
                      : "border-blue-200 bg-blue-50/20"
                  }`}
                >
                  <div>
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{group.groupName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSupport ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {group.groupType}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          group.isFull ? "bg-red-100 text-red-700 font-black" : "bg-slate-100 text-slate-700"
                        }`}>
                          {group.currentCount}/{group.maxCapacity}
                        </span>
                        {group.currentCount === 0 && (
                          <button
                            onClick={() => handleDeleteGroup(group.groupId)}
                            className="text-slate-400 hover:text-red-600 transition"
                            title="Xóa nhóm rỗng"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Assigned Staff */}
                    <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                      <UserCheck2 size={12} className={group.staffName ? "text-emerald-600" : "text-slate-400"} />
                      <span>Nhân sự: </span>
                      <strong className="text-slate-700">{group.staffName || "Chưa phân công"}</strong>
                    </div>

                    {/* Member List */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {group.members.map(m => (
                        <div
                          key={m.elderlyId}
                          className="flex items-center justify-between text-xs bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${m.mobilityStatus === "Support" ? "bg-amber-500" : "bg-blue-500"}`} />
                            <span className="font-medium text-slate-800">{m.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({m.memberCode})</span>
                          </div>
                          <button
                            onClick={() => setMovingElderly(m)}
                            className="text-slate-400 hover:text-emerald-600 p-0.5"
                            title="Chuyển sang nhóm khác"
                          >
                            <ArrowRightLeft size={12} />
                          </button>
                        </div>
                      ))}
                      {group.members.length === 0 && (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          Nhóm chưa có thành viên
                        </div>
                      )}
                    </div>
                  </div>

                  {group.isFull && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <AlertTriangle size={11} /> Nhóm đã đạt giới hạn tối đa
                    </div>
                  )}
                </div>
              );
            })}

            {allGroups.length === 0 && (
              <div className="col-span-3 py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                Chưa có nhóm chăm sóc nào. Hãy nhấn <strong>"Tạo nhóm mới"</strong> hoặc tiếp tục sang <strong>Bước 4</strong> để hệ thống tự động sinh nhóm.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tạo nhóm mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Tạo nhóm chăm sóc mới</h4>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tên nhóm:</label>
              <input
                type="text"
                placeholder="VD: Nhóm Normal 3 hoặc Nhóm Support 2"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Loại nhóm:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewGroupType("Normal")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition ${
                    newGroupType === "Normal"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Normal (Max 10)
                </button>
                <button
                  type="button"
                  onClick={() => setNewGroupType("Support")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition ${
                    newGroupType === "Support"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Support (Max 4)
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={creating || !newGroupName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
              >
                {creating ? "Đang tạo..." : "Xác nhận tạo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chuyển nhóm cho cụ */}
      {movingElderly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Chuyển nhóm cho người cao tuổi</h4>
            <p className="text-xs text-slate-600">
              Chọn nhóm đích cho <strong>{movingElderly.fullName}</strong> ({movingElderly.mobilityStatus}):
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nhóm đích:</label>
              <select
                value={targetGroupId}
                onChange={e => setTargetGroupId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              >
                <option value={0}>-- Chọn nhóm đích --</option>
                {allGroups
                  .filter(g => g.groupType === movingElderly.mobilityStatus)
                  .map(g => (
                    <option key={g.groupId} value={g.groupId} disabled={g.isFull}>
                      {g.groupName} ({g.currentCount}/{g.maxCapacity}) {g.isFull ? "- [ĐÃ ĐỦ]" : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingElderly(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleMoveElderly}
                disabled={!targetGroupId}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// STEP 3: STAFF AVAILABILITY
// ══════════════════════════════════════════════════════════════════════════

const Step3StaffAvailability: React.FC<{
  date: string;
  data: StaffAvailabilityResult | null;
  onDataLoaded: (d: StaffAvailabilityResult) => void;
  onChanged: () => void;
}> = ({ date, data, onDataLoaded, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAvail, setFilterAvail] = useState<string>("all");

  useEffect(() => {
    if (!data) {
      setLoading(true);
      dailyPlanningService.getStaffAvailability(date)
        .then(res => { if (res.success && res.data) onDataLoaded(res.data); })
        .finally(() => setLoading(false));
    }
  }, [date, data, onDataLoaded]);

  const updateAvailability = async (staffId: number, nextAvail: string) => {
    setUpdatingId(staffId);
    const res = await dailyPlanningService.updateStaffAvailability(date, staffId, nextAvail);
    if (res.success && res.data) {
      onDataLoaded(res.data);
      onChanged();
    }
    setUpdatingId(null);
  };

  const filteredStaff = useMemo(() => {
    if (!data) return [];
    return data.staff.filter(s => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phoneNumber || "").includes(searchTerm);
      const matchAvail = filterAvail === "all" || s.availability === filterAvail;
      return matchSearch && matchAvail;
    });
  }, [data, searchTerm, filterAvail]);

  if (loading && !data) return <LoadingState label="Đang tải tình trạng nhân viên..." />;

  return (
    <div className="p-5">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Bước 3: Staff Availability — Xác nhận nhân viên</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Xác định nhân viên nào có thể làm việc ngày mai: Working, Off, Leave
          </p>
        </div>
        {data && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              Working: {data.totalWorking}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold">
              Off: {data.totalOff}
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
              Leave: {data.totalLeave}
            </span>
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-4">
          {/* Requirement Status Banner */}
          <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            data.hasEnoughStaff
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <div className="flex items-center gap-2">
              {data.hasEnoughStaff ? <CheckCircle size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-red-600" />}
              <span>
                <strong>{data.hasEnoughStaff ? "ĐỦ NHÂN SỰ" : "THIẾU NHÂN SỰ"}:</strong>{" "}
                Cần tối thiểu {data.requiredNormalStaff + data.requiredSupportStaff} nhân sự ({data.requiredNormalStaff} nhóm Normal + {data.requiredSupportStaff} nhóm Support). Hiện có <strong>{data.totalWorking}</strong> nhân viên Working.
              </span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nhân viên theo tên, email, SĐT..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <select
              value={filterAvail}
              onChange={e => setFilterAvail(e.target.value)}
              className="py-1.5 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="Working">Working (Đi làm)</option>
              <option value="Off">Off (Nghỉ ca)</option>
              <option value="Leave">Leave (Nghỉ phép)</option>
            </select>
          </div>

          {/* Staff List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Họ và tên</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Số điện thoại</th>
                  <th className="py-2.5 px-3">Tình trạng hiện tại</th>
                  <th className="py-2.5 px-3 text-right">Chọn trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map(staff => (
                  <tr key={staff.userId} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{staff.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{staff.email}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{staff.phoneNumber || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        staff.availability === "Working"
                          ? "bg-emerald-100 text-emerald-800"
                          : staff.availability === "Leave"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-150 text-slate-700"
                      }`}>
                        {staff.availability === "Working" && <CheckCircle size={10} />}
                        {staff.availability === "Leave" && <Clock size={10} />}
                        {staff.availability === "Off" && <UserX size={10} />}
                        {staff.availability}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                        <button
                          onClick={() => updateAvailability(staff.userId, "Working")}
                          disabled={updatingId === staff.userId}
                          className={`px-3 py-1 text-[11px] font-semibold transition ${
                            staff.availability === "Working"
                              ? "bg-emerald-600 text-white font-bold"
                              : "bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Working
                        </button>
                        <button
                          onClick={() => updateAvailability(staff.userId, "Off")}
                          disabled={updatingId === staff.userId}
                          className={`px-3 py-1 text-[11px] font-semibold border-l border-slate-200 transition ${
                            staff.availability === "Off"
                              ? "bg-slate-700 text-white font-bold"
                              : "bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Off
                        </button>
                        <button
                          onClick={() => updateAvailability(staff.userId, "Leave")}
                          disabled={updatingId === staff.userId}
                          className={`px-3 py-1 text-[11px] font-semibold border-l border-slate-200 transition ${
                            staff.availability === "Leave"
                              ? "bg-amber-500 text-white font-bold"
                              : "bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Leave
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Không tìm thấy nhân viên nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// STEP 4: STAFF ASSIGNMENT
// ══════════════════════════════════════════════════════════════════════════

const Step4GenerateAssignment: React.FC<{
  planId: number;
  onAssigned: () => void;
}> = ({ planId, onAssigned }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPlan, setResultPlan] = useState<any | null>(null);

  const runAlgorithm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dailyPlanningService.generateAssignment(planId);
      if (res.success && res.data) {
        setResultPlan(res.data);
        onAssigned();
      } else {
        setError(res.message || "Không thể phân công tự động.");
      }
    } catch {
      setError("Đã xảy ra lỗi khi chạy thuật toán phân công.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5">
      <div className="pb-4 border-b border-slate-100 mb-4">
        <h3 className="text-sm font-bold text-slate-900">Bước 4: Staff Assignment — Phân công tự động</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Thuật toán tự động lấy số người dự kiến đến từng nhóm, lấy danh sách nhân viên Working và phân công vào từng nhóm
        </p>
      </div>

      {/* Ratios & Cap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Tỷ Lệ Nhóm Normal</span>
            <span className="text-sm font-black text-blue-700">1 : 10</span>
          </div>
          <p className="text-[11px] text-blue-700 mt-1">1 nhân viên phụ trách tối đa 10 người bình thường</p>
        </div>
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Tỷ Lệ Nhóm Support</span>
            <span className="text-sm font-black text-amber-700">1 : 4</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">1 nhân viên phụ trách tối đa 4 người cần hỗ trợ (ưu tiên phân bổ trước)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Button to run assignment */}
      <button
        onClick={runAlgorithm}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-60 mb-5"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
        {loading ? "Đang phân công tự động..." : "Nhấn để Generate Assignment"}
      </button>

      {/* Assignment Output */}
      {resultPlan && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-900">
              ✓ Đã phân công thành công vào {resultPlan.groups?.length ?? 0} nhóm ({resultPlan.totalElderly} cụ, {resultPlan.totalStaff} nhân viên)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resultPlan.groups?.map((g: any) => (
              <div
                key={g.groupId}
                className={`border rounded-xl p-3.5 shadow-2xs ${
                  g.groupType === "Support" ? "border-amber-200 bg-amber-50/20" : "border-blue-200 bg-blue-50/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{g.groupName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      g.groupType === "Support" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {g.groupType}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                    {g.elderlyList?.length}/{g.maxCapacity} cụ
                  </span>
                </div>
                <div className="text-xs text-slate-600 mb-2.5 flex items-center gap-1.5 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                  <UserCheck size={14} className="text-emerald-600" />
                  <span>Phụ trách: </span>
                  <strong className="text-slate-900">{g.fullName}</strong>
                  {g.phoneNumber && <span className="text-slate-400 font-mono">({g.phoneNumber})</span>}
                </div>
                <div className="space-y-1">
                  {g.elderlyList?.map((m: any) => (
                    <div key={m.elderlyId} className="text-xs text-slate-700 flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-slate-100">
                      <div className={`w-1.5 h-1.5 rounded-full ${m.mobilityStatus === "Support" ? "bg-amber-500" : "bg-blue-500"}`} />
                      <span>{m.fullName}</span>
                      <span className="text-[10px] text-slate-400">({m.mobilityStatus})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// STEP 5: REVIEW & PUBLISH
// ══════════════════════════════════════════════════════════════════════════

const Step5ReviewPublish: React.FC<{
  planId: number;
  summary: DailyPlanSummary;
  onPublished: (s: DailyPlanSummary) => void;
}> = ({ planId, summary, onPublished }) => {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await dailyPlanningService.publishPlan(planId);
      if (res.success && res.data) {
        onPublished(res.data);
      } else {
        setError(res.message || "Không thể công bố kế hoạch.");
      }
    } catch {
      setError("Đã xảy ra lỗi khi công bố.");
    } finally {
      setPublishing(false);
    }
  };

  const isPublished = summary.status === "Published";

  return (
    <div className="p-5 space-y-5">
      <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Bước 5: Review & Publish — Kiểm tra và công bố</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kiểm tra toàn bộ 4 khối thông tin kế hoạch trước khi Approve & Publish
          </p>
        </div>
        {isPublished && (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> ĐÃ CÔNG BỐ
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* 4 SUMMARY BLOCKS */}
      <div className="space-y-4">
        {/* 1. Attendance Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} className="text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">1. Attendance Summary</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-emerald-600">{summary.attendanceSummary?.totalExpected ?? summary.totalAttending}</p>
              <p className="text-[11px] text-slate-500 font-medium">Người Đến (Expected)</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-rose-600">{summary.attendanceSummary?.totalAbsent ?? 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Người Nghỉ (Absent)</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-amber-600">{summary.attendanceSummary?.totalNotConfirmed ?? 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Chưa xác nhận</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-blue-600">{summary.attendanceSummary?.totalNormal ?? summary.totalNormal}</p>
              <p className="text-[11px] text-slate-500 font-medium">Cụ Normal</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-amber-600">{summary.attendanceSummary?.totalSupport ?? summary.totalSupport}</p>
              <p className="text-[11px] text-slate-500 font-medium">Cụ Support</p>
            </div>
          </div>
        </div>

        {/* 2. Group Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">2. Group Summary</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.groupSummary?.map(g => (
              <div key={g.groupId} className="bg-white p-3 rounded-lg border border-slate-200 text-xs shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">{g.groupName}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    g.groupType === "Support" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {g.groupType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px] mt-2">
                  <span>Số thành viên:</span>
                  <strong className="text-slate-800">{g.currentCount}/{g.maxCapacity}</strong>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className={`h-full ${g.isFull ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (g.currentCount / g.maxCapacity) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!summary.groupSummary || summary.groupSummary.length === 0) && (
              <p className="text-xs text-slate-400 italic col-span-4 text-center py-2">Chưa có nhóm nào</p>
            )}
          </div>
        </div>

        {/* 3. Staff Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck size={16} className="text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">3. Staff Summary</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-emerald-600">{summary.staffSummary?.totalWorking ?? summary.totalWorkingStaff}</p>
              <p className="text-[11px] text-slate-500 font-medium">Nhân viên đi làm (Working)</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-slate-600">{summary.staffSummary?.totalOff ?? 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Nghỉ ca (Off)</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-amber-600">{summary.staffSummary?.totalLeave ?? 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Nghỉ phép (Leave)</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <p className="text-xl font-black text-indigo-600">{summary.staffSummary?.totalAssigned ?? summary.totalGroups}</p>
              <p className="text-[11px] text-slate-500 font-medium">Được phân công phụ trách</p>
            </div>
          </div>
        </div>

        {/* 4. Assignment Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <HeartHandshake size={16} className="text-rose-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">4. Assignment Summary</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.assignmentSummary?.map(a => (
              <div key={a.groupId} className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{a.groupName}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      a.groupType === "Support" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {a.groupType}
                    </span>
                  </div>
                  <span className="font-bold text-slate-700">{a.elderlyList?.length} cụ</span>
                </div>
                <div className="text-[11px] text-slate-600 mb-2 flex items-center gap-1.5">
                  <UserCheck size={12} className="text-emerald-600" />
                  <span>Phụ trách: </span>
                  <strong className="text-slate-900">{a.fullName}</strong>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.elderlyList?.map(m => (
                    <span
                      key={m.elderlyId}
                      className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700"
                    >
                      {m.fullName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {(!summary.assignmentSummary || summary.assignmentSummary.length === 0) && (
              <p className="text-xs text-slate-400 italic col-span-2 text-center py-4">Chưa có dữ liệu phân công</p>
            )}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {summary.warnings?.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <p className="text-xs font-bold text-amber-900">Cảnh báo trước khi công bố:</p>
          {summary.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      {/* Publish Action Button */}
      {!isPublished ? (
        <button
          onClick={handlePublish}
          disabled={publishing || summary.totalUnassigned > 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50"
        >
          {publishing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
          {publishing ? "Đang công bố kế hoạch..." : "Approve & Publish (Công Bố Kế Hoạch)"}
        </button>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <p className="text-sm font-bold text-emerald-800">✓ Kế hoạch chăm sóc đã được công bố chính thức</p>
          <p className="text-xs text-emerald-600 mt-1">
            Người phê duyệt: <strong>{summary.publishedByName || "Quản trị viên"}</strong>
            {summary.publishedAt && ` · ${new Date(summary.publishedAt).toLocaleString("vi-VN")}`}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Shared Loading State ───────────────────────────────────────────────────

const LoadingState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <Loader2 size={32} className="animate-spin text-emerald-600" />
    <p className="text-xs font-medium text-slate-500">{label}</p>
  </div>
);

export default DailyPlanningWizard;
