import { Component } from '@angular/core';
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
  email = 'admin@gombattrang.vn';
  password = 'GomBatTrang2024@';
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  isPasswordHelpOpen = false;

  openPasswordHelp() {
    this.isPasswordHelpOpen = true;
  }

  closePasswordHelp() {
    this.isPasswordHelpOpen = false;
  }

  closeErrorNotice() {
    this.errorMessage = '';
  }

  constructor(private router: Router) {
    // Nếu đã đăng nhập từ trước, tự động chuyển vào dashboard quản trị
    const existingAdmin = localStorage.getItem('admin_user');
    if (existingAdmin) {
      try {
        const admin = JSON.parse(existingAdmin);
        if (admin && admin.role === 'admin') {
          this.router.navigate(['/customers']);
        }
      } catch (e) {
        localStorage.removeItem('admin_user');
      }
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  fillAdminDemo() {
    this.email = 'admin@gombattrang.vn';
    this.password = 'GomBatTrang2024@';
  }

  fillAdminThanhXuan() {
    this.email = 'admin@gomthanhxuan.vn';
    this.password = 'admin123';
  }

  onLogin() {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Vui lòng nhập đầy đủ Email và Mật khẩu quản trị';
      return;
    }

    this.isLoading = true;

    fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhone: this.email.trim(),
        password: this.password,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          if (res.data.role !== 'admin') {
            this.errorMessage = 'Tài khoản này là Khách hàng, không có quyền truy cập cổng Quản trị viên!';
            return;
          }

          // Lưu thông tin admin vào localStorage
          localStorage.setItem('admin_user', JSON.stringify(res.data));

          // Chuyển hướng vào trang quản lý khách hàng
          this.router.navigate(['/customers']);
        } else {
          this.errorMessage = res.message || 'Email hoặc mật khẩu không chính xác!';
        }
      })
      .catch((err) => {
        this.isLoading = false;
        console.error('Lỗi đăng nhập admin:', err);
        // Fallback kiểm tra thông tin mặc định nếu server tạm thời gián đoạn
        if (
          (this.email === 'admin@gombattrang.vn' && this.password === 'GomBatTrang2024@') ||
          (this.email === 'admin@gomthanhxuan.vn' && this.password === 'admin123')
        ) {
          const fallbackAdmin = {
            fullName: 'Trưởng ban Quản trị Bát Tràng',
            email: this.email,
            phone: '0901234567',
            role: 'admin',
            status: 'active',
          };
          localStorage.setItem('admin_user', JSON.stringify(fallbackAdmin));
          this.router.navigate(['/customers']);
        } else {
          this.errorMessage = 'Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại!';
        }
      });
  }
}
