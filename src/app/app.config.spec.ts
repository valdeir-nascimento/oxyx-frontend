import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ACCOUNT_GATEWAY } from './identity/application/account/account-gateway';
import { AUTHENTICATION_GATEWAY } from './identity/application/authentication/authentication-gateway';
import { CARETAKER_GATEWAY } from './identity/application/caretaker/caretaker-gateway';
import { SessionStore } from './identity/application/authentication/session-store';
import { IdentityHttpAdapter } from './identity/infrastructure/identity-http.adapter';
import { appConfig } from './app.config';

/**
 * A raiz de composição é onde porta e implementação se encontram, e é o único ponto do cliente que
 * o compilador não confere: `useExisting` aceita qualquer coisa.
 *
 * Sem este arquivo, apagar uma linha de `app.config.ts` mantinha a suíte inteira verde e derrubava
 * a aplicação em produção: sem o interceptador de sessão, um 401 deixava a identidade em memória, e
 * o guard devolvia a pessoa à casca com o cookie já recusado (FR-003).
 */
describe('appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
  });

  it('serves every backend port from the single HTTP adapter', () => {
    const adapter = TestBed.inject(IdentityHttpAdapter);

    expect(TestBed.inject(AUTHENTICATION_GATEWAY)).toBe(adapter);
    expect(TestBed.inject(ACCOUNT_GATEWAY)).toBe(adapter);
    expect(TestBed.inject(CARETAKER_GATEWAY)).toBe(adapter);
  });

  it('forgets the identity when the backend refuses the session', () => {
    const session = TestBed.inject(SessionStore);
    session.remember({ id: 'maria', fullName: 'Maria Silva', role: 'USER', mustChangePassword: false });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    TestBed.inject(HttpClient).get('/api/v1/anything').subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/anything')
      .flush({ code: 'UNAUTHENTICATED', status: 401 }, { status: 401, statusText: 'Unauthorized' });

    expect(session.caretaker()).toBeNull();
  });
});
