import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { success } from '../../../shared/application/result';
import { Sector } from '../../domain/sector';
import { DeactivateSectorUseCase } from './deactivate-sector.usecase';
import { FindSectorByIdUseCase } from './find-sector-by-id.usecase';
import { ListSectorsUseCase } from './list-sectors.usecase';
import { ReactivateSectorUseCase } from './reactivate-sector.usecase';
import { RegisterSectorUseCase } from './register-sector.usecase';
import { SECTOR_GATEWAY } from './sector-gateway';
import { UpdateSectorUseCase } from './update-sector.usecase';

/**
 * Os casos de uso de setor entregam ao backend o que a pessoa pediu, como ela pediu: quem valida, e
 * devolve todas as falhas de uma vez, é o backend (FR-017).
 */
describe('sector use cases', () => {
  const galpao: Sector = {
    id: '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11',
    name: 'Codornas — Galpão 1',
    status: 'ACTIVE',
    activeCageCount: 0,
    birdCount: 0,
    batteries: [],
    createdAt: '2026-09-20T10:15:00Z',
    updatedAt: '2026-09-20T10:15:00Z',
  };

  let gateway: Record<string, Mock>;

  beforeEach(() => {
    gateway = {
      listSectors: vi.fn().mockResolvedValue(success([])),
      findSector: vi.fn().mockResolvedValue(success(galpao)),
      registerSector: vi.fn().mockResolvedValue(success(galpao)),
      updateSector: vi.fn().mockResolvedValue(success(galpao)),
      deactivateSector: vi.fn().mockResolvedValue(success(galpao)),
      reactivateSector: vi.fn().mockResolvedValue(success(galpao)),
    };
    TestBed.configureTestingModule({ providers: [{ provide: SECTOR_GATEWAY, useValue: gateway }] });
  });

  it('lists the sectors of the asked status', async () => {
    const result = await TestBed.inject(ListSectorsUseCase).execute('ALL');

    expect(gateway['listSectors']).toHaveBeenCalledWith('ALL');
    expect(result.success && result.value).toEqual([]);
  });

  it('finds a sector by its identifier', async () => {
    const result = await TestBed.inject(FindSectorByIdUseCase).execute(galpao.id);

    expect(gateway['findSector']).toHaveBeenCalledWith(galpao.id);
    expect(result.success && result.value).toEqual(galpao);
  });

  it('registers a sector with the fields as typed', async () => {
    await TestBed.inject(RegisterSectorUseCase).execute({ name: ' Galpão 4 ', description: '' });

    expect(gateway['registerSector']).toHaveBeenCalledWith({ name: ' Galpão 4 ', description: '' });
  });

  it('updates a sector with the fields as typed', async () => {
    await TestBed.inject(UpdateSectorUseCase).execute(galpao.id, { name: 'Galpão 1 (norte)', description: 'Ala norte' });

    expect(gateway['updateSector']).toHaveBeenCalledWith(galpao.id, {
      name: 'Galpão 1 (norte)',
      description: 'Ala norte',
    });
  });

  it('deactivates and reactivates a sector by its identifier', async () => {
    await TestBed.inject(DeactivateSectorUseCase).execute(galpao.id);
    await TestBed.inject(ReactivateSectorUseCase).execute(galpao.id);

    expect(gateway['deactivateSector']).toHaveBeenCalledWith(galpao.id);
    expect(gateway['reactivateSector']).toHaveBeenCalledWith(galpao.id);
  });
});
