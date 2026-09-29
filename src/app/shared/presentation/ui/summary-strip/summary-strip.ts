import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusBadge, StatusBadgeTone } from '../status-badge/status-badge';

/**
 * Um item da faixa: o rótulo, o valor já escrito e, se houver, a nota abaixo dele. Com o tom, o valor é
 * uma situação, e aparece num selo, como a "Dentro da faixa" do peso médio (feature 005).
 */
export interface SummaryItem {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
  readonly tone?: StatusBadgeTone;
}

/**
 * Faixa de resumo, o `.summary` do design system: os totais no topo das telas de lançamento, num objeto
 * só, com divisórias — e não quatro cartões.
 *
 * Para o leitor de tela, é uma lista com nome, e cada item diz o rótulo, o valor e a nota, nessa ordem.
 */
@Component({
  selector: 'ovyx-summary-strip',
  imports: [StatusBadge],
  templateUrl: './summary-strip.html',
  styleUrl: './summary-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryStrip {
  /** O nome da faixa para o leitor de tela, como "Totais de produção do dia". */
  readonly label = input.required<string>();

  readonly items = input.required<readonly SummaryItem[]>();
}
