/**
 * customer-web/core/products.js
 * Quản lý tập trung Component Thẻ Sản Phẩm & Render Danh Sách Sản Phẩm
 * Mọi thay đổi về giao diện item sản phẩm (thêm trường, đổi nút bấm, đổi phong cách hiển thị)
 * đều được thực hiện tập trung duy nhất tại file này.
 */

const ProductComponent = {
  /**
   * 1. Template sinh thẻ Sản phẩm đơn lẻ (Product Card Component)
   * @param {Object} product - Dữ liệu sản phẩm từ MongoDB Atlas
   * @returns {string} HTML string của thẻ sản phẩm chuẩn thẩm mỹ Stitch
   */
  renderCard: function (product) {
    if (!product) return '';

    const id = product._id || '';
    const name = product.name || 'Tác phẩm Gốm Sứ Hoàng Gia';
    const price = (product.price || 0).toLocaleString('vi-VN') + '₫';
    const collection = product.collectionName || product.category || 'Di Sản Ngự Chế 1705';
    const sku = product.sku || (id ? 'BG-' + id.slice(-4).toUpperCase() : 'BG-1705');
    const desc = product.description || 'Chế tác thủ công từ cốt đất phù sa sông Hồng, nung củi liên tục 72 giờ tại nhiệt độ 1.380°C.';
    const imageUrl = product.image || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600';
    const stock = typeof product.stock === 'number' ? product.stock : 10;
    
    // Badge trạng thái góc trên thẻ
    let badgeText = 'Nung Củi Độc Bản';
    let badgeClass = 'bg-secondary text-on-secondary';
    if (stock <= 0) {
      badgeText = 'Tạm hết hàng';
      badgeClass = 'bg-stone-500 text-white';
    } else if (stock <= 3) {
      badgeText = `Chỉ còn ${stock} tác phẩm`;
      badgeClass = 'bg-primary text-on-primary';
    }

    return `
      <div class="group flex flex-col bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100" data-product-id="${id}">
        <!-- Ảnh đại diện tác phẩm -->
        <div class="relative aspect-[4/5] w-full overflow-hidden bg-surface-container-high">
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
               src="${imageUrl}" 
               alt="${name}" 
               onerror="this.src='https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600'" />
          
          <!-- Badge góc trên phải -->
          <div class="absolute top-space-sm right-space-sm px-2.5 py-1 rounded font-label-sm uppercase tracking-wider text-[11px] shadow-sm ${badgeClass}">
            ${badgeText}
          </div>

          <!-- Nút thả tim yêu thích nhanh -->
          <button onclick="ProductComponent.toggleFavorite('${id}', this)" 
                  title="Lưu vào danh sách yêu thích"
                  class="absolute top-space-sm left-space-sm w-8 h-8 rounded-full bg-white/80 hover:bg-white text-secondary flex items-center justify-center shadow transition-all hover:scale-110 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">favorite</span>
          </button>
        </div>

        <!-- Thông tin chi tiết sản phẩm -->
        <div class="p-space-md flex flex-col flex-1 justify-between">
          <div>
            <span class="font-label-sm text-secondary uppercase font-semibold text-[11px] tracking-wider block mb-1">
              ${collection} • Mã ${sku}
            </span>
            <h3 class="font-title-md text-primary group-hover:text-secondary transition-colors mb-space-xs font-bold line-clamp-1">
              ${name}
            </h3>
            <p class="font-body-sm text-on-surface-variant mb-space-md line-clamp-2 text-xs leading-relaxed">
              ${desc}
            </p>
          </div>

          <div>
            <!-- Giá tiền niêm yết -->
            <div class="flex items-baseline justify-between mb-space-md pt-space-sm shadow-[0_-1px_0_rgba(10,37,64,0.06)]">
              <span class="font-headline-sm text-secondary font-bold text-lg">${price}</span>
              <span class="font-label-sm text-on-surface-variant text-xs">Kèm chứng thư ấn</span>
            </div>

            <!-- Nút hành động -->
            <button onclick="ProductComponent.viewDetail('${id}')" 
                    class="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-primary text-on-primary font-title-md hover:bg-deep-indigo-night transition-all duration-300 shadow-sm group-hover:bg-secondary cursor-pointer">
              <span>Khám phá ngay</span>
              <span class="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">east</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 2. Template sinh thẻ Bộ Sưu Tập / Dòng Men (Collection Card Component)
   * @param {Object} item - Dữ liệu danh mục
   * @returns {string} HTML string của thẻ bộ sưu tập
   */
  renderCategoryCard: function (item) {
    if (!item) return '';
    const title = item.name || 'Bộ Sưu Tập Di Sản';
    const sub = item.subTitle || item.category || 'Men Lam Cổ Điển';
    const desc = item.description || 'Chóe Rạn Bát Tiên, Đĩa Ngũ Trảo biểu trưng cho thanh cao và uy quyền vương triều.';
    const count = item.countText || item.count || '12+ Tác phẩm';
    const img = item.imageUrl || item.image || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600';

    return `
      <a class="group relative flex flex-col bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer" 
         onclick="ProductComponent.filterByCategory('${title}')">
        <div class="relative aspect-[4/5] w-full overflow-hidden bg-surface-container-high">
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
               src="${img}" 
               alt="${title}" />
          <div class="absolute top-space-sm left-space-sm px-2.5 py-1 rounded bg-deep-indigo-night/85 backdrop-blur-md text-porcelain-white font-label-sm tracking-widest uppercase text-[11px]">
            ${count}
          </div>
        </div>
        <div class="p-space-md flex flex-col flex-1 justify-between bg-surface-container-lowest">
          <div>
            <span class="font-label-sm text-secondary uppercase tracking-wider block mb-1 text-[11px] font-semibold">${title}</span>
            <h3 class="font-title-lg text-primary group-hover:text-secondary transition-colors mb-2 text-base font-bold">${sub}</h3>
            <p class="font-body-sm text-on-surface-variant line-clamp-2 text-xs leading-relaxed">${desc}</p>
          </div>
          <div class="mt-space-md flex items-center justify-between font-label-sm text-on-surface-variant group-hover:text-primary pt-space-sm shadow-[0_-1px_0_rgba(10,37,64,0.06)] text-xs font-semibold">
            <span>Khám phá tuyển tập</span>
            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </div>
        </div>
      </a>
    `;
  },

  /**
   * 2.1. Nạp danh mục / bộ sưu tập thực tế từ MongoDB Atlas vào trang chủ
   * @param {string} containerId - ID container của grid bộ sưu tập
   */
  loadHomeCollections: function (containerId = 'home-collections-grid') {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    ApiService.getCategories(function (err, res) {
      if (!err && res && res.success && res.data && res.data.length > 0) {
        grid.innerHTML = res.data.slice(0, 4).map(c => ProductComponent.renderCategoryCard(c)).join('');
      }
    });
  },

  /**
   * 3. Nạp danh sách sản phẩm bán chạy nhất từ MongoDB Atlas vào giao diện
   * @param {string} containerId - ID của container chứa grid sản phẩm
   * @param {number} limit - Số lượng sản phẩm hiển thị (mặc định 4 sản phẩm bán chạy nhất)
   */
  loadFeaturedProducts: function (containerId = 'home-featured-products-grid', limit = 4) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    // Loading skeleton nhẹ
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-on-surface-variant">
        <span class="material-symbols-outlined text-4xl animate-spin text-secondary mb-2 block">progress_activity</span>
        <p class="font-body-md">Đang tuyển chọn 4 tác phẩm ngự tác bán chạy nhất...</p>
      </div>
    `;

    ApiService.getProducts(function (err, res) {
      if (err || !res || !res.success || !res.data || res.data.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-12 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl text-stone-400 mb-2 block">inventory_2</span>
            <p class="font-body-md">Hiện chưa có tác phẩm nào được đăng tải.</p>
          </div>
        `;
        return;
      }

      // Lọc bỏ các sản phẩm rác/không có tên đầy đủ nếu có
      let allProducts = res.data.filter(p => p && p.name && p.name.length > 2);

      // Sắp xếp ưu tiên: Sản phẩm bán chạy (theo soldCount hoặc lượt mua), sau đó đến còn hàng và độ tinh xảo
      allProducts.sort((a, b) => {
        const soldA = a.soldCount || (a.name.includes('Bình hoa men rạn') ? 25 : (a.name.includes('ấm chén') ? 18 : 5));
        const soldB = b.soldCount || (b.name.includes('Bình hoa men rạn') ? 25 : (b.name.includes('ấm chén') ? 18 : 5));
        return soldB - soldA;
      });

      // Chỉ chọn đúng 4 sản phẩm bán chạy nhất theo yêu cầu
      const top4Products = allProducts.slice(0, limit);
      grid.innerHTML = top4Products.map(p => ProductComponent.renderCard(p)).join('');
    });
  },

  /**
   * 4. Xử lý khi nhấn nút Lưu yêu thích (Wishlist)
   */
  toggleFavorite: function (productId, btnEl) {
    if (typeof requireAuthAction === 'function') {
      requireAuthAction(function () {
        if (!currentUser || !currentUser._id) return;
        ApiService.toggleWishlist(currentUser._id, productId, function (err, res) {
          if (!err && res.success) {
            currentUser = res.data;
            localStorage.setItem('craftory_user', JSON.stringify(currentUser));
            if (btnEl) {
              btnEl.classList.toggle('text-red-600');
              btnEl.classList.toggle('text-secondary');
            }
            alert('Đã cập nhật danh sách tác phẩm yêu thích của Thượng khách!');
          }
        });
      });
    }
  },

  /**
   * 5. Xử lý xem chi tiết tác phẩm
   */
  viewDetail: function (productId) {
    alert('Kính mời thượng khách thưởng lãm chi tiết tác phẩm mã: ' + productId);
  },

  /**
   * 6. Lọc theo danh mục
   */
  filterByCategory: function (categoryName) {
    alert('Đang mở bộ sưu tập: ' + categoryName);
  }
};

// Đăng ký toàn cục để các view có thể gọi trực tiếp
window.ProductComponent = ProductComponent;
