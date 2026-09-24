import { TestBed } from '@angular/core/testing';
import { success } from '../../../shared/application/result';
import { CaretakerDetail, CaretakerPage } from '../../domain/caretaker';
import { CARETAKER_GATEWAY, CaretakerGateway } from './caretaker-gateway';
import {
  DeactivateCaretakerUseCase,
  FindCaretakerUseCase,
  RegisterCaretakerUseCase,
  SearchCaretakersUseCase,
  UpdateCaretakerUseCase,
} from './caretaker.usecase';

/**
 * Casos de uso da administração de responsáveis (T087). As regras são do backend; o que cabe ao
 * cliente é pedir a página certa e entregar o que foi digitado, sem filtrar nada no caminho.
 */
describe('caretaker use cases', () => {
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

  it('finds, updates and deactivates through the gateway, by the caretaker id', async () => {
    const update = { fullName: 'João Pereira', cpf: '52998224725', email: 'joao@ovyx.com.br', mobilePhone: '91991234567', role: 'ADMINISTRATOR' as const };

    await TestBed.inject(FindCaretakerUseCase).execute(joao.id);
    await TestBed.inject(UpdateCaretakerUseCase).execute(joao.id, update);
    const deactivated = await TestBed.inject(DeactivateCaretakerUseCase).execute(joao.id);

    expect(gateway.find).toHaveBeenCalledWith(joao.id);
    expect(gateway.update).toHaveBeenCalledWith(joao.id, update);
    expect(deactivated).toEqual(success({ ...joao, status: 'INACTIVE' }));
  });
});
