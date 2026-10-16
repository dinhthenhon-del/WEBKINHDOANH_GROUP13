const mongoose = require('mongoose');

/**
 * 4. Collection carts — Giỏ hàng
 * Theo tài liệu đặc tả Data Dictionary
 */
const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Mã sản phẩm trong giỏ là bắt buộc'],
    },
    productName: {
      type: String,
      default: '',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Đơn giá không được âm'],
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Số lượng tối thiểu là 1'],
      default: 1,
    },
    designId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Design',
      default: null,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Mã tài khoản sở hữu giỏ hàng là bắt buộc'],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'carts',
  }
);

module.exports = mongoose.model('Cart', cartSchema);
