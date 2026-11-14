import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "../../services/api";
import dailyPlanningService from "../../services/dailyPlanningService";
import type { ApiResponse } from "../../types/common";

interface Suggestion {
  groupId: number;
  groupName: string;
  groupType: string;
  memberCount: number;
  currentStaffId: number | null;
  staffId: number | null;
  staffName: string | null;
  reason: string | null;
}

interface SuggestionResult {
  source: "claude" | "rules";
  model: string | null;
  planDate: string;
  suggestions: Suggestion[];
  notes: string[];
}

/**
 * F-06: gợi ý phân ca bằng AI (Claude, dữ liệu ẩn danh — BR-51) hoặc theo luật khi chưa có key.
 * Gợi ý chỉ là bản nháp (BR-50): Manager xem và bấm áp dụng từng nhóm hoặc tất cả.
 */
export function AiShiftSuggestPanel({ planId, onApplied }: { planId: number; onApplied: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [applying, setApplying] = useState<number | "all" | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  const suggest = async () => {
    setLoading(true);
    setApplied(new Set());
    try {
      const res = (await api.post<ApiResponse<SuggestionResult>>(`/api/center/planning/${planId}/ai-suggest`)).data;
      if (!res.success || !res.data) throw new Error(res.message);
      setResult(res.data);
      toast.success(res.message);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message || "Không lấy được gợi ý.");
    } finally {
      setLoading(false);
    }
  };

  const apply = async (items: Suggestion[], key: number | "all") => {
    setApplying(key);
    try {
      for (const s of items) {
        if (s.staffId == null) continue;
        const res = await dailyPlanningService.assignStaffToGroup(planId, s.groupId, s.staffId);
        if (!res.success) throw new Error(`${s.groupName}: ${res.message}`);
        setApplied((prev) => new Set(prev).add(s.groupId));
      }
      toast.success("Đã áp dụng gợi ý.");
      onApplied();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message || "Không áp dụng được.");
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-violet-900">
            <Sparkles className="size-4" /> Gợi ý phân ca bằng AI
          </p>
          <p className="text-xs text-violet-800/80">
            Cân bằng khối lượng 14 ngày gần nhất, rải đều nhóm cần hỗ trợ. Dữ liệu gửi AI đã ẩn danh; bạn duyệt trước khi áp dụng.
          </p>
        </div>
        <Button variant="outline" onClick={suggest} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {result ? "Gợi ý lại" : "Lấy gợi ý"}
        </Button>
      </div>

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={result.source === "claude" ? "secondary" : "outline"}>
              {result.source === "claude" ? `AI · ${result.model}` : "Thuật toán theo luật"}
            </Badge>
            {result.notes.map((n) => <span key={n} className="text-amber-700">{n}</span>)}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhóm</TableHead>
                <TableHead>Gợi ý nhân viên</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead className="text-right">
                  <Button size="sm" disabled={applying !== null} onClick={() => apply(result.suggestions, "all")}>
                    {applying === "all" ? <Loader2 className="animate-spin" /> : <Check />} Áp dụng tất cả
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.suggestions.map((s) => (
                <TableRow key={s.groupId}>
                  <TableCell>
                    <p className="font-medium">{s.groupName}</p>
                    <p className="text-xs text-muted-foreground">{s.groupType === "Support" ? "Cần hỗ trợ" : "Bình thường"} · {s.memberCount} cụ</p>
                  </TableCell>
                  <TableCell>{s.staffName ?? <span className="text-rose-600">Thiếu nhân viên</span>}</TableCell>
                  <TableCell className="max-w-72 whitespace-normal text-xs">{s.reason ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {applied.has(s.groupId) || (s.staffId != null && s.staffId === s.currentStaffId) ? (
                      <Badge variant="outline">Đã áp dụng</Badge>
                    ) : (
                      <Button size="sm" variant="outline" disabled={s.staffId == null || applying !== null} onClick={() => apply([s], s.groupId)}>
                        {applying === s.groupId ? <Loader2 className="animate-spin" /> : "Áp dụng"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

export default AiShiftSuggestPanel;
