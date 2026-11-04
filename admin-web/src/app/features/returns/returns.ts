import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReturnService, ReturnRequestData, ReturnStatusUpdatePayload } from '../../core/services/return.service';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './returns.html',
  styleUrl: './returns.css'
})
export class Returns implements OnInit {
  private returnService = inject(ReturnService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = false;
  returns: ReturnRequestData[] = [];
  filteredReturns: ReturnRequestData[] = [];

  // Search & Filter
  searchQuery = '';
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  reasonFilter = '';
  timeframeFilter = 'all';

  // KPI Ribbon
  kpi = {
    pending: 0,
    approved: 0,
    rejected: 0,
    slaRate: 97.8
  };

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;

  // Selected Return for Full Processing / Inspection (Screen 8)
  selectedReturn: ReturnRequestData | null = null;
  isDetailOpen = false;

  // Modals state
  isApproveModalOpen = false;
  isRejectModalOpen = false;
  isSubmitting = false;

  // Rejection Form (E1 validation)
  rejectPresetReason = '';
  rejectDetailReason = '';
  rejectErrorMessage = '';

  // Evidence Lightbox
  previewImage: string | null = null;

  // Toast Notification
  toastMessage = '';
  isToastVisible = false;

  // Current logged in Admin info
  adminName = 'Trưởng ban Quản trị';
  adminId: string | undefined = undefined;

  ngOnInit(): void {
    const adminUser = localStorage.getItem('admin_user');
    if (adminUser) {
      try {
        const parsed = JSON.parse(adminUser);
        if (parsed.fullName) this.adminName = parsed.fullName;
        if (parsed._id) this.adminId = parsed._id;
      } catch (e) {
        // ignore
      }
    }
    this.loadReturns();
  }

  loadReturns(): void {
    this.isLoading = true;

    const timer = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.calculateKpi();
        this.applyFilter();
        this.cdr.detectChanges();
      }
    }, 3500);

    this.returnService.getReturns().subscribe({
      next: (res) => {
        clearTimeout(timer);
        this.isLoading = false;
        if (res && res.success && Array.isArray(res.data)) {
          this.returns = res.data;
        } else {
          this.returns = [];
        }
        this.calculateKpi();
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearTimeout(timer);
        this.isLoading = false;
        console.warn('Không thể nạp dữ liệu đổi/trả từ máy chủ, chuyển sang chế độ dự phòng:', err);
        this.returns = this.returnService.getFallbackReturns();
        this.calculateKpi();
        this.applyFilter();
        this.cdr.detectChanges();
      }
    });
  }

  calculateKpi(): void {
    this.kpi.pending = this.returns.filter(r => r.status === 'pending').length;
    this.kpi.approved = this.returns.filter(r => r.status === 'approved' || r.status === 'completed').length;
    this.kpi.rejected = this.returns.filter(r => r.status === 'rejected').length;
    const resolved = this.kpi.approved + this.kpi.rejected;
    this.kpi.slaRate = resolved > 0 ? Math.round((this.kpi.approved / resolved) * 1000) / 10 : 100;
  }

  applyFilter(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredReturns = this.returns.filter(r => {
      // 1. Status Filter
      if (this.statusFilter !== 'all') {
        if (this.statusFilter === 'pending' && r.status !== 'pending') return false;
        if (this.statusFilter === 'approved' && (r.status !== 'approved' && r.status !== 'completed')) return false;
        if (this.statusFilter === 'rejected' && r.status !== 'rejected') return false;
      }

      // 2. Reason Filter
      if (this.reasonFilter) {
        const reasonLower = (r.reason || '').toLowerCase();
        if (this.reasonFilter === 'nut-ran' && !reasonLower.includes('nứt') && !reasonLower.includes('rạn')) return false;
        if (this.reasonFilter === 'sai-mau' && !reasonLower.includes('sai') && !reasonLower.includes('dung tích')) return false;
        if (this.reasonFilter === 'loi-nung' && !reasonLower.includes('nung') && !reasonLower.includes('bọt khí')) return false;
      }

      // 3. Timeframe Filter
      if (this.timeframeFilter && this.timeframeFilter !== 'all') {
        const itemTime = new Date(r.createdAt || Date.now()).getTime();
        const now = Date.now();
        if (this.timeframeFilter === '7d' && (now - itemTime) > 7 * 86400000) return false;
        if (this.timeframeFilter === '30d' && (now - itemTime) > 30 * 86400000) return false;
        if (this.timeframeFilter === 'quarter' && (now - itemTime) > 90 * 86400000) return false;
      }

      // 4. Search query
      if (query) {
        const orderCode = this.getOrderCode(r).toLowerCase();
        const customerName = this.getCustomerName(r).toLowerCase();
        const customerPhone = this.getCustomerPhone(r).toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const type = r.type === 'exchange' ? 'đổi hàng' : 'trả hàng';
        const match = orderCode.includes(query) ||
          customerName.includes(query) ||
          customerPhone.includes(query) ||
          reason.includes(query) ||
          type.includes(query);
        if (!match) return false;
      }

      return true;
    });

    this.totalPages = Math.ceil(this.filteredReturns.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  get paginatedReturns(): ReturnRequestData[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredReturns.slice(startIndex, startIndex + this.pageSize);
  }

  setStatusFilter(status: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.applyFilter();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.reasonFilter = '';
    this.timeframeFilter = 'all';
    this.currentPage = 1;
    this.applyFilter();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // --- PROCESSING MODAL / DETAIL DRAWER ---
  openDetail(item: ReturnRequestData): void {
    this.selectedReturn = item;
    this.isDetailOpen = true;
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedReturn = null;
    this.isApproveModalOpen = false;
    this.isRejectModalOpen = false;
  }

  // --- APPROVAL FLOW ---
  openApproveModal(item?: ReturnRequestData): void {
    if (item) this.selectedReturn = item;
    this.isApproveModalOpen = true;
  }

  closeApproveModal(): void {
    this.isApproveModalOpen = false;
  }

  confirmApprove(): void {
    if (!this.selectedReturn) return;

    // Kiểm tra đơn hàng có hợp lệ để duyệt đổi trả hay không
    if (this.selectedReturn.orderId && typeof this.selectedReturn.orderId === 'object') {
      const ord = this.selectedReturn.orderId as any;
      if (ord.orderStatus && ord.orderStatus !== 'completed') {
        this.isApproveModalOpen = false;
        this.showToast('Không thể chấp thuận: Đơn hàng chưa ở trạng thái Hoàn thành (Completed)!');
        return;
      }
    }

    this.isSubmitting = true;
    const payload: ReturnStatusUpdatePayload = {
      status: 'approved',
      processedBy: this.adminId
    };

    this.returnService.updateStatus(this.selectedReturn._id, payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.isApproveModalOpen = false;
        if (this.selectedReturn) {
          this.selectedReturn.status = 'approved';
          this.selectedReturn.processedAt = new Date().toISOString();
          this.selectedReturn.processedBy = { fullName: this.adminName };
        }
        this.calculateKpi();
        this.applyFilter();
        this.showToast(`Yêu cầu #${this.getOrderCode(this.selectedReturn!)} đã được phê duyệt thành công! Tồn kho đã được đồng bộ.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.isApproveModalOpen = false;
        // Nếu là lỗi nghiệp vụ từ backend (400, 403, 404), hiển thị thông báo lỗi chính xác
        if (err.status !== 0 && err.error?.message) {
          this.showToast(err.error.message);
          return;
        }
        // Fallback update nếu hoàn toàn offline (status === 0)
        if (this.selectedReturn) {
          this.selectedReturn.status = 'approved';
          this.selectedReturn.processedAt = new Date().toISOString();
          this.selectedReturn.processedBy = { fullName: this.adminName };
        }
        this.calculateKpi();
        this.applyFilter();
        this.showToast(`Yêu cầu #${this.getOrderCode(this.selectedReturn!)} đã được phê duyệt thành công (Ngoại tuyến)!`);
        this.cdr.detectChanges();
      }
    });
  }

  // --- REJECTION FLOW (E1) ---
  openRejectModal(item?: ReturnRequestData): void {
    if (item) this.selectedReturn = item;
    this.rejectPresetReason = '';
    this.rejectDetailReason = '';
    this.rejectErrorMessage = '';
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
    this.rejectErrorMessage = '';
  }

  onPresetReasonChange(): void {
    if (this.rejectPresetReason && this.rejectPresetReason !== 'Khác (Nhập giải trình chi tiết phía dưới)') {
      this.rejectDetailReason = this.rejectPresetReason;
      this.rejectErrorMessage = '';
    }
  }

  confirmReject(): void {
    this.rejectErrorMessage = '';
    const finalReason = (this.rejectDetailReason || this.rejectPresetReason || '').trim();

    // Ngoại lệ E1: Bắt buộc phải có lý do từ chối
    if (!finalReason) {
      this.rejectErrorMessage = 'Bắt buộc phải nhập hoặc chọn lý do từ chối theo tiêu chuẩn thẩm định (Ngoại lệ E1)!';
      return;
    }

    if (!this.selectedReturn) return;

    this.isSubmitting = true;
    const payload: ReturnStatusUpdatePayload = {
      status: 'rejected',
      rejectionReason: finalReason,
      processedBy: this.adminId
    };

    this.returnService.updateStatus(this.selectedReturn._id, payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.isRejectModalOpen = false;
        if (this.selectedReturn) {
          this.selectedReturn.status = 'rejected';
          this.selectedReturn.rejectionReason = finalReason;
          this.selectedReturn.processedAt = new Date().toISOString();
          this.selectedReturn.processedBy = { fullName: this.adminName };
        }
        this.calculateKpi();
        this.applyFilter();
        this.showToast(`Đã từ chối yêu cầu #${this.getOrderCode(this.selectedReturn!)}. Lý do giải trình đã được lưu trữ.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.isRejectModalOpen = false;
        if (this.selectedReturn) {
          this.selectedReturn.status = 'rejected';
          this.selectedReturn.rejectionReason = finalReason;
          this.selectedReturn.processedAt = new Date().toISOString();
          this.selectedReturn.processedBy = { fullName: this.adminName };
        }
        this.calculateKpi();
        this.applyFilter();
        this.showToast(`Đã từ chối yêu cầu #${this.getOrderCode(this.selectedReturn!)} (Ngoại tuyến)!`);
        this.cdr.detectChanges();
      }
    });
  }

  // --- LIGHTBOX PREVIEW ---
  fallbackEvidenceImage = 'https://cdn.hstatic.net/products/200000532849/1_copy_5d87cfc2a83249b8b5cb1ac6361fe4a9.jpg';

  getEvidenceImageUrl(img: string | undefined | null): string {
    if (!img) return this.fallbackEvidenceImage;
    const str = String(img).trim();
    if (str.startsWith('data:image/') || str.startsWith('http://') || str.startsWith('https://')) {
      return str;
    }
    if (str.startsWith('/uploads/') || str.startsWith('uploads/')) {
      return 'http://localhost:5000/' + str.replace(/^\//, '');
    }
    return this.fallbackEvidenceImage;
  }

  onEvidenceImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== this.fallbackEvidenceImage) {
      target.src = this.fallbackEvidenceImage;
    }
  }

  openImageLightbox(imgUrl: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.previewImage = this.getEvidenceImageUrl(imgUrl);
  }

  closeImageLightbox(): void {
    this.previewImage = null;
  }

  // --- HELPERS ---
  getOrderCode(item: ReturnRequestData): string {
    if (item.orderId && typeof item.orderId === 'object' && item.orderId.orderCode) {
      return item.orderId.orderCode.startsWith('#') ? item.orderId.orderCode : `#${item.orderId.orderCode}`;
    }
    return `#DH${item._id.slice(-6).toUpperCase()}`;
  }

  getProductName(item: ReturnRequestData): string {
    if (item.items && item.items.length > 0) {
      const p = item.items[0].productId;
      if (p && typeof p === 'object' && p.name) return p.name;
    }
    return 'Tác phẩm Gốm Bát Tràng';
  }

  getProductSku(item: ReturnRequestData): string {
    if (item.items && item.items.length > 0) {
      const p = item.items[0].productId;
      if (p && typeof p === 'object' && p.sku) return p.sku;
    }
    return 'SP-ML-BHL-0982';
  }

  getProductPrice(item: ReturnRequestData): number {
    if (item.items && item.items.length > 0) {
      const p = item.items[0].productId;
      if (p && typeof p === 'object' && p.price) return p.price;
    }
    if (item.orderId && typeof item.orderId === 'object' && item.orderId.totalAmount) {
      return item.orderId.totalAmount;
    }
    return 2450000;
  }

  getCustomerName(item: ReturnRequestData): string {
    if (item.accountId && typeof item.accountId === 'object' && item.accountId.fullName) {
      return item.accountId.fullName;
    }
    if (item.orderId && typeof item.orderId === 'object' && item.orderId.shippingAddress?.recipientName) {
      return item.orderId.shippingAddress.recipientName;
    }
    return 'Khách Hàng';
  }

  getCustomerPhone(item: ReturnRequestData): string {
    if (item.accountId && typeof item.accountId === 'object' && item.accountId.phone) {
      return item.accountId.phone;
    }
    if (item.orderId && typeof item.orderId === 'object' && item.orderId.shippingAddress?.phone) {
      return item.orderId.shippingAddress.phone;
    }
    return '0912***482';
  }

  getCustomerAddress(item: ReturnRequestData): string {
    if (item.orderId && typeof item.orderId === 'object' && item.orderId.shippingAddress) {
      const addr = item.orderId.shippingAddress;
      return `${addr.detail || ''}, ${addr.ward || ''}, ${addr.province || 'Hà Nội'}`.replace(/^, /, '');
    }
    return 'Phố Cổ, Hoàn Kiếm, Hà Nội';
  }

  getProcessorName(item: ReturnRequestData): string {
    if (item.processedBy && typeof item.processedBy === 'object' && item.processedBy.fullName) {
      return item.processedBy.fullName;
    }
    if (item.status === 'pending') return 'Chưa phản hồi';
    return 'Ban Quản Trị';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '18/10/2024';
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return 'Chưa phản hồi';
    try {
      const d = new Date(dateStr);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch {
      return dateStr;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    this.isToastVisible = true;
    setTimeout(() => {
      this.isToastVisible = false;
      this.cdr.detectChanges();
    }, 4000);
  }
}
