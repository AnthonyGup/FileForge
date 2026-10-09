import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Breadcrumbs } from './breadcrumbs';

describe('Breadcrumbs', () => {
  let component: Breadcrumbs;
  let fixture: ComponentFixture<Breadcrumbs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Breadcrumbs],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Breadcrumbs);
    fixture.componentRef.setInput('items', [{ id: null, name: 'Mis archivos' }]);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
