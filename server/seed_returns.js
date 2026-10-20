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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD-oE-3fQcuUak2YB-Brhe04Eoj4Gj83M0IUUSSSyMptq-GrgI-ksqvDxSEDImbDCzvgYKMk86AN5FPuTip7CDTQpmPTfC8p06OmC5qQAEBuIwIL9VZpyygz5tb26qwS2A5cpFFKTwexcixPkvhrhytdFiEjCos0V7iclMiVyQPwxka5hNgvFQDkZbcLzpsU_XhbweZBx-d3UlI2sYw05I6KVQHSLZLXSyYMbwMHH_ia6woraWqXQ',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC96PFSR4L1CzCBGNkKo3cw9Ee3q8tAeAMf35gry0rcgeUvrIB46UWISL29yvKFaXSleUB2_uc2R1U3K2_n64JEv5n84Iq20L1JtnXw2nLoOY7bft7EdKwUkXuvlELM8H7t3q3AJRUQhJXmQ99SJsmYEI-U2UonuLaV3OuyszMObiZguOkSS6hNA-p68SfOi4B2KCyf9RymblN79MC40fvx8eg5o_ntN5zOMFjNoDoeP9BbPkGm_w',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBXpZ6PapFxreDB5-Ru5tnALFEa8tjUcZuX7Vapp4IYqCUiE6Mn6s-2g4qLWThwaSbybmU84B9PfE8d4CGbnJClQl4M_ZG720TpGvZfnFhoQC1AqNd3LyS5C0sTZZErFob7S085cTCoJPH3Pz2hISLJp8URFPg9NMZhHBHDAQ9VV4BMc0AQahISFvysrsg05N_fo9XdtatOvJzDbQGWht-aN9y4hT8kFS6ZM6yv933UqzzdV7brLg'
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCkur97ZDaliQFcYOwJ8M0CDRza25jUxuauJcM6ufGFWtaD6nQBGDk_zCNSzK3uXK8-gDcJoVv_txwmcKXkpNznIPeNToyQfL_onTiFwVtWsUsyESnAqKfLC8dGF8ocEjFADxdVk3XTvRSRrt5O5fXyQROmQe8vrD4Xg50kbmzMgOWoGhqkl_klxIePyGJnfUf8Jvu0P0LJkcKtRy3jmuOYfkzNTnZcZkdyMF1U_moRI6g2YUYsAw'
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuChAl521Bb506Y_rfG2wr9i9gSUefMgExInIgzxQnpSpMPU4f-B3SUbCnxeyjj2nGCbxhQU2rc8KBDAIEJSyaAixvvWC2lv2nl2BwqE3YlwG_3arYzNLZTWxuxCOGtqB-mkjvZkLaDr8bmXXbagOmC8BhE-HFr_8T7dTq_CHQkPFWpHO83AHwUbEbBNOle8hwqFzVs98sSU3BbYkgAVVelaBrQIvYgK-cPY4sygctee29ZxDPpZsg'
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAsfKjHLKB_jhvE388DP9yXnKhXAnpJSdn4usHq3o47zEJ_QVh32ycTbmxrn-oSCgLaThdcrv7BiW0o6vrvNJCU50NFpzvN9rv2CpVac2nbVn-fmr-LJr5ddzy_D3utl4IoeDmyFO70_H9-Wl8zoqmxk5ybpJR19EQA7lF_SOll_v_4jVHDxHAHrrkGaZBVkr4fHJyCYVrMmD2Xx62I33uwgg_ZeYBmptcx9aj8MWCZCHNwkilRMA'
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
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDKbCgl-PDZxWG-0nYvuSoznftsCFjeuSROOyJRZ-Pv3rrS4KU4KHVJ0FrAP6WFRYcRiZDKpANKBNMNqZgSPHPEW4HbFDj5SphJ0e7qvXg_Z0y_clsWiqwVCXvPQHXYsvZWwqxaMFBzw-1z0CnesfxRoKFOagMGsodan5R54YIMPEF43rE5YZPgrg17ylKS2_mEqZ3uoHxqD6etNT7MTdAFAIUnJjjjLe3Y5gBHbebseV4EO-OdQA'
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
