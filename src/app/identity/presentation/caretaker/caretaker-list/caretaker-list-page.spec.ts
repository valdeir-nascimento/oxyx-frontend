import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { failure, success } from '../../../../shared/application/result';
import { DeactivateCaretakerUseCase } from '../../../application/caretaker/deactivate-caretaker.usecase';
import { SearchCaretakersUseCase } from '../../../application/caretaker/search-caretakers.usecase';
import { CaretakerPage, CaretakerSummary } from '../../../domain/caretaker';
import { CaretakerNotice } from '../caretaker-notice';
import { CaretakerListPage } from './caretaker-list-page';

/**
 * Lista de responsáveis (T090, T092): pesquisa por nome, páginas, e inativação com confirmação.
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

  function button(label: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    )!;
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

  async function confirmDeactivation(): Promise<void> {
    button('Inativar').click();
    await settle();
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

  async function render(notice?: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CaretakerListPage],
      providers: [
        provideRouter([]),
        { provide: SearchCaretakersUseCase, useValue: { execute: search } },
        { provide: DeactivateCaretakerUseCase, useValue: { execute: deactivate } },
      ],
    }).compileComponents();
    if (notice) {
      TestBed.inject(CaretakerNotice).post(notice);
    }
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
    expect(rows[0].textContent).toContain('Administrador');
    expect(rows[0].textContent).toContain('Ativo');
    expect(rows[1].textContent).toContain('Inativo');
  });

  it('searches by the name typed and the status chosen, from the first page', async () => {
    await render();
    const name = element().querySelector<HTMLInputElement>('#name')!;
    const status = element().querySelector<HTMLSelectElement>('#status')!;
    name.value = 'pereira';
    name.dispatchEvent(new Event('input'));
    status.value = 'INACTIVE';
    status.dispatchEvent(new Event('change'));

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(search).toHaveBeenLastCalledWith({ name: 'pereira', status: 'INACTIVE', page: 0, size: 20 });
  });

  it('moves to the next page, and cannot go back from the first one', async () => {
    search.mockResolvedValue(success(pageOf([maria], 0, 2)));
    await render();

    expect(button('Anterior').disabled).toBe(true);
    button('Próxima').click();
    await settle();

    expect(search).toHaveBeenLastCalledWith({ name: '', status: undefined, page: 1, size: 20 });
  });

  it('offers deactivation only to active caretakers, naming who in the button', async () => {
    await render();

    const buttons = Array.from(element().querySelectorAll('tbody button'));
    expect(buttons.map((candidate) => candidate.getAttribute('aria-label'))).toEqual(['Inativar Maria Silva']);
  });

  it('asks before deactivating, and cancelling changes nothing (FR-018)', async () => {
    await render();

    button('Inativar').click();
    await settle();
    expect(element().querySelector('[role="alertdialog"]')?.textContent).toContain('Inativar Maria Silva?');

    button('Cancelar').click();
    await settle();

    expect(element().querySelector('[role="alertdialog"]')).toBeNull();
    expect(deactivate).not.toHaveBeenCalled();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Inativar Maria Silva');
  });

  it('deactivates once confirmed, says so, and reloads the page', async () => {
    await render();
    button('Inativar').click();
    await settle();

    Array.from(element().querySelectorAll('[role="alertdialog"] button'))
      .find((candidate) => candidate.textContent?.trim() === 'Inativar')!
      .dispatchEvent(new Event('click'));
    await settle();

    expect(deactivate).toHaveBeenCalledWith(maria.id);
    expect(element().querySelector('.caretakers__status')?.textContent).toContain('Maria Silva');
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('shows why the deactivation was refused, as the backend said it', async () => {
    deactivate.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'LAST_ADMINISTRATOR',
            field: 'status',
            message: 'O sistema precisa de ao menos um administrador ativo.',
          },
        ]),
      ),
    );
    await render();
    button('Inativar').click();
    await settle();

    Array.from(element().querySelectorAll('[role="alertdialog"] button'))
      .find((candidate) => candidate.textContent?.trim() === 'Inativar')!
      .dispatchEvent(new Event('click'));
    await settle();

    expect(element().querySelector('.error-summary')?.textContent).toContain(
      'O sistema precisa de ao menos um administrador ativo.',
    );
    expect(element().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('shows the notice left by the form that saved a caretaker, with the focus on it', async () => {
    // O foco da tela anterior se perdeu na navegação: sem levá-lo ao aviso, o leitor de tela não
    // dizia nada depois de salvar.
    await render('Responsável cadastrado: Maria Silva.');

    const status = element().querySelector('.caretakers__status');
    expect(status?.textContent).toContain('Responsável cadastrado: Maria Silva.');
    expect(document.activeElement).toBe(status);
  });

  it('says a single caretaker was found, in the singular', async () => {
    search.mockResolvedValue(success(pageOf([maria])));

    await render();

    expect(element().querySelector('.ovyx-data-table__state')?.textContent?.trim()).toBe(
      '1 responsável encontrado.',
    );
  });

  it('keeps the empty notice region in the accessibility tree, only out of sight', async () => {
    // Com display: none a região saía da árvore de acessibilidade e renascia a cada aviso (T235). O
    // navegador não conta o texto vazio da interpolação para :empty; o jsdom conta, e o normalize o
    // retira.
    await render();
    const region = element().querySelector<HTMLElement>('.caretakers__status')!;

    region.normalize();

    expect(getComputedStyle(region).display).not.toBe('none');
    expect(getComputedStyle(region).position).toBe('absolute');
  });

  it('stops saying it is loading when the search fails', async () => {
    search.mockResolvedValue(
      failure(Notification.of([{ code: 'REQUEST_FAILED', message: 'Não foi possível concluir a operação. Tente novamente.' }])),
    );

    await render();

    expect(element().querySelector('.ovyx-data-table__state')?.textContent?.trim()).not.toBe('Carregando…');
  });

  it('frees the confirmation once a deactivation ends, so the next one can be confirmed', async () => {
    // Sem soltar o estado ocupado, a confirmação seguinte já nascia desabilitada.
    await render();
    await confirmDeactivation();

    button('Inativar').click();
    await settle();

    expect(confirmButton().disabled).toBe(false);
  });

  it('drops the previous notice when a new refusal arrives', async () => {
    // "Responsável cadastrado" ficava logo acima da recusa de uma inativação (QA da T284).
    deactivate.mockResolvedValue(lastAdministrator);
    await render('Responsável cadastrado: Maria Silva.');

    await confirmDeactivation();

    expect(element().querySelector('.caretakers__status')?.textContent?.trim()).toBe('');
  });

  it('drops the previous notice when a new search is made', async () => {
    await render('Responsável cadastrado: Maria Silva.');

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(element().querySelector('.caretakers__status')?.textContent?.trim()).toBe('');
  });

  it('says how many caretakers the search found', async () => {
    await render();

    expect(element().querySelector('.ovyx-data-table__state')?.textContent?.trim()).toBe(
      '2 responsáveis encontrados.',
    );
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

  it('does not turn the refused status into a link to the status filter', async () => {
    // A recusa do último administrador vem no campo "status" — o mesmo nome do filtro "Situação" da
    // lista. O link levaria a pessoa ao filtro, que nada tem a ver com a recusa.
    deactivate.mockResolvedValue(lastAdministrator);
    await render();

    await confirmDeactivation();

    expect(element().querySelector('.error-summary a')).toBeNull();
  });

  it('takes the focus to the notice once the caretaker is deactivated', async () => {
    // O botão de onde a pessoa veio some com a inativação.
    await render();

    await confirmDeactivation();

    expect(document.activeElement).toBe(element().querySelector('.caretakers__status'));
  });

  it('reloads the page it was on after deactivating, not the first one', async () => {
    search.mockResolvedValue(success(pageOf([maria], 1, 3)));
    await render();

    await confirmDeactivation();

    expect(search).toHaveBeenLastCalledWith({ name: '', status: undefined, page: 1, size: 20 });
  });

  it('cannot go forward from the last page', async () => {
    search.mockResolvedValue(success(pageOf([maria], 1, 2)));

    await render();

    expect(button('Próxima').disabled).toBe(true);
  });

  it('keeps the confirmation busy while the deactivation runs, so it is not sent twice', async () => {
    deactivate.mockReturnValue(new Promise(() => undefined));
    await render();
    button('Inativar').click();
    await settle();

    confirmButton().dispatchEvent(new Event('click'));
    await settle();

    expect(confirmButton().disabled).toBe(true);
    expect(deactivate).toHaveBeenCalledOnce();
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

    button('Próxima').click();
    await settle();

    expect(search).toHaveBeenLastCalledWith({ name: '', status: undefined, page: 1, size: 20 });
  });
});
