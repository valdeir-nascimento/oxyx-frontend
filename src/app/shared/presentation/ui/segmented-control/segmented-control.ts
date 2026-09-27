import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Uma opção do segmento: o valor escolhido e o rótulo em português. */
export interface SegmentOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Seleção segmentada, o `.seg` do design system: poucas opções exclusivas lado a lado, como o
 * filtro de situação da lista.
 *
 * Cada opção é um botão de alternância (`aria-pressed`) dentro de um grupo nomeado — o padrão do
 * design system. O valor é um `model()`: quem usa escuta a mudança em `valueChange`.
 */
@Component({
  selector: 'ovyx-segmented-control',
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControl {
  /** O nome do grupo para o leitor de tela, como "Situação". */
  readonly label = input.required<string>();

  readonly options = input.required<readonly SegmentOption[]>();

  readonly value = model('');

  /** Escolher de novo a opção atual não emite nada: o `model()` só avisa quando o valor muda. */
  protected choose(value: string): void {
    this.value.set(value);
  }
}
