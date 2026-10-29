/**
 * customer-web/core/api.js
 * Giao tiếp API bất đồng bộ theo chuẩn Slide 10 (AJAX - XMLHttpRequest)
 * Tuân thủ 100% tài liệu đặc tả Data Dictionary và Phase 4
 */

const API_BASE = (window.CRAFTORY_API_BASE || (() => {
  const hostname = window.location.hostname || 'localhost';
  const protocol = window.location.protocol === 'file:' ? 'http:' : window.location.protocol;
  return `${protocol}//${hostname}:5000/api`;
})()).replace(/\/+$/, '');

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
    let completed = false;
    const complete = (error, data) => {
      if (completed) return;
      completed = true;
      callback(error, data);
    };
    xhr.open('POST', `${API_BASE}/auth/login`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 10000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && !completed) {
        try {
          const res = JSON.parse(xhr.responseText);
          complete(xhr.status === 200 ? null : (res.message || 'Đăng nhập không thành công'), res);
        } catch (e) {
          complete('Máy chủ trả về phản hồi không hợp lệ khi đăng nhập', null);
        }
      }
    };
    xhr.onerror = function () {
      complete('Không thể kết nối máy chủ. Vui lòng kiểm tra server có đang chạy tại cổng 5000 không.', null);
    };
    xhr.ontimeout = function () {
      complete('Máy chủ không phản hồi khi đăng nhập. Vui lòng thử lại.', null);
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

  // 5.1. Thêm sản phẩm vào giỏ hàng
  addToCart: function (userId, productId, quantity, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/cart/items`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 || xhr.status === 201 ? null : (res.message || 'Lỗi thêm sản phẩm vào giỏ hàng'), res);
        } catch (e) {
          callback('Lỗi kết nối máy chủ khi thêm vào giỏ hàng', null);
        }
      }
    };
    xhr.send(JSON.stringify({ accountId: userId, productId, quantity }));
  },

  // 5.2. Lấy giỏ hàng của khách hàng
  getCart: function (userId, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/cart/${userId}`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : (res.message || 'Lỗi tải giỏ hàng'), res);
        } catch (e) {
          callback('Lỗi kết nối máy chủ khi tải giỏ hàng', null);
        }
      }
    };
    xhr.send();
  },

  // 6. Lấy danh sách sản phẩm từ database (hỗ trợ params lọc, tìm kiếm, sắp xếp, phân trang)
  getProducts: function (paramsOrCallback, maybeCallback) {
    let params = {};
    let callback = maybeCallback;
    if (typeof paramsOrCallback === 'function') {
      callback = paramsOrCallback;
    } else if (typeof paramsOrCallback === 'object' && paramsOrCallback !== null) {
      params = paramsOrCallback;
    }

    const queryParts = [];
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
      }
    });
    if (params.source === undefined) queryParts.push('source=verified');
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const xhr = new XMLHttpRequest();
    let completed = false;
    const complete = (error, data) => {
      if (completed) return;
      completed = true;
      callback(error, data);
    };
    xhr.open('GET', `${API_BASE}/products${queryString}`, true);
    xhr.timeout = 10000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 0) {
          complete('Không thể kết nối máy chủ để tải sản phẩm', null);
          return;
        }
        try {
          const res = JSON.parse(xhr.responseText);
          complete(xhr.status === 200 ? null : (res.message || 'Lỗi tải sản phẩm'), res);
        } catch (e) {
          complete('Lỗi tải sản phẩm', null);
        }
      }
    };
    xhr.onerror = function () {
      complete('Không thể kết nối máy chủ để tải sản phẩm', null);
    };
    xhr.ontimeout = function () {
      complete('Quá thời gian chờ tải sản phẩm', null);
    };
    xhr.send();
  },

  // 6.1. Lấy chi tiết 1 sản phẩm kèm tác phẩm liên quan
  getProductById: function (id, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/products/${id}?source=verified`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : (res.message || 'Không tìm thấy sản phẩm'), res);
        } catch (e) {
          callback('Lỗi kết nối máy chủ', null);
        }
      }
    };
    xhr.send();
  },

  // 7. Lấy danh sách danh mục từ database
  getCategories: function (callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/categories?source=verified`, true);
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

  // 7.1. Lấy danh sách bộ sưu tập nghệ phẩm
  getCollections: function (callback) {
    const xhr = new XMLHttpRequest();
    let completed = false;
    const complete = (error, data) => {
      if (completed) return;
      completed = true;
      callback(error, data);
    };
    xhr.open('GET', `${API_BASE}/collections?source=verified`, true);
    xhr.timeout = 10000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 0) {
          complete('Không thể kết nối máy chủ để tải bộ sưu tập', null);
          return;
        }
        try {
          const res = JSON.parse(xhr.responseText);
          complete(xhr.status === 200 ? null : (res.message || 'Lỗi tải bộ sưu tập'), res);
        } catch (e) {
          complete('Lỗi tải bộ sưu tập', null);
        }
      }
    };
    xhr.onerror = function () {
      complete('Không thể kết nối máy chủ để tải bộ sưu tập', null);
    };
    xhr.ontimeout = function () {
      complete('Quá thời gian chờ tải bộ sưu tập', null);
    };
    xhr.send();
  },

  // 7.2. Lấy chi tiết toàn bộ sản phẩm yêu thích (Wishlist)
  getWishlist: function (userId, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_BASE}/accounts/wishlist/${userId}`, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : res.message, res);
        } catch (e) {
          callback('Lỗi tải danh sách yêu thích', null);
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

  getOrderReviews: function (orderId, accountId, callback) {
    const xhr = new XMLHttpRequest();
    let url = `${API_BASE}/reviews/order/${encodeURIComponent(orderId)}`;
    if (accountId) url += `?accountId=${encodeURIComponent(accountId)}`;
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        try {
          const res = JSON.parse(xhr.responseText);
          callback(xhr.status === 200 ? null : (res.message || 'Lỗi tải đánh giá đơn hàng'), res);
        } catch (e) {
          callback('Lỗi kết nối máy chủ khi tải đánh giá đơn hàng', null);
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

