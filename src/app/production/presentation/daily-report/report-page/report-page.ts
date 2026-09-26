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
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { TabLink, TabNav } from '../../../../shared/presentation/ui/tab-nav/tab-nav';
import { FindDailyReportUseCase } from '../../../application/daily-report/find-daily-report.usecase';
import {
  INACTIVE_SECTOR_NOTICE,
  countOf,
  dateTimeAtTheFarmOf,
  dayOf,
  mortalityLabelOf,
  notFoundMessageOf,
  productionLabelOf,
  weeksOf,
} from '../../labels/labels';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';

/**
 * A página do relatório (US1 a US4): o cabeçalho com o dia, quem abriu, quem corrigiu por último, a
 * idade, as aves e a situação dos lançamentos, como no protótipo, e as abas de produção e de mortalidade,
 * que entram pela saída da rota, cada uma marcada como pendente enquanto faltar lançamento.
 *
 * A página busca o relatório e o reparte com as abas e os diálogos por {@link ReportView}: eles leem o
 * mesmo relatório, sem buscar de novo. Quando um lançamento ou uma correção grava, o diálogo avisa por
 * `ReportChanges`, e a página busca o relatório de novo.
 *
 * A página segue o endereço: o caminho para outro relatório, oferecido quando uma correção esbarra na
 * data dele, reaproveita a página, e ela busca o relatório novo (revisão da T110).
 *
 * "Editar relatório" abre a correção sobre a aba em uso. Num setor inativo, a página só consulta (FR-020);
 * se o setor se revela inativo com a página aberta — o guard de um diálogo descobriu —, o aviso aparece, e
 * o foco vai para ele se estava numa ação que sumiu.
 */
@Component({
  selector: 'ovyx-report-page',
  imports: [Alert, ErrorSummary, Icon, PageHeader, RouterLink, RouterOutlet, TabNav],
  providers: [ReportView],
  templateUrl: './report-page.html',
  styleUrl: './report-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportPage {
  private readonly findReport = inject(FindDailyReportUseCase);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly sectorId = computed(() => this.params().get('sectorId') ?? '');
  protected readonly reportId = computed(() => this.params().get('reportId') ?? '');

  protected readonly countOf = countOf;
  protected readonly dateTimeAtTheFarmOf = dateTimeAtTheFarmOf;
  protected readonly weeksOf = weeksOf;
  protected readonly productionLabelOf = productionLabelOf;
  protected readonly mortalityLabelOf = mortalityLabelOf;
  protected readonly inactiveNotice = INACTIVE_SECTOR_NOTICE;

  protected readonly report = inject(ReportView).report;
  /** A recusa que diz o que não foi encontrado: o setor ou o relatório. */
  protected readonly missing = signal<string | null>(null);
  protected readonly refusal = signal(Notification.empty());

  /** A aba em uso, pelo endereço: a correção abre sobre ela e volta para ela. */
  private readonly tab = computed(() => (this.url().includes('/mortalidade') ? 'mortalidade' : 'producao'));
  private readonly url: () => string;

  protected readonly title = computed(() => {
    const report = this.report();
    return report ? `Relatório de ${dayOf(report.collectionDate)}` : 'Relatório';
  });

  protected readonly sectorInactive = computed(() => this.report()?.sector.status === 'INACTIVE');

  /** Só o relatório de um setor ativo se corrige (FR-020). */
  protected readonly canEdit = computed(() => this.report()?.sector.status === 'ACTIVE');

  protected readonly editLink = computed(() => [...this.base(), this.tab(), 'editar']);

  /** As abas dos lançamentos, cada uma com o "pendente" enquanto faltar lançamento. */
  protected readonly tabs = computed<readonly TabLink[]>(() => {
    const report = this.report();
    return [
      {
        label: 'Produção',
        icon: 'egg',
        link: [...this.base(), 'producao'],
        count: report?.production.status === 'PENDING' ? 'pendente' : undefined,
        highlight: true,
      },
      {
        label: 'Mortalidade',
        icon: 'pulse',
        link: [...this.base(), 'mortalidade'],
        count: report?.mortality.status === 'PENDING' ? 'pendente' : undefined,
        highlight: true,
      },
    ];
  });

  constructor() {
    const router = inject(Router);
    this.url = toSignal(
      router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => router.url),
      ),
      { initialValue: router.url },
    );

    // A primeira carga, cada gravação de um diálogo e cada relatório novo no endereço: a página busca
    // de novo o relatório.
    const changes = inject(ReportChanges).version;
    effect(() => {
      changes();
      const sectorId = this.sectorId();
      const reportId = this.reportId();
      untracked(() => void this.load(sectorId, reportId));
    });
  }

  private base(): string[] {
    return ['/setores', this.sectorId(), 'relatorios', this.reportId()];
  }

  private async load(sectorId: string, reportId: string): Promise<void> {
    // Outro relatório no endereço: o anterior sai da tela enquanto o novo carrega.
    if (this.report() !== null && this.report()?.id !== reportId) {
      this.report.set(null);
    }
    const result = await this.findReport.execute(sectorId, reportId);
    // A resposta de um endereço que já ficou para trás não entra na tela.
    if (reportId !== this.reportId() || sectorId !== this.sectorId()) {
      return;
    }
    if (!result.success) {
      const missing = notFoundMessageOf(result.notification.errors);
      this.missing.set(missing ?? null);
      this.refusal.set(missing ? Notification.empty() : result.notification);
      return;
    }
    const turnedInactive = this.report()?.sector.status === 'ACTIVE' && result.value.sector.status === 'INACTIVE';
    this.missing.set(null);
    this.refusal.set(Notification.empty());
    this.report.set(result.value);
    if (turnedInactive) {
      this.focusNoticeAfterRender();
    }
  }

  /**
   * O setor se revelou inativo com a página aberta, e as ações dela somem. Se o foco estava numa delas,
   * ele cai no corpo da página: vai para o aviso, que diz o que houve.
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
