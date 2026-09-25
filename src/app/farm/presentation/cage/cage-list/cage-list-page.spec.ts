import type { Mock } from 'vitest';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, RouterOutlet, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { DeactivateCageUseCase } from '../../../application/cage/deactivate-cage.usecase';
import { ReactivateCageUseCase } from '../../../application/cage/reactivate-cage.usecase';
import { SearchCagesUseCase } from '../../../application/cage/search-cages.usecase';
import { FindSectorByIdUseCase } from '../../../application/sector/find-sector-by-id.usecase';
import { CagePage, CageSummary } from '../../../domain/cage';
import { Sector } from '../../../domain/sector';
import { CageChanges } from '../cage-changes';
import { CageListPage } from './cage-list-page';

/**
 * Lista das gaiolas de um setor (US2; FR-010, FR-011, FR-020; S-05): o cabeçalho com os totais do
 * setor, a tabela, a busca pelo código, os filtros de bateria e de situação, as páginas e os estados
 * vazios.
 */
describe('CageListPage', () => {
  const galpao: Sector = {
    id: '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11',
    name: 'Codornas — Galpão 1',
    status: 'ACTIVE',
    activeCageCount: 30,
    birdCount: 1480,
    batteries: ['A', 'B'],
    createdAt: '2026-09-20T10:15:00Z',
    updatedAt: '2026-09-24T17:40:12Z',
  };

  function cage(code: string, battery: string, number: number): CageSummary {
    return { id: `id-${code}`, sectorId: galpao.id, code, battery, number, birdCount: 50, status: 'ACTIVE' };
  }

  function pageOf(content: readonly CageSummary[], page = 0, totalElements = content.length): CagePage {
    return { content, page, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) };
  }

  let search: Mock;
  let find: Mock;
  let deactivate: Mock;
  let reactivate: Mock;
  let fixture: ComponentFixture<CageListPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(text: string, within: ParentNode = element()): HTMLButtonElement {
    return Array.from(within.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    )!;
  }

  function group(label: string): HTMLElement {
    return element().querySelector<HTMLElement>(`[role="group"][aria-label="${label}"]`)!;
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(administrator = true): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CageListPage],
      providers: [
        provideRouter([]),
        { provide: SearchCagesUseCase, useValue: { execute: search } },
        { provide: FindSectorByIdUseCase, useValue: { execute: find } },
        { provide: DeactivateCageUseCase, useValue: { execute: deactivate } },
        { provide: ReactivateCageUseCase, useValue: { execute: reactivate } },
        { provide: VIEWER, useValue: { isAdministrator: signal(administrator) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ sectorId: galpao.id }) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CageListPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    search = vi.fn().mockResolvedValue(success(pageOf([cage('A-01', 'A', 1), cage('B-07', 'B', 7)])));
    find = vi.fn().mockResolvedValue(success(galpao));
    deactivate = vi.fn().mockResolvedValue(success({ ...cage('B-07', 'B', 7), status: 'INACTIVE' }));
    reactivate = vi.fn().mockResolvedValue(success(cage('B-07', 'B', 7)));
  });

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

  afterEach(() => element()?.remove());

  it('shows the sector in the header, with its active cages and its birds', async () => {
    await render();

    const header = element().querySelector('.page-head')!;
    expect(find).toHaveBeenCalledWith(galpao.id);
    expect(header.textContent).toContain('Codornas — Galpão 1');
    expect(header.textContent).toContain('Gaiolas');
    expect(header.textContent).toContain('30 gaiolas ativas');
    expect(header.textContent).toContain('1.480 aves');
  });

  it('asks for the first page of the active cages', async () => {
    await render();

    expect(search).toHaveBeenCalledWith(galpao.id, { code: '', battery: '', status: 'ACTIVE', page: 0, size: 20 });
  });

  it('shows each cage with its code, battery, number, birds and status', async () => {
    await render();

    const row = element().querySelector('tr[data-cage="id-B-07"]')!;
    expect(row.textContent).toContain('B-07');
    expect(row.textContent).toContain('Bateria B');
    expect(row.textContent).toContain('nº 7');
    expect(row.textContent).toContain('50');
    expect(row.textContent).toContain('Ativa');
  });

  it('searches by the code from the first page', async () => {
    await render();
    const field = element().querySelector<HTMLInputElement>('#code')!;
    field.value = 'b-0';
    field.dispatchEvent(new Event('input'));

    element().querySelector('form[role="search"]')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(search).toHaveBeenLastCalledWith(galpao.id, { code: 'b-0', battery: '', status: 'ACTIVE', page: 0, size: 20 });
  });

  it('filters by the batteries the cages of the sector use', async () => {
    await render();

    expect(Array.from(group('Bateria').querySelectorAll('button')).map((option) => option.textContent?.trim())).toEqual([
      'Todas',
      'A',
      'B',
    ]);
    button('B', group('Bateria')).click();
    await settle();

    expect(search).toHaveBeenLastCalledWith(galpao.id, { code: '', battery: 'B', status: 'ACTIVE', page: 0, size: 20 });
  });

  it('filters by status', async () => {
    await render();

    button('Inativas', group('Situação')).click();
    await settle();

    expect(search).toHaveBeenLastCalledWith(galpao.id, { code: '', battery: '', status: 'INACTIVE', page: 0, size: 20 });
  });

  it('pages the cages: 21–30 of 30', async () => {
    search.mockResolvedValue(success(pageOf([cage('A-01', 'A', 1)], 0, 30)));
    await render();
    search.mockResolvedValue(success(pageOf([cage('B-06', 'B', 6)], 1, 30)));

    element().querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await settle();

    expect(search).toHaveBeenLastCalledWith(galpao.id, { code: '', battery: '', status: 'ACTIVE', page: 1, size: 20 });
    expect(element().querySelector('ovyx-pager')?.textContent).toContain('21–30 de 30');
  });

  it('invites to register the first cage of a sector without cages', async () => {
    search.mockResolvedValue(success(pageOf([])));
    find.mockResolvedValue(success({ ...galpao, activeCageCount: 0, birdCount: 0, batteries: [] }));
    await render();

    const empty = element().querySelector('ovyx-empty-state')!;
    expect(empty.textContent).toContain('Nenhuma gaiola neste setor');
    expect(empty.querySelector('a')?.getAttribute('href')).toBe(`/setores/${galpao.id}/gaiolas/nova`);
  });

  it('says what was searched and how to correct it when the search finds nothing', async () => {
    await render();
    search.mockResolvedValue(success(pageOf([])));
    const field = element().querySelector<HTMLInputElement>('#code')!;
    field.value = 'Z-99';
    field.dispatchEvent(new Event('input'));

    element().querySelector('form[role="search"]')!.dispatchEvent(new Event('submit'));
    await settle();

    const empty = element().querySelector('ovyx-data-table ovyx-empty-state')!;
    expect(empty.textContent).toContain('Nenhuma gaiola encontrada');
    expect(empty.textContent).toContain('Z-99');
  });

  it('opens the registration and the edition of a cage', async () => {
    await render();

    const register = Array.from(element().querySelectorAll<HTMLAnchorElement>('.page-head a')).find(
      (link) => link.textContent?.trim() === 'Nova gaiola',
    );
    expect(register?.getAttribute('href')).toBe(`/setores/${galpao.id}/gaiolas/nova`);
    expect(element().querySelector('a[aria-label="Editar gaiola B-07"]')?.getAttribute('href')).toBe(
      `/setores/${galpao.id}/gaiolas/id-B-07`,
    );
  });

  it('says the sector was not found for an address of no sector', async () => {
    find.mockResolvedValue(failure(Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }])));
    search.mockResolvedValue(failure(Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }])));
    await render();

    expect(element().textContent).toContain('Setor não encontrado.');
    expect(element().querySelector('table')).toBeNull();
  });

  it('asks again, with the sector totals, when a cage is registered or updated in the dialog', async () => {
    await render();
    search.mockClear();
    find.mockClear();

    TestBed.inject(CageChanges).notify();
    await settle();

    expect(search).toHaveBeenCalled();
    expect(find).toHaveBeenCalledWith(galpao.id);
  });

  it('asks to confirm the deactivation of a cage in a button named by the action', async () => {
    await render();

    named('Inativar gaiola B-07')!.click();
    await settle();

    expect(confirmation()?.textContent).toContain('sai dos totais do setor');
    expect(confirmation()!.querySelector('h2')?.textContent?.trim()).toBe('Inativar gaiola B-07?');
    expect(button('Inativar gaiola', confirmation()!)).toBeTruthy();
    expect(deactivate).not.toHaveBeenCalled();
  });

  it('deactivates the cage when confirmed, says so, and asks again with the totals', async () => {
    await render();
    named('Inativar gaiola B-07')!.click();
    await settle();
    search.mockClear();
    find.mockClear();

    button('Inativar gaiola', confirmation()!).dispatchEvent(new Event('click'));
    await settle();

    expect(deactivate).toHaveBeenCalledWith(galpao.id, 'id-B-07');
    expect(toasts()).toEqual(['Gaiola inativada: B-07.']);
    expect(search).toHaveBeenCalled();
    expect(find).toHaveBeenCalledWith(galpao.id);
  });

  it('reactivates an inactive cage, and shows the conflict when another cage took its code', async () => {
    search.mockResolvedValue(success(pageOf([{ ...cage('A-02', 'A', 2), status: 'INACTIVE' }])));
    reactivate.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'CAGE_ALREADY_EXISTS', field: 'battery', message: 'Já existe uma gaiola ativa A-02 neste setor.' },
        ]),
      ),
    );
    await render();

    named('Reativar gaiola A-02')!.click();
    await settle();

    expect(reactivate).toHaveBeenCalledWith(galpao.id, 'id-A-02');
    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'Já existe uma gaiola ativa A-02 neste setor.',
    );
  });

  it('shows a common user the cages, the search and the filters, and nothing that changes them', async () => {
    await render(false);

    expect(element().querySelector('tr[data-cage="id-B-07"]')?.textContent).toContain('B-07');
    expect(element().querySelector('#code')).toBeTruthy();
    expect(group('Bateria')).toBeTruthy();
    expect(group('Situação')).toBeTruthy();
    expect(Array.from(element().querySelectorAll('a')).some((link) => link.textContent?.trim() === 'Nova gaiola')).toBe(
      false,
    );
    expect(named('Editar gaiola B-07')).toBeNull();
    expect(named('Inativar gaiola B-07')).toBeNull();
  });

  /** A pesquisa como o backend a faz: cada situação traz só as gaiolas dela. */
  function searchByStatus(active: readonly CageSummary[], inactive: readonly CageSummary[]): void {
    search.mockImplementation((_sectorId: string, request: { status: string }) =>
      Promise.resolve(
        success(
          pageOf(request.status === 'ACTIVE' ? active : request.status === 'INACTIVE' ? inactive : [...active, ...inactive]),
        ),
      ),
    );
  }

  it('keeps the search and the filters in an inactive sector, and reaches its cages through the inactive ones', async () => {
    // Revisão e QA (D-1): com a cascata, o setor inativo não tem gaiola ativa; a tela dizia "Nenhuma
    // gaiola neste setor" e escondia a busca e os filtros, e as gaiolas dele ficavam inalcançáveis.
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE', activeCageCount: 0, birdCount: 0 }));
    searchByStatus([], [{ ...cage('A-01', 'A', 1), status: 'INACTIVE' }]);
    await render();

    expect(element().textContent).not.toContain('Nenhuma gaiola neste setor');
    expect(element().textContent).toContain('O setor está inativo. Reative o setor antes de mexer nas gaiolas dele.');
    button('Inativas', group('Situação')).click();
    await settle();

    expect(element().querySelector('tr[data-cage="id-A-01"]')?.textContent).toContain('Inativa');
    expect(Array.from(element().querySelectorAll('a')).some((link) => link.textContent?.trim() === 'Nova gaiola')).toBe(
      false,
    );
    expect(named('Reativar gaiola A-01')).toBeNull();
    expect(named('Editar gaiola A-01')).toBeNull();
  });

  it('reaches the only cage of an active sector after it was deactivated', async () => {
    find.mockResolvedValue(success({ ...galpao, activeCageCount: 0, birdCount: 0, batteries: ['D'] }));
    searchByStatus([], [{ ...cage('D-01', 'D', 1), status: 'INACTIVE' }]);
    await render();

    expect(element().querySelector('ovyx-data-table ovyx-empty-state')?.textContent).toContain('Nenhuma gaiola encontrada');
    button('Inativas', group('Situação')).click();
    await settle();

    expect(named('Reativar gaiola D-01')).toBeTruthy();
  });

  it('tells a common user, and not the administrator, that the cages of an inactive sector are only for consultation', async () => {
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE', activeCageCount: 0, birdCount: 0 }));
    searchByStatus([], []);
    await render(false);

    expect(element().textContent).toContain('O setor está inativo: as gaiolas dele ficam só para consulta.');
    expect(element().textContent).not.toContain('Reative o setor');
  });

  it('does not invite a common user to register the first cage', async () => {
    search.mockResolvedValue(success(pageOf([])));
    find.mockResolvedValue(success({ ...galpao, activeCageCount: 0, birdCount: 0, batteries: [] }));
    await render(false);

    const empty = element().querySelector('ovyx-empty-state')!;
    expect(empty.textContent).toContain('As gaiolas que o administrador cadastrar aparecem aqui.');
    expect(empty.querySelector('a')).toBeNull();
  });

  it('does not invite to register a cage in an inactive sector without cages', async () => {
    search.mockResolvedValue(success(pageOf([])));
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE', activeCageCount: 0, birdCount: 0, batteries: [] }));
    await render();

    const empty = element().querySelector('ovyx-empty-state')!;
    expect(empty.textContent).toContain('O setor está inativo e não recebe gaiolas novas.');
    expect(empty.querySelector('a')).toBeNull();
  });

  it('offers to clear a search that found nothing', async () => {
    await render();
    search.mockResolvedValue(success(pageOf([])));
    const field = element().querySelector<HTMLInputElement>('#code')!;
    field.value = 'Z-99';
    field.dispatchEvent(new Event('input'));
    element().querySelector('form[role="search"]')!.dispatchEvent(new Event('submit'));
    await settle();
    search.mockResolvedValue(success(pageOf([cage('A-01', 'A', 1)])));

    button('Limpar busca').click();
    await settle();

    expect(search).toHaveBeenLastCalledWith(galpao.id, { code: '', battery: '', status: 'ACTIVE', page: 0, size: 20 });
    expect(field.value).toBe('');
  });

  it('takes the focus to the notice when the sector of the open list turns out inactive', async () => {
    // QA N-7: o "Editar" de uma lista desatualizada faz o guard pedir a lista de novo; o link some com
    // a lista que só consulta, e o foco iria para o corpo da página.
    await render();
    named('Editar gaiola B-07')!.focus();
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE' }));

    TestBed.inject(CageChanges).notify();
    await settle();
    await settle();

    const notice = element().querySelector<HTMLElement>('[data-inactive-notice]');
    expect(notice?.textContent).toContain('Reative o setor antes de mexer nas gaiolas dele.');
    expect(document.activeElement).toBe(notice);
  });

  it('leaves the focus where it is when the sector turns out inactive and the focus is still in place', async () => {
    // O diálogo recusado com SECTOR_INACTIVE também faz a lista buscar de novo, e o foco dele fica.
    await render();
    const field = element().querySelector<HTMLInputElement>('#code')!;
    field.focus();
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE' }));

    TestBed.inject(CageChanges).notify();
    await settle();
    await settle();

    expect(document.activeElement).toBe(field);
  });

  /** O diálogo de gaiola fecha: o `router-outlet` da lista avisa que a rota filha saiu. */
  function closeDialog(): void {
    fixture.debugElement.query(By.directive(RouterOutlet)).injector.get(RouterOutlet).deactivateEvents.emit({});
  }

  it('takes the focus to the notice when the dialog refused over an inactive sector closes', async () => {
    // QA N-8: a recusa SECTOR_INACTIVE faz a lista buscar de novo com o diálogo aberto, e a ação que o
    // abriu some. Ao fechar, o FocusTrap não tinha a quem devolver o foco, que caía no corpo da página.
    await render();
    const refusal = document.createElement('div');
    refusal.tabIndex = -1;
    document.body.appendChild(refusal);
    refusal.focus();
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE' }));
    TestBed.inject(CageChanges).notify();
    await settle();
    await settle();
    refusal.remove();

    closeDialog();
    await settle();

    expect(document.activeElement).toBe(element().querySelector('[data-inactive-notice]'));
  });

  it('leaves the focus to the dialog that closes over an active sector, which gives it back to whoever opened it', async () => {
    await render();
    const opener = named('Editar gaiola B-07')!;
    opener.focus();

    closeDialog();
    await settle();

    expect(document.activeElement).toBe(opener);
  });

  it('takes the focus to the search field after clearing the search', async () => {
    // QA N-2: o "Limpar busca" some com a busca que ele desfaz, e o foco caía no corpo da página.
    await render();
    search.mockResolvedValue(success(pageOf([])));
    const field = element().querySelector<HTMLInputElement>('#code')!;
    field.value = 'Z-99';
    field.dispatchEvent(new Event('input'));
    element().querySelector('form[role="search"]')!.dispatchEvent(new Event('submit'));
    await settle();
    search.mockResolvedValue(success(pageOf([cage('A-01', 'A', 1)])));

    button('Limpar busca').click();
    await settle();

    expect(document.activeElement).toBe(field);
  });

  it('names the table by the sector', async () => {
    // O título da aba vem da rota (sectorTitleResolver): a tela que o escrevia perdia para o título
    // estático da rota ao fechar o diálogo (QA N-3).
    await render();

    expect(element().querySelector('caption')?.textContent).toContain('Gaiolas do setor Codornas — Galpão 1');
  });

  it('goes back to the last page that still has cages when the deactivation empties the current one', async () => {
    search.mockImplementation((_sectorId: string, request: { page: number }) =>
      Promise.resolve(
        success(
          request.page === 1
            ? { content: [cage('B-10', 'B', 10)], page: 1, size: 20, totalElements: 21, totalPages: 2 }
            : { content: [cage('A-01', 'A', 1)], page: 0, size: 20, totalElements: 21, totalPages: 2 },
        ),
      ),
    );
    await render();
    element().querySelector<HTMLButtonElement>('[aria-label="Página 2"]')!.click();
    await settle();
    search.mockImplementation((_sectorId: string, request: { page: number }) =>
      Promise.resolve(
        success(
          request.page === 1
            ? { content: [], page: 1, size: 20, totalElements: 20, totalPages: 1 }
            : pageOf([cage('A-01', 'A', 1)], 0, 20),
        ),
      ),
    );
    named('Inativar gaiola B-10')!.click();
    await settle();

    button('Inativar gaiola', confirmation()!).dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(search).toHaveBeenLastCalledWith(galpao.id, { code: '', battery: '', status: 'ACTIVE', page: 0, size: 20 });
    expect(element().querySelector('tr[data-cage="id-A-01"]')).toBeTruthy();
  });

  it('takes the focus to the edition of the same cage after reactivating it', async () => {
    // QA (D-2): o foco ia para o corpo da página; a regra do design system é a ação de editar da mesma
    // linha, ou a tabela, se a linha saiu da lista.
    search.mockResolvedValue(success(pageOf([{ ...cage('A-02', 'A', 2), status: 'INACTIVE' }])));
    await render();
    search.mockResolvedValue(success(pageOf([cage('A-02', 'A', 2)])));

    named('Reativar gaiola A-02')!.click();
    await settle();
    await settle();

    expect(document.activeElement).toBe(named('Editar gaiola A-02'));
  });

  it('takes the focus to the table when the deactivated cage leaves the list', async () => {
    await render();
    search.mockResolvedValue(success(pageOf([cage('A-01', 'A', 1)])));
    named('Inativar gaiola B-07')!.click();
    await settle();

    button('Inativar gaiola', confirmation()!).dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(document.activeElement).toBe(element().querySelector('.tbl-wrap'));
  });
});
