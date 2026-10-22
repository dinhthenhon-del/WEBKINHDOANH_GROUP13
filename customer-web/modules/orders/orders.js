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
    return Number(amount || 0).toLocaleString('vi-VN') + '₫';
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
                <span class="font-bold text-[15px] text-[#000f22] font-serif">${formatMoney(lineTotal)}</span>
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
    const addressSelector = document.getElementById('checkout-saved-address-selector');

    if (!user) return;

    const addresses = Array.isArray(user.addresses) ? user.addresses : [];

    // Nếu người dùng có các địa chỉ đã lưu
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
            nameInput.value = user.fullName || '';
            phoneInput.value = user.phone || '';
            addressInput.value = '';
            wardInput.value = '';
          } else {
            const chosen = addresses[parseInt(this.value, 10)];
            if (chosen) {
              nameInput.value = chosen.recipientName || '';
              phoneInput.value = chosen.phone || '';
              provinceSelect.value = chosen.province || 'Hà Nội';
              wardInput.value = chosen.ward || '';
              addressInput.value = chosen.detail || '';
            }
          }
        };
      }
    }

    // Tự điền từ địa chỉ mặc định
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

        // Chuyển sang màn hình Đặt hàng thành công kèm thông tin
        if (typeof window.dieuHuong === 'function') {
          window.dieuHuong('order-success', null, {
            orderId: res.data._id,
            orderCode: res.data.orderCode,
            totalAmount: res.data.totalAmount,
            paymentMethod: res.data.paymentMethod,
            recipientName,
            phone: cleanPhone,
            address: `${detail}, ${ward}, ${province}`,
          });
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
  function initOrderSuccessPage(param) {
    const data = param || {};
    const codeEl = document.getElementById('success-order-code');
    const amountEl = document.getElementById('success-order-amount');
    const methodEl = document.getElementById('success-order-method');
    const recipientEl = document.getElementById('success-order-recipient');
    const addressEl = document.getElementById('success-order-address');
    const bankingBox = document.getElementById('success-banking-guide-box');
    const trackBtn = document.getElementById('success-btn-track');

    if (codeEl) codeEl.textContent = `#${data.orderCode || 'DH' + Date.now()}`;
    if (amountEl) amountEl.textContent = formatMoney(data.totalAmount);
    if (recipientEl) recipientEl.textContent = `${data.recipientName || 'Quý khách'} • ${data.phone || ''}`;
    if (addressEl) addressEl.textContent = data.address || 'Địa chỉ tiếp nhận tác phẩm';

    const method = (data.paymentMethod || 'COD').toUpperCase();
    if (methodEl) {
      if (method === 'COD') methodEl.textContent = 'Thanh toán khi nhận hàng (COD)';
      else if (method === 'MOMO') methodEl.textContent = 'Ví điện tử MoMo';
      else methodEl.textContent = 'Chuyển khoản VietQR Doanh Nghiệp';
    }

    // Hiển thị hướng dẫn chuyển khoản mô phỏng nếu là Banking/Momo
    if (bankingBox) {
      if (method === 'BANKING' || method === 'MOMO') {
        bankingBox.classList.remove('hidden');
      } else {
        bankingBox.classList.add('hidden');
      }
    }

    if (trackBtn) {
      trackBtn.onclick = function () {
        if (typeof window.dieuHuong === 'function') {
          window.dieuHuong('order-tracking', null, data.orderId || data.orderCode);
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
              <span class="font-bold text-[#000f22] text-[15px] font-serif tracking-tight">#${escapeHtml(order.orderCode)}</span>
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
                    <span class="font-bold text-[14px] text-[#000f22] font-serif">${formatMoney(item.unitPrice * item.quantity)}</span>
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
        alert('Hủy đơn hàng thành công! Số lượng sản phẩm đã được tự động hoàn lại tồn kho.');
        closeCancelModal();
        await initOrderTrackingPage();
      }
    } catch (err) {
      console.error('Lỗi khi hủy đơn hàng:', err);
      // E1: Đơn đã sang trạng thái khác PENDING
      alert(err.message || 'Đơn hàng không thể hủy tại thời điểm này. Trạng thái đơn đã được cập nhật.');
      closeCancelModal();
      await initOrderTrackingPage();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Xác nhận hủy';
      }
    }
  }

  // Đối tượng đối ngoại
  const OrdersModule = {
    initCheckoutPage,
    initOrderSuccessPage,
    initOrderTrackingPage,
    submitOrder,
    setOrderFilter,
    openCancelModal,
    closeCancelModal,
    executeCancelOrder,
    selectPaymentMethod,
    setupPaymentMethodSelection,
  };

  window.OrdersModule = OrdersModule;
  window.initCheckoutPage = initCheckoutPage;
  window.initOrderSuccessPage = initOrderSuccessPage;
  window.initOrderTrackingPage = initOrderTrackingPage;
})();
