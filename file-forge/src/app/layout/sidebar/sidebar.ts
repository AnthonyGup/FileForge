import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Layout } from '@app/core/services/layout';
import { Auth } from '@app/core/services/auth';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly layout = inject(Layout);
  private readonly auth = inject(Auth);

  protected readonly items: MenuItem[] = [
    { label: 'Mis archivos', icon: '📁', route: '/explorer' },
    { label: 'Compartidos por mí', icon: '📤', route: '/shared-by-me' },
    { label: 'Compartidos conmigo', icon: '📥', route: '/shared-with-me' },
    { label: 'Papelera', icon: '🗑️', route: '/trash' },
    { label: 'Actividad', icon: '🕒', route: '/activity' },
    { label: 'Reportes', icon: '📊', route: '/reports' },
    { label: 'Administración', icon: '⚙️', route: '/admin', adminOnly: true },
  ];

  protected readonly visibleItems = computed(() =>
    this.items.filter(item => !item.adminOnly || this.auth.isAdmin())
  );
}
