import { Injectable, inject } from '@angular/core';
import { Result, failure } from '../../../shared/application/result';
import { validatePasswordChange } from '../../domain/password-change';
import { SessionStore } from '../authentication/session-store';
import { ACCOUNT_GATEWAY } from './account-gateway';

/**
 * Troca da própria senha (FR-022, FR-025).
 *
 * Verifica apenas o preenchimento — a política de senha é do backend, e repeti-la aqui faria o
 * cliente recusar o que o backend aceita, ou o contrário. Quando a troca é aceita, desfaz a
 * obrigação registrada na sessão: a mesma sessão continua valendo, agora sem a senha provisória.
 */
@Injectable({ providedIn: 'root' })
export class ChangeOwnPasswordUseCase {
  private readonly account = inject(ACCOUNT_GATEWAY);
  private readonly session = inject(SessionStore);

  async execute(currentPassword: string, newPassword: string): Promise<Result<void>> {
    const change = { currentPassword, newPassword };
    const violations = validatePasswordChange(change);

    if (violations.hasErrors) {
      return failure(violations);
    }

    const result = await this.account.changeOwnPassword(change);

    if (result.success) {
      this.session.markPasswordChanged();
    }

    return result;
  }
}
