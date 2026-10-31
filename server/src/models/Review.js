const mongoose = require('mongoose');

/**
 * 8. Collection reviews — Đánh giá sản phẩm
 * Theo tài liệu đặc tả Data Dictionary
 */
const reviewSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Mã tài khoản gửi đánh giá là bắt buộc'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Mã sản phẩm được đánh giá là bắt buộc'],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Số sao đánh giá là bắt buộc'],
      min: [1, 'Đánh giá tối thiểu 1 sao'],
      max: [5, 'Đánh giá tối đa 5 sao'],
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'reviews',
  }
);

// Tránh việc 1 tài khoản đánh giá trùng nhiều lần trên cùng 1 sản phẩm nếu cần
reviewSchema.index({ accountId: 1, productId: 1, orderId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
