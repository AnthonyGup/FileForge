import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideApi } from '@app/core/api';
import { Trash } from './trash';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function create(): Promise<ComponentFixture<Trash>> {
  const fixture = TestBed.createComponent(Trash);
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
  return fixture;
}

describe('Trash', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', 'mock-token-u2');
    await TestBed.configureTestingModule({
      imports: [Trash],
      providers: [provideApi()],
    }).compileComponents();
  });

  it('lista los elementos de la papelera', async () => {
    const fixture = await create();
    const rows = fixture.nativeElement.querySelectorAll('.trash__table tbody tr');
    expect(rows.length).toBe(2);

    const text = fixture.nativeElement.querySelector('.trash__table').textContent as string;
    expect(text).toContain('viejo.txt');
    expect(text).toContain('Borrador');
  });

  it('restaura un elemento', async () => {
    const fixture = await create();

    const restore = fixture.nativeElement.querySelector('button[aria-label="Restaurar viejo.txt"]') as HTMLButtonElement;
    expect(restore).toBeTruthy();
    restore.click();
    await fixture.whenStable();
    await wait(900);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.trash__table').textContent).not.toContain('viejo.txt');
  });

  it('elimina un elemento definitivamente', async () => {
    const fixture = await create();

    const remove = fixture.nativeElement.querySelector('button[aria-label="Eliminar definitivamente Borrador"]') as HTMLButtonElement;
    remove.click();
    fixture.detectChanges();

    const confirm = fixture.nativeElement.querySelector('app-confirm-dialog .btn--danger') as HTMLButtonElement;
    expect(confirm).toBeTruthy();
    confirm.click();
    await fixture.whenStable();
    await wait(900);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.trash__table').textContent).not.toContain('Borrador');
  });

  it('muestra el estado vacío cuando no hay elementos', async () => {
    localStorage.setItem('token', 'mock-token-u1');
    const fixture = await create();
    expect(fixture.nativeElement.querySelector('.trash__state')?.textContent).toContain('La papelera está vacía.');
  });
});
