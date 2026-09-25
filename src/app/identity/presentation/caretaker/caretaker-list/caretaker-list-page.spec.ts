import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { failure, success } from '../../../../shared/application/result';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { DeactivateCaretakerUseCase } from '../../../application/caretaker/deactivate-caretaker.usecase';
import { SearchCaretakersUseCase } from '../../../application/caretaker/search-caretakers.usecase';
import { CaretakerPage, CaretakerSummary } from '../../../domain/caretaker';
import { CaretakerChanges } from '../caretaker-changes';
import { CaretakerListPage } from './caretaker-list-page';

/**
 * Lista de responsáveis (T090, T092): pesquisa por nome e situação, páginas, e inativação com
 * confirmação em diálogo modal.
 */
describe('CaretakerListPage', () => {
  const maria: CaretakerSummary = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    email: 'maria.silva@ovyx.com.br',
    mobilePhone: '91988887777',
    role: 'ADMINISTRATOR',
    status: 'ACTIVE',
  };
  const joao: CaretakerSummary = {
    id: '9f8e7d6c-5b4a-4938-2716-0f1e2d3c4b5a',
    fullName: 'João Pereira de Souza',
    email: 'joao.pereira@ovyx.com.br',
    mobilePhone: '91991234567',
    role: 'USER',
    status: 'INACTIVE',
  };

  function pageOf(content: readonly CaretakerSummary[], page = 0, totalPages = 1): CaretakerPage {
    return { content, page, size: 20, totalElements: content.length, totalPages };
  }

  let search: Mock;
  let deactivate: Mock;
  let fixture: ComponentFixture<CaretakerListPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  /** O controle pelo nome que o leitor de tela anuncia — as ações de linha só têm ícone. */
  function named<T extends HTMLElement = HTMLButtonElement>(label: string): T {
    return element().querySelector<T>(`[aria-label="${label}"]`)!;
  }

  function button(text: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    )!;
  }

  function tableStatus(): string | undefined {
    return element().querySelector('ovyx-data-table [role="status"]')?.textContent?.trim();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function confirmButton(): HTMLButtonElement {
    return Array.from(element().querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')).find(
      (candidate) => candidate.textContent?.trim() === 'Inativar',
    )!;
  }

  async function askToDeactivate(): Promise<void> {
    const trigger = named('Inativar Maria Silva');
    trigger.focus();
    trigger.click();
    await settle();
  }

  async function confirmDeactivation(): Promise<void> {
    await askToDeactivate();
    confirmButton().dispatchEvent(new Event('click'));
    await settle();
  }

  function typeName(value: string): void {
    const name = element().querySelector<HTMLInputElement>('#name')!;
    name.value = value;
    name.dispatchEvent(new Event('input'));
  }

  const lastAdministrator = failure(
    Notification.of([
      {
        code: 'LAST_ADMINISTRATOR',
        field: 'status',
        message: 'O sistema precisa de ao menos um administrador ativo.',
      },
    ]),
  );

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CaretakerListPage],
      providers: [
        provideRouter([]),
        { provide: SearchCaretakersUseCase, useValue: { execute: search } },
        { provide: DeactivateCaretakerUseCase, useValue: { execute: deactivate } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CaretakerListPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    search = vi.fn().mockResolvedValue(success(pageOf([maria, joao])));
    deactivate = vi.fn().mockResolvedValue(success({ ...maria, status: 'INACTIVE' }));
  });

  afterEach(() => element().remove());

  it('shows the first page, with role and status in Portuguese', async () => {
    await render();

    const rows = Array.from(element().querySelectorAll('tbody tr'));
    expect(search).toHaveBeenCalledWith({ name: '', status: undefined, page: 0, size: 20 });
    expect(rows[0].textContent).toContain('Maria Silva');
    expect(rows[0].textContent).toContain('maria.silva@ovyx.com.br');
    expect(rows[0].textContent).toContain('Administrador');
    expect(rows[0].textContent).toContain('Ativo');
    expect(rows[1].textContent).toContain('Inativo');
  });

  it('labels every cell, so each row still reads as a card on a phone', async () => {
    // Abaixo de 640 px a linha vira cartão, e o rótulo de cada valor vem do data-label.
    await render();

    const cells = Array.from(element().querySelectorAll('tbody tr:first-child td[data-label]'));
    expect(cells.map((cell) => cell.getAttribute('data-label'))).toEqual(['Nome', 'Celular', 'Perfil', 'Situação']);
  });

  it('searches by the name typed, from the first page', async () => {
    await render();
    typeName('pereira');

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(search).toHaveBeenLastCalledWith({ name: 'pereira', status: undefined, page: 0, size: 20 });
  });

  it('filters by the status chosen at once, with the name in the field', async () => {
    await render();
    typeName('pereira');

    button('Inativos').click();
    await settle();

    expect(search).toHaveBeenLastCalledWith({ name: 'pereira', status: 'INACTIVE', page: 0, size: 20 });
    expect(button('Inativos').getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the status chosen when the name is searched again', async () => {
    await render();
    button('Ativos').click();
    await settle();

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(search).toHaveBeenLastCalledWith({ name: '', status: 'ACTIVE', page: 0, size: 20 });
  });

  it('moves to the next page, and cannot go back from the first one', async () => {
    search.mockResolvedValue(success(pageOf([maria], 0, 2)));
    await render();

    expect(named('Página anterior').disabled).toBe(true);
    named('Próxima página').click();
    await settle();

    expect(search).toHaveBeenLastCalledWith({ name: '', status: undefined, page: 1, size: 20 });
  });

  it('cannot go forward from the last page', async () => {
    search.mockResolvedValue(success(pageOf([maria], 1, 2)));

    await render();

    expect(named('Próxima página').disabled).toBe(true);
  });

  it('shows no pages when the search found no one, only the empty state', async () => {
    search.mockResolvedValue(success(pageOf([])));

    await render();

    expect(element().querySelector('ovyx-pager')).toBeNull();
    expect(element().querySelector('.empty')?.textContent).toContain('Nenhum responsável encontrado');
  });

  it('opens the registration and the edition by address, over the list', async () => {
    await render();

    expect(element().querySelector('.page-head a')?.getAttribute('href')).toBe('/responsaveis/novo');
    expect(named<HTMLAnchorElement>('Editar Maria Silva').getAttribute('href')).toBe(`/responsaveis/${maria.id}`);
  });

  it('offers deactivation only to active caretakers, naming who in the button', async () => {
    await render();

    const buttons = Array.from(element().querySelectorAll('tbody button'));
    expect(buttons.map((candidate) => candidate.getAttribute('aria-label'))).toEqual(['Inativar Maria Silva']);
  });

  it('asks before deactivating, in a modal dialog, and cancelling changes nothing (FR-018)', async () => {
    await render();

    await askToDeactivate();
    const dialog = element().querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Inativar Maria Silva?');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    button('Cancelar').click();
    await settle();

    expect(element().querySelector('[role="alertdialog"]')).toBeNull();
    expect(deactivate).not.toHaveBeenCalled();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Inativar Maria Silva');
  });

  it('deactivates once confirmed, says so in a toast, and reloads the page', async () => {
    await render();

    await confirmDeactivation();

    expect(deactivate).toHaveBeenCalledWith(maria.id);
    expect(TestBed.inject(Toaster).toasts().map((toast) => toast.message)).toEqual([
      'Responsável inativado: Maria Silva.',
    ]);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('takes the focus to the edit action of the same row once the caretaker is deactivated', async () => {
    // O botão de onde a pessoa veio some com a inativação.
    await render();

    await confirmDeactivation();

    expect(document.activeElement).toBe(named('Editar Maria Silva'));
  });

  it('takes the focus to the table when the deactivated caretaker leaves the list', async () => {
    // Com o filtro de ativos, a linha some junto com o botão.
    await render();
    search.mockResolvedValue(success(pageOf([joao])));

    await confirmDeactivation();

    expect(document.activeElement).toBe(element().querySelector('.tbl-wrap'));
  });

  it('shows why the deactivation was refused, as the backend said it', async () => {
    deactivate.mockResolvedValue(lastAdministrator);
    await render();

    await confirmDeactivation();

    expect(element().querySelector('.error-summary')?.textContent).toContain(
      'O sistema precisa de ao menos um administrador ativo.',
    );
    expect(element().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('does not turn the refused status into a link to the status filter', async () => {
    // A recusa do último administrador vem no campo "status" — o mesmo nome do filtro "Situação" da
    // lista. O link levaria a pessoa ao filtro, que nada tem a ver com a recusa.
    deactivate.mockResolvedValue(lastAdministrator);
    await render();

    await confirmDeactivation();

    expect(element().querySelector('.error-summary a')).toBeNull();
  });

  it('frees the confirmation once a deactivation ends, so the next one can be confirmed', async () => {
    // Sem soltar o estado ocupado, a confirmação seguinte já nascia desabilitada.
    await render();
    await confirmDeactivation();

    await askToDeactivate();

    expect(confirmButton().disabled).toBe(false);
  });

  it('keeps the confirmation busy while the deactivation runs, so it is not sent twice', async () => {
    deactivate.mockReturnValue(new Promise(() => undefined));
    await render();
    await askToDeactivate();

    confirmButton().dispatchEvent(new Event('click'));
    await settle();

    expect(confirmButton().disabled).toBe(true);
    expect(deactivate).toHaveBeenCalledOnce();
  });

  it('reloads the page it was on after deactivating, not the first one', async () => {
    search.mockResolvedValue(success(pageOf([maria], 1, 3)));
    await render();

    await confirmDeactivation();

    expect(search).toHaveBeenLastCalledWith({ name: '', status: undefined, page: 1, size: 20 });
  });

  it('reloads the page it is on when the caretaker dialog saves a change', async () => {
    // O diálogo de cadastro e edição abre sobre a lista, que continua na tela e precisa mostrar o
    // que mudou.
    search.mockResolvedValue(success(pageOf([maria], 1, 3)));
    await render();

    TestBed.inject(CaretakerChanges).notify();
    await settle();

    expect(search).toHaveBeenCalledTimes(2);
    expect(search).toHaveBeenLastCalledWith({ name: '', status: undefined, page: 1, size: 20 });
  });

  it('says how many caretakers the search found', async () => {
    await render();

    expect(tableStatus()).toBe('2 responsáveis encontrados.');
  });

  it('says a single caretaker was found, in the singular', async () => {
    search.mockResolvedValue(success(pageOf([maria])));

    await render();

    expect(tableStatus()).toBe('1 responsável encontrado.');
  });

  it('stops saying it is loading when the search fails', async () => {
    search.mockResolvedValue(
      failure(Notification.of([{ code: 'REQUEST_FAILED', message: 'Não foi possível concluir a operação. Tente novamente.' }])),
    );

    await render();

    expect(tableStatus()).not.toBe('Carregando…');
  });

  it('shows why the search failed, in the summary', async () => {
    search.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'REQUEST_FAILED', message: 'Não foi possível concluir a operação. Tente novamente.' },
        ]),
      ),
    );

    await render();

    expect(element().querySelector('.error-summary')?.textContent).toContain(
      'Não foi possível concluir a operação. Tente novamente.',
    );
  });

  it('clears an old refusal once a later search succeeds', async () => {
    deactivate.mockResolvedValue(lastAdministrator);
    await render();
    await confirmDeactivation();

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(element().querySelector('.error-summary')).toBeNull();
  });

  it('pages through the last search made, not through a name typed and not yet searched', async () => {
    search.mockResolvedValue(success(pageOf([maria], 0, 2)));
    await render();
    typeName('pereira');

    named('Próxima página').click();
    await settle();

    expect(search).toHaveBeenLastCalledWith({ name: '', status: undefined, page: 1, size: 20 });
  });
});
