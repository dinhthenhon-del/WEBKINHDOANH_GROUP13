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
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
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

  // [UC-A04 E2] Khóa hoặc Mở khóa tài khoản khách hàng
  updateStatus(id: string, status: 'ACTIVE' | 'LOCKED'): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.API_URL}/${id}/status`,
      { status },
      { headers: this.getHeaders() }
    );
  }
}
