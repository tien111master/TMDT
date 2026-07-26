import axios from 'axios';

const toPascalCase = (obj: any): any => {
  if (obj === undefined || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toPascalCase);
  } else if (obj.constructor === Object) {
    return Object.keys(obj).reduce((result: any, key: string) => {
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
      result[pascalKey] = toPascalCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5200';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use((config) => {
  if (config.data && !(config.data instanceof FormData)) {
    config.data = toPascalCase(config.data);
  }

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const orderApi = {
  // Gửi thông tin đơn hàng lên Backend
  createOrder: async (data: {
    receiverName: string;
    receiverPhone: string;
    shippingAddress: string;
    customerNote?: string;
    couponCode?: string | null;
    paymentMethod: string;
    items: { productId: number; variantId: number; quantity: number }[];
  }) => {
    const response = await api.post('/api/orders', data);
    return response.data;
  },

  // Lấy danh sách đơn hàng của user đang đăng nhập
  getMyOrders: async () => {
    const response = await api.get('/api/orders/my-orders');
    return response.data;
  },

  // Cập nhật trạng thái đơn hàng ở backend
  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await api.put(`/api/Orders/${orderId}/status`, { status });
    return response.data;
  },

  // === Admin/Sales/Kho: luồng vòng đời đơn hàng ===
  getAllOrdersAdmin: async () => {
    const response = await api.get('/api/Orders/admin-all');
    return response.data;
  },
  confirmOrder: async (orderId: string) => {
    const response = await api.put(`/api/Orders/${orderId}/confirm`);
    return response.data;
  },
  approveOrder: async (orderId: string) => {
    const response = await api.put(`/api/Orders/${orderId}/approve`);
    return response.data;
  },
  warehousePrepareOrder: async (orderId: string) => {
    const response = await api.put(`/api/Orders/${orderId}/warehouse-prepare`);
    return response.data;
  },
  cancelOrderAdmin: async (orderId: string, reason: string) => {
    const response = await api.put(`/api/Orders/${orderId}/cancel-admin`, { reason });
    return response.data;
  },
  processReturn: async (orderId: string, isValidReturn: boolean, reason?: string) => {
    const response = await api.put(`/api/Orders/${orderId}/process-return`, {
      isValidReturn,
      reason,
    });
    return response.data;
  },

  // === Khách hàng: hủy đơn / trả hàng-bảo hành / đánh giá ===
  cancelOrder: async (orderId: string, data: { reason: string }) => {
    const response = await api.post(`/api/orders/${orderId}/cancel`, data);
    return response.data;
  },

  requestReturnWarranty: async (
    orderId: string,
    data: {
      requestType?: "RETURN" | "WARRANTY";
      reason: string;
      accountInfo?: string;
      description?: string;
      images?: File[];
    }
  ) => {
    const formData = new FormData();
    formData.append("RequestType", data.requestType || "RETURN");
    formData.append("Reason", data.reason);
    formData.append("AccountInfo", data.accountInfo || "");
    formData.append("Description", data.description || "");

    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        formData.append("Images", file);
      });
    }

    const response = await api.post(`/api/orders/${orderId}/return`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  requestReturn: async (
    orderId: string,
    data: {
      reason: string;
      accountInfo?: string;
      description?: string;
      images?: File[];
    }
  ) => {
    const formData = new FormData();
    formData.append("Reason", data.reason);
    formData.append("AccountInfo", data.accountInfo || "");
    if (data.description) formData.append("Description", data.description);
    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        formData.append("Images", file);
      });
    }
    const response = await api.post(`/api/orders/${orderId}/return`, formData);
    return response.data;
  },

  getMyReview: async (orderId: string) => {
    const response = await api.get(`/api/orders/${orderId}/review`);
    return response.data;
  },

  updateReview: async (
    orderId: string,
    data: { productId: string; rating: number; comment: string; image?: File | null }
  ) => {
    const formData = new FormData();
    formData.append("ProductId", data.productId);
    formData.append("Rating", String(data.rating));
    formData.append("Comment", data.comment);
    if (data.image) formData.append("image", data.image);
    const response = await api.put(`/api/orders/${orderId}/review`, formData);
    return response.data;
  },

  addReview: async (
    orderId: string,
    data: { productId: string; rating: number; comment: string; image?: File | null }
  ) => {
    const formData = new FormData();
    formData.append("ProductId", data.productId);
    formData.append("Rating", String(data.rating));
    formData.append("Comment", data.comment);
    if (data.image) formData.append("image", data.image);
    const response = await api.post(`/api/orders/${orderId}/review`, formData);
    return response.data;
  },
};

