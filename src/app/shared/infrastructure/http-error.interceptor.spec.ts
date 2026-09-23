import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SESSION_INVALIDATION } from '../application/session-invalidation';
import { SKIP_SESSION_HANDLING, httpErrorInterceptor } from './http-error.interceptor';

/**
 * O interceptador decide para onde o usuário vai quando o backend recusa uma requisição.
 * Errar aqui é o que mandava o usuário para "acesso negado" na primeira tentativa de login.
 */
describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  let forget: ReturnType<typeof vi.fn>;

  const problem = (code: string, status: number) => ({
    code,
    title: 'título',
    status,
  });

  beforeEach(() => {
    forget = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SESSION_INVALIDATION, useValue: { forget } },
      ],
    });
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

  it('goes to the access denied screen on a plain 403', () => {
    failWith(problem('FORBIDDEN', 403), 403);

    expect(navigate).toHaveBeenCalledWith(['/acesso-negado']);
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
