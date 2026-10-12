/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Middleware Xác thực Token JWT (auth.middleware.js)
 * Phục vụ:
 *   - Kiểm tra Token từ Header (Authorization: Bearer <token>)
 *   - Kiểm tra trạng thái tài khoản: LOCKED hoặc INACTIVE sẽ bị từ chối truy cập (UC-A04 E2)
 *   - Cung cấp thông tin req.user cho các API được bảo vệ của TV1, TV2, TV3, TV5
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'craftory_battrang_secret_key_2026';

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại trên hệ thống'
      });
    }

    // Kiểm tra tài khoản có bị khóa không (UC-A04 E2)
    if (user.status === 'LOCKED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa hoặc tạm dừng hoạt động. Vui lòng liên hệ quản trị viên.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Mã xác thực không hợp lệ'
    });
  }
};

module.exports = {
  verifyToken,
  JWT_SECRET
};
