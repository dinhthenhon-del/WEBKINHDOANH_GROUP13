const http = require('http');

function request(options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== TEST LUỒNG KHẤU TRỪ DOANH THU THUẦN KHI DUYỆT HOÀN HÀNG ===\n');

  // 1. Lấy Doanh Thu Thuần ban đầu
  const initialStatsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/stats',
    method: 'GET'
  });

  const initialRevenue = initialStatsRes.data.data.totalRevenue;
  console.log(`1. Doanh thu thuần ban đầu: ${initialRevenue.toLocaleString('vi-VN')}₫`);

  // 2. Đăng nhập tài khoản Admin
  const adminLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    emailOrPhone: 'long@gmail.com', // hoặc admin account
    password: 'password123'
  });

  // 3. Đăng nhập tài khoản khách hàng để tạo đơn hàng
  const customerLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    emailOrPhone: '0918345678',
    password: '123456'
  });

  const customerId = customerLogin.data.data._id;
  const token = customerLogin.data.data.token || customerId;
  console.log('2. Đăng nhập khách hàng thành công:', customerId);

  // 4. Lấy 1 sản phẩm có hàng
  const prodsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/products?limit=1',
    method: 'GET'
  });
  const product = prodsRes.data.data[0];
  console.log(`3. Sản phẩm thử nghiệm: "${product.name}" - Giá: ${product.price.toLocaleString('vi-VN')}₫`);

  // 5. Thêm vào giỏ và đặt hàng
  await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/cart/items',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-account-id': customerId }
  }, {
    productId: product._id,
    quantity: 1
  });

  const orderRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-account-id': customerId }
  }, {
    shippingAddress: {
      recipientName: 'Khách Hàng Test',
      phone: '0918345678',
      province: 'Hà Nội',
      ward: 'Phường Bát Tràng',
      detail: 'Số 10 Đường Gốm'
    },
    paymentMethod: 'BANKING',
    paymentStatus: 'paid', // thanh toán ngay
    note: 'Đơn hàng test khấu trừ doanh thu'
  });

  if (!orderRes.data || !orderRes.data.success) {
    console.error('Không tạo được đơn hàng:', orderRes.data);
    return;
  }

  const createdOrder = orderRes.data.data;
  console.log(`4. Đã tạo đơn hàng mới: #${createdOrder.orderCode} - Tổng tiền: ${createdOrder.totalAmount.toLocaleString('vi-VN')}₫`);

  // 6. Chuyển trạng thái đơn hàng: pending -> confirmed -> processing -> shipping -> completed
  console.log('5. Tiến hành hoàn tất đơn hàng qua các bước quy trình...');
  const orderId = createdOrder._id;

  const st1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/admin/${orderId}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { status: 'confirmed' });
  console.log('   - Confirmed:', st1.data.message);

  const st2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/admin/${orderId}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { status: 'processing' });
  console.log('   - Processing:', st2.data.message);

  const st3 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/admin/${orderId}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { status: 'shipping' });
  console.log('   - Shipping:', st3.data.message);

  // Xác nhận đã thanh toán trước khi completed
  const paySt = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/admin/${orderId}/payment`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { status: 'paid', note: 'Khách chuyển khoản VietQR thành công' });
  console.log('   - Payment:', paySt.data.message);

  const st4 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/admin/${orderId}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { status: 'completed' });
  console.log('   - Completed:', st4.data.message);

  // 7. Kiểm tra Doanh Thu Thuần sau khi đơn Completed
  const afterCompletedStats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/stats',
    method: 'GET'
  });
  const revenueAfterCompleted = afterCompletedStats.data.data.totalRevenue;
  console.log(`6. Doanh thu thuần sau khi đơn hoàn tất: ${revenueAfterCompleted.toLocaleString('vi-VN')}₫ (+${(revenueAfterCompleted - initialRevenue).toLocaleString('vi-VN')}₫)`);

  // 8. Tạo yêu cầu đổi/trả (ReturnRequest) cho đơn hàng này
  console.log('7. Khách hàng gửi yêu cầu đổi/trả hàng...');
  const returnRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/returns',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    orderId: orderId,
    accountId: customerId,
    type: 'return',
    reason: 'Tác phẩm bị rạn men do nhiệt độ, xin hoàn lại tiền',
    items: [{
      productId: product._id,
      quantity: 1,
      reason: 'Rạn men cổ'
    }]
  });

  if (!returnRes.data || !returnRes.data.success) {
    console.error('Không tạo được ReturnRequest:', returnRes.data);
    return;
  }
  const returnReq = returnRes.data.data;
  console.log(`8. Đã tạo ReturnRequest ID: ${returnReq._id} - Trạng thái: ${returnReq.status}`);

  // 9. Admin DUYỆT YÊU CẦU ĐỔI TRẢ (Chấp nhận hoàn hàng)
  console.log('9. Quản trị viên duyệt CHẤP NHẬN HOÀN HÀNG...');
  const approveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/returns/${returnReq._id}/status`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, {
    status: 'approved',
    processedBy: customerId // hoặc adminId
  });

  console.log('10. Kết quả duyệt:', approveRes.data.message);

  // 10. Kiểm tra lại Doanh Thu Thuần
  const afterReturnStats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/stats',
    method: 'GET'
  });
  const revenueAfterReturn = afterReturnStats.data.data.totalRevenue;
  console.log(`11. Doanh thu thuần SAU KHI CHẤP NHẬN HOÀN HÀNG: ${revenueAfterReturn.toLocaleString('vi-VN')}₫`);

  const deductedAmount = revenueAfterCompleted - revenueAfterReturn;
  console.log(`\n========================================`);
  console.log(`KẾT QUẢ KIỂM THỬ KHẤU TRỪ DOANH THU:`);
  console.log(`- Tiền đơn hàng đã hoàn tất: ${createdOrder.totalAmount.toLocaleString('vi-VN')}₫`);
  console.log(`- Số tiền thực tế bị trừ khỏi Doanh Thu Thuần: ${deductedAmount.toLocaleString('vi-VN')}₫`);
  if (deductedAmount > 0 && revenueAfterReturn === initialRevenue) {
    console.log(`>>> CHÍNH XÁC 100%! DOANH THU THUẦN ĐÃ BỊ TRỪ ĐÚNG SỐ TIỀN HOÀN HÀNG! <<<`);
  } else {
    console.log(`>>> Kết quả khấu trừ: deductedAmount = ${deductedAmount} <<<`);
  }
  console.log(`========================================\n`);
}

runTest().catch(console.error);
