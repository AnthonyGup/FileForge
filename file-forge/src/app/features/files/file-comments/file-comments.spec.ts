import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideApi } from '@app/core/api';
import { FileComments } from './file-comments';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function create(fileId: string, canComment: boolean): Promise<ComponentFixture<FileComments>> {
  const fixture = TestBed.createComponent(FileComments);
  fixture.componentRef.setInput('fileId', fileId);
  fixture.componentRef.setInput('canComment', canComment);
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
  return fixture;
}

describe('FileComments', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', 'mock-token-u2');
    await TestBed.configureTestingModule({
      imports: [FileComments],
      providers: [provideApi()],
    }).compileComponents();
  });

  it('lista los comentarios del archivo', async () => {
    const fixture = await create('a3', true);
    const list = fixture.nativeElement.querySelector('.comments__list');
    expect(list?.textContent).toContain('Revisé el informe, todo en orden.');
    expect(list?.textContent).toContain('Luis Pérez');
    expect(fixture.nativeElement.querySelector('.comments__input')).toBeTruthy();
  });

  it('publica un comentario nuevo', async () => {
    const fixture = await create('a3', true);

    const textarea = fixture.nativeElement.querySelector('.comments__input') as HTMLTextAreaElement;
    textarea.value = 'Gracias por la revisión';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.comments__form-actions .btn') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    await wait(900);
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('.comments__list');
    expect(list?.textContent).toContain('Gracias por la revisión');
    expect(list?.textContent).toContain('Ana López');
  });

  it('oculta el compositor y muestra aviso si no se puede comentar', async () => {
    const fixture = await create('b2', false);
    expect(fixture.nativeElement.querySelector('.comments__input')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.comments__readonly')?.textContent)
      .toContain('Solo el propietario puede comentar.');
  });
});
