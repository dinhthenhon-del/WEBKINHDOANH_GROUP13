const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';

/**
 * =========================================================================
 * MODULE: QUẢN LÝ SẢN PHẨM & KHO HÀNG (PRODUCTS)
 * File: server/seed_products.js
 * Thành viên phụ trách Module Sản phẩm chỉnh sửa và quản lý tại file này.
 * Chạy lệnh: node seed_products.js
 * =========================================================================
 */
const sampleProducts = [
  {
    sku: 'BG-1705',
    name: 'Bình Hút Lộc Men Lam Đại Việt',
    collectionName: 'Dòng Men Lam Thăng Long',
    category: 'Bình gốm nghệ thuật',
    price: 48500000,
    stock: 2,
    description: 'Tác phẩm nung củi gỗ tự nhiên 1.380°C liên tục 72 giờ, men hỏa biến lam ngọc, cốt đất phù sa sông Hồng khử từ 180 ngày.',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    soldCount: 45
  },
  {
    sku: 'BG-1822',
    name: 'Chóe Rạn Bát Tiên Quá Hải',
    collectionName: 'Cốt Đất Chu Đậu',
    category: 'Gốm phong thủy ngự chế',
    price: 62000000,
    stock: 1,
    description: 'Men rạn chân chim phục dựng theo di bản gốm ngự triều Lê Trung Hưng thế kỷ XVII, vẽ tay tích Bát Tiên quá hải.',
    image: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    soldCount: 38
  },
  {
    sku: 'BG-3011',
    name: 'Bộ Trà Khảm Ngọc Thủy Trúc',
    collectionName: 'Trà Cụ Đạo Vị',
    category: 'Trà đạo & Ly chén',
    price: 4250000,
    stock: 15,
    description: 'Chất đất sa khoáng giữ nhiệt vượt trội, lòng chén tráng men ngọc dưỡng màu trà thanh khiết, quai cầm chạm khắc trúc quân tử.',
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    soldCount: 29
  },
  {
    sku: 'BG-0988',
    name: 'Đĩa Cung Đình Ngũ Long Tranh Châu',
    collectionName: 'Ngự Phẩm Dát Vàng',
    category: 'Gốm gia dụng cao cấp',
    price: 18600000,
    stock: 4,
    description: 'Họa tiết ngũ long tranh châu vẽ tay tỉ mỉ bằng chàm lam cổ truyền, đường kính 46cm, kèm giá đỡ gỗ gụ khảm ốc.',
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    soldCount: 22
  },
  {
    sku: 'GM-001',
    name: 'Bình hoa men rạn cổ Bát Tràng',
    collectionName: 'Dòng Men Lam Thăng Long',
    category: 'Bình gốm nghệ thuật',
    price: 850000,
    stock: 12,
    description: 'Bình gốm thủ công vuốt tay, họa tiết hoa sen vẽ lam cổ kính, men rạn truyền thống đạt độ nung 1250 độ C.',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    soldCount: 19
  },
  {
    sku: 'GM-002',
    name: 'Bộ ấm chén tử sa đất đỏ mạ đồng',
    collectionName: 'Trà Cụ Đạo Vị',
    category: 'Trà đạo & Ly chén',
    price: 1450000,
    stock: 4,
    description: 'Bộ ấm chén tử sa giữ nhiệt hoàn hảo, giúp hương vị trà lưu giữ lâu dài. Bộ gồm 1 ấm và 6 chén.',
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    soldCount: 16
  },
  {
    sku: 'GM-004',
    name: 'Tách trà gốm mộc tráng men ngọc',
    collectionName: 'Trà Cụ Đạo Vị',
    category: 'Trà đạo & Ly chén',
    price: 180000,
    stock: 25,
    description: 'Tách trà gốm mộc rustic với sắc xanh men ngọc trang nhã, cầm đầm tay.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    soldCount: 14
  },
  {
    sku: 'GM-005',
    name: 'Lọ hoa gốm men hỏa biến phong thủy',
    collectionName: 'Dòng Men Lam Thăng Long',
    category: 'Bình gốm nghệ thuật',
    price: 1200000,
    stock: 2,
    description: 'Men hỏa biến độc bản không trùng lặp, tạo hiệu ứng dải ngân hà tự nhiên trong lò nung củi nhiệt độ cao.',
    image: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    soldCount: 11
  }
];

async function seedProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB Atlas thành công!');

    const Product = require('./src/models/Product');

    for (const item of sampleProducts) {
      const existing = await Product.findOne({
        $or: [
          { sku: item.sku },
          { name: item.name }
        ]
      });

      if (!existing) {
        await Product.create(item);
        console.log(`➕ Đã tạo mới sản phẩm: ${item.name} (${item.price.toLocaleString()}đ)`);
      } else {
        await Product.updateOne({ _id: existing._id }, { $set: item });
        console.log(`🔄 Đã cập nhật sản phẩm: ${item.name} (${item.price.toLocaleString()}đ)`);
      }
    }

    console.log('\n🎉 Hoàn thành cập nhật toàn bộ sản phẩm mẫu vào cơ sở dữ liệu!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi seed sản phẩm:', err);
    process.exit(1);
  }
}

seedProducts();
