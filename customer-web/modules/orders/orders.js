/**
 * customer-web/modules/orders/orders.js
 * Quản lý Thanh toán & Đặt hàng (UC-C06) và Theo dõi & Hủy đơn hàng (UC-C07)
 * Tuân thủ 100% thiết kế Stitch:
 * - Nhập thông tin & Thanh toán (Checkout)
 * - Đặt hàng thành công (Order Success)
 * - Chi tiết đơn hàng & Theo dõi trạng thái (Order Tracking)
 */

(function () {
  'use strict';

  function getAuthContext() {
    try {
      let user = null;
      const saved = localStorage.getItem('craftory_user');
      if (saved) {
        user = JSON.parse(saved);
      } else if (window.currentUser) {
        user = window.currentUser;
      }
      if (user) {
        return {
          user,
          accountId: user._id || user.id,
          token: user.token || user._id || user.id,
        };
      }
    } catch (e) {
      console.error('Lỗi đọc auth context:', e);
    }
    return null;
  }

  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${formatDate(dateStr)}`;
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

  async function apiFetch(endpoint, options = {}) {
    const auth = getAuthContext();
    if (!auth) {
      const err = new Error('Vui lòng đăng nhập để thực hiện thao tác này');
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

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || 'Lỗi thao tác hệ thống');
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ==========================================
  // 1. THANH TOÁN & ĐẶT HÀNG (UC-C06 - CHECKOUT)
  // ==========================================
  let currentCheckoutCart = null;

  async function initCheckoutPage(checkoutParam) {
    const auth = getAuthContext();
    if (!auth) {
      alert('Vui lòng đăng nhập để thanh toán đơn hàng!');
      if (typeof window.dieuHuong === 'function') window.dieuHuong('login');
      return;
    }

    try {
      const incomingParam = checkoutParam || window.currentViewParam;
      let cartData = (incomingParam && Array.isArray(incomingParam.items) && incomingParam.items.length > 0) ? incomingParam : null;

      // 1. Thử gọi API cart từ backend nếu chưa có dữ liệu từ param
      if (!cartData) {
        try {
          const res = await apiFetch('/cart');
          if (res && res.success && res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
            cartData = res.data;
          }
        } catch (apiErr) {
          console.warn('apiFetch /cart trong checkout gặp lỗi, thử fallback sang CartModule:', apiErr);
        }
      }

      // 2. Fallback sang CartModule.getState() nếu API chưa có hoặc rỗng
      if ((!cartData || !cartData.items || cartData.items.length === 0) && window.CartModule && typeof window.CartModule.getState === 'function') {
        const localState = window.CartModule.getState();
        if (localState && Array.isArray(localState.items) && localState.items.length > 0) {
          cartData = localState;
        }
      }

      if (!cartData || !cartData.items || cartData.items.length === 0) {
        const summaryList = document.getElementById('checkout-items-summary-list');
        if (summaryList) {
          summaryList.innerHTML = `
            <div class="py-8 text-center text-[#74777e] flex flex-col items-center gap-2">
              <span class="material-symbols-outlined text-[32px] text-[#a23e18]">shopping_basket</span>
              <p class="text-sm font-medium">Tuyển tập của quý khách chưa có sản phẩm nào</p>
              <button onclick="dieuHuong('shop')" class="mt-2 text-xs font-bold text-[#a23e18] uppercase tracking-wider hover:underline cursor-pointer">
                Khám phá bộ sưu tập ngay →
              </button>
            </div>
          `;
        }
        return;
      }

      currentCheckoutCart = cartData;

      // E2: Nếu giỏ có sản phẩm không hợp lệ
      if (currentCheckoutCart.hasInvalidItems) {
        alert(currentCheckoutCart.invalidMessage || 'Trong giỏ hàng có sản phẩm không hợp lệ hoặc đã hết hàng. Quý khách vui lòng kiểm tra lại giỏ hàng.');
        if (window.CartModule) window.CartModule.openDrawer();
        return;
      }

      renderCheckoutPage();
      setupAddressAutoFill(auth.user);
      setupPaymentMethodSelection();
    } catch (err) {
      console.error('Lỗi khởi tạo checkout:', err);
    }
  }

  function renderCheckoutPage() {
    if (!currentCheckoutCart || !Array.isArray(currentCheckoutCart.items) || currentCheckoutCart.items.length === 0) {
      return;
    }

    // Render danh sách sản phẩm tóm tắt bên cột phải
    const summaryList = document.getElementById('checkout-items-summary-list');
    const summaryCount = document.getElementById('checkout-items-count-badge');
    const subtotalDisplay = document.getElementById('checkout-subtotal-display');
    const shippingFeeDisplay = document.getElementById('checkout-shipping-fee-display');
    const grandTotalDisplay = document.getElementById('checkout-grand-total-display');
    const submitBtnText = document.getElementById('btn-submit-text');

    let calculatedSubtotal = 0;
    let calculatedTotalQty = 0;

    // Tính toán lại tổng tiền và số lượng đảm bảo không bao giờ bị 0₫
    currentCheckoutCart.items.forEach(item => {
      const custom = item.customization;
      const unitPrice = Number(item.currentPrice) || Number(item.unitPrice) || Number(item.price) || (custom && Number(custom.price)) || 0;
      const qty = Number(item.quantity) || 1;
      const lineTotal = Number(item.totalPrice) > 0 ? Number(item.totalPrice) : (unitPrice * qty);

      calculatedSubtotal += lineTotal;
      calculatedTotalQty += qty;
    });

    const totalQty = currentCheckoutCart.totalItems || calculatedTotalQty;
    const subtotal = (currentCheckoutCart.subtotal != null && Number(currentCheckoutCart.subtotal) > 0) 
      ? Number(currentCheckoutCart.subtotal) 
      : calculatedSubtotal;
    const shippingFee = subtotal >= 1000000 ? 0 : 30000;
    const totalAmount = subtotal + shippingFee;

    if (summaryCount) summaryCount.textContent = `${totalQty} Sản phẩm`;
    if (subtotalDisplay) subtotalDisplay.textContent = formatMoney(subtotal);
    if (shippingFeeDisplay) {
      shippingFeeDisplay.textContent = shippingFee === 0 ? 'Miễn phí (0₫)' : formatMoney(shippingFee);
    }
    if (grandTotalDisplay) grandTotalDisplay.textContent = formatMoney(totalAmount);
    if (submitBtnText) submitBtnText.textContent = `Xác nhận đặt hàng • ${formatMoney(totalAmount)}`;

    if (summaryList) {
      summaryList.innerHTML = currentCheckoutCart.items.map(item => {
        const custom = item.customization;
        const isCustomized = Boolean(custom && (custom.glazeColor || custom.pattern || custom.engravingText || custom.men || custom.hoaVan || custom.chuKhac || custom.blankName || custom.designName));
        const glazeText = custom ? (custom.blankName || custom.glazeColor || custom.men || '') : '';
        const patternText = custom ? (custom.motifName || custom.pattern || custom.hoaVan || '') : '';
        const engravingText = custom ? (custom.engravingText || custom.chuKhac || '') : '';
        const designName = custom ? (custom.designName || '') : '';
        const rawName = item.name || item.productName || (custom && custom.blankName) || 'Tác phẩm gốm Bát Tràng';
        const displayName = designName ? `${designName}` : rawName;
        
        const displayImg = (custom && (custom.previewImage || custom.blankImage)) || item.image || (item.images && item.images[0]) || 'assets/img/logo.png';
        const motifImg = custom && custom.motifImage ? custom.motifImage : '';

        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.currentPrice) || Number(item.unitPrice) || Number(item.price) || (custom && Number(custom.price)) || 0;
        const lineTotal = Number(item.totalPrice) > 0 ? Number(item.totalPrice) : (unitPrice * qty);

        return `
          <div class="pt-3 first:pt-0 flex items-start gap-4">
            <div class="relative w-20 h-24 sm:w-24 sm:h-28 flex-shrink-0 bg-[#f8f9fa] rounded overflow-hidden shadow-xs border border-[#EBEAE5] flex items-center justify-center">
              <img src="${escapeHtml(displayImg)}" 
                   alt="${escapeHtml(displayName)}" 
                   class="w-full h-full object-contain p-1"
                   onerror="this.onerror=null; this.src='assets/img/logo.png';">
              ${motifImg ? `
                <img src="${escapeHtml(motifImg)}" 
                     class="absolute w-8 h-8 object-contain pointer-events-none" 
                     style="mix-blend-mode: multiply;" 
                     alt="Họa tiết">
              ` : ''}
              <span class="absolute top-1 right-1 bg-[#000f22] text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                ${qty}
              </span>
              ${isCustomized ? `
                <span class="absolute bottom-1 left-1 bg-[#0a2540] text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                  2D
                </span>
              ` : ''}
            </div>
            <div class="flex flex-col gap-1 flex-grow min-w-0">
              <span class="text-[10px] uppercase ${isCustomized ? 'text-[#ac8441]' : 'text-[#a23e18]'} tracking-wider font-semibold">
                ${isCustomized ? 'Độc bản tùy biến 2D' : 'Kiệt tác cung đình'}
              </span>
              <h3 class="font-semibold text-[15px] text-[#000f22] leading-snug truncate" title="${escapeHtml(displayName)}">
                ${escapeHtml(displayName)}
              </h3>
              ${designName && designName !== rawName ? `
                <p class="text-[11px] text-[#74777e] truncate">Phôi gốc: ${escapeHtml(rawName)}</p>
              ` : ''}
              ${isCustomized ? `
                <p class="text-[11px] text-[#74777e] leading-relaxed line-clamp-2">
                  ${glazeText ? `Phôi: ${escapeHtml(glazeText)}; ` : ''}
                  ${patternText ? `Họa tiết: ${escapeHtml(patternText)}; ` : ''}
                  ${engravingText ? `Khắc chữ: '${escapeHtml(engravingText)}'` : ''}
                </p>
              ` : ''}
              <div class="flex items-baseline justify-between mt-1">
                <span class="text-[11px] text-[#74777e]">SL: ${qty.toString().padStart(2, '0')} ${isCustomized ? '• Giá chế tác' : '• Đơn giá'}: ${formatMoney(unitPrice)}</span>
                <span class="font-bold text-[15px] text-[#000f22] font-numeric">${formatMoney(lineTotal)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function setupAddressAutoFill(user) {
    const nameInput = document.getElementById('checkout-fullname');
    const phoneInput = document.getElementById('checkout-phone');
    const provinceSelect = document.getElementById('checkout-province');
    const wardInput = document.getElementById('checkout-ward');
    const addressInput = document.getElementById('checkout-address');
    const noteInput = document.getElementById('checkout-note');
    const addressSelector = document.getElementById('checkout-saved-address-selector');

    if (!user) return;

    // Helper: Tự động lưu draft địa chỉ khi khách hàng gõ trên form
    function saveDraftAddress() {
      try {
        const draft = {
          recipientName: nameInput ? nameInput.value.trim() : '',
          phone: phoneInput ? phoneInput.value.trim() : '',
          province: provinceSelect ? provinceSelect.value.trim() : '',
          ward: wardInput ? wardInput.value.trim() : '',
          detail: addressInput ? addressInput.value.trim() : '',
          note: noteInput ? noteInput.value.trim() : '',
        };
        localStorage.setItem('craftory_checkout_address_draft', JSON.stringify(draft));
      } catch (e) {}
    }

    // Lắng nghe sự kiện gõ phím và thay đổi trên tất cả các trường địa chỉ
    [nameInput, phoneInput, provinceSelect, wardInput, addressInput, noteInput].forEach(el => {
      if (el) {
        el.removeEventListener('input', saveDraftAddress);
        el.removeEventListener('change', saveDraftAddress);
        el.addEventListener('input', saveDraftAddress);
        el.addEventListener('change', saveDraftAddress);
      }
    });

    const addresses = Array.isArray(user.addresses) ? user.addresses : [];

    // Kiểm tra xem có draft đang nhập dở trước đó không
    let draft = null;
    try {
      const savedDraft = localStorage.getItem('craftory_checkout_address_draft');
      if (savedDraft) draft = JSON.parse(savedDraft);
    } catch (e) {}

    // Nếu người dùng có các địa chỉ đã lưu trong hồ sơ
    if (addressSelector && addresses.length > 0) {
      addressSelector.classList.remove('hidden');
      const selectEl = document.getElementById('checkout-address-select');
      if (selectEl) {
        selectEl.innerHTML = `
          <option value="new">-- Nhập địa chỉ mới --</option>
          ${addresses.map((addr, idx) => `
            <option value="${idx}" ${addr.isDefault ? 'selected' : ''}>
              ${escapeHtml(addr.recipientName)} - ${escapeHtml(addr.phone)} (${escapeHtml(addr.detail)}, ${escapeHtml(addr.ward)}, ${escapeHtml(addr.province)}) ${addr.isDefault ? '[Mặc định]' : ''}
            </option>
          `).join('')}
        `;

        selectEl.onchange = function () {
          if (this.value === 'new') {
            if (nameInput) nameInput.value = user.fullName || '';
            if (phoneInput) phoneInput.value = user.phone || '';
            if (addressInput) addressInput.value = '';
            if (wardInput) wardInput.value = '';
            saveDraftAddress();
          } else {
            const chosen = addresses[parseInt(this.value, 10)];
            if (chosen) {
              if (nameInput) nameInput.value = chosen.recipientName || '';
              if (phoneInput) phoneInput.value = chosen.phone || '';
              if (provinceSelect) provinceSelect.value = chosen.province || 'Hà Nội';
              if (wardInput) wardInput.value = chosen.ward || '';
              if (addressInput) addressInput.value = chosen.detail || '';
              saveDraftAddress();
            }
          }
        };
      }
    }

    // Ưu tiên điền: Draft đã nhập -> Địa chỉ mặc định đã lưu -> Họ tên tài khoản
    if (draft && (draft.detail || draft.ward || draft.recipientName || draft.phone)) {
      if (nameInput && draft.recipientName) nameInput.value = draft.recipientName;
      if (phoneInput && draft.phone) phoneInput.value = draft.phone;
      if (provinceSelect && draft.province) provinceSelect.value = draft.province;
      if (wardInput && draft.ward) wardInput.value = draft.ward;
      if (addressInput && draft.detail) addressInput.value = draft.detail;
      if (noteInput && draft.note) noteInput.value = draft.note;
    } else {
      const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
      if (defaultAddress) {
        if (nameInput) nameInput.value = defaultAddress.recipientName || user.fullName || '';
        if (phoneInput) phoneInput.value = defaultAddress.phone || user.phone || '';
        if (provinceSelect && defaultAddress.province) provinceSelect.value = defaultAddress.province;
        if (wardInput) wardInput.value = defaultAddress.ward || '';
        if (addressInput) addressInput.value = defaultAddress.detail || '';
      } else {
        if (nameInput) nameInput.value = user.fullName || '';
        if (phoneInput) phoneInput.value = user.phone || '';
      }
      saveDraftAddress();
    }
  }

  /**
   * Hiệu ứng khung viền nâu di chuyển theo phương thức thanh toán được chọn
   */
  const PAYMENT_ACTIVE_CLASSES = ['bg-[#fdfaf7]', 'border-2', 'border-[#a23e18]', 'ring-1', 'ring-[#a23e18]/25', 'shadow-xs', 'scale-[1.005]'];
  const PAYMENT_INACTIVE_CLASSES = ['bg-white', 'border', 'border-[#EBEAE5]', 'hover:border-[#a23e18]/60', 'hover:bg-[#fafaf8]', 'shadow-xs'];

  function applyPaymentSelectionStyle() {
    const group = document.getElementById('payment-methods-radio-group');
    if (!group) return;

    const cards = group.querySelectorAll('label');
    cards.forEach(label => {
      const radio = label.querySelector('input[type="radio"][name="payment_method"]');
      if (radio && radio.checked) {
        label.classList.remove('bg-white', 'border', 'border-[#EBEAE5]', 'hover:border-[#a23e18]/60', 'hover:bg-[#fafaf8]');
        PAYMENT_ACTIVE_CLASSES.forEach(cls => label.classList.add(cls));
      } else {
        label.classList.remove('bg-[#fdfaf7]', 'border-2', 'border-[#a23e18]', 'ring-1', 'ring-[#a23e18]/25', 'scale-[1.005]');
        PAYMENT_INACTIVE_CLASSES.forEach(cls => label.classList.add(cls));
      }
    });
  }

  function selectPaymentMethod(value) {
    if (!value) return;
    const radio = document.querySelector(`input[name="payment_method"][value="${value}"]`);
    if (radio) {
      radio.checked = true;
      applyPaymentSelectionStyle();
    }
  }

  function setupPaymentMethodSelection() {
    const group = document.getElementById('payment-methods-radio-group');
    if (!group) return;

    const radios = group.querySelectorAll('input[type="radio"][name="payment_method"]');
    radios.forEach(radio => {
      radio.onchange = applyPaymentSelectionStyle;
    });

    const cards = group.querySelectorAll('label');
    cards.forEach(card => {
      card.onclick = function (e) {
        const radio = card.querySelector('input[type="radio"][name="payment_method"]');
        if (radio) {
          radio.checked = true;
          applyPaymentSelectionStyle();
        }
      };
    });

    applyPaymentSelectionStyle();
  }

  /**
   * Đặt hàng (Submit Checkout Form)
   */
  async function submitOrder() {
    const nameInput = document.getElementById('checkout-fullname');
    const phoneInput = document.getElementById('checkout-phone');
    const provinceSelect = document.getElementById('checkout-province');
    const wardInput = document.getElementById('checkout-ward');
    const addressInput = document.getElementById('checkout-address');
    const noteInput = document.getElementById('checkout-note');
    const saveAddrCheckbox = document.getElementById('checkout-save-address');
    const submitBtn = document.getElementById('btn-submit-order');
    const submitText = document.getElementById('btn-submit-text');

    const paymentMethodEl = document.querySelector('input[name="payment_method"]:checked');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'COD';

    // Xóa lỗi cũ
    clearFieldErrors();

    const recipientName = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const province = provinceSelect ? provinceSelect.value.trim() : '';
    const ward = wardInput ? wardInput.value.trim() : '';
    const detail = addressInput ? addressInput.value.trim() : '';
    const note = noteInput ? noteInput.value.trim() : '';
    const shouldSaveAddress = saveAddrCheckbox ? saveAddrCheckbox.checked : true;

    // Kiểm tra E1 ở Client
    const errors = {};
    if (!recipientName) errors['fullname'] = 'Vui lòng nhập họ và tên người nhận';
    
    const cleanPhone = phone.replace(/[\s.\-()]/g, '');
    const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    if (!cleanPhone) {
      errors['phone'] = 'Số điện thoại không được để trống';
    } else if (!vnPhoneRegex.test(cleanPhone)) {
      errors['phone'] = 'Số điện thoại không đúng định dạng VN (10 số, đầu 03, 05, 07, 08, 09)';
    }

    if (!province) errors['province'] = 'Vui lòng chọn Tỉnh/Thành phố';
    if (!ward) errors['ward'] = 'Vui lòng nhập Phường/Xã';
    if (!detail) errors['address'] = 'Vui lòng cung cấp địa chỉ chi tiết (số nhà, đường...)';

    if (Object.keys(errors).length > 0) {
      highlightFieldErrors(errors);
      alert('Quý khách vui lòng hoàn thiện đầy đủ và chính xác các thông tin giao nhận bôi đỏ.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
      submitText.textContent = 'Đang niêm phong đơn hàng & đối soát tồn kho...';

      const payload = {
        shippingAddress: {
          recipientName,
          phone: cleanPhone,
          province,
          ward,
          detail,
        },
        paymentMethod: paymentMethod.toUpperCase(),
        note,
      };

      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.success && res.data) {
        // Cập nhật lại giỏ hàng
        if (window.CartModule) await window.CartModule.loadCart();

        // 1. Tự động lưu địa chỉ vừa nhập vào user trong localStorage & gọi API đồng bộ
        try {
          const auth = getAuthContext();
          if (auth && auth.user && shouldSaveAddress) {
            const u = auth.user;
            if (!Array.isArray(u.addresses)) u.addresses = [];
            const newAddr = {
              recipientName,
              phone: cleanPhone,
              province,
              ward,
              detail,
              isDefault: true,
            };
            u.addresses.forEach(a => { a.isDefault = false; });
            const existIdx = u.addresses.findIndex(a =>
              (a.detail || '').trim().toLowerCase() === newAddr.detail.toLowerCase() &&
              (a.ward || '').trim().toLowerCase() === newAddr.ward.toLowerCase() &&
              (a.province || '').trim().toLowerCase() === newAddr.province.toLowerCase()
            );
            if (existIdx > -1) {
              u.addresses[existIdx] = newAddr;
              const matched = u.addresses.splice(existIdx, 1)[0];
              u.addresses.unshift(matched);
            } else {
              u.addresses.unshift(newAddr);
            }
            localStorage.setItem('craftory_user', JSON.stringify(u));
            if (window.currentUser) window.currentUser = u;

            // Gọi API backend lưu địa chỉ đồng bộ
            try {
              await apiFetch('/accounts/address', {
                method: 'POST',
                body: JSON.stringify({
                  accountId: auth.accountId,
                  recipientName,
                  phone: cleanPhone,
                  province,
                  ward,
                  detail,
                  isDefault: true,
                }),
              });
            } catch (addrApiErr) {
              console.warn('Backend đã tự động lưu địa chỉ qua Order:', addrApiErr);
            }
          }
          // Xóa draft nhập liệu sau khi tạo đơn thành công
          localStorage.removeItem('craftory_checkout_address_draft');
        } catch (e) {
          console.warn('Lỗi cập nhật localStorage user addresses:', e);
        }

        // 2. Chuẩn bị dữ liệu hiển thị trang Thành công đầy đủ nhất
        const subtotalVal = (res.data.subtotal != null && Number(res.data.subtotal) > 0)
          ? Number(res.data.subtotal)
          : (currentCheckoutCart ? Number(currentCheckoutCart.subtotal || 0) : 0);
        const shippingFeeVal = (res.data.shippingFee != null)
          ? Number(res.data.shippingFee)
          : (subtotalVal >= 1000000 ? 0 : 30000);
        const totalAmountVal = Number(res.data.totalAmount) || (subtotalVal + shippingFeeVal);

        const successData = {
          orderId: res.data._id,
          orderCode: res.data.orderCode,
          subtotal: subtotalVal,
          shippingFee: shippingFeeVal,
          discount: Number(res.data.discount) || 0,
          totalAmount: totalAmountVal,
          paymentMethod: res.data.paymentMethod || paymentMethod.toUpperCase(),
          paymentStatus: res.data.paymentStatus || 'unpaid',
          orderStatus: res.data.orderStatus || 'pending',
          recipientName,
          phone: cleanPhone,
          address: `${detail}, ${ward}, ${province}`,
          detail,
          ward,
          province,
          note,
          items: (res.data.items && res.data.items.length > 0) 
            ? res.data.items 
            : (currentCheckoutCart && currentCheckoutCart.items ? currentCheckoutCart.items : []),
          createdAt: res.data.createdAt || new Date().toISOString(),
        };

        // Lưu vào sessionStorage để khi reload trang không bao giờ bị mất
        try {
          sessionStorage.setItem('craftory_latest_order', JSON.stringify(successData));
        } catch (e) {}

        // Chuyển sang màn hình Đặt hàng thành công kèm thông tin
        if (typeof window.dieuHuong === 'function') {
          window.dieuHuong('order-success', null, successData);
        }
      }
    } catch (err) {
      console.error('Lỗi gửi đơn hàng:', err);
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
      renderCheckoutPage();

      // Xử lý E2: Giá thay đổi
      if (err.status === 409 && err.data && err.data.priceChanges) {
        const changesText = err.data.priceChanges.map(c => `• ${c.productName}: ${formatMoney(c.oldPrice)} -> ${formatMoney(c.newPrice)}`).join('\n');
        alert(`Đơn giá một số sản phẩm đã được xưởng cập nhật:\n${changesText}\n\nHệ thống đã đồng bộ lại giỏ hàng. Quý khách vui lòng kiểm tra và bấm "Xác nhận đặt hàng" lại.`);
        await initCheckoutPage();
        return;
      }

      // Xử lý E3: Tồn kho không đủ
      if (err.status === 400 && err.data && err.data.stockShortages) {
        const shortageText = err.data.stockShortages.map(s => `• ${s.productName}: Quý khách đặt ${s.requestedQuantity}, kho chỉ còn ${s.availableStock}`).join('\n');
        alert(`Số lượng sản phẩm trong kho không đủ để đáp ứng đơn hàng:\n${shortageText}\n\nQuý khách vui lòng quay lại giỏ hàng để điều chỉnh số lượng.`);
        if (window.CartModule) window.CartModule.openDrawer();
        return;
      }

      // Xử lý E1: Lỗi trường từ server
      if (err.data && err.data.fieldErrors) {
        const mappedErrors = {};
        if (err.data.fieldErrors.recipientName) mappedErrors['fullname'] = err.data.fieldErrors.recipientName;
        if (err.data.fieldErrors.phone) mappedErrors['phone'] = err.data.fieldErrors.phone;
        if (err.data.fieldErrors.province) mappedErrors['province'] = err.data.fieldErrors.province;
        if (err.data.fieldErrors.ward) mappedErrors['ward'] = err.data.fieldErrors.ward;
        if (err.data.fieldErrors.detail) mappedErrors['address'] = err.data.fieldErrors.detail;
        highlightFieldErrors(mappedErrors);
      }

      alert(err.message || 'Không thể tạo đơn hàng. Quý khách vui lòng thử lại.');
    }
  }

  function clearFieldErrors() {
    ['fullname', 'phone', 'province', 'ward', 'address'].forEach(id => {
      const input = document.getElementById(`checkout-${id}`);
      const errEl = document.getElementById(`err-${id}`);
      if (input) {
        input.classList.remove('border-2', 'border-[#ba1a1a]', 'bg-red-50', 'text-[#ba1a1a]');
      }
      if (errEl) {
        errEl.classList.add('hidden');
        errEl.textContent = '';
      }
    });
  }

  function highlightFieldErrors(errors) {
    Object.keys(errors).forEach(key => {
      const input = document.getElementById(`checkout-${key}`);
      const errEl = document.getElementById(`err-${key}`);
      if (input) {
        input.classList.add('border-2', 'border-[#ba1a1a]', 'bg-red-50', 'text-[#ba1a1a]');
      }
      if (errEl) {
        errEl.classList.remove('hidden');
        errEl.innerHTML = `<span class="material-symbols-outlined text-[14px]">info</span> ${escapeHtml(errors[key])}`;
      }
    });
  }

  // ==========================================
  // 2. ĐẶT HÀNG THÀNH CÔNG (ORDER SUCCESS)
  // ==========================================
  async function initOrderSuccessPage(param) {
    let data = param || null;

    // Phục hồi từ sessionStorage nếu param rỗng (do F5 hoặc truy cập trực tiếp)
    if (!data || !data.orderCode) {
      try {
        const cached = sessionStorage.getItem('craftory_latest_order');
        if (cached) data = JSON.parse(cached);
      } catch (e) {}
    }

    // Nếu vẫn chưa có, gọi API lấy đơn hàng mới nhất của khách
    if (!data || !data.orderCode) {
      try {
        const res = await apiFetch('/orders/my?limit=1');
        if (res && res.success && res.data && res.data.length > 0) {
          const latest = res.data[0];
          data = {
            orderId: latest._id,
            orderCode: latest.orderCode,
            subtotal: latest.subtotal || 0,
            shippingFee: latest.shippingFee != null ? latest.shippingFee : 0,
            discount: latest.discount || 0,
            totalAmount: latest.totalAmount || 0,
            paymentMethod: latest.paymentMethod || 'COD',
            paymentStatus: latest.paymentStatus || 'unpaid',
            orderStatus: latest.orderStatus || 'pending',
            recipientName: latest.shippingAddress?.recipientName || 'Quý khách',
            phone: latest.shippingAddress?.phone || '',
            address: `${latest.shippingAddress?.detail || ''}, ${latest.shippingAddress?.ward || ''}, ${latest.shippingAddress?.province || ''}`.replace(/^,\s*|,\s*$/g, ''),
            note: latest.note || '',
            items: latest.items || [],
            createdAt: latest.createdAt || new Date().toISOString(),
          };
          sessionStorage.setItem('craftory_latest_order', JSON.stringify(data));
        }
      } catch (fetchErr) {
        console.warn('Không thể tự động tải đơn hàng mới nhất:', fetchErr);
      }
    }

    data = data || {};
    const code = data.orderCode || data.orderId || 'MG-2025-8899';
    const cleanCode = String(code).replace(/^#/, '').trim();
    window.latestOrderCodeClean = cleanCode;

    const totalAmount = Number(data.totalAmount || 0);
    window.latestOrderAmountClean = totalAmount;

    const subtotal = data.subtotal != null ? Number(data.subtotal) : totalAmount;
    const shippingFee = data.shippingFee != null ? Number(data.shippingFee) : (subtotal >= 1000000 ? 0 : 30000);

    const codeEl = document.getElementById('success-order-code');
    const orderIdText = document.getElementById('orderIdText');
    const tickerEl = document.getElementById('success-order-ticker');
    const timeEl = document.getElementById('orderCreatedAtText');
    const statusTextEl = document.getElementById('orderStatusText');
    const amountEl = document.getElementById('success-order-amount');
    const subtotalEl = document.getElementById('success-subtotal-amount');
    const shippingFeeEl = document.getElementById('success-shipping-fee');
    const methodEl = document.getElementById('success-order-method');
    const recipientEl = document.getElementById('success-order-recipient');
    const recipientNameEl = document.getElementById('success-recipient-name');
    const phoneEl = document.getElementById('success-recipient-phone');
    const addressEl = document.getElementById('success-order-address');
    const noteContainer = document.getElementById('success-order-note-container');
    const noteEl = document.getElementById('success-order-note');
    const paymentStatusBadge = document.getElementById('success-payment-status-badge');
    const bankingBox = document.getElementById('success-banking-guide-box');
    const bankingContent = document.getElementById('banking-transfer-content');
    const bankingAmount = document.getElementById('banking-transfer-amount');
    const bankingQrImg = document.getElementById('banking-qr-image');
    const trackBtn = document.getElementById('success-btn-track');
    const cancelBtn = document.getElementById('success-btn-cancel');
    const itemsContainer = document.getElementById('success-order-items-list');
    const countBadge = document.getElementById('success-item-count-badge');

    if (codeEl) codeEl.textContent = `#${cleanCode}`;
    if (orderIdText) orderIdText.textContent = `#${cleanCode}`;
    if (tickerEl) tickerEl.textContent = `Đơn số #${cleanCode}`;
    if (timeEl) {
      timeEl.textContent = data.createdAt ? formatDateTime(data.createdAt) : `Hôm nay, ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (statusTextEl) {
      const oStatus = (data.orderStatus || 'pending').toLowerCase();
      statusTextEl.textContent = oStatus === 'completed' ? 'Đã hoàn thành' : (oStatus === 'shipping' ? 'Đang giao hàng' : (oStatus === 'confirmed' ? 'Đã xác nhận' : (oStatus === 'cancelled' ? 'Đã hủy' : 'Chờ xác nhận')));
    }

    if (amountEl) amountEl.textContent = formatMoney(totalAmount);
    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
    if (shippingFeeEl) {
      shippingFeeEl.textContent = shippingFee === 0 ? 'Miễn phí (0₫)' : formatMoney(shippingFee);
    }

    if (recipientEl) recipientEl.textContent = data.recipientName || 'Quý khách';
    if (recipientNameEl) recipientNameEl.textContent = data.recipientName || 'Quý khách';
    if (phoneEl && data.phone) {
      phoneEl.textContent = data.phone.startsWith('0') ? `(+84) ${data.phone.slice(1)}` : data.phone;
    }
    if (addressEl && data.address) addressEl.textContent = data.address;

    if (noteContainer && noteEl) {
      if (data.note && data.note.trim()) {
        noteContainer.classList.remove('hidden');
        noteEl.textContent = `"${data.note.trim()}"`;
      } else {
        noteContainer.classList.add('hidden');
      }
    }

    const method = (data.paymentMethod || 'COD').toUpperCase();
    if (methodEl) {
      if (method === 'COD') methodEl.textContent = 'Thanh toán khi nhận hàng (COD)';
      else if (method === 'MOMO') methodEl.textContent = 'Ví điện tử MoMo';
      else methodEl.textContent = 'Chuyển khoản VietQR Doanh Nghiệp';
    }

    if (paymentStatusBadge) {
      const pStatus = (data.paymentStatus || 'unpaid').toLowerCase();
      if (pStatus === 'paid') {
        paymentStatusBadge.className = 'bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide uppercase border border-emerald-200';
        paymentStatusBadge.textContent = 'Đã thanh toán';
      } else if (pStatus === 'awaiting_verification') {
        paymentStatusBadge.className = 'bg-amber-50 text-amber-800 px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide uppercase border border-amber-200';
        paymentStatusBadge.textContent = 'Chờ đối soát chuyển khoản';
      } else {
        paymentStatusBadge.className = 'bg-[#e7e8e9] text-[#43474d] px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide uppercase border border-[#c4c6ce]';
        paymentStatusBadge.textContent = 'Chưa thanh toán';
      }
    }

    // Hiển thị VietQR động nếu là Chuyển khoản hoặc MoMo
    if (bankingBox) {
      if (method === 'BANKING' || method === 'MOMO') {
        bankingBox.classList.remove('hidden');
        if (bankingContent) bankingContent.textContent = cleanCode;
        if (bankingAmount) bankingAmount.textContent = formatMoney(totalAmount);
        if (bankingQrImg) {
          const vietQrUrl = `https://img.vietqr.io/image/MB-170588889999-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(cleanCode)}&accountName=CTCP%20LANG%20GOM%20THANH%20XUAN`;
          bankingQrImg.src = vietQrUrl;
        }
      } else {
        bankingBox.classList.add('hidden');
      }
    }

    // Hàm gọi thông báo đã chuyển khoản
    window.notifyTransferCompleted = async function () {
      const btn = document.getElementById('btn-confirm-transfer');
      const text = document.getElementById('btn-confirm-transfer-text');
      if (btn) btn.disabled = true;
      if (text) text.textContent = 'Đang gửi thông báo đối soát...';

      try {
        if (data.orderId) {
          await apiFetch(`/orders/my/${data.orderId}/pay-notify`, { method: 'PATCH' });
        }
        if (paymentStatusBadge) {
          paymentStatusBadge.className = 'bg-amber-50 text-amber-800 px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide uppercase border border-amber-200';
          paymentStatusBadge.textContent = 'Chờ đối soát chuyển khoản';
        }
        if (text) text.textContent = '✓ Đã ghi nhận thông báo chuyển khoản';
        alert('Hệ thống đã tiếp nhận thông báo chuyển khoản của quý khách. Nghệ nhân đối soát sẽ xác nhận và đưa tác phẩm vào lò ngay.');
      } catch (e) {
        if (text) text.textContent = 'Tôi đã chuyển khoản thành công';
        if (btn) btn.disabled = false;
        alert(e.message || 'Lỗi gửi thông báo đối soát. Quý khách vui lòng thử lại.');
      }
    };

    // Hàm hủy đơn nhanh nếu vừa đặt nhầm
    const oStatus = (data.orderStatus || 'pending').toLowerCase();
    if (cancelBtn) {
      if (oStatus === 'pending') {
        cancelBtn.classList.remove('hidden');
      } else {
        cancelBtn.classList.add('hidden');
      }
    }

    window.cancelOrderImmediate = async function () {
      if (!confirm(`Quý khách có chắc chắn muốn hủy đơn hàng #${cleanCode} không?`)) {
        return;
      }
      try {
        if (data.orderId) {
          await apiFetch(`/orders/my/${data.orderId}/cancel`, {
            method: 'PATCH',
            body: JSON.stringify({ reason: 'Khách hàng đặt nhầm hoặc thay đổi thông tin' }),
          });
          alert(`Đã hủy đơn hàng #${cleanCode} thành công.`);
          if (statusTextEl) statusTextEl.textContent = 'Đã hủy';
          if (cancelBtn) cancelBtn.classList.add('hidden');
          data.orderStatus = 'cancelled';
          sessionStorage.setItem('craftory_latest_order', JSON.stringify(data));
        }
      } catch (err) {
        alert(err.message || 'Không thể hủy đơn hàng vào lúc này.');
      }
    };

    // Render danh sách sản phẩm động
    if (itemsContainer && Array.isArray(data.items) && data.items.length > 0) {
      if (countBadge) {
        countBadge.textContent = `${String(data.items.length).padStart(2, '0')} Tác phẩm`;
      }
      itemsContainer.innerHTML = data.items.map(it => {
        const itName = it.name || it.productName || (it.customization && it.customization.designName) || (it.customization && it.customization.blankName) || 'Tác phẩm gốm Bát Tràng';
        const itPrice = Number(it.price) || Number(it.unitPrice) || Number(it.currentPrice) || (it.customization && Number(it.customization.price)) || 0;
        const itQty = Number(it.quantity) || 1;
        const itTotal = Number(it.totalPrice) > 0 ? Number(it.totalPrice) : (itPrice * itQty);
        const itImg = (it.customization && (it.customization.previewImage || it.customization.blankImage)) || it.image || it.productImage || (it.images && it.images[0]) || 'assets/img/logo.png';
        const is2D = Boolean(it.customization && (it.customization.glazeColor || it.customization.pattern || it.customization.engravingText || it.customization.men || it.customization.hoaVan || it.customization.chuKhac || it.customization.blankName || it.customization.designName));
        const engText = (it.customization && (it.customization.engravingText || it.customization.chuKhac)) || '';
        const glazeText = (it.customization && (it.customization.blankName || it.customization.glazeColor || it.customization.men)) || '';
        const patternText = (it.customization && (it.customization.motifName || it.customization.pattern || it.customization.hoaVan)) || '';

        return `
          <div class="bg-[#f3f4f5] rounded-xl p-4 hover:shadow-sm transition-shadow border border-[#EBEAE5]">
            <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div class="relative w-24 h-28 sm:w-28 sm:h-32 rounded-lg overflow-hidden bg-white shrink-0 shadow-sm border border-[#EBEAE5] flex items-center justify-center">
                <img class="w-full h-full object-contain p-1" alt="${escapeHtml(itName)}" src="${escapeHtml(itImg)}" onerror="this.src='assets/img/logo.png'">
                ${is2D ? '<span class="absolute top-1 left-1 bg-[#000f22]/90 text-white font-[\'Plus_Jakarta_Sans\',sans-serif] text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">Cá nhân hoá 2D</span>' : ''}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-[\'Plus_Jakarta_Sans\',sans-serif] text-[16px] text-[#000f22] font-semibold line-clamp-1" title="${escapeHtml(itName)}">
                    ${escapeHtml(itName)}
                  </h3>
                  <span class="font-[\'Plus_Jakarta_Sans\',sans-serif] text-[16px] text-[#a23e18] font-bold whitespace-nowrap">
                    ${formatMoney(itTotal)}
                  </span>
                </div>
                <p class="font-[\'Plus_Jakarta_Sans\',sans-serif] text-[13px] text-[#43474d] mt-1 leading-relaxed">
                  ${is2D ? `Thiết kế 2D độc bản: ${glazeText ? 'Phôi: ' + escapeHtml(glazeText) + '; ' : ''}${patternText ? 'Họa tiết: ' + escapeHtml(patternText) + '; ' : ''}${engText ? 'Khắc chữ: <span class="text-[#000f22] font-semibold">"' + escapeHtml(engText) + '"</span>' : 'Khắc chìm phôi gốm hoàng gia.'}` : 'Chế tác theo cổ pháp truyền thống Làng Gốm Bát Tràng, phủ triện nổi chân bình.'}
                </p>
                <div class="flex flex-wrap items-center gap-2 mt-3 font-[\'Plus_Jakarta_Sans\',sans-serif] text-[11px] text-[#43474d]">
                  <span class="bg-white px-2 py-0.5 rounded shadow-xs border border-[#EBEAE5] flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-[#a23e18]"></span> Đơn giá: ${formatMoney(itPrice)}
                  </span>
                  <span class="bg-white px-2 py-0.5 rounded shadow-xs border border-[#EBEAE5] text-[#ac8441] font-semibold">Số lượng: ${String(itQty).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (trackBtn) {
      trackBtn.onclick = function () {
        if (typeof window.dieuHuong === 'function') {
          window.dieuHuong('profile', null, cleanCode);
        }
      };
    }
  }

  // ==========================================
  // 3. THEO DÕI & CHI TIẾT ĐƠN HÀNG (UC-C07)
  // ==========================================
  let myOrdersList = [];
  let currentOrderFilter = 'all';

  async function initOrderTrackingPage(param) {
    const auth = getAuthContext();
    if (!auth) {
      alert('Vui lòng đăng nhập để xem lịch sử và theo dõi đơn hàng!');
      if (typeof window.dieuHuong === 'function') window.dieuHuong('login');
      return;
    }

    try {
      const res = await apiFetch('/orders/my?limit=50');
      if (res && res.success) {
        myOrdersList = res.data || [];
        renderOrdersList();

        // Nếu truyền orderId hoặc orderCode qua param thì cuộn đến hoặc mở chi tiết
        if (param) {
          setTimeout(() => {
            const targetEl = document.querySelector(`[data-order-target="${param}"]`);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              targetEl.classList.add('ring-2', 'ring-[#a23e18]');
            }
          }, 300);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err);
    }
  }

  function setOrderFilter(status, btnEl) {
    currentOrderFilter = status;
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
      btn.className = 'order-filter-btn px-4 py-2 rounded text-[13px] whitespace-nowrap transition-all duration-200 bg-[#f3f4f5] text-[#74777e] hover:text-[#000f22] cursor-pointer';
    });
    if (btnEl) {
      btnEl.className = 'order-filter-btn px-4 py-2 rounded text-[13px] whitespace-nowrap transition-all duration-200 bg-[#000f22] text-white font-semibold shadow-xs cursor-pointer';
    }
    renderOrdersList();
  }

  function renderOrdersList() {
    const container = document.getElementById('my-orders-cards-container');
    const emptyContainer = document.getElementById('my-orders-empty-state');
    if (!container) return;

    const filtered = myOrdersList.filter(o => {
      const s = (o.orderStatus || 'pending').toLowerCase();
      if (currentOrderFilter === 'all') return true;
      return s === currentOrderFilter;
    });

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyContainer) emptyContainer.classList.remove('hidden');
      return;
    }

    if (emptyContainer) emptyContainer.classList.add('hidden');

    container.innerHTML = filtered.map(order => renderSingleOrderCard(order)).join('');
  }

  function getStatusMeta(status) {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'pending':
        return {
          label: 'Chờ xử lý / Đang xếp lò',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          dotClass: 'bg-amber-500 animate-pulse',
          stepIndex: 0,
        };
      case 'confirmed':
        return {
          label: 'Đã duyệt phôi gốm',
          badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
          dotClass: 'bg-blue-500',
          stepIndex: 1,
        };
      case 'processing':
        return {
          label: 'Nung khử nhiệt cao 1.380°C',
          badgeClass: 'bg-purple-50 text-purple-900 border-purple-300',
          dotClass: 'bg-purple-600 animate-pulse',
          stepIndex: 2,
        };
      case 'shipping':
        return {
          label: 'Đang vận chuyển hòm gỗ',
          badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-300',
          dotClass: 'bg-indigo-600',
          stepIndex: 3,
        };
      case 'completed':
        return {
          label: 'Đã hoàn thành / Bàn giao',
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          dotClass: 'bg-emerald-600',
          stepIndex: 4,
        };
      case 'cancelled':
        return {
          label: 'Đã hủy đơn hàng',
          badgeClass: 'bg-red-50 text-red-900 border-red-300',
          dotClass: 'bg-red-600',
          stepIndex: -1,
        };
      default:
        return {
          label: s,
          badgeClass: 'bg-gray-50 text-gray-900 border-gray-300',
          dotClass: 'bg-gray-500',
          stepIndex: 0,
        };
    }
  }

  function renderStepper(status) {
    const meta = getStatusMeta(status);
    if (meta.stepIndex === -1) {
      return ''; // Đơn hủy hiển thị riêng
    }

    const steps = [
      { key: 'pending', title: 'Chờ duyệt phôi' },
      { key: 'confirmed', title: 'Đã xác nhận' },
      { key: 'processing', title: 'Đang chế tác' },
      { key: 'shipping', title: 'Đang giao hàng' },
      { key: 'completed', title: 'Hoàn tất' },
    ];

    return `
      <div class="w-full py-4 px-2 sm:px-6 bg-[#f8f9fa] border-b border-[#EBEAE5]">
        <div class="relative flex items-center justify-between max-w-2xl mx-auto">
          <!-- Thanh kết nối ngang -->
          <div class="absolute top-1/2 left-0 right-0 h-1 bg-[#EBEAE5] -translate-y-1/2 z-0"></div>
          <div class="absolute top-1/2 left-0 h-1 bg-[#a23e18] -translate-y-1/2 z-0 transition-all duration-500" 
               style="width: ${(meta.stepIndex / (steps.length - 1)) * 100}%"></div>

          ${steps.map((st, i) => {
            const isDone = i < meta.stepIndex;
            const isCurrent = i === meta.stepIndex;
            return `
              <div class="relative z-10 flex flex-col items-center group">
                <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] transition-all ${
                  isCurrent
                    ? 'bg-[#a23e18] text-white ring-4 ring-[#ffdbcf]'
                    : isDone
                    ? 'bg-[#a23e18] text-white'
                    : 'bg-white text-[#74777e] border-2 border-[#EBEAE5]'
                }">
                  ${isDone ? '<span class="material-symbols-outlined text-[16px]">check</span>' : i + 1}
                </div>
                <span class="mt-1.5 text-[11px] font-semibold text-center whitespace-nowrap ${
                  isCurrent ? 'text-[#a23e18]' : isDone ? 'text-[#000f22]' : 'text-[#74777e]'
                }">
                  ${st.title}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderSingleOrderCard(order) {
    const meta = getStatusMeta(order.orderStatus);
    const isPending = (order.orderStatus || 'pending').toLowerCase() === 'pending';
    const isCancelled = (order.orderStatus || '').toLowerCase() === 'cancelled';

    return `
      <article class="bg-white rounded-xl border border-[#EBEAE5] shadow-xs hover:shadow-md transition-all overflow-hidden" 
               data-order-target="${order._id}" 
               data-order-code="${order.orderCode}">
        
        <!-- Header đơn hàng -->
        <div class="p-4 sm:p-5 bg-[#f3f4f5]/60 border-b border-[#EBEAE5] flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3 sm:gap-5">
            <div>
              <span class="text-[10px] uppercase tracking-wider text-[#74777e] font-semibold block">Mã đơn giám tuyển</span>
              <span class="font-bold text-[#000f22] text-[15px] font-numeric tracking-tight">#${escapeHtml(order.orderCode)}</span>
            </div>
            <div class="hidden sm:block h-7 w-px bg-[#EBEAE5]"></div>
            <div>
              <span class="text-[10px] uppercase tracking-wider text-[#74777e] font-semibold block">Ngày tạo đơn</span>
              <span class="text-[13px] text-[#43474d]">${formatDate(order.createdAt)}</span>
            </div>
            <div class="hidden sm:block h-7 w-px bg-[#EBEAE5]"></div>
            <div>
              <span class="text-[10px] uppercase tracking-wider text-[#74777e] font-semibold block">Tổng thanh toán</span>
              <span class="font-bold text-[#a23e18] text-[15px]">${formatMoney(order.totalAmount)}</span>
            </div>
          </div>

          <!-- Badge Trạng Thái -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-semibold shadow-2xs ${meta.badgeClass}">
            <span class="w-2 h-2 rounded-full ${meta.dotClass}"></span>
            <span>${meta.label}</span>
          </div>
        </div>

        <!-- Stepper tiến trình -->
        ${renderStepper(order.orderStatus)}

        <!-- Thông báo hủy đơn nếu đã hủy -->
        ${isCancelled ? `
          <div class="px-5 py-3 bg-red-50/70 border-b border-red-200 flex items-start gap-2.5 text-[12px] text-red-900">
            <span class="material-symbols-outlined text-[18px] text-red-600 mt-0.5 shrink-0">cancel</span>
            <div class="flex-1">
              <span class="font-bold">Đơn hàng đã bị hủy.</span>
              <span>Lý do: <em>${escapeHtml(order.cancelReason || order.cancellationReason || 'Khách hàng tự hủy')}</em></span>
              <div class="text-[11px] text-red-700/80 mt-0.5">Số lượng tác phẩm đã được tự động hoàn lại vào kho lò củi.</div>
            </div>
          </div>
        ` : ''}

        <!-- Danh sách tác phẩm trong đơn -->
        <div class="p-4 sm:p-5 divide-y divide-[#EBEAE5]/80 space-y-3">
          ${(order.items || []).map(item => {
            const product = item.productId || {};
            const customization = item.customization || item.designSnapshot;
            const isCustomized = Boolean(customization);
            const img = (customization && (customization.previewImage || customization.blankImage)) || (product && (product.image || (product.images && product.images[0]))) || 'assets/img/logo.png';
            const motifImg = customization && customization.motifImage ? customization.motifImage : '';
            const displayName = (customization && customization.designName) || item.productName;

            return `
              <div class="pt-3 first:pt-0 flex gap-3.5 items-start">
                <div class="relative w-16 h-16 sm:w-20 sm:h-20 rounded bg-[#f8f9fa] shrink-0 overflow-hidden border border-[#EBEAE5] flex items-center justify-center">
                  <img src="${escapeHtml(img)}" alt="${escapeHtml(displayName)}" class="w-full h-full object-contain p-0.5">
                  ${motifImg ? `
                    <img src="${escapeHtml(motifImg)}" 
                         class="absolute w-6 h-6 object-contain pointer-events-none" 
                         style="mix-blend-mode: multiply;" 
                         alt="Họa tiết">
                  ` : ''}
                  ${isCustomized ? `
                    <span class="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-[#000f22] text-white text-[8px] font-bold">2D</span>
                  ` : ''}
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-[#000f22] text-[14px] leading-snug truncate">${escapeHtml(displayName)}</h4>
                  ${customization && customization.designName && customization.designName !== item.productName ? `
                    <p class="text-[11px] text-[#74777e] truncate">Phôi: ${escapeHtml(item.productName)}</p>
                  ` : ''}
                  ${isCustomized ? `
                    <p class="text-[11px] text-[#74777e] mt-0.5">
                      ${customization.blankName || customization.glazeColor || customization.men ? `Phôi: ${escapeHtml(customization.blankName || customization.glazeColor || customization.men)}; ` : ''}
                      ${customization.motifName || customization.pattern || customization.hoaVan ? `Hoa văn: ${escapeHtml(customization.motifName || customization.pattern || customization.hoaVan)}; ` : ''}
                      ${customization.engravingText || customization.chuKhac ? `Khắc chữ: '${escapeHtml(customization.engravingText || customization.chuKhac)}'` : ''}
                    </p>
                  ` : ''}
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-[12px] text-[#74777e]">Số lượng: <strong class="text-[#000f22]">${item.quantity}</strong></span>
                    <span class="font-bold text-[14px] text-[#000f22] font-numeric">${formatMoney(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Địa chỉ giao hàng & Thao tác hành động -->
        <div class="p-4 sm:p-5 bg-[#f8f9fa] border-t border-[#EBEAE5] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="text-[12px] text-[#43474d] space-y-1">
            <div>
              <span class="text-[#74777e]">Người nhận:</span> 
              <strong class="text-[#000f22]">${escapeHtml((order.shippingAddress && order.shippingAddress.recipientName) || '')}</strong> 
              • ${escapeHtml((order.shippingAddress && order.shippingAddress.phone) || '')}
            </div>
            <div>
              <span class="text-[#74777e]">Địa chỉ:</span> 
              <span>${escapeHtml((order.shippingAddress && `${order.shippingAddress.detail}, ${order.shippingAddress.ward}, ${order.shippingAddress.province}`) || '')}</span>
            </div>
            <div>
              <span class="text-[#74777e]">Phương thức:</span> 
              <span class="font-medium text-[#000f22]">${escapeHtml(order.paymentMethod || 'COD')}</span> 
              • Trạng thái: <span class="font-medium text-emerald-800">${escapeHtml(order.paymentStatus || 'pending')}</span>
            </div>
          </div>

          <!-- Cụm nút thao tác -->
          <div class="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <!-- Nút Hủy Đơn (CHỈ HIỆN KHI ORDER LÀ PENDING) -->
            ${isPending ? `
              <button onclick="OrdersModule.openCancelModal('${order._id}', '${order.orderCode}')" 
                      class="px-4 py-2 rounded bg-white text-[#a23e18] hover:bg-red-50 border border-[#a23e18]/40 text-[13px] font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[17px]">cancel</span>
                <span>Hủy đơn</span>
              </button>
            ` : ''}

            <!-- Nút liên hệ tư vấn -->
            <button onclick="alert('Đã kết nối Xưởng trưởng Bát Tràng. Nghệ nhân phụ trách lò nung sẽ liên hệ lại với quý khách qua SĐT.')" 
                    class="px-4 py-2 rounded bg-[#0a2540] hover:bg-[#10162B] text-white text-[13px] font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-[17px] text-[#edbf76]">support_agent</span>
              <span>Liên hệ Xưởng trưởng</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // ==========================================
  // 4. MODAL HỦY ĐƠN HÀNG (PENDING CANCEL)
  // ==========================================
  let activeCancelOrderId = null;

  function openCancelModal(orderId, orderCode) {
    activeCancelOrderId = orderId;
    let modal = document.getElementById('cancel-order-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cancel-order-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity';
      modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-[#EBEAE5] font-['Plus_Jakarta_Sans',sans-serif]">
          <div class="flex items-center gap-3 text-[#ba1a1a] mb-3">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div>
              <h3 class="font-['Playfair_Display',serif] text-[18px] font-bold text-[#000f22]">Xác Nhận Hủy Đơn Hàng</h3>
              <p class="text-[11px] text-[#74777e]" id="cancel-modal-subtitle">Mã đơn: #...</p>
            </div>
          </div>
          
          <p class="text-[13px] text-[#43474d] mb-3 leading-relaxed">
            Quý khách có chắc chắn muốn hủy đơn hàng này? Toàn bộ phôi sứ sẽ được thu hồi và khôi phục số lượng về kho lò củi.
          </p>

          <div class="mb-4">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-[#000f22] mb-1">
              Lý do hủy đơn (tùy chọn)
            </label>
            <textarea id="cancel-reason-input" 
                      rows="2" 
                      placeholder="Ví dụ: Thay đổi địa chỉ nhận, muốn đặt tác phẩm khác..." 
                      class="w-full p-2.5 border border-[#EBEAE5] rounded text-[13px] focus:outline-none focus:border-[#a23e18]"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2.5">
            <button onclick="OrdersModule.closeCancelModal()" 
                    class="px-4 py-2 rounded text-[13px] font-medium text-[#43474d] hover:bg-[#f3f4f5] transition-colors cursor-pointer">
              Đóng lại
            </button>
            <button id="btn-confirm-cancel-order" 
                    onclick="OrdersModule.executeCancelOrder()" 
                    class="px-5 py-2 rounded bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-bold transition-all shadow-xs cursor-pointer">
              Xác nhận hủy
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const sub = document.getElementById('cancel-modal-subtitle');
    if (sub) sub.textContent = `Mã đơn giám tuyển: #${orderCode}`;
    const txt = document.getElementById('cancel-reason-input');
    if (txt) txt.value = '';
    modal.classList.remove('hidden');
  }

  function closeCancelModal() {
    const modal = document.getElementById('cancel-order-modal');
    if (modal) modal.classList.add('hidden');
    activeCancelOrderId = null;
  }

  async function executeCancelOrder() {
    if (!activeCancelOrderId) return;

    const btn = document.getElementById('btn-confirm-cancel-order');
    const reasonInput = document.getElementById('cancel-reason-input');
    const reason = reasonInput ? reasonInput.value.trim() : '';

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang xử lý hủy...';
      }

      const res = await apiFetch(`/orders/my/${activeCancelOrderId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason || 'Khách hàng tự hủy' }),
      });

      if (res && res.success) {
        if (typeof window.showToast === 'function') {
          window.showToast('toast-success', 'Đã hủy đơn hàng thành công', 'Số lượng tác phẩm đã được tự động hoàn lại tồn kho.');
        } else {
          alert('Hủy đơn hàng thành công! Số lượng sản phẩm đã được tự động hoàn lại tồn kho.');
        }
        closeCancelModal();
        if (document.getElementById('profile-orders-list-container')) {
          await initProfileOrders();
        }
        if (document.getElementById('my-orders-cards-container')) {
          await initOrderTrackingPage();
        }
      }
    } catch (err) {
      console.error('Lỗi khi hủy đơn hàng:', err);
      const msg = err.message || 'Đơn hàng không thể hủy tại thời điểm này. Trạng thái đơn đã được cập nhật.';
      if (typeof window.showToast === 'function') {
        window.showToast('toast-warning', '⚠️ Không thể hủy đơn', msg);
      } else {
        alert(msg);
      }
      closeCancelModal();
      if (document.getElementById('profile-orders-list-container')) {
        await initProfileOrders();
      }
      if (document.getElementById('my-orders-cards-container')) {
        await initOrderTrackingPage();
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Xác nhận hủy';
      }
    }
  }

  // ==========================================
  // 5. MODAL "TÔI ĐÃ THANH TOÁN" (PAY NOTIFY)
  // ==========================================
  let activePayNotifyOrderId = null;

  function openPayNotifyModal(orderId, orderCode) {
    activePayNotifyOrderId = orderId;
    let modal = document.getElementById('pay-notify-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pay-notify-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity font-[\'Plus_Jakarta_Sans\',sans-serif]';
      modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-[#EBEAE5] animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between pb-3 border-b border-[#EBEAE5] mb-4">
            <div class="flex items-center gap-2.5 text-[#0A2540]">
              <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <span class="material-symbols-outlined text-[20px]">payments</span>
              </div>
              <div>
                <h3 class="font-[\'Playfair_Display\',serif] text-[17px] font-bold text-[#000f22]">Thông Báo Đã Thanh Toán</h3>
                <p class="text-[11px] text-[#74777e]" id="pay-notify-subtitle">Mã đơn: #...</p>
              </div>
            </div>
            <button onclick="OrdersModule.closePayNotifyModal()" class="w-8 h-8 rounded-full hover:bg-gray-100 text-[#74777e] flex items-center justify-center cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <p class="text-[12px] text-[#43474d] mb-4 leading-relaxed bg-blue-50/70 p-3 rounded-lg border border-blue-200/60">
            Nếu quý khách đã hoàn tất chuyển khoản VietQR hoặc ví MoMo, vui lòng cung cấp mã tham chiếu giao dịch để bộ phận đối soát kích hoạt ngay quy trình xuất lò.
          </p>

          <form id="pay-notify-form" onsubmit="event.preventDefault(); OrdersModule.submitPayNotify();" class="space-y-3.5">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-[#000f22] mb-1">
                Mã giao dịch / Mã tham chiếu <span class="text-red-500">*</span>
              </label>
              <input type="text" id="pay-notify-code" required placeholder="Ví dụ: MB12345678, FT250912384729 hoặc SĐT MoMo" 
                     class="w-full p-2.5 border border-[#EBEAE5] rounded text-[13px] focus:outline-none focus:border-[#0A2540] font-medium" />
            </div>

            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-[#000f22] mb-1">
                Ghi chú thêm (Tùy chọn)
              </label>
              <textarea id="pay-notify-note" rows="2" placeholder="Ví dụ: Chuyển khoản lúc 14:30 từ tài khoản Nguyen Van A..." 
                        class="w-full p-2.5 border border-[#EBEAE5] rounded text-[13px] focus:outline-none focus:border-[#0A2540]"></textarea>
            </div>

            <div class="flex items-center justify-end gap-2.5 pt-2">
              <button type="button" onclick="OrdersModule.closePayNotifyModal()" 
                      class="px-4 py-2 rounded text-[13px] font-medium text-[#43474d] hover:bg-[#f3f4f5] transition-colors cursor-pointer">
                Đóng lại
              </button>
              <button type="submit" id="btn-submit-pay-notify" 
                      class="px-5 py-2 rounded bg-[#0A2540] hover:bg-[#10162B] text-white text-[13px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">send</span>
                <span>Gửi thông báo</span>
              </button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const sub = document.getElementById('pay-notify-subtitle');
    if (sub) sub.textContent = `Mã đơn giám tuyển: #${orderCode}`;
    const codeInp = document.getElementById('pay-notify-code');
    if (codeInp) codeInp.value = '';
    const noteInp = document.getElementById('pay-notify-note');
    if (noteInp) noteInp.value = '';

    modal.classList.remove('hidden');
  }

  function closePayNotifyModal() {
    const modal = document.getElementById('pay-notify-modal');
    if (modal) modal.classList.add('hidden');
    activePayNotifyOrderId = null;
  }

  async function submitPayNotify() {
    if (!activePayNotifyOrderId) return;
    const btn = document.getElementById('btn-submit-pay-notify');
    const code = (document.getElementById('pay-notify-code')?.value || '').trim();
    const note = (document.getElementById('pay-notify-note')?.value || '').trim();

    if (!code) {
      alert('Vui lòng nhập mã giao dịch hoặc mã tham chiếu chuyển khoản');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang gửi...';
      }

      const res = await apiFetch(`/orders/my/${activePayNotifyOrderId}/pay-notify`, {
        method: 'PATCH',
        body: JSON.stringify({ transactionCode: code, note }),
      });

      if (res && res.success) {
        closePayNotifyModal();
        if (typeof window.showToast === 'function') {
          window.showToast('toast-success', 'Đã tiếp nhận thông báo thanh toán', 'Hệ thống đã chuyển đơn sang trạng thái Chờ đối soát (Awaiting Verification).');
        } else {
          alert('Đã gửi thông báo thanh toán thành công! Trạng thái đơn đã chuyển sang Chờ đối soát.');
        }
        if (document.getElementById('profile-orders-list-container')) {
          await initProfileOrders();
        }
        if (document.getElementById('my-orders-cards-container')) {
          await initOrderTrackingPage();
        }
      }
    } catch (err) {
      console.error('Lỗi thông báo thanh toán:', err);
      alert(err.message || 'Không thể gửi thông báo thanh toán vào lúc này.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">send</span><span>Gửi thông báo</span>';
      }
    }
  }

  // ==========================================
  // 6. PROFILE ORDERS ACCORDION & MANAGEMENT
  // ==========================================
  function getPaymentStatusMeta(status) {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'paid':
        return {
          label: 'Đã thanh toán (Paid)',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dotClass: 'bg-emerald-600',
        };
      case 'awaiting_verification':
        return {
          label: 'Chờ đối soát (Awaiting Verification)',
          badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
          dotClass: 'bg-blue-600 animate-pulse',
        };
      case 'refunded':
        return {
          label: 'Đã hoàn tiền (Refunded)',
          badgeClass: 'bg-purple-50 text-purple-900 border-purple-300',
          dotClass: 'bg-purple-600',
        };
      case 'partially_refunded':
        return {
          label: 'Hoàn một phần (Refunded)',
          badgeClass: 'bg-purple-50 text-purple-900 border-purple-300',
          dotClass: 'bg-purple-600',
        };
      case 'failed':
        return {
          label: 'Thanh toán lỗi (Failed)',
          badgeClass: 'bg-red-50 text-red-900 border-red-300',
          dotClass: 'bg-red-600',
        };
      case 'pending':
      default:
        return {
          label: 'Chờ thanh toán (Pending)',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          dotClass: 'bg-amber-500',
        };
    }
  }

  let profileOrdersCache = [];

  async function initProfileOrders(targetOrderCodeOrId) {
    const container = document.getElementById('profile-orders-list-container');
    if (!container) return;

    const auth = getAuthContext();
    if (!auth) {
      container.innerHTML = `
        <div class="p-8 text-center bg-white rounded-xl border border-biscuit-sand">
          <p class="text-sm text-outline">Vui lòng đăng nhập để xem lịch sử đơn hàng của quý khách.</p>
        </div>
      `;
      return;
    }

    try {
      let orders = [];
      try {
        const res = await apiFetch('/orders/my?limit=50');
        if (res && res.success) {
          orders = res.data || [];
        }
      } catch (apiErr) {
        // Fallback sang endpoint /orders/user/:accountId nếu có
        console.warn('apiFetch /orders/my lỗi, thử /orders/user/:id:', apiErr);
        if (typeof ApiService !== 'undefined' && ApiService.getOrders) {
          await new Promise((resolve) => {
            ApiService.getOrders(auth.accountId, (err, res) => {
              if (!err && res && res.success) orders = res.data || [];
              resolve();
            });
          });
        }
      }

      profileOrdersCache = orders;
      updateProfileOrderCounts(orders);
      renderProfileOrders(orders);

      if (targetOrderCodeOrId) {
        setTimeout(() => {
          const target = document.querySelector(`[data-order-id="${targetOrderCodeOrId}"]`) ||
                         document.querySelector(`[data-order-code="${targetOrderCodeOrId}"]`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('ring-2', 'ring-[#a23e18]', 'shadow-lg');
            const body = target.querySelector('.order-accordion-body');
            const icon = target.querySelector('.order-accordion-icon');
            if (body && body.classList.contains('hidden')) {
              body.classList.remove('hidden');
              if (icon) icon.classList.add('rotate-180');
            }
          }
        }, 350);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử đơn hàng profile:', err);
      container.innerHTML = `
        <div class="p-8 text-center bg-white rounded-xl border border-red-200 text-red-800">
          <span class="material-symbols-outlined text-3xl">error</span>
          <p class="text-sm mt-2 font-medium">Không thể tải danh sách đơn hàng vào lúc này. Quý khách vui lòng thử lại sau.</p>
        </div>
      `;
    }
  }

  function updateProfileOrderCounts(orders) {
    const all = orders.length;
    const pending = orders.filter(o => {
      const s = (o.orderStatus || 'pending').toLowerCase();
      return s === 'pending' || s === 'confirmed' || s === 'processing' || s === 'shipping';
    }).length;
    const completed = orders.filter(o => (o.orderStatus || '').toLowerCase() === 'completed').length;
    const cancelled = orders.filter(o => (o.orderStatus || '').toLowerCase() === 'cancelled').length;

    // Cập nhật tab filter trên profile.html
    const filterButtons = document.querySelectorAll('.order-filter-btn');
    if (filterButtons.length >= 4) {
      filterButtons[0].innerText = `Tất cả đơn (${String(all).padStart(2, '0')})`;
      filterButtons[1].innerText = `Chờ xử lý / Đang xếp lò (${String(pending).padStart(2, '0')})`;
      filterButtons[2].innerText = `Đã hoàn thành / Đã nhận (${String(completed).padStart(2, '0')})`;
      filterButtons[3].innerText = `Đã hủy (${String(cancelled).padStart(2, '0')})`;
    }

    const profileOrderCountBadge = document.getElementById('profile-order-count');
    if (profileOrderCountBadge) {
      profileOrderCountBadge.innerText = String(all).padStart(2, '0');
    }
  }

  function renderProfileOrders(orders) {
    const container = document.getElementById('profile-orders-list-container');
    const emptyState = document.getElementById('no-orders-state');
    if (!container) return;

    if (!orders || orders.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    container.innerHTML = orders.map(order => renderProfileOrderCard(order)).join('');
  }

  function toggleOrderAccordion(orderId) {
    const card = document.querySelector(`[data-order-id="${orderId}"]`);
    if (!card) return;
    const body = card.querySelector('.order-accordion-body');
    const icon = card.querySelector('.order-accordion-icon');
    if (body) {
      body.classList.toggle('hidden');
      if (icon) icon.classList.toggle('rotate-180');
    }
  }

  function renderProfileOrderCard(order) {
    const orderStatusMeta = getStatusMeta(order.orderStatus);
    const payStatusMeta = getPaymentStatusMeta(order.paymentStatus);
    const statusLower = (order.orderStatus || 'pending').toLowerCase();
    const payLower = (order.paymentStatus || 'pending').toLowerCase();
    const payMethod = (order.paymentMethod || 'COD').toUpperCase();

    const isPending = statusLower === 'pending';
    const isCompleted = statusLower === 'completed';
    const isCancelled = statusLower === 'cancelled';
    const canPayNotify = (isPending || statusLower === 'confirmed' || statusLower === 'processing' || statusLower === 'shipping') &&
                         (payMethod === 'BANKING' || payMethod === 'MOMO') &&
                         (payLower === 'pending' || payLower === 'unpaid' || payLower === 'failed');

    const isAwaitingVerification = payLower === 'awaiting_verification';
    const hasReturn = Boolean(order.returnStatus && order.returnStatus !== 'none');

    // Trích xuất danh sách items dạng JSON an toàn cho inline click
    const encodedOrderItems = escapeHtml(JSON.stringify(order.items || []));

    return `
      <article class="order-card order-${statusLower} bg-porcelain-white rounded-xl border border-biscuit-sand shadow-sm hover:shadow-md transition-shadow overflow-hidden" 
               data-order-id="${order._id}" 
               data-order-code="${order.orderCode}"
               data-status="${statusLower}">
        
        <!-- Accordion Header: Clickable -->
        <div class="p-5 sm:p-6 bg-surface-container-low/60 border-b border-biscuit-sand flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
             onclick="OrdersModule.toggleOrderAccordion('${order._id}')">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div>
              <span class="font-label-sm text-label-sm text-outline uppercase block">Mã đơn giám tuyển</span>
              <p class="font-title-md text-title-md text-primary font-bold hover:text-secondary flex items-center gap-1">
                #${escapeHtml(order.orderCode)}
              </p>
            </div>
            <span class="hidden sm:inline text-biscuit-sand text-xl">|</span>
            <div>
              <span class="font-label-sm text-label-sm text-outline uppercase block">Ngày tạo</span>
              <p class="font-body-sm text-body-sm text-on-surface-variant font-medium">${formatDate(order.createdAt)}</p>
            </div>
            <span class="hidden sm:inline text-biscuit-sand text-xl">|</span>
            <div>
              <span class="font-label-sm text-label-sm text-outline uppercase block">Tổng thanh toán</span>
              <p class="font-title-md text-title-md text-[#a23e18] font-bold font-numeric tracking-tight">${formatMoney(order.totalAmount)}</p>
            </div>
          </div>

          <!-- Badges & Accordion Toggle Icon -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Order Status Badge -->
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold shadow-xs border ${orderStatusMeta.badgeClass}">
              <span class="w-2 h-2 rounded-full ${orderStatusMeta.dotClass}"></span>
              <span>${orderStatusMeta.label}</span>
            </div>

            <!-- Payment Status Badge -->
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold shadow-xs border ${payStatusMeta.badgeClass}" title="Phương thức: ${escapeHtml(payMethod)}">
              <span class="w-2 h-2 rounded-full ${payStatusMeta.dotClass}"></span>
              <span>${payStatusMeta.label}</span>
            </div>

            <!-- Accordion Chevron Button -->
            <button type="button" class="order-accordion-icon ml-1 w-8 h-8 rounded-full bg-porcelain-white border border-biscuit-sand flex items-center justify-center text-primary transition-transform duration-200">
              <span class="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
          </div>
        </div>

        <!-- Accordion Body -->
        <div class="order-accordion-body">
          <!-- Stepper Tiến trình sản xuất lò củi -->
          ${renderStepper(order.orderStatus)}

          <!-- Thông báo đặc biệt: Đơn hủy -->
          ${isCancelled ? `
            <div class="p-4 bg-red-50/80 border-b border-red-200 flex items-start gap-3 text-red-900 text-xs">
              <span class="material-symbols-outlined text-red-600 text-xl shrink-0">cancel</span>
              <div>
                <strong class="font-semibold block">Đơn hàng đã hủy trọn vẹn.</strong>
                <span>Lý do: <em>${escapeHtml(order.cancelReason || order.cancellationReason || 'Khách hàng tự hủy đơn')}</em></span>
                <p class="mt-1 text-red-700">Tồn kho các phôi gốm sứ đã được khôi phục về xưởng lò Bát Tràng.</p>
              </div>
            </div>
          ` : ''}

          <!-- Thông báo: Chờ đối soát thanh toán -->
          ${isAwaitingVerification ? `
            <div class="p-4 bg-blue-50/80 border-b border-blue-200 flex items-start gap-3 text-blue-900 text-xs">
              <span class="material-symbols-outlined text-blue-600 text-xl shrink-0 animate-pulse">hourglass_top</span>
              <div>
                <strong class="font-semibold block">Quý khách đã gửi thông báo thanh toán (${escapeHtml(payMethod)}).</strong>
                <span>Kế toán xưởng Minh Gốm đang đối soát biến động số dư. Tác phẩm sẽ được xếp lò ngay sau khi xác nhận!</span>
              </div>
            </div>
          ` : ''}

          <!-- Thông báo: Tình trạng đổi trả (nếu có) -->
          ${hasReturn ? `
            <div class="p-4 bg-purple-50/80 border-b border-purple-200 flex items-start gap-3 text-purple-900 text-xs">
              <span class="material-symbols-outlined text-purple-600 text-xl shrink-0">assignment_return</span>
              <div>
                <strong class="font-semibold block">Trạng thái đổi trả tác phẩm: 
                  <span class="uppercase font-bold">${escapeHtml(order.returnStatus)}</span>
                </strong>
                ${order.refundedAmount ? `
                  <p class="mt-0.5 text-purple-800">Số tiền xưởng đã hoàn lại: <strong>${formatMoney(order.refundedAmount)}</strong></p>
                ` : '<span>Phiếu yêu cầu thẩm định đổi trả đang được ban giám định xử lý.</span>'}
              </div>
            </div>
          ` : ''}

          <!-- Danh sách tác phẩm (Items) -->
          <div class="p-5 sm:p-6 border-b border-biscuit-sand/70 divide-y divide-biscuit-sand/50">
            ${(order.items || []).map(item => {
              const product = item.productId || {};
              const customization = item.customization || item.designSnapshot;
              const isCustomized = Boolean(customization);
              const img = (customization && (customization.previewImage || customization.blankImage)) || (product && (product.image || (product.images && product.images[0]))) || 'assets/img/logo.png';
              const motifImg = customization && customization.motifImage ? customization.motifImage : '';
              const displayName = (customization && customization.designName) || item.productName;
              const prodId = product._id || product.id || (typeof item.productId === 'string' ? item.productId : '');

              return `
                <div class="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start gap-4">
                  <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-biscuit-sand flex items-center justify-center">
                    <img src="${escapeHtml(img)}" alt="${escapeHtml(displayName)}" class="w-full h-full object-cover">
                    ${motifImg ? `
                      <img src="${escapeHtml(motifImg)}" class="absolute w-8 h-8 object-contain pointer-events-none" style="mix-blend-mode: multiply;" alt="Họa tiết">
                    ` : ''}
                    ${isCustomized ? `
                      <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary text-on-primary font-label-sm text-[9px] uppercase font-bold tracking-wider">Độc bản 2D</span>
                    ` : ''}
                  </div>

                  <div class="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 class="font-headline-sm text-title-md text-primary font-serif font-semibold hover:text-secondary transition-colors">
                        ${escapeHtml(displayName)}
                      </h4>
                      ${isCustomized ? `
                        <p class="font-body-sm text-[12px] text-on-surface-variant mt-1 leading-relaxed">
                          ${customization.blankName || customization.glazeColor || customization.men ? `Phôi: ${escapeHtml(customization.blankName || customization.glazeColor || customization.men)}; ` : ''}
                          ${customization.motifName || customization.pattern || customization.hoaVan ? `Hoa văn: ${escapeHtml(customization.motifName || customization.pattern || customization.hoaVan)}; ` : ''}
                          ${customization.engravingText || customization.chuKhac ? `Khắc chữ: '${escapeHtml(customization.engravingText || customization.chuKhac)}'` : ''}
                        </p>
                      ` : `
                        <p class="font-body-sm text-[12px] text-on-surface-variant mt-0.5">Tuyển tập gốm thủ công cao cấp Bát Tràng</p>
                      `}
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-biscuit-sand/40">
                      <span class="font-body-sm text-xs text-outline">Số lượng: <strong class="text-primary font-semibold">${item.quantity} tác phẩm</strong></span>
                      <div class="flex items-center gap-3">
                        <span class="font-title-md text-sm text-primary font-bold font-numeric">${formatMoney(item.unitPrice * item.quantity)}</span>
                        
                        <!-- Nút Đánh giá từng sản phẩm khi đã Hoàn thành (Mỗi đơn hàng được đánh giá 1 lần) -->
                        ${isCompleted ? `
                          ${Boolean(localStorage.getItem('reviewed_' + order._id + '_' + prodId)) ? `
                            <span class="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-label-sm text-[11px] font-semibold flex items-center gap-1">
                              <span class="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                              <span>Đã đánh giá</span>
                            </span>
                          ` : `
                            <button type="button" 
                                    id="btn-review-${order._id}-${prodId}"
                                    onclick="openReviewModal('${escapeHtml(displayName)}', '${prodId}', '${order._id}')" 
                                    class="px-2.5 py-1 rounded bg-porcelain-white text-primary hover:bg-primary-container hover:text-on-primary border border-biscuit-sand font-label-sm text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer">
                              <span class="material-symbols-outlined text-[14px] text-amber-500">star</span>
                              <span>Đánh giá</span>
                            </button>
                          `}
                        ` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Thông tin giao hàng & Thao tác cuối thẻ -->
          <div class="p-5 sm:p-6 bg-surface-container-low/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="font-body-sm text-xs text-on-surface-variant space-y-1">
              <div>
                <span class="text-outline">Người nhận:</span> 
                <strong class="text-primary font-semibold">${escapeHtml((order.shippingAddress && order.shippingAddress.recipientName) || '')}</strong>
                • ${escapeHtml((order.shippingAddress && order.shippingAddress.phone) || '')}
              </div>
              <div>
                <span class="text-outline">Địa chỉ:</span> 
                <span>${escapeHtml((order.shippingAddress && `${order.shippingAddress.detail}, ${order.shippingAddress.ward}, ${order.shippingAddress.province}`) || '')}</span>
              </div>
              <div>
                <span class="text-outline">Phương thức:</span> 
                <span class="font-semibold text-primary">${escapeHtml(payMethod)}</span>
                • Thanh toán: <strong class="${payLower === 'paid' ? 'text-emerald-700' : 'text-amber-700'}">${payStatusMeta.label}</strong>
              </div>
            </div>

            <!-- Cụm nút hành động theo đúng trạng thái -->
              <!-- 0. Chi tiết đơn hàng (Màn hình Stitch - Mặc định lúc nào cũng có) -->
              <button type="button" 
                      onclick="if(window.dieuHuong) window.dieuHuong('order-detail', null, '${order._id}')" 
                      class="px-4 py-2 rounded-lg bg-[#000f22] hover:bg-[#10162B] text-white font-title-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[16px] text-[#edbf76]">visibility</span>
                <span>Chi tiết đơn</span>
              </button>

              <!-- 1. Hủy đơn (CHỈ KHI PENDING / CHỜ DUYỆT - Nếu đã qua Chế tác/Processing thì KHÔNG CÒN NÚT HỦY) -->
              ${isPending ? `
                <button type="button" 
                        onclick="OrdersModule.openCancelModal('${order._id}', '${order.orderCode}')" 
                        class="px-4 py-2 rounded-lg bg-porcelain-white text-[#ba1a1a] hover:bg-red-50 border border-red-300 font-title-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer">
                  <span class="material-symbols-outlined text-[16px]">cancel</span>
                  <span>Hủy đơn hàng</span>
                </button>
              ` : ''}

              <!-- 2. Hàng hoàn thành: Thêm nút Đánh giá & Yêu cầu đổi trả -->
              ${isCompleted ? `
                ${order.returnStatus === 'requested' ? `
                  <button type="button" disabled class="px-3.5 py-2 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 font-title-md text-xs font-semibold opacity-60 cursor-not-allowed flex items-center gap-1.5" title="Yêu cầu đổi trả đang chờ ban giám định kiểm tra">
                    <span class="material-symbols-outlined text-[16px]">hourglass_top</span>
                    <span>Đang thẩm định đổi trả</span>
                  </button>
                ` : order.returnStatus === 'approved' ? `
                  <button type="button" disabled class="px-3.5 py-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-title-md text-xs font-semibold opacity-70 cursor-not-allowed flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">verified</span>
                    <span>Đã chấp thuận đổi trả</span>
                  </button>
                ` : order.returnStatus === 'rejected' ? `
                  <button type="button" disabled class="px-3.5 py-2 rounded-lg bg-red-100 text-red-800 border border-red-200 font-title-md text-xs font-semibold opacity-70 cursor-not-allowed flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">cancel</span>
                    <span>Từ chối đổi trả</span>
                  </button>
                ` : `
                  <button type="button" 
                          onclick="openReturnModal('${order.orderCode}', '${order._id}', ${encodedOrderItems})" 
                          class="px-3.5 py-2 rounded-lg bg-porcelain-white text-primary hover:bg-secondary/10 border border-secondary/40 font-title-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">assignment_return</span>
                    <span>Yêu cầu đổi trả</span>
                  </button>
                `}
              ` : ''}
            </div>
          </div>
        </div>
      </article>
    `;
  }


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
        container.innerHTML = `
          <div class="py-12 text-center text-[#74777e]">
            <span class="material-symbols-outlined text-4xl text-[#c4c6ce]">receipt_long</span>
            <p class="mt-2 text-[14px]">Không tìm thấy thông tin đơn hàng yêu cầu.</p>
            <button onclick="if(window.dieuHuong) window.dieuHuong('profile', null, 'orders')" class="mt-4 px-4 py-2 bg-[#000f22] text-white rounded text-[12px] font-semibold cursor-pointer">
              Quay lại danh sách đơn hàng
            </button>
          </div>
        `;
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
    if (bcCodeEl) bcCodeEl.textContent = `Chi tiết đơn hàng #${cleanCode}`;
    if (codeEl) codeEl.textContent = `#${cleanCode}`;
    if (timeEl) {
      timeEl.innerHTML = `
        <span class="material-symbols-outlined text-[16px] text-[#74777e]">schedule</span>
        ${createdAt}
      `;
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

    // Nút Yêu cầu đổi trả & Chứng thư bảo trợ (Chỉ hiện khi Completed)
    const returnBtn = document.getElementById('detail-btn-return');
    if (returnBtn) {
      if (oStatus === 'completed') {
        returnBtn.classList.remove('hidden');
        if (orderData.returnStatus === 'requested') {
          returnBtn.disabled = true;
          returnBtn.className = 'inline-flex items-center gap-2 px-5 py-2.5 rounded bg-purple-100 text-purple-800 border border-purple-200 text-[12px] uppercase tracking-wider font-semibold opacity-60 cursor-not-allowed';
          returnBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">hourglass_top</span><span>Đang thẩm định đổi trả</span>';
        } else if (orderData.returnStatus === 'approved') {
          returnBtn.disabled = true;
          returnBtn.className = 'inline-flex items-center gap-2 px-5 py-2.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[12px] uppercase tracking-wider font-semibold opacity-70 cursor-not-allowed';
          returnBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">verified</span><span>Đã chấp thuận đổi trả</span>';
        } else if (orderData.returnStatus === 'rejected') {
          returnBtn.disabled = true;
          returnBtn.className = 'inline-flex items-center gap-2 px-5 py-2.5 rounded bg-red-100 text-red-800 border border-red-200 text-[12px] uppercase tracking-wider font-semibold opacity-70 cursor-not-allowed';
          returnBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">cancel</span><span>Từ chối đổi trả</span>';
        } else {
          returnBtn.disabled = false;
          returnBtn.className = 'inline-flex items-center gap-2 px-5 py-2.5 rounded bg-white hover:bg-secondary/10 text-primary border border-secondary/40 text-[12px] uppercase tracking-wider font-semibold transition-all duration-200 cursor-pointer';
          returnBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">assignment_return</span><span>Yêu cầu đổi / trả</span>';
        }
      } else {
        returnBtn.classList.add('hidden');
      }
    }



    // Steppers & Banners Logic
    const progressEl = document.getElementById('detail-stepper-progress');
    const cancelBanner = document.getElementById('detail-cancelled-banner');
    const cancelReasonEl = document.getElementById('detail-cancelled-reason');
    const trackOrderFlow = document.getElementById('track-order-flow');
    const trackReturnFlow = document.getElementById('track-return-flow');
    const stepperTitle = document.getElementById('detail-stepper-title');
    const returnApprovedBanner = document.getElementById('detail-return-approved-banner');
    const returnRejectedBanner = document.getElementById('detail-return-rejected-banner');

    // Reset banners
    if (cancelBanner) cancelBanner.classList.add('hidden');
    if (returnApprovedBanner) returnApprovedBanner.classList.add('hidden');
    if (returnRejectedBanner) returnRejectedBanner.classList.add('hidden');

    const retStatus = (orderData.returnStatus || '').toLowerCase();
    const isReturnActive = retStatus === 'requested' || retStatus === 'approved' || retStatus === 'rejected' || retStatus === 'completed';

    if (isReturnActive) {
      // Chuyển sang thanh trạng thái yêu cầu đổi trả thay vì trạng thái giao hàng thông thường
      if (trackOrderFlow) trackOrderFlow.classList.add('hidden');
      if (trackReturnFlow) trackReturnFlow.classList.remove('hidden');
      if (stepperTitle) {
        stepperTitle.innerHTML = '<span class="material-symbols-outlined text-[18px] text-purple-700">assignment_return</span><span>Tiến trình xử lý yêu cầu đổi trả tác phẩm</span>';
      }

      const retProgress = document.getElementById('return-stepper-progress');
      const retStep2 = document.getElementById('return-step-2');
      const retStep3 = document.getElementById('return-step-3');
      const retStep2Title = document.getElementById('return-step-2-title');
      const retStep3Title = document.getElementById('return-step-3-title');

      if (retStatus === 'requested') {
        if (retProgress) retProgress.style.width = '50%';
        if (retStep2) {
          retStep2.querySelector('.rounded-full').className = 'w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center text-[15px] shadow-xs animate-pulse';
          if (retStep2Title) retStep2Title.className = 'mt-2 text-[13px] text-purple-950 font-bold';
        }
      } else if (retStatus === 'approved' || retStatus === 'completed') {
        if (retProgress) retProgress.style.width = '100%';
        if (retStep2) {
          retStep2.querySelector('.rounded-full').className = 'w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center text-[15px] shadow-xs';
          if (retStep2Title) retStep2Title.className = 'mt-2 text-[13px] text-purple-950 font-bold';
        }
        if (retStep3) {
          retStep3.querySelector('.rounded-full').className = 'w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[15px] shadow-xs';
          if (retStep3Title) {
            retStep3Title.className = 'mt-2 text-[13px] text-emerald-950 font-bold';
            retStep3Title.textContent = 'Đã hoàn tiền thành công';
          }
        }
        // Hiển thị thông báo tiền được hoàn
        if (returnApprovedBanner) {
          returnApprovedBanner.classList.remove('hidden');
          const refundEl = document.getElementById('detail-return-refund-amount');
          const refundAmt = Number(orderData.refundedAmount || orderData.totalAmount || 0);
          if (refundEl) refundEl.textContent = formatMoney(refundAmt);
        }
      } else if (retStatus === 'rejected') {
        if (retProgress) {
          retProgress.style.width = '100%';
          retProgress.className = 'absolute top-5 left-12 h-1 bg-red-600 transition-all duration-500 rounded z-0';
        }
        if (retStep2) {
          retStep2.querySelector('.rounded-full').className = 'w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center text-[15px] shadow-xs';
        }
        if (retStep3) {
          retStep3.querySelector('.rounded-full').className = 'w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-[15px] shadow-xs';
          if (retStep3Title) {
            retStep3Title.className = 'mt-2 text-[13px] text-red-700 font-bold';
            retStep3Title.textContent = 'Từ chối đổi trả';
          }
        }
        // Hiển thị thanh thông báo kèm lý do từ chối
        if (returnRejectedBanner) {
          returnRejectedBanner.classList.remove('hidden');
          const reasonEl = document.getElementById('detail-return-rejected-reason');
          const rejReason = (orderData.returnRequestId && orderData.returnRequestId.rejectionReason) ||
                            orderData.rejectionReason ||
                            orderData.returnRejectionReason ||
                            'Tác phẩm đã qua kiểm định không có vết nứt do xưởng hoặc quá thời hạn đổi trả 7 ngày.';
          if (reasonEl) reasonEl.textContent = rejReason;
        }
      }
    } else {
      // Giữ thanh trạng thái tiến trình giao hàng thông thường
      if (trackOrderFlow) trackOrderFlow.classList.remove('hidden');
      if (trackReturnFlow) trackReturnFlow.classList.add('hidden');
      if (stepperTitle) {
        stepperTitle.innerHTML = '<span class="material-symbols-outlined text-[18px] text-[#a23e18]">route</span><span>Tiến trình chế tác & phụng vận</span>';
      }

      if (oStatus === 'cancelled') {
        if (progressEl) progressEl.style.width = '100%';
        if (cancelBanner) cancelBanner.classList.remove('hidden');
        if (cancelReasonEl) {
          cancelReasonEl.textContent = `Lý do: ${orderData.cancelReason || orderData.cancellationReason || 'Khách hàng tự hủy'}`;
        }
        const title5 = document.getElementById('stepper-title-5');
        if (title5) title5.textContent = 'Đã hủy đơn';
      } else {
        let progressPercent = '15%';
        if (oStatus === 'confirmed') progressPercent = '35%';
        else if (oStatus === 'processing') progressPercent = '55%';
        else if (oStatus === 'shipping') progressPercent = '75%';
        else if (oStatus === 'completed') progressPercent = '100%';
        if (progressEl) progressEl.style.width = progressPercent;
      }
    }

    // Render danh sách sản phẩm
    const itemsContainer = document.getElementById('detail-items-container');
    const itemsCountTitle = document.getElementById('detail-items-count-title');
    const items = orderData.items || [];
    if (itemsCountTitle) {
      itemsCountTitle.textContent = `Danh Tác Trong Đơn Hàng (${items.length})`;
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

          return `
            <article class="p-5 sm:p-6 rounded-xl bg-white hover:bg-[#f8f9fa] transition-colors duration-200 flex flex-col gap-5 border border-[#EBEAE5]">
              <div class="flex flex-col sm:flex-row gap-5 items-start">
                <!-- Thumbnail -->
                <div class="w-28 h-36 sm:w-32 sm:h-40 shrink-0 rounded-lg overflow-hidden bg-[#f3f4f5] shadow-xs relative border border-[#EBEAE5] flex items-center justify-center">
                  <img class="w-full h-full object-contain p-1" alt="${escapeHtml(name)}" src="${escapeHtml(img)}" onerror="this.src='assets/img/logo.png'">
                  <span class="absolute top-2 left-2 bg-[#000f22]/90 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded tracking-widest uppercase font-semibold">
                    ${isCustom ? 'Cá nhân hoá' : 'Độc bản'}
                  </span>
                </div>

                <!-- Product Details -->
                <div class="flex-1 flex flex-col justify-between h-full min-w-0">
                  <div>
                    <div class="flex items-start justify-between gap-3">
                      <h3 class="font-['Playfair_Display',serif] text-lg sm:text-xl text-[#000f22] tracking-tight font-bold">
                        ${escapeHtml(name)}
                      </h3>
                      <div class="text-right shrink-0">
                        <span class="text-lg font-bold text-[#a23e18] font-['Playfair_Display',serif]">${formatMoney(itemTotal)}</span>
                        <p class="text-[12px] text-[#74777e]">Đơn giá: ${formatMoney(price)} × ${qty}</p>
                      </div>
                    </div>
                    <p class="text-[13px] text-[#43474d] mt-1 leading-relaxed">
                      Ngự Phẩm Bát Tràng • ${escapeHtml(glaze)} • Đất Nung Bạch Thạch Tinh Luyện 1.380°C
                    </p>
                  </div>

                  <!-- Custom Design Snapshot Module (NẾU CÓ THIẾT KẾ 2D) -->
                  ${isCustom ? `
                    <div class="mt-4 p-4 rounded-lg bg-[#f8f9fa] flex flex-col sm:flex-row gap-4 items-center border border-[#EBEAE5]">
                      <div class="w-20 h-20 rounded bg-white shrink-0 overflow-hidden flex items-center justify-center p-1 shadow-inner border border-[#EBEAE5]">
                        <img class="w-full h-full object-contain" alt="2D Blueprint" src="${escapeHtml(preview2D)}" onerror="this.src='assets/img/logo.png'">
                      </div>
                      <div class="flex-1 text-left min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="material-symbols-outlined text-[16px] text-[#a23e18]">stylus_note</span>
                          <span class="text-[11px] uppercase tracking-wider text-[#a23e18] font-bold">Bản vẽ thiết kế cá nhân hóa (2D Snapshot)</span>
                        </div>
                        ${engText ? `
                          <p class="text-[13px] text-[#000f22] mt-1 font-medium truncate">
                            Khắc âm triện tay: <span class="font-serif italic font-bold text-[#a23e18]">"${escapeHtml(engText)}"</span>
                          </p>
                        ` : ''}
                        <div class="flex flex-wrap items-center gap-2 text-[11px] text-[#74777e] mt-1">
                          <span>Phôi: <strong class="text-[#000f22]">${escapeHtml(glaze)}</strong></span>
                          <span>•</span>
                          <span>Họa tiết: <strong class="text-[#000f22]">${escapeHtml(motif)}</strong></span>
                        </div>
                      </div>
                    </div>
                  ` : `
                    <div class="mt-4 flex items-center gap-2 text-[#74777e] text-[12px] py-2 px-3 bg-[#f8f9fa] rounded border border-[#EBEAE5]">
                      <span class="material-symbols-outlined text-[16px] text-[#ac8441]">verified_user</span>
                      <span>Tác phẩm chế tác thủ công nguyên bản, đóng triện danh vị lò gốm 1705 tại đáy phôi.</span>
                    </div>
                  `}
                </div>
              </div>
            </article>
          `;
        }).join('');
      }
    }

    // Thông tin vận chuyển & giao nhận
    const recipient = orderData.shippingAddress || {};
    const recipientName = recipient.recipientName || 'Quý khách';
    const recipientPhone = recipient.phone || '--';
    const addressStr = `${recipient.detail || ''}, ${recipient.ward || ''}, ${recipient.province || ''}`.replace(/^,\s*|,\s*$/g, '') || '--';
    const note = orderData.note || 'Tác phẩm gốm sứ dễ vỡ - yêu cầu giao giờ hành chính và vận chuyển bọc khung gỗ bảo hiểm.';

    const recNameEl = document.getElementById('detail-recipient-name');
    const recPhoneEl = document.getElementById('detail-recipient-phone');
    const recAddressEl = document.getElementById('detail-recipient-address');
    const recNoteEl = document.getElementById('detail-recipient-note');
    const recAvatarEl = document.getElementById('detail-recipient-avatar');

    if (recNameEl) recNameEl.textContent = recipientName;
    if (recPhoneEl) recPhoneEl.textContent = recipientPhone;
    if (recAddressEl) recAddressEl.textContent = addressStr;
    if (recNoteEl) recNoteEl.textContent = `"${note}"`;
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
    if (discountEl) discountEl.textContent = discount === 0 ? '0 ₫' : `-${formatMoney(discount)}`;
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

    if (txnEl) txnEl.textContent = `TXN-${cleanCode}`;
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
    const reason = prompt(`Quý khách có chắc muốn hủy đơn hàng #${cleanCode}?\nVui lòng nhập lý do hủy đơn (tùy chọn):`, 'Thay đổi nhu cầu');
    if (reason === null) return;

    try {
      const orderId = currentOrderDetail._id || cleanCode;
      await apiFetch(`/orders/my/${orderId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason || 'Khách hàng tự hủy trên trang chi tiết' }),
      });
      alert(`Đã hủy đơn hàng #${cleanCode} thành công.`);
      currentOrderDetail.orderStatus = 'cancelled';
      currentOrderDetail.cancelReason = reason || 'Khách hàng tự hủy';
      sessionStorage.setItem('craftory_latest_order', JSON.stringify(currentOrderDetail));
      await initOrderDetailPage(currentOrderDetail);
    } catch (err) {
      alert(err.message || 'Không thể hủy đơn hàng vào lúc này.');
    }
  }

  function openReturnModalFromDetail() {
    if (!currentOrderDetail) return;
    if (typeof window.openReturnModal === 'function') {
      window.openReturnModal(currentOrderDetail.orderCode, currentOrderDetail._id, currentOrderDetail.items);
    } else if (typeof window.dieuHuong === 'function') {
      window.dieuHuong('return-request');
    } else {
      alert(`Đã gửi yêu cầu đổi trả cho đơn hàng #${currentOrderDetail.orderCode}. Ban giám định xưởng gốm sẽ liên hệ.`);
    }
  }


  function downloadHeritageCertificate(orderId) {
    const u = typeof currentUser !== 'undefined' && currentUser ? currentUser : JSON.parse(localStorage.getItem('craftory_user') || '{}');
    const printWin = window.open('', '_blank', 'width=850,height=750');
    if (!printWin) {
      if (typeof showToast === 'function') {
        showToast('toast-warning', '⚠️ Trình duyệt chặn popup', 'Vui lòng cho phép mở cửa sổ popup để xem và in Chứng thư di sản.');
      } else {
        alert('Vui lòng cho phép mở cửa sổ popup để xem và in Chứng thư di sản.');
      }
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Chứng Thư Di Sản Gốm Bát Tràng - Đơn #${orderId}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; background: #fffdfa; color: #0a2540; }
          .cert-border { border: 6px double #a23e18; padding: 32px; border-radius: 12px; text-align: center; }
          h1 { font-size: 24px; text-transform: uppercase; color: #a23e18; margin-bottom: 4px; letter-spacing: 1px; }
          h2 { font-size: 15px; font-weight: normal; font-style: italic; color: #555; margin-top: 0; }
          .seal { width: 90px; height: 90px; border: 3px solid #b91c1c; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #b91c1c; font-weight: bold; font-size: 12px; margin: 16px auto; transform: rotate(-6deg); }
          .desc { font-size: 15px; line-height: 1.8; margin: 20px 0; text-align: justify; }
          .signatures { display: flex; justify-content: space-around; margin-top: 35px; font-weight: bold; font-size: 14px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="cert-border">
          <h1>CHỨNG THƯ BẢO VẬT DI SẢN GỐM BÁT TRÀNG</h1>
          <h2>Minh Gốm Bát Tràng 1705 • Làng Nghề Truyền Thống Thăng Long - Hà Nội</h2>
          <div class="seal">TRIỆN NGỰ<br>BÁT TRÀNG</div>
          <div class="desc">
            Chứng nhận đơn hàng độc bản mang mã số lưu trữ: <strong>#${orderId}</strong><br>
            Được bảo chứng và lưu ký quyền sở hữu cho Thượng khách: <strong>${u.fullName || 'Nhà Sưu Tầm Thượng Lưu'}</strong><br>
            Tác phẩm đạt chuẩn mực cốt nung cổ pháp 1.380°C, kỹ nghệ phủ men rạn hoàng cung và chữ ký triện thủ công xác thực bởi Ban Giám Tuyển Làng Gốm Thanh Xuân.
          </div>
          <div class="signatures">
            <div>NGHỆ NHÂN DÂN GIAN TRƯỞNG LÒ<br><br><br><br><i>(Đã ấn triện số)</i></div>
            <div>BAN QUẢN LÝ LÀNG GỐM THANH XUÂN<br><br><br><br><i>(Xác thực di sản)</i></div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(function () {
      try { printWin.print(); } catch (err) {}
    }, 500);
  }
  window.downloadHeritageCertificate = downloadHeritageCertificate;

  function downloadHeritageFromDetail() {
    if (!currentOrderDetail) return;
    if (typeof window.downloadHeritageCertificate === 'function') {
      window.downloadHeritageCertificate(currentOrderDetail.orderCode);
    } else {
      window.print();
    }
  }

  // Đối tượng đối ngoại
  const OrdersModule = {
    initCheckoutPage,
    initOrderSuccessPage,
    initOrderTrackingPage,
    initOrderDetailPage,
    cancelCurrentOrderDetail,
    openReturnModalFromDetail,
    downloadHeritageFromDetail,
    downloadHeritageCertificate,
    initProfileOrders,
    toggleOrderAccordion,
    submitOrder,
    setOrderFilter,
    openCancelModal,
    closeCancelModal,
    executeCancelOrder,
    openPayNotifyModal,
    closePayNotifyModal,
    submitPayNotify,
    selectPaymentMethod,
    setupPaymentMethodSelection,
  };

  window.OrdersModule = OrdersModule;
  window.initCheckoutPage = initCheckoutPage;
  window.initOrderSuccessPage = initOrderSuccessPage;
  window.initOrderTrackingPage = initOrderTrackingPage;
  window.initOrderDetailPage = initOrderDetailPage;
  window.cancelCurrentOrderDetail = cancelCurrentOrderDetail;
  window.initProfileOrders = initProfileOrders;
})();

