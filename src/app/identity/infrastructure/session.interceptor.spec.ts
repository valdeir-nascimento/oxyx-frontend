import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RestoreSessionUseCase } from '../application/authentication/restore-session.usecase';
import { SessionStore } from '../application/authentication/session-store';
import { SKIP_SESSION_HANDLING, sessionInterceptor } from './session.interceptor';

/**
 * O interceptador decide para onde o usuário vai quando o backend recusa uma requisição.
 * Errar aqui é o que mandava o usuário para "acesso negado" na primeira tentativa de login.
 */
describe('sessionInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  let forget: ReturnType<typeof vi.spyOn>;
  let restore: ReturnType<typeof vi.fn>;

  const problem = (code: string, status: number) => ({
    code,
    title: 'título',
    status,
  });

  beforeEach(() => {
    restore = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: RestoreSessionUseCase, useValue: { execute: restore } },
      ],
    });
    forget = vi.spyOn(TestBed.inject(SessionStore), 'forget');
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  function failWith(body: object, status: number, context?: HttpContext): unknown {
    let received: unknown;
    http.get('/api/v1/anything', { context }).subscribe({ error: (error: unknown) => (received = error) });
    backend.expectOne('/api/v1/anything').flush(body, { status, statusText: 'erro' });
    return received;
  }

  it('forgets the identity and goes to the sign-in screen on 401', () => {
    // Esquecer é o que impede o guard de devolver a pessoa à casca autenticada com o cookie morto.
    failWith(problem('UNAUTHENTICATED', 401), 401);

    expect(forget).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/acesso'], { queryParams: { sessao: 'expirada' } });
  });

  it('carries the reason in the address, so a reload still explains what happened', () => {
    // O aviso em memória morria no F5, e a tela de acesso reaparecia muda (FR-003).
    failWith(problem('UNAUTHENTICATED', 401), 401);

    expect(navigate).toHaveBeenCalledWith(['/acesso'], { queryParams: { sessao: 'expirada' } });
  });

  it('does not treat wrong credentials as an expired session', () => {
    // Senha errada na tela de acesso também responde 401, mas não é sessão expirada: mostrar esse
    // aviso a quem apenas digitou errado seria enganoso.
    failWith(problem('INVALID_CREDENTIALS', 401), 401);

    expect(forget).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('forgets the identity and goes to the sign-in screen when the caretaker was deactivated with the session open', () => {
    // O backend reconfere a sessão a cada requisição, e o inativado recebe 401 CARETAKER_UNAVAILABLE.
    // Sem esquecer, a casca e o menu continuavam abertos com a sessão já encerrada.
    failWith(problem('CARETAKER_UNAVAILABLE', 401), 401);

    expect(forget).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/acesso'], { queryParams: { sessao: 'expirada' } });
  });

  it('goes to the access denied screen on a plain 403', async () => {
    failWith(problem('FORBIDDEN', 403), 403);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/acesso-negado']));
  });

  it('asks the backend who is in the session before showing access denied, so the menu follows a demotion', async () => {
    // Rebaixado com a sessão aberta, a pessoa continuava vendo "Responsáveis" no menu, e o guard
    // continuava liberando a rota, até recarregar a página (FR-011).
    failWith(problem('FORBIDDEN', 403), 403);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/acesso-negado']));
    expect(restore).toHaveBeenCalledOnce();
    expect(restore.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
  });

  it('takes a session that came to owe the password change to the password change screen', async () => {
    // A restauração do administrador inicial torna a senha provisória com a sessão aberta.
    failWith(problem('PASSWORD_CHANGE_REQUIRED', 403), 403);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/trocar-senha']));
    expect(restore).toHaveBeenCalledOnce();
  });

  it('does not treat a missing CSRF token as access denied', () => {
    failWith(problem('CSRF_TOKEN_INVALID', 403), 403);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not treat a pending password change as access denied', () => {
    failWith(problem('PASSWORD_CHANGE_REQUIRED', 403), 403);

    expect(navigate).not.toHaveBeenCalledWith(['/acesso-negado']);
  });

  it('leaves an expected 401 alone when the caller opts out of session handling', () => {
    // A sondagem de identidade no carregamento da SPA recebe 401 de quem nunca entrou. Isso não é
    // "sessão expirada", e tratar como tal mostraria um aviso falso na tela de acesso.
    failWith(problem('UNAUTHENTICATED', 401), 401, new HttpContext().set(SKIP_SESSION_HANDLING, true));

    expect(forget).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps propagating the error so the caller knows the operation failed', () => {
    const error = failWith(problem('FORBIDDEN', 403), 403);

    expect(error).toBeTruthy();
  });
});
