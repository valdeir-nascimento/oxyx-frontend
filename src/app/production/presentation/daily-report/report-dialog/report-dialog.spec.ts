import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { CorrectDailyReportUseCase } from '../../../application/daily-report/correct-daily-report.usecase';
import { FindDailyReportUseCase } from '../../../application/daily-report/find-daily-report.usecase';
import { ListDailyReportsUseCase } from '../../../application/daily-report/list-daily-reports.usecase';
import { OpenDailyReportUseCase } from '../../../application/daily-report/open-daily-report.usecase';
import { SuggestDailyReportUseCase } from '../../../application/daily-report/suggest-daily-report.usecase';
import { DailyReport, DailyReportPage } from '../../../domain/daily-report';
import { ReportChanges } from '../report-changes';
import { ReportDialog } from './report-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Abertura do relatório do dia (US1; FR-001 a FR-004, FR-018): a data, a hora, as aves e a idade vêm
 * sugeridas; todas as recusas aparecem de uma vez; e o relatório que já existe no dia tem o caminho.
 */
describe('ReportDialog', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const opened = { id: '8e2a4c6e-0a2c-4e6a-8c0e-2a4c6e8a0c99' } as DailyReport;

  let suggest: Mock;
  let open: Mock;
  let list: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<ReportDialog>;

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
      imports: [ReportDialog],
      providers: [
        provideRouter([]),
        { provide: SuggestDailyReportUseCase, useValue: { execute: suggest } },
        { provide: OpenDailyReportUseCase, useValue: { execute: open } },
        { provide: ListDailyReportsUseCase, useValue: { execute: list } },
        { provide: FindDailyReportUseCase, useValue: { execute: vi.fn() } },
        { provide: CorrectDailyReportUseCase, useValue: { execute: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}), parent: { paramMap: convertToParamMap({ sectorId }) } },
          },
        },
      ],
    }).compileComponents();
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(ReportDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    suggest = vi.fn().mockResolvedValue(
      success({ collectionDate: '2026-09-25', collectionTime: '06:42', openingBirdCount: 96, flockAge: 20 }),
    );
    open = vi.fn().mockResolvedValue(success(opened));
    list = vi.fn();
  });

  afterEach(() => element().remove());

  it('comes with the date, the time, the birds and the age suggested for the sector', async () => {
    await render();

    expect(suggest).toHaveBeenCalledWith(sectorId);
    expect(field('collectionDate').value).toBe('2026-09-25');
    expect(field('collectionDate').type).toBe('date');
    expect(field('collectionTime').value).toBe('06:42');
    expect(field('collectionTime').type).toBe('time');
    expect(field('openingBirdCount').value).toBe('96');
    expect(field('flockAge').value).toBe('20');
  });

  it('leaves the age empty when there is no report to suggest it from', async () => {
    suggest.mockResolvedValue(success({ collectionDate: '2026-09-25', collectionTime: '06:42', openingBirdCount: 98 }));

    await render();

    expect(field('openingBirdCount').value).toBe('98');
    expect(field('flockAge').value).toBe('');
  });

  it('opens the report as typed, in the sector of the address', async () => {
    await render();
    type('flockAge', '21');
    type('note', 'Tarde quente.');

    await submit();

    expect(open).toHaveBeenCalledWith(sectorId, {
      collectionDate: '2026-09-25',
      collectionTime: '06:42',
      openingBirdCount: '96',
      flockAge: '21',
      note: 'Tarde quente.',
    });
  });

  it('confirms the opening in a toast, tells the list and goes to the new report', async () => {
    await render();

    await submit();

    expect(toasts()).toEqual(['Relatório de 25/09/2026 aberto.']);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', opened.id]);
  });

  it('shows every refused field at once, each next to its field', async () => {
    open.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'collectionDate', message: 'A data da coleta não pode ser futura.' },
          { code: 'VALIDATION_FAILED', field: 'openingBirdCount', message: 'As aves do início do dia devem ficar entre 1 e 1.000.000.' },
          { code: 'VALIDATION_FAILED', field: 'flockAge', message: 'A idade do lote deve ficar entre 1 e 150 semanas.' },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#collectionDate-error')?.textContent).toContain('não pode ser futura');
    expect(element().querySelector('#openingBirdCount-error')?.textContent).toContain('entre 1 e 1.000.000');
    expect(element().querySelector('#flockAge-error')?.textContent).toContain('entre 1 e 150 semanas');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('offers the way to the report that already exists on the day', async () => {
    open.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'DAILY_REPORT_ALREADY_EXISTS',
            field: 'collectionDate',
            message: 'Já existe o relatório de 24/09/2026 neste setor.',
          },
        ]),
      ),
    );
    const existing: DailyReportPage = {
      sector: { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' },
      content: [{ id: '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55', collectionDate: '2026-09-24' } as DailyReportPage['content'][0]],
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
    };
    list.mockResolvedValue(success(existing));
    await render();
    type('collectionDate', '2026-09-24');

    await submit();

    expect(list).toHaveBeenCalledWith(sectorId, { collectionDate: '2026-09-24', page: 0, size: 1 });
    const way = Array.from(element().querySelectorAll<HTMLAnchorElement>('a')).find(
      (candidate) => candidate.textContent?.trim() === 'Abrir o relatório de 24/09/2026',
    );
    expect(way?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios/6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55`);
  });

  it('goes back to the reports without opening anything when cancelled', async () => {
    await render();

    const cancel = Array.from(element().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!;
    cancel.click();
    await settle();

    expect(open).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios']);
  });
});

/**
 * Correção dos dados gerais (US4; FR-003, FR-018), pela rota `editar` de cada aba: os campos vêm com o
 * relatório, as recusas são as da abertura, e a volta é para a aba de onde saiu.
 */
describe('ReportDialog in the edit mode', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const report = {
    id: reportId,
    sector: { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' },
    collectionDate: '2026-09-24',
    collectionTime: '06:30',
    openingBirdCount: 98,
    flockAge: 20,
    note: 'Bebedouro da bateria B trocado.',
  } as DailyReport;

  let find: Mock;
  let correct: Mock;
  let suggest: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<ReportDialog>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function field(id: string): HTMLInputElement {
    return element().querySelector<HTMLInputElement>('#' + id)!;
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(tab: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReportDialog],
      providers: [
        provideRouter([]),
        { provide: SuggestDailyReportUseCase, useValue: { execute: suggest } },
        { provide: OpenDailyReportUseCase, useValue: { execute: vi.fn() } },
        { provide: ListDailyReportsUseCase, useValue: { execute: vi.fn() } },
        { provide: FindDailyReportUseCase, useValue: { execute: find } },
        { provide: CorrectDailyReportUseCase, useValue: { execute: correct } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              data: { tab },
              parent: {
                paramMap: convertToParamMap({}),
                parent: { paramMap: convertToParamMap({ sectorId, reportId }), parent: null },
              },
            },
          },
        },
      ],
    }).compileComponents();
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(ReportDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
    await settle();
  }

  async function submit(): Promise<void> {
    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
    await settle();
  }

  beforeEach(() => {
    find = vi.fn().mockResolvedValue(success(report));
    correct = vi.fn().mockResolvedValue(success(report));
    suggest = vi.fn();
  });

  afterEach(() => element().remove());

  it('comes with the general data of the report, and asks for no suggestion', async () => {
    await render('producao');

    expect(find).toHaveBeenCalledWith(sectorId, reportId);
    expect(suggest).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Editar relatório');
    expect(field('collectionDate').value).toBe('2026-09-24');
    expect(field('collectionTime').value).toBe('06:30');
    expect(field('openingBirdCount').value).toBe('98');
    expect(field('flockAge').value).toBe('20');
    expect(field('note').value).toBe('Bebedouro da bateria B trocado.');
  });

  it('corrects the report as typed', async () => {
    await render('producao');
    field('flockAge').value = '21';
    field('flockAge').dispatchEvent(new Event('input'));

    await submit();

    expect(correct).toHaveBeenCalledWith(sectorId, reportId, {
      collectionDate: '2026-09-24',
      collectionTime: '06:30',
      openingBirdCount: '98',
      flockAge: '21',
      note: 'Bebedouro da bateria B trocado.',
    });
  });

  it('confirms in a toast, tells the page and goes back to the tab it came from', async () => {
    await render('mortalidade');

    await submit();

    expect(
      TestBed.inject(Toaster)
        .toasts()
        .map((toast) => toast.message),
    ).toEqual(['Relatório de 24/09/2026 corrigido.']);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', reportId, 'mortalidade']);
  });

  it('shows the refusals of the correction next to their fields', async () => {
    correct.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'openingBirdCount',
            message: 'O relatório já tem 2 aves removidas; as aves do início do dia não podem ficar abaixo disso.',
          },
        ]),
      ),
    );
    await render('producao');

    await submit();

    expect(element().querySelector('#openingBirdCount-error')?.textContent).toContain('2 aves removidas');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('says the report was not found for an address of no report', async () => {
    find.mockResolvedValue(failure(Notification.of([{ code: 'DAILY_REPORT_NOT_FOUND', message: 'Relatório não encontrado.' }])));

    await render('producao');

    expect(element().textContent).toContain('Relatório não encontrado.');
    expect(element().querySelector('#collectionDate')).toBeNull();
  });

  it('goes back to the tab without correcting when cancelled', async () => {
    await render('producao');

    Array.from(element().querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Cancelar')!
      .click();
    await settle();

    expect(correct).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', reportId, 'producao']);
  });
});
