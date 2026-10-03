import { Notification } from '../../../shared/domain/notification';
import { isInvalidLink } from './recovery-link';

/** A recusa do link que não vale é distinta da recusa da senha e da falha da rede (US2 da 012). */
describe('isInvalidLink', () => {
  it('recognizes the refusal of a link that no longer holds', () => {
    const refusal = Notification.of([
      {
        code: 'RECOVERY_LINK_INVALID',
        message: 'Este link de recuperação não vale mais. Peça um novo na tela de entrada.',
      },
    ]);

    expect(isInvalidLink(refusal)).toBe(true);
  });

  it.each([
    [
      {
        code: 'VALIDATION_FAILED',
        field: 'newPassword',
        message: 'A senha deve ter ao menos 12 caracteres.',
      },
    ],
    [
      {
        code: 'REQUEST_FAILED',
        message: 'Não houve resposta do servidor. Tente novamente em instantes.',
      },
    ],
  ])('does not take another refusal for an invalid link', (error) => {
    expect(isInvalidLink(Notification.of([error]))).toBe(false);
  });
});
