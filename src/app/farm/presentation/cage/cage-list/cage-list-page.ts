import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { ConfirmDialog } from '../../../../shared/presentation/ui/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { EmptyState } from '../../../../shared/presentation/ui/empty-state/empty-state';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { IconButton } from '../../../../shared/presentation/ui/icon-button/icon-button';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { Pager } from '../../../../shared/presentation/ui/pager/pager';
import { SearchField } from '../../../../shared/presentation/ui/search-field/search-field';
import {
  SegmentOption,
  SegmentedControl,
} from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import { StatusBadge } from '../../../../shared/presentation/ui/status-badge/status-badge';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { DeactivateCageUseCase } from '../../../application/cage/deactivate-cage.usecase';
import { ReactivateCageUseCase } from '../../../application/cage/reactivate-cage.usecase';
import { SearchCagesUseCase } from '../../../application/cage/search-cages.usecase';
import { FindSectorByIdUseCase } from '../../../application/sector/find-sector-by-id.usecase';
import { CagePage, CageSummary } from '../../../domain/cage';
import { Sector } from '../../../domain/sector';
import { StatusFilter } from '../../../domain/status';
import { CAGE_STATUS_OPTIONS, cageStatusLabelOf, countOf, statusToneOf } from '../../labels/labels';
import { CageChanges } from '../cage-changes';

const PAGE_SIZE = 20;
const SECTOR_NOT_FOUND = 'SECTOR_NOT_FOUND';

/** Os filtros de uma pesquisa: o trecho do código, a bateria (vazia para todas) e a situação. */
interface Filters {
  readonly code: string;
  readonly battery: string;
  readonly status: StatusFilter;
}

const NO_FILTERS: Filters = { code: '', battery: '', status: 'ACTIVE' };

/**
 * Gaiolas de um setor (US2; FR-010, FR-011, FR-020): o cabeçalho com os totais do setor, a tabela do
 * design system, a busca pelo código, o filtro de bateria — as baterias que as gaiolas do setor usam
 * —, o de situação e as páginas.
 *
 * O cadastro e a edição abrem em diálogo sobre a lista, pelas rotas filhas `nova` e `:cageId`;
 * quando eles gravam, avisam por `CageChanges`, e a lista busca de novo a página e os totais.
 *
 * As páginas seguem os filtros da última pesquisa feita, e não o que está digitado e ainda não foi
 * pesquisado. Escolher a bateria ou a situação já é pesquisar, com o código que estiver no campo.
 *
 * Inativar uma gaiola pede confirmação, com a consequência escrita e a ação nomeada no botão (FR-013);
 * reativar não pede. Num setor inativo, a lista só consulta: nada de gaiola nova, edição ou
 * reativação, e um aviso diz que o setor precisa ser reativado antes (FR-014, FR-015).
 *
 * O usuário comum vê as gaiolas, os totais, a busca e os filtros, e nenhuma ação que altere (US4,
 * FR-018).
 *
 * "Setor sem gaiola" é o setor sem gaiola nenhuma, ativa ou inativa: o que não tem gaiola ativa — o
 * setor inativo, ou o que teve a única gaiola inativada — continua com a busca e os filtros, e as
 * inativas ficam ao alcance pelo filtro de situação (FR-012). Depois de inativar ou reativar, o foco
 * vai para a ação de editar da mesma linha, ou para a tabela, se a linha saiu da lista.
 *
 * O setor pode ser inativado por outro administrador com a lista aberta. Quando a lista descobre —
 * pelo guard dos diálogos ou pela recusa de um deles —, busca de novo e mostra o aviso; se o foco
 * estava numa ação que sumiu, vai para o aviso (QA N-7), e o mesmo ao fechar o diálogo recusado, cuja
 * ação de abrir também sumiu (QA N-8).
 *
 * Do protótipo ficam de fora a faixa de peso de referência e os ovos do dia: vêm com as features de
 * peso e de produção (spec, Assumptions).
 */
