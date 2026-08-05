import React, { useEffect, useState } from "react";
import { X, Shield, Rotate3d, Check, Sparkles, Scale } from "lucide-react";
import { Product } from "../types";

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, color: string, assemble: boolean) => void;
  onToggleCompare: (product: Product) => void;
  isCompared: boolean;
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onToggleCompare,
  isCompared,
}: ProductDetailModalProps) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    // Lock background scroll while modal is mounted.
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [is360Active, setIs360Active] = useState(false);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || "Default");
  const [quantity, setQuantity] = useState(1);
  const [assembleService, setAssembleService] = useState(false);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);

  const selectedVariant = product.variants?.find((v) => v.color === selectedColor);

  // Tồn kho phải theo biến thể (màu) đang chọn, không dùng tồn kho tổng của cả sản phẩm
  const stock = Number(selectedVariant?.stock ?? product.stock ?? 0);

  const variantOnlyImages = selectedVariant
    ? product.images.filter((img) => img.variantId === selectedVariant.id)
    : [];
  // Ưu tiên ảnh riêng của biến thể; chỉ dùng ảnh chung (variantId null) khi biến thể chưa có ảnh riêng
  const displayImages =
    variantOnlyImages.length > 0
      ? variantOnlyImages
      : product.images.filter((img) => img.variantId == null);
  const finalDisplayImages = displayImages.length > 0 ? displayImages : product.images;

  // For 360 simulation — chỉ quay trong đúng bộ ảnh của biến thể đang hiển thị
  const rotate360 = () => {
    let current = activeImageIndex;
    const interval = setInterval(() => {
      current = (current + 1) % finalDisplayImages.length;
      setActiveImageIndex(current);
    }, 250);

    setTimeout(() => {
      clearInterval(interval);
    }, 2000);
  };

  const handleAddToCartClick = () => {
    if (stock <= 0) {
      alert("Sản phẩm này hiện đã hết hàng.");
      return;
    }

    if (quantity > stock) {
      alert(`Không thể thêm quá tồn kho. Sản phẩm này chỉ còn ${stock} sản phẩm.`);
      setQuantity(stock);
      return;
    }

    onAddToCart(product, quantity, selectedColor, assembleService);
    setIsAddedSuccess(true);
    setTimeout(() => setIsAddedSuccess(false), 2000);
  };

  const handleChangeQuantity = (value: number) => {
    if (stock <= 0) {
      setQuantity(1);
      return;
    }

    if (value < 1) {
      setQuantity(1);
      return;
    }

    if (value > stock) {
      alert(`Sản phẩm này chỉ còn ${stock} sản phẩm trong kho.`);
      setQuantity(stock);
      return;
    }

    setQuantity(value);
  };

  // Đổi màu -> đổi ảnh về đầu, và ép số lượng đang chọn về đúng tồn kho của màu mới
  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    setActiveImageIndex(0);
    const nextVariant = product.variants?.find((v) => v.color === color);
    const nextStock = Number(nextVariant?.stock ?? product.stock ?? 0);
    setQuantity((q) => (nextStock > 0 ? Math.min(q, nextStock) : 1));
  };

  const formattedPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 overscroll-contain overflow-y-auto" id="product-detail-modal">
      <div className="flex min-h-full items-start justify-center px-[4vw] py-[3vh] md:items-center md:p-8">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

        <div className="relative mx-auto h-auto max-h-[94vh] w-[92vw] max-w-4xl overflow-hidden rounded-2xl border border-[#EADBC8] bg-[#FAF6F0] shadow-2xl transition-all">

          {/* Header Controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/90 hover:bg-white text-[#5C4033] shadow-md transition-transform active:scale-95"
              id="detail-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid max-h-[94vh] grid-cols-1 overflow-y-auto md:grid-cols-2">

            {/* Visual Section */}
            <div className="p-6 bg-white flex flex-col justify-between border-r border-[#EADBC8]">
              <div>
                <span className="text-[10px] tracking-widest uppercase font-bold text-[#D4AF37] mb-1 block">
                  {product.brand} • {product.style}
                </span>
                <span className="inline-block px-2 py-0.5 bg-[#F4EBE1] text-[#5C4033] text-xs font-semibold rounded mb-3">
                  {product.categoryName}
                </span>

                {/* Main viewport */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#FAF6F0] border border-[#EADBC8]/60 flex items-center justify-center group mb-4">
                  <img
                    src={finalDisplayImages[activeImageIndex]?.url ?? product.images[0]?.url}
                    alt={`${product.name} perspective ${activeImageIndex + 1}`}
                    className="w-full h-full object-cover transition-all duration-700"
                    id="zoomable-preview-img"
                  />

                  {is360Active && (
                    <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none">
                      <div className="px-3 py-1 bg-[#5C4033]/90 text-white text-[11px] font-semibold tracking-wider rounded-full uppercase flex items-center gap-1.5 shadow-lg">
                        <Rotate3d className="w-3.5 h-3.5 animate-spin" />
                        Chế độ 360° Đang Mô Phỏng
                      </div>
                    </div>
                  )}

                  {/* Rotate 360 Action Overlay */}
                  <button
                    onClick={() => {
                      setIs360Active(true);
                      rotate360();
                      setTimeout(() => setIs360Active(false), 2000);
                    }}
                    className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-[#5C4033] rounded-full text-xs font-semibold shadow-md border border-[#EADBC8] transition-colors"
                    id="btn-360-rotate"
                  >
                    <Rotate3d className="w-4 h-4 text-[#D4AF37]" />
                    Xem ảnh 360°
                  </button>
                </div>

                {/* Thumbnails */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {finalDisplayImages.map((img, i) => (
                    <button
                      key={img.url + i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === i ? "border-[#D4AF37] ring-1 ring-[#D4AF37]" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                    >
                      <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Quality Specs */}
              <div className="mt-4 pt-4 border-t border-[#EADBC8]/40 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#5C4033] font-medium">
                  <Shield className="w-4 h-4 text-[#D4AF37]" />
                  <span>Bảo hành thượng hạng: <strong>{product.warranty}</strong></span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#8B7E74]">
                  <span>Trạng thái hàng: <strong>{stock > 0 ? `Còn hàng (${stock} bộ)` : "Đặt trước"}</strong></span>
                  <span>Chất liệu: <strong>{product.material.split(",")[0]}</strong></span>
                </div>
              </div>
            </div>

            {/* Config & Purchase Section */}
            <div className="p-8 flex flex-col justify-between">
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#1A1A1A] leading-tight mb-2">
                  {product.name}
                </h1>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-2xl font-bold text-[#D4AF37]">
                    {formattedPrice(product.price)}
                  </span>
                  {product.discountPrice && (
                    <span className="text-sm text-[#8B7E74] line-through">
                      {formattedPrice(product.discountPrice)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#5C4033] leading-relaxed mb-6 font-medium bg-[#F4EBE1] p-3 rounded-lg border-l-4 border-[#D4AF37]">
                  {product.description}
                </p>

                {/* Specs list */}
                <div className="space-y-3 mb-6 bg-white p-4 rounded-xl border border-[#EADBC8]/50 text-xs">
                  <h3 className="font-semibold text-[#1A1A1A] uppercase tracking-wider text-[10px]">Thông số chi tiết</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-[#4A3B32]">
                    <div>Kích thước:</div> <div className="font-medium text-[#1A1A1A]">{product.dimensions}</div>
                    <div>Thương hiệu:</div> <div className="font-medium text-[#1A1A1A]">{product.brand}</div>
                    <div>Nhà cung cấp:</div> <div className="font-medium text-[#1A1A1A]">LuxeHome Exclusive</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#EADBC8]/40">
                    <p className="text-[#8B7E74] leading-relaxed text-[11px] italic">{product.longDescription}</p>
                  </div>
                </div>

                {/* Configuration Options */}
                <div className="space-y-4 mb-6">
                  {/* Select Color */}
                  <div>
                    <label className="block text-xs font-bold text-[#5C4033] uppercase tracking-wider mb-2">Màu sắc tinh chọn:</label>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleSelectColor(color)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedColor === color
                            ? "bg-[#5C4033] text-white border-[#5C4033] shadow-sm"
                            : "bg-white text-[#5C4033] border-[#EADBC8] hover:bg-[#FAF6F0]"
                            }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Installation support checkbox */}
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#EADBC8]/50">
                    <input
                      type="checkbox"
                      id="assemble-service"
                      checked={assembleService}
                      onChange={(e) => setAssembleService(e.target.checked)}
                      className="w-4.5 h-4.5 rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                    />
                    <label htmlFor="assemble-service" className="text-xs font-semibold text-[#4A3B32] cursor-pointer">
                      Yêu cầu lắp ráp chuyên nghiệp giao hàng tận nơi (+450.000đ)
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  {/* Quantity + Stock */}
                  <div className="w-full sm:w-auto">
                    <div className="flex min-h-[48px] items-center justify-between overflow-hidden rounded-xl border border-[#EADBC8] bg-white">
                      <button
                        type="button"
                        disabled={quantity <= 1 || stock <= 0}
                        onClick={() => handleChangeQuantity(quantity - 1)}
                        className="h-full px-4 py-3 text-[#5C4033] hover:bg-[#FAF6F0] transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        -
                      </button>

                      <span className="min-w-[44px] px-3 text-center text-sm font-semibold text-[#1A1A1A]">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        disabled={quantity >= stock || stock <= 0}
                        onClick={() => handleChangeQuantity(quantity + 1)}
                        className="h-full px-4 py-3 text-[#5C4033] hover:bg-[#FAF6F0] transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>

                    <p className="mt-1 text-[11px] text-[#8B7E74] text-center sm:text-left">
                      Tồn kho:{" "}
                      <span className={stock > 0 ? "font-bold text-emerald-600" : "font-bold text-red-600"}>
                        {stock > 0 ? `${stock} sản phẩm` : "Hết hàng"}
                      </span>
                    </p>
                  </div>

                  {/* Add to cart */}
                  <button
                    type="button"
                    onClick={handleAddToCartClick}
                    disabled={stock <= 0}
                    className={`min-h-[48px] flex-1 py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all ${
                      isAddedSuccess
                        ? "bg-emerald-600 text-white"
                        : stock > 0
                          ? "bg-gradient-to-r from-[#5C4033] to-[#4A3B32] text-white hover:from-[#4A3B32] hover:to-[#3A2D25] shadow-md hover:shadow-lg"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    id="add-to-cart-action-btn"
                  >
                    {isAddedSuccess ? (
                      <>
                        <Check className="w-5 h-5 animate-bounce" />
                        Đã Thêm Vào Giỏ!
                      </>
                    ) : stock > 0 ? (
                      <>
                        <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                        Thêm Vào Giỏ Hàng
                      </>
                    ) : (
                      "Hết Hàng / Nhận Đặt Trước"
                    )}
                  </button>
                </div>

                <button
                  onClick={() => onToggleCompare(product)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    isCompared
                      ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]"
                      : "bg-transparent text-[#5C4033] border-[#EADBC8] hover:bg-[#F4EBE1]"
                  }`}
                  id="add-to-compare-btn"
                >
                  <Scale className="w-4 h-4" />
                  {isCompared ? "Đang so sánh" : "So Sánh Sản Phẩm"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}