import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import {
  SegmentOption,
  SegmentedControl,
} from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import {
  SelectField,
  SelectOption,
} from '../../../../shared/presentation/ui/select-field/select-field';
import {
  SummaryItem,
  SummaryStrip,
} from '../../../../shared/presentation/ui/summary-strip/summary-strip';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ListActiveFormulasUseCase } from '../../../application/daily-report/list-active-formulas.usecase';
import { RecordFeedBySuggestionUseCase } from '../../../application/daily-report/record-feed-by-suggestion.usecase';
import { SuggestFeedUseCase } from '../../../application/daily-report/suggest-feed.usecase';
import {
  FeedFormulaOption,
  FeedSuggestion,
  ReportCage,
  SuggestedCageFeed,
} from '../../../domain/daily-report';
import { countOf, dayOf, deviationOf, gramsOf, kilogramsOf, moneyOf } from '../../labels/labels';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';

/** Acima disso, em porcentagem, o consumo por ave da gaiola aparece destacado (FR-017 da 004). */
const DEVIATION_HIGHLIGHT = 2.5;

/**
 * O id do seletor da fórmula do setor. O diálogo da gaiola, que abre por cima da aba, tem o seu `formulaId`:
 * as recusas da fórmula do setor vêm para este id, e o rótulo e o resumo de cada um levam ao campo certo.
 */
const SECTOR_FORMULA = 'sectorFormulaId';

/** A recusa do backend com o campo da fórmula levado ao seletor do setor. */
function sectorRefusalOf(notification: Notification): Notification {
  return Notification.of(
    notification.errors.map((error) =>
      error.field === 'formulaId' ? { ...error, field: SECTOR_FORMULA } : error,
    ),
  );
}

/**
 * A aba Ração do relatório (US2 da 004; FR-007 a FR-009, FR-012 a FR-014; R-013), como a tela Ração do
 * protótipo: a faixa com o consumo, o custo, o custo por ovo e o consumo por ave do dia, o filtro de bateria
 * e a tabela das gaiolas, com a ração de cada uma.
 *
 * Com gaiolas sem ração num setor ativo, o aviso oferece o lançamento do setor pela sugestão: a pessoa
 * escolhe uma fórmula ativa, a tabela mostra a proposta nas gaiolas pendentes, marcada como sugerida, e a
 * faixa mostra o dia com ela; "Confirmar lançamento" grava. A proposta e os totais são do backend (R-006):
 * a tela só os escreve. Não há estado de "ração sugerida e não confirmada": a proposta vive só na tela.
 *
 * As fórmulas vêm pela porta do production, e não do cadastro do farm (princípio I). Sem fórmula ativa, o
 * aviso diz o que fazer, com o caminho para as fórmulas só para quem pode cadastrar.
 *
 * O relatório vem da página ({@link ReportView}), que busca de novo quando um lançamento grava.
 */
