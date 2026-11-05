import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { getApiBaseUrl } from '../../../core/api.config';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  isPasswordHelpOpen = false;

  openPasswordHelp() {
    this.isPasswordHelpOpen = true;
    this.cdr.detectChanges();
  }

  closePasswordHelp() {
    this.isPasswordHelpOpen = false;
    this.cdr.detectChanges();
  }

  closeErrorNotice() {
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  constructor() {
    // Nếu đã đăng nhập từ trước, tự động chuyển vào dashboard quản trị
    const existingAdmin = localStorage.getItem('admin_user');
    if (existingAdmin) {
      try {
        const admin = JSON.parse(existingAdmin);
        if (admin && admin.role === 'admin') {
          this.router.navigate(['/dashboard']);
        }
      } catch (e) {
        localStorage.removeItem('admin_user');
      }
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges();
  }


  onLogin() {
    this.errorMessage = '';

    const trimmedEmail = (this.email || '').trim();
    const enteredPassword = (this.password || '').trim();

    if (!trimmedEmail || !enteredPassword) {
      this.errorMessage = 'Vui lòng nhập đầy đủ Email và Mật khẩu quản trị';
      this.cdr.detectChanges();
      return;
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      this.errorMessage = 'Email không hợp lệ. Vui lòng nhập đúng định dạng (ví dụ: admin@gombattrang.vn)';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const loginApiUrl = `${getApiBaseUrl()}/auth/login`;

    fetch(loginApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhone: trimmedEmail,
        password: this.password,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        let data: any = null;
        try {
          data = await res.json();
        } catch (e) {
          data = null;
        }

        this.isLoading = false;

        if (res.ok && data && data.success && data.data) {
          // Kiểm tra phân quyền: Chỉ tài khoản admin mới được đăng nhập vào hệ thống quản trị
          if (data.data.role !== 'admin') {
            this.errorMessage = 'Tài khoản này là Khách hàng, không có quyền truy cập hệ thống Quản trị viên!';
            this.cdr.detectChanges();
            return;
          }

          // Lưu thông tin admin vào localStorage
          localStorage.setItem('admin_user', JSON.stringify(data.data));

          // Chuyển hướng vào Dashboard
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = (data && data.message) ? data.message : 'Email hoặc mật khẩu không chính xác!';
        }
        this.cdr.detectChanges();
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        this.isLoading = false;
        console.error('Lỗi kết nối máy chủ xác thực:', err);

        if (err?.name === 'AbortError') {
          this.errorMessage = 'Quá thời gian kết nối máy chủ xác thực. Vui lòng kiểm tra lại kết nối mạng!';
        } else {
          this.errorMessage = 'Không thể kết nối đến máy chủ xác thực (Port 5000). Vui lòng đảm bảo backend đang hoạt động!';
        }
        this.cdr.detectChanges();
      });
  }
}
