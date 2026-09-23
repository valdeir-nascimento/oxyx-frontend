import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { PasswordChange } from '../../domain/password-change';

/**
 * Porta da conta do próprio responsável, declarada na aplicação e implementada em `infrastructure`.
 *
 * Separada da porta de autenticação porque são recursos diferentes do backend — `/auth` e `/me` —
 * e porque a US4 continua esta porta, sem tocar naquela.
 */
export interface AccountGateway {
  /** Troca a própria senha. A sessão atual segue valendo depois da troca (V-05). */
  changeOwnPassword(change: PasswordChange): Promise<Result<void>>;
}

export const ACCOUNT_GATEWAY = new InjectionToken<AccountGateway>('AccountGateway');
