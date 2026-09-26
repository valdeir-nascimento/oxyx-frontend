import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindReportCageUseCase } from '../../../application/daily-report/find-report-cage.usecase';
import { RecordProductionUseCase } from '../../../application/daily-report/record-production.usecase';
import { DailyReport, ReportCage } from '../../../domain/daily-report';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';
import { ProductionDialog } from './production-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Lançamento da produção de uma gaiola (US2; FR-007 a FR-010, FR-018): os ovos e a classificação, com
 * o que já foi lançado; todas as recusas de uma vez, a da soma junto dos ovos.
 */
describe('ProductionDialog', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const cageId = '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44';
  const b07: ReportCage = { cageId, code: 'B-07', battery: 'B', number: 7, birdCount: 50 };
  const recorded: ReportCage = {
    ...b07,
    production: { eggs: 45, small: 0, jumbo: 1, dirty: 1, cracked: 2, bloodSpot: 1, abnormal: 0 },
  };

  let find: Mock;
  let record: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<ProductionDialog>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function field(id: string): HTMLInputElement {
    return element().querySelector<HTMLInputElement>('#' + id)!;
  }

  function type(id: string, value: string): void {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
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
      imports: [ProductionDialog],
      providers: [
        provideRouter([]),
        ReportView,
        { provide: FindReportCageUseCase, useValue: { execute: find } },
        { provide: RecordProductionUseCase, useValue: { execute: record } },
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
    TestBed.inject(ReportView).report.set({ id: reportId, collectionDate: '2026-09-24' } as DailyReport);
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(ProductionDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
    await settle();
  }

  beforeEach(() => {
    find = vi.fn().mockResolvedValue(success(recorded));
    record = vi.fn().mockResolvedValue(success(recorded));
  });

  afterEach(() => element().remove());

  it('names the cage and its birds, on the day of the report', async () => {
    await render();

    expect(find).toHaveBeenCalledWith(sectorId, reportId, cageId);
    expect(element().textContent).toContain('Produção · B-07');
    expect(element().textContent).toContain('50 aves · relatório de 24/09/2026');
  });

  it('comes with the production recorded before', async () => {
    await render();

    expect(field('eggs').value).toBe('45');
    expect(field('small').value).toBe('0');
    expect(field('jumbo').value).toBe('1');
    expect(field('dirty').value).toBe('1');
    expect(field('cracked').value).toBe('2');
    expect(field('bloodSpot').value).toBe('1');
    expect(field('abnormal').value).toBe('0');
  });

  it('comes empty for a cage without production', async () => {
    find.mockResolvedValue(success(b07));

    await render();

    expect(field('eggs').value).toBe('');
    expect(field('cracked').value).toBe('');
  });

  it('records the production as typed, in the cage of the address', async () => {
    find.mockResolvedValue(success(b07));
    await render();
    type('eggs', '45');
    type('cracked', '2');

    await submit();

    expect(record).toHaveBeenCalledWith(sectorId, reportId, cageId, {
      eggs: '45',
      small: '',
      jumbo: '',
      dirty: '',
      cracked: '2',
      bloodSpot: '',
      abnormal: '',
    });
  });

  it('confirms in a toast, tells the report and goes back to the production tab', async () => {
    await render();

    await submit();

    expect(toasts()).toEqual(['Produção da gaiola B-07 salva.']);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', reportId, 'producao']);
  });

  it('shows every refused field at once, the sum next to the eggs', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'eggs', message: 'As classificações somam 34, mais que os 30 ovos coletados.' },
          { code: 'VALIDATION_FAILED', field: 'cracked', message: 'A quantidade de trincados deve ser um número inteiro.' },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#eggs-error')?.textContent).toContain('somam 34');
    expect(element().querySelector('#cracked-error')?.textContent).toContain('número inteiro');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('tells the report when the sector turned out inactive', async () => {
    record.mockResolvedValue(
      failure(Notification.of([{ code: 'SECTOR_INACTIVE', message: 'O setor está inativo; os relatórios dele são só para consulta.' }])),
    );
    await render();

    await submit();

    expect(element().textContent).toContain('O setor está inativo');
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
  });

  it('says the cage was not found for a cage out of the report', async () => {
    find.mockResolvedValue(
      failure(Notification.of([{ code: 'CAGE_NOT_FOUND', message: 'Gaiola não encontrada neste relatório.' }])),
    );

    await render();

    expect(element().textContent).toContain('Gaiola não encontrada neste relatório.');
    expect(element().querySelector('#eggs')).toBeNull();
  });

  it('says the report was not found, and not the cage, when the report is gone', async () => {
    find.mockResolvedValue(failure(Notification.of([{ code: 'DAILY_REPORT_NOT_FOUND', message: 'Relatório não encontrado.' }])));

    await render();

    expect(element().textContent).toContain('Relatório não encontrado.');
    expect(element().textContent).not.toContain('Gaiola não encontrada');
  });

  it('goes back to the production tab without recording when cancelled', async () => {
    await render();

    Array.from(element().querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Cancelar')!
      .click();
    await settle();

    expect(record).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', reportId, 'producao']);
  });
});
