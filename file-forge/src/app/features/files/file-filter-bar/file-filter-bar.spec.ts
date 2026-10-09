import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileFilterBar } from './file-filter-bar';

describe('FileFilterBar', () => {
  let component: FileFilterBar;
  let fixture: ComponentFixture<FileFilterBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileFilterBar],
    }).compileComponents();

    fixture = TestBed.createComponent(FileFilterBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
