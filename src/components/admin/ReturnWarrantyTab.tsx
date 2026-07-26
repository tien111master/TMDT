import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../../api/api';
import { RotateCcw, RefreshCw, CheckCircle2, XCircle, PackageCheck } from "lucide-react";
import { returnWarrantyApi, productSearchApi } from "../../api/api";


// Dùng chung cho cả Sales (xử lý RETURN) và Kho (xử lý WARRANTY) — backend tự lọc theo role
// Style bám theo OrdersTab.tsx / ShipmentTab.tsx hiện có

interface RequestListItem {
  id: number;
  requestCode: string;
  requestType: "RETURN" | "WARRANTY";
  orderId: number;
  orderCode: string;
  orderItemId: number;
  productName: string;
  userId: number;
  customerName: string;
  reason: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  PENDING: { label: "Chờ Xử Lý", badgeClass: "bg-amber-100 text-amber-800" },
  PROCESSING: { label: "Đang Xử Lý", badgeClass: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Hoàn Tất", badgeClass: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Bị Từ Chối", badgeClass: "bg-red-100 text-red-800" },
};

const TYPE_LABEL: Record<string, string> = {
  RETURN: "Đổi Trả",
  WARRANTY: "Bảo Hành",
};

export default function ReturnWarrantyTab() {
  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [showCompleteBox, setShowCompleteBox] = useState(false);
  const [exchangeVariantId, setExchangeVariantId] = useState("");
  const [exchangeProductId, setExchangeProductId] = useState("");
  const [exchangeQuantity, setExchangeQuantity] = useState("");
  const [exchangeSearchTerm, setExchangeSearchTerm] = useState("");
  const [exchangeSearchResults, setExchangeSearchResults] = useState<any[]>([]);
  const [exchangeSelectedLabel, setExchangeSelectedLabel] = useState("");
  const [isSearchingExchange, setIsSearchingExchange] = useState(false);
  const [completeNote, setCompleteNote] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await returnWarrantyApi.getRequests();
      setRequests(data);
    } catch (err) {
      console.error("Lỗi lấy danh sách yêu cầu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const loadDetail = async (item: RequestListItem) => {
    setShowRejectBox(false);
    setShowCompleteBox(false);
    try {
      const detail = await returnWarrantyApi.getRequestDetail(item.id);
      setSelected(detail);
    } catch (err) {
      console.error("Lỗi lấy chi tiết yêu cầu:", err);
    }
  };

  const refreshAfterAction = async () => {
    await fetchRequests();
    setSelected(null);
  };

  // "Chấp nhận yêu cầu" (đủ điều kiện)
  const handleAccept = async () => {
    if (!selected) return;
    try {
      await returnWarrantyApi.acceptRequest(selected.id);
      await refreshAfterAction();
    } catch (err: any) {
      alert(`Lỗi khi chấp nhận yêu cầu: ${err?.response?.data?.message || err?.message || ""}`);
    }
  };

  // "Từ chối yêu cầu" + lý do
  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    try {
      await returnWarrantyApi.rejectRequest(selected.id, rejectReason.trim());
      setRejectReason("");
      await refreshAfterAction();
    } catch (err: any) {
      alert(`Lỗi khi từ chối yêu cầu: ${err?.response?.data?.message || err?.message || ""}`);
    }
  };

  const handleSearchExchangeProduct = async (term: string) => {
  setExchangeSearchTerm(term);
  if (term.trim().length < 2) {
    setExchangeSearchResults([]);
    return;
  }
  setIsSearchingExchange(true);
  try {
    const data = await productSearchApi.search(term.trim());
    const items = data.items || data.Items || [];
    // Mỗi sản phẩm có thể có nhiều biến thể — làm phẳng thành danh sách chọn theo biến thể
    const flattened = items.flatMap((p: any) =>
      (p.productVariants || []).map((v: any) => ({
        productId: p.id,
        variantId: v.id,
        label: `${p.productName} - ${v.color || "Mặc định"} (Tồn: ${v.stockQuantity ?? 0})`,
        stockQuantity: v.stockQuantity ?? 0,
      }))
    );
    setExchangeSearchResults(flattened);
  } catch (err) {
    console.error("Lỗi tìm sản phẩm đổi:", err);
  } finally {
    setIsSearchingExchange(false);
  }
};

