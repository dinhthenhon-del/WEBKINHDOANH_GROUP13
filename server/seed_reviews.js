const mongoose = require('mongoose');
require('dotenv').config();
const Review = require('./src/models/Review');
const Product = require('./src/models/Product');
const Account = require('./src/models/Account');

async function seedHeritageReviews() {
  await mongoose.connect(process.env.MONGODB_URI);
  const account = await Account.findOne().lean();
  const accountId = account ? account._id : new mongoose.Types.ObjectId();

  // Drop index cũ gây lỗi null duplicate
  try {
    await mongoose.connection.collection('reviews').dropIndex('order_1_product_1');
    console.log('Dropped order_1_product_1 index');
  } catch (e) {
    console.log('Index order_1_product_1 not found or dropped');
  }

  const curatedFeedbacks = [
    {
      author: 'Trần Anh Tuấn',
      location: 'Hà Nội',
      rating: 5,
      comment: 'Nét men lam cổ nung củi rất sâu, nước men bóng mờ sang trọng chứ không dại như men công nghiệp. Đóng gói hộp gụ lụa đỏ cực kỳ chu đáo.'
    },
    {
      author: 'Lê Hoàng Yến',
      location: 'TP. HCM',
      rating: 5,
      comment: 'Bình hút lộc đặt tại sảnh phòng khách ai đến cũng khen. Có chứng thư nghệ nhân Bát Tràng ký tên đóng triện rất uy tín.'
    },
    {
      author: 'Nguyễn Trọng Khoa',
      location: 'Đà Nẵng',
      rating: 5,
      comment: 'Thời gian giao hàng cẩn thận, mở hộp kiểm tra gốm không một tì vết nhỏ. Rất xứng đáng làm quà tặng đối tác cao cấp.'
    },
    {
      author: 'Phạm Minh Đức',
      location: 'Hải Phòng',
      rating: 5,
      comment: 'Cốt gốm dày đanh, tiếng gõ thanh như chuông khánh. Đúng chuẩn gốm nung củi truyền thống của làng gốm Bát Tràng trứ danh.'
    },
    {
      author: 'Hoàng Bích Thủy',
      location: 'Cần Thơ',
      rating: 4,
      comment: 'Tác phẩm rất đẹp và sang trọng, hoa văn vẽ tay uyển chuyển. Vận chuyển đường xa vào miền Tây an toàn tuyệt đối.'
    }
  ];

  const products = await Product.find().limit(40).lean();
  let createdCount = 0;

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const existing = await Review.countDocuments({
      $or: [{ productId: prod._id }, { product: prod._id }]
    });

    if (existing === 0) {
      const countToAdd = 2 + (i % 3);
      for (let j = 0; j < countToAdd; j++) {
        const fb = curatedFeedbacks[(i + j) % curatedFeedbacks.length];
        const daysAgo = 5 + (i * 3 + j * 7) % 45;
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        await Review.create({
          productId: prod._id,
          product: prod._id,
          accountId: accountId,
          customerName: fb.author + ' (' + fb.location + ')',
          rating: fb.rating,
          comment: fb.comment,
          createdAt: createdAt,
          updatedAt: createdAt
        });
        createdCount++;
      }
    }
  }

  console.log('Successfully seeded reviews count:', createdCount);
  const total = await Review.countDocuments();
  console.log('Total reviews in DB now:', total);
  process.exit(0);
}

seedHeritageReviews().catch(err => {
  console.error(err);
  process.exit(1);
});
