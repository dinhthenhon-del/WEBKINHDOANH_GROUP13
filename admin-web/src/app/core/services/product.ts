import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { getApiBaseUrl } from '../api.config';
import { Observable, timeout } from 'rxjs';

export interface ProductItem {
  _id?: string;
  name: string;
  sku?: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  unit?: string;
  minStockAlert?: number;
  categoryId?: any;
  categorySlug?: string;
  collectionName?: string;
  sourceUrl?: string;
  glazeColor?: string;
  material?: string;
  size?: string;
  firingTemp?: string;
  description?: string;
  image?: string;
  images?: string[];
  status?: 'active' | 'inactive';
  custom2DEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalStock: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  categoriesCount: number;
}

export interface CollectionItem {
  _id: string;
  name: string;
  imageUrl: string;
  sourceUrl: string;
  productCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  warning?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiRoot = getApiBaseUrl();
  private apiUrl = `${this.apiRoot}/products`;
  private adminApiUrl = `${this.apiRoot}/admin`;
  private categoriesApiUrl = `${this.apiRoot}/categories`;

  // Lấy danh sách sản phẩm (hỗ trợ lọc, tìm kiếm, phân trang)
  getProducts(filters?: {
    search?: string;
    categoryId?: string;
    status?: string;
    scope?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Observable<ApiResponse<ProductItem[]>> {
    let params = new HttpParams().set('source', 'verified');
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.scope) params = params.set('scope', filters.scope);
      if (filters.sort) params = params.set('sort', filters.sort);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }
    return this.http.get<ApiResponse<ProductItem[]>>(this.apiUrl, { params });
  }

  // Thống kê tồn kho KPI (Dashboard snapshot)
  getInventorySummary(): Observable<ApiResponse<InventorySummary>> {
    return this.http.get<ApiResponse<InventorySummary>>(`${this.adminApiUrl}/inventory/summary`, {
      params: new HttpParams().set('source', 'verified')
    });
  }

  // Lấy chi tiết 1 sản phẩm
  getProductById(id: string): Observable<ApiResponse<ProductItem>> {
    return this.http.get<ApiResponse<ProductItem>>(`${this.apiUrl}/${id}`);
  }

  // Tạo sản phẩm mới (chạy qua luồng File JSON -> MongoDB)
  createProduct(product: Partial<ProductItem>): Observable<ApiResponse<ProductItem>> {
    return this.http.post<ApiResponse<ProductItem>>(this.apiUrl, product).pipe(timeout({ first: 30000 }));
  }

  // Cập nhật sản phẩm (đồng bộ File JSON -> MongoDB)
  updateProduct(id: string, product: Partial<ProductItem>): Observable<ApiResponse<ProductItem>> {
    return this.http.put<ApiResponse<ProductItem>>(`${this.apiUrl}/${id}`, product).pipe(timeout({ first: 30000 }));
  }

  // Thay đổi nhanh trạng thái: active / inactive
  updateStatus(id: string, status: 'active' | 'inactive'): Observable<ApiResponse<ProductItem>> {
    return this.http.patch<ApiResponse<ProductItem>>(`${this.apiUrl}/${id}/status`, { status });
  }

  // Cập nhật nhanh số lượng tồn kho
  updateStock(id: string, stock: number): Observable<ApiResponse<ProductItem>> {
    return this.http.patch<ApiResponse<ProductItem>>(`${this.apiUrl}/${id}/stock`, { stock });
  }

  // Xóa sản phẩm
  deleteProduct(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  // Lấy danh mục sản phẩm kèm số lượng tác phẩm
  getCategories(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(this.categoriesApiUrl, {
      params: new HttpParams().set('source', 'verified').set('scope', 'admin')
    });
  }

  getCollections(): Observable<ApiResponse<CollectionItem[]>> {
    return this.http.get<ApiResponse<CollectionItem[]>>(`${this.apiRoot}/collections`, {
      params: new HttpParams().set('source', 'verified').set('scope', 'admin')
    });
  }
}

export { ProductService as Product };
