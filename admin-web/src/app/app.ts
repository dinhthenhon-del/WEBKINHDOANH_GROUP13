import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';

@Component({
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Bát Tràng Admin');
  private router = inject(Router);
  isAuthPage = false;
  isFeatureNoticeOpen = false;
  featureNoticeTitle = '';
  featureNoticeMessage = '';
  adminName = 'Trưởng ban Quản trị';
  adminEmail = 'admin@gombattrang.vn';

  currentModuleName = 'Dashboard Tổng quan';

  constructor() {
    this.checkRoute(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkRoute(event.urlAfterRedirects);
        this.loadAdminProfile();
      }
    });
  }

  checkRoute(url: string) {
    this.isAuthPage = url.includes('/login');
    if (url.includes('/dashboard')) {
      this.currentModuleName = 'Tổng quan Dashboard';
    } else if (url.includes('/returns')) {
      this.currentModuleName = 'Quản trị Đổi / Trả hàng (UC-A05)';
    } else if (url.includes('/products')) {
      this.currentModuleName = 'Quản lý Sản phẩm & Tồn kho';
    } else if (url.includes('/customers')) {
      this.currentModuleName = 'Quản trị Khách hàng & Hội viên';
    } else {
      this.currentModuleName = 'Quản trị Hệ thống';
    }
  }

  showFeatureNotice(title: string, message: string) {
    this.featureNoticeTitle = title;
    this.featureNoticeMessage = message;
    this.isFeatureNoticeOpen = true;
  }

  closeFeatureNotice() {
    this.isFeatureNoticeOpen = false;
  }

  loadAdminProfile() {
    const raw = localStorage.getItem('admin_user');
    if (raw) {
      try {
        const admin = JSON.parse(raw);
        this.adminName = admin.fullName || 'Trưởng ban Quản trị';
        this.adminEmail = admin.email || 'admin@gombattrang.vn';
      } catch (e) {}
    }
  }

  logout() {
    localStorage.removeItem('admin_user');
    this.router.navigate(['/login']);
  }
}
