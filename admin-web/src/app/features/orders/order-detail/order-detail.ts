import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService, OrderData } from '../../../core/services/order';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  orderId = '';
  order: OrderData | null = null;
  isLoading = true;
  errorMessage = '';

  // Modal Confirm Change Status
  isConfirmStatusModalOpen = false;
  nextTargetStatus = '';
  nextTargetStatusLabel = '';
  isUpdatingStatus = false;

  // Modal Cancel Order (E3)
  isCancelModalOpen = false;
  selectedCancelPreset = 'customer_request';
  cancelReasonDetail = '';
  cancelErrorMessage = '';
  isSubmittingCancel = false;

  // Toast notification
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  isToastVisible = false;

  readonly statusOrder = ['pending', 'confirmed', 'processing', 'shipping', 'completed'];

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.orderId = params['id'];
      if (this.orderId) {
        this.loadOrderDetail();
      }
    });
  }

  loadOrderDetail(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.orderService.getOrderDetail(this.orderId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.success && res.data) {
          this.order = res.data;
        } else {
          this.errorMessage = res?.message || 'Không tìm thấy dữ liệu đơn hàng';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Lỗi khi tải thông tin chi tiết đơn hàng';
        this.cdr.detectChanges();
      },
    });
  }

  // Luồng chuyển trạng thái kế tiếp hợp lệ
  getNextStatus(): { status: string; label: string; icon: string } | null {
    if (!this.order) return null;
    const current = (this.order.orderStatus || this.order.status || '').toLowerCase();

    switch (current) {
      case 'pending':
        return { status: 'confirmed', label: 'Xác nhận đơn hàng (Confirmed)', icon: 'check_circle' };
      case 'confirmed':
        return { status: 'processing', label: 'Chuẩn bị xưởng (Processing)', icon: 'inventory' };
      case 'processing':
        return { status: 'shipping', label: 'Bắt đầu giao hàng (Shipping)', icon: 'local_shipping' };
      case 'shipping':
        return { status: 'completed', label: 'Xác nhận hoàn thành (Completed)', icon: 'task_alt' };
      default:
        return null;
    }
  }

  canProceedToNextStatus(): boolean {
    if (!this.order) return false;
    const next = this.getNextStatus();
    if (!next) return false;
    if (next.status === 'completed' && this.order.paymentStatus !== 'paid') {
      return false;
    }
    return true;
  }

  getDisabledNextStatusReason(): string {
    if (!this.order) return '';
    const next = this.getNextStatus();
    if (next?.status === 'completed' && this.order.paymentStatus !== 'paid') {
      return 'Chưa thể hoàn thành: Đơn hàng chưa thanh toán! Vui lòng xác nhận thanh toán trước.';
    }
    return '';
  }

  canCancelOrder(): boolean {
    if (!this.order) return false;
    const s = (this.order.orderStatus || this.order.status || '').toLowerCase();
    return s !== 'completed' && s !== 'cancelled';
  }

  // Mở modal xác nhận đổi trạng thái
  promptStatusChange(nextStatus: string, label: string): void {
    if (nextStatus === 'completed' && this.order?.paymentStatus !== 'paid') {
      this.showToast('Không thể hoàn thành đơn hàng chưa thanh toán. Vui lòng xác nhận thanh toán trước!', 'error');
      return;
    }
    this.nextTargetStatus = nextStatus;
    this.nextTargetStatusLabel = label;
    this.isConfirmStatusModalOpen = true;
  }

  closeConfirmStatusModal(): void {
    this.isConfirmStatusModalOpen = false;
    this.nextTargetStatus = '';
    this.nextTargetStatusLabel = '';
  }

  // Thực hiện đổi trạng thái (E1, E2)
  confirmStatusChange(): void {
    if (!this.order || !this.nextTargetStatus) return;

    if (this.nextTargetStatus === 'completed' && this.order.paymentStatus !== 'paid') {
      this.closeConfirmStatusModal();
      this.showToast('Không thể hoàn thành đơn hàng chưa thanh toán. Vui lòng xác nhận thanh toán trước!', 'error');
      return;
    }

    this.isUpdatingStatus = true;
    this.orderService.updateOrderStatus(this.order._id || this.order.orderCode, this.nextTargetStatus).subscribe({
      next: (res) => {
        this.isUpdatingStatus = false;
        this.closeConfirmStatusModal();
        if (res && res.success) {
          this.showToast(res.message || 'Cập nhật trạng thái thành công', 'success');
          this.loadOrderDetail();
        } else {
          this.showToast(res.message || 'Lỗi khi cập nhật trạng thái', 'error');
        }
      },
      error: (err) => {
        this.isUpdatingStatus = false;
        this.closeConfirmStatusModal();
        const msg = err.error?.message || 'Trạng thái không thể chuyển đổi';
        this.showToast(msg, 'error');
      },
    });
  }

  // Admin xác nhận hoặc đổi trạng thái thanh toán (Lỗi 2 & Lỗi 3)
  isUpdatingPayment = false;

  confirmPayment(status: 'paid' | 'pending', note?: string): void {
    if (!this.order) return;
    this.isUpdatingPayment = true;
    this.orderService.confirmPayment(this.order._id || this.order.orderCode, { status, note }).subscribe({
      next: (res) => {
        this.isUpdatingPayment = false;
        if (res && res.success) {
          this.showToast(res.message || 'Cập nhật thanh toán thành công', 'success');
          this.loadOrderDetail();
        } else {
          this.showToast(res.message || 'Lỗi khi cập nhật thanh toán', 'error');
        }
      },
      error: (err) => {
        this.isUpdatingPayment = false;
        this.showToast(err.error?.message || 'Lỗi khi cập nhật thanh toán', 'error');
      }
    });
  }

  getPaymentStatusBadgeClass(paymentStatus?: string): string {
    const s = (paymentStatus || '').toLowerCase();
    switch (s) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'awaiting_verification':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'refunded':
      case 'partially_refunded':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }

  getPaymentStatusLabel(paymentStatus?: string): string {
    const s = (paymentStatus || '').toLowerCase();
    switch (s) {
      case 'paid':
        return 'Đã thanh toán (Paid)';
      case 'awaiting_verification':
        return 'Chờ đối soát (Awaiting Verification)';
      case 'failed':
        return 'Thanh toán lỗi (Failed)';
      case 'refunded':
        return 'Đã hoàn tiền (Refunded)';
      case 'partially_refunded':
        return 'Hoàn một phần (Refunded)';
      default:
        return 'Chờ thanh toán (Pending)';
    }
  }

  // Mở modal hủy đơn hàng
  openCancelModal(): void {
    this.selectedCancelPreset = 'customer_request';
    this.cancelReasonDetail = '';
    this.cancelErrorMessage = '';
    this.isCancelModalOpen = true;
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
    this.cancelErrorMessage = '';
  }

  // Thực hiện hủy đơn hàng (E3)
  submitCancelOrder(): void {
    if (!this.order) return;

    const detail = (this.cancelReasonDetail || '').trim();
    if (!detail) {
      this.cancelErrorMessage = 'Vui lòng nhập lý do hủy đơn (bắt buộc, không được để trống)';
      return;
    }

    let presetText = '';
    switch (this.selectedCancelPreset) {
      case 'customer_request':
        presetText = 'Khách hàng yêu cầu hủy';
        break;
      case 'out_of_stock':
        presetText = 'Tác phẩm hết hàng / phôi nung lỗi';
        break;
      case 'wrong_info':
        presetText = 'Không liên hệ được thông tin nhận';
        break;
      case 'change_item':
        presetText = 'Khách đổi sang tác phẩm khác';
        break;
      default:
        presetText = 'Lý do khác';
        break;
    }

    const fullReason = `${presetText}: ${detail}`;

    this.isSubmittingCancel = true;
    this.cancelErrorMessage = '';

    this.orderService.cancelOrder(this.order._id || this.order.orderCode, fullReason).subscribe({
      next: (res) => {
        this.isSubmittingCancel = false;
        this.closeCancelModal();
        if (res && res.success) {
          this.showToast(res.message || 'Đã hủy đơn hàng thành công và khôi phục tồn kho', 'success');
          this.loadOrderDetail();
        } else {
          this.showToast(res.message || 'Lỗi khi hủy đơn hàng', 'error');
        }
      },
      error: (err) => {
        this.isSubmittingCancel = false;
        this.cancelErrorMessage = err.error?.message || 'Lỗi khi hủy đơn hàng từ máy chủ';
        this.showToast(this.cancelErrorMessage, 'error');
      },
    });
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.isToastVisible = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.isToastVisible = false;
      this.cdr.detectChanges();
    }, 4500);
  }

  // Helper tính bước tiến trình hiện tại (0 to 4)
  getStepIndex(status: string): number {
    const s = (status || '').toLowerCase();
    const idx = this.statusOrder.indexOf(s);
    return idx >= 0 ? idx : 0;
  }

  isStepCompleted(stepIdx: number): boolean {
    if (!this.order) return false;
    const currentIdx = this.getStepIndex(this.order.orderStatus);
    return currentIdx > stepIdx;
  }

  isStepCurrent(stepIdx: number): boolean {
    if (!this.order) return false;
    const currentIdx = this.getStepIndex(this.order.orderStatus);
    return currentIdx === stepIdx;
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'processing':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'shipping':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  getStatusLabel(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'Chờ xác nhận (Pending)';
      case 'confirmed':
        return 'Đã xác nhận (Confirmed)';
      case 'processing':
        return 'Đang chuẩn bị (Processing)';
      case 'shipping':
        return 'Đang giao hàng (Shipping)';
      case 'completed':
        return 'Hoàn thành (Completed)';
      case 'cancelled':
        return 'Đã hủy (Cancelled)';
      default:
        return status;
    }
  }

  getItemImage(item: any): string {
    const prod = item.productId || item.product;
    if (typeof prod === 'object' && prod !== null) {
      if (prod.image) return prod.image;
      if (Array.isArray(prod.images) && prod.images.length > 0) return prod.images[0];
    }
    if (item.designSnapshot?.previewUrl) return item.designSnapshot.previewUrl;
    return 'minimalist_archway_pottery_icon.png';
  }
}
