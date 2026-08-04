import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../../api/api';
import { Package, Search, Filter, Plus, X, Edit3, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon, Globe, Check, DollarSign, Save, Upload, Loader2 } from "lucide-react";
import { Product } from "../../types";
import { Category } from "../AdminPanel";
import { generateSlug } from "../../utils/slug"; 

interface ProductsTabProps {
  categories: Category[];
  onUpdateProductStock: (productId: string, newStock: number) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onEditProduct: (product: Product) => void;
}

export default function ProductsTab({ categories, onUpdateProductStock, onAddProduct, onDeleteProduct, onEditProduct }: ProductsTabProps) {
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // States Thêm sản phẩm
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdSlug, setNewProdSlug] = useState("");
  const [newProdPrice, setNewProdPrice] = useState(15000000);
  const [newProdCategory, setNewProdCategory] = useState<Product["category"]>("phong-khach");
  const [newProdStyle, setNewProdStyle] = useState<Product["style"]>("Modern");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdStock, setNewProdStock] = useState(10);
  const [newProdMaterial, setNewProdMaterial] = useState("Gỗ Óc Chó sấy cao cấp");
  const [newProdDimensions, setNewProdDimensions] = useState("Dài 180cm x Rộng 80cm");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdMetaTitle, setNewProdMetaTitle] = useState("");
  const [newProdMetaDesc, setNewProdMetaDesc] = useState("");
  const [isUploadingNewImage, setIsUploadingNewImage] = useState(false);

  // States Sửa sản phẩm
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState("");
  const [editProdSlug, setEditProdSlug] = useState("");
  const [editProdPrice, setEditProdPrice] = useState(0);
  const [editProdCategory, setEditProdCategory] = useState<string>("phong-khach");
  const [editProdStyle, setEditProdStyle] = useState<string>("Modern");
  const [editProdMaterial, setEditProdMaterial] = useState("");
  const [editProdStock, setEditProdStock] = useState(0);
  const [editProdImage, setEditProdImage] = useState("");
  const [editProdStatus, setEditProdStatus] = useState("ACTIVE");
  const [editProdMetaTitle, setEditProdMetaTitle] = useState("");
  const [editProdMetaDesc, setEditProdMetaDesc] = useState("");
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);

  const formattedPrice = (price: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  // Upload ảnh lên server, trả về URL công khai (/uploads/products/xxx.jpg)
  const uploadProductImage = async (file: File): Promise<string> => {
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
    return data.imageUrl; // Cloudinary trả về URL đầy đủ, dùng thẳng
  };

  const handleNewImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingNewImage(true);
    try {
      const uploadedUrl = await uploadProductImage(file);
      setNewProdImage(uploadedUrl);
    } catch (err: any) {
      alert(`Lỗi tải ảnh: ${err.message}`);
    } finally {
      setIsUploadingNewImage(false);
      e.target.value = "";
    }
  };

  const handleEditImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEditImage(true);
    try {
      const uploadedUrl = await uploadProductImage(file);
      setEditProdImage(uploadedUrl);
    } catch (err: any) {
      alert(`Lỗi tải ảnh: ${err.message}`);
    } finally {
      setIsUploadingEditImage(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPaginatedProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?page=${currentPage}&pageSize=10&search=${debouncedSearch}&category=${selectedCategoryFilter}`);
      if (res.ok) {
        const data = await res.json();
        setTotalPages(data.totalPages || data.TotalPages || 1);
        setTotalItems(data.totalItems || data.TotalItems || 0);
        
        const rawItems = data.items || data.Items || [];
        const mapped = rawItems.map((item: any) => ({
          id: item.id.toString(),
          name: item.productName,
          slug: item.slug || item.productName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
          price: item.productVariants?.[0]?.currentPrice || 0,
          category: item.category?.slug || "khac",
          categoryName: item.category?.categoryName || "Khác",
          style: item.style || "Modern",
          material: item.material || "",
          stock: item.stockQuantity ?? 0,
          images: item.productImages?.map((i:any)=>i.imageUrl) || [],
          status: item.status || "ACTIVE",
          metaTitle: item.metaTitle || "",
          metaDescription: item.metaDescription || "",
        })) as Product[];
        setAdminProducts(mapped);
      }
    } catch (err) {
      console.error("Lỗi lấy sản phẩm admin:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchPaginatedProducts();
  }, [currentPage, debouncedSearch, selectedCategoryFilter]);

  useEffect(() => {
    if (isAddingProduct) {
      setNewProdSlug(generateSlug(newProdName));
      setNewProdMetaTitle(newProdName);
    }
  }, [newProdName, isAddingProduct]);

  const handleAddNewProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProduct({
      id: "", 
      name: newProdName, 
      slug: newProdSlug,
      price: Number(newProdPrice), 
      rating: 5, 
      category: newProdCategory,
      categoryName: categories.find(c => c.slug === newProdCategory)?.categoryName || "Khác", 
      style: newProdStyle,
      images: [newProdImage || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800"], 
      description: newProdDescription, 
      longDescription: "", 
      material: newProdMaterial, 
      dimensions: newProdDimensions,
      colors: ["Mặc định"], 
      features: ["Bảo hành"], 
      warranty: "12 tháng", 
      stock: Number(newProdStock), 
      brand: "LuxeHome", 
      status: "ACTIVE",
      metaTitle: newProdMetaTitle,
      metaDescription: newProdMetaDesc,
      reviews: []
    } as unknown as Product);
    
    setTimeout(() => fetchPaginatedProducts(), 1000);
    setNewProdName(""); setNewProdSlug(""); setNewProdDescription(""); setNewProdPrice(15000000); setNewProdStock(10); setNewProdImage(""); setNewProdMetaTitle(""); setNewProdMetaDesc("");
    setIsAddingProduct(false);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setEditProdName(product.name);
    setEditProdSlug((product as any).slug || generateSlug(product.name));
    setEditProdPrice(product.price);
    setEditProdCategory(product.category);
    setEditProdStyle(product.style || "Modern");
    setEditProdMaterial(product.material);
    setEditProdStock(product.stock || 0);
    setEditProdImage(product.images?.[0] || "");
    setEditProdStatus((product as any).status || "ACTIVE");
    setEditProdMetaTitle((product as any).metaTitle || "");
    setEditProdMetaDesc((product as any).metaDescription || "");
  };

  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const updatedProduct = {
      ...editingProduct,
      name: editProdName,
      slug: editProdSlug,
      price: Number(editProdPrice),
      category: editProdCategory as Product["category"], 
      categoryName: categories.find(c => c.slug === editProdCategory)?.categoryName || "Khác",
      style: editProdStyle as Product["style"], 
      material: editProdMaterial,
      stock: Number(editProdStock),
      images: editProdImage ? [editProdImage] : editingProduct.images,
      status: editProdStatus,
      metaTitle: editProdMetaTitle,
      metaDescription: editProdMetaDesc
    } as unknown as Product; 

    onEditProduct(updatedProduct);
    setAdminProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setEditingProduct(null); 
  };

  const handleDeleteAdminProduct = (id: string) => {
    onDeleteProduct(id);
    setAdminProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#EADBC8] pb-4 gap-4">
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
          <Package className="w-5 h-5 text-[#D4AF37]" /> Quản Lý Kho & Sản Phẩm
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" placeholder="Tìm theo tên sản phẩm..." value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              className="w-full pl-9 pr-4 py-2 border border-[#EADBC8] rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] focus:outline-none"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="relative">
            <select 
              value={selectedCategoryFilter}
              onChange={(e) => {setSelectedCategoryFilter(e.target.value); setCurrentPage(1);}}
              className="appearance-none pl-9 pr-8 py-2 border border-[#EADBC8] rounded-xl text-xs bg-white text-[#5C4033] font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map(c => <option key={c.id} value={c.slug}>{c.categoryName}</option>)}
            </select>
            <Filter className="w-4 h-4 text-[#D4AF37] absolute left-3 top-2.5" />
          </div>

          <button 
            onClick={() => setIsAddingProduct(!isAddingProduct)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${isAddingProduct ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" : "bg-[#5C4033] text-white hover:bg-[#4A3B32]"}`}
          >
            {isAddingProduct ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingProduct ? "Hủy" : "Thêm SP Mới"}
          </button>
        </div>
      </div>

      {isAddingProduct && (
        <form onSubmit={handleAddNewProductSubmit} className="bg-[#FAF6F0] p-6 rounded-2xl border border-[#EADBC8] shadow-sm space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-[#EADBC8] pb-2 mb-2">
            <h4 className="font-bold text-[#5C4033] uppercase text-xs">1. Thông tin cơ bản</h4>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="font-bold mb-1 block text-[#1A1A1A]">Tên Sản Phẩm *</label>
              <input required value={newProdName} onChange={e=>setNewProdName(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" placeholder="VD: Sofa Da Tân Cổ Điển" />
            </div>
            <div>
              <label className="font-bold mb-1 block text-[#1A1A1A]">Đường Dẫn (Slug) *</label>
              <input required value={newProdSlug} onChange={e=>setNewProdSlug(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-gray-50 text-gray-500" placeholder="sofa-da-tan-co-dien" />
            </div>
            
            <div>
              <label className="font-bold mb-1 block text-[#1A1A1A]">Giá Bán (VNĐ) *</label>
              <input type="number" required value={newProdPrice} onChange={e=>setNewProdPrice(Number(e.target.value))} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" />
            </div>
            <div>
              <label className="font-bold mb-1 block text-[#1A1A1A]">Số lượng nhập kho *</label>
              <input type="number" required value={newProdStock} onChange={e=>setNewProdStock(Number(e.target.value))} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" />
            </div>
            <div>
              <label className="font-bold mb-1 block text-[#1A1A1A]">Danh mục</label>
              <select value={newProdCategory} onChange={e=>setNewProdCategory(e.target.value as any)} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]">
                {categories.map(c => <option key={c.id} value={c.slug}>{c.categoryName}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-[#1A1A1A] font-bold mb-1">Trường Phái</label>
              <select value={newProdStyle} onChange={(e) => setNewProdStyle(e.target.value as any)} className="w-full bg-white border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none">
                <option value="Modern">Hiện Đại</option>
                <option value="Classic">Cổ Điển</option>
                <option value="Indochine">Indochine</option>
                <option value="Rustic">Rustic</option>
              </select>
            </div>
            <div>
              <label className="block text-[#1A1A1A] font-bold mb-1">Chất Liệu</label>
              <input type="text" value={newProdMaterial} onChange={(e) => setNewProdMaterial(e.target.value)} className="w-full bg-white border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[#1A1A1A] font-bold mb-1">Ảnh Sản Phẩm</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#EADBC8] rounded-xl cursor-pointer hover:bg-[#F4EBE1] transition-colors text-[#5C4033] font-bold flex-shrink-0">
                  {isUploadingNewImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploadingNewImage ? "Đang tải..." : "Chọn Ảnh"}
                  <input type="file" accept="image/*" onChange={handleNewImageFileChange} disabled={isUploadingNewImage} className="hidden" />
                </label>
                {newProdImage && (
                  <img src={newProdImage} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-[#EADBC8] flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-[#EADBC8] pb-2 mt-4 mb-2">
            <h4 className="font-bold text-[#5C4033] uppercase text-xs flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> 2. Thông tin SEO</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold mb-1 block text-[#1A1A1A]">Meta Title (Tiêu đề SEO)</label>
              <input type="text" value={newProdMetaTitle} onChange={e=>setNewProdMetaTitle(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" placeholder="Nhập tiêu đề hiển thị trên Google..." />
            </div>
            <div>
              <label className="font-bold mb-1 block text-[#1A1A1A]">Meta Description (Mô tả SEO)</label>
              <input type="text" value={newProdMetaDesc} onChange={e=>setNewProdMetaDesc(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" placeholder="Nhập mô tả ngắn gọn..." />
            </div>
          </div>

          <div className="flex justify-end pt-4 mt-2 border-t border-[#EADBC8]"><button type="submit" disabled={isUploadingNewImage} className="bg-[#D4AF37] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs hover:bg-[#B8962E] flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"><Check className="w-4 h-4"/> Lưu Sản Phẩm Mới</button></div>
        </form>
      )}

      <div className="border border-[#EADBC8] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-[#FAF6F0] text-[#5C4033] font-bold uppercase border-b border-[#EADBC8]">
              <tr>
                <th className="p-4 text-center w-16">ID</th>
                <th className="p-4">Hình Ảnh</th>
                <th className="p-4">Tên Sản Phẩm</th>
                <th className="p-4 text-center">Trạng Thái</th>
                <th className="p-4 text-right">Giá Bán</th>
                <th className="p-4 text-center">Tồn Kho</th>
                <th className="p-4 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADBC8]/40">
              {isLoadingProducts ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-medium">Đang tải dữ liệu...</td></tr>
              ) : adminProducts.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-medium">Không tìm thấy sản phẩm nào.</td></tr>
              ) : (
                adminProducts.map(p => {
                  const isInactive = (p as any).status === "INACTIVE";
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors group ${isInactive ? "opacity-60 bg-gray-50" : ""}`}>
                      <td className="p-4 text-center font-mono text-gray-400">#{p.id}</td>
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden border border-gray-200 relative">
                          <img src={p.images?.[0] || "https://placehold.co/100x100?text=No+Image"} alt="" className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-[#1A1A1A] max-w-[200px] truncate" title={p.name}>{p.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{p.categoryName}</div>
                      </td>
                      <td className="p-4 text-center">
                        {isInactive ? (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded uppercase text-[9px] font-bold border border-gray-300">Ngừng kinh doanh</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded uppercase text-[9px] font-bold border border-emerald-200">Đang bán</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-bold text-[#D4AF37]">{formattedPrice(p.price)}</td>
                      <td className="p-4 text-center">
                        <input type="number" value={p.stock} disabled={isInactive} onChange={(e) => onUpdateProductStock(p.id, Number(e.target.value))} className="w-16 border border-gray-200 text-center rounded p-1 focus:border-[#D4AF37] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400" />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditProductModal(p)} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded cursor-pointer border border-transparent hover:border-amber-200"><Edit3 className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteAdminProduct(p.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded cursor-pointer border border-transparent hover:border-red-200"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoadingProducts && totalPages > 0 && (
          <div className="bg-gray-50 p-4 border-t border-[#EADBC8] flex items-center justify-between">
            <span className="text-xs text-gray-500">Hiển thị <span className="font-bold text-[#1A1A1A]">{adminProducts.length}</span> trên tổng số <span className="font-bold text-[#1A1A1A]">{totalItems}</span> sản phẩm</span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold px-3 text-[#5C4033]">Trang {currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF6F0] w-full max-w-3xl rounded-2xl border border-[#D4AF37] shadow-2xl p-6 md:p-8 relative my-8">
            <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-[#8B7E74] hover:text-[#1A1A1A] p-1.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"><X className="w-6 h-6" /></button>
            <div className="text-center mb-6 border-b border-[#EADBC8] pb-4">
              <h3 className="font-serif text-xl font-bold text-[#1A1A1A] flex items-center justify-center gap-2"><Edit3 className="w-5 h-5 text-[#D4AF37]" /> Cập Nhật Thông Tin Sản Phẩm</h3>
              <p className="text-xs text-[#8B7E74] mt-1 font-mono">ID: #{editingProduct.id}</p>
            </div>
            <form onSubmit={handleSaveProductEdit} className="space-y-5 text-sm">
              <div className="border-b border-[#EADBC8] pb-2 mb-2"><h4 className="font-bold text-[#5C4033] uppercase text-xs">1. Thông tin cơ bản & Trạng thái</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="block text-xs text-[#1A1A1A] uppercase font-bold mb-1">Tên Sản Phẩm *</label><input type="text" required value={editProdName} onChange={(e) => setEditProdName(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none" /></div>
                <div><label className="block text-xs text-[#1A1A1A] uppercase font-bold mb-1">Đường Dẫn Tĩnh (Slug) *</label><input type="text" required value={editProdSlug} onChange={(e) => setEditProdSlug(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none bg-white" /></div>
                <div>
                  <label className="block text-xs text-[#1A1A1A] uppercase font-bold mb-1">Ảnh Sản Phẩm</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#EADBC8] rounded-xl cursor-pointer hover:bg-[#F4EBE1] transition-colors text-[#5C4033] font-bold flex-shrink-0 text-xs">
                      {isUploadingEditImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isUploadingEditImage ? "Đang tải..." : "Chọn Ảnh"}
                      <input type="file" accept="image/*" onChange={handleEditImageFileChange} disabled={isUploadingEditImage} className="hidden" />
                    </label>
                    {editProdImage && (
                      <img src={editProdImage} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-[#EADBC8] flex-shrink-0" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#1A1A1A] uppercase font-bold mb-1">Trạng Thái Bán Hàng *</label>
                  <select value={editProdStatus} onChange={(e) => setEditProdStatus(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none font-bold">
                    <option value="ACTIVE" className="text-emerald-700">Đang Bán (ACTIVE)</option>
                    <option value="INACTIVE" className="text-red-600">Ngừng Kinh Doanh (INACTIVE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#1A1A1A] uppercase font-bold mb-1">Giá Bán Cập Nhật *</label>
                  <div className="relative"><input type="number" required min="0" value={editProdPrice} onChange={(e) => setEditProdPrice(Number(e.target.value))} className="w-full border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none pl-8 font-bold text-[#5C4033]" /><DollarSign className="w-4 h-4 absolute left-2.5 top-3 text-gray-400" /></div>
                </div>
                <div>
                  <label className="block text-xs text-[#1A1A1A] uppercase font-bold mb-1">Số Lượng Tồn Kho Thực *</label>
                  <div className="relative"><input type="number" required min="0" value={editProdStock} onChange={(e) => setEditProdStock(Number(e.target.value))} className="w-full border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none pl-8 font-bold text-[#5C4033]" /><Package className="w-4 h-4 absolute left-2.5 top-3 text-gray-400" /></div>
                </div>
                <div>
                  <label className="block text-xs text-[#1A1A1A] uppercase font-bold mb-1">Thuộc Danh Mục</label>
                  <select value={editProdCategory} onChange={(e) => setEditProdCategory(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none">
                    {categories.map(c => <option key={c.id} value={c.slug}>{c.categoryName}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-[#1A1A1A] uppercase font-bold mb-1">Chất Liệu Chính</label><input type="text" value={editProdMaterial} onChange={(e) => setEditProdMaterial(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:outline-none" /></div>
              </div>
              <div className="border-b border-[#EADBC8] pb-2 mt-6 mb-2"><h4 className="font-bold text-[#5C4033] uppercase text-xs flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> 2. Thông tin SEO</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div><label className="font-bold mb-1 block text-[#1A1A1A] uppercase">Meta Title (Tiêu đề SEO)</label><input type="text" value={editProdMetaTitle} onChange={e=>setEditProdMetaTitle(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" placeholder="Nhập tiêu đề hiển thị trên Google..." /></div>
                <div><label className="font-bold mb-1 block text-[#1A1A1A] uppercase">Meta Description (Mô tả SEO)</label><input type="text" value={editProdMetaDesc} onChange={e=>setEditProdMetaDesc(e.target.value)} className="w-full border border-[#EADBC8] p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" placeholder="Nhập mô tả ngắn gọn..." /></div>
              </div>
              <div className="pt-6 mt-6 flex justify-end gap-3 border-t border-[#EADBC8]">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-5 py-2.5 rounded-xl border border-[#EADBC8] text-gray-700 font-bold uppercase text-xs hover:bg-gray-100 transition-colors cursor-pointer">Hủy Bỏ</button>
                <button type="submit" disabled={isUploadingEditImage} className="px-6 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#4A3B32] text-white font-bold uppercase text-xs flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"><Save className="w-4 h-4 text-[#D4AF37]" /> Lưu Thay Đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}