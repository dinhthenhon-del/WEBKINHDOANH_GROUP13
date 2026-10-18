const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const MONGO_URI = process.env.MONGODB_URI;
// Xem trước: node seed_categories.js
// Ghi DB sau khi lead đồng ý: node seed_categories.js --apply
const APPLY = process.argv.includes('--apply');
const CONFIRM_DB = process.argv.find((arg) => arg.startsWith('--confirm-db='))?.split('=')[1];

/**
 * Danh mục thực tế: dựa trên các loại sản phẩm bán tại minhlong.com.
 * Các ảnh đại diện là ảnh sản phẩm thực thuộc danh mục, không phải ảnh AI.
 * Chạy trước các file khác.
 */
const sampleCategories = [
  {
    "name": "Bộ đồ ăn",
    "slug": "bo-do-an",
    "description": "Các bộ bàn ăn nguyên set được bán trên website Minh Long.",
    "imageUrl": "https://cdn.hstatic.net/products/200000532849/22566-sm-01_aa73737a1c7645e4b210c11bf1d16dbd.png",
    "status": "active"
  },
  {
    "name": "Bộ trà / Cà phê",
    "slug": "bo-tra-ca-phe",
    "description": "Bộ trà và bộ cà phê bán theo set.",
    "imageUrl": "https://product.hstatic.net/200000532849/product/bo-tra-08-l-camellia-chi-vang_01803801403-sm-01_91287cb9ecf04533a0adb34470db02be.png",
    "status": "active"
  },
  {
    "name": "Chén / Bát",
    "slug": "chen-bat",
    "description": "Chén cơm và chén chấm bán lẻ.",
    "imageUrl": "https://cdn.hstatic.net/products/200000532849/031106566-sm-01_fdbf99b5baa44db5b31ee7faa5a03bd2.png",
    "status": "active"
  },
  {
    "name": "Dĩa",
    "slug": "dia",
    "description": "Dĩa ăn, dĩa sâu lòng và dĩa lót chén, tách.",
    "imageUrl": "https://product.hstatic.net/200000532849/product/dia-ao-16-cm-daisy-trang_041621000-sm-01_25ce74d4feaf4aaeb9fa743ce93b7400.png",
    "status": "active"
  },
  {
    "name": "Tô / Thố",
    "slug": "to-tho",
    "description": "Tô và thố có nắp.",
    "imageUrl": "https://cdn.hstatic.net/products/200000532849/avatar__70__72c8ba9d1e294ff3a6a34931f548c63d.png",
    "status": "active"
  },
  {
    "name": "Bình trà",
    "slug": "binh-tra",
    "description": "Bình trà riêng lẻ.",
    "imageUrl": "https://product.hstatic.net/200000532849/product/binh-tra-05-l-nap-camellia-chi-vang_015038014-sm-01_60a345976a3a4a0ba88c18fd28013223.png",
    "status": "active"
  },
  {
    "name": "Bình",
    "slug": "binh",
    "description": "Các loại bình gốm sứ.",
    "imageUrl": "",
    "status": "active"
  },
  {
    "name": "Tách trà",
    "slug": "tach-tra",
    "description": "Tách trà riêng lẻ.",
    "imageUrl": "https://cdn.hstatic.net/products/200000532849/avatar__3__72e0102a18e142ac862d23e658bde886.png",
    "status": "active"
  }
];

async function seed() {
  try {
    if (!APPLY) {
      console.log('🔍 DRY RUN (chưa ghi MongoDB):');
      console.log(`Có ${sampleCategories.length} bản ghi category dự kiến nạp`);
      sampleCategories.forEach((item) => console.log(` • ${item.name}`));
      console.log('Chỉ chạy với --apply sau khi xác nhận đúng DB và lead cho phép.');
      return;
    }
    if (!MONGO_URI) throw new Error('Thiếu MONGODB_URI trong server/.env');
    await mongoose.connect(MONGO_URI);
    if (!CONFIRM_DB) {
      throw new Error('Cần xác nhận database bằng --confirm-db=TEN_DATABASE trước khi ghi dữ liệu');
    }
    if (CONFIRM_DB !== mongoose.connection.name) {
      throw new Error(`Database xác nhận "${CONFIRM_DB}" không khớp database đang kết nối "${mongoose.connection.name}"`);
    }
    const Category = require('./src/models/Category');
    let created = 0, updated = 0;
    for (const item of sampleCategories) {
      const existing = await Category.findOne({ slug: item.slug });
      if (!existing) {
        await Category.create(item);
        created++;
      } else {
        await Category.updateOne({ _id: existing._id }, { $set: item });
        updated++;
      }
    }
    console.log(`✅ Category: tạo mới ${created}, cập nhật ${updated}`);
  } catch (error) {
    console.error(`❌ Seed Category thất bại:`, error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
}
seed();
