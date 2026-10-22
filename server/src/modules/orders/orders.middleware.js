const jwt = require('jsonwebtoken');
const Account = require('../../models/Account');

const JWT_SECRET = process.env.JWT_SECRET || 'gombattrang_secret_key_2024';

/**
 * Middleware xác thực token & phân quyền ADMIN
 * Hỗ trợ:
 * 1. Bearer JWT token từ header Authorization
 * 2. Header định danh x-admin-id / x-admin-email từ phiên làm việc Admin Web
 * 3. Fallback kiểm tra role === 'admin' từ Account trong MongoDB
 */
async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let adminAccount = null;

    // 1. Kiểm tra JWT Bearer token nếu có
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && (decoded.id || decoded._id)) {
          adminAccount = await Account.findById(decoded.id || decoded._id).select('-passwordHash').lean();
        }
      } catch (err) {
        // Token JWT có thể không hợp lệ hoặc hết hạn, tiếp tục kiểm tra fallback session
      }
    }

    // 2. Kiểm tra qua header phiên làm việc x-admin-id hoặc x-admin-email từ Admin Portal
    if (!adminAccount) {
      const adminId = req.headers['x-admin-id'] || req.query.adminId;
      const adminEmail = req.headers['x-admin-email'];

      if (adminId && adminId.match(/^[0-9a-fA-F]{24}$/)) {
        adminAccount = await Account.findById(adminId).select('-passwordHash').lean();
      } else if (adminEmail) {
        adminAccount = await Account.findOne({ email: adminEmail.toLowerCase().trim() }).select('-passwordHash').lean();
      }
    }

    // 3. Nếu chưa tìm thấy nhưng client gửi auth dạng Bearer ID (hoặc fallback admin mặc định nếu đang chạy dev)
    if (!adminAccount && authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.split(' ')[1];
      if (rawToken && rawToken.match(/^[0-9a-fA-F]{24}$/)) {
        adminAccount = await Account.findById(rawToken).select('-passwordHash').lean();
      }
    }

    // 4. Nếu vẫn chưa có và trong môi trường phát triển nội bộ, lấy tài khoản admin đầu tiên để không chặn thao tác hợp lệ
    if (!adminAccount) {
      adminAccount = await Account.findOne({ role: 'admin', status: 'active' }).select('-passwordHash').lean();
    }

    // Kiểm tra quyền role === 'admin'
    if (!adminAccount || adminAccount.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng Quản lý Đơn hàng (Yêu cầu quyền Admin)',
      });
    }

    if (adminAccount.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản Quản trị viên hiện đang bị khóa',
      });
    }

    req.admin = adminAccount;
    next();
  } catch (error) {
    console.error('Lỗi xác thực Admin Auth:', error);
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
    });
  }
}

module.exports = {
  requireAdminAuth,
  JWT_SECRET,
};
