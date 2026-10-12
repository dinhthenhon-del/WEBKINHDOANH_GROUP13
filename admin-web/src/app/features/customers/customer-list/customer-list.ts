import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, CustomerItem } from '../../../core/services/customer';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.css'
})
export class CustomerList implements OnInit {
  private customerService = inject(CustomerService);

  customers = signal<CustomerItem[]>([]);
  selectedCustomer = signal<CustomerItem | null>(null);
  isLoading = signal<boolean>(false);

  // Bộ lọc & tìm kiếm
  searchTerm = '';
  statusFilter = 'ALL'; // ALL, ACTIVE, LOCKED
  currentPage = 1;
  totalPages = 1;

  // Số liệu thống kê KPI
  stats = signal({
    totalCustomers: 0,
    totalActive: 0,
    totalLocked: 0
  });

  // Modal Khóa tài khoản (BR-A15 & BRD-16-05, BRD-16-07)
  isBanModalOpen = signal<boolean>(false);
  targetBanCustomer = signal<CustomerItem | null>(null);
  banReason = '';

  // Modal Xóa mềm tài khoản (BRD-16-08)
  isSoftDeleteModalOpen = signal<boolean>(false);
  targetDeleteCustomer = signal<CustomerItem | null>(null);
  confirmDataIntegrity = false;

  // Toast thông báo tương tác UI
  toastMessage = signal<string>('');
  toastIcon = signal<string>('check_circle');
  isToastVisible = signal<boolean>(false);
  private toastTimer: any = null;

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.isLoading.set(true);
    this.customerService.getCustomers(this.searchTerm, this.statusFilter, this.currentPage).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.customers.set(res.data);
          this.stats.set(res.stats);
          if (res.pagination) {
            this.totalPages = res.pagination.totalPages;
          }
          if (res.data.length > 0 && !this.selectedCustomer()) {
            this.selectedCustomer.set(res.data[0]);
          } else if (res.data.length > 0 && this.selectedCustomer()) {
            const found = res.data.find(c => c._id === this.selectedCustomer()!._id);
            if (found) this.selectedCustomer.set(found);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Lỗi khi tải danh sách khách hàng:', err);
        this.showToast('Không thể kết nối danh sách khách hàng', 'error');
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadCustomers();
  }

  setFilter(status: string): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.loadCustomers();
  }

  selectCustomer(customer: CustomerItem): void {
    this.selectedCustomer.set(customer);
  }

  // Tiện ích lấy Initials 2 ký tự đại diện cho Avatar theo Stitch Mockup
  getInitials(name: string): string {
    if (!name) return 'KH';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Mã định danh khách hàng dạng KH-xxx
  getCustomerDisplayCode(customer: CustomerItem, index: number): string {
    if (customer.customerCode) return customer.customerCode;
    const num = index + 1;
    return 'KH-' + (num < 10 ? '00' + num : num < 100 ? '0' + num : num);
  }

  // ==========================================
  // [MODAL 1] KHÓA TÀI KHOẢN (BR-A15 & BRD-16-05)
  // ==========================================
  openBanModal(customer: CustomerItem): void {
    this.targetBanCustomer.set(customer);
    this.banReason = '';
    this.isBanModalOpen.set(true);
  }

  closeBanModal(): void {
    this.isBanModalOpen.set(false);
    this.targetBanCustomer.set(null);
    this.banReason = '';
  }

  confirmBanAccount(): void {
    const cust = this.targetBanCustomer();
    if (!cust) return;

    if (!this.banReason.trim()) {
      alert('Vui lòng nhập lý do khóa tài khoản theo BRD-16-07!');
      return;
    }

    this.customerService.updateStatus(cust._id, 'LOCKED', this.banReason.trim()).subscribe({
      next: (res) => {
        this.closeBanModal();
        this.showToast(`Tài khoản ${cust.fullName} đã bị khóa (isBanned = true). Đã thu hồi toàn bộ token JWT.`);
        this.loadCustomers();
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi khi khóa tài khoản');
      }
    });
  }

  unbanCustomer(customer: CustomerItem): void {
    this.customerService.updateStatus(customer._id, 'ACTIVE').subscribe({
      next: () => {
        this.showToast(`Đã mở khóa tài khoản cho khách hàng ${customer.fullName}.`);
        this.loadCustomers();
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi khi mở khóa tài khoản');
      }
    });
  }

  // ==========================================
  // [MODAL 2] XÓA MỀM TÀI KHOẢN (BRD-16-08)
  // ==========================================
  openSoftDeleteModal(customer: CustomerItem): void {
    this.targetDeleteCustomer.set(customer);
    this.confirmDataIntegrity = false;
    this.isSoftDeleteModalOpen.set(true);
  }

  closeSoftDeleteModal(): void {
    this.isSoftDeleteModalOpen.set(false);
    this.targetDeleteCustomer.set(null);
    this.confirmDataIntegrity = false;
  }

  confirmSoftDelete(): void {
    const cust = this.targetDeleteCustomer();
    if (!cust) return;

    if (!this.confirmDataIntegrity) {
      alert('Vui lòng đánh dấu xác nhận chính sách toàn vẹn dữ liệu kế toán!');
      return;
    }

    this.customerService.softDelete(cust._id).subscribe({
      next: (res) => {
        this.closeSoftDeleteModal();
        this.showToast(`Đã xóa mềm tài khoản ${cust.fullName}. Dữ liệu kế toán được bảo toàn (BRD-16-08).`);
        if (this.selectedCustomer()?._id === cust._id) {
          this.selectedCustomer.set(null);
        }
        this.loadCustomers();
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi khi xóa mềm tài khoản');
      }
    });
  }

  // ==========================================
  // [BR-A14] GỬI LIÊN KẾT ĐẶT LẠI MẬT KHẨU
  // ==========================================
  triggerResetPassword(customer: CustomerItem): void {
    this.customerService.triggerResetPassword(customer._id).subscribe({
      next: (res) => {
        this.showToast(`Đã gửi liên kết khôi phục mật khẩu (BR-A14) tới ${customer.email}` + (res.devOtp ? ` [OTP: ${res.devOtp}]` : ''));
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu');
      }
    });
  }

  // ==========================================
  // XUẤT BÁO CÁO CSV THEO MOCKUP STITCH
  // ==========================================
  exportCsv(): void {
    const data = this.customers();
    if (!data || data.length === 0) {
      this.showToast('Không có dữ liệu khách hàng để xuất báo cáo', 'error');
      return;
    }

    const headers = ['Mã KH', 'Họ và tên', 'Email', 'Số điện thoại', 'Hạng thành viên', 'Trạng thái', 'Ngày đăng ký'];
    const rows = data.map((c, i) => [
      c.customerCode || ('KH-' + (i + 1)),
      `"${c.fullName}"`,
      c.email,
      c.phone || '',
      `"${c.membershipTier || 'Thành viên Thân thiết'}"`,
      c.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa',
      new Date(c.createdAt).toLocaleDateString('vi-VN')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Khach_Hang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Đã xuất báo cáo CSV thành công!');
  }

  // ==========================================
  // TOAST THÔNG BÁO TƯƠNG TÁC THEO STITCH
  // ==========================================
  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(msg);
    this.toastIcon.set(type === 'success' ? 'check_circle' : 'info');
    this.isToastVisible.set(true);

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.isToastVisible.set(false);
    }, 3800);
  }
}
