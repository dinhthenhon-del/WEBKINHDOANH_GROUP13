const express = require('express');
const router = express.Router();
const ordersController = require('./orders.controller');
const { requireAdminAuth } = require('./orders.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');

// ==========================================
// CÁC ROUTE PHÍA KHÁCH HÀNG (UC-C06, UC-C07)
// Đặt các route /my trước các route có tham số trùng
// ==========================================

// 1. Tạo đơn hàng từ giỏ hàng (UC-C06)
router.post('/', requireAuth, ordersController.createCustomerOrder);

// 2. Danh sách đơn hàng của khách hàng (UC-C07)
router.get('/my', requireAuth, ordersController.getMyOrders);

// 3. Chi tiết đơn hàng của khách hàng
router.get('/my/:id', requireAuth, ordersController.getMyOrderById);

// 4. Khách hàng tự hủy đơn hàng PENDING
router.patch('/my/:id/cancel', requireAuth, ordersController.cancelMyOrder);

// ==========================================
// CÁC ROUTE QUẢN TRỊ ADMIN (UC-A03 - GIỮ NGUYÊN)
// ==========================================
// Tất cả các route quản trị đều qua middleware xác thực quyền Admin
router.use('/admin', requireAdminAuth);

// 1. Thống kê số liệu đơn hàng (Đặt trước /:id để tránh trùng khớp pattern URL)
router.get('/admin/stats', ordersController.getOrderStats);

// 2. Danh sách đơn hàng phía Admin (phân trang, tìm kiếm, lọc)
router.get('/admin', ordersController.getOrders);

// 3. Chi tiết đơn hàng
router.get('/admin/:id', ordersController.getOrderById);

// 4. Cập nhật trạng thái tuần tự theo quy trình
router.patch('/admin/:id/status', ordersController.updateOrderStatus);

// 5. Hủy đơn hàng và tự động hoàn tồn kho
router.patch('/admin/:id/cancel', ordersController.cancelOrder);

module.exports = router;
