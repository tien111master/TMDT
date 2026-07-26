/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useState } from "react";
import { API_BASE_URL } from './api/api';
import Navbar from "./components/Navbar";
import HomeView from "./components/HomeView";
import CatalogView from "./components/CatalogView";
import ComboView from "./components/ComboView";
import DesignConsultation from "./components/DesignConsultation";
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";
import ProductDetailModal from "./components/ProductDetailModal";
import CartSidebar from "./components/CartSidebar";
import PromotionsPage from "./components/PromotionsPage";
import HomePromotions from "./components/HomePromotions";
const AuthModal = lazy(() => import("./components/AuthModal"));
import ChatbotWidget from "./components/ChatbotWidget";
import { useEffect } from "react";

// Types
import { Product, Combo, CartItem, Order, ConsultationSchedule, Coupon } from "./types";
import { orderApi } from "./api/api";

const extractOrderTimestamp = (rawOrderCode: string | undefined): Date | null => {
  if (!rawOrderCode) return null;

  const digitsOnly = rawOrderCode.replace(/\D/g, "");
  if (digitsOnly.length < 13) return null;

  // Nhiều orderCode có hậu tố random, chỉ lấy 13 số đầu tiên của epoch milliseconds
  const epochMillis = Number(digitsOnly.slice(0, 13));
  if (!Number.isFinite(epochMillis) || epochMillis <= 0) return null;

  const parsedDate = new Date(epochMillis);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const parseBackendOrderDate = (rawValue: unknown): Date | null => {
  if (typeof rawValue !== "string" || !rawValue.trim()) return null;

  const normalizedValue = rawValue.trim();
  const hasTimezone = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(normalizedValue);
  const looksLikeIso = /^\d{4}-\d{2}-\d{2}T/.test(normalizedValue);

  // Backend đang trả DateTime từ PostgreSQL "timestamp without time zone".
  // Vì dữ liệu được lưu theo UtcNow, chuỗi ISO không timezone cần được đọc là UTC.
  const parsed = new Date(looksLikeIso && !hasTimezone ? `${normalizedValue}Z` : normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Chuẩn hoá đơn hàng từ Backend (PostgreSQL) sang cấu trúc Order của Frontend
const mapBackendOrderToFrontend = (o: any): Order => {
  const statusMap: Record<string, Order["status"]> = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    SHIPPING: "shipping",
    DELIVERED: "delivered",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    PAYMENT_FAILED: "cancelled",
  };

  const code: string = o.orderCode || String(o.id);
  const confirmedAtDate = parseBackendOrderDate(o.confirmedAt);
  const orderCodeDate = extractOrderTimestamp(code);
  const dateObj =
    confirmedAtDate ?? orderCodeDate ?? new Date();

  return {
    id: code,
    date: dateObj.toISOString(),
    customerName: o.receiverName || "Khách hàng",
    customerPhone: o.receiverPhone || "",
    shippingAddress: { city: "", district: "", addressDetail: o.shippingAddress || "" },
    items: (o.items || []).map((i: any) => ({
      productId: String(i.productId),
      name: i.productName || "Sản phẩm",
      price: Number(i.sellingPrice ?? i.originalPrice ?? 0),
      quantity: i.quantity ?? 1,
      color: "",
      material: "",
      assembleService: false,
    })),
    couponApplied: o.couponCode || undefined,
    discountAmount: Number(o.discountAmount ?? 0),
    shippingFee: Number(o.shippingFee ?? 0),
    totalAmount: Number(o.finalAmount ?? 0),
    paymentMethod: "COD",
    status: statusMap[o.orderStatus] || "pending",
    trackingSteps: [],
    paymentStatus: o.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán",
    hasReturnRequest: o.hasReturnRequest ?? o.HasReturnRequest ?? false,
    hasReview: o.hasReview ?? o.HasReview ?? false,
  };
};

// Data
import {
  MOCK_PRODUCTS,
  MOCK_COMBOS,
  MOCK_BLOGS,
  MOCK_COUPONS,
  INITIAL_ORDERS,
  INITIAL_SCHEDULES,
} from "./mockData";

interface UserSession {
  id?: number | string | null;
  name: string;
  fullName?: string;
  email: string;
  role?: "user" | "admin";
  roleCode?: string;
  phone?: string;
  avatarUrl?: string;
  status?: string;
}

const canAccessAdminArea = (user: UserSession | null) => {
  const role = String(user?.role || "").toLowerCase();
  const roleCode = String(user?.roleCode || "").toLowerCase();

  return (
    role === "admin" ||
    roleCode === "admin" ||
    roleCode === "manager" ||
    roleCode === "sales_staff" ||
    roleCode === "warehouse_staff" ||
    roleCode === "shipper"
  );
};

export default function App() {
  const PRODUCT_PAGE_SIZE = 12;
  const CART_STORAGE_KEY = "luxehome_cart";
  // Navigation States
  const [activeTab, setActiveTab] = useState<string>("home");
  const [catalogFilters, setCatalogFilters] = useState<{ category?: string; style?: string }>({});

  // Core App State (With reactive local data syncs)
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>(MOCK_COMBOS);
  const [blogs, setBlogs] = useState(MOCK_BLOGS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [schedules, setSchedules] = useState<ConsultationSchedule[]>(INITIAL_SCHEDULES);
  const [coupons, setCoupons] = useState<Coupon[]>(MOCK_COUPONS);
  
  // Shopping Cart & Wishlist States
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!savedCart) return [];
      const parsedCart = JSON.parse(savedCart);
      return Array.isArray(parsedCart) ? parsedCart : [];
    } catch (error) {
      console.error("Lỗi đọc giỏ hàng từ localStorage:", error);
      return [];
    }
  });
  const [wishlist, setWishlist] = useState<string[]>(["prod-01", "prod-03"]);
  const [catalogCurrentPage, setCatalogCurrentPage] = useState<number>(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState<number>(1);
  const [catalogTotalItems, setCatalogTotalItems] = useState<number>(0);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
  const savedUser = sessionStorage.getItem("user");
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);

      return {
        id: parsed.id || parsed.Id || null,
        name:
          parsed.name ||
          parsed.fullName ||
          parsed.FullName ||
          parsed.email ||
          "Thành viên VIP",
        fullName:
          parsed.fullName ||
          parsed.FullName ||
          parsed.name ||
          "Thành viên VIP",
        email: parsed.email || parsed.Email || "",
        phone: parsed.phone || parsed.Phone || "",
        avatarUrl: parsed.avatarUrl || parsed.AvatarUrl || "",
        role: parsed.role === "admin" ? "admin" : "user",
        roleCode: parsed.roleCode || parsed.RoleCode || "CUSTOMER",
        status: parsed.status || parsed.Status || "Active",
      };
    } catch (err) {
      console.error("Lỗi đọc user từ storage:", err);
    }
  }

  const savedToken = sessionStorage.getItem("token");
