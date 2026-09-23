import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticatedCaretaker } from '../domain/authenticated-caretaker';
import { RestoreSessionUseCase } from '../application/authentication/restore-session.usecase';
import { SessionStore } from '../application/authentication/session-store';

/**
 * Exige sessão para as rotas internas e mantém quem deve a senha provisória na tela de troca
 * (FR-025, cenário V-05).
 *
 * Não é a proteção — quem protege é o backend, que responde 401 e 403 de qualquer forma. O guard
 * evita oferecer uma tela que terminaria em erro e evita desenhar a casca sem saber o nome de quem
 * está autenticado.
 */
export const authenticatedGuard: CanActivateFn = () => {
  const router = inject(Router);

  return sessionOf(inject(SessionStore), inject(RestoreSessionUseCase)).then((caretaker) => {
    if (!caretaker) {
      return router.parseUrl('/acesso');
    }
    return caretaker.mustChangePassword ? router.parseUrl('/trocar-senha') : true;
  });
};

/**
 * Exige apenas sessão.
 *
 * É o guard da própria tela de troca de senha: exigir ali a ausência da senha provisória prenderia
 * a pessoa fora da única tela que ela pode usar. A US4 abre esta mesma tela pelo menu, para quem
 * troca a senha por vontade própria.
 */
export const passwordChangeGuard: CanActivateFn = () => {
  const router = inject(Router);

  return sessionOf(inject(SessionStore), inject(RestoreSessionUseCase)).then((caretaker) =>
    caretaker ? true : router.parseUrl('/acesso'),
  );
};

/**
 * Mantém a tela de acesso para quem ainda não entrou.
 *
 * Duas coisas dependem desta pergunta ao backend. A primeira é evitar oferecer a tela de entrada a
 * quem já está autenticado. A segunda é o cookie `XSRF-TOKEN`: ele só existe depois de uma resposta
 * do backend, e quem abre `/acesso` direto no navegador ainda não teve nenhuma — o primeiro POST
 * sairia sem o cabeçalho e voltaria 403.
 */
export const anonymousGuard: CanActivateFn = () => {
  const router = inject(Router);

  return sessionOf(inject(SessionStore), inject(RestoreSessionUseCase)).then((caretaker) => {
    if (!caretaker) {
      return true;
    }
    return router.parseUrl(caretaker.mustChangePassword ? '/trocar-senha' : '/');
  });
};

/**
 * Quem está na sessão, perguntando ao backend só quando o cliente ainda não sabe.
 *
 * O `inject` acontece antes do `await` de propósito: depois dele o contexto de injeção já não
 * existe mais, e a injeção falharia.
 */
function sessionOf(
  session: SessionStore,
  restore: RestoreSessionUseCase,
): Promise<AuthenticatedCaretaker | null> {
  const known = session.caretaker();

  if (known) {
    return Promise.resolve(known);
  }

  return restore.execute().then((result) => (result.success ? result.value : null));
}
