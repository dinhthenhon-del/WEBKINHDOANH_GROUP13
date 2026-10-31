import { Routes } from '@angular/router';
import { CustomerList } from './features/customers/customer-list/customer-list';
import { Login } from './features/auth/login/login';
import { authGuard } from './core/guards/auth.guard';
import { ProductList } from './features/products/product-list/product-list';
import { ProductForm } from './features/products/product-form/product-form';
import { Dashboard } from './features/dashboard/dashboard';
import { Returns } from './features/returns/returns';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'returns', component: Returns, canActivate: [authGuard] },
  { path: 'customers', component: CustomerList, canActivate: [authGuard] },
  { path: 'products', component: ProductList, canActivate: [authGuard] },
  { path: 'products/new', component: ProductForm, canActivate: [authGuard] },
  { path: 'products/edit/:id', component: ProductForm, canActivate: [authGuard] },
  {
    path: 'orders',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/orders/order-dashboard/order-dashboard').then((m) => m.OrderDashboard) },
      { path: 'list', loadComponent: () => import('./features/orders/order-list/order-list').then((m) => m.OrderList) },
      { path: ':id', loadComponent: () => import('./features/orders/order-detail/order-detail').then((m) => m.OrderDetail) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' }
];