const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const MONGO_URI = process.env.MONGODB_URI;
// Xem trước: node seed_collections.js
// Ghi DB sau khi lead đồng ý: node seed_collections.js --apply
const APPLY = process.argv.includes('--apply');
const CONFIRM_DB = process.argv.find((arg) => arg.startsWith('--confirm-db='))?.split('=')[1];

/**
 * Các bộ sưu tập có ảnh sản phẩm và trang nguồn đã xác minh.
 * Click collection -> product collectionName tương ứng.
 */
const sampleCollections = [
  {
    "name": "Jasmine - Thạch Vân",
    "slug": "jasmine-thach-van",
    "description": "Bộ bàn ăn Jasmine họa tiết Thạch Vân. Ảnh đại diện là bộ đồ ăn 22 sản phẩm.",
    "imageUrl": "https://cdn.hstatic.net/products/200000532849/22566-sm-01_aa73737a1c7645e4b210c11bf1d16dbd.png",
    "sourceUrl": "https://minhlong.com/products/bo-do-an-22-san-pham-jasmine-thach-van",
    "status": "active"
  },
  {
    "name": "Jasmine - Chỉ Vàng",
    "slug": "jasmine-chi-vang",
    "description": "Bộ bàn ăn Jasmine với đường viền chỉ vàng. Ảnh đại diện là bộ đồ ăn 09 sản phẩm.",
    "imageUrl": "https://product.hstatic.net/200000532849/product/bo-do-an-09-san-pham-jasmine-chi-vang_09014-sm-01_22249286a87343a1a893471e1205f611.png",
    "sourceUrl": "https://minhlong.com/products/bo-do-an-9-24-36-san-pham-jasmine-vien-chi-vang-bo-9-san-pham",
    "status": "active"
  },
  {
    "name": "Daisy - Trắng",
    "slug": "daisy-trang",
    "description": "Dòng bàn ăn Daisy màu trắng. Ảnh đại diện là bộ đồ ăn 36 sản phẩm.",
    "imageUrl": "https://product.hstatic.net/200000532849/product/bo-do-an-10-nguoi-36sp-daisy-trang_36dai-sm-01_a81d2f0f10e448f3be31a0f3497186d0.png",
    "sourceUrl": "https://minhlong.com/products/bo-ban-an-24-36-mon-daisy-trang-10-nguoi-36-san-pham",
    "status": "active"
  },
  {
    "name": "Camellia - Chỉ Vàng",
    "slug": "camellia-chi-vang",
    "description": "Dòng trà Camellia viền vàng. Ảnh đại diện là bộ trà 0.8 L.",
    "imageUrl": "https://product.hstatic.net/200000532849/product/bo-tra-08-l-camellia-chi-vang_01803801403-sm-01_91287cb9ecf04533a0adb34470db02be.png",
    "sourceUrl": "https://minhlong.com/products/bo-tra-0-8-l-camellia-chi-vang",
    "status": "active"
  },
  {
    "name": "Bộ Đồ Ăn Hoa Mặt Trời Men Lam",
    "slug": "bo-do-an-hoa-mat-troi-men-lam",
    "subTitle": "Nét lam cổ điển từ làng gốm Bát Tràng",
    "countText": "3 tuyển phẩm",
    "description": "Bộ bát đĩa hoa mặt trời vẽ họa tiết thủ công bằng men lam trên nền men trắng. Các đĩa cánh hoa xếp quanh tô lớn, tạo điểm nhấn trang nhã cho bàn ăn gia đình.",
    "imageUrl": "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-men-lam-hoa-day-mau-don-gom-su-bat-trang.jpg",
    "sourceUrl": "https://gomsulongloan.vn/san-pham/bo-bat-dia-hoa-mat-troi-hoa-mau-don-men-lam-bat-trang",
    "status": "active"
  },
  {
    "name": "Bình Men Lam Cổ Điển",
    "slug": "binh-men-lam-co-dien",
    "subTitle": "Tuyển chọn bình trang trí Bát Tràng",
    "countText": "3 tuyển phẩm",
    "description": "Các mẫu bình gốm Bát Tràng trang trí men lam với hoa văn vẽ tay, từ phượng hoàng và mẫu đơn đến cảnh sinh hoạt và hoa cẩm tú cầu.",
    "imageUrl": "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-phuong-hoang-mau-don-men-lam-gom-su-bat-trang-cao-cap.jpg",
    "sourceUrl": "https://gomsulongloan.vn/san-pham/binh-gom-song-phuong-vinh-hoa-men-lam-bat-trang",
    "status": "active"
  }
];

async function seed() {
  try {
    if (!APPLY) {
      console.log('🔍 DRY RUN (chưa ghi MongoDB):');
      console.log(`Có ${sampleCollections.length} bản ghi collection dự kiến nạp`);
      sampleCollections.forEach((item) => console.log(` • ${item.name}`));
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
    const Collection = require('./src/models/Collection');
    let created = 0, updated = 0;
    for (const item of sampleCollections) {
      const existing = await Collection.findOne({ slug: item.slug });
      if (!existing) {
        await Collection.create(item);
        created++;
      } else {
        await Collection.updateOne({ _id: existing._id }, { $set: item });
        updated++;
      }
    }
    console.log(`✅ Collection: tạo mới ${created}, cập nhật ${updated}`);
  } catch (error) {
    console.error(`❌ Seed Collection thất bại:`, error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
}
seed();
