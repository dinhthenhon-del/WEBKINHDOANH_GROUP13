/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Mô hình dữ liệu Người dùng / Tài khoản (User Schema)
 * Phục vụ:
 *   - UC-C01: Đăng ký tài khoản (email, phone, fullName, password)
 *   - UC-C02: Đăng nhập khách hàng
 *   - UC-A01: Đăng nhập quản trị viên & Quên mật khẩu OTP
 *   - UC-A04: Quản lý khách hàng (Role, Status: ACTIVE / LOCKED / INACTIVE)
 *   - UC-C07: Quản lý sổ địa chỉ (addresses)
 *   - Tích hợp sẵn Wishlist cho TV2
 * ============================================================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const addressSchema = new mongoose.Schema({
  recipientName: { type: String, trim: true },
  phone: { type: String, trim: true },
  province: { type: String, trim: true },
  ward: { type: String, trim: true },
  addressDetail: { type: String, trim: true },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Họ tên là bắt buộc'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không đúng định dạng']
  },
  phone: {
    type: String,
    trim: true,
    sparse: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Mật khẩu đã mã hóa là bắt buộc'],
    select: false // Bảo mật UC-A04 E1: không tự động trả mật khẩu ra frontend
  },
  role: {
    type: String,
    enum: ['CUSTOMER', 'ADMIN'],
    default: 'CUSTOMER',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'LOCKED', 'INACTIVE'],
    default: 'ACTIVE',
    uppercase: true
  },
  avatar: {
    type: String,
    default: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOcs5LcnujnUJQh8uk1tcbCEb8hHUsgJQu5MdSKJRejGOXfE-X7AidhlMhEg_6DWeLPxr8sXo9wvqW4z-U-w6vNsFwyV8Hl5ECIyx5MnDvxHw7yT3ICN-CaREbRTi_PukRQcPrLk3s3sk-uaUjbPkRviW2OVpfUlkTTSvLvK-SPogJrSZD1Xyq4FWNnEpIyb02n9V574ZwGz77BNZ4128a1lSAxsDpfCwgoYPrQn0NXchu9FhpXWuJ'
  },
  avatarPublicId: {
    type: String
  },
  // Trường phục vụ mã hiển thị theo Stitch Mockup (ví dụ KH-001) & hạng thành viên
  customerCode: {
    type: String,
    trim: true
  },
  membershipTier: {
    type: String,
    default: 'Thành viên Thân thiết'
  },
  // Lý do khóa tài khoản theo BRD-16-07
  banReason: {
    type: String,
    trim: true
  },
  // Cơ chế xóa mềm theo BRD-16-08
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },

  // Sổ địa chỉ giao hàng của khách hàng (UC-C07, phục vụ TV3 Checkout)
  addresses: [addressSchema],

  // Danh sách sản phẩm yêu thích (Wishlist UC-C10 - Phục vụ TV2)
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

  // Cơ chế OTP khôi phục mật khẩu Admin / Customer (UC-A01 E4)
  resetPasswordOtp: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// So khớp mật khẩu đăng nhập với chuỗi Bcrypt đã băm
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Phương thức tiện ích tạo mật khẩu hash
userSchema.statics.hashPassword = async function(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

module.exports = mongoose.model('User', userSchema);
