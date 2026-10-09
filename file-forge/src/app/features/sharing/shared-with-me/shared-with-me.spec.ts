import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideApi } from '@app/core/api';
import { SharedWithMe } from './shared-with-me';

describe('SharedWithMe', () => {
  let component: SharedWithMe;
  let fixture: ComponentFixture<SharedWithMe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedWithMe],
      providers: [provideRouter([]), provideApi()],
    }).compileComponents();

    fixture = TestBed.createComponent(SharedWithMe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
