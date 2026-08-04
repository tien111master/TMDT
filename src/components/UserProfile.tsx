import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../api/api';
import { Order, Product } from "../types";
import { User, Phone, MapPin, ShoppingBag, Star, CheckCircle, RefreshCw, Sparkles, Ticket } from "lucide-react";
import { authApi, orderApi, promotionApi } from "../api/api";interface UserProfileProps {
  currentUser: { name: string; email: string; phone?: string } | null;
  onUpdatePersonalInfo: (name: string, email: string, phone?: string) => void;
  onCancelOrder?: (orderId: string) => void;
  orders: Order[];
  onAddReviewToProduct: (productId: string, rating: number, comment: string, author: string) => void;
}

export default function UserProfile({
  currentUser,
  onUpdatePersonalInfo,
  orders,
  onAddReviewToProduct,
  onCancelOrder
}: UserProfileProps) {
  
  // --- Trạng thái Sub-tab & Thông tin cá nhân ---
const [profileSubTab, setProfileSubTab] = useState<"info" | "orders" | "promotions">("orders");
const [editedName, setEditedName] = useState(currentUser?.name || "");
const [editedEmail, setEditedEmail] = useState(currentUser?.email || "");
const [phone, setPhone] = useState(currentUser?.phone || "");

// --- Trạng thái Sổ địa chỉ ---
const [addresses, setAddresses] = useState<any[]>([]);
const [loadingAddresses, setLoadingAddresses] = useState(false);
const [editingAddressId, setEditingAddressId] = useState<number | string | null>(null);
const [isSavingAddress, setIsSavingAddress] = useState(false);

const [addressForm, setAddressForm] = useState({
  receiverName: "",
  receiverPhone: "",
  fullAddress: "",
  isDefault: false,
});
// --- Trạng thái Mã giảm giá của tôi ---
const [myPromotions, setMyPromotions] = useState<any[]>([]);
const [loadingMyPromotions, setLoadingMyPromotions] = useState(false);
const [myPromotionMessage, setMyPromotionMessage] = useState("");
// --- Trạng thái Đánh giá ---
const [isSavedInfo, setIsSavedInfo] = useState(false);
const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
const [reviewingProductId, setReviewingProductId] = useState<string | null>(null);
const [newReviewRating, setNewReviewRating] = useState(5);
const [newReviewComment, setNewReviewComment] = useState("");
const [reviewedProductIds, setReviewedProductIds] = useState<string[]>([]);
const [reviewImage, setReviewImage] = useState<File | null>(null);
const [reviewImagePreview, setReviewImagePreview] = useState<string>("");
const [currentReviewImageUrl, setCurrentReviewImageUrl] = useState<string>("");

// --- Trạng thái Đơn hàng (Hủy, Hoàn, Chọn đơn) ---
const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
const [cancelReason, setCancelReason] = useState("");
const [returnReason, setReturnReason] = useState("");
const [selectedReason, setSelectedReason] = useState<string>(""); // Lưu lựa chọn từ radio
const [customReason, setCustomReason] = useState<string>("");     // Lưu nội dung từ textarea
const cancelReasons = [
    "Thay đổi thông tin đơn hàng",
    "Thay đổi địa chỉ nhận hàng",
    "Phí vận chuyển cao",
    "Thời gian giao hàng lâu",
    "Đặt nhầm/trùng đơn",
    "Không muốn mua nữa"
  ];
const [selectedReturnReason, setSelectedReturnReason] = useState<string>("");
const [customReturnReason, setCustomReturnReason] = useState<string>("");
const [returnRequestType, setReturnRequestType] = useState<"RETURN" | "WARRANTY">("RETURN");
const [returnImages, setReturnImages] = useState<File[]>([]);
const [returnImagePreviews, setReturnImagePreviews] = useState<string[]>([]);
const [returnImageError, setReturnImageError] = useState("");

const returnReasons = [
  "Sản phẩm bị lỗi hoặc hư hỏng",
  "Sản phẩm không đúng mô tả",
  "Giao sai sản phẩm",
  "Sản phẩm bị trầy xước khi nhận",
  "Thiếu phụ kiện / thiếu linh kiện",
  "Muốn yêu cầu bảo hành",
  "Lý do khác"
];
const [reviewedOrderIds, setReviewedOrderIds] = useState<string[]>([]);
const [isReviewEditMode, setIsReviewEditMode] = useState(false);
const [currentReviewCanEdit, setCurrentReviewCanEdit] = useState(true);
const [currentReviewProductId, setCurrentReviewProductId] = useState<string | null>(null);
useEffect(() => {
  const reviewedIds = orders
    .filter((order: any) => order.hasReview || order.HasReview)
    .map((order) => order.id);

  setReviewedOrderIds(reviewedIds);
}, [orders]);
const [returnRequestedOrderIds, setReturnRequestedOrderIds] = useState<string[]>([]);
useEffect(() => {
  const requestedIds = orders
    .filter((order: any) => order.hasReturnRequest || order.HasReturnRequest)
    .map((order) => order.id);

  setReturnRequestedOrderIds(requestedIds);
}, [orders]);
  // Đổ dữ liệu tài khoản khi currentUser thay đổi trạng thái đăng nhập
  useEffect(() => {
    if (currentUser) {
      setEditedName(currentUser.name);
      setEditedEmail(currentUser.email);
      setPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  const loadAddresses = async () => {
  if (!currentUser) return;

  try {
    setLoadingAddresses(true);

    const data = await authApi.getAddresses();

    const addressList =
      Array.isArray(data)
        ? data
        : data.items || data.Items || [];

    setAddresses(addressList);
  } catch (err) {
    console.error("Lỗi tải danh sách địa chỉ:", err);
  } finally {
    setLoadingAddresses(false);
  }
};

useEffect(() => {
  if (profileSubTab === "info" && currentUser) {
    loadAddresses();
  }
}, [profileSubTab, currentUser]);

const handleEditAddress = (addr: any) => {
  setEditingAddressId(addr.id ?? addr.Id);

  setAddressForm({
    receiverName: addr.receiverName ?? addr.ReceiverName ?? "",
    receiverPhone: addr.receiverPhone ?? addr.ReceiverPhone ?? "",
    fullAddress: addr.fullAddress ?? addr.FullAddress ?? "",
    isDefault: Boolean(addr.isDefault ?? addr.IsDefault ?? false),
  });
};

const handleCancelEditAddress = () => {
  setEditingAddressId(null);
  setAddressForm({
    receiverName: "",
    receiverPhone: "",
    fullAddress: "",
    isDefault: false,
  });
};

const handleSaveAddress = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!addressForm.receiverName.trim()) {
    alert("Vui lòng nhập tên người nhận.");
    return;
  }

  if (!addressForm.receiverPhone.trim()) {
    alert("Vui lòng nhập số điện thoại người nhận.");
    return;
  }

  if (!addressForm.fullAddress.trim()) {
    alert("Vui lòng nhập địa chỉ giao hàng.");
    return;
  }

  try {
    setIsSavingAddress(true);

    const payload = {
      receiverName: addressForm.receiverName.trim(),
      receiverPhone: addressForm.receiverPhone.trim(),
      fullAddress: addressForm.fullAddress.trim(),
      isDefault: addressForm.isDefault,
    };

    if (editingAddressId) {
      await authApi.updateAddress(editingAddressId, payload);
      alert("Đã cập nhật địa chỉ giao hàng.");
    } else {
      await authApi.createAddress(payload);
      alert("Đã thêm địa chỉ giao hàng mới.");
    }

    handleCancelEditAddress();
    await loadAddresses();
  } catch (err) {
    console.error("Lỗi lưu địa chỉ:", err);
    alert("Lưu địa chỉ thất bại. Vui lòng thử lại.");
  } finally {
    setIsSavingAddress(false);
  }
};
  const loadMyPromotions = async () => {
  if (!currentUser) return;

  try {
    setLoadingMyPromotions(true);
    setMyPromotionMessage("");

    const data = await promotionApi.getMyPromotions();

    const promotionList = Array.isArray(data) ? data : data.items || data.Items || [];

    setMyPromotions(promotionList);
  } catch (err: any) {
    console.error("Lỗi tải mã giảm giá của tôi:", err);
    setMyPromotionMessage(
      err.response?.data?.message || "Không tải được danh sách mã giảm giá của bạn."
    );
  } finally {
    setLoadingMyPromotions(false);
  }
};

useEffect(() => {
  if (profileSubTab === "promotions" && currentUser) {
    loadMyPromotions();
  }
}, [profileSubTab, currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <User className="w-16 h-16 text-[#8B7E74] mx-auto opacity-50" />
        <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">Khu Vực Thành Viên LuxeHome</h2>
        <p className="text-xs text-[#8B7E74] max-w-sm mx-auto">Vui lòng bấm nút 'Đăng Nhập' ở góc phải phía trên để kích hoạt xem đơn hàng, quản lý vận trình và ghi nhận sản phẩm yêu thích.</p>
      </div>
    );
  }

  const formattedPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const formatOrderDateTime = (rawDate: string) => {
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
  };

  const getOrderStatusText = (status: Order["status"]) => {
    if (status === "pending") return "Chờ xác nhận";
    if (status === "confirmed") return "Sẵn sàng xuất kho";
    if (status === "shipping") return "Xe đang giao";
    if (status === "delivered") return "Đã tới Showroom";
    if (status === "completed") return "Hoàn tất";
    return "Đã hủy";
  };
  const getReviewImageSrc = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
};

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.updateProfile({
        fullName: editedName,
        phone: phone
      });

      onUpdatePersonalInfo(editedName, editedEmail, phone); 
      
      setIsSavedInfo(true);
      setTimeout(() => setIsSavedInfo(false), 2000);
      alert("Đã cập nhật hồ sơ thành viên thành công! Dữ liệu đã đồng bộ sang phân hệ Admin.");
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ cá nhân:", err);
      alert("Cập nhật hồ sơ thất bại. Vui lòng thử lại.");
    }
  };

  const handleReviewSubmit = (productId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim()) return;

    onAddReviewToProduct(productId, newReviewRating, newReviewComment, currentUser.name);
    setReviewedProductIds([...reviewedProductIds, productId]);
    setReviewingProductId(null);
    setNewReviewComment("");
    setNewReviewRating(5);
    alert("Cảm ơn Quý khách đã gửi ý kiến phản hồi quý giá cho LuxeHome!");
  };

  
  const handleReturnImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);

  if (files.length > 5) {
    setReturnImageError("Chỉ được tải tối đa 5 ảnh.");
    e.target.value = "";
    return;
  }

  const invalidFile = files.find((file) => file.size > 5 * 1024 * 1024);

  if (invalidFile) {
    setReturnImageError("Mỗi ảnh hoàn hàng không được vượt quá 5MB.");
    e.target.value = "";
    return;
  }

  setReturnImages(files);
  setReturnImagePreviews(files.map((file) => URL.createObjectURL(file)));
  setReturnImageError("");
};

