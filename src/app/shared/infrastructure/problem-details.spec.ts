import { toNotification } from './problem-details';

describe('toNotification', () => {
  it('produces a generic Portuguese message when there is no problem body', () => {
    const notification = toNotification(null);

    expect(notification.errors).toHaveLength(1);
    expect(notification.errors[0].code).toBe('REQUEST_FAILED');
    expect(notification.errors[0].message).toContain('Não foi possível');
  });

  it('keeps every violation listed by the backend', () => {
    const notification = toNotification({
      title: 'Bad Request',
      status: 400,
      code: 'VALIDATION_FAILED',
      details: {
        cpf: 'CPF inválido.',
        email: 'Informe um e-mail em formato válido.',
      },
    });

    expect(notification.errors).toHaveLength(2);
    expect(notification.messageFor('cpf')).toBe('CPF inválido.');
  });

  it('builds a single violation from the code when nothing is detailed', () => {
    // É o caso das falhas de credencial: por FR-002 o backend não detalha a causa.
    const notification = toNotification({
      title: 'Unauthorized',
      status: 401,
      code: 'INVALID_CREDENTIALS',
      detail: 'E-mail, celular ou senha inválidos.',
    });

    expect(notification.errors).toHaveLength(1);
    expect(notification.errors[0].code).toBe('INVALID_CREDENTIALS');
    expect(notification.errors[0].message).toBe('E-mail, celular ou senha inválidos.');
  });

  it('falls back to the title when there is no detail', () => {
    const notification = toNotification({
      title: 'Acesso negado',
      status: 403,
      code: 'FORBIDDEN',
    });

    expect(notification.errors[0].message).toBe('Acesso negado');
  });
});
