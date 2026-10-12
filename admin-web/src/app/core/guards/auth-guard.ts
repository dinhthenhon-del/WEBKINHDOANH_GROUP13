/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Auth Guard (core/guards/auth-guard.ts)
 * Phục vụ:
 *   - Bảo vệ toàn bộ các trang quản trị của Admin Web
 *   - Chặn người chưa đăng nhập hoặc không có token hợp lệ, chuyển về /login
 * ============================================================================
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.getToken()) {
    return true;
  }

  // Chưa đăng nhập, điều hướng về trang đăng nhập kèm url đích
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
