import { Injectable, inject } from '@angular/core';
import { Result, success } from '../../../shared/application/result';
import { RestoreSessionUseCase } from '../authentication/restore-session.usecase';
import { RECOVERY_GATEWAY } from './recovery-gateway';

/**
 * Como fica o navegador depois da redefinição: sem sessão (a pessoa entra com a senha nova) ou ainda conectado com
 * outra conta, que a redefinição não toca.
 */
export type ResetOutcome = 'signed-out' | 'still-signed-in';

/**
 * A redefinição da senha pelo link (US2 da 012).
 *
 * Como a troca da própria senha, não confere nada antes da rede: a política é do backend, que devolve todas as
 * violações de uma vez. A redefinição não abre sessão; a pessoa entra depois, com a senha nova.
 *
 * Concluída, pergunta de novo ao backend quem está na sessão do navegador. A sessão da própria conta acabou de ser
 * encerrada, e a loja precisa esquecê-la; uma sessão de outra conta continua, e a tela diz isso em vez de levar a
 * pessoa a uma entrada que a mandaria de volta ao painel (QA da 012, D-01).
 */
@Injectable({ providedIn: 'root' })
export class ResetPasswordUseCase {
  private readonly recovery = inject(RECOVERY_GATEWAY);
  private readonly restoreSession = inject(RestoreSessionUseCase);

  async execute(token: string, newPassword: string): Promise<Result<ResetOutcome>> {
    const reset = await this.recovery.reset(token, newPassword);
    if (!reset.success) {
      return reset;
    }
    const session = await this.restoreSession.execute();
    return success(session.success ? 'still-signed-in' : 'signed-out');
  }
}
