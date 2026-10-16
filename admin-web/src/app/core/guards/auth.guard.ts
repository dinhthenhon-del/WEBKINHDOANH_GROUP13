import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const admin = localStorage.getItem('admin_user');
  if (admin) {
    try {
      const parsed = JSON.parse(admin);
      if (parsed && parsed.role === 'admin') {
        return true;
      }
    } catch (e) {
      localStorage.removeItem('admin_user');
    }
  }
  router.navigate(['/login']);
  return false;
};
