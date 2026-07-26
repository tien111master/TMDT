import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../../api/api';
import { Eye, Download, X, AlertTriangle, PackageX } from "lucide-react";
import { Order } from "../../types";
import { shipmentApi } from "../../api/api";

interface OrdersTabProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order["status"]) => void;
}

// 🔄 CHUỖI TRẠNG THÁI VÒNG ĐỜI ĐƠN HÀNG — ĐÚNG THEO SƠ ĐỒ NGHIỆP VỤ
// pending -> confirmed -> shipping -> delivered -> completed (hoặc cancelled / returned)
// shipping có thể rẽ nhánh sang delivery_failed (theo sơ đồ AD_Tạo yêu cầu giao hàng) rồi quay lại shipping để tạo yêu cầu mới
const STATUS = {
  PENDING: "PENDING",       // Chờ xử lý      -> Sales xác nhận đơn
  CONFIRMED: "CONFIRMED",   // Chờ duyệt      -> Sales duyệt đơn bán (kích hoạt lệnh xuống kho)
  SHIPPING: "SHIPPING",     // Đã duyệt đơn   -> Kho tạo yêu cầu giao hàng / bàn giao vận chuyển
  DELIVERED: "DELIVERED",   // Đang giao      -> Sales ghi nhận thanh toán
  COMPLETED: "COMPLETED",   // Hoàn tất
  CANCELLED: "CANCELLED",
  RETURNED: "RETURNED",     // Khách trả hàng -> đã hoàn kho
  DELIVERY_FAILED: "DELIVERY_FAILED", // Giao hàng thất bại -> Kho có thể tạo lại yêu cầu
} as const;

type StatusKey = keyof typeof STATUS;

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  [STATUS.PENDING]: { label: "Chờ Xử Lý", badgeClass: "bg-amber-100 text-amber-800" },
  [STATUS.CONFIRMED]: { label: "Chờ Duyệt Đơn", badgeClass: "bg-blue-100 text-blue-800" },
  [STATUS.SHIPPING]: { label: "Đã Duyệt Đơn", badgeClass: "bg-purple-100 text-purple-800" },
  [STATUS.DELIVERED]: { label: "Đang Giao Hàng", badgeClass: "bg-cyan-100 text-cyan-800" },
  // 🟢 Màu badge "ĐÃ THANH TOÁN" theo đúng mint-green trong ảnh mẫu
  [STATUS.COMPLETED]: {
    label: "Đã Thanh Toán",
    badgeClass: "bg-[#E6F9EF] text-[#1E9E5A] border border-[#B9F0D3]",
  },
  [STATUS.CANCELLED]: { label: "Đã Hủy", badgeClass: "bg-red-100 text-red-800" },
  [STATUS.RETURNED]: { label: "Đã Trả Hàng", badgeClass: "bg-orange-100 text-orange-800" },
  // 🆕 Trạng thái mới theo sơ đồ AD_Tạo yêu cầu giao hàng
  [STATUS.DELIVERY_FAILED]: { label: "Giao Thất Bại", badgeClass: "bg-red-100 text-red-800" },
};