const handleSelectExchangeVariant = (item: any) => {
  setExchangeProductId(String(item.productId));
  setExchangeVariantId(String(item.variantId));
  setExchangeSelectedLabel(item.label);
  setExchangeSearchResults([]);
  setExchangeSearchTerm("");
};

  // "Hoàn kho / xuất kho đổi / chuyển bảo hành" -> Hoàn tất
  const handleComplete = async () => {
    if (!selected) return;
    try {
      await returnWarrantyApi.completeRequest(selected.id, {
        resultNote: completeNote.trim() || undefined,
        exchangeVariantId: exchangeVariantId ? Number(exchangeVariantId) : undefined,
        exchangeProductId: exchangeProductId ? Number(exchangeProductId) : undefined,
        exchangeQuantity: exchangeQuantity ? Number(exchangeQuantity) : undefined,
      });
      setCompleteNote("");
      setExchangeVariantId("");
      setExchangeProductId("");
      setExchangeQuantity("");
      setExchangeSelectedLabel(""); // THÊM
      setExchangeSearchTerm("");    // THÊM
      await refreshAfterAction();
    } catch (err: any) {
      alert(`Lỗi khi hoàn tất xử lý: ${err?.response?.data?.message || err?.message || ""}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#EADBC8] pb-4">
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-[#D4AF37]" /> Yêu Cầu Đổi Trả / Bảo Hành
        </h3>
        <button
          onClick={fetchRequests}
          className="text-xs flex items-center gap-1 text-[#5C4033] hover:text-[#D4AF37] font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DANH SÁCH YÊU CẦU */}
        <div className="lg:col-span-2 overflow-x-auto">
          <table className="w-full text-xs text-left border border-[#EADBC8] rounded-xl overflow-hidden shadow-sm">
            <thead className="bg-[#FAF6F0] text-[#5C4033]">
              <tr className="border-b border-[#EADBC8]">
                <th className="p-4">Mã YC</th>
                <th className="p-4">Loại</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4">Sản phẩm</th>
                <th className="p-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADBC8]/40 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Chưa có yêu cầu nào.</td></tr>
              ) : (
                requests.map((r) => {
                  const meta = STATUS_META[r.status];
                  return (
                    <tr
                      key={r.id}
                      onClick={() => loadDetail(r)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selected?.id === r.id ? "bg-[#FAF6F0]/50" : ""
                      }`}
                    >
                      <td className="p-4 font-bold text-[#5C4033]">{r.requestCode}</td>
                      <td className="p-4">{TYPE_LABEL[r.requestType]}</td>
                      <td className="p-4">{r.customerName}</td>
                      <td className="p-4 max-w-[160px] truncate">{r.productName}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* CHI TIẾT & XỬ LÝ */}
        <div className="bg-white border border-[#EADBC8] rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="font-bold text-[#5C4033] text-sm border-b pb-2">Xử Lý Yêu Cầu</h3>

          {!selected ? (
            <div className="text-center py-12 text-gray-400">Chọn một yêu cầu để xử lý.</div>
          ) : (
            <div className="space-y-3 text-xs text-gray-700">
              <div><span className="font-bold text-gray-500">Mã YC:</span> {selected.requestCode}</div>
              <div><span className="font-bold text-gray-500">Loại:</span> {TYPE_LABEL[selected.requestType]}</div>
              <div><span className="font-bold text-gray-500">Đơn hàng:</span> {selected.orderCode}</div>
              <div><span className="font-bold text-gray-500">Sản phẩm:</span> {selected.productName} ({selected.sku})</div>
              <div><span className="font-bold text-gray-500">SL:</span> {selected.quantity}</div>
              <div><span className="font-bold text-gray-500">Khách hàng:</span> {selected.customerName} — {selected.customerPhone}</div>
              <div><span className="font-bold text-gray-500">Lý do:</span> {selected.reason}</div>
              {selected.description && (
                <div><span className="font-bold text-gray-500">Mô tả:</span> {selected.description}</div>
              )}
              {/* Hiển thị ảnh minh chứng */}
                {selected.imageUrls && (
                <div className="pt-2">
                    <span className="font-bold text-gray-500 block mb-1.5">
                    Ảnh minh chứng:
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                    {selected.imageUrls
                        .split(";")
                        .filter(Boolean)
                        .map((url: string, idx: number) => (
                        <a
                            key={idx}
                            href={`${API_BASE_URL}${url}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <img
                            src={`${API_BASE_URL}${url}`}
                            alt={`Ảnh minh chứng ${idx + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-[#EADBC8] hover:opacity-80 transition-opacity"
                            />
                        </a>
                        ))}
                    </div>
                </div>
                )}
              {selected.requestType === "RETURN" && selected.accountInfo && (
                <div><span className="font-bold text-gray-500">TK hoàn tiền:</span> {selected.accountInfo}</div>
              )}
              {selected.resultNote && (
                <div className="bg-[#FAF6F0] p-2 rounded text-[#5C4033] border border-[#EADBC8]">
                  <span className="font-bold">Ghi chú xử lý:</span> {selected.resultNote}
                </div>
              )}

              {/* Trạng thái PENDING: Chấp nhận / Từ chối */}
              {selected.status === "PENDING" && !showRejectBox && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <button
                    onClick={handleAccept}
                    className="bg-emerald-600 text-white p-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Chấp Nhận
                  </button>
                  <button
                    onClick={() => setShowRejectBox(true)}
                    className="bg-red-600 text-white p-2.5 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-4 h-4" /> Từ Chối
                  </button>
                </div>
              )}

              {showRejectBox && (
                <div className="space-y-2 p-3 bg-red-50 rounded-xl border border-red-200">
                  <label className="font-bold text-red-800 block text-[11px] uppercase">Lý Do Từ Chối:</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="VD: Quá thời hạn đổi trả, sản phẩm không đúng tình trạng ban đầu..."
                    className="w-full border border-red-300 p-2 rounded text-xs outline-none bg-white"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleReject} className="flex-1 bg-red-600 text-white py-1.5 rounded font-bold text-xs">
                      Xác Nhận Từ Chối
                    </button>
                    <button onClick={() => setShowRejectBox(false)} className="flex-1 bg-gray-300 text-gray-700 py-1.5 rounded font-bold text-xs">
                      Quay Lại
                    </button>
                  </div>
                </div>
              )}

              {/* Trạng thái PROCESSING: Hoàn tất */}
              {selected.status === "PROCESSING" && !showCompleteBox && (
                <button
                  onClick={() => setShowCompleteBox(true)}
                  className="w-full bg-[#5C4033] text-white p-2.5 rounded-lg font-bold hover:bg-[#4a3329] transition-colors flex items-center justify-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  {selected.requestType === "RETURN" ? "Hoàn Kho & Hoàn Tất" : "Chuyển Bảo Hành & Hoàn Tất"}
                </button>
              )}

              {showCompleteBox && (
                <div className="space-y-2 p-3 bg-[#FAF6F0] rounded-xl border border-[#EADBC8]">
                  {selected.requestType === "RETURN" && (
                    <>
                        <p className="text-[11px] text-[#8B7E74]">
                        Để trống nếu khách chỉ trả hàng lấy tiền. Tìm và chọn sản phẩm nếu khách muốn đổi (sẽ tự xuất kho sản phẩm mới).
                        </p>

                        <label className="text-[10px] font-bold text-gray-500 uppercase block">Tìm Sản Phẩm Đổi:</label>
                        <div className="relative">
                        <input
                            type="text"
                            value={exchangeSearchTerm}
                            onChange={(e) => handleSearchExchangeProduct(e.target.value)}
                            placeholder="Nhập tên sản phẩm..."
                            className="w-full border border-[#EADBC8] p-2 rounded-lg text-xs outline-none bg-white"
                        />
                        {isSearchingExchange && (
                            <span className="absolute right-2 top-2 text-[10px] text-gray-400">Đang tìm...</span>
                        )}
                        {exchangeSearchResults.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border border-[#EADBC8] rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                            {exchangeSearchResults.map((item: any) => (
                                <button
                                key={item.variantId}
                                type="button"
                                onClick={() => handleSelectExchangeVariant(item)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-[#FAF6F0] border-b border-[#EADBC8]/40 last:border-0"
                                disabled={item.stockQuantity <= 0}
                                >
                                {item.label}
                                {item.stockQuantity <= 0 && <span className="text-red-500 ml-1">(Hết hàng)</span>}
                                </button>
                            ))}
                            </div>
                        )}
                        </div>

                        {exchangeSelectedLabel && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-700 font-bold">
                            ✓ Đã chọn: {exchangeSelectedLabel}
                            <button
                            type="button"
                            onClick={() => {
                                setExchangeSelectedLabel("");
                                setExchangeVariantId("");
                                setExchangeProductId("");
                            }}
                            className="ml-2 text-red-500 underline"
                            >
                            Bỏ chọn
                            </button>
                        </div>
                        )}

                        <label className="text-[10px] font-bold text-gray-500 uppercase block">Số Lượng Đổi:</label>
                        <input
                        type="number"
                        min={1}
                        value={exchangeQuantity}
                        onChange={(e) => setExchangeQuantity(e.target.value)}
                        className="w-full border border-[#EADBC8] p-2 rounded-lg text-xs outline-none bg-white"
                        />
                    </>
                    )}
                  <label className="text-[10px] font-bold text-gray-500 uppercase block">Ghi Chú Kết Quả:</label>
                  <textarea
                    value={completeNote}
                    onChange={(e) => setCompleteNote(e.target.value)}
                    placeholder="Ghi chú thêm nếu cần..."
                    className="w-full border border-[#EADBC8] p-2 rounded-lg text-xs outline-none bg-white"
                  />
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleComplete} className="flex-1 bg-[#5C4033] text-white py-2 rounded-lg font-bold text-xs">
                      Xác Nhận Hoàn Tất
                    </button>
                    <button onClick={() => setShowCompleteBox(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-bold text-xs">
                      Quay Lại
                    </button>
                  </div>
                </div>
              )}

              {selected.status === "COMPLETED" && (
                <div className="text-center text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-bold">
                  ✅ Yêu cầu đã hoàn tất, đã thông báo cho khách hàng.
                </div>
              )}
              {selected.status === "REJECTED" && (
                <div className="text-center text-red-800 bg-red-50 p-3 rounded-xl border border-red-200 font-bold">
                  ❌ Yêu cầu đã bị từ chối.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}