import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { success } from '../../../shared/application/result';
import { CAGE_GATEWAY } from './cage-gateway';
import { DeactivateCageUseCase } from './deactivate-cage.usecase';
import { FindCageByIdUseCase } from './find-cage-by-id.usecase';
import { ReactivateCageUseCase } from './reactivate-cage.usecase';
import { RegisterCageUseCase } from './register-cage.usecase';
import { SearchCagesUseCase } from './search-cages.usecase';
import { UpdateCageUseCase } from './update-cage.usecase';

/**
 * Os casos de uso de gaiola entregam ao backend o que a pessoa pediu. A pesquisa apara o código e a
 * bateria e os omite quando ficam vazios: "sem filtro" e "filtro vazio" são a mesma pergunta.
 */
describe('cage use cases', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  let gateway: Record<string, Mock>;

  beforeEach(() => {
    gateway = {
      searchCages: vi.fn().mockResolvedValue(success({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
      findCage: vi.fn().mockResolvedValue(success(null)),
      registerCage: vi.fn().mockResolvedValue(success(null)),
      updateCage: vi.fn().mockResolvedValue(success(null)),
      deactivateCage: vi.fn().mockResolvedValue(success(null)),
      reactivateCage: vi.fn().mockResolvedValue(success(null)),
    };
    TestBed.configureTestingModule({ providers: [{ provide: CAGE_GATEWAY, useValue: gateway }] });
  });

  it('searches with the code and the battery trimmed', async () => {
    await TestBed.inject(SearchCagesUseCase).execute(sectorId, {
      code: ' b-0 ',
      battery: ' B ',
      status: 'ALL',
      page: 0,
      size: 20,
    });

    expect(gateway['searchCages']).toHaveBeenCalledWith(sectorId, {
      code: 'b-0',
      battery: 'B',
      status: 'ALL',
      page: 0,
      size: 20,
    });
  });

  it('leaves a blank code and a blank battery out of the search', async () => {
    await TestBed.inject(SearchCagesUseCase).execute(sectorId, {
      code: '   ',
      battery: '',
      status: 'ACTIVE',
      page: 1,
      size: 20,
    });

    expect(gateway['searchCages']).toHaveBeenCalledWith(sectorId, { status: 'ACTIVE', page: 1, size: 20 });
  });

  it('finds, registers and updates a cage as asked', async () => {
    const input = { battery: 'B', number: '7', birdCount: '50' };

    await TestBed.inject(FindCageByIdUseCase).execute(sectorId, 'cage-1');
    await TestBed.inject(RegisterCageUseCase).execute(sectorId, input);
    await TestBed.inject(UpdateCageUseCase).execute(sectorId, 'cage-1', input);

    expect(gateway['findCage']).toHaveBeenCalledWith(sectorId, 'cage-1');
    expect(gateway['registerCage']).toHaveBeenCalledWith(sectorId, input);
    expect(gateway['updateCage']).toHaveBeenCalledWith(sectorId, 'cage-1', input);
  });

  it('deactivates and reactivates a cage of the sector', async () => {
    await TestBed.inject(DeactivateCageUseCase).execute(sectorId, 'cage-1');
    await TestBed.inject(ReactivateCageUseCase).execute(sectorId, 'cage-1');

    expect(gateway['deactivateCage']).toHaveBeenCalledWith(sectorId, 'cage-1');
    expect(gateway['reactivateCage']).toHaveBeenCalledWith(sectorId, 'cage-1');
  });
});
