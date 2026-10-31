/**
 * customer-web/core/products.js
 * Quản lý tập trung Component Sản Phẩm, Danh Mục, Gian Hàng (Shop), Chi Tiết Sản Phẩm & Wishlist
 * Tuân thủ 100% bản thiết kế Stitch Customer (Haute Porcelain 1705)
 */

// Helper kiểm tra sản phẩm có trong wishlist hiện tại không
function isProductInWishlist(productId) {
  try {
    const user = window.currentUser || (function () {
      try {
        return JSON.parse(localStorage.getItem('craftory_user') || 'null');
      } catch (e) {
        return null;
      }
    })();
    if (!user || !user.wishlist) return false;
    const targetId = String(productId || '');
    return user.wishlist.some(item => {
      if (!item) return false;
      const itemId = typeof item === 'string' ? item : (item._id || item.id);
      return String(itemId) === targetId;
    });
  } catch (e) {
    return false;
  }
}

// Cập nhật số lượng huy hiệu wishlist trên sidebar Profile và view Wishlist
function updateWishlistBadges(count) {
  const user = window.currentUser || (function () {
    try {
      return JSON.parse(localStorage.getItem('craftory_user') || 'null');
    } catch (e) {
      return null;
    }
  })();
  let total = typeof count === 'number' ? count : ((user && user.wishlist && user.wishlist.length) || 0);

  const profileBadge = document.getElementById('profile-wishlist-count');
  if (profileBadge) {
    profileBadge.innerText = String(total).padStart(2, '0');
  }

  const wishlistCountEl = document.getElementById('wishlistCount');
  if (wishlistCountEl) {
    wishlistCountEl.innerText = `${total} tác phẩm`;
  }
}
window.updateWishlistBadges = updateWishlistBadges;

function escapeProductText(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function showCartNotification(message, type = 'success', iconName = 'shopping_bag') {
  let notification = document.getElementById('cart-action-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'cart-action-notification';
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,15,34,.48);backdrop-filter:blur(3px);';

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'app-notification-message');
    dialog.style.cssText = 'display:flex;align-items:flex-start;gap:1rem;width:min(28rem,100%);padding:1.5rem;background:#fff;border:1px solid #ebeae5;border-top:4px solid #a23e18;border-radius:1rem;box-shadow:0 24px 70px rgba(0,15,34,.3);color:#000f22;font:500 15px/1.6 sans-serif;';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = iconName;
    icon.style.color = '#a23e18';
    icon.setAttribute('aria-hidden', 'true');
    icon.style.fontSize = '1.75rem';

    const content = document.createElement('div');
    content.style.cssText = 'display:flex;flex:1;flex-direction:column;gap:.75rem;';
    const text = document.createElement('p');
    text.id = 'app-notification-message';
    text.dataset.notificationMessage = 'true';
    text.style.margin = '0';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'Đóng';
    closeButton.style.cssText = 'align-self:flex-end;border:0;border-radius:.5rem;background:#000f22;color:#fff;font:600 13px/1.2 sans-serif;cursor:pointer;padding:.65rem 1rem;';
    closeButton.addEventListener('click', () => notification.remove());
    content.append(text, closeButton);

    const dialogClose = () => notification.remove();
    notification.addEventListener('click', event => {
      if (event.target === notification) dialogClose();
    });
    dialog.addEventListener('click', event => event.stopPropagation());
    dialog.append(icon, content);
    notification.appendChild(dialog);
    document.body.appendChild(notification);
  }

  notification.querySelector('[role="alertdialog"]').style.borderTopColor = type === 'warning' ? '#b91c1c' : '#a23e18';
  notification.querySelector('.material-symbols-outlined').textContent = iconName;
  notification.querySelector('[data-notification-message]').textContent = message;
  notification.querySelector('.material-symbols-outlined').style.color = type === 'warning' ? '#b91c1c' : '#a23e18';
  notification.querySelector('button').focus();
}

window.alert = function (message) {
  showCartNotification(String(message), 'warning', 'info');
};

window.showToast = function (typeId, title, message) {
  const isWarning = typeId === 'toast-warning';
  showCartNotification(`${title}: ${message}`, isWarning ? 'warning' : 'success', isWarning ? 'warning' : 'verified');
};

window.hideToast = function () {
  const notification = document.getElementById('cart-action-notification');
  if (notification) notification.remove();
};

