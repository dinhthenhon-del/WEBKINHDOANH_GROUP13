const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DEFAULT_MONGO_URI =
  'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';
const MONGO_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

/**
 * =========================================================================
 * SCRIPT DI CHUYỂN DỮ LIỆU: MIGRATION PAYMENT STATUS CHO ĐƠN HÀNG COMPLETED
 * File: server/src/scripts/migrate_payment_status.js
 * 
 * Mục đích (Lỗi 3, Quy tắc 7):
 * Rà soát các đơn hàng cũ đã COMPLETED mà paymentStatus còn 'pending' (chưa PAID)
 * và chuẩn hóa sang 'paid' kèm lịch sử đối soát hợp lệ.
 * 
 * NGUYÊN TẮC AN TOÀN:
 * 1. Mặc định CHỈ CHẠY DRY-RUN (Xem trước số lượng, KHÔNG ghi vào DB).
 * 2. Để áp dụng thực tế, bắt buộc truyền cả 2 cờ:
 *    --apply --confirm-db=<TEN_DATABASE>
 *    (Ví dụ: node src/scripts/migrate_payment_status.js --apply --confirm-db=craftory-ecommerce-cluster)
 * =========================================================================
 */
async function migratePaymentStatus() {
  const isApply = process.argv.includes('--apply');
  const confirmDbArg = process.argv.find((arg) => arg.startsWith('--confirm-db='));
  const confirmDbName = confirmDbArg ? confirmDbArg.split('=')[1] : null;

  console.log('=================================================================');
  console.log('  CÔNG CỤ DI CHUYỂN DỮ LIỆU THANH TOÁN (PAYMENT STATUS MIGRATION)');
  console.log('=================================================================');
  console.log(`Chế độ: ${isApply ? '🔥 ÁP DỤNG THỰC TẾ (--apply)' : '🔍 XEM TRƯỚC (DRY-RUN - Mặc định)'}`);

  try {
    await mongoose.connect(MONGO_URI);
    const dbName = mongoose.connection.name || 'admin';
    console.log(`✅ Đã kết nối cơ sở dữ liệu: [${dbName}]`);

    const Order = require('../models/Order');
    const Payment = require('../models/Payment');

    // Tìm các đơn hàng COMPLETED mà paymentStatus chưa phải 'paid'
    const targetOrders = await Order.find({
      $or: [
        { orderStatus: 'completed' },
        { status: { $in: ['completed', 'COMPLETED', 'delivered'] } },
      ],
      paymentStatus: { $ne: 'paid' },
    }).lean();

    console.log(`\n📊 KẾT QUẢ RÀ SOÁT:`);
    console.log(`- Tổng số đơn hàng COMPLETED chưa có trạng thái PAID: ${targetOrders.length} đơn`);

    if (targetOrders.length === 0) {
      console.log('✨ Tuyệt vời! Toàn bộ đơn hàng COMPLETED trong hệ thống đều đã có trạng thái thanh toán hợp lệ (PAID).');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('\nDanh sách các đơn cần xử lý:');
    targetOrders.forEach((o, idx) => {
      console.log(
        `  ${idx + 1}. Mã đơn: ${o.orderCode} | Tổng tiền: ${Number(o.totalAmount || 0).toLocaleString('vi-VN')}₫ | Phương thức: ${o.paymentMethod || 'COD'} | Trạng thái hiện tại: [${o.paymentStatus || 'pending'}]`
      );
    });

    if (!isApply) {
      console.log('\n-----------------------------------------------------------------');
      console.log('⚠️  ĐÂY LÀ CHẾ ĐỘ XEM TRƯỚC (DRY-RUN). CHƯA CÓ DỮ LIỆU NÀO BỊ THAY ĐỔI.');
      console.log('👉 Để thực hiện cập nhật thực tế vào cơ sở dữ liệu, hãy chạy lệnh:');
      console.log(`   node src/scripts/migrate_payment_status.js --apply --confirm-db=${dbName}`);
      console.log('-----------------------------------------------------------------\n');
      await mongoose.disconnect();
      return;
    }

    // Kiểm tra cờ xác nhận tên database để tránh chạy nhầm môi trường
    if (!confirmDbName || confirmDbName.trim() !== dbName.trim()) {
      console.error('\n❌ LỖI BẢO MẬT: Tên cơ sở dữ liệu xác nhận không khớp!');
      console.error(`- Tên DB hiện tại: [${dbName}]`);
      console.error(`- Giá trị bạn truyền vào --confirm-db: [${confirmDbName || 'TRỐNG'}]`);
      console.error('Lệnh bị hủy bỏ để đảm bảo an toàn toàn vẹn dữ liệu.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\n🚀 Bắt đầu thực hiện cập nhật vào cơ sở dữ liệu...');
    let updatedCount = 0;

    for (const ord of targetOrders) {
      const now = new Date();
      await Order.updateOne(
        { _id: ord._id },
        {
          $set: {
            paymentStatus: 'paid',
            paymentConfirmedAt: now,
            paymentNote: 'Di chuyển dữ liệu chuẩn hóa: Đơn đã hoàn tất bàn giao',
          },
          $push: {
            paymentHistory: {
              fromStatus: ord.paymentStatus || 'pending',
              toStatus: 'paid',
              changedBy: 'Hệ thống (Migration Script)',
              note: 'Chuẩn hóa trạng thái thanh toán cho đơn hàng đã hoàn tất',
              changedAt: now,
            },
          },
        }
      );

      // Đồng bộ Payment model
      await Payment.updateMany(
        { orderId: ord._id },
        {
          $set: {
            status: 'paid',
            paidAt: now,
          },
        }
      );

      updatedCount++;
    }

    console.log(`\n🎉 THÀNH CÔNG: Đã cập nhật thành công ${updatedCount} đơn hàng sang trạng thái PAID.`);
    await mongoose.disconnect();
    console.log('✅ Đã ngắt kết nối an toàn với cơ sở dữ liệu.');
  } catch (error) {
    console.error('❌ Lỗi khi thực hiện migration:', error);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

migratePaymentStatus();
