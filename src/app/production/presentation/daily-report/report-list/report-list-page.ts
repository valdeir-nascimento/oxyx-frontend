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
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { EmptyState } from '../../../../shared/presentation/ui/empty-state/empty-state';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { Pager } from '../../../../shared/presentation/ui/pager/pager';
import { ListDailyReportsUseCase } from '../../../application/daily-report/list-daily-reports.usecase';
import { DailyReportPage, DailyReportSearch, DailyReportSummary } from '../../../domain/daily-report';
import {
  INACTIVE_SECTOR_NOTICE,
  countOf,
  dayOf,
  dayWithWeekdayOf,
  mortalityLabelOf,
  productionLabelOf,
} from '../../labels/labels';
import { ReportChanges } from '../report-changes';

const PAGE_SIZE = 20;
const SECTOR_NOT_FOUND = 'SECTOR_NOT_FOUND';

/**
 * Os relatórios diários de um setor (US1 e US4; FR-016, FR-017, FR-020), como a tela do protótipo: do
 * dia mais recente para o mais antigo, com a produção, as aves removidas, o saldo e o que falta lançar
 * em cada relatório, o filtro por dia e as páginas.
 *
 * A abertura do relatório do dia abre em diálogo sobre a lista, pela rota filha `novo`; quando ele
 * grava, avisa por `ReportChanges`, e a lista busca de novo. Qualquer responsável abre relatório
 * (FR-019); num setor inativo, a lista só consulta, com o aviso (FR-020). Se o setor se revela inativo
 * com a lista aberta — o guard do diálogo descobriu —, o aviso aparece, e o foco vai para ele se estava
 * numa ação que sumiu.
 *
 * As páginas seguem o dia da última busca feita, e não o que está no campo e ainda não foi buscado.
 *
 * Do protótipo ficam de fora a ração e o custo, que vêm com a feature de fórmulas (spec, Assumptions).
 */
@Component({
  selector: 'ovyx-report-list-page',
  imports: [
    Alert,
    Button,
    DataTable,
    EmptyState,
    ErrorSummary,
    FormField,
    Icon,
    PageHeader,
    Pager,
    RouterLink,
    RouterOutlet,
  ],
  templateUrl: './report-list-page.html',
  styleUrl: './report-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportListPage {
  private readonly listReports = inject(ListDailyReportsUseCase);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** O setor do endereço. */
  protected readonly sectorId = inject(ActivatedRoute).snapshot.paramMap.get('sectorId') ?? '';

  protected readonly countOf = countOf;
  protected readonly dayOf = dayOf;
  protected readonly dayWithWeekdayOf = dayWithWeekdayOf;
  protected readonly productionLabelOf = productionLabelOf;
  protected readonly mortalityLabelOf = mortalityLabelOf;
  protected readonly inactiveNotice = INACTIVE_SECTOR_NOTICE;

  /**
   * O dia da busca. O id do campo não é `collectionDate`: o diálogo do relatório novo abre sobre a lista,
   * com o campo dele, e dois ids iguais levavam o rótulo e o resumo de erros do diálogo à busca, atrás do
   * modal (QA D-01 da 003).
   */
  protected readonly filters = inject(FormBuilder).nonNullable.group({ collectionDate: '' });
  /** O dia da última busca feita; vazio, todos os relatórios. */
  protected readonly searchedDate = signal('');

  protected readonly page = signal<DailyReportPage | null>(null);
  protected readonly loading = signal(true);
  protected readonly missing = signal(false);
  protected readonly refusal = signal(Notification.empty());

  /** O setor inativo só consulta: nada de relatório novo (FR-020). */
  protected readonly sectorInactive = computed(() => this.page()?.sector.status === 'INACTIVE');

  protected readonly canOpen = computed(() => !this.missing() && this.page() !== null && !this.sectorInactive());

  protected readonly reports = computed<readonly DailyReportSummary[]>(() => this.page()?.content ?? []);

  /** O setor sem relatório nenhum — e não a busca de um dia que não tem. */
  protected readonly neverOpened = computed(
    () => this.page()?.totalElements === 0 && this.searchedDate() === '' && !this.loading(),
  );

  /** A legenda da tabela, com o setor: é o que o leitor de tela anuncia ao entrar nela. */
  protected readonly caption = computed(() => {
    const sector = this.page()?.sector;
    return sector ? `Relatórios do setor ${sector.name}` : 'Relatórios do setor';
  });

  /** O próximo passo do setor sem relatório, conforme a situação dele. */
  protected readonly emptyMessage = computed(() =>
    this.sectorInactive()
      ? 'O setor está inativo e não recebe relatórios novos.'
      : 'Abra o primeiro relatório do dia para lançar a produção e a mortalidade deste setor.',
  );

  /** O estado vazio da busca por dia diz o dia buscado. */
  protected readonly searchEmptyTitle = computed(() => {
    const date = this.searchedDate();
    return date ? `Nenhum relatório em ${dayOf(date)}` : 'Nenhum relatório';
  });

  /** O total, dito pela região de estado da tabela quando há linhas. */
  protected readonly found = computed(() => {
    const total = this.page()?.totalElements ?? 0;
    return total === 1 ? '1 relatório encontrado.' : `${countOf(total)} relatórios encontrados.`;
  });

  constructor() {
    // A primeira carga, e cada gravação do diálogo: a lista busca de novo a página em que está.
    const changes = inject(ReportChanges).version;
    effect(() => {
      changes();
      untracked(() => void this.load(this.page()?.page ?? 0));
    });
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.searchedDate.set(this.filters.controls.collectionDate.value);
    void this.load(0);
  }

  /** Volta a todos os relatórios; o foco vai para o campo do dia, onde a próxima busca começa. */
  protected clear(): void {
    this.filters.controls.collectionDate.setValue('');
    this.searchedDate.set('');
    void this.load(0);
    this.host.nativeElement.querySelector<HTMLInputElement>('#searchedDay')?.focus();
  }

  protected goTo(page: number): void {
    void this.load(page);
  }

  private async load(page: number): Promise<void> {
    const date = this.searchedDate();
    const search: DailyReportSearch = date
      ? { collectionDate: date, page, size: PAGE_SIZE }
      : { page, size: PAGE_SIZE };
    this.loading.set(true);
    const result = await this.listReports.execute(this.sectorId, search);
    this.loading.set(false);

    if (!result.success) {
      const missing = result.notification.errors.some((error) => error.code === SECTOR_NOT_FOUND);
      this.missing.set(missing);
      this.refusal.set(missing ? Notification.empty() : result.notification);
      return;
    }
    const turnedInactive =
      this.page()?.sector.status === 'ACTIVE' && result.value.sector.status === 'INACTIVE';
    this.refusal.set(Notification.empty());
    this.page.set(result.value);
    if (turnedInactive) {
      this.focusNoticeAfterRender();
    }
  }

  /**
   * O setor se revelou inativo com a lista aberta, e o "Novo relatório" some. Se o foco estava nele, ele
   * cai no corpo da página: vai para o aviso, que diz o que houve.
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
}
