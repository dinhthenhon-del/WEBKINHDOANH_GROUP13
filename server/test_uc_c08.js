const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG USE CASE UC-C08 (ĐÁNH GIÁ SẢN PHẨM)');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Lấy dữ liệu mẫu từ server để test
  console.log('1. Chuẩn bị dữ liệu kiểm thử...');
  const prodRes = await request('GET', '/api/products');
  const products = (prodRes.body && prodRes.body.data) || [];
  assert(products.length > 0, `Đã lấy được danh sách sản phẩm (có ${products.length} sản phẩm)`);
  const testProduct = products[0];

  // Lấy danh sách tài khoản
  const custRes = await request('GET', '/api/admin/customers');
  const customers = (custRes.body && custRes.body.data) || [];
  assert(customers.length > 0, `Đã lấy được danh sách khách hàng (có ${customers.length} khách hàng)`);
  const testCustomer = customers[0];
  const otherCustomer = customers[1] || { _id: '670000000000000000000099' };

  // Tìm hoặc kiểm tra các đơn hàng
  const ordersRes = await request('GET', `/api/orders/user/${testCustomer._id}`);
  let userOrders = (ordersRes.body && ordersRes.body.data) || [];
  
  // Nếu chưa có đơn của user, thử tìm đơn từ Admin orders
  const allOrdersRes = await request('GET', '/api/orders');
  const allOrders = (allOrdersRes.body && (allOrdersRes.body.data || allOrdersRes.body.orders)) || [];

  let completedOrder = allOrders.find(o => (o.status || o.orderStatus || '').toLowerCase() === 'completed' && o.items && o.items.length > 0);
  let pendingOrder = allOrders.find(o => (o.status || o.orderStatus || '').toLowerCase() === 'pending' && o.items && o.items.length > 0);

  // Nếu không có, tạo đơn test trực tiếp qua Mongo
  const mongoose = require('mongoose');
  const DEFAULT_MONGO_URI = 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';
  await mongoose.connect(process.env.MONGODB_URI || DEFAULT_MONGO_URI);
  const Order = require('./src/models/Order');
  const Review = require('./src/models/Review');
  const Product = require('./src/models/Product');

  if (!completedOrder) {
    console.log('  Tạo đơn hàng COMPLETED phục vụ kiểm thử...');
    completedOrder = await Order.create({
      orderCode: 'TEST-COMP-' + Date.now().toString().slice(-6),
      accountId: testCustomer._id,
      customer: testCustomer._id,
      status: 'completed',
      orderStatus: 'completed',
      items: [{
        productId: testProduct._id,
        productName: testProduct.name,
        unitPrice: testProduct.price || 500000,
        quantity: 1
      }],
      subtotal: testProduct.price || 500000,
      totalAmount: testProduct.price || 500000,
      shippingAddress: {
        recipientName: testCustomer.fullName || 'Test User',
        phone: '0912345678',
        province: 'Hà Nội',
        ward: 'Bát Tràng',
        detail: 'Thôn 1'
      },
      paymentStatus: 'paid'
    });
  }

  if (!pendingOrder) {
    console.log('  Tạo đơn hàng PENDING phục vụ kiểm thử E1...');
    pendingOrder = await Order.create({
      orderCode: 'TEST-PEND-' + Date.now().toString().slice(-6),
      accountId: testCustomer._id,
      customer: testCustomer._id,
      status: 'pending',
      orderStatus: 'pending',
      items: [{
        productId: testProduct._id,
        productName: testProduct.name,
        unitPrice: testProduct.price || 500000,
        quantity: 1
      }],
      subtotal: testProduct.price || 500000,
      totalAmount: testProduct.price || 500000,
      shippingAddress: {
        recipientName: testCustomer.fullName || 'Test User',
        phone: '0912345678',
        province: 'Hà Nội',
        ward: 'Bát Tràng',
        detail: 'Thôn 1'
      },
      paymentStatus: 'pending'
    });
  }

  // Đảm bảo completedOrder thuộc testCustomer và chứa testProduct
  const completedOrderProdId = (completedOrder.items[0].productId && (completedOrder.items[0].productId._id || completedOrder.items[0].productId)) || completedOrder.items[0]._id;
  const orderCustId = completedOrder.accountId || completedOrder.customer;

  // Dọn dẹp review cũ của test này nếu có
  await Review.deleteMany({
    accountId: orderCustId,
    productId: completedOrderProdId,
    orderId: completedOrder._id
  });

  console.log('\n--- 2. KIỂM THỬ PRECONDITION 1 (Chưa đăng nhập / Thiếu accountId) ---');
  const resNoAuth = await request('POST', '/api/reviews', {
    productId: testProduct._id,
    orderId: completedOrder._id,
    rating: 5,
    comment: 'Hàng tuyệt đẹp'
  });
  assert(resNoAuth.status === 401, 'Từ chối khi thiếu accountId (HTTP 401)');
  assert(resNoAuth.body.message.includes('Vui lòng đăng nhập'), 'Thông báo lỗi yêu cầu đăng nhập');

  console.log('\n--- 3. KIỂM THỬ LUỒNG NGOẠI LỆ E1 (Đơn hàng chưa hoàn tất) ---');
  const resE1 = await request('POST', '/api/reviews', {
    accountId: testCustomer._id,
    productId: testProduct._id,
    orderId: pendingOrder._id,
    rating: 5,
    comment: 'Cảm nhận đơn pending'
  });
  assert(resE1.status === 400, 'Từ chối đánh giá khi đơn hàng chưa hoàn tất (HTTP 400)');
  assert(resE1.body.message === 'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng hoàn tất.', 
    `Thông báo E1 đúng chuẩn: "${resE1.body.message}"`);

  console.log('\n--- 4. KIỂM THỬ PRECONDITION 3 (Đơn hàng của người khác / Sản phẩm không thuộc đơn) ---');
  const resWrongCust = await request('POST', '/api/reviews', {
    accountId: otherCustomer._id,
    productId: completedOrderProdId,
    orderId: completedOrder._id,
    rating: 5,
    comment: 'Đánh giá đơn người khác'
  });
  assert(resWrongCust.status === 403, 'Từ chối khi đơn hàng không thuộc tài khoản gửi (HTTP 403)');

  const resWrongProd = await request('POST', '/api/reviews', {
    accountId: orderCustId,
    productId: '670000000000000000000099', // ID sản phẩm không có trong đơn
    orderId: completedOrder._id,
    rating: 5,
    comment: 'Sản phẩm không thuộc đơn'
  });
  assert(resWrongProd.status === 400, 'Từ chối khi sản phẩm không thuộc đơn hàng (HTTP 400)');

  console.log('\n--- 5. KIỂM THỬ LUỒNG NGOẠI LỆ E2 (Thông tin đánh giá không hợp lệ) ---');
  const resNoRating = await request('POST', '/api/reviews', {
    accountId: orderCustId,
    productId: completedOrderProdId,
    orderId: completedOrder._id,
    rating: 0,
    comment: 'Nhận xét nhưng quên chọn sao'
  });
  assert(resNoRating.status === 400, 'Từ chối khi chưa chọn sao hoặc rating = 0 (HTTP 400)');
  assert(resNoRating.body.message.includes('từ 1 đến 5'), 'Thông báo lỗi chọn số sao từ 1 đến 5');

  const resInvalidRating = await request('POST', '/api/reviews', {
    accountId: orderCustId,
    productId: completedOrderProdId,
    orderId: completedOrder._id,
    rating: 6,
    comment: '6 sao vượt giới hạn'
  });
  assert(resInvalidRating.status === 400, 'Từ chối khi rating > 5 (HTTP 400)');

  const resNoComment = await request('POST', '/api/reviews', {
    accountId: orderCustId,
    productId: completedOrderProdId,
    orderId: completedOrder._id,
    rating: 5,
    comment: '   '
  });
  assert(resNoComment.status === 400, 'Từ chối khi comment rỗng hoặc chỉ có khoảng trắng (HTTP 400)');
  assert(resNoComment.body.message.includes('nội dung nhận xét bắt buộc'), 'Thông báo lỗi nhập nội dung nhận xét bắt buộc');

  console.log('\n--- 6. KIỂM THỬ LUỒNG CHÍNH (MAIN FLOW BƯỚC 1 - 8: Gửi đánh giá thành công) ---');
  const validComment = 'Tác phẩm men lam rất có hồn, nung củi già nhiệt bóng mờ tuyệt đẹp!';
  const resMain = await request('POST', '/api/reviews', {
    accountId: orderCustId,
    productId: completedOrderProdId,
    orderId: completedOrder._id,
    rating: 5,
    comment: validComment
  });
  assert(resMain.status === 201, 'Gửi đánh giá thành công (HTTP 201)');
  assert(resMain.body.success === true, 'Response success = true');
  assert(resMain.body.message === 'Gửi đánh giá thành công', 'Thông báo thành công đúng chuẩn');
  assert(resMain.body.data && resMain.body.data.rating === 5, 'Dữ liệu đánh giá lưu rating = 5');
  assert(resMain.body.data && resMain.body.data.comment === validComment, 'Dữ liệu đánh giá lưu đúng comment');

  console.log('\n--- 7. KIỂM THỬ POSTCONDITION (Hiển thị tại mục đánh giá & cập nhật rating sản phẩm) ---');
  const resReviewsProd = await request('GET', `/api/reviews/product/${completedOrderProdId}`);
  assert(resReviewsProd.status === 200, 'Lấy danh sách đánh giá sản phẩm thành công (HTTP 200)');
  const foundReview = (resReviewsProd.body.data || []).find(r => r.comment === validComment);
  assert(Boolean(foundReview), 'Đánh giá mới xuất hiện trong mục đánh giá sản phẩm');
  assert(resReviewsProd.body.stats && resReviewsProd.body.stats.totalReviews > 0, 'Thống kê tổng số đánh giá đã cập nhật');

  // Kiểm tra điểm trung bình trên model Product
  const updatedProd = await Product.findById(completedOrderProdId).lean();
  assert(updatedProd && updatedProd.reviewCount > 0, `Product.reviewCount trong DB đã được đồng bộ (= ${updatedProd.reviewCount})`);

  console.log('\n--- 8. KIỂM THỬ LUỒNG NGOẠI LỆ E3 (Sản phẩm đã được đánh giá trùng lặp) ---');
  const resDup = await request('POST', '/api/reviews', {
    accountId: orderCustId,
    productId: completedOrderProdId,
    orderId: completedOrder._id,
    rating: 4,
    comment: 'Cố tình đánh giá lần 2 trùng lặp'
  });
  assert(resDup.status === 409, 'Hệ thống phát hiện trùng lặp và từ chối tạo bản ghi mới (HTTP 409)');
  assert(resDup.body.isDuplicate === true, 'Cờ isDuplicate = true');
  assert(resDup.body.message.includes('đã được đánh giá'), 'Thông báo rõ sản phẩm đã được đánh giá');

  console.log('\n--- 9. KIỂM THỬ E3.3 (Chỉnh sửa / Cập nhật đánh giá hiện có) ---');
  const updatedComment = 'Đã an vị vào tủ trà, chất đất tử sa giữ nhiệt rất lâu và sắc men tuyệt đỉnh!';
  const resUpdate = await request('POST', '/api/reviews', {
    accountId: orderCustId,
    productId: completedOrderProdId,
    orderId: completedOrder._id,
    rating: 4,
    comment: updatedComment,
    isUpdate: true
  });
  assert(resUpdate.status === 200, 'Cập nhật đánh giá thành công (HTTP 200)');
  assert(resUpdate.body.isUpdated === true, 'Cờ isUpdated = true');
  assert(resUpdate.body.data && resUpdate.body.data.rating === 4, 'Rating đã được cập nhật thành 4 sao');
  assert(resUpdate.body.data && resUpdate.body.data.comment === updatedComment, 'Comment đã được cập nhật nội dung mới');

  console.log('\n--- 10. KIỂM THỬ API KIỂM TRA ĐÁNH GIÁ THEO ĐƠN HÀNG (GET /api/reviews/order/:orderId) ---');
  const resOrderReviews = await request('GET', `/api/reviews/order/${completedOrder._id}?accountId=${orderCustId}`);
  assert(resOrderReviews.status === 200, 'Lấy danh sách đánh giá theo đơn hàng thành công (HTTP 200)');
  assert(Array.isArray(resOrderReviews.body.data) && resOrderReviews.body.data.length > 0, 'Trả về danh sách các sản phẩm đã đánh giá trong đơn hàng');

  console.log('\n========================================================');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
