import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { AUTHENTICATION_GATEWAY } from './authentication-gateway';
import { SessionStore } from './session-store';

/**
 * Descobre quem o cookie ainda identifica.
 *
 * Recarregar a aba esvazia a memória do cliente, não a sessão — ela está no cookie, e só o backend
 * sabe se continua valendo. Sem esta pergunta, um F5 expulsaria quem está autenticado.
 */
@Injectable({ providedIn: 'root' })
export class RestoreSessionUseCase {
  private readonly identity = inject(AUTHENTICATION_GATEWAY);
  private readonly session = inject(SessionStore);

  async execute(): Promise<Result<AuthenticatedCaretaker>> {
    const result = await this.identity.currentCaretaker();

    if (result.success) {
      this.session.remember(result.value);
    } else {
      this.session.forget();
    }

    return result;
  }
}
