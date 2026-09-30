import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ExportDailyReportsUseCase } from '../../../application/daily-report/export-daily-reports.usecase';
import { ExportDialog } from './export-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * A exportação dos relatórios de um intervalo (US1 da 007; FR-011 a FR-013): o diálogo sugere o mês até hoje,
 * pede a planilha, mostra que está gerando, e a recusa do backend aparece em cada data.
 */
describe('ExportDialog', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const fileName = 'relatorios-codornas-galpao-4-01-09-2026-a-28-09-2026.xlsx';

  let exportReports: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<ExportDialog>;

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

  function submitButton(): HTMLButtonElement {
    return element().querySelector<HTMLButtonElement>('button[type="submit"]')!;
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
      imports: [ExportDialog],
      providers: [
        provideRouter([]),
        { provide: ExportDailyReportsUseCase, useValue: { execute: exportReports } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              parent: { paramMap: convertToParamMap({ sectorId }) },
            },
          },
        },
      ],
    }).compileComponents();
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(ExportDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 28, 21, 40));
    exportReports = vi.fn().mockResolvedValue(success(fileName));
  });

  afterEach(() => {
    element().remove();
    vi.useRealTimers();
  });

  it('asks for the interval, suggesting the month until today', async () => {
    await render();

    expect(element().textContent).toContain('Exportar relatórios');
    expect(field('exportFrom').type).toBe('date');
    expect(field('exportFrom').value).toBe('2026-09-01');
    expect(field('exportTo').type).toBe('date');
    expect(field('exportTo').value).toBe('2026-09-28');
  });

  it('exports the interval typed, says the spreadsheet was generated and goes back to the list', async () => {
    await render();
    type('exportFrom', '2026-08-01');
    type('exportTo', '2026-08-31');

    await submit();

    expect(exportReports).toHaveBeenCalledWith(sectorId, '2026-08-01', '2026-08-31');
    expect(toasts()).toContain(`Planilha gerada (${fileName}).`);
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios']);
  });

  it('says it is generating and takes no second request until it finishes', async () => {
    let finish: (value: unknown) => void = () => undefined;
    exportReports.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render();

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(submitButton().textContent).toContain('Gerando…');
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().getAttribute('aria-busy')).toBe('true');
    expect(exportReports).toHaveBeenCalledTimes(1);
    finish(success(fileName));
    await settle();
    await settle();
    expect(submitButton()?.textContent ?? '').not.toContain('Gerando…');
  });

  it('shows the refusal of each date on its field, and stays open', async () => {
    exportReports.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'from', message: 'Informe a data inicial.' },
          {
            code: 'VALIDATION_FAILED',
            field: 'to',
            message: 'O intervalo deve ter no máximo 366 dias.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#exportFrom-error')?.textContent).toContain(
      'Informe a data inicial.',
    );
    expect(element().querySelector('#exportTo-error')?.textContent).toContain(
      'O intervalo deve ter no máximo 366 dias.',
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(toasts()).toEqual([]);
  });

  it('says the spreadsheet could not be generated, and lets it be tried again', async () => {
    exportReports.mockResolvedValueOnce(
      failure(
        Notification.of([
          {
            code: 'REQUEST_FAILED',
            message: 'Não houve resposta do servidor. Tente novamente em instantes.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().textContent).toContain('Não foi possível gerar a planilha:');
    expect(element().textContent).toContain('Não houve resposta do servidor.');
    expect(submitButton().disabled).toBe(false);

    await submit();

    expect(exportReports).toHaveBeenCalledTimes(2);
    expect(toasts()).toContain(`Planilha gerada (${fileName}).`);
  });

  it('goes back to the list when closed', async () => {
    await render();

    Array.from(element().querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Cancelar')!
      .click();
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios']);
  });

  it('announces to the screen reader that the spreadsheet is being generated (QA 1 of the 007)', async () => {
    let finish: (value: unknown) => void = () => undefined;
    exportReports.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render();
    const status = element().querySelector('[data-export-status]');
    expect(status?.getAttribute('role')).toBe('status');

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(status?.textContent?.trim()).toBe('Gerando a planilha…');
    finish(success(fileName));
    await settle();
  });
});
