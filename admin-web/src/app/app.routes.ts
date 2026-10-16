import { Routes } from '@angular/router';
import { CustomerList } from './features/customers/customer-list/customer-list';
import { Login } from './features/auth/login/login';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'customers', component: CustomerList, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];