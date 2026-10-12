import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // [THÀNH VIÊN 1] Trang Đăng nhập Quản trị
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },

  // [THÀNH VIÊN 1] Quản lý Khách hàng & Tài khoản
  {
    path: 'customers',
    canActivate: [authGuard],
    loadComponent: () => import('./features/customers/customer-list/customer-list').then(m => m.CustomerList)
  },

  // [THÀNH VIÊN 5] Bảng điều khiển Tổng quan & Thống kê
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
  },

  // [THÀNH VIÊN 2] Quản lý Sản phẩm & Tồn kho
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () => import('./features/products/product-list/product-list').then(m => m.ProductList)
  },

  // [THÀNH VIÊN 3] Quản lý Đơn hàng
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/order-list/order-list').then(m => m.OrderList)
  },

  // Điều hướng mặc định
  {
    path: '',
    redirectTo: 'customers',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'customers'
  }
];