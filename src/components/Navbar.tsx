import React from "react";
import { ShoppingBag, User, ShieldAlert, Sparkles, Compass, Layers, Ticket } from "lucide-react";
import { CartItem } from "../types";
import CustomerChatWidget from "../components/CustomerChatWidget";
interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cart: CartItem[];
  currentUser: {
    id?: string | number | null;
    name: string;
    email: string;
    role?: string;
    roleCode?: string;
  } | null;
  onOpenAuth: () => void;
  onOpenCart: () => void;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  cart,
  currentUser,
  onOpenAuth,
  onOpenCart,
  onLogout,
}: NavbarProps) {
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentRole = (currentUser?.roleCode || currentUser?.role || "").toLowerCase();
  const isStaffRole =
    currentRole === "sales_staff" ||
    currentRole === "warehouse_staff" ||
    currentRole === "shipper" ||
    currentRole === "nhân viên bán hàng" ||
    currentRole === "nhân viên kho" ||
    currentRole === "đơn vị vận chuyển" ||
    currentRole === "giao hàng";
  const canAccessAdminPanel =
    currentRole === "admin" ||
    currentRole === "manager" ||
    currentRole === "quản trị viên" ||
    isStaffRole;
  const adminButtonLabel = isStaffRole ? "Nhân viên" : "Quản trị admin";

  return (
    <nav className="sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#EADBC8] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center gap-2">
          
          {/* Logo Brand */}
          <div 
            onClick={() => setActiveTab("home")} 
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group shrink-0"
            id="brand-logo"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#5C4033] to-[#D4AF37] flex items-center justify-center text-white font-serif font-black text-lg sm:text-xl shadow-md transition-transform group-hover:scale-105">
              L
            </div>
            <div>
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] whitespace-nowrap">
                Luxe<span className="text-[#D4AF37] font-sans font-light">Home</span>
              </span>
              <p className="text-[9px] uppercase tracking-widest text-[#8B7E74] -mt-1 font-semibold">Luxury Furniture</p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex flex-1 items-center justify-between gap-1 mx-2 xl:mx-3 min-w-0 flex-nowrap 2xl:flex-none 2xl:justify-center 2xl:gap-1 2xl:mx-0" id="nav-links">
            {[
               { id: "home", label: "Trang Chủ", icon: Compass },
                { id: "promotions", label: "Mã Giảm Giá", icon: Ticket },
                { id: "catalog", label: "Sản phẩm", icon: ShoppingBag },
                { id: "combos", label: "Combo Nội Thất", icon: Layers },
                { id: "design", label: "Tư Vấn Thiết Kế", icon: Sparkles },
            ].map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`flex flex-col 2xl:flex-row items-center justify-center gap-0.5 2xl:gap-1 px-2 md:flex-1 min-w-[70px] xl:min-w-[84px] 2xl:flex-none 2xl:px-4 py-1.5 2xl:py-2 rounded-xl 2xl:rounded-full text-[10px] xl:text-[11px] 2xl:text-sm font-medium leading-tight whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? "bg-[#5C4033] text-white shadow-sm"
                      : "text-[#4A3B32] hover:bg-[#F4EBE1] hover:text-[#5C4033]"
                  }`}
                  id={`nav-link-${link.id}`}
                >
                  <Icon className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                  <span className="text-center">{link.label}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary Controls: Wishlist, Cart, Profile, Admin */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 xl:gap-3 shrink-0" id="navbar-controls">
            {currentUser && (
            <CustomerChatWidget currentUser={currentUser} />
            )}
            
            {/* Admin trigger button with premium look - ONLY shown to logged-in administrators */}
            {currentUser && canAccessAdminPanel && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wide sm:tracking-wider whitespace-nowrap shrink-0 border transition-all duration-300 ${
                  activeTab === "admin"
                    ? "bg-[#D4AF37] text-white border-[#D4AF37] shadow-sm"
                    : "bg-white text-[#D4AF37] border-[#D4AF37]/40 hover:bg-[#FAF6F0]"
                }`}
                id="btn-admin-panel"
              >
                <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{adminButtonLabel}</span>
              </button>
            )}


            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-[#F4EBE1] text-[#4A3B32] transition-colors shrink-0"
              title="Giỏ hàng"
              id="btn-cart-toggle"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#D4AF37] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#FAF6F0] animate-bounce">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Profile Section */}
            <div className="h-6 w-[1px] bg-[#EADBC8] self-center"></div>

            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2" id="user-info-section">
                <div 
                  onClick={() => setActiveTab("profile")}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-[#EADBC8] text-[#5C4033] flex items-center justify-center font-bold text-sm shadow-sm border border-[#5C4033]/20">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden 2xl:block text-left">
                    <p className="text-xs font-semibold text-[#1A1A1A] leading-tight max-w-[100px] truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-[#8B7E74]">Đơn hàng của tôi</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="text-[11px] sm:text-xs text-red-600 hover:underline ml-0.5 sm:ml-1 font-medium whitespace-nowrap shrink-0"
                  id="btn-logout"
                >
                  Thoát
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5C4033] hover:bg-[#4A3B32] text-white text-xs font-semibold tracking-wider uppercase transition-colors shadow-sm"
                id="btn-login-open"
              >
                <User className="w-3.5 h-3.5" />
                Đăng Nhập
              </button>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}
