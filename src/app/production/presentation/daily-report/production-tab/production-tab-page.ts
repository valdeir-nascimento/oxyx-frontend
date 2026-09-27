import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import {
  SegmentOption,
  SegmentedControl,
} from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import { SummaryItem, SummaryStrip } from '../../../../shared/presentation/ui/summary-strip/summary-strip';
import { CageProduction, ReportCage, percentOf } from '../../../domain/daily-report';
import { countOf, dayOf } from '../../labels/labels';
import { ReportView } from '../report-view';

/** As colunas dos números, na ordem da tabela: os ovos e as seis classificações. */
const COLUMNS = ['Ovos', 'Pequeno', 'Jumbo', 'Sujo', 'Trincado', 'Com sangue', 'Anormais'];

/**
 * A aba de produção do relatório (US2; FR-007 a FR-010), como a tela Produção do protótipo: a faixa com
 * os totais do dia, o filtro de bateria e a tabela das gaiolas, com a produção de cada uma.
 *
 * O relatório vem da página ({@link ReportView}), que busca de novo quando um lançamento grava; a aba só
 * lê. O filtro de bateria muda a tabela, e não os totais, que são do dia inteiro. O lançamento abre em
 * diálogo sobre a aba, pela rota filha `:cageId`; num setor inativo, a aba só consulta (FR-020).
 *
 * Do protótipo fica de fora a porcentagem de ovos no padrão: o backend dá a contagem, e a tela não
 * calcula totais (R-008).
 */
@Component({
  selector: 'ovyx-production-tab-page',
  imports: [DataTable, Icon, RouterLink, RouterOutlet, SegmentedControl, SummaryStrip],
  templateUrl: './production-tab-page.html',
  styleUrl: './production-tab-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionTabPage {
  protected readonly report = inject(ReportView).report;

  protected readonly columns = COLUMNS;
  protected readonly countOf = countOf;

  protected readonly battery = signal('');

  /** Só o setor ativo recebe lançamento (FR-020). */
  protected readonly writable = computed(() => this.report()?.sector.status === 'ACTIVE');

  protected readonly batteryOptions = computed<readonly SegmentOption[]>(() => {
    const batteries = [...new Set((this.report()?.cages ?? []).map((cage) => cage.battery))];
    return [{ value: '', label: 'Todas' }, ...batteries.map((battery) => ({ value: battery, label: battery }))];
  });

  /** As gaiolas da bateria escolhida, por bateria e número, como o backend as ordena. */
  protected readonly cages = computed<readonly ReportCage[]>(() => {
    const battery = this.battery();
    const cages = this.report()?.cages ?? [];
    return battery === '' ? cages : cages.filter((cage) => cage.battery === battery);
  });

  /** Os totais do dia, prontos do backend; a tela só os escreve. */
  protected readonly summary = computed<readonly SummaryItem[]>(() => {
    const report = this.report();
    if (!report) {
      return [];
    }
    const { production } = report;
    const cages = report.cages.length;
    return [
      {
        label: 'Ovos coletados',
        value: countOf(production.collectedEggs),
        note: cages === 1 ? '1 gaiola' : `${countOf(cages)} gaiolas`,
      },
      {
        label: 'Produtividade',
        // Com as duas casas da API: arredondar de novo, para uma, podia mudar a primeira (revisão da T110).
        value: percentOf(production.layingRate, 2),
        note: `ovos ÷ ${countOf(report.openingBirdCount)} aves`,
      },
      { label: 'Padrão', value: countOf(production.standardEggs), note: 'ovos dentro do padrão' },
      {
        label: 'Não comercializáveis',
        value: countOf(production.unsellableEggs),
        note: 'trincados, com sangue e anormais',
      },
    ];
  });

  /** A legenda da tabela, com o dia: é o que o leitor de tela anuncia ao entrar nela. */
  protected readonly caption = computed(() => {
    const report = this.report();
    return report ? `Produção das gaiolas no relatório de ${dayOf(report.collectionDate)}` : 'Produção das gaiolas';
  });

  /** Os números da produção, na ordem das colunas. */
  protected valuesOf(production: CageProduction): readonly number[] {
    return [
      production.eggs,
      production.small,
      production.jumbo,
      production.dirty,
      production.cracked,
      production.bloodSpot,
      production.abnormal,
    ];
  }

  protected cageLink(cage: ReportCage): readonly string[] {
    const report = this.report();
    return report ? ['/setores', report.sector.id, 'relatorios', report.id, 'producao', cage.cageId] : [];
  }

  /** A ação de cada linha diz o que faz: lançar a gaiola sem produção, corrigir a lançada. */
  protected actionOf(cage: ReportCage): string {
    return `${cage.production ? 'Corrigir' : 'Lançar'} produção da gaiola ${cage.code}`;
  }
}
