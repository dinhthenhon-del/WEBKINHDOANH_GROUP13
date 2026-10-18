import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { timeout } from 'rxjs';
import { ProductService, ProductItem, CollectionItem } from '../../../core/services/product';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css'
})
export class ProductForm implements OnInit {
  private readonly maxUploadBytes = 5 * 1024 * 1024;
  private readonly base64ImagePattern = /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i;
  private readonly productUrlPattern = /^https:\/\/minhlong\.com\/products\/[a-z0-9-]+\/?$/i;
  private readonly imageUrlPattern = /^https:\/\/[^/?#]+\/[^?#]*\.(?:png|jpe?g|webp|gif|avif)(?:\?[^#]*)?(?:#.*)?$/i;
  private changeDetector = inject(ChangeDetectorRef);
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = false;
  productId: string | null = null;
  categories: any[] = [];
  collections: CollectionItem[] = [];
  isLoading = false;
  isSubmitting = false;
  isCreateConfirmationOpen = false;

  // Form model
  product: Partial<ProductItem> = {
    name: '',
    sku: '',
    categoryId: '',
    collectionName: '',
    sourceUrl: '',
    glazeColor: '',
    material: '',
    size: '',
    firingTemp: '',
    price: 0,
    originalPrice: 0,
    stock: 0,
    minStockAlert: 3,
    unit: 'chiếc',
    description: '',
    status: 'active',
    image: '',
    images: [],
    custom2DEnabled: false
  };

  // Preview ảnh từ URL nguồn
  previewImages: string[] = [];
  imageUrlInput = '';

  // Modal thông báo thành công chuẩn Stitch
  isSuccessModalOpen = false;
  successTitle = '';
  successDescription = '';
  isNoticeModalOpen = false;
  noticeTitle = '';
  noticeMessage = '';
  noticeDetails: string[] = [];
  noticeIcon = 'error';
  navigateAfterNotice = false;

  // Validation errors
  validationErrors: { [key: string]: string } = {};

  ngOnInit(): void {
    this.loadCategories();
    this.loadCollections();
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode = true;
      this.loadProduct(this.productId);
    }
  }

