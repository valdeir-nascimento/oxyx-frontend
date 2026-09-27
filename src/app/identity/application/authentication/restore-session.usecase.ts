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

  /** A pergunta em curso, compartilhada por quem pedir enquanto ela não terminar. */
  private pending: Promise<Result<AuthenticatedCaretaker>> | null = null;

  /**
   * Várias recusas ao mesmo tempo — o interceptador reconsulta a cada 403 — fazem uma pergunta só ao
   * backend, em vez de uma por requisição recusada.
   */
  execute(): Promise<Result<AuthenticatedCaretaker>> {
    this.pending ??= this.ask().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async ask(): Promise<Result<AuthenticatedCaretaker>> {
    const result = await this.identity.currentCaretaker();

    if (result.success) {
      this.session.remember(result.value);
    } else {
      this.session.forget();
    }

    return result;
  }
}
