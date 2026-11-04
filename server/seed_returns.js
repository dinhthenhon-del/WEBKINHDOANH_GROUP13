const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const DEFAULT_MONGO_URI = 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';
const MONGO_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

/**
 * =========================================================================
 * MODULE: QUẢN LÝ ĐỔI TRẢ HÀNG (RETURNS & EXCHANGES - UC-A05)
 * File: server/seed_returns.js
 * Thành viên 5 phụ trách Module Đổi Trả & Dashboard.
 * Chạy lệnh: node seed_returns.js --apply
 * =========================================================================
 */
async function seedReturns() {
  const isApply = process.argv.includes('--apply');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ [Module Returns] Đã kết nối MongoDB Atlas!');

    const ReturnRequest = require('./src/models/ReturnRequest');
    const Order = require('./src/models/Order');
    const Account = require('./src/models/Account');
    const Product = require('./src/models/Product');

    const customer = await Account.findOne({ role: 'customer' }) || await Account.findOne();
    const admin = await Account.findOne({ role: 'admin' }) || customer;
    const products = await Product.find({ status: 'active' }).limit(5);

    if (!customer) {
      console.log('⚠️ Cần có tài khoản khách hàng trong DB trước khi tạo yêu cầu đổi trả.');
      process.exit(0);
    }

    // Đảm bảo có các đơn hàng mẫu tương ứng
    const sampleReturnConfigs = [
      {
        orderCode: 'DH002891',
        type: 'exchange',
        reason: 'Nứt rạn cổ bình do va đập trong quá trình vận chuyển bưu cục',
        productName: 'Bình Hút Lộc Men Lam Vẽ Vàng "Thuận Buồm Xuôi Gió"',
        sku: 'SP-ML-BHL-0982',
        price: 2450000,
        status: 'pending',
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/1_copy_5d87cfc2a83249b8b5cb1ac6361fe4a9.jpg',
          'https://cdn.hstatic.net/products/200000532849/09566-sm-01_97a799184d634103bdfcdb924226920f.png',
          'https://cdn.hstatic.net/products/200000532849/2_copy_f94062bbe86942e8a9dd32372206dbb8.jpg'
        ]
      },
      {
        orderCode: 'DH002884',
        type: 'exchange',
        reason: 'Nứt quai ấm khi mở hộp kiện hàng',
        productName: 'Bộ Ấm Chén Men Rạn Hoàng Gia Bát Tràng',
        sku: 'SP-MR-ACH-0412',
        price: 1850000,
        status: 'approved',
        processedBy: admin ? admin._id : null,
        processedAt: new Date(Date.now() - 3 * 86400000),
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/3_copy_2a0b65fe2bb044f09aa266ade498aaa1.jpg'
        ]
      },
      {
        orderCode: 'DH002770',
        type: 'return',
        reason: 'Khiếu nại đổi trả sau 16 ngày nhận sản phẩm',
        productName: 'Đĩa Cảnh Men Lam Cổ Bát Tràng',
        sku: 'SP-ML-DC-0118',
        price: 950000,
        status: 'rejected',
        rejectionReason: 'Đã quá thời hạn đổi trả theo quy định bảo hành gốm Thanh Xuân (quá 7 ngày)',
        processedBy: admin ? admin._id : null,
        processedAt: new Date(Date.now() - 5 * 86400000),
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/4_copy_4a967246f2d94063aeec188cb3470345.jpg'
        ]
      },
      {
        orderCode: 'DH002875',
        type: 'exchange',
        reason: 'Lỗi nung bọt khí dày đặc ở đáy lư hương',
        productName: 'Lư Hương Gốm Men Ngọc Cổ Truyền',
        sku: 'SP-MN-LH-0056',
        price: 1200000,
        status: 'pending',
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/09566-sm-05_d47d7aaeeb9b46128a704f1317693877.png'
        ]
      },
      {
        orderCode: 'DH002860',
        type: 'return',
        reason: 'Giao nhầm dung tích ấm trà so với mô tả đơn đặt hàng',
        productName: 'Bộ Trà Tử Sa Thanh Xuân Cổ Thạch',
        sku: 'SP-TS-TX-0899',
        price: 1650000,
        status: 'completed',
        processedBy: admin ? admin._id : null,
        processedAt: new Date(Date.now() - 7 * 86400000),
        evidenceImages: [
          'https://cdn.hstatic.net/products/200000532849/09566-sm-04_7b57f70450da46b2ad66937d93644c86.png'
        ]
      }
    ];

    console.log(`Tìm thấy ${sampleReturnConfigs.length} cấu hình yêu cầu đổi trả mẫu theo thiết kế Stitch.`);

    if (!isApply) {
      console.log('ℹ️ CHẾ ĐỘ XEM TRƯỚC (Dry Run). Để ghi vào MongoDB Atlas, chạy: node seed_returns.js --apply');
      process.exit(0);
    }

    for (const cfg of sampleReturnConfigs) {
      // 1. Tìm hoặc tạo Order tương ứng
      let order = await Order.findOne({ orderCode: cfg.orderCode });
      const chosenProduct = products.length ? products[0] : null;
      const prodId = chosenProduct ? chosenProduct._id : new mongoose.Types.ObjectId();

      if (!order) {
        order = await Order.create({
          orderCode: cfg.orderCode,
          accountId: customer._id,
          items: [
            {
              productId: prodId,
              productName: cfg.productName,
              unitPrice: cfg.price,
              quantity: 1
            }
          ],
          subtotal: cfg.price,
          shippingFee: 0,
          discount: 0,
          totalAmount: cfg.price,
          shippingAddress: {
            recipientName: customer.fullName || 'Nguyễn Văn An',
            phone: customer.phone || '0912345678',
            province: 'Hà Nội',
            ward: 'Hoàn Kiếm',
            detail: 'Phố Cổ, Hoàn Kiếm, Hà Nội'
          },
          paymentStatus: 'paid',
          orderStatus: 'completed'
        });
        console.log(`  + Đã tạo Order liên kết: ${cfg.orderCode}`);
      }

      // 2. Tìm hoặc tạo ReturnRequest tương ứng
      const existingReturn = await ReturnRequest.findOne({ orderId: order._id });
      if (!existingReturn) {
        await ReturnRequest.create({
          orderId: order._id,
          accountId: customer._id,
          items: [
            {
              productId: prodId,
              quantity: 1,
              reason: cfg.reason
            }
          ],
          type: cfg.type,
          reason: cfg.reason,
          evidenceImages: cfg.evidenceImages,
          status: cfg.status,
          processedBy: cfg.processedBy || null,
          processedAt: cfg.processedAt || null,
          rejectionReason: cfg.rejectionReason || null
        });
        console.log(`  + Đã tạo ReturnRequest cho đơn: ${cfg.orderCode} (${cfg.type} - ${cfg.status})`);
      } else {
        console.log(`  ~ ReturnRequest cho đơn ${cfg.orderCode} đã tồn tại, bỏ qua.`);
      }
    }

    console.log('🎉 Hoàn tất seed dữ liệu Đổi / Trả hàng thành công!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi seed returns:', err);
    process.exit(1);
  }
}

seedReturns();
