import { Component, inject, signal } from '@angular/core';
import { Layout } from '@app/core/services/layout';
import { Auth } from '@app/core/services/auth';
import { ProfileDialog } from '@app/features/profile/profile-dialog/profile-dialog';
import { UiIcon } from '@app/shared/icons/ui-icon/ui-icon';

@Component({
  selector: 'app-navbar',
  imports: [UiIcon, ProfileDialog],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  protected readonly layout = inject(Layout);
  protected readonly auth = inject(Auth);

  protected readonly profileOpen = signal(false);
}
