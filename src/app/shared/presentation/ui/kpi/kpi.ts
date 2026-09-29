import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** O tom da variação: boa, ruim ou sem mudança. Quem decide é quem usa, pelo sentido bom do indicador. */
export type KpiTone = 'good' | 'bad' | 'flat';

/** O tamanho da sparkline do protótipo. */
const SPARK_WIDTH = 84;
const SPARK_HEIGHT = 28;

/**
 * Indicador, o `.kpi` do design system (R-009 da 006): o rótulo com o ícone, o valor com a unidade, a
 * variação com o tom e a comparação ("vs ontem"), e a sparkline da tendência, como o `kpi()` do protótipo.
 *
 * Não conhece produção: recebe o valor e a variação já escritos, o tom e os pontos. Sem valor, mostra "—";
 * sem variação, "sem comparação". A sparkline liga os pontos presentes e pula os ausentes.
 */
@Component({
  selector: 'ovyx-kpi',
  imports: [Icon],
  templateUrl: './kpi.html',
  styleUrl: './kpi.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kpi {
  readonly label = input.required<string>();
  readonly icon = input.required<IconName>();
  /** O ícone em destaque de gema, como o da produção no protótipo. */
  readonly highlight = input(false);
  /** O valor já escrito ("1.740", "R$ 159,60"); ausente, "—". */
  readonly value = input<string>();
  readonly unit = input<string>();
  /** A variação já escrita, com o sinal ("+2,4%"); ausente, "sem comparação". */
  readonly change = input<string>();
  readonly tone = input<KpiTone>('flat');
  /** Se o valor subiu ou desceu, para a seta; o tom diz se isso é bom. Sem mudança, não há seta. */
  readonly direction = input<'up' | 'down'>();
  /** Com o que se compara ("vs ontem"). */
  readonly comparison = input.required<string>();
  /** Os valores de cada dia; os ausentes ficam de fora da linha. */
  readonly trend = input<readonly (number | null | undefined)[]>([]);
  /** O nome da tendência para o leitor de tela. */
  readonly trendLabel = input<string>();
  /** O que ficou incompleto no período ("1 dia sem ração completa"). */
  readonly note = input<string>();

  protected readonly width = SPARK_WIDTH;
  protected readonly height = SPARK_HEIGHT;

  /** Os pontos da sparkline, pelo lugar de cada dia na série; só com dois valores ou mais. */
  private readonly points = computed(() => {
    const values = this.trend();
    const present = values
      .map((value, index) => ({ value, index }))
      .filter(
        (point): point is { value: number; index: number } => typeof point.value === 'number',
      );
    if (present.length < 2) {
      return [];
    }
    const low = Math.min(...present.map((point) => point.value));
    const high = Math.max(...present.map((point) => point.value));
    const range = high - low || 1;
    const step = (SPARK_WIDTH - 6) / Math.max(values.length - 1, 1);
    return present.map((point) => ({
      x: 2 + point.index * step,
      y: 3 + (SPARK_HEIGHT - 6) * (1 - (point.value - low) / range),
    }));
  });

  protected readonly path = computed(() =>
    this.points()
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(' '),
  );

  protected readonly last = computed(() => this.points().at(-1));
}
