/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Middleware Phân quyền Role (role.middleware.js)
 * Phục vụ:
 *   - UC-A01 E3: Kiểm tra quyền truy cập Admin (role = 'ADMIN')
 *   - Chặn người dùng thường (CUSTOMER) truy cập API quản trị
 * ============================================================================
 */

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu xác thực tài khoản trước khi truy cập'
      });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const hasRole = allowedRoles.some(r => r.toUpperCase() === userRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác quản trị này (Yêu cầu quyền: ' + allowedRoles.join(', ') + ')'
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireAdmin: requireRole('ADMIN')
};
