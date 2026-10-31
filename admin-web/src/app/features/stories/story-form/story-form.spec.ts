import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoryForm } from './story-form';

describe('StoryForm', () => {
  let component: StoryForm;
  let fixture: ComponentFixture<StoryForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoryForm],
    }).compileComponents();

    fixture = TestBed.createComponent(StoryForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
