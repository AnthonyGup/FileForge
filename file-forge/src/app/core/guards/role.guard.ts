import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '@app/core/models';
import { Auth } from '@app/core/services/auth';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const roles = (route.data['roles'] as UserRole[] | undefined) ?? [];
  const user = auth.user();

  if (user && (roles.length === 0 || roles.includes(user.role))) {
    return true;
  }
  return router.createUrlTree(['/explorer']);
};