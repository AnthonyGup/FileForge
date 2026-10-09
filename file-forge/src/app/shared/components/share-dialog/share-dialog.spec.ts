import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideApi } from '@app/core/api';
import { ResourceType } from '@app/core/models';
import { ShareDialog } from './share-dialog';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function create(
  resourceType: string,
  resourceId: string,
  resourceName = 'recurso'
): Promise<ComponentFixture<ShareDialog>> {
  const fixture = TestBed.createComponent(ShareDialog);
  fixture.componentRef.setInput('resourceType', resourceType);
  fixture.componentRef.setInput('resourceId', resourceId);
  fixture.componentRef.setInput('resourceName', resourceName);
  await fixture.whenStable();
  await wait(400);
  fixture.detectChanges();
  return fixture;
}

function selectOption(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('ShareDialog', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', 'mock-token-u2');
    await TestBed.configureTestingModule({
      imports: [ShareDialog],
      providers: [provideApi()]
    }).compileComponents();
  });

  it('lista los usuarios con acceso actual', async () => {
    const fixture = await create('file', 'a3', 'informe-q1.md');
    const items = fixture.nativeElement.querySelectorAll('.share__list li');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Luis Pérez');
  });

  it('comparte el recurso con un usuario nuevo', async () => {
    const fixture = await create('file', 'a2', 'notas.txt');
    const selects = fixture.nativeElement.querySelectorAll('.share__add select') as NodeListOf<HTMLSelectElement>;

    selects[0].value = 'u3';
    selects[0].dispatchEvent(new Event('change'));
    selects[1].value = 'edit';
    selects[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.share__add button') as HTMLButtonElement).click();
    await fixture.whenStable();
    await wait(900);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.share__list li');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Luis Pérez');
  });

  it('retira el acceso de un usuario', async () => {
    const fixture = await create('file', 'a3', 'informe-q1.md');

    (fixture.nativeElement.querySelector('.share__list .icon-btn') as HTMLButtonElement).click();
    await fixture.whenStable();
    await wait(400);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.share__list li').length).toBe(0);
  });
});
