import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '@app/core/api';

import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideApi()],
    });
    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});