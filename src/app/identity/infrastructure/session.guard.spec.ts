import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Notification } from '../../shared/domain/notification';
import { Result, failure, success } from '../../shared/application/result';
import { AuthenticatedCaretaker } from '../domain/authenticated-caretaker';
import { AUTHENTICATION_GATEWAY, AuthenticationGateway } from '../application/authentication/authentication-gateway';
import { SessionStore } from '../application/authentication/session-store';
import { anonymousGuard, authenticatedGuard, passwordChangeGuard } from './session.guard';

/**
 * O guard é o que faz a rota respeitar o que o backend já decide: sem sessão não há tela, e
 * enquanto a senha provisória não for trocada nada além da troca é acessível (FR-025, V-05).
 *
 * Ele não substitui a autorização do backend — apenas evita oferecer um caminho que terminaria em
 * 401 ou 403.
 */
describe('authenticatedGuard', () => {
  const maria: AuthenticatedCaretaker = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'USER',
    mustChangePassword: false,
  };

  let gateway: AuthenticationGateway;

  function configure(sessionOnServer: Result<AuthenticatedCaretaker>): void {
    gateway = {
      signIn: vi.fn(),
      signOut: vi.fn(),
      currentCaretaker: vi.fn().mockResolvedValue(sessionOnServer),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AUTHENTICATION_GATEWAY, useValue: gateway }],
    });
  }

  function noSessionOnServer(): Result<AuthenticatedCaretaker> {
    return failure(
      Notification.of([
        { code: 'UNAUTHENTICATED', message: 'Sua sessão expirou. Entre novamente para continuar.' },
      ]),
    );
  }

  async function run(guard: CanActivateFn): Promise<string> {
    const decision = await TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return String(decision);
  }

  it('sends whoever has no session to the access screen', async () => {
    configure(noSessionOnServer());

    expect(await run(authenticatedGuard)).toBe('/acesso');
  });

  it('restores the session instead of expelling whoever reloaded the page', async () => {
    // A sessão está no cookie: recarregar a aba esvazia a memória do cliente, não a sessão.
    configure(success(maria));

    expect(await run(authenticatedGuard)).toBe('true');
    expect(gateway.currentCaretaker).toHaveBeenCalledOnce();
  });

  it('does not ask the backend again when the session is already known', async () => {
    configure(success(maria));
    TestBed.inject(SessionStore).remember(maria);

    expect(await run(authenticatedGuard)).toBe('true');
    expect(gateway.currentCaretaker).not.toHaveBeenCalled();
  });

  it('holds whoever owes the provisional password change on the change screen', async () => {
    configure(success({ ...maria, mustChangePassword: true }));

    expect(await run(authenticatedGuard)).toBe('/trocar-senha');
  });

  it('lets an authenticated caretaker reach the change screen even without the obligation', async () => {
    // A US4 abre a troca pelo menu; o guard da rota de troca só exige sessão.
    configure(success(maria));

    expect(await run(passwordChangeGuard)).toBe('true');
  });

  it('sends whoever has no session away from the change screen too', async () => {
    configure(noSessionOnServer());

    expect(await run(passwordChangeGuard)).toBe('/acesso');
  });

  it('sends whoever already has a session away from the access screen', async () => {
    configure(success(maria));

    expect(await run(anonymousGuard)).toBe('/');
  });

  it('sends whoever owes the provisional change straight to the change screen', async () => {
    configure(success({ ...maria, mustChangePassword: true }));

    expect(await run(anonymousGuard)).toBe('/trocar-senha');
  });

  it('lets an anonymous visitor in, having asked the backend who they are', async () => {
    // A pergunta não é só para decidir: é a resposta dela que traz o cookie XSRF-TOKEN. Sem ela,
    // quem abre /acesso direto manda o primeiro POST sem token e recebe 403 do backend.
    configure(noSessionOnServer());

    expect(await run(anonymousGuard)).toBe('true');
    expect(gateway.currentCaretaker).toHaveBeenCalledOnce();
  });
});
