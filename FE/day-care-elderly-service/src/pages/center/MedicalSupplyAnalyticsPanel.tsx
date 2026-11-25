import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard, RatioBar } from "../../components/StatCard";
import medicalSupplyService from "../../services/medicalSupplyService";
import type {
  SupplyConsumptionSummary,
  TopUsedSupply,
  ExpiringSupplyAlert,
  ElderlySupplyChargeReport,
} from "../../types/supplyAnalytics";
import { formatVND, getExpiryStatusMeta } from "../../types/supplyAnalytics";

type AnalyticsSubTab = "top-used" | "expiring" | "elderly-charges";

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export function MedicalSupplyAnalyticsPanel() {
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>("top-used");
  const [monthsFilter, setMonthsFilter] = useState<string>("1");
  const [thresholdDays, setThresholdDays] = useState<number>(30);

  const [summary, setSummary] = useState<SupplyConsumptionSummary | null>(null);
  const [topUsed, setTopUsed] = useState<TopUsedSupply[]>([]);
  const [expiringList, setExpiringList] = useState<ExpiringSupplyAlert[]>([]);
  const [elderlyCharges, setElderlyCharges] = useState<ElderlySupplyChargeReport[]>([]);

  const parsedMonths = monthsFilter === "all" ? null : Number(monthsFilter);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, topRes, expRes, eldRes] = await Promise.all([
        medicalSupplyService.getAnalyticsSummary(),
        medicalSupplyService.getTopConsumed(10, parsedMonths),
        medicalSupplyService.getExpiringSupplies(thresholdDays),
        medicalSupplyService.getElderlyCharges(parsedMonths),
      ]);

      if (sumRes.success && sumRes.data) setSummary(sumRes.data);
      if (topRes.success && topRes.data) setTopUsed(topRes.data);
      if (expRes.success && expRes.data) setExpiringList(expRes.data);
      if (eldRes.success && eldRes.data) setElderlyCharges(eldRes.data);
    } catch (err) {
      toast.error(errMsg(err, "Không tải được dữ liệu phân tích vật tư."));
    } finally {
      setLoading(false);
    }
  }, [parsedMonths, thresholdDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxTopCost = topUsed.length > 0 ? Math.max(...topUsed.map((x) => x.totalCost)) : 0;

  return (
    <div className="space-y-4">
      {/* Thanh bộ lọc & Thao tác */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <BarChart3 className="size-4 text-sky-600" />
          <span>Khoảng thời gian thống kê:</span>
          <Select value={monthsFilter} onValueChange={setMonthsFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Chọn thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 tháng gần nhất</SelectItem>
              <SelectItem value="3">3 tháng gần nhất</SelectItem>
              <SelectItem value="6">6 tháng gần nhất</SelectItem>
              <SelectItem value="all">Toàn bộ thời gian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          <span>Làm mới dữ liệu</span>
        </Button>
      </div>

      {/* 4 Thẻ KPI Chỉ Số Kho (SRS 3.9 & WF-05 / D2 / F-14) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mặt hàng hoạt động"
          value={
            summary
              ? `${summary.activeSupplies} / ${summary.totalSupplies}`
              : "--"
          }
          hint={
            summary && summary.lowStockCount > 0
              ? `${summary.lowStockCount} loại sắp hết tồn kho`
              : "Tồn kho trong mức an toàn"
          }
          icon={Package}
          tone={summary && summary.lowStockCount > 0 ? "warn" : "good"}
        />

        <StatCard
          label="Cảnh báo hạn dùng"
          value={
            summary
              ? summary.expiringSoonCount + summary.expiredCount
              : "--"
          }
          hint={
            summary
              ? `${summary.expiredCount} loại quá hạn · ${summary.expiringSoonCount} loại cận hạn`
              : "Kiểm tra hạn dùng định kỳ"
          }
          icon={summary && summary.expiredCount > 0 ? AlertOctagon : AlertTriangle}
          tone={
            summary && summary.expiredCount > 0
              ? "bad"
              : summary && summary.expiringSoonCount > 0
                ? "warn"
                : "good"
          }
        />

        <StatCard
          label="Tổng giá trị kho vật tư"
          value={summary ? formatVND(summary.totalInventoryValue) : "--"}
          hint="Định giá theo đơn giá niêm yết"
          icon={Wallet}
          tone="default"
        />

        <StatCard
          label="Phí vật tư do sự cố (F-14)"
          value={summary ? formatVND(summary.totalIncidentSupplyCost) : "--"}
          hint="Phụ phí vật tư phát sinh ngoài gói"
          icon={Activity}
          tone="default"
        />
      </div>

      {/* Chi tiết thống kê theo Tab */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-sky-600" /> Báo cáo phân tích chuyên sâu
              </CardTitle>
              <CardDescription>
                Theo dõi tiêu hao do xử lý sự cố, kiểm soát hạn sử dụng và tổng hợp chi phí theo người cao tuổi.
              </CardDescription>
            </div>

            <Tabs
              value={activeSubTab}
              onValueChange={(v) => setActiveSubTab(v as AnalyticsSubTab)}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="top-used" className="gap-1.5">
                  <TrendingUp className="size-3.5" />
                  <span>Top tiêu hao sự cố</span>
                </TabsTrigger>
                <TabsTrigger value="expiring" className="gap-1.5">
                  <Clock className="size-3.5" />
                  <span>Cảnh báo hạn dùng</span>
                </TabsTrigger>
                <TabsTrigger value="elderly-charges" className="gap-1.5">
                  <User className="size-3.5" />
                  <span>Phụ phí theo cụ</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="mx-auto size-6 animate-spin text-sky-600" />
              <p className="mt-2 text-sm">Đang tổng hợp dữ liệu báo cáo...</p>
            </div>
          )}

          {/* SubTab 1: Top tiêu hao do sự cố */}
          {!loading && activeSubTab === "top-used" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Vật tư y tế xuất kho nhiều nhất cho các ca cấp cứu sơ cứu</span>
                <span>{topUsed.length} mặt hàng</span>
              </div>

              {topUsed.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu tiêu hao vật tư do sự cố trong khoảng thời gian đã chọn.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên vật tư</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead className="text-right">Số lượng dùng</TableHead>
                      <TableHead className="text-right">Số ca dùng</TableHead>
                      <TableHead className="text-right">Tổng chi phí</TableHead>
                      <TableHead className="w-48">Tỷ trọng chi phí</TableHead>
                      <TableHead className="text-right">Tồn kho hiện tại</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsed.map((item, idx) => (
                      <TableRow key={item.supplyId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {idx + 1}
                            </span>
                            <span>{item.supplyName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.totalQuantityUsed.toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{item.usageCount} ca</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatVND(item.totalCost)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <RatioBar value={item.totalCost} max={maxTopCost} className="bg-sky-500" />
                            <div className="text-[11px] text-muted-foreground text-right">
                              {maxTopCost > 0
                                ? `${Math.round((item.totalCost / maxTopCost) * 100)}% top 1`
                                : "0%"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.currentStock.toLocaleString("vi-VN")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* SubTab 2: Cảnh báo hạn dùng (SR-04) */}
          {!loading && activeSubTab === "expiring" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Ngưỡng quét cảnh báo:</span>
                  <Select
                    value={String(thresholdDays)}
                    onValueChange={(v) => setThresholdDays(Number(v))}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 ngày</SelectItem>
                      <SelectItem value="30">30 ngày</SelectItem>
                      <SelectItem value="60">60 ngày</SelectItem>
                      <SelectItem value="90">90 ngày</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span>{expiringList.length} mặt hàng trong danh sách cảnh báo</span>
              </div>

              {expiringList.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Tất cả vật tư y tế đều có hạn sử dụng tốt (vượt ngưỡng {thresholdDays} ngày).
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên vật tư</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead>Ngày hết hạn</TableHead>
                      <TableHead>Tình trạng hạn dùng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringList.map((item) => {
                      const meta = getExpiryStatusMeta(item.status, item.daysUntilExpiry);
                      return (
                        <TableRow key={item.supplyId}>
                          <TableCell className="font-medium">{item.supplyName}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.quantityInStock.toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatVND(item.unitPrice)}
                          </TableCell>
                          <TableCell>
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("vi-VN") : "Chưa đặt"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* SubTab 3: Phụ thu theo Người cao tuổi */}
          {!loading && activeSubTab === "elderly-charges" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tổng hợp phụ thu vật tư y tế phát sinh theo người cao tuổi để phục vụ thanh toán (Billing)</span>
                <span>{elderlyCharges.length} người cao tuổi</span>
              </div>

              {elderlyCharges.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Không có chi phí vật tư phát sinh cho người cao tuổi trong khoảng thời gian này.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người cao tuổi</TableHead>
                      <TableHead className="text-right">Số ca sự cố</TableHead>
                      <TableHead className="text-right">Tổng tiền vật tư phụ thu</TableHead>
                      <TableHead>Sự cố phát sinh gần nhất</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {elderlyCharges.map((item) => (
                      <TableRow key={item.elderlyId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="size-4 text-slate-400" />
                            <span>{item.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{item.incidentCount} ca</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                          {formatVND(item.totalSupplyCost)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.lastIncidentAt
                            ? new Date(item.lastIncidentAt).toLocaleString("vi-VN")
                            : "--"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MedicalSupplyAnalyticsPanel;
