import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideApi } from '@app/core/api';
import { Activity } from './activity';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function create(token: string = 'mock-token-u2'): Promise<ComponentFixture<Activity>> {
  localStorage.setItem('token', token);
  const fixture = TestBed.createComponent(Activity);
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
  return fixture;
}

describe('Activity', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Activity],
      providers: [provideRouter([]), provideApi()],
    }).compileComponents();
  });

  it('lista la actividad del usuario actual (Ana)', async () => {
    const fixture = await create('mock-token-u2');
    const rows = fixture.nativeElement.querySelectorAll('.activity__table tbody tr');
    // h1 (upload a3), h2 (share a3), h3 (comment a3 by Luis), h5 (delete a6) = 4
    expect(rows.length).toBe(4);

    const text = fixture.nativeElement.querySelector('.activity__table').textContent as string;
    expect(text).toContain('Subida');
    expect(text).toContain('Compartido');
    expect(text).toContain('Comentario');
    expect(text).toContain('Envío a papelera');
    expect(text).toContain('Ana López');
  });

  it('filtra por acción "upload"', async () => {
    const fixture = await create('mock-token-u2');
    const select = fixture.nativeElement.querySelector('#filter-action') as HTMLSelectElement;
    select.value = 'upload';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await wait(400);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.activity__table tbody tr');
    expect(rows.length).toBe(1);
    const text = fixture.nativeElement.querySelector('.activity__table').textContent as string;
    expect(text).toContain('Subida');
    expect(text).toContain('informe-q1.md');
  });

  it('filtra por fecha', async () => {
    const fixture = await create('mock-token-u2');
    // h5 deleted iso(1) = 1 day ago; h3 comment iso(5) = 5 days ago; h2 share iso(13); h1 upload iso(24)
    // Filter dateFrom = 10 days ago (iso(10))
    const date10 = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const fromInput = fixture.nativeElement.querySelector('#filter-from') as HTMLInputElement;
    fromInput.value = date10;
    fromInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await wait(400);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.activity__table tbody tr');
    // Should show h1, h2 (h3 iso(5) < 10, h5 iso(1) < 10)
    expect(rows.length).toBe(2);
  });

  it('pagina los resultados', async () => {
    const fixture = await create('mock-token-u2');
    // 4 items para Ana; con pageSize 2 => 2 páginas
    const comp = fixture.componentInstance as unknown as { onPageSizeChange: (n: number) => void };
    comp.onPageSizeChange(2);
    await fixture.whenStable();
    await wait(400);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.activity__table tbody tr');
    expect(rows.length).toBe(2);
    const pagination = fixture.nativeElement.querySelector('app-pagination');
    expect(pagination?.textContent).toContain('Página 1 de 2');
  });

  it('el admin ve toda la actividad (5 items)', async () => {
    const fixture = await create('mock-token-u1');
    const rows = fixture.nativeElement.querySelectorAll('.activity__table tbody tr');
    expect(rows.length).toBe(5);

    const text = fixture.nativeElement.querySelector('.activity__table').textContent as string;
    expect(text).toContain('Subida');
    expect(text).toContain('Comentario');
    expect(text).toContain('Envío a papelera');
    expect(text).toContain('Compartido');
    expect(text).toContain('Luis Pérez');
  });
});