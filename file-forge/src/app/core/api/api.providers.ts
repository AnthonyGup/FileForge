import { EnvironmentProviders, Provider, makeEnvironmentProviders } from '@angular/core';
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

export function provideApi(): EnvironmentProviders {
  return makeEnvironmentProviders(HTTP_PROVIDERS);
}
