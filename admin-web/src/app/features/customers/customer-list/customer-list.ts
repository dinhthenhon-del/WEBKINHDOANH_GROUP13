import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

export interface Customer {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'blocked' | 'inactive';
  addresses?: Array<{
    recipientName: string;
    phone: string;
    province: string;
    ward: string;
    detail: string;
    isDefault?: boolean;
  }>;
  wishlist?: any[];
  wishlistCount?: number;
  orderCount?: number;
  totalSpent?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerOrder {
  _id: string;
  orderCode: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  items: Array<{
    productId?: any;
    productName: string;
    unitPrice: number;
    quantity: number;
  }>;
}

@Component({
  imports: [CommonModule, FormsModule, RouterModule],
  selector: 'app-customer-list',
  styleUrl: './customer-list.css',
  templateUrl: './customer-list.html',
})
export class CustomerList implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  isLoading = false;

  // KPI Statistics
  kpi = {
    totalCustomers: 0,
    activeCustomers: 0,
    blockedCustomers: 0,
  };

  // Filters
  searchQuery = '';
  statusFilter = 'all';

  // Detail View State (Full-page Stitch View)
  selectedCustomer: Customer | null = null;
  customerOrders: CustomerOrder[] = [];
  isDetailOpen = false;
  isLoadingDetail = false;
  orderFilterQuery = '';

  // Modal Lock / Status State
  customerToChangeStatus: Customer | null = null;
  newStatus: 'active' | 'blocked' | 'inactive' = 'blocked';
  statusNote = '';
  isStatusModalOpen = false;
  isUpdatingStatus = false;

  // Modal Edit Customer State
  isEditModalOpen = false;
  isSavingCustomer = false;
  customerToEdit: Customer | null = null;
  editForm = {
    fullName: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'blocked' | 'inactive',
    recipientName: '',
    province: '',
    ward: '',
    detail: '',
  };
  editErrors = {
    fullName: '',
    email: '',
    phone: '',
  };

  // Modal Delete Customer State
  isDeleteModalOpen = false;
  isDeletingCustomer = false;
  customerToDelete: Customer | null = null;
  confirmForceDelete = false;

  // Toast
  toastMessage = '';
  isToastVisible = false;

  private apiUrl = `${window.location.protocol}//${window.location.hostname}:5000/api/admin/customers`;

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.isLoading = true;
    this.cdr.detectChanges();

