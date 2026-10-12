/**
 * ============================================================================
 * [FILE TRUNG TÂM ĐIỀU HÀNH - THIẾT LẬP BỞI THÀNH VIÊN 1]
 * Core Application & View Router (core/app.js)
 * Nhiệm vụ:
 *   - index.html là file trung tâm, nạp app.js để quản lý toàn bộ vòng đời trang
 *   - Điều hướng (Router) gọi lên giao diện của từng tính năng từ các đoạn code/module con:
 *       + TV1: Trang chủ ('home'), Đăng nhập/Đăng ký ('login'), Hồ sơ ('account')
 *       + TV2: Gian hàng & Chi tiết sản phẩm ('products', 'product-detail')
 *       + TV3: Giỏ hàng & Thanh toán ('checkout', 'orders')
 *       + TV4: Studio Thiết kế 2D ('custom-2d')
 *       + TV5: Đánh giá & Phản hồi ('reviews')
 * ============================================================================
 */

(function(window) {
  'use strict';

  var App = {
    // Đăng ký các module từ các thành viên
    auth: window.Tv1Auth,
    navbar: window.Navbar,
    footer: window.Footer,
    products: null, // TV2 sẽ đăng ký: window.App.products = ...
    cart: null,     // TV3 sẽ đăng ký: window.App.cart = ...
    orders: null,   // TV3 sẽ đăng ký: window.App.orders = ...
    custom2d: null, // TV4 sẽ đăng ký: window.App.custom2d = ...
    reviews: null,  // TV5 sẽ đăng ký: window.App.reviews = ...

    // Hệ thống Router trung tâm
    router: {
      currentRoute: 'home',

      init: function() {
        var self = this;
        // Bắt sự kiện thay đổi Hash URL (#home, #products, #account, #custom-2d...)
        window.addEventListener('hashchange', function() {
          self.handleRoute();
        });

        // Bắt sự kiện click các liên kết có thuộc tính data-route
        document.addEventListener('click', function(e) {
          var target = e.target.closest('[data-route]');
          if (target) {
            var routeName = target.getAttribute('data-route');
            if (routeName) {
              e.preventDefault();
              self.navigate(routeName);
            }
          }
        });

        this.handleRoute();
      },

      navigate: function(routeName) {
        window.location.hash = '#' + routeName;
      },

      refresh: function() {
        this.handleRoute();
      },

      handleRoute: function() {
        var hash = window.location.hash.replace('#', '') || 'home';
        this.currentRoute = hash;

        var contentEl = document.getElementById('app-content');
        if (!contentEl) return;

        // Cuộn mượt lên đầu trang khi chuyển view
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Phân phối nạp giao diện từ các module con
        switch (hash) {
          case 'home':
            App.renderHomeView(contentEl);
            break;

          case 'account':
            if (App.auth) {
              App.auth.renderAccountView(contentEl);
            }
            break;

          case 'products':
            if (App.products && typeof App.products.renderCatalog === 'function') {
              App.products.renderCatalog(contentEl);
            } else {
              App.renderPlaceholderView(contentEl, 'Gian Hàng & Bộ Sưu Tập Gốm', 'Thành viên 2', 'UC-C03: Tìm kiếm, lọc và xem danh mục sản phẩm gốm Bát Tràng');
            }
            break;

          case 'custom-2d':
            if (App.custom2d && typeof App.custom2d.renderStudio === 'function') {
              App.custom2d.renderStudio(contentEl);
            } else {
              App.renderPlaceholderView(contentEl, 'Studio Tác Chế Gốm 2D', 'Thành viên 4', 'UC-C04: Tự thiết kế dáng phôi, chọn màu men ngọc và khắc chữ độc bản');
            }
            break;

          case 'checkout':
            if (App.orders && typeof App.orders.renderCheckout === 'function') {
              App.orders.renderCheckout(contentEl);
            } else {
              App.renderPlaceholderView(contentEl, 'Thanh Toán & Đặt Hàng', 'Thành viên 3', 'UC-C06: Điền thông tin giao hàng và xác nhận đơn hàng');
            }
            break;

          default:
            App.renderHomeView(contentEl);
            break;
        }

        // Cập nhật trạng thái active trên navbar
        this.updateActiveNav(hash);
      },

      updateActiveNav: function(activeRoute) {
        var navLinks = document.querySelectorAll('#main-nav-links a');
        navLinks.forEach(function(link) {
          var r = link.getAttribute('data-route');
          if (r === activeRoute) {
            link.className = 'nav-item text-sm font-bold text-[#9f3c16] border-b-2 border-[#9f3c16] py-2';
          } else {
            link.className = 'nav-item text-sm font-semibold text-[#57423b] hover:text-[#9f3c16] transition-colors py-2';
          }
        });
      }
    },

    /**
     * [THÀNH VIÊN 1] Render Giao Diện Trang Chủ (index.html Home View)
     * Kỹ thuật: Nạp dữ liệu văn hóa & thông điệp nghệ thuật từ tệp XML (storytelling.xml)
     * Phương pháp: Slide 10 (XML, HTML DOM, DOMParser, getElementsByTagName, childNodes)
     */
    renderHomeView: function(containerEl) {
      var self = this;

      // Hiển thị khung chờ nạp
      containerEl.innerHTML = '<div class="text-center py-20 text-xs text-[#57423b]">Đang nạp câu chuyện gốm từ XML data store...</div>';

      // Gọi tệp XML bằng AJAX theo Slide 10
      window.ApiClient.getXml('/content/storytelling.xml')
        .then(function(xmlDoc) {
          self.renderHomeWithXml(containerEl, xmlDoc);
        })
        .catch(function(err) {
          console.warn('Lưu ý nạp XML:', err);
          // Fallback nạp tĩnh nếu backend chưa phản hồi
          self.renderHomeWithXml(containerEl, null);
        });
    },

    renderHomeWithXml: function(containerEl, xmlDoc) {
      // Trích xuất dữ liệu XML theo Slide 10: getElementsByTagName và textContent/childNodes
      var slogan = 'Tĩnh Tại Trong Từng <span class="italic text-[#9f3c16]">Thớ Đất</span> & Ngọn Lửa Nung Củi.';
      var tagline = 'Nghệ thuật gốm nung củi Bát Tràng';
      var desc = 'Mỗi dáng hình là sự hòa quyện nhịp nhàng giữa cốt đất sét phù sa sông Hồng, ngọn lửa lò củi 1.300°C và tâm huyết trầm tích của người thợ gốm.';
      var heroImg = 'https://lh3.googleusercontent.com/aida/AEtjO1Whp2dQjvCO5gOchX8Wd8u4VpPTWdFWckJ7ocTPRAUgRYp14ndLwL5XwG1xJqAyhpt3s2L3AN_rdAF42zfrRalEjC8VCiAhG8V68Dhly8gR104KEFTKi_9fIN5v8YdlT6Z7rEFn9dZlXAdmblX10fN01Ev4Ibcvxo46hXNkLWnhBbCc0se_f1Bd6Sgb65VWjByPQjaYYaA0sY_yx48RJxrkRF1EAQDc-rKjM9eVMKO84yFJrlY0FOKozA';

      var touchpointsHtml = '';
      var pillarsHtml = '';

      if (xmlDoc) {
        var brandNode = xmlDoc.getElementsByTagName('brand')[0];
        if (brandNode) {
          var tagEl = brandNode.getElementsByTagName('tagline')[0];
          var descEl = brandNode.getElementsByTagName('description')[0];
          if (tagEl) tagline = tagEl.textContent;
          if (descEl) desc = descEl.textContent;
        }

        // Đọc danh sách điểm chạm nghệ thuật (touchpoints)
        var tpNodes = xmlDoc.getElementsByTagName('item');
        for (var i = 0; i < tpNodes.length; i++) {
          var item = tpNodes[i];
          var icon = item.getElementsByTagName('icon')[0] ? item.getElementsByTagName('icon')[0].textContent : 'landscape';
          var title = item.getElementsByTagName('title')[0] ? item.getElementsByTagName('title')[0].textContent : '';
          var sub = item.getElementsByTagName('subtitle')[0] ? item.getElementsByTagName('subtitle')[0].textContent : '';
          touchpointsHtml += [
            '<div class="flex items-start gap-2 p-3 rounded-lg bg-white shadow-sm border border-[#faebe6]">',
            '  <span class="material-symbols-outlined text-[#9f3c16] text-[20px]">' + icon + '</span>',
            '  <div><span class="text-xs font-bold block text-[#211a17]">' + title + '</span><span class="text-[11px] text-[#57423b]">' + sub + '</span></div>',
            '</div>'
          ].join('\n');
        }

        // Đọc các trụ cột triết lý làm gốm (pillars)
        var pilNodes = xmlDoc.getElementsByTagName('pillar');
        for (var j = 0; j < pilNodes.length; j++) {
          var pil = pilNodes[j];
          var pIcon = pil.getElementsByTagName('icon')[0] ? pil.getElementsByTagName('icon')[0].textContent : 'verified';
          var pTitle = pil.getElementsByTagName('title')[0] ? pil.getElementsByTagName('title')[0].textContent : '';
          var pContent = pil.getElementsByTagName('content')[0] ? pil.getElementsByTagName('content')[0].textContent : '';
          var pBadge = pil.getElementsByTagName('badge')[0] ? pil.getElementsByTagName('badge')[0].textContent : '';
          pillarsHtml += [
            '<div class="p-6 bg-white rounded-xl border border-[#dec0b7] shadow-sm flex flex-col justify-between">',
            '  <div>',
            '    <div class="w-10 h-10 rounded-full bg-[#faebe6] flex items-center justify-center text-[#9f3c16] mb-3">',
            '      <span class="material-symbols-outlined text-[20px]">' + pIcon + '</span>',
            '    </div>',
            '    <h3 class="font-serif text-lg font-bold text-[#211a17]">' + pTitle + '</h3>',
            '    <p class="text-xs text-[#57423b] mt-2 leading-relaxed">' + pContent + '</p>',
            '  </div>',
            '  <span class="text-[11px] font-bold text-[#38665f] uppercase tracking-wider mt-4 block">' + pBadge + '</span>',
            '</div>'
          ].join('\n');
        }
      }

      containerEl.innerHTML = [
        '<div class="flex flex-col w-full fade-in">',
        '  <!-- 1. Hero Section (Trích xuất từ XML) -->',
        '  <section class="relative w-full overflow-hidden">',
        '    <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[840px] h-[480px] bg-gradient-to-b from-[#9f3c16]/10 via-[#bbece2]/20 to-transparent blur-3xl pointer-events-none -z-10"></div>',
        '    <div class="max-w-[1440px] mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-16 lg:pb-24">',
        '      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">',
        '        <div class="lg:col-span-6 flex flex-col justify-center space-y-4">',
        '          <div class="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-[#f4e5e0] text-[#9f3c16]">',
        '            <span class="w-2 h-2 rounded-full bg-[#9f3c16] animate-pulse"></span>',
        '            <span class="text-xs font-bold uppercase tracking-widest">' + tagline + '</span>',
        '          </div>',
        '          <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#211a17] tracking-tight leading-tight">',
        '            ' + slogan,
        '          </h1>',
        '          <p class="text-base sm:text-lg text-[#57423b] max-w-xl">',
        '            ' + desc,
        '          </p>',
        '          <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">',
        '            <a href="#products" data-route="products" class="inline-flex items-center justify-center px-7 py-3.5 rounded-lg bg-[#9f3c16] hover:bg-[#bf542c] text-white font-bold text-sm transition-all shadow-md text-center">',
        '              Khám phá tác phẩm <span class="material-symbols-outlined ml-2 text-[20px]">arrow_forward</span>',
        '            </a>',
        '            <a href="#custom-2d" data-route="custom-2d" class="inline-flex items-center justify-center px-7 py-3.5 rounded-lg bg-[#fff1ec] hover:bg-[#faebe6] text-[#38665f] font-bold text-sm transition-all text-center">',
        '              <span class="material-symbols-outlined mr-2 text-[20px]">brush</span>Trải nghiệm Studio Tác Chế 2D',
        '            </a>',
        '          </div>',
        '          <!-- 3 Cam kết thương hiệu từ XML -->',
        '          <div class="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">',
        '            ' + (touchpointsHtml || '<div class="text-xs text-neutral-400">100% Đất thô nung củi</div>'),
        '          </div>',
        '        </div>',
        '',
        '        <div class="lg:col-span-6 relative">',
        '          <div class="relative w-full h-[380px] sm:h-[480px] rounded-2xl overflow-hidden shadow-xl bg-[#faebe6] border border-[#dec0b7]">',
        '            <img src="' + heroImg + '" alt="Gốm Mộc Bát Tràng" class="w-full h-full object-cover">',
        '            <div class="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-between">',
        '              <div>',
        '                <span class="text-[11px] font-bold uppercase tracking-wider text-[#9f3c16]">Tác phẩm tiêu biểu</span>',
        '                <h4 class="font-serif text-lg font-bold text-[#211a17]">Bộ Thưởng Trà Men Ngọc & Sa Mộc</h4>',
        '              </div>',
        '              <a href="#products" data-route="products" class="p-2 rounded-full bg-[#fff8f6] hover:bg-[#faebe6] text-[#211a17] transition-colors"><span class="material-symbols-outlined text-[20px]">east</span></a>',
        '            </div>',
        '          </div>',
        '        </div>',
        '      </div>',
        '    </div>',
        '  </section>',
        '',
        '  <!-- 2. Triết lý làm gốm từ XML (Slide 10) -->',
        '  <section class="w-full bg-[#fdf9f1] py-16 border-t border-[#faebe6]">',
        '    <div class="max-w-[1440px] mx-auto px-4 md:px-8">',
        '      <div class="text-center max-w-2xl mx-auto mb-12">',
        '        <span class="text-xs font-bold uppercase tracking-widest text-[#9f3c16] block mb-1">Triết Lý Cốt Gốm Mộc (XML Source)</span>',
        '        <h2 class="font-serif text-3xl font-bold text-[#211a17]">Đất Lành Nung Lửa Thật</h2>',
        '        <p class="text-xs text-[#57423b] mt-2">Dữ liệu được nạp động từ tệp storytelling.xml qua cơ chế AJAX XMLHttpRequest.</p>',
        '      </div>',
        '      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">',
        '        ' + pillarsHtml,
        '      </div>',
        '    </div>',
        '  </section>',
        '</div>'
      ].join('\n');
    },

    /**
     * Khung hiển thị Placeholder cho các module của các thành viên khác
     */
    renderPlaceholderView: function(containerEl, title, owner, description) {
      containerEl.innerHTML = [
        '<div class="max-w-2xl mx-auto py-20 px-4 text-center fade-in">',
        '  <div class="w-16 h-16 rounded-full bg-[#faebe6] text-[#9f3c16] flex items-center justify-center mx-auto mb-4 border border-[#dec0b7]">',
        '    <span class="material-symbols-outlined text-[32px]">architecture</span>',
        '  </div>',
        '  <span class="px-3 py-1 rounded-full text-xs font-bold bg-[#fff1ec] text-[#9f3c16] uppercase tracking-wider">' + owner + ' Phụ trách</span>',
        '  <h2 class="font-serif text-3xl font-bold text-[#211a17] mt-3">' + title + '</h2>',
        '  <p class="text-sm text-[#57423b] mt-2 max-w-lg mx-auto">' + description + '</p>',
        '  <div class="mt-8 p-4 bg-white rounded-xl border border-[#dec0b7] text-left text-xs space-y-2">',
        '    <p class="font-bold text-[#211a17]">📌 Hướng dẫn cho thành viên phụ trách:</p>',
        '    <p class="text-[#57423b]">Thành viên chỉ cần viết module trong <code>customer-web/modules/</code> và đăng ký hàm render vào đối tượng toàn cục <code>window.App</code>. File trung tâm <code>index.html</code> sẽ tự động gọi nạp giao diện lên container này!</p>',
        '  </div>',
        '  <div class="mt-6">',
        '    <a href="#home" data-route="home" class="inline-flex items-center gap-1 text-sm font-bold text-[#9f3c16] hover:underline">',
        '      <span class="material-symbols-outlined text-[18px]">arrow_back</span>Quay lại Trang Chủ',
        '    </a>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // Khởi động toàn bộ ứng dụng
    init: function() {
      if (this.navbar) this.navbar.init();
      if (this.footer) this.footer.render();
      this.router.init();
      console.log('🚀 [Gốm Mộc Shell] Customer Web Portal đã khởi động thành công!');
    }
  };

  window.App = App;

  // Tự động khởi động khi tải xong DOM
  document.addEventListener('DOMContentLoaded', function() {
    window.App.init();
  });
})(window);
