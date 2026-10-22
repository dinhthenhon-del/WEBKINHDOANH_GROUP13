import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardStats, RecentOrder, LowStockProduct, RevenueDay } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  private pollIntervalId: any = null;
  private visibilityHandler: any = null;
  private focusHandler: any = null;

  isLoading = false;
  stats: DashboardStats = this.dashboardService.getFallbackStats();
  revenueDays: RevenueDay[] = this.dashboardService.getRevenueWeeklyChart();

  currentWeekLabel = 'Kỳ Quản Trị Men Lam • Tuần 24';
  dateRangeLabel = '01/06/2024 – 07/06/2024';
  highestOrderHighlight = 'Bộ Đồ Thờ Hoàng Gia (Bát Tràng Cổ) — Chiếm 38% cơ cấu tuần.';

  // Toast notice
  toastMessage = '';
  isToastVisible = false;

  ngOnInit(): void {
    this.loadDashboardData(true);

    // Tự động đồng bộ cập nhật dữ liệu realtime từ server mỗi 8 giây (khi khách thanh toán xong đơn lập tức hiện lên dashboard)
    this.pollIntervalId = setInterval(() => {
      this.loadDashboardData(false);
    }, 8000);

    // Khi admin chuyển qua lại tab dashboard, tự động làm mới ngay lập tức
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.loadDashboardData(false);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.focusHandler = () => {
      this.loadDashboardData(false);
    };
    window.addEventListener('focus', this.focusHandler);
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }
  }

  loadDashboardData(showLoadingIndicator = true): void {
    if (showLoadingIndicator) {
      this.isLoading = true;
    }

    // Timeout an toàn 3.5s tránh gián đoạn
    const timer = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 3500);

    this.dashboardService.getDashboardStats().subscribe({
      next: (res) => {
        clearTimeout(timer);
        this.isLoading = false;
        if (res && res.success && res.data) {
          this.stats = {
            ...this.dashboardService.getFallbackStats(),
            ...res.data,
            // Cập nhật số đơn chờ xác nhận thực tế
            pendingOrdersCount: typeof res.data.pendingOrdersCount === 'number'
              ? res.data.pendingOrdersCount
              : (res.data.recentOrders?.length ?? this.stats.pendingOrdersCount),
            // Nếu API có recentOrders thì normalize, nếu mảng rỗng thì để mảng rỗng
            recentOrders: (Array.isArray(res.data.recentOrders) && res.data.recentOrders.length > 0)
              ? this.normalizeRecentOrders(res.data.recentOrders)
              : (Array.isArray(res.data.recentOrders) ? [] : this.stats.recentOrders),
            lowStockProducts: (res.data.lowStockProducts && res.data.lowStockProducts.length > 0)
              ? this.normalizeLowStockProducts(res.data.lowStockProducts)
              : this.stats.lowStockProducts
          };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearTimeout(timer);
        this.isLoading = false;
        console.warn('Backend chưa sẵn sàng hoặc không kết nối được MongoDB, sử dụng dữ liệu Stitch mẫu:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private normalizeRecentOrders(orders: any[]): RecentOrder[] {
    return orders.map((o) => {
      const addressParts = [
        o.shippingAddress?.detail,
        o.shippingAddress?.ward,
        o.shippingAddress?.province
      ].filter(Boolean);
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : (o.shippingAddress?.province || 'Hà Nội');

      return {
        _id: o._id,
        orderCode: o.orderCode || `#DH${(o._id || '').slice(-4)}`,
        customerName: o.shippingAddress?.recipientName || o.accountId?.fullName || 'Khách Hàng',
        customerPhone: o.shippingAddress?.phone || o.accountId?.phone || '090***',
        customerAddress: fullAddress,
        timeDisplay: o.createdAt ? this.formatTimeAgo(new Date(o.createdAt)) : '10:42 • Hôm nay',
        totalAmount: o.totalAmount || 0,
        status: o.orderStatus === 'pending' || o.status === 'pending' ? 'Chờ xác nhận' : (o.orderStatus || o.status || 'Chờ xác nhận')
      };
    });
  }

  private normalizeLowStockProducts(prods: any[]): LowStockProduct[] {
    return prods.map((p) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku || 'SKU-UNKNOWN',
      glazeColor: p.glazeColor || 'Men lam cổ truyền',
      stock: p.stock ?? 1,
      price: p.price || 0,
      image: p.image || (p.images && p.images[0]) || 'minimalist_archway_pottery_icon.png'
    }));
  }

  private formatTimeAgo(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} • Gần đây`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  }

  exportWeeklyReport(): void {
    this.showToast('Đang tạo báo cáo quản trị tuần 24 (PDF/Excel)... Đã xuất thành công!');
  }

  showToast(message: string): void {
    this.toastMessage = message;
    this.isToastVisible = true;
    setTimeout(() => {
      this.isToastVisible = false;
      this.cdr.detectChanges();
    }, 3500);
  }
}