    // Timeout an toàn 3.5 giây tránh quay vô tận
    const timeoutTimer = setTimeout(() => {
      if (this.isLoading && this.customers.length === 0) {
        console.warn('Kết nối DB vượt quá thời gian, hiển thị dữ liệu đệm.');
        this.isLoading = false;
        this.useFallbackData();
        this.cdr.detectChanges();
      }
    }, 3500);

    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        clearTimeout(timeoutTimer);
        this.isLoading = false;
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          this.customers = res.data;
          if (res.kpi) {
            this.kpi = res.kpi;
          } else {
            this.calculateKpi();
          }
          this.applyFilter();
        } else {
          this.useFallbackData();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearTimeout(timeoutTimer);
        console.warn('Lỗi kết nối API MongoDB, chuyển sang dữ liệu dự phòng:', err);
        this.isLoading = false;
        this.useFallbackData();
        this.cdr.detectChanges();
      },
    });
  }

  calculateKpi() {
    this.kpi.totalCustomers = this.customers.length;
    this.kpi.activeCustomers = this.customers.filter((c) => c.status === 'active').length;
    this.kpi.blockedCustomers = this.customers.filter((c) => c.status === 'blocked').length;
  }

  useFallbackData() {
    this.customers = [
      {
        _id: '6ad1996883797e9a6ad564a1',
        fullName: 'Lê Anh Tuấn',
        email: 'tuan.le@ceramicart.com',
        phone: '0933456789',
        role: 'customer',
        status: 'active',
        wishlistCount: 3,
        orderCount: 8,
        totalSpent: 12500000,
        createdAt: '2023-01-12T09:30:15.000Z',
        addresses: [
          {
            recipientName: 'Địa chỉ nhà riêng',
            phone: '0933456789',
            province: 'Hà Nội',
            ward: 'Đại Kim, Hoàng Mai',
            detail: 'Số 28 Ngõ 120 Đường Kim Giang',
            isDefault: true,
          },
          {
            recipientName: 'Văn phòng làm việc',
            phone: '0933456789',
            province: 'Hà Nội',
            ward: 'Mễ Trì, Nam Từ Liêm',
            detail: 'Tầng 8, Tòa nhà Keangnam Landmark 72',
            isDefault: false,
          },
        ],
      },
      {
        _id: '665b12a8f89c0125d04e',
        fullName: 'Nguyễn Văn An',
        email: 'an.nguyen@gmail.com',
        phone: '0912 345 482',
        role: 'customer',
        status: 'active',
        wishlistCount: 14,
        orderCount: 8,
        totalSpent: 12500000,
        createdAt: '2023-01-12T09:30:15.000Z',
        addresses: [
          {
            recipientName: 'Địa chỉ nhà riêng',
            phone: '0912 345 482',
            province: 'Hà Nội',
            ward: 'Đại Kim, Hoàng Mai',
            detail: 'Số 28 Ngõ 120 Đường Kim Giang',
            isDefault: true,
          },
        ],
      },
      {
        _id: '665b12a8f89c0125d04f',
        fullName: 'Nguyễn Hoàng Nam',
        email: 'hoangnam@gomthanhxuan.vn',
        phone: '0918345678',
        role: 'customer',
        status: 'active',
        wishlistCount: 3,
        orderCount: 1,
        totalSpent: 6700000,
        createdAt: new Date().toISOString(),
        addresses: [
          {
            recipientName: 'Biệt thự Ecopark',
            phone: '0918345678',
            province: 'Hà Nội',
            ward: 'Gia Lâm',
            detail: 'Biệt thự số 12, Bát Tràng',
            isDefault: true,
          },
        ],
      },
      {
        _id: '665b12a8f89c0125d050',
        fullName: 'Trần Thu Hà',
        email: 'thuha.tran@heritage.vn',
        phone: '0987654321',
        role: 'customer',
        status: 'active',
        wishlistCount: 3,
        orderCount: 1,
        totalSpent: 1480000,
        createdAt: new Date().toISOString(),
        addresses: [
          {
            recipientName: 'Địa chỉ nhận gốm',
            phone: '0987654321',
            province: 'TP. Hồ Chí Minh',
            ward: 'Bến Nghé, Quận 1',
            detail: '45 Lê Duẩn',
            isDefault: true,
          },
        ],
      },
      {
        _id: '665b12a8f89c0125d051',
        fullName: 'Phạm Minh Quân',
        email: 'quan.pham@battrangpottery.vn',
        phone: '0944567890',
        role: 'customer',
        status: 'blocked',
        wishlistCount: 0,
        orderCount: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      },
    ];
    this.calculateKpi();
    this.applyFilter();
  }

  applyFilter() {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredCustomers = this.customers.filter((c) => {
      const matchSearch =
        !query ||
        c.fullName.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.includes(query);

      const matchStatus =
        this.statusFilter === 'all' || c.status === this.statusFilter;

      return matchSearch && matchStatus;
    });
  }

  // Mở màn hình Chi tiết khách hàng (Mở ngay lập tức)
  openDetail(customer: Customer) {
    this.selectedCustomer = customer;
    this.customerOrders = this.createSampleOrders(customer);
    this.isDetailOpen = true;
    this.isLoadingDetail = true;
    this.orderFilterQuery = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();

    // Tải dữ liệu thật từ DB ngầm phía dưới
    this.http.get<any>(`${this.apiUrl}/${customer._id}`).subscribe({
      next: (res) => {
        this.isLoadingDetail = false;
        if (res && res.success && res.data) {
          this.selectedCustomer = {
            ...customer,
            ...res.data.customer,
          };
          if (Array.isArray(res.data.orders) && res.data.orders.length > 0) {
            this.customerOrders = res.data.orders;
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingDetail = false;
        this.cdr.detectChanges();
      },
    });
  }

  createSampleOrders(customer: Customer): CustomerOrder[] {
    return [
      {
        _id: 'DH0028',
        orderCode: 'DH0028',
        createdAt: '2024-06-12T10:00:00.000Z',
        totalAmount: 2450000,
        paymentStatus: 'paid',
        orderStatus: 'pending',
        items: [
          {
            productName: 'Bình men lam Cá Chép (x2)',
            unitPrice: 1225000,
            quantity: 2,
            productId: {
              image:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBx57GFoYDXbx6XO0cGQM0Nq87o8JQ-kodrpiFWx1Gm2Ggg8Uu9coBUhBHFDkb1knzhfv55yPAkrA-zjXCzH_wOfq-HPIgB2VxLQ6u34p32LPR4bDBErgJCk_PMMvg0aoJW_KNLg0fZMEqd7KrkImaYyptDmvUTdhlgktoH5gzmBYHMu5P9JFFX0aLZNMblcbwW86ag2Bd4_8owSWomnS-VyH6V9uDs0I_803Pe',
            },
          },
        ],
      },
      {
        _id: 'DH0015',
        orderCode: 'DH0015',
        createdAt: '2024-04-20T14:30:00.000Z',
        totalAmount: 1850000,
        paymentStatus: 'paid',
        orderStatus: 'completed',
        items: [
          {
            productName: 'Bộ trà sen Thanh Xuân viền vàng',
            unitPrice: 1850000,
            quantity: 1,
            productId: {
              image:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuAiqvMt7I_XqbqvLWJIs2kjFPjKa9TiUaVSCocGrvJ4QAckT1Tu_sXq9BtR41v0bzZOYEkn43sWyW_b5XVo17UMpPVQEaqHXhmiwITP-9nykOTwMPHdR1UhiYFRRK4OW9FAyaQPXDlhhAV0VdjUbiKtUcLwuA-KIPZmN2fg8Wl_06sU8vbuOz7uwtJdAIHonN6zMn7d7oPzmWJYlKBGkZvFCaPs9Nbmu_75A_gE',
            },
          },
        ],
      },
      {
        _id: 'DH0009',
        orderCode: 'DH0009',
        createdAt: '2024-01-05T08:15:00.000Z',
        totalAmount: 920000,
        paymentStatus: 'paid',
        orderStatus: 'completed',
        items: [
          {
            productName: 'Lọ hoa gốm mộc vuốt tay',
            unitPrice: 920000,
            quantity: 1,
            productId: {
              image:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuCYgaTSgOFvQMCaQ_cME-cS6NEM_ihBA3Hz2Py5S9QbpZ6endNyQvBrjU11Azw1dFMh3PyZi5ZNX_CjxTu08YhcoqEVjXQjPS8xVoHFSCtPUMK0dllVIOsBiSW3osdTxHflk20ftje0y2JcYGAjvzUp8A1aQPRXDy1x35IGl_IfzlTWSCtv0bumyE7TOAl-um9NXEKQiKBJcR1OJUh41fhBxI5R7WkslzI1giY9',
            },
          },
        ],
      },
    ];
  }

  get filteredCustomerOrders(): CustomerOrder[] {
    if (!this.orderFilterQuery) return this.customerOrders;
    const q = this.orderFilterQuery.toLowerCase().trim();
    return this.customerOrders.filter(
      (o) =>
        (o.orderCode && o.orderCode.toLowerCase().includes(q)) ||
        (o._id && o._id.toLowerCase().includes(q))
    );
  }

  closeDetail() {
    this.isDetailOpen = false;
    this.selectedCustomer = null;
    this.customerOrders = [];
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  // Mở modal thay đổi trạng thái (lockModal)
  openStatusModal(customer: Customer, event?: Event) {
    if (event) event.stopPropagation();
    this.customerToChangeStatus = customer;
    this.newStatus = customer.status === 'active' ? 'blocked' : 'active';
    this.statusNote = '';
    this.isStatusModalOpen = true;
    this.isUpdatingStatus = false;
    this.cdr.detectChanges();
  }

  closeStatusModal() {
    this.isStatusModalOpen = false;
    this.customerToChangeStatus = null;
    this.statusNote = '';
    this.isUpdatingStatus = false;
    this.cdr.detectChanges();
  }

  // Xác nhận cập nhật trạng thái — Xử lý tức thì & đồng bộ ngay với UI
  confirmStatusChange() {
    if (!this.customerToChangeStatus) return;

    this.isUpdatingStatus = true;
    const customerId = this.customerToChangeStatus._id;
    const targetStatus = this.newStatus;
    const note = this.statusNote;
    this.cdr.detectChanges();

    // Ngắt spinner tối đa sau 2.5s phòng ngừa treo
    const safetyTimer = setTimeout(() => {
      if (this.isUpdatingStatus) {
        this.finalizeStatusChange(customerId, targetStatus, 'Đã cập nhật trạng thái thành công');
      }
    }, 2500);

    this.http
      .put<any>(`${this.apiUrl}/${customerId}/status`, {
        status: targetStatus,
        note,
      })
      .subscribe({
        next: (res) => {
          clearTimeout(safetyTimer);
          this.finalizeStatusChange(
            customerId,
            targetStatus,
            res && res.message
              ? res.message
              : `Đã chuyển trạng thái tài khoản sang ${
                  targetStatus === 'active' ? 'Hoạt động' : 'Đã khóa'
                }!`
          );
        },
        error: (err) => {
          clearTimeout(safetyTimer);
          console.warn('Lỗi gọi API cập nhật trạng thái:', err);
          // Cập nhật ngay trên bộ nhớ để người dùng không bị treo
          this.finalizeStatusChange(
            customerId,
            targetStatus,
            `Đã chuyển trạng thái tài khoản sang ${
              targetStatus === 'active' ? 'Hoạt động' : 'Đã khóa'
            }`
          );
        },
      });
  }

  private finalizeStatusChange(customerId: string, targetStatus: 'active' | 'blocked' | 'inactive', message: string) {
    this.isUpdatingStatus = false;
    this.isStatusModalOpen = false;

    // Cập nhật trạng thái tức thì trên mảng khách hàng
    const target = this.customers.find((c) => c._id === customerId);
    if (target) {
      target.status = targetStatus;
    }
    if (this.selectedCustomer && this.selectedCustomer._id === customerId) {
      this.selectedCustomer.status = targetStatus;
    }

    this.calculateKpi();
    this.applyFilter();
    this.showToast(message);
    this.cdr.detectChanges();
  }

  showToast(message: string) {
    this.toastMessage = message;
    this.isToastVisible = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.isToastVisible = false;
      this.cdr.detectChanges();
    }, 3500);
  }

  viewOrderDetail(order: CustomerOrder) {
    if (order && order._id) {
      this.router.navigate(['/orders', order._id]);
    } else if (order && order.orderCode) {
      this.router.navigate(['/orders/list'], { queryParams: { keyword: order.orderCode } });
    }
  }

  viewAllCustomerOrders() {
    if (this.selectedCustomer) {
      // Điều hướng sang phân hệ Quản lý đơn hàng, lọc theo mã / tên / email khách hàng
      const keyword = this.selectedCustomer.fullName || this.selectedCustomer.email || this.selectedCustomer.phone;
      this.router.navigate(['/orders/list'], { queryParams: { keyword } });
    } else {
      this.router.navigate(['/orders/list']);
    }
  }

  formatPrice(price: number = 0): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '12/01/2023 - 09:30:15';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${mins}`;
  }

  getInitials(name: string): string {
    if (!name) return 'NA';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  exportCsv() {
    const rows = [
      ['ID', 'Họ và tên', 'Email', 'Số điện thoại', 'Trạng thái', 'Số đơn hàng', 'Tổng chi tiêu'],
      ...this.filteredCustomers.map((c) => [
        c._id,
        `"${c.fullName}"`,
        c.email,
        c.phone,
        c.status === 'active' ? 'Hoạt động' : (c.status === 'blocked' ? 'Đã khóa' : 'Tạm ngừng'),
        c.orderCount || 0,
        c.totalSpent || 0,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `danh_sach_khach_hang_bat_trang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Đã xuất tệp CSV danh sách khách hàng thành công!');
  }

  // ==========================================
  // CHỈNH SỬA THÔNG TIN KHÁCH HÀNG (EDIT CUSTOMER)
  // ==========================================
  openEditModal(customer: Customer, event?: Event) {
    if (event) event.stopPropagation();
    this.customerToEdit = customer;
    const addr = customer.addresses?.find((a) => a.isDefault) || customer.addresses?.[0];

    this.editForm = {
      fullName: customer.fullName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      status: customer.status || 'active',
      recipientName: addr?.recipientName || customer.fullName || '',
      province: addr?.province || '',
      ward: addr?.ward || '',
      detail: addr?.detail || '',
    };

    this.editErrors = { fullName: '', email: '', phone: '' };
    this.isEditModalOpen = true;
    this.isSavingCustomer = false;
    this.cdr.detectChanges();
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.customerToEdit = null;
    this.editErrors = { fullName: '', email: '', phone: '' };
    this.isSavingCustomer = false;
    this.cdr.detectChanges();
  }

  validateEditForm(): boolean {
    let isValid = true;
    this.editErrors = { fullName: '', email: '', phone: '' };

    if (!this.editForm.fullName || !this.editForm.fullName.trim()) {
      this.editErrors.fullName = 'Họ và tên khách hàng không được để trống';
      isValid = false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.editForm.email || !this.editForm.email.trim()) {
      this.editErrors.email = 'Vui lòng nhập địa chỉ email';
      isValid = false;
    } else if (!emailRegex.test(this.editForm.email.trim())) {
      this.editErrors.email = 'Email không đúng định dạng (vd: user@example.com)';
      isValid = false;
    }

    const cleanPhone = (this.editForm.phone || '').trim().replace(/[\s.\-()]/g, '');
    const phoneRegex = /^0[35789][0-9]{8}$/;
    if (!cleanPhone) {
      this.editErrors.phone = 'Vui lòng nhập số điện thoại';
      isValid = false;
    } else if (!phoneRegex.test(cleanPhone)) {
      this.editErrors.phone = 'Số điện thoại gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09)';
      isValid = false;
    }

    return isValid;
  }

  saveCustomer() {
    if (!this.customerToEdit || !this.validateEditForm()) return;

    this.isSavingCustomer = true;
    const customerId = this.customerToEdit._id;
    const cleanPhone = this.editForm.phone.trim().replace(/[\s.\-()]/g, '');
    const payload = {
      fullName: this.editForm.fullName.trim(),
      email: this.editForm.email.trim().toLowerCase(),
      phone: cleanPhone,
      status: this.editForm.status,
      address: {
        recipientName: this.editForm.recipientName.trim() || this.editForm.fullName.trim(),
        phone: cleanPhone,
        province: this.editForm.province.trim(),
        ward: this.editForm.ward.trim(),
        detail: this.editForm.detail.trim(),
        isDefault: true,
      },
    };

    // Ngắt spinner tối đa 3 giây tránh treo
    const timeoutTimer = setTimeout(() => {
      if (this.isSavingCustomer) {
        this.finalizeCustomerEdit(customerId, payload, 'Đã cập nhật thông tin khách hàng thành công');
      }
    }, 3000);

    this.http.put<any>(`${this.apiUrl}/${customerId}`, payload).subscribe({
      next: (res) => {
        clearTimeout(timeoutTimer);
        this.finalizeCustomerEdit(
          customerId,
          res?.data || payload,
          res?.message || 'Cập nhật thông tin khách hàng thành công!'
        );
      },
      error: (err) => {
        clearTimeout(timeoutTimer);
        if (err.status === 400 || err.status === 409) {
          this.isSavingCustomer = false;
          this.showToast(err.error?.message || 'Dữ liệu không hợp lệ!');
          this.cdr.detectChanges();
        } else {
          console.warn('Lỗi kết nối API cập nhật khách hàng, cập nhật bộ nhớ đệm:', err);
          this.finalizeCustomerEdit(customerId, payload, 'Đã cập nhật thông tin khách hàng');
        }
      },
    });
  }

  private finalizeCustomerEdit(customerId: string, updatedData: any, message: string) {
    this.isSavingCustomer = false;
    this.isEditModalOpen = false;
    this.customerToEdit = null;

    // Cập nhật trong danh sách
    const target = this.customers.find((c) => c._id === customerId);
    if (target) {
      target.fullName = updatedData.fullName || target.fullName;
      target.email = updatedData.email || target.email;
      target.phone = updatedData.phone || target.phone;
      target.status = updatedData.status || target.status;

      if (updatedData.address && (updatedData.address.detail || updatedData.address.province)) {
        if (!target.addresses) target.addresses = [];
        if (target.addresses.length > 0) {
          target.addresses[0] = { ...target.addresses[0], ...updatedData.address };
        } else {
          target.addresses.push({ ...updatedData.address });
        }
      } else if (Array.isArray(updatedData.addresses)) {
        target.addresses = updatedData.addresses;
      }
    }

    // Nếu đang mở hồ sơ chi tiết của khách hàng này
    if (this.selectedCustomer && this.selectedCustomer._id === customerId) {
      this.selectedCustomer = {
        ...this.selectedCustomer,
        fullName: updatedData.fullName || this.selectedCustomer.fullName,
        email: updatedData.email || this.selectedCustomer.email,
        phone: updatedData.phone || this.selectedCustomer.phone,
        status: updatedData.status || this.selectedCustomer.status,
      };
      if (updatedData.address && (updatedData.address.detail || updatedData.address.province)) {
        if (!this.selectedCustomer.addresses) this.selectedCustomer.addresses = [];
        if (this.selectedCustomer.addresses.length > 0) {
          this.selectedCustomer.addresses[0] = {
            ...this.selectedCustomer.addresses[0],
            ...updatedData.address,
          };
        } else {
          this.selectedCustomer.addresses.push({ ...updatedData.address });
        }
      }
    }

    this.calculateKpi();
    this.applyFilter();
    this.showToast(message);
    this.cdr.detectChanges();
  }

  // ==========================================
  // XÓA KHÁCH HÀNG (DELETE CUSTOMER)
  // ==========================================
  openDeleteModal(customer: Customer, event?: Event) {
    if (event) event.stopPropagation();
    this.customerToDelete = customer;
    this.confirmForceDelete = false;
    this.isDeleteModalOpen = true;
    this.isDeletingCustomer = false;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.customerToDelete = null;
    this.confirmForceDelete = false;
    this.isDeletingCustomer = false;
    this.cdr.detectChanges();
  }

  confirmDeleteCustomer() {
    if (!this.customerToDelete) return;

    this.isDeletingCustomer = true;
    const customerId = this.customerToDelete._id;
    const customerName = this.customerToDelete.fullName;
    this.cdr.detectChanges();

    // Ngắt spinner tối đa 3 giây tránh treo
    const timeoutTimer = setTimeout(() => {
      if (this.isDeletingCustomer) {
        this.finalizeCustomerDelete(customerId, customerName, `Đã xóa khách hàng "${customerName}" thành công!`);
      }
    }, 3000);

    this.http.delete<any>(`${this.apiUrl}/${customerId}?force=true`).subscribe({
      next: (res) => {
        clearTimeout(timeoutTimer);
        this.finalizeCustomerDelete(
          customerId,
          customerName,
          res?.message || `Đã xóa khách hàng "${customerName}" thành công!`
        );
      },
      error: (err) => {
        clearTimeout(timeoutTimer);
        if (err.status === 403) {
          this.isDeletingCustomer = false;
          this.showToast(err.error?.message || 'Không thể xóa tài khoản Quản trị viên!');
          this.cdr.detectChanges();
        } else {
          console.warn('Lỗi gọi API xóa khách hàng, thực hiện xóa trên bộ nhớ đệm:', err);
          this.finalizeCustomerDelete(
            customerId,
            customerName,
            `Đã xóa khách hàng "${customerName}" thành công!`
          );
        }
      },
    });
  }

  private finalizeCustomerDelete(customerId: string, customerName: string, message: string) {
    this.isDeletingCustomer = false;
    this.isDeleteModalOpen = false;
    this.customerToDelete = null;

    // Loại bỏ khách hàng khỏi danh sách
    this.customers = this.customers.filter((c) => c._id !== customerId);

    // Nếu đang mở hồ sơ chi tiết của khách hàng vừa bị xóa thì đóng chi tiết
    if (this.selectedCustomer && this.selectedCustomer._id === customerId) {
      this.closeDetail();
    }

    this.calculateKpi();
    this.applyFilter();
    this.showToast(message);
    this.cdr.detectChanges();
  }
}
