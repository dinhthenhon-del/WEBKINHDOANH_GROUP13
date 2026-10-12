/**
 * ============================================================================
 * [DÙNG CHUNG CẢ NHÓM - NỀN TẢNG BỞI THÀNH VIÊN 1]
 * API Client (core/api.js)
 * Phương pháp: Áp dụng kỹ thuật AJAX (XMLHttpRequest) và JSON theo
 * Slide 10 (XML & DOM - AJAX) và Slide 11 (JSON) trong Tóm tắt nội dung môn học.
 * Tối ưu hóa: Bọc Promise để code bất đồng bộ hiện đại, tránh Callback Hell.
 * ============================================================================
 */

(function(window) {
  'use strict';

  // Tự động khớp theo hostname của trình duyệt (tránh lệch 127.0.0.1 với localhost)
  var host = (typeof window !== 'undefined' && window.location && window.location.hostname === '127.0.0.1') ? '127.0.0.1' : 'localhost';
  var API_BASE_URL = 'http://' + host + ':5000/api';
  var TOKEN_KEY = 'craftory_auth_token';
  var USER_KEY = 'craftory_auth_user';

  var ApiClient = {
    baseUrl: API_BASE_URL,

    // Quản lý Token & Session đăng nhập (Slide 11: JSON.stringify / JSON.parse)
    getToken: function() {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    },

    setSession: function(token, user, rememberMe) {
      var storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(user));
    },

    getCurrentUser: function() {
      var userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      if (!userStr) return null;
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    },

    clearSession: function() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    },

    /**
     * Hàm gọi API dùng AJAX (XMLHttpRequest) theo giáo trình Slide 10
     * @param {string} method - GET, POST, PUT, DELETE, PATCH (Slide 07)
     * @param {string} endpoint - Đường dẫn sau /api
     * @param {object} [data] - Dữ liệu gửi lên dạng JSON
     * @returns {Promise<object>}
     */
    request: function(method, endpoint, data) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest(); // Khởi tạo AJAX theo Slide 10
        var url = self.baseUrl + endpoint;

        xhr.open(method.toUpperCase(), url, true); // true: Bất đồng bộ

        var isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

        // Thiết lập header dữ liệu JSON theo Slide 11 (nếu là FormData trình duyệt tự tạo boundary)
        if (!isFormData) {
          xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        }

        // Gắn JWT token nếu người dùng đã đăng nhập (TV1 cung cấp)
        var token = self.getToken();
        if (token) {
          xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }

        // Bắt sự kiện phản hồi theo Slide 10: onreadystatechange
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) { // 4 = Hoàn thành (DONE)
            var responseJson = null;
            try {
              if (xhr.responseText) {
                responseJson = JSON.parse(xhr.responseText); // Parse JSON theo Slide 11
              }
            } catch (err) {
              var cleanText = xhr.responseText ? xhr.responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
              responseJson = { success: false, message: cleanText || ('Lỗi máy chủ HTTP ' + xhr.status) };
            }

            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(responseJson);
            } else {
              // Bắt lỗi hết hạn token (401) hoặc bị khóa (403)
              if (xhr.status === 401 && token) {
                self.clearSession();
                if (window.App && window.App.navbar) {
                  window.App.navbar.render();
                }
              }
              var errorMsg = (responseJson && responseJson.message) ? responseJson.message : 
                (xhr.status === 0 ? 'Không thể kết nối máy chủ backend (Hãy kiểm tra terminal đã chạy npm start ở thư mục server chưa)' : 'Lỗi máy chủ HTTP ' + xhr.status);
              reject(responseJson || { success: false, message: errorMsg });
            }
          }
        };

        xhr.onerror = function() {
          reject({ success: false, message: 'Lỗi mạng: Không thể kết nối tới Backend (Kiểm tra xem http://localhost:5000 đã chạy npm start chưa)' });
        };

        // Gửi request
        if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
          xhr.send(isFormData ? data : JSON.stringify(data));
        } else {
          xhr.send();
        }
      });
    },

    // Các hàm rút gọn tiện ích
    get: function(endpoint) { return this.request('GET', endpoint); },
    post: function(endpoint, data) { return this.request('POST', endpoint, data); },
    put: function(endpoint, data) { return this.request('PUT', endpoint, data); },
    patch: function(endpoint, data) { return this.request('PATCH', endpoint, data); },
    delete: function(endpoint) { return this.request('DELETE', endpoint); },

    /**
     * [Slide 10 XML & AJAX] Hàm tải và parse tệp XML từ Server
     * @param {string} endpoint - Ví dụ '/content/storytelling.xml' hoặc URL tệp XML
     * @returns {Promise<Document>} XML Document Object Model (DOM)
     */
    getXml: function(endpoint) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        var url = endpoint.startsWith('http') ? endpoint : (self.baseUrl + endpoint);

        xhr.open('GET', url, true);
        xhr.overrideMimeType('text/xml');

        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              // Nhận XML Document trực tiếp qua responseXML theo Slide 10
              if (xhr.responseXML && xhr.responseXML.documentElement) {
                resolve(xhr.responseXML);
              } else if (xhr.responseText) {
                // Parse chuỗi XML bằng DOMParser theo Slide 10
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xhr.responseText, 'text/xml');
                resolve(xmlDoc);
              } else {
                reject({ success: false, message: 'Dữ liệu XML rỗng' });
              }
            } else {
              reject({ success: false, message: 'Không thể nạp file XML (HTTP ' + xhr.status + ')' });
            }
          }
        };

        xhr.onerror = function() {
          reject({ success: false, message: 'Lỗi mạng khi tải tệp XML' });
        };

        xhr.send();
      });
    }
  };

  // Đăng ký toàn cục
  window.ApiClient = ApiClient;
})(window);

