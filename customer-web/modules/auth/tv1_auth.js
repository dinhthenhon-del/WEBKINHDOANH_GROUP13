/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Module Xác thực, Phân quyền & Quản lý Tài khoản (tv1_auth.js)
 * Phục vụ:
 *   - UC-C01: Đăng ký tài khoản (Validate regex E1, bắt trùng lặp E2)
 *   - UC-C02: Đăng nhập khách hàng (JWT token, lưu phiên, cập nhật Navbar)
 *   - UC-C07: Trang Hồ sơ cá nhân (Account profile & Sổ địa chỉ)
 *   - Cung cấp Modal xác thực có thể gọi từ bất kỳ module nào (Wishlist của TV2, Checkout của TV3)
 * ============================================================================
 */

(function(window) {
  'use strict';

  var Tv1Auth = {
    // 1. Mở Modal Đăng nhập / Đăng ký
    openModal: function(initialTab) {
      initialTab = initialTab || 'login';
      var container = document.getElementById('auth-modal-container');
      if (!container) return;

      container.innerHTML = this.getModalHtml(initialTab);
      container.classList.remove('hidden');
      this.bindModalEvents();
    },

    closeModal: function() {
      var container = document.getElementById('auth-modal-container');
      if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
      }
    },

    getModalHtml: function(activeTab) {
      var isLogin = activeTab === 'login';

      return [
        '<div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay fade-in">',
        '  <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#dec0b7]" onclick="event.stopPropagation()">',
        '    <!-- Nút Đóng -->',
        '    <button id="btn-close-auth-modal" type="button" class="absolute top-4 right-4 text-[#5f5b58] hover:text-[#9f3c16] rounded-full p-1 transition-colors cursor-pointer">',
        '      <span class="material-symbols-outlined text-[24px]">close</span>',
        '    </button>',
        '',
        '    <!-- Header Modal -->',
        '    <div class="bg-[#fff8f6] p-6 text-center border-b border-[#faebe6]">',
        '      <div class="inline-flex w-10 h-10 rounded-full bg-[#faebe6] text-[#9f3c16] items-center justify-center font-serif font-bold text-xl mb-2">M</div>',
        '      <h3 class="font-serif text-2xl font-bold text-[#211a17]">Không Gian Gốm Mộc</h3>',
        '      <p class="text-xs text-[#57423b] mt-1">Lưu giữ nét đẹp tinh hoa và tự tay tác chế tác phẩm riêng biệt</p>',
        '',
        '      <!-- Switch Tabs (Slide 07: Form & Tabs) -->',
        '      <div class="grid grid-cols-2 gap-2 mt-4 bg-[#faebe6] p-1 rounded-xl">',
        '        <button id="tab-switch-login" type="button" class="py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ' + (isLogin ? 'bg-white text-[#9f3c16] shadow-sm' : 'text-[#57423b] hover:text-[#211a17]') + '">Đăng Nhập</button>',
        '        <button id="tab-switch-register" type="button" class="py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ' + (!isLogin ? 'bg-white text-[#9f3c16] shadow-sm' : 'text-[#57423b] hover:text-[#211a17]') + '">Tạo Tài Khoản Mới</button>',
        '      </div>',
        '    </div>',
        '',
        '    <!-- Body: Form Đăng nhập hoặc Đăng ký -->',
        '    <div class="p-6">',
        '      <!-- Thông báo lỗi hoặc thành công (Slide 10 DOM innerHTML) -->',
        '      <div id="auth-alert-box" class="hidden mb-4 p-3 rounded-lg text-xs font-medium"></div>',
        '',
        '      <!-- FORM ĐĂNG NHẬP (UC-C02) -->',
        '      <form id="form-login" class="' + (isLogin ? 'block' : 'hidden') + ' space-y-4">',
        '        <div>',
        '          <label for="login-identifier" class="block text-xs font-bold text-[#57423b] uppercase tracking-wider mb-1">Email hoặc Số điện thoại <span class="text-[#ba1a1a]">*</span></label>',
        '          <div class="relative">',
        '            <input type="text" id="login-identifier" required placeholder="nguoidung@gommoc.vn hoặc 0912 345 678" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#dec0b7] focus:outline-none focus:ring-1 focus:ring-[#38665f]">',
        '            <span class="material-symbols-outlined absolute right-3 top-2.5 text-[#5f5b58] text-[20px]">mail</span>',
        '          </div>',
        '        </div>',
        '',
        '        <div>',
        '          <div class="flex items-center justify-between mb-1">',
        '            <label for="login-password" class="block text-xs font-bold text-[#57423b] uppercase tracking-wider">Mật khẩu <span class="text-[#ba1a1a]">*</span></label>',
        '            <a href="javascript:void(0)" id="link-forgot-password" class="text-xs text-[#9f3c16] hover:underline">Quên mật khẩu?</a>',
        '          </div>',
        '          <div class="relative">',
        '            <input type="password" id="login-password" required placeholder="Nhập mật khẩu của bạn" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#dec0b7] focus:outline-none focus:ring-1 focus:ring-[#38665f]">',
        '            <span id="btn-toggle-pwd" class="material-symbols-outlined absolute right-3 top-2.5 text-[#5f5b58] text-[20px] cursor-pointer">visibility</span>',
        '          </div>',
        '        </div>',
        '',
        '        <div class="flex items-center justify-between text-xs">',
        '          <label class="flex items-center gap-2 cursor-pointer text-[#57423b]">',
        '            <input type="checkbox" id="login-remember" checked class="rounded text-[#9f3c16] focus:ring-[#9f3c16]">',
        '            <span>Ghi nhớ đăng nhập</span>',
        '          </label>',
        '        </div>',
        '',
        '        <button type="submit" id="btn-submit-login" class="w-full py-3 bg-[#9f3c16] hover:bg-[#bf542c] text-white font-bold text-sm rounded-lg transition-colors shadow-md cursor-pointer flex items-center justify-center gap-1.5">',
        '          <span>Đăng Nhập Vào Gốm Mộc</span>',
        '          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>',
        '        </button>',
        '      </form>',
        '',
        '      <!-- FORM ĐĂNG KÝ (UC-C01) -->',
        '      <form id="form-register" class="' + (!isLogin ? 'block' : 'hidden') + ' space-y-3.5">',
        '        <div>',
        '          <label for="reg-fullname" class="block text-xs font-bold text-[#57423b] uppercase tracking-wider mb-1">Họ và tên quý khách <span class="text-[#ba1a1a]">*</span></label>',
        '          <input type="text" id="reg-fullname" required placeholder="Ví dụ: Nguyễn An Nhiên" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#dec0b7] focus:outline-none focus:ring-1 focus:ring-[#38665f]">',
        '        </div>',
        '',
        '        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">',
        '          <div>',
        '            <label for="reg-phone" class="block text-xs font-bold text-[#57423b] uppercase tracking-wider mb-1">Số điện thoại</label>',
        '            <input type="tel" id="reg-phone" placeholder="0912 345 678" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#dec0b7] focus:outline-none focus:ring-1 focus:ring-[#38665f]">',
        '          </div>',
        '          <div>',
        '            <label for="reg-email" class="block text-xs font-bold text-[#57423b] uppercase tracking-wider mb-1">Địa chỉ Email <span class="text-[#ba1a1a]">*</span></label>',
        '            <input type="email" id="reg-email" required placeholder="annhien@email.com" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#dec0b7] focus:outline-none focus:ring-1 focus:ring-[#38665f]">',
        '          </div>',
        '        </div>',
        '',
        '        <div>',
        '          <label for="reg-password" class="block text-xs font-bold text-[#57423b] uppercase tracking-wider mb-1">Mật khẩu truy cập (Tối thiểu 6 ký tự) <span class="text-[#ba1a1a]">*</span></label>',
        '          <input type="password" id="reg-password" required minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#dec0b7] focus:outline-none focus:ring-1 focus:ring-[#38665f]">',
        '        </div>',
        '',
        '        <div>',
        '          <label for="reg-confirm-password" class="block text-xs font-bold text-[#57423b] uppercase tracking-wider mb-1">Xác nhận lại mật khẩu <span class="text-[#ba1a1a]">*</span></label>',
        '          <input type="password" id="reg-confirm-password" required minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#dec0b7] focus:outline-none focus:ring-1 focus:ring-[#38665f]">',
        '        </div>',
        '',
        '        <div class="text-xs text-[#57423b]">',
        '          <label class="flex items-start gap-2 cursor-pointer">',
        '            <input type="checkbox" required checked class="mt-0.5 rounded text-[#9f3c16] focus:ring-[#9f3c16]">',
        '            <span>Tôi đồng ý với <a href="javascript:void(0)" class="underline text-[#9f3c16]">Điều khoản sử dụng</a> và quy chuẩn làng nghề Bát Tràng</span>',
        '          </label>',
        '        </div>',
        '',
        '        <button type="submit" id="btn-submit-register" class="w-full py-3 bg-[#9f3c16] hover:bg-[#bf542c] text-white font-bold text-sm rounded-lg transition-colors shadow-md cursor-pointer flex items-center justify-center gap-1.5">',
        '          <span>Đăng Ký Tài Khoản Gốm Mộc</span>',
        '          <span class="material-symbols-outlined text-[18px]">verified</span>',
        '        </button>',
        '      </form>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    bindModalEvents: function() {
      var self = this;

      // Nút đóng
      var closeBtn = document.getElementById('btn-close-auth-modal');
      if (closeBtn) closeBtn.onclick = function() { self.closeModal(); };

      // Chuyển tab Đăng nhập <-> Đăng ký
      var tabLogin = document.getElementById('tab-switch-login');
      var tabReg = document.getElementById('tab-switch-register');
      var formLogin = document.getElementById('form-login');
      var formReg = document.getElementById('form-register');
      var alertBox = document.getElementById('auth-alert-box');

      if (tabLogin && tabReg) {
        tabLogin.onclick = function() {
          tabLogin.className = 'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer bg-white text-[#9f3c16] shadow-sm';
          tabReg.className = 'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-[#57423b] hover:text-[#211a17]';
          formLogin.classList.remove('hidden');
          formReg.classList.add('hidden');
          if (alertBox) alertBox.classList.add('hidden');
        };

        tabReg.onclick = function() {
          tabReg.className = 'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer bg-white text-[#9f3c16] shadow-sm';
          tabLogin.className = 'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-[#57423b] hover:text-[#211a17]';
          formReg.classList.remove('hidden');
          formLogin.classList.add('hidden');
          if (alertBox) alertBox.classList.add('hidden');
        };
      }

      // Ẩn hiện mật khẩu
      var togglePwd = document.getElementById('btn-toggle-pwd');
      if (togglePwd) {
        togglePwd.onclick = function() {
          var pwdInput = document.getElementById('login-password');
          if (pwdInput.type === 'password') {
            pwdInput.type = 'text';
            togglePwd.textContent = 'visibility_off';
          } else {
            pwdInput.type = 'password';
            togglePwd.textContent = 'visibility';
          }
        };
      }

      // Xử lý SUBMIT ĐĂNG NHẬP (UC-C02)
      if (formLogin) {
        formLogin.onsubmit = function(e) {
          e.preventDefault();
          var identifier = document.getElementById('login-identifier').value.trim();
          var password = document.getElementById('login-password').value;
          var remember = document.getElementById('login-remember').checked;

          self.showAlert('Đang kiểm tra thông tin...', 'info');

          window.ApiClient.post('/auth/login', { identifier: identifier, password: password })
            .then(function(res) {
              if (res.success) {
                self.showAlert(res.message, 'success');
                window.ApiClient.setSession(res.token, res.data, remember);

                setTimeout(function() {
                  self.closeModal();
                  if (window.Navbar) window.Navbar.render();
                  // Tải lại view hiện tại
                  if (window.App && window.App.router) {
                    window.App.router.refresh();
                  }
                }, 600);
              } else {
                self.showAlert(res.message, 'error');
              }
            })
            .catch(function(err) {
              self.showAlert(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!', 'error');
            });
        };
      }

      // Xử lý SUBMIT ĐĂNG KÝ (UC-C01)
      if (formReg) {
        formReg.onsubmit = function(e) {
          e.preventDefault();
          var fullName = document.getElementById('reg-fullname').value.trim();
          var email = document.getElementById('reg-email').value.trim();
          var phone = document.getElementById('reg-phone').value.trim();
          var password = document.getElementById('reg-password').value;
          var confirmPassword = document.getElementById('reg-confirm-password').value;

          // Kiểm tra khớp mật khẩu
          if (password !== confirmPassword) {
            self.showAlert('Mật khẩu xác nhận không khớp. Vui lòng nhập lại!', 'error');
            return;
          }

          self.showAlert('Đang khởi tạo tài khoản...', 'info');

          window.ApiClient.post('/auth/register', {
            fullName: fullName,
            email: email,
            phone: phone,
            password: password
          })
            .then(function(res) {
              if (res.success) {
                self.showAlert('Đăng ký thành công! Đang chuyển hướng...', 'success');
                window.ApiClient.setSession(res.token, res.data, true);
                setTimeout(function() {
                  self.closeModal();
                  if (window.Navbar) window.Navbar.render();
                  if (window.App && window.App.router) {
                    window.App.router.navigate('home');
                  }
                }, 800);
              } else {
                self.showAlert(res.message, 'error');
              }
            })
            .catch(function(err) {
              var msg = (err && err.message) ? err.message : 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!';
              self.showAlert(msg, 'error');
            });
        };
      }

      // Quên mật khẩu
      var forgotLink = document.getElementById('link-forgot-password');
      if (forgotLink) {
        forgotLink.onclick = function() {
          var email = prompt('Vui lòng nhập địa chỉ email để nhận mã OTP đặt lại mật khẩu:');
          if (email && email.trim()) {
            window.ApiClient.post('/auth/forgot-password', { email: email.trim() })
              .then(function(res) {
                alert(res.message + (res.devOtp ? '\n[MÃ OTP TEST]: ' + res.devOtp : ''));
                var otp = prompt('Nhập mã OTP 6 số bạn vừa nhận được:');
                if (otp) {
                  var newPwd = prompt('Nhập mật khẩu mới (tối thiểu 6 ký tự):');
                  if (newPwd) {
                    window.ApiClient.post('/auth/reset-password', { email: email.trim(), otp: otp.trim(), newPassword: newPwd })
                      .then(function(resetRes) {
                        alert(resetRes.message);
                      })
                      .catch(function(e) { alert(e.message || 'Lỗi đặt lại mật khẩu'); });
                  }
                }
              })
              .catch(function(err) {
                alert(err.message || 'Không thể gửi mã OTP');
              });
          }
        };
      }
    },

    showAlert: function(message, type) {
      var alertBox = document.getElementById('auth-alert-box');
      if (!alertBox) return;

      alertBox.classList.remove('hidden', 'bg-blue-50', 'text-blue-800', 'bg-red-50', 'text-red-800', 'bg-green-50', 'text-green-800');

      if (type === 'error') {
        alertBox.className = 'mb-4 p-3 rounded-lg text-xs font-semibold bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]';
      } else if (type === 'success') {
        alertBox.className = 'mb-4 p-3 rounded-lg text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#b7e1cd]';
      } else {
        alertBox.className = 'mb-4 p-3 rounded-lg text-xs font-semibold bg-[#fff1ec] text-[#9f3c16] border border-[#dec0b7]';
      }

      alertBox.textContent = message;
    },

    /**
     * [UC-C07] Render View Hồ Sơ Cá Nhân & Quản Lý Sổ Địa Chỉ
     */
    renderAccountView: function(containerEl) {
      var user = window.ApiClient.getCurrentUser();
      if (!user) {
        containerEl.innerHTML = [
          '<div class="max-w-md mx-auto text-center py-20 px-4">',
          '  <span class="material-symbols-outlined text-[64px] text-[#9f3c16]">lock</span>',
          '  <h2 class="font-serif text-2xl font-bold mt-3 text-[#211a17]">Yêu Cầu Đăng Nhập</h2>',
          '  <p class="text-sm text-[#57423b] mt-2">Vui lòng đăng nhập để xem thông tin hồ sơ và quản lý sổ địa chỉ giao hàng.</p>',
          '  <button onclick="App.auth.openModal(\'login\')" class="mt-6 px-6 py-2.5 bg-[#9f3c16] hover:bg-[#bf542c] text-white rounded-lg text-sm font-bold shadow-md cursor-pointer">Đăng Nhập Ngay</button>',
          '</div>'
        ].join('\n');
        return;
      }

      var self = this;
      var addresses = user.addresses || [];

      var addressesHtml = addresses.length === 0
        ? '<p class="text-xs text-[#5f5b58] italic py-2">Chưa lưu địa chỉ nhận hàng nào. Hãy thêm địa chỉ để thuận tiện đặt hàng.</p>'
        : addresses.map(function(addr) {
            return [
              '<div class="p-3.5 bg-white rounded-xl border border-[#faebe6] flex items-start justify-between">',
              '  <div>',
              '    <div class="flex items-center gap-2">',
              '      <span class="text-sm font-bold text-[#211a17]">' + addr.recipientName + '</span>',
              '      <span class="text-xs text-[#57423b]">(' + addr.phone + ')</span>',
              addr.isDefault ? '      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e6f4ea] text-[#137333]">Mặc định</span>' : '',
              '    </div>',
              '    <p class="text-xs text-[#57423b] mt-1">' + addr.addressDetail + ', ' + (addr.ward ? addr.ward + ', ' : '') + addr.province + '</p>',
              '  </div>',
              '  <button onclick="App.auth.deleteAddress(\'' + addr._id + '\')" class="text-xs text-[#ba1a1a] hover:underline cursor-pointer">Xóa</button>',
              '</div>'
            ].join('\n');
          }).join('\n');

      containerEl.innerHTML = [
        '<div class="max-w-[1200px] mx-auto px-4 md:px-8 py-10">',
        '  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">',
        '    <!-- Cột trái: Thông tin thẻ thành viên -->',
        '    <div class="lg:col-span-4 space-y-6">',
        '      <div class="bg-white rounded-2xl p-6 border border-[#dec0b7] shadow-sm text-center">',
        '        <div class="relative w-20 h-20 mx-auto rounded-full overflow-hidden ring-4 ring-[#faebe6] mb-3">',
        '          <img src="' + (user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOcs5LcnujnUJQh8uk1tcbCEb8hHUsgJQu5MdSKJRejGOXfE-X7AidhlMhEg_6DWeLPxr8sXo9wvqW4z-U-w6vNsFwyV8Hl5ECIyx5MnDvxHw7yT3ICN-CaREbRTi_PukRQcPrLk3s3sk-uaUjbPkRviW2OVpfUlkTTSvLvK-SPogJrSZD1Xyq4FWNnEpIyb02n9V574ZwGz77BNZ4128a1lSAxsDpfCwgoYPrQn0NXchu9FhpXWuJ') + '" class="w-full h-full object-cover">',
        '        </div>',
        '        <h3 class="font-serif text-xl font-bold text-[#211a17]">' + user.fullName + '</h3>',
        '        <p class="text-xs text-[#5f5b58]">' + user.email + '</p>',
        '        <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fff1ec] text-[#9f3c16]">',
        '          <span class="material-symbols-outlined text-[16px]">verified</span>Hội Viên Thưởng Lãm',
        '        </div>',
        '',
        '        <!-- Menu chuyển Tab cá nhân -->',
        '        <div class="mt-6 pt-6 border-t border-[#faebe6] text-left space-y-1">',
        '          <button id="tab-profile-link" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#faebe6] text-[#9f3c16] cursor-pointer">',
        '            <span class="material-symbols-outlined text-[18px]">person</span>Hồ sơ & Sổ địa chỉ',
        '          </button>',
        '          <button id="tab-orders-link" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[#57423b] hover:bg-[#fff1ec] cursor-pointer">',
        '            <span class="material-symbols-outlined text-[18px]">receipt_long</span>Đơn hàng của tôi (TV3)',
        '          </button>',
        '        </div>',
        '      </div>',
        '    </div>',
        '',
        '    <!-- Cột phải: Chi tiết hồ sơ & Sổ địa chỉ (UC-C07) -->',
        '    <div class="lg:col-span-8 space-y-6">',
        '      <!-- Khối Hồ sơ cá nhân -->',
        '      <div class="bg-white rounded-2xl p-6 border border-[#dec0b7] shadow-sm">',
        '        <h4 class="font-serif text-lg font-bold text-[#211a17] mb-4">Thông Tin Cá Nhân</h4>',
        '        <form id="form-update-profile" class="space-y-4">',
        '          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">',
        '            <div>',
        '              <label class="block text-xs font-bold text-[#57423b] mb-1">Họ và tên</label>',
        '              <input type="text" id="prof-fullname" value="' + user.fullName + '" class="w-full px-3 py-2 text-sm border rounded-lg border-[#dec0b7]">',
        '            </div>',
        '            <div>',
        '              <label class="block text-xs font-bold text-[#57423b] mb-1">Số điện thoại</label>',
        '              <input type="tel" id="prof-phone" value="' + (user.phone || '') + '" class="w-full px-3 py-2 text-sm border rounded-lg border-[#dec0b7]">',
        '            </div>',
        '          </div>',
        '          <div>',
        '            <label class="block text-xs font-bold text-[#57423b] mb-1">Địa chỉ Email (Cố định)</label>',
        '            <input type="email" disabled value="' + user.email + '" class="w-full px-3 py-2 text-sm border rounded-lg border-[#dec0b7] bg-gray-100 cursor-not-allowed">',
        '          </div>',
        '          <div class="pt-2">',
        '            <button type="submit" class="px-5 py-2 bg-[#9f3c16] hover:bg-[#bf542c] text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer">Lưu Thay Đổi</button>',
        '          </div>',
        '        </form>',
        '      </div>',
        '',
        '      <!-- Khối Sổ địa chỉ giao hàng (Cung cấp cho TV3 Checkout) -->',
        '      <div class="bg-white rounded-2xl p-6 border border-[#dec0b7] shadow-sm">',
        '        <div class="flex items-center justify-between mb-4">',
        '          <h4 class="font-serif text-lg font-bold text-[#211a17]">Sổ Địa Chỉ Giao Hàng</h4>',
        '          <button id="btn-toggle-add-addr" type="button" class="text-xs font-bold text-[#9f3c16] hover:underline cursor-pointer">+ Thêm địa chỉ mới</button>',
        '        </div>',
        '',
        '        <!-- Form thêm địa chỉ ẩn/hiện -->',
        '        <form id="form-add-address" class="hidden mb-6 p-4 bg-[#fff8f6] rounded-xl border border-[#faebe6] space-y-3">',
        '          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">',
        '            <input type="text" id="addr-name" placeholder="Tên người nhận *" required class="px-3 py-2 text-xs border rounded-lg bg-white border-[#dec0b7]">',
        '            <input type="tel" id="addr-phone" placeholder="Số điện thoại nhận *" required class="px-3 py-2 text-xs border rounded-lg bg-white border-[#dec0b7]">',
        '          </div>',
        '          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">',
        '            <input type="text" id="addr-province" placeholder="Tỉnh / Thành phố" class="px-3 py-2 text-xs border rounded-lg bg-white border-[#dec0b7]">',
        '            <input type="text" id="addr-ward" placeholder="Phường / Xã / Huyện" class="px-3 py-2 text-xs border rounded-lg bg-white border-[#dec0b7]">',
        '          </div>',
        '          <input type="text" id="addr-detail" placeholder="Địa chỉ chi tiết (Số nhà, tên đường...) *" required class="w-full px-3 py-2 text-xs border rounded-lg bg-white border-[#dec0b7]">',
        '          <div class="flex items-center justify-between pt-1">',
        '            <label class="text-xs text-[#57423b] flex items-center gap-1.5"><input type="checkbox" id="addr-default" checked> Đặt làm mặc định</label>',
        '            <button type="submit" class="px-4 py-1.5 bg-[#38665f] text-white rounded-lg text-xs font-bold cursor-pointer">Lưu Địa Chỉ</button>',
        '          </div>',
        '        </form>',
        '',
        '        <div class="space-y-2.5" id="address-list-container">',
        '          ' + addressesHtml,
        '        </div>',
        '      </div>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n');

      // Gắn sự kiện cập nhật profile
      var formProf = document.getElementById('form-update-profile');
      if (formProf) {
        formProf.onsubmit = function(e) {
          e.preventDefault();
          var fullName = document.getElementById('prof-fullname').value.trim();
          var phone = document.getElementById('prof-phone').value.trim();
          window.ApiClient.put('/users/profile', { fullName: fullName, phone: phone })
            .then(function(res) {
              alert('Cập nhật thông tin thành công!');
              var current = window.ApiClient.getCurrentUser();
              current.fullName = fullName;
              current.phone = phone;
              window.ApiClient.setSession(window.ApiClient.getToken(), current, true);
              if (window.Navbar) window.Navbar.render();
            })
            .catch(function(err) { alert(err.message || 'Lỗi cập nhật'); });
        };
      }

      // Ẩn hiện form thêm địa chỉ
      var btnToggleAddr = document.getElementById('btn-toggle-add-addr');
      var formAddAddr = document.getElementById('form-add-address');
      if (btnToggleAddr && formAddAddr) {
        btnToggleAddr.onclick = function() {
          formAddAddr.classList.toggle('hidden');
        };
      }

      // Submit thêm địa chỉ
      if (formAddAddr) {
        formAddAddr.onsubmit = function(e) {
          e.preventDefault();
          var payload = {
            recipientName: document.getElementById('addr-name').value.trim(),
            phone: document.getElementById('addr-phone').value.trim(),
            province: document.getElementById('addr-province').value.trim(),
            ward: document.getElementById('addr-ward').value.trim(),
            addressDetail: document.getElementById('addr-detail').value.trim(),
            isDefault: document.getElementById('addr-default').checked
          };
          window.ApiClient.post('/users/addresses', payload)
            .then(function(res) {
              alert('Đã thêm địa chỉ thành công!');
              var current = window.ApiClient.getCurrentUser();
              current.addresses = res.data;
              window.ApiClient.setSession(window.ApiClient.getToken(), current, true);
              self.renderAccountView(containerEl);
            })
            .catch(function(err) { alert(err.message || 'Lỗi thêm địa chỉ'); });
        };
      }

      // Slot Tab Đơn hàng của tôi (dành cho TV3)
      var tabOrdersLink = document.getElementById('tab-orders-link');
      if (tabOrdersLink) {
        tabOrdersLink.onclick = function() {
          if (window.App && window.App.orders && typeof window.App.orders.renderOrderHistory === 'function') {
            window.App.orders.renderOrderHistory(containerEl);
          } else {
            alert('Tính năng Lịch sử đơn hàng do Thành viên 3 phụ trách (Đang đấu nối)');
          }
        };
      }
    },

    deleteAddress: function(addressId) {
      if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
      var self = this;
      window.ApiClient.delete('/users/addresses/' + addressId)
        .then(function(res) {
          var current = window.ApiClient.getCurrentUser();
          current.addresses = res.data;
          window.ApiClient.setSession(window.ApiClient.getToken(), current, true);
          var container = document.getElementById('app-content');
          if (container) self.renderAccountView(container);
        })
        .catch(function(err) { alert(err.message || 'Lỗi khi xóa địa chỉ'); });
    }
  };

  window.Tv1Auth = Tv1Auth;
})(window);
