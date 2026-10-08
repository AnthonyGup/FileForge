import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedByMe } from './shared-by-me';

describe('SharedByMe', () => {
  let component: SharedByMe;
  let fixture: ComponentFixture<SharedByMe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedByMe],
    }).compileComponents();

    fixture = TestBed.createComponent(SharedByMe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
