const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../customer-web/modules/orders/orders.js');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Thêm nút "Chi tiết đơn" vào card render trong initProfileOrders
const profileCardActionAnchor = `<!-- Cụm nút hành động theo đúng trạng thái -->
            <div class="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">`;

const profileCardWithDetail = `<!-- Cụm nút hành động theo đúng trạng thái -->
            <div class="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
              <!-- 0. Chi tiết đơn hàng (Màn hình Stitch) -->
              <button type="button" 
                      onclick="if(window.dieuHuong) window.dieuHuong('order-detail', null, '${'${order._id}'}')" 
                      class="px-4 py-2 rounded-lg bg-[#000f22] hover:bg-[#10162B] text-white font-title-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[16px] text-[#edbf76]">visibility</span>
                <span>Chi tiết đơn</span>
              </button>`;

if (content.includes(profileCardActionAnchor) && !content.includes("dieuHuong('order-detail'")) {
  content = content.replace(profileCardActionAnchor, profileCardWithDetail);
  console.log('Đã thêm nút Chi tiết đơn vào card profile!');
}

// 2. Thêm nút "Chi tiết đơn" vào renderSingleOrderCard
const singleCardActionAnchor = `<!-- Cụm nút thao tác -->
          <div class="flex items-center gap-2.5 w-full md:w-auto justify-end">`;

const singleCardWithDetail = `<!-- Cụm nút thao tác -->
          <div class="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <!-- Nút Chi tiết đơn -->
            <button type="button" 
                    onclick="if(window.dieuHuong) window.dieuHuong('order-detail', null, '${'${order._id}'}')" 
                    class="px-4 py-2 rounded bg-[#000f22] hover:bg-[#10162B] text-white text-[13px] font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-[17px] text-[#edbf76]">visibility</span>
              <span>Chi tiết đơn</span>
            </button>`;

if (content.includes(singleCardActionAnchor) && !content.includes("onclick=\"if(window.dieuHuong) window.dieuHuong('order-detail'")) {
  content = content.replace(singleCardActionAnchor, singleCardWithDetail);
  console.log('Đã thêm nút Chi tiết đơn vào renderSingleOrderCard!');
}

