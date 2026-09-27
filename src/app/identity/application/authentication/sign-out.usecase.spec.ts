import { TestBed } from '@angular/core/testing';
import { Notification } from '../../../shared/domain/notification';
import { Result, failure, success } from '../../../shared/application/result';
import { AUTHENTICATION_GATEWAY, AuthenticationGateway } from './authentication-gateway';
import { SessionStore } from './session-store';
import { SignOutUseCase } from './sign-out.usecase';

describe('SignOutUseCase', () => {
  function useCaseWith(result: Result<void>): SignOutUseCase {
    const gateway: AuthenticationGateway = {
      signIn: vi.fn(),
      signOut: vi.fn().mockResolvedValue(result),
      currentCaretaker: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [SignOutUseCase, { provide: AUTHENTICATION_GATEWAY, useValue: gateway }],
    });
    return TestBed.inject(SignOutUseCase);
  }

  function rememberMaria(): SessionStore {
    const store = TestBed.inject(SessionStore);
    store.remember({
      id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
      fullName: 'Maria Silva',
      role: 'USER',
      mustChangePassword: false,
    });
    return store;
  }

  it('forgets who was in the session once the backend invalidated it', async () => {
    const useCase = useCaseWith(success(undefined));
    const store = rememberMaria();

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(store.caretaker()).toBeNull();
  });

  it('keeps the session on screen when the backend did not invalidate it', async () => {
    // Quem invalida a sessão é o backend (FR-004). Esquecer aqui apesar da recusa mostraria alguém
    // "fora do sistema" com o cookie ainda valendo — e a próxima requisição passaria.
    const refusal = failure<void>(
      Notification.of([
        { code: 'REQUEST_FAILED', message: 'Não houve resposta do servidor. Tente novamente em instantes.' },
      ]),
    );
    const useCase = useCaseWith(refusal);
    const store = rememberMaria();

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(store.caretaker()?.fullName).toBe('Maria Silva');
  });
});
