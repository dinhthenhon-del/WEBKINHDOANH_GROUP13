import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProductService } from '../../../core/services/product';
import { ProductForm } from './product-form';

describe('ProductForm', () => {
  let component: ProductForm;
  let fixture: ComponentFixture<ProductForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ProductService,
          useValue: {
            getCategories: () => of({ success: true, data: [] }),
            getCollections: () => of({ success: true, data: [] }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should convert selected local images to Base64 for product storage', async () => {
    const input = fixture.nativeElement.querySelector('#product-image-upload') as HTMLInputElement;
    const file = new File(['ceramic image'], 'ceramic.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    await component.onImagesSelected({ target: input } as unknown as Event);

    expect(component.product.image).toMatch(/^data:image\/png;base64,/);
    expect(component.product.images).toEqual([component.product.image]);
    expect(component.previewImages).toEqual([component.product.image]);
  });

  it('should preview Google image thumbnail URLs entered as the product source', () => {
    const imageUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTestToken';
    component.product = {
      ...component.product,
      name: 'Bình gốm thử nghiệm',
      sku: 'BINH-TEST',
      categoryId: 'category-id',
      sourceUrl: imageUrl,
      price: 100000,
      stock: 1,
    };

    component.syncSourceUrl(imageUrl);

    expect(component.product.image).toBe(imageUrl);
    expect(component.product.images).toEqual([imageUrl]);
    expect(component.previewImages).toEqual([imageUrl]);
    expect(component.validate()).toBe(true);
    expect(component.validationErrors['image']).toBeUndefined();
  });
});
