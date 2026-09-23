import { TestBed } from '@angular/core/testing';
import { Notification } from '../../../shared/domain/notification';
import { Result, failure, success } from '../../../shared/application/result';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { AUTHENTICATION_GATEWAY, AuthenticationGateway } from './authentication-gateway';
import { RestoreSessionUseCase } from './restore-session.usecase';
import { SessionStore } from './session-store';

/**
 * Recarregar a página não deveria expulsar ninguém: a sessão está no cookie, e quem sabe se ela
 * ainda vale é o backend. Este caso de uso é a pergunta que o cliente faz ao carregar uma rota.
 */
describe('RestoreSessionUseCase', () => {
  const maria: AuthenticatedCaretaker = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'USER',
    mustChangePassword: false,
  };

  function useCaseWith(result: Result<AuthenticatedCaretaker>): RestoreSessionUseCase {
    const gateway: AuthenticationGateway = {
      signIn: vi.fn(),
      signOut: vi.fn(),
      currentCaretaker: vi.fn().mockResolvedValue(result),
    };
    TestBed.configureTestingModule({
      providers: [RestoreSessionUseCase, { provide: AUTHENTICATION_GATEWAY, useValue: gateway }],
    });
    return TestBed.inject(RestoreSessionUseCase);
  }

  it('brings back who the cookie still identifies', async () => {
    const useCase = useCaseWith(success(maria));

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(TestBed.inject(SessionStore).caretaker()).toEqual(maria);
  });

  it('leaves the session empty when the backend no longer recognizes it', async () => {
    const refusal = failure<AuthenticatedCaretaker>(
      Notification.of([
        { code: 'UNAUTHENTICATED', message: 'Sua sessão expirou. Entre novamente para continuar.' },
      ]),
    );
    const useCase = useCaseWith(refusal);
    const store = TestBed.inject(SessionStore);
    store.remember(maria);

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(store.caretaker()).toBeNull();
  });
});
