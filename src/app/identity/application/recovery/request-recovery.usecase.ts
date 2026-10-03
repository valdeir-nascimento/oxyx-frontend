import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { RECOVERY_GATEWAY } from './recovery-gateway';

/**
 * O pedido do link de recuperação (US1 da 012).
 *
 * Não confere nada antes da rede, como a troca da própria senha: o formato do e-mail é regra do backend, que o recusa
 * no campo. O sucesso não diz se a conta existe, e a tela também não pode dizer.
 */
@Injectable({ providedIn: 'root' })
export class RequestRecoveryUseCase {
  private readonly recovery = inject(RECOVERY_GATEWAY);

  async execute(email: string): Promise<Result<void>> {
    return this.recovery.request(email);
  }
}
