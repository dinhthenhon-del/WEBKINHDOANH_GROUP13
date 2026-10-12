import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  auth = inject(AuthService);
  isUploading = signal(false);

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type || !file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh hợp lệ (jpg, png, webp)!');
      return;
    }

    this.isUploading.set(true);
    this.auth.uploadAvatar(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        if (res.success) {
          alert('Cập nhật và lưu ảnh đại diện Quản trị viên lên Cloudinary thành công!');
        } else {
          alert(res.message || 'Lỗi khi tải ảnh lên Cloudinary');
        }
        input.value = '';
      },
      error: (err) => {
        this.isUploading.set(false);
        alert(err?.error?.message || err?.message || 'Lỗi khi tải ảnh đại diện lên Cloudinary');
        input.value = '';
      }
    });
  }
}