const savedRole = sessionStorage.getItem("user_role");

  if (savedToken && savedRole) {
    const isAdmin =
      savedRole.toLowerCase() === "admin" ||
      savedRole.toLowerCase() === "manager";

    return {
      name: isAdmin ? "Nguyen Van Admin" : "Thành viên VIP",
      email: "",
      role: isAdmin ? "admin" : "user",
      roleCode: savedRole,
    };
  }

  return null;
});

  useEffect(() => {
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");

  if (!token || !currentUser) return;

  if (
  token === "FACEBOOK_LOGIN_TEMP_TOKEN" ||
  token === "GOOGLE_LOGIN_TEMP_TOKEN"
) {
  return;
}

  import("./api/api").then(({ authApi }) => {
    authApi
      .getProfile()
      .then((profileData) => {
        if (profileData) {
          const roleCode = profileData.roleCode || profileData.RoleCode || "CUSTOMER";

          const syncedUser: UserSession = {
            id: profileData.id || profileData.Id || currentUser.id,
            name:
              profileData.fullName ||
              profileData.FullName ||
              currentUser.name ||
              "Thành viên VIP",
            fullName:
              profileData.fullName ||
              profileData.FullName ||
              currentUser.fullName,
            email: profileData.email || profileData.Email || currentUser.email,
            role:
              roleCode.toLowerCase() === "admin" ||
              roleCode.toLowerCase() === "manager"
                ? "admin"
                : "user",
            roleCode,
            phone: profileData.phone || profileData.Phone || "",
            avatarUrl:
              profileData.avatarUrl ||
              profileData.AvatarUrl ||
              currentUser.avatarUrl ||
              "",
            status: profileData.status || profileData.Status || "Active",
          };

          setCurrentUser(syncedUser);
          sessionStorage.setItem("user", JSON.stringify(syncedUser));
          localStorage.setItem("user", JSON.stringify(syncedUser));
        }
      })
      .catch((err) => {
        console.error("Lỗi đồng bộ hồ sơ từ PostgreSQL:", err);
      });
  });
}, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/promotions`)
    .then(res => {
      if (!res.ok) throw new Error("Lỗi mạng khi lấy Coupons");
      return res.json();
    })
    .then(data => {
      if (data && data.length > 0) {
        setCoupons(data);
      }
    })
    .catch(err => console.error("Lỗi đồng bộ Coupons:", err));
  }, []);

  const mapBackendProductsToFrontend = useCallback((productList: any[]) => {
  const mappedProducts = productList.map((item: any) => {
    const variants = item.productVariants || item.ProductVariants || [];

    const mappedImages =
      item.productImages && item.productImages.length > 0
        ? item.productImages.map((img: any) => img.imageUrl)
        : ["https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800"];

    const currentPrice =
      variants.length > 0
        ? variants[0].currentPrice ?? variants[0].CurrentPrice
        : 15000000;

    const stock = Number(
      item.stock ??
      item.Stock ??
      item.totalStock ??
      item.TotalStock ??
      item.stockQuantity ??
      item.StockQuantity ??
      variants[0]?.stock ??
      variants[0]?.Stock ??
      variants[0]?.stockQuantity ??
      variants[0]?.StockQuantity ??
      variants[0]?.quantity ??
      variants[0]?.Quantity ??
      0
    );

    console.log("PRODUCT STOCK:", item.productName || item.ProductName, stock, item);

    return {
      id: item.id.toString(),
      name: item.productName || item.ProductName || "Sản phẩm chưa cập nhật",
      price: currentPrice,
      rating: item.averageRating || item.AverageRating || 5,
      category: item.category?.slug || item.Category?.Slug || "phong-khach",
      categoryName: item.category?.categoryName || item.Category?.CategoryName || "Phòng Khách",
      style: item.style || item.Style || "Modern",
      images: mappedImages,
      description: item.shortDescription || item.ShortDescription || "",
      longDescription: item.description || item.Description || "",
      material: item.material || item.Material || "Gỗ tự nhiên cao cấp",
      dimensions: "Kích thước tiêu chuẩn",
      colors: variants.map((v: any) => v.color || v.Color).filter(Boolean) || ["Mặc định"],
      features: ["Bảo hành LuxeHome"],
      warranty: `${item.warrantyMonths || item.WarrantyMonths || 12} tháng`,
      stock,
      brand: "LuxeHome",
      status: item.status || item.Status || "ACTIVE",
      reviews: []
    };
  });

  return mappedProducts.filter((p: any) => p.status !== "INACTIVE");
}, []);
  const fetchCatalogProducts = useCallback((page: number) => {
    setIsCatalogLoading(true);
    fetch(`${API_BASE_URL}/api/products?page=${page}&pageSize=${PRODUCT_PAGE_SIZE}`)
      .then(res => {
        if (!res.ok) throw new Error("Cổng API Backend từ chối kết nối");
        return res.json();
      })
      .then(data => {
        const productList = data.items || data.Items || data;
        const totalItemsFromApi = data.totalItems ?? data.TotalItems ?? data.totalCount ?? data.TotalCount;
        const totalPagesFromApi = data.totalPages ?? data.TotalPages;

        if (Array.isArray(productList)) {
          setProducts(mapBackendProductsToFrontend(productList));
          const computedTotalItems = typeof totalItemsFromApi === "number"
            ? totalItemsFromApi
            : productList.length;
          const computedTotalPages = typeof totalPagesFromApi === "number"
            ? totalPagesFromApi
            : Math.max(1, Math.ceil(computedTotalItems / PRODUCT_PAGE_SIZE));

          setCatalogTotalItems(computedTotalItems);
          setCatalogTotalPages(computedTotalPages);
          setCatalogCurrentPage(page);
        } else {
          setProducts([]);
          setCatalogTotalItems(0);
          setCatalogTotalPages(1);
          setCatalogCurrentPage(1);
        }
      })
      .catch(err => {
        console.error("❌ Lỗi API:", err);
        setProducts([]);
      })
      .finally(() => setIsCatalogLoading(false));
  }, [PRODUCT_PAGE_SIZE, mapBackendProductsToFrontend]);

  useEffect(() => {
    fetchCatalogProducts(1);
  }, [fetchCatalogProducts]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, CART_STORAGE_KEY]);


  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [placedOrderForEmail, setPlacedOrderForEmail] = useState<Order | null>(null);
  const [comparedProductIds, setComparedProductIds] = useState<string[]>([]);

  const handleNavigateToCatalogWithFilters = (filters: { category?: string; style?: string }) => {
    setCatalogFilters(filters);
    setCatalogCurrentPage(1);
    fetchCatalogProducts(1);
    setActiveTab("catalog");
  };

  const handleCloseAuth = useCallback(() => setIsAuthOpen(false), []);

  const handleLogin = useCallback((user: any) => {
    setCurrentUser({
      ...user,
      role: user.role === "admin" ? "admin" : "user",
      roleCode: user.roleCode || user.RoleCode || "CUSTOMER",
    });
    if (user.role === "admin") {
      setActiveTab("admin");
      alert(`Xin kính chào Quản Trị Viên: ${user.name}. Đã chuyển hướng vào Ban quản trị!`);
    } else {
      setActiveTab("home");
    }
  }, []);

  const handleLogout = () => {
  setCurrentUser(null);
  setCart([]);

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user_role");
  sessionStorage.removeItem("user");

  localStorage.removeItem("token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user");
  localStorage.removeItem(CART_STORAGE_KEY);

  setActiveTab("home");
};

  const handleAddToCart = (
  product: Product,
  quantity: number,
  color: string,
  assemble: boolean
) => {
  const stock = Number(product.stock ?? 0);
  const addQuantity = Math.max(1, quantity);

  if (stock <= 0) {
    alert("Sản phẩm này hiện đã hết hàng.");
    return;
  }

  setCart((prevCart) => {
    const existingIndex = prevCart.findIndex(
      (item) => item.product.id === product.id && item.selectedColor === color
    );

    // Tổng số lượng sản phẩm này hiện đang có trong giỏ
    const currentTotalQuantity = prevCart
      .filter((item) => item.product.id === product.id)
      .reduce((total, item) => total + item.quantity, 0);

    const nextTotalQuantity = currentTotalQuantity + addQuantity;

    if (nextTotalQuantity > stock) {
      alert(`Không thể thêm vượt quá tồn kho. Sản phẩm này chỉ còn ${stock} sản phẩm.`);
      return prevCart;
    }

    if (existingIndex > -1) {
      const updated = [...prevCart];

      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + addQuantity,
        assembleService: updated[existingIndex].assembleService || assemble,
      };

      return updated;
    }

    return [
      ...prevCart,
      {
        product,
        quantity: addQuantity,
        selectedColor: color,
        selectedMaterial: product.material.split(",")[0],
        assembleService: assemble,
      },
    ];
  });
};
  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
  const nextQuantity = Math.max(1, Number(quantity) || 1);
  let hasShownAlert = false;

  setCart((prevCart) =>
    prevCart.map((item) => {
      if (item.product.id !== productId) return item;

      const stock = Number(item.product.stock ?? 0);

      if (stock <= 0) {
        if (!hasShownAlert) {
          alert("Sản phẩm này hiện đã hết hàng.");
          hasShownAlert = true;
        }

        return item;
      }

      if (nextQuantity > stock) {
        if (!hasShownAlert) {
          alert(`Không thể chọn quá tồn kho. Sản phẩm này chỉ còn ${stock} sản phẩm.`);
          hasShownAlert = true;
        }

        return {
          ...item,
          quantity: stock,
        };
      }

      return {
        ...item,
        quantity: nextQuantity,
      };
    })
  );
};
  const handleRemoveCartItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleAddComboToCart = (combo: Combo, comboProducts: Product[]) => {
    comboProducts.forEach((p) => { handleAddToCart(p, 1, p.colors[0], false); });
    setIsCartOpen(true);
    alert(`Đã thêm trọn bộ ${combo.name} vào giỏ hàng thành công!`);
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlist((prev) => prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]);
  };

  const loadMyOrders = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;
    orderApi
      .getMyOrders()
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setOrders(data.map(mapBackendOrderToFrontend));
        }
      })
      .catch((err) => console.error("Lỗi tải đơn hàng từ Backend:", err));
  };

  useEffect(() => {
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath !== "/checkout/success") return;

    const orderId = new URLSearchParams(window.location.search).get("orderId");

    setCart([]);
    setIsCartOpen(false);
    setActiveTab("profile");
    loadMyOrders();

    alert(orderId
      ? `Thanh toán VNPay thành công. Mã đơn: ${orderId}`
      : "Thanh toán VNPay thành công.");

    window.history.replaceState({}, "", "/");
  }, []);

  // Tải đơn hàng thực tế của user ngay khi đăng nhập (thay cho mock INITIAL_ORDERS)
  useEffect(() => {
    if (currentUser?.id) {
      loadMyOrders();
    }
  }, [currentUser?.id]);

  const handleCheckoutSubmit = (newCreatedOrder: Order) => {
    setOrders((prev) => [newCreatedOrder, ...prev]);
    setCart([]);
    setIsCartOpen(false);
    setActiveTab("profile");
    setPlacedOrderForEmail(newCreatedOrder);
    // Đồng bộ lại danh sách đơn thực tế từ PostgreSQL
    loadMyOrders();
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order["status"]) => {
    const response = await orderApi.updateOrderStatus(orderId, status);
    const persistedStatus = String(response?.status || status).toLowerCase() as Order["status"];

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;

        const steps = [...ord.trackingSteps];
        let stepTitle = "Thay đổi trạng thái";
        let stepDesc = "Cập nhật tiến trình bởi LuxeHome Admin.";

        if (persistedStatus === "confirmed") {
          stepTitle = "Mộc sấy đóng bọc hoàn chỉnh";
          stepDesc = "Đơn hàng đã qua kiểm duyệt xốp dầy PVD mạ vàng.";
        } else if (persistedStatus === "shipping") {
          stepTitle = "Xe chuyên dùng đang lăn bánh";
          stepDesc = "LuxeHome điều phối tài xế chuyên nghiệp thợ mộc giao hàng.";
        } else if (persistedStatus === "completed") {
          stepTitle = "Hoàn tất bàn giao & Lắp ráp";
          stepDesc = "Gia chủ hài lòng nghiệm thu gỗ mộc đẹp 100%.";
        }

        steps.push({
          status: persistedStatus,
          title: stepTitle,
          description: stepDesc,
          time: new Date().toLocaleTimeString("vi-VN").substring(0, 5) + " Hôm nay",
        });

        return {
          ...ord,
          status: persistedStatus,
          trackingSteps: steps,
          paymentStatus: persistedStatus === "completed" ? ("Đã thanh toán" as const) : ord.paymentStatus,
        };
      })
    );
  };

  const handleAddProductToInventory = async (newProd: Product) => {
    try {
      const generateSlug = (text: string) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const payload = {
        productName: newProd.name,
        slug: generateSlug(newProd.name),
        categorySlug: newProd.category,
        shortDescription: newProd.description,
        description: newProd.longDescription,
        material: newProd.material,
        style: newProd.style,
        warrantyMonths: parseInt(newProd.warranty) || 12,
        brand: newProd.brand,
        status: "Active",
        images: newProd.images.map((imgUrl, index) => ({ imageUrl: imgUrl, isMain: index === 0, sortOrder: index })),
        variants: newProd.colors.map(color => ({ color: color, currentPrice: newProd.price, status: "Active" })),
        initialStock: newProd.stock
      };
  
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) throw new Error(`Lỗi Server: ${response.statusText}`);
      const createdProductFromDb = await response.json();
  
      const mappedNewProduct: Product = {
        id: createdProductFromDb.id.toString(),
        name: createdProductFromDb.productName,
        price: createdProductFromDb.productVariants?.[0]?.currentPrice || newProd.price,
        rating: 5,
        category: newProd.category,
        categoryName: newProd.categoryName,
        style: createdProductFromDb.style || newProd.style,
        images: createdProductFromDb.productImages?.map((img: any) => img.imageUrl) || newProd.images,
        description: createdProductFromDb.shortDescription || newProd.description,
        longDescription: createdProductFromDb.description || newProd.longDescription,
        material: createdProductFromDb.material || newProd.material,
        dimensions: newProd.dimensions,
        colors: createdProductFromDb.productVariants?.map((v: any) => v.color) || newProd.colors,
        features: newProd.features,
        warranty: `${createdProductFromDb.warrantyMonths} tháng`,
        stock: newProd.stock,
        brand: newProd.brand,
        reviews: []
      };
  
      setProducts((prev) => [mappedNewProduct, ...prev]);
      alert("Thêm sản phẩm mới vào danh mục kho LuxeHome thành công!");
    } catch (error) {
      console.error(error);
      alert("Thêm sản phẩm thất bại.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const isConfirmed = window.confirm("Anh/Chị có chắc chắn muốn ngừng kinh doanh sản phẩm này?");
    if (!isConfirmed) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Xóa sản phẩm thất bại.");
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      alert("Đã gỡ sản phẩm khỏi Showcase!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
  try {
    const payload: any = {
      productName: updatedProduct.name,
      categorySlug: updatedProduct.category,
      currentPrice: updatedProduct.price,
      stock: updatedProduct.stock,
      style: updatedProduct.style,
      material: updatedProduct.material,
      status: (updatedProduct as any).status || "ACTIVE",
      metaTitle: (updatedProduct as any).metaTitle || "",
      metaDescription: (updatedProduct as any).metaDescription || ""
    };

    if (updatedProduct.images && updatedProduct.images.length > 0) {
      payload.imageUrl = updatedProduct.images[0];
    }

    const response = await fetch(`${API_BASE_URL}/api/products/${updatedProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      throw new Error(errBody?.detail || errBody?.message || "Cập nhật sản phẩm thất bại trên Server.");
    }

    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    alert("Đã lưu thay đổi thông tin sản phẩm thành công!");
  } catch (error: any) {
    console.error(error);
    alert(`Đã xảy ra lỗi khi lưu chỉnh sửa: ${error.message}`);
  }
};

