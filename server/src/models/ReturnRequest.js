const mongoose = require('mongoose');

/**
 * 9. Collection returnRequests — Yêu cầu đổi trả
 * Theo tài liệu đặc tả Data Dictionary
 */
const returnRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Mã đơn hàng cần đổi trả là bắt buộc'],
    },
    items: {
      type: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
          },
          quantity: { type: Number, default: 1, min: 1 },
          reason: { type: String, default: '' },
        },
      ],
      validate: [v => Array.isArray(v) && v.length > 0, 'Phải có ít nhất một sản phẩm đổi trả'],
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Mã tài khoản gửi yêu cầu là bắt buộc'],
    },
    type: {
      type: String,
      required: [true, 'Loại yêu cầu là bắt buộc'],
      enum: {
        values: ['return', 'exchange'],
        message: 'Loại yêu cầu phải là return (trả hàng) hoặc exchange (đổi hàng)',
      },
    },
    reason: {
      type: String,
      required: [true, 'Lý do yêu cầu đổi trả là bắt buộc'],
      trim: true,
    },
    evidenceImages: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'approved', 'rejected', 'completed'],
        message: 'Trạng thái yêu cầu đổi trả không hợp lệ',
      },
      default: 'pending',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'returnRequests',
  }
);

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
