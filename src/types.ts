export interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  rating: number;
  category: "phong-khach" | "phong-ngu" | "phong-an" | "van-phong";
  categoryName: string; // e.g., Phòng Khách, Phòng Ngủ, etc.
  style: "Modern" | "Luxury" | "Minimalist" | "Scandinavian";
  images: { url: string; variantId?: number | null }[]; // Ảnh gắn theo biến thể màu; variantId = null nghĩa là ảnh dùng chung
  description: string;
  longDescription?: string;
  material: string;
  dimensions: string;
  colors: string[];
  variants?: { id: number; color: string; stock: number }[]; // Danh sách biến thể (id + màu + tồn kho riêng) để đối chiếu ảnh & tồn kho theo variantId
  features: string[];
  warranty: string;
  stock: number;
  brand: string;
  reviews: Review[];
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  image: string;
  productIds: string[];
  price: number;
  discountPrice: number;
  roomSize: string; // e.g. "Từ 15m² - 25m²"
  roomType: string; // e.g. "Phòng khách", "Phòng ngủ"
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  selectedMaterial: string;
  assembleService: boolean;
}

export interface Order {
  
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  hasReturnRequest?: boolean;
  hasReview?: boolean;
  shippingAddress: {
  city: string;
  district: string;
  addressDetail: string;
  

  };
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    color: string;
    material: string;
    assembleService: boolean;
  }[];
  couponApplied?: string;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: "COD" | "BankTransfer" | "VNPAY" | "EWallet";
  status: "pending" | "confirmed" | "shipping" | "delivered" | "completed" | "cancelled";
  trackingSteps: {
    status: string;
    title: string;
    description: string;
    time: string;
  }[];
  paymentStatus: "Chưa thanh toán" | "Đã thanh toán";
  reviewsSubmitted?: boolean;
}

export interface ConsultationSchedule {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  roomArea: number; // m²
  roomType: string;
  style: string;
  budget: number; // VNĐ
  prefDate: string;
  prefTime: string;
  notes?: string;
  status: "pending" | "contacted" | "scheduled" | "completed";
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
}

export interface Coupon {
  code: string;
  discountType: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  description: string;
  isActive: boolean;
}

export interface ProductPrice {
  id: number;
  productId: number;
  variantId?: number;
  originalPrice: number;
  sellingPrice: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REJECTED';
  createdBy: number;
  approvedBy?: number;
  // Dữ liệu include thêm từ Backend để hiển thị UI
  variant?: {
    variantName: string;
    sku: string;
    currentPrice: number;
    product?: {
      productName: string;
    }
  };
}

export interface PriceHistory {
  id: number;
  productId: number;
  variantId?: number;
  oldPrice: number;
  newPrice: number;
  reason: string;
  changedBy: number;
  changedAt: string;
}