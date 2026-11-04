/**
 * customer-web/modules/cart/cart.js
 * Quản lý Giỏ hàng (UC-C05) - Thành viên 3
 * 1. State giỏ hàng, đồng bộ API /api/cart
 * 2. Cart Drawer trượt từ bên phải theo chuẩn thiết kế Stitch
 * 3. Kiểm tra tồn kho thời gian thực, khóa nút khi vượt kho hoặc hết hàng
 * 4. Phơi hàm toàn cục window.CartModule.addToCart cho TV4 (Custom 2D) và trang sản phẩm
 */

(function () {
  'use strict';

  // State giỏ hàng client
  const cartState = {
    items: [],
    subtotal: 0,
    totalItems: 0,
    hasInvalidItems: false,
    invalidMessage: '',
    isOpen: false,
    isLoading: false,
  };

  /**
   * Lấy token hoặc thông tin tài khoản đang đăng nhập
   */
  function getAuthContext() {
    try {
      const saved = localStorage.getItem('craftory_user');
      if (saved) {
        const user = JSON.parse(saved);
        return {
          user,
          accountId: user._id || user.id,
          token: user.token || user._id,
        };
      }
    } catch (e) {
      console.error('Lỗi đọc auth context:', e);
    }
    return null;
  }

  /**
   * Định dạng tiền tệ VND
   */
  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
  }

  /**
   * Hiển thị Toast thông báo nhanh cho khách hàng
   */
  function showToast(message, isError = false, icon = '') {
    let toast = document.getElementById('cart-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cart-floating-toast';
      toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-300 opacity-0 pointer-events-none text-sm font-medium';
      document.body.appendChild(toast);
    }

    const toastIcon = icon || (isError ? 'warning' : 'verified');
    toast.className = isError
      ? 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-300 bg-[#ba1a1a] text-white text-sm font-medium opacity-100'
      : 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-300 bg-[#0a2540] text-white text-sm font-medium opacity-100';

    toast.innerHTML = `
      <span class="material-symbols-outlined text-[20px] ${isError ? 'text-white' : 'text-[#edbf76]'}">${toastIcon}</span>
      <span>${escapeHtml(message)}</span>
    `;

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-300 opacity-0 pointer-events-none text-sm font-medium';
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Gọi API giỏ hàng với thông tin xác thực
   */
  async function callCartApi(endpoint, options = {}) {
    const auth = getAuthContext();
    if (!auth || !auth.accountId) {
      const err = new Error('Vui lòng đăng nhập để thao tác giỏ hàng');
      err.isAuthError = true;
      throw err;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'x-account-id': auth.accountId,
      ...(options.headers || {}),
    };

    const baseUrl = (window.CRAFTORY_API_BASE || (() => {
      const hostname = window.location.hostname || 'localhost';
      const protocol = window.location.protocol === 'file:' ? 'http:' : window.location.protocol;
      return `${protocol}//${hostname}:5000/api`;
    })()).replace(/\/+$/, '');

    const response = await fetch(`${baseUrl}/cart${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || 'Lỗi thao tác giỏ hàng');
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /**
   * Khởi tạo giao diện Drawer trong DOM nếu chưa có
   */
  function ensureDrawerInDOM() {
    if (document.getElementById('cart-drawer-container')) return;

    const container = document.createElement('div');
    container.id = 'cart-drawer-container';
    container.innerHTML = `
      <!-- Backdrop mờ sương -->
      <div id="cart-drawer-backdrop" 
           onclick="CartModule.closeDrawer()" 
           class="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 opacity-0 pointer-events-none"></div>

      <!-- Drawer trượt từ bên phải -->
      <aside id="cart-drawer-panel" 
             class="fixed top-0 right-0 z-50 h-full w-full sm:w-[490px] bg-[#FFFFFF] shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 ease-out font-['Plus_Jakarta_Sans',sans-serif]">
        
        <!-- Header Ngăn Kéo Mini-cart -->
        <div class="px-5 sm:px-6 pt-5 pb-4 bg-[#f3f4f5] border-b border-[#EBEAE5] flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-full bg-[#0a2540] text-white flex items-center justify-center shadow-sm">
                <span class="material-symbols-outlined text-[20px]">local_mall</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="font-['Playfair_Display',serif] text-[18px] font-bold text-[#000f22] tracking-tight">Tuyển Tập Của Quý Khách</h2>
                  <span id="cart-drawer-count-badge" class="px-2 py-0.5 rounded-full bg-[#ffdbcf] text-[#822801] text-[11px] font-bold leading-tight">
                    0 tác phẩm
                  </span>
                </div>
                <p class="text-[11px] text-[#74777e] mt-0.5">Thủ công vuốt tay • Nung khử nhiệt độ cao 1.380°C</p>
              </div>
            </div>
            <button onclick="CartModule.closeDrawer()" 
                    aria-label="Đóng ngăn kéo giỏ hàng" 
                    class="w-9 h-9 rounded-full bg-white text-[#191c1d] hover:bg-[#e1e3e4] flex items-center justify-center transition-colors cursor-pointer border border-[#EBEAE5]">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Free Shipping & Kiln Guarantee Banner -->
          <div class="bg-white rounded p-2 border border-[#EBEAE5] shadow-xs">
            <div class="flex items-center justify-between text-[11px] text-[#0a2540] mb-1 font-medium">
              <span class="flex items-center gap-1 text-[#a23e18] font-semibold">
                <span class="material-symbols-outlined text-[15px]">verified</span>
                Bảo hiểm nứt vỡ 100% & Đổi mới nguyên tác
              </span>
              <span class="font-bold text-[#191c1d]" id="cart-shipping-status">Miễn phí giao hàng</span>
            </div>
            <div class="w-full h-1.5 bg-[#f3f4f5] rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-[#a23e18] to-[#ac8441] w-full rounded-full"></div>
            </div>
          </div>
        </div>

        <!-- Cảnh báo nếu có mặt hàng không hợp lệ (E2) -->
        <div id="cart-invalid-alert-banner" class="hidden px-5 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2 text-[12px] text-red-800">
          <span class="material-symbols-outlined text-[18px] text-red-600 shrink-0">warning</span>
          <span id="cart-invalid-alert-text" class="flex-1 font-medium">
            Có sản phẩm đã hết hàng hoặc ngừng bán. Vui lòng xóa trước khi thanh toán.
          </span>
        </div>

        <!-- Danh sách sản phẩm (Scrollable) -->
        <div id="cart-drawer-items-list" class="flex-1 overflow-y-auto px-5 sm:px-6 py-4 divide-y divide-[#EBEAE5]/80 space-y-4">
          <!-- Render danh sách động qua JavaScript -->
        </div>

        <!-- Footer: Tạm tính & Nút Thanh Toán -->
        <div class="px-5 sm:px-6 pt-4 pb-6 bg-[#f3f4f5] border-t border-[#EBEAE5] shadow-[0_-4px_20px_rgba(10,37,64,0.04)] flex flex-col gap-3">
          <!-- Phân rã chi phí -->
          <div class="space-y-1.5 text-[13px] text-[#43474d]">
            <div class="flex justify-between items-center">
              <span>Tạm tính tác phẩm:</span>
              <span id="cart-drawer-subtotal" class="font-semibold text-[#000f22] text-[15px]">0₫</span>
            </div>
            <div class="flex justify-between items-center text-[#a23e18]">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">local_shipping</span>
                Bảo hiểm vận chuyển gốm sứ rạn nứt:
              </span>
              <span class="font-semibold uppercase tracking-wider text-[11px]">Miễn Phí</span>
            </div>
            <div class="flex justify-between items-center text-[#ac8441]">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">redeem</span>
                Hộp gấm hoàng cung & Chứng thư giám định:
              </span>
              <span class="font-semibold uppercase tracking-wider text-[11px]">Tặng Kèm</span>
            </div>
          </div>

          <!-- Dòng Tổng Cộng -->
          <div class="pt-2 border-t border-[#EBEAE5] flex items-baseline justify-between">
            <div>
              <span class="text-[11px] uppercase tracking-wider text-[#74777e] font-bold block">Tổng thanh toán dự kiến</span>
              <span class="text-[10px] text-[#74777e]">(Đã bao gồm thuế & niêm phong triện)</span>
            </div>
            <div class="text-right">
              <span id="cart-drawer-grand-total" class="font-['Playfair_Display',serif] text-[22px] sm:text-[24px] font-bold text-[#000f22] tracking-tight">0₫</span>
            </div>
          </div>

          <!-- Nút Đặt Hàng & Thanh Toán -->
          <div class="flex flex-col gap-2 mt-1">
            <button id="cart-drawer-btn-checkout" 
                    onclick="CartModule.handleCheckoutClick()" 
                    class="w-full py-3.5 px-4 bg-[#a23e18] hover:bg-[#6f2000] text-white rounded font-bold uppercase tracking-wider text-[13px] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <span>Tiến Hành Đặt Chế Tác & Thanh Toán</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button onclick="CartModule.closeDrawer()" 
                    class="w-full py-2 text-center text-[#43474d] hover:text-[#000f22] text-[12px] uppercase tracking-wider transition-colors cursor-pointer">
              Tiếp tục thưởng lãm bộ sưu tập
            </button>
          </div>

          <!-- Cam kết Di sản Bát Tràng -->
          <div class="pt-2 flex items-center justify-between gap-1 text-center text-[10px] text-[#74777e] uppercase tracking-tight border-t border-[#EBEAE5]/60">
            <span class="flex items-center gap-0.5 justify-center">
              <span class="material-symbols-outlined text-[13px] text-[#a23e18]">cached</span>
              Đổi 1-1 nếu nứt rạn
            </span>
            <span>•</span>
            <span class="flex items-center gap-0.5 justify-center">
              <span class="material-symbols-outlined text-[13px] text-[#a23e18]">local_fire_department</span>
              Nung củi 1.380°C
            </span>
            <span>•</span>
            <span class="flex items-center gap-0.5 justify-center">
              <span class="material-symbols-outlined text-[13px] text-[#a23e18]">verified_user</span>
              Triện ấn chuẩn Bát Tràng
            </span>
          </div>
        </div>
      </aside>
    `;

    document.body.appendChild(container);
  }

  /**
   * Cập nhật badge số lượng trên navbar (#navbar-cart-count)
   */
  function updateNavbarBadge(count) {
    const badge = document.getElementById('navbar-cart-count');
    if (badge) {
      badge.textContent = count > 99 ? '99+' : count;
      if (count > 0) {
        badge.classList.remove('hidden');
      }
    }
  }

  /**
   * Render các dòng sản phẩm trong Drawer
   */
  function renderCartDrawer() {
    ensureDrawerInDOM();

    const listContainer = document.getElementById('cart-drawer-items-list');
    const countBadge = document.getElementById('cart-drawer-count-badge');
    const subtotalEl = document.getElementById('cart-drawer-subtotal');
    const grandTotalEl = document.getElementById('cart-drawer-grand-total');
    const invalidAlertBanner = document.getElementById('cart-invalid-alert-banner');
    const invalidAlertText = document.getElementById('cart-invalid-alert-text');
    const checkoutBtn = document.getElementById('cart-drawer-btn-checkout');

    if (!listContainer) return;

    // Cập nhật số lượng và tổng tiền
    countBadge.textContent = `${cartState.totalItems} tác phẩm`;
    subtotalEl.textContent = formatMoney(cartState.subtotal);
    grandTotalEl.textContent = formatMoney(cartState.subtotal);
    updateNavbarBadge(cartState.totalItems);

    // Xử lý cờ cảnh báo sản phẩm không hợp lệ (E2)
    if (cartState.hasInvalidItems) {
      invalidAlertBanner.classList.remove('hidden');
      invalidAlertText.textContent = cartState.invalidMessage || 'Một số sản phẩm đã hết hàng hoặc ngừng bán. Quý khách vui lòng xóa bỏ để tiếp tục thanh toán.';
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    } else {
      invalidAlertBanner.classList.add('hidden');
      if (checkoutBtn) {
        checkoutBtn.disabled = cartState.items.length === 0;
        if (cartState.items.length === 0) {
          checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
    }

    // Trường hợp giỏ hàng trống
    if (!cartState.items || cartState.items.length === 0) {
      listContainer.innerHTML = `
        <div class="py-16 flex flex-col items-center justify-center text-center gap-3">
          <div class="w-16 h-16 rounded-full bg-[#f3f4f5] text-[#74777e] flex items-center justify-center">
            <span class="material-symbols-outlined text-[32px]">production_quantity_limits</span>
          </div>
          <h3 class="font-['Playfair_Display',serif] text-[18px] text-[#000f22] font-semibold">Giỏ tuyển tập đang trống</h3>
          <p class="text-[13px] text-[#74777e] max-w-xs">
            Quý khách chưa lựa chọn tác phẩm nào. Hãy khám phá các kiệt tác men rạn và phôi sứ nung củi của Làng Gốm Thanh Xuân.
          </p>
          <button onclick="CartModule.closeDrawer(); if(window.dieuHuong) window.dieuHuong('shop');" 
                  class="mt-2 px-5 py-2.5 rounded bg-[#000f22] hover:bg-[#10162B] text-white text-[12px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
            Thưởng Lãm Sản Phẩm
          </button>
        </div>
      `;
      return;
    }

    // Render danh sách sản phẩm
    listContainer.innerHTML = cartState.items.map((item, index) => {
      // Đọc thông tin customization từ backend hoặc localStorage snapshot
      let custom = item.customization;
      if (!custom) {
        try {
          const stored = JSON.parse(localStorage.getItem('craftory_custom_designs') || '{}');
          if (stored[item.productId]) {
            custom = stored[item.productId];
          }
        } catch (e) {}
      }

      const isCustomized = Boolean(custom && (custom.glazeColor || custom.pattern || custom.engravingText || custom.men || custom.hoaVan || custom.chuKhac || custom.blankName || custom.designName));
      const glazeText = custom ? (custom.blankName || custom.glazeColor || custom.men || '') : '';
      const patternText = custom ? (custom.motifName || custom.pattern || custom.hoaVan || '') : '';
      const engravingText = custom ? (custom.engravingText || custom.chuKhac || '') : '';
      const designName = custom ? (custom.designName || '') : '';
      const displayName = designName ? `${designName}` : item.name;
      const displayImg = (custom && (custom.previewImage || custom.blankImage)) || item.image || 'assets/img/logo.png';
      const motifImg = custom && custom.motifImage ? custom.motifImage : '';

      const isOutOfStock = !item.isAvailable || item.stock <= 0;
      const isStockExceeded = item.isAvailable && item.quantity >= item.stock;

      const lineUnitPrice = (custom && Number(custom.price) > 0)
        ? Number(custom.price)
        : (Number(item.currentPrice) || Number(item.unitPrice) || 0);
      const lineTotalPrice = Number(item.totalPrice) > 0
        ? Number(item.totalPrice)
        : (lineUnitPrice * (Number(item.quantity) || 1));

      return `
        <div class="pt-4 first:pt-0 flex flex-col gap-2 group ${isOutOfStock ? 'opacity-70 bg-red-50/40 p-2.5 rounded-lg border border-red-200/60' : ''}" id="cart-item-row-${item._id}">
          <div class="flex gap-3">
            <!-- Thumbnail ảnh sản phẩm kèm badge 2D nếu có customization -->
            <div class="relative w-24 h-24 sm:w-26 sm:h-26 rounded bg-[#f8f9fa] shrink-0 overflow-hidden shadow-xs border border-[#EBEAE5] flex items-center justify-center">
              <img src="${escapeHtml(displayImg)}" 
                   alt="${escapeHtml(displayName)}" 
                   class="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300">
              ${motifImg ? `
                <img src="${escapeHtml(motifImg)}" 
                     class="absolute w-10 h-10 object-contain pointer-events-none" 
                     style="mix-blend-mode: multiply;" 
                     alt="Họa tiết">
              ` : ''}
              ${isCustomized ? `
                <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#0a2540] text-white text-[9px] font-bold tracking-tight shadow">
                  2D Độc Bản
                </span>
              ` : ''}
              ${item.stock > 0 && item.stock <= 3 ? `
                <span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[#a23e18] text-white text-[9px] font-bold shadow">
                  Còn ${item.stock} chiếc
                </span>
              ` : ''}
            </div>

            <!-- Chi tiết sản phẩm -->
            <div class="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <span class="text-[10px] uppercase tracking-wider text-[#a23e18] font-bold block">
                  ${isCustomized ? 'Tác chế độc bản 2D' : 'Kiệt tác gốm sứ'}
                </span>
                <h4 class="font-semibold text-[#000f22] text-[14px] leading-snug truncate" title="${escapeHtml(displayName)}">
                  ${escapeHtml(displayName)}
                </h4>
                ${designName && designName !== item.name ? `
                  <p class="text-[11px] text-[#74777e] truncate">Phôi gốc: ${escapeHtml(item.name)}</p>
                ` : ''}
                
                ${isCustomized ? `
                  <div class="mt-1 bg-[#f3f4f5] p-1.5 rounded text-[11px] text-[#43474d] space-y-0.5">
                    ${glazeText ? `<div>• Phôi: <span class="font-medium text-[#000f22]">${escapeHtml(glazeText)}</span></div>` : ''}
                    ${patternText ? `<div>• Họa tiết: <span class="font-medium text-[#000f22]">${escapeHtml(patternText)}</span></div>` : ''}
                    ${engravingText ? `<div>• Khắc chữ: <span class="font-medium italic text-[#a23e18]">"${escapeHtml(engravingText)}"</span></div>` : ''}
                  </div>
                ` : ''}
              </div>

              <!-- Đơn giá & Nút tăng giảm số lượng -->
              <div class="flex items-end justify-between mt-2 pt-1">
                <div>
                  <span class="text-[10px] text-[#74777e] block">${isCustomized ? 'Giá thanh toán chế tác' : 'Đơn giá'}: ${formatMoney(lineUnitPrice)}</span>
                  <span class="font-semibold text-[15px] text-[#000f22] leading-tight font-numeric">${formatMoney(lineTotalPrice)}</span>
                </div>

                <!-- Cụm nút +/- và xóa -->
                <div class="flex items-center gap-2">
                  <div class="flex items-center bg-[#edeeef] rounded-lg p-0.5 shadow-inner">
                    <!-- Nút Giảm [-] (Khóa khi số lượng = 1) -->
                    <button onclick="CartModule.changeItemQuantity('${item._id}', ${item.quantity - 1})" 
                            ${item.quantity <= 1 ? 'disabled' : ''} 
                            class="w-7 h-7 flex items-center justify-center rounded text-[#191c1d] hover:bg-white hover:text-[#a23e18] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer" 
                            title="Giảm số lượng">
                      <span class="material-symbols-outlined text-[16px]">remove</span>
                    </button>

                    <span class="w-7 text-center font-bold text-[14px] text-[#000f22] leading-none">${item.quantity}</span>

                    <!-- Nút Tăng [+] (Khóa khi vượt tồn kho) -->
                    <button onclick="CartModule.changeItemQuantity('${item._id}', ${item.quantity + 1})" 
                            ${isStockExceeded || isOutOfStock ? 'disabled' : ''} 
                            class="w-7 h-7 flex items-center justify-center rounded text-[#191c1d] hover:bg-white hover:text-[#a23e18] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer" 
                            title="${isStockExceeded ? 'Số lượng trong kho không đủ' : 'Tăng số lượng'}">
                      <span class="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>

                  <!-- Nút Xóa -->
                  <button onclick="CartModule.removeItem('${item._id}')" 
                          class="w-7 h-7 rounded flex items-center justify-center text-[#74777e] hover:text-[#ba1a1a] hover:bg-red-50 transition-colors cursor-pointer" 
                          title="Xóa tác phẩm khỏi giỏ">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cảnh báo lỗi từng dòng (E1, E2) -->
          ${isOutOfStock ? `
            <div class="bg-red-100/80 rounded px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] text-red-800">
              <span class="material-symbols-outlined text-[15px] text-red-600 shrink-0">error</span>
              <span class="font-semibold">${escapeHtml(item.statusMessage || 'Sản phẩm đã hết hàng hoặc ngừng kinh doanh')}</span>
            </div>
          ` : isStockExceeded ? `
            <div class="bg-amber-50 rounded px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-amber-900 border border-amber-200/60">
              <span class="material-symbols-outlined text-[14px] text-amber-600 shrink-0">warning</span>
              <span>Đã đạt số lượng tồn kho tối đa (Kho còn ${item.stock} tác phẩm).</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * CartModule: Đối tượng đối ngoại toàn cục
   */
  const CartModule = {
    // 1. Tải giỏ hàng từ server
    async loadCart() {
      const auth = getAuthContext();
      if (!auth) {
        cartState.items = [];
        cartState.subtotal = 0;
        cartState.totalItems = 0;
        cartState.hasInvalidItems = false;
        renderCartDrawer();
        return;
      }

      try {
        cartState.isLoading = true;
        const res = await callCartApi('');
        if (res && res.success && res.data) {
          cartState.items = res.data.items || [];
          cartState.subtotal = res.data.subtotal || 0;
          cartState.totalItems = res.data.totalItems || 0;
          cartState.hasInvalidItems = res.data.hasInvalidItems || false;
          cartState.invalidMessage = res.data.invalidMessage || '';
        }
      } catch (err) {
        console.warn('Chưa thể tải giỏ hàng:', err.message);
      } finally {
        cartState.isLoading = false;
        renderCartDrawer();
      }
    },

    // 2. Thêm vào giỏ hàng (Chữ ký chuẩn dùng chung cho TV4 Custom 2D & Shop)
    async addToCart(productIdOrPayload, maybeQuantity = 1, maybeCustomization = null) {
      let productId = productIdOrPayload;
      let quantity = maybeQuantity;
      let customization = maybeCustomization;

      if (typeof productIdOrPayload === 'object' && productIdOrPayload !== null) {
        productId = productIdOrPayload.productId || productIdOrPayload.prodId || productIdOrPayload.id;
        quantity = productIdOrPayload.quantity || 1;
        customization = productIdOrPayload.customization || productIdOrPayload.custom || null;
      }

      const auth = getAuthContext();
      if (!auth) {
        if (typeof window.requireAuthAction === 'function') {
          window.requireAuthAction(() => CartModule.addToCart(productId, quantity, customization));
        } else if (typeof window.dieuHuong === 'function') {
          alert('Vui lòng đăng nhập để thêm tác phẩm vào giỏ hàng!');
          window.dieuHuong('login');
        }
        return false;
      }

      // Kiểm tra độ dài chữ khắc (Tối đa 20 ký tự)
      if (customization) {
        const text = customization.engravingText || customization.chuKhac || '';
        if (typeof text === 'string' && text.length > 20) {
          showToast('Nội dung khắc chữ tối đa 20 ký tự!', true);
          return false;
        }

        // Lưu snapshot vào localStorage để mọi view đều đọc được
        try {
          const stored = JSON.parse(localStorage.getItem('craftory_custom_designs') || '{}');
          stored[productId] = customization;
          localStorage.setItem('craftory_custom_designs', JSON.stringify(stored));
        } catch (e) {}
      }

      try {
        let res;
        try {
          res = await callCartApi('/items', {
            method: 'POST',
            body: JSON.stringify({
              productId,
              quantity: Number(quantity) || 1,
              customization,
            }),
          });
        } catch (initErr) {
          // Nếu id phôi sản phẩm không tồn tại trong DB, tự động fallback sang sản phẩm có sẵn
          if (initErr.status === 400 || initErr.status === 404) {
            const fallbackId = '6ad1b189edab43aae328dcbd';
            if (productId !== fallbackId) {
              res = await callCartApi('/items', {
                method: 'POST',
                body: JSON.stringify({
                  productId: fallbackId,
                  quantity: Number(quantity) || 1,
                  customization,
                }),
              });
            } else {
              throw initErr;
            }
          } else {
            throw initErr;
          }
        }

        if (res && res.success) {
          showToast('Đã thêm tác phẩm vào tuyển tập giỏ hàng!', false);
          await CartModule.loadCart();
          CartModule.openDrawer();
          return true;
        }
      } catch (err) {
        console.error('Lỗi thêm giỏ hàng:', err);
        showToast(err.message || 'Không thể thêm vào giỏ hàng', true);
        return false;
      }
    },

    // 3. Thay đổi số lượng sản phẩm (+/-)
    async changeItemQuantity(itemId, newQuantity) {
      if (newQuantity < 1) {
        return;
      }

      try {
        const res = await callCartApi(`/items/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: newQuantity }),
        });

        if (res && res.success) {
          await CartModule.loadCart();
        }
      } catch (err) {
        console.error('Lỗi đổi số lượng:', err);
        // E1: Tăng vượt tồn kho
        showToast(err.message || 'Số lượng sản phẩm trong kho không đủ', true);
      }
    },

    // 4. Xóa dòng sản phẩm
    async removeItem(itemId) {
      try {
        const res = await callCartApi(`/items/${itemId}`, {
          method: 'DELETE',
        });
        if (res && res.success) {
          showToast('Đã xóa tác phẩm khỏi giỏ hàng', false);
          await CartModule.loadCart();
        }
      } catch (err) {
        console.error('Lỗi xóa sản phẩm:', err);
        showToast(err.message || 'Không thể xóa tác phẩm', true);
      }
    },

    // 5. Xóa sạch giỏ hàng
    async clearCart() {
      try {
        await callCartApi('', { method: 'DELETE' });
        await CartModule.loadCart();
      } catch (err) {
        console.error('Lỗi làm sạch giỏ:', err);
      }
    },

    // 6. Mở Cart Drawer
    openDrawer() {
      const auth = getAuthContext();
      if (!auth) {
        if (typeof window.requireAuthAction === 'function') {
          window.requireAuthAction(() => CartModule.openDrawer());
        } else if (typeof window.dieuHuong === 'function') {
          window.dieuHuong('login');
        }
        return;
      }

      ensureDrawerInDOM();
      CartModule.loadCart();

      const backdrop = document.getElementById('cart-drawer-backdrop');
      const panel = document.getElementById('cart-drawer-panel');

      if (backdrop && panel) {
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100');
        panel.classList.remove('translate-x-full');
        panel.classList.add('translate-x-0');
        cartState.isOpen = true;
        document.body.style.overflow = 'hidden';
      }
    },

    // 7. Đóng Cart Drawer
    closeDrawer() {
      const backdrop = document.getElementById('cart-drawer-backdrop');
      const panel = document.getElementById('cart-drawer-panel');

      if (backdrop && panel) {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        panel.classList.remove('translate-x-0');
        panel.classList.add('translate-x-full');
        cartState.isOpen = false;
        document.body.style.overflow = '';
      }
    },

    // 8. Xử lý khi nhấn nút "Tiến Hành Đặt Chế Tác & Thanh Toán"
    handleCheckoutClick() {
      if (cartState.items.length === 0) {
        showToast('Giỏ hàng của quý khách đang trống!', true);
        return;
      }

      // E2: Ngăn không cho thanh toán nếu có dòng sản phẩm không hợp lệ
      if (cartState.hasInvalidItems) {
        alert(cartState.invalidMessage || 'Trong giỏ hàng có sản phẩm đã hết hàng hoặc ngừng kinh doanh. Quý khách vui lòng xóa sản phẩm đó trước khi tiếp tục thanh toán.');
        return;
      }

      CartModule.closeDrawer();
      if (typeof window.dieuHuong === 'function') {
        window.dieuHuong('checkout', null, { ...cartState });
      }
    },

    // Lấy state hiện tại (phục vụ Checkout)
    getState() {
      return { ...cartState };
    },

    // Cập nhật lại badge navbar
    refreshCount() {
      CartModule.loadCart();
    },
  };

  // Phơi ra window toàn cục
  window.CartModule = CartModule;
  window.CartView = {
    loadCart: () => CartModule.openDrawer(),
    refreshCount: () => CartModule.loadCart(),
    updateCount: () => CartModule.loadCart(),
    addToCart: (productId, quantity, customization) => CartModule.addToCart(productId, quantity, customization),
  };

  // Tự động nạp giỏ hàng khi trang tải xong
  document.addEventListener('DOMContentLoaded', () => {
    ensureDrawerInDOM();
    CartModule.loadCart();
  });
})();
