import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from '../../api/api';
import { Search, Filter, Calendar, CheckSquare, Square, FolderOpen, DollarSign, Check, Clock } from "lucide-react";

interface Category { id: number; categoryName: string; slug: string; }
interface VariantUI { variantId: string; sku: string; productName: string; variantName: string; categorySlug: string; categoryName: string; currentPrice: number; }

export default function PricingTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<VariantUI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State lưu danh sách giá chờ duyệt từ API
  const [priceRequests, setPriceRequests] = useState<any[]>([]);

  // State Bộ lọc & Hành động
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [applyDate, setApplyDate] = useState("");
  const [actionType, setActionType] = useState<"DECREASE" | "INCREASE" | "FIXED">("DECREASE");
  const [valueType, setValueType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [changeValue, setChangeValue] = useState<number | "">("");
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchProductsAndExtractVariants();
    fetchPriceRequests(); // Lấy danh sách chờ duyệt khi load trang
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`);
      if (res.ok) setCategories(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchProductsAndExtractVariants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?page=1&pageSize=100`);
      if (res.ok) {
        const data = await res.json();
        const productList = data.items || data.Items || [];
        let allVariants: VariantUI[] = [];
        
        productList.forEach((p: any) => {
          const pName = p.productName || "Sản phẩm không tên";
          const cSlug = p.category?.slug || "khac";
          const cName = p.category?.categoryName || "Khác";
          const productId = p.id || p.Id;
          
          if (p.productVariants && p.productVariants.length > 0) {
            p.productVariants.forEach((v: any, index: number) => {
              const safeVariantId = v.id || v.Id || productId;
              allVariants.push({
                variantId: safeVariantId.toString(),
                sku: v.sku || `SKU-${productId}-${index+1}`,
                productName: pName,
                variantName: v.color || "Mặc định",
                categorySlug: cSlug, categoryName: cName,
                currentPrice: v.currentPrice || p.price || 0
              });
            });
          } else {
            allVariants.push({
              variantId: productId.toString(),
              sku: p.productCode || `SKU-${productId}`,
              productName: pName, variantName: "Mặc định",
              categorySlug: cSlug, categoryName: cName,
              currentPrice: p.price || 15000000
            });
          }
        });
        setVariants(allVariants);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  // Hàm gọi API lấy danh sách giá (Bảng 2)
  const fetchPriceRequests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/productprices`);
      if (res.ok) setPriceRequests(await res.json());
    } catch (err) { console.error("Lỗi lấy danh sách giá chờ duyệt:", err); }
  };

  // Hàm duyệt giá gọi API /approve và đẩy vào Hangfire
  const handleApprovePrice = async (priceId: number) => {
    if (!window.confirm("Xác nhận duyệt mức giá này? Hệ thống sẽ tự động áp dụng khi đến thời gian đã hẹn.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/productprices/${priceId}/approve`, { method: 'PATCH' });
      if (res.ok) {
        alert("Đã duyệt thành công! Bạn có thể kiểm tra tab Hangfire.");
        fetchPriceRequests(); // Reload lại bảng 2
      } else {
        alert("Lỗi khi duyệt giá.");
      }
    } catch (err) { console.error(err); }
  };

  const filteredVariants = useMemo(() => {
    return variants.filter(v => {
      const matchSearch = v.productName.toLowerCase().includes(searchTerm.toLowerCase()) || v.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === "all" || v.categorySlug === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [variants, searchTerm, selectedCategory]);

  const groupedVariants = useMemo(() => {
    return filteredVariants.reduce((groups: Record<string, VariantUI[]>, item) => {
      if (!groups[item.categoryName]) groups[item.categoryName] = [];
      groups[item.categoryName].push(item);
      return groups;
    }, {});
  }, [filteredVariants]);

  const calculatePreviewPrice = (currentPrice: number) => {
    if (!changeValue || isNaN(Number(changeValue))) return null;
    const val = Number(changeValue);
    if (actionType === "FIXED") return val;
    if (valueType === "PERCENT") {
      if (actionType === "DECREASE") return currentPrice * (1 - val / 100);
      if (actionType === "INCREASE") return currentPrice * (1 + val / 100);
    } else {
      if (actionType === "DECREASE") return Math.max(0, currentPrice - val);
      if (actionType === "INCREASE") return currentPrice + val;
    }
    return currentPrice;
  };

  const handleToggleSelectAll = () => {
    if (selectedVariantIds.length === filteredVariants.length) setSelectedVariantIds([]);
    else setSelectedVariantIds(filteredVariants.map(v => v.variantId));
  };

  const handleToggleRow = (variantId: string) => {
    if (selectedVariantIds.includes(variantId)) setSelectedVariantIds(prev => prev.filter(id => id !== variantId));
    else setSelectedVariantIds(prev => [...prev, variantId]);
  };

  const handleApplyChanges = async () => {
    if (selectedVariantIds.length === 0) { alert("Vui lòng tick chọn ít nhất 1 sản phẩm!"); return; }
    if (!changeValue || isNaN(Number(changeValue))) { alert("Vui lòng nhập mức thay đổi giá hợp lệ!"); return; }
    if (applyDate) {
      const selectedDate = new Date(applyDate);
      const now = new Date();
      if (selectedDate < now) {
        alert("Lỗi: Ngày giờ áp dụng không được nằm trong quá khứ. Vui lòng chọn thời điểm ở tương lai!");
        return;
      }
    }
    
    try {
      let successCount = 0;
      for (const vId of selectedVariantIds) {
        const variant = variants.find(v => v.variantId === vId);
        if (!variant) continue;
        
        const newTargetPrice = calculatePreviewPrice(variant.currentPrice);
        if (newTargetPrice === null) continue;

        const cleanVariantId = parseInt(vId);
        if (isNaN(cleanVariantId)) continue;

        const payload = {
          variantIds: [cleanVariantId],
          sellingPrice: Math.round(newTargetPrice), 
          effectiveFrom: applyDate ? new Date(applyDate).toISOString() : new Date().toISOString(),
          effectiveTo: null
        };

        const res = await fetch(`${API_BASE_URL}/api/productprices/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) successCount++;
      }

      if (successCount > 0) {
        alert(`Tuyệt vời! Đã tạo yêu cầu lên lịch giá cho ${successCount} sản phẩm thành công.`);
        setSelectedVariantIds([]); setChangeValue("");
        fetchPriceRequests(); // Cập nhật lại Bảng 2 ngay lập tức
      }
    } catch (err) {
      console.error(err); alert("Đã xảy ra lỗi kết nối.");
    }
  };

  const formatVND = (price: number) => new Intl.NumberFormat("vi-VN").format(price) + " ₫";
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center border-b border-[#EADBC8] pb-4">
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#D4AF37]" /> Quản Lý & Cập Nhật Giá Bán
        </h3>
      </div>

      {/* BẢNG 1: KHU VỰC CHỌN SẢN PHẨM VÀ LÊN LỊCH */}
      <div className="bg-[#FAF6F0] border border-[#EADBC8] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-[#8B7E74] uppercase tracking-wider mb-2">Tìm kiếm sản phẩm</label>
            <div className="relative">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nhập mã SKU hoặc tên sản phẩm..." className="w-full pl-10 pr-4 py-2.5 border border-[#EADBC8] rounded-xl text-xs text-[#1A1A1A] focus:ring-1 focus:ring-[#D4AF37] outline-none bg-white" />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#8B7E74] uppercase tracking-wider mb-2">Lọc theo danh mục</label>
            <div className="relative">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-[#EADBC8] rounded-xl text-xs text-[#5C4033] font-bold focus:ring-1 focus:ring-[#D4AF37] outline-none appearance-none bg-white cursor-pointer">
                <option value="all">Tất cả danh mục</option>
                {categories.map(c => <option key={c.id} value={c.slug}>{c.categoryName}</option>)}
              </select>
              <Filter className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-3" />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-[#EADBC8]/60"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-[#8B7E74] uppercase tracking-wider mb-2">Ngày và Giờ áp dụng</label>
            <div className="relative">
              <input type="datetime-local" value={applyDate} onChange={(e) => setApplyDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-[#EADBC8] rounded-xl text-xs text-[#1A1A1A] focus:ring-1 focus:ring-[#D4AF37] outline-none bg-white" />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#8B7E74] uppercase tracking-wider mb-2">Hành động</label>
            <select value={actionType} onChange={(e) => setActionType(e.target.value as any)} className="w-full px-4 py-2.5 border border-[#EADBC8] rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] outline-none bg-white font-bold text-[#5C4033]">
              <option value="DECREASE">Giảm giá (-)</option>
              <option value="INCREASE">Tăng giá (+)</option>
              <option value="FIXED">Đặt giá cố định (=)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#8B7E74] uppercase tracking-wider mb-2">Mức thay đổi</label>
            <div className="flex">
              <input type="number" min="0" value={changeValue} onChange={(e) => setChangeValue(e.target.value === "" ? "" : Number(e.target.value))} className="w-full px-4 py-2.5 border border-[#EADBC8] rounded-l-xl text-xs focus:ring-1 focus:ring-[#D4AF37] outline-none font-bold text-[#1A1A1A]" placeholder="0" />
              {actionType !== "FIXED" && (
                <select value={valueType} onChange={(e) => setValueType(e.target.value as any)} className="px-3 py-2.5 bg-gray-50 border-y border-r border-[#EADBC8] rounded-r-xl text-xs font-bold text-[#5C4033] outline-none cursor-pointer">
                  <option value="PERCENT">%</option><option value="AMOUNT">₫</option>
                </select>
              )}
            </div>
          </div>
          <div>
            <button onClick={handleApplyChanges} className="w-full bg-[#5C4033] hover:bg-[#4A3B32] text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
              <Check className="w-4 h-4 text-[#D4AF37]" /> Đề Xuất ({selectedVariantIds.length} SP)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#EADBC8] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF6F0] text-[#5C4033] font-bold uppercase border-b border-[#EADBC8] sticky top-0">
              <tr>
                <th className="p-4 w-12 text-center"><button onClick={handleToggleSelectAll} className="text-[#8B7E74] hover:text-[#5C4033] transition-colors cursor-pointer">{selectedVariantIds.length > 0 && selectedVariantIds.length === filteredVariants.length ? <CheckSquare className="w-4 h-4 text-[#D4AF37]" /> : <Square className="w-4 h-4" />}</button></th>
                <th className="p-4 w-32">Mã SKU</th>
                <th className="p-4">Tên Sản Phẩm / Biến Thể</th>
                <th className="p-4 text-right w-36">Giá Hiện Hành</th>
                <th className="p-4 text-right w-48">Giá Mới (Preview)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADBC8]/40">
              {isLoading ? <tr><td colSpan={5} className="p-8 text-center text-[#8B7E74]">Đang tải dữ liệu...</td></tr> : 
                Object.keys(groupedVariants).map((catName, idx) => (
                  <React.Fragment key={idx}>
                    <tr className="bg-[#FAF6F0]/50 border-y border-[#EADBC8]"><td colSpan={5} className="p-3 pl-4 text-[10px] font-bold text-[#5C4033] uppercase flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5 text-[#D4AF37]" /> {catName}</td></tr>
                    {groupedVariants[catName].map((v) => {
                      const isSelected = selectedVariantIds.includes(v.variantId);
                      const previewPrice = isSelected ? calculatePreviewPrice(v.currentPrice) : null;
                      return (
                        <tr key={`${v.variantId}-${v.sku}-${idx}`} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-[#EADBC8]/20' : ''}`}>
                          <td className="p-4 text-center"><button onClick={() => handleToggleRow(v.variantId)} className="text-[#8B7E74] hover:text-[#5C4033] cursor-pointer">{isSelected ? <CheckSquare className="w-4 h-4 text-[#D4AF37]" /> : <Square className="w-4 h-4" />}</button></td>
                          <td className="p-4 font-mono font-bold text-[#8B7E74] text-[11px]">{v.sku}</td>
                          <td className="p-4"><div className="font-bold text-[#1A1A1A]">{v.productName}</div><div className="text-[10px] text-gray-500 mt-0.5">({v.variantName})</div></td>
                          <td className="p-4 text-right font-bold text-[#5C4033]">{formatVND(v.currentPrice)}</td>
                          <td className="p-4 text-right font-bold text-emerald-600">{previewPrice !== null ? formatVND(previewPrice) : <span className="text-gray-300">---</span>}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* BẢNG 2: DANH SÁCH CHỜ DUYỆT VÀ HẸN GIỜ (Bạn sẽ thấy các bản ghi PENDING ở đây) */}
      <div className="pt-6">
        <h4 className="font-serif text-lg font-bold text-[#1A1A1A] flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#D4AF37]" /> Danh Sách Chờ Duyệt & Hẹn Giờ
        </h4>
        <div className="bg-white border border-[#EADBC8] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAF6F0] text-[#5C4033] font-bold uppercase border-b border-[#EADBC8]">
                <tr>
                  <th className="p-4 text-center">ID</th>
                  <th className="p-4">Sản Phẩm / Biến Thể</th>
                  <th className="p-4 text-right">Giá Đề Xuất</th>
                  <th className="p-4 text-center">Thời Gian Áp Dụng</th>
                  <th className="p-4 text-center">Trạng Thái</th>
                  <th className="p-4 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADBC8]/40">
                {priceRequests.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-[#8B7E74] font-medium">Chưa có dữ liệu giá bán nào.</td></tr>
                ) : (
                  priceRequests.map((price, idx) => (
                    <tr key={`req-${price.id}-${idx}`} className="hover:bg-gray-50 group">
                      <td className="p-4 text-center font-mono text-gray-400">#{price.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-[#1A1A1A]">{price.variant?.product?.productName || "SP không xác định"}</div>
                        <div className="text-[10px] text-gray-500">({price.variant?.variantName})</div>
                      </td>
                      <td className="p-4 text-right font-bold text-red-600">{formatVND(price.sellingPrice)}</td>
                      <td className="p-4 text-center text-gray-600 font-medium">
                        {formatDateTime(price.effectiveFrom)}
                      </td>
                      <td className="p-4 text-center">
                        {price.status === "PENDING" ? (
                          <span className="px-2 py-1 bg-amber-50 text-amber-600 font-bold text-[9px] rounded uppercase border border-amber-200">Chờ Duyệt</span>
                        ) : price.status === "SCHEDULED" ? (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 font-bold text-[9px] rounded uppercase border border-blue-200">Đã Hẹn Giờ</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 font-bold text-[9px] rounded uppercase border border-emerald-200">Đang Áp Dụng</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {price.status === "PENDING" && (
                          <button onClick={() => handleApprovePrice(price.id)} className="bg-[#D4AF37] text-white px-3 py-1.5 rounded font-bold text-[10px] uppercase hover:bg-[#B8962E] cursor-pointer">
                            Duyệt Hẹn Giờ
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}