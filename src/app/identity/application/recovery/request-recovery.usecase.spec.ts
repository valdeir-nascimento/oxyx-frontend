import { TestBed } from '@angular/core/testing';
import { Notification } from '../../../shared/domain/notification';
import { failure, success } from '../../../shared/application/result';
import { RECOVERY_GATEWAY, RecoveryGateway } from './recovery-gateway';
import { RequestRecoveryUseCase } from './request-recovery.usecase';

/** O pedido do link (US1 da 012): entrega o e-mail como foi digitado e devolve o que o backend disse. */
describe('RequestRecoveryUseCase', () => {
  function useCaseWith(gateway: RecoveryGateway): RequestRecoveryUseCase {
    TestBed.configureTestingModule({
      providers: [{ provide: RECOVERY_GATEWAY, useValue: gateway }],
    });
    return TestBed.inject(RequestRecoveryUseCase);
  }

  function gatewayThatAnswers(request: RecoveryGateway['request']): RecoveryGateway {
    return { request, verify: vi.fn(), reset: vi.fn() };
  }

  it('sends the email exactly as it was typed', async () => {
    const request = vi.fn().mockResolvedValue(success(undefined));
    const useCase = useCaseWith(gatewayThatAnswers(request));

    const result = await useCase.execute('  Marina.Costa@ovyx.com.br ');

    expect(request).toHaveBeenCalledWith('  Marina.Costa@ovyx.com.br ');
    expect(result.success).toBe(true);
  });

  it('keeps the refusal of the backend, in its field', async () => {
    const refusal = Notification.of([
      {
        code: 'VALIDATION_FAILED',
        field: 'email',
        message: 'Informe um e-mail em formato válido.',
      },
    ]);
    const useCase = useCaseWith(gatewayThatAnswers(vi.fn().mockResolvedValue(failure(refusal))));

    const result = await useCase.execute('marina');

    expect(result.success === false && result.notification.messageFor('email')).toBe(
      'Informe um e-mail em formato válido.',
    );
  });
});
