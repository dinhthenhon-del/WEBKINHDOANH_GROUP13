const ordersService = require('./orders.service');

/**
 * 1. GET /api/orders/admin/stats
 * Thống kê tổng quan đơn hàng
 */
async function getOrderStats(req, res) {
  try {
    const stats = await ordersService.getOrderStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê đơn hàng:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tải thống kê đơn hàng',
    });
  }
}

/**
 * 2. GET /api/orders/admin
 * Danh sách đơn hàng (phân trang, tìm kiếm, lọc)
 */
async function getOrders(req, res) {
  try {
    const result = await ordersService.getOrders(req.query);
    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn hàng:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tải danh sách đơn hàng',
    });
  }
}

/**
 * 3. GET /api/orders/admin/:id
 * Chi tiết đơn hàng
 */
async function getOrderById(req, res) {
  try {
    const order = await ordersService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đơn hàng',
      });
    }
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết đơn hàng:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tải chi tiết đơn hàng',
    });
  }
}

/**
 * 4. PATCH /api/orders/admin/:id/status
 * Cập nhật trạng thái đơn hàng (E1, E2)
 */
async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const updated = await ordersService.updateOrderStatus(req.params.id, status, req.admin);
    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng sang "${updated.orderStatus}" thành công`,
      data: updated,
    });
  } catch (error) {
    console.error('Lỗi đổi trạng thái đơn hàng:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật trạng thái đơn hàng',
    });
  }
}

/**
 * 5. PATCH /api/orders/admin/:id/cancel
 * Hủy đơn hàng và hoàn tồn kho (E3)
 */
async function cancelOrder(req, res) {
  try {
    const { reason } = req.body;
    const result = await ordersService.cancelOrder(req.params.id, reason, req.admin);
    return res.status(200).json({
      success: true,
      message: 'Đã hủy đơn hàng thành công và tự động khôi phục số lượng tồn kho sản phẩm',
      data: result,
    });
  } catch (error) {
    console.error('Lỗi hủy đơn hàng:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi khi hủy đơn hàng',
    });
  }
}

/**
 * ==========================================
 * CÁC CONTROLLER PHÍA KHÁCH HÀNG (UC-C06, UC-C07)
 * ==========================================
 */

/**
 * 6. POST /api/orders
 * Tạo đơn hàng từ giỏ hàng
 */
async function createCustomerOrder(req, res) {
  try {
    const accountId = req.accountId;
    const newOrder = await ordersService.createCustomerOrder(accountId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công! Minh Gốm trân trọng cảm ơn sự ủng hộ của quý khách.',
      data: newOrder,
    });
  } catch (error) {
    console.error('Lỗi tạo đơn hàng khách:', error);
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Không thể tạo đơn hàng',
      fieldErrors: error.fieldErrors || undefined,
      priceChanges: error.priceChanges || undefined,
      stockShortages: error.stockShortages || undefined,
    });
  }
}

/**
 * 7. GET /api/orders/my
 * Danh sách đơn hàng của khách hàng (phân trang, lọc theo status)
 */
async function getMyOrders(req, res) {
  try {
    const accountId = req.accountId;
    const result = await ordersService.getMyOrders(accountId, req.query);
    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Lỗi lấy đơn hàng của tôi:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi tải danh sách đơn hàng',
    });
  }
}

/**
 * 8. GET /api/orders/my/:id
 * Chi tiết đơn hàng của khách hàng
 */
async function getMyOrderById(req, res) {
  try {
    const accountId = req.accountId;
    const order = await ordersService.getMyOrderById(accountId, req.params.id);
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết đơn hàng của tôi:', error);
    return res.status(error.status || 404).json({
      success: false,
      message: error.message || 'Không tìm thấy thông tin đơn hàng',
    });
  }
}

/**
 * 9. PATCH /api/orders/my/:id/cancel
 * Khách hàng tự hủy đơn hàng PENDING
 */
async function cancelMyOrder(req, res) {
  try {
    const accountId = req.accountId;
    const { reason } = req.body || {};
    const cancelled = await ordersService.cancelMyOrder(accountId, req.params.id, reason);
    return res.status(200).json({
      success: true,
      message: 'Hủy đơn hàng thành công. Số lượng sản phẩm đã được hoàn lại kho.',
      data: cancelled,
    });
  } catch (error) {
    console.error('Lỗi khách hủy đơn hàng:', error);
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Không thể hủy đơn hàng vào lúc này',
      currentStatus: error.currentStatus || undefined,
    });
  }
}

/**
 * 10. PATCH /api/orders/my/:id/pay-notify
 * Khách hàng báo đã thanh toán MoMo / Chuyển khoản (UNPAID -> AWAITING_VERIFICATION)
 */
async function notifyCustomerPaid(req, res) {
  try {
    const accountId = req.accountId;
    const { transactionCode, note } = req.body || {};
    const updated = await ordersService.notifyCustomerPaid(accountId, req.params.id, { transactionCode, note });
    return res.status(200).json({
      success: true,
      message: 'Đã ghi nhận thông báo thanh toán thành công. Minh Gốm sẽ đối soát và xác nhận đơn hàng của quý khách.',
      data: updated,
    });
  } catch (error) {
    console.error('Lỗi thông báo thanh toán:', error);
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Không thể gửi thông báo thanh toán',
    });
  }
}

/**
 * 11. PATCH /api/orders/admin/:id/payment
 * Admin xác nhận hoặc đổi trạng thái thanh toán (PAID, UNPAID, ...)
 */
async function confirmPayment(req, res) {
  try {
    const { status, note } = req.body || {};
    const updated = await ordersService.confirmPayment(req.params.id, {
      status,
      note,
      adminUser: req.admin,
    });
    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái thanh toán sang "${updated.paymentStatus}" thành công`,
      data: updated,
    });
  } catch (error) {
    console.error('Lỗi xác nhận thanh toán admin:', error);
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Lỗi cập nhật trạng thái thanh toán',
    });
  }
}

module.exports = {
  getOrderStats,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  confirmPayment,
  // Phía khách hàng
  createCustomerOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  notifyCustomerPaid,
};

