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

  let gateway: AuthenticationGateway;

  function useCaseWith(result: Result<AuthenticatedCaretaker>): RestoreSessionUseCase {
    gateway = {
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

  it('asks the backend once for everyone who asks at the same time', async () => {
    // O interceptador reconsulta a cada 403, e várias recusas ao mesmo tempo repetiam a pergunta.
    const useCase = useCaseWith(success(maria));

    const answers = await Promise.all([useCase.execute(), useCase.execute()]);

    expect(gateway.currentCaretaker).toHaveBeenCalledOnce();
    expect(answers).toEqual([success(maria), success(maria)]);
  });

  it('asks again once the previous question is answered', async () => {
    const useCase = useCaseWith(success(maria));
    await useCase.execute();

    await useCase.execute();

    expect(gateway.currentCaretaker).toHaveBeenCalledTimes(2);
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
