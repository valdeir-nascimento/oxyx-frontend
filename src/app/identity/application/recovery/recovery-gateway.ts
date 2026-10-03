import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';

/**
 * Porta da recuperação da senha pelo e-mail (feature 012), declarada na aplicação e implementada em `infrastructure`.
 *
 * As três operações são públicas: quem as usa não consegue entrar. Nenhuma devolve dado da conta.
 */
export interface RecoveryGateway {
  /** Pede o link pelo e-mail da conta. O sucesso não diz se a conta existe: a resposta é a mesma para todas. */
  request(email: string): Promise<Result<void>>;

  /** Confere se o link ainda vale, sem gastá-lo. */
  verify(token: string): Promise<Result<void>>;

  /** Define a nova senha pelo link. */
  reset(token: string, newPassword: string): Promise<Result<void>>;
}

export const RECOVERY_GATEWAY = new InjectionToken<RecoveryGateway>('RecoveryGateway');
