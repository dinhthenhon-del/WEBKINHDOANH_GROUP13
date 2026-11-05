import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { getApiBaseUrl } from '../api.config';
import { Observable } from 'rxjs';

export interface ReturnItemProduct {
  _id?: string;
  name: string;
  price?: number;
  sku?: string;
  image?: string;
  glazeColor?: string;
}

export interface ReturnItem {
  productId: ReturnItemProduct | string;
  quantity: number;
  reason?: string;
}

export interface ReturnAccount {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface ReturnOrder {
  _id: string;
  orderCode: string;
  totalAmount?: number;
  orderStatus?: string;
  paymentStatus?: string;
  shippingAddress?: {
    recipientName?: string;
    phone?: string;
    province?: string;
    ward?: string;
    detail?: string;
  };
}

export interface ReturnRequestData {
  _id: string;
  orderId: ReturnOrder | any;
  accountId: ReturnAccount | any;
  type: 'return' | 'exchange';
  reason: string;
  evidenceImages: string[];
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  items: ReturnItem[];
  processedBy?: any;
  processedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReturnStatusUpdatePayload {
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  rejectionReason?: string;
  processedBy?: string;
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
export class ReturnService {
  private http = inject(HttpClient);
  private apiRoot = getApiBaseUrl();
  private returnsUrl = `${this.apiRoot}/returns`;

  getReturns(filters?: { status?: string; type?: string; search?: string }): Observable<ApiResponse<ReturnRequestData[]>> {
    let params = new HttpParams();
    if (filters) {
      if (filters.status && filters.status !== 'all') params = params.set('status', filters.status);
      if (filters.type && filters.type !== 'all') params = params.set('type', filters.type);
      if (filters.search) params = params.set('search', filters.search);
    }
    return this.http.get<ApiResponse<ReturnRequestData[]>>(this.returnsUrl, { params });
  }

  updateStatus(id: string, payload: ReturnStatusUpdatePayload): Observable<ApiResponse<ReturnRequestData>> {
    return this.http.put<ApiResponse<ReturnRequestData>>(`${this.returnsUrl}/${id}/status`, payload);
  }

  createReturn(payload: any): Observable<ApiResponse<ReturnRequestData>> {
    return this.http.post<ApiResponse<ReturnRequestData>>(this.returnsUrl, payload);
  }

  // Dữ liệu mẫu chuẩn xác từ thiết kế Stitch Bát Tràng (Screen 12 & Screen 8)
  getFallbackReturns(): ReturnRequestData[] {
    return [
      {
        _id: '6715f0010000000000000001',
        orderId: {
          _id: 'ord_dh002891',
          orderCode: 'DH002891',
          totalAmount: 2450000,
          orderStatus: 'completed',
          paymentStatus: 'paid',
          shippingAddress: {
            recipientName: 'Nguyễn Văn An',
            phone: '0912***482',
            province: 'Hà Nội',
            ward: 'Hoàn Kiếm',
            detail: 'Phố Cổ, Hoàn Kiếm, Hà Nội'
          }
        },
        accountId: {
          _id: 'acc_01',
          fullName: 'Nguyễn Văn An',
          email: 'an.nguyen@heritage.vn',
          phone: '0912***482'
        },
        type: 'exchange',
        reason: 'Nứt rạn cổ bình bưu cục',
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/1_copy_5d87cfc2a83249b8b5cb1ac6361fe4a9.jpg',
          'https://cdn.hstatic.net/products/200000532849/09566-sm-01_97a799184d634103bdfcdb924226920f.png',
          'https://cdn.hstatic.net/products/200000532849/2_copy_f94062bbe86942e8a9dd32372206dbb8.jpg'
        ],
        status: 'pending',
        items: [
          {
            productId: {
              _id: 'prod_01',
              name: 'Bình Hút Lộc Men Lam Vẽ Vàng "Thuận Buồm Xuôi Gió"',
              sku: 'SP-ML-BHL-0982',
              price: 2450000,
              image: 'https://cdn.hstatic.net/products/200000532849/3_copy_2a0b65fe2bb044f09aa266ade498aaa1.jpg'
            },
            quantity: 1,
            reason: 'Nứt rạn cổ bình bưu cục'
          }
        ],
        processedBy: null,
        processedAt: undefined,
        createdAt: '2024-10-18T09:15:00.000Z'
      },
      {
        _id: '6715f0010000000000000002',
        orderId: {
          _id: 'ord_dh002884',
          orderCode: 'DH002884',
          totalAmount: 1850000,
          orderStatus: 'completed',
          paymentStatus: 'paid',
          shippingAddress: {
            recipientName: 'Trần Quốc Bảo',
            phone: '0988***119',
            province: 'Nam Định',
            ward: 'TP Nam Định',
            detail: '12 Quang Trung, Nam Định'
          }
        },
        accountId: {
          _id: 'acc_02',
          fullName: 'Trần Quốc Bảo',
          email: 'bao.tran@heritage.vn',
          phone: '0988***119'
        },
        type: 'exchange',
        reason: 'Nứt quai ấm khi mở hộp',
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/4_copy_4a967246f2d94063aeec188cb3470345.jpg'
        ],
        status: 'approved',
        items: [
          {
            productId: {
              _id: 'prod_02',
              name: 'Bộ Ấm Chén Men Rạn Hoàng Gia',
              sku: 'SP-MR-ACH-0412',
              price: 1850000,
              image: 'https://cdn.hstatic.net/products/200000532849/09566-sm-05_d47d7aaeeb9b46128a704f1317693877.png'
            },
            quantity: 1,
            reason: 'Nứt quai ấm khi mở hộp'
          }
        ],
        processedBy: { fullName: 'Trần Quốc Bảo (Admin)' },
        processedAt: '2024-10-17T14:30:00.000Z',
        createdAt: '2024-10-17T08:20:00.000Z'
      },
      {
        _id: '6715f0010000000000000003',
        orderId: {
          _id: 'ord_dh002770',
          orderCode: 'DH002770',
          totalAmount: 950000,
          orderStatus: 'completed',
          paymentStatus: 'paid'
        },
        accountId: {
          _id: 'acc_03',
          fullName: 'Nguyễn Văn Cảnh',
          email: 'canh.nguyen@heritage.vn',
          phone: '0903***771'
        },
        type: 'return',
        reason: 'Khiếu nại sau 16 ngày nhận',
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/09566-sm-04_7b57f70450da46b2ad66937d93644c86.png'
        ],
        status: 'rejected',
        rejectionReason: 'Đã quá thời hạn đổi trả theo quy định bảo hành gốm Thanh Xuân (quá 7 ngày)',
        items: [
          {
            productId: {
              _id: 'prod_03',
              name: 'Đĩa Cảnh Men Lam Cổ',
              sku: 'SP-ML-DC-0118',
              price: 950000,
              image: 'https://cdn.hstatic.net/products/200000532849/22566-sm-01_aa73737a1c7645e4b210c11bf1d16dbd.png'
            },
            quantity: 1,
            reason: 'Khiếu nại sau 16 ngày nhận'
          }
        ],
        processedBy: { fullName: 'Nguyễn Văn Cảnh (Admin)' },
        processedAt: '2024-10-03T09:15:00.000Z',
        createdAt: '2024-10-02T11:00:00.000Z'
      },
      {
        _id: '6715f0010000000000000004',
        orderId: {
          _id: 'ord_dh002875',
          orderCode: 'DH002875',
          totalAmount: 1200000,
          orderStatus: 'completed',
          paymentStatus: 'paid'
        },
        accountId: {
          _id: 'acc_04',
          fullName: 'Lê Thị Thu',
          email: 'thu.le@heritage.vn',
          phone: '0971***982'
        },
        type: 'exchange',
        reason: 'Lỗi nung bọt khí đáy lư',
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/1_copy_5d87cfc2a83249b8b5cb1ac6361fe4a9.jpg'
        ],
        status: 'pending',
        items: [
          {
            productId: {
              _id: 'prod_04',
              name: 'Lư Hương Men Ngọc',
              sku: 'SP-MN-LH-0056',
              price: 1200000,
              image: 'https://cdn.hstatic.net/products/200000532849/09566-sm-01_97a799184d634103bdfcdb924226920f.png'
            },
            quantity: 1,
            reason: 'Lỗi nung bọt khí đáy lư'
          }
        ],
        processedBy: null,
        processedAt: undefined,
        createdAt: '2024-10-16T15:20:00.000Z'
      },
      {
        _id: '6715f0010000000000000005',
        orderId: {
          _id: 'ord_dh002860',
          orderCode: 'DH002860',
          totalAmount: 1650000,
          orderStatus: 'completed',
          paymentStatus: 'paid'
        },
        accountId: {
          _id: 'acc_05',
          fullName: 'Trần Quốc Bảo',
          email: 'bao.tran@heritage.vn',
          phone: '0934***650'
        },
        type: 'return',
        reason: 'Giao sai dung tích ấm',
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/2_copy_f94062bbe86942e8a9dd32372206dbb8.jpg'
        ],
        status: 'completed',
        items: [
          {
            productId: {
              _id: 'prod_05',
              name: 'Bộ Trà Tử Sa Thanh Xuân',
              sku: 'SP-TS-TX-0899',
              price: 1650000,
              image: 'https://cdn.hstatic.net/products/200000532849/3_copy_2a0b65fe2bb044f09aa266ade498aaa1.jpg'
            },
            quantity: 1,
            reason: 'Giao sai dung tích ấm'
          }
        ],
        processedBy: { fullName: 'Trần Quốc Bảo (Admin)' },
        processedAt: '2024-10-16T10:20:00.000Z',
        createdAt: '2024-10-15T14:10:00.000Z'
      }
    ];
  }
}
