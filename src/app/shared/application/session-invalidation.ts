import { InjectionToken } from '@angular/core';

/**
 * Porta: esquecer quem estava na sessão.
 *
 * Existe porque o 401 chega em `shared/infrastructure`, enquanto quem guarda a identidade é o
 * contexto `identity` — e `shared` não depende de contexto nenhum. O interceptador fala com esta
 * porta; quem a implementa é declarado na raiz de composição.
 *
 * Sem ela, a identidade em memória sobrevivia à sessão morta e o guard devolvia a pessoa à casca
 * autenticada com o cookie já recusado (FR-003).
 */
export interface SessionInvalidation {
  forget(): void;
}

export const SESSION_INVALIDATION = new InjectionToken<SessionInvalidation>('SessionInvalidation');
