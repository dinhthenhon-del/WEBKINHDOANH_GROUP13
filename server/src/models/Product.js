const mongoose = require('mongoose');

/**
 * 3. Collection products — Sản phẩm
 * Theo tài liệu đặc tả Data Dictionary
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên sản phẩm là bắt buộc'],
      trim: true,
    },
    collectionName: {
      type: String,
      default: '',
      trim: true,
    },
    sku: {
      type: String,
      sparse: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    slug: {
      type: String,
      sparse: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Giá bán là bắt buộc'],
      min: [0, 'Giá bán phải lớn hơn hoặc bằng 0'],
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Số lượng tồn kho không được âm'],
      default: 0,
    },
    // Danh sách đường dẫn hình ảnh sản phẩm (lấy link URL trực tiếp từ web)
    images: {
      type: [String],
      default: [],
    },
    // Ảnh đại diện chính (tương thích API đơn giản)
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'inactive'],
        message: 'Trạng thái sản phẩm phải là active hoặc inactive',
      },
      default: 'active',
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

module.exports = mongoose.model('Product', productSchema);