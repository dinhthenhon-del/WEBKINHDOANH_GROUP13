import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getApiBaseUrl } from '../api.config';
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
  netRevenue?: number;
  deductionAmount?: number;
  netHeightPercent?: number;
  deductionHeightPercent?: number;
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
  grossRevenue?: number;
  netRevenue: number;
  refundedAmount: number;
  cancelledOrders: number;
  cancelledAmount: number;
  paidOrders: number;
  isPeak: boolean;
}

export interface WeeklyReport {
  dateRangeLabel: string;
  totalGrossRevenue?: number;
  totalNetRevenue: number;
  totalRefundedAmount: number;
  totalCancelledAmount: number;
  totalCancelledOrders?: number;
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
  private apiRoot = getApiBaseUrl();
  private statsUrl = `${this.apiRoot}/dashboard/stats`;

  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(this.statsUrl);
  }

  // Dữ liệu ban đầu đồng bộ với hệ thống hiện hành
  getFallbackStats(): DashboardStats {
    return {
      totalProductsCount: 0,
      totalCustomersCount: 0,
      totalRevenue: 0,
      pendingOrdersCount: 0,
      lowStockCount: 0,
      pendingReturnsCount: 0,
      recentOrders: [],
      lowStockProducts: []
    };
  }

  getRevenueWeeklyChart(): RevenueDay[] {
    return [
      { dayLabel: 'T2', menLamAmount: 0, saThachAmount: 0, totalAmount: 0, netRevenue: 0, deductionAmount: 0, netHeightPercent: 8, deductionHeightPercent: 8, menLamHeightPercent: 8, saThachHeightPercent: 8 },
      { dayLabel: 'T3', menLamAmount: 0, saThachAmount: 0, totalAmount: 0, netRevenue: 0, deductionAmount: 0, netHeightPercent: 8, deductionHeightPercent: 8, menLamHeightPercent: 8, saThachHeightPercent: 8 },
      { dayLabel: 'T4', menLamAmount: 0, saThachAmount: 0, totalAmount: 0, netRevenue: 0, deductionAmount: 0, netHeightPercent: 8, deductionHeightPercent: 8, menLamHeightPercent: 8, saThachHeightPercent: 8 },
      { dayLabel: 'T5', menLamAmount: 0, saThachAmount: 0, totalAmount: 0, netRevenue: 0, deductionAmount: 0, netHeightPercent: 8, deductionHeightPercent: 8, menLamHeightPercent: 8, saThachHeightPercent: 8 },
      { dayLabel: 'T6', menLamAmount: 0, saThachAmount: 0, totalAmount: 0, netRevenue: 0, deductionAmount: 0, netHeightPercent: 8, deductionHeightPercent: 8, menLamHeightPercent: 8, saThachHeightPercent: 8 },
      { dayLabel: 'T7', menLamAmount: 0, saThachAmount: 0, totalAmount: 0, netRevenue: 0, deductionAmount: 0, netHeightPercent: 8, deductionHeightPercent: 8, menLamHeightPercent: 8, saThachHeightPercent: 8 },
      { dayLabel: 'CN', menLamAmount: 0, saThachAmount: 0, totalAmount: 0, netRevenue: 0, deductionAmount: 0, netHeightPercent: 8, deductionHeightPercent: 8, menLamHeightPercent: 8, saThachHeightPercent: 8 }
    ];
  }
}
