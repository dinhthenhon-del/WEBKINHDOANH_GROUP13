/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Auth Routes (auth.routes.js)
 * Endpoints:
 *   POST /api/auth/register          (UC-C01: Khách hàng đăng ký)
 *   POST /api/auth/login             (UC-C02: Khách hàng đăng nhập)
 *   POST /api/auth/admin/login       (UC-A01: Admin đăng nhập)
 *   POST /api/auth/forgot-password   (UC-A01 E4: Quên mật khẩu gửi OTP)
 *   POST /api/auth/reset-password    (UC-A01 E4: Đặt lại mật khẩu với OTP)
 *   GET  /api/auth/me                (UC-C07: Lấy thông tin user hiện tại)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verifyToken } = require('../../core/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// API yêu cầu Token
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
