import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private auth = inject(AuthService);

  onLogout(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng Quản Trị Bát Tràng?')) {
      this.auth.logout();
    }
  }
}
