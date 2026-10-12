/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Auth Service (core/services/auth.ts)
 * Phục vụ:
 *   - UC-A01: Đăng nhập quản trị viên (Admin Login) & Đăng xuất
 *   - UC-A01 E4: Quên mật khẩu gửi OTP & Đặt lại mật khẩu mới
 *   - Quản lý trạng thái xác thực Admin bằng Angular Signals
 * ============================================================================
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  data?: AdminUser;
  devOtp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = 'http://localhost:5000/api/auth';
  private readonly TOKEN_KEY = 'craftory_admin_token';
  private readonly USER_KEY = 'craftory_admin_user';

  // Signals lưu trạng thái người dùng hiện tại
  readonly currentUser = signal<AdminUser | null>(this.getStoredUser());
  readonly isAuthenticated = signal<boolean>(!!this.getToken());

  // Lấy token lưu trong localStorage
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // [UC-A01] Đăng nhập Admin
  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/admin/login`, credentials).pipe(
      tap((res) => {
        if (res.success && res.token && res.data) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.data));
          this.currentUser.set(res.data);
          this.isAuthenticated.set(true);
        }
      })
    );
  }

  // [UC-A01] Đăng xuất Admin
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  // [UC-A01 E4] Quên mật khẩu Admin - Gửi mã OTP
  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/forgot-password`, { email });
  }

  // [UC-A01 E4] Đặt lại mật khẩu mới với OTP
  resetPassword(payload: { email: string; otp: string; newPassword: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/reset-password`, payload);
  }

  private getStoredUser(): AdminUser | null {
    const data = localStorage.getItem(this.USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

// Giữ lại alias export Auth tương thích với mã nguồn có sẵn
export { AuthService as Auth };
