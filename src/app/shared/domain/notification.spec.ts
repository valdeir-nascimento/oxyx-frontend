import { Notification } from './notification';

/**
 * Testes do lado cliente do Notification Pattern.
 *
 * O que importa aqui é que o formulário consiga distribuir **todas** as violações aos seus campos
 * de uma vez (FR-017) — é o comportamento que diferencia esta tela da do legado, que mostrava uma
 * mensagem por vez.
 */
describe('Notification', () => {
  const threeErrors = Notification.of([
    { code: 'VALIDATION_FAILED', field: 'fullName', message: 'Informe o nome completo.' },
    { code: 'VALIDATION_FAILED', field: 'cpf', message: 'CPF inválido.' },
    { code: 'VALIDATION_FAILED', field: 'email', message: 'Informe um e-mail em formato válido.' },
  ]);

  it('starts empty', () => {
    const notification = Notification.empty();

    expect(notification.hasErrors).toBe(false);
    expect(notification.errors).toHaveLength(0);
  });

  it('keeps every violation received from the backend', () => {
    expect(threeErrors.hasErrors).toBe(true);
    expect(threeErrors.errors).toHaveLength(3);
  });

  it('finds the message of a specific field', () => {
    expect(threeErrors.messageFor('cpf')).toBe('CPF inválido.');
    expect(threeErrors.messageFor('mobilePhone')).toBeUndefined();
  });

  it('separates violations that belong to no field', () => {
    const notification = Notification.of([
      { code: 'VALIDATION_FAILED', field: 'cpf', message: 'CPF inválido.' },
      {
        code: 'LAST_ADMINISTRATOR',
        message: 'O sistema precisa de ao menos um administrador ativo.',
      },
    ]);

    expect(notification.generalErrors).toHaveLength(1);
    expect(notification.generalErrors[0].code).toBe('LAST_ADMINISTRATOR');
    expect(notification.forField('cpf')).toHaveLength(1);
  });
});
