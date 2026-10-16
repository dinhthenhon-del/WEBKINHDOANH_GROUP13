const mongoose = require('mongoose');

/**
 * Collection collections — Bộ sưu tập sản phẩm (Nếu cần quản lý danh mục bộ sưu tập độc lập)
 */
const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên bộ sưu tập là bắt buộc'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'collections',
  }
);

module.exports = mongoose.model('Collection', collectionSchema);
