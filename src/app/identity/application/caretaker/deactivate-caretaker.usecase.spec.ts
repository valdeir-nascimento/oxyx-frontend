import { TestBed } from '@angular/core/testing';
import { Result, failure, success } from '../../../shared/application/result';
import { Notification } from '../../../shared/domain/notification';
import { CaretakerDetail, CaretakerPage } from '../../domain/caretaker';
import { CARETAKER_GATEWAY, CaretakerGateway } from './caretaker-gateway';
import { DeactivateCaretakerUseCase } from './deactivate-caretaker.usecase';

/**
 * Inativação de responsável (T087).
 */
describe('DeactivateCaretakerUseCase', () => {
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
        {
          code: 'LAST_ADMINISTRATOR',
          field: 'status',
          message: 'O sistema precisa de ao menos um administrador ativo.',
        },
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

  it('deactivates the caretaker by its id and returns it inactive', async () => {
    const deactivated = await TestBed.inject(DeactivateCaretakerUseCase).execute(joao.id);

    expect(gateway.deactivate).toHaveBeenCalledWith(joao.id);
    expect(deactivated).toEqual(success({ ...joao, status: 'INACTIVE' }));
  });

  it('passes the backend refusal through, without rewriting it', async () => {
    // A recusa é do backend: trocá-la por outra coisa aqui — uma página vazia, o resultado de outra
    // consulta — escondia da tela o motivo real.
    gateway.deactivate.mockResolvedValue(refusal());

    const result = await TestBed.inject(DeactivateCaretakerUseCase).execute(joao.id);

    expect(result).toEqual(refusal());
  });
});