// 3. Thêm hàm initOrderDetailPage và cancelCurrentOrderDetail
const orderDetailFunctions = `
  // ==========================================
  // 5. CHI TIẾT ĐƠN HÀNG (UC-C07 - CHUẨN STITCH)
  // ==========================================
  let currentOrderDetail = null;

  async function initOrderDetailPage(param) {
    let orderData = null;

    // A. Nếu param là object đã có thông tin
    if (param && typeof param === 'object' && (param.orderCode || param._id || param.orderId)) {
      orderData = param;
    }

    // B. Nếu param là ID hoặc Code string, gọi API lấy đơn chi tiết
    const targetCodeOrId = typeof param === 'string' ? param.trim() : (orderData ? (orderData._id || orderData.orderId || orderData.orderCode) : null);

    if (targetCodeOrId) {
      try {
        const cleanId = String(targetCodeOrId).replace(/^#/, '');
        const res = await apiFetch('/orders/my/' + cleanId);
        if (res && res.success && res.data) {
          orderData = res.data;
        }
      } catch (err) {
        console.warn('Không tải được đơn hàng qua /orders/my/:id, kiểm tra bộ nhớ đệm:', err);
      }
    }

    // C. Tìm trong danh sách myOrdersList nếu có
    if ((!orderData || !orderData.orderCode) && targetCodeOrId && Array.isArray(myOrdersList) && myOrdersList.length > 0) {
      const cleanId = String(targetCodeOrId).replace(/^#/, '');
      const found = myOrdersList.find(o => o._id === cleanId || o.orderCode === cleanId || String(o._id).includes(cleanId));
      if (found) orderData = found;
    }

    // D. Phục hồi từ sessionStorage nếu param rỗng (do F5)
    if (!orderData || !orderData.orderCode) {
      try {
        const cached = sessionStorage.getItem('craftory_latest_order');
        if (cached) orderData = JSON.parse(cached);
      } catch (e) {}
    }

    // E. Nếu vẫn chưa có, gọi API lấy đơn mới nhất của khách
    if (!orderData || !orderData.orderCode) {
      try {
        const res = await apiFetch('/orders/my?limit=1');
        if (res && res.success && res.data && res.data.length > 0) {
          orderData = res.data[0];
        }
      } catch (e) {
        console.error('Lỗi lấy đơn hàng mới nhất:', e);
      }
    }

    if (!orderData) {
      const container = document.getElementById('detail-items-container');
      if (container) {
        container.innerHTML = \`
          <div class="py-12 text-center text-[#74777e]">
            <span class="material-symbols-outlined text-4xl text-[#c4c6ce]">receipt_long</span>
            <p class="mt-2 text-[14px]">Không tìm thấy thông tin đơn hàng yêu cầu.</p>
            <button onclick="if(window.dieuHuong) window.dieuHuong('profile', null, 'orders')" class="mt-4 px-4 py-2 bg-[#000f22] text-white rounded text-[12px] font-semibold cursor-pointer">
              Quay lại danh sách đơn hàng
            </button>
          </div>
        \`;
      }
      return;
    }

    currentOrderDetail = orderData;
    const cleanCode = String(orderData.orderCode || orderData._id || 'MG-8924').replace(/^#/, '');
    const createdAt = orderData.createdAt ? formatDateTime(orderData.createdAt) : '--';
    const totalAmount = Number(orderData.totalAmount || 0);
    const subtotal = orderData.subtotal != null ? Number(orderData.subtotal) : totalAmount;
    const shippingFee = orderData.shippingFee != null ? Number(orderData.shippingFee) : (subtotal >= 1000000 ? 0 : 30000);
    const discount = Number(orderData.discount || 0);

    // Gán Header & Breadcrumb
    const bcCodeEl = document.getElementById('detail-breadcrumb-code');
    const codeEl = document.getElementById('detail-order-code');
    const timeEl = document.getElementById('detail-order-time');
    if (bcCodeEl) bcCodeEl.textContent = \`Chi tiết đơn hàng #\${cleanCode}\`;
    if (codeEl) codeEl.textContent = \`#\${cleanCode}\`;
    if (timeEl) {
      timeEl.innerHTML = \`
        <span class="material-symbols-outlined text-[16px] text-[#74777e]">schedule</span>
        \${createdAt}
      \`;
    }

    // Status Badges
    const statusTextEl = document.getElementById('detail-status-text');
    const statusBadgeEl = document.getElementById('detail-status-badge');
    const paymentTextEl = document.getElementById('detail-payment-text');
    const paymentBadgeEl = document.getElementById('detail-payment-badge');
    const oStatus = (orderData.orderStatus || 'pending').toLowerCase();
    const pStatus = (orderData.paymentStatus || 'unpaid').toLowerCase();

    if (statusTextEl && statusBadgeEl) {
      if (oStatus === 'pending') {
        statusTextEl.textContent = 'Chờ xử lý / Xếp lò';
        statusBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-[12px] tracking-wider uppercase shadow-xs';
      } else if (oStatus === 'confirmed') {
        statusTextEl.textContent = 'Đã xác nhận';
        statusBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[12px] tracking-wider uppercase shadow-xs';
      } else if (oStatus === 'processing') {
        statusTextEl.textContent = 'Đang chế tác 1.380°C';
        statusBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600 text-white text-[12px] tracking-wider uppercase shadow-xs';
      } else if (oStatus === 'shipping') {
        statusTextEl.textContent = 'Đang vận chuyển';
        statusBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a2540] text-white text-[12px] tracking-wider uppercase shadow-xs';
      } else if (oStatus === 'completed') {
        statusTextEl.textContent = 'Đã hoàn tất';
        statusBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[12px] tracking-wider uppercase shadow-xs';
      } else if (oStatus === 'cancelled') {
        statusTextEl.textContent = 'Đã hủy';
        statusBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-[12px] tracking-wider uppercase shadow-xs';
      }
    }

    if (paymentTextEl && paymentBadgeEl) {
      if (pStatus === 'paid') {
        paymentTextEl.textContent = 'Đã thanh toán';
        paymentBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[12px] tracking-wider uppercase';
      } else if (pStatus === 'awaiting_verification') {
        paymentTextEl.textContent = 'Chờ đối soát chuyển khoản';
        paymentBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[12px] tracking-wider uppercase';
      } else {
        paymentTextEl.textContent = 'Chưa thanh toán';
        paymentBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e7e8e9] text-[#000f22] text-[12px] tracking-wider uppercase';
      }
    }

    // Nút Hủy đơn
    const cancelBtn = document.getElementById('detail-btn-cancel');
    if (cancelBtn) {
      if (oStatus === 'pending') {
        cancelBtn.classList.remove('hidden');
      } else {
        cancelBtn.classList.add('hidden');
      }
    }

    // Stepper 5 bước
    const progressEl = document.getElementById('detail-stepper-progress');
    const cancelBanner = document.getElementById('detail-cancelled-banner');
    const cancelReasonEl = document.getElementById('detail-cancelled-reason');

    if (oStatus === 'cancelled') {
      if (progressEl) progressEl.style.width = '100%';
      if (cancelBanner) cancelBanner.classList.remove('hidden');
      if (cancelReasonEl) {
        cancelReasonEl.textContent = \`Lý do: \${orderData.cancelReason || orderData.cancellationReason || 'Khách hàng tự hủy'}\`;
      }
      const title5 = document.getElementById('stepper-title-5');
      if (title5) title5.textContent = 'Đã hủy đơn';
    } else {
      if (cancelBanner) cancelBanner.classList.add('hidden');
      let progressPercent = '15%';
      if (oStatus === 'confirmed') progressPercent = '35%';
      else if (oStatus === 'processing') progressPercent = '55%';
      else if (oStatus === 'shipping') progressPercent = '75%';
      else if (oStatus === 'completed') progressPercent = '100%';
      if (progressEl) progressEl.style.width = progressPercent;
    }

    // Render danh sách sản phẩm
    const itemsContainer = document.getElementById('detail-items-container');
    const itemsCountTitle = document.getElementById('detail-items-count-title');
    const items = orderData.items || [];
    if (itemsCountTitle) {
      itemsCountTitle.textContent = \`Danh Tác Trong Đơn Hàng (\${items.length})\`;
    }

    if (itemsContainer) {
      if (items.length === 0) {
        itemsContainer.innerHTML = '<p class="text-center text-[#74777e] py-6">Đơn hàng không có danh mục tác phẩm.</p>';
      } else {
        itemsContainer.innerHTML = items.map((item, idx) => {
          const product = item.productId || {};
          const customization = item.customization || item.designSnapshot;
          const isCustom = Boolean(customization && (customization.designName || customization.glazeColor || customization.men || customization.engravingText || customization.chuKhac || customization.previewImage));
          const name = (customization && customization.designName) || item.productName || product.name || 'Tác phẩm gốm Bát Tràng';
          const price = Number(item.unitPrice || item.price || product.price || 0);
          const qty = Number(item.quantity || 1);
          const itemTotal = Number(item.totalPrice) > 0 ? Number(item.totalPrice) : (price * qty);
          const img = (customization && (customization.previewImage || customization.blankImage)) || (product && (product.image || (product.images && product.images[0]))) || item.image || 'assets/img/logo.png';
          
          const glaze = (customization && (customization.blankName || customization.glazeColor || customization.men)) || 'Men rạn cung đình Bát Tràng';
          const motif = (customization && (customization.motifName || customization.pattern || customization.hoaVan)) || 'Họa tiết hoàng gia truyền thống';
          const engText = (customization && (customization.engravingText || customization.chuKhac)) || '';
          const preview2D = (customization && (customization.previewImage || customization.motifImage || customization.blankImage)) || img;

          return \`
            <article class="p-5 sm:p-6 rounded-xl bg-white hover:bg-[#f8f9fa] transition-colors duration-200 flex flex-col gap-5 border border-[#EBEAE5]">
              <div class="flex flex-col sm:flex-row gap-5 items-start">
                <!-- Thumbnail -->
                <div class="w-28 h-36 sm:w-32 sm:h-40 shrink-0 rounded-lg overflow-hidden bg-[#f3f4f5] shadow-xs relative border border-[#EBEAE5] flex items-center justify-center">
                  <img class="w-full h-full object-contain p-1" alt="\${escapeHtml(name)}" src="\${escapeHtml(img)}" onerror="this.src='assets/img/logo.png'">
                  <span class="absolute top-2 left-2 bg-[#000f22]/90 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded tracking-widest uppercase font-semibold">
                    \${isCustom ? 'Cá nhân hoá' : 'Độc bản'}
                  </span>
                </div>

                <!-- Product Details -->
                <div class="flex-1 flex flex-col justify-between h-full min-w-0">
                  <div>
                    <div class="flex items-start justify-between gap-3">
                      <h3 class="font-['Playfair_Display',serif] text-lg sm:text-xl text-[#000f22] tracking-tight font-bold">
                        \${escapeHtml(name)}
                      </h3>
                      <div class="text-right shrink-0">
                        <span class="text-lg font-bold text-[#a23e18] font-['Playfair_Display',serif]">\${formatMoney(itemTotal)}</span>
                        <p class="text-[12px] text-[#74777e]">Đơn giá: \${formatMoney(price)} × \${qty}</p>
                      </div>
                    </div>
                    <p class="text-[13px] text-[#43474d] mt-1 leading-relaxed">
                      Ngự Phẩm Bát Tràng • \${escapeHtml(glaze)} • Đất Nung Bạch Thạch Tinh Luyện 1.380°C
                    </p>
                  </div>

                  <!-- Custom Design Snapshot Module (NẾU CÓ THIẾT KẾ 2D) -->
                  \${isCustom ? \`
                    <div class="mt-4 p-4 rounded-lg bg-[#f8f9fa] flex flex-col sm:flex-row gap-4 items-center border border-[#EBEAE5]">
                      <div class="w-20 h-20 rounded bg-white shrink-0 overflow-hidden flex items-center justify-center p-1 shadow-inner border border-[#EBEAE5]">
                        <img class="w-full h-full object-contain" alt="2D Blueprint" src="\${escapeHtml(preview2D)}" onerror="this.src='assets/img/logo.png'">
                      </div>
                      <div class="flex-1 text-left min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="material-symbols-outlined text-[16px] text-[#a23e18]">stylus_note</span>
                          <span class="text-[11px] uppercase tracking-wider text-[#a23e18] font-bold">Bản vẽ thiết kế cá nhân hóa (2D Snapshot)</span>
                        </div>
                        \${engText ? \`
                          <p class="text-[13px] text-[#000f22] mt-1 font-medium truncate">
                            Khắc âm triện tay: <span class="font-serif italic font-bold text-[#a23e18]">"\${escapeHtml(engText)}"</span>
                          </p>
                        \` : ''}
                        <div class="flex flex-wrap items-center gap-2 text-[11px] text-[#74777e] mt-1">
                          <span>Phôi: <strong class="text-[#000f22]">\${escapeHtml(glaze)}</strong></span>
                          <span>•</span>
                          <span>Họa tiết: <strong class="text-[#000f22]">\${escapeHtml(motif)}</strong></span>
                        </div>
                      </div>
                    </div>
                  \` : \`
                    <div class="mt-4 flex items-center gap-2 text-[#74777e] text-[12px] py-2 px-3 bg-[#f8f9fa] rounded border border-[#EBEAE5]">
                      <span class="material-symbols-outlined text-[16px] text-[#ac8441]">verified_user</span>
                      <span>Tác phẩm chế tác thủ công nguyên bản, đóng triện danh vị lò gốm 1705 tại đáy phôi.</span>
                    </div>
                  \`}
                </div>
              </div>
            </article>
          \`;
        }).join('');
      }
    }

    // Thông tin vận chuyển & giao nhận
    const recipient = orderData.shippingAddress || {};
    const recipientName = recipient.recipientName || 'Quý khách';
    const recipientPhone = recipient.phone || '--';
    const addressStr = \`\${recipient.detail || ''}, \${recipient.ward || ''}, \${recipient.province || ''}\`.replace(/^,\\s*|,\\s*$/g, '') || '--';
    const note = orderData.note || 'Tác phẩm gốm sứ dễ vỡ - yêu cầu giao giờ hành chính và vận chuyển bọc khung gỗ bảo hiểm.';

    const recNameEl = document.getElementById('detail-recipient-name');
    const recPhoneEl = document.getElementById('detail-recipient-phone');
    const recAddressEl = document.getElementById('detail-recipient-address');
    const recNoteEl = document.getElementById('detail-recipient-note');
    const recAvatarEl = document.getElementById('detail-recipient-avatar');

    if (recNameEl) recNameEl.textContent = recipientName;
    if (recPhoneEl) recPhoneEl.textContent = recipientPhone;
    if (recAddressEl) recAddressEl.textContent = addressStr;
    if (recNoteEl) recNoteEl.textContent = \`"\${note}"\`;
    if (recAvatarEl) {
      const initials = recipientName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase() || 'QK';
      recAvatarEl.textContent = initials;
    }

    // Tổng hợp tài chính
    const subtotalEl = document.getElementById('detail-subtotal');
    const shipFeeEl = document.getElementById('detail-shipping-fee');
    const discountEl = document.getElementById('detail-discount');
    const totalEl = document.getElementById('detail-total-amount');

    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
    if (shipFeeEl) shipFeeEl.textContent = shippingFee === 0 ? 'Miễn phí (0 ₫)' : formatMoney(shippingFee);
    if (discountEl) discountEl.textContent = discount === 0 ? '0 ₫' : \`-\${formatMoney(discount)}\`;
    if (totalEl) totalEl.textContent = formatMoney(totalAmount);

    // Chi tiết thanh toán
    const methodEl = document.getElementById('detail-payment-method');
    const txnEl = document.getElementById('detail-payment-txn');
    const pTimeEl = document.getElementById('detail-payment-time');
    const bankStatusEl = document.getElementById('detail-bank-status-text');
    const payBadge = document.getElementById('detail-payment-status-badge');

    const method = (orderData.paymentMethod || 'COD').toUpperCase();
    if (methodEl) {
      if (method === 'COD') methodEl.innerHTML = '<span class="material-symbols-outlined text-[18px] text-[#a23e18]">local_shipping</span> Thanh toán khi nhận hàng (COD)';
      else if (method === 'MOMO') methodEl.innerHTML = '<span class="material-symbols-outlined text-[18px] text-[#a23e18]">account_balance_wallet</span> Ví điện tử MoMo';
      else methodEl.innerHTML = '<span class="material-symbols-outlined text-[18px] text-[#a23e18]">account_balance</span> Chuyển khoản VietQR Pro / Napas 247';
    }

    if (txnEl) txnEl.textContent = \`TXN-\${cleanCode}\`;
    if (pTimeEl) pTimeEl.textContent = createdAt;
    if (bankStatusEl) {
      bankStatusEl.textContent = pStatus === 'paid' ? 'Giao dịch thành công (Hoàn tất 100%)' : (pStatus === 'awaiting_verification' ? 'Đang đối soát chuyển khoản' : 'Đã tiếp nhận hồ sơ đặt hàng');
    }
    if (payBadge) {
      payBadge.textContent = pStatus === 'paid' ? 'Đã Thanh Toán' : (pStatus === 'awaiting_verification' ? 'Đang Đối Soát' : 'Chưa Thanh Toán');
      payBadge.className = pStatus === 'paid' ? 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold uppercase' : 'px-2.5 py-0.5 rounded-full bg-[#e7e8e9] text-[#000f22] text-[11px] font-bold uppercase';
    }
  }

  // Hủy đơn hàng trên trang Chi tiết đơn hàng
  async function cancelCurrentOrderDetail() {
    if (!currentOrderDetail) return;
    const cleanCode = String(currentOrderDetail.orderCode || currentOrderDetail._id).replace(/^#/, '');
    const reason = prompt(\`Quý khách có chắc muốn hủy đơn hàng #\${cleanCode}?\\nVui lòng nhập lý do hủy đơn (tùy chọn):\`, 'Thay đổi nhu cầu');
    if (reason === null) return;

    try {
      const orderId = currentOrderDetail._id || cleanCode;
      await apiFetch(\`/orders/my/\${orderId}/cancel\`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason || 'Khách hàng tự hủy trên trang chi tiết' }),
      });
      alert(\`Đã hủy đơn hàng #\${cleanCode} thành công.\`);
      currentOrderDetail.orderStatus = 'cancelled';
      currentOrderDetail.cancelReason = reason || 'Khách hàng tự hủy';
      sessionStorage.setItem('craftory_latest_order', JSON.stringify(currentOrderDetail));
      await initOrderDetailPage(currentOrderDetail);
    } catch (err) {
      alert(err.message || 'Không thể hủy đơn hàng vào lúc này.');
    }
  }
`;

