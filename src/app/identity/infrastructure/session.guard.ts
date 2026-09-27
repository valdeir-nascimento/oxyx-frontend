import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticatedCaretaker, isAdministrator } from '../domain/authenticated-caretaker';
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
 * A tela cheia de troca de senha é a da troca obrigatória (FR-025): a única tela liberada enquanto a
 * senha provisória valer, e por isso sem saída.
 *
 * Quem troca por vontade própria vai para a página da conta, dentro da casca, com caminho de volta
 * (US4). O interceptador pergunta de novo ao backend quem está na sessão antes de mandar alguém
 * para cá no 403 `PASSWORD_CHANGE_REQUIRED`, então a obrigação já está na loja quando este guard
 * decide.
 */
export const passwordChangeGuard: CanActivateFn = () => {
  const router = inject(Router);

  return sessionOf(inject(SessionStore), inject(RestoreSessionUseCase)).then((caretaker) => {
    if (!caretaker) {
      return router.parseUrl('/acesso');
    }
    return caretaker.mustChangePassword ? true : router.parseUrl('/minha-conta/senha');
  });
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
 * Área administrativa só para o perfil Administrador (FR-008, FR-011).
 *
 * Não é a proteção — o backend responde 403 a quem não é administrador. O guard evita desenhar uma
 * tela que só mostraria recusas: quem não é administrador vai direto para o acesso negado.
 */
export const administratorGuard: CanActivateFn = () => {
  const router = inject(Router);

  return sessionOf(inject(SessionStore), inject(RestoreSessionUseCase)).then((caretaker) => {
    if (!caretaker) {
      return router.parseUrl('/acesso');
    }
    return isAdministrator(caretaker.role) ? true : router.parseUrl('/acesso-negado');
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
