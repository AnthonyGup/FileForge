import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '@app/core/models';
import { Auth } from '@app/core/services/auth';

function defaultMessage(status: number): string {
  switch (status) {
    case 0:   return 'No se pudo conectar con el servidor';
    case 400: return 'La solicitud no es válida';
    case 401: return 'Tu sesión expiró. Inicia sesión nuevamente';
    case 403: return 'No tienes permiso para realizar esta operación';
    case 404: return 'El recurso no existe';
    case 409: return 'La operación genera un conflicto';
    default:  return 'Ocurrió un error inesperado';
  }
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Un 401 en el login significa credenciales inválidas, no sesión expirada
      if (err.status === 401 && !req.url.endsWith('/auth/login')) {
        auth.logout();
      }

      const apiError: ApiError = {
        status: err.status,
        message: err.error?.message ?? defaultMessage(err.status)
      };
      return throwError(() => apiError);
    })
  );
};