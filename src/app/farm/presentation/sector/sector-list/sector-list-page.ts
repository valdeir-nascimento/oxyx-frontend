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
import { RouterLink, RouterOutlet } from '@angular/router';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import { ConfirmDialog } from '../../../../shared/presentation/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/presentation/ui/empty-state/empty-state';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { IconButton } from '../../../../shared/presentation/ui/icon-button/icon-button';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { SegmentedControl } from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import { StatusBadge } from '../../../../shared/presentation/ui/status-badge/status-badge';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { DeactivateSectorUseCase } from '../../../application/sector/deactivate-sector.usecase';
import { ListSectorsUseCase } from '../../../application/sector/list-sectors.usecase';
import { ReactivateSectorUseCase } from '../../../application/sector/reactivate-sector.usecase';
import { SectorSummary } from '../../../domain/sector';
import { StatusFilter } from '../../../domain/status';
import { SECTOR_STATUS_OPTIONS, countOf, sectorStatusLabelOf, statusToneOf } from '../../labels/labels';
import { SectorChanges } from '../sector-changes';

/** O título do estado vazio, conforme a situação escolhida. */
const EMPTY_TITLES: Readonly<Record<StatusFilter, string>> = {
  ACTIVE: 'Nenhum setor ativo',
  INACTIVE: 'Nenhum setor inativo',
  ALL: 'Nenhum setor cadastrado',
};

/** O convite a cadastrar, para quem pode. */
const REGISTER_INVITATION =
  'Um setor é um galpão, uma espécie ou um lote que você acompanha separado. Cadastre o primeiro para lançar as gaiolas dele.';

/**
 * Lista de setores em cartões, como no protótipo (US1; FR-004, FR-005, FR-020): cada setor com a
 * situação e os totais das gaiolas ativas, e o filtro de situação, que começa nos ativos.
 *
 * O cadastro e a edição abrem em diálogo sobre a lista, pelas rotas filhas `novo` e `:sectorId`;
 * quando eles gravam, avisam por `SectorChanges`, e a lista busca de novo.
 *
 * Inativar pede confirmação num diálogo modal, com a consequência escrita — quantas gaiolas vão junto —
 * e a ação nomeada no botão (FR-013, FR-015); o nome do setor fica na pergunta, e não no botão, que
 * com um nome longo empurrava o "Cancelar" para fora do diálogo. Reativar não pede: não tira nada de uso, e o backend
 * recusa, com o motivo, quando outro setor ativo tomou o nome (FR-016).
 *
 * O usuário comum vê os setores, os totais, o filtro e o caminho para as gaiolas, e nenhuma ação que
 * altere (US4, FR-018): o backend as recusaria de qualquer forma.
 *
 * Depois de inativar ou reativar, o foco vai para a ação de editar do mesmo cartão; para a grade, se o
 * cartão saiu da lista; ou para o estado vazio, se a lista ficou sem setor.
 *
 * Do protótipo ficam de fora os ovos do dia, o status dos relatórios e o botão de relatórios: vêm com
 * as features que os trazem (spec, Assumptions).
 */
