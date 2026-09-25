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
import { CARETAKER_GATEWAY } from './identity/application/caretaker/caretaker-gateway';
import { CAGE_GATEWAY } from './farm/application/cage/cage-gateway';
import { SECTOR_GATEWAY } from './farm/application/sector/sector-gateway';
import { FarmHttpAdapter } from './farm/infrastructure/farm-http.adapter';
import { SessionViewer } from './identity/application/authentication/session-viewer';
import { IdentityHttpAdapter } from './identity/infrastructure/identity-http.adapter';
import { VIEWER } from './shared/application/viewer';
import { sessionInterceptor } from './identity/infrastructure/session.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      // withCredentials não é necessário: o cookie de sessão é de mesma origem em produção,
      // e o proxy de desenvolvimento do Angular mantém isso verdadeiro.
      withInterceptors([sessionInterceptor]),
      // Casa com o CookieCsrfTokenRepository.withHttpOnlyFalse() do backend: o Angular lê o
      // cookie XSRF-TOKEN e devolve o valor no cabeçalho X-XSRF-TOKEN.
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    // As portas declaradas em `application` recebem aqui a sua implementação HTTP. É o único ponto
    // do cliente onde as duas camadas se encontram.
    { provide: AUTHENTICATION_GATEWAY, useExisting: IdentityHttpAdapter },
    { provide: ACCOUNT_GATEWAY, useExisting: IdentityHttpAdapter },
    { provide: CARETAKER_GATEWAY, useExisting: IdentityHttpAdapter },
    { provide: SECTOR_GATEWAY, useExisting: FarmHttpAdapter },
    { provide: CAGE_GATEWAY, useExisting: FarmHttpAdapter },
    // O perfil de quem vê, para as telas dos contextos que não conhecem o identity (feature 002).
    { provide: VIEWER, useExisting: SessionViewer },
  ],
};
