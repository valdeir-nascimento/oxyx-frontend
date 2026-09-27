import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindReportCageUseCase } from '../../../application/daily-report/find-report-cage.usecase';
import { ListActiveFormulasUseCase } from '../../../application/daily-report/list-active-formulas.usecase';
import { RecordFeedUseCase } from '../../../application/daily-report/record-feed.usecase';
import { DailyReport, FeedFormulaOption, ReportCage } from '../../../domain/daily-report';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';
import { FeedDialog } from './feed-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Lançamento ou correção da ração de uma gaiola (US3 da 004; FR-010, FR-011, FR-020), em diálogo sobre a
 * aba Ração: a fórmula entre as ativas e a que a gaiola já usa, o consumo como foi digitado, e todas as
 * falhas de uma vez.
 */
describe('FeedDialog', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const cageId = '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44';
  const posturaPlus: FeedFormulaOption = {
    id: '4e6a8c0e-2a4c-4e6a-9c0e-2a4c6e8a0c11',
    name: 'Postura Plus',
    pricePerKg: 2.85,
    expectedIntake: 28,
  };
  const recria: FeedFormulaOption = {
    id: '8a0c2e4a-6c8e-4a0c-8e2a-4c6e8a0c2e22',
    name: 'Recria',
    pricePerKg: 3.1,
    expectedIntake: 24,
  };
  const b07: ReportCage = { cageId, code: 'B-07', battery: 'B', number: 7, birdCount: 50 };
  const fed: ReportCage = {
    ...b07,
    feed: {
      formulaId: posturaPlus.id,
      formulaName: 'Postura Plus',
      pricePerKg: 2.85,
      expectedIntake: 28,
      consumption: 1400,
      cost: 3.99,
      intakePerBird: 28,
      deviation: 0,
    },
  };

  let find: Mock;
  let listFormulas: Mock;
  let record: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<FeedDialog>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function input(id: string): HTMLInputElement {
    return element().querySelector<HTMLInputElement>('#' + id)!;
  }

  function select(): HTMLSelectElement {
    return element().querySelector<HTMLSelectElement>('select#formulaId')!;
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function submit(): Promise<void> {
    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
    await settle();
  }

  function toasts(): readonly string[] {
    return TestBed.inject(Toaster)
      .toasts()
      .map((toast) => toast.message);
  }

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FeedDialog],
      providers: [
        provideRouter([]),
        ReportView,
        { provide: FindReportCageUseCase, useValue: { execute: find } },
        { provide: ListActiveFormulasUseCase, useValue: { execute: listFormulas } },
        { provide: RecordFeedUseCase, useValue: { execute: record } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ cageId }),
              parent: {
                paramMap: convertToParamMap({}),
                parent: { paramMap: convertToParamMap({ sectorId, reportId }), parent: null },
              },
            },
          },
        },
      ],
    }).compileComponents();
    TestBed.inject(ReportView).report.set({
      id: reportId,
      collectionDate: '2026-09-24',
    } as DailyReport);
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(FeedDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
    await settle();
  }

  beforeEach(() => {
    find = vi.fn().mockResolvedValue(success(fed));
    listFormulas = vi.fn().mockResolvedValue(success([posturaPlus, recria]));
    record = vi
      .fn()
      .mockResolvedValue(success({ ...fed, feed: { ...fed.feed!, consumption: 1250 } }));
  });

  afterEach(() => element().remove());

  it('names the cage and its birds, on the day of the report', async () => {
    await render();

    expect(find).toHaveBeenCalledWith(sectorId, reportId, cageId);
    expect(element().querySelector('h2')?.textContent).toContain('Ração · B-07');
    expect(element().textContent).toContain('50 aves · relatório de 24/09/2026');
  });

  it('comes with the formula and the consumption recorded before, the consumption with the numeric keyboard', async () => {
    await render();

    expect(select().value).toBe(posturaPlus.id);
    expect(input('consumption').value).toBe('1400');
    expect(input('consumption').getAttribute('inputmode')).toBe('numeric');
  });

  it('offers the active formulas, each with its price', async () => {
    find.mockResolvedValue(success(b07));
    await render();

    expect(Array.from(select().options).map((option) => option.textContent?.trim())).toEqual([
      'Escolha a fórmula',
      'Postura Plus · R$ 2,85/kg',
      'Recria · R$ 3,10/kg',
    ]);
    expect(select().value).toBe('');
  });

  it('keeps among the options the formula the cage already uses, even when it is no longer active', async () => {
    listFormulas.mockResolvedValue(success([recria]));
    await render();

    const labels = Array.from(select().options).map((option) => option.textContent?.trim());
    expect(labels).toContain('Postura Plus · R$ 2,85/kg (inativa)');
    expect(select().value).toBe(posturaPlus.id);
  });

  it('saves the formula and the consumption as typed, says so in a toast, tells the page and goes back to the tab', async () => {
    await render();
    input('consumption').value = '1.250';
    input('consumption').dispatchEvent(new Event('input'));

    await submit();

    expect(record).toHaveBeenCalledWith(sectorId, reportId, cageId, {
      formulaId: posturaPlus.id,
      consumption: '1.250',
    });
    expect(toasts()).toEqual(['Ração da gaiola B-07 salva.']);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', reportId, 'racao']);
  });

  it('shows every refused field at once, each next to its field, and stays open', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'formulaId',
            message: 'A fórmula Recria está inativa. Escolha uma fórmula ativa.',
          },
          {
            code: 'VALIDATION_FAILED',
            field: 'consumption',
            message: 'O consumo deve ser um número inteiro de gramas.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#formulaId-error')?.textContent).toContain(
      'A fórmula Recria está inativa. Escolha uma fórmula ativa.',
    );
    expect(element().querySelector('#consumption-error')?.textContent).toContain(
      'O consumo deve ser um número inteiro de gramas.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('says the cage was not found, without the fields, for a cage out of the report', async () => {
    find.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'CAGE_NOT_FOUND', message: 'Gaiola não encontrada neste relatório.' },
        ]),
      ),
    );
    await render();

    expect(element().textContent).toContain('Gaiola não encontrada neste relatório.');
    expect(element().querySelector('#consumption')).toBeNull();
  });

  it('goes back to the tab without saving when cancelled', async () => {
    await render();

    Array.from(element().querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.trim() === 'Cancelar')!
      .click();
    await settle();

    expect(record).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', reportId, 'racao']);
  });

  it('tells the report when the sector turned out inactive', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'SECTOR_INACTIVE', message: 'O setor está inativo; os relatórios dele são só para consulta.' },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().textContent).toContain('O setor está inativo');
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
  });

  it('says the formulas could not be read, without the fields', async () => {
    listFormulas.mockResolvedValue(
      failure(Notification.of([{ code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.' }])),
    );
    await render();

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'Não foi possível concluir a operação.',
    );
    expect(element().querySelector('#consumption')).toBeNull();
  });
});
