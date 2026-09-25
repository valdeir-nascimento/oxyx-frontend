import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EmptyState } from '../empty-state/empty-state';

let nextId = 0;

/**
 * Tabela de listagem, a `.tbl` do design system: a página projeta `<thead>` e `<tbody>`, e cada
 * `<td>` leva `data-label` — abaixo de 640 px a linha vira cartão, e o rótulo aparece acima de cada
 * valor.
 *
 * A tabela dá o nome (a legenda, só para o leitor de tela), a rolagem pelo teclado quando ela não
 * cabe, o estado vazio e a região de estado. A região existe sempre e só troca de texto — leitor de
 * tela costuma não anunciar a região que já nasce preenchida (T235) — e fica fora da vista (`.sr`):
 * quem vê já tem o estado vazio e o total no rodapé.
 *
 * ```html
 * <ovyx-data-table caption="Responsáveis cadastrados" [loading]="loading()" [empty]="rows().length === 0">
 *   <thead>…</thead>
 *   <tbody>…</tbody>
 * </ovyx-data-table>
 * ```
 */
@Component({
  selector: 'ovyx-data-table',
  imports: [EmptyState],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable {
  /** Nome da tabela, lido pelo leitor de tela ao entrar nela. */
  readonly caption = input.required<string>();

  readonly loading = input(false);

  /** Verdadeiro quando não há linha a mostrar. */
  readonly empty = input(false);

  readonly emptyTitle = input('Nenhum registro encontrado');

  /** O próximo passo, no estado vazio. */
  readonly emptyMessage = input<string>();

  /** O que anunciar quando há linhas, como o total encontrado. */
  readonly summary = input('');

  protected readonly captionId = `ovyx-data-table-caption-${++nextId}`;

  protected readonly state = computed(() => {
    if (this.loading()) {
      return 'Carregando…';
    }
    return this.empty() ? this.emptyTitle() : this.summary();
  });
}
