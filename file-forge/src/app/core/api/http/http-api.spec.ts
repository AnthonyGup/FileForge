import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { User } from '@app/core/models';
import {
  API_URL, HttpActivityApi, HttpAuthApi, HttpCommentApi, HttpFileApi, HttpFolderApi,
  HttpReportApi, HttpShareApi, HttpTrashApi, HttpUserApi
} from './index';

const user: User = {
  id: 'u2', name: 'Ana López', email: 'ana@demo.com', role: 'user', active: true,
  storageUsed: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01', lastLoginAt: null
};

describe('Http API', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpAuthApi, HttpUserApi, HttpFolderApi, HttpFileApi, HttpShareApi,
        HttpCommentApi, HttpTrashApi, HttpActivityApi, HttpReportApi
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('auth: POST /auth/login con el cuerpo de credenciales', async () => {
    const api = TestBed.inject(HttpAuthApi);
    const promise = firstValueFrom(api.login({ email: 'ana@demo.com', password: '123456' }));

    const req = http.expectOne(`${API_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@demo.com', password: '123456' });
    req.flush({ token: 't', user });

    expect((await promise).user).toEqual(user);
  });

  it('users: list, listForSharing, create y update', async () => {
    const api = TestBed.inject(HttpUserApi);

    const list = firstValueFrom(api.list());
    http.expectOne(`${API_URL}/users`).flush([user]);
    expect((await list).length).toBe(1);

    const sharing = firstValueFrom(api.listForSharing());
    http.expectOne(`${API_URL}/users/sharing`).flush([]);
    await sharing;

    const create = firstValueFrom(api.create({ name: 'X', email: 'x@y.com', password: '1', role: 'user' }));
    const postReq = http.expectOne(`${API_URL}/users`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush(user);
    await create;

    const update = firstValueFrom(api.update('u2', { role: 'admin' }));
    const patchReq = http.expectOne(`${API_URL}/users/u2`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ role: 'admin' });
    patchReq.flush({ ...user, role: 'admin' });
    await update;
  });

  it('folders: list con parentId, breadcrumb raíz/carpeta, rename y remove', async () => {
    const api = TestBed.inject(HttpFolderApi);

    const root = firstValueFrom(api.list(null));
    const rootReq = http.expectOne(r => r.url === `${API_URL}/folders`);
    expect(rootReq.request.params.has('parentId')).toBe(false);
    rootReq.flush([]);
    await root;

    const child = firstValueFrom(api.list('f1'));
    const childReq = http.expectOne(r => r.url === `${API_URL}/folders`);
    expect(childReq.request.params.get('parentId')).toBe('f1');
    childReq.flush([]);
    await child;

    const bcRoot = firstValueFrom(api.breadcrumb(null));
    http.expectOne(`${API_URL}/folders/breadcrumb`).flush([]);
    await bcRoot;

    const bc = firstValueFrom(api.breadcrumb('f1'));
    http.expectOne(`${API_URL}/folders/f1/breadcrumb`).flush([]);
    await bc;

    const rename = firstValueFrom(api.rename('f1', { name: 'Nuevo' }));
    const renameReq = http.expectOne(`${API_URL}/folders/f1`);
    expect(renameReq.request.method).toBe('PATCH');
    expect(renameReq.request.body).toEqual({ name: 'Nuevo' });
    renameReq.flush({} as never);
    await rename;

    const remove = firstValueFrom(api.remove('f1'));
    const delReq = http.expectOne(`${API_URL}/folders/f1`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
    await remove;
  });

  it('files: list serializa folderId (global/raíz) y filtros', async () => {
    const api = TestBed.inject(HttpFileApi);

    const global = firstValueFrom(api.list());
    const globalReq = http.expectOne(r => r.url === `${API_URL}/files`);
    expect(globalReq.request.params.has('folderId')).toBe(false);
    globalReq.flush({ items: [], total: 0, page: 1, pageSize: 10 });
    await global;

    const root = firstValueFrom(api.list({ folderId: null }));
    const rootReq = http.expectOne(r => r.url === `${API_URL}/files`);
    expect(rootReq.request.params.get('folderId')).toBe('root');
    rootReq.flush({ items: [], total: 0, page: 1, pageSize: 10 });
    await root;

    const filtered = firstValueFrom(api.list({ folderId: 'f3', search: 'rep', extension: 'txt', page: 2, pageSize: 5 }));
    const filterReq = http.expectOne(r => r.url === `${API_URL}/files`);
    expect(filterReq.request.params.get('folderId')).toBe('f3');
    expect(filterReq.request.params.get('search')).toBe('rep');
    expect(filterReq.request.params.get('extension')).toBe('txt');
    expect(filterReq.request.params.get('page')).toBe('2');
    expect(filterReq.request.params.get('pageSize')).toBe('5');
    filterReq.flush({ items: [], total: 0, page: 2, pageSize: 5 });
    await filtered;
  });

  it('files: upload multipart, content, updateContent, download blob y remove', async () => {
    const api = TestBed.inject(HttpFileApi);

    const file = new File(['hola'], 'nota.md', { type: 'text/markdown' });
    const upload = firstValueFrom(api.upload(file, null));
    const uploadReq = http.expectOne(`${API_URL}/files`);
    expect(uploadReq.request.method).toBe('POST');
    const body = uploadReq.request.body as FormData;
    expect(body instanceof FormData).toBe(true);
    expect(body.get('file')).toBeInstanceOf(File);
    expect(body.has('folderId')).toBe(false);
    uploadReq.flush({} as never);
    await upload;

    const uploadFolder = firstValueFrom(api.upload(file, 'f3'));
    const uploadFolderReq = http.expectOne(`${API_URL}/files`);
    expect((uploadFolderReq.request.body as FormData).get('folderId')).toBe('f3');
    uploadFolderReq.flush({} as never);
    await uploadFolder;

    const content = firstValueFrom(api.getContent('a1'));
    http.expectOne(`${API_URL}/files/a1/content`).flush({ fileId: 'a1', content: 'hola' });
    await content;

    const update = firstValueFrom(api.updateContent('a1', { content: 'nuevo' }));
    const putReq = http.expectOne(`${API_URL}/files/a1/content`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ content: 'nuevo' });
    putReq.flush({} as never);
    await update;

    const download = firstValueFrom(api.download('a1'));
    const dlReq = http.expectOne(`${API_URL}/files/a1/download`);
    expect(dlReq.request.responseType).toBe('blob');
    dlReq.flush(new Blob(['hola']));
    expect((await download).size).toBe(4);

    const remove = firstValueFrom(api.remove('a1'));
    const delReq = http.expectOne(`${API_URL}/files/a1`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
    await remove;
  });

  it('shares: create, listByResource con query, by-me, with-me y revoke', async () => {
    const api = TestBed.inject(HttpShareApi);

    const create = firstValueFrom(api.create({ resourceType: 'file', resourceId: 'a1', sharedWithId: 'u3', permission: 'read' }));
    const createReq = http.expectOne(`${API_URL}/shares`);
    expect(createReq.request.method).toBe('POST');
    createReq.flush({} as never);
    await create;

    const byResource = firstValueFrom(api.listByResource('file', 'a1'));
    const byResourceReq = http.expectOne(r => r.url === `${API_URL}/shares`);
    expect(byResourceReq.request.params.get('resourceType')).toBe('file');
    expect(byResourceReq.request.params.get('resourceId')).toBe('a1');
    byResourceReq.flush([]);
    await byResource;

    const byMe = firstValueFrom(api.sharedByMe());
    http.expectOne(`${API_URL}/shares/by-me`).flush([]);
    await byMe;

    const withMe = firstValueFrom(api.sharedWithMe());
    http.expectOne(`${API_URL}/shares/with-me`).flush([]);
    await withMe;

    const revoke = firstValueFrom(api.revoke('s1'));
    const revokeReq = http.expectOne(`${API_URL}/shares/s1`);
    expect(revokeReq.request.method).toBe('DELETE');
    revokeReq.flush(null);
    await revoke;
  });

  it('comments: list y create bajo el archivo', async () => {
    const api = TestBed.inject(HttpCommentApi);

    const list = firstValueFrom(api.list('a1'));
    http.expectOne(`${API_URL}/files/a1/comments`).flush([]);
    await list;

    const create = firstValueFrom(api.create('a1', { text: 'hola' }));
    const createReq = http.expectOne(`${API_URL}/files/a1/comments`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({ text: 'hola' });
    createReq.flush({} as never);
    await create;
  });

  it('trash: list, restore y deletePermanent con tipo', async () => {
    const api = TestBed.inject(HttpTrashApi);

    const list = firstValueFrom(api.list());
    http.expectOne(`${API_URL}/trash`).flush([]);
    await list;

    const restore = firstValueFrom(api.restore('file', 'a1'));
    const restoreReq = http.expectOne(`${API_URL}/trash/file/a1/restore`);
    expect(restoreReq.request.method).toBe('POST');
    restoreReq.flush(null);
    await restore;

    const remove = firstValueFrom(api.deletePermanent('folder', 'f1'));
    const removeReq = http.expectOne(`${API_URL}/trash/folder/f1`);
    expect(removeReq.request.method).toBe('DELETE');
    removeReq.flush(null);
    await remove;
  });

  it('activity y reports: envían los filtros como query params', async () => {
    const activity = TestBed.inject(HttpActivityApi);
    const activity$ = firstValueFrom(activity.list({ action: 'upload', page: 1, pageSize: 20 }));
    const activityReq = http.expectOne(r => r.url === `${API_URL}/activity`);
    expect(activityReq.request.params.get('action')).toBe('upload');
    activityReq.flush({ items: [], total: 0, page: 1, pageSize: 20 });
    await activity$;

    const reports = TestBed.inject(HttpReportApi);

    const byType = firstValueFrom(reports.filesByType({ from: '2026-01-01', to: '2026-12-31' }));
    const byTypeReq = http.expectOne(r => r.url === `${API_URL}/reports/files-by-type`);
    expect(byTypeReq.request.params.get('from')).toBe('2026-01-01');
    expect(byTypeReq.request.params.get('to')).toBe('2026-12-31');
    byTypeReq.flush([]);
    await byType;

    const byAction = firstValueFrom(reports.activityByAction());
    http.expectOne(`${API_URL}/reports/activity-by-action`).flush([]);
    await byAction;

    const storage = firstValueFrom(reports.storageUsage());
    http.expectOne(`${API_URL}/reports/storage-usage`).flush([]);
    await storage;
  });
});
