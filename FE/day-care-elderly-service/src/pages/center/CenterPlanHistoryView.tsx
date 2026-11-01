import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  History, Calendar, CheckCircle2, Clock, Users,
  UserCheck, ShieldCheck, Search, Filter, RefreshCw,
  Eye, ArrowRight, AlertCircle, FileText
} from "lucide-react";
import dailyPlanningService, { type PlanHistoryItem, type DailyPlanSummary } from "../../services/dailyPlanningService";

interface CenterPlanHistoryViewProps {
  onViewPlanDate?: (date: string) => void;
}

export const CenterPlanHistoryView: React.FC<CenterPlanHistoryViewProps> = ({ onViewPlanDate }) => {
  const [historyList, setHistoryList] = useState<PlanHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Detail Modal
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [planSummary, setPlanSummary] = useState<DailyPlanSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dailyPlanningService.getPlanHistory();
      if (res.success && res.data) {
        setHistoryList(res.data);
      } else {
        setError(res.message || "Không thể tải lịch sử kế hoạch.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi máy chủ khi tải lịch sử kế hoạch.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleOpenDetailModal = async (planId: number) => {
    setSelectedPlanId(planId);
    setLoadingSummary(true);
    try {
      const res = await dailyPlanningService.getPlanSummary(planId);
      if (res.success && res.data) {
        setPlanSummary(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải tóm tắt kế hoạch:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      const matchSearch =
        item.planDate.includes(searchTerm) ||
        (item.confirmedByName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [historyList, searchTerm, statusFilter]);

  const totalPublished = historyList.filter(h => h.status === "Published" || h.status === "Confirmed").length;
  const totalDraft = historyList.filter(h => h.status === "Draft" || h.status === "ReadyToReview").length;

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <History size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
                Lịch Sử Kế Hoạch & Phân Công Hàng Ngày
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem lại danh sách các kế hoạch đã duyệt, bản nháp, người phê duyệt và chi tiết phân công.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-slate-400" : "text-slate-500"} />
          <span>Tải lại</span>
        </button>
      </div>

      {/* ── STATS CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng kế hoạch</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{historyList.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Đã tạo trong hệ thống</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Đã công bố / duyệt</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{totalPublished}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Nhân viên đã thấy phân công</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Bản nháp / Chờ duyệt</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{totalDraft}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Cần kiểm tra & xuất bản</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER ─────────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo ngày (YYYY-MM-DD), người duyệt..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="history-status-select" className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Filter size={13} />
            <span>Trạng thái:</span>
          </label>
          <select
            id="history-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Tất cả ({historyList.length})</option>
            <option value="Published">Đã công bố</option>
            <option value="Confirmed">Đã xác nhận</option>
            <option value="Draft">Bản nháp</option>
          </select>
        </div>
      </div>

      {/* ── HISTORY TABLE ───────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Đang tải lịch sử các kế hoạch...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Calendar size={28} />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Không tìm thấy kế hoạch nào</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "Thử xóa bộ lọc tìm kiếm để xem tất cả kế hoạch."
              : "Hệ thống chưa có kế hoạch nào được tạo. Hãy sử dụng tab 'Lập Kế Hoạch Ngày Mai' để bắt đầu."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ngày Kế Hoạch</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-center">Người Cao Tuổi</th>
                  <th className="py-3 px-4 text-center">Nhân Viên</th>
                  <th className="py-3 px-4 text-center">Số Nhóm</th>
                  <th className="py-3 px-4">Người Duyệt & Thời Gian</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => {
                  const isPublished = item.status === "Published" || item.status === "Confirmed";

                  return (
                    <tr key={item.planId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                            <Calendar size={14} />
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 text-xs">
                              {item.planDate}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              Tạo lúc: {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Đã công bố</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock size={12} className="text-amber-600" />
                            <span>Bản nháp</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <Users size={13} className="text-slate-400" />
                          <span>{item.TotalElderly || item.totalElderly} cụ</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <UserCheck size={13} className="text-slate-400" />
                          <span>{item.TotalStaff || item.totalStaff} staff</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck size={13} className="text-slate-400" />
                          <span>{item.TotalGroups || item.totalGroups} nhóm</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {item.confirmedAt ? (
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">
                              {item.confirmedByName || "Quản trị viên"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(item.confirmedAt).toLocaleDateString("vi-VN")}{" "}
                              {new Date(item.confirmedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa phê duyệt</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(item.planId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition shadow-2xs"
                            title="Xem tóm tắt kế hoạch"
                          >
                            <Eye size={12} />
                            <span>Tóm tắt</span>
                          </button>

                          {onViewPlanDate && (
                            <button
                              type="button"
                              onClick={() => onViewPlanDate(item.planDate)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition shadow-2xs"
                              title="Xem chi tiết lịch phân ca ngày này"
                            >
                              <span>Xem Lịch</span>
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: SUMMARY DETAIL ──────────────────────────────── */}
      {selectedPlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-emerald-600" />
                <span>Chi Tiết Kế Hoạch Ngày {planSummary?.planDate || ""}</span>
              </h3>
              <button
                type="button"
                onClick={() => { setSelectedPlanId(null); setPlanSummary(null); }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {loadingSummary ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-xs">Đang tải chi tiết...</p>
              </div>
            ) : planSummary ? (
              <div className="space-y-4">
                {/* 4 Summary Blocks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Dự kiến đến</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{planSummary.totalAttending}</p>
                    <p className="text-[10px] text-slate-500">{planSummary.totalNormal} N • {planSummary.totalSupport} S</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Nhân viên đi làm</p>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">{planSummary.totalWorkingStaff}</p>
                    <p className="text-[10px] text-emerald-600">Đã trừ ngày nghỉ</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Số nhóm chăm sóc</p>
                    <p className="text-xl font-black text-blue-700 mt-0.5">{planSummary.totalGroups}</p>
                    <p className="text-[10px] text-blue-600">Tách Normal & Support</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Trạng thái</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{planSummary.statusLabel}</p>
                    <p className="text-[10px] text-slate-500">{planSummary.publishedByName || "Chưa ký duyệt"}</p>
                  </div>
                </div>

                {/* Groups in this plan */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Các nhóm được phân công:</h4>
                  <div className="space-y-2">
                    {(planSummary.assignmentSummary || []).map((g, idx) => (
                      <div key={g.groupId || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{g.groupName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              g.groupType === "Support"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}>
                              {g.groupType === "Support" ? "Support (max 4)" : "Normal (max 10)"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Staff: <strong className="text-emerald-700">{g.fullName}</strong> • {g.email}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {g.elderlyList?.length || 0} người cao tuổi
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setSelectedPlanId(null); setPlanSummary(null); }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Không tìm thấy chi tiết kế hoạch.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterPlanHistoryView;