const ProductComponent = {
  /**
   * 1. Template sinh thẻ Sản phẩm đơn lẻ (Product Card Component)
   * @param {Object} product - Dữ liệu sản phẩm từ MongoDB Atlas
   * @returns {string} HTML string của thẻ sản phẩm chuẩn thẩm mỹ Stitch
   */
  renderCard: function (product) {
    if (!product) return '';

    const id = product._id || '';
    const name = product.name || '';
    const price = (product.price || 0).toLocaleString('vi-VN') + '₫';
    const collection = product.collectionName || (product.categoryId && product.categoryId.name) || '';
    const sku = product.sku || '';
    const desc = product.description || '';
    const imageUrl = product.image || (product.images && product.images[0]) || '';
    const image = imageUrl
      ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" src="${escapeProductText(imageUrl)}" alt="${escapeProductText(name)}" onclick="ProductComponent.viewDetail('${id}')" onerror="this.hidden=true; this.nextElementSibling.hidden=false" /><div hidden class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#74777e] text-xs"><span class="material-symbols-outlined text-3xl">image_not_supported</span><span>Ảnh sản phẩm không tải được</span></div>`
      : '<div class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#74777e] text-xs"><span class="material-symbols-outlined text-3xl">image_not_supported</span><span>Chưa có ảnh sản phẩm đã xác minh</span></div>';
    const stock = typeof product.stock === 'number' ? product.stock : 0;
    const isInactive = product.status === 'inactive';
    const inWishlist = isProductInWishlist(id);

    // Badge trạng thái góc trên thẻ
    let badgeText = 'Còn hàng';
    let badgeClass = 'bg-[#a23e18] text-white';
    if (isInactive) {
      badgeText = 'Ngừng bán';
      badgeClass = 'bg-stone-600 text-white';
    } else if (stock <= 0) {
      badgeText = 'Tạm hết hàng';
      badgeClass = 'bg-stone-500 text-white';
    } else if (stock <= 3) {
      badgeText = `Sắp hết hàng: ${stock}`;
      badgeClass = 'bg-[#000f22] text-white';
    }

    const heartColorClass = inWishlist ? 'text-red-600' : 'text-stone-400 hover:text-red-500';
    const heartIcon = inWishlist ? 'favorite' : 'favorite_border';
    const heartIconStyle = inWishlist ? 'style="color: #dc2626; font-variation-settings: \'FILL\' 1;"' : '';

    return `
      <div class="product-card group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#EBEAE5] cursor-pointer" data-product-id="${id}">
        <!-- Ảnh đại diện tác phẩm -->
        <div class="relative aspect-[4/5] w-full overflow-hidden bg-[#f3f4f5]">
          ${image}
          
          <!-- Badge góc trên phải -->
          <div class="absolute top-3 right-3 px-2.5 py-1 rounded font-['Plus_Jakarta_Sans',sans-serif] uppercase tracking-wider text-[11px] shadow-sm font-semibold ${badgeClass}">
            ${badgeText}
          </div>

          <!-- Nút thả tim yêu thích nhanh (UC-C10) -->
          <button onclick="event.stopPropagation(); ProductComponent.toggleFavorite('${id}', this)"
                  title="Lưu vào danh sách yêu thích"
                  class="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow transition-all hover:scale-110 cursor-pointer ${heartColorClass}">
            <span class="material-symbols-outlined text-[20px]" ${heartIconStyle}>${heartIcon}</span>
          </button>
        </div>

        <!-- Thông tin chi tiết sản phẩm -->
        <div class="p-4 flex flex-col flex-1 justify-between">
          <div onclick="ProductComponent.viewDetail('${id}')">
            <span class="font-['Plus_Jakarta_Sans',sans-serif] text-[#a23e18] uppercase font-semibold text-[11px] tracking-wider block mb-1">
              ${collection} • Mã ${sku}
            </span>
            <h3 class="font-['Playfair_Display',serif] text-base text-[#000f22] group-hover:text-[#a23e18] transition-colors mb-1.5 font-bold line-clamp-1">
              ${name}
            </h3>
            <p class="font-['Plus_Jakarta_Sans',sans-serif] text-xs text-[#74777e] mb-3 line-clamp-2 leading-relaxed">
              ${desc}
            </p>
          </div>

          <div>
            <!-- Giá tiền niêm yết -->
            <div class="flex items-baseline justify-between mb-3 pt-2 border-t border-[#EBEAE5]/60">
              <span class="font-['Playfair_Display',serif] text-[#a23e18] font-bold text-lg">${price}</span>
              <span class="font-['Plus_Jakarta_Sans',sans-serif] text-[#74777e] text-xs">${product.unit || ''}</span>
            </div>

            <!-- Nút hành động -->
            <div class="grid grid-cols-2 gap-2">
              <button onclick="event.stopPropagation(); ProductComponent.viewDetail('${id}')"
                      class="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#000f22] text-[#000f22] hover:bg-[#000f22] hover:text-white transition-all text-xs font-semibold cursor-pointer">
                <span>Thưởng lãm</span>
                <span class="material-symbols-outlined text-sm">east</span>
              </button>
              <button ${(stock <= 0 || isInactive) ? 'disabled' : `onclick="event.stopPropagation(); ProductComponent.quickAddToCart('${id}', ${stock}, '${product.status || 'active'}')"`}
                      class="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg ${(stock <= 0 || isInactive) ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-200 shadow-none' : 'bg-[#000f22] text-white hover:bg-[#10162B] cursor-pointer shadow-sm'} transition-all text-xs font-semibold">
                <span class="material-symbols-outlined text-sm">${isInactive ? 'do_not_disturb_on' : (stock <= 0 ? 'block' : 'shopping_bag')}</span>
                <span>${isInactive ? 'Ngừng bán' : (stock <= 0 ? 'Hết hàng' : 'Chọn')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 2. Template sinh thẻ Bộ Sưu Tập / Dòng Men (Collection Card Component)
   */
  renderCategoryCard: function (item, isCollection = false) {
    if (!item) return '';
    const title = escapeProductText(item.name || '');
    const sub = escapeProductText(item.subTitle || item.category || item.name || '');
    const desc = escapeProductText(item.description || '');
    const count = escapeProductText(
      typeof item.productCount === 'number'
        ? `${item.productCount} sản phẩm`
        : (item.countText || '')
    );
    const imageUrl = item.imageUrl || item.image || '';
    const img = imageUrl
      ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="${escapeProductText(imageUrl)}" alt="${title}" onerror="this.hidden=true; this.nextElementSibling.hidden=false" /><div hidden class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#74777e] text-xs"><span class="material-symbols-outlined text-3xl">image_not_supported</span><span>Ảnh bộ sưu tập không tải được</span></div>`
      : '<div class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#74777e] text-xs"><span class="material-symbols-outlined text-3xl">image_not_supported</span><span>Chưa có ảnh bộ sưu tập đã xác minh</span></div>';
    const filterAttributes = isCollection
      ? `data-collection-id="${escapeProductText(item._id || '')}" data-collection-name="${title}" onclick="ProductComponent.openCollection(this.dataset.collectionId, this.dataset.collectionName)"`
      : `data-category-id="${escapeProductText(item._id || '')}" data-category-name="${title}" onclick="ProductComponent.filterByCategory(this.dataset.categoryId, this.dataset.categoryName)"`;

    return `
      <div class="group relative flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#EBEAE5] cursor-pointer"
           ${filterAttributes}>
        <div class="relative aspect-[4/5] w-full overflow-hidden bg-[#f3f4f5]">
          ${img}
          <div class="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#10162B]/85 backdrop-blur-md text-white font-['Plus_Jakarta_Sans',sans-serif] tracking-widest uppercase text-[11px] font-semibold">
            ${count}
          </div>
        </div>
        <div class="p-4 flex flex-col flex-1 justify-between bg-white">
          <div>
            <span class="font-['Plus_Jakarta_Sans',sans-serif] text-[#a23e18] uppercase tracking-wider block mb-1 text-[11px] font-bold">${title}</span>
            <h3 class="font-['Playfair_Display',serif] text-base text-[#000f22] group-hover:text-[#a23e18] transition-colors mb-2 font-bold">${sub}</h3>
            <p class="font-['Plus_Jakarta_Sans',sans-serif] text-xs text-[#74777e] line-clamp-2 leading-relaxed">${desc}</p>
          </div>
          <div class="mt-3 flex items-center justify-between font-['Plus_Jakarta_Sans',sans-serif] text-[#74777e] group-hover:text-[#000f22] pt-2 border-t border-[#EBEAE5]/60 text-xs font-semibold">
            <span>Khám phá tuyển tập</span>
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 2.1. Nạp danh mục / bộ sưu tập thực tế từ MongoDB Atlas vào trang chủ
   */
  loadHomeCollections: function (containerId = 'home-collections-grid') {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    grid.innerHTML = '<div class="col-span-full py-10 text-center text-[#74777e]">Đang tải bộ sưu tập...</div>';
    ApiService.getCollections(function (err, res) {
      if (err || !res || !res.success || !Array.isArray(res.data)) {
        grid.innerHTML = '<div class="col-span-full py-10 text-center text-red-700">Không tải được bộ sưu tập. Vui lòng kiểm tra kết nối máy chủ.</div>';
        return;
      }

      if (res.data.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-10 text-center text-[#74777e]">Chưa có bộ sưu tập đã xác minh trong cơ sở dữ liệu.</div>';
        return;
      }

      grid.innerHTML = res.data.slice(0, 4).map(collection => ProductComponent.renderCategoryCard(collection, true)).join('');
    });
  },

  loadAllCollections: function (containerId = 'collection-catalog-grid') {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    grid.innerHTML = '<div class="col-span-full py-10 text-center text-[#74777e]">Đang tải bộ sưu tập...</div>';
    ApiService.getCollections((err, res) => {
      if (err || !res || !res.success || !Array.isArray(res.data)) {
        grid.innerHTML = '<div class="col-span-full py-10 text-center text-red-700">Không tải được bộ sưu tập. Vui lòng kiểm tra kết nối máy chủ.</div>';
        return;
      }
      if (res.data.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-10 text-center text-[#74777e]">Chưa có bộ sưu tập đã xác minh trong cơ sở dữ liệu.</div>';
        return;
      }

      grid.innerHTML = res.data.map(collection => ProductComponent.renderCategoryCard(collection, true)).join('');
    });
  },

  openCollection: function (collectionId, collectionName) {
    dieuHuong('collection-detail', null, { collectionId, collectionName });
  },

  /**
   * 3. Nạp danh sách sản phẩm bán chạy nhất từ MongoDB Atlas vào giao diện
   */
  loadFeaturedProducts: function (containerId = 'home-featured-products-grid', limit = 4) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-[#74777e]">
        <span class="material-symbols-outlined text-4xl animate-spin text-[#a23e18] mb-2 block">progress_activity</span>
        <p class="font-['Plus_Jakarta_Sans',sans-serif] text-sm">Đang tuyển chọn 4 tác phẩm ngự tác bán chạy nhất...</p>
      </div>
    `;

    ApiService.getProducts({ limit: 12 }, function (err, res) {
      if (err || !res || !res.success || !res.data || res.data.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-12 text-center text-[#74777e]">
            <span class="material-symbols-outlined text-4xl text-stone-400 mb-2 block">inventory_2</span>
            <p class="font-['Plus_Jakarta_Sans',sans-serif] text-sm">Chưa có sản phẩm đã xác minh trong cơ sở dữ liệu.</p>
          </div>
        `;
        return;
      }

      let allProducts = res.data.filter(p => p && p.name);
      const topProducts = allProducts.slice(0, limit);
      grid.innerHTML = topProducts.map(p => ProductComponent.renderCard(p)).join('');
    });
  },

  /**
   * 4. Xử lý khi nhấn nút Lưu yêu thích (Wishlist - UC-C10)
   */
  toggleFavorite: function (productId, btnEl) {
    if (typeof requireAuthAction === 'function') {
      requireAuthAction(function () {
        if (!window.currentUser || !window.currentUser._id) return;
        ApiService.toggleWishlist(window.currentUser._id, productId, function (err, res) {
          if (!err && res && res.success) {
            window.currentUser = res.data;
            localStorage.setItem('craftory_user', JSON.stringify(window.currentUser));

            const isNowInWl = isProductInWishlist(productId);

            // Đồng bộ số lượng yêu thích
            updateWishlistBadges();

            // Cập nhật trạng thái hiển thị của nút vừa bấm
            if (btnEl) {
              const icon = btnEl.querySelector('.material-symbols-outlined') || (btnEl.classList.contains('material-symbols-outlined') ? btnEl : null);
              if (icon) {
                icon.innerText = isNowInWl ? 'favorite' : 'favorite_border';
              }
              if (isNowInWl) {
                btnEl.classList.remove('text-stone-400');
                btnEl.classList.add('text-red-600');
                if (icon) {
                  icon.classList.remove('text-stone-400');
                  icon.classList.add('text-red-600');
                  icon.style.color = '#dc2626';
                  icon.style.fontVariationSettings = "'FILL' 1";
                }
              } else {
                btnEl.classList.remove('text-red-600');
                btnEl.classList.add('text-stone-400');
                if (icon) {
                  icon.classList.remove('text-red-600');
                  icon.classList.add('text-stone-400');
                  icon.style.color = '';
                  icon.style.fontVariationSettings = "'FILL' 0";
                }
              }
            }

            // Đồng bộ tất cả các thẻ sản phẩm khác cùng ID trên trang nếu có
            document.querySelectorAll(`[data-product-id="${productId}"]`).forEach(card => {
              const cardBtn = card.querySelector('button[title="Lưu vào danh sách yêu thích"]');
              if (cardBtn) {
                const cardIcon = cardBtn.querySelector('.material-symbols-outlined');
                if (cardIcon) cardIcon.innerText = isNowInWl ? 'favorite' : 'favorite_border';
                if (isNowInWl) {
                  cardBtn.classList.remove('text-stone-400');
                  cardBtn.classList.add('text-red-600');
                  if (cardIcon) {
                    cardIcon.classList.remove('text-stone-400');
                    cardIcon.classList.add('text-red-600');
                    cardIcon.style.color = '#dc2626';
                    cardIcon.style.fontVariationSettings = "'FILL' 1";
                  }
                } else {
                  cardBtn.classList.remove('text-red-600');
                  cardBtn.classList.add('text-stone-400');
                  if (cardIcon) {
                    cardIcon.classList.remove('text-red-600');
                    cardIcon.classList.add('text-stone-400');
                    cardIcon.style.color = '';
                    cardIcon.style.fontVariationSettings = "'FILL' 0";
                  }
                }
              }
            });

            showCartNotification(
              isNowInWl ? 'Đã thêm sản phẩm vào yêu thích' : 'Đã xóa sản phẩm khỏi yêu thích',
              'success',
              isNowInWl ? 'favorite' : 'favorite_border'
            );

            // Nếu đang ở màn hình wishlist, refresh lại view
            if (window.WishlistView && typeof WishlistView.loadWishlist === 'function' && document.getElementById('wishlistGrid')) {
              WishlistView.loadWishlist();
            }
          } else {
            alert((res && res.message) || err || 'Lỗi khi cập nhật danh sách yêu thích');
          }
        });
      });
    }
  },

  /**
   * 5. Xử lý xem chi tiết tác phẩm (UC-C03)
   */
  viewDetail: function (productId) {
    window.selectedProductId = productId;
    dieuHuong('product-detail', null, productId);
  },

  /**
   * 5.1. Thêm nhanh vào giỏ hàng
   */
  quickAddToCart: function (productId, stock, status) {
    if (status === 'inactive') {
      showCartNotification('Tác phẩm này đã ngừng kinh doanh, không thể thêm vào giỏ hàng!', 'warning', 'do_not_disturb_on');
      return;
    }
    if (stock !== undefined && Number(stock) <= 0) {
      showCartNotification('Tác phẩm này hiện đã hết hàng trong kho, không thể thêm vào giỏ hàng!', 'warning', 'remove_shopping_cart');
      return;
    }
    requireAuthAction(function () {
      ApiService.addToCart(window.currentUser._id, productId, 1, function (err, res) {
        if (err || !res || !res.success) {
          showCartNotification((res && res.message) || err || 'Không thể thêm sản phẩm vào giỏ hàng', 'warning', 'remove_shopping_cart');
          return;
        }
        if (window.CartView) window.CartView.updateCount(res.data);
        showCartNotification('Đã thêm sản phẩm vào giỏ hàng thành công!');
      });
    });
  },

  /**
   * 6. Lọc theo danh mục
   */
  filterByCategory: function (categoryId, categoryName) {
    window.selectedCategoryFilter = { id: categoryId, name: categoryName };
    dieuHuong('shop', null, { categoryId });
  },

  filterByCollection: function (collectionId, collectionName) {
    dieuHuong('shop', null, { collectionId, collectionName });
  }
};

// ==========================================
// SHOP VIEW CONTROLLER (Gian hàng & Bộ lọc)
// ==========================================
const ShopView = {
  currentPage: 1,
  limit: 12,
  currentFilters: {
    search: '',
    categoryId: 'all',
    collectionId: '',
    collectionName: '',
    glaze: 'all',
    price: 'all',
    sort: 'newest'
  },

  init: function (initialParams = {}) {
    this.currentPage = 1;
    this.currentFilters = {
      search: initialParams.search || '',
      categoryId: initialParams.categoryId || 'all',
      collectionId: initialParams.collectionId || '',
      collectionName: initialParams.collectionName || '',
      glaze: initialParams.glaze || 'all',
      price: initialParams.price || 'all',
      sort: 'newest'
    };

    // Điền dữ liệu tìm kiếm nếu có
    const searchInput = document.getElementById('shopSearchInput');
    if (searchInput && this.currentFilters.search) {
      searchInput.value = this.currentFilters.search;
    }

    // Nạp danh mục động vào dropdown
    this.loadCategoriesDropdown();

    // Nạp sản phẩm
    this.fetchProducts();
  },

  loadCategoriesDropdown: function () {
    const select = document.getElementById('filterCategory');
    if (!select) return;

    ApiService.getCategories((err, res) => {
      if (!err && res && res.success && res.data) {
        let html = '<option value="all">Tất cả danh mục</option>';
        res.data.forEach(c => {
          const isSelected = this.currentFilters.categoryId === c._id ? 'selected' : '';
          html += `<option value="${c._id}" ${isSelected}>${c.name} (${c.productCount || 0})</option>`;
        });
        select.innerHTML = html;
      }
    });
  },

  triggerSearch: function () {
    const input = document.getElementById('shopSearchInput');
    this.currentFilters.search = input ? input.value.trim() : '';
    this.currentPage = 1;
    this.fetchProducts();
  },

  onFilterChange: function () {
    const glazeEl = document.getElementById('filterGlaze');
    const catEl = document.getElementById('filterCategory');
    const priceEl = document.getElementById('filterPrice');
    const sortEl = document.getElementById('sortCatalog');

    this.currentFilters.glaze = glazeEl ? glazeEl.value : 'all';
    this.currentFilters.categoryId = catEl ? catEl.value : 'all';
    this.currentFilters.price = priceEl ? priceEl.value : 'all';
    this.currentFilters.sort = sortEl ? sortEl.value : 'newest';

    this.currentPage = 1;
    this.fetchProducts();
  },

  resetAllFilters: function () {
    this.currentFilters = {
      search: '',
      categoryId: 'all',
      collectionId: '',
      collectionName: '',
      glaze: 'all',
      price: 'all',
      sort: 'newest'
    };

    const s = document.getElementById('shopSearchInput'); if (s) s.value = '';
    const g = document.getElementById('filterGlaze'); if (g) g.value = 'all';
    const c = document.getElementById('filterCategory'); if (c) c.value = 'all';
    const p = document.getElementById('filterPrice'); if (p) p.value = 'all';
    const st = document.getElementById('sortCatalog'); if (st) st.value = 'newest';

    this.currentPage = 1;
    this.fetchProducts();
  },

  fetchProducts: function () {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-[#74777e]">
        <span class="material-symbols-outlined text-4xl animate-spin text-[#a23e18] mb-2 block">progress_activity</span>
        <p class="font-['Plus_Jakarta_Sans',sans-serif] text-sm">Đang tải sản phẩm theo điều kiện lọc...</p>
      </div>
    `;

    // Xây dựng params query
    const params = {
      page: this.currentPage,
      limit: this.limit,
      sort: this.currentFilters.sort
    };

    if (this.currentFilters.search) params.search = this.currentFilters.search;
    if (this.currentFilters.categoryId !== 'all') params.categoryId = this.currentFilters.categoryId;
    if (this.currentFilters.collectionId) params.collectionId = this.currentFilters.collectionId;
    else if (this.currentFilters.collectionName) params.collectionName = this.currentFilters.collectionName;
    if (this.currentFilters.glaze !== 'all') params.glaze = this.currentFilters.glaze;

    // Khoảng giá
    if (this.currentFilters.price === 'p1') {
      params.maxPrice = 500000;
    } else if (this.currentFilters.price === 'p2') {
      params.minPrice = 500000;
      params.maxPrice = 2000000;
    } else if (this.currentFilters.price === 'p3') {
      params.minPrice = 2000000;
      params.maxPrice = 5000000;
    } else if (this.currentFilters.price === 'p4') {
      params.minPrice = 5000000;
    }

    ApiService.getProducts(params, (err, res) => {
      this.updateFilterChips();

      if (err || !res || !res.success || !res.data || res.data.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-20 text-center max-w-md mx-auto">
            <span class="material-symbols-outlined text-5xl text-stone-400 mb-3 block">search_off</span>
            <h3 class="font-['Playfair_Display',serif] text-xl font-bold text-[#000f22] mb-1">Không tìm thấy tác phẩm phù hợp (E1)</h3>
            <p class="font-['Plus_Jakarta_Sans',sans-serif] text-xs text-[#74777e] mb-4">
              Không có sản phẩm nào đáp ứng các điều kiện tìm kiếm/lọc hiện tại. Quý khách vui lòng thử thay đổi từ khóa hoặc đặt lại bộ lọc.
            </p>
            <button onclick="ShopView.resetAllFilters()" class="px-4 py-2 rounded-lg bg-[#000f22] text-white text-xs font-semibold hover:bg-[#10162B] transition-colors">
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        `;
        const countEl = document.getElementById('resultCount');
        if (countEl) countEl.innerText = '0';
        this.renderPagination({ total: 0, page: 1, limit: this.limit, totalPages: 1 });
        return;
      }

      // Đổ danh sách sản phẩm
      grid.innerHTML = res.data.map(p => ProductComponent.renderCard(p)).join('');

      // Cập nhật số lượng
      const countEl = document.getElementById('resultCount');
      if (countEl) countEl.innerText = (res.pagination && res.pagination.total) || res.data.length;

      // Cập nhật phân trang
      if (res.pagination) {
        this.renderPagination(res.pagination);
      }
    });
  },

  updateFilterChips: function () {
    const container = document.getElementById('chipsContainer');
    const clearBtn = document.getElementById('clearAllFilters');
    if (!container) return;

    const chips = [];

    if (this.currentFilters.search) {
      chips.push({ label: `Tìm kiếm: "${this.currentFilters.search}"`, key: 'search' });
    }
    if (this.currentFilters.glaze !== 'all') {
      const gEl = document.getElementById('filterGlaze');
      const text = gEl && gEl.selectedOptions[0] ? gEl.selectedOptions[0].text : this.currentFilters.glaze;
      chips.push({ label: `Dòng men: ${text}`, key: 'glaze' });
    }
    if (this.currentFilters.categoryId !== 'all') {
      const cEl = document.getElementById('filterCategory');
      const text = cEl && cEl.selectedOptions[0] ? cEl.selectedOptions[0].text : 'Danh mục';
      chips.push({ label: `Danh mục: ${text}`, key: 'category' });
    }
    if (this.currentFilters.collectionName) {
      chips.push({ label: `Bộ sưu tập: ${this.currentFilters.collectionName}`, key: 'collection' });
    }
    if (this.currentFilters.price !== 'all') {
      const pEl = document.getElementById('filterPrice');
      const text = pEl && pEl.selectedOptions[0] ? pEl.selectedOptions[0].text : 'Mức giá';
      chips.push({ label: `Giá: ${text}`, key: 'price' });
    }

    if (chips.length > 0) {
      container.innerHTML = chips.map(c => `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBEAE5]/80 text-[#000f22] font-['Plus_Jakarta_Sans',sans-serif] text-xs font-medium">
          <span>${c.label}</span>
          <button onclick="ShopView.removeChip('${c.key}')" class="hover:text-[#a23e18] flex items-center justify-center">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </span>
      `).join('');
      if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
      container.innerHTML = '<span class="text-xs text-[#74777e] italic">Tất cả tác phẩm đang mở bán</span>';
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  },

  removeChip: function (key) {
    if (key === 'search') {
      this.currentFilters.search = '';
      const s = document.getElementById('shopSearchInput'); if (s) s.value = '';
    } else if (key === 'glaze') {
      this.currentFilters.glaze = 'all';
      const g = document.getElementById('filterGlaze'); if (g) g.value = 'all';
    } else if (key === 'category') {
      this.currentFilters.categoryId = 'all';
      const c = document.getElementById('filterCategory'); if (c) c.value = 'all';
    } else if (key === 'collection') {
      this.currentFilters.collectionId = '';
      this.currentFilters.collectionName = '';
    } else if (key === 'price') {
      this.currentFilters.price = 'all';
      const p = document.getElementById('filterPrice'); if (p) p.value = 'all';
    }
    this.currentPage = 1;
    this.fetchProducts();
  },

  renderPagination: function (pagination) {
    const nav = document.getElementById('paginationButtons');
    const curText = document.getElementById('currentPageText');
    const totText = document.getElementById('totalPagesText');
    if (!nav) return;

    const { page, totalPages } = pagination;
    if (curText) curText.innerText = page;
    if (totText) totText.innerText = totalPages;

    if (totalPages <= 1) {
      nav.innerHTML = '';
      return;
    }

    let html = '';
    // Previous button
    if (page > 1) {
      html += `
        <button onclick="ShopView.goToPage(${page - 1})" class="w-9 h-9 rounded-lg border border-[#EBEAE5] bg-white text-[#000f22] hover:bg-[#f3f4f5] flex items-center justify-center text-sm font-semibold cursor-pointer">
          <span class="material-symbols-outlined text-base">chevron_left</span>
        </button>
      `;
    }

    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
      if (i === page) {
        html += `
          <span class="w-9 h-9 rounded-lg bg-[#000f22] text-white flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif] text-sm font-bold shadow-sm">
            ${i}
          </span>
        `;
      } else if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
        html += `
          <button onclick="ShopView.goToPage(${i})" class="w-9 h-9 rounded-lg border border-[#EBEAE5] bg-white text-[#000f22] hover:bg-[#f3f4f5] flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif] text-sm font-medium cursor-pointer">
            ${i}
          </button>
        `;
      } else if (i === page - 2 || i === page + 2) {
        html += `<span class="w-6 text-center text-[#74777e]">...</span>`;
      }
    }

    // Next button
    if (page < totalPages) {
      html += `
        <button onclick="ShopView.goToPage(${page + 1})" class="w-9 h-9 rounded-lg border border-[#EBEAE5] bg-white text-[#000f22] hover:bg-[#f3f4f5] flex items-center justify-center text-sm font-semibold cursor-pointer">
          <span class="material-symbols-outlined text-base">chevron_right</span>
        </button>
      `;
    }

    nav.innerHTML = html;
  },

  goToPage: function (p) {
    this.currentPage = p;
    this.fetchProducts();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }
};

// ==========================================
// PRODUCT DETAIL CONTROLLER (Chi tiết sản phẩm)
// ==========================================
const DetailView = {
  currentProduct: null,
  quantity: 1,

  init: function (productId) {
    const loading = document.getElementById('detailLoading');
    const content = document.getElementById('detailContent');
    const related = document.getElementById('relatedSection');

    if (loading) loading.classList.remove('hidden');
    if (content) content.classList.add('hidden');
    if (related) related.classList.add('hidden');

    this.quantity = 1;
    const qtyInput = document.getElementById('detailQtyInput');
    if (qtyInput) qtyInput.value = '1';

    if (!productId) {
      alert('Không xác định được mã tác phẩm!');
      dieuHuong('shop');
      return;
    }

    ApiService.getProductById(productId, (err, res) => {
      if (loading) loading.classList.add('hidden');

      if (err || !res || !res.success || !res.data) {
        alert('Tác phẩm hiện không khả dụng hoặc đã ngừng bán (E2)');
        dieuHuong('shop');
        return;
      }

      this.currentProduct = res.data;
      this.renderProduct(this.currentProduct, res.related || []);

      if (content) {
        content.classList.remove('hidden');
        content.classList.add('grid');
      }
      if (related) related.classList.remove('hidden');
    });
  },

  renderProduct: function (p, relatedList) {
    // Breadcrumbs
    const bc = document.getElementById('detailBreadcrumbTitle');
    if (bc) bc.innerText = p.name;

    const bcCat = document.getElementById('detailBreadcrumbCategory');
    if (bcCat) {
      if (p.collectionName) {
        bcCat.innerText = p.collectionName;
        bcCat.onclick = () => dieuHuong('shop', null, { collectionId: p.collectionId, collectionName: p.collectionName });
      } else if (p.categoryId && p.categoryId.name) {
        bcCat.innerText = p.categoryId.name;
        bcCat.onclick = () => dieuHuong('shop', null, { categoryId: p.categoryId._id, categoryName: p.categoryId.name });
      } else {
        bcCat.innerText = 'Gian hàng di sản';
        bcCat.onclick = () => dieuHuong('shop');
      }
    }

    // Title & SKU
    const titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.innerText = p.name;
    const skuEl = document.getElementById('detailSku');
    if (skuEl) skuEl.innerText = `Mã SP: ${p.sku || 'SP-' + p._id.slice(-4).toUpperCase()}`;

    // Category & Edition tags
    const catTag = document.getElementById('detailCategoryTag');
    if (catTag) catTag.innerText = (p.categoryId && p.categoryId.name) || p.collectionName || '';

    // Price
    const priceEl = document.getElementById('detailPrice');
    if (priceEl) priceEl.innerText = (p.price || 0).toLocaleString('vi-VN') + ' đ';

    // Stock & Business Status
    const stockEl = document.getElementById('detailStockStatus');
    const btnAdd = document.getElementById('btnAddToCart');
    const alertEl = document.getElementById('detailStockAlert');
    const qtyInput = document.getElementById('detailQtyInput');

    const stock = typeof p.stock === 'number' ? p.stock : 0;
    const isInactive = p.status === 'inactive';

    if (isInactive) {
      if (stockEl) {
        stockEl.innerText = 'Tác phẩm đã ngừng kinh doanh';
        stockEl.className = 'text-xs text-stone-500 font-semibold flex items-center gap-1.5';
      }
      if (alertEl) {
        alertEl.innerText = '(Ngừng bán)';
        alertEl.className = 'text-xs text-stone-500 font-semibold';
      }
      if (qtyInput) {
        qtyInput.value = '0';
        qtyInput.disabled = true;
      }
      this.quantity = 0;
      if (btnAdd) {
        btnAdd.disabled = true;
        btnAdd.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        btnAdd.classList.remove('hover:bg-[#10162B]', 'cursor-pointer');
        btnAdd.innerHTML = '<span class="material-symbols-outlined text-xl">do_not_disturb_on</span><span>Đã ngừng kinh doanh</span>';
      }
    } else if (stock <= 0) {
      if (stockEl) {
        stockEl.innerText = 'Tạm hết hàng (Tồn kho: 0)';
        stockEl.className = 'text-xs text-red-600 font-semibold flex items-center gap-1.5';
      }
      if (alertEl) {
        alertEl.innerText = '(Hết hàng)';
        alertEl.className = 'text-xs text-red-600 font-semibold';
      }
      if (qtyInput) {
        qtyInput.value = '0';
        qtyInput.disabled = false;
      }
      this.quantity = 0;
      if (btnAdd) {
        btnAdd.disabled = true;
        btnAdd.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        btnAdd.classList.remove('hover:bg-[#10162B]', 'cursor-pointer');
        btnAdd.innerHTML = '<span class="material-symbols-outlined text-xl">block</span><span>Tạm hết hàng</span>';
      }
    } else {
      if (stockEl) {
        stockEl.innerText = `Tồn kho ghi nhận: ${stock}`;
        stockEl.className = 'text-xs text-[#74777e] font-[\'Plus_Jakarta_Sans\',sans-serif] flex items-center gap-1.5';
      }
      if (alertEl) {
        alertEl.innerText = `(Còn ${stock})`;
        alertEl.className = 'text-xs text-[#74777e]';
      }
      if (qtyInput) {
        qtyInput.value = '1';
        qtyInput.disabled = false;
      }
      this.quantity = 1;
      if (btnAdd) {
        btnAdd.disabled = false;
        btnAdd.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        btnAdd.classList.add('hover:bg-[#10162B]', 'cursor-pointer');
        btnAdd.innerHTML = '<span class="material-symbols-outlined text-xl">shopping_bag</span><span>Thêm vào giỏ chế tác</span>';
      }
    }

    // Story / Description
    const descEl = document.getElementById('detailDesc');
    if (descEl) descEl.innerText = p.description || 'Chưa có mô tả được xác minh.';

    // Specifications
    const sizeEl = document.getElementById('detailSpecSize');
    if (sizeEl) sizeEl.innerText = p.size || 'Chưa có thông tin';
    const glazeEl = document.getElementById('detailSpecGlaze');
    if (glazeEl) glazeEl.innerText = p.glazeColor || 'Chưa có thông tin';
    const matEl = document.getElementById('detailSpecMaterial');
    if (matEl) matEl.innerText = p.material || 'Chưa có thông tin';
    const tempEl = document.getElementById('detailSpecTemp');
    if (tempEl) tempEl.innerText = p.firingTemp || 'Chưa có thông tin';

    // Ratings
    const ratingEl = document.getElementById('detailRatingScore');
    if (ratingEl) ratingEl.innerText = Number(p.averageRating || 0).toFixed(1);
    const reviewEl = document.getElementById('detailReviewCount');
    if (reviewEl) reviewEl.innerText = p.reviewCount ? `(${p.reviewCount} đánh giá)` : '(Chưa có đánh giá)';
    const stars = document.getElementById('detailStarGroup');
    if (stars) stars.hidden = !p.reviewCount;
    if (ratingEl) ratingEl.hidden = !p.reviewCount;

    // Custom 2D Section
    const customSection = document.getElementById('custom2DSection');
    if (customSection) {
      if (p.custom2DEnabled) {
        customSection.classList.remove('hidden');
      } else {
        customSection.classList.add('hidden');
      }
    }

    // Wishlist Heart State
    this.updateWishlistButton();

    // Gallery images
    const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (images.length === 0 && p.image) images.push(p.image);
    const mainImg = document.getElementById('detailMainImage');
    const mainImgUnavailable = document.getElementById('detailImageUnavailable');
    if (mainImg) {
      mainImg.hidden = images.length === 0;
      if (mainImgUnavailable) mainImgUnavailable.hidden = images.length > 0;
      if (images.length > 0) {
        mainImg.src = images[0];
        mainImg.onerror = function () {
          mainImg.hidden = true;
          if (mainImgUnavailable) mainImgUnavailable.hidden = false;
        };
      }
      mainImg.alt = p.name;
    }

    const thumbsContainer = document.getElementById('detailThumbsContainer');
    if (thumbsContainer) {
      thumbsContainer.innerHTML = images.map((imgUrl, idx) => `
        <button
          type="button"
          onclick="DetailView.switchImage('${imgUrl}', this)"
          class="gallery-thumb-btn w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-white shadow-sm cursor-pointer ${idx === 0 ? 'border-[#000f22] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}"
        >
          <img class="w-full h-full object-cover" src="${imgUrl}" alt="Ảnh ${idx + 1}" />
        </button>
      `).join('');
    }

    // Related Products Grid
    const relatedGrid = document.getElementById('relatedProductsGrid');
    if (relatedGrid && relatedList.length > 0) {
      relatedGrid.innerHTML = relatedList.map(item => ProductComponent.renderCard(item)).join('');
    }

    // Tải và hiển thị đánh giá feedback từ khách hàng
    this.loadProductReviews(p._id);
  },

  loadProductReviews: function (productId) {
    const grid = document.getElementById('productReviewsGrid');
    if (!grid) return;

    if (typeof ApiService !== 'undefined' && typeof ApiService.getReviewsByProduct === 'function') {
      ApiService.getReviewsByProduct(productId, (err, res) => {
        if (err || !res || !res.success) {
          grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-stone-500">Chưa có đánh giá nào cho tác phẩm này. Hãy là người đầu tiên gửi cảm nhận!</div>';
          return;
        }

        const reviews = res.data || [];
        const stats = res.stats || {};
        this.renderReviewsSummary(stats, reviews);
        this.renderReviewsGrid(reviews);
      });
    }
  },

  renderReviewsSummary: function (stats, reviews) {
    const avg = stats.averageRating !== undefined ? Number(stats.averageRating).toFixed(1) : '5.0';
    const total = stats.totalReviews !== undefined ? stats.totalReviews : reviews.length;
    const breakdown = stats.breakdown || {};

    const avgEl = document.getElementById('reviewSummaryAverage');
    if (avgEl) avgEl.innerText = avg;

    const starsEl = document.getElementById('reviewSummaryStars');
    if (starsEl) {
      const fullStars = Math.round(Number(avg));
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        const isFilled = i <= fullStars;
        starsHtml += `<span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${isFilled ? 1 : 0};">star</span>`;
      }
      starsEl.innerHTML = starsHtml;
    }

    const descEl = document.getElementById('reviewSummaryTotalDesc');
    if (descEl) {
      descEl.innerText = `(DỰA TRÊN ${total} ĐÁNH GIÁ ĐÃ XÁC THỰC)`;
    }

    // Breakdown bars
    const b5 = breakdown[5] || 0;
    const b4 = breakdown[4] || 0;
    const b3 = breakdown[3] || 0;
    const pct5 = total > 0 ? Math.round((b5 / total) * 100) : 100;
    const pct4 = total > 0 ? Math.round((b4 / total) * 100) : 0;
    const pct3 = total > 0 ? Math.round((b3 / total) * 100) : 0;

    const bar5 = document.getElementById('bar5Star');
    const bar4 = document.getElementById('bar4Star');
    const bar3 = document.getElementById('bar3Star');
    const p5 = document.getElementById('pct5Star');
    const p4 = document.getElementById('pct4Star');
    const p3 = document.getElementById('pct3Star');

    if (bar5) bar5.style.width = pct5 + '%';
    if (bar4) bar4.style.width = pct4 + '%';
    if (bar3) bar3.style.width = pct3 + '%';
    if (p5) p5.innerText = pct5 + '%';
    if (p4) p4.innerText = pct4 + '%';
    if (p3) p3.innerText = pct3 + '%';

    // Cập nhật rating trên đầu chi tiết sản phẩm nếu có
    const detailScore = document.getElementById('detailRatingScore');
    const detailCount = document.getElementById('detailReviewCount');
    if (detailScore) detailScore.innerText = avg;
    if (detailCount) detailCount.innerText = total > 0 ? `(${total} đánh giá)` : '(Chưa có đánh giá)';
  },

  renderReviewsGrid: function (reviews) {
    const grid = document.getElementById('productReviewsGrid');
    if (!grid) return;

    if (!reviews || reviews.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-10 text-center bg-white rounded-xl border border-[#EBEAE5] p-6">
          <span class="material-symbols-outlined text-4xl text-[#74777e] mb-2 block">rate_review</span>
          <p class="font-['Playfair_Display',serif] text-base font-semibold text-[#000f22]">Chưa có hồi âm đánh giá cho tác phẩm này</p>
          <p class="font-['Plus_Jakarta_Sans',sans-serif] text-xs text-[#74777e] mt-1">Kính mời quý thượng khách đã sở hữu gửi cảm nhận giám tuyển đầu tiên.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = reviews.map(r => {
      const name = r.customerName || 'Nhà Sưu Tầm';
      const initial = name.trim().charAt(0).toUpperCase();
      const rating = Number(r.rating || 5);
      const comment = r.comment || 'Tác phẩm gốm sứ chế tác rất tinh xảo, giao hàng đóng gói cẩn trọng.';
      
      let dateStr = 'Gần đây';
      try {
        if (r.createdAt) {
          const d = new Date(r.createdAt);
          const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) dateStr = `${Math.max(1, diffDays)} ngày trước`;
          else if (diffDays <= 30) dateStr = `${Math.floor(diffDays / 7)} tuần trước`;
          else dateStr = `${Math.floor(diffDays / 30)} tháng trước`;
        }
      } catch (e) {}

      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        const isF = i <= rating;
        starsHtml += `<span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' ${isF ? 1 : 0};">star</span>`;
      }

      return `
        <div class="bg-white rounded-xl border border-[#EBEAE5] p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center text-amber-500 gap-0.5">
                ${starsHtml}
              </div>
              <span class="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] text-[#74777e] uppercase font-medium tracking-wider">${dateStr}</span>
            </div>
            <p class="font-['Plus_Jakarta_Sans',sans-serif] text-xs sm:text-[13px] text-[#000f22] italic leading-relaxed line-clamp-4">
              "${escapeProductText(comment)}"
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-[#EBEAE5]/60 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-[#f3f4f5] text-[#000f22] font-semibold text-xs flex items-center justify-center shrink-0">
              ${initial}
            </div>
            <div class="min-w-0">
              <h4 class="font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#000f22] truncate">${escapeProductText(name)}</h4>
              <p class="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] text-[#a23e18] flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">verified</span>
                <span>Đã mua hàng xác thực</span>
              </p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  switchImage: function (imgUrl, btnEl) {
    const mainImg = document.getElementById('detailMainImage');
    if (mainImg) mainImg.src = imgUrl;

    document.querySelectorAll('.gallery-thumb-btn').forEach(btn => {
      btn.classList.remove('border-[#000f22]', 'opacity-100');
      btn.classList.add('border-transparent', 'opacity-60');
    });
    if (btnEl) {
      btnEl.classList.remove('border-transparent', 'opacity-60');
      btnEl.classList.add('border-[#000f22]', 'opacity-100');
    }
  },

  increaseQty: function () {
    if (!this.currentProduct) return;
    if (this.currentProduct.status === 'inactive') {
      showCartNotification('Tác phẩm này đã ngừng kinh doanh!', 'warning', 'do_not_disturb_on');
      return;
    }
    const maxStock = (typeof this.currentProduct.stock === 'number') ? this.currentProduct.stock : 0;
    if (maxStock <= 0) {
      showCartNotification('Tác phẩm này hiện đã hết hàng trong kho!', 'warning', 'remove_shopping_cart');
      return;
    }
    if (this.quantity >= maxStock) {
      showCartNotification(`Số lượng sản phẩm trong kho không đủ (chỉ còn ${maxStock} chiếc)`, 'warning', 'inventory_2');
      return;
    }
    this.quantity += 1;
    const input = document.getElementById('detailQtyInput');
    if (input) input.value = this.quantity;
  },

  decreaseQty: function () {
    const maxStock = (this.currentProduct && typeof this.currentProduct.stock === 'number') ? this.currentProduct.stock : 0;
    if (this.currentProduct && this.currentProduct.status === 'inactive') {
      this.quantity = 0;
      const input = document.getElementById('detailQtyInput');
      if (input) input.value = '0';
      return;
    }
    if (maxStock <= 0) {
      this.quantity = 0;
      const input = document.getElementById('detailQtyInput');
      if (input) input.value = '0';
      return;
    }
    if (this.quantity > 1) {
      this.quantity -= 1;
      const input = document.getElementById('detailQtyInput');
      if (input) input.value = this.quantity;
    }
  },

  addToCart: function () {
    if (!this.currentProduct) return;
    const product = this.currentProduct;
    if (product.status === 'inactive') {
      showCartNotification('Tác phẩm này hiện đã ngừng kinh doanh, không thể thêm vào giỏ chế tác!', 'warning', 'do_not_disturb_on');
      return;
    }
    const stock = (typeof product.stock === 'number') ? product.stock : 0;
    if (stock <= 0) {
      showCartNotification('Tác phẩm này hiện đã hết hàng trong kho, không thể thêm vào giỏ chế tác!', 'warning', 'remove_shopping_cart');
      return;
    }
    if (this.quantity > stock) {
      showCartNotification(`Số lượng yêu cầu (${this.quantity}) vượt quá tồn kho hiện có (${stock} chiếc)!`, 'warning', 'inventory_2');
      return;
    }
    requireAuthAction(function () {
      ApiService.addToCart(window.currentUser._id, product._id, DetailView.quantity, function (err, res) {
        if (err || !res || !res.success) {
          showCartNotification((res && res.message) || err || 'Không thể thêm sản phẩm vào giỏ hàng', 'warning', 'remove_shopping_cart');
          return;
        }
        if (window.CartView) window.CartView.updateCount(res.data);
        showCartNotification(`Đã thêm sản phẩm "${product.name}" vào giỏ hàng thành công!`);
      });
    });
  },

  toggleFavorite: function () {
    if (!this.currentProduct) return;
    const btn = document.getElementById('btnDetailFavorite');
    ProductComponent.toggleFavorite(this.currentProduct._id, btn);
    setTimeout(() => this.updateWishlistButton(), 300);
  },

  updateWishlistButton: function () {
    if (!this.currentProduct) return;
    const inWishlist = isProductInWishlist(this.currentProduct._id);
    const icon = document.getElementById('detailHeartIcon');
    const btn = document.getElementById('btnDetailFavorite');
    if (icon) {
      icon.innerText = inWishlist ? 'favorite' : 'favorite_border';
      icon.style.color = inWishlist ? '#dc2626' : '';
      icon.style.fontVariationSettings = inWishlist ? "'FILL' 1" : "'FILL' 0";
    }
    if (btn) {
      if (inWishlist) {
        btn.classList.add('text-red-600', 'border-red-300');
        btn.classList.remove('text-[#a23e18]', 'text-stone-400');
      } else {
        btn.classList.remove('text-red-600', 'border-red-300');
        btn.classList.add('text-[#a23e18]');
      }
    }
  }
};

const CartView = {
  countRequestId: 0,
  pendingItemChanges: new Set(),

  changeItem: function (productId, method, quantity) {
    if (!window.currentUser || !window.currentUser._id) return;
    if (CartView.pendingItemChanges.has(productId)) return;
    CartView.pendingItemChanges.add(productId);
    document.querySelectorAll(`[data-cart-product="${productId}"]`).forEach(control => {
      control.disabled = true;
    });
    const userId = encodeURIComponent(window.currentUser._id);
    const safeProductId = encodeURIComponent(productId);
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_BASE}/cart/${userId}/items/${safeProductId}`, true);
    if (method === 'PATCH') xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      let res;
      try {
        res = JSON.parse(xhr.responseText);
      } catch (error) {
        CartView.pendingItemChanges.delete(productId);
        showCartNotification('Không thể đọc phản hồi khi cập nhật giỏ hàng', 'warning');
        CartView.loadCart();
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !res || !res.success) {
        CartView.pendingItemChanges.delete(productId);
        showCartNotification((res && res.message) || 'Không thể cập nhật giỏ hàng', 'warning');
        CartView.loadCart();
        return;
      }
      CartView.pendingItemChanges.delete(productId);
      CartView.updateCount(res.data);
      CartView.loadCart();
    };
    xhr.onerror = function () {
      CartView.pendingItemChanges.delete(productId);
      showCartNotification('Không thể kết nối máy chủ để cập nhật giỏ hàng', 'warning');
      CartView.loadCart();
    };
    xhr.send(method === 'PATCH' ? JSON.stringify({ quantity }) : null);
  },

  setQuantity: function (productId, quantity) {
    const nextQuantity = Number(quantity);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) return;
    CartView.changeItem(productId, 'PATCH', nextQuantity);
  },

  removeItem: function (productId) {
    CartView.changeItem(productId, 'DELETE');
  },

  refreshCount: function () {
    if (!window.currentUser || !window.currentUser._id) {
      CartView.updateCount({ items: [] });
      return;
    }
    const requestId = ++CartView.countRequestId;
    ApiService.getCart(window.currentUser._id, function (err, res) {
      if (err || !res || !res.success) {
        console.error('Lỗi tải số lượng giỏ hàng:', err || (res && res.message));
        return;
      }
      if (requestId === CartView.countRequestId) CartView.updateCount(res.data);
    });
  },

  updateCount: function (cart) {
    CartView.countRequestId += 1;
    const count = (cart && cart.items || []).reduce((total, item) => total + (item.quantity || 0), 0);
    const countEl = document.getElementById('navbar-cart-count');
    if (countEl) countEl.textContent = String(count);
  },

  loadCart: function () {
    const list = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const emptyEl = document.getElementById('cartEmpty');
    if (!list) return;

    // Tự động khôi phục currentUser từ localStorage nếu bị rỗng
    if (!window.currentUser || !window.currentUser._id) {
      try {
        const saved = localStorage.getItem('craftory_user');
        if (saved) window.currentUser = JSON.parse(saved);
      } catch (e) {}
    }

    if (!window.currentUser || !window.currentUser._id) {
      list.innerHTML = '<p class="py-12 text-center text-[#74777e]">Vui lòng đăng nhập để xem giỏ hàng.</p>';
      return;
    }

    list.innerHTML = '<p class="py-12 text-center text-[#74777e]">Đang tải giỏ hàng...</p>';
    ApiService.getCart(window.currentUser._id, function (err, res) {
      if (err || !res || !res.success) {
        list.innerHTML = `<p class="py-12 text-center text-red-700">${escapeProductText((res && res.message) || err || 'Không thể tải giỏ hàng')}</p>`;
        return;
      }
      const items = (res.data && res.data.items || []).filter(item => item.productId);
      CartView.updateCount(res.data);
      if (emptyEl) emptyEl.hidden = items.length > 0;
      if (!items.length) {
        list.innerHTML = '';
        if (totalEl) totalEl.textContent = '0₫';
        return;
      }

      // Đọc các snapshot thiết kế 2D đã lưu
      let customDesigns = {};
      try {
        customDesigns = JSON.parse(localStorage.getItem('craftory_custom_designs') || '{}');
      } catch (e) {}

      list.innerHTML = items.map(item => {
        const product = item.productId;
        const productId = escapeProductText(product._id);
        const customInfo = customDesigns[product._id];
        const isCustom2D = !!customInfo;

        const displayName = isCustom2D ? customInfo.designName : product.name;
        const displayImage = isCustom2D && customInfo.blankImage ? customInfo.blankImage : (product.image || (product.images && product.images[0]) || '');
        const unitPrice = isCustom2D && customInfo.price ? customInfo.price : (item.unitPrice || 0);
        const subtotal = unitPrice * item.quantity;

        return `<article class="flex flex-col gap-4 border-b border-[#EBEAE5] py-5 sm:flex-row sm:items-center">
          <div class="h-24 w-20 shrink-0 rounded-lg bg-[#f3f4f5] p-2 relative flex items-center justify-center overflow-hidden">
            ${displayImage ? `<img class="h-full w-full object-contain" src="${escapeProductText(displayImage)}" alt="${escapeProductText(displayName)}">` : ''}
            ${isCustom2D && customInfo.motifImage ? `<img class="absolute w-10 h-10 object-contain pointer-events-none" style="mix-blend-mode: multiply;" src="${escapeProductText(customInfo.motifImage)}" alt="Họa tiết">` : ''}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="font-semibold text-[#000f22]">${escapeProductText(displayName)}</h2>
              ${isCustom2D ? `<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#0a2540] text-white tracking-wider uppercase">Tác chế 2D</span>` : ''}
            </div>

            ${isCustom2D ? `
              <div class="mt-1 flex flex-col gap-0.5 text-xs text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-200/60 max-w-md">
                <div class="flex items-center gap-1.5"><span class="text-stone-400">Phôi:</span> <strong class="text-stone-700">${escapeProductText(customInfo.blankName)}</strong></div>
                <div class="flex items-center gap-1.5"><span class="text-stone-400">Họa tiết:</span> <strong class="text-stone-700">${escapeProductText(customInfo.motifName)}</strong></div>
                ${customInfo.engravingText ? `<div class="flex items-center gap-1.5"><span class="text-stone-400">Khắc chữ:</span> <span class="font-bold text-[#a23e18] font-serif">"${escapeProductText(customInfo.engravingText)}"</span></div>` : ''}
              </div>
            ` : ''}

            <p class="mt-1.5 text-sm text-[#74777e]">${unitPrice.toLocaleString('vi-VN')}₫ / sản phẩm</p>
            <div class="mt-3 flex flex-wrap items-center gap-3">
              <div class="inline-flex h-9 items-center overflow-hidden rounded-lg border border-[#EBEAE5]" aria-label="Điều chỉnh số lượng">
                <button type="button" data-cart-product="${productId}" onclick="CartView.setQuantity('${productId}', ${item.quantity - 1})" ${item.quantity <= 1 || CartView.pendingItemChanges.has(product._id) ? 'disabled' : ''} aria-label="Giảm số lượng" class="h-full w-9 text-lg text-[#000f22] hover:bg-[#f3f4f5] disabled:cursor-not-allowed disabled:opacity-40">−</button>
                <span class="min-w-9 text-center text-sm font-semibold" aria-live="polite">${item.quantity}</span>
                <button type="button" data-cart-product="${productId}" onclick="CartView.setQuantity('${productId}', ${item.quantity + 1})" ${CartView.pendingItemChanges.has(product._id) ? 'disabled' : ''} aria-label="Tăng số lượng" class="h-full w-9 text-lg text-[#000f22] hover:bg-[#f3f4f5] disabled:cursor-not-allowed disabled:opacity-40">+</button>
              </div>
              <button type="button" data-cart-product="${productId}" onclick="CartView.removeItem('${productId}')" ${CartView.pendingItemChanges.has(product._id) ? 'disabled' : ''} class="inline-flex items-center gap-1 text-sm font-medium text-[#a23e18] hover:underline disabled:cursor-not-allowed disabled:opacity-40">
                <span class="material-symbols-outlined text-base" aria-hidden="true">delete</span>Xóa
              </button>
            </div>
          </div>
          <strong class="shrink-0 text-[#a23e18]">${subtotal.toLocaleString('vi-VN')}₫</strong>
        </article>`;
      }).join('');
      const total = items.reduce((sum, item) => {
        const customInfo = customDesigns[item.productId._id];
        const unitPrice = customInfo && customInfo.price ? customInfo.price : (item.unitPrice || 0);
        return sum + unitPrice * item.quantity;
      }, 0);
      const formattedTotal = `${total.toLocaleString('vi-VN')}₫`;
      if (totalEl) totalEl.textContent = formattedTotal;
      const finalTotalEl = document.getElementById('cartFinalTotal');
      if (finalTotalEl) finalTotalEl.textContent = formattedTotal;
    });
  }
};

window.CartView = CartView;

// ==========================================
// WISHLIST VIEW CONTROLLER (Mục yêu thích - UC-C10)
// ==========================================
const WishlistView = {
  quantities: Object.create(null),
  productsById: Object.create(null),

  init: function () {
    this.loadWishlist();
  },

  setQuantity: function (productId, quantity, stock) {
    const maxQuantity = Math.max(1, Number(stock) || 1);
    const requestedQuantity = Math.floor(Number(quantity)) || 1;
    const nextQuantity = Math.max(1, Math.min(maxQuantity, requestedQuantity));
    this.quantities[productId] = nextQuantity;
    const input = document.getElementById(`wishlist-quantity-${productId}`);
    if (input) input.value = String(nextQuantity);
    const incrementButton = document.getElementById(`wishlist-increment-${productId}`);
    if (incrementButton) incrementButton.disabled = nextQuantity >= maxQuantity;
  },

  changeQuantity: function (productId, delta, stock) {
    this.setQuantity(productId, (this.quantities[productId] || 1) + delta, stock);
  },

  addToCart: function (productId) {
    if (!window.currentUser || !window.currentUser._id) {
      dieuHuong('login');
      return;
    }
    const product = this.productsById[productId];
    if (!product || !product._id) return;
    const stock = typeof product.stock === 'number' ? product.stock : 0;
    if (stock <= 0) {
      showCartNotification('Tác phẩm này hiện đã hết hàng trong kho, không thể thêm vào giỏ hàng!', 'warning', 'remove_shopping_cart');
      return;
    }
    const quantity = this.quantities[product._id] || 1;
    if (quantity > stock) {
      showCartNotification(`Số lượng yêu cầu (${quantity}) vượt quá tồn kho hiện có (${stock} chiếc)!`, 'warning', 'inventory_2');
      return;
    }
    ApiService.addToCart(window.currentUser._id, product._id, quantity, function (err, res) {
      if (err || !res || !res.success) {
        showCartNotification((res && res.message) || err || 'Không thể thêm sản phẩm vào giỏ hàng', 'warning', 'remove_shopping_cart');
        return;
      }
      CartView.updateCount(res.data);
      showCartNotification(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`);
    });
  },

  removeProduct: function (productId) {
    if (!window.currentUser || !window.currentUser._id) return;
    ApiService.toggleWishlist(window.currentUser._id, productId, function (err, res) {
      if (err || !res || !res.success) {
        showCartNotification((res && res.message) || err || 'Không thể xóa sản phẩm khỏi yêu thích', 'warning', 'error');
        return;
      }
      window.currentUser = res.data;
      localStorage.setItem('craftory_user', JSON.stringify(window.currentUser));
      updateWishlistBadges();
      WishlistView.loadWishlist();
    });
  },

  renderWishlist: function (items) {
    const grid = document.getElementById('wishlistGrid');
    if (!grid) return;
    this.productsById = Object.create(null);
    grid.innerHTML = items.map(product => {
      this.productsById[product._id] = product;
      const productId = escapeProductText(product._id);
      const name = escapeProductText(product.name);
      const imageUrl = product.image || (product.images && product.images[0]) || '';
      const stock = Math.max(0, Number(product.stock) || 0);
      const quantity = Math.min(this.quantities[product._id] || 1, Math.max(1, stock));
      this.quantities[product._id] = quantity;
      return `<article class="flex flex-col overflow-hidden rounded-xl border border-[#EBEAE5] bg-white shadow-sm">
        <button type="button" onclick="ProductComponent.viewDetail('${productId}')" class="relative aspect-[4/3] w-full bg-[#f3f4f5] p-4 text-left">
          ${imageUrl ? `<img src="${escapeProductText(imageUrl)}" alt="${name}" class="h-full w-full object-contain">` : '<span class="material-symbols-outlined flex h-full items-center justify-center text-4xl text-[#74777e]" aria-hidden="true">image_not_supported</span>'}
        </button>
        <div class="flex flex-1 flex-col p-4">
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a23e18]">${escapeProductText(product.collectionName || (product.categoryId && product.categoryId.name) || '')}</p>
          <h2 class="line-clamp-2 min-h-12 font-['Playfair_Display',serif] text-lg font-semibold text-[#000f22]">${name}</h2>
          <p class="mt-2 text-base font-bold text-[#a23e18]">${(product.price || 0).toLocaleString('vi-VN')}₫</p>
          <p class="mt-1 text-xs ${stock ? 'text-[#74777e]' : 'text-red-700'}">${stock ? `Còn ${stock} sản phẩm` : 'Tạm hết hàng'}</p>
          <label class="mt-4 text-xs font-semibold text-[#43474d]" for="wishlist-quantity-${productId}">Số lượng muốn thêm</label>
          <div class="mt-1 flex h-10 items-center overflow-hidden rounded-lg border border-[#EBEAE5]">
            <button type="button" onclick="WishlistView.changeQuantity('${productId}', -1, ${stock})" aria-label="Giảm số lượng" class="h-full w-10 text-lg hover:bg-[#f3f4f5]">−</button>
            <input id="wishlist-quantity-${productId}" type="number" min="1" max="${stock}" value="${quantity}" onchange="WishlistView.setQuantity('${productId}', this.value, ${stock})" class="h-full min-w-0 flex-1 border-x border-[#EBEAE5] text-center text-sm font-semibold focus:outline-none" ${stock ? '' : 'disabled'}>
            <button id="wishlist-increment-${productId}" type="button" onclick="WishlistView.changeQuantity('${productId}', 1, ${stock})" aria-label="Tăng số lượng" ${quantity >= stock ? 'disabled' : ''} class="h-full w-10 text-lg hover:bg-[#f3f4f5] disabled:cursor-not-allowed disabled:opacity-40">+</button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-2">
            <button type="button" onclick="WishlistView.addToCart('${productId}')" ${stock ? '' : 'disabled'} class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#000f22] px-3 text-sm font-semibold text-white hover:bg-[#10162B] disabled:cursor-not-allowed disabled:opacity-50">
              <span class="material-symbols-outlined text-lg" aria-hidden="true">shopping_bag</span>Thêm vào giỏ hàng
            </button>
            <button type="button" onclick="WishlistView.removeProduct('${productId}')" class="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-[#EBEAE5] text-sm font-medium text-[#a23e18] hover:bg-[#f8f9fa]">
              <span class="material-symbols-outlined text-base" aria-hidden="true">delete</span>Xóa khỏi yêu thích
            </button>
          </div>
        </div>
      </article>`;
    }).join('');
  },

  loadWishlist: function () {
    const grid = document.getElementById('wishlistGrid');
    const emptyBox = document.getElementById('wishlistEmpty');
    const countEl = document.getElementById('wishlistCount');

    if (!window.currentUser || !window.currentUser._id) {
      if (grid) {
        grid.innerHTML = `
          <div class="col-span-full py-20 text-center">
            <span class="material-symbols-outlined text-5xl text-[#a23e18] mb-3 block">lock</span>
            <h3 class="font-['Playfair_Display',serif] text-xl font-bold text-[#000f22] mb-2">Yêu cầu đăng nhập</h3>
            <p class="font-['Plus_Jakarta_Sans',sans-serif] text-sm text-[#74777e] mb-4">
              Kính xin quý khách đăng nhập để mở xem danh sách tác phẩm gốm sứ đã lưu giữ.
            </p>
            <button onclick="dieuHuong('login')" class="px-5 py-2.5 rounded-lg bg-[#000f22] text-white text-xs font-semibold hover:bg-[#10162B]">
              Đăng nhập ngay
            </button>
          </div>
        `;
      }
      return;
    }

    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-[#74777e]">
          <span class="material-symbols-outlined text-4xl animate-spin text-[#a23e18] mb-2 block">progress_activity</span>
          <p class="font-['Plus_Jakarta_Sans',sans-serif] text-sm">Đang tải danh sách tác phẩm yêu thích...</p>
        </div>
      `;
    }

    ApiService.getWishlist(window.currentUser._id, (err, res) => {
      if (err || !res || !res.success) {
        if (grid) grid.innerHTML = `<div class="col-span-full py-12 text-center text-sm text-red-700">${escapeProductText((res && res.message) || err || 'Không thể tải danh sách yêu thích')}</div>`;
        return;
      }
      const items = res.data || [];

      updateWishlistBadges(items.length);

      if (items.length === 0) {
        if (grid) grid.innerHTML = '';
        if (emptyBox) emptyBox.classList.remove('hidden');
      } else {
        if (emptyBox) emptyBox.classList.add('hidden');
        WishlistView.renderWishlist(items);
      }
    });
  }
};

const CollectionDetailView = {
  init: function (selection = {}) {
    const title = document.getElementById('collectionDetailTitle');
    const breadcrumb = document.getElementById('collectionDetailBreadcrumb');
    const subtitle = document.getElementById('collectionDetailDescription');
    const image = document.getElementById('collectionDetailImage');
    const grid = document.getElementById('collectionProductsGrid');
    const count = document.getElementById('collectionDetailCount');

    let collectionId = selection.collectionId || '';
    let name = selection.collectionName || '';

    // Khôi phục từ sessionStorage nếu người dùng nhấn F5 refresh trang
    if (!collectionId && !name) {
      try {
        const saved = JSON.parse(sessionStorage.getItem('craftory_last_collection') || '{}');
        collectionId = saved.collectionId || '';
        name = saved.collectionName || '';
      } catch (e) {}
    }

    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full py-12 text-center text-[#74777e]">Đang tải sản phẩm của bộ sưu tập...</div>';

    ApiService.getCollections((collectionError, collectionResponse) => {
      if (collectionError || !collectionResponse || !collectionResponse.success || !Array.isArray(collectionResponse.data)) {
        if (title) title.textContent = 'Bộ sưu tập tuyển chọn';
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-red-700">Không tải được thông tin bộ sưu tập.</div>';
        return;
      }

      // Tìm bộ sưu tập theo ID hoặc Name, nếu không thấy thì tự động lấy bộ sưu tập đầu tiên
      let collection = collectionResponse.data.find(item =>
        (collectionId && item._id === collectionId) ||
        (name && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())
      );

      if (!collection && collectionResponse.data.length > 0) {
        collection = collectionResponse.data[0];
      }

      if (!collection) {
        if (title) title.textContent = 'Bộ sưu tập tuyển chọn';
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-red-700">Chưa có bộ sưu tập nào khả dụng.</div>';
        return;
      }

      // Lưu lại để F5 không bị mất
      try {
        sessionStorage.setItem('craftory_last_collection', JSON.stringify({ collectionId: collection._id, collectionName: collection.name }));
      } catch (e) {}

      const resolvedName = collection.name || 'Bộ sưu tập tuyển chọn';
      if (title) title.textContent = resolvedName;
      if (breadcrumb) breadcrumb.textContent = resolvedName;
      if (subtitle) subtitle.textContent = collection.description || `Các tác phẩm thuộc bộ sưu tập ${resolvedName}.`;

      const imgUrl = collection.imageUrl || collection.image || '';
      if (image) {
        if (imgUrl) {
          image.src = imgUrl;
          image.alt = resolvedName;
          image.hidden = false;
        } else {
          image.hidden = true;
        }
        image.onerror = function () {
          image.hidden = true;
        };
      }
      if (count) count.textContent = `${collection.productCount || 0} tác phẩm`;

      const params = { limit: 0, source: 'verified', collectionId: collection._id };
      ApiService.getProducts(params, (productError, productResponse) => {
        if (productError || !productResponse || !productResponse.success || !Array.isArray(productResponse.data)) {
          grid.innerHTML = '<div class="col-span-full py-12 text-center text-red-700">Không tải được sản phẩm thuộc bộ sưu tập.</div>';
          return;
        }
        if (count) count.textContent = `${productResponse.pagination ? productResponse.pagination.total : productResponse.data.length} tác phẩm`;
        grid.innerHTML = productResponse.data.length
          ? productResponse.data.map(product => ProductComponent.renderCard(product)).join('')
          : '<div class="col-span-full py-12 text-center text-[#74777e]">Bộ sưu tập này chưa có sản phẩm đã xác minh trong cơ sở dữ liệu.</div>';
      });
    });
  }
};

// ==========================================
// CÁC HÀM KHỞI TẠO TƯƠNG ỨNG KHI ĐIỀU HƯỚNG VIEW
// ==========================================
window.khoiTaoTrangShop = function (param) {
  ShopView.init(param || {});
};

window.khoiTaoTrangProductDetail = function (param) {
  const prodId = param || window.selectedProductId;
  DetailView.init(prodId);
};

window.khoiTaoTrangWishlist = function () {
  WishlistView.init();
};

window.khoiTaoTrangBoSuuTap = function () {
  ProductComponent.loadAllCollections();
};

window.khoiTaoChiTietBoSuuTap = function (selection) {
  CollectionDetailView.init(selection || {});
};

window.ProductComponent = ProductComponent;
window.ShopView = ShopView;
window.DetailView = DetailView;
window.WishlistView = WishlistView;
window.CollectionDetailView = CollectionDetailView;
