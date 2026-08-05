import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, Upload, Loader2, Palette, Save } from "lucide-react";
import { API_BASE_URL } from "../../api/api";

interface VariantRow {
  id: number;
  color: string;
  currentPrice: number;
  sku: string;
  status: string;
  imageUrl: string | null;
  stock: number;
}

interface ProductVariantManagerModalProps {
  productId: string;
  productName: string;
  onClose: () => void;
  // Gọi lại sau khi đóng modal, để bảng sản phẩm chính load lại dữ liệu mới nhất
  onSaved: () => void;
}

export default function ProductVariantManagerModal({
  productId,
  productName,
  onClose,
  onSaved,
}: ProductVariantManagerModalProps) {
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);
  const [uploadingVariantId, setUploadingVariantId] = useState<number | "new" | null>(null);

  // Form thêm màu mới
  const [newColor, setNewColor] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newStock, setNewStock] = useState(0);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchVariants = () => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}/api/products/${productId}/variants`)
      .then((res) => {
        if (!res.ok) throw new Error("Lỗi tải danh sách màu");
        return res.json();
      })
      .then((data: any[]) => {
        setVariants(
          data.map((v) => ({
            id: v.id ?? v.Id,
            color: v.color ?? v.Color ?? "",
            currentPrice: v.currentPrice ?? v.CurrentPrice ?? 0,
            sku: v.sku ?? v.Sku ?? "",
            status: v.status ?? v.Status ?? "ACTIVE",
            imageUrl: v.imageUrl ?? v.ImageUrl ?? null,
            stock: v.stock ?? v.Stock ?? 0,
          }))
        );
      })
      .catch((err) => {
        console.error(err);
        alert("Không tải được danh sách màu của sản phẩm.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const uploadImageFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/products/upload-image`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.message || "Tải ảnh lên thất bại.");
    }
    const data = await res.json();
    return data.imageUrl;
  };

  // Đổi ảnh cho 1 màu đã tồn tại
  const handleExistingImageChange = async (
    variantId: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVariantId(variantId);
    try {
      const uploadedUrl = await uploadImageFile(file);
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, imageUrl: uploadedUrl } : v))
      );
    } catch (err: any) {
      alert(`Lỗi tải ảnh: ${err.message}`);
    } finally {
      setUploadingVariantId(null);
      e.target.value = "";
    }
  };

  // Chọn ảnh cho form thêm màu mới
  const handleNewImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVariantId("new");
    try {
      const uploadedUrl = await uploadImageFile(file);
      setNewImageUrl(uploadedUrl);
    } catch (err: any) {
      alert(`Lỗi tải ảnh: ${err.message}`);
    } finally {
      setUploadingVariantId(null);
      e.target.value = "";
    }
  };

  // Lưu thay đổi (giá / ảnh) cho 1 màu đã tồn tại
  const handleSaveVariant = async (variant: VariantRow) => {
    setSavingVariantId(variant.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/variants/${variant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          color: variant.color,
          currentPrice: variant.currentPrice,
          imageUrl: variant.imageUrl,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || "Lưu thất bại.");
      }
      alert(`Đã lưu màu "${variant.color}".`);
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setSavingVariantId(null);
    }
  };

  const handleDeleteVariant = async (variant: VariantRow) => {
    if (variants.length <= 1) {
      alert("Sản phẩm phải có ít nhất 1 màu, không thể xoá màu cuối cùng.");
      return;
    }
    const confirmed = window.confirm(`Xoá màu "${variant.color}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/variants/${variant.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || "Xoá thất bại.");
      }
      setVariants((prev) => prev.filter((v) => v.id !== variant.id));
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColor.trim()) {
      alert("Vui lòng nhập tên màu.");
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          color: newColor.trim(),
          currentPrice: Number(newPrice) || 0,
          imageUrl: newImageUrl || null,
          initialStock: Number(newStock) || 0,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || "Thêm màu thất bại.");
      }
      setNewColor("");
      setNewPrice(0);
      setNewStock(0);
      setNewImageUrl("");
      fetchVariants();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCloseAndRefresh = () => {
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FAF6F0] w-full max-w-3xl rounded-2xl border border-[#D4AF37] shadow-2xl p-6 md:p-8 relative my-8">
        <button
          onClick={handleCloseAndRefresh}
          className="absolute top-4 right-4 text-[#8B7E74] hover:text-[#1A1A1A] p-1.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6 border-b border-[#EADBC8] pb-4">
          <h3 className="font-serif text-xl font-bold text-[#1A1A1A] flex items-center justify-center gap-2">
            <Palette className="w-5 h-5 text-[#D4AF37]" /> Quản Lý Màu & Ảnh Sản Phẩm
          </h3>
          <p className="text-xs text-[#8B7E74] mt-1 max-w-md mx-auto truncate">{productName}</p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách màu...
          </div>
        ) : (
          <div className="space-y-4">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="bg-white p-4 rounded-xl border border-[#EADBC8] flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                {/* Ảnh preview + upload */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                    {variant.imageUrl ? (
                      <img src={variant.imageUrl} alt={variant.color} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 text-center px-1">
                        Chưa có ảnh
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 px-2.5 py-2 bg-[#FAF6F0] border border-[#EADBC8] rounded-lg cursor-pointer hover:bg-[#F4EBE1] transition-colors text-[#5C4033] font-bold text-[10px] flex-shrink-0">
                    {uploadingVariantId === variant.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Đổi ảnh
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleExistingImageChange(variant.id, e)}
                      disabled={uploadingVariantId === variant.id}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Tên màu */}
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Tên màu</label>
                  <input
                    type="text"
                    value={variant.color}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((v) => (v.id === variant.id ? { ...v, color: e.target.value } : v))
                      )
                    }
                    className="w-full border border-[#EADBC8] p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>

                {/* Giá */}
                <div className="w-full sm:w-36">
                  <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Giá (VNĐ)</label>
                  <input
                    type="number"
                    value={variant.currentPrice}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((v) =>
                          v.id === variant.id ? { ...v, currentPrice: Number(e.target.value) } : v
                        )
                      )
                    }
                    className="w-full border border-[#EADBC8] p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>

                {/* Tồn kho - chỉ hiển thị, sửa ở bảng chính */}
                <div className="w-full sm:w-20 text-center">
                  <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Tồn kho</label>
                  <span className="text-xs font-bold text-[#5C4033]">{variant.stock}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => handleSaveVariant(variant)}
                    disabled={savingVariantId === variant.id}
                    className="p-2 rounded-lg bg-[#5C4033] text-white hover:bg-[#4A3B32] disabled:opacity-50 cursor-pointer"
                    title="Lưu"
                  >
                    {savingVariantId === variant.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteVariant(variant)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer"
                    title="Xoá màu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {variants.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">Sản phẩm chưa có màu nào.</p>
            )}
          </div>
        )}

        {/* Form thêm màu mới */}
        <div className="mt-6 pt-6 border-t border-[#EADBC8]">
          <h4 className="font-bold text-[#5C4033] uppercase text-xs mb-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Thêm Màu Mới
          </h4>
          <form onSubmit={handleAddVariant} className="bg-white p-4 rounded-xl border border-[#EADBC8] flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                {newImageUrl ? (
                  <img src={newImageUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 text-center px-1">
                    Chưa có ảnh
                  </div>
                )}
              </div>
              <label className="flex items-center gap-1.5 px-2.5 py-2 bg-[#FAF6F0] border border-[#EADBC8] rounded-lg cursor-pointer hover:bg-[#F4EBE1] transition-colors text-[#5C4033] font-bold text-[10px] flex-shrink-0">
                {uploadingVariantId === "new" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Chọn ảnh
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewImageChange}
                  disabled={uploadingVariantId === "new"}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Tên màu *</label>
              <input
                type="text"
                required
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="VD: Xanh Rêu"
                className="w-full border border-[#EADBC8] p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div className="w-full sm:w-36">
              <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Giá (VNĐ)</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="w-full border border-[#EADBC8] p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div className="w-full sm:w-24">
              <label className="block text-[10px] font-bold text-[#8B7E74] uppercase mb-1">Tồn kho</label>
              <input
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(Number(e.target.value))}
                className="w-full border border-[#EADBC8] p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#B8962E] text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Thêm
            </button>
          </form>
        </div>

        <div className="pt-6 mt-2 flex justify-end">
          <button
            onClick={handleCloseAndRefresh}
            className="px-6 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#4A3B32] text-white font-bold uppercase text-xs cursor-pointer"
          >
            Xong, Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
}