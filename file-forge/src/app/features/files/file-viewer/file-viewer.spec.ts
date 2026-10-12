import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideApi } from '@app/core/api';
import { FileViewer } from './file-viewer';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function create(fileId: string): Promise<ComponentFixture<FileViewer>> {
  const fixture = TestBed.createComponent(FileViewer);
  fixture.componentRef.setInput('fileId', fileId);
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
  return fixture;
}

describe('FileViewer', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', 'mock-token-u2');
    localStorage.setItem('user', JSON.stringify({ id: 'u2', name: 'Ana López', email: 'ana@demo.com', role: 'user', active: true }));
    await TestBed.configureTestingModule({
      imports: [FileViewer],
      providers: [provideRouter([]), provideApi()],
    }).compileComponents();
  });

  it('muestra el contenido de un archivo .txt', async () => {
    const fixture = await create('a2');
    const pre = fixture.nativeElement.querySelector('.viewer__content--text');
    expect(pre?.textContent).toContain('Notas generales de la semana.');
  });

  it('renderiza un archivo .md como HTML', async () => {
    const fixture = await create('a1');
    const article = fixture.nativeElement.querySelector('.markdown');
    expect(article?.innerHTML).toContain('<h1>Contrato ACME</h1>');
  });

  it('muestra un mensaje de error si el archivo no existe', async () => {
    const fixture = await create('nope');
    expect(fixture.nativeElement.querySelector('.viewer__state--error')).toBeTruthy();
  });

  it('guarda cambios en un archivo propio', async () => {
    const fixture = await create('a2');
    const component = fixture.componentInstance as unknown as {
      startEdit: () => void;
      save: () => void;
    };

    component.startEdit();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('.viewer__editor') as HTMLTextAreaElement;
    textarea.value = 'Contenido actualizado';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    component.save();
    await fixture.whenStable();
    await wait(400);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.viewer__editor')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.viewer__content--text')?.textContent)
      .toContain('Contenido actualizado');
  });

  it('muestra error al guardar un archivo compartido sin permiso de edición', async () => {
    const fixture = await create('b1');
    const component = fixture.componentInstance as unknown as { startEdit: () => void; save: () => void };

    component.startEdit();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('.viewer__editor') as HTMLTextAreaElement;
    textarea.value = 'Intento sin permiso';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    component.save();
    await fixture.whenStable();
    await wait(400);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-alert')).toBeTruthy();
  });

  it('muestra los comentarios y el compositor en un archivo propio', async () => {
    const fixture = await create('a3');
    await wait(400);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.comments__list')?.textContent)
      .toContain('Revisé el informe, todo en orden.');
    expect(fixture.nativeElement.querySelector('.comments__input')).toBeTruthy();
  });

  it('oculta el compositor de comentarios en un archivo ajeno', async () => {
    const fixture = await create('b2');
    await wait(400);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.comments__input')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.comments__readonly')).toBeTruthy();
  });
});
