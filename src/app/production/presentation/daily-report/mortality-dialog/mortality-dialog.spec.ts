import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindReportCageUseCase } from '../../../application/daily-report/find-report-cage.usecase';
import { RecordMortalityUseCase } from '../../../application/daily-report/record-mortality.usecase';
import { DailyReport, ReportCage } from '../../../domain/daily-report';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';
import { MortalityDialog } from './mortality-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Lançamento da mortalidade de uma gaiola (US3; FR-011, FR-012, FR-018): mortes, descartes e observação,
 * com o que já foi lançado; todas as recusas de uma vez.
 */
describe('MortalityDialog', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const cageId = '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44';
  const b07: ReportCage = { cageId, code: 'B-07', battery: 'B', number: 7, birdCount: 50 };
  const recorded: ReportCage = { ...b07, mortality: { deaths: 2, culls: 1, note: 'Prostração.' } };

  let find: Mock;
  let record: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<MortalityDialog>;

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

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MortalityDialog],
      providers: [
        provideRouter([]),
        ReportView,
        { provide: FindReportCageUseCase, useValue: { execute: find } },
        { provide: RecordMortalityUseCase, useValue: { execute: record } },
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

    fixture = TestBed.createComponent(MortalityDialog);
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
    expect(element().textContent).toContain('Mortalidade · B-07');
    expect(element().textContent).toContain('50 aves · relatório de 24/09/2026');
  });

  it('asks for the deaths and the culls as text with the numeric keyboard, and the note in several lines', async () => {
    await render();

    expect(field('deaths').type).toBe('text');
    expect(field('deaths').getAttribute('inputmode')).toBe('numeric');
    expect(field('culls').getAttribute('inputmode')).toBe('numeric');
    expect(field('note').tagName).toBe('TEXTAREA');
  });

  it('comes with the mortality recorded before', async () => {
    await render();

    expect(field('deaths').value).toBe('2');
    expect(field('culls').value).toBe('1');
    expect(field('note').value).toBe('Prostração.');
  });

  it('records the mortality as typed, in the cage of the address', async () => {
    find.mockResolvedValue(success(b07));
    await render();
    type('deaths', '1');

    await submit();

    expect(record).toHaveBeenCalledWith(sectorId, reportId, cageId, { deaths: '1', culls: '', note: '' });
  });

  it('confirms in a toast, tells the report and goes back to the mortality tab', async () => {
    await render();

    await submit();

    expect(TestBed.inject(Toaster).toasts().map((toast) => toast.message)).toEqual(['Mortalidade da gaiola B-07 salva.']);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', reportId, 'mortalidade']);
  });

  it('shows every refused field at once', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'deaths', message: 'A gaiola tem 50 aves; mortes e descartes somam 55.' },
          { code: 'VALIDATION_FAILED', field: 'note', message: 'A observação deve ter no máximo 500 caracteres.' },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#deaths-error')?.textContent).toContain('somam 55');
    expect(element().querySelector('#note-error')?.textContent).toContain('500 caracteres');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('says the cage was not found for a cage out of the report', async () => {
    find.mockResolvedValue(failure(Notification.of([{ code: 'CAGE_NOT_FOUND', message: 'Gaiola não encontrada neste relatório.' }])));

    await render();

    expect(element().textContent).toContain('Gaiola não encontrada neste relatório.');
    expect(element().querySelector('#deaths')).toBeNull();
  });

  it('says the sector was not found, and not the cage, when the sector is gone', async () => {
    find.mockResolvedValue(failure(Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }])));

    await render();

    expect(element().textContent).toContain('Setor não encontrado.');
    expect(element().textContent).not.toContain('Gaiola não encontrada');
  });

  it('goes back to the mortality tab without recording when cancelled', async () => {
    await render();

    Array.from(element().querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Cancelar')!
      .click();
    await settle();

    expect(record).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'relatorios', reportId, 'mortalidade']);
  });
});
