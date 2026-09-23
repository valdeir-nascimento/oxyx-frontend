import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SESSION_INVALIDATION } from '../application/session-invalidation';

/**
 * Permite a quem chama dispensar o tratamento de sessão para uma requisição específica.
 *
 * Existe para a sondagem de identidade feita no carregamento da aplicação: quem nunca entrou recebe
 * 401 ali, e isso não é "sessão expirada".
 */
export const SKIP_SESSION_HANDLING = new HttpContextToken<boolean>(() => false);

const FORBIDDEN_CODE = 'FORBIDDEN';
const INVALID_CREDENTIALS_CODE = 'INVALID_CREDENTIALS';

/**
 * Traduz as recusas do backend em navegação (FR-003, FR-010).
 *
 * - **401**: sem sessão ou sessão expirada. Esquece a identidade em memória, para que nenhum guard
 *   continue acreditando numa sessão que o backend já recusou, e leva à tela de acesso com o motivo
 *   no endereço — assim o aviso sobrevive a um recarregamento. Exceto `INVALID_CREDENTIALS`, que é a
 *   resposta a uma senha errada na própria tela de acesso, e não uma sessão que expirou.
 * - **403 `FORBIDDEN`**: autenticado sem permissão. Leva à tela de acesso negado.
 * - **Outros 403** (token CSRF ausente, troca de senha pendente): não são falta de permissão e
 *   têm fluxo próprio. Tratá-los como "acesso negado" mandava o usuário para a tela de permissão já
 *   na primeira tentativa de entrar.
 *
 * O erro continua propagando, porque quem chamou precisa saber que a operação falhou.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const session = inject(SESSION_INVALIDATION);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !request.context.get(SKIP_SESSION_HANDLING)) {
        if (error.status === 401 && problemCode(error) !== INVALID_CREDENTIALS_CODE) {
          session.forget();
          void router.navigate(['/acesso'], { queryParams: { sessao: 'expirada' } });
        } else if (error.status === 403 && problemCode(error) === FORBIDDEN_CODE) {
          void router.navigate(['/acesso-negado']);
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
