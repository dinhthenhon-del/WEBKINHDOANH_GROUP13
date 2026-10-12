import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = 'admin@battrang.vn';
  password = '';
  rememberMe = true;
  showPassword = false;

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Trạng thái modal Quên mật khẩu OTP (UC-A01 E4)
  showForgotModal = signal(false);
  forgotStep = signal<1 | 2>(1); // 1: nhập email, 2: nhập OTP + pass mới
  forgotEmail = '';
  forgotOtp = '';
  forgotNewPassword = '';
  devOtpNotice = signal('');

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Vui lòng điền đầy đủ email và mật khẩu');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(res.message || 'Đăng nhập thất bại');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Email hoặc mật khẩu không chính xác');
      }
    });
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  openForgotPassword(): void {
    this.forgotEmail = this.email || '';
    this.forgotStep.set(1);
    this.errorMessage.set('');
    this.devOtpNotice.set('');
    this.showForgotModal.set(true);
  }

  closeForgotPassword(): void {
    this.showForgotModal.set(false);
  }

  sendOtp(): void {
    if (!this.forgotEmail) return;
    this.isLoading.set(true);
    this.auth.forgotPassword(this.forgotEmail).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.forgotStep.set(2);
        if (res.devOtp) {
          this.devOtpNotice.set(`[Mã OTP thử nghiệm]: ${res.devOtp}`);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Không tìm thấy tài khoản');
      }
    });
  }

  confirmReset(): void {
    if (!this.forgotOtp || !this.forgotNewPassword) return;
    this.isLoading.set(true);
    this.auth.resetPassword({
      email: this.forgotEmail,
      otp: this.forgotOtp,
      newPassword: this.forgotNewPassword
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        alert(res.message);
        this.closeForgotPassword();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Mã OTP không hợp lệ');
      }
    });
  }
}
