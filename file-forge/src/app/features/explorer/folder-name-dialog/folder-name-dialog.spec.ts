import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderNameDialog } from './folder-name-dialog';

describe('FolderNameDialog', () => {
  let component: FolderNameDialog;
  let fixture: ComponentFixture<FolderNameDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderNameDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(FolderNameDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Nueva carpeta');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
