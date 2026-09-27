import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { DeactivateFeedFormulaUseCase } from '../../../application/formula/deactivate-feed-formula.usecase';
import { ListFeedFormulasUseCase } from '../../../application/formula/list-feed-formulas.usecase';
import { ReactivateFeedFormulaUseCase } from '../../../application/formula/reactivate-feed-formula.usecase';
import { FeedFormula } from '../../../domain/feed-formula';
import { FormulaChanges } from '../formula-changes';
import { FormulaListPage } from './formula-list-page';

/**
 * Lista de fórmulas de ração (US1 da 004; FR-001 a FR-006; R-013): cada fórmula com o preço, o consumo
 * esperado, o custo por ave ao dia e a situação; o filtro de situação; e as ações só para o
 * administrador.
 */
describe('FormulaListPage', () => {
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
  const recria: FeedFormula = {
    id: '8a0c2e4a-6c8e-4a0c-8e2a-4c6e8a0c2e22',
    name: 'Recria',
    pricePerKg: 3.1,
    expectedIntake: 24,
    costPerBirdDay: 0.074,
    status: 'INACTIVE',
    createdAt: '2026-09-20T10:16:40Z',
    updatedAt: '2026-09-20T10:16:40Z',
  };

  let list: Mock;
  let deactivate: Mock;
  let reactivate: Mock;
  let fixture: ComponentFixture<FormulaListPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(text: string, within: ParentNode = element()): HTMLButtonElement {
    return Array.from(within.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    )!;
  }

  function row(name: string): HTMLElement {
    return Array.from(element().querySelectorAll<HTMLElement>('tbody tr')).find(
      (candidate) => candidate.querySelector('b')?.textContent?.trim() === name,
    )!;
  }

  function cell(name: string, label: string): string {
    return (
      row(name)
        .querySelector(`td[data-label="${label}"]`)
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? ''
    );
  }

  function named(label: string): HTMLElement | null {
    return element().querySelector<HTMLElement>(`[aria-label="${label}"]`);
  }

  function confirmation(): HTMLElement | null {
    return element().querySelector<HTMLElement>('[role="alertdialog"]');
  }

  function toasts(): readonly string[] {
    return TestBed.inject(Toaster)
      .toasts()
      .map((toast) => toast.message);
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(administrator = true): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FormulaListPage],
      providers: [
        provideRouter([]),
        { provide: ListFeedFormulasUseCase, useValue: { execute: list } },
        { provide: DeactivateFeedFormulaUseCase, useValue: { execute: deactivate } },
        { provide: ReactivateFeedFormulaUseCase, useValue: { execute: reactivate } },
        { provide: VIEWER, useValue: { isAdministrator: signal(administrator) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FormulaListPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    list = vi.fn().mockResolvedValue(success([posturaPlus, recria]));
    deactivate = vi.fn().mockResolvedValue(success({ ...posturaPlus, status: 'INACTIVE' }));
    reactivate = vi.fn().mockResolvedValue(success({ ...recria, status: 'ACTIVE' }));
  });

  afterEach(() => element()?.remove());

  it('asks for the active formulas first', async () => {
    await render();

    expect(list).toHaveBeenCalledWith('ACTIVE');
    expect(button('Ativas').getAttribute('aria-pressed')).toBe('true');
  });

  it('shows each formula with its description, price per kilo, expected intake, cost per bird a day and status', async () => {
    await render();

    expect(row('Postura Plus').textContent).toContain(
      'Milho, farelo de soja, calcário e premix vitamínico; para codornas em postura',
    );
    expect(cell('Postura Plus', 'Preço')).toBe('R$ 2,85/kg');
    expect(cell('Postura Plus', 'Consumo esperado')).toBe('28 g');
    expect(cell('Postura Plus', 'Custo por ave/dia')).toBe('R$ 0,080');
    expect(cell('Postura Plus', 'Situação')).toContain('Ativa');
    expect(cell('Recria', 'Preço')).toBe('R$ 3,10/kg');
    expect(cell('Recria', 'Custo por ave/dia')).toBe('R$ 0,074');
    expect(cell('Recria', 'Situação')).toContain('Inativa');
  });

  it('does not show what the backend does not offer: where the formula is used, and its deletion', async () => {
    await render();

    expect(element().textContent).not.toContain('Usada em');
    expect(element().querySelector('[aria-label^="Excluir"]')).toBeNull();
  });

  it('asks again with the status chosen in the filter', async () => {
    await render();

    button('Todas').click();
    await settle();

    expect(list).toHaveBeenLastCalledWith('ALL');
    expect(button('Todas').getAttribute('aria-pressed')).toBe('true');
  });

  it('opens the registration from the header, for an administrator', async () => {
    await render();

    const link = Array.from(element().querySelectorAll<HTMLAnchorElement>('.page-head a')).find(
      (candidate) => candidate.textContent?.trim() === 'Nova fórmula',
    );
    expect(link?.getAttribute('href')).toBe('/formulas/nova');
  });

  it('opens the edition of a formula from its row, named by it', async () => {
    await render();

    const edit = named('Editar fórmula Postura Plus') as HTMLAnchorElement;
    expect(edit.getAttribute('href')).toBe(`/formulas/${posturaPlus.id}`);
  });

  it('shows a common user the formulas, and no action that changes them', async () => {
    await render(false);

    expect(row('Postura Plus')).toBeTruthy();
    expect(element().textContent).not.toContain('Nova fórmula');
    expect(named('Editar fórmula Postura Plus')).toBeNull();
    expect(named('Inativar fórmula Postura Plus')).toBeNull();
    expect(named('Reativar fórmula Recria')).toBeNull();
  });

  it('asks to confirm the deactivation, with the consequence written, in a button named by the action', async () => {
    await render();

    named('Inativar fórmula Postura Plus')!.click();
    await settle();

    const dialog = confirmation()!;
    expect(dialog.textContent).toContain('Inativar fórmula Postura Plus?');
    expect(dialog.textContent).toContain(
      'A fórmula deixa de ser oferecida nos lançamentos novos; os lançamentos que já a usam continuam com o preço deles.',
    );
    expect(button('Inativar fórmula', dialog)).toBeTruthy();
    expect(deactivate).not.toHaveBeenCalled();
  });

  it('deactivates when confirmed, confirms it in a toast and asks again', async () => {
    await render();
    named('Inativar fórmula Postura Plus')!.click();
    await settle();
    list.mockClear();

    button('Inativar fórmula', confirmation()!).click();
    await settle();

    expect(deactivate).toHaveBeenCalledWith(posturaPlus.id);
    expect(toasts()).toEqual(['Fórmula inativada: Postura Plus.']);
    expect(list).toHaveBeenCalledWith('ACTIVE');
    expect(confirmation()).toBeNull();
  });

  it('keeps the formula when the deactivation is cancelled', async () => {
    await render();
    named('Inativar fórmula Postura Plus')!.click();
    await settle();

    button('Cancelar', confirmation()!).click();
    await settle();

    expect(deactivate).not.toHaveBeenCalled();
    expect(confirmation()).toBeNull();
  });

  it('reactivates an inactive formula without asking, and confirms it in a toast', async () => {
    await render();

    named('Reativar fórmula Recria')!.click();
    await settle();

    expect(reactivate).toHaveBeenCalledWith(recria.id);
    expect(toasts()).toEqual(['Fórmula reativada: Recria.']);
  });

  it('shows the refusal of a deactivation', async () => {
    deactivate.mockResolvedValue(
      failure(
        Notification.of([{ code: 'FEED_FORMULA_NOT_FOUND', message: 'Fórmula não encontrada.' }]),
      ),
    );
    await render();
    named('Inativar fórmula Postura Plus')!.click();
    await settle();

    button('Inativar fórmula', confirmation()!).click();
    await settle();

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'Fórmula não encontrada.',
    );
  });

  it('invites an administrator to register the first formula when there is none', async () => {
    list.mockResolvedValue(success([]));
    await render();

    const empty = element().querySelector('ovyx-empty-state');
    expect(empty?.textContent).toContain('Nenhuma fórmula ativa');
    expect(empty?.querySelector('a')?.getAttribute('href')).toBe('/formulas/nova');
  });

  it('tells a common user where the formulas will appear, without inviting to register', async () => {
    list.mockResolvedValue(success([]));
    await render(false);

    const empty = element().querySelector('ovyx-empty-state');
    expect(empty?.textContent).toContain(
      'As fórmulas que o administrador cadastrar aparecem aqui.',
    );
    expect(empty?.querySelector('a')).toBeNull();
  });

  it('shows the refusal when the list cannot be loaded', async () => {
    list.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.' },
        ]),
      ),
    );
    await render();

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'Não foi possível concluir a operação.',
    );
  });

  it('asks again when a formula is registered or updated in the dialog', async () => {
    await render();
    list.mockClear();

    TestBed.inject(FormulaChanges).notify();
    await settle();

    expect(list).toHaveBeenCalledWith('ACTIVE');
  });

  it('announces how many formulas were found, and that none was found', async () => {
    await render();

    expect(element().querySelector('[data-announcement]')?.textContent).toContain(
      '2 fórmulas encontradas.',
    );

    list.mockResolvedValue(success([]));
    Array.from(element().querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.trim() === 'Inativas')!
      .click();
    await settle();

    expect(element().querySelector('[data-announcement]')?.textContent).toContain(
      'Nenhuma fórmula inativa.',
    );
  });

  it('takes the focus to the edition of the same formula after reactivating it', async () => {
    await render();
    list.mockResolvedValue(success([posturaPlus, { ...recria, status: 'ACTIVE' }]));

    named('Reativar fórmula Recria')!.click();
    await settle();
    await settle();

    expect(document.activeElement).toBe(named('Editar fórmula Recria'));
  });

  it('takes the focus to the table when the deactivated formula leaves it', async () => {
    await render();
    named('Inativar fórmula Postura Plus')!.click();
    await settle();
    list.mockResolvedValue(success([recria]));

    button('Inativar fórmula', confirmation()!).dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(document.activeElement).toBe(element().querySelector('.tbl-wrap'));
  });

  it('takes the focus to the empty state when the last formula of the list is deactivated', async () => {
    list.mockResolvedValue(success([posturaPlus]));
    await render();
    named('Inativar fórmula Postura Plus')!.click();
    await settle();
    list.mockResolvedValue(success([]));

    button('Inativar fórmula', confirmation()!).dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(document.activeElement).toBe(element().querySelector('[data-empty]'));
  });
});