  loadCollections(): void {
    this.productService.getCollections().subscribe({
      next: (res) => {
        this.collections = res?.success && Array.isArray(res.data) ? res.data : [];
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        console.error('Lỗi tải bộ sưu tập:', err);
        this.changeDetector.markForCheck();
      }
    });
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.categories = res.data;
          if (!this.isEditMode && this.categories.length > 0 && !this.product.categoryId) {
            this.product.categoryId = this.categories[0]._id;
          }
          this.changeDetector.markForCheck();
        }
      },
      error: (err) => {
        console.error('Lỗi tải danh mục:', err);
        this.changeDetector.markForCheck();
      }
    });
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.productService.getProductById(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.data) {
          const data = res.data;
          this.product = {
            ...data,
            categoryId: (data.categoryId && typeof data.categoryId === 'object') ? data.categoryId._id : data.categoryId
          };
          this.imageUrlInput = data.image?.startsWith('http') ? data.image : '';
          this.previewImages = data.images && data.images.length > 0 ? [...data.images] : (data.image ? [data.image] : []);
          this.changeDetector.markForCheck();
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.showNotice(
          'Không thể tải sản phẩm',
          err.error?.message || err.message || 'Đã xảy ra lỗi khi tải thông tin sản phẩm.',
          [],
          true
        );
        this.changeDetector.markForCheck();
      }
    });
  }

  validate(): boolean {
    this.validationErrors = {};

    if (!this.product.name || !this.product.name.trim()) {
      this.validationErrors['name'] = 'Vui lòng nhập tên tác phẩm gốm sứ';
    }
    if (!this.product.sku || !this.product.sku.trim()) {
      this.validationErrors['sku'] = 'Vui lòng nhập mã SKU định danh';
    }
    if (!this.product.categoryId) {
      this.validationErrors['categoryId'] = 'Vui lòng chọn danh mục phân loại';
    }
    if (!this.isValidProductSource(this.product.sourceUrl || '')) {
      this.validationErrors['sourceUrl'] = 'Nhập link trang sản phẩm hoặc link ảnh HTTPS hợp lệ';
    }
    if (this.product.image && !this.isValidProductImage(this.product.image)) {
      this.validationErrors['image'] = 'URL ảnh sản phẩm không hợp lệ';
    }
    if (this.product.price === undefined || this.product.price === null || this.product.price <= 0) {
      this.validationErrors['price'] = 'Giá niêm yết phải lớn hơn 0';
    }

    if (this.product.stock === undefined || this.product.stock === null || this.product.stock < 0 || !Number.isInteger(this.product.stock)) {
      this.validationErrors['stock'] = 'Số lượng tồn kho phải là số nguyên không âm';
    }

    return Object.keys(this.validationErrors).length === 0;
  }

  syncPrimaryImageUrl(imageUrl: string): void {
    const normalizedUrl = imageUrl.trim();
    this.imageUrlInput = normalizedUrl;
    this.product.image = normalizedUrl;
    this.product.images = normalizedUrl ? [normalizedUrl] : [];
    this.previewImages = this.product.images;
  }

  syncSourceUrl(sourceUrl: string): void {
    const normalizedUrl = sourceUrl.trim();
    if (!this.imageUrlPattern.test(normalizedUrl)) {
      return;
    }

    this.product.image = normalizedUrl;
    this.product.images = [normalizedUrl];
    this.imageUrlInput = normalizedUrl;
    this.previewImages = [normalizedUrl];
  }

  async onImagesSelected(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const files = Array.from(input.files || []);
    if (files.length === 0) {
      return;
    }

    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (files.some(file => !supportedTypes.includes(file.type))) {
      this.showNotice('Định dạng ảnh không được hỗ trợ', 'Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF.');
      input.value = '';
      return;
    }
    if (files.some(file => file.size === 0)) {
      this.showNotice('Tệp ảnh không hợp lệ', 'Tệp ảnh được chọn đang trống. Vui lòng chọn tệp khác.');
      input.value = '';
      return;
    }
    if (totalBytes > this.maxUploadBytes) {
      this.showNotice('Ảnh vượt quá dung lượng cho phép', 'Tổng dung lượng ảnh tải lên không được vượt quá 5 MB.');
      input.value = '';
      return;
    }

    try {
      const dataUrls = await Promise.all(files.map(file => this.readImageAsDataUrl(file)));
      this.product.images = dataUrls;
      this.product.image = dataUrls[0] || '';
      this.imageUrlInput = '';
      this.previewImages = dataUrls;
      delete this.validationErrors['image'];
    } catch (error) {
      console.error('Không thể đọc tệp ảnh:', error);
      this.showNotice('Không thể đọc ảnh', 'Đã xảy ra lỗi khi xử lý tệp ảnh. Vui lòng thử lại.');
    } finally {
      input.value = '';
    }
  }

  private showNotice(title: string, message: string, details: string[] = [], navigateAfterClose = false): void {
    this.noticeTitle = title;
    this.noticeMessage = message;
    this.noticeDetails = details;
    this.noticeIcon = title.includes('thành công') ? 'check_circle' : 'error';
    this.navigateAfterNotice = navigateAfterClose;
    this.isNoticeModalOpen = true;
    this.changeDetector.markForCheck();
  }

  onCloseNoticeModal(): void {
    this.isNoticeModalOpen = false;
    if (this.navigateAfterNotice) {
      this.navigateAfterNotice = false;
      this.router.navigate(['/products']);
    }
  }

  private isValidProductImage(image: string): boolean {
    return this.imageUrlPattern.test(image) ||
      (this.base64ImagePattern.test(image) && image.length <= 7 * 1024 * 1024);
  }

  private isValidProductSource(sourceUrl: string): boolean {
    return this.productUrlPattern.test(sourceUrl) || this.imageUrlPattern.test(sourceUrl);
  }

  private readImageAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Không thể mã hóa ảnh thành Base64.'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp ảnh.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * SUBMIT FORM: ADMIN NHẬP DỮ LIỆU -> FILE JSON -> MONGODB
   */
  onSubmit(): void {
    if (!this.validate()) {
      this.showNotice(
        'Vui lòng kiểm tra thông tin',
        'Một số trường đang thiếu hoặc chưa hợp lệ. Hãy kiểm tra các mục sau:',
        Object.values(this.validationErrors)
      );
      return;
    }

    if (!this.isEditMode) {
      this.isCreateConfirmationOpen = true;
      return;
    }

    this.saveProduct();
  }

  cancelCreateConfirmation(): void {
    this.isCreateConfirmationOpen = false;
  }

  confirmCreateProduct(): void {
    if (this.isSubmitting) {
      return;
    }
    this.isCreateConfirmationOpen = false;
    this.saveProduct();
  }

  private saveProduct(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.productId) {
      this.productService.updateProduct(this.productId, this.product).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.successTitle = 'Cập nhật sản phẩm thành công!';
          this.successDescription = `Tác phẩm "${res.data?.name}" đã được đồng bộ vào file JSON runtime và lưu trữ an toàn trong MongoDB.`;
          this.isSuccessModalOpen = true;
          this.changeDetector.markForCheck();
        },
        error: (err) => {
          this.isSubmitting = false;
          const message = err.name === 'TimeoutError'
            ? 'Máy chủ không phản hồi trong 30 giây. Hãy kiểm tra danh sách sản phẩm trước khi gửi lại để tránh tạo trùng.'
            : err.error?.message || err.message || 'Đã xảy ra lỗi khi cập nhật sản phẩm.';
          this.showNotice('Không thể cập nhật sản phẩm', message);
        }
      });
    } else {
      this.productService.createProduct(this.product).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.successTitle = 'Tạo mới sản phẩm thành công!';
          this.successDescription = `Tác phẩm "${res.data?.name}" (SKU: ${res.data?.sku}) đã được tạo mới theo luồng Admin Form -> File JSON -> MongoDB.`;
          this.isSuccessModalOpen = true;
          this.changeDetector.markForCheck();
        },
        error: (err) => {
          if (err.name === 'TimeoutError') {
            this.verifyCreatedProductAfterTimeout();
            return;
          }
          this.isSubmitting = false;
          this.showNotice('Không thể tạo sản phẩm', err.error?.message || err.message || 'Đã xảy ra lỗi khi tạo sản phẩm.');
        }
      });
    }
  }

  private verifyCreatedProductAfterTimeout(): void {
    const submittedSku = this.product.sku?.trim().toUpperCase();
    if (!submittedSku) {
      this.isSubmitting = false;
      this.showNotice('Chưa xác nhận được kết quả', 'Máy chủ hết thời gian phản hồi. Hãy kiểm tra danh sách sản phẩm trước khi gửi lại.');
      return;
    }

    this.productService.getProducts({ search: submittedSku, scope: 'admin', limit: 20 })
      .pipe(timeout({ first: 10000 }))
      .subscribe({
        next: (res) => {
          const savedProduct = res.data?.find(product => product.sku?.trim().toUpperCase() === submittedSku);
          this.isSubmitting = false;

          if (savedProduct) {
            this.successTitle = 'Tạo mới sản phẩm thành công!';
            this.successDescription = `Tác phẩm "${savedProduct.name}" (SKU: ${savedProduct.sku}) đã được xác nhận trong hệ thống.`;
            this.isSuccessModalOpen = true;
          } else {
            this.showNotice(
              'Chưa xác nhận được kết quả',
              'Máy chủ không phản hồi đúng hạn và chưa tìm thấy sản phẩm trong danh sách. Hãy kiểm tra kết nối trước khi thử lại để tránh tạo trùng.'
            );
          }
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Không thể xác minh sản phẩm sau khi hết thời gian chờ:', error);
          this.showNotice(
            'Chưa xác nhận được kết quả',
            'Không thể kiểm tra sản phẩm đã được lưu hay chưa. Hãy tải lại danh sách sản phẩm trước khi thử lại để tránh tạo trùng.'
          );
        }
      });
  }

  // Đóng modal thành công và quay lại danh sách
  onCloseSuccessModal(): void {
    this.isSuccessModalOpen = false;
    this.router.navigate(['/products']);
  }

  onCancel(): void {
    this.router.navigate(['/products']);
  }
}