// ==========================================================================
// Shipment API
// ==========================================================================
export const shipmentApi = {
  getOrdersToDeliver: async () => {
    const response = await api.get('/api/Shipments/orders-to-deliver');
    return response.data;
  },
  createShipment: async (orderId: number, carrierName: string) => {
    const response = await api.post(`/api/Shipments/${orderId}/create`, { carrierName });
    return response.data;
  },
  getShipmentsByOrder: async (orderId: number) => {
    const response = await api.get(`/api/Shipments/order/${orderId}`);
    return response.data;
  },
  getPendingShipments: async () => {
    const response = await api.get('/api/Shipments/pending');
    return response.data;
  },
  receiveShipment: async (shipmentId: number) => {
    const response = await api.put(`/api/Shipments/${shipmentId}/receive`);
    return response.data;
  },
  updateTrackingCode: async (shipmentId: number, trackingCode: string) => {
    const response = await api.put(`/api/Shipments/${shipmentId}/tracking-code`, { trackingCode });
    return response.data;
  },
  recordDeliveryResult: async (shipmentId: number, success: boolean, failReason?: string) => {
    const response = await api.put(`/api/Shipments/${shipmentId}/delivery-result`, {
      success,
      failReason,
    });
    return response.data;
  },
};

export const authApi = {
  login: async (data: any) => {
    const response = await api.post('/api/user/login', data);
    return response.data;
  },
  register: async (data: any) => {
    const response = await api.post('/api/user/register', data);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/api/user/profile');
    return response.data;
  },
  getAddresses: async () => {
    const response = await api.get("/api/user/addresses");
    return response.data;
  },
  createAddress: async (data: {
    receiverName: string;
    receiverPhone: string;
    fullAddress: string;
    isDefault: boolean;
  }) => {
    const response = await api.post("/api/user/addresses", data);
    return response.data;
  },
  updateAddress: async (
    id: number | string,
    data: {
      receiverName: string;
      receiverPhone: string;
      fullAddress: string;
      isDefault: boolean;
    }
  ) => {
    const response = await api.put(`/api/user/addresses/${id}`, data);
    return response.data;
  },
  updateProfile: async (data: { fullName: string; phone: string }) => {
    const response = await api.put('/api/user/profile', data);
    return response.data;
  },
  facebookLogin: async (data: { token: string }) => {
    const response = await api.post('/api/user/facebook-login', data);
    return response.data;
  },
  googleLogin: async (data: { token: string }) => {
    const response = await api.post('/api/user/google-login', data);
    return response.data;
  },
};

export const promotionApi = {
  // === Admin: quản lý chương trình khuyến mãi (sơ đồ AD_Tạo chương trình khuyến mãi) ===
  getAllAdmin: async () => {
    const response = await api.get('/api/Promotions/admin-all');
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/Promotions', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/Promotions/${id}`, data);
    return response.data;
  },
  end: async (id: number) => {
    const response = await api.put(`/api/Promotions/${id}/end`);
    return response.data;
  },
  toggleVisibility: async (id: number, isHidden: boolean) => {
    const response = await api.put(`/api/Promotions/${id}/visibility`, { isHidden });
    return response.data;
  },

  // === Khách hàng: xem/áp dụng/lưu mã ===
  getAvailablePromotions: async () => {
    const response = await api.get("/api/promotions/available");
    return response.data;
  },
  getPromotions: async () => {
    const response = await api.get("/api/promotions");
    return response.data;
  },
  applyPromotion: async (data: {
    couponCode: string;
    subtotalAmount: number;
    shippingFee: number;
    installationFee: number;
  }) => {
    const response = await api.post("/api/promotions/apply", data);
    return response.data;
  },
  savePromotion: async (data: { couponCode: string }) => {
    const response = await api.post("/api/promotions/save", data);
    return response.data;
  },
  getMyPromotions: async (params?: {
    subtotalAmount?: number;
    shippingFee?: number;
    installationFee?: number;
  }) => {
    const response = await api.get("/api/promotions/my", { params });
    return response.data;
  },
};

export const productSearchApi = {
  search: async (query: string) => {
    const response = await api.get(`/api/products`, {
      params: {
        page: 1,
        pageSize: 10,
        search: query,
      },
    });
    return response.data;
  },
};

// ==========================================================================
// THÊM ĐOẠN NÀY VÀO FILE src/api/api.ts HIỆN CÓ CỦA BẠN
// (đặt ngay sau khối `export const shipmentApi = { ... };` hoặc `orderApi`)
// ==========================================================================

