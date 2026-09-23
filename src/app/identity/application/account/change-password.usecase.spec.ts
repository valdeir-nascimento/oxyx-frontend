import { TestBed } from '@angular/core/testing';
import { Notification } from '../../../shared/domain/notification';
import { Result, failure, success } from '../../../shared/application/result';
import { SessionStore } from '../authentication/session-store';
import { ACCOUNT_GATEWAY, AccountGateway } from './account-gateway';
import { ChangeOwnPasswordUseCase } from './change-password.usecase';

/**
 * A política de senha vive no backend (FR-022) — o cliente não a repete, senão as duas pontas
 * divergem. O que este caso de uso verifica sozinho é o preenchimento, e ele acumula os dois
 * campos, como o FR-017 exige.
 */
describe('ChangeOwnPasswordUseCase', () => {
  const maria = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'ADMINISTRATOR' as const,
    mustChangePassword: true,
  };

  function gatewayThatReturns(result: Result<void>): AccountGateway {
    return { changeOwnPassword: vi.fn().mockResolvedValue(result) };
  }

  function useCaseWith(gateway: AccountGateway): ChangeOwnPasswordUseCase {
    TestBed.configureTestingModule({
      providers: [ChangeOwnPasswordUseCase, { provide: ACCOUNT_GATEWAY, useValue: gateway }],
    });
    return TestBed.inject(ChangeOwnPasswordUseCase);
  }

  it('sends both passwords to the backend', async () => {
    const gateway = gatewayThatReturns(success(undefined));

    const result = await useCaseWith(gateway).execute('GranjaNorte2026', 'PosturaAviario2027');

    expect(result.success).toBe(true);
    expect(gateway.changeOwnPassword).toHaveBeenCalledWith({
      currentPassword: 'GranjaNorte2026',
      newPassword: 'PosturaAviario2027',
    });
  });

  it('reports both missing fields at once, without calling the backend', async () => {
    const gateway = gatewayThatReturns(success(undefined));

    const result = await useCaseWith(gateway).execute('', '   ');

    expect(result.success === false && result.notification.messageFor('currentPassword')).toBe(
      'Informe a senha atual.',
    );
    expect(result.success === false && result.notification.messageFor('newPassword')).toBe(
      'Informe a senha.',
    );
    expect(gateway.changeOwnPassword).not.toHaveBeenCalled();
  });

  it('keeps the policy violations exactly as the backend returned them', async () => {
    // Repetir a política aqui faria o cliente recusar o que o backend aceita, ou o contrário.
    const refusal = failure<void>(
      Notification.of([
        {
          code: 'VALIDATION_FAILED',
          field: 'newPassword',
          message: 'A senha deve ter ao menos 12 caracteres. A senha deve conter ao menos um dígito.',
        },
      ]),
    );
    const gateway = gatewayThatReturns(refusal);

    const result = await useCaseWith(gateway).execute('GranjaNorte2026', 'abc');

    expect(result.success === false && result.notification.messageFor('newPassword')).toContain(
      'ao menos 12 caracteres',
    );
  });

  it('releases the session from the provisional password once the change succeeds', async () => {
    // V-05: enquanto a troca não acontece, o guard prende a pessoa à tela de troca. Sem desfazer a
    // obrigação aqui, a troca bem-sucedida devolveria a pessoa à mesma tela.
    const useCase = useCaseWith(gatewayThatReturns(success(undefined)));
    const store = TestBed.inject(SessionStore);
    store.remember(maria);

    await useCase.execute('GranjaNorte2026', 'PosturaAviario2027');

    expect(store.mustChangePassword()).toBe(false);
    expect(store.caretaker()?.fullName).toBe('Maria Silva');
  });

  it('keeps the obligation standing when the backend refuses the new password', async () => {
    const refusal = failure<void>(
      Notification.of([
        {
          code: 'VALIDATION_FAILED',
          field: 'newPassword',
          message: 'A senha deve ter ao menos 12 caracteres.',
        },
      ]),
    );
    const useCase = useCaseWith(gatewayThatReturns(refusal));
    const store = TestBed.inject(SessionStore);
    store.remember(maria);

    await useCase.execute('GranjaNorte2026', 'abc');

    expect(store.mustChangePassword()).toBe(true);
  });
});
