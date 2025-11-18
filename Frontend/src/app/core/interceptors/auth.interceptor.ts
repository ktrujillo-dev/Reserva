import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Clona la petición para añadir el nuevo encabezado.
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Envía la petición clonada con el encabezado.
  return next(authReq).pipe(
    catchError(error => {
      // Si el error es 401, cierra la sesión.
      if (error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
