import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/** Um ponto do gráfico: o rótulo do eixo ("24/09"), o valor e o texto que a dica e o leitor de tela dizem. */
export interface ChartPoint {
  readonly label: string;
  readonly value: number;
  readonly text: string;
}

/** A faixa de referência destacada atrás da linha, com a legenda. */
export interface ChartBand {
  readonly from: number;
  readonly to: number;
  readonly label: string;
}

/**
 * O tamanho do desenho, como o do protótipo: a largura é a do cartão, medida, e a altura é fixa. Desenhar na
 * largura real mantém o texto em 11 px no celular; com uma largura fixa, o SVG encolhia com o texto junto.
 */
const DEFAULT_WIDTH = 640;
const MINIMUM_WIDTH = 240;
const HEIGHT = 220;
const MARGIN = { top: 18, right: 58, bottom: 28, left: 46 };
const INNER_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
/** A distância entre a dica e o ponto. */
const TIP_GAP = 12;
/** O espaço de uma data do eixo ("24/09" em 11 px) com a folga até a vizinha. */
const DAY_SPACE = 40;

/** O passo das linhas de grade: 1, 2 ou 5 vezes uma potência de dez, perto do pedido. */
function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Gráfico de linha, o desenho do `drawLine` do protótipo em SVG, sem biblioteca (R-013 da 005): a linha com
 * a área, as linhas de grade com os valores, os rótulos do eixo, a faixa de referência destacada e o valor
 * do último ponto.
 *
 * Para o leitor de tela, o desenho é uma imagem com nome; os dados ficam na tabela que a tela mostra junto.
 * A área do gráfico recebe o foco: as setas escolhem o ponto, a dica o mostra, e a região de estado o anuncia.
 * Não conhece pesagem nem domínio: quem usa entrega os pontos já escritos.
 */
@Component({
  selector: 'ovyx-line-chart',
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChart {
  /** O nome do gráfico para o leitor de tela, que diz o que ele mostra. */
  readonly label = input.required<string>();

  readonly points = input.required<readonly ChartPoint[]>();

  readonly band = input<ChartBand>();

  /** Como escrever um valor, nas linhas de grade e no último ponto. */
  readonly format = input<(value: number) => string>((value) => String(value));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tip = viewChild<ElementRef<HTMLElement>>('tip');

  /** A largura do cartão, em pixels; a do protótipo enquanto não se mede. */
  private readonly measured = signal(DEFAULT_WIDTH);

  protected readonly width = computed(() => Math.max(MINIMUM_WIDTH, this.measured()));
  protected readonly height = HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly innerWidth = computed(() => this.width() - MARGIN.left - MARGIN.right);
  protected readonly innerHeight = INNER_HEIGHT;

  /** O ponto escolhido pelo ponteiro ou pelo teclado; nenhum fora da área. */
  protected readonly current = signal<number | null>(null);

  /** O domínio do eixo vertical: os valores e a faixa, com uma folga. */
  private readonly domain = computed(() => {
    const values = this.points().map((point) => point.value);
    const band = this.band();
    let low = Math.min(...values, ...(band ? [band.from] : []));
    let high = Math.max(...values, ...(band ? [band.to] : []));
    if (low === high) {
      low -= 1;
      high += 1;
    }
    const pad = (high - low) * 0.15;
    return { low: low - pad, high: high + pad };
  });

  protected readonly ticks = computed(() => {
    const { low, high } = this.domain();
    const step = niceStep((high - low) / 4);
    const ticks: number[] = [];
    for (let tick = Math.ceil(low / step) * step; tick <= high; tick += step) {
      ticks.push(tick);
    }
    return ticks.map((value) => ({ value, y: this.y(value), text: this.format()(value) }));
  });

  constructor() {
    // Mede o cartão e desenha de novo quando ele muda de largura (a tela girou, a janela mudou).
    afterNextRender(() => {
      this.measure();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // A dica acima do ponto e presa dentro do gráfico; embaixo dele, quando não cabe em cima.
    afterRenderEffect({
      write: () => {
        const point = this.chosen();
        const tip = this.tip()?.nativeElement;
        if (!point || !tip) {
          return;
        }
        // A largura com a fração arredondada para cima: a do offsetWidth, arredondada, passava da borda.
        const width = Math.ceil(tip.getBoundingClientRect().width) || tip.offsetWidth;
        const height = Math.ceil(tip.getBoundingClientRect().height) || tip.offsetHeight;
        const left = Math.max(0, Math.min(this.width() - width, point.x - width / 2));
        const above = point.y - height - TIP_GAP;
        const top = above < 0 ? point.y + TIP_GAP : above;
        tip.style.transform = `translate(${left}px, ${top}px)`;
      },
    });
  }

  protected readonly plotted = computed(() => {
    const points = this.points();
    // As datas que cabem sem encostar, contadas da última, que sempre aparece: no celular, com 12
    // pesagens, uma a cada duas ainda deixava as duas últimas uma sobre a outra.
    const step = points.length > 1 ? this.innerWidth() / (points.length - 1) : DAY_SPACE;
    const every = Math.max(1, Math.ceil(DAY_SPACE / step));
    const last = points.length - 1;
    return points.map((point, index) => ({
      ...point,
      x: this.x(index),
      y: this.y(point.value),
      labeled: (last - index) % every === 0,
    }));
  });

  protected readonly line = computed(() =>
    this.plotted()
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(' '),
  );

  protected readonly area = computed(() => {
    const plotted = this.plotted();
    const floor = this.y(this.domain().low).toFixed(1);
    return `${this.line()} L${plotted[plotted.length - 1].x.toFixed(1)} ${floor} L${plotted[0].x.toFixed(1)} ${floor} Z`;
  });

  protected readonly last = computed(() => {
    const plotted = this.plotted();
    const point = plotted[plotted.length - 1];
    return { ...point, text: this.format()(point.value) };
  });

  protected readonly bandArea = computed(() => {
    const band = this.band();
    if (!band) {
      return null;
    }
    const top = this.y(band.to);
    return { y: top, height: this.y(band.from) - top, label: band.label };
  });

  protected readonly chosen = computed(() => {
    const index = this.current();
    return index === null ? null : this.plotted()[index];
  });

  protected show(index: number): void {
    const last = this.points().length - 1;
    this.current.set(Math.max(0, Math.min(last, index)));
  }

  protected hide(): void {
    this.current.set(null);
  }

  protected explore(event: KeyboardEvent): void {
    const current = this.current() ?? this.points().length - 1;
    const moves: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: this.points().length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      this.show(moves[event.key]);
    }
  }

  /** O ponto mais perto do ponteiro, pela posição dele na largura do desenho. */
  protected follow(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const box = svg.getBoundingClientRect();
    const x = ((event.clientX - box.left) * this.width()) / (box.width || this.width());
    const count = this.points().length;
    this.show(count === 1 ? 0 : Math.round(((x - MARGIN.left) * (count - 1)) / this.innerWidth()));
  }

  /** A largura do cartão, quando o navegador a sabe; sem ela, a do protótipo. */
  private measure(): void {
    const width = this.host.nativeElement.clientWidth;
    if (width > 0) {
      this.measured.set(width);
    }
  }

  private x(index: number): number {
    const count = this.points().length;
    return count === 1
      ? MARGIN.left + this.innerWidth() / 2
      : MARGIN.left + (index * this.innerWidth()) / (count - 1);
  }

  private y(value: number): number {
    const { low, high } = this.domain();
    return MARGIN.top + INNER_HEIGHT - ((value - low) / (high - low)) * INNER_HEIGHT;
  }
}
