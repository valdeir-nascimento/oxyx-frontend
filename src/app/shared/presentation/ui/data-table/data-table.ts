import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

let nextId = 0;

/**
 * Tabela de listagem. A página projeta `<thead>` e `<tbody>`; a tabela dá o nome acessível, a rolagem
 * horizontal em tela estreita e os estados de carregamento e de vazio.
 *
 * Sem encapsulamento de estilo, de propósito: as células vêm da página, e o estilo encapsulado não
 * alcança conteúdo projetado. Toda classe leva o prefixo `ovyx-data-table`, e nenhum seletor sai
 * dele — o catálogo proíbe `::ng-deep` e seletor de tag global.
 *
 * O estado fica numa região `role="status"` que existe sempre e só troca de texto: leitor de tela
 * costuma não anunciar a região que já nasce preenchida (T235).
 *
 * ```html
 * <ovyx-data-table caption="Responsáveis" [loading]="loading()" [empty]="page().content.length === 0">
 *   <thead>…</thead>
 *   <tbody>…</tbody>
 * </ovyx-data-table>
 * ```
 */
@Component({
  selector: 'ovyx-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ovyx-data-table' },
  template: `
    <div class="ovyx-data-table__scroll" role="region" tabindex="0" [attr.aria-labelledby]="captionId">
      <table class="ovyx-data-table__table">
        <caption class="ovyx-data-table__caption" [id]="captionId">{{ caption() }}</caption>
        <ng-content />
      </table>
    </div>
    <p class="ovyx-data-table__state" role="status">{{ state() }}</p>
  `,
  styles: `
    .ovyx-data-table {
      display: block;
    }

    .ovyx-data-table__scroll {
      overflow-x: auto;
      border: var(--ovyx-border-width-thin) solid var(--ovyx-color-border);
      border-radius: var(--ovyx-radius-md);
      background-color: var(--ovyx-color-surface-raised);
    }

    .ovyx-data-table__table {
      width: 100%;
      border-collapse: collapse;
    }

    .ovyx-data-table__caption {
      padding: var(--ovyx-space-3);
      text-align: left;
      font-weight: var(--ovyx-font-weight-semibold);
    }

    .ovyx-data-table__table th,
    .ovyx-data-table__table td {
      padding: var(--ovyx-space-2) var(--ovyx-space-3);
      border-top: var(--ovyx-border-width-thin) solid var(--ovyx-color-border);
      text-align: left;
      vertical-align: middle;
    }

    .ovyx-data-table__table th {
      font-size: var(--ovyx-font-size-sm);
      font-weight: var(--ovyx-font-weight-semibold);
      color: var(--ovyx-color-text-muted);
      white-space: nowrap;
    }

    .ovyx-data-table__table tbody tr:hover {
      background-color: var(--ovyx-color-surface-sunken);
    }

    .ovyx-data-table__state {
      padding: var(--ovyx-space-3) 0;
      color: var(--ovyx-color-text-muted);
    }

    .ovyx-data-table__state:empty {
      display: none;
    }
  `,
})
export class DataTable {
  /** Nome da tabela, lido pelo leitor de tela ao entrar nela. */
  readonly caption = input.required<string>();

  readonly loading = input(false);

  /** Verdadeiro quando não há linha a mostrar. */
  readonly empty = input(false);

  readonly emptyMessage = input('Nenhum registro encontrado.');

  protected readonly captionId = `ovyx-data-table-caption-${++nextId}`;

  protected readonly state = computed(() => {
    if (this.loading()) {
      return 'Carregando…';
    }
    return this.empty() ? this.emptyMessage() : '';
  });
}
