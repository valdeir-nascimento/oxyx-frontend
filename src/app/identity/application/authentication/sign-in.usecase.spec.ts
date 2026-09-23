import { TestBed } from '@angular/core/testing';
import { Notification } from '../../../shared/domain/notification';
import { Result, failure, success } from '../../../shared/application/result';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { AUTHENTICATION_GATEWAY, AuthenticationGateway } from './authentication-gateway';
import { SessionStore } from './session-store';
import { SignInUseCase } from './sign-in.usecase';

/**
 * O caso de uso é onde a entrada é decidida: ele valida o que dá para validar sem rede, chama a
 * porta e devolve `Result`. Nada disso pode migrar para o componente (princípio I no cliente).
 */
describe('SignInUseCase', () => {
  const maria: AuthenticatedCaretaker = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'USER',
    mustChangePassword: false,
  };

  function gatewayThatReturns(result: Result<AuthenticatedCaretaker>): AuthenticationGateway {
    return {
      signIn: vi.fn().mockResolvedValue(result),
      signOut: vi.fn(),
      currentCaretaker: vi.fn(),
    };
  }

  function useCaseWith(gateway: AuthenticationGateway): SignInUseCase {
    TestBed.configureTestingModule({
      providers: [SignInUseCase, { provide: AUTHENTICATION_GATEWAY, useValue: gateway }],
    });
    return TestBed.inject(SignInUseCase);
  }

  it('signs in and returns the authenticated identity', async () => {
    const gateway = gatewayThatReturns(success(maria));

    const result = await useCaseWith(gateway).execute('maria.silva@ovyx.com.br', 'GranjaNorte2026');

    expect(result.success).toBe(true);
    expect(result.success && result.value).toEqual(maria);
    expect(gateway.signIn).toHaveBeenCalledWith({
      identifier: 'maria.silva@ovyx.com.br',
      password: 'GranjaNorte2026',
    });
  });

  it('accepts a mobile phone as identifier, without deciding what it is', async () => {
    // Quem distingue e-mail de celular é o backend (AccessIdentifier). Se o cliente decidisse,
    // as duas pontas poderiam divergir — e foi divergência assim que abriu brecha na contenção.
    const gateway = gatewayThatReturns(success(maria));

    await useCaseWith(gateway).execute('(91) 98888-7777', 'GranjaNorte2026');

    expect(gateway.signIn).toHaveBeenCalledWith({
      identifier: '(91) 98888-7777',
      password: 'GranjaNorte2026',
    });
  });

  it('reports both missing fields at once, without calling the backend', async () => {
    // FR-017 também no cliente: corrigir um campo e só então descobrir o outro é o que o
    // requisito proíbe.
    const gateway = gatewayThatReturns(success(maria));

    const result = await useCaseWith(gateway).execute('  ', '');

    expect(result.success).toBe(false);
    expect(result.success === false && result.notification.messageFor('identifier')).toBe(
      'Informe o e-mail ou o celular.',
    );
    expect(result.success === false && result.notification.messageFor('password')).toBe(
      'Informe a senha.',
    );
    expect(gateway.signIn).not.toHaveBeenCalled();
  });

  it('passes the backend refusal through, without rewriting it', async () => {
    // A mensagem genérica é decisão do backend (FR-002). Reescrevê-la aqui reintroduziria a
    // diferença que o requisito manda apagar.
    const refusal = failure<AuthenticatedCaretaker>(
      Notification.of([
        { code: 'INVALID_CREDENTIALS', message: 'E-mail, celular ou senha inválidos.' },
      ]),
    );
    const gateway = gatewayThatReturns(refusal);

    const result = await useCaseWith(gateway).execute('maria.silva@ovyx.com.br', 'SenhaErrada2026');

    expect(result.success).toBe(false);
    expect(result.success === false && result.notification.errors[0].message).toBe(
      'E-mail, celular ou senha inválidos.',
    );
  });

  it('remembers who entered, so the shell knows whose name to show', async () => {
    const useCase = useCaseWith(gatewayThatReturns(success(maria)));

    await useCase.execute('maria.silva@ovyx.com.br', 'GranjaNorte2026');

    expect(TestBed.inject(SessionStore).caretaker()).toEqual(maria);
  });

  it('leaves the session empty when the entry was refused', async () => {
    const refusal = failure<AuthenticatedCaretaker>(
      Notification.of([
        { code: 'INVALID_CREDENTIALS', message: 'E-mail, celular ou senha inválidos.' },
      ]),
    );
    const useCase = useCaseWith(gatewayThatReturns(refusal));

    await useCase.execute('maria.silva@ovyx.com.br', 'SenhaErrada2026');

    expect(TestBed.inject(SessionStore).caretaker()).toBeNull();
  });
});
