import { TestBed } from '@angular/core/testing';
import { Notification } from '../../../shared/domain/notification';
import { Result, failure, success } from '../../../shared/application/result';
import { SessionStore } from '../authentication/session-store';
import { ACCOUNT_GATEWAY, AccountGateway } from './account-gateway';
import { ChangeOwnPasswordUseCase } from './change-password.usecase';

/**
 * A política de senha vive no backend (FR-022) — o cliente não a repete, senão as duas pontas
 * divergem. Nem o preenchimento o cliente confere: barrar um campo vazio antes da rede escondia a
 * recusa do outro campo, que só o backend conhece, e quebrava o FR-017 (QA da US4).
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

  it('leaves a missing current password to the backend, which reports it with the policy at once (FR-017)', async () => {
    // Com a senha atual vazia, o cliente parava ali e mostrava só "Informe a senha atual."; o que
    // faltava na nova só aparecia no envio seguinte.
    const refusal = failure<void>(
      Notification.of([
        { code: 'VALIDATION_FAILED', field: 'currentPassword', message: 'Informe a senha atual.' },
        { code: 'VALIDATION_FAILED', field: 'newPassword', message: 'A senha deve ter ao menos 12 caracteres.' },
      ]),
    );
    const gateway = gatewayThatReturns(refusal);

    const result = await useCaseWith(gateway).execute('', 'abc');

    expect(gateway.changeOwnPassword).toHaveBeenCalledWith({ currentPassword: '', newPassword: 'abc' });
    expect(result.success === false && result.notification.messageFor('currentPassword')).toBe(
      'Informe a senha atual.',
    );
    expect(result.success === false && result.notification.messageFor('newPassword')).toContain(
      'ao menos 12 caracteres',
    );
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
