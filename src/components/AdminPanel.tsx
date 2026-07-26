import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../api/api';
import { BarChart3, Package, ShoppingCart, Users, Tag, Layers, DollarSign, Truck, RotateCcw } from "lucide-react";
import { Product, Order, ConsultationSchedule, Coupon, BlogPost } from "../types";

// Import các Component con
import DashboardTab from "./admin/DashboardTab";
import ProductsTab from "./admin/ProductsTab";
import CategoriesTab from "./admin/CategoriesTab";
import PricingTab from "./admin/PricingTab";
import OrdersTab from "./admin/OrdersTab";
import CouponsTab from "./admin/CouponsTab";
import UsersTab from "./admin/UsersTab";
import ShipmentTab from "./admin/ShipmentTab";
import CustomersTab from "./admin/CustomersTab";
import ReturnWarrantyTab from "./admin/ReturnWarrantyTab";
import WarehouseShipmentTab from "./admin/WarehouseShipmentTab";

export interface Category {
  id: number;
  categoryName: string;
  slug: string;
  isVisible?: boolean;
}

interface AdminPanelProps {
  products: Product[]; 
  orders: Order[];
  schedules: ConsultationSchedule[];
  coupons: Coupon[];
  blogs: BlogPost[];
  onUpdateOrderStatus: (orderId: string, status: Order["status"]) => void;
  onUpdateProductStock: (productId: string, newStock: number) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onEditProduct: (product: Product) => void;
  onUpdateScheduleStatus: (scheduleId: string, status: ConsultationSchedule["status"]) => void;
  onAddCoupon: (coupon: Coupon) => void;
}

