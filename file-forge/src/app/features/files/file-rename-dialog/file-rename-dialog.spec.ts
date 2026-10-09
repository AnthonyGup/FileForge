import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileItem } from '@app/core/models';
import { FileRenameDialog } from './file-rename-dialog';

const FILE: FileItem = {
  id: 'a1',
  name: 'notas.txt',
  extension: 'txt',
  mimeType: 'text/plain',
  size: 10,
  ownerId: 'u2',
  folderId: null,
  deleted: false,
  deletedAt: null,
  deletedRootId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('FileRenameDialog', () => {
  let component: FileRenameDialog;
  let fixture: ComponentFixture<FileRenameDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileRenameDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(FileRenameDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('file', FILE);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
