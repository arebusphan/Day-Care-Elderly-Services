import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Users, HeartHandshake, ShieldCheck,
  Phone, MapPin, AlertCircle, X, Eye, Loader2, RefreshCw
} from "lucide-react";
import api from "../../services/api";

export interface CenterElderlyItem {
  elderlyId: number;
  memberCode: string;
  fullName: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  mobilityStatus: string; // "Normal" | "Support"
  allergies: string | null;
  medicalHistory: string | null;
  medicalNotes: string | null;
  careNotes: string | null;
  servicePackageName: string | null;
  isActive: boolean;
  createdAt: string;
}

export const CenterElderlyView: React.FC = () => {
  const [elderlyList, setElderlyList] = useState<CenterElderlyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState<string>("");
  const [mobilityFilter, setMobilityFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");

  // Selected for detail modal
  const [selectedElderly, setSelectedElderly] = useState<CenterElderlyItem | null>(null);

  const fetchElderlyList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/center/elderly");
      if (res.data?.success && res.data?.data) {
        setElderlyList(res.data.data);
      } else {
        setError(res.data?.message || "Không thể tải danh sách người cao tuổi.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi máy chủ khi tải danh sách.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchElderlyList();
  }, [fetchElderlyList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return elderlyList.filter(item => {
      const matchSearch =
        item.fullName.toLowerCase().includes(search.toLowerCase()) ||
        item.memberCode.toLowerCase().includes(search.toLowerCase()) ||
        (item.emergencyContactName || "").toLowerCase().includes(search.toLowerCase());
      const matchMobility = mobilityFilter === "all" || item.mobilityStatus === mobilityFilter;
      const matchPackage = packageFilter === "all" || (item.servicePackageName || "").includes(packageFilter);
      return matchSearch && matchMobility && matchPackage;
    });
  }, [elderlyList, search, mobilityFilter, packageFilter]);

  const totalCount = elderlyList.length;
  const normalCount = elderlyList.filter(e => e.mobilityStatus === "Normal").length;
  const supportCount = elderlyList.filter(e => e.mobilityStatus === "Support").length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng số người cao tuổi</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Users size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-700 font-medium">Nhóm Normal (Tự chủ)</p>
            <p className="text-2xl font-black text-blue-700 mt-0.5">{normalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-800 font-medium">Nhóm Support (Cần hỗ trợ)</p>
            <p className="text-2xl font-black text-amber-800 mt-0.5">{supportCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <HeartHandshake size={20} />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex-1 relative w-full">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã thành viên, người liên hệ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={mobilityFilter}
              onChange={e => setMobilityFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
            >
              <option value="all">Tất cả phân loại</option>
              <option value="Normal">Normal (Bình thường)</option>
              <option value="Support">Support (Cần hỗ trợ)</option>
            </select>
            <select
              value={packageFilter}
              onChange={e => setPackageFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
            >
              <option value="all">Tất cả gói dịch vụ</option>
              <option value="Cơ bản">Gói Cơ bản</option>
              <option value="Phục hồi">Phục hồi chức năng</option>
              <option value="Sa sút">Sa sút trí tuệ</option>
              <option value="tai biến">Sau tai biến</option>
              <option value="Giai đoạn cuối">Giai đoạn cuối</option>
            </select>
            <button
              onClick={fetchElderlyList}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
              title="Làm mới"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table view */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={28} className="animate-spin text-emerald-500" />
            <p className="text-xs">Đang tải danh sách người cao tuổi...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Mã & Họ tên</th>
                  <th className="py-3 px-3.5">Tuổi / Giới tính</th>
                  <th className="py-3 px-3.5">Phân loại</th>
                  <th className="py-3 px-3.5">Gói dịch vụ</th>
                  <th className="py-3 px-3.5">Liên hệ khẩn cấp</th>
                  <th className="py-3 px-3.5">Tình trạng sức khỏe</th>
                  <th className="py-3 px-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(item => (
                  <tr key={item.elderlyId} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{item.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.memberCode}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700">
                      <div>{item.age ? `${item.age} tuổi` : "—"}</div>
                      <div className="text-[11px] text-slate-400">{item.gender || "—"}</div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.mobilityStatus === "Support"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {item.mobilityStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-800">
                      {item.servicePackageName || "Gói Cơ bản"}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700">
                      <div className="font-medium">{item.emergencyContactName || "—"}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        {item.emergencyContactPhone && <Phone size={10} />}
                        {item.emergencyContactPhone || ""}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 max-w-[200px] truncate">
                      {item.medicalHistory || item.allergies || item.careNotes || "Sức khỏe ổn định"}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        onClick={() => setSelectedElderly(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                      >
                        <Eye size={12} /> Xem
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      Không tìm thấy người cao tuổi nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedElderly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500">{selectedElderly.memberCode}</span>
                <h3 className="font-bold text-slate-900 text-sm">{selectedElderly.fullName}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedElderly.mobilityStatus === "Support" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {selectedElderly.mobilityStatus}
                </span>
              </div>
              <button
                onClick={() => setSelectedElderly(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 text-[11px] block">Ngày sinh</span>
                  <span className="font-semibold text-slate-800">{selectedElderly.dateOfBirth || "—"} ({selectedElderly.age} tuổi)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Giới tính</span>
                  <span className="font-semibold text-slate-800">{selectedElderly.gender || "—"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px] block">Địa chỉ</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                    {selectedElderly.address || "Chưa cập nhật"}
                  </span>
                </div>
              </div>

              {/* Package & Care Status */}
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-medium">Gói dịch vụ đang dùng:</span>
                  <strong className="text-emerald-900">{selectedElderly.servicePackageName || "Gói Cơ bản"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-medium">Phân loại chăm sóc:</span>
                  <strong className="text-emerald-900">{selectedElderly.mobilityStatus} (Định mức nhóm: {selectedElderly.mobilityStatus === "Support" ? "1:4" : "1:10"})</strong>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1">
                <p className="text-slate-500 font-bold text-[11px]">Người liên hệ khẩn cấp</p>
                <p className="font-semibold text-slate-800">{selectedElderly.emergencyContactName || "Chưa có"}</p>
                {selectedElderly.emergencyContactPhone && (
                  <p className="text-slate-600 font-mono flex items-center gap-1.5">
                    <Phone size={11} /> {selectedElderly.emergencyContactPhone}
                  </p>
                )}
              </div>

              {/* Medical and Care Notes */}
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 text-[11px] block">Tiền sử bệnh án</span>
                  <p className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">{selectedElderly.medicalHistory || "Không có ghi chú bệnh án"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Dị ứng</span>
                  <p className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">{selectedElderly.allergies || "Không có ghi nhận dị ứng"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Lưu ý chăm sóc</span>
                  <p className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">{selectedElderly.careNotes || "Không có lưu ý đặc biệt"}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedElderly(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterElderlyView;
