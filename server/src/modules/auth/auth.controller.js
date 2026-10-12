/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Auth Controller (auth.controller.js)
 * Phục vụ:
 *   - UC-C01: Đăng ký tài khoản khách hàng
 *   - UC-C02: Đăng nhập khách hàng
 *   - UC-A01: Đăng nhập quản trị viên (Admin)
 *   - UC-A01 E4: Quên mật khẩu & Đặt lại mật khẩu qua OTP
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../../models/User');
const { JWT_SECRET } = require('../../core/auth.middleware');

// Hàm tiện ích ký JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * [UC-C01] Đăng ký tài khoản Khách hàng
 */
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // 1. Kiểm tra thiếu thông tin (E2)
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu'
      });
    }

    // 2. Kiểm tra định dạng Email & Mật khẩu (E1)
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ email không đúng định dạng quy chuẩn'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên'
      });
    }

    // 3. Kiểm tra email đã tồn tại chưa (E2)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Địa chỉ email này đã được sử dụng bởi một tài khoản khác'
      });
    }

    // 4. Hash mật khẩu và tạo User mới
    const passwordHash = await User.hashPassword(password);
    const newUser = new User({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      passwordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE'
    });

    await newUser.save();

    // 5. Sinh JWT Token cho phiên đăng nhập mới
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Chào mừng bạn đến với Gốm Mộc.',
      token,
      data: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        avatar: newUser.avatar
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email hoặc số điện thoại đã tồn tại trong hệ thống'
      });
    }
    console.error('[TV1 Auth Error] Register:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng ký tài khoản: ' + error.message
    });
  }
};

/**
 * [UC-C02] Đăng nhập Khách hàng
 */
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier có thể là email hoặc số điện thoại

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email/số điện thoại và mật khẩu truy cập'
      });
    }

    // Tìm kiếm theo email hoặc số điện thoại (đồng thời lấy passwordHash)
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { phone: identifier.trim() }
      ]
    }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin tài khoản hoặc mật khẩu không chính xác'
      });
    }

    // Kiểm tra trạng thái khóa (UC-A04 E2)
    if (user.status === 'LOCKED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đang bị khóa hoặc tạm dừng. Vui lòng liên hệ hỗ trợ.'
      });
    }

    // So khớp mật khẩu đã hash với bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin tài khoản hoặc mật khẩu không chính xác'
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    console.error('[TV1 Auth Error] Login:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng nhập: ' + error.message
    });
  }
};

/**
 * [UC-A01] Đăng nhập dành cho Quản trị viên (Admin)
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ email và mật khẩu quản trị'
      });
    }

    const admin = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu quản trị không chính xác'
      });
    }

    // UC-A01 E3: Kiểm tra quyền quản trị
    if (admin.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập vào Cổng điều hành Quản trị viên Bát Tràng'
      });
    }

    if (admin.status === 'LOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản quản trị này đã bị đình chỉ'
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu quản trị không chính xác'
      });
    }

    const token = generateToken(admin);

    return res.status(200).json({
      success: true,
      message: 'Xác thực quản trị viên thành công. Chào mừng quay trở lại!',
      token,
      data: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar
      }
    });
  } catch (error) {
    console.error('[TV1 Auth Error] Admin Login:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng nhập Admin: ' + error.message
    });
  }
};

/**
 * [UC-A01 E4] Quên mật khẩu - Sinh mã OTP 6 số
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ email nhận OTP' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Vì lý do bảo mật, vẫn có thể thông báo chung hoặc báo đã gửi
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản tương ứng với email này' });
    }

    // Sinh mã OTP 6 chữ số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút hiệu lực

    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = expires;
    await user.save();

    // Giả lập gửi Email (Console Log để thầy cô / nhóm kiểm thử dễ dàng)
    console.log(`\n==================================================`);
    console.log(`[THÀNH VIÊN 1 - OTP FORGOT PASSWORD]`);
    console.log(`Email nhận: ${user.email}`);
    console.log(`MÃ OTP XÁC NHẬN (Hiệu lực 15 phút): >>> ${otp} <<<`);
    console.log(`==================================================\n`);

    return res.status(200).json({
      success: true,
      message: `Mã OTP xác thực đã được gửi về email ${email} (Hiệu lực trong 15 phút)`,
      // Gửi kèm OTP khi đang ở môi trường phát triển để test nhanh
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error('[TV1 Auth Error] Forgot Password:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi yêu cầu OTP' });
  }
};

/**
 * [UC-A01 E4] Đặt lại mật khẩu với OTP
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email, mã OTP và mật khẩu mới' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    }).select('+resetPasswordOtp +resetPasswordExpires +passwordHash');

    if (!user || user.resetPasswordOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác hoặc không hợp lệ' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hiệu lực. Vui lòng yêu cầu mã mới.' });
    }

    // Đặt lại mật khẩu mới
    user.passwordHash = await User.hashPassword(newPassword);
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập.'
    });
  } catch (error) {
    console.error('[TV1 Auth Error] Reset Password:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi đặt lại mật khẩu' });
  }
};

/**
 * [UC-C07] Lấy thông tin cá nhân của phiên đăng nhập hiện tại
 */
exports.getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user
  });
};
