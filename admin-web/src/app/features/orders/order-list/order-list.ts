import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService, OrderData, OrderStats } from '../../../core/services/order';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderList implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  orders: OrderData[] = [];
  filteredOrders: OrderData[] = [];
  isLoading = false;

  // Search & Filter
  searchKeyword = '';
  activeTab: 'all' | 'pending' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled' = 'all';
  paymentMethodFilter = 'all';
  paymentStatusFilter = 'all';

  // KPI glance stats
  stats: OrderStats = {
    totalOrders: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipping: 0,
    completed: 0,
    cancelled: 0,
    todayOrders: 0,
    totalRevenue: 0,
  };

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;

  // Selection
  selectAll = false;
  selectedOrderIds: Set<string> = new Set();

  ngOnInit(): void {
    // Lắng nghe queryParams nếu điều hướng từ Dashboard sang
    this.route.queryParams.subscribe((params) => {
      if (params['status']) {
        const s = params['status'].toLowerCase();
        if (['pending', 'confirmed', 'processing', 'shipping', 'completed', 'cancelled', 'all'].includes(s)) {
          this.activeTab = s;
        }
      }
      if (params['keyword']) {
        this.searchKeyword = params['keyword'];
      }
      this.loadStats();
      this.loadOrders();
    });
  }

  loadStats(): void {
    this.orderService.getOrderStats().subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.stats = res.data;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải thống kê đơn hàng:', err);
      },
    });
  }

  loadOrders(): void {
    this.isLoading = true;
    this.orderService
      .getOrders({
        page: this.currentPage,
        limit: this.pageSize,
        status: this.activeTab === 'all' ? undefined : this.activeTab,
        keyword: this.searchKeyword.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res && res.success) {
            this.orders = res.data || [];
            this.totalItems = res.pagination?.total || this.orders.length;
            this.totalPages = res.pagination?.totalPages || 1;
            this.applyLocalFilters();
          } else {
            this.orders = [];
            this.filteredOrders = [];
            this.totalItems = 0;
            this.totalPages = 1;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Lỗi tải danh sách đơn hàng:', err);
          this.orders = [];
          this.filteredOrders = [];
          this.cdr.detectChanges();
        },
      });
  }

  onTabChange(tab: 'all' | 'pending' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: tab === 'all' ? null : tab },
      queryParamsHandling: 'merge',
    });
    this.loadOrders();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadOrders();
  }

  applyLocalFilters(): void {
    let result = [...this.orders];

    if (this.paymentMethodFilter !== 'all') {
      result = result.filter((o) =>
        (o.paymentMethod || 'COD').toLowerCase() === this.paymentMethodFilter.toLowerCase()
      );
    }

    if (this.paymentStatusFilter !== 'all') {
      result = result.filter((o) =>
        (o.paymentStatus || 'pending').toLowerCase() === this.paymentStatusFilter.toLowerCase()
      );
    }

    this.filteredOrders = result;
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.paymentMethodFilter = 'all';
    this.paymentStatusFilter = 'all';
    this.activeTab = 'all';
    this.currentPage = 1;
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.loadOrders();
  }

  // Pagination navigation
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadOrders();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize);
    this.currentPage = 1;
    this.loadOrders();
  }

  // Checkbox Selection
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.filteredOrders.forEach((o) => this.selectedOrderIds.add(o._id));
    } else {
      this.selectedOrderIds.clear();
    }
  }

  toggleSelectOrder(orderId: string): void {
    if (this.selectedOrderIds.has(orderId)) {
      this.selectedOrderIds.delete(orderId);
      this.selectAll = false;
    } else {
      this.selectedOrderIds.add(orderId);
      if (this.selectedOrderIds.size === this.filteredOrders.length) {
        this.selectAll = true;
      }
    }
  }

  isOrderSelected(orderId: string): boolean {
    return this.selectedOrderIds.has(orderId);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'processing':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'shipping':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  getStatusLabel(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'processing':
        return 'Đang chuẩn bị';
      case 'shipping':
        return 'Đang giao hàng';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  getPaymentStatusBadgeClass(paymentStatus: string): string {
    const s = (paymentStatus || '').toLowerCase();
    switch (s) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'refunded':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }

  getPaymentStatusLabel(paymentStatus: string): string {
    const s = (paymentStatus || '').toLowerCase();
    switch (s) {
      case 'paid':
        return 'Đã thanh toán';
      case 'failed':
        return 'Thanh toán lỗi';
      case 'refunded':
        return 'Đã hoàn tiền';
      default:
        return 'Chờ thanh toán';
    }
  }

  getFirstProductImage(order: OrderData): string {
    if (order.items && order.items.length > 0) {
      const item = order.items[0];
      const prod = item.productId || item.product;
      if (typeof prod === 'object' && prod !== null) {
        if (prod.image) return prod.image;
        if (Array.isArray(prod.images) && prod.images.length > 0) return prod.images[0];
      }
      if (item.designSnapshot?.previewUrl) return item.designSnapshot.previewUrl;
    }
    return 'minimalist_archway_pottery_icon.png';
  }
}
