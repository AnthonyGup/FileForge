import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthApi, FileApi, ReportApi, provideApi } from './index';
import { HttpAuthApi, HttpFileApi, HttpReportApi } from './http';
import { MockAuthApi, MockFileApi, MockReportApi } from './mock';

describe('provideApi', () => {
  it('registra los mocks en memoria por defecto', () => {
    TestBed.configureTestingModule({ providers: [provideApi(true)] });

    expect(TestBed.inject(AuthApi) instanceof MockAuthApi).toBe(true);
    expect(TestBed.inject(FileApi) instanceof MockFileApi).toBe(true);
    expect(TestBed.inject(ReportApi) instanceof MockReportApi).toBe(true);
  });

  it('registra la API REST cuando useMock es false', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideApi(false)] });

    expect(TestBed.inject(AuthApi) instanceof HttpAuthApi).toBe(true);
    expect(TestBed.inject(FileApi) instanceof HttpFileApi).toBe(true);
    expect(TestBed.inject(ReportApi) instanceof HttpReportApi).toBe(true);
  });
});
