/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Customer Service (core/services/customer.ts)
 * Phục vụ:
 *   - UC-A04: Quản lý danh sách khách hàng trên Admin
 *   - Tìm kiếm theo tên/email/sđt, lọc trạng thái ACTIVE/LOCKED
 *   - Khóa / Mở khóa tài khoản khách hàng (UC-A04 E2)
 * ============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface CustomerItem {
  _id: string;
  customerCode?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  membershipTier?: string;
  banReason?: string;
  isDeleted?: boolean;
  avatar?: string;
  createdAt: string;
  addresses?: Array<{
    recipientName: string;
    phone: string;
    province: string;
    ward: string;
    addressDetail: string;
    isDefault: boolean;
  }>;
}

export interface CustomerListResponse {
  success: boolean;
  data: CustomerItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    totalCustomers: number;
    totalActive: number;
    totalLocked: number;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API_URL = 'http://localhost:5000/api/users/admin/customers';

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`
    });
  }

  // [UC-A04] Lấy danh sách khách hàng có tìm kiếm và lọc trạng thái
  getCustomers(search?: string, status?: string, page: number = 1): Observable<CustomerListResponse> {
    let params = new HttpParams().set('page', String(page));
    if (search && search.trim()) params = params.set('search', search.trim());
    if (status && status !== 'ALL') params = params.set('status', status);

    return this.http.get<CustomerListResponse>(this.API_URL, {
      headers: this.getHeaders(),
      params
    });
  }

  // [UC-A04] Xem chi tiết 1 khách hàng
  getCustomerById(id: string): Observable<{ success: boolean; data: CustomerItem }> {
    return this.http.get<{ success: boolean; data: CustomerItem }>(`${this.API_URL}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // [UC-A04 E2 & BR-A15 & BRD-16-05, BRD-16-07] Khóa / Mở khóa tài khoản khách hàng kèm lý do
  updateStatus(id: string, status: 'ACTIVE' | 'LOCKED', banReason?: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.API_URL}/${id}/status`,
      { status, banReason },
      { headers: this.getHeaders() }
    );
  }

  // [BRD-16-08] Xóa mềm tài khoản khách hàng
  softDelete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.API_URL}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // [BR-A14 & BRD-A19] Gửi liên kết đặt lại mật khẩu cho khách hàng
  triggerResetPassword(id: string): Observable<{ success: boolean; message: string; devOtp?: string }> {
    return this.http.post<{ success: boolean; message: string; devOtp?: string }>(
      `${this.API_URL}/${id}/reset-password`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // Tải ảnh đại diện khách hàng lên Cloudinary
  uploadCustomerAvatar(id: string, file: File): Observable<{ success: boolean; message: string; data?: { avatar: string } }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<{ success: boolean; message: string; data?: { avatar: string } }>(
      `http://localhost:5000/api/users/admin/customers/${id}/avatar`,
      formData,
      { headers: this.getHeaders() }
    );
  }
}
