import { TestBed } from '@angular/core/testing';

import { provideApi } from '@app/core/api';
import { FileTransfer } from './file-transfer';

describe('FileTransfer', () => {
  let service: FileTransfer;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideApi()] });
    service = TestBed.inject(FileTransfer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
