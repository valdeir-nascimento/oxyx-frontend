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
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { EmptyState } from '../../../../shared/presentation/ui/empty-state/empty-state';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { IconButton } from '../../../../shared/presentation/ui/icon-button/icon-button';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { SegmentedControl } from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import { StatusBadge } from '../../../../shared/presentation/ui/status-badge/status-badge';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { DeactivateFeedFormulaUseCase } from '../../../application/formula/deactivate-feed-formula.usecase';
import { ListFeedFormulasUseCase } from '../../../application/formula/list-feed-formulas.usecase';
import { ReactivateFeedFormulaUseCase } from '../../../application/formula/reactivate-feed-formula.usecase';
import { FeedFormula } from '../../../domain/feed-formula';
import { StatusFilter } from '../../../domain/status';
import {
  FORMULA_STATUS_OPTIONS,
  countOf,
  formulaStatusLabelOf,
  moneyOf,
  statusToneOf,
} from '../../labels/labels';
import { FormulaChanges } from '../formula-changes';

/** O título do estado vazio, conforme a situação escolhida. */
const EMPTY_TITLES: Readonly<Record<StatusFilter, string>> = {
  ACTIVE: 'Nenhuma fórmula ativa',
  INACTIVE: 'Nenhuma fórmula inativa',
  ALL: 'Nenhuma fórmula cadastrada',
};

/** O convite a cadastrar, para quem pode. */
const REGISTER_INVITATION =
  'Uma fórmula é a ração que a granja compra, com o preço por quilo e o consumo esperado por ave. Cadastre a primeira para lançar a ração dos relatórios.';

/** A consequência da inativação, escrita no diálogo de confirmação (R-013 da 004). */
const DEACTIVATION_CONSEQUENCE =
  'A fórmula deixa de ser oferecida nos lançamentos novos; os lançamentos que já a usam continuam com o preço deles.';

/**
 * Lista das fórmulas de ração, em tabela como no protótipo (US1 da 004; FR-001 a FR-006; R-013): cada
 * fórmula com a descrição, o preço por quilo, o consumo esperado, o custo por ave ao dia e a situação, e
 * o filtro de situação, que começa nas ativas.
 *
 * O cadastro e a edição abrem em diálogo sobre a lista, pelas rotas filhas `nova` e `:formulaId`; quando
 * eles gravam, avisam por `FormulaChanges`, e a lista busca de novo.
 *
 * Inativar pede confirmação num diálogo modal, com a consequência escrita e a ação nomeada no botão.
 * Reativar não pede: a fórmula volta a ser oferecida, e nada sai de uso.
 *
 * O usuário comum vê as fórmulas e o filtro, e nenhuma ação que altere (FR-006): o backend as recusaria
 * de qualquer forma.
 *
 * Do protótipo ficam de fora a coluna "Usada em" e a exclusão: nada é apagado, e o backend não diz onde a
 * fórmula é usada.
 */
@Component({
  selector: 'ovyx-formula-list-page',
  imports: [
    ConfirmDialog,
    DataTable,
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
  templateUrl: './formula-list-page.html',
  styleUrl: './formula-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaListPage {
  private readonly listFormulas = inject(ListFeedFormulasUseCase);
  private readonly deactivateFormula = inject(DeactivateFeedFormulaUseCase);
  private readonly reactivateFormula = inject(ReactivateFeedFormulaUseCase);
  private readonly toaster = inject(Toaster);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Se quem vê pode alterar as fórmulas: só o administrador (FR-006). */
  protected readonly canChange = inject(VIEWER).isAdministrator;

  protected readonly statusOptions = FORMULA_STATUS_OPTIONS;
  protected readonly statusLabelOf = formulaStatusLabelOf;
  protected readonly statusToneOf = statusToneOf;
  protected readonly moneyOf = moneyOf;
  protected readonly countOf = countOf;
  protected readonly deactivationConsequence = DEACTIVATION_CONSEQUENCE;

  protected readonly status = signal<StatusFilter>('ACTIVE');
  protected readonly formulas = signal<readonly FeedFormula[]>([]);
  protected readonly loading = signal(true);
  protected readonly refusal = signal(Notification.empty());
  protected readonly confirming = signal<FeedFormula | null>(null);
  protected readonly deactivating = signal(false);

  protected readonly emptyTitle = computed(() => EMPTY_TITLES[this.status()]);

  /**
   * O próximo passo do estado vazio: o filtro de inativas não convida a cadastrar, e quem não pode
   * cadastrar lê onde as fórmulas vão aparecer.
   */
  protected readonly emptyMessage = computed(() => {
    if (this.status() === 'INACTIVE') {
      return 'As fórmulas inativadas aparecem aqui, com todos os dados que tinham.';
    }
    return this.canChange()
      ? REGISTER_INVITATION
      : 'As fórmulas que o administrador cadastrar aparecem aqui.';
  });

  /** O convite a cadastrar aparece só onde faz sentido: para quem pode, e fora do filtro de inativas. */
  protected readonly invitesToRegister = computed(
    () => this.canChange() && this.status() !== 'INACTIVE',
  );

  /**
   * O que a região de estado anuncia a cada carga: o total encontrado, ou que não há nenhuma. Ela fica
   * fora da tabela, que some quando a lista fica vazia.
   */
  protected readonly announcement = computed(() => {
    if (this.loading()) {
      return 'Carregando fórmulas…';
    }
    const total = this.formulas().length;
    if (total === 0) {
      return `${this.emptyTitle()}.`;
    }
    return total === 1 ? '1 fórmula encontrada.' : `${countOf(total)} fórmulas encontradas.`;
  });

  constructor() {
    // A primeira carga, e cada gravação do diálogo: a lista busca de novo a situação em que está.
    const changes = inject(FormulaChanges).version;
    effect(() => {
      changes();
      untracked(() => void this.load());
    });
  }

  protected async deactivate(formula: FeedFormula): Promise<void> {
    this.deactivating.set(true);
    const result = await this.deactivateFormula.execute(formula.id);
    this.deactivating.set(false);
    this.confirming.set(null);

    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.toaster.show(`Fórmula inativada: ${formula.name}.`);
    await this.load();
    this.focusRowAfterRender(formula);
  }

  protected async reactivate(formula: FeedFormula): Promise<void> {
    const result = await this.reactivateFormula.execute(formula.id);
    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.toaster.show(`Fórmula reativada: ${formula.name}.`);
    await this.load();
    this.focusRowAfterRender(formula);
  }

  /**
   * Depois de inativar ou reativar, o foco vai para a ação de editar da mesma linha. Se a linha saiu da
   * lista — o filtro mostra só uma situação —, vai para a tabela; e, se a lista ficou sem fórmula, para o
   * estado vazio.
   */
  private focusRowAfterRender(formula: FeedFormula): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target =
          root.querySelector<HTMLElement>(`tr[data-formula="${formula.id}"] a.icon-btn`) ??
          root.querySelector<HTMLElement>('.tbl-wrap') ??
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
    const result = await this.listFormulas.execute(this.status());
    this.loading.set(false);

    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.refusal.set(Notification.empty());
    this.formulas.set(result.value);
  }
}
