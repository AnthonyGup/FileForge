import { Component, inject } from '@angular/core';
import { Layout } from '../../core/services/layout';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly layout = inject(Layout);

  // Temporal: se reemplaza con el usuario real en la Fase 5
  protected readonly userName = 'Usuario Demo';
}
