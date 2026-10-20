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
  dayLabel: string;
  menLamAmount: number;
  saThachAmount: number;
  totalAmount: number;
  menLamHeightPercent: number;
  saThachHeightPercent: number;
  isPeak?: boolean;
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

  // Dữ liệu mẫu chuẩn xác từ thiết kế Stitch Bát Tràng (Screen 1)
  getFallbackStats(): DashboardStats {
    return {
      totalProductsCount: 125,
      totalCustomersCount: 1250,
      totalRevenue: 23000000,
      pendingOrdersCount: 5,
      lowStockCount: 5,
      pendingReturnsCount: 14,
      recentOrders: [
        {
          orderCode: '#DH0028',
          customerName: 'Nguyễn Văn An',
          customerPhone: '0912***482',
          customerAddress: 'Hà Nội',
          timeDisplay: '10:42 • Hôm nay',
          totalAmount: 2450000,
          status: 'Chờ xác nhận'
        },
        {
          orderCode: '#DH0027',
          customerName: 'Trần Thị Mai',
          customerPhone: '0988***119',
          customerAddress: 'Nam Định',
          timeDisplay: '09:15 • Hôm nay',
          totalAmount: 850000,
          status: 'Chờ xác nhận'
        },
        {
          orderCode: '#DH0026',
          customerName: 'Lê Hoàng Nam',
          customerPhone: '0903***771',
          customerAddress: 'TP.HCM',
          timeDisplay: '08:03 • Hôm nay',
          totalAmount: 3120000,
          status: 'Chờ xác nhận'
        },
        {
          orderCode: '#DH0025',
          customerName: 'Phạm Thu Trang',
          customerPhone: '0971***982',
          customerAddress: 'Đà Nẵng',
          timeDisplay: '22:15 • Hôm qua',
          totalAmount: 1200000,
          status: 'Chờ xác nhận'
        },
        {
          orderCode: '#DH0024',
          customerName: 'Vũ Đức Huy',
          customerPhone: '0934***650',
          customerAddress: 'Hải Phòng',
          timeDisplay: '21:05 • Hôm qua',
          totalAmount: 650000,
          status: 'Chờ xác nhận'
        }
      ],
      lowStockProducts: [
        {
          name: 'Bộ trà sen men ngọc',
          sku: 'SP0012',
          glazeColor: 'Men lam ngọc',
          stock: 3,
          price: 1850000,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBq8rE_t-ARODP0i9gGTHm6G9mVnAqNjGkqdFTCKOyJ4CK4LojD3toS-JA0bfkBFpvFWm9p0UVs92ZivR0lpYx9y-5G4M-Iu4vBLsLa79kWdQ_72p1R4YWtwomiU9np4HE8PsGdJEPrB02n4AhedmEE98ykiau1Z3uNQP7or14Xn_dLoQHSVNUJanMk4iUT2MzVllXim6Mo3bUx5mv3rpijZIXOF9Wp0BeemdZW'
        },
        {
          name: 'Bình hoa sen đất nung Thanh Xuân',
          sku: 'SP0045',
          glazeColor: 'Đất nung đỏ',
          stock: 2,
          price: 950000,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDj2p92k81-30Pl2Kb-FOsKtpFzrqrX7j1raXFQ5ap0w6AhAzZY4DFdSS6ln9tO5q9Yu85u8b4TpqSi93Y64oX0juzCXjHl8ig4MjNe_Qa7MKsdkJnkv1rmK2IJxLUf5x6krwPpm5BeKFITAtOPioyboFQUKGT3iBKQjhLRcXF20CJ2AUPGEF9VFKuAA0w1cltu98vbG5nMnST-V9XjcypKKC3QiO4dWGdZxKid'
        },
        {
          name: 'Chén đĩa men rạn cổ hoàng gia',
          sku: 'SP0078',
          glazeColor: 'Men rạn cổ',
          stock: 1,
          price: 2450000,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCA-dB-7NTOu6Tyt2v36U7HXGRbih61_iI8MFD07BFXlTtOQbMAQ2BNMN35XrDvV-clkMZubDGq4CBpnka43rxucZIdjtKP1mDIxRw-dGlUP-94Bi0ffKoYpG937V8oD5DQnBBpoIkuiPNGiFJHJNf23_PISes7_5C6wLZorf5iPbKuVV1nteynsh3CKOJ453N5aW2CkJ7fnc72uz8uRbK4JWOsII9a1bDHkxm'
        },
        {
          name: 'Tượng gốm Di Lặc men lam',
          sku: 'SP0091',
          glazeColor: 'Men lam đại',
          stock: 4,
          price: 3200000,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAN9ijEmVdVKMOcJq_PW21AecfVIVZqaNLiO2kxOEtyl1_rOlYDmOD1FpdRH8Wh-M_MlDggzqt6kr3utgCZtWCI-Af85Sghzmvch3IDZwvLLvhpOtDlpVUzwE3boY8FCh1A5Fenif-4zzqFNSo9zDI5yxqea27cuH8IjVxX-tTw50LJ4bk6yaKRSraMZTjrDU4pjV1EnkpTDhFR1aDV0YaAaxRBNvofa-lNFPH2'
        },
        {
          name: 'Lọ hoa gốm vuốt tay mộc',
          sku: 'SP0104',
          glazeColor: 'Sa thạch mộc',
          stock: 2,
          price: 1100000,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvMvMPCgFIGODop43g_bibYdci-GOoP1yABFda4SquxvlvhmkiJb9BQ8rXCN1yzvJD5ao3blDgQJ7--FjD73EHd9FVgghMPZjq3sOqG_GuroH8-6oywq45y5VYzP1KkqSjV9r5EG6Zfk21hJHJ7lRdz-BIS6rfDzJlYB8MLLwc4Mm2GPe3QC23EJ53FcXFfe_BekJ0kyqWoNnoDqmiQzfPQmJVzMYVoH8LZEq3'
        }
      ]
    };
  }

  getRevenueWeeklyChart(): RevenueDay[] {
    return [
      { dayLabel: 'T2', menLamAmount: 1800000, saThachAmount: 600000, totalAmount: 2400000, menLamHeightPercent: 40, saThachHeightPercent: 25 },
      { dayLabel: 'T3', menLamAmount: 2200000, saThachAmount: 900000, totalAmount: 3100000, menLamHeightPercent: 55, saThachHeightPercent: 30 },
      { dayLabel: 'T4', menLamAmount: 2000000, saThachAmount: 800000, totalAmount: 2800000, menLamHeightPercent: 48, saThachHeightPercent: 35 },
      { dayLabel: 'T5', menLamAmount: 2600000, saThachAmount: 1000000, totalAmount: 3600000, menLamHeightPercent: 65, saThachHeightPercent: 42 },
      { dayLabel: 'T6', menLamAmount: 3200000, saThachAmount: 1600000, totalAmount: 4800000, menLamHeightPercent: 88, saThachHeightPercent: 60, isPeak: true },
      { dayLabel: 'T7', menLamAmount: 2700000, saThachAmount: 1100000, totalAmount: 3800000, menLamHeightPercent: 70, saThachHeightPercent: 45 },
      { dayLabel: 'CN', menLamAmount: 1900000, saThachAmount: 600000, totalAmount: 2500000, menLamHeightPercent: 45, saThachHeightPercent: 32 }
    ];
  }
}
