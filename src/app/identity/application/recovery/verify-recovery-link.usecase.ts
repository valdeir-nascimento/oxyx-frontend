import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { RECOVERY_GATEWAY } from './recovery-gateway';

/** A conferência do link de recuperação, quando a tela de redefinição abre (US2 da 012). Não gasta o link. */
@Injectable({ providedIn: 'root' })
export class VerifyRecoveryLinkUseCase {
  private readonly recovery = inject(RECOVERY_GATEWAY);

  async execute(token: string): Promise<Result<void>> {
    return this.recovery.verify(token);
  }
}
