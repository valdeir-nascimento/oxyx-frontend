import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** Quantas páginas numeradas aparecem de uma vez, em volta da atual. */
const VISIBLE_PAGES = 5;

/** "1–20 de 170", no formato brasileiro, como o design system mostra. */
export function rangeOf(page: number, size: number, total: number): string {
  const first = total === 0 ? 0 : page * size + 1;
  const last = Math.min(total, (page + 1) * size);
  return `${first.toLocaleString('pt-BR')}–${last.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')}`;
}

/** As páginas numeradas visíveis, começando em zero, em volta da atual. */
export function visiblePages(page: number, totalPages: number): readonly number[] {
  const count = Math.min(VISIBLE_PAGES, totalPages);
  const start = Math.min(Math.max(page - Math.floor(count / 2), 0), Math.max(totalPages - count, 0));
  return Array.from({ length: count }, (_, index) => start + index);
}

/**
 * Paginação, o `.pager` do design system: o intervalo mostrado à esquerda e as páginas à direita.
 *
 * As páginas começam em zero, como na API; na tela, em um. Cada botão diz a página por extenso para o
 * leitor de tela, e a atual leva `aria-current`.
 *
 * Voltar da primeira página e avançar da última ficam `aria-disabled`, e não `disabled`: desabilitado
 * de verdade, o botão perdia o foco justo ao chegar à última página, e o Tab seguinte levava ao começo
 * da tela. Assim ele continua focável, é anunciado como indisponível e só não faz nada.
 */
@Component({
  selector: 'ovyx-pager',
  imports: [Icon],
  templateUrl: './pager.html',
  styleUrl: './pager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pager {
  /** A página atual, começando em zero. */
  readonly page = input.required<number>();

  readonly size = input.required<number>();

  readonly totalPages = input.required<number>();

  readonly totalElements = input.required<number>();

  /** A página pedida, começando em zero. */
  readonly pageChange = output<number>();

  protected readonly range = computed(() => rangeOf(this.page(), this.size(), this.totalElements()));

  protected readonly pages = computed(() => visiblePages(this.page(), this.totalPages()));

  protected readonly isFirst = computed(() => this.page() === 0);

  protected readonly isLast = computed(() => this.page() + 1 >= this.totalPages());

  protected goTo(page: number): void {
    if (page !== this.page() && page >= 0 && page < this.totalPages()) {
      this.pageChange.emit(page);
    }
  }
}