@Component({
  selector: 'ovyx-feed-tab-page',
  imports: [
    Alert,
    Button,
    DataTable,
    ErrorSummary,
    Icon,
    RouterLink,
    RouterOutlet,
    SegmentedControl,
    SelectField,
    SummaryStrip,
  ],
  templateUrl: './feed-tab-page.html',
  styleUrl: './feed-tab-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedTabPage {
  private readonly listFormulas = inject(ListActiveFormulasUseCase);
  private readonly suggestFeed = inject(SuggestFeedUseCase);
  private readonly recordBySuggestion = inject(RecordFeedBySuggestionUseCase);
  private readonly changes = inject(ReportChanges);
  private readonly toaster = inject(Toaster);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly report = inject(ReportView).report;

  /** Quem pode cadastrar fórmula: o caminho para elas só aparece para ele. */
  protected readonly canManageFormulas = inject(VIEWER).isAdministrator;

  protected readonly countOf = countOf;
  protected readonly sectorFormula = SECTOR_FORMULA;
  protected readonly gramsOf = gramsOf;
  protected readonly moneyOf = moneyOf;
  protected readonly deviationOf = deviationOf;

  protected readonly battery = signal('');
  /** As fórmulas ativas; nenhuma lista enquanto não carregou. */
  protected readonly formulas = signal<readonly FeedFormulaOption[] | null>(null);
  /** A lista das fórmulas não pôde ser lida: a recusa diz por quê, e a tela não diz que não há fórmula. */
  protected readonly formulasFailed = signal(false);
  protected readonly suggestion = signal<FeedSuggestion | null>(null);
  protected readonly refusal = signal(Notification.empty());
  protected readonly recording = signal(false);

  protected readonly formula = new FormControl('', { nonNullable: true });
  /** Cada pedido de proposta tem um número: só a resposta do último entra na tela. */
  private proposals = 0;

  /** Só o setor ativo recebe lançamento (FR-020). */
  protected readonly writable = computed(() => this.report()?.sector.status === 'ACTIVE');

  /**
   * Os campos a que o resumo da recusa leva: o seletor da fórmula, só enquanto ele está na tela. Sem ele, a
   * recusa fica como texto, porque um link que não leva a lugar nenhum é pior.
   */
  protected readonly refusalFields = computed<readonly string[]>(() =>
    this.offersSuggestion() && !this.formulasFailed() && (this.formulas()?.length ?? 0) > 0
      ? [SECTOR_FORMULA]
      : [],
  );

  /** O lançamento pelo setor é oferecido enquanto houver gaiola sem ração num setor ativo (FR-009). */
  protected readonly offersSuggestion = computed(
    () => this.writable() && this.report()?.feed.status === 'PENDING',
  );

  protected readonly pendingNotice = computed(() => {
    const pending = this.report()?.feed.pendingCages ?? 0;
    return pending === 1
      ? 'Ração pendente em 1 gaiola.'
      : `Ração pendente em ${countOf(pending)} gaiolas.`;
  });

  protected readonly formulaOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Escolha a fórmula' },
    ...(this.formulas() ?? []).map((formula) => ({
      value: formula.id,
      label: `${formula.name} · ${moneyOf(formula.pricePerKg)}/kg`,
    })),
  ]);

  protected readonly batteryOptions = computed<readonly SegmentOption[]>(() => {
    const batteries = [...new Set((this.report()?.cages ?? []).map((cage) => cage.battery))];
    return [
      { value: '', label: 'Todas' },
      ...batteries.map((battery) => ({ value: battery, label: battery })),
    ];
  });

  /** As gaiolas da bateria escolhida, por bateria e número, como o backend as ordena. */
  protected readonly cages = computed<readonly ReportCage[]>(() => {
    const battery = this.battery();
    const cages = this.report()?.cages ?? [];
    return battery === '' ? cages : cages.filter((cage) => cage.battery === battery);
  });

  /** Os totais do dia: os da proposta, enquanto ela está na tela, ou os do relatório. */
  protected readonly summary = computed<readonly SummaryItem[]>(() => {
    const report = this.report();
    if (!report) {
      return [];
    }
    const totals = this.suggestion()?.totals ?? report.feed;
    const cages = report.cages.length;
    const eggs = report.production.collectedEggs;
    const fedCages = cages - totals.pendingCages;
    const eggsNote = eggs === 0 ? 'sem ovo coletado' : eggs === 1 ? '1 ovo' : `${countOf(eggs)} ovos`;
    return [
      {
        label: 'Consumo total',
        value: kilogramsOf(totals.consumption),
        note: cages === 1 ? '1 gaiola' : `${countOf(cages)} gaiolas`,
      },
      {
        label: 'Custo da ração',
        value: moneyOf(totals.cost),
        note: 'preço por kg de cada fórmula',
      },
      {
        label: 'Custo por ovo',
        value: totals.costPerEgg === undefined ? '—' : moneyOf(totals.costPerEgg, 3),
        note: fedCages === 0 ? 'sem ração lançada' : eggsNote,
      },
      {
        label: 'Consumo por ave',
        value: totals.intakePerBird === undefined ? '—' : gramsOf(totals.intakePerBird, 1),
        note:
          totals.expectedIntakePerBird === undefined
            ? 'sem ração lançada'
            : `esperado ${gramsOf(totals.expectedIntakePerBird, 1)} por ave ao dia`,
      },
    ];
  });

  /** O nome da faixa: com a proposta na tela, os totais são os que ela daria. */
  protected readonly summaryLabel = computed(() =>
    this.suggestion() ? 'Totais de ração do dia com a proposta' : 'Totais de ração do dia',
  );

  /** O que a região de estado anuncia quando a proposta chega à tabela. */
  protected readonly statusMessage = computed(() => {
    const suggestion = this.suggestion();
    if (!suggestion) {
      return '';
    }
    const cages = suggestion.cages.length;
    return `Proposta com a ${suggestion.formula.name} em ${cages === 1 ? '1 gaiola' : `${countOf(cages)} gaiolas`}.`;
  });

  /** A fórmula da proposta, escrita para as linhas sugeridas: o nome e o preço por quilo. */
  protected readonly suggestedFormula = computed(() => {
    const formula = this.suggestion()?.formula;
    return { name: formula?.name ?? '', price: formula ? `${moneyOf(formula.pricePerKg)}/kg` : '' };
  });

  /** A legenda da tabela, com o dia: é o que o leitor de tela anuncia ao entrar nela. */
  protected readonly caption = computed(() => {
    const report = this.report();
    return report
      ? `Ração das gaiolas no relatório de ${dayOf(report.collectionDate)}`
      : 'Ração das gaiolas';
  });

  constructor() {
    // As fórmulas só são buscadas quando o lançamento pelo setor é oferecido: sem gaiola pendente, ou num
    // setor inativo, a aba só consulta.
    effect(() => {
      if (this.offersSuggestion() && this.formulas() === null) {
        untracked(() => void this.loadFormulas());
      }
    });
    // O relatório lido de novo (a ração de uma gaiola pelo diálogo, a edição, o setor inativado) muda os
    // totais do dia: a proposta na tela é pedida de novo, ou sai quando o lançamento pelo setor deixa de ser
    // oferecido. Sem fórmula escolhida, não há o que refazer.
    effect(() => {
      this.report();
      const offers = this.offersSuggestion();
      untracked(() => {
        const formulaId = this.formula.value;
        if (offers) {
          if (formulaId !== '') {
            void this.propose(formulaId);
          }
          return;
        }
        // Sem o lançamento pelo setor, nenhuma proposta fica, nem a que ainda está a caminho. Com uma
        // fórmula escolhida, a recusa na tela só pode ser a da proposta, e sai com ela.
        this.proposals++;
        this.suggestion.set(null);
        if (formulaId !== '') {
          this.refusal.set(Notification.empty());
          this.formula.setValue('', { emitEvent: false });
        }
      });
    });
    // Uma fórmula escolhida busca a proposta; a escolha desfeita a tira da tela.
    this.formula.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((formulaId) => void this.propose(formulaId));
  }

  protected cageLink(cage: ReportCage): readonly string[] {
    const report = this.report();
    return report
      ? ['/setores', report.sector.id, 'relatorios', report.id, 'racao', cage.cageId]
      : [];
  }

  /** A ação de cada linha diz o que faz: lançar a gaiola sem ração, corrigir a lançada (US3 da 004). */
  protected actionOf(cage: ReportCage): string {
    return `${cage.feed ? 'Corrigir' : 'Lançar'} ração da gaiola ${cage.code}`;
  }

  /**
   * O desvio que a tela destaca: o de mais de 2,5% sobre o esperado, para mais ou para menos (FR-017 da
   * 004). O desvio vem do backend; a tela só decide o destaque.
   */
  protected highlighted(deviation: number | undefined): boolean {
    return deviation !== undefined && Math.abs(deviation) > DEVIATION_HIGHLIGHT;
  }

  /** A proposta da gaiola sem ração, enquanto a sugestão está na tela. */
  protected proposalOf(cage: ReportCage): SuggestedCageFeed | undefined {
    return this.suggestion()?.cages.find((proposal) => proposal.cageId === cage.cageId);
  }

  protected async confirm(): Promise<void> {
    const report = this.report();
    const suggestion = this.suggestion();
    if (!report || !suggestion || this.recording()) {
      return;
    }
    this.recording.set(true);
    const result = await this.recordBySuggestion.execute(
      report.sector.id,
      report.id,
      suggestion.formula.id,
    );
    this.recording.set(false);

    // A proposta pedida durante a gravação ficou para trás: a escolha volta ao começo.
    this.proposals++;
    this.suggestion.set(null);
    this.formula.setValue('', { emitEvent: false });
    if (!result.success) {
      // A fórmula pode ter sido inativada no meio-tempo: a lista é lida de novo, e a tela pede outra.
      this.refusal.set(sectorRefusalOf(result.notification));
      await this.loadFormulas();
      return;
    }
    this.refusal.set(Notification.empty());
    this.toaster.show(`Ração de ${dayOf(report.collectionDate)} lançada.`);
    this.changes.notify();
    this.focusTableAfterRender();
  }

  /** O botão confirmado some com o aviso: o foco vai para a tabela, que mostra o que foi lançado. */
  private focusTableAfterRender(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('.tbl-wrap')?.focus(),
      {
        injector: this.injector,
      },
    );
  }

  private async propose(formulaId: string): Promise<void> {
    const report = this.report();
    const request = ++this.proposals;
    this.suggestion.set(null);
    this.refusal.set(Notification.empty());
    if (!report || formulaId === '') {
      return;
    }
    const result = await this.suggestFeed.execute(report.sector.id, report.id, formulaId);
    // A resposta de um pedido que já ficou para trás (outra escolha, outro relatório) não entra na tela.
    if (request !== this.proposals) {
      return;
    }
    if (!result.success) {
      this.refusal.set(sectorRefusalOf(result.notification));
      return;
    }
    this.refusal.set(Notification.empty());
    this.suggestion.set(result.value);
  }

  private async loadFormulas(): Promise<void> {
    const result = await this.listFormulas.execute();
    this.formulasFailed.set(!result.success);
    if (!result.success) {
      this.refusal.set(result.notification);
      this.formulas.set([]);
      return;
    }
    this.formulas.set(result.value);
  }
}
