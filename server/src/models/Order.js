const mongoose = require('mongoose');

/**
 * 6. Collection orders — Đơn hàng
 * Theo tài liệu đặc tả Data Dictionary
 */
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    designSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    customization: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    province: { type: String, required: true },
    ward: { type: String, required: true },
    detail: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: [true, 'Mã đơn hàng là bắt buộc'],
      unique: true,
      trim: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [v => Array.isArray(v) && v.length > 0, 'Đơn hàng phải có ít nhất 1 sản phẩm'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    paymentMethod: {
      type: String,
      default: 'COD',
      trim: true,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'paid', 'failed', 'refunded'],
        message: 'Trạng thái thanh toán không hợp lệ',
      },
      default: 'pending',
    },
    orderStatus: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'confirmed', 'processing', 'shipping', 'completed', 'cancelled'],
        message: 'Trạng thái đơn hàng không hợp lệ',
      },
      default: 'pending',
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        changedBy: { type: String, default: 'Admin' },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

module.exports = mongoose.model('Order', orderSchema);
