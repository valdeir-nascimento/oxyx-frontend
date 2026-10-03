import { TestBed } from '@angular/core/testing';
import { success } from '../../../shared/application/result';
import { RECOVERY_GATEWAY, RecoveryGateway } from './recovery-gateway';
import { VerifyRecoveryLinkUseCase } from './verify-recovery-link.usecase';

/** A conferência do link (US2 da 012): entrega o código como veio e devolve o que o backend disse. */
describe('VerifyRecoveryLinkUseCase', () => {
  it('checks the code exactly as it came in the link', async () => {
    const gateway: RecoveryGateway = {
      request: vi.fn(),
      verify: vi.fn().mockResolvedValue(success(undefined)),
      reset: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: RECOVERY_GATEWAY, useValue: gateway }],
    });

    const result = await TestBed.inject(VerifyRecoveryLinkUseCase).execute(
      '3q2-7wq9Xk1vF0bQm8ZsY4tLr6NcHe2JpWdUaGo5iKx',
    );

    expect(gateway.verify).toHaveBeenCalledWith('3q2-7wq9Xk1vF0bQm8ZsY4tLr6NcHe2JpWdUaGo5iKx');
    expect(result.success).toBe(true);
  });
});
