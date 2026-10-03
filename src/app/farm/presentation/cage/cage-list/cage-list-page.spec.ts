import type { Mock } from 'vitest';
import { ExportCagesUseCase } from '../../../application/cage/export-cages.usecase';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterOutlet, convertToParamMap, provideRouter } from '@angular/router';
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
    layingRateTarget: 85,
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
  let exportCages: Mock;
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

  async function render(administrator = true, query: Readonly<Record<string, string>> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CageListPage],
      providers: [
        provideRouter([]),
        { provide: SearchCagesUseCase, useValue: { execute: search } },
        { provide: FindSectorByIdUseCase, useValue: { execute: find } },
        { provide: DeactivateCageUseCase, useValue: { execute: deactivate } },
        { provide: ReactivateCageUseCase, useValue: { execute: reactivate } },
        { provide: ExportCagesUseCase, useValue: { execute: exportCages } },
        { provide: VIEWER, useValue: { isAdministrator: signal(administrator) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ sectorId: galpao.id }),
              queryParamMap: convertToParamMap(query),
            },
          },
        },
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
    exportCages = vi.fn().mockResolvedValue(success('gaiolas-codornas-galpao-1.xlsx'));
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
    find.mockResolvedValue(success({ ...galpao, activeCageCount: 0, birdCount: 0, layingRateTarget: 85, batteries: [] }));
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
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE', activeCageCount: 0, birdCount: 0, layingRateTarget: 85 }));
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
    find.mockResolvedValue(success({ ...galpao, activeCageCount: 0, birdCount: 0, layingRateTarget: 85, batteries: ['D'] }));
    searchByStatus([], [{ ...cage('D-01', 'D', 1), status: 'INACTIVE' }]);
    await render();

    expect(element().querySelector('ovyx-data-table ovyx-empty-state')?.textContent).toContain('Nenhuma gaiola encontrada');
    button('Inativas', group('Situação')).click();
    await settle();

    expect(named('Reativar gaiola D-01')).toBeTruthy();
  });

  it('tells a common user, and not the administrator, that the cages of an inactive sector are only for consultation', async () => {
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE', activeCageCount: 0, birdCount: 0, layingRateTarget: 85 }));
    searchByStatus([], []);
    await render(false);

    expect(element().textContent).toContain('O setor está inativo: as gaiolas dele ficam só para consulta.');
    expect(element().textContent).not.toContain('Reative o setor');
  });

  it('does not invite a common user to register the first cage', async () => {
    search.mockResolvedValue(success(pageOf([])));
    find.mockResolvedValue(success({ ...galpao, activeCageCount: 0, birdCount: 0, layingRateTarget: 85, batteries: [] }));
    await render(false);

    const empty = element().querySelector('ovyx-empty-state')!;
    expect(empty.textContent).toContain('As gaiolas que o administrador cadastrar aparecem aqui.');
    expect(empty.querySelector('a')).toBeNull();
  });

  it('does not invite to register a cage in an inactive sector without cages', async () => {
    search.mockResolvedValue(success(pageOf([])));
    find.mockResolvedValue(success({ ...galpao, status: 'INACTIVE', activeCageCount: 0, birdCount: 0, layingRateTarget: 85, batteries: [] }));
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

  // ---------------------------------------------------------------- pesagem (005)

  it.each([true, false])('leads every caretaker to the weight of each cage (005, US1), administrator: %s', async (administrator) => {
    await render(administrator);

    expect(named('Peso médio da gaiola A-01')?.getAttribute('href')).toBe(
      `/setores/${galpao.id}/gaiolas/id-A-01/peso`,
    );
  });

  it('shows the reference weight range of the sector in the header (005, US2)', async () => {
    find.mockResolvedValue(success({ ...galpao, referenceWeight: { minimum: 155, maximum: 175 } }));

    await render();

    expect(element().querySelector('.page-head')?.textContent).toContain('peso de referência 155–175 g');
  });

  it('leaves the reference weight out of the header of a sector without range (005, US2)', async () => {
    await render();

    expect(element().querySelector('.page-head')?.textContent).not.toContain('peso de referência');
  });

  it('shows the average weight of the last weighing of each cage, or a dash (005, US3)', async () => {
    search.mockResolvedValue(
      success(
        pageOf([
          { ...cage('A-01', 'A', 1), lastWeighing: { weighedOn: '2026-09-24', averageWeight: 161.4 } },
          cage('B-07', 'B', 7),
        ]),
      ),
    );

    await render();

    const weights = Array.from(element().querySelectorAll('tbody td[data-label="Peso médio"]')).map((cell) =>
      cell.textContent?.trim(),
    );
    expect(weights).toEqual(['161,4 g', '—']);
  });

  // ---------------------------------------------------------------- exportação (007, US3)

  function exportButton(): HTMLButtonElement | undefined {
    return Array.from(element().querySelectorAll<HTMLButtonElement>('.tbl-tools button')).find((candidate) =>
      ['Exportar', 'Gerando…'].includes(candidate.textContent?.trim() ?? ''),
    );
  }

  it('offers the export of the cages in the bar of the filters, small and ghost', async () => {
    await render();

    expect(exportButton()?.className).toContain('btn-ghost');
    expect(exportButton()?.className).toContain('btn-sm');
  });

  it('exports the cages with the search and the filters applied, and says the spreadsheet was generated', async () => {
    await render();
    const field = element().querySelector<HTMLInputElement>('#code')!;
    field.value = 'b-0';
    field.dispatchEvent(new Event('input'));
    element().querySelector('form.tbl-tools')!.dispatchEvent(new Event('submit'));
    await settle();
    button('B', group('Bateria')).click();
    await settle();
    button('Todas', group('Situação')).click();
    await settle();

    exportButton()!.click();
    await settle();

    expect(exportCages).toHaveBeenCalledWith(galpao.id, { code: 'b-0', battery: 'B', status: 'ALL' });
    expect(toasts()).toContain('Planilha gerada (gaiolas-codornas-galpao-1.xlsx).');
  });

  it('says it is generating and takes no second request until it finishes', async () => {
    let finish: (value: unknown) => void = () => undefined;
    exportCages.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render();

    exportButton()!.click();
    fixture.detectChanges();
    exportButton()!.click();
    fixture.detectChanges();

    expect(exportButton()!.textContent?.trim()).toBe('Gerando…');
    expect(exportButton()!.getAttribute('aria-busy')).toBe('true');
    expect(exportCages).toHaveBeenCalledTimes(1);
    finish(success('gaiolas.xlsx'));
    await settle();
    expect(exportButton()!.textContent?.trim()).toBe('Exportar');
  });

  it('says the spreadsheet could not be generated', async () => {
    exportCages.mockResolvedValue(
      failure(Notification.of([{ code: 'REQUEST_FAILED', message: 'Não houve resposta do servidor. Tente novamente em instantes.' }])),
    );
    await render();

    exportButton()!.click();
    await settle();

    expect(TestBed.inject(Toaster).toasts()).toContainEqual(
      expect.objectContaining({
        message: 'Não foi possível gerar a planilha: Não houve resposta do servidor. Tente novamente em instantes.',
        tone: 'danger',
      }),
    );
  });

  // ---------------------------------------------------------------- QA 1 da 007: anúncio e foco

  it('announces to the screen reader that the spreadsheet of the cages is being generated', async () => {
    let finish: (value: unknown) => void = () => undefined;
    exportCages.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render();
    const status = element().querySelector('[data-export-status]');
    expect(status?.getAttribute('role')).toBe('status');

    exportButton()!.click();
    fixture.detectChanges();

    expect(status?.textContent?.trim()).toBe('Gerando a planilha…');
    finish(success('gaiolas.xlsx'));
    await settle();
    expect(status?.textContent?.trim()).toBe('');
  });

  it('gives the focus back to the export button when the generation lost it', async () => {
    let finish: (value: unknown) => void = () => undefined;
    exportCages.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render();

    exportButton()!.click();
    fixture.detectChanges();
    (document.activeElement as HTMLElement | null)?.blur();
    finish(success('gaiolas.xlsx'));
    await settle();
    await settle();

    expect(document.activeElement).toBe(exportButton());
  });

  // ---------------------------------------------------------------- agenda de pesagem (010)

  function weighedCage(code: string, weighing?: CageSummary['weighing']): CageSummary {
    return { ...cage(code, code.charAt(0), Number(code.slice(2))), weighing };
  }

  it('shows the standing of each cage in the weighing schedule, and a dash without one', async () => {
    search.mockResolvedValue(
      success(
        pageOf([
          weighedCage('A-01', { situation: 'UP_TO_DATE', nextOn: '2026-10-02' }),
          weighedCage('B-07', { situation: 'LATE', lateSince: '2026-09-25' }),
          weighedCage('C-03', { situation: 'NEVER_WEIGHED' }),
          { ...weighedCage('D-01'), status: 'INACTIVE' },
        ]),
      ),
    );

    await render();

    const standing = (id: string) =>
      element().querySelector(`tr[data-cage="${id}"] td[data-label="Pesagem"]`)?.textContent?.trim();
    expect(element().querySelector('thead')?.textContent).toContain('Pesagem');
    expect(standing('id-A-01')).toBe('Em dia');
    expect(standing('id-B-07')).toBe('Atrasada desde 25/09');
    expect(standing('id-C-03')).toBe('Nunca pesada');
    expect(standing('id-D-01')).toBe('—');
  });

  it('filters the pending weighings, and writes the filter in the address', async () => {
    await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    button('Pesagem pendente', group('Pesagem')).click();
    await settle();

    expect(search).toHaveBeenLastCalledWith(galpao.id, {
      code: '',
      battery: '',
      status: 'ACTIVE',
      weighing: 'PENDING',
      page: 0,
      size: 20,
    });
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pesagem: 'pendente' }, queryParamsHandling: 'merge', replaceUrl: true }),
    );
  });

  it('opens already filtered by the pending weighing when the address asks for it', async () => {
    await render(true, { pesagem: 'pendente' });

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(galpao.id, {
      code: '',
      battery: '',
      status: 'ACTIVE',
      weighing: 'PENDING',
      page: 0,
      size: 20,
    });
    expect(button('Pesagem pendente', group('Pesagem')).getAttribute('aria-pressed')).toBe('true');
  });

  it('says every cage is up to date when the pending filter finds none, and clears it from the address', async () => {
    search.mockResolvedValue(success(pageOf([])));
    await render(true, { pesagem: 'pendente' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    expect(element().textContent).toContain('Todas as gaiolas ativas estão em dia com a pesagem.');
    button('Limpar busca').click();
    await settle();

    expect(search).toHaveBeenLastCalledWith(galpao.id, { code: '', battery: '', status: 'ACTIVE', page: 0, size: 20 });
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { pesagem: null } }));
  });

  it('exports the pending cages with the weighing filter', async () => {
    await render(true, { pesagem: 'pendente' });

    button('Exportar').click();
    await settle();

    expect(exportCages).toHaveBeenCalledWith(galpao.id, {
      code: '',
      battery: '',
      status: 'ACTIVE',
      weighing: 'PENDING',
    });
  });

  it('says every cage is up to date only with no other filter than the pending weighing (QA 1, D-2)', async () => {
    search.mockResolvedValue(success(pageOf([])));
    await render(true, { pesagem: 'pendente' });

    button('A', group('Bateria')).click();
    await settle();

    expect(element().textContent).not.toContain('Todas as gaiolas ativas estão em dia com a pesagem.');
    expect(element().textContent).toContain('Escolha outra bateria ou outra situação.');
  });

  it('gives the standing a whole line of the card on the phone (QA 1, D-1)', async () => {
    search.mockResolvedValue(
      success(pageOf([weighedCage('B-07', { situation: 'LATE', lateSince: '2026-09-30' })])),
    );

    await render();

    expect(element().querySelector('tr[data-cage="id-B-07"] td[data-label="Pesagem"]')?.classList).toContain('wide');
  });
});
