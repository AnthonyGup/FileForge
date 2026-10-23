import { Component, inject } from '@angular/core';
import { Layout } from '@app/core/services/layout';
import { Auth } from '@app/core/services/auth';
import { UiIcon } from '@app/shared/icons/ui-icon/ui-icon';

@Component({
  selector: 'app-navbar',
  imports: [UiIcon],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  protected readonly layout = inject(Layout);
  protected readonly auth = inject(Auth);
}