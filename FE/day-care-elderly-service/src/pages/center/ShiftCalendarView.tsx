import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Trash2, Clock } from "lucide-react";

// ── 10 Khung giờ chính xác theo yêu cầu ─────────────────────
const TIME_SLOTS = [
  "07:00 – 08:00",
  "08:00 – 09:00",
  "09:00 – 10:30",
  "10:30 – 11:00",
  "11:00 – 12:00",
  "12:00 – 13:00",
  "13:00 – 13:30",
  "13:30 – 15:30",
  "15:30 – 16:00",
  "16:00 – 17:00",
];

const DAYS_OF_WEEK = [
  { key: 1, label: "Thứ Hai" },
  { key: 2, label: "Thứ Ba" },
  { key: 3, label: "Thứ Tư" },
  { key: 4, label: "Thứ Năm" },
  { key: 5, label: "Thứ Sáu" },
  { key: 6, label: "Thứ Bảy" },
  { key: 0, label: "Chủ Nhật" },
];

interface ShiftCellData {
  id: string;
  dateStr: string; // YYYY-MM-DD
  slotIndex: number;
  content: string;
}

const ShiftCalendarView: React.FC = () => {
  // Bắt đầu từ thứ 2 của tuần hiện tại
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // State lưu các ô đã điền thông tin: key = `${dateStr}_${slotIndex}`
  const [scheduleData, setScheduleData] = useState<Record<string, ShiftCellData>>({});

  // Modal thêm/sửa nội dung cho ô
  const [activeCell, setActiveCell] = useState<{
    dateStr: string;
    dayLabel: string;
    slotIndex: number;
    slotTime: string;
  } | null>(null);

  const [inputText, setInputText] = useState("");

  // Tạo danh sách 7 ngày trong tuần được chọn
  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;
      const dayName = DAYS_OF_WEEK[i].label;

      const isToday =
        new Date().toDateString() === d.toDateString();

      return {
        dateStr,
        dayName,
        displayDate: `${day}/${m}`,
        isToday,
      };
    });
  }, [currentWeekStart]);

  // Điều hướng tuần
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // Mở modal khi bấm vào ô grid
  const handleCellClick = (dateStr: string, dayLabel: string, slotIndex: number) => {
    const cellKey = `${dateStr}_${slotIndex}`;
    const existing = scheduleData[cellKey];
    setActiveCell({
      dateStr,
      dayLabel,
      slotIndex,
      slotTime: TIME_SLOTS[slotIndex],
    });
    setInputText(existing ? existing.content : "");
  };

  // Lưu nội dung ô
  const handleSaveCell = () => {
    if (!activeCell) return;
    const cellKey = `${activeCell.dateStr}_${activeCell.slotIndex}`;

    if (!inputText.trim()) {
      // Nếu xóa trắng thì xóa khỏi danh sách
      setScheduleData((prev) => {
        const copy = { ...prev };
        delete copy[cellKey];
        return copy;
      });
    } else {
      setScheduleData((prev) => ({
        ...prev,
        [cellKey]: {
          id: cellKey,
          dateStr: activeCell.dateStr,
          slotIndex: activeCell.slotIndex,
          content: inputText.trim(),
        },
      }));
    }

    setActiveCell(null);
    setInputText("");
  };

  // Xóa nội dung của 1 ô
  const handleDeleteCell = (dateStr: string, slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const cellKey = `${dateStr}_${slotIndex}`;
    setScheduleData((prev) => {
      const copy = { ...prev };
      delete copy[cellKey];
      return copy;
    });
  };

  // Định dạng hiển thị tuần
  const weekStartStr = weekDays[0].displayDate;
  const weekEndStr = weekDays[6].displayDate;

  return (
    <div className="space-y-4">
      {/* ── Thanh điều hướng tuần ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <CalendarIcon size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Lịch Phân Ca Tuần ({weekStartStr} – {weekEndStr})
            </h2>
            <p className="text-xs text-slate-400">
              Bấm vào từng ô trống để nhập nội dung hoặc nhân viên phụ trách
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Hôm nay
          </button>
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 text-slate-600 hover:bg-slate-100 transition"
              title="Tuần trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 text-slate-600 hover:bg-slate-100 transition"
              title="Tuần sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── BẢNG GRID PHÂN CA ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[850px]">
            {/* Header các thứ trong tuần */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-700">
                {/* Cột thời gian duy nhất bên trái */}
                <th className="py-3 px-4 font-bold border-r border-slate-200 w-36 text-slate-600 uppercase tracking-wider text-[11px] bg-slate-100/70">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    <span>Thời Gian</span>
                  </div>
                </th>

                {/* 7 Cột Ngày */}
                {weekDays.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-3 px-3 font-semibold text-center border-r last:border-r-0 border-slate-200 min-w-[100px] ${
                      col.isToday ? "bg-emerald-50/70 text-emerald-800" : ""
                    }`}
                  >
                    <div className="font-bold text-xs">{col.dayName}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        col.isToday ? "text-emerald-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {col.displayDate}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Thân bảng: 10 khung giờ tương ứng 10 hàng */}
            <tbody>
              {TIME_SLOTS.map((slotText, slotIdx) => (
                <tr
                  key={slotIdx}
                  className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/40 transition group"
                >
                  {/* Cột mốc thời gian DUY NHẤT bên trái */}
                  <td className="py-3 px-4 font-bold text-xs text-slate-700 bg-slate-50/80 border-r border-slate-200 whitespace-nowrap">
                    {slotText}
                  </td>

                  {/* 7 Khung Grid trống cho 7 ngày */}
                  {weekDays.map((col, dayIdx) => {
                    const cellKey = `${col.dateStr}_${slotIdx}`;
                    const cellData = scheduleData[cellKey];

                    return (
                      <td
                        key={dayIdx}
                        onClick={() => handleCellClick(col.dateStr, col.dayName, slotIdx)}
                        className={`p-2 border-r last:border-r-0 border-slate-200 h-16 align-top cursor-pointer transition relative group/cell ${
                          col.isToday ? "bg-emerald-50/20" : "bg-white"
                        } hover:bg-emerald-50/50`}
                      >
                        {cellData ? (
                          // Khi đã có dữ liệu người dùng nhập
                          <div className="h-full w-full bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs flex flex-col justify-between text-emerald-900 group-hover/cell:border-emerald-400 transition shadow-xs">
                            <span className="font-medium whitespace-pre-wrap break-words line-clamp-2">
                              {cellData.content}
                            </span>
                            <div className="flex items-center justify-end mt-1">
                              <button
                                type="button"
                                onClick={(e) => handleDeleteCell(col.dateStr, slotIdx, e)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                                title="Xóa nội dung"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Khung trống ban đầu
                          <div className="h-full w-full rounded-lg border border-transparent hover:border-dashed hover:border-slate-300 flex items-center justify-center text-slate-300 group-hover/cell:text-slate-400 transition">
                            <Plus size={14} className="opacity-0 group-hover/cell:opacity-100 transition" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal nhập nội dung cho từng ô ──────────────────── */}
      {activeCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setActiveCell(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Phân Ca / Nhập Nội Dung
            </h3>
            <div className="text-xs text-slate-500 mb-3 space-y-0.5">
              <div>
                Thời gian: <span className="font-bold text-emerald-700">{activeCell.slotTime}</span>
              </div>
              <div>
                Ngày: <span className="font-semibold text-slate-700">{activeCell.dayLabel} ({activeCell.dateStr})</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nội dung muốn điền vào:
              </label>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập tên nhân viên, công việc hoặc ghi chú tùy ý..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 resize-none"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveCell}
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftCalendarView;
