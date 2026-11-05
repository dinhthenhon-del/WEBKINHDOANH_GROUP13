/**
 * Cấu hình endpoint API linh hoạt cho Admin Web
 * - Khi chạy local (port 4200): Tự động trỏ về http://localhost:5000
 * - Khi deploy Cloud (Render/Railway): Tự động trỏ về domain hiện tại (/api)
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '/api';
  const hostname = window.location.hostname || 'localhost';
  const port = window.location.port;
  if (port === '4200' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  return `${window.location.origin}/api`;
}

export function getServerBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname || 'localhost';
  const port = window.location.port;
  if (port === '4200' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }
  return window.location.origin;
}

