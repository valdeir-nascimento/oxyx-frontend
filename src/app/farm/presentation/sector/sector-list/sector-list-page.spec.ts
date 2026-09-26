import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { DeactivateSectorUseCase } from '../../../application/sector/deactivate-sector.usecase';
import { ListSectorsUseCase } from '../../../application/sector/list-sectors.usecase';
import { ReactivateSectorUseCase } from '../../../application/sector/reactivate-sector.usecase';
import { SectorSummary } from '../../../domain/sector';
import { SectorChanges } from '../sector-changes';
import { SectorListPage } from './sector-list-page';

/**
 * Lista de setores em cartões (US1; FR-004, FR-005, FR-020): cada setor com a situação e os totais das
 * gaiolas ativas, o filtro de situação e o estado vazio que convida a cadastrar.
 */
describe('SectorListPage', () => {
  const galpao1: SectorSummary = {
    id: '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11',
    name: 'Codornas — Galpão 1',
    description: 'Codornas japonesas em postura, baterias A a D',
    status: 'ACTIVE',
    activeCageCount: 48,
    birdCount: 2400,
  };
  const galpao2: SectorSummary = {
    id: '7a1b9c3d-2e4f-4a6b-8c0d-5e7f9a1b3c22',
    name: 'Poedeiras brancas — Galpão 2',
    status: 'INACTIVE',
    activeCageCount: 0,
    birdCount: 0,
  };

  let list: Mock;
  let deactivate: Mock;
  let reactivate: Mock;
  let fixture: ComponentFixture<SectorListPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(text: string, within: ParentNode = element()): HTMLButtonElement {
    return Array.from(within.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    )!;
  }

  function group(label: string): HTMLElement | null {
    return element().querySelector<HTMLElement>(`[role="group"][aria-label="${label}"]`);
  }

  function card(name: string): HTMLElement {
    return Array.from(element().querySelectorAll<HTMLElement>('article.setor')).find(
      (candidate) => candidate.querySelector('h2')?.textContent?.trim() === name,
    )!;
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(administrator = true): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [SectorListPage],
      providers: [
        provideRouter([]),
        { provide: ListSectorsUseCase, useValue: { execute: list } },
        { provide: DeactivateSectorUseCase, useValue: { execute: deactivate } },
        { provide: ReactivateSectorUseCase, useValue: { execute: reactivate } },
        { provide: VIEWER, useValue: { isAdministrator: signal(administrator) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SectorListPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    list = vi.fn().mockResolvedValue(success([galpao1, galpao2]));
    deactivate = vi.fn().mockResolvedValue(success({ ...galpao1, status: 'INACTIVE' }));
    reactivate = vi.fn().mockResolvedValue(success({ ...galpao2, status: 'ACTIVE' }));
  });

  function named(label: string): HTMLButtonElement {
    return element().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
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

  it('asks for the active sectors first', async () => {
    await render();

    expect(list).toHaveBeenCalledWith('ACTIVE');
    expect(button('Ativos').getAttribute('aria-pressed')).toBe('true');
  });

  it('shows each sector in a card, with its description, its status and the totals of its active cages', async () => {
    await render();

    const first = card('Codornas — Galpão 1');
    expect(first.textContent).toContain('Codornas japonesas em postura, baterias A a D');
    expect(first.querySelector('ovyx-status-badge')?.textContent).toContain('Ativo');
    expect(first.querySelector('.setor-stats')?.textContent).toContain('Gaiolas ativas');
    expect(first.querySelector('.setor-stats')?.textContent).toContain('48');
    expect(first.querySelector('.setor-stats')?.textContent).toContain('2.400');
    expect(card('Poedeiras brancas — Galpão 2').querySelector('ovyx-status-badge')?.textContent).toContain('Inativo');
  });

  it('asks again with the status chosen in the filter', async () => {
    await render();

    button('Todos').click();
    await settle();

    expect(list).toHaveBeenLastCalledWith('ALL');
    expect(button('Todos').getAttribute('aria-pressed')).toBe('true');
  });

  it('opens the registration from the header', async () => {
    await render();

    const link = Array.from(element().querySelectorAll<HTMLAnchorElement>('.page-head a')).find(
      (candidate) => candidate.textContent?.trim() === 'Novo setor',
    );
    expect(link?.getAttribute('href')).toBe('/setores/novo');
  });

  it('opens the edition of a sector from its card', async () => {
    await render();

    const edit = card('Codornas — Galpão 1').querySelector<HTMLAnchorElement>(
      'a[aria-label="Editar setor Codornas — Galpão 1"]',
    );
    expect(edit?.getAttribute('href')).toBe(`/setores/${galpao1.id}`);
  });

  it('opens the cages of a sector from its card', async () => {
    await render();

    const cages = Array.from(card('Codornas — Galpão 1').querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Gaiolas',
    );
    expect(cages?.getAttribute('href')).toBe(`/setores/${galpao1.id}/gaiolas`);
  });

  it('leads from each card to the reports of the sector, named by it (003, FR-017)', async () => {
    await render(false);

    const reports = named('Relatórios do setor Codornas — Galpão 1') as unknown as HTMLAnchorElement;
    expect(reports.textContent?.trim()).toBe('Relatórios');
    expect(reports.getAttribute('href')).toBe(`/setores/${galpao1.id}/relatorios`);
  });

  it('invites to register the first sector when there is none', async () => {
    list.mockResolvedValue(success([]));
    await render();

    const empty = element().querySelector('ovyx-empty-state');
    expect(empty?.textContent).toContain('Nenhum setor ativo');
    expect(empty?.querySelector('a')?.getAttribute('href')).toBe('/setores/novo');
  });

  it('shows the refusal when the list cannot be loaded', async () => {
    list.mockResolvedValue(
      failure(Notification.of([{ code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.' }])),
    );
    await render();

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'Não foi possível concluir a operação.',
    );
  });

  it('asks again when a sector is registered or updated in the dialog', async () => {
    await render();
    list.mockClear();

    TestBed.inject(SectorChanges).notify();
    await settle();

    expect(list).toHaveBeenCalledWith('ACTIVE');
  });

  it('asks to confirm the deactivation, saying how many cages go with the sector, in a button named by the action', async () => {
    // FR-013 e FR-015: a consequência escrita, com a contagem, e a ação nomeada no botão.
    await render();

    named('Inativar setor Codornas — Galpão 1').click();
    await settle();

    expect(confirmation()?.textContent).toContain('As 48 gaiolas deste setor serão inativadas junto.');
    expect(button('Inativar setor', confirmation()!)).toBeTruthy();
    expect(deactivate).not.toHaveBeenCalled();
  });

  it('names the sector in the question, and keeps the button short enough to sit beside "Cancelar"', async () => {
    // QA N-1: com o nome no botão, um setor de nome longo empurrava o "Cancelar" para fora do diálogo.
    await render();

    named('Inativar setor Codornas — Galpão 1').click();
    await settle();

    expect(confirmation()!.querySelector('h2')?.textContent?.trim()).toBe('Inativar setor Codornas — Galpão 1?');
    expect(button('Inativar setor Codornas — Galpão 1', confirmation()!)).toBeUndefined();
  });

  it('brings back, in the singular, the only cage that leaves with the sector', async () => {
    list.mockResolvedValue(success([{ ...galpao1, activeCageCount: 1 }]));
    await render();

    named('Inativar setor Codornas — Galpão 1').click();
    await settle();

    expect(confirmation()!.querySelector('p')?.textContent?.trim()).toBe(
      'A gaiola ativa deste setor será inativada junto. Nada é apagado: o setor continua consultável pelo filtro de inativos, e reativá-lo traz de volta a gaiola que saiu com ele.',
    );
  });

  it('does not promise to bring back cages that a sector without active cages does not take with it', async () => {
    // QA N-6: sem gaiola ativa, nenhuma sai com o setor, e a reativação não traz nenhuma de volta.
    list.mockResolvedValue(success([galpao1, { ...galpao2, status: 'ACTIVE' }]));
    await render();

    named('Inativar setor Poedeiras brancas — Galpão 2').click();
    await settle();

    expect(confirmation()!.querySelector('p')?.textContent?.trim()).toBe(
      'O setor sai de uso e deixa de receber gaiolas. Nada é apagado: o setor continua consultável pelo filtro de inativos.',
    );
  });

  it('changes nothing when the deactivation is given up', async () => {
    await render();
    named('Inativar setor Codornas — Galpão 1').click();
    await settle();

    button('Cancelar', confirmation()!).click();
    await settle();

    expect(deactivate).not.toHaveBeenCalled();
    expect(confirmation()).toBeNull();
  });

  it('deactivates the sector when confirmed, says so in a toast and asks again', async () => {
    await render();
    named('Inativar setor Codornas — Galpão 1').click();
    await settle();
    list.mockClear();

    button('Inativar setor', confirmation()!).dispatchEvent(new Event('click'));
    await settle();

    expect(deactivate).toHaveBeenCalledWith(galpao1.id);
    expect(toasts()).toEqual(['Setor inativado: Codornas — Galpão 1.']);
    expect(list).toHaveBeenCalledWith('ACTIVE');
  });

  it('reactivates an inactive sector, says so and asks again', async () => {
    await render();
    list.mockClear();

    named('Reativar setor Poedeiras brancas — Galpão 2').click();
    await settle();

    expect(reactivate).toHaveBeenCalledWith(galpao2.id);
    expect(toasts()).toEqual(['Setor reativado: Poedeiras brancas — Galpão 2.']);
    expect(list).toHaveBeenCalled();
  });

  it('shows why the reactivation was refused when another sector took the name', async () => {
    reactivate.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'SECTOR_NAME_IN_USE', field: 'name', message: 'Já existe um setor ativo com este nome.' },
        ]),
      ),
    );
    await render();

    named('Reativar setor Poedeiras brancas — Galpão 2').click();
    await settle();

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'Já existe um setor ativo com este nome.',
    );
  });

  it('offers to deactivate only the active sectors, and to reactivate only the inactive ones', async () => {
    await render();

    expect(named('Reativar setor Codornas — Galpão 1')).toBeNull();
    expect(named('Inativar setor Poedeiras brancas — Galpão 2')).toBeNull();
  });

  it('shows a common user the sectors, their totals, the filter and the way to the cages, and nothing that changes them', async () => {
    // US4, FR-018: o usuário comum consulta; o backend recusa as alterações de qualquer forma, e a tela
    // não oferece um caminho que terminaria em recusa.
    await render(false);

    const first = card('Codornas — Galpão 1');
    expect(first.querySelector('.setor-stats')?.textContent).toContain('2.400');
    expect(group('Situação')).toBeTruthy();
    expect(Array.from(first.querySelectorAll('a')).some((link) => link.textContent?.trim() === 'Gaiolas')).toBe(true);
    expect(Array.from(element().querySelectorAll('a')).some((link) => link.textContent?.trim() === 'Novo setor')).toBe(false);
    expect(named('Editar setor Codornas — Galpão 1')).toBeNull();
    expect(named('Inativar setor Codornas — Galpão 1')).toBeNull();
    expect(named('Reativar setor Poedeiras brancas — Galpão 2')).toBeNull();
  });

  it('does not invite a common user to register the first sector', async () => {
    list.mockResolvedValue(success([]));
    await render(false);

    const empty = element().querySelector('ovyx-empty-state')!;
    expect(empty.textContent).toContain('Nenhum setor ativo');
    expect(empty.querySelector('a')).toBeNull();
  });

  it('says there is no inactive sector without inviting to register one', async () => {
    // QA (D-5): o filtro de inativos vazio dizia "Cadastre o primeiro" com dezenas de setores ativos.
    await render();
    list.mockResolvedValue(success([]));

    button('Inativos').click();
    await settle();

    const empty = element().querySelector('ovyx-empty-state')!;
    expect(empty.textContent).toContain('Nenhum setor inativo');
    expect(empty.textContent).toContain('Os setores inativados aparecem aqui');
    expect(empty.querySelector('a')).toBeNull();
  });

  it('announces how many sectors were found', async () => {
    // QA (D-6): trocar o filtro não dizia nada ao leitor de tela.
    await render();

    expect(element().querySelector('[role="status"]')?.textContent).toContain('2 setores encontrados.');
  });

  it('names each way to the cages by its sector', async () => {
    await render();

    const cages = Array.from(card('Codornas — Galpão 1').querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Gaiolas',
    );
    expect(cages?.getAttribute('aria-label')).toBe('Gaiolas do setor Codornas — Galpão 1');
  });

  it('offers the card to add a sector at the end of the grid to an administrator, and not to a common user', async () => {
    await render();

    const add = element().querySelector<HTMLAnchorElement>('.setores a.setor.add');
    expect(add?.getAttribute('href')).toBe('/setores/novo');
    expect(add?.textContent).toContain('Adicionar setor');
  });

  it('does not offer the card to add a sector to a common user', async () => {
    await render(false);

    expect(element().querySelector('.setores a.setor.add')).toBeNull();
  });

  it('takes the focus to the edition of the same sector after reactivating it', async () => {
    await render();
    list.mockResolvedValue(success([galpao1, { ...galpao2, status: 'ACTIVE' }]));

    named('Reativar setor Poedeiras brancas — Galpão 2').click();
    await settle();
    await settle();

    expect(document.activeElement).toBe(named('Editar setor Poedeiras brancas — Galpão 2'));
  });

  it('takes the focus to the list when the deactivated sector leaves it', async () => {
    await render();
    named('Inativar setor Codornas — Galpão 1').click();
    await settle();
    list.mockResolvedValue(success([galpao2]));

    button('Inativar setor', confirmation()!).dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(document.activeElement).toBe(element().querySelector('.setores'));
  });

  it('names the grid, so that the focus that lands on it says where it is', async () => {
    await render();

    const grid = element().querySelector('.setores')!;

    expect(grid.getAttribute('role')).toBe('region');
    expect(grid.getAttribute('aria-label')).toBe('Lista de setores');
  });

  it('takes the focus to the empty state when the last sector of the list is deactivated', async () => {
    // QA N-4: sem cartão e sem grade, o foco caía no corpo da página.
    list.mockResolvedValue(success([galpao1]));
    await render();
    named('Inativar setor Codornas — Galpão 1').click();
    await settle();
    list.mockResolvedValue(success([]));

    button('Inativar setor', confirmation()!).dispatchEvent(new Event('click'));
    await settle();
    await settle();

    const empty = element().querySelector<HTMLElement>('[data-empty]');
    expect(document.activeElement).toBe(empty);
    expect(empty?.getAttribute('aria-label')).toBe('Nenhum setor ativo');
  });
});
