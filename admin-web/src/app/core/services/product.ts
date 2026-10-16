import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductItem {
  _id?: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/products';

  // Lấy tất cả sản phẩm
  getProducts(): Observable<ApiResponse<ProductItem[]>> {
    return this.http.get<ApiResponse<ProductItem[]>>(this.apiUrl);
  }

  // Lấy chi tiết 1 sản phẩm
  getProductById(id: string): Observable<ApiResponse<ProductItem>> {
    return this.http.get<ApiResponse<ProductItem>>(`${this.apiUrl}/${id}`);
  }

  // Tạo sản phẩm mới
  createProduct(product: Partial<ProductItem>): Observable<ApiResponse<ProductItem>> {
    return this.http.post<ApiResponse<ProductItem>>(this.apiUrl, product);
  }

  // Cập nhật sản phẩm
  updateProduct(id: string, product: Partial<ProductItem>): Observable<ApiResponse<ProductItem>> {
    return this.http.put<ApiResponse<ProductItem>>(`${this.apiUrl}/${id}`, product);
  }

  // Xóa sản phẩm
  deleteProduct(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}

export { ProductService as Product };

