const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';

/**
 * =========================================================================
 * MODULE: QUẢN LÝ DANH MỤC & BỘ SƯU TẬP (CATEGORIES)
 * File: server/seed_categories.js
 * Thành viên phụ trách Module Danh mục chỉnh sửa và quản lý tại file này.
 * Chạy lệnh: node seed_categories.js
 * =========================================================================
 */
const sampleCategories = [
  {
    name: 'Dòng Men Lam Thăng Long',
    slug: 'dong-men-lam-thang-long',
    description: 'Bình Tỳ Bà, Chóe Rạn Bát Tiên, Đĩa Ngũ Trảo biểu trưng cho thanh cao và uy quyền vương triều.',
    subTitle: 'Men Lam Cổ Điển Đại Việt',
    countText: '28 Tác phẩm',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEyQDma_vp1oeH0lH8Ve4CG6iuW_nL0OGYJwRWJ6W2kgKbJrW6Vjn1V8EiCYSWUTAmqoFc5oFycqoSoUj9aTVh889cScGGaJNPd7wVJqhG7XPToe_YADnOQP2C-nJeDq0lP6T8qGJLOEDmibPCBDJT9_qxa520rCpV6ZvbZK45ctSz0_aUEmYhkEnesjB9zTO1B0N7-nmgugEu6ZQOqa46apO6Q1vLGccoj4xis0O5oWIHEEnCPEIY',
    status: 'active'
  },
  {
    name: 'Cốt Đất Chu Đậu',
    slug: 'cot-dat-chu-dau',
    description: 'Lọ Lộc Bình tam tầng, Bát Hương mực chu sa với mạng rạn chân chim tự nhiên nung lò củi.',
    subTitle: 'Men Rạn Hoàng Cung',
    countText: '19 Tác phẩm',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiVxKVk8AOWAcuEQrZLvxlRTgZ4OWU0b4-BQncRChb_2LjbeBEJ3zNyLVjmlxE4aLD5OT3W-uFXTaGBz50BFZyK2EB7SDOm9CW7um6iTivKtCVRlHO7yidMpj7b8-Lmr6ZQIQ4JrhStQzHUPn2hTIoVtDar85r4Lv7SwLozLXD740Ra136lXQFYLGsZEL97l0mFSD6nKflfe2sxEf43Z_eqkzjf-c_yauEh4uLri6VU8DiDqVp7Tb0',
    status: 'active'
  },
  {
    name: 'Trà Cụ Đạo Vị',
    slug: 'tra-cu-dao-vi',
    description: 'Ấm Thủy Trúc Liên Hoa, Chén Tống Tràng Tiền giữ trọn hương mộc trà trong từng giọt nước.',
    subTitle: 'Trà Cụ Tử Sa Men Ngọc',
    countText: '34 Tác phẩm',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyZhDD54YfNt_v736yZ1UOPno-0djkyudoxs6kWONiy_EQE4GYDJ8saePVl79kx4xzCEZE5ACUtaaI7r6qnm7WrBjOMmXfQzQdpghlH9fBo5n16WKDBxoZ_S-6gvwti-WPkFa08poNxntbD9GI4ETTAuBtRcYyZL8-FyylNdskbgv1CnY6wp-jw_LDFHWIICerXYdyM84HGUXwwEycXCWzWrkPmz5CRpvA5RjsHbjkmUJ3bw8oeSxY',
    status: 'active'
  },
  {
    name: 'Ngự Phẩm Dát Vàng',
    slug: 'ngu-pham-dat-vang',
    description: 'Bình Ngũ Phúc Kim Long, Mai Bình dát vàng quỳ thủ công thể hiện khí phách tôn quý tột bậc.',
    subTitle: 'Gốm Điêu Khắc Dát Vàng 24K',
    countText: '12 Độc bản',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFGqd-VhYUE2T8CvEVImp4wt5wuGREtjZyEto51RhClwd8Dj92m6B6nQbuRemb1svP9hNa0_ZqWtiwsIemZKbkOEv7tVJPYAjWxZWC8WMFD_HJSGfXUMN5mexvGDC_W4eTfgjI8v9sV014e1mRjhZw8-Z3gkoa8dXFOCK2ow-NMxdFdmqaRSupH4xd6L4Ul2NCGUo96uPJ0GEt1taVHU1sYtl9wVnt5VeQMFkMCQjkSCWDuFADWvKD',
    status: 'active'
  }
];

async function seedCategories() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ [Module Categories] Đã kết nối MongoDB Atlas!');

    const Category = require('./src/models/Category');

    for (const item of sampleCategories) {
      const existing = await Category.findOne({ name: item.name });
      if (!existing) {
        await Category.create(item);
        console.log(`➕ Đã tạo danh mục: ${item.name}`);
      } else {
        await Category.updateOne({ _id: existing._id }, { $set: item });
        console.log(`🔄 Đã cập nhật danh mục: ${item.name}`);
      }
    }

    console.log('🎉 Hoàn thành seed dữ liệu Module Danh mục!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi seed categories:', err);
    process.exit(1);
  }
}

seedCategories();
