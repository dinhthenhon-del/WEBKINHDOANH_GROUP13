import { Routes } from '@angular/router';
import { CustomerList } from './features/customers/customer-list/customer-list';
import { Login } from './features/auth/login/login';
import { authGuard } from './core/guards/auth.guard';
import { ProductList } from './features/products/product-list/product-list';
import { ProductForm } from './features/products/product-form/product-form';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'customers', component: CustomerList, canActivate: [authGuard] },
  { path: 'products', component: ProductList, canActivate: [authGuard] },
  { path: 'products/new', component: ProductForm, canActivate: [authGuard] },
  { path: 'products/edit/:id', component: ProductForm, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];