export default function AdminPanel(props: AdminPanelProps) {
  // 🔐 1. LẤY QUYỀN THỰC TẾ VÀ CHUẨN HÓA CHỮ THƯỜNG ĐỂ KHÔNG BỊ LỆCH
  const userJson = localStorage.getItem("user");
  const currentUser = userJson ? JSON.parse(userJson) : null;
  
  // Lấy chuỗi quyền thực tế từ role hoặc roleCode để hỗ trợ cả admin và nhân viên vận hành
  const rawRole = currentUser?.roleCode || currentUser?.role || "ADMIN"; 
  const currentRole = String(rawRole).toLowerCase().trim(); 

  // Định nghĩa tất cả các tab hệ thống có thể có
  const ALL_TABS = [
    { id: "dashboard", label: "Phân Tích", icon: BarChart3 },
    { id: "orders", label: "Đơn Hàng", icon: ShoppingCart },
    { id: "shipping", label: "Giao Hàng", icon: Truck },
    { id: "customers", label: "CSKH", icon: Users },
    { id: "returns", label: "Đổi Trả/BH", icon: RotateCcw },
    { id: "products", label: "Kho & Sản Phẩm", icon: Package },
    { id: "categories", label: "Danh Mục", icon: Layers },
    { id: "pricing", label: "Quản Lý Giá", icon: DollarSign },
    { id: "coupons", label: "Mã Ưu Đãi", icon: Tag },
    { id: "users", label: "Tài Khoản", icon: Users },
  ];

  // Kiểm tra nhanh nhóm chức vụ
  const isAdmin = currentRole === "admin" || currentRole === "quản trị viên";
  const isSales = currentRole === "sales_staff" || currentRole === "nhân viên bán hàng";
  const isWarehouse = currentRole === "warehouse_staff" || currentRole === "nhân viên kho";
  // MỚI: vai trò "Đơn vị vận chuyển" trong sơ đồ AD_Tạo yêu cầu giao hàng
  // role_code thực tế trong DB của bạn là "SHIPPER" (xem bảng roles), roleId = 6
  const roleId = Number(currentUser?.roleId || currentUser?.RoleId || 0);
  const isShipper = currentRole === "shipper" || currentRole === "đơn vị vận chuyển" || roleId === 6;

  // 🔐 2. BỘ LỌC CHẤP NHẬN CẢ TIẾNG ANH LẪN TIẾNG VIỆT THEO ĐÚNG SƠ ĐỒ
  const allowedTabs = ALL_TABS.filter((tab) => {
    if (isAdmin) return true; // Admin tối cao thấy hết
    if (isSales) return tab.id === "orders" || tab.id === "customers" || tab.id === "returns"; // Sales thấy Đơn Hàng + CSKH + Đổi trả
    if (isWarehouse) return tab.id === "orders" || tab.id === "products" || tab.id === "returns" || tab.id === "shipping"; // Kho thấy Đơn & Kho sản phẩm + Bảo hành
    if (isShipper) return tab.id === "shipping"; // Đơn vị vận chuyển chỉ thấy Giao Hàng
    return false;
  });

  // 🔐 3. ĐIỀU HƯỚNG TRANG KHI LOG IN ĐỂ TRÁNH LỖI TRẮNG TRANG
  const [activeSubTab, setActiveSubTab] = useState<string>(() => {
    if (isShipper) return "shipping";
    if (isSales || isWarehouse) return "orders";
    return "dashboard";
  });

  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch danh mục dùng chung cho ProductsTab và CategoriesTab
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Lỗi lấy danh mục:", err));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#EADBC8] pb-6 mb-8 gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-widest font-bold uppercase block mb-1">
            Bảng điều khiển hệ thống — Quyền đang nhận: <span className="text-[#5C4033] underline font-black uppercase">{rawRole}</span>
          </span>
          <h1 className="font-serif text-3xl font-black text-[#1A1A1A]">Quản Trị Viên LuxeHome</h1>
        </div>
      </div>

      {/* Menu Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-[#EADBC8] pb-4">
        {allowedTabs.map((sub) => {
          const Icon = sub.icon;
          return (
            <button 
              key={sub.id} 
              onClick={() => setActiveSubTab(sub.id)} 
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase border transition-all ${activeSubTab === sub.id ? "bg-[#5C4033] text-white" : "bg-white text-[#5C4033] border-[#EADBC8] hover:bg-[#FAF6F0]"}`}
            >
              <Icon className="w-4 h-4" /> {sub.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Component Rendering */}
      <div className="bg-white rounded-2xl border border-[#EADBC8] p-6 md:p-8">
        {activeSubTab === "dashboard" && isAdmin && (
        <DashboardTab />
        )}
        {activeSubTab === "pricing" && isAdmin && (
          <PricingTab />
        )}
        {activeSubTab === "products" && (isAdmin || isWarehouse) && (
          <ProductsTab categories={categories} {...props} />
        )}
        {activeSubTab === "categories" && isAdmin && (
          <CategoriesTab categories={categories} setCategories={setCategories} />
        )}
        {activeSubTab === "orders" && (isAdmin || isSales || isWarehouse) && (
          <OrdersTab orders={props.orders} onUpdateOrderStatus={props.onUpdateOrderStatus} />
        )}
        {/* Tab Giao Hàng: Kho tạo yêu cầu, Shipper xử lý giao (Admin thấy cả 2 để giám sát) */}
        {activeSubTab === "shipping" && (isAdmin || isWarehouse) && (
          <WarehouseShipmentTab />
        )}
        {activeSubTab === "shipping" && (isAdmin || isShipper) && (
          <ShipmentTab />
        )}
        {/* MỚI: Tab CSKH cho Sales (và Admin để giám sát) */}
        {activeSubTab === "customers" && (isAdmin || isSales) && (
          <CustomersTab />
        )}
        {/* MỚI: Tab Đổi Trả/Bảo Hành cho Sales + Kho (và Admin để giám sát) */}
        {activeSubTab === "returns" && (isAdmin || isSales || isWarehouse) && (
          <ReturnWarrantyTab />
        )}
        {activeSubTab === "coupons" && isAdmin && (
        <CouponsTab />
        )}
        {activeSubTab === "users" && isAdmin && (
          <UsersTab />
        )}
      </div>
    </div>
  );
}