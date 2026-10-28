const mongoose = require('mongoose');

/**
 * 1. Collection accounts — Tài khoản
 * Theo tài liệu đặc tả Data Dictionary
 */
const accountSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Họ và tên người dùng là bắt buộc'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email đăng nhập là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Địa chỉ Email không hợp lệ'],
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại người dùng là bắt buộc'],
      unique: true,
      trim: true,
      match: [/^0[35789][0-9]{8}$/, 'Số điện thoại không hợp lệ (cần 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09)'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Mật khẩu băm là bắt buộc'],
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: ['customer', 'admin'],
        message: 'Role phải là customer hoặc admin',
      },
      default: 'customer',
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'blocked', 'inactive'],
        message: 'Trạng thái không hợp lệ',
      },
      default: 'active',
    },
    // Danh sách địa chỉ nhận hàng (Embedded)
    addresses: [
      {
        recipientName: { type: String, required: true },
        phone: { type: String, required: true },
        province: { type: String, required: true },
        ward: { type: String, required: true },
        detail: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
    // Danh sách ID sản phẩm yêu thích (Reference)
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
    collection: 'accounts',
  }
);

module.exports = mongoose.model('Account', accountSchema);
