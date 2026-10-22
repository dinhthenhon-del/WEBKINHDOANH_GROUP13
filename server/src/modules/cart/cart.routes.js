const express = require('express');
const router = express.Router();
const cartController = require('./cart.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

// Áp dụng middleware xác thực token/phiên khách hàng cho toàn bộ route giỏ hàng
router.use(requireAuth);

// 1. Lấy thông tin giỏ hàng hiện tại (kèm giá thực tế, tồn kho và cờ khả dụng)
router.get('/', cartController.getCart);

// 2. Thêm sản phẩm vào giỏ hàng
router.post('/items', cartController.addItem);

// 3. Cập nhật số lượng của dòng sản phẩm
router.patch('/items/:itemId', cartController.updateItem);

// 4. Xóa một dòng sản phẩm khỏi giỏ hàng
router.delete('/items/:itemId', cartController.removeItem);

// 5. Xóa sạch giỏ hàng
router.delete('/', cartController.clearCart);

module.exports = router;
