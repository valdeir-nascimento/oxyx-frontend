import { TestBed } from '@angular/core/testing';
import { Result, failure, success } from '../../../shared/application/result';
import { Notification } from '../../../shared/domain/notification';
import { CaretakerDetail, CaretakerPage } from '../../domain/caretaker';
import { CARETAKER_GATEWAY, CaretakerGateway } from './caretaker-gateway';
import { SearchCaretakersUseCase } from './search-caretakers.usecase';

/**
 * Pesquisa de responsáveis (T087): pede a página certa, sem filtro vazio no caminho.
 */
describe('SearchCaretakersUseCase', () => {
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
        { code: 'REQUEST_FAILED', message: 'Não houve resposta do servidor. Tente novamente em instantes.' },
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

  it('searches by the trimmed name fragment', async () => {
    await TestBed.inject(SearchCaretakersUseCase).execute({ name: '  Pereira ', page: 0, size: 20 });

    expect(gateway.search).toHaveBeenCalledWith({ name: 'Pereira', page: 0, size: 20 });
  });

  it('searches without a name filter when the name is blank', async () => {
    await TestBed.inject(SearchCaretakersUseCase).execute({ name: '   ', status: 'ACTIVE', page: 1, size: 20 });

    expect(gateway.search).toHaveBeenCalledWith({ status: 'ACTIVE', page: 1, size: 20 });
  });

  it('returns the page the backend found', async () => {
    const result = await TestBed.inject(SearchCaretakersUseCase).execute({ page: 0, size: 20 });

    expect(result).toEqual(success(page));
  });

  it('passes the backend refusal through, without rewriting it', async () => {
    // A recusa é do backend: trocá-la por outra coisa aqui — uma página vazia, o resultado de outra
    // consulta — escondia da tela o motivo real.
    gateway.search.mockResolvedValue(refusal());

    const result = await TestBed.inject(SearchCaretakersUseCase).execute({ page: 0, size: 20 });

    expect(result).toEqual(refusal());
  });
});
