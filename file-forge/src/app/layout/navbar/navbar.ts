import { Component, inject } from '@angular/core';
import { Layout } from '@app/core/services/layout';
import { Auth } from '@app/core/services/auth';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  protected readonly layout = inject(Layout);
  protected readonly auth = inject(Auth);
}