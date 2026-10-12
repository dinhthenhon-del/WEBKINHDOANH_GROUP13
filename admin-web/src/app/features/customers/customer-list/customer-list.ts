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

  // Số liệu thống kê KPI
  stats = signal({
    totalCustomers: 0,
    totalActive: 0,
    totalLocked: 0
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.isLoading.set(true);
    this.customerService.getCustomers(this.searchTerm, this.statusFilter).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.customers.set(res.data);
          this.stats.set(res.stats);
          if (res.data.length > 0 && !this.selectedCustomer()) {
            this.selectedCustomer.set(res.data[0]);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Lỗi khi tải danh sách khách hàng:', err);
      }
    });
  }

  onSearch(): void {
    this.loadCustomers();
  }

  setFilter(status: string): void {
    this.statusFilter = status;
    this.loadCustomers();
  }

  selectCustomer(customer: CustomerItem): void {
    this.selectedCustomer.set(customer);
  }

  // [UC-A04 E2] Khóa hoặc Mở khóa tài khoản khách hàng
  toggleStatus(customer: CustomerItem): void {
    const newStatus: 'ACTIVE' | 'LOCKED' = customer.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    const actionText = newStatus === 'LOCKED' ? 'KHÓA' : 'MỞ KHÓA';

    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của khách hàng "${customer.fullName}"?`)) {
      return;
    }

    this.customerService.updateStatus(customer._id, newStatus).subscribe({
      next: (res) => {
        if (res.success) {
          customer.status = newStatus;
          if (this.selectedCustomer()?._id === customer._id) {
            const updated: CustomerItem = { ...this.selectedCustomer()!, status: newStatus };
            this.selectedCustomer.set(updated);
          }
          this.loadCustomers();
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể cập nhật trạng thái');
      }
    });
  }
}