const clearReturnForm = () => {
  setIsReturnModalOpen(false);
  setSelectedReturnReason("");
  setCustomReturnReason("");
  setReturnImages([]);
  setReturnImagePreviews([]);
  setReturnImageError("");
  setReturnRequestType("RETURN");
};
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id="user-profile-layout">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column sidebar overview */}
        <div className="lg:col-span-4 bg-[#FAF6F0] rounded-2xl p-6 border border-[#EADBC8] h-fit space-y-6">
          <div className="text-center pb-6 border-b border-[#EADBC8]/70">
            <div className="w-20 h-20 rounded-full bg-[#EADBC8] text-[#5C4033] flex items-center justify-center font-bold text-3xl mx-auto border-2 border-[#D4AF37] shadow mb-3">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-serif text-lg font-bold text-[#1A1A1A]">{currentUser.name}</h2>
            <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-widest bg-white border border-[#EADBC8] px-2.5 py-1 rounded-full inline-block mt-2">
              Chương trình Luxe VIP Club
            </span>
          </div>

          <div className="space-y-1.5" id="profile-tabs-sidebar">
            {[
              { id: "orders", label: `Lịch sử đơn hàng (${orders.length})`, icon: ShoppingBag },
              { id: "promotions", label: `Mã giảm giá của tôi (${myPromotions.length})`, icon: Ticket },

              { id: "info", label: "Cài đặt & Sổ địa chỉ", icon: MapPin },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = profileSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setProfileSubTab(tab.id as any)}
                  className={`w-full text-left text-xs px-4 py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 ${
                    isActive
                      ? "bg-[#5C4033] text-white shadow-sm"
                      : "text-[#5C4033] bg-white border border-[#EADBC8]/50 hover:bg-[#FAF6F0]"
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#D4AF37]" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#EADBC8]/50 text-center">
            <p className="text-[10px] text-[#8B7E74] italic leading-normal">LuxeHome cam kết giữ trọn vẹn thông tin gia sản và thiết kế bản vẽ của quý khách không rò rỉ ra bên ngoài.</p>
          </div>
        </div>

        {/* Right column master workspace */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EADBC8] p-6 md:p-8 shadow-sm">
          {/* Subtab: Mã giảm giá của tôi */}
{profileSubTab === "promotions" && (
  <div className="space-y-6" id="profile-promotions-view">
    <div className="border-b border-[#EADBC8] pb-4">
      <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
        Mã Giảm Giá Của Tôi
      </h3>
      <p className="text-xs text-[#8B7E74]">
        Những mã ưu đãi quý khách đã lưu từ Trung tâm mã giảm giá LuxeHome.
      </p>
    </div>

    {myPromotionMessage && (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
        {myPromotionMessage}
      </div>
    )}

    <div className="rounded-2xl border border-[#EADBC8] bg-[#FAF6F0]/60 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-white border border-[#EADBC8] p-2">
          <Ticket className="w-5 h-5 text-[#D4AF37]" />
        </div>

        <div>
          <p className="text-sm font-bold text-[#5C4033]">
            Cách nhận thêm mã ưu đãi
          </p>
          <p className="text-xs text-[#8B7E74] mt-1">
            Vào menu <span className="font-bold text-[#5C4033]">Mã Giảm Giá</span> trên thanh điều hướng,
            chọn mã phù hợp và bấm <span className="font-bold">Lưu mã</span>.
          </p>
        </div>
      </div>
    </div>

    {loadingMyPromotions ? (
      <div className="text-sm text-[#8B7E74] italic">
        Đang tải mã giảm giá của bạn...
      </div>
    ) : myPromotions.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-[#EADBC8] bg-[#FAF6F0] p-10 text-center">
        <Ticket className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
        <p className="font-bold text-[#5C4033]">
          Bạn chưa lưu mã giảm giá nào.
        </p>
        <p className="text-xs text-[#8B7E74] mt-1">
          Hãy vào trang Mã Giảm Giá để lưu ưu đãi trước khi thanh toán.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {myPromotions.map((promo: any) => {
          const couponCode = promo.couponCode ?? promo.CouponCode ?? "";
          const promotionName = promo.promotionName ?? promo.PromotionName ?? "Ưu đãi LuxeHome";
          const promotionType = String(promo.promotionType ?? promo.PromotionType ?? "").toUpperCase();
          const discountValue = Number(promo.discountValue ?? promo.DiscountValue ?? 0);
          const minOrderAmount = Number(promo.minOrderAmount ?? promo.MinOrderAmount ?? 0);
          const isUsable = promo.isUsable ?? promo.IsUsable ?? true;
          const message = promo.message ?? promo.Message ?? "Đã lưu trong ví ưu đãi.";

          const getTitle = () => {
            if (promotionType === "PERCENT" || promotionType === "PERCENTAGE") {
              return `Giảm ${discountValue}%`;
            }

            if (promotionType === "FIXED" || promotionType === "AMOUNT") {
              return `Giảm ${formattedPrice(discountValue)}`;
            }

            if (promotionType === "FREESHIP" || promotionType === "FREE_SHIP") {
              return "Miễn phí vận chuyển";
            }

            if (promotionType === "INSTALLATION") {
              return "Hỗ trợ phí lắp ráp";
            }

            return "Ưu đãi LuxeHome";
          };

          return (
            <div
              key={couponCode}
              className="relative overflow-hidden rounded-2xl border border-[#EADBC8] bg-white p-5 shadow-sm"
            >
              <div className="absolute top-0 left-0 h-full w-1.5 bg-[#D4AF37]" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#8B7E74] font-bold">
                    Mã ưu đãi
                  </p>
                  <h4 className="font-serif text-xl font-black text-[#5C4033]">
                    {couponCode}
                  </h4>
                </div>

                <div className="rounded-full bg-[#FAF6F0] border border-[#EADBC8] p-2">
                  <Ticket className="w-5 h-5 text-[#D4AF37]" />
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-base font-black text-[#1A1A1A]">
                  {getTitle()}
                </p>
                <p className="text-xs text-[#8B7E74]">
                  {promotionName}
                </p>

                {minOrderAmount > 0 && (
                  <p className="text-xs text-[#5C4033] pt-1">
                    Đơn tối thiểu:{" "}
                    <span className="font-bold">{formattedPrice(minOrderAmount)}</span>
                  </p>
                )}
              </div>

              <div
                className={`mt-4 rounded-xl px-3 py-2 text-xs font-bold ${
                  isUsable
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {isUsable ? "Có thể sử dụng" : message}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
          {/* Subtab: Lịch sử đơn hàng */}
          {profileSubTab === "orders" && (
            <div className="space-y-8" id="profile-orders-view">
              <div className="border-b border-[#EADBC8] pb-4">
                <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">Hành Trình & Đơn Hàng Của Quý Khách</h3>
                <p className="text-xs text-[#8B7E74]">Xem lại thời gian chế tạo và bàn giao nội thất chuẩn chỉ độc bản.</p>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-6" id="orders-list-profile">
                  <div className="overflow-x-auto rounded-2xl border border-[#EADBC8]">
                    <table className="w-full min-w-[1050px] text-xs">
                      <thead className="bg-[#FAF6F0] text-[#5C4033] uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold">Mã đơn</th>
                          <th className="px-4 py-3 text-left font-bold">Đặt ngày</th>
                          <th className="px-4 py-3 text-left font-bold">Sản phẩm</th>
                          <th className="px-4 py-3 text-right font-bold">Giá trị</th>
                          <th className="px-4 py-3 text-center font-bold">Thanh toán</th>
                          <th className="px-4 py-3 text-center font-bold">Trạng thái</th>
                          <th className="px-4 py-3 text-center font-bold">Hủy</th>
                          <th className="px-4 py-3 text-center font-bold">Đánh giá</th>
                          <th className="px-4 py-3 text-center font-bold">Hoàn hàng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-t border-[#EADBC8]/70 align-top">
                            <td className="px-4 py-4 font-black text-[#5C4033] whitespace-nowrap">{order.id}</td>
                            <td className="px-4 py-4 text-[#8B7E74] whitespace-nowrap">{formatOrderDateTime(order.date)}</td>
                            <td className="px-4 py-4">
                              <div className="space-y-1.5 min-w-[260px]">
                                {order.items.map((item, index) => (
                                  <div key={`${order.id}-${index}`} className="rounded-lg border border-[#EADBC8]/50 bg-white px-2.5 py-2">
                                    <p className="font-bold text-[#1A1A1A]">
                                      {item.name} <span className="text-[#D4AF37]">x{item.quantity}</span>
                                    </p>
                                    <p className="text-[10px] text-[#8B7E74]">
                                      Màu sắc: {item.color || "N/A"} • Vật liệu: {item.material || "N/A"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right font-black text-[#D4AF37] whitespace-nowrap">
                              {formattedPrice(order.totalAmount)}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase ${
                                order.paymentStatus === "Đã thanh toán"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex bg-[#5C4033] text-white px-2 py-1 rounded text-[10px] uppercase font-bold whitespace-nowrap">
                                {getOrderStatusText(order.status)}
                              </span>
                            </td>
                            {/* Cột Hủy */}
<td className="px-4 py-4 text-center">
  {order.status?.toLowerCase() === "pending" ? (
    <button
      type="button"
      onClick={() => {
        setSelectedOrder(order);
        setIsCancelModalOpen(true);
      }}
      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold uppercase text-[10px] cursor-pointer"
    >
      Hủy đơn
    </button>
  ) : (
    <span className="text-[10px] text-[#8B7E74]">-</span>
  )}
</td>

{/* Cột Đánh giá */}
<td className="px-4 py-4 text-center">
  {reviewedOrderIds.includes(order.id) ||
  (order as any).hasReview ||
  (order as any).HasReview ? (
    <button
      type="button"
      onClick={async () => {
        try {
          setSelectedOrder(order);

          const review = await orderApi.getMyReview(order.id);

console.log("REVIEW DETAIL:", review);

const imageUrl = review.imageUrl ?? review.ImageUrl ?? "";

console.log("IMAGE URL:", imageUrl);
console.log("IMAGE SRC:", imageUrl ? getReviewImageSrc(imageUrl) : "");

setNewReviewRating(review.rating ?? review.Rating ?? 5);
setNewReviewComment(review.comment ?? review.Comment ?? "");
setCurrentReviewCanEdit(review.canEdit ?? review.CanEdit ?? false);
setCurrentReviewProductId(String(review.productId ?? review.ProductId ?? ""));

setCurrentReviewImageUrl(imageUrl);
setReviewImage(null);
setReviewImagePreview(imageUrl ? getReviewImageSrc(imageUrl) : "");

setIsReviewEditMode(true);
setIsReviewModalOpen(true);
        } catch (err: any) {
          console.error("Lỗi lấy đánh giá:", err);
          alert(err.response?.data?.message || "Không tải được đánh giá.");
        }
      }}
      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold uppercase text-[10px] cursor-pointer"
    >
      Xem/Sửa
    </button>
  ) : ["completed", "delivered"].includes(order.status?.toLowerCase()) ? (
    <button
      type="button"
      onClick={() => {
        setSelectedOrder(order);
setIsReviewEditMode(false);
setCurrentReviewCanEdit(true);
setCurrentReviewProductId(null);
setNewReviewRating(5);
setNewReviewComment("");

setReviewImage(null);
setReviewImagePreview("");
setCurrentReviewImageUrl("");

setIsReviewModalOpen(true);
      }}
      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 font-bold uppercase text-[10px] cursor-pointer"
    >
      Đánh giá
    </button>
  ) : (
    <span className="text-[10px] text-[#8B7E74]">-</span>
  )}
</td>

{/* Cột Hoàn hàng */}
<td className="px-4 py-4 text-center">
  {returnRequestedOrderIds.includes(order.id) ||
  (order as any).hasReturnRequest ||
  (order as any).HasReturnRequest ? (
    <span className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase text-[10px]">
      Đã gửi yêu cầu
    </span>
  ) : ["completed", "delivered"].includes(order.status?.toLowerCase()) ? (
    <button
      type="button"
      onClick={() => {
        setSelectedOrder(order);
        setIsReturnModalOpen(true);
      }}
      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold uppercase text-[10px] cursor-pointer"
    >
      Hoàn hàng
    </button>
  ) : (
    <span className="text-[10px] text-[#8B7E74]">-</span>
  )}
</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-[#D4AF37]">Trạng thái bám vận trình thực tế:</h4>
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div key={`timeline-${order.id}`} className="rounded-xl border border-[#EADBC8] bg-[#FAF6F0]/30 p-3">
                          <p className="text-[11px] font-bold text-[#5C4033] mb-2">Đơn {order.id}</p>
                          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                            {[
                              { step: "pending", label: "Tiếp Nhận" },
                              { step: "confirmed", label: "Chế Tác" },
                              { step: "shipping", label: "Vận Chuyển" },
                              { step: "completed", label: "Bàn Giao" }
                            ].map((s) => {
                              const statusOrder = ["pending", "confirmed", "shipping", "completed"];
                              const currentIdx = statusOrder.indexOf(order.status);
                              const thisIdx = statusOrder.indexOf(s.step);
                              const isDone = thisIdx <= currentIdx && order.status !== "cancelled";

                              return (
                                <div key={`${order.id}-${s.step}`} className="space-y-1">
                                  <div className={`h-1.5 rounded-full ${isDone ? "bg-[#D4AF37]" : "bg-gray-200"}`} />
                                  <span className={`font-bold transition-colors ${isDone ? "text-[#5C4033]" : "text-gray-400"}`}>
                                    {s.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center bg-[#FAF6F0] rounded-2xl border border-dashed border-[#EADBC8]">
                  <ShoppingBag className="w-10 h-10 text-[#8B7E74] mx-auto mb-3 opacity-50" />
                  <p className="text-xs text-[#8B7E74] italic">Anh/Chị chưa phát sinh đơn mua hàng trực tiếp nào.</p>
                </div>
              )}
            </div>
          )}


          {/* Subtab: Cài đặt tài khoản & Đổ danh sách Sổ địa chỉ thật */}
          {profileSubTab === "info" && (
            <div className="space-y-6" id="profile-info-view">
              <div className="border-b border-[#EADBC8] pb-4">
                <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">Hồ Sơ & Sổ Địa Chỉ Giao Hàng</h3>
                <p className="text-xs text-[#8B7E74]">Cập nhật thông tin nhận dữ liệu và quản lý các địa chỉ thợ mộc lắp ráp trực thuộc hệ thống LuxeHome.</p>
              </div>

              {/* Thông tin hồ sơ cơ bản */}
              <form onSubmit={handleSaveInfo} className="space-y-4 max-w-md text-xs border-b border-[#EADBC8] pb-6">
                <h4 className="font-serif text-sm font-bold text-[#5C4033]">1. Cập nhật hồ sơ thành viên</h4>
                <div>
                  <label className="block text-[10px] text-[#8B7E74] uppercase mb-1">Họ tên của Anh/Chị *</label>
                  <input type="text" required value={editedName} onChange={(e) => setEditedName(e.target.value)} className="w-full bg-[#FAF6F0] p-2.5 rounded-lg border border-[#EADBC8]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B7E74] uppercase mb-1">Email đăng ký VIP <span className="text-[9px] text-gray-400 italic">(Cố định hệ thống)</span></label>
                  <input type="email" disabled value={editedEmail} className="w-full bg-gray-100 text-gray-500 p-2.5 rounded-lg border border-[#EADBC8] cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B7E74] uppercase mb-1">Số điện thoại liên hệ *</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#FAF6F0] p-2.5 rounded-lg border border-[#EADBC8]" />
                </div>
                <button type="submit" className="px-6 py-2 rounded-lg bg-[#5C4033] hover:bg-[#4A3B32] text-white font-bold uppercase transition-colors flex items-center gap-2 cursor-pointer">
                  {isSavedInfo ? <CheckCircle className="w-4 h-4 text-[#D4AF37]" /> : <RefreshCw className="w-4 h-4" />}
                  {isSavedInfo ? "Đã lưu hồ sơ!" : "Lưu Thay Đổi Hồ Sơ"}
                </button>
              </form>

              {/* Danh sách Sổ địa chỉ */}{/* Sổ địa chỉ giao hàng */}
<div className="space-y-4 max-w-xl">
  <h4 className="font-serif text-sm font-bold text-[#5C4033] flex items-center gap-2">
    <MapPin className="w-4 h-4 text-[#D4AF37]" />
    2. Sổ địa chỉ giao hàng
  </h4>

  <form
    onSubmit={handleSaveAddress}
    className="space-y-3 rounded-xl border border-[#EADBC8] bg-[#FAF6F0]/50 p-4"
  >
    <div>
      <label className="block text-[10px] text-[#8B7E74] uppercase mb-1">
        Người nhận *
      </label>
      <input
        type="text"
        required
        value={addressForm.receiverName}
        onChange={(e) =>
          setAddressForm((prev) => ({
            ...prev,
            receiverName: e.target.value,
          }))
        }
        className="w-full bg-white p-2.5 rounded-lg border border-[#EADBC8] text-xs"
        placeholder="Ví dụ: Nguyễn Văn A"
      />
    </div>

    <div>
      <label className="block text-[10px] text-[#8B7E74] uppercase mb-1">
        Số điện thoại *
      </label>
      <input
        type="tel"
        required
        value={addressForm.receiverPhone}
        onChange={(e) =>
          setAddressForm((prev) => ({
            ...prev,
            receiverPhone: e.target.value,
          }))
        }
        className="w-full bg-white p-2.5 rounded-lg border border-[#EADBC8] text-xs"
        placeholder="Ví dụ: 0901234567"
      />
    </div>

    <div>
      <label className="block text-[10px] text-[#8B7E74] uppercase mb-1">
        Địa chỉ giao hàng *
      </label>
      <textarea
        required
        rows={3}
        value={addressForm.fullAddress}
        onChange={(e) =>
          setAddressForm((prev) => ({
            ...prev,
            fullAddress: e.target.value,
          }))
        }
        className="w-full bg-white p-2.5 rounded-lg border border-[#EADBC8] text-xs resize-none"
        placeholder="Ví dụ: 123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM"
      />
    </div>

    <label className="flex items-center gap-2 text-xs text-[#5C4033] font-semibold cursor-pointer">
      <input
        type="checkbox"
        checked={addressForm.isDefault}
        onChange={(e) =>
          setAddressForm((prev) => ({
            ...prev,
            isDefault: e.target.checked,
          }))
        }
      />
      Đặt làm địa chỉ mặc định
    </label>

    <div className="flex gap-2">
      <button
        type="submit"
        disabled={isSavingAddress}
        className="px-5 py-2 rounded-lg bg-[#5C4033] hover:bg-[#4A3B32] text-white font-bold uppercase text-xs transition-colors disabled:opacity-60"
      >
        {isSavingAddress
          ? "Đang lưu..."
          : editingAddressId
            ? "Cập nhật địa chỉ"
            : "Thêm địa chỉ"}
      </button>

      {editingAddressId && (
        <button
          type="button"
          onClick={handleCancelEditAddress}
          className="px-5 py-2 rounded-lg bg-white border border-[#EADBC8] text-[#5C4033] font-bold uppercase text-xs hover:bg-[#FAF6F0]"
        >
          Hủy sửa
        </button>
      )}
    </div>
  </form>

  {loadingAddresses ? (
    <p className="text-xs text-[#8B7E74] italic">
      Đang tải sổ địa chỉ nhận hàng từ database PostgreSQL...
    </p>
  ) : addresses.length > 0 ? (
    <div className="space-y-3">
      {addresses.map((addr: any) => {
        const addressId = addr.id ?? addr.Id;
        const receiverName = addr.receiverName ?? addr.ReceiverName ?? "Chưa cập nhật";
        const receiverPhone = addr.receiverPhone ?? addr.ReceiverPhone ?? "Chưa cập nhật";
        const fullAddress = addr.fullAddress ?? addr.FullAddress ?? "Chưa cập nhật";
        const isDefault = addr.isDefault ?? addr.IsDefault ?? false;

        return (
          <div
            key={addressId}
            className="p-4 bg-[#FAF6F0]/50 rounded-xl border border-[#EADBC8] text-xs flex justify-between gap-4 items-start"
          >
            <div className="space-y-1">
              <p className="font-bold text-[#1A1A1A]">
                Người nhận: {receiverName} ({receiverPhone})
              </p>

              <p className="text-[#5C4033]">
                Địa chỉ giao: {fullAddress}
              </p>

              {isDefault && (
                <span className="inline-block mt-1 text-[9px] uppercase font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Mặc định
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleEditAddress(addr)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-white text-[#5C4033] border border-[#EADBC8] hover:bg-[#F4EBE1] font-bold uppercase text-[10px]"
            >
              Sửa
            </button>
          </div>
        );
      })}
    </div>
  ) : (
    <p className="text-xs text-[#8B7E74] italic">
      Chưa có địa chỉ giao hàng. Hãy thêm địa chỉ đầu tiên.
    </p>
  )}
</div>
               
            </div>
          )}

        </div>
      </div>
      {/* Modal Hủy Đơn kết hợp */}
{isCancelModalOpen && selectedOrder && (
  <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
      <h3 className="font-bold text-lg mb-4 text-[#1A1A1A]">Hủy đơn hàng {selectedOrder.id}</h3>
      
      {/* 1. Phần danh sách Radio */}
      <div className="space-y-2 mb-4">
        {cancelReasons.map((reason) => (
          <label key={reason} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[#D4AF37]">
            <input 
              type="radio" 
              name="cancelReason" 
              value={reason}
              checked={selectedReason === reason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                // Nếu chọn mục khác, ta có thể clear customReason hoặc giữ lại tùy ý
              }}
            />
            {reason}
          </label>
        ))}
      </div>

      {/* 2. Phần TextArea cho trường hợp khác hoặc bổ sung */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 mb-2">Ghi chú thêm (nếu có):</p>
        <textarea 
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Nhập chi tiết tại đây..." 
          className="w-full h-20 border border-[#EADBC8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#D4AF37]"
        />
      </div>

      <button
  onClick={async () => {
    const finalReason = selectedReason
      ? `${selectedReason}${customReason ? " - " + customReason : ""}`
      : customReason;

    if (!finalReason.trim()) {
      alert("Vui lòng chọn hoặc nhập lý do hủy!");
      return;
    }

    try {
      await orderApi.cancelOrder(selectedOrder.id, { reason: finalReason });
      onCancelOrder?.(selectedOrder.id);

      alert("Đã hủy đơn hàng thành công!");
      setIsCancelModalOpen(false);
      setSelectedReason("");
      setCustomReason("");
    } catch (err: any) {
      console.error("Lỗi hủy đơn:", err);
      console.error("Backend response:", err.response?.data);

      alert(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Hủy đơn thất bại. Vui lòng kiểm tra lại API."
      );
    }
  }}
  className="w-full mt-4 py-2 bg-red-600 text-white rounded-lg font-bold uppercase text-xs hover:bg-red-700"
>
  Xác nhận Hủy
</button>
    </div>
  </div>
)}
{/* Modal Đánh giá */}
{isReviewModalOpen && selectedOrder && (
  <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
      <h3 className="font-bold text-lg mb-4 text-[#1A1A1A]">
  {isReviewEditMode ? "Xem / Sửa đánh giá" : "Đánh giá đơn hàng"} {selectedOrder.id}
</h3>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Số sao đánh giá:</p>
        <select
  value={newReviewRating}
  disabled={isReviewEditMode && !currentReviewCanEdit}
  onChange={(e) => setNewReviewRating(Number(e.target.value))}
  className="w-full border border-[#EADBC8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#D4AF37] disabled:bg-gray-100 disabled:text-gray-500"
>
          <option value={5}>5 sao - Rất hài lòng</option>
          <option value={4}>4 sao - Hài lòng</option>
          <option value={3}>3 sao - Bình thường</option>
          <option value={2}>2 sao - Chưa hài lòng</option>
          <option value={1}>1 sao - Không hài lòng</option>
        </select>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Nội dung đánh giá:</p>
        <textarea
  value={newReviewComment}
  disabled={isReviewEditMode && !currentReviewCanEdit}
  onChange={(e) => setNewReviewComment(e.target.value)}
  placeholder="Nhập cảm nhận của bạn về sản phẩm..."
  className="w-full h-24 border border-[#EADBC8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#D4AF37] disabled:bg-gray-100 disabled:text-gray-500"
/>
<div className="mt-4">
  <p className="text-xs text-gray-500 mb-2">Ảnh đánh giá sản phẩm:</p>

  <input
    type="file"
    accept="image/*"
    disabled={isReviewEditMode && !currentReviewCanEdit}
    onChange={(e) => {
      const file = e.target.files?.[0];

      if (!file) {
        setReviewImage(null);
        setReviewImagePreview(
          currentReviewImageUrl ? getReviewImageSrc(currentReviewImageUrl) : ""
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("Ảnh không được vượt quá 5MB.");
        e.target.value = "";
        return;
      }

      setReviewImage(file);
      setReviewImagePreview(URL.createObjectURL(file));
    }}
    className="w-full text-xs border border-[#EADBC8] rounded-xl p-2 disabled:bg-gray-100 disabled:text-gray-500"
  />

  {reviewImagePreview && (
    <div className="mt-3">
      <img
        src={reviewImagePreview}
        alt="Ảnh đánh giá"
        className="w-full max-h-48 object-cover rounded-xl border border-[#EADBC8]"
      />
    </div>
  )}
</div>
      </div>
      {isReviewEditMode && !currentReviewCanEdit && (
  <p className="mt-2 text-[11px] text-red-600 font-semibold">
    Đánh giá này đã quá thời hạn chỉnh sửa 7 ngày. Bạn chỉ có thể xem lại nội dung.
  </p>
)}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => {
            setIsReviewModalOpen(false);
setIsReviewEditMode(false);
setCurrentReviewCanEdit(true);
setCurrentReviewProductId(null);
setNewReviewComment("");
setNewReviewRating(5);

setReviewImage(null);
setReviewImagePreview("");
setCurrentReviewImageUrl("");
          }}
          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold uppercase text-xs hover:bg-gray-300"
        >
          Đóng
        </button>

        <button
  type="button"
  disabled={isReviewEditMode && !currentReviewCanEdit}
  onClick={async () => {
    if (!newReviewComment.trim()) {
      alert("Vui lòng nhập nội dung đánh giá!");
      return;
    }

    const firstItem: any = selectedOrder.items?.[0];

    const productId =
      currentReviewProductId ||
      firstItem?.productId ||
      firstItem?.id ||
      firstItem?.product?.id;

    if (!productId) {
      alert("Không tìm thấy sản phẩm trong đơn hàng để đánh giá!");
      return;
    }

    try {
      if (isReviewEditMode) {
        await orderApi.updateReview(selectedOrder.id, {
          productId: String(productId),
          rating: newReviewRating,
          comment: newReviewComment,
          image: reviewImage

        });

        alert("Đã cập nhật đánh giá thành công!");
      } else {
        await orderApi.addReview(selectedOrder.id, {
          productId: String(productId),
          rating: newReviewRating,
          comment: newReviewComment,
          image: reviewImage

        });

        setReviewedOrderIds((prev) =>
          prev.includes(selectedOrder.id) ? prev : [...prev, selectedOrder.id]
        );

        onAddReviewToProduct(
          String(productId),
          newReviewRating,
          newReviewComment,
          currentUser.name
        );

        alert("Đã gửi đánh giá thành công!");
      }
      setReviewImage(null);
      setReviewImagePreview("");
      setCurrentReviewImageUrl("");
      setIsReviewModalOpen(false);
      setIsReviewEditMode(false);
      setCurrentReviewCanEdit(true);
      setCurrentReviewProductId(null);
      setNewReviewComment("");
      setNewReviewRating(5);
    } catch (err: any) {
      console.error("Lỗi gửi/cập nhật đánh giá:", err);
      console.error("Backend response:", err.response?.data);

      alert(
        err.response?.data?.message ||
        "Thao tác đánh giá thất bại. Vui lòng kiểm tra API."
      );
    }
  }}
  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold uppercase text-xs hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
>
  {isReviewEditMode ? "Lưu chỉnh sửa" : "Gửi đánh giá"}
</button>
      </div>
    </div>
  </div>
)}
    {/* Modal Hoàn hàng / Bảo hành */}
{isReturnModalOpen && selectedOrder && (
  <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
      <h3 className="font-bold text-lg mb-4 text-[#1A1A1A]">
        Hoàn hàng / Bảo hành đơn {selectedOrder.id}
      </h3>
      {/* MỚI: Chọn loại yêu cầu */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Loại yêu cầu:</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReturnRequestType("RETURN")}
            className={`flex-1 py-2 rounded-lg font-bold uppercase text-xs ${
              returnRequestType === "RETURN" ? "bg-[#5C4033] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Đổi Trả
          </button>
          <button
            type="button"
            onClick={() => setReturnRequestType("WARRANTY")}
            className={`flex-1 py-2 rounded-lg font-bold uppercase text-xs ${
              returnRequestType === "WARRANTY" ? "bg-[#5C4033] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Bảo Hành
          </button>
        </div>
      </div>
      {/* 1. Danh sách lý do có sẵn */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-gray-500 mb-2">
          Chọn lý do hoàn hàng / bảo hành:
        </p>

        {returnReasons.map((reason) => (
          <label
            key={reason}
            className="flex items-center gap-2 text-sm cursor-pointer hover:text-[#D4AF37]"
          >
            <input
              type="radio"
              name="returnReason"
              value={reason}
              checked={selectedReturnReason === reason}
              onChange={(e) => setSelectedReturnReason(e.target.value)}
            />
            {reason}
          </label>
        ))}
      </div>

      {/* 2. Phần nhập lý do chi tiết */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 mb-2">
          Mô tả chi tiết thêm:
        </p>

        <textarea
          value={customReturnReason}
          onChange={(e) => setCustomReturnReason(e.target.value)}
          placeholder="Ví dụ: Sản phẩm bị trầy ở mặt bàn, thiếu ốc lắp ráp, giao sai màu..."
          className="w-full h-24 border border-[#EADBC8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#D4AF37]"
        />
        <div className="mt-4">
  <p className="text-xs text-gray-500 mb-2">
    Ảnh minh chứng hoàn hàng / bảo hành:
  </p>

  <input
    type="file"
    accept="image/*"
    multiple
    onChange={handleReturnImagesChange}
    className="w-full text-xs border border-[#EADBC8] rounded-xl p-2"
  />

  <p className="text-[11px] text-[#8B7E74] mt-1">
    Có thể tải tối đa 5 ảnh, mỗi ảnh không quá 5MB.
  </p>

  {returnImageError && (
    <p className="text-[11px] text-red-600 font-semibold mt-2">
      {returnImageError}
    </p>
  )}

  {returnImagePreviews.length > 0 && (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {returnImagePreviews.map((src, index) => (
        <img
          key={index}
          src={src}
          alt={`Ảnh hoàn hàng ${index + 1}`}
          className="w-full h-20 object-cover rounded-lg border border-[#EADBC8]"
        />
      ))}
    </div>
  )}
</div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={clearReturnForm}
          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold uppercase text-xs hover:bg-gray-300"
        >
          Đóng
        </button>

        <button
          type="button"
          onClick={async () => {
            const finalReturnReason = selectedReturnReason
              ? `${selectedReturnReason}${customReturnReason ? " - " + customReturnReason : ""}`
              : customReturnReason;

            if (!finalReturnReason.trim()) {
              alert("Vui lòng chọn hoặc nhập lý do hoàn hàng / bảo hành!");
              return;
            }

            try {
              await orderApi.requestReturnWarranty(selectedOrder.id, {
              requestType: returnRequestType,
              reason: finalReturnReason,
              description: customReturnReason,
              accountInfo: currentUser.email,
              images: returnImages,
            });
              setReturnRequestedOrderIds((prev) =>
              prev.includes(selectedOrder.id) ? prev : [...prev, selectedOrder.id]
            );

              alert("Đã gửi yêu cầu hoàn hàng / bảo hành thành công!");

              clearReturnForm();
            } catch (err: any) {
  console.error("Lỗi gửi yêu cầu hoàn hàng / bảo hành:", err);
  console.error("Backend response:", err.response?.data);

  alert(
    err.response?.data?.message ||
      err.response?.data?.detail ||
      "Gửi yêu cầu thất bại. Vui lòng kiểm tra lại API."
  );
}
          }}
          className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold uppercase text-xs hover:bg-red-700"
        >
          Gửi yêu cầu
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}