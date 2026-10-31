import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display error if email or password is empty', () => {
    component.email = '';
    component.password = '';
    component.onLogin();
    expect(component.errorMessage).toBe('Vui lòng nhập đầy đủ Email và Mật khẩu quản trị');
    expect(component.isLoading).toBe(false);
  });

  it('should display error if email format is invalid (e.g. admingmail.com)', () => {
    component.email = 'admingmail.com';
    component.password = '123456';
    component.onLogin();
    expect(component.errorMessage).toContain('Email không hợp lệ');
    expect(component.isLoading).toBe(false);
  });

  it('should stop loading and show error if fetch fails', async () => {
    component.email = 'unknown@gombattrang.vn';
    component.password = 'wrongpass';

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    component.onLogin();
    expect(component.isLoading).toBe(true);

    // Wait for promise resolution
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBeTruthy();
  });

  it('should reject non-admin customer account', async () => {
    component.email = 'customer@domain.vn';
    component.password = 'customer123';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          email: 'customer@domain.vn',
          role: 'customer',
        },
      }),
    } as any);

    component.onLogin();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Khách hàng');
  });
});

