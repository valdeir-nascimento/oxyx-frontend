import { TestBed } from '@angular/core/testing';
import { SESSION_INVALIDATION } from './shared/application/session-invalidation';
import { ACCOUNT_GATEWAY } from './identity/application/account/account-gateway';
import { AUTHENTICATION_GATEWAY } from './identity/application/authentication/authentication-gateway';
import { SessionStore } from './identity/application/authentication/session-store';
import { IdentityHttpAdapter } from './identity/infrastructure/identity-http.adapter';
import { appConfig } from './app.config';

/**
 * A raiz de composição é onde porta e implementação se encontram, e é o único ponto do cliente que
 * o compilador não confere: `useExisting` aceita qualquer coisa.
 *
 * Sem este arquivo, apagar uma linha de `app.config.ts` mantinha a suíte inteira verde e derrubava
 * a aplicação em produção — o interceptador pede `SESSION_INVALIDATION` em **toda** requisição, e
 * sem provedor isso é `NullInjectorError` antes de qualquer tela aparecer.
 */
describe('appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  it('serves both backend ports from the single HTTP adapter', () => {
    const adapter = TestBed.inject(IdentityHttpAdapter);

    expect(TestBed.inject(AUTHENTICATION_GATEWAY)).toBe(adapter);
    expect(TestBed.inject(ACCOUNT_GATEWAY)).toBe(adapter);
  });

  it('points the session invalidation port at the store that holds the identity', () => {
    expect(TestBed.inject(SESSION_INVALIDATION)).toBe(TestBed.inject(SessionStore));
  });
});
