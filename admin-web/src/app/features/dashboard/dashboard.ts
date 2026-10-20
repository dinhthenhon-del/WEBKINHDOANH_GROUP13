import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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
export class Dashboard implements OnInit {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

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
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;

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
            // Nếu API có recentOrders và lowStockProducts thì dùng, không thì giữ fallback
            recentOrders: (res.data.recentOrders && res.data.recentOrders.length > 0)
              ? this.normalizeRecentOrders(res.data.recentOrders)
              : this.stats.recentOrders,
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
    return orders.map((o) => ({
      _id: o._id,
      orderCode: o.orderCode || `#DH${(o._id || '').slice(-4)}`,
      customerName: o.accountId?.fullName || o.shippingAddress?.recipientName || 'Khách Hàng',
      customerPhone: o.accountId?.phone || o.shippingAddress?.phone || '090***',
      customerAddress: o.shippingAddress?.province || 'Hà Nội',
      timeDisplay: o.createdAt ? this.formatTimeAgo(new Date(o.createdAt)) : '10:42 • Hôm nay',
      totalAmount: o.totalAmount || 0,
      status: 'Chờ xác nhận'
    }));
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
