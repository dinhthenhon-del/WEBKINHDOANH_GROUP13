const jwt = require('jsonwebtoken');
const Account = require('../models/Account');

const JWT_SECRET = process.env.JWT_SECRET || 'gombattrang_secret_key_2024';

/**
 * Middleware xác thực khách hàng (Customer Auth)
 * Lấy accountId từ Token (JWT hoặc Bearer ID), hoặc x-account-id
 * Đảm bảo tài khoản tồn tại và không bị khóa
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let accountId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1].trim();
      // Thử giải mã JWT
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && (decoded.id || decoded._id || decoded.accountId)) {
          accountId = decoded.id || decoded._id || decoded.accountId;
        }
      } catch (e) {
        // Nếu không phải JWT, kiểm tra xem có phải 24 ký tự hex ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(token)) {
          accountId = token;
        }
      }
    }

    if (!accountId) {
      const headerId = req.headers['x-account-id'] || req.headers['x-user-id'];
      if (headerId && /^[0-9a-fA-F]{24}$/.test(headerId)) {
        accountId = headerId;
      }
    }

    if (!accountId && req.body && req.body.accountId && /^[0-9a-fA-F]{24}$/.test(req.body.accountId)) {
      accountId = req.body.accountId;
    }

    if (!accountId && req.query && req.query.accountId && /^[0-9a-fA-F]{24}$/.test(req.query.accountId)) {
      accountId = req.query.accountId;
    }

    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để thực hiện thao tác này',
      });
    }

    const account = await Account.findById(accountId).select('-passwordHash').lean();

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc phiên đăng nhập đã hết hạn',
      });
    }

    if (account.status === 'blocked') {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: 'Tài khoản của bạn hiện tại đã bị khóa',
      });
    }

    req.accountId = account._id;
    req.account = account;
    req.user = account;
    next();
  } catch (error) {
    console.error('Lỗi xác thực người dùng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực hệ thống: ' + error.message,
    });
  }
}

module.exports = {
  requireAuth,
};
