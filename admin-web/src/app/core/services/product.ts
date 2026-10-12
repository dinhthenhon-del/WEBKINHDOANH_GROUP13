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
  imagePublicId?: string;
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

  // Tạo sản phẩm mới (hỗ trợ đính kèm file ảnh upload lên Cloudinary)
  createProduct(product: Partial<ProductItem>, file?: File): Observable<ApiResponse<ProductItem>> {
    const formData = new FormData();
    formData.append('name', product.name || '');
    formData.append('price', String(product.price || 0));
    formData.append('stock', String(product.stock || 0));
    if (product.description) {
      formData.append('description', product.description);
    }
    if (file) {
      formData.append('image', file);
    }
    return this.http.post<ApiResponse<ProductItem>>(this.apiUrl, formData);
  }

  // Cập nhật sản phẩm (hỗ trợ đổi ảnh mới)
  updateProduct(id: string, product: Partial<ProductItem>, file?: File): Observable<ApiResponse<ProductItem>> {
    const formData = new FormData();
    if (product.name) formData.append('name', product.name);
    if (product.price !== undefined) formData.append('price', String(product.price));
    if (product.stock !== undefined) formData.append('stock', String(product.stock));
    if (product.description) formData.append('description', product.description);
    if (file) {
      formData.append('image', file);
    }
    return this.http.put<ApiResponse<ProductItem>>(`${this.apiUrl}/${id}`, formData);
  }

  // Xóa sản phẩm (Backend sẽ tự xóa luôn ảnh trên Cloudinary)
  deleteProduct(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}

export { ProductService as Product };