const handleUpdateProductStock = async (productId: string, newStock: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStock }), // 👑 SỬA: khớp với UpdateStockDto { NewStock }
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      throw new Error(errBody?.detail || errBody?.message || "Lỗi đồng bộ tồn kho.");
    }
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)));
  } catch (error: any) {
    console.error(error);
    alert(`Lỗi đồng bộ tồn kho: ${error.message}`);
  }
};

  const handleUpdateScheduleStatus = (scheduleId: string, status: ConsultationSchedule["status"]) => {
    setSchedules((prev) => prev.map((sch) => (sch.id === scheduleId ? { ...sch, status } : sch)));
  };

  const handleAddNewCoupon = (newCoupon: Coupon) => { setCoupons((prev) => [newCoupon, ...prev]); };
  const handleAddConsultationSchedule = (newSch: ConsultationSchedule) => { setSchedules((prev) => [newSch, ...prev]); };

  const handleAddReviewToProduct = (productId: string, rating: number, comment: string, author: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newReviewList = [
            { id: "rev-new-" + Math.random(), author, rating, comment, date: new Date().toISOString().substring(0, 10) },
            ...p.reviews,
          ];
          const sum = newReviewList.reduce((acc, r) => acc + r.rating, 0);
          const avg = Number((sum / newReviewList.length).toFixed(1));
          return { ...p, reviews: newReviewList, rating: avg };
        }
        return p;
      })
    );
  };
  const handleCancelOrder = (orderId: string) => {
  setOrders((prevOrders) =>
    prevOrders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status: "cancelled",
          }
        : order
    )
  );
};

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-between text-[#1A1A1A] font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "catalog") setCatalogFilters({});
          setActiveTab(tab);
        }}
        cart={cart}
        wishlist={wishlist}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16">
        {activeTab === "home" && (
  <>
    <HomeView
      products={products}
      combos={combos}
      blogs={blogs}
      onSelectProduct={(p) => setSelectedProductForDetail(p)}
      onSelectCombo={(c) => {
        const matchedItems = c.productIds
          .map((id) => products.find((p) => p.id === id))
          .filter((p): p is Product => !!p);

        handleAddComboToCart(c, matchedItems);
      }}
      onNavigateToCatalog={handleNavigateToCatalogWithFilters}
      onNavigateToDesign={() => setActiveTab("design")}
      onToggleWishlist={handleToggleWishlist}
      wishlist={wishlist}
    />

    <HomePromotions
      onOpenPromotionsPage={() => setActiveTab("promotions")}
    />
  </>
)}

        {activeTab === "catalog" && (
          <CatalogView
            products={products}
            currentPage={catalogCurrentPage}
            totalPages={catalogTotalPages}
            totalItems={catalogTotalItems}
            isLoading={isCatalogLoading}
            onPageChange={(page) => fetchCatalogProducts(page)}
            onSelectProduct={(p) => setSelectedProductForDetail(p)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
            initialCategory={catalogFilters.category}
            initialStyle={catalogFilters.style}
          />
        )}

        {activeTab === "combos" && (
          <ComboView combos={combos} products={products} onAddComboToCart={handleAddComboToCart} onSelectProduct={(p) => setSelectedProductForDetail(p)} />
        )}

        {activeTab === "design" && (
          <DesignConsultation products={products} combos={combos} onAddSchedule={handleAddConsultationSchedule} onSelectProduct={(p) => setSelectedProductForDetail(p)} />
        )}
        {activeTab === "promotions" && (
        <PromotionsPage
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      )}

        {(activeTab === "profile" || activeTab === "profile-wishlist") && (
          <UserProfile
            currentUser={currentUser}
            onUpdatePersonalInfo={(name, email, phone) => {
              if (currentUser) {
                setCurrentUser({ ...currentUser, name, email, phone: phone ?? currentUser.phone });
              }
            }}
            orders={orders}
            wishlist={wishlist}
            products={products}
            onSelectProduct={(p) => setSelectedProductForDetail(p)}
            onRemoveFromWishlist={handleToggleWishlist}
            onAddReviewToProduct={handleAddReviewToProduct}
            onCancelOrder={handleCancelOrder}

          />
        )}

        {activeTab === "admin" && (
          canAccessAdminArea(currentUser) ? (
            <AdminPanel
              products={products}
              orders={orders}
              schedules={schedules}
              coupons={coupons}
              blogs={blogs}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onUpdateProductStock={handleUpdateProductStock}
              onAddProduct={handleAddProductToInventory}
              onDeleteProduct={handleDeleteProduct}
              onEditProduct={handleEditProduct}
              onUpdateScheduleStatus={handleUpdateScheduleStatus}
              onAddCoupon={handleAddNewCoupon}
            />
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border-2 border-red-200">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">Truy Cập Bị Giới Hạn</h2>
              <p className="text-xs text-[#8B7E74] max-w-md mx-auto">Khu vực Quản trị dành riêng cho Ban quản lý LuxeHome.</p>
              <button onClick={() => setIsAuthOpen(true)} className="bg-[#5C4033] hover:bg-[#4A3B32] text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-colors">Đăng Nhập Admin</button>
            </div>
          )
        )}
      </main>

      <footer className="bg-[#1A1A1A] text-[#FAF6F0] border-t border-[#EADBC8]/25 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <span className="font-serif text-xl font-bold block">Luxe<span className="text-[#D4AF37] font-sans font-light">Home</span></span>
            <p className="text-[11px] text-[#8B7E74] leading-relaxed max-w-xs">Thương hiệu đồ mộc cao cấp Thượng Lưu.</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#D4AF37]">Thời Gian Showroom</h4>
            <ul className="text-[11px] text-[#8B7E74] space-y-1"><li>Thứ 2 - Chủ Nhật: 08:00 - 21:00</li></ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#D4AF37]">Uy Tín</h4>
            <ul className="text-[11px] text-[#8B7E74] space-y-1"><li>✓ Bảo hành khung mộc 10 năm</li></ul>
          </div>
          <div className="space-y-3">
            <span className="text-[10px] text-[#D4AF37] font-semibold block">® LuxeHome TMĐT All rights reserved.</span>
          </div>
        </div>
      </footer>

      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onAddToCart={handleAddToCart}
          onToggleCompare={(prod) => {
            if (comparedProductIds.includes(prod.id)) {
              setComparedProductIds(comparedProductIds.filter((id) => id !== prod.id));
            } else {
              if (comparedProductIds.length >= 3) { alert("Tối đa 3 sản phẩm."); return; }
              setComparedProductIds([...comparedProductIds, prod.id]);
            }
          }}
          isCompared={comparedProductIds.includes(selectedProductForDetail.id)}
          onToggleWishlist={handleToggleWishlist}
          isWishlisted={wishlist.includes(selectedProductForDetail.id)}
        />
      )}

      {isCartOpen && (
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveCartItem}
          onCheckout={handleCheckoutSubmit}
          currentUser={currentUser}
          onOpenAuth={() => { setIsCartOpen(false); setIsAuthOpen(true); }}
        />
      )}

      {isAuthOpen && (
        <Suspense fallback={null}>
          <AuthModal onClose={handleCloseAuth} onLogin={handleLogin} />
        </Suspense>
      )}
      <ChatbotWidget products={products} onSelectProduct={(p) => setSelectedProductForDetail(p)} />

      {placedOrderForEmail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-55 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-[#FAF6F0] w-full max-w-2xl rounded-2xl border-2 border-[#D4AF37] p-6 text-left">
            <h3 className="font-serif text-lg font-black text-[#1A1A1A] uppercase text-center">Xác Nhận Đơn Hàng Thành Công</h3>
            <p className="text-xs text-center text-[#8B7E74] mt-1">Mã đơn: {placedOrderForEmail.id}</p>
            <div className="mt-4 flex justify-end"><button onClick={() => setPlacedOrderForEmail(null)} className="px-6 py-2 bg-[#5C4033] text-white rounded-xl text-xs font-bold uppercase">Quay Lại Showroom</button></div>
          </div>
        </div>
      )}
    </div>
  );
}