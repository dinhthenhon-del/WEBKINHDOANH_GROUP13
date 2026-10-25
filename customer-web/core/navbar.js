/**
 * customer-web/core/navbar.js
 * Quản lý:
 * 1. Thanh Navbar cố định chuẩn Stitch (Làng Gốm Thanh Xuân / Haute Porcelain 1705)
 * 2. Điều hướng nạp giao diện con bằng AJAX (Slide 10) mà không reload trang
 * 3. Xử lý click Avatar: Đăng nhập/Đăng ký hoặc Hồ sơ cá nhân
 * 4. Chuyển đổi xem Lịch sử đơn hàng và Sản phẩm yêu thích
 * 5. Tái sử dụng form xác thực khi thả tim hoặc thêm vào giỏ hàng
 */

let currentUser = null;

window.togglePasswordVisibility = function () {
  const passInput = document.getElementById('collectorPassword');
  const passIcon = document.getElementById('passwordIcon');
  if (!passInput || !passIcon) return;
  passInput.type = passInput.type === 'password' ? 'text' : 'password';
  passIcon.textContent = passInput.type === 'password' ? 'visibility' : 'visibility_off';
};

Object.defineProperty(window, 'currentUser', {
  configurable: true,
  get: function () {
    return currentUser;
  },
  set: function (user) {
    currentUser = user;
  }
});

try {
  const saved = localStorage.getItem('craftory_user');
  if (saved) currentUser = JSON.parse(saved);
} catch (e) {
  currentUser = null;
}

// Hàm tự động đẩy người dùng ra ngoài khi tài khoản bị khóa từ Admin
window.kickBlockedUser = function (message) {
  const msg = message || 'Tài khoản của bạn hiện tại đã bị khóa';
  currentUser = null;
  localStorage.removeItem('craftory_user');
  updateAvatarState();
  alert(msg);
  dieuHuong('login');
  setTimeout(function () {
    const errBox = document.getElementById('loginErrorMessage');
    const errText = document.getElementById('loginErrorText');
    if (errBox && errText) {
      errText.innerText = msg;
      errBox.classList.remove('hidden');
    }
  }, 250);
};

// Heartbeat định kỳ 15 giây: Kiểm tra trạng thái tài khoản không làm nghẽn mạng
setInterval(function () {
  if (currentUser && currentUser._id) {
    ApiService.checkStatus(currentUser._id, function (err, res) {
      if (err || (res && res.isBlocked)) {
        window.kickBlockedUser((res && res.message) || 'Tài khoản của bạn hiện tại đã bị khóa');
      }
    });
  }
}, 15000);

document.addEventListener('DOMContentLoaded', function () {
  initNavbar();
  updateAvatarState();

  if (currentUser && currentUser._id) {
    ApiService.checkStatus(currentUser._id, function (err, res) {
      if (err || (res && res.isBlocked)) {
        window.kickBlockedUser((res && res.message) || 'Tài khoản của bạn hiện tại đã bị khóa');
        return;
      }
    });
  }

  // Khởi tạo trang ban đầu dựa trên hash URL nếu có, mặc định là 'home'
  const initialHash = window.location.hash ? window.location.hash.replace('#', '') : '';
  const initialPage = initialHash || 'home';
  window.dieuHuong(initialPage);

  // Lắng nghe sự kiện hash URL thay đổi
  window.addEventListener('hashchange', function () {
    const currentHash = window.location.hash ? window.location.hash.replace('#', '') : '';
    if (currentHash) {
      window.dieuHuong(currentHash);
    }
  });
});

/**
 * 1. Khởi tạo thanh Navbar chuẩn từ bản thiết kế Stitch
 */
