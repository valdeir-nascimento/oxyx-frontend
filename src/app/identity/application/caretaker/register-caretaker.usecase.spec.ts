import { TestBed } from '@angular/core/testing';
import { Result, failure, success } from '../../../shared/application/result';
import { Notification } from '../../../shared/domain/notification';
import { CaretakerDetail, CaretakerPage } from '../../domain/caretaker';
import { CARETAKER_GATEWAY, CaretakerGateway } from './caretaker-gateway';
import { RegisterCaretakerUseCase } from './register-caretaker.usecase';

/**
 * Cadastro de responsável (T087): entrega o que foi digitado, e o backend valida tudo de uma vez.
 */
describe('RegisterCaretakerUseCase', () => {
  const joao: CaretakerDetail = {
    id: '9f8e7d6c-5b4a-4938-2716-0f1e2d3c4b5a',
    fullName: 'João Pereira de Souza',
    cpf: '52998224725',
    email: 'joao.pereira@ovyx.com.br',
    mobilePhone: '91991234567',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-09-18T13:45:10Z',
    updatedAt: '2026-09-18T13:45:10Z',
  };
  const page: CaretakerPage = { content: [joao], page: 0, size: 20, totalElements: 1, totalPages: 1 };

  /** Uma recusa que esta operação pode receber, como o adaptador a entrega. */
  function refusal<T>(): Result<T> {
    return failure<T>(
      Notification.of([
        { code: 'EMAIL_ALREADY_IN_USE', field: 'email', message: 'Já existe um responsável ativo com este e-mail.' },
      ]),
    );
  }

  let gateway: { [K in keyof CaretakerGateway]: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    gateway = {
      search: vi.fn().mockResolvedValue(success(page)),
      find: vi.fn().mockResolvedValue(success(joao)),
      register: vi.fn().mockResolvedValue(success(joao)),
      update: vi.fn().mockResolvedValue(success(joao)),
      deactivate: vi.fn().mockResolvedValue(success({ ...joao, status: 'INACTIVE' })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: CARETAKER_GATEWAY, useValue: gateway }] });
  });

  it('registers exactly what was typed: the backend validates every field at once', async () => {
    // Filtrar ou validar aqui faria o cliente recusar o que o backend aceita, ou o contrário.
    const registration = {
      fullName: '',
      cpf: '529.982.247-25',
      email: 'joao.pereira@ovyx.com.br',
      mobilePhone: '(91) 99123-4567',
      password: 'AviarioSul2026',
      role: null,
    };

    await TestBed.inject(RegisterCaretakerUseCase).execute(registration);

    expect(gateway.register).toHaveBeenCalledWith(registration);
  });

  it('passes the backend refusal through, without rewriting it', async () => {
    // A recusa é do backend: trocá-la por outra coisa aqui — uma página vazia, o resultado de outra
    // consulta — escondia da tela o motivo real.
    gateway.register.mockResolvedValue(refusal());

    const result = await TestBed.inject(RegisterCaretakerUseCase).execute({
      fullName: 'João Pereira de Souza',
      cpf: '52998224725',
      email: 'joao.pereira@ovyx.com.br',
      mobilePhone: '91991234567',
      password: 'AviarioSul2026',
      role: 'USER',
    });

    expect(result).toEqual(refusal());
  });
});
