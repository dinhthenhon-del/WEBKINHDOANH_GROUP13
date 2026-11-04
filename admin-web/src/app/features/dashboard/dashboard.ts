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

    private static cachedStats: DashboardStats | null = null;
  private static cachedRevenueDays: RevenueDay[] | null = null;
  private static cachedWeeklyReport: any = null;

  private static getStoredStats(): DashboardStats | null {
    if (Dashboard.cachedStats) return Dashboard.cachedStats;
    try {
      const stored = sessionStorage.getItem('admin_dashboard_stats');
      if (stored) {
        Dashboard.cachedStats = JSON.parse(stored);
        return Dashboard.cachedStats;
      }
    } catch (e) {}
    return null;
  }

  private static getStoredRevenueDays(): RevenueDay[] | null {
    if (Dashboard.cachedRevenueDays) return Dashboard.cachedRevenueDays;
    try {
      const stored = sessionStorage.getItem('admin_dashboard_rev_days');
      if (stored) {
        Dashboard.cachedRevenueDays = JSON.parse(stored);
        return Dashboard.cachedRevenueDays;
      }
    } catch (e) {}
    return null;
  }

  isLoading = !Dashboard.getStoredStats();
  isInitialLoaded = !!Dashboard.getStoredStats();
  stats: DashboardStats = Dashboard.getStoredStats() || this.dashboardService.getFallbackStats();
  revenueDays: RevenueDay[] = Dashboard.getStoredRevenueDays() || this.dashboardService.getRevenueWeeklyChart();

  currentWeekLabel = 'Tổng Quan Quản Trị';
  dateRangeLabel = Dashboard.cachedWeeklyReport?.dateRangeLabel || 'Tuần hiện tại';
  highestOrderHighlight = '';

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

  // Modal Báo cáo tuần chi tiết
  isWeeklyReportModalOpen = false;
  weeklyReport: any = null;

  peakDaySummary = 'Tổng quan doanh thu tuần';
  weekAccumulatedRevenue = 0;

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
          const data = res.data;
          this.stats = {
            ...this.dashboardService.getFallbackStats(),
            ...data,
            pendingOrdersCount: typeof data.pendingOrdersCount === 'number'
              ? data.pendingOrdersCount
              : (data.recentOrders?.length ?? this.stats.pendingOrdersCount),
            recentOrders: (Array.isArray(data.recentOrders) && data.recentOrders.length > 0)
              ? this.normalizeRecentOrders(data.recentOrders)
              : (Array.isArray(data.recentOrders) ? [] : this.stats.recentOrders),
            lowStockProducts: (data.lowStockProducts && data.lowStockProducts.length > 0)
              ? this.normalizeLowStockProducts(data.lowStockProducts)
              : this.stats.lowStockProducts
          };

          // Cập nhật biểu đồ 7 ngày từ backend thực tế
          if (Array.isArray(data.revenueDays) && data.revenueDays.length > 0) {
            this.revenueDays = data.revenueDays;
          }

          // Cập nhật báo cáo tuần
          if (data.weeklyReport) {
            this.weeklyReport = data.weeklyReport;
            this.dateRangeLabel = data.weeklyReport.dateRangeLabel || this.dateRangeLabel;
            this.weekAccumulatedRevenue = typeof data.weeklyReport.totalNetRevenue === 'number'
              ? data.weeklyReport.totalNetRevenue
              : (this.revenueDays.reduce((acc, d) => acc + (d.totalAmount || 0), 0));

            if (data.weeklyReport.peakDayLabel && data.weeklyReport.peakDayRevenue > 0) {
              this.peakDaySummary = `Đạt đỉnh ${this.formatCurrency(data.weeklyReport.peakDayRevenue)} vào ${data.weeklyReport.peakDayLabel}`;
            } else {
              this.peakDaySummary = 'Doanh thu thuần 7 ngày ổn định';
            }

            if (data.weeklyReport.highestOrder) {
              const ho = data.weeklyReport.highestOrder;
              this.highestOrderHighlight = `${ho.productName} (#${ho.orderCode} - ${ho.customerName}) — Trị giá: ${this.formatCurrency(ho.amount)}`;
            }
          } else if (Array.isArray(this.revenueDays) && this.revenueDays.length > 0) {
            this.weekAccumulatedRevenue = this.revenueDays.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
            const peak = this.revenueDays.find(d => d.isPeak);
            if (peak && peak.totalAmount > 0) {
              this.peakDaySummary = `Đạt đỉnh ${this.formatCurrency(peak.totalAmount)} vào ${peak.dayLabel}`;
            } else {
              this.peakDaySummary = 'Doanh thu thuần 7 ngày ổn định';
            }
          }
          Dashboard.cachedStats = this.stats;
          Dashboard.cachedRevenueDays = this.revenueDays;
          Dashboard.cachedWeeklyReport = this.weeklyReport;
          try { sessionStorage.setItem("admin_dashboard_stats", JSON.stringify(this.stats)); sessionStorage.setItem("admin_dashboard_rev_days", JSON.stringify(this.revenueDays)); } catch(e){}
          this.isInitialLoaded = true;
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
      stock: p.stock ?? 0,
      price: p.price || 0,
      image: p.image || (p.images && p.images[0]) || 'assets/img/logo.png'
    }));
  }

  private formatTimeAgo(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} • Gần đây`;
  }

  formatCurrency(amount?: number | null): string {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';
  }

  // Mở modal xem chi tiết Báo cáo tuần
  openWeeklyReportModal(): void {
    this.isWeeklyReportModalOpen = true;
    this.cdr.detectChanges();
  }

  closeWeeklyReportModal(): void {
    this.isWeeklyReportModalOpen = false;
    this.cdr.detectChanges();
  }

  exportWeeklyReport(): void {
    this.openWeeklyReportModal();
  }

  downloadReportCsv(): void {
    if (!this.weeklyReport || !Array.isArray(this.weeklyReport.dailyBreakdown)) {
      this.showToast('Không có dữ liệu báo cáo để tải!');
      return;
    }

    let csvContent = '\uFEFFNgày,Thứ,Tiền Thu Được (VND),Hàng Hoàn Trả (VND),Số Đơn Hủy,Giá Trị Hủy (VND),Doanh Thu Thuần (VND),Số Đơn Thực Thu\n';
    this.weeklyReport.dailyBreakdown.forEach((d: any) => {
      csvContent += `"${d.fullDateLabel}","${d.dayLabel}",${d.grossRevenue || 0},${d.refundedAmount || 0},${d.cancelledOrders || 0},${d.cancelledAmount || 0},${d.netRevenue || 0},${d.paidOrders || 0}\n`;
    });
    csvContent += `\n"TỔNG CỘNG TUẦN","",${this.weeklyReport.totalGrossRevenue || 0},${this.weeklyReport.totalRefundedAmount || 0},${this.weeklyReport.totalCancelledOrders || 0},${this.weeklyReport.totalCancelledAmount || 0},${this.weeklyReport.totalNetRevenue || 0},${this.weeklyReport.paidOrdersCount || 0}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Tuan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Đã tải xuống file Báo cáo tuần (CSV/Excel) thành công!');
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
