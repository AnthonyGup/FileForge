import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';
import { Auth } from '@app/core/services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Auth).token();

  if (!token || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};