export default function OrdersTab({ orders: propOrders, onUpdateOrderStatus }: OrdersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelBox, setShowCancelBox] = useState(false);
  const [localOrders, setLocalOrders] = useState<any[]>([]);

  // 💰 GHI NHẬN THANH TOÁN
  const [showPaymentBox, setShowPaymentBox] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // 🔁 NHÁNH "KHÁCH TRẢ HÀNG" (theo sơ đồ AD_Kiểm tra tồn kho sản phẩm)
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnIsValid, setReturnIsValid] = useState(true);

  // 📦 CẢNH BÁO TỒN KHO — nhánh "Không đủ" (thiếu hàng) & "Cảnh báo hàng sắp hết"
  const [stockErrorItems, setStockErrorItems] = useState<string[]>([]);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  // 🔐 ĐỌC THÔNG TIN QUYỀN ĐĂNG NHẬP
  const userJson = localStorage.getItem("user");
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const rawRole = String(
    currentUser?.roleCode || currentUser?.RoleCode || currentUser?.role || currentUser?.Role || "ADMIN"
  );
  const currentRole = rawRole.toLowerCase().trim();
  const roleId = Number(currentUser?.roleId || currentUser?.RoleId || 0);

  const visibleRoleLabel =
    currentRole === "sales_staff" || roleId === 11 || currentRole === "nhân viên bán hàng"
      ? "NHÂN VIÊN BÁN HÀNG"
      : currentRole === "warehouse_staff" || roleId === 12 || currentRole === "nhân viên kho"
        ? "NHÂN VIÊN KHO"
        : currentRole === "admin" || currentRole === "manager" || currentRole === "quản trị viên"
          ? "QUẢN TRỊ ADMIN"
          : rawRole;

  const isAdmin = currentRole === "admin" || currentRole === "quản trị viên";
  const isSales = currentRole === "sales_staff" || currentRole === "nhân viên bán hàng" || roleId === 11;
  const isWarehouse = currentRole === "warehouse_staff" || currentRole === "nhân viên kho" || roleId === 12;

  const formattedPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const formatInvoiceDate = (value?: string | null) => {
    if (!value) return new Date().toLocaleString("vi-VN");
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("vi-VN");
  };

  const getInvoiceOrder = () => invoiceOrder || selectedOrder;

  const clearStockAlerts = () => {
    setStockErrorItems([]);
    setStockWarnings([]);
  };

  const exportInvoiceToFile = () => {
    const order = getInvoiceOrder();
    if (!order) return;

    const invoiceItems = Array.isArray(order.items) ? order.items : [];
    const rows = invoiceItems
      .map(
        (item: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.productName || item.name || "Sản phẩm"}</td>
            <td>${item.sku || "-"}</td>
            <td>${item.quantity || 1}</td>
            <td>${formattedPrice(Number(item.sellingPrice ?? item.price ?? 0))}</td>
            <td>${formattedPrice(Number(item.totalPrice ?? (item.sellingPrice ?? item.price ?? 0) * (item.quantity || 1)))}</td>
          </tr>`
      )
      .join("");

    const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Hóa đơn ${order.orderCode || order.id}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #1f1f1f; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; }
    .box { border:1px solid #e7d7c8; border-radius:12px; padding:16px; margin-top:16px; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    th, td { border-bottom:1px solid #eee; padding:10px 8px; text-align:left; font-size: 13px; }
    th { background:#faf6f0; }
    .summary { border:1px solid #e7d7c8; border-radius:12px; padding:16px; margin-top:16px; }
    .summary-row { display:flex; justify-content:space-between; }
    .muted { color:#7a6c5d; font-size: 12px; }
    .right { text-align:right; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <h1>LuxeHome</h1>
      <div class="muted">Hóa đơn bán hàng</div>
    </div>
    <div class="right">
      <div><strong>Mã hóa đơn:</strong> ${order.orderCode || order.id}</div>
      <div class="muted">Ngày: ${formatInvoiceDate(order.confirmedAt || order.createdAt || order.date)}</div>
    </div>
  </div>

  <div class="box">
    <div><strong>Khách hàng:</strong> ${order.customerName || order.receiverName || "Khách hàng"}</div>
    <div><strong>Số điện thoại:</strong> ${order.customerPhone || order.receiverPhone || "-"}</div>
    <div><strong>Địa chỉ:</strong> ${order.shippingAddress || "-"}</div>
    <div><strong>Trạng thái:</strong> ${String(order.status || "").toUpperCase()}</div>
    <div><strong>Thanh toán:</strong> ${order.paymentStatus || "-"}</div>
  </div>

  <div class="box">
    <h3>Chi tiết sản phẩm</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Sản phẩm</th>
          <th>SKU</th>
          <th>SL</th>
          <th>Đơn giá</th>
          <th>Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="6">Không có dữ liệu chi tiết sản phẩm.</td></tr>`}
      </tbody>
    </table>
  </div>

  <div class="summary">
    <div class="summary-row"><span>Tổng tiền</span><strong>${formattedPrice(Number(order.totalAmount || 0))}</strong></div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hoa-don-${order.orderCode || order.id}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const fetchAdminOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Orders/admin-all`);
      if (response.ok) {
        const data = await response.json();
        setLocalOrders(data);
        if (selectedOrder) {
          const updated = data.find((x: any) => x.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách đơn hàng:", err);
    }
  };

  useEffect(() => {
    fetchAdminOrders();
  }, []);

  // Tự động điền tổng tiền đơn hàng vào ô số tiền nhận được
  useEffect(() => {
    if (selectedOrder) {
      setAmountReceived(selectedOrder.totalAmount || 0);
    }
  }, [selectedOrder]);

  const filteredOrders = localOrders.filter(
    (o) =>
      o.id.toString().includes(searchTerm) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ⚙️ GỌI API CHUYỂN TRẠNG THÁI THEO ĐÚNG BƯỚC TRONG SƠ ĐỒ
  // Mỗi action ứng với 1 endpoint nghiệp vụ riêng ở backend (không set thẳng field status)
  // Xử lý riêng cảnh báo tồn kho: nhánh "Không đủ" -> thông báo thiếu hàng (400)
  //                                nhánh "Đủ"/"Hoàn kho" -> có thể kèm lowStockWarnings
  const handleProcessWorkflow = async (id: string, action: string, body?: any) => {
    clearStockAlerts();
    try {
      const response = await fetch(`${API_BASE_URL}/api/Orders/${id}/${action}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : null,
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        await fetchAdminOrders();
        setShowCancelBox(false);
        setShowPaymentBox(false);
        setShowReturnBox(false);
        setCancelReason("");
        setReturnReason("");

        // Nhánh "Cảnh báo hàng sắp hết" — hiển thị nếu backend trả về lowStockWarnings
        if (data?.lowStockWarnings?.length > 0) {
          setStockWarnings(data.lowStockWarnings);
        }
      } else {
        // Nhánh "Không đủ" -> Thông báo thiếu hàng (từ InventoryService.DeductStockForOrderAsync)
        if (data?.insufficientItems?.length > 0) {
          setStockErrorItems(data.insufficientItems);
        } else {
          alert(data?.message || "Lỗi quá trình đồng bộ hệ thống!");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi quá trình đồng bộ hệ thống!");
    }
  };

  const handleConfirmPayment = async () => {
    try {
      await onUpdateOrderStatus(selectedOrder.id, "completed");
      setShowPaymentBox(false);
      const updatedOrder = { ...selectedOrder, status: "completed", paymentStatus: "Đã thanh toán" };
      setLocalOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)));
      setSelectedOrder(updatedOrder);
      setInvoiceOrder(updatedOrder);
      setShowInvoiceModal(true);
    } catch (err) {
      console.error("Lỗi đồng bộ thanh toán:", err);
      alert("Lỗi quá trình xử lý đồng bộ hệ thống!");
    }
  };

  // Nhánh "Khách trả hàng": Kiểm tra tình trạng hàng trả -> Hợp lệ: hoàn kho / Không hợp lệ: thông báo
  const handleProcessReturn = () => {
    handleProcessWorkflow(selectedOrder.id, "process-return", {
      isValidReturn: returnIsValid,
      reason: returnReason,
    });
  };

  return (
    <div className="space-y-4">
      {/* THANH TÌM KIẾM ĐƠN HÀNG */}
      <div className="flex items-center gap-2 bg-[#FAF6F0] p-3 rounded-xl border border-[#EADBC8]">
        <span className="text-xs font-bold text-[#5C4033]">Tìm đơn hàng:</span>
        <input
          type="text"
          placeholder="Nhập mã đơn hoặc tên khách hàng để xử lý..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs bg-white border border-[#EADBC8] p-2 rounded-lg outline-none w-full focus:border-[#5C4033]"
        />
      </div>

      {/* 🔴 BANNER: THIẾU HÀNG (nhánh "Không đủ" trong sơ đồ) */}
      {stockErrorItems.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex gap-3 items-start">
          <PackageX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-red-700 text-xs uppercase mb-1">
              Không đủ hàng trong kho — Không thể duyệt đơn
            </div>
            <ul className="text-xs text-red-600 list-disc list-inside space-y-0.5">
              {stockErrorItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <button onClick={clearStockAlerts} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 🟡 BANNER: SẮP HẾT HÀNG (nhánh "Cảnh báo hàng sắp hết" trong sơ đồ) */}
      {stockWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-amber-700 text-xs uppercase mb-1">
              Cảnh báo tồn kho sắp hết ngưỡng
            </div>
            <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
              {stockWarnings.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <button onClick={clearStockAlerts} className="text-amber-400 hover:text-amber-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {showInvoiceModal && getInvoiceOrder() && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="relative w-full max-w-3xl bg-[#FAF6F0] rounded-2xl border border-[#EADBC8] shadow-2xl p-5 sm:p-6">
              <button
                type="button"
                onClick={() => {
                  setShowInvoiceModal(false);
                  setInvoiceOrder(null);
                }}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white border border-[#EADBC8] text-[#5C4033] hover:bg-[#F4EBE1] flex items-center justify-center"
                title="Đóng hóa đơn"
              >
                <X className="w-4 h-4" />
              </button>

              {(() => {
                const order = getInvoiceOrder();
                const invoiceItems = Array.isArray(order.items) ? order.items : [];

                return (
                  <div className="space-y-4 pr-8">
                    <div className="flex items-start justify-between gap-4 border-b border-[#EADBC8] pb-4">
                      <div>
                        <h2 className="font-serif text-2xl font-black text-[#1A1A1A]">Hóa Đơn LuxeHome</h2>
                        <p className="text-xs text-[#8B7E74]">Xem trước hóa đơn và tải về máy nếu cần.</p>
                      </div>
                      <div className="text-right text-xs text-[#5C4033]">
                        <div className="font-bold uppercase">{order.status === "completed" ? "Đã hoàn tất" : "Hóa đơn tạm"}</div>
                        <div>Mã đơn: {order.orderCode || order.id}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white rounded-xl border border-[#EADBC8] p-3 space-y-1">
                        <div><span className="font-bold text-[#5C4033]">Khách hàng:</span> {order.customerName || order.receiverName || "Khách hàng"}</div>
                        <div><span className="font-bold text-[#5C4033]">SĐT:</span> {order.customerPhone || order.receiverPhone || "-"}</div>
                        <div><span className="font-bold text-[#5C4033]">Địa chỉ:</span> {order.shippingAddress || "-"}</div>
                      </div>
                      <div className="bg-white rounded-xl border border-[#EADBC8] p-3 space-y-1">
                        <div><span className="font-bold text-[#5C4033]">Trạng thái:</span> {String(order.status || "").toUpperCase()}</div>
                        <div><span className="font-bold text-[#5C4033]">Thanh toán:</span> {order.paymentStatus || "-"}</div>
                        <div><span className="font-bold text-[#5C4033]">Ngày:</span> {formatInvoiceDate(order.confirmedAt || order.createdAt || order.date)}</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#EADBC8] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-[#FAF6F0] text-[#5C4033]">
                          <tr>
                            <th className="text-left p-3">Sản phẩm</th>
                            <th className="text-left p-3">SKU</th>
                            <th className="text-center p-3">SL</th>
                            <th className="text-right p-3">Đơn giá</th>
                            <th className="text-right p-3">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EADBC8]/40">
                          {invoiceItems.length > 0 ? (
                            invoiceItems.map((item: any, index: number) => (
                              <tr key={`${order.id}-${index}`} className="bg-white">
                                <td className="p-3 font-medium">{item.productName || item.name || "Sản phẩm"}</td>
                                <td className="p-3">{item.sku || "-"}</td>
                                <td className="p-3 text-center">{item.quantity || 1}</td>
                                <td className="p-3 text-right">{formattedPrice(Number(item.sellingPrice ?? item.price ?? 0))}</td>
                                <td className="p-3 text-right font-bold text-emerald-700">{formattedPrice(Number(item.totalPrice ?? (item.sellingPrice ?? item.price ?? 0) * (item.quantity || 1)))}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="p-4 text-center text-gray-400" colSpan={5}>
                                Hóa đơn này chưa có chi tiết sản phẩm từ backend.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between bg-white rounded-xl border border-[#EADBC8] p-4">
                      <div className="text-xs text-[#8B7E74]">Nếu không cần tải hóa đơn, chỉ cần bấm nút đóng.</div>
                      <div className="text-sm font-bold text-emerald-700">Tổng tiền: {formattedPrice(Number(order.totalAmount || 0))}</div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={exportInvoiceToFile}
                        className="inline-flex items-center gap-2 bg-[#5C4033] text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#4a3329] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Xuất hóa đơn
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowInvoiceModal(false);
                          setInvoiceOrder(null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-300 transition-colors"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* BẢNG DANH SÁCH ĐƠN HÀNG */}
        <div className="lg:col-span-2 overflow-x-auto">
          <table className="w-full text-xs text-left border border-[#EADBC8] rounded-xl overflow-hidden shadow-sm">
            <thead className="bg-[#FAF6F0] text-[#5C4033]">
              <tr className="border-b border-[#EADBC8]">
                <th className="p-4">Mã đơn</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4 text-right">Tổng tiền</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-center w-16">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADBC8]/40 bg-white">
              {filteredOrders.map((o) => {
                const statusUpper = String(o.status || "").toUpperCase().trim();
                const meta = STATUS_META[statusUpper] || STATUS_META[STATUS.PENDING];
                const canViewInvoice = statusUpper === STATUS.COMPLETED;

                return (
                  <tr
                    key={o.id}
                    onClick={() => {
                      setSelectedOrder(o);
                      setShowCancelBox(false);
                      setShowPaymentBox(false);
                      setShowReturnBox(false);
                      clearStockAlerts();
                    }}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedOrder?.id === o.id ? "bg-[#FAF6F0]/50" : ""
                    }`}
                  >
                    <td className="p-4 font-bold text-[#5C4033]">{o.id}</td>
                    <td className="p-4">{o.customerName}</td>
                    <td className="p-4 font-bold text-emerald-700 text-right">{formattedPrice(o.totalAmount)}</td>
                    <td className="p-4 text-center align-middle">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="p-4 text-center align-middle">
                      {canViewInvoice && (isSales || isAdmin) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInvoiceOrder(o);
                            setShowInvoiceModal(true);
                          }}
                          className="mx-auto w-7 h-7 rounded-full border border-[#EADBC8] bg-white text-[#5C4033] hover:bg-[#FAF6F0] flex items-center justify-center transition-colors shrink-0"
                          title="Xem hóa đơn"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-transparent select-none">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PHẦN HIỂN THỊ CHI TIẾT VÀ NÚT CHỨC NĂNG THEO SWIMLANES */}
        <div className="bg-white border border-[#EADBC8] rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-[#5C4033] text-sm">Thông Tin Chi Tiết Đơn Bán</h3>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">
              {visibleRoleLabel}
            </span>
          </div>

          {selectedOrder ? (
            (() => {
              const currentStatus = String(selectedOrder.status || "").toUpperCase().trim();

              return (
                <div className="space-y-3 text-xs text-gray-700">
                  <div>
                    <span className="font-bold text-gray-500">Mã đơn hệ thống:</span> #{selectedOrder.id}
                  </div>
                  <div>
                    <span className="font-bold text-gray-500">Khách nhận:</span> {selectedOrder.customerName}
                  </div>
                  <div>
                    <span className="font-bold text-gray-500">Tổng thanh toán:</span>{" "}
                    <span className="font-bold text-emerald-700">{formattedPrice(selectedOrder.totalAmount)}</span>
                  </div>

                  {selectedOrder.staffNote && (
                    <div className="bg-red-50 p-2 rounded text-red-700 border border-red-200">
                      <span className="font-bold">Lý do hệ thống ghi nhận:</span> {selectedOrder.staffNote}
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-2">
                    <span className="block font-bold text-[#5C4033] mb-2 text-[11px] uppercase tracking-wider">
                      Luồng Thao Tác Nghiệp Vụ:
                    </span>

                    {/* 🛒 SWIMLANE 1: NHÂN VIÊN BÁN HÀNG (SALES) */}
                    {isSales && (
                      <>
                        {/* BƯỚC 1: pending -> confirmed */}
                        {currentStatus === STATUS.PENDING && !showCancelBox && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleProcessWorkflow(selectedOrder.id, "confirm")}
                              className="bg-[#5C4033] text-white p-2.5 rounded-lg font-bold hover:bg-[#4a3329] transition-colors text-center"
                            >
                              Xác Nhận Đơn
                            </button>
                            <button
                              onClick={() => setShowCancelBox(true)}
                              className="bg-red-600 text-white p-2.5 rounded-lg font-bold hover:bg-red-700 transition-colors text-center"
                            >
                              Hủy Đơn Bán
                            </button>
                          </div>
                        )}

                        {/* BƯỚC 2: confirmed -> shipping (Gửi yêu cầu trừ tồn kho + Kiểm tra tồn kho theo biến thể) */}
                        {currentStatus === STATUS.CONFIRMED && !showCancelBox && (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleProcessWorkflow(selectedOrder.id, "approve")}
                              className="w-full bg-blue-600 text-white p-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors text-center"
                            >
                              Duyệt Đơn Bán (Trừ Tồn Kho)
                            </button>
                            <button
                              onClick={() => setShowCancelBox(true)}
                              className="w-full bg-red-100 text-red-700 p-2 rounded-lg font-bold hover:bg-red-200 transition-colors text-center text-[11px]"
                            >
                              Hủy Đơn Bán
                            </button>
                          </div>
                        )}

                        {/* BƯỚC 3: đang chờ kho (shipping) — Sales chỉ theo dõi */}
                        {currentStatus === STATUS.SHIPPING && (
                          <div className="text-center text-purple-800 bg-purple-50 p-3 rounded-xl border border-purple-200 italic">
                            📦 Đơn đã chuyển kho, đang chờ Kho tạo yêu cầu giao hàng.
                          </div>
                        )}

                        {/* 🆕 Đơn giao thất bại — Sales chỉ theo dõi, chờ Kho tạo lại yêu cầu */}
                        {currentStatus === STATUS.DELIVERY_FAILED && (
                          <div className="text-center text-red-800 bg-red-50 p-3 rounded-xl border border-red-200 italic">
                            ⚠️ Giao hàng thất bại, đang chờ Kho tạo lại yêu cầu giao hàng.
                          </div>
                        )}

                        {/* BƯỚC 4: delivered -> ghi nhận thanh toán */}
                        {currentStatus === STATUS.DELIVERED && !showPaymentBox && (
                          <button
                            onClick={() => setShowPaymentBox(true)}
                            className="w-full bg-emerald-600 text-white p-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-md text-center uppercase tracking-wider animate-pulse"
                          >
                            💰 Ghi Nhận Thanh Toán
                          </button>
                        )}

                        {/* FORM GHI NHẬN THANH TOÁN */}
                        {showPaymentBox && (
                          <div className="space-y-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                            <span className="font-bold text-emerald-800 block text-[11px] uppercase">
                              Biểu mẫu lập chứng từ thanh toán:
                            </span>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">PHƯƠNG THỨC THANH TOÁN:</label>
                              <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full p-2 bg-white border border-emerald-200 rounded-lg outline-none text-xs"
                              >
                                <option value="CASH">Tiền mặt (Nhận tại quầy / COD)</option>
                                <option value="BANK" disabled>
                                  Chuyển khoản ngân hàng [Chưa cấu hình]
                                </option>
                                <option value="ONLINE" disabled>
                                  Thanh toán Online Cổng VNPAY [Sắp ra mắt]
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">SỐ TIỀN THỰC NHẬN (ĐỒNG):</label>
                              <input
                                type="number"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(Number(e.target.value))}
                                className="w-full p-2 bg-white border border-emerald-200 rounded-lg outline-none text-xs font-bold text-emerald-800"
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={handleConfirmPayment}
                                className="bg-emerald-600 text-white px-3 py-2 rounded-lg font-bold w-full text-center hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                In & Xuất Hóa Đơn
                              </button>
                              <button
                                onClick={() => setShowPaymentBox(false)}
                                className="bg-gray-400 text-white px-3 py-2 rounded-lg w-full"
                              >
                                Quay lại
                              </button>
                            </div>
                          </div>
                        )}

                        {/* BƯỚC 5 (nhánh trả hàng): đơn đã hoàn tất -> khách có thể trả hàng */}
                        {currentStatus === STATUS.COMPLETED && !showReturnBox && (
                          <div className="space-y-2">
                            <div className="text-center text-[#1E9E5A] bg-[#E6F9EF] p-3 rounded-xl border border-[#B9F0D3] font-bold">
                              🎉 Đơn hàng đã ghi nhận thanh toán & Xuất hóa đơn thành công!
                            </div>
                            <button
                              onClick={() => setShowReturnBox(true)}
                              className="w-full bg-orange-100 text-orange-700 p-2 rounded-lg font-bold hover:bg-orange-200 transition-colors text-center text-[11px]"
                            >
                              Khách Trả Hàng / Yêu Cầu Hoàn
                            </button>
                          </div>
                        )}

                        {/* FORM XỬ LÝ TRẢ HÀNG — nhánh "Khách trả hàng" trong sơ đồ */}
                        {showReturnBox && (
                          <div className="space-y-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
                            <span className="font-bold text-orange-800 block text-[11px] uppercase">
                              Kiểm Tra Tình Trạng Hàng Trả:
                            </span>

                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  checked={returnIsValid}
                                  onChange={() => setReturnIsValid(true)}
                                />
                                Hợp lệ (hoàn kho)
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  checked={!returnIsValid}
                                  onChange={() => setReturnIsValid(false)}
                                />
                                Không hợp lệ
                              </label>
                            </div>

                            <textarea
                              value={returnReason}
                              onChange={(e) => setReturnReason(e.target.value)}
                              placeholder="Nhập ghi chú tình trạng hàng trả..."
                              className="w-full border border-orange-300 p-2 rounded text-xs outline-none focus:border-orange-600 bg-white"
                            />

                            <div className="flex gap-2">
                              <button
                                onClick={handleProcessReturn}
                                className="bg-orange-600 text-white px-3 py-1.5 rounded font-bold w-full text-center"
                              >
                                Xác Nhận Xử Lý Trả Hàng
                              </button>
                              <button
                                onClick={() => setShowReturnBox(false)}
                                className="bg-gray-400 text-white px-3 py-1.5 rounded w-full"
                              >
                                Quay lại
                              </button>
                            </div>
                          </div>
                        )}

                        {currentStatus === STATUS.RETURNED && (
                          <div className="text-center text-orange-800 bg-orange-50 p-3 rounded-xl border border-orange-200 font-bold">
                            🔁 Đơn hàng đã xử lý trả hàng, tồn kho đã được hoàn.
                          </div>
                        )}
                      </>
                    )}

                    {/* FORM NHẬP LÝ DO HỦY ĐƠN (dùng chung cho pending & confirmed) */}
                    {showCancelBox && isSales && (
                      <div className="space-y-2 p-2 bg-red-50 rounded border border-red-100">
                        <label className="font-bold text-red-800 block">Lý do đơn không hợp lệ:</label>
                        <textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Nhập lý do hủy..."
                          className="w-full border border-red-300 p-2 rounded text-xs outline-none focus:border-red-600 bg-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleProcessWorkflow(selectedOrder.id, "cancel-admin", { reason: cancelReason })}
                            className="bg-red-600 text-white px-3 py-1.5 rounded font-bold w-full text-center"
                          >
                            Xác Nhận Hủy
                          </button>
                          <button onClick={() => setShowCancelBox(false)} className="bg-gray-400 text-white px-3 py-1.5 rounded w-full">
                            Quay lại
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 📦 SWIMLANE 2: NHÂN VIÊN KHO (WAREHOUSE) */}
                      {isWarehouse && (
                        <div className="text-center text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200 italic">
                          {currentStatus === STATUS.PENDING || currentStatus === STATUS.CONFIRMED
                            ? "🔒 Đơn chưa được duyệt, Kho chưa xử lý."
                            : currentStatus === STATUS.SHIPPING
                              ? "📦 Đơn đã sẵn sàng giao. Vui lòng qua tab \"Giao Hàng\" để chọn đơn vị vận chuyển và bàn giao."
                              : currentStatus === STATUS.DELIVERED
                                ? "🚚 Hàng đã giao thành công, đang chờ Sales thu tiền."
                                : currentStatus === STATUS.COMPLETED
                                  ? "✅ Đơn hàng đã thanh toán và hoàn tất chu kỳ kho."
                                  : currentStatus === STATUS.RETURNED
                                    ? "🔁 Hàng trả đã được hoàn kho."
                                    : "Đơn hàng đã hủy."}
                        </div>
                      )}

                    {/* 🛡️ SWIMLANE 3: QUẢN TRỊ VIÊN (ADMIN) - QUAN SÁT TIẾN ĐỘ VÀ ĐỐI SOÁT */}
                    {isAdmin && (
                      <div className="text-center text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
                        <p className="font-bold">👁️ Chế độ giám sát & Đối soát (Admin/Manager)</p>
                        <p className="text-[11px] text-amber-700 italic">
                          {currentStatus === STATUS.PENDING && "• Chờ Sales xác nhận thông tin đơn hàng."}
                          {currentStatus === STATUS.CONFIRMED && "• Đơn đã xác nhận, chờ Sales duyệt để chuyển kho."}
                          {currentStatus === STATUS.SHIPPING && "• Đơn đã duyệt, chờ Kho tạo yêu cầu giao hàng."}
                          {currentStatus === STATUS.DELIVERY_FAILED && "• Giao hàng thất bại, chờ Kho tạo lại yêu cầu giao hàng."}
                          {currentStatus === STATUS.DELIVERED && "• Hàng đang giao, chờ Sales thu tiền để làm thủ tục đối soát cuối ca."}
                          {currentStatus === STATUS.COMPLETED && "• Đối soát thành công: Giao dịch khớp, dòng tiền đã được ghi nhận vào hệ thống."}
                          {currentStatus === STATUS.CANCELLED && "• Đơn đã bị hủy."}
                          {currentStatus === STATUS.RETURNED && "• Khách đã trả hàng, tồn kho đã được hoàn."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-12 text-gray-400">Chọn một đơn hàng từ bảng danh sách để thực hiện nghiệp vụ kế toán.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 🆕 COMPONENT PHỤ: Nhân viên kho "Tạo yêu cầu giao hàng" + "Bàn giao đơn hàng
// cho đơn vị vận chuyển" — đúng theo sơ đồ AD_Tạo yêu cầu giao hàng.
// Đồng thời hiển thị "Theo dõi trạng thái giao hàng" / "Xem lý do thất bại".
// =========================================================================
function KhoDeliveryRequestBox({ orderId, onDone }: { orderId: number; onDone: () => void }) {
  const [carrierName, setCarrierName] = useState("");
  const [tracking, setTracking] = useState<any[]>([]);

  const loadTracking = async () => {
    try {
      const data = await shipmentApi.getShipmentsByOrder(orderId);
      setTracking(data);
    } catch (err) {
      console.error("Lỗi lấy lịch sử giao hàng:", err);
    }
  };

  useEffect(() => {
    loadTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleCreate = async () => {
    if (!carrierName.trim()) return;
    try {
      await shipmentApi.createShipment(orderId, carrierName.trim());
      setCarrierName("");
      await loadTracking();
      onDone();
    } catch (err) {
      alert("Lỗi khi tạo yêu cầu giao hàng.");
    }
  };

  const latest = tracking[0];
  const isWaitingOnCarrier =
    latest && ["WAITING_CARRIER", "RECEIVED", "IN_TRANSIT"].includes(latest.shippingStatus);

  return (
    <div className="space-y-2 p-3 bg-cyan-50 rounded-xl border border-cyan-200">
      <span className="font-bold text-cyan-800 block text-[11px] uppercase">
        Yêu Cầu Giao Hàng (Đơn Vị Vận Chuyển)
      </span>

      {/* "Xem lý do thất bại" nếu lần giao trước không thành công */}
      {latest?.note && !isWaitingOnCarrier && (
        <div className="bg-red-50 p-2 rounded text-red-700 border border-red-200 text-xs">
          Lý do thất bại lần trước: {latest.note}
        </div>
      )}

      {!isWaitingOnCarrier && (
        <>
          <input
            type="text"
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
            placeholder="Tên đơn vị vận chuyển (VD: Giao Hàng Nhanh)"
            className="w-full p-2 border border-cyan-200 rounded-lg outline-none text-xs bg-white"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-cyan-600 text-white p-2.5 rounded-lg font-bold hover:bg-cyan-700 transition-colors"
          >
            Tạo Yêu Cầu & Bàn Giao Cho Vận Chuyển
          </button>
        </>
      )}

      {/* "Theo dõi trạng thái giao hàng" */}
      {latest && (
        <div className="text-[11px] text-cyan-800 pt-1">
          Đơn vị vận chuyển: <b>{latest.carrierName}</b> — Trạng thái: <b>{latest.shippingStatus}</b>
          {latest.trackingCode && (
            <>
              {" "}
              — Mã vận đơn: <b>{latest.trackingCode}</b>
            </>
          )}
        </div>
      )}
    </div>
  );
}