@Component({
  selector: 'ovyx-sector-list-page',
  imports: [
    ConfirmDialog,
    EmptyState,
    ErrorSummary,
    Icon,
    IconButton,
    PageHeader,
    RouterLink,
    RouterOutlet,
    SegmentedControl,
    StatusBadge,
  ],
  templateUrl: './sector-list-page.html',
  styleUrl: './sector-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectorListPage {
  private readonly listSectors = inject(ListSectorsUseCase);
  private readonly deactivateSector = inject(DeactivateSectorUseCase);
  private readonly reactivateSector = inject(ReactivateSectorUseCase);
  private readonly toaster = inject(Toaster);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Se quem vê pode alterar os setores: só o administrador (FR-018). */
  protected readonly canChange = inject(VIEWER).isAdministrator;

  protected readonly statusOptions = SECTOR_STATUS_OPTIONS;
  protected readonly statusLabelOf = sectorStatusLabelOf;
  protected readonly statusToneOf = statusToneOf;
  protected readonly countOf = countOf;

  protected readonly status = signal<StatusFilter>('ACTIVE');
  protected readonly sectors = signal<readonly SectorSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly refusal = signal(Notification.empty());
  protected readonly confirming = signal<SectorSummary | null>(null);
  protected readonly deactivating = signal(false);

  protected readonly emptyTitle = computed(() => EMPTY_TITLES[this.status()]);

  /**
   * O próximo passo do estado vazio: o filtro de inativos não convida a cadastrar, e quem não pode
   * cadastrar lê onde os setores vão aparecer.
   */
  protected readonly emptyMessage = computed(() => {
    if (this.status() === 'INACTIVE') {
      return 'Os setores inativados aparecem aqui, com todos os dados que tinham.';
    }
    return this.canChange() ? REGISTER_INVITATION : 'Os setores que o administrador cadastrar aparecem aqui.';
  });

  /** O convite a cadastrar aparece só onde faz sentido: para quem pode, e fora do filtro de inativos. */
  protected readonly invitesToRegister = computed(() => this.canChange() && this.status() !== 'INACTIVE');

  /** O que a região de estado anuncia a cada carga: o total encontrado. */
  protected readonly announcement = computed(() => {
    if (this.loading()) {
      return 'Carregando setores…';
    }
    const total = this.sectors().length;
    return total === 0 ? this.emptyTitle() + '.' : total === 1 ? '1 setor encontrado.' : `${total} setores encontrados.`;
  });

  constructor() {
    // A primeira carga, e cada gravação do diálogo: a lista busca de novo a situação em que está.
    const changes = inject(SectorChanges).version;
    effect(() => {
      changes();
      untracked(() => void this.load());
    });
  }

  /**
   * A consequência escrita da inativação, com a contagem das gaiolas que vão junto (FR-015). Sem gaiola
   * ativa, nenhuma sai com o setor, e a reativação não tem o que trazer de volta.
   */
  protected consequenceOf(sector: SectorSummary): string {
    const count = sector.activeCageCount;
    const kept = 'Nada é apagado: o setor continua consultável pelo filtro de inativos';
    if (count === 0) {
      return `O setor sai de uso e deixa de receber gaiolas. ${kept}.`;
    }
    return count === 1
      ? `A gaiola ativa deste setor será inativada junto. ${kept}, e reativá-lo traz de volta a gaiola que saiu com ele.`
      : `As ${countOf(count)} gaiolas deste setor serão inativadas junto. ${kept}, e reativá-lo traz de volta as gaiolas que saíram com ele.`;
  }

  protected async deactivate(sector: SectorSummary): Promise<void> {
    this.deactivating.set(true);
    const result = await this.deactivateSector.execute(sector.id);
    this.deactivating.set(false);
    this.confirming.set(null);

    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.toaster.show(`Setor inativado: ${sector.name}.`);
    await this.load();
    this.focusCardAfterRender(sector);
  }

  protected async reactivate(sector: SectorSummary): Promise<void> {
    const result = await this.reactivateSector.execute(sector.id);
    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.toaster.show(`Setor reativado: ${sector.name}.`);
    await this.load();
    this.focusCardAfterRender(sector);
  }

  /**
   * Depois de inativar ou reativar, o foco vai para a ação de editar do mesmo cartão. Se o cartão saiu
   * da lista — o filtro mostra só uma situação —, vai para a grade, que é onde a pessoa estava; e, se a
   * lista ficou sem setor, para o estado vazio, que diz o que houve.
   */
  private focusCardAfterRender(sector: SectorSummary): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target =
          root.querySelector<HTMLElement>(`article[data-sector="${sector.id}"] a.icon-btn`) ??
          root.querySelector<HTMLElement>('.setores') ??
          root.querySelector<HTMLElement>('[data-empty]');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  protected filterByStatus(status: string): void {
    this.status.set(status as StatusFilter);
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const result = await this.listSectors.execute(this.status());
    this.loading.set(false);

    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.refusal.set(Notification.empty());
    this.sectors.set(result.value);
  }
}
