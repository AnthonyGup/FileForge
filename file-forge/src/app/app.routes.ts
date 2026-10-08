import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell').then(m => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'explorer' },
      {
        path: 'explorer',
        loadComponent: () =>
          import('./features/explorer/explorer').then(m => m.Explorer)
      },
      {
        path: 'shared-by-me',
        loadComponent: () =>
          import('./features/sharing/shared-by-me/shared-by-me').then(m => m.SharedByMe)
      },
      {
        path: 'shared-with-me',
        loadComponent: () =>
          import('./features/sharing/shared-with-me/shared-with-me').then(m => m.SharedWithMe)
      },
      {
        path: 'trash',
        loadComponent: () =>
          import('./features/trash/trash').then(m => m.Trash)
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./features/activity/activity').then(m => m.Activity)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports').then(m => m.Reports)
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin').then(m => m.Admin)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
