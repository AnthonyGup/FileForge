import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideApi } from '@app/core/api';
import { Admin } from './admin';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function create(token: string = 'mock-token-u1'): Promise<ComponentFixture<Admin>> {
  const id = token.replace('mock-token-', '');
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({
    id,
    name: id === 'u1' ? 'Admin Sistema' : 'Ana López',
    email: id === 'u1' ? 'admin@demo.com' : 'ana@demo.com',
    role: id === 'u1' ? 'admin' : 'user',
    active: true,
  }));

  const fixture = TestBed.createComponent(Admin);
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
  return fixture;
}

function rows(fixture: ComponentFixture<Admin>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.admin__table tbody tr'));
}

function cell(row: HTMLElement, index: number): HTMLElement {
  return row.querySelectorAll('td')[index] as HTMLElement;
}

describe('Admin', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [provideApi(), provideRouter([])],
    }).compileComponents();
  });

  it('lista los usuarios y muestra el resumen global', async () => {
    const fixture = await create();

    expect(rows(fixture).length).toBe(3);
    expect(rows(fixture)[0].textContent).toContain('Admin Sistema');
    const stats = fixture.nativeElement.querySelectorAll('.stat__value');
    expect((stats[0] as HTMLElement).textContent?.trim()).toBe('3');
    expect((stats[2] as HTMLElement).textContent?.trim()).toBe('1');
  });

  it('crea un usuario nuevo', async () => {
    const fixture = await create();

    const name = fixture.nativeElement.querySelector('.admin__new input[type="text"]') as HTMLInputElement;
    name.value = 'Nuevo Usuario';
    name.dispatchEvent(new Event('input'));
    const email = fixture.nativeElement.querySelector('.admin__new input[type="email"]') as HTMLInputElement;
    email.value = 'nuevo@demo.com';
    email.dispatchEvent(new Event('input'));
    const password = fixture.nativeElement.querySelector('.admin__new input[type="password"]') as HTMLInputElement;
    password.value = '123456';
    password.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('.admin__new') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    await fixture.whenStable();
    await wait(900);
    fixture.detectChanges();

    expect(rows(fixture).length).toBe(4);
    expect(rows(fixture)[3].textContent).toContain('nuevo@demo.com');
  });

  it('avisa cuando faltan campos al crear', async () => {
    const fixture = await create();

    const form = fixture.nativeElement.querySelector('.admin__new') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.admin__new .form-alert')).toBeTruthy();
  });

  it('cambia el rol de un usuario', async () => {
    const fixture = await create();

    const ana = rows(fixture)[1];
    const select = cell(ana, 2).querySelector('select') as HTMLSelectElement;
    select.value = 'admin';
    select.dispatchEvent(new Event('change'));

    await fixture.whenStable();
    await wait(900);
    fixture.detectChanges();

    const updated = cell(rows(fixture)[1], 2).querySelector('select') as HTMLSelectElement;
    expect(updated.value).toBe('admin');
  });

  it('activa y desactiva usuarios', async () => {
    const fixture = await create();

    const ana = rows(fixture)[1];
    const status = cell(ana, 3).querySelector('.status') as HTMLButtonElement;
    expect(status.textContent?.trim()).toBe('Activo');

    status.click();
    await fixture.whenStable();
    await wait(900);
    fixture.detectChanges();

    const updated = cell(rows(fixture)[1], 3).querySelector('.status') as HTMLButtonElement;
    expect(updated.textContent?.trim()).toBe('Inactivo');
  });

  it('no permite gestionar al propio administrador', async () => {
    const fixture = await create();

    const self = rows(fixture)[0];
    const select = cell(self, 2).querySelector('select') as HTMLSelectElement;
    const status = cell(self, 3).querySelector('.status') as HTMLButtonElement;

    expect(select.disabled).toBe(true);
    expect(status.disabled).toBe(true);
  });
});
