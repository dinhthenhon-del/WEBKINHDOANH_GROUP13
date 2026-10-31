const mongoose = require('mongoose');

/**
 * 7. Collection payments — Thanh toán
 * Theo tài liệu đặc tả Data Dictionary
 */
const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Mã đơn hàng là bắt buộc'],
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Mã tài khoản thanh toán là bắt buộc'],
    },
    method: {
      type: String,
      required: [true, 'Phương thức thanh toán là bắt buộc'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Số tiền thanh toán là bắt buộc'],
      min: [1, 'Số tiền thanh toán phải lớn hơn 0'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'awaiting_verification', 'success', 'paid', 'failed', 'refunded', 'partially_refunded'],
        message: 'Trạng thái thanh toán không hợp lệ',
      },
      default: 'pending',
    },
    transactionCode: {
      type: String,
      default: null,
      sparse: true,
      trim: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
