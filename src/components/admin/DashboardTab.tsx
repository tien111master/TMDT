import React, { useMemo, useState, useEffect } from "react";
import { API_BASE_URL } from '../../api/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileSpreadsheet, Filter, AlertCircle } from "lucide-react";
import { Order } from "../../types";
import { Category } from "../AdminPanel";
import { reportApi, orderApi, promotionApi } from "../../api/api";


type ReportType = "revenue" | "profit" | "best-selling" | "payment";

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  revenue: "Doanh Thu",
  profit: "Lợi Nhuận",
  "best-selling": "Sản Phẩm Bán Chạy",
  payment: "Thanh Toán",
};

export default function DashboardTab() {
  const formattedPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  // ===================== TỔNG QUAN NHANH (dữ liệu thật từ DB) =====================
  const [orders, setOrders] = useState<Order[]>([]);
  const [couponCount, setCouponCount] = useState(0);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  useEffect(() => {
    orderApi.getAllOrdersAdmin()
      .then((data: Order[]) => setOrders(data || []))
      .catch((err) => console.error("Lỗi tải đơn hàng:", err));

    promotionApi.getAllAdmin()
      .then((data: any[]) => {
        const now = new Date();

        const activeCoupons = (data || []).filter(
          (p) =>
            p.couponCode &&
            p.status !== "Ended" &&
            new Date(p.endedAt) >= now
        );

        setCouponCount(activeCoupons.length);
      })
      .catch((err) => console.error("Lỗi tải khuyến mãi:", err))
      .finally(() => setIsLoadingSummary(false));
  }, []);

  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [orders]);

  const [fullTimelineData, setFullTimelineData] = useState<any[]>([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  useEffect(() => {
    reportApi.getMonthlyOverview()
      .then((data: any[]) => {
        const mapped = data.map((x) => ({
          name: x.name,
          "Doanh thu": x.doanhThu,
          "Bán ra": x.banRa,
        }));

        setFullTimelineData(mapped);
      })
      .catch((err) => console.error("Lỗi tải tổng quan nhanh:", err))
      .finally(() => setIsLoadingOverview(false));
  }, []);

  // ===================== BÁO CÁO BÁN HÀNG (theo sơ đồ AD_Xem báo cáo bán hàng) =====================
  const [categories, setCategories] = useState<Category[]>([]);
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categorySlug, setCategorySlug] = useState("all");

  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Lỗi lấy danh mục:", err));
  }, []);

  // "Lọc báo cáo theo thời gian / danh mục" -> "Tổng hợp dữ liệu" -> "Tính toán số liệu báo cáo"
  const loadReport = async () => {
    setIsLoadingReport(true);
    try {
      const data = await reportApi.getReport({
        reportType,
        fromDate: new Date(fromDate).toISOString(),
        toDate: new Date(toDate + "T23:59:59").toISOString(),
        categorySlug: categorySlug === "all" ? undefined : categorySlug,
      });
      setReportData(data);
    } catch (err) {
      console.error("Lỗi tải báo cáo:", err);
      setReportData(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  // "Xuất báo cáo ra Excel" -> "Tạo file Excel" -> "Trả file cho người dùng"
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await reportApi.exportReport({
        reportType,
        fromDate: new Date(fromDate).toISOString(),
        toDate: new Date(toDate + "T23:59:59").toISOString(),
        categorySlug: categorySlug === "all" ? undefined : categorySlug,
      });
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);
      alert("Xuất báo cáo thất bại.");
    } finally {
      setIsExporting(false);
    }
  };

  const chartData = useMemo(() => {
    if (!reportData) return [];
    if (reportType === "revenue") {
      return (reportData.revenueData || []).map((x: any) => ({ name: x.period, "Doanh thu": x.revenue }));
    }
    if (reportType === "profit") {
      return (reportData.profitData || []).map((x: any) => ({
        name: x.period,
        "Doanh thu": x.revenue,
        "Lợi nhuận": x.profit,
      }));
    }
    if (reportType === "best-selling") {
      return (reportData.bestSellingData || []).slice(0, 10).map((x: any) => ({
        name: x.productName,
        "Số lượng bán": x.quantitySold,
      }));
    }
    return [];
  }, [reportData, reportType]);

  return (
    <div className="space-y-8">
      {/* ===================== TỔNG QUAN NHANH ===================== */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#FAF6F0] p-6 rounded-2xl border border-[#EADBC8]">
          <span className="text-[10px] text-[#8B7E74] font-bold uppercase block">Doanh thu Đơn Hàng</span>
          <h2 className="font-serif text-2xl font-black text-[#5C4033] mt-2">{formattedPrice(totalRevenue)}</h2>
        </div>
        <div className="bg-[#FAF6F0] p-6 rounded-2xl border border-[#EADBC8]">
          <span className="text-[10px] text-[#8B7E74] font-bold uppercase block">Tổng số lượng đơn đặt</span>
          <h2 className="font-serif text-2xl font-black text-[#1A1A1A] mt-2">{orders.length} đơn</h2>
        </div>
        <div className="bg-[#FAF6F0] p-6 rounded-2xl border border-[#EADBC8]">
          <span className="text-[10px] text-[#8B7E74] font-bold uppercase block">Phiếu giảm giá VIP</span>
          <h2 className="font-serif text-2xl font-black text-[#1A1A1A] mt-2">{couponCount} mã</h2>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={fullTimelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Doanh thu" fill="#D4AF37" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={fullTimelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Bán ra" fill="#5C4033" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===================== BÁO CÁO BÁN HÀNG CHI TIẾT ===================== */}
      <section className="border-t border-[#EADBC8] pt-8 space-y-5">
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">Báo Cáo Bán Hàng</h3>

        {/* "Chọn loại báo cáo cần xem" */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
                reportType === type
                  ? "bg-[#5C4033] text-white border-[#5C4033]"
                  : "bg-white text-[#5C4033] border-[#EADBC8] hover:bg-[#FAF6F0]"
              }`}
            >
              {REPORT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* "Lọc báo cáo theo thời gian / danh mục" */}
        <div className="flex flex-wrap items-end gap-3 bg-[#FAF6F0] p-4 rounded-xl border border-[#EADBC8]">
          <div>
            <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-[#EADBC8] rounded-lg px-3 py-2 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-[#EADBC8] rounded-lg px-3 py-2 text-xs bg-white"
            />
          </div>
          {reportType !== "payment" && (
            <div>
              <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Danh mục</label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="border border-[#EADBC8] rounded-lg px-3 py-2 text-xs bg-white"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.categoryName}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={loadReport}
            disabled={isLoadingReport}
            className="flex items-center gap-1.5 bg-[#5C4033] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-[#4a3329] disabled:opacity-60"
          >
            <Filter className="w-3.5 h-3.5" /> {isLoadingReport ? "Đang lọc..." : "Áp Dụng"}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !reportData?.hasData}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> {isExporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
        </div>

        {/* "Không có dữ liệu trong khoảng lọc" */}
        {!isLoadingReport && reportData && !reportData.hasData && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Không có dữ liệu trong khoảng thời gian / danh mục đã lọc.
          </div>
        )}

        {/* "Hiển thị báo cáo dạng bảng/biểu đồ" */}
        {!isLoadingReport && reportData?.hasData && (
          <div className="space-y-4">
            {/* Tổng số liệu nhanh */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {reportData.totalRevenue !== null && reportData.totalRevenue !== undefined && (
                <div className="bg-white border border-[#EADBC8] rounded-xl p-4">
                  <span className="text-[10px] text-[#8B7E74] font-bold uppercase">Tổng doanh thu</span>
                  <p className="font-serif text-lg font-black text-[#5C4033]">{formattedPrice(reportData.totalRevenue)}</p>
                </div>
              )}
              {reportData.totalProfit !== null && reportData.totalProfit !== undefined && (
                <div className="bg-white border border-[#EADBC8] rounded-xl p-4">
                  <span className="text-[10px] text-[#8B7E74] font-bold uppercase">Tổng lợi nhuận</span>
                  <p className="font-serif text-lg font-black text-emerald-700">{formattedPrice(reportData.totalProfit)}</p>
                </div>
              )}
              {reportData.totalOrders !== null && reportData.totalOrders !== undefined && (
                <div className="bg-white border border-[#EADBC8] rounded-xl p-4">
                  <span className="text-[10px] text-[#8B7E74] font-bold uppercase">Tổng số đơn</span>
                  <p className="font-serif text-lg font-black text-[#1A1A1A]">{reportData.totalOrders} đơn</p>
                </div>
              )}
            </div>

            {/* Biểu đồ (revenue / profit / best-selling) */}
            {reportType !== "payment" && chartData.length > 0 && (
              <div className="h-72 bg-white border border-[#EADBC8] rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    {reportType === "best-selling" ? (
                      <Bar dataKey="Số lượng bán" fill="#D4AF37" />
                    ) : (
                      <>
                        <Bar dataKey="Doanh thu" fill="#D4AF37" />
                        {reportType === "profit" && <Bar dataKey="Lợi nhuận" fill="#5C4033" />}
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bảng chi tiết */}
            <div className="overflow-x-auto border border-[#EADBC8] rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF6F0] text-[#5C4033] font-bold uppercase">
                  {reportType === "revenue" && (
                    <tr><th className="p-3">Ngày</th><th className="p-3 text-right">Doanh thu</th><th className="p-3 text-right">Số đơn</th></tr>
                  )}
                  {reportType === "profit" && (
                    <tr><th className="p-3">Ngày</th><th className="p-3 text-right">Doanh thu</th><th className="p-3 text-right">Giá vốn</th><th className="p-3 text-right">Lợi nhuận</th></tr>
                  )}
                  {reportType === "best-selling" && (
                    <tr><th className="p-3">Sản phẩm</th><th className="p-3">Danh mục</th><th className="p-3 text-right">SL Bán</th><th className="p-3 text-right">Doanh thu</th></tr>
                  )}
                  {reportType === "payment" && (
                    <tr><th className="p-3">Phương thức</th><th className="p-3">Trạng thái</th><th className="p-3 text-right">Số lượng</th><th className="p-3 text-right">Tổng tiền</th></tr>
                  )}
                </thead>
                <tbody className="divide-y divide-[#EADBC8]/40 bg-white">
                  {reportType === "revenue" && (reportData.revenueData || []).map((x: any, i: number) => (
                    <tr key={i}><td className="p-3">{x.period}</td><td className="p-3 text-right font-bold text-[#D4AF37]">{formattedPrice(x.revenue)}</td><td className="p-3 text-right">{x.orderCount}</td></tr>
                  ))}
                  {reportType === "profit" && (reportData.profitData || []).map((x: any, i: number) => (
                    <tr key={i}><td className="p-3">{x.period}</td><td className="p-3 text-right">{formattedPrice(x.revenue)}</td><td className="p-3 text-right">{formattedPrice(x.costOfGoods)}</td><td className="p-3 text-right font-bold text-emerald-700">{formattedPrice(x.profit)}</td></tr>
                  ))}
                  {reportType === "best-selling" && (reportData.bestSellingData || []).map((x: any, i: number) => (
                    <tr key={i}><td className="p-3 font-bold">{x.productName}</td><td className="p-3">{x.categoryName || "-"}</td><td className="p-3 text-right">{x.quantitySold}</td><td className="p-3 text-right font-bold text-[#D4AF37]">{formattedPrice(x.revenue)}</td></tr>
                  ))}
                  {reportType === "payment" && (reportData.paymentData || []).map((x: any, i: number) => (
                    <tr key={i}><td className="p-3">{x.paymentMethod}</td><td className="p-3">{x.paymentStatus}</td><td className="p-3 text-right">{x.count}</td><td className="p-3 text-right font-bold text-[#D4AF37]">{formattedPrice(x.totalAmount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}