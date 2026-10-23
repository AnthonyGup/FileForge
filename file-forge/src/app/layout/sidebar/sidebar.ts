import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Layout } from '@app/core/services/layout';
import { Auth } from '@app/core/services/auth';
import { UiIconName } from '@app/shared/icons/ui-icons';
import { UiIcon } from '@app/shared/icons/ui-icon/ui-icon';

interface MenuItem {
  label: string;
  icon: UiIconName;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, UiIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly layout = inject(Layout);
  protected readonly auth = inject(Auth);

  protected readonly items: MenuItem[] = [
    { label: 'Mis archivos', icon: 'folder', route: '/explorer' },
    { label: 'Compartidos por mí', icon: 'upload', route: '/shared-by-me' },
    { label: 'Compartidos conmigo', icon: 'download', route: '/shared-with-me' },
    { label: 'Papelera', icon: 'delete', route: '/trash' },
    { label: 'Actividad', icon: 'activity', route: '/activity' },
    { label: 'Reportes', icon: 'reports', route: '/reports' },
    { label: 'Administración', icon: 'admin', route: '/admin', adminOnly: true },
  ];

  protected readonly visibleItems = computed(() =>
    this.items.filter(item => !item.adminOnly || this.auth.isAdmin())
  );
}
