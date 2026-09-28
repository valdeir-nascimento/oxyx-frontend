import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Uma parte da distribuição: o rótulo, a quantidade (para a largura da barra) e os textos já escritos. */
export interface DistributionPart {
  readonly label: string;
  readonly count: number;
  readonly countText: string;
  readonly percentText: string;
}

/** O raio do anel do protótipo, num desenho de 64 × 64. */
const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** A barra mínima, para a parte com zero não sumir, como no protótipo. */
const MINIMUM_BAR = 2;

/**
 * Distribuição, o `.hero-q` com o `.ring` e as `.bars` do design system (R-009 da 006), como a
 * classificação dos ovos do protótipo: o anel com a parte principal, e uma barra por parte, com a largura
 * proporcional à maior.
 *
 * Não conhece ovos: recebe a parte principal e as demais já escritas. Para o leitor de tela, as barras são
 * uma lista com nome; o anel é desenho, e a porcentagem principal está escrita ao lado dele.
 */
@Component({
  selector: 'ovyx-distribution',
  templateUrl: './distribution.html',
  styleUrl: './distribution.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Distribution {
  /** O nome da lista para o leitor de tela. */
  readonly label = input.required<string>();
  /** A parte principal, de 0 a 100, para o anel. */
  readonly mainPercent = input.required<number>();
  readonly mainText = input.required<string>();
  readonly mainNote = input.required<string>();
  readonly parts = input.required<readonly DistributionPart[]>();

  protected readonly radius = RING_RADIUS;
  protected readonly circumference = RING_CIRCUMFERENCE.toFixed(1);

  protected readonly ringDash = computed(
    () =>
      `${((RING_CIRCUMFERENCE * Math.min(100, Math.max(0, this.mainPercent()))) / 100).toFixed(1)} ${this.circumference}`,
  );

  protected readonly bars = computed(() => {
    const parts = this.parts();
    const largest = Math.max(...parts.map((part) => part.count), 0);
    return parts.map((part) => ({
      ...part,
      width:
        largest === 0
          ? MINIMUM_BAR
          : Math.max(MINIMUM_BAR, Math.round((part.count / largest) * 100)),
    }));
  });
}
