import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService, ProductItem, InventorySummary } from '../../../core/services/product';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css'
})
export class ProductList implements OnInit {
  private productService = inject(ProductService);
  private router = inject(Router);
  private changeDetector = inject(ChangeDetectorRef);

  // Dữ liệu danh sách & thống kê
  products: ProductItem[] = [];
  categories: any[] = [];
  summary: InventorySummary = {
    totalProducts: 0,
    totalStock: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    outOfStockProducts: 0,
    lowStockProducts: 0,
    categoriesCount: 0
  };

  // Trạng thái tìm kiếm & lọc
  searchQuery = '';
  selectedCategory = '';
  selectedStatus = '';
  selectedSort = 'newest';
  page = 1;
  limit = 8;
  totalPages = 1;
  totalItems = 0;
  isLoading = false;
  loadError = '';

  // Modal xác nhận thao tác và thông báo (Stitch Popup)
  isConfirmModalOpen = false;
  modalMode: 'confirm' | 'notice' = 'confirm';
  targetProduct: ProductItem | null = null;
  modalAction: 'pause' | 'delete' | 'stock' = 'pause';
  stockDelta = 0;
  modalTitle = '';
  modalConfirmLabel = '';
  modalLoading = false;
  modalNotice = '';
  modalCanRetry = false;

  ngOnInit(): void {
    this.loadCategories();
    this.loadSummary();
    this.loadProducts();
  }

