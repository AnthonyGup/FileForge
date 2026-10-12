import { EnvironmentProviders, Provider, makeEnvironmentProviders } from '@angular/core';
import { environment } from '@env/environment';
import { ActivityApi } from './activity.api';
import { AuthApi } from './auth.api';
import { CommentApi } from './comment.api';
import { FileApi } from './file.api';
import { FolderApi } from './folder.api';
import { ReportApi } from './report.api';
import { ShareApi } from './share.api';
import { TrashApi } from './trash.api';
import { UserApi } from './user.api';
import {
  HttpActivityApi, HttpAuthApi, HttpCommentApi, HttpFileApi, HttpFolderApi,
  HttpReportApi, HttpShareApi, HttpTrashApi, HttpUserApi
} from './http';
import {
  MockActivityApi, MockAuthApi, MockCommentApi, MockFileApi, MockFolderApi,
  MockReportApi, MockShareApi, MockTrashApi, MockUserApi
} from './mock';

const HTTP_PROVIDERS: Provider[] = [
  { provide: AuthApi, useClass: HttpAuthApi },
  { provide: UserApi, useClass: HttpUserApi },
  { provide: FolderApi, useClass: HttpFolderApi },
  { provide: FileApi, useClass: HttpFileApi },
  { provide: ShareApi, useClass: HttpShareApi },
  { provide: CommentApi, useClass: HttpCommentApi },
  { provide: TrashApi, useClass: HttpTrashApi },
  { provide: ActivityApi, useClass: HttpActivityApi },
  { provide: ReportApi, useClass: HttpReportApi }
];

// Implementación simulada en memoria. Se elimina por completo cuando el backend esté listo.
const MOCK_PROVIDERS: Provider[] = [
  { provide: AuthApi, useClass: MockAuthApi },
  { provide: UserApi, useClass: MockUserApi },
  { provide: FolderApi, useClass: MockFolderApi },
  { provide: FileApi, useClass: MockFileApi },
  { provide: ShareApi, useClass: MockShareApi },
  { provide: CommentApi, useClass: MockCommentApi },
  { provide: TrashApi, useClass: MockTrashApi },
  { provide: ActivityApi, useClass: MockActivityApi },
  { provide: ReportApi, useClass: MockReportApi }
];

/**
 * Registra las implementaciones de la API. Con `useMock` (por defecto
 * `environment.useMock`) usa los mocks en memoria; en caso contrario, la API REST real.
 */
export function provideApi(useMock: boolean = environment.useMock): EnvironmentProviders {
  return makeEnvironmentProviders(useMock ? MOCK_PROVIDERS : HTTP_PROVIDERS);
}
