import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthenticationService } from '../service/authentication.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authenticationService: AuthenticationService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const baseUrl: string = environment.apiUrl;

    if (
      request.url.includes(`${baseUrl}/user/login`) ||
      request.url.includes(`${baseUrl}/user/register`)
    ) {
      return next.handle(request);
    }

    this.authenticationService.loadToken();
    const token = this.authenticationService.getToken();

    const clonedRequest: HttpRequest<any> = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });

    return next.handle(clonedRequest);
  }
}
