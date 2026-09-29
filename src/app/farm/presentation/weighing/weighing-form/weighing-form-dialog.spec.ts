import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { CorrectWeighingUseCase } from '../../../application/weighing/correct-weighing.usecase';
import { FindWeighingUseCase } from '../../../application/weighing/find-weighing.usecase';
import { RecordWeighingUseCase } from '../../../application/weighing/record-weighing.usecase';
import { Weighing } from '../../../domain/weighing';
import { WeighingChanges } from '../weighing-changes';
import { WeighingFormDialog } from './weighing-form-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * O diálogo de registro de pesagem (US1 da 005; FR-003, FR-004, FR-014): a data e o peso vão como foram
 * digitados, todas as falhas voltam de uma vez, cada uma junto do seu campo, e fechar é voltar à tela.
 */
describe('WeighingFormDialog', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  const cageId = '2a4c6e8a-0b1d-4f3a-9c5e-7a9b1d3f5a66';
  const page = ['/setores', sectorId, 'gaiolas', cageId, 'peso'];
  const recorded: Weighing = {
    id: '7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d77',
    weighedOn: '2026-09-24',
    averageWeight: 161.4,
    recordedBy: { id: '5e7a9c1e-3b5d-4f7a-9c1e-3b5d7f9a1c22', name: 'Marina Alves' },
    recordedAt: '2026-09-24T10:12:40Z',
  };

  let record: Mock;
  let find: Mock;
  let correct: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<WeighingFormDialog>;

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
  }

  function button(text: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    )!;
  }

  function toasts(): readonly string[] {
    return TestBed.inject(Toaster)
      .toasts()
      .map((toast) => toast.message);
  }

  /** O dia de hoje no relógio de quem pesa, como o campo de data o escreve. */
  function today(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  async function render(weighingId?: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [WeighingFormDialog],
      providers: [
        provideRouter([]),
        { provide: RecordWeighingUseCase, useValue: { execute: record } },
        { provide: FindWeighingUseCase, useValue: { execute: find } },
        { provide: CorrectWeighingUseCase, useValue: { execute: correct } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap(weighingId ? { weighingId } : {}) },
            parent: { snapshot: { paramMap: convertToParamMap({ sectorId, cageId }) } },
          },
        },
      ],
    }).compileComponents();
    navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true) as Mock<Navigate>;
    fixture = TestBed.createComponent(WeighingFormDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    record = vi.fn().mockResolvedValue(success(recorded));
    find = vi.fn().mockResolvedValue(success({ ...recorded, averageWeight: 116 }));
    correct = vi.fn().mockResolvedValue(success({ ...recorded, averageWeight: 161 }));
  });

  afterEach(() => element()?.remove());

  it('suggests today as the day of the weighing, in a date field', async () => {
    await render();

    expect(field('weighedOn').type).toBe('date');
    expect(field('weighedOn').value).toBe(today());
  });

  it('opens the decimal keyboard for the weight', async () => {
    await render();

    expect(field('averageWeight').getAttribute('inputmode')).toBe('decimal');
  });

  it('records the weighing as typed, says so, tells the page and goes back to it', async () => {
    await render();
    type('weighedOn', '2026-09-24');
    type('averageWeight', '161,4');

    await submit();

    expect(record).toHaveBeenCalledWith(sectorId, cageId, {
      weighedOn: '2026-09-24',
      averageWeight: '161,4',
    });
    expect(toasts()).toContain('Pesagem de 24/09/2026 registrada.');
    expect(TestBed.inject(WeighingChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(page);
  });

  it('shows every refusal at once, each next to its field, and stays open', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'weighedOn',
            message: 'A data da pesagem não pode ser futura.',
          },
          {
            code: 'VALIDATION_FAILED',
            field: 'averageWeight',
            message: 'Informe o peso médio em gramas.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#weighedOn-error')?.textContent).toContain(
      'A data da pesagem não pode ser futura.',
    );
    expect(element().querySelector('#averageWeight-error')?.textContent).toContain(
      'Informe o peso médio em gramas.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the day already weighed next to the day field', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'WEIGHING_DATE_IN_USE',
            field: 'weighedOn',
            message: 'A gaiola já tem pesagem em 24/09/2026. Corrija a pesagem desse dia.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#weighedOn-error')?.textContent).toContain(
      'Corrija a pesagem desse dia.',
    );
  });

  it('goes back to the page when cancelled, without recording', async () => {
    await render();

    button('Cancelar').click();

    expect(record).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(page);
  });

  // ---------------------------------------------------------------- correção (US4)

  it('opens the correction with the weighing of the address', async () => {
    await render(recorded.id);

    expect(find).toHaveBeenCalledWith(sectorId, cageId, recorded.id);
    expect(element().querySelector('h2')?.textContent).toContain('Corrigir pesagem');
    expect(field('weighedOn').value).toBe('2026-09-24');
    expect(field('averageWeight').value).toBe('116');
  });

  it('saves the correction, says so, tells the page and goes back to it', async () => {
    await render(recorded.id);
    type('averageWeight', '161');

    await submit();

    expect(correct).toHaveBeenCalledWith(sectorId, cageId, recorded.id, {
      weighedOn: '2026-09-24',
      averageWeight: '161',
    });
    expect(record).not.toHaveBeenCalled();
    expect(toasts()).toContain('Pesagem de 24/09/2026 corrigida.');
    expect(navigate).toHaveBeenCalledWith(page);
  });

  it('writes the weight with the comma when opening the correction', async () => {
    find.mockResolvedValue(success({ ...recorded, averageWeight: 161.4 }));

    await render(recorded.id);

    expect(field('averageWeight').value).toBe('161,4');
  });

  it('says the weighing was not found, without the fields', async () => {
    find.mockResolvedValue(
      failure(
        Notification.of([{ code: 'WEIGHING_NOT_FOUND', message: 'Pesagem não encontrada.' }]),
      ),
    );

    await render(recorded.id);

    expect(element().textContent).toContain('Pesagem não encontrada.');
    expect(element().querySelector('#averageWeight')).toBeNull();
  });

  it('does not call the backend for an address that is not an identifier', async () => {
    await render('../me');

    expect(find).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Pesagem não encontrada.');
    expect(element().querySelector('#averageWeight')).toBeNull();
  });

  it('says the weighing could not be loaded when the lookup fails, without the fields', async () => {
    find.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'UNEXPECTED', message: 'Não foi possível falar com o servidor.' },
        ]),
      ),
    );

    await render(recorded.id);

    expect(element().textContent).toContain('Não foi possível carregar a pesagem:');
    expect(element().textContent).toContain('Não foi possível falar com o servidor.');
    expect(element().querySelector('#averageWeight')).toBeNull();
  });

  it('tells the page when the cage turned out inactive, for it to show the notice', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'CAGE_INACTIVE',
            message: 'A gaiola está inativa; as pesagens dela são só para consulta.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(TestBed.inject(WeighingChanges).version()).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not make the page look again for a refusal of a field', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'averageWeight',
            message: 'Informe o peso médio em gramas.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(TestBed.inject(WeighingChanges).version()).toBe(0);
  });
});
