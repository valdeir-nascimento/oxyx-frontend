import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { AUTHENTICATION_GATEWAY } from './authentication-gateway';
import { SessionStore } from './session-store';

/**
 * Saída do sistema (FR-004).
 *
 * Só esquece quem estava na sessão depois que o backend confirma a invalidação. Esquecer antes — ou
 * apesar da recusa — mostraria alguém "fora do sistema" com o cookie ainda valendo, e a requisição
 * seguinte passaria.
 */
@Injectable({ providedIn: 'root' })
export class SignOutUseCase {
  private readonly identity = inject(AUTHENTICATION_GATEWAY);
  private readonly session = inject(SessionStore);

  async execute(): Promise<Result<void>> {
    const result = await this.identity.signOut();

    if (result.success) {
      this.session.forget();
    }

    return result;
  }
}
