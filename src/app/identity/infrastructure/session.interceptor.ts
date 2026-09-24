import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { RestoreSessionUseCase } from '../application/authentication/restore-session.usecase';
import { SessionStore } from '../application/authentication/session-store';

/**
 * Permite a quem chama dispensar o tratamento de sessão para uma requisição específica.
 *
 * Existe para a sondagem de identidade feita no carregamento da aplicação: quem nunca entrou recebe
 * 401 ali, e isso não é "sessão expirada".
 */
export const SKIP_SESSION_HANDLING = new HttpContextToken<boolean>(() => false);

const FORBIDDEN_CODE = 'FORBIDDEN';
const PASSWORD_CHANGE_REQUIRED_CODE = 'PASSWORD_CHANGE_REQUIRED';
const INVALID_CREDENTIALS_CODE = 'INVALID_CREDENTIALS';

/**
 * Traduz as recusas de sessão do backend em navegação (FR-003, FR-010).
 *
 * Vive em `identity`, e não em `shared`: sessão, rotas de acesso e o código `INVALID_CREDENTIALS`
 * são vocabulário deste contexto (T233). Por isso esquece a identidade direto no `SessionStore`, sem
 * porta intermediária.
 *
 * - **401**: sem sessão, sessão expirada, ou responsável inativado com a sessão aberta
 *   (`CARETAKER_UNAVAILABLE`). Esquece a identidade em memória, para que nenhum guard continue
 *   acreditando numa sessão que o backend já recusou, e leva à tela de acesso com o motivo no
 *   endereço — assim o aviso sobrevive a um recarregamento. Exceto `INVALID_CREDENTIALS`, que é a
 *   resposta a uma senha errada na própria tela de acesso, e não uma sessão que expirou.
 * - **403 `FORBIDDEN`** e **403 `PASSWORD_CHANGE_REQUIRED`**: o backend reconfere a sessão a cada
 *   requisição, e a recusa pode vir de um perfil rebaixado ou de uma senha que voltou a ser
 *   provisória depois do login. Antes de navegar, pergunta de novo ao backend quem está na sessão,
 *   para que o menu e os guards decidam pelo que vale agora (FR-011); depois leva ao acesso negado ou
 *   à troca de senha.
 * - **403 `CSRF_TOKEN_INVALID`**: não é falta de permissão. Tratá-lo como "acesso negado" mandava o
 *   usuário para a tela de permissão já na primeira tentativa de entrar.
 *
 * O erro continua propagando, porque quem chamou precisa saber que a operação falhou.
 */
export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const session = inject(SessionStore);
  const restoreSession = inject(RestoreSessionUseCase);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !request.context.get(SKIP_SESSION_HANDLING)) {
        if (error.status === 401 && problemCode(error) !== INVALID_CREDENTIALS_CODE) {
          session.forget();
          void router.navigate(['/acesso'], { queryParams: { sessao: 'expirada' } });
        } else if (error.status === 403 && problemCode(error) === FORBIDDEN_CODE) {
          void restoreSession.execute().then(() => router.navigate(['/acesso-negado']));
        } else if (error.status === 403 && problemCode(error) === PASSWORD_CHANGE_REQUIRED_CODE) {
          void restoreSession.execute().then(() => router.navigate(['/trocar-senha']));
        }
      }
      return throwError(() => error);
    }),
  );
};

function problemCode(error: HttpErrorResponse): string | undefined {
  const body = error.error as { code?: unknown } | null;
  return typeof body?.code === 'string' ? body.code : undefined;
}
