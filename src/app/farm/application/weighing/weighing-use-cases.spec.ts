import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { success } from '../../../shared/application/result';
import { Weighing, WeighingInput, WeighingOverview } from '../../domain/weighing';
import { CorrectWeighingUseCase } from './correct-weighing.usecase';
import { FindWeighingUseCase } from './find-weighing.usecase';
import { GetWeighingOverviewUseCase } from './get-weighing-overview.usecase';
import { RecordWeighingUseCase } from './record-weighing.usecase';
import { VoidWeighingUseCase } from './void-weighing.usecase';
import { WEIGHING_GATEWAY } from './weighing-gateway';

/**
 * Os casos de uso de pesagem entregam ao backend o que a pessoa pediu, como ela pediu: quem valida, e faz
 * as contas do acompanhamento, é o backend (FR-014 e R-008 da 005).
 */
describe('weighing use cases', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  const cageId = '2a4c6e8a-0b1d-4f3a-9c5e-7a9b1d3f5a66';
  const marina = { id: '5e7a9c1e-3b5d-4f7a-9c1e-3b5d7f9a1c22', name: 'Marina Alves' };
  const weighing: Weighing = {
    id: '7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d77',
    weighedOn: '2026-09-24',
    averageWeight: 161.4,
    recordedBy: marina,
    recordedAt: '2026-09-24T10:12:40Z',
  };
  const overview: WeighingOverview = {
    cage: { id: cageId, code: 'A-01', battery: 'A', number: 1, birdCount: 48, status: 'ACTIVE' },
    sector: { id: sectorId, name: 'Codornas — Galpão 1', status: 'ACTIVE' },
    chart: [],
    history: [],
  };
  const typed: WeighingInput = { weighedOn: '2026-09-24', averageWeight: '161,4' };

  let gateway: Record<string, Mock>;

  beforeEach(() => {
    gateway = {
      getWeighingOverview: vi.fn().mockResolvedValue(success(overview)),
      recordWeighing: vi.fn().mockResolvedValue(success(weighing)),
      findWeighing: vi.fn().mockResolvedValue(success(weighing)),
      correctWeighing: vi.fn().mockResolvedValue(success(weighing)),
      voidWeighing: vi.fn().mockResolvedValue(success(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: WEIGHING_GATEWAY, useValue: gateway }],
    });
  });

  it('asks for the overview of the weight of a cage', async () => {
    const result = await TestBed.inject(GetWeighingOverviewUseCase).execute(sectorId, cageId);

    expect(gateway['getWeighingOverview']).toHaveBeenCalledWith(sectorId, cageId);
    expect(result.success && result.value).toEqual(overview);
  });

  it('records a weighing as it was typed', async () => {
    const result = await TestBed.inject(RecordWeighingUseCase).execute(sectorId, cageId, typed);

    expect(gateway['recordWeighing']).toHaveBeenCalledWith(sectorId, cageId, typed);
    expect(result.success && result.value).toEqual(weighing);
  });

  it('finds, corrects and voids a weighing', async () => {
    await TestBed.inject(FindWeighingUseCase).execute(sectorId, cageId, weighing.id);
    await TestBed.inject(CorrectWeighingUseCase).execute(sectorId, cageId, weighing.id, typed);
    await TestBed.inject(VoidWeighingUseCase).execute(sectorId, cageId, weighing.id);

    expect(gateway['findWeighing']).toHaveBeenCalledWith(sectorId, cageId, weighing.id);
    expect(gateway['correctWeighing']).toHaveBeenCalledWith(sectorId, cageId, weighing.id, typed);
    expect(gateway['voidWeighing']).toHaveBeenCalledWith(sectorId, cageId, weighing.id);
  });
});
