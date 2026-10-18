/**
 * customer-web/core/api.js
 * Giao tiếp API bất đồng bộ theo chuẩn Slide 10 (AJAX - XMLHttpRequest)
 * Tuân thủ 100% tài liệu đặc tả Data Dictionary và Phase 4
 */

const API_BASE = 'http://localhost:5000/api';

const ApiService = {
  // 1. Đăng ký khách hàng (UC-C01)
  register: function (data, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/auth/register`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 201 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi kết nối máy chủ', null);
        }
      }
    };
    xhr.send(JSON.stringify(data));
  },

  // 2. Đăng nhập khách hàng (UC-C02)
  login: function (credentials, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/auth/login`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi kết nối máy chủ', null);
        }
      }
    };
    xhr.send(JSON.stringify(credentials));
  },

  // 3. Lấy thông tin tài khoản (UC-C07)
  getProfile: function (userId, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/accounts/profile/${userId}`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : (res.message || 'Lỗi tải thông tin cá nhân'), res);
        } catch (e) {
          callback('Lỗi tải thông tin cá nhân', null);
        }
      }
    };
    xhr.send();
  },

  // 3.1. Kiểm tra trạng thái tài khoản đang đăng nhập (Heartbeat / Khóa tài khoản)
  checkStatus: function (userId, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/accounts/check-status/${userId}`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : (res.message || 'Tài khoản của bạn hiện tại đã bị khóa'), res);
        } catch (e) {
          callback('Lỗi kiểm tra trạng thái', null);
        }
      }
    };
    xhr.send();
  },

  // 4. Lấy lịch sử đơn hàng của tài khoản (Order.js)
  getOrders: function (userId, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/orders/user/${userId}`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi tải đơn hàng', null);
        }
      }
    };
    xhr.send();
  },

  // 5. Thêm/Xóa sản phẩm yêu thích (Wishlist)
  toggleWishlist: function (userId, productId, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/accounts/wishlist/toggle`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi cập nhật yêu thích', null);
        }
      }
    };
    xhr.send(JSON.stringify({ accountId: userId, productId }));
  },

  // 6. Lấy danh sách sản phẩm từ database
  getProducts: function (callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/products`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi tải sản phẩm', null);
        }
      }
    };
    xhr.send();
  },

  // 7. Lấy danh sách danh mục / bộ sưu tập từ database
  getCategories: function (callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/categories`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi tải danh mục', null);
        }
      }
    };
    xhr.send();
  },

  // 8. Đánh giá sản phẩm (UC-C08 - Thành viên 5)
  createReview: function (data, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/reviews`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 201 || xhr.status === 200 ? null : (res.message || 'Lỗi gửi đánh giá'), res);
        } catch (e) {
          callback('Lỗi kết nối máy chủ khi gửi đánh giá', null);
        }
      }
    };
    xhr.send(JSON.stringify(data));
  },

  getReviewsByProduct: function (productId, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/reviews/product/${productId}`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi tải đánh giá sản phẩm', null);
        }
      }
    };
    xhr.send();
  },

  // 9. Yêu cầu đổi trả hàng (UC-A05 - Thành viên 5)
  createReturnRequest: function (data, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/returns`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 201 || xhr.status === 200 ? null : (res.message || 'Lỗi gửi yêu cầu đổi trả'), res);
        } catch (e) {
          callback('Lỗi kết nối máy chủ khi gửi yêu cầu đổi trả', null);
        }
      }
    };
    xhr.send(JSON.stringify(data));
  },

  getReturnRequestsByUser: function (userId, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/returns/user/${userId}`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi tải yêu cầu đổi trả', null);
        }
      }
    };
    xhr.send();
  }
};

