import { Injectable, inject } from '@angular/core';
import { AccountTheme } from '../account/account-theme';
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
  private readonly accountTheme = inject(AccountTheme);

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
      // O tema pode ter mudado em outro aparelho; o guard espera esta resposta antes da casca (feature 011).
      this.accountTheme.follow(result.value);
    } else {
      this.session.forget();
    }

    return result;
  }
}