// Chèn trước "const OrdersModule = {"
const exportAnchor = `  // Đối tượng đối ngoại\n  const OrdersModule = {`;
if (!content.includes('function initOrderDetailPage(')) {
  content = content.replace(exportAnchor, `${orderDetailFunctions}\n${exportAnchor}`);
  console.log('Đã chèn initOrderDetailPage và cancelCurrentOrderDetail!');
}

// Cập nhật exports của OrdersModule
const exportsContent = `    initCheckoutPage,
    initOrderSuccessPage,
    initOrderTrackingPage,
    initOrderDetailPage,
    cancelCurrentOrderDetail,`;

if (!content.includes('initOrderDetailPage,') && content.includes('initOrderTrackingPage,')) {
  content = content.replace(`    initCheckoutPage,\n    initOrderSuccessPage,\n    initOrderTrackingPage,`, exportsContent);
  console.log('Đã cập nhật export OrdersModule!');
}

// Cập nhật window exports
const windowExportsAnchor = `  window.initOrderTrackingPage = initOrderTrackingPage;`;
const windowExports = `  window.initOrderTrackingPage = initOrderTrackingPage;
  window.initOrderDetailPage = initOrderDetailPage;
  window.cancelCurrentOrderDetail = cancelCurrentOrderDetail;`;

if (!content.includes('window.initOrderDetailPage =') && content.includes(windowExportsAnchor)) {
  content = content.replace(windowExportsAnchor, windowExports);
  console.log('Đã cập nhật window exports!');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Cập nhật orders.js THÀNH CÔNG!');
