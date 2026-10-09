import { TestBed } from '@angular/core/testing';

import { Toast } from './toast';

describe('Toast', () => {
  let service: Toast;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Toast);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('agrega y descarta mensajes', () => {
    service.success('ok');
    service.error('fallo');
    expect(service.messages().length).toBe(2);

    const id = service.messages()[0].id;
    service.dismiss(id);
    expect(service.messages().length).toBe(1);
  });
});