  // Tải danh mục gốm sứ
  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.categories = res.data;
          this.changeDetector.markForCheck();
        }
      },
      error: (err) => console.error('Lỗi tải danh mục:', err)
    });
  }

  // Tải KPI thống kê kho
  loadSummary(): void {
    this.productService.getInventorySummary().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.summary = res.data;
          this.changeDetector.markForCheck();
        }
      },
      error: (err) => console.error('Lỗi tải thống kê kho:', err)
    });
  }

  // Tải danh sách sản phẩm với các bộ lọc
  loadProducts(): void {
    this.isLoading = true;
    this.loadError = '';
    this.productService.getProducts({
      search: this.searchQuery,
      categoryId: this.selectedCategory,
      status: this.selectedStatus,
      scope: 'admin',
      sort: this.selectedSort,
      page: this.page,
      limit: this.limit
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (!res?.success || !Array.isArray(res.data)) {
          this.products = [];
          this.totalItems = 0;
          this.totalPages = 1;
          this.loadError = res?.message || 'Máy chủ trả về dữ liệu sản phẩm không hợp lệ.';
          this.showNoticeModal('Không thể tải sản phẩm', this.loadError, true);
          this.changeDetector.markForCheck();
          return;
        }

        this.products = res.data;
        if (res.pagination) {
          this.totalPages = res.pagination.totalPages;
          this.totalItems = res.pagination.total;
        } else {
          this.totalItems = this.products.length;
        }
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.products = [];
        this.totalItems = 0;
        this.totalPages = 1;
        this.loadError = err.error?.message || 'Không thể tải sản phẩm. Hãy kiểm tra backend và kết nối cơ sở dữ liệu rồi thử lại.';
        this.showNoticeModal('Không thể tải sản phẩm', this.loadError, true);
        this.changeDetector.markForCheck();
        console.error('Lỗi tải sản phẩm:', err);
      }
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadProducts();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadProducts();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.selectedSort = 'newest';
    this.page = 1;
    this.loadProducts();
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadProducts();
    }
  }

  // Điều hướng sang form thêm mới
  navigateToNew(): void {
    this.router.navigate(['/products/new']);
  }

  // Điều hướng sang form chỉnh sửa
  editProduct(product: ProductItem): void {
    if (product._id) {
      this.router.navigate(['/products/edit', product._id]);
    }
  }

  // Mở modal xác nhận ngừng bán
  openPauseModal(product: ProductItem): void {
    this.targetProduct = product;
    this.modalMode = 'confirm';
    this.modalAction = 'pause';
    this.modalTitle = product.status === 'active' ? 'Xác nhận ngừng bán' : 'Xác nhận mở bán';
    this.modalConfirmLabel = product.status === 'active' ? 'Xác nhận ngừng bán' : 'Xác nhận mở bán';
    this.modalNotice = `Bạn có chắc chắn muốn chuyển tác phẩm "${product.name}" sang trạng thái Ngừng bán không? Sản phẩm sẽ tạm ẩn khỏi giao diện khách hàng.`;
    if (product.status !== 'active') {
      this.modalNotice = `Bạn có chắc chắn muốn mở bán lại tác phẩm "${product.name}" không?`;
    }
    this.isConfirmModalOpen = true;
  }

  // Mở modal xác nhận xóa
  openDeleteModal(product: ProductItem): void {
    this.targetProduct = product;
    this.modalMode = 'confirm';
    this.modalAction = 'delete';
    this.modalTitle = 'Xác nhận xóa tác phẩm';
    this.modalConfirmLabel = 'Xác nhận xóa';
    this.modalNotice = `Bạn có chắc chắn muốn xóa tác phẩm "${product.name}" không?`;
    this.isConfirmModalOpen = true;
  }

  openStockAdjustModal(product: ProductItem, delta: number): void {
    if (!product._id || !delta || (delta < 0 && (product.stock || 0) === 0)) return;
    this.targetProduct = product;
    this.modalMode = 'confirm';
    this.modalAction = 'stock';
    this.stockDelta = delta;
    this.modalTitle = 'Xác nhận điều chỉnh tồn kho';
    this.modalConfirmLabel = delta > 0 ? 'Xác nhận tăng' : 'Xác nhận giảm';
    const nextStock = Math.max(0, (product.stock || 0) + delta);
    this.modalNotice = `Bạn có chắc chắn muốn ${delta > 0 ? 'tăng' : 'giảm'} tồn kho của "${product.name}" từ ${product.stock || 0} lên ${nextStock} ${product.unit || 'chiếc'} không?`;
    this.isConfirmModalOpen = true;
  }

  showNoticeModal(title: string, message: string, canRetry = false): void {
    this.targetProduct = null;
    this.modalMode = 'notice';
    this.modalTitle = title;
    this.modalNotice = message;
    this.modalLoading = false;
    this.modalCanRetry = canRetry;
    this.isConfirmModalOpen = true;
  }

  retryProductsLoad(): void {
    this.closeConfirmModal();
    this.loadProducts();
  }

  closeConfirmModal(): void {
    this.isConfirmModalOpen = false;
    this.targetProduct = null;
    this.modalLoading = false;
    this.modalCanRetry = false;
  }

  // Thực thi thao tác từ modal
  executeModalAction(): void {
    const targetProduct = this.targetProduct;
    if (!targetProduct || !targetProduct._id) return;

    this.modalLoading = true;
    const prodId = targetProduct._id;

    if (this.modalAction === 'pause') {
      const nextStatus = targetProduct.status === 'active' ? 'inactive' : 'active';
      this.productService.updateStatus(prodId, nextStatus).subscribe({
        next: (res) => {
          this.closeConfirmModal();
          this.loadSummary();
          this.loadProducts();
          const statusMessage = res?.message || 'Trạng thái sản phẩm đã được cập nhật.';
          this.showNoticeModal('Đã cập nhật trạng thái', statusMessage);
        },
        error: (err) => {
          this.showNoticeModal('Không thể cập nhật trạng thái', err.error?.message || err.message || 'Vui lòng thử lại.');
        }
      });
    } else if (this.modalAction === 'delete') {
      this.productService.deleteProduct(prodId).subscribe({
        next: (res) => {
          this.modalLoading = false;
          this.closeConfirmModal();
          this.loadSummary();
          this.loadProducts();
          this.showNoticeModal(res.warning ? 'Đã xóa sản phẩm kèm lưu ý' : 'Đã xóa sản phẩm', [res.message, res.warning].filter(Boolean).join('\n'));
        },
        error: (err) => {
          this.showNoticeModal('Không thể xóa sản phẩm', err.error?.message || err.message || 'Vui lòng thử lại.');
        }
      });
    } else if (this.modalAction === 'stock') {
      const newStock = Math.max(0, (targetProduct.stock || 0) + this.stockDelta);
      this.productService.updateStock(prodId, newStock).subscribe({
        next: (res) => {
          this.closeConfirmModal();
          if (res?.data) {
            targetProduct.stock = res.data.stock;
            targetProduct.status = res.data.status;
            this.loadSummary();
            this.loadProducts();
            this.showNoticeModal('Đã cập nhật tồn kho', `Tồn kho của sản phẩm đã được cập nhật thành ${res.data.stock} ${res.data.unit || 'chiếc'}.`);
          } else {
            this.showNoticeModal('Không thể xác nhận kết quả', 'Máy chủ không trả về tồn kho sau khi cập nhật. Vui lòng tải lại danh sách để kiểm tra.');
          }
        },
        error: (err) => {
          this.showNoticeModal('Không thể cập nhật tồn kho', err.error?.message || err.message || 'Vui lòng thử lại.');
        }
      });
    }
  }

  // Đổi nhanh trạng thái trực tiếp
  toggleStatusDirect(product: ProductItem): void {
    if (!product._id) return;
    const nextStatus = product.status === 'active' ? 'inactive' : 'active';
    this.productService.updateStatus(product._id, nextStatus).subscribe({
      next: () => {
        product.status = nextStatus;
        this.loadSummary();
        this.showNoticeModal('Đã cập nhật trạng thái', 'Trạng thái sản phẩm đã được cập nhật.');
      },
      error: (err) => this.showNoticeModal('Không thể cập nhật trạng thái', err.error?.message || err.message || 'Vui lòng thử lại.')
    });
  }

  // Tăng/giảm nhanh số lượng tồn kho
  quickStockAdjust(product: ProductItem, delta: number): void {
    this.openStockAdjustModal(product, delta);
  }

  // Lấy ảnh hiển thị an toàn
  getProductImage(product: ProductItem): string | null {
    if (product.image && product.image.trim()) return product.image;
    if (product.images && product.images.length > 0 && product.images[0]) return product.images[0];
    return null;
  }

  onProductImageError(event: Event): void {
    const image = event.target;
    if (image instanceof HTMLImageElement) {
      image.hidden = true;
      if (image.nextElementSibling instanceof HTMLElement) {
        image.nextElementSibling.hidden = false;
      }
    }
  }

  // Tên danh mục an toàn
  getCategoryName(product: ProductItem): string {
    if (product.categoryId && typeof product.categoryId === 'object' && product.categoryId.name) {
      return product.categoryId.name;
    }
    const cat = this.categories.find(c => c._id === product.categoryId || c.slug === product.categorySlug);
    return cat ? cat.name : 'Chưa có danh mục xác minh';
  }
}
