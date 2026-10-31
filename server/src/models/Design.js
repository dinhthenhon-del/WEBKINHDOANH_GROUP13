const mongoose = require('mongoose');

/**
 * 5. Collection designs — Thiết kế tùy chỉnh 2D
 * Theo tài liệu đặc tả Data Dictionary
 */
const designSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Mã tài khoản tạo thiết kế là bắt buộc'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Mã sản phẩm được tùy chỉnh là bắt buộc'],
    },
    designName: {
      type: String,
      required: [true, 'Tên thiết kế tùy chỉnh là bắt buộc'],
      trim: true,
    },
    configuration: {
      baseColor: { type: String, default: '' },
      pattern: { type: String, default: '' },
      engravingText: {
        type: String,
        maxlength: [20, 'Nội dung tùy chỉnh tối đa 20 ký tự'],
        default: '',
      },
      engravingPosition: { type: String, default: '' },
    },
    previewImageUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'designs',
  }
);

module.exports = mongoose.model('Design', designSchema);
