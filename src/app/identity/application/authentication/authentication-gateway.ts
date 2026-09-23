import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { Credentials } from '../../domain/credentials';

/**
 * Porta de acesso ao backend, declarada na aplicação e implementada em `infrastructure`.
 *
 * É o que mantém `application` sem saber que existe HTTP: quem conhece `HttpClient`, cookie de
 * sessão e formato de erro é o adaptador (princípio I).
 */
export interface AuthenticationGateway {
  /** Entra no sistema. A sessão fica no cookie devolvido pelo backend, nunca aqui. */
  signIn(credentials: Credentials): Promise<Result<AuthenticatedCaretaker>>;

  /** Encerra a sessão. O cookie anterior deixa de ser aceito imediatamente (FR-004). */
  signOut(): Promise<Result<void>>;

  /**
   * Quem está na sessão, se houver.
   *
   * Usada ao carregar a aplicação: é assim que uma aba reaberta descobre que a sessão ainda vale,
   * e também que a troca de senha provisória está pendente.
   */
  currentCaretaker(): Promise<Result<AuthenticatedCaretaker>>;
}

export const AUTHENTICATION_GATEWAY = new InjectionToken<AuthenticationGateway>('AuthenticationGateway');