@Component({
  selector: 'ovyx-cage-list-page',
  imports: [
    Alert,
    Button,
    ConfirmDialog,
    DataTable,
    EmptyState,
    ErrorSummary,
    Icon,
    IconButton,
    PageHeader,
    Pager,
    RouterLink,
    RouterOutlet,
    SearchField,
    SegmentedControl,
    StatusBadge,
  ],
  templateUrl: './cage-list-page.html',
  styleUrl: './cage-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CageListPage {
  private readonly searchCages = inject(SearchCagesUseCase);
  private readonly findSector = inject(FindSectorByIdUseCase);
  private readonly deactivateCage = inject(DeactivateCageUseCase);
  private readonly reactivateCage = inject(ReactivateCageUseCase);
  private readonly toaster = inject(Toaster);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** O setor do endereço. */
  protected readonly sectorId = inject(ActivatedRoute).snapshot.paramMap.get('sectorId') ?? '';

  /** Se quem vê pode alterar as gaiolas: só o administrador, e só num setor ativo (FR-014, FR-018). */
  private readonly administrator = inject(VIEWER).isAdministrator;

  protected readonly statusOptions = CAGE_STATUS_OPTIONS;
  protected readonly statusLabelOf = cageStatusLabelOf;
  protected readonly statusToneOf = statusToneOf;
  protected readonly countOf = countOf;

  protected readonly filters = inject(FormBuilder).nonNullable.group({ code: '' });
  protected readonly battery = signal('');
  protected readonly status = signal<StatusFilter>('ACTIVE');

  protected readonly sector = signal<Sector | null>(null);
  protected readonly missing = signal(false);
  protected readonly page = signal<CagePage>({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
  protected readonly loading = signal(true);
  protected readonly refusal = signal(Notification.empty());
  protected readonly confirming = signal<CageSummary | null>(null);
  protected readonly deactivating = signal(false);

  /** Setor inativo não tem gaiola ativa: a lista só consulta (invariante 3). */
  protected readonly sectorInactive = computed(() => this.sector()?.status === 'INACTIVE');

  protected readonly canChange = computed(() => this.administrator() && !this.sectorInactive());

  /** O aviso do setor inativo, conforme quem vê: só o administrador pode reativá-lo. */
  protected readonly inactiveNotice = computed(() =>
    this.administrator()
      ? 'O setor está inativo. Reative o setor antes de mexer nas gaiolas dele.'
      : 'O setor está inativo: as gaiolas dele ficam só para consulta.',
  );

  /** A legenda da tabela, com o setor: é o que o leitor de tela anuncia ao entrar nela. */
  protected readonly caption = computed(() => {
    const sector = this.sector();
    return sector ? `Gaiolas do setor ${sector.name}` : 'Gaiolas do setor';
  });

  /** Os filtros da última pesquisa feita. */
  private readonly searched = signal<Filters>(NO_FILTERS);

  protected readonly batteryOptions = computed<readonly SegmentOption[]>(() => [
    { value: '', label: 'Todas' },
    ...(this.sector()?.batteries ?? []).map((battery) => ({ value: battery, label: battery })),
  ]);

  /** Os totais do setor, no cabeçalho (FR-011). */
  protected readonly subtitle = computed(() => {
    const sector = this.sector();
    if (!sector) {
      return '';
    }
    const cages = sector.activeCageCount === 1 ? '1 gaiola ativa' : `${countOf(sector.activeCageCount)} gaiolas ativas`;
    const birds = sector.birdCount === 1 ? '1 ave' : `${countOf(sector.birdCount)} aves`;
    return `${cages} · ${birds}`;
  });

  /**
   * O setor não tem gaiola nenhuma, ativa ou inativa — nenhuma bateria em uso. Sem gaiola ativa não
   * basta: as inativas continuam consultáveis pelo filtro de situação (FR-012).
   */
  protected readonly emptySector = computed(() => {
    const sector = this.sector();
    return sector !== null && sector.batteries.length === 0 && !this.refusal().hasErrors;
  });

  /** O próximo passo do setor sem gaiola, conforme a situação dele e quem vê. */
  protected readonly emptySectorMessage = computed(() => {
    if (this.sectorInactive()) {
      return 'O setor está inativo e não recebe gaiolas novas.';
    }
    return this.administrator()
      ? 'Cadastre as gaiolas com bateria, número e quantidade de aves para começar a lançar a produção.'
      : 'As gaiolas que o administrador cadastrar aparecem aqui.';
  });

  /** Se a última pesquisa filtrou alguma coisa: é o que o "Limpar busca" desfaz. */
  protected readonly filtered = computed(() => {
    const filters = this.searched();
    return filters.code.trim() !== '' || filters.battery !== '' || filters.status !== 'ACTIVE';
  });

  /** O estado vazio da busca diz o que foi buscado e como corrigir. */
  protected readonly emptyMessage = computed(() => {
    const code = this.searched().code.trim();
    return code
      ? `Nada corresponde a "${code}". Confira o código, busque por um trecho dele ou escolha outra bateria ou situação.`
      : 'Escolha outra bateria ou outra situação.';
  });

  /** O total da pesquisa, dito pela região de estado da tabela quando há linhas. */
  protected readonly found = computed(() => {
    const total = this.page().totalElements;
    return total === 1 ? '1 gaiola encontrada.' : `${countOf(total)} gaiolas encontradas.`;
  });

  constructor() {
    // A primeira carga, e cada gravação do diálogo: a lista busca de novo a página em que está e os
    // totais do setor. Só a versão é dependência.
    const changes = inject(CageChanges).version;
    effect(() => {
      changes();
      untracked(() => {
        void this.loadSector();
        void this.load(this.page().page);
      });
    });
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.searchWith(this.battery(), this.status());
  }

  protected filterByBattery(battery: string): void {
    this.battery.set(battery);
    this.searchWith(battery, this.status());
  }

  protected filterByStatus(status: string): void {
    this.status.set(status as StatusFilter);
    this.searchWith(this.battery(), status as StatusFilter);
  }

  protected goTo(page: number): void {
    void this.load(page);
  }

  /**
   * Volta à pesquisa padrão: sem código, todas as baterias e só as ativas. O botão some com a busca que
   * desfaz, e o foco vai para o campo de busca, onde a próxima pesquisa começa.
   */
  protected clearSearch(): void {
    this.filters.controls.code.setValue('');
    this.battery.set('');
    this.status.set('ACTIVE');
    this.searchWith('', 'ACTIVE');
    this.host.nativeElement.querySelector<HTMLInputElement>('#code')?.focus();
  }

  protected async deactivate(cage: CageSummary): Promise<void> {
    this.deactivating.set(true);
    const result = await this.deactivateCage.execute(this.sectorId, cage.id);
    this.deactivating.set(false);
    this.confirming.set(null);

    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.toaster.show(`Gaiola inativada: ${cage.code}.`);
    await this.reload();
    this.focusRowAfterRender(cage);
  }

  protected async reactivate(cage: CageSummary): Promise<void> {
    const result = await this.reactivateCage.execute(this.sectorId, cage.id);
    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.toaster.show(`Gaiola reativada: ${cage.code}.`);
    await this.reload();
    this.focusRowAfterRender(cage);
  }

  /**
   * Depois de inativar ou reativar, o foco vai para a ação de editar da mesma linha. Se a linha saiu da
   * lista — o filtro mostra só as ativas —, vai para a tabela, que é onde a pessoa estava.
   */
  private focusRowAfterRender(cage: CageSummary): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target =
          root.querySelector<HTMLElement>(`tr[data-cage="${cage.id}"] a.icon-btn`) ??
          root.querySelector<HTMLElement>('.tbl-wrap');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  /** A página em que a lista está e os totais do setor, que a inativação e a reativação mudam. */
  private async reload(): Promise<void> {
    await Promise.all([this.loadSector(), this.load(this.page().page)]);
  }

  private searchWith(battery: string, status: StatusFilter): void {
    this.searched.set({ code: this.filters.controls.code.value, battery, status });
    void this.load(0);
  }

  private async loadSector(): Promise<void> {
    const result = await this.findSector.execute(this.sectorId);
    if (!result.success) {
      const missing = result.notification.errors.some((error) => error.code === SECTOR_NOT_FOUND);
      this.missing.set(missing);
      if (!missing) {
        this.refusal.set(result.notification);
      }
      return;
    }
    const turnedInactive = this.sector()?.status === 'ACTIVE' && result.value.status === 'INACTIVE';
    this.sector.set(result.value);
    if (turnedInactive) {
      this.focusNoticeAfterRender();
    }
  }

  /**
   * O diálogo de gaiola fechou. Se o setor se revelou inativo com ele aberto — a gravação recusada com
   * SECTOR_INACTIVE —, a ação que o abriu sumiu, e o FocusTrap não tem a quem devolver o foco: ele vai
   * para o aviso. Num setor ativo, quem devolve o foco é o FocusTrap.
   */
  protected dialogClosed(): void {
    if (this.sectorInactive()) {
      this.focusNoticeAfterRender();
    }
  }

  /**
   * O setor se revelou inativo com a lista aberta, e as ações dela somem. Se o foco estava numa delas,
   * ele cai no corpo da página: vai para o aviso, que diz o que houve. Foco que continua em algum
   * lugar — o resumo do diálogo recusado, o campo de busca — fica onde está.
   */
  private focusNoticeAfterRender(): void {
    afterNextRender(
      () => {
        const focused = document.activeElement;
        if (!focused || focused === document.body) {
          this.host.nativeElement.querySelector<HTMLElement>('[data-inactive-notice]')?.focus();
        }
      },
      { injector: this.injector },
    );
  }

  private async load(page: number): Promise<void> {
    this.loading.set(true);
    const result = await this.searchCages.execute(this.sectorId, { ...this.searched(), page, size: PAGE_SIZE });
    this.loading.set(false);

    if (!result.success) {
      // O setor que não existe já aparece como tal; a recusa da pesquisa não repete o aviso.
      if (!result.notification.errors.some((error) => error.code === SECTOR_NOT_FOUND)) {
        this.refusal.set(result.notification);
      }
      return;
    }
    // A inativação pode esvaziar a última página: a lista volta para a última que ainda tem gaiolas.
    if (result.value.content.length === 0 && page > 0) {
      await this.load(Math.max(result.value.totalPages - 1, 0));
      return;
    }
    this.refusal.set(Notification.empty());
    this.page.set(result.value);
  }
}
