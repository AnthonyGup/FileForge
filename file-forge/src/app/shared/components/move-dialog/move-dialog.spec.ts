import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideApi } from '@app/core/api';
import { MoveDialog } from './move-dialog';

describe('MoveDialog', () => {
  let component: MoveDialog;
  let fixture: ComponentFixture<MoveDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoveDialog],
      providers: [provideApi()],
    }).compileComponents();

    fixture = TestBed.createComponent(MoveDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('itemName', 'notas.txt');
    fixture.componentRef.setInput('currentLocationId', null);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
