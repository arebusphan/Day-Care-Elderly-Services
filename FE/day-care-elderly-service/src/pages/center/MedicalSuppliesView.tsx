import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, BarChart3, Loader2, Package, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import medicalSupplyService, { isLowStock } from "../../services/medicalSupplyService";
import type { MedicalSupply } from "../../services/medicalSupplyService";
import type { PagedResult } from "../../types/common";
import TablePagination from "../../components/TablePagination";
import MedicalSupplyAnalyticsPanel from "./MedicalSupplyAnalyticsPanel";

const PAGE_SIZE = 10;

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const fmtQty = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

type View = "all" | "low" | "inactive";

interface SupplyForm {
  supplyName: string;
  unit: string;
  minimumStock: string;
  quantityInStock: string;
  unitPrice: string;
  expiryDate: string;
}

const EMPTY_FORM: SupplyForm = { supplyName: "", unit: "", minimumStock: "0", quantityInStock: "0", unitPrice: "0", expiryDate: "" };
const money = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

export function MedicalSuppliesView() {
  const [data, setData] = useState<PagedResult<MedicalSupply> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>("all");
  const [mainTab, setMainTab] = useState<"inventory" | "analytics">("inventory");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalSupply | null>(null);
  const [form, setForm] = useState<SupplyForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [stockTarget, setStockTarget] = useState<{ supply: MedicalSupply; mode: "in" | "out" } | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await medicalSupplyService.list({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        isLowStock: view === "low" ? true : undefined,
        isActive: view === "inactive" ? false : view === "low" ? true : undefined,
      });
      if (res.success && res.data) setData(res.data);
      else toast.error(res.message || "Không tải được danh sách vật tư.");
    } catch (err) {
      toast.error(errMsg(err, "Không tải được danh sách vật tư."));
    } finally {
      setLoading(false);
    }
  }, [page, search, view]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const replaceRow = (s: MedicalSupply) =>
    setData((d) => d && { ...d, items: d.items.map((x) => (x.supplyId === s.supplyId ? s : x)) });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (s: MedicalSupply) => {
    setEditing(s);
    setForm({
      supplyName: s.supplyName,
      unit: s.unit,
      minimumStock: String(s.minimumStock),
      quantityInStock: String(s.quantityInStock),
      unitPrice: String(s.unitPrice ?? 0),
      expiryDate: s.expiryDate ?? "",
    });
    setFormOpen(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const minimumStock = Number(form.minimumStock);
    const quantityInStock = Number(form.quantityInStock);
    const unitPrice = Number(form.unitPrice);
    if (!(unitPrice >= 0)) return toast.error("Đơn giá phải ≥ 0.");
    if (!form.supplyName.trim() || !form.unit.trim()) return toast.error("Nhập tên vật tư và đơn vị tính.");
    if (!(minimumStock >= 0)) return toast.error("Mức tối thiểu phải ≥ 0.");
    if (!editing && !(quantityInStock >= 0)) return toast.error("Tồn kho ban đầu phải ≥ 0.");
    setSaving(true);
    try {
      const base = { supplyName: form.supplyName.trim(), unit: form.unit.trim(), minimumStock, unitPrice, expiryDate: form.expiryDate || null };
      const res = editing
        ? await medicalSupplyService.update(editing.supplyId, base)
        : await medicalSupplyService.create({ ...base, quantityInStock });
      if (res.success) {
        toast.success(editing ? "Đã cập nhật vật tư." : "Đã thêm vật tư.");
        setFormOpen(false);
        load();
      } else toast.error(res.message || "Không lưu được vật tư.");
    } catch (err) {
      toast.error(errMsg(err, "Không lưu được vật tư."));
    } finally {
      setSaving(false);
    }
  };

  const openStock = (supply: MedicalSupply, mode: "in" | "out") => {
    setStockTarget({ supply, mode });
    setStockQty("");
    setStockNote("");
  };

  const saveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockTarget) return;
    const qty = Number(stockQty);
    if (!(qty > 0)) return toast.error("Số lượng phải lớn hơn 0.");
    const delta = stockTarget.mode === "in" ? qty : -qty;
    if (stockTarget.supply.quantityInStock + delta < 0) return toast.error("Không đủ tồn kho để xuất.");
    setAdjusting(true);
    try {
      const res = await medicalSupplyService.adjustStock(stockTarget.supply.supplyId, delta, stockNote.trim() || undefined);
      if (res.success && res.data) {
        replaceRow(res.data);
        toast.success(stockTarget.mode === "in" ? "Đã nhập kho." : "Đã xuất kho.");
        setStockTarget(null);
      } else toast.error(res.message || "Không điều chỉnh được tồn kho.");
    } catch (err) {
      toast.error(errMsg(err, "Không điều chỉnh được tồn kho."));
    } finally {
      setAdjusting(false);
    }
  };

  const toggle = async (s: MedicalSupply) => {
    try {
      const res = await medicalSupplyService.toggleStatus(s.supplyId);
      if (res.success && res.data) {
        if (view === "all") replaceRow(res.data);
        else load();
        toast.success(res.data.isActive ? "Đã kích hoạt vật tư." : "Đã ngừng sử dụng vật tư.");
      } else toast.error(res.message || "Không đổi được trạng thái.");
    } catch (err) {
      toast.error(errMsg(err, "Không đổi được trạng thái."));
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab điều hướng chính: Kho vật tư vs Báo cáo phân tích */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Button
          variant={mainTab === "inventory" ? "default" : "outline"}
          size="sm"
          onClick={() => setMainTab("inventory")}
          className="gap-2"
        >
          <Package className="size-4" /> Danh mục & Tồn kho
        </Button>
        <Button
          variant={mainTab === "analytics" ? "default" : "outline"}
          size="sm"
          onClick={() => setMainTab("analytics")}
          className="gap-2"
        >
          <BarChart3 className="size-4" /> Báo cáo & Phân tích tiêu hao
        </Button>
      </div>

      {mainTab === "analytics" ? (
        <MedicalSupplyAnalyticsPanel />
      ) : (
        <>
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-4 text-sky-600" /> Vật tư y tế
          </CardTitle>
          <CardDescription>Quản lý danh mục, tồn kho và cảnh báo vật tư sắp hết.</CardDescription>
          <CardAction className="flex gap-2">
            <Button variant="outline" size="icon" title="Tải lại" onClick={load}>
              <RefreshCw />
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Thêm vật tư
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              value={view}
              onValueChange={(v) => {
                setView(v as View);
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="low">Sắp hết</TabsTrigger>
                <TabsTrigger value="inactive">Ngừng dùng</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Tìm vật tư..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vật tư</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead className="text-right">Tồn kho</TableHead>
                <TableHead className="text-right">Tối thiểu</TableHead>
                <TableHead className="text-right">Đơn giá</TableHead>
                <TableHead>Hạn dùng</TableHead>
                <TableHead>Đang dùng</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center">
                    <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !data || data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Chưa có vật tư nào.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((s) => {
                  const low = s.isActive && isLowStock(s);
                  return (
                    <TableRow key={s.supplyId} className={`${loading ? "opacity-60" : ""} ${s.isActive ? "" : "text-muted-foreground"}`}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {s.supplyName}
                          {low && <Badge variant="destructive">Sắp hết</Badge>}
                        </span>
                      </TableCell>
                      <TableCell>{s.unit}</TableCell>
                      <TableCell className={`text-right tabular-nums ${low ? "font-semibold text-destructive" : ""}`}>
                        {fmtQty(s.quantityInStock)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtQty(s.minimumStock)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(s.unitPrice ?? 0)}</TableCell>
                      <TableCell className="text-xs">
                        {s.expiryDate ? (
                          <span className={s.expiryDate < new Date().toISOString().slice(0, 10) ? "font-semibold text-destructive" : ""}>
                            {new Date(s.expiryDate + "T00:00:00").toLocaleDateString("vi-VN")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={s.isActive} onCheckedChange={() => toggle(s)} aria-label="Đang sử dụng" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" title="Nhập kho" disabled={!s.isActive} onClick={() => openStock(s, "in")}>
                            <ArrowDownToLine className="text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Xuất kho" disabled={!s.isActive} onClick={() => openStock(s, "out")}>
                            <ArrowUpFromLine className="text-orange-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(s)}>
                            <Pencil />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {data && (
            <TablePagination
              page={data.pageNumber}
              totalPages={data.totalPages}
              totalItems={data.totalItems}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Thêm / sửa */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa vật tư" : "Thêm vật tư"}</DialogTitle>
            {editing && <DialogDescription>Tồn kho thay đổi qua nút Nhập / Xuất kho.</DialogDescription>}
          </DialogHeader>
          <form id="supply-form" onSubmit={saveForm} className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name">Tên vật tư *</Label>
              <Input id="sup-name" value={form.supplyName} onChange={(e) => setForm({ ...form, supplyName: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-unit">Đơn vị *</Label>
                <Input id="sup-unit" placeholder="hộp, cuộn..." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-min">Tối thiểu</Label>
                <Input
                  id="sup-min"
                  type="number"
                  min={0}
                  step="any"
                  value={form.minimumStock}
                  onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
                />
              </div>
              {!editing && (
                <div className="space-y-1.5">
                  <Label htmlFor="sup-qty">Tồn ban đầu</Label>
                  <Input
                    id="sup-qty"
                    type="number"
                    min={0}
                    step="any"
                    value={form.quantityInStock}
                    onChange={(e) => setForm({ ...form, quantityInStock: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sup-price">Đơn giá (tính phí sự cố)</Label>
                <Input id="sup-price" type="number" min={0} step="1000" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-exp">Hạn dùng</Label>
                <Input id="sup-exp" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="supply-form" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nhập / xuất kho */}
      <Dialog open={!!stockTarget} onOpenChange={(o) => !o && setStockTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{stockTarget?.mode === "in" ? "Nhập kho" : "Xuất kho"}</DialogTitle>
            <DialogDescription>
              {stockTarget?.supply.supplyName} · tồn hiện tại {stockTarget && fmtQty(stockTarget.supply.quantityInStock)}{" "}
              {stockTarget?.supply.unit}
            </DialogDescription>
          </DialogHeader>
          <form id="stock-form" onSubmit={saveStock} className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stock-qty">Số lượng *</Label>
              <Input id="stock-qty" type="number" min={0} step="any" autoFocus value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-note">Ghi chú</Label>
              <Input id="stock-note" value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockTarget(null)}>
              Hủy
            </Button>
            <Button type="submit" form="stock-form" disabled={adjusting}>
              {adjusting && <Loader2 className="animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}

export default MedicalSuppliesView;
