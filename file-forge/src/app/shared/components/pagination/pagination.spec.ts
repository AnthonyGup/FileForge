import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pagination } from './pagination';

describe('Pagination', () => {
  let component: Pagination;
  let fixture: ComponentFixture<Pagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pagination],
    }).compileComponents();

    fixture = TestBed.createComponent(Pagination);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('total', 25);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
