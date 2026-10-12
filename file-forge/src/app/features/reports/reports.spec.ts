import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideApi } from '@app/core/api';
import { Reports } from './reports';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const USERS: Record<string, { name: string; email: string; role: 'admin' | 'user' }> = {
  u1: { name: 'Admin Sistema', email: 'admin@demo.com', role: 'admin' },
  u2: { name: 'Ana López', email: 'ana@demo.com', role: 'user' },
  u3: { name: 'Luis Pérez', email: 'luis@demo.com', role: 'user' },
};

function seedSession(token: string): void {
  const id = token.replace('mock-token-', '');
  const u = USERS[id];
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({ id, name: u.name, email: u.email, role: u.role, active: true }));
}

async function create(token: string = 'mock-token-u2'): Promise<ComponentFixture<Reports>> {
  seedSession(token);
  const fixture = TestBed.createComponent(Reports);
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
  return fixture;
}

function rowCount(fixture: ComponentFixture<Reports>): number {
  return fixture.nativeElement.querySelectorAll('.reports__table tbody tr').length;
}

function cellText(fixture: ComponentFixture<Reports>, row: number, col: number): string {
  const rows = fixture.nativeElement.querySelectorAll('.reports__table tbody tr');
  return rows[row].querySelectorAll('td')[col].textContent.trim();
}

async function openTab(fixture: ComponentFixture<Reports>, index: number): Promise<void> {
  const tabs = fixture.nativeElement.querySelectorAll('.reports__tab');
  (tabs[index] as HTMLButtonElement).click();
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
}

describe('Reports', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [provideApi()],
    }).compileComponents();
  });

  it('agrupa los archivos de Ana por tipo', async () => {
    const fixture = await create('mock-token-u2');

    expect(rowCount(fixture)).toBe(2);
    // Ordenado por cantidad desc: txt (14) primero, md (2) después
    expect(cellText(fixture, 0, 0)).toBe('Texto (.txt)');
    expect(cellText(fixture, 0, 1)).toBe('14');
    expect(cellText(fixture, 1, 0)).toBe('Markdown (.md)');
    expect(cellText(fixture, 1, 1)).toBe('2');
  });

  it('filtra por rango de fechas', async () => {
    const fixture = await create('mock-token-u2');

    const from = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const fromInput = fixture.nativeElement.querySelector('#report-from') as HTMLInputElement;
    fromInput.value = from;
    fromInput.dispatchEvent(new Event('change'));
    const form = fixture.nativeElement.querySelector('.reports__filters') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    await fixture.whenStable();
    await wait(400);
    fixture.detectChanges();

    // Solo sobreviven los 10 reportes de los últimos 10 días (todos .txt)
    expect(rowCount(fixture)).toBe(1);
    expect(cellText(fixture, 0, 0)).toBe('Texto (.txt)');
    expect(cellText(fixture, 0, 1)).toBe('10');
  });

  it('muestra error con un rango de fechas inválido', async () => {
    const fixture = await create('mock-token-u2');

    const from = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const to = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const fromInput = fixture.nativeElement.querySelector('#report-from') as HTMLInputElement;
    fromInput.value = from;
    fromInput.dispatchEvent(new Event('change'));
    const toInput = fixture.nativeElement.querySelector('#report-to') as HTMLInputElement;
    toInput.value = to;
    toInput.dispatchEvent(new Event('change'));
    const form = fixture.nativeElement.querySelector('.reports__filters') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.reports__date-error')).toBeTruthy();
  });

  it('muestra estado vacío sin coincidencias', async () => {
    const fixture = await create('mock-token-u2');

    const future = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const fromInput = fixture.nativeElement.querySelector('#report-from') as HTMLInputElement;
    fromInput.value = future;
    fromInput.dispatchEvent(new Event('change'));
    const form = fixture.nativeElement.querySelector('.reports__filters') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    await fixture.whenStable();
    await wait(400);
    fixture.detectChanges();

    expect(rowCount(fixture)).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No hay datos que coincidan');
  });

  it('el admin reporta sobre todo el sistema', async () => {
    const fixture = await create('mock-token-u1');

    expect(rowCount(fixture)).toBe(2);
    expect(cellText(fixture, 0, 0)).toBe('Texto (.txt)');
    expect(cellText(fixture, 0, 1)).toBe('15');
    expect(cellText(fixture, 1, 1)).toBe('4');
  });

  it('reporta la actividad de Ana por acción', async () => {
    const fixture = await create('mock-token-u2');
    await openTab(fixture, 1);

    // h1 upload, h2 share, h3 comment (de Luis sobre a3) y h5 delete -> 1 c/u
    expect(rowCount(fixture)).toBe(4);
    expect(cellText(fixture, 0, 0)).toBe('Comentario');
    expect(cellText(fixture, 0, 1)).toBe('1');
    const text = fixture.nativeElement.querySelector('.reports__table').textContent as string;
    expect(text).toContain('Subida');
    expect(text).toContain('Compartido');
    expect(text).toContain('Envío a papelera');
  });

  it('reporta la actividad global para el admin', async () => {
    const fixture = await create('mock-token-u1');
    await openTab(fixture, 1);

    // upload h1 + h4 = 2; comment/delete/share = 1
    expect(rowCount(fixture)).toBe(4);
    expect(cellText(fixture, 0, 0)).toBe('Subida');
    expect(cellText(fixture, 0, 1)).toBe('2');
  });

  it('agrupa el almacenamiento de Ana por carpeta', async () => {
    const fixture = await create('mock-token-u2');

    await openTab(fixture, 2);

    // Informes (14) por delante, y también aparece la raíz ("Sin carpeta").
    expect(rowCount(fixture)).toBe(3);
    expect(cellText(fixture, 0, 0)).toBe('Informes');
    expect(cellText(fixture, 0, 1)).toBe('14');
    expect(fixture.nativeElement.textContent).toContain('Sin carpeta');
  });

  it('el admin ve el almacenamiento por usuario', async () => {
    const fixture = await create('mock-token-u1');
    await openTab(fixture, 2);

    expect(rowCount(fixture)).toBe(2);
    expect(cellText(fixture, 0, 0)).toBe('Ana López');
    expect(cellText(fixture, 0, 1)).toBe('16');
    expect(cellText(fixture, 1, 0)).toBe('Luis Pérez');
    expect(cellText(fixture, 1, 1)).toBe('3');
  });
});
