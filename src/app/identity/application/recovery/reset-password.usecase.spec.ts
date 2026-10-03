import { TestBed } from '@angular/core/testing';
import { Notification } from '../../../shared/domain/notification';
import { failure, success } from '../../../shared/application/result';
import { RestoreSessionUseCase } from '../authentication/restore-session.usecase';
import { RECOVERY_GATEWAY, RecoveryGateway } from './recovery-gateway';
import { ResetPasswordUseCase } from './reset-password.usecase';

/**
 * A redefinição pelo link (US2 da 012): a política é do backend, e a tela recebe todas as violações de uma vez.
 * Concluída, o caso de uso pergunta quem ficou na sessão do navegador.
 */
describe('ResetPasswordUseCase', () => {
  const maria = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'ADMINISTRATOR' as const,
    mustChangePassword: false,
    theme: 'SYSTEM' as const,
  };

  let restore: ReturnType<typeof vi.fn>;

  function useCaseWith(reset: RecoveryGateway['reset']): ResetPasswordUseCase {
    TestBed.configureTestingModule({
      providers: [
        { provide: RECOVERY_GATEWAY, useValue: { request: vi.fn(), verify: vi.fn(), reset } },
        { provide: RestoreSessionUseCase, useValue: { execute: restore } },
      ],
    });
    return TestBed.inject(ResetPasswordUseCase);
  }

  beforeEach(() => {
    restore = vi
      .fn()
      .mockResolvedValue(
        failure(Notification.of([{ code: 'SESSION_REVOKED', message: 'Sessão encerrada.' }])),
      );
  });

  it('sends the code and the new password, deciding nothing about the policy', async () => {
    const reset = vi.fn().mockResolvedValue(success(undefined));

    await useCaseWith(reset).execute('3q2-7wq9Xk1vF0bQm8ZsY4tLr6NcHe2JpWdUaGo5iKx', 'abc');

    expect(reset).toHaveBeenCalledWith('3q2-7wq9Xk1vF0bQm8ZsY4tLr6NcHe2JpWdUaGo5iKx', 'abc');
  });

  it('says the browser is signed out once the session of the same account was ended (QA D-01)', async () => {
    const result = await useCaseWith(vi.fn().mockResolvedValue(success(undefined))).execute(
      'x',
      'PosturaAviario2027',
    );

    expect(restore).toHaveBeenCalledOnce();
    expect(result.success && result.value).toBe('signed-out');
  });

  it('says the browser is still signed in when the session belongs to another account (QA D-01)', async () => {
    restore.mockResolvedValue(success(maria));

    const result = await useCaseWith(vi.fn().mockResolvedValue(success(undefined))).execute(
      'x',
      'PosturaAviario2027',
    );

    expect(result.success && result.value).toBe('still-signed-in');
  });

  it('keeps every violation of the policy that the backend returned, asking nothing about the session', async () => {
    const refusal = Notification.of([
      {
        code: 'VALIDATION_FAILED',
        field: 'newPassword',
        message: 'A senha deve ter ao menos 12 caracteres. A senha deve conter ao menos um dígito.',
      },
    ]);

    const result = await useCaseWith(vi.fn().mockResolvedValue(failure(refusal))).execute(
      'x',
      'abc',
    );

    expect(result.success === false && result.notification.messageFor('newPassword')).toContain(
      'ao menos um dígito',
    );
    expect(restore).not.toHaveBeenCalled();
  });
});
