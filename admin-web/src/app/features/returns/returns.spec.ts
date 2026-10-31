import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Returns } from './returns';

describe('Returns', () => {
  let component: Returns;
  let fixture: ComponentFixture<Returns>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Returns],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(Returns);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial returns loaded and filter properly', () => {
    component.loadReturns();
    expect(component.returns.length).toBeGreaterThan(0);
  });

  it('should validate E1 rejection reason when empty', () => {
    component.selectedReturn = component.returns[0] || {
      _id: 'test_1',
      orderId: 'DH002891',
      accountId: 'acc_1',
      type: 'exchange',
      reason: 'test',
      evidenceImages: [],
      status: 'pending',
      items: []
    };
    component.rejectPresetReason = '';
    component.rejectDetailReason = '';
    component.confirmReject();
    expect(component.rejectErrorMessage).toContain('E1');
  });
});
