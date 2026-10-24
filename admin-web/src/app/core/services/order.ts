import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OrderItem {
  productId?: {
    _id?: string;
    name: string;
    sku?: string;
    image?: string;
    images?: string[];
    price?: number;
    stock?: number;
    glazeColor?: string;
    firingTemp?: string;
  } | string;
  product?: any;
  productName: string;
  unitPrice: number;
  quantity: number;
  designSnapshot?: {
    glazeColor?: string;
    pattern?: string;
    engravingText?: string;
    font?: string;
    previewUrl?: string;
    customNote?: string;
    [key: string]: any;
  } | null;
}

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  province: string;
  ward: string;
  detail: string;
  district?: string;
  addressDetail?: string;
  fullName?: string;
}

export interface StatusHistoryItem {
  status: string;
  updatedAt: string;
  note?: string;
  changedBy?: string;
}

export interface CustomerSummary {
  _id?: string;
  fullName: string;
  phone: string;
  email: string;
}

export interface OrderData {
  _id: string;
  orderCode: string;
  accountId?: CustomerSummary | any;
  customer?: CustomerSummary | any;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: 'pending' | 'awaiting_verification' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  paymentConfirmedAt?: string;
  paymentConfirmedBy?: any;
  paymentNote?: string;
  returnStatus?: 'none' | 'requested' | 'approved' | 'rejected';
  refundedAmount?: number;
  refundedAt?: string;
  returnRequestId?: any;
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled';
  status: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled';
  cancellationReason?: string | null;
  cancelReason?: string | null;
  statusHistory?: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  totalOrders: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipping: number;
  completed: number;
  cancelled: number;
  todayOrders: number;
  totalRevenue: number;
}

export interface OrderListResponse {
  success: boolean;
  data: OrderData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

export interface OrderDetailResponse {
  success: boolean;
  data: OrderData;
  message?: string;
}

export interface OrderActionResponse {
  success: boolean;
  message: string;
  data?: OrderData;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5000/api/orders/admin';

  /**
   * Tạo HttpHeaders xác thực Admin từ localStorage
   */
  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const adminRaw = localStorage.getItem('admin_user');
    if (adminRaw) {
      try {
        const admin = JSON.parse(adminRaw);
        if (admin._id) {
          headers = headers.set('x-admin-id', admin._id);
        }
        if (admin.email) {
          headers = headers.set('x-admin-email', admin.email);
        }
        if (admin.token) {
          headers = headers.set('Authorization', `Bearer ${admin.token}`);
        } else if (admin._id) {
          headers = headers.set('Authorization', `Bearer ${admin._id}`);
        }
      } catch (e) {}
    }
    return headers;
  }

  /**
   * 1. Lấy danh sách thống kê đơn hàng (phục vụ KPI và Order Dashboard)
   */
  getOrderStats(): Observable<{ success: boolean; data: OrderStats; message?: string }> {
    return this.http.get<{ success: boolean; data: OrderStats; message?: string }>(
      `${this.baseUrl}/stats`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * 2. Lấy danh sách đơn hàng có tìm kiếm, lọc trạng thái và phân trang
   */
  getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    keyword?: string;
  }): Observable<OrderListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.paymentStatus && params.paymentStatus !== 'all') {
      httpParams = httpParams.set('paymentStatus', params.paymentStatus);
    }
    if (params.keyword && params.keyword.trim()) {
      httpParams = httpParams.set('keyword', params.keyword.trim());
    }

    return this.http.get<OrderListResponse>(this.baseUrl, {
      headers: this.getAuthHeaders(),
      params: httpParams,
    });
  }

  /**
   * 3. Lấy chi tiết đơn hàng theo ID hoặc orderCode
   */
  getOrderDetail(id: string): Observable<OrderDetailResponse> {
    return this.http.get<OrderDetailResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * 4. Cập nhật trạng thái đơn hàng (E1, E2)
   */
  updateOrderStatus(id: string, status: string): Observable<OrderActionResponse> {
    return this.http.patch<OrderActionResponse>(
      `${this.baseUrl}/${id}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * 5. Hủy đơn hàng và hoàn tồn kho (E3)
   */
  cancelOrder(id: string, reason: string): Observable<OrderActionResponse> {
    return this.http.patch<OrderActionResponse>(
      `${this.baseUrl}/${id}/cancel`,
      { reason },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * 6. Admin xác nhận hoặc điều chỉnh trạng thái thanh toán (Lỗi 2 & Lỗi 3)
   */
  confirmPayment(id: string, payload: { status: string; note?: string }): Observable<OrderActionResponse> {
    return this.http.patch<OrderActionResponse>(
      `${this.baseUrl}/${id}/payment`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }
}

// Alias để tương thích nếu các module cũ import tên Order
export { OrderService as Order };
