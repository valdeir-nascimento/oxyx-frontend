import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindFeedFormulaUseCase } from '../../../application/formula/find-feed-formula.usecase';
import { RegisterFeedFormulaUseCase } from '../../../application/formula/register-feed-formula.usecase';
import { UpdateFeedFormulaUseCase } from '../../../application/formula/update-feed-formula.usecase';
import { FeedFormula } from '../../../domain/feed-formula';
import { FormulaChanges } from '../formula-changes';
import { FormulaFormDialog } from './formula-form-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Diálogo de cadastro e de edição de fórmula (US1 da 004; FR-001, FR-003, FR-020): o preço e o consumo
 * vão como foram digitados, todas as falhas voltam de uma vez, cada uma junto do seu campo, e fechar é
 * voltar à lista.
 */
describe('FormulaFormDialog', () => {
  const posturaPlus: FeedFormula = {
    id: '4e6a8c0e-2a4c-4e6a-9c0e-2a4c6e8a0c11',
    name: 'Postura Plus',
    description: 'Milho, farelo de soja, calcário e premix vitamínico; para codornas em postura',
    pricePerKg: 2.85,
    expectedIntake: 28,
    costPerBirdDay: 0.08,
    status: 'ACTIVE',
    createdAt: '2026-09-20T10:15:00Z',
    updatedAt: '2026-09-24T17:40:12Z',
  };

  let register: Mock;
  let update: Mock;
  let find: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<FormulaFormDialog>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function field(id: string): HTMLInputElement | HTMLTextAreaElement {
    return element().querySelector<HTMLInputElement | HTMLTextAreaElement>('#' + id)!;
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

  async function render(formulaId?: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FormulaFormDialog],
      providers: [
        provideRouter([]),
        { provide: RegisterFeedFormulaUseCase, useValue: { execute: register } },
        { provide: UpdateFeedFormulaUseCase, useValue: { execute: update } },
        { provide: FindFeedFormulaUseCase, useValue: { execute: find } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap(formulaId ? { formulaId } : {}) },
          },
        },
      ],
    }).compileComponents();
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(FormulaFormDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    register = vi.fn().mockResolvedValue(success(posturaPlus));
    update = vi.fn().mockResolvedValue(success(posturaPlus));
    find = vi.fn().mockResolvedValue(success(posturaPlus));
  });

  afterEach(() => element().remove());

  it('is a modal dialog named by what it does', async () => {
    await render();

    const dialog = element().querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(element().querySelector(`#${dialog.getAttribute('aria-labelledby')}`)?.textContent).toBe(
      'Nova fórmula',
    );
  });

  it('registers the fields as typed, the price with a comma and the description in a text area', async () => {
    await render();
    type('name', 'Postura Plus');
    type('pricePerKg', '2,85');
    type('expectedIntake', '28');
    type('description', 'Milho, farelo de soja e calcário');

    await submit();

    expect(field('description').tagName).toBe('TEXTAREA');
    expect(register).toHaveBeenCalledWith({
      name: 'Postura Plus',
      pricePerKg: '2,85',
      expectedIntake: '28',
      description: 'Milho, farelo de soja e calcário',
    });
  });

  it('opens the decimal keyboard for the price and the numeric one for the expected intake', async () => {
    await render();

    expect(field('pricePerKg').getAttribute('inputmode')).toBe('decimal');
    expect(field('expectedIntake').getAttribute('inputmode')).toBe('numeric');
  });

  it('confirms the registration in a toast, tells the list, and goes back to it', async () => {
    await render();

    await submit();

    expect(toasts()).toEqual(['Fórmula cadastrada: Postura Plus.']);
    expect(TestBed.inject(FormulaChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/formulas']);
  });

  it('shows every refused field at once, each next to its field, and stays open', async () => {
    register.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'name',
            message: 'Informe o nome da fórmula.',
          },
          {
            code: 'VALIDATION_FAILED',
            field: 'pricePerKg',
            message: 'O preço deve ficar entre R$ 0,01 e R$ 1.000,00 o quilo.',
          },
          {
            code: 'VALIDATION_FAILED',
            field: 'expectedIntake',
            message: 'O consumo esperado deve ficar entre 1 e 200 gramas por ave ao dia.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#name-error')?.textContent).toContain(
      'Informe o nome da fórmula.',
    );
    expect(element().querySelector('#pricePerKg-error')?.textContent).toContain(
      'O preço deve ficar entre R$ 0,01 e R$ 1.000,00 o quilo.',
    );
    expect(element().querySelector('#expectedIntake-error')?.textContent).toContain(
      'O consumo esperado deve ficar entre 1 e 200 gramas por ave ao dia.',
    );
    expect(element().querySelector('ovyx-error-summary')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the name in use next to the name, with the hint to reactivate', async () => {
    register.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'FEED_FORMULA_NAME_IN_USE',
            field: 'name',
            message: 'Já existe uma fórmula com este nome. Se ela está inativa, reative-a.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#name-error')?.textContent).toContain(
      'Já existe uma fórmula com este nome. Se ela está inativa, reative-a.',
    );
  });

  it('opens the edition with the data of the formula, the price written with a comma', async () => {
    await render(posturaPlus.id);

    expect(find).toHaveBeenCalledWith(posturaPlus.id);
    expect(field('name').value).toBe('Postura Plus');
    expect(field('pricePerKg').value).toBe('2,85');
    expect(field('expectedIntake').value).toBe('28');
    expect(field('description').value).toBe(
      'Milho, farelo de soja, calcário e premix vitamínico; para codornas em postura',
    );
    expect(element().querySelector('h2')?.textContent).toContain('Editar fórmula');
  });

  it('keeps the two decimal places of a round price in the edition', async () => {
    find.mockResolvedValue(success({ ...posturaPlus, pricePerKg: 3.1 }));
    await render(posturaPlus.id);

    expect(field('pricePerKg').value).toBe('3,10');
  });

  it('saves the edition, confirms it in a toast and goes back to the list', async () => {
    await render(posturaPlus.id);
    type('pricePerKg', '2,90');

    await submit();

    expect(update).toHaveBeenCalledWith(posturaPlus.id, {
      name: 'Postura Plus',
      pricePerKg: '2,90',
      expectedIntake: '28',
      description: 'Milho, farelo de soja, calcário e premix vitamínico; para codornas em postura',
    });
    expect(toasts()).toEqual(['Alterações salvas: Postura Plus.']);
    expect(navigate).toHaveBeenCalledWith(['/formulas']);
  });

  it('says the formula was not found, without the fields, for an address of no formula', async () => {
    find.mockResolvedValue(
      failure(
        Notification.of([{ code: 'FEED_FORMULA_NOT_FOUND', message: 'Fórmula não encontrada.' }]),
      ),
    );
    await render('8a0c2e4a-6c8e-4a0c-8e2a-4c6e8a0c2e99');

    expect(element().textContent).toContain('Fórmula não encontrada.');
    expect(element().querySelector('#name')).toBeNull();
  });

  it('does not call the backend for an address that is not an identifier', async () => {
    await render('..%2F..%2Fme');

    expect(find).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Fórmula não encontrada.');
  });

  it('goes back to the list without saving when cancelled', async () => {
    await render();

    button('Cancelar').click();
    await settle();

    expect(register).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/formulas']);
  });
});
