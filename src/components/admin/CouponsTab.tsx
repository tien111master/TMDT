import React, { useState, useEffect } from "react";
import { Tag, Plus, X, Edit3, Ban, AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import { promotionApi } from "../../api/api";


// Component quản lý khuyến mãi cho Admin — theo đúng sơ đồ AD_Tạo chương trình khuyến mãi
// 3 nhánh thao tác: Tạo mới / Cập nhật / Kết thúc-Hủy

interface AdminPromotion {
  id: number;
  promotionName: string;
  couponCode: string | null;
  promotionType: string;
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startedAt: string;
  endedAt: string;
  usageLimit: number | null;
  usedCount: number | null;
  status: string;
  isHidden: boolean;
}

interface FormState {
  promotionName: string;
  hasCoupon: boolean; // "Có phát hành mã giảm giá?"
  couponCode: string;
  promotionType: "PercentDiscount" | "FixedDiscount";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  startedAt: string;
  endedAt: string;
  usageLimit: number;
}

const emptyForm: FormState = {
  promotionName: "",
  hasCoupon: false,
  couponCode: "",
  promotionType: "FixedDiscount",
  discountValue: 0,
  minOrderAmount: 0,
  maxDiscountAmount: 0,
  startedAt: "",
  endedAt: "",
  usageLimit: 0,
};

export default function CouponsTab() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const formattedPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const formatDate = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("vi-VN");
  };

  const toDatetimeLocal = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  };

  const fetchPromotions = async () => {
  setLoading(true);

  try {
    const data = await promotionApi.getAllAdmin();

    setPromotions(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Lỗi lấy danh sách khuyến mãi:", err);
    setPromotions([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchPromotions();
  }, []);

  // "Tạo chương trình khuyến mãi" — mở form rỗng
  const openCreateForm = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditingId(null);
    setMode("create");
  };

  // "Chọn chương trình cần cập nhật"
  const openEditForm = (p: AdminPromotion) => {
    setForm({
      promotionName: p.promotionName,
      hasCoupon: !!p.couponCode,
      couponCode: p.couponCode || "",
      promotionType: p.promotionType === "PercentDiscount" ? "PercentDiscount" : "FixedDiscount",
      discountValue: p.discountValue,
      minOrderAmount: p.minOrderAmount || 0,
      maxDiscountAmount: p.maxDiscountAmount || 0,
      startedAt: toDatetimeLocal(p.startedAt),
      endedAt: toDatetimeLocal(p.endedAt),
      usageLimit: p.usageLimit || 0,
    });
    setFormError(null);
    setEditingId(p.id);
    setMode("edit");
  };

  const closeForm = () => {
    setMode("list");
    setEditingId(null);
    setFormError(null);
  };

  const handleToggleVisibility = async (p: AdminPromotion) => {
    try {
      await promotionApi.toggleVisibility(p.id, !p.isHidden);
      setPromotions((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, isHidden: !p.isHidden } : item
        )
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi thay đổi trạng thái hiển thị.");
    }
  };

  // "Kiểm tra tính hợp lệ" -> Hợp lệ: Lưu / Không hợp lệ: Thông báo lỗi (giữ form mở để "Chỉnh sửa lại điều kiện")
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      promotionName: form.promotionName,
      couponCode: form.hasCoupon ? form.couponCode.trim() : null,
      promotionType: form.promotionType,
      discountValue: Number(form.discountValue),
      minOrderAmount: Number(form.minOrderAmount) || null,
      maxDiscountAmount: Number(form.maxDiscountAmount) || null,
      startedAt: new Date(form.startedAt).toISOString(),
      endedAt: new Date(form.endedAt).toISOString(),
      usageLimit: Number(form.usageLimit) || null,
    };

    try {
      if (mode === "create") {
        await promotionApi.create(payload);
      } else if (mode === "edit" && editingId) {
        await promotionApi.update(editingId, payload);
      }
      await fetchPromotions();
      closeForm();
    } catch (err: any) {
      // Nhánh "Không hợp lệ" -> Thông báo lỗi điều kiện, giữ form mở để chỉnh sửa lại
      const msg = err?.response?.data?.message || "Đã xảy ra lỗi, vui lòng kiểm tra lại điều kiện.";
      setFormError(msg);
    }
  };

  // "Chọn chương trình cần kết thúc" -> "Kết thúc/hủy chương trình khuyến mãi"
  const handleEnd = async (p: AdminPromotion) => {
    if (!window.confirm(`Xác nhận kết thúc/hủy chương trình "${p.promotionName}"?`)) return;
    try {
      await promotionApi.end(p.id);
      await fetchPromotions();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi kết thúc chương trình khuyến mãi.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-[#EADBC8] pb-4">
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#D4AF37]" /> Quản Lý Khuyến Mãi
        </h3>
        {mode === "list" && (
          <button
            onClick={openCreateForm}
            className="bg-[#5C4033] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-[#4a3329] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tạo Chương Trình Mới
          </button>
        )}
        {mode !== "list" && (
          <button
            onClick={closeForm}
            className="text-xs font-bold text-gray-500 hover:text-red-600 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Đóng
          </button>
        )}
      </div>

      {/* FORM: Tạo mới / Cập nhật — "Thiết lập điều kiện khuyến mãi" */}
      {mode !== "list" && (
        <form onSubmit={handleSubmit} className="bg-[#FAF6F0] p-6 rounded-2xl border border-[#EADBC8] space-y-4">
          <h4 className="font-bold text-[#5C4033] uppercase text-xs border-b border-[#EADBC8] pb-2">
            {mode === "create" ? "Tạo Chương Trình Khuyến Mãi" : "Cập Nhật Chương Trình Khuyến Mãi"}
          </h4>

          {formError && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex gap-2 items-start text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-700">Điều kiện không hợp lệ:</div>
                <div className="text-red-600">{formError}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="font-bold block mb-1 text-[#1A1A1A]">Tên Chương Trình *</label>
              <input
                required
                value={form.promotionName}
                onChange={(e) => setForm({ ...form, promotionName: e.target.value })}
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                placeholder="VD: Khuyến mãi hè 2026"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-[#1A1A1A]">Hình Thức Giảm Giá</label>
              <select
                value={form.promotionType}
                onChange={(e) => setForm({ ...form, promotionType: e.target.value as any })}
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="FixedDiscount">Giảm số tiền cố định</option>
                <option value="PercentDiscount">Giảm theo phần trăm (%)</option>
              </select>
            </div>

            <div>
              <label className="font-bold block mb-1 text-[#1A1A1A]">
                Giá Trị Giảm {form.promotionType === "PercentDiscount" ? "(%)" : "(VNĐ)"} *
              </label>
              <input
                type="number"
                required
                min={0}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-[#1A1A1A]">Đơn Hàng Tối Thiểu (VNĐ)</label>
              <input
                type="number"
                min={0}
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-[#1A1A1A]">Giảm Tối Đa (VNĐ)</label>
              <input
                type="number"
                min={0}
                value={form.maxDiscountAmount}
                onChange={(e) => setForm({ ...form, maxDiscountAmount: Number(e.target.value) })}
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-[#1A1A1A]">Giới Hạn Lượt Dùng</label>
              <input
                type="number"
                min={0}
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-[#1A1A1A]">Thời Gian Bắt Đầu *</label>
              <input
                type="datetime-local"
                required
                value={form.startedAt}
                onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-[#1A1A1A]">Thời Gian Kết Thúc *</label>
              <input
                type="datetime-local"
                required
                value={form.endedAt}
                onChange={(e) => setForm({ ...form, endedAt: e.target.value })}
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          {/* "Có phát hành mã giảm giá?" — nhánh rẽ Có/Không */}
          <div className="border-t border-[#EADBC8] pt-4 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasCoupon}
                onChange={(e) => setForm({ ...form, hasCoupon: e.target.checked })}
              />
              Có phát hành mã giảm giá cho khách nhập tại giỏ hàng
            </label>

            {form.hasCoupon && (
              <input
                required
                value={form.couponCode}
                onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                placeholder="VD: SUMMER2026"
                className="w-full border border-[#EADBC8] p-2.5 rounded-lg font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EADBC8]">
            <button
              type="button"
              onClick={closeForm}
              className="px-5 py-2.5 rounded-xl border border-[#EADBC8] text-gray-700 font-bold uppercase text-xs hover:bg-gray-100"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#D4AF37] text-white font-bold uppercase text-xs hover:bg-[#B8962E] flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" /> {mode === "create" ? "Lưu Chương Trình" : "Lưu Thay Đổi"}
            </button>
          </div>
        </form>
      )}

      {/* "Xem danh sách chương trình khuyến mãi" */}
      {mode === "list" && (
        <div className="border border-[#EADBC8] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF6F0] text-[#5C4033] font-bold uppercase border-b border-[#EADBC8]">
              <tr>
                <th className="p-4">Tên Chương Trình</th>
                <th className="p-4">Mã Giảm Giá</th>
                <th className="p-4 text-center">Giá Trị</th>
                <th className="p-4 text-center">Thời Gian</th>
                <th className="p-4 text-center">Trạng Thái</th>
                <th className="p-4 text-center">Hiển Thị</th>
                <th className="p-4 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADBC8]/40">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : promotions.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Chưa có chương trình khuyến mãi nào.</td></tr>
              ) : (
                promotions.map((p) => {
                  const isEnded = p.status === "Ended";
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 ${isEnded ? "opacity-60" : ""}`}>
                      <td className="p-4 font-bold text-[#1A1A1A]">{p.promotionName}</td>
                      <td className="p-4 font-mono">{p.couponCode || <span className="text-gray-400 italic">Không phát hành</span>}</td>
                      <td className="p-4 text-center font-bold text-[#D4AF37]">
                        {p.promotionType === "PercentDiscount" ? `${p.discountValue}%` : formattedPrice(p.discountValue)}
                      </td>
                      <td className="p-4 text-center text-gray-600">
                        {formatDate(p.startedAt)} - {formatDate(p.endedAt)}
                      </td>
                      <td className="p-4 text-center">
                        {(() => {
                          const now = new Date();
                          const endDate = new Date(p.endedAt);
                          const isExpiredButNotEnded = !isEnded && endDate < now;

                          if (isEnded) {
                            return (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-200 text-gray-600">
                                Đã Kết Thúc
                              </span>
                            );
                          }
                          if (isExpiredButNotEnded) {
                            return (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                Đã Hết Hạn
                              </span>
                            );
                          }
                          return (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đang Hoạt Động
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            p.isHidden
                              ? "bg-gray-200 text-gray-600"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {p.isHidden ? "Đang Ẩn" : "Đang Hiện"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!isEnded && (
                            <>
                              <button
                                onClick={() => openEditForm(p)}
                                className="text-amber-600 hover:bg-amber-50 p-1.5 rounded border border-transparent hover:border-amber-200"
                                title="Cập nhật"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEnd(p)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded border border-transparent hover:border-red-200"
                                title="Kết thúc/Hủy"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleToggleVisibility(p)}
                            className={`p-1.5 rounded border border-transparent ${
                              p.isHidden
                                ? "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                                : "text-gray-500 hover:bg-gray-100 hover:border-gray-300"
                            }`}
                            title={p.isHidden ? "Hiện mã giảm giá" : "Ẩn mã giảm giá"}
                          >
                            {p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}