import React, { useEffect, useState } from "react";
import staffAssignmentService from "../../services/staffAssignmentService";
import type {
    ElderlyInGroup,
    StaffCareGroup,
} from "../../services/staffAssignmentService";

/** Lấy ngày theo giờ máy (toISOString dùng UTC nên có thể lệch ngày ở VN) */
const getLocalDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
};

const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
};

const formatGender = (value: string | null) => {
    if (!value) return "—";
    const labels: Record<string, string> = {
        male: "Nam",
        female: "Nữ",
        other: "Khác",
    };
    return labels[value.toLowerCase()] ?? value;
};

const MobilityBadge: React.FC<{ status: string }> = ({ status }) => {
    const needsSupport = status === "Support";
    return (
        <span
            className={`inline-block whitespace-nowrap px-2 py-0.5 text-xs font-semibold border rounded ${needsSupport
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-teal-50 text-teal-700 border-teal-200"
                }`}
        >
            {needsSupport ? "Cần hỗ trợ" : "Bình thường"}
        </span>
    );
};

const SummaryCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
);

export const AssignedElderlyView: React.FC = () => {
    const [date, setDate] = useState<string>(getLocalDate());
    const [group, setGroup] = useState<StaffCareGroup | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        let cancelled = false;

        const loadGroup = async () => {
            setLoading(true);
            setError("");
            try {
                const response = await staffAssignmentService.getMyCareGroup(date);
                if (!cancelled) setGroup(response.data ?? null);
            } catch (err: any) {
                if (!cancelled) {
                    setGroup(null);
                    setError(
                        err?.response?.data?.message || "Không tải được danh sách người cao tuổi."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadGroup();

        // Bỏ qua kết quả cũ nếu người dùng đổi ngày khi request chưa xong
        return () => {
            cancelled = true;
        };
    }, [date]);

    const elderlyList: ElderlyInGroup[] = group?.elderlyList ?? [];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        {group?.groupName || "Nhóm được phân công"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Danh sách người cao tuổi bạn phụ trách theo ngày
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                    Ngày
                    <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm"
                    />
                </label>
            </div>

            {loading && <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>}

            {!loading && error && (
                <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <SummaryCard label="Tổng số" value={group?.totalElderlyCount ?? 0} />
                        <SummaryCard label="Bình thường" value={group?.normalElderlyCount ?? 0} />
                        <SummaryCard label="Cần hỗ trợ" value={group?.needSupportElderlyCount ?? 0} />
                    </div>

                    {elderlyList.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-lg">
                            Chưa có người cao tuổi nào được phân công trong ngày này.
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                            <table className="w-full min-w-[800px] text-sm text-left">
                                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Họ tên</th>
                                        <th className="px-4 py-3 font-semibold">Ngày sinh</th>
                                        <th className="px-4 py-3 font-semibold">Giới tính</th>
                                        <th className="px-4 py-3 font-semibold">Vận động</th>
                                        <th className="px-4 py-3 font-semibold">Liên hệ khẩn cấp</th>
                                        <th className="px-4 py-3 font-semibold">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {elderlyList.map((elderly) => (
                                        <tr key={elderly.elderlyId} className="align-top">
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {elderly.fullName}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formatDate(elderly.dateOfBirth)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formatGender(elderly.gender)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <MobilityBadge status={elderly.mobilityStatus} />
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <p>{elderly.emergencyContactName || "—"}</p>
                                                {elderly.emergencyContactPhone && (
                                                    <a
                                                        href={`tel:${elderly.emergencyContactPhone}`}
                                                        className="text-xs text-teal-700 hover:underline"
                                                    >
                                                        {elderly.emergencyContactPhone}
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <p>{elderly.careNotes || "—"}</p>
                                                {elderly.assignmentNotes && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Phân công: {elderly.assignmentNotes}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AssignedElderlyView;