function initNavbar() {
  const headerContainer = document.getElementById('navbar-header');
  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <header class="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div class="h-20 max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop flex items-center justify-between">
        <!-- Logo thương hiệu -->
        <a class="flex items-center gap-3 group cursor-pointer" onclick="dieuHuong('home')">
          <div class="w-10 h-10 rounded-lg overflow-hidden border border-[#0A2540]/20 bg-[#8c582f] flex items-center justify-center shrink-0 shadow-sm">
            <img class="w-full h-full object-cover" src="assets/img/logo.png" alt="Làng Gốm Thanh Xuân Logo">
          </div>
          <div class="flex flex-col">
            <span class="font-headline-sm text-[17px] text-primary tracking-wide font-bold group-hover:text-secondary transition-colors uppercase leading-tight font-['Playfair_Display',serif]">LÀNG GỐM THANH XUÂN</span>
            <span class="font-label-sm text-[10px] text-[#74777e] tracking-[0.16em] uppercase font-semibold leading-none mt-1">DI SẢN NGHỆ THUẬT GỐM</span>
          </div>
        </a>

        <!-- Menu giữa -->
        <nav class="hidden md:flex items-center gap-space-lg">
          <a class="nav-menu-item font-body-md text-[#b91c1c] font-bold border-b-2 border-[#b91c1c] pb-1 tracking-wide cursor-pointer" id="nav-item-home" onclick="dieuHuong('home', this)">Trang chủ</a>

          <!-- Danh mục sản phẩm -->
          <div class="relative group py-6">
            <a class="inline-flex items-center gap-1 font-body-md text-stone-700 hover:text-primary transition-colors tracking-wide py-2 cursor-pointer" onclick="dieuHuong('shop')">
              <span>DANH MỤC SẢN PHẨM</span>
              <span class="material-symbols-outlined text-[18px] group-hover:rotate-180 transition-transform duration-300">expand_more</span>
            </a>
            <div class="absolute left-1/2 top-full hidden -translate-x-1/2 group-hover:block w-[680px] max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-xl shadow-2xl p-6 border border-stone-100 z-50 transition-all duration-300">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div class="min-w-0 sm:bg-surface-container-low/50 sm:p-4 sm:rounded-lg">
                <div class="font-label-sm text-secondary uppercase tracking-widest font-bold mb-3 pb-2 border-b border-stone-200/60">
                  Bộ sưu tập
                </div>
                <ul id="nav-collection-list" class="space-y-2 text-stone-700 font-body-sm max-h-64 overflow-y-auto">
                  <li class="py-1 text-stone-500">Đang tải bộ sưu tập...</li>
                </ul>
              </div>
              <div class="min-w-0">
                <div class="font-label-sm text-secondary uppercase tracking-widest font-bold mb-3 pb-2 border-b border-stone-100">Sản phẩm</div>
                <ul id="nav-product-list" class="space-y-2 text-stone-700 font-body-sm max-h-64 overflow-y-auto">
                  <li class="py-1 text-stone-500">Đang tải sản phẩm...</li>
                </ul>
              </div>
              </div>
            </div>
          </div>

          <a class="nav-menu-item font-body-md text-stone-700 hover:text-primary transition-colors tracking-wide py-2 cursor-pointer" id="nav-item-custom-2d" onclick="dieuHuong('custom-2d', this)">Thiết kế 2D</a>
        </nav>

        <!-- Bên phải: Tìm kiếm, Wishlist, Giỏ hàng, Avatar -->
        <div class="flex items-center gap-space-md">
          <button aria-label="Tìm kiếm bảo vật" class="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer" onclick="toggleNavbarSearch()" title="Tìm kiếm tác phẩm" aria-expanded="false" aria-controls="navbar-search-panel">
            <span class="material-symbols-outlined text-[22px]">search</span>
          </button>

          <a aria-label="Giỏ hàng" class="relative w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer" onclick="if(window.CartModule) CartModule.openDrawer(); else requireAuthAction(() => dieuHuong('cart'));" title="Giỏ hàng">
            <span class="material-symbols-outlined text-[22px]">shopping_bag</span>
            <span id="navbar-cart-count" class="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-secondary text-on-secondary rounded-full flex items-center justify-center font-label-sm leading-none text-[10px]">0</span>
          </a>

          <!-- Avatar Tài khoản (Click mở Thông tin cá nhân & Đơn hàng HOẶC Form Đăng nhập) -->
          <button id="navbar-avatar-btn" onclick="handleAvatarClick()" aria-label="Tài khoản thượng khách" class="w-9 h-9 rounded-full bg-primary hover:bg-deep-indigo-night flex items-center justify-center transition-colors text-on-primary shadow-sm cursor-pointer" title="Tài khoản">
            <span id="avatar-icon" class="material-symbols-outlined text-[19px]">person</span>
          </button>
        </div>
      </div>
      <form id="navbar-search-panel" class="hidden border-t border-gray-100 bg-white px-4 py-3 shadow-md" role="search" onsubmit="submitNavbarSearch(event)">
        <div class="mx-auto flex max-w-3xl items-center gap-2">
          <label class="sr-only" for="navbar-search-input">Tìm sản phẩm gốm sứ</label>
          <input id="navbar-search-input" type="search" name="search" placeholder="Nhập tên sản phẩm hoặc mã SKU..." class="min-w-0 flex-1 rounded-lg border border-[#EBEAE5] bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#000f22] placeholder:text-[#74777e] focus:border-[#0a2540] focus:bg-white focus:outline-none" autocomplete="off">
          <button type="submit" class="rounded-lg bg-[#0a2540] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10162B]">Tìm kiếm</button>
          <button type="button" aria-label="Đóng tìm kiếm" onclick="toggleNavbarSearch(false)" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#74777e] hover:bg-[#f3f4f5]">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </form>
    </header>
  `;

  loadCatalogMenu();
}

function escapeMenuText(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function loadCatalogMenu() {
  const collectionList = document.getElementById('nav-collection-list');
  const productList = document.getElementById('nav-product-list');

  ApiService.getCollections((err, res) => {
    if (!collectionList) return;
    if (err || !res || !res.success || !Array.isArray(res.data)) {
      collectionList.innerHTML = '<li class="py-1 text-red-700">Không tải được bộ sưu tập.</li>';
      return;
    }

    if (res.data.length === 0) {
      collectionList.innerHTML = '<li class="py-1 text-stone-500">Chưa có bộ sưu tập.</li><li><a href="#" data-collections-all class="text-secondary font-semibold block pt-2">Xem tất cả bộ sưu tập →</a></li>';
      return;
    }

    collectionList.innerHTML = res.data.map(collection => `
      <li><a href="#" data-collection-id="${escapeMenuText(collection._id)}" data-collection-name="${escapeMenuText(collection.name)}" class="hover:text-secondary flex items-center justify-between gap-2 py-1 transition-colors">
        <span>${escapeMenuText(collection.name)}</span>
        <span class="text-xs text-stone-500">${collection.productCount || 0}</span>
      </a></li>
    `).join('') + `
      <li><a href="#" data-collections-all class="text-secondary font-semibold block pt-2">Xem tất cả bộ sưu tập →</a></li>
    `;
  });

  ApiService.getProducts({ limit: 0, sort: 'newest' }, (err, res) => {
    if (!productList) return;
    if (err || !res || !res.success || !Array.isArray(res.data)) {
      productList.innerHTML = '<li class="py-1 text-red-700">Không tải được sản phẩm.</li>';
      return;
    }

    if (res.data.length === 0) {
      productList.innerHTML = '<li class="py-1 text-stone-500">Chưa có sản phẩm.</li>';
      return;
    }

    productList.innerHTML = [
      ...res.data.map(product => `
        <li><a href="#" data-product-id="${escapeMenuText(product._id)}" class="hover:text-secondary block py-1 transition-colors" title="${escapeMenuText(product.name)}">
          <span class="block truncate">${escapeMenuText(product.name)}</span>
          <span class="text-xs text-stone-500">${Number(product.price || 0).toLocaleString('vi-VN')}₫</span>
        </a></li>
      `)
    ].join('');
  });

  const menu = collectionList.closest('.absolute');
  menu.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    event.preventDefault();

    if (link.hasAttribute('data-collections-all')) {
      dieuHuong('collections');
    } else if (link.dataset.collectionId || link.dataset.collectionName) {
      dieuHuong('collection-detail', null, {
        collectionId: link.dataset.collectionId,
        collectionName: link.dataset.collectionName
      });
    } else if (link.dataset.productId) {
      window.selectedProductId = link.dataset.productId;
      dieuHuong('product-detail', null, link.dataset.productId);
    }
  });
}

/**
 * 2. Cập nhật icon avatar trên navbar
 */
function updateAvatarState() {
  const avatarIcon = document.getElementById('avatar-icon');
  const avatarBtn = document.getElementById('navbar-avatar-btn');
  if (avatarIcon && avatarBtn) {
    if (currentUser) {
      avatarBtn.classList.remove('bg-primary');
      avatarBtn.classList.add('bg-[#a23e18]');
      avatarIcon.innerText = currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'account_circle';
    } else {
      avatarBtn.classList.remove('bg-[#a23e18]');
      avatarBtn.classList.add('bg-primary');
      avatarIcon.innerText = 'person';
    }
  }
  if (window.CartView) window.CartView.refreshCount();
}

window.dieuHuong = function (tenPhanHe, element, param) {
  window.currentViewParam = param;
  const viewport = document.getElementById('app-viewport');
  if (!viewport) {
    console.error('Không tìm thấy #app-viewport');
    return;
  }
  const url = `views/${tenPhanHe}.html?v=${Date.now()}`;

  // Update active state
  window.location.hash = '#' + tenPhanHe;
  document.querySelectorAll('.nav-menu-item').forEach(el => {
    el.classList.remove('text-[#b91c1c]', 'font-bold', 'border-b-2', 'border-[#b91c1c]');
    el.classList.add('text-stone-700');
  });
  const matchedNav = element || document.getElementById(`nav-item-${tenPhanHe}`);
  if (matchedNav) {
    matchedNav.classList.add('text-[#b91c1c]', 'font-bold', 'border-b-2', 'border-[#b91c1c]');
    matchedNav.classList.remove('text-stone-700');
  }

  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        viewport.innerHTML = xhr.responseText;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Kích hoạt thực thi các đoạn thẻ <script> bên trong view vừa nạp
        const scripts = viewport.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        // Khởi tạo các logic tương ứng sau khi kéo giao diện vào
        if (tenPhanHe === 'profile') {
          khoiTaoTrangProfile(param);
        } else if (tenPhanHe === 'login') {
          ganSuKienLogin();
        } else if (tenPhanHe === 'register') {
          ganSuKienRegister();
        } else if (tenPhanHe === 'shop') {
          if (typeof khoiTaoTrangShop === 'function') {
            khoiTaoTrangShop(param);
          }
        } else if (tenPhanHe === 'collections') {
          if (typeof khoiTaoTrangBoSuuTap === 'function') {
            khoiTaoTrangBoSuuTap();
          }
        } else if (tenPhanHe === 'collection-detail') {
          if (typeof khoiTaoChiTietBoSuuTap === 'function') {
            khoiTaoChiTietBoSuuTap(param);
          }
        } else if (tenPhanHe === 'product-detail') {
          if (typeof khoiTaoTrangProductDetail === 'function') {
            khoiTaoTrangProductDetail(param);
          }
        } else if (tenPhanHe === 'wishlist') {
          if (typeof khoiTaoTrangWishlist === 'function') {
            khoiTaoTrangWishlist();
          }
        } else if (tenPhanHe === 'cart') {
          if (window.CartModule) {
            CartModule.openDrawer();
          } else if (typeof CartView !== 'undefined') {
            CartView.loadCart();
          }
        } else if (tenPhanHe === 'checkout') {
          if (typeof initCheckoutPage === 'function') {
            initCheckoutPage(param);
          }
        } else if (tenPhanHe === 'order-success') {
          if (typeof initOrderSuccessPage === 'function') {
            initOrderSuccessPage(param);
          }
        } else if (tenPhanHe === 'order-detail') {
          if (typeof initOrderDetailPage === 'function') {
            initOrderDetailPage(param);
          } else if (window.OrdersModule && typeof window.OrdersModule.initOrderDetailPage === 'function') {
            window.OrdersModule.initOrderDetailPage(param);
          }
        } else if (tenPhanHe === 'order-tracking') {
          dieuHuong('profile', null, param);
          return;
        } else if (tenPhanHe === 'custom-2d') {
          if (typeof khoiTaoTrangCustom2D === 'function') {
            khoiTaoTrangCustom2D();
          }
        } else if (tenPhanHe === 'home') {
          if (window.ProductComponent) {
            if (typeof ProductComponent.loadHomeCollections === 'function') {
              ProductComponent.loadHomeCollections('home-collections-grid');
            }
            if (typeof ProductComponent.loadFeaturedProducts === 'function') {
              ProductComponent.loadFeaturedProducts('home-featured-products-grid', 4);
            }
          }
        }
      } else {
        viewport.innerHTML = `<div class="py-24 text-center"><h2 class="text-xl font-bold text-red-600">404 - Chưa tìm thấy phân hệ: ${tenPhanHe}</h2></div>`;
      }
    }
  };
  xhr.send();
}

/**
 * 4. Xử lý click Avatar
 */
function handleAvatarClick() {
  if (!currentUser) {
    dieuHuong('login');
  } else {
    dieuHuong('profile');
  }
}

/**
 * 5. Hàm dùng chung: Yêu cầu đăng nhập trước khi thao tác (thả tim, giỏ hàng)
 */
function requireAuthAction(callback) {
  if (!currentUser) {
    window.pendingAction = callback;
    alert('Vui lòng đăng nhập để tiếp tục thao tác này!');
    dieuHuong('login');
  } else {
    if (typeof callback === 'function') callback();
  }
}

/**
 * 6. Logic Form Đăng nhập
 */
function ganSuKienLogin() {
  const form = document.getElementById('collectorLoginForm');
  if (!form) return;

  form.onsubmit = function (e) {
    e.preventDefault();
    const identifier = (document.getElementById('collectorUsername') || form.querySelector('input[type="text"]')).value.trim();
    const password = (document.getElementById('collectorPassword') || form.querySelector('input[type="password"]')).value;

    if (!identifier || !password) {
      showCartNotification('Kính xin quý khách nhập đầy đủ Tên đăng nhập/SĐT/Email và Mật khẩu.', 'warning', 'info');
      return;
    }

    ApiService.login({ emailOrPhone: identifier, password }, function (err, res) {
      const errBox = document.getElementById('loginErrorMessage');
      const errText = document.getElementById('loginErrorText');
      if (err || !res || !res.success) {
        const errMsg = (res && res.message) || err || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
        if (errBox) errBox.classList.add('hidden');
        showCartNotification(errMsg, 'warning', 'error');
      } else {
        if (errBox) errBox.classList.add('hidden');
        currentUser = res.data;
        localStorage.setItem('craftory_user', JSON.stringify(currentUser));
        updateAvatarState();
        showCartNotification('Đăng nhập thành công. Xin chào ' + (currentUser.fullName || 'quý khách') + '!', 'success', 'verified');

        if (window.pendingAction) {
          const act = window.pendingAction;
          window.pendingAction = null;
          act();
        } else {
          dieuHuong('profile');
        }
      }
    });
  };
}

/**
 * Hàm hỗ trợ điền nhanh tài khoản mẫu để trải nghiệm
 */
window.fillSampleAccount = function () {
  const idInput = document.getElementById('collectorUsername') || document.querySelector('input[type="text"]');
  const passInput = document.getElementById('collectorPassword') || document.querySelector('input[type="password"]');
  if (idInput && passInput) {
    idInput.value = '0918345678';
    passInput.value = '123456';
  }
};
window.autoFillPrivilegeDemo = window.fillSampleAccount;

/**
 * 7. Logic Form Đăng ký (UC-C01)
 */
function ganSuKienRegister() {
  const form = document.getElementById('registration-form');
  if (!form) return;

  form.onsubmit = function (e) {
    e.preventDefault();
    const fullName = (document.getElementById('fullname') || form.querySelector('input[name="fullname"]')).value.trim();
    const email = (document.getElementById('account-email') || form.querySelector('input[name="account-email"]')).value.trim();
    const phone = (document.getElementById('account-phone') || form.querySelector('input[name="account-phone"]')).value.trim();
    const password = (document.getElementById('password') || form.querySelector('input[name="password"]')).value;
    const confirmPassword = (document.getElementById('confirm-password') || form.querySelector('input[name="confirm-password"]')).value;

    if (!fullName || !email || !phone || !password) {
      showCartNotification('Vui lòng điền đầy đủ các thông tin bắt buộc', 'warning', 'info');
      return;
    }

    if (password !== confirmPassword) {
      showCartNotification('Mật khẩu xác nhận không trùng khớp. Kính xin quý khách kiểm tra lại.', 'warning', 'info');
      return;
    }

    ApiService.register({ fullName, email, phone, password }, function (err, res) {
      if (err || !res || !res.success) {
        showCartNotification(err || (res && res.message) || 'Đăng ký thất bại', 'warning', 'error');
      } else {
        showCartNotification('Kính chúc mừng Thượng khách ' + fullName + ' đã gia nhập Hội Quán Gốm Bát Tràng!', 'success', 'verified');
        currentUser = null;
        localStorage.removeItem('craftory_user');
        updateAvatarState();
        dieuHuong('login');
      }
    });
  };
}

/**
 * 8. Logic Đăng xuất tài khoản (Stitch Design)
 */
window.handleLogout = function () {
  if (confirm('Kính hỏi: Quý khách có muốn đăng xuất khỏi tài khoản không?')) {
    currentUser = null;
    localStorage.removeItem('craftory_user');
    updateAvatarState();
    alert('Quý khách đã đăng xuất thành công.');
    dieuHuong('home');
  }
};

/**
 * 9. Logic Trang Profile (Đổ dữ liệu User, Đơn hàng, Wishlist từ MongoDB)
 */
function khoiTaoTrangProfile(param) {
  if (!currentUser) {
    dieuHuong('login');
    return;
  }

  // Điền dữ liệu thật vào Collector ID Card
  const nameEl = document.getElementById('profile-user-name') || document.querySelector('h2.font-headline-sm');
  if (nameEl) nameEl.innerText = currentUser.fullName || 'Nguyễn Hoàng Nam';

  const emailEl = document.getElementById('profile-user-email');
  if (emailEl) emailEl.innerText = currentUser.email || 'nam.nguyenhoang@heritage.vn';

  const phoneEl = document.getElementById('profile-user-phone');
  if (phoneEl) phoneEl.innerText = currentUser.phone || '0918 345 678';

  const addressEl = document.getElementById('profile-user-address');
  if (addressEl) {
    const defaultAddr = (currentUser.addresses && currentUser.addresses.find(a => a.isDefault)) || (currentUser.addresses && currentUser.addresses[0]);
    if (defaultAddr) {
      addressEl.innerText = `${defaultAddr.detail}, ${defaultAddr.ward || ''}, ${defaultAddr.province || ''}`.replace(/^,\s*|,\s*$/g, '');
    } else {
      addressEl.innerText = 'Biệt thự số 18, Ngõ 12 Đặng Thai Mai, Tây Hồ, Hà Nội';
    }
  }

  const avatarMonogram = document.getElementById('profile-avatar-monogram');
  if (avatarMonogram) {
    avatarMonogram.innerText = currentUser.fullName ? currentUser.fullName.trim().charAt(0).toUpperCase() : '阮';
  }
  const avatarSubname = document.getElementById('profile-avatar-subname');
  if (avatarSubname) {
    const parts = (currentUser.fullName || 'Hoàng Nam').trim().split(/\s+/);
    avatarSubname.innerText = parts.length > 1 ? parts.slice(-2).join(' ') : parts[0];
  }

  // Lấy danh sách đơn hàng thực từ MongoDB
  ApiService.getOrders(currentUser._id, function (err, res) {
    if (!err && res && res.success) {
      const countEl = document.getElementById('profile-order-count');
      if (countEl) countEl.innerText = String(res.data.length).padStart(2, '0');
    }
  });

  // Lấy wishlist và kiểm tra trạng thái tài khoản
  ApiService.getProfile(currentUser._id, function (err, res) {
    if (err || (res && res.isBlocked)) {
      window.kickBlockedUser((res && res.message) || 'Tài khoản của bạn hiện tại đã bị khóa');
      return;
    }
    if (res && res.success && res.data) {
      currentUser = res.data;
      localStorage.setItem('craftory_user', JSON.stringify(currentUser));
      if (typeof window.updateWishlistBadges === 'function') {
        window.updateWishlistBadges((currentUser.wishlist && currentUser.wishlist.length) || 0);
      } else {
        const wlCount = (currentUser.wishlist && currentUser.wishlist.length) || 0;
        const countBadge = document.getElementById('profile-wishlist-count');
        if (countBadge) countBadge.innerText = String(wlCount).padStart(2, '0');
      }
    }
  });

  // Tải danh sách đơn hàng động và tự cuộn đến đơn mục tiêu nếu có
  if (window.OrdersModule && typeof window.OrdersModule.initProfileOrders === 'function') {
    window.OrdersModule.initProfileOrders(param);
  }
}

/**
 * 9. Chuyển đổi giữa 2 tab: Lịch sử đơn hàng VÀ Sản phẩm yêu thích
 */
function switchProfileTab(tab) {
  const btnOrders = document.getElementById('tab-btn-orders');
  const btnWishlist = document.getElementById('tab-btn-wishlist');
  const viewOrders = document.getElementById('view-orders-section');
  const viewWishlist = document.getElementById('view-wishlist-section');

  if (tab === 'orders') {
    if (btnOrders) {
      btnOrders.className = 'w-full flex items-center justify-between p-4 bg-primary text-on-primary font-semibold transition-all border-b border-biscuit-sand/40 cursor-pointer';
    }
    if (btnWishlist) {
      btnWishlist.className = 'w-full flex items-center justify-between p-4 bg-transparent text-primary hover:bg-surface-container-low font-semibold transition-all border-b border-biscuit-sand/40 cursor-pointer';
    }
    if (viewOrders) viewOrders.style.display = 'flex';
    if (viewWishlist) viewWishlist.style.display = 'none';
  } else if (tab === 'wishlist') {
    if (btnWishlist) {
      btnWishlist.className = 'w-full flex items-center justify-between p-4 bg-primary text-on-primary font-semibold transition-all border-b border-biscuit-sand/40 cursor-pointer';
    }
    if (btnOrders) {
      btnOrders.className = 'w-full flex items-center justify-between p-4 bg-transparent text-primary hover:bg-surface-container-low font-semibold transition-all border-b border-biscuit-sand/40 cursor-pointer';
    }
    if (viewOrders) viewOrders.style.display = 'none';
    if (viewWishlist) viewWishlist.style.display = 'flex';

    // Gọi trực tiếp WishlistView.loadWishlist() từ products.js
    if (window.WishlistView && typeof window.WishlistView.loadWishlist === 'function') {
      window.WishlistView.loadWishlist();
    }
  }
}

let currentWishlistData = [];
let currentWishlistCategory = 'all';

async function fetchFullWishlistProducts() {
  if (!currentUser) return [];
  const userId = currentUser._id || currentUser.id || currentUser.accountId;
  if (!userId) return [];

  // Cách 1: Sử dụng ApiService.getWishlist nếu có
  if (typeof ApiService !== 'undefined' && typeof ApiService.getWishlist === 'function') {
    const list = await new Promise((resolve) => {
      ApiService.getWishlist(userId, (err, res) => {
        if (!err && res && res.success && Array.isArray(res.data)) {
          resolve(res.data);
        } else {
          resolve(null);
        }
      });
    });
    if (list) return list;
  }

  // Cách 2: Gọi trực tiếp qua apiBase an toàn
  try {
    const base = (window.CRAFTORY_API_BASE || 'http://localhost:5000/api');
    const res = await new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${base}/accounts/wishlist/${userId}`, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(null);
          }
        }
      };
      xhr.onerror = function () { resolve(null); };
      xhr.send();
    });

    if (res && res.success && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn('Lỗi fetchFullWishlistProducts:', err);
  }

  // Fallback: nếu populate sẵn trong currentUser.wishlist
  if (currentUser && Array.isArray(currentUser.wishlist)) {
    return currentUser.wishlist.filter(item => typeof item === 'object' && item !== null);
  }
  return [];
}

async function loadProfileWishlistGrid() {
  const grid = document.getElementById('profile-wishlist-grid');
  if (!grid) return;

  const totalBadge = document.getElementById('wishlist-total-badge');
  const headerDesc = document.getElementById('wishlist-header-desc');
  const batchLabel = document.getElementById('wishlist-batch-count-label');
  const countBadge = document.getElementById('profile-wishlist-count');

  grid.innerHTML = `
    <div class="col-span-full py-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
      <span class="material-symbols-outlined text-4xl animate-spin text-secondary">progress_activity</span>
      <p class="font-body-sm font-medium">Đang tải bộ sưu tập tác phẩm yêu thích...</p>
    </div>
  `;

  const products = await fetchFullWishlistProducts();
  currentWishlistData = products;

  const countStr = String(products.length).padStart(2, '0');
  if (totalBadge) totalBadge.innerText = `${countStr} TÁC PHẨM`;
  if (headerDesc) headerDesc.innerText = `Danh sách các bảo vật gốm sứ thủ công thượng khách đã lưu giữ (${countStr} tác phẩm)`;
  if (batchLabel) batchLabel.innerText = `Đã lưu trữ ${countStr} tác phẩm di sản`;
  if (countBadge) countBadge.innerText = countStr;

  // Render Category Tabs
  renderWishlistCategoryTabs(products);

  // Render Products
  renderWishlistItems(getFilteredAndSortedWishlist());
}

function renderWishlistCategoryTabs(products) {
  const tabsContainer = document.getElementById('wishlist-category-tabs');
  if (!tabsContainer) return;

  const catCounts = {};
  products.forEach(p => {
    const catName = p.categoryName || p.category || (p.collectionName ? p.collectionName : 'Tác phẩm độc bản');
    catCounts[catName] = (catCounts[catName] || 0) + 1;
  });

  let html = `
    <button onclick="setWishlistCategory('all', this)" class="wishlist-cat-btn px-4 py-2.5 rounded font-title-md text-body-sm whitespace-nowrap ${currentWishlistCategory === 'all' ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-biscuit-sand/50'}">
      Tất cả (${String(products.length).padStart(2, '0')})
    </button>
  `;

  Object.keys(catCounts).forEach(cat => {
    const isAct = currentWishlistCategory === cat;
    html += `
      <button onclick="setWishlistCategory('${escapeHtml(cat)}', this)" class="wishlist-cat-btn px-4 py-2.5 rounded font-title-md text-body-sm whitespace-nowrap ${isAct ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-biscuit-sand/50'}">
        ${escapeHtml(cat)} (${String(catCounts[cat]).padStart(2, '0')})
      </button>
    `;
  });

  tabsContainer.innerHTML = html;
}

function setWishlistCategory(cat, btnEl) {
  currentWishlistCategory = cat;
  const buttons = document.querySelectorAll('.wishlist-cat-btn');
  buttons.forEach(btn => {
    btn.className = 'wishlist-cat-btn px-4 py-2.5 rounded font-title-md text-body-sm whitespace-nowrap bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-biscuit-sand/50';
  });
  if (btnEl) {
    btnEl.className = 'wishlist-cat-btn px-4 py-2.5 rounded font-title-md text-body-sm whitespace-nowrap bg-primary text-on-primary font-semibold shadow-sm';
  }
  renderWishlistItems(getFilteredAndSortedWishlist());
}

function getFilteredAndSortedWishlist() {
  const query = (document.getElementById('wishlistSearchInput')?.value || '').toLowerCase().trim();
  const sortMode = document.getElementById('wishlistSortSelect')?.value || 'recent';

  let list = currentWishlistData.filter(p => {
    const matchCat = (currentWishlistCategory === 'all') ||
      ((p.categoryName || p.category || p.collectionName || 'Tác phẩm độc bản') === currentWishlistCategory);

    const name = (p.name || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const matchQuery = !query || name.includes(query) || desc.includes(query);

    return matchCat && matchQuery;
  });

  if (sortMode === 'price-asc') {
    list.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortMode === 'price-desc') {
    list.sort((a, b) => (b.price || 0) - (a.price || 0));
  }
  return list;
}

function filterWishlistProducts() {
  renderWishlistItems(getFilteredAndSortedWishlist());
}

function sortWishlistProducts() {
  renderWishlistItems(getFilteredAndSortedWishlist());
}

function renderWishlistItems(items) {
  const grid = document.getElementById('profile-wishlist-grid');
  if (!grid) return;

  if (!items || items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-on-surface-variant bg-porcelain-white rounded-xl border border-biscuit-sand p-8">
        <span class="material-symbols-outlined text-5xl text-celadon-mist mb-2 block">favorite_border</span>
        <p class="font-headline-sm text-base text-primary font-bold">Chưa có tác phẩm nào phù hợp</p>
        <p class="font-body-sm text-outline text-xs mt-1">Quý khách có thể bấm biểu tượng trái tim trên các tác phẩm tại Cửa Hàng để lưu giữ vào đây.</p>
        <button onclick="if(window.dieuHuong) window.dieuHuong('shop')" class="mt-4 px-5 py-2.5 rounded bg-primary text-on-primary font-title-md text-xs uppercase tracking-wider font-semibold hover:bg-primary-container transition-colors cursor-pointer">
          Khám Phá Bộ Sưu Tập Ngay
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  items.forEach(p => {
    const imgUrl = (p.images && p.images[0]) || p.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkfbQHWJcsVJLmZ79QWTiUBpW1AsRoVBm-niLfR4tTBU75MyS59dBrxxOg0lOm3enz5UxIZ1pMrEQJxuQd43DyoMYhmRoc_ZBnm9LZuMPqeSv-8LEQBrqyPUGcob4loEfD5jYp8NzYeC0NcSwLUAfF7s6Y9IA2RjGQPCyrzOJY_hlTrqsJ1Nu3j_EiSsOGteXYAskFMrgyF_2aN3SwRpQrNSzaQNs3YpDxs-uuRB0wDx45-Ps6dO2u';
    const tag = p.collectionName || p.tag || 'Bát Tràng Cổ Pháp';
    const spec = p.dimension || p.material || (p.height ? `Cao ${p.height}cm • Men nung 1.380°C` : 'Cốt sứ dày đanh • Khắc ấn triện');
    const inStock = (p.stock === undefined || p.stock > 0);
    const priceFormatted = (p.price || 0).toLocaleString('vi-VN') + '₫';

    html += `
      <div class="bg-porcelain-white rounded-xl border border-biscuit-sand shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between group">
        <div class="relative">
          <a class="block relative h-64 overflow-hidden bg-surface-container cursor-pointer" onclick="viewProductDetail('${p._id}')">
            <img alt="${escapeHtml(p.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(imgUrl)}" />
          </a>
          <button onclick="handleWishlistToggle('${p._id}')" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-porcelain-white/90 backdrop-blur-sm shadow flex items-center justify-center text-secondary hover:scale-110 transition-transform cursor-pointer" title="Bỏ thích">
            <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
          </button>
          <span class="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[10px] font-label-sm uppercase font-bold bg-primary-container text-tertiary-fixed-dim shadow">
            ${escapeHtml(tag)}
          </span>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div class="flex flex-col gap-1.5">
            <div>
              <span class="font-label-sm text-[11px] text-outline">${escapeHtml(spec)}</span>
              <h3 class="font-headline-sm text-title-md text-primary font-serif font-semibold mt-0.5 hover:text-secondary transition-colors cursor-pointer truncate" onclick="viewProductDetail('${p._id}')">
                ${escapeHtml(p.name)}
              </h3>
            </div>
            <p class="font-body-sm text-[13px] text-on-surface-variant line-clamp-2 leading-relaxed">
              ${escapeHtml(p.description || 'Tác phẩm gốm sứ nghệ thuật thủ công tinh xảo của làng nghề Bát Tràng, chế tác thủ công cầu kỳ.')}
            </p>
            <div class="flex items-center gap-1.5 mt-1 ${inStock ? 'text-emerald-800' : 'text-amber-800'} text-[12px] font-medium">
              <span class="material-symbols-outlined text-[16px] ${inStock ? 'text-emerald-700' : 'text-amber-600'}">
                ${inStock ? 'check_circle' : 'inventory_2'}
              </span>
              <span>${inStock ? 'Còn hàng (Sẵn sàng giao tác phẩm)' : 'Sắp xếp lò (Có thể đặt trước)'}</span>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-biscuit-sand/60 flex items-center justify-between gap-2">
            <div class="flex flex-col">
              <span class="font-label-sm text-[11px] text-outline uppercase">Định giá</span>
              <span class="font-headline-sm text-title-lg text-primary font-serif font-bold">${priceFormatted}</span>
            </div>
            <button onclick="addSingleWishlistToCart('${p._id}', '${escapeHtml(p.name)}')" class="px-3.5 py-2 rounded bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container transition-all font-title-md text-body-sm font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
              <span>Thêm vào giỏ</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;
}

function viewProductDetail(productId) {
  if (typeof window.dieuHuong === 'function') {
    window.dieuHuong('product-detail', { id: productId });
  } else {
    window.location.hash = `#/product-detail?id=${productId}`;
  }
}

function addSingleWishlistToCart(productId, productName) {
  requireAuthAction(function () {
    if (typeof ApiService !== 'undefined' && ApiService.addToCart) {
      ApiService.addToCart(currentUser._id, productId, 1, function (err, res) {
        if (!err && res && res.success) {
          if (typeof updateCartCount === 'function') updateCartCount();
          alert(`✨ Đã thêm tác phẩm "${productName || 'gốm sứ'}" vào giỏ hàng thành công!`);
        } else {
          alert('Không thể thêm vào giỏ hàng lúc này. Quý khách vui lòng thử lại.');
        }
      });
    }
  });
}

function addAllWishlistToCart() {
  if (!currentWishlistData || currentWishlistData.length === 0) {
    alert('Danh sách yêu thích đang trống.');
    return;
  }
  requireAuthAction(async function () {
    let successCount = 0;
    for (const p of currentWishlistData) {
      await new Promise(resolve => {
        ApiService.addToCart(currentUser._id, p._id, 1, () => {
          successCount++;
          resolve();
        });
      });
    }
    if (typeof updateCartCount === 'function') updateCartCount();
    alert(`✨ Đã thêm thành công ${successCount} tác phẩm di sản vào giỏ hàng của quý khách!`);
  });
}

function clearAllWishlist() {
  if (!currentWishlistData || currentWishlistData.length === 0) {
    alert('Danh sách yêu thích đang trống.');
    return;
  }
  if (!confirm('Quý khách có chắc chắn muốn xóa tất cả tác phẩm khỏi danh sách yêu thích?')) return;

  requireAuthAction(async function () {
    for (const p of currentWishlistData) {
      await new Promise(resolve => {
        ApiService.toggleWishlist(currentUser._id, p._id, resolve);
      });
    }
    // Cập nhật lại user
    currentUser.wishlist = [];
    localStorage.setItem('craftory_user', JSON.stringify(currentUser));
    loadProfileWishlistGrid();
  });
}

function handleWishlistToggle(productId) {
  requireAuthAction(function () {
    ApiService.toggleWishlist(currentUser._id, productId, function (err, res) {
      if (!err && res.success) {
        currentUser = res.data;
        localStorage.setItem('craftory_user', JSON.stringify(currentUser));
        loadProfileWishlistGrid();
        const countBadge = document.getElementById('profile-wishlist-count');
        if (countBadge) countBadge.innerText = String((currentUser.wishlist && currentUser.wishlist.length) || 0);
      }
    });
  });
}

function toggleNavbarSearch(forceOpen) {
  const panel = document.getElementById('navbar-search-panel');
  const toggle = document.querySelector('[aria-controls="navbar-search-panel"]');
  const input = document.getElementById('navbar-search-input');
  if (!panel || !toggle) return;

  const isOpen = forceOpen === undefined ? panel.classList.contains('hidden') : forceOpen;
  panel.classList.toggle('hidden', !isOpen);
  toggle.setAttribute('aria-expanded', String(isOpen));
  if (isOpen && input) input.focus();
}

function submitNavbarSearch(event) {
  event.preventDefault();
  const input = document.getElementById('navbar-search-input');
  const query = input ? input.value.trim() : '';
  if (!query) {
    if (input) input.focus();
    return;
  }

  toggleNavbarSearch(false);
  dieuHuong('shop', null, { search: query });
}
