import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { success } from '../../../shared/application/result';
import { FeedFormula, FeedFormulaInput } from '../../domain/feed-formula';
import { DeactivateFeedFormulaUseCase } from './deactivate-feed-formula.usecase';
import { FEED_FORMULA_GATEWAY } from './feed-formula-gateway';
import { FindFeedFormulaUseCase } from './find-feed-formula.usecase';
import { ListFeedFormulasUseCase } from './list-feed-formulas.usecase';
import { ReactivateFeedFormulaUseCase } from './reactivate-feed-formula.usecase';
import { RegisterFeedFormulaUseCase } from './register-feed-formula.usecase';
import { UpdateFeedFormulaUseCase } from './update-feed-formula.usecase';

/**
 * Os casos de uso de fórmula entregam ao backend o que a pessoa pediu, como ela pediu: quem valida, e
 * devolve todas as falhas de uma vez, é o backend (FR-020 da 004).
 */
describe('feed formula use cases', () => {
  const posturaPlus: FeedFormula = {
    id: '4e6a8c0e-2a4c-4e6a-9c0e-2a4c6e8a0c11',
    name: 'Postura Plus',
    pricePerKg: 2.85,
    expectedIntake: 28,
    costPerBirdDay: 0.08,
    status: 'ACTIVE',
    createdAt: '2026-09-20T10:15:00Z',
    updatedAt: '2026-09-20T10:15:00Z',
  };
  const typed: FeedFormulaInput = {
    name: ' Postura Plus ',
    pricePerKg: '2,85',
    expectedIntake: '28',
    description: '',
  };

  let gateway: Record<string, Mock>;

  beforeEach(() => {
    gateway = {
      listFeedFormulas: vi.fn().mockResolvedValue(success([posturaPlus])),
      findFeedFormula: vi.fn().mockResolvedValue(success(posturaPlus)),
      registerFeedFormula: vi.fn().mockResolvedValue(success(posturaPlus)),
      updateFeedFormula: vi.fn().mockResolvedValue(success(posturaPlus)),
      deactivateFeedFormula: vi.fn().mockResolvedValue(success(posturaPlus)),
      reactivateFeedFormula: vi.fn().mockResolvedValue(success(posturaPlus)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: FEED_FORMULA_GATEWAY, useValue: gateway }],
    });
  });

  it('lists the formulas of the asked status', async () => {
    const result = await TestBed.inject(ListFeedFormulasUseCase).execute('INACTIVE');

    expect(gateway['listFeedFormulas']).toHaveBeenCalledWith('INACTIVE');
    expect(result.success && result.value).toEqual([posturaPlus]);
  });

  it('finds a formula by its identifier', async () => {
    const result = await TestBed.inject(FindFeedFormulaUseCase).execute(posturaPlus.id);

    expect(gateway['findFeedFormula']).toHaveBeenCalledWith(posturaPlus.id);
    expect(result.success && result.value).toEqual(posturaPlus);
  });

  it('registers a formula with the fields as typed', async () => {
    await TestBed.inject(RegisterFeedFormulaUseCase).execute(typed);

    expect(gateway['registerFeedFormula']).toHaveBeenCalledWith(typed);
  });

  it('updates a formula with the fields as typed', async () => {
    await TestBed.inject(UpdateFeedFormulaUseCase).execute(posturaPlus.id, typed);

    expect(gateway['updateFeedFormula']).toHaveBeenCalledWith(posturaPlus.id, typed);
  });

  it('deactivates and reactivates a formula', async () => {
    await TestBed.inject(DeactivateFeedFormulaUseCase).execute(posturaPlus.id);
    await TestBed.inject(ReactivateFeedFormulaUseCase).execute(posturaPlus.id);

    expect(gateway['deactivateFeedFormula']).toHaveBeenCalledWith(posturaPlus.id);
    expect(gateway['reactivateFeedFormula']).toHaveBeenCalledWith(posturaPlus.id);
  });
});
