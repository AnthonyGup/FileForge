import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AuthApi } from './auth.api';
import { UserApi } from './user.api';
import { FolderApi } from './folder.api';
import { FileApi } from './file.api';
import { ShareApi } from './share.api';
import { CommentApi } from './comment.api';
import { TrashApi } from './trash.api';
import { ActivityApi } from './activity.api';
import { MockAuthApi } from './mock/mock-auth.api';
import { MockUserApi } from './mock/mock-user.api';
import { MockFolderApi } from './mock/mock-folder.api';
import { MockFileApi } from './mock/mock-file.api';
import { MockShareApi } from './mock/mock-share.api';
import { MockCommentApi } from './mock/mock-comment.api';
import { MockTrashApi } from './mock/mock-trash.api';
import { MockActivityApi } from './mock/mock-activity.api';

// Fase 25: aquí se decidirá con environment.useMock entre Mock* y Http*
export function provideApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AuthApi, useClass: MockAuthApi },
    { provide: UserApi, useClass: MockUserApi },
    { provide: FolderApi, useClass: MockFolderApi },
    { provide: FileApi, useClass: MockFileApi },
    { provide: ShareApi, useClass: MockShareApi },
    { provide: CommentApi, useClass: MockCommentApi },
    { provide: TrashApi, useClass: MockTrashApi },
    { provide: ActivityApi, useClass: MockActivityApi }
  ]);
}