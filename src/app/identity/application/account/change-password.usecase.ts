import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { SessionStore } from '../authentication/session-store';
import { ACCOUNT_GATEWAY } from './account-gateway';

/**
 * Troca da própria senha (FR-022, FR-025).
 *
 * Não confere nada antes de ir à rede. A política de senha é do backend, e repeti-la aqui faria o
 * cliente recusar o que o backend aceita, ou o contrário. Nem o preenchimento: barrar a senha
 * atual vazia escondia o que faltava na nova, que só o backend sabe, e a pessoa descobria uma
 * recusa por vez (FR-017, QA da US4). O backend devolve tudo de uma vez, com as mesmas mensagens.
 *
 * Quando a troca é aceita, desfaz a obrigação registrada na sessão: a mesma sessão continua valendo,
 * agora sem a senha provisória.
 */
@Injectable({ providedIn: 'root' })
export class ChangeOwnPasswordUseCase {
  private readonly account = inject(ACCOUNT_GATEWAY);
  private readonly session = inject(SessionStore);

  async execute(currentPassword: string, newPassword: string): Promise<Result<void>> {
    const result = await this.account.changeOwnPassword({ currentPassword, newPassword });

    if (result.success) {
      this.session.markPasswordChanged();
    }

    return result;
  }
}
