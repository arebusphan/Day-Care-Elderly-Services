import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  ArrowRightLeft,
  ShieldCheck,
  UserCheck,
  HeartHandshake,
  ArrowRight
} from "lucide-react";
import staffAssignmentService from "../../services/staffAssignmentService";
import type {
  DailySchedulePlan,
  ElderlyInGroup
} from "../../services/staffAssignmentService";

interface ShiftCalendarViewProps {
  onGoToPlanning?: () => void;
  initialDate?: string;
}

// Helper Date functions
function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayString(): string {
  return formatDateString(new Date());
}

function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateString(tomorrow);
}

function getDayAfterTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return formatDateString(d);
}

function calculateAge(dobString: string | null): string | number {
  if (!dobString) return "-";
  const dob = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return isNaN(age) ? "-" : age;
}

export const ShiftCalendarView: React.FC<ShiftCalendarViewProps> = ({ onGoToPlanning, initialDate }) => {
  // ── States ──────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTomorrowString());

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const [plan, setPlan] = useState<DailySchedulePlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoAssigning, setAutoAssigning] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reassign Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState<boolean>(false);
  const [targetElderly, setTargetElderly] = useState<ElderlyInGroup | null>(null);
  const [currentStaffId, setCurrentStaffId] = useState<number | null>(null);
  const [newStaffId, setNewStaffId] = useState<number | "">("");
  const [reassignNotes, setReassignNotes] = useState<string>("");
  const [reassigning, setReassigning] = useState<boolean>(false);

  // ── Fetch Plan ──────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await staffAssignmentService.getSchedulePlan(selectedDate);
      if (res.success && res.data) {
        setPlan(res.data);
      } else {
        setPlan(null);
      }
    } catch (err: any) {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Auto clear success message after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // ── Auto Assign Action ──────────────────────────────────────
  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    setError(null);
    try {
      const res = await staffAssignmentService.autoAssign({
        targetDate: selectedDate,
        notes: `Tự động chia lịch ngày ${selectedDate} theo định mức 10 Thường / 4 Cần hỗ trợ`
      });

      if (res.success && res.data) {
        setPlan(res.data);
        setSuccessMsg(res.message || "Tự động chia nhóm thành công theo quy định 10 Thường / 4 Hỗ trợ!");
      } else {
        setError(res.message || "Không thể tự động chia lịch.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Lỗi máy chủ khi chia lịch.");
    } finally {
      setAutoAssigning(false);
    }
  };

  // ── Confirm Plan Action ─────────────────────────────────────
  const handleConfirmSchedule = async () => {
    if (!plan) return;
    if (plan.status === "Confirmed") {
      setSuccessMsg("Lịch ngày này đã được xác nhận trước đó rồi.");
      return;
    }

    const unassignedCount = plan.unassignedElderly?.length || 0;
    let confirmPrompt = `Bạn có chắc chắn muốn XÁC NHẬN & CÔNG BỐ lịch chăm sóc ngày ${selectedDate}?`;
    if (unassignedCount > 0) {
      confirmPrompt += `\n\nCẢNH BÁO: Còn ${unassignedCount} người cao tuổi chưa được chia nhóm do thiếu nhân viên!`;
    }

    if (!window.confirm(confirmPrompt)) return;

    setConfirming(true);
    setError(null);
    try {
      const res = await staffAssignmentService.confirmSchedule({
        planId: plan.planId,
        notes: `Xác nhận lịch ngày ${selectedDate}`
      });

      if (res.success && res.data) {
        setPlan(res.data);
        setSuccessMsg("Đã xác nhận & công bố lịch thành công! Nhân viên có thể thấy nhóm được phân công.");
      } else {
        setError(res.message || "Không thể xác nhận lịch.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Lỗi khi xác nhận lịch.");
    } finally {
      setConfirming(false);
    }
  };

  // ── Open Reassign Modal ─────────────────────────────────────
  const handleOpenReassignModal = (elderly: ElderlyInGroup, staffId: number | null) => {
    if (!plan) return;
    setTargetElderly(elderly);
    setCurrentStaffId(staffId);
    setReassignNotes("");

    // Pre-select first eligible other staff with matching group type
    const isSupport = elderly.mobilityStatus === "Support" || elderly.mobilityStatus === "Cần hỗ trợ";
    const elderlyType = isSupport ? "Support" : "Normal";
    const eligibleGroups = (plan.groups || []).filter(
      (g) => g.staffId && g.staffId !== staffId && (!g.groupType || g.groupType === elderlyType)
    );
    setNewStaffId(eligibleGroups.length > 0 ? eligibleGroups[0].staffId : "");

    setReassignModalOpen(true);
  };

  // ── Submit Reassign ─────────────────────────────────────────
  const handleSubmitReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !targetElderly || !newStaffId) return;

    setReassigning(true);
    setError(null);
    try {
      const res = await staffAssignmentService.reassignElderly({
        planId: plan.planId,
        elderlyId: targetElderly.elderlyId,
        newStaffId: Number(newStaffId),
        notes: reassignNotes.trim() || undefined
      });

      if (res.success && res.data) {
        setPlan(res.data);
        setReassignModalOpen(false);
        setSuccessMsg(`Đã chuyển cụ ${targetElderly.fullName} sang nhân viên mới thành công!`);
      } else {
        setError(res.message || "Không thể điều chuyển nhân viên.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Lỗi khi điều chuyển nhân viên.");
    } finally {
      setReassigning(false);
    }
  };

  // ── Derived KPI Metrics ─────────────────────────────────────
  const kpiData = useMemo(() => {
    if (!plan) {
      return {
        totalStaff: 0,
        totalElderly: 0,
        normalCount: 0,
        needSupportCount: 0,
        assignedCount: 0,
        unassignedCount: 0,
        assignmentRate: 0,
        groupsCount: 0,
        normalGroupsCount: 0,
        supportGroupsCount: 0
      };
    }

    const groups = plan.groups || [];
    const unassigned = plan.unassignedElderly || [];

    let normalCount = 0;
    let needSupportCount = 0;
    let assignedCount = 0;
    let normalGroupsCount = 0;
    let supportGroupsCount = 0;

    groups.forEach((g) => {
      normalCount += g.normalElderlyCount || 0;
      needSupportCount += g.needSupportElderlyCount || 0;
      assignedCount += g.elderlyList?.length || 0;
      if (g.groupType === "Support") {
        supportGroupsCount++;
      } else {
        normalGroupsCount++;
      }
    });

    unassigned.forEach((e) => {
      if (e.mobilityStatus === "Support" || e.mobilityStatus === "Cần hỗ trợ") needSupportCount++;
      else normalCount++;
    });

    const totalElderly = plan.totalElderly || normalCount + needSupportCount;
    const unassignedCount = unassigned.length;
    const rate = totalElderly > 0 ? Math.round((assignedCount / totalElderly) * 100) : 100;

    return {
      totalStaff: plan.totalStaff || groups.filter((g) => !!g.staffId).length,
      totalElderly,
      normalCount,
      needSupportCount,
      assignedCount,
      unassignedCount,
      assignmentRate: rate,
      groupsCount: groups.length,
      normalGroupsCount,
      supportGroupsCount
    };
  }, [plan]);

  return (
    <div className="space-y-6">
      {/* ── TOP ACTION & DATE BAR ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title & Quota Rule */}
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                <HeartHandshake size={22} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">
                  Lịch Phân Ca & Nhóm Chăm Sóc Người Cao Tuổi
                </h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Định mức:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Normal: Tối đa 10 Cụ / 1 Staff
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                    Support: Tối đa 4 Cụ / 1 Staff
                  </span>
                  <span className="text-slate-400 font-medium">
                    (Nhóm tách riêng biệt • Mỗi nhân viên 1 nhóm duy nhất)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Date Picker & Quick Buttons */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start lg:self-auto">
            <label htmlFor="target-date-picker" className="text-xs font-semibold text-slate-500 px-2 flex items-center gap-1.5">
              <CalendarIcon size={14} className="text-slate-400" />
              <span>Ngày:</span>
            </label>
            <input
              id="target-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayString())}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition font-medium ${
                selectedDate === getTodayString()
                  ? "bg-slate-200 text-slate-900 font-bold"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getTomorrowString())}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition font-medium ${
                selectedDate === getTomorrowString()
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Ngày mai
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getDayAfterTomorrowString())}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition font-medium ${
                selectedDate === getDayAfterTomorrowString()
                  ? "bg-slate-200 text-slate-900 font-bold"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Ngày mốt
            </button>
          </div>
        </div>

        {/* Sub-bar: Plan Status & Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Plan status indicator */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái:</span>
            {!plan ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Chưa có lịch cho ngày này</span>
              </span>
            ) : plan.status === "Confirmed" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Đã công bố (Confirmed)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Bản nháp (Draft) — Chờ duyệt</span>
              </span>
            )}

            {plan?.confirmedAt && (
              <span className="text-[11px] text-slate-400 italic">
                Công bố lúc: {new Date(plan.confirmedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={fetchPlan}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-slate-400" : "text-slate-500"} />
              Tải lại
            </button>

            {onGoToPlanning && (
              <button
                type="button"
                onClick={onGoToPlanning}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition active:scale-95"
              >
                <span>Quy Trình 5 Bước</span>
                <ArrowRight size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg transition shadow-md shadow-emerald-200 active:scale-95 disabled:opacity-50"
            >
              <Zap size={14} className={autoAssigning ? "animate-spin" : "text-emerald-100"} />
              {autoAssigning ? "Đang chia..." : "Tự Động Chia Nhanh"}
            </button>

            <button
              type="button"
              onClick={handleConfirmSchedule}
              disabled={!plan || plan.status === "Confirmed" || confirming}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition shadow-sm ${
                !plan || plan.status === "Confirmed"
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95"
              }`}
            >
              <ShieldCheck size={14} className={confirming ? "animate-spin" : ""} />
              {confirming ? "Đang công bố..." : "Duyệt & Công Bố Lịch"}
            </button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION BANNERS ──────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ── KPI & METRICS SUMMARY CARDS ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Staff Đi Làm */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Staff phụ trách</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{kpiData.totalStaff}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium flex items-center gap-1">
              {kpiData.groupsCount} nhóm đang hoạt động
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        {/* Tổng Người Cao Tuổi */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng người cao tuổi</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{kpiData.totalElderly}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {kpiData.normalCount} Normal • {kpiData.needSupportCount} Support
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        {/* Đã Chia Vào Nhóm */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Đã chia vào nhóm</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{kpiData.assignedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{kpiData.assignmentRate}% hoàn thành</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Cụ Chưa Được Chia */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Chưa chia vào nhóm</p>
            <p className={`text-2xl font-bold mt-1 ${kpiData.unassignedCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {kpiData.unassignedCount}
            </p>
            <p className={`text-[11px] mt-0.5 font-medium ${kpiData.unassignedCount > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}`}>
              {kpiData.unassignedCount > 0 ? "Cần bổ sung nhân viên!" : "Tất cả đã có người chăm sóc"}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              kpiData.unassignedCount > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
            }`}
          >
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* ── WARNINGS FROM BACKEND ─────────────────────────────── */}
      {plan?.warnings && plan.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-amber-950 text-sm">Cảnh báo định mức & phân bổ</h4>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-800">
              {plan.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── UNASSIGNED ELDERLY SECTION ───────────────────────── */}
      {plan?.unassignedElderly && plan.unassignedElderly.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Người cao tuổi chưa được chia lịch ({plan.unassignedElderly.length} cụ)</span>
            </div>
            <span className="text-xs text-rose-600 font-medium">
              Do số lượng staff không đủ sức chứa (định mức 10 thường / 4 cần hỗ trợ)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {plan.unassignedElderly.map((e) => (
              <div key={e.elderlyId} className="bg-white border border-rose-200 rounded-xl p-3 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-800 text-xs truncate">{e.fullName}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        e.mobilityStatus === "Support" || e.mobilityStatus === "Cần hỗ trợ"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}
                    >
                      {e.mobilityStatus === "Support" || e.mobilityStatus === "Cần hỗ trợ" ? "Support" : "Normal"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {e.gender || "Chưa rõ"} • {calculateAge(e.dateOfBirth)} tuổi
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenReassignModal(e, null)}
                  className="mt-2.5 w-full py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs flex items-center justify-center gap-1 active:scale-95"
                >
                  <ArrowRightLeft size={12} />
                  <span>+ Gán vào Staff</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GROUPS GRID ───────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Đang tải kế hoạch phân ca...</p>
        </div>
      ) : !plan || !plan.groups || plan.groups.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CalendarIcon size={32} />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">Chưa có kế hoạch chia nhóm ngày {selectedDate}</h4>
            <p className="text-xs text-slate-500 mt-1">
              Bạn có thể sử dụng quy trình chuẩn 5 bước để dự báo người đến, xác nhận nhân viên và tạo nhóm tối ưu nhất.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onGoToPlanning && (
              <button
                type="button"
                onClick={onGoToPlanning}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm inline-flex items-center gap-2 active:scale-95"
              >
                <span>Mở Quy Trình Lập Kế Hoạch 5 Bước</span>
                <ArrowRight size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-300 inline-flex items-center gap-2 active:scale-95"
            >
              <Zap size={14} className={autoAssigning ? "animate-spin" : ""} />
              <span>{autoAssigning ? "Đang chia..." : "⚡ Chia Nhanh Tại Đây"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Danh sách nhóm nhân viên phụ trách</span>
              <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {plan.groups.length} nhóm
              </span>
            </h3>
            <span className="text-xs text-slate-500">
              Mỗi nhân viên chỉ chăm sóc & quản lý nhóm cụ được phân chia
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {plan.groups.map((group, idx) => {
              const isSupport = group.groupType === "Support";
              const maxCap = isSupport ? 4 : 10;
              const count = group.elderlyList?.length || 0;
              const pct = Math.min(100, Math.round((count / maxCap) * 100));
              const isOver = count > maxCap;

              return (
                <div
                  key={group.groupId || group.staffId || idx}
                  className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition ${
                    isOver
                      ? "border-rose-400 ring-2 ring-rose-200"
                      : isSupport
                      ? "border-amber-200 hover:border-amber-300"
                      : "border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <div>
                    {/* Group & Staff Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs ${
                            isSupport
                              ? "bg-gradient-to-tr from-amber-500 to-orange-400"
                              : "bg-gradient-to-tr from-emerald-500 to-teal-400"
                          }`}
                        >
                          {isSupport ? "🛡️" : "🌿"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {group.groupName || (isSupport ? `Nhóm Support ${idx + 1}` : `Nhóm Normal ${idx + 1}`)}
                            </h4>
                          </div>
                          <p className="text-[11px] font-semibold truncate max-w-[180px]">
                            {group.staffId ? (
                              <span className="text-slate-700">Staff: <strong className="text-emerald-700">{group.fullName}</strong></span>
                            ) : (
                              <span className="text-rose-600 italic">Chưa có nhân sự</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {group.email || group.phoneNumber || (group.staffId ? "" : "Cần phân bổ thêm staff")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border block mb-1 ${
                            isSupport
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {isSupport ? "Nhóm Support" : "Nhóm Normal"}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700">
                          {count}/{maxCap} cụ
                        </span>
                      </div>
                    </div>

                    {/* Capacity Bar (Dedicated: 10 Normal OR 4 Support) */}
                    <div className="py-3 border-b border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSupport ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          ></span>
                          Định mức {isSupport ? "Cụ Support (Tối đa 4)" : "Cụ Normal (Tối đa 10)"}
                        </span>
                        <span className={`font-bold ${isOver ? "text-rose-600" : "text-slate-800"}`}>
                          {count} / {maxCap} {isOver && "(Vượt định mức!)"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            isOver
                              ? "bg-rose-500"
                              : isSupport
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Elderly List In This Group */}
                    <div className="pt-3">
                      <p className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                        <span>Danh sách cụ phụ trách ({count}):</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Chỉ cụ {isSupport ? "Support" : "Normal"}
                        </span>
                      </p>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {(group.elderlyList || []).map((elderly) => (
                          <div
                            key={elderly.elderlyId}
                            className="bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between transition group/item"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                {elderly.gender === "Nam" ? "👴" : "👵"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-xs">{elderly.fullName}</p>
                                <p className="text-[10px] text-slate-500">
                                  {elderly.gender || "Chưa rõ"} • {calculateAge(elderly.dateOfBirth)} tuổi
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSupport
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                }`}
                              >
                                {elderly.mobilityStatus || (isSupport ? "Support" : "Normal")}
                              </span>
                              {group.staffId && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReassignModal(elderly, group.staffId)}
                                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-white rounded transition opacity-80 group-hover/item:opacity-100"
                                  title="Chuyển sang staff khác"
                                >
                                  <ArrowRightLeft size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {(!group.elderlyList || group.elderlyList.length === 0) && (
                          <p className="text-xs text-slate-400 italic text-center py-4">Chưa có cụ nào được chia.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL: REASSIGN ELDERLY ───────────────────────────── */}
      {reassignModalOpen && targetElderly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-emerald-600" />
                <span>Chuyển Nhân Viên Phụ Trách</span>
              </h3>
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReassign} className="py-4 space-y-4">
              {/* Target Elderly Info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Người cao tuổi:</span>
                <p className="font-bold text-sm text-slate-800">{targetElderly.fullName}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-500">Tình trạng:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      targetElderly.mobilityStatus === "Support" || targetElderly.mobilityStatus === "Cần hỗ trợ"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    {targetElderly.mobilityStatus === "Support" || targetElderly.mobilityStatus === "Cần hỗ trợ" ? "Support" : "Normal"}
                  </span>
                </div>
              </div>

              {/* Select Destination Staff */}
              <div>
                <label htmlFor="reassign-new-staff-select" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn Staff mới tiếp nhận: <span className="text-rose-500">*</span>
                </label>
                <select
                  id="reassign-new-staff-select"
                  value={newStaffId}
                  onChange={(e) => setNewStaffId(e.target.value ? Number(e.target.value) : "")}
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                >
                  <option value="">-- Chọn nhân viên tiếp nhận --</option>
                  {(plan?.groups || [])
                    .filter((g) => {
                      if (!g.staffId || g.staffId === currentStaffId) return false;
                      const isSupport = targetElderly.mobilityStatus === "Support" || targetElderly.mobilityStatus === "Cần hỗ trợ";
                      const elderlyType = isSupport ? "Support" : "Normal";
                      return !g.groupType || g.groupType === elderlyType;
                    })
                    .map((g) => {
                      const maxCap = g.groupType === "Support" ? 4 : 10;
                      return (
                        <option key={g.staffId} value={g.staffId}>
                          {g.fullName} — {g.groupName} (Hiện có: {g.elderlyList?.length || 0}/{maxCap} cụ)
                        </option>
                      );
                    })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Chỉ hiển thị các nhân viên phụ trách nhóm cùng loại ({targetElderly.mobilityStatus === "Support" || targetElderly.mobilityStatus === "Cần hỗ trợ" ? "Support" : "Normal"}).
                  Hệ thống kiểm tra định mức (10 Normal hoặc 4 Support) khi thực hiện chuyển.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="reassign-notes-input" className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú điều chuyển (tuỳ chọn):</label>
                <textarea
                  id="reassign-notes-input"
                  rows={2}
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="Ví dụ: Đổi theo yêu cầu gia đình hoặc phân bổ ca..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={!newStaffId || reassigning}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  {reassigning ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Đang chuyển...</span>
                    </>
                  ) : (
                    <span>Xác nhận chuyển</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftCalendarView;