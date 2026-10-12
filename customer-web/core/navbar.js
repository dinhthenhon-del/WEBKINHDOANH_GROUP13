/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Navbar Component (core/navbar.js)
 * Nhiệm vụ:
 *   - Hiển thị thanh điều hướng chung (Slide 02: Bố cục chuẩn Header - Menu - Logo)
 *   - Cập nhật trạng thái người dùng động:
 *       + Chưa đăng nhập: Nút "Đăng nhập / Đăng ký"
 *       + Đã đăng nhập: Avatar, Họ tên, Menu "Hồ sơ cá nhân", "Đăng xuất"
 *   - Cung cấp cổng mở Cart Drawer (TV3) và liên kết Studio 2D (TV4)
 * ============================================================================
 */

(function(window) {
  'use strict';

  var Navbar = {
    init: function() {
      this.render();
      this.bindEvents();
    },

    render: function() {
      var headerEl = document.getElementById('site-header');
      if (!headerEl) return;

      var currentUser = window.ApiClient ? window.ApiClient.getCurrentUser() : null;

      // Xây dựng HTML động dựa trên trạng thái đăng nhập
      var userSectionHtml = '';

      if (currentUser) {
        // Trạng thái ĐÃ ĐĂNG NHẬP
        userSectionHtml = [
          '<div class="relative group" id="user-menu-dropdown">',
          '  <button id="btn-user-avatar" type="button" class="flex items-center gap-2 p-1 rounded-full ring-1 ring-[#dec0b7] hover:ring-[#38665f] transition-all bg-white cursor-pointer">',
          '    <img src="' + (currentUser.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOcs5LcnujnUJQh8uk1tcbCEb8hHUsgJQu5MdSKJRejGOXfE-X7AidhlMhEg_6DWeLPxr8sXo9wvqW4z-U-w6vNsFwyV8Hl5ECIyx5MnDvxHw7yT3ICN-CaREbRTi_PukRQcPrLk3s3sk-uaUjbPkRviW2OVpfUlkTTSvLvK-SPogJrSZD1Xyq4FWNnEpIyb02n9V574ZwGz77BNZ4128a1lSAxsDpfCwgoYPrQn0NXchu9FhpXWuJ') + '" alt="Avatar" class="w-8 h-8 rounded-full object-cover">',
          '    <span class="hidden lg:inline text-xs font-semibold text-[#211a17] max-w-[100px] truncate pr-1">' + (currentUser.fullName || 'Khách hàng') + '</span>',
          '  </button>',
          '  <div class="absolute right-0 top-full pt-2 hidden group-hover:block w-64 z-50">',
          '    <div class="bg-white rounded-xl p-3 shadow-[0_12px_32px_-4px_rgba(43,35,32,0.12)] border border-[#faebe6] space-y-2">',
          '      <div class="px-2 py-1.5 border-b border-[#faebe6]">',
          '        <p class="text-xs font-bold text-[#9f3c16] uppercase tracking-wider">Hội viên Gốm Mộc</p>',
          '        <p class="text-sm font-semibold text-[#211a17] truncate">' + (currentUser.fullName || '') + '</p>',
          '        <p class="text-xs text-[#5f5b58] truncate">' + (currentUser.email || '') + '</p>',
          '      </div>',
          '      <div class="py-1 space-y-0.5">',
          '        <a href="#account" data-route="account" class="flex items-center px-2 py-1.5 rounded-lg text-sm text-[#57423b] hover:bg-[#fff1ec] hover:text-[#9f3c16] transition-colors">',
          '          <span class="material-symbols-outlined text-[18px] mr-2">person</span>Hồ sơ & Sổ địa chỉ',
          '        </a>',
          '        <a href="#account" data-route="account" data-tab="orders" class="flex items-center px-2 py-1.5 rounded-lg text-sm text-[#57423b] hover:bg-[#fff1ec] hover:text-[#9f3c16] transition-colors">',
          '          <span class="material-symbols-outlined text-[18px] mr-2">receipt_long</span>Đơn tác chế của tôi',
          '        </a>',
          '      </div>',
          '      <div class="pt-1 border-t border-[#faebe6]">',
          '        <button id="btn-logout" type="button" class="w-full flex items-center px-2 py-1.5 rounded-lg text-sm text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors cursor-pointer text-left">',
          '          <span class="material-symbols-outlined text-[18px] mr-2">logout</span>Đăng xuất',
          '        </button>',
          '      </div>',
          '    </div>',
          '  </div>',
          '</div>'
        ].join('\n');
      } else {
        // Trạng thái CHƯA ĐĂNG NHẬP
        userSectionHtml = [
          '<button id="btn-open-login" type="button" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#9f3c16] hover:bg-[#bf542c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-sm cursor-pointer">',
          '  <span class="material-symbols-outlined text-[18px]">person</span>',
          '  <span>Đăng nhập</span>',
          '</button>'
        ].join('\n');
      }

      var html = [
        '<div class="h-20 max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between">',
        '  <!-- 1. Logo Gốm Mộc (Slide 02) -->',
        '  <div class="flex items-center gap-8">',
        '    <a href="#home" data-route="home" class="flex items-center gap-2 group text-decoration-none">',
        '      <div class="w-9 h-9 rounded-full bg-[#faebe6] flex items-center justify-center text-[#9f3c16] font-bold text-lg border border-[#dec0b7]">M</div>',
        '      <span class="font-serif text-2xl font-bold tracking-tight text-[#211a17] group-hover:text-[#9f3c16] transition-colors">Gốm Mộc</span>',
        '    </a>',
        '',
        '    <!-- 2. Menu Điều Hướng Chính -->',
        '    <nav class="hidden md:flex items-center gap-6" id="main-nav-links">',
        '      <a href="#home" data-route="home" class="nav-item text-sm font-semibold text-[#211a17] hover:text-[#9f3c16] transition-colors py-2">Trang chủ</a>',
        '      <a href="#products" data-route="products" class="nav-item text-sm font-semibold text-[#57423b] hover:text-[#9f3c16] transition-colors py-2">Danh mục tác phẩm</a>',
        '      <a href="#custom-2d" data-route="custom-2d" class="nav-item inline-flex items-center gap-1 text-sm font-semibold text-[#38665f] hover:text-[#9f3c16] transition-colors py-2">',
        '        <span class="material-symbols-outlined text-[18px]">brush</span>Tác chế 2D',
        '      </a>',
        '    </nav>',
        '  </div>',
        '',
        '  <!-- 3. Khu vực Thao tác (Tìm kiếm, Giỏ hàng, Tài khoản) -->',
        '  <div class="flex items-center gap-3 md:gap-4">',
        '    <!-- Tìm kiếm sản phẩm (Slot cho TV2) -->',
        '    <div class="relative hidden sm:block">',
        '      <input type="text" id="global-search-input" placeholder="Tìm dáng gốm, dòng men..." class="w-48 lg:w-60 bg-white text-xs px-3 py-2 pl-8 rounded-full border border-[#dec0b7] focus:outline-none focus:ring-1 focus:ring-[#38665f]">',
        '      <span class="material-symbols-outlined absolute left-2.5 top-2 text-[#5f5b58] text-[16px]">search</span>',
        '    </div>',
        '',
        '    <!-- Giỏ hàng Mini-Cart (Slot cho TV3) -->',
        '    <button id="btn-open-cart" type="button" aria-label="Giỏ hàng" class="relative p-2 text-[#57423b] hover:text-[#9f3c16] rounded-full hover:bg-[#fff1ec] transition-colors cursor-pointer">',
        '      <span class="material-symbols-outlined text-[24px]">shopping_bag</span>',
        '      <span id="cart-badge-count" class="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#9f3c16] text-[10px] text-white font-bold flex items-center justify-center leading-none">0</span>',
        '    </button>',
        '',
        '    <!-- Tài khoản người dùng (Do TV1 phụ trách) -->',
        '    ' + userSectionHtml,
        '  </div>',
        '</div>'
      ].join('\n');

      headerEl.innerHTML = html;
    },

    bindEvents: function() {
      var self = this;
      var headerEl = document.getElementById('site-header');
      if (!headerEl) return;

      // Sự kiện Đăng xuất
      var logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.onclick = function(e) {
          e.preventDefault();
          if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Gốm Mộc?')) {
            window.ApiClient.clearSession();
            self.render();
            if (window.App && window.App.router) {
              window.App.router.navigate('home');
            }
          }
        };
      }

      // Sự kiện Mở Modal Đăng nhập
      var openLoginBtn = document.getElementById('btn-open-login');
      if (openLoginBtn) {
        openLoginBtn.onclick = function() {
          if (window.App && window.App.auth) {
            window.App.auth.openModal('login');
          }
        };
      }

      // Sự kiện Mở Giỏ hàng (chuyển tiếp tới TV3)
      var openCartBtn = document.getElementById('btn-open-cart');
      if (openCartBtn) {
        openCartBtn.onclick = function() {
          if (window.App && window.App.cart && typeof window.App.cart.openDrawer === 'function') {
            window.App.cart.openDrawer();
          } else {
            alert('Giỏ hàng sẽ mở tại đây (Thành viên 3 đang kết nối)');
          }
        };
      }
    }
  };

  window.Navbar = Navbar;
})(window);
