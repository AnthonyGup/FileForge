import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideApi } from '@app/core/api';
import { ShareList, ShareMode } from './share-list';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function create(mode: ShareMode): Promise<ComponentFixture<ShareList>> {
  const fixture = TestBed.createComponent(ShareList);
  fixture.componentRef.setInput('mode', mode);
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
  return fixture;
}

describe('ShareList', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', 'mock-token-u2');
    await TestBed.configureTestingModule({
      imports: [ShareList],
      providers: [provideRouter([]), provideApi()],
    }).compileComponents();
  });

  it('lista los recursos compartidos por mí', async () => {
    const fixture = await create('by-me');
    const rows = fixture.nativeElement.querySelectorAll('.shares__table tbody tr');
    expect(rows.length).toBe(2);

    const text = fixture.nativeElement.querySelector('.shares__table').textContent as string;
    expect(text).toContain('informe-q1.md');
    expect(text).toContain('Luis Pérez');
    expect(text).toContain('Edición');
  });

  it('lista los recursos compartidos conmigo y su propietario', async () => {
    const fixture = await create('with-me');
    const rows = fixture.nativeElement.querySelectorAll('.shares__table tbody tr');
    expect(rows.length).toBe(2);

    const text = fixture.nativeElement.querySelector('.shares__table').textContent as string;
    expect(text).toContain('plan.md');
    expect(text).toContain('Luis Pérez');
  });

  it('abre el diálogo de gestión del acceso en modo "por mí"', async () => {
    const fixture = await create('by-me');

    const manage = fixture.nativeElement.querySelector('button[title="Gestionar acceso"]') as HTMLButtonElement;
    expect(manage).toBeTruthy();
    manage.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-share-dialog')).toBeTruthy();
  });
});
