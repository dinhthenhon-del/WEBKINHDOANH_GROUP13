import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  private apiRoot = `${window.location.protocol}//${window.location.hostname}:5000/api`;
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD-oE-3fQcuUak2YB-Brhe04Eoj4Gj83M0IUUSSSyMptq-GrgI-ksqvDxSEDImbDCzvgYKMk86AN5FPuTip7CDTQpmPTfC8p06OmC5qQAEBuIwIL9VZpyygz5tb26qwS2A5cpFFKTwexcixPkvhrhytdFiEjCos0V7iclMiVyQPwxka5hNgvFQDkZbcLzpsU_XhbweZBx-d3UlI2sYw05I6KVQHSLZLXSyYMbwMHH_ia6woraWqXQ',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC96PFSR4L1CzCBGNkKo3cw9Ee3q8tAeAMf35gry0rcgeUvrIB46UWISL29yvKFaXSleUB2_uc2R1U3K2_n64JEv5n84Iq20L1JtnXw2nLoOY7bft7EdKwUkXuvlELM8H7t3q3AJRUQhJXmQ99SJsmYEI-U2UonuLaV3OuyszMObiZguOkSS6hNA-p68SfOi4B2KCyf9RymblN79MC40fvx8eg5o_ntN5zOMFjNoDoeP9BbPkGm_w',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBXpZ6PapFxreDB5-Ru5tnALFEa8tjUcZuX7Vapp4IYqCUiE6Mn6s-2g4qLWThwaSbybmU84B9PfE8d4CGbnJClQl4M_ZG720TpGvZfnFhoQC1AqNd3LyS5C0sTZZErFob7S085cTCoJPH3Pz2hISLJp8URFPg9NMZhHBHDAQ9VV4BMc0AQahISFvysrsg05N_fo9XdtatOvJzDbQGWht-aN9y4hT8kFS6ZM6yv933UqzzdV7brLg'
        ],
        status: 'pending',
        items: [
          {
            productId: {
              _id: 'prod_01',
              name: 'Bình Hút Lộc Men Lam Vẽ Vàng "Thuận Buồm Xuôi Gió"',
              sku: 'SP-ML-BHL-0982',
              price: 2450000,
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDbf2lUfccy7CgSZF_GGJGLqe4F_sGHfiLH7sANv_Bzv_jtIuquDXMprE4ZFdKtYVKPPbYIzaETviuQ2sXzK0NyIS6PWecaKXlmmNzRlmU_iP21ZY3GHmRK-ZKKoPi4VJnJNI37pmz16uXx9r5AQHyklIW178BqmtE30EvbbM7AlwvuuwNoD-XUcAyCru1_zMfXRAnMc6-_gVIUxhraovI32ewBHj1uxcMZh_RRmKAKX9b7_A8pA'
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCkur97ZDaliQFcYOwJ8M0CDRza25jUxuauJcM6ufGFWtaD6nQBGDk_zCNSzK3uXK8-gDcJoVv_txwmcKXkpNznIPeNToyQfL_onTiFwVtWsUsyESnAqKfLC8dGF8ocEjFADxdVk3XTvRSRrt5O5fXyQROmQe8vrD4Xg50kbmzMgOWoGhqkl_klxIePyGJnfUf8Jvu0P0LJkcKtRy3jmuOYfkzNTnZcZkdyMF1U_moRI6g2YUYsAw'
        ],
        status: 'approved',
        items: [
          {
            productId: {
              _id: 'prod_02',
              name: 'Bộ Ấm Chén Men Rạn Hoàng Gia',
              sku: 'SP-MR-ACH-0412',
              price: 1850000,
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCA-dB-7NTOu6Tyt2v36U7HXGRbih61_iI8MFD07BFXlTtOQbMAQ2BNMN35XrDvV-clkMZubDGq4CBpnka43rxucZIdjtKP1mDIxRw-dGlUP-94Bi0ffKoYpG937V8oD5DQnBBpoIkuiPNGiFJHJNf23_PISes7_5C6wLZorf5iPbKuVV1nteynsh3CKOJ453N5aW2CkJ7fnc72uz8uRbK4JWOsII9a1bDHkxm'
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuChAl521Bb506Y_rfG2wr9i9gSUefMgExInIgzxQnpSpMPU4f-B3SUbCnxeyjj2nGCbxhQU2rc8KBDAIEJSyaAixvvWC2lv2nl2BwqE3YlwG_3arYzNLZTWxuxCOGtqB-mkjvZkLaDr8bmXXbagOmC8BhE-HFr_8T7dTq_CHQkPFWpHO83AHwUbEbBNOle8hwqFzVs98sSU3BbYkgAVVelaBrQIvYgK-cPY4sygctee29ZxDPpZsg'
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
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBq8rE_t-ARODP0i9gGTHm6G9mVnAqNjGkqdFTCKOyJ4CK4LojD3toS-JA0bfkBFpvFWm9p0UVs92ZivR0lpYx9y-5G4M-Iu4vBLsLa79kWdQ_72p1R4YWtwomiU9np4HE8PsGdJEPrB02n4AhedmEE98ykiau1Z3uNQP7or14Xn_dLoQHSVNUJanMk4iUT2MzVllXim6Mo3bUx5mv3rpijZIXOF9Wp0BeemdZW'
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAsfKjHLKB_jhvE388DP9yXnKhXAnpJSdn4usHq3o47zEJ_QVh32ycTbmxrn-oSCgLaThdcrv7BiW0o6vrvNJCU50NFpzvN9rv2CpVac2nbVn-fmr-LJr5ddzy_D3utl4IoeDmyFO70_H9-Wl8zoqmxk5ybpJR19EQA7lF_SOll_v_4jVHDxHAHrrkGaZBVkr4fHJyCYVrMmD2Xx62I33uwgg_ZeYBmptcx9aj8MWCZCHNwkilRMA'
        ],
        status: 'pending',
        items: [
          {
            productId: {
              _id: 'prod_04',
              name: 'Lư Hương Men Ngọc',
              sku: 'SP-MN-LH-0056',
              price: 1200000,
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAN9ijEmVdVKMOcJq_PW21AecfVIVZqaNLiO2kxOEtyl1_rOlYDmOD1FpdRH8Wh-M_MlDggzqt6kr3utgCZtWCI-Af85Sghzmvch3IDZwvLLvhpOtDlpVUzwE3boY8FCh1A5Fenif-4zzqFNSo9zDI5yxqea27cuH8IjVxX-tTw50LJ4bk6yaKRSraMZTjrDU4pjV1EnkpTDhFR1aDV0YaAaxRBNvofa-lNFPH2'
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDKbCgl-PDZxWG-0nYvuSoznftsCFjeuSROOyJRZ-Pv3rrS4KU4KHVJ0FrAP6WFRYcRiZDKpANKBNMNqZgSPHPEW4HbFDj5SphJ0e7qvXg_Z0y_clsWiqwVCXvPQHXYsvZWwqxaMFBzw-1z0CnesfxRoKFOagMGsodan5R54YIMPEF43rE5YZPgrg17ylKS2_mEqZ3uoHxqD6etNT7MTdAFAIUnJjjjLe3Y5gBHbebseV4EO-OdQA'
        ],
        status: 'completed',
        items: [
          {
            productId: {
              _id: 'prod_05',
              name: 'Bộ Trà Tử Sa Thanh Xuân',
              sku: 'SP-TS-TX-0899',
              price: 1650000,
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvMvMPCgFIGODop43g_bibYdci-GOoP1yABFda4SquxvlvhmkiJb9BQ8rXCN1yzvJD5ao3blDgQJ7--FjD73EHd9FVgghMPZjq3sOqG_GuroH8-6oywq45y5VYzP1KkqSjV9r5EG6Zfk21hJHJ7lRdz-BIS6rfDzJlYB8MLLwc4Mm2GPe3QC23EJ53FcXFfe_BekJ0kyqWoNnoDqmiQzfPQmJVzMYVoH8LZEq3'
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
