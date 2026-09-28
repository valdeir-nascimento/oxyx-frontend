import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartBand, ChartPoint, LineChart } from './line-chart';

/**
 * O gráfico de linha do `shared` (R-013 da 005): o desenho do `drawLine` do protótipo, em SVG, com a faixa
 * de referência destacada, a dica que segue o ponteiro e as setas do teclado, e o ponto escolhido anunciado
 * ao leitor de tela.
 */
describe('LineChart', () => {
  let fixture: ComponentFixture<LineChart>;

  const points: readonly ChartPoint[] = [
    { label: '27/08', value: 150, text: '150 g em 27/08/2026' },
    { label: '03/09', value: 153, text: '153 g em 03/09/2026' },
    { label: '10/09', value: 156, text: '156 g em 10/09/2026' },
    { label: '17/09', value: 158, text: '158 g em 17/09/2026' },
    { label: '24/09', value: 161.4, text: '161,4 g em 24/09/2026' },
  ];
  const band: ChartBand = { from: 155, to: 175, label: 'Faixa ideal 155–175 g' };

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function render(withBand?: ChartBand): void {
    TestBed.configureTestingModule({ imports: [LineChart] });
    fixture = TestBed.createComponent(LineChart);
    fixture.componentRef.setInput('label', 'Evolução do peso médio da gaiola A-01');
    fixture.componentRef.setInput('points', points);
    fixture.componentRef.setInput(
      'format',
      (value: number) => `${value.toLocaleString('pt-BR')} g`,
    );
    if (withBand) {
      fixture.componentRef.setInput('band', withBand);
    }
    document.body.appendChild(element());
    fixture.detectChanges();
  }

  afterEach(() => element()?.remove());

  function explorer(): HTMLElement {
    return element().querySelector<HTMLElement>('[data-explore]')!;
  }

  function status(): string {
    return element().querySelector('[role="status"]')?.textContent?.trim() ?? '';
  }

  function key(name: string): void {
    explorer().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    fixture.detectChanges();
  }

  it('is an image named for the screen reader', () => {
    render();

    const svg = element().querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Evolução do peso médio da gaiola A-01');
  });

  it('names the area that explores the points as a group, for the name to be read', () => {
    render();

    expect(explorer().getAttribute('role')).toBe('group');
    expect(explorer().getAttribute('aria-label')).toBe(
      'Explorar os pontos do gráfico com as setas',
    );
  });

  it('highlights the reference band, with its caption, when there is one', () => {
    render(band);

    expect(element().querySelector('[data-band]')).not.toBeNull();
    expect(element().textContent).toContain('Faixa ideal 155–175 g');
  });

  // ---------------------------------------------------------------- referência (006)

  it('draws the reference line with its caption, inside the drawing, as the target of the prototype', () => {
    render();
    fixture.componentRef.setInput('reference', { value: 180, label: 'Meta 180 g' });
    fixture.detectChanges();

    const line = element().querySelector('[data-reference]')!;
    const y = Number(line.getAttribute('y1'));
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(220);
    expect(element().textContent).toContain('Meta 180 g');
  });

  it('hides the value of the last point when the reference would overlap it', () => {
    render();
    fixture.componentRef.setInput('reference', { value: 161.4, label: 'Meta 161 g' });
    fixture.detectChanges();

    expect(element().querySelector('[data-last]')).toBeNull();
  });

  it('keeps the value of the last point when the reference is far from it', () => {
    render();
    fixture.componentRef.setInput('reference', { value: 120, label: 'Meta 120 g' });
    fixture.detectChanges();

    expect(element().querySelector('[data-last]')?.textContent).toContain('161,4 g');
  });

  it('draws no reference line when there is none', () => {
    render();

    expect(element().querySelector('[data-reference]')).toBeNull();
  });

  it('draws no band when there is none', () => {
    render();

    expect(element().querySelector('[data-band]')).toBeNull();
  });

  it('writes the values of the grid lines and the days of the axis', () => {
    render(band);

    const ticks = Array.from(element().querySelectorAll('[data-tick]')).map((tick) =>
      tick.textContent?.trim(),
    );
    const days = Array.from(element().querySelectorAll('[data-day]')).map((day) =>
      day.textContent?.trim(),
    );
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.every((tick) => tick?.endsWith(' g'))).toBe(true);
    expect(days).toEqual(['27/08', '03/09', '10/09', '17/09', '24/09']);
  });

  it('writes the value of the last point next to it', () => {
    render();

    expect(element().querySelector('[data-last]')?.textContent?.trim()).toBe('161,4 g');
  });

  it('draws the line through every point', () => {
    render();

    const path = element().querySelector('[data-line]')!.getAttribute('d') ?? '';
    expect(path.match(/[ML]/g)).toHaveLength(points.length);
  });

  it('announces the last point when the keyboard reaches the chart, and the previous one with the left arrow', () => {
    render();

    explorer().dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(status()).toBe('161,4 g em 24/09/2026');

    key('ArrowLeft');
    expect(status()).toBe('158 g em 17/09/2026');

    key('ArrowRight');
    key('ArrowRight');
    expect(status()).toBe('161,4 g em 24/09/2026');
  });

  it('shows the tip of the chosen point, and hides it when the keyboard leaves', () => {
    render();

    explorer().dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(element().querySelector('.chart-tip')?.textContent).toContain('161,4 g em 24/09/2026');

    explorer().dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(element().querySelector('.chart-tip')).toBeNull();
  });

  /** O gráfico num cartão da largura dada, como no celular (QA da 005: o desenho encolhia com o texto). */
  async function renderAt(width: number): Promise<void> {
    TestBed.configureTestingModule({ imports: [LineChart] });
    fixture = TestBed.createComponent(LineChart);
    Object.defineProperty(element(), 'clientWidth', { configurable: true, value: width });
    fixture.componentRef.setInput('label', 'Evolução do peso médio da gaiola A-01');
    fixture.componentRef.setInput('points', points);
    document.body.appendChild(element());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('draws at the width of the card, for the text to keep its size on a phone', async () => {
    await renderAt(334);

    const svg = element().querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 334 220');
    expect(svg.getAttribute('width')).toBe('334');
    expect(svg.getAttribute('height')).toBe('220');
  });

  it('spaces the days of the axis on a phone, counting from the last one, which is always written', async () => {
    // QA da 005, rodada 2: com 12 pesagens em 390 px, as duas últimas datas ficavam uma sobre a outra.
    const twelve = Array.from({ length: 12 }, (_, week) => ({
      label: `${String(week + 1).padStart(2, '0')}/09`,
      value: 150 + week,
      text: `${150 + week} g`,
    }));
    for (const width of [246, 316, 390, 640]) {
      TestBed.resetTestingModule();
      await renderAt(width);
      fixture.componentRef.setInput('points', twelve);
      fixture.detectChanges();

      const days = Array.from(element().querySelectorAll('[data-day]'));
      const xs = days.map((day) => Number(day.getAttribute('x')));
      const gaps = xs.slice(1).map((x, index) => x - xs[index]);
      expect(days.at(-1)?.textContent?.trim()).toBe('12/09');
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(40);
    }
  });

  it('draws again when the card changes width, and stops watching when it leaves', async () => {
    let resized: () => void = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    await renderAt(334);

    Object.defineProperty(element(), 'clientWidth', { configurable: true, value: 700 });
    resized();
    fixture.detectChanges();
    const drawn = element().querySelector('svg')!.getAttribute('viewBox');
    fixture.destroy();

    expect(drawn).toBe('0 0 700 220');
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps the tip of the first point inside the chart, above the point', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
    await renderAt(334);

    explorer().dispatchEvent(new FocusEvent('focus'));
    explorer().dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    const tip = element().querySelector<HTMLElement>('.chart-tip')!;
    const [left, top] = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/
      .exec(tip.style.transform)!
      .slice(1)
      .map(Number);
    const first = element().querySelector('circle:last-of-type')!;
    expect(left).toBe(0);
    expect(top).toBeLessThan(Number(first.getAttribute('cy')));
    vi.restoreAllMocks();
  });

  it('keeps the tip of the last point inside the chart', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
    await renderAt(334);

    explorer().dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    await fixture.whenStable();

    const tip = element().querySelector<HTMLElement>('.chart-tip')!;
    const left = Number(/translate\((-?[\d.]+)px/.exec(tip.style.transform)![1]);
    expect(left).toBe(334 - 150);
    vi.restoreAllMocks();
  });

  it('draws nothing without points', () => {
    TestBed.configureTestingModule({ imports: [LineChart] });
    fixture = TestBed.createComponent(LineChart);
    fixture.componentRef.setInput('label', 'Evolução do peso médio da gaiola B-07');
    fixture.componentRef.setInput('points', []);
    fixture.detectChanges();

    expect(element().querySelector('svg')).toBeNull();
  });
});
