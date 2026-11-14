import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "good" | "warn" | "bad";
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-slate-500",
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-rose-600",
};

/** Thẻ số liệu dùng chung cho các trang tổng quan / báo cáo */
export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: Props) {
  return (
    <Card size="sm" className="gap-1">
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {Icon && <Icon className={`size-4 ${TONE[tone]}`} />}
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Thanh tỉ lệ đơn giản (không cần thư viện biểu đồ) */
export function RatioBar({ value, max, className = "bg-emerald-500" }: { value: number; max: number; className?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default StatCard;
