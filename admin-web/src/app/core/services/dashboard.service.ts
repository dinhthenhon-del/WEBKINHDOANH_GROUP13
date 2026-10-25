import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecentOrder {
  _id?: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  timeDisplay: string;
  totalAmount: number;
  status: string;
}

export interface LowStockProduct {
  _id?: string;
  name: string;
  sku: string;
  glazeColor?: string;
  stock: number;
  price: number;
  image: string;
}

export interface RevenueDay {
  date?: string;
  dayLabel: string;
  fullDateLabel?: string;
  menLamAmount: number;
  saThachAmount: number;
  totalAmount: number;
  menLamHeightPercent: number;
  saThachHeightPercent: number;
  refundedAmount?: number;
  cancelledAmount?: number;
  cancelledOrders?: number;
  paidOrders?: number;
  isPeak?: boolean;
}

export interface DailyReportItem {
  date: string;
  dayLabel: string;
  fullDateLabel: string;
  netRevenue: number;
  refundedAmount: number;
  cancelledOrders: number;
  cancelledAmount: number;
  paidOrders: number;
  isPeak: boolean;
}

export interface WeeklyReport {
  dateRangeLabel: string;
  totalNetRevenue: number;
  totalRefundedAmount: number;
  totalCancelledAmount: number;
  paidOrdersCount: number;
  peakDayLabel: string;
  peakDayRevenue: number;
  highestOrder?: {
    orderCode: string;
    amount: number;
    productName: string;
    customerName: string;
  } | null;
  dailyBreakdown: DailyReportItem[];
}

export interface DashboardStats {
  totalProductsCount: number;
  totalCustomersCount: number;
  totalRevenue: number;
  pendingOrdersCount: number;
  lowStockCount: number;
  pendingReturnsCount: number;
  recentOrders?: RecentOrder[];
  lowStockProducts?: LowStockProduct[];
  revenueDays?: RevenueDay[];
  weeklyReport?: WeeklyReport;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiRoot = `${window.location.protocol}//${window.location.hostname}:5000/api`;
  private statsUrl = `${this.apiRoot}/dashboard/stats`;

  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(this.statsUrl);
  }

  // Dữ liệu ban đầu đồng bộ với hệ thống hiện hành
  getFallbackStats(): DashboardStats {
    return {
      totalProductsCount: 33,
      totalCustomersCount: 16,
      totalRevenue: 41475520,
      pendingOrdersCount: 8,
      lowStockCount: 4,
      pendingReturnsCount: 0,
      recentOrders: [],
      lowStockProducts: []
    };
  }

  getRevenueWeeklyChart(): RevenueDay[] {
    return [
      { dayLabel: 'T2', menLamAmount: 0, saThachAmount: 0, totalAmount: 850000, menLamHeightPercent: 10, saThachHeightPercent: 10 },
      { dayLabel: 'T3', menLamAmount: 0, saThachAmount: 0, totalAmount: 350000, menLamHeightPercent: 10, saThachHeightPercent: 10 },
      { dayLabel: 'T4', menLamAmount: 0, saThachAmount: 0, totalAmount: 2040000, menLamHeightPercent: 15, saThachHeightPercent: 10 },
      { dayLabel: 'T5', menLamAmount: 0, saThachAmount: 0, totalAmount: 0, menLamHeightPercent: 10, saThachHeightPercent: 10 },
      { dayLabel: 'T6', menLamAmount: 0, saThachAmount: 0, totalAmount: 22716240, menLamHeightPercent: 100, saThachHeightPercent: 10, isPeak: true },
      { dayLabel: 'T7', menLamAmount: 0, saThachAmount: 0, totalAmount: 2335000, menLamHeightPercent: 20, saThachHeightPercent: 10 },
      { dayLabel: 'CN', menLamAmount: 0, saThachAmount: 0, totalAmount: 6339280, menLamHeightPercent: 35, saThachHeightPercent: 10 }
    ];
  }
}