export const customerApi = {
  // "Xem danh sách khách hàng"
  getCustomers: async () => {
    const response = await api.get('/api/Customers');
    return response.data;
  },

  // "Xem chi tiết khách hàng"
  getCustomerDetail: async (customerId: number) => {
    const response = await api.get(`/api/Customers/${customerId}`);
    return response.data;
  },

  // "Xem lịch sử mua hàng"
  getCustomerOrders: async (customerId: number) => {
    const response = await api.get(`/api/Customers/${customerId}/orders`);
    return response.data;
  },

  // "Theo dõi phản hồi khách hàng" — lấy toàn bộ nhật ký chăm sóc
  getCareLogs: async (customerId: number) => {
    const response = await api.get(`/api/Customers/${customerId}/care-logs`);
    return response.data;
  },

  // "Ghi chú nhu cầu" + "Gửi thông báo chăm sóc khách hàng"
  createCareLog: async (customerId: number, data: { needNote?: string; careType: string; careMessage: string }) => {
    const response = await api.post(`/api/Customers/${customerId}/care-logs`, data);
    return response.data;
  },

  // Nhánh "Có phản hồi" -> "Cập nhật kết quả chăm sóc"
  updateCareResponse: async (careLogId: number, responseResult: string) => {
    const response = await api.put(`/api/Customers/care-logs/${careLogId}/response`, { responseResult });
    return response.data;
  },

  // Nhánh "Không phản hồi" -> "Đánh dấu chờ phản hồi / lên lịch chăm sóc lại"
  scheduleFollowUp: async (careLogId: number, nextFollowUpAt?: string | null) => {
    const response = await api.put(`/api/Customers/care-logs/${careLogId}/schedule`, { nextFollowUpAt });
    return response.data;
  },
};

export const returnWarrantyApi = {
  // NHÂN VIÊN (Sales/Kho/Admin) — xem danh sách yêu cầu (backend tự lọc theo role)
  getRequests: async () => {
    const response = await api.get('/api/ReturnWarranty');
    return response.data;
  },
  getRequestDetail: async (id: number) => {
    const response = await api.get(`/api/ReturnWarranty/${id}`);
    return response.data;
  },
  acceptRequest: async (id: number) => {
    const response = await api.put(`/api/ReturnWarranty/${id}/accept`);
    return response.data;
  },
  rejectRequest: async (id: number, resultNote: string) => {
    const response = await api.put(`/api/ReturnWarranty/${id}/reject`, { resultNote });
    return response.data;
  },
  completeRequest: async (
    id: number,
    data?: { resultNote?: string; exchangeVariantId?: number; exchangeProductId?: number; exchangeQuantity?: number }
  ) => {
    const response = await api.put(`/api/ReturnWarranty/${id}/complete`, data || {});
    return response.data;
  },
};

export const reportApi = {
  getReport: async (params: {
    reportType: "revenue" | "profit" | "best-selling" | "payment";
    fromDate?: string;
    toDate?: string;
    categorySlug?: string;
  }) => {
    const response = await api.get("/api/Report", { params });
    return response.data;
  },
  getMonthlyOverview: async () => {
  const response = await api.get("/api/Report/monthly-overview");
  return response.data;
},

  exportReport: async (params: {
    reportType: "revenue" | "profit" | "best-selling" | "payment";
    fromDate?: string;
    toDate?: string;
    categorySlug?: string;
  }) => {
    const response = await api.get("/api/Report/export", {
      params,
      responseType: "blob",
    });

    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;

    const disposition = response.headers["content-disposition"];
    const fileNameMatch = disposition && disposition.match(/filename="?(.+)"?/);
    link.download = fileNameMatch ? fileNameMatch[1] : `BaoCao_${params.reportType}.xlsx`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

// ==========================================================================
// THÊM ĐOẠN NÀY VÀO FILE src/api/api.ts HIỆN CÓ CỦA BẠN
// ==========================================================================

export const customerChatApi = {
  // KHÁCH HÀNG
  getMyMessages: async () => {
    const response = await api.get('/api/CustomerChat/my-messages');
    return response.data;
  },
  sendAsCustomer: async (content: string) => {
    const response = await api.post('/api/CustomerChat/send', { content });
    return response.data;
  },

  // NHÂN VIÊN (Sales/Admin)
  getConversations: async () => {
    const response = await api.get('/api/CustomerChat/conversations');
    return response.data;
  },
  getConversationMessages: async (customerId: number) => {
    const response = await api.get(`/api/CustomerChat/conversations/${customerId}/messages`);
    return response.data;
  },
  sendAsStaff: async (customerId: number, content: string) => {
    const response = await api.post('/api/CustomerChat/send', { content, customerId });
    return response.data;
  },
};

export default api;