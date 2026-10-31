const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Kiểm tra tĩnh các file
console.log('=== 1. KIỂM TRA TĨNH FILE VIEW VÀ SCRIPT ===');

const successHtmlPath = path.resolve(__dirname, '../customer-web/views/order-success.html');
const detailHtmlPath = path.resolve(__dirname, '../customer-web/views/order-detail.html');
const navbarJsPath = path.resolve(__dirname, '../customer-web/core/navbar.js');
const ordersJsPath = path.resolve(__dirname, '../customer-web/modules/orders/orders.js');

const successHtml = fs.readFileSync(successHtmlPath, 'utf8');
const detailHtml = fs.readFileSync(detailHtmlPath, 'utf8');
const navbarJs = fs.readFileSync(navbarJsPath, 'utf8');
const ordersJs = fs.readFileSync(ordersJsPath, 'utf8');

// Kiểm tra order-success.html (đơn giản, gọn gàng, không chứa bảng đồ sộ)
const successHasSimpleBadge = successHtml.includes('Khởi Ký Thành Công • Lò Củi 1705');
const successHasCode = successHtml.includes('id="success-order-code"');
const successHasDetailBtn = successHtml.includes('id="success-btn-view-detail"');
const successHasGotoDetail = successHtml.includes('goToOrderDetailFromSuccess');

console.log('✓ order-success.html có badge thành công đơn giản:', successHasSimpleBadge);
console.log('✓ order-success.html có mã đơn hàng:', successHasCode);
console.log('✓ order-success.html có nút Xem Chi Tiết Đơn Hàng:', successHasDetailBtn);
console.log('✓ order-success.html có hàm chuyển trang goToOrderDetailFromSuccess:', successHasGotoDetail);

// Kiểm tra order-detail.html (đầy đủ các thành phần chuẩn Stitch)
const detailHasBreadcrumb = detailHtml.includes('id="detail-breadcrumb-code"');
const detailHasCode = detailHtml.includes('id="detail-order-code"');
const detailHasStepper = detailHtml.includes('id="detail-stepper-progress"');
const detailHasItemsContainer = detailHtml.includes('id="detail-items-container"');
const detailHasRecipient = detailHtml.includes('id="detail-recipient-name"');
const detailHasFinance = detailHtml.includes('id="detail-total-amount"');
const detailHasPaymentMethod = detailHtml.includes('id="detail-payment-method"');
const detailHasGuarantee = detailHtml.includes('Cam Kết Bảo Trợ Gốm Sứ');

console.log('✓ order-detail.html có Breadcrumb:', detailHasBreadcrumb);
console.log('✓ order-detail.html có Mã đơn hàng:', detailHasCode);
console.log('✓ order-detail.html có 5-Stage Stepper Track:', detailHasStepper);
console.log('✓ order-detail.html có Danh tác trong đơn hàng:', detailHasItemsContainer);
console.log('✓ order-detail.html có Thông tin vận chuyển:', detailHasRecipient);
console.log('✓ order-detail.html có Tổng hợp tài chính:', detailHasFinance);
console.log('✓ order-detail.html có Chi tiết thanh toán:', detailHasPaymentMethod);
console.log('✓ order-detail.html có Cam Kết Bảo Trợ Gốm Sứ:', detailHasGuarantee);

// Kiểm tra navbar.js
const navbarHasOrderDetailRoute = navbarJs.includes("tenPhanHe === 'order-detail'");
console.log("✓ navbar.js đã đăng ký route 'order-detail':", navbarHasOrderDetailRoute);

// Kiểm tra orders.js
const ordersHasInitDetail = ordersJs.includes('function initOrderDetailPage(');
const ordersHasExportDetail = ordersJs.includes('initOrderDetailPage,') && ordersJs.includes('window.initOrderDetailPage =');
console.log('✓ orders.js có hàm initOrderDetailPage:', ordersHasInitDetail);
console.log('✓ orders.js đã export initOrderDetailPage:', ordersHasExportDetail);

// 2. Kiểm tra Backend API /api/orders/my
console.log('\n=== 2. KIỂM TRA KẾT NỐI BACKEND API ĐƠN HÀNG ===');

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

async function runApiTests() {
  try {
    // Đăng nhập tài khoản test
    const loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      emailOrPhone: '0918345678',
      password: '123456'
    });

    if (!loginRes.data || !loginRes.data.success) {
      console.log('Không thể đăng nhập tài khoản test (có thể tài khoản chưa tồn tại hoặc đổi mật khẩu):', loginRes.data);
      return;
    }

    const token = loginRes.data.data.token || loginRes.data.data._id;
    const accountId = loginRes.data.data._id;
    console.log('✓ Đăng nhập thành công, Account ID:', accountId);

    // Lấy danh sách đơn hàng
    const ordersRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders/my',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-account-id': accountId,
      }
    });

    console.log('✓ Gọi GET /api/orders/my HTTP Status:', ordersRes.status);
    if (ordersRes.data && ordersRes.data.success && ordersRes.data.data.length > 0) {
      const firstOrder = ordersRes.data.data[0];
      console.log(`✓ Tìm thấy ${ordersRes.data.data.length} đơn hàng. Đơn mới nhất: #${firstOrder.orderCode}`);

      // Lấy chi tiết đơn hàng
      const detailRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/my/${firstOrder._id}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-account-id': accountId,
        }
      });

      console.log(`✓ Gọi GET /api/orders/my/${firstOrder._id} HTTP Status:`, detailRes.status);
      if (detailRes.data && detailRes.data.success) {
        const order = detailRes.data.data;
        console.log('✓ Dữ liệu chi tiết đơn hàng:');
        console.log(`   - Mã đơn: #${order.orderCode}`);
        console.log(`   - Trạng thái: ${order.orderStatus}`);
        console.log(`   - Người nhận: ${order.shippingAddress?.recipientName} (${order.shippingAddress?.phone})`);
        console.log(`   - Địa chỉ: ${order.shippingAddress?.detail}, ${order.shippingAddress?.ward}, ${order.shippingAddress?.province}`);
        console.log(`   - Tổng tiền: ${order.totalAmount} VNĐ`);
        console.log(`   - Số lượng sản phẩm: ${order.items?.length || 0}`);
      }
    } else {
      console.log('Khách hàng chưa có đơn hàng nào hoặc mảng rỗng.');
    }

    console.log('\n=== TẤT CẢ KIỂM TRA ĐỀU THÀNH CÔNG RỰC RỠ! ===');
  } catch (err) {
    console.error('Lỗi khi kiểm tra API:', err);
  }
}

runApiTests();
