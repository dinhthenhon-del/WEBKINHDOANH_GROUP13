/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Users Routes (users.routes.js)
 * Endpoints:
 *   PUT    /api/users/profile           (UC-C07: Cập nhật thông tin tài khoản)
 *   POST   /api/users/addresses         (UC-C07: Thêm địa chỉ nhận hàng)
 *   DELETE /api/users/addresses/:id     (UC-C07: Xóa địa chỉ)
 *
 *   GET    /api/users/admin/customers       (UC-A04: Danh sách khách hàng trên Admin)
 *   GET    /api/users/admin/customers/:id   (UC-A04: Xem chi tiết khách hàng)
 *   PATCH  /api/users/admin/customers/:id/status (UC-A04 E2: Khóa/Mở khóa tài khoản)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { verifyToken } = require('../../core/auth.middleware');
const { requireAdmin } = require('../../core/role.middleware');

const { upload } = require('../../core/cloudinary');

// Các route cho khách hàng / tài khoản cá nhân (Yêu cầu đăng nhập)
router.put('/profile', verifyToken, upload.single('avatar'), usersController.updateProfile);
router.post('/profile/avatar', verifyToken, upload.single('avatar'), usersController.uploadAvatar);
router.post('/avatar', verifyToken, upload.single('avatar'), usersController.uploadAvatar);
router.post('/addresses', verifyToken, usersController.addAddress);
router.delete('/addresses/:addressId', verifyToken, usersController.deleteAddress);

// Các route cho Admin (Yêu cầu quyền ADMIN)
router.get('/admin/customers', verifyToken, requireAdmin, usersController.getAdminCustomers);
router.get('/admin/customers/:id', verifyToken, requireAdmin, usersController.getCustomerDetail);
router.post('/admin/customers/:id/avatar', verifyToken, requireAdmin, upload.single('avatar'), usersController.adminUploadCustomerAvatar);
router.patch('/admin/customers/:id/status', verifyToken, requireAdmin, usersController.updateCustomerStatus);
router.delete('/admin/customers/:id', verifyToken, requireAdmin, usersController.softDeleteCustomer);
router.post('/admin/customers/:id/reset-password', verifyToken, requireAdmin, usersController.triggerResetPassword);

module.exports = router;
