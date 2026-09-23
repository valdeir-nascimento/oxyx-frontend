import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ACCOUNT_GATEWAY } from './identity/application/account/account-gateway';
import { AUTHENTICATION_GATEWAY } from './identity/application/authentication/authentication-gateway';
import { SessionStore } from './identity/application/authentication/session-store';
import { IdentityHttpAdapter } from './identity/infrastructure/identity-http.adapter';
import { SESSION_INVALIDATION } from './shared/application/session-invalidation';
import { httpErrorInterceptor } from './shared/infrastructure/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      // withCredentials não é necessário: o cookie de sessão é de mesma origem em produção,
      // e o proxy de desenvolvimento do Angular mantém isso verdadeiro.
      withInterceptors([httpErrorInterceptor]),
      // Casa com o CookieCsrfTokenRepository.withHttpOnlyFalse() do backend: o Angular lê o
      // cookie XSRF-TOKEN e devolve o valor no cabeçalho X-XSRF-TOKEN.
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    // As portas declaradas em `application` recebem aqui a sua implementação HTTP. É o único ponto
    // do cliente onde as duas camadas se encontram.
    { provide: AUTHENTICATION_GATEWAY, useExisting: IdentityHttpAdapter },
    { provide: ACCOUNT_GATEWAY, useExisting: IdentityHttpAdapter },
    // Quem esquece a identidade quando o backend recusa a sessão. O interceptador vive em `shared`,
    // que não conhece o contexto `identity`: é aqui que os dois se encontram.
    { provide: SESSION_INVALIDATION, useExisting: SessionStore },
  ],
};
