import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OrderService, OrderStats, OrderData } from '../../../core/services/order';

@Component({
  selector: 'app-order-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-dashboard.html',
  styleUrl: './order-dashboard.css',
})
export class OrderDashboard implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isLoading = true;
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

  recentOrders: OrderData[] = [];

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentOrders();
  }

  loadStats(): void {
    this.isLoading = true;
    this.orderService.getOrderStats().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.success && res.data) {
          this.stats = res.data;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Lỗi tải thống kê đơn hàng:', err);
        this.cdr.detectChanges();
      },
    });
  }

  loadRecentOrders(): void {
    this.orderService.getOrders({ page: 1, limit: 5 }).subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data)) {
          this.recentOrders = res.data;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải danh sách đơn gần đây:', err);
      },
    });
  }

  filterByStatus(status: string): void {
    this.router.navigate(['/orders/list'], { queryParams: { status } });
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
}
