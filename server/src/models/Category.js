const mongoose = require('mongoose');

/**
 * 2. Collection categories — Danh mục sản phẩm
 * Theo tài liệu đặc tả Data Dictionary
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên danh mục là bắt buộc'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    subTitle: {
      type: String,
      default: '',
      trim: true,
    },
    countText: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'inactive'],
        message: 'Trạng thái phải là active hoặc inactive',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'categories',
  }
);

module.exports = mongoose.model('Category', categorySchema);
