const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';

/**
 * =========================================================================
 * MODULE: QUẢN LÝ ĐƠN HÀNG & GIAO DỊCH (ORDERS)
 * File: server/seed_orders.js
 * Thành viên phụ trách Module Đơn hàng chỉnh sửa và quản lý tại file này.
 * Chạy lệnh: node seed_orders.js
 * =========================================================================
 */
async function seedOrders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ [Module Orders] Đã kết nối MongoDB Atlas!');

    const Order = require('./src/models/Order');
    const Account = require('./src/models/Account');
    const Product = require('./src/models/Product');

    const customer = await Account.findOne({ phone: '0918345678' });
    const products = await Product.find({ status: 'active' });

    if (!customer || products.length < 2) {
      console.log('⚠️ Cần có sẵn tài khoản khách hàng và sản phẩm trước khi tạo đơn hàng.');
      process.exit(0);
    }

    const p1 = products[0];
    const p2 = products[1];

    const sampleOrders = [
      {
        orderCode: 'DH-BT1705-01',
        accountId: customer._id,
        items: [
          {
            productId: p1._id,
            productName: p1.name,
            unitPrice: p1.price,
            quantity: 1
          },
          {
            productId: p2._id,
            productName: p2.name,
            unitPrice: p2.price,
            quantity: 1
          }
        ],
        subtotal: p1.price + p2.price,
        shippingFee: 0,
        discount: 0,
        totalAmount: p1.price + p2.price,
        shippingAddress: {
          recipientName: customer.fullName || 'Nguyễn Hoàng Nam',
          phone: customer.phone || '0918345678',
          province: 'Hà Nội',
          ward: 'Gia Lâm',
          detail: 'Biệt thự số 12, Khu Đô Thị Ecopark, Bát Tràng'
        },
        status: 'delivered',
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        notes: 'Giao hàng tận nơi kèm chứng thư ấn son'
      },
      {
        orderCode: 'DH-BT1705-02',
        accountId: customer._id,
        items: [
          {
            productId: p1._id,
            productName: p1.name,
            unitPrice: p1.price,
            quantity: 2
          }
        ],
        subtotal: p1.price * 2,
        shippingFee: 0,
        discount: 0,
        totalAmount: p1.price * 2,
        shippingAddress: {
          recipientName: customer.fullName || 'Nguyễn Hoàng Nam',
          phone: customer.phone || '0918345678',
          province: 'Hà Nội',
          ward: 'Gia Lâm',
          detail: 'Biệt thự số 12, Khu Đô Thị Ecopark, Bát Tràng'
        },
        status: 'processing',
        paymentStatus: 'paid',
        paymentMethod: 'credit_card',
        notes: 'Đang nung củi hoàn thiện họa tiết cá nhân'
      }
    ];

    for (const ord of sampleOrders) {
      const existing = await Order.findOne({ orderCode: ord.orderCode });
      if (!existing) {
        await Order.create(ord);
        console.log(`➕ Đã tạo đơn hàng mẫu: ${ord.orderCode} (${ord.totalAmount.toLocaleString()}đ)`);
      } else {
        await Order.updateOne({ _id: existing._id }, { $set: ord });
        console.log(`🔄 Đã cập nhật đơn hàng mẫu: ${ord.orderCode}`);
      }
    }

    console.log('🎉 Hoàn thành seed dữ liệu Module Đơn hàng!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi seed orders:', err);
    process.exit(1);
  }
}

seedOrders();
