import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Kpi } from './kpi';

/**
 * O indicador do design system (`.kpi` do protótipo, R-009 da 006): o rótulo, o valor, a variação com o tom
 * que diz se ela é boa ou ruim, a comparação e a tendência dos últimos dias. Não conhece produção: recebe
 * tudo já escrito.
 */
describe('Kpi', () => {
  let fixture: ComponentFixture<Kpi>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function render(inputs: Record<string, unknown>): void {
    TestBed.configureTestingModule({ imports: [Kpi] });
    fixture = TestBed.createComponent(Kpi);
    fixture.componentRef.setInput('label', 'Produção');
    fixture.componentRef.setInput('icon', 'egg');
    fixture.componentRef.setInput('comparison', 'vs ontem');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  }

  function text(selector: string): string {
    return element().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  it('shows the label, the value and the unit', () => {
    render({ value: '1.740', unit: 'ovos' });

    expect(text('.kpi-top')).toBe('Produção');
    expect(text('.kpi-val')).toBe('1.740 ovos');
  });

  it('shows a change in the good direction as good, with the comparison', () => {
    render({ value: '1.740', change: '+2,4%', tone: 'good' });

    const delta = element().querySelector('.delta:not(.comparison)')!;
    expect(delta.classList).toContain('good');
    expect(delta.textContent).toContain('+2,4%');
    expect(text('.comparison')).toBe('vs ontem');
  });

  it('shows a change in the wrong direction as bad', () => {
    render({ value: 'R$ 159,60', change: '+1,5%', tone: 'bad' });

    expect(element().querySelector('.delta:not(.comparison)')!.classList).toContain('bad');
  });

  it('shows no change as flat', () => {
    render({ value: '87,0%', change: '0,0 p.p.', tone: 'flat' });

    expect(element().querySelector('.delta:not(.comparison)')!.classList).toContain('flat');
  });

  it('shows a dash without value, and says there is no comparison without change', () => {
    render({});

    expect(text('.kpi-val')).toBe('—');
    expect(text('.delta:not(.comparison)')).toBe('sem comparação');
  });

  it('draws the trend with the values present, skipping the missing ones, and names it', () => {
    render({
      value: '1.740',
      trend: [1690, null, 1688, 1715, null, 1700, 1740],
      trendLabel: 'Produção dos últimos 7 dias',
    });

    const spark = element().querySelector('svg.spark')!;
    expect(spark.getAttribute('role')).toBe('img');
    expect(spark.getAttribute('aria-label')).toBe('Produção dos últimos 7 dias');
    const path = spark.querySelector('path')!.getAttribute('d')!;
    expect(path.match(/[ML]/g)).toHaveLength(5);
  });

  it('draws no trend with less than two values', () => {
    render({ value: '1.740', trend: [null, null, 1740] });

    expect(element().querySelector('svg.spark')).toBeNull();
  });

  it('writes the note of what is incomplete', () => {
    render({ value: 'R$ 30,00', note: '1 dia sem ração' });

    expect(text('.kpi-note')).toBe('1 dia sem ração');
  });

  it('highlights the icon of the production, as the prototype does', () => {
    render({ value: '1.740', highlight: true });

    expect(element().querySelector('.kpi-ico')!.classList).toContain('gema');
  });

  it('points the arrow up when the value rose, whatever the tone', () => {
    render({ value: 'R$ 159,60', change: '+1,5%', tone: 'bad', direction: 'up' });

    expect(element().querySelector('.delta:not(.comparison)')?.getAttribute('data-direction')).toBe(
      'up',
    );
  });

  it('points the arrow down when the value fell', () => {
    render({ value: 'R$ 0,092', change: '−1,1%', tone: 'good', direction: 'down' });

    expect(element().querySelector('.delta:not(.comparison)')?.getAttribute('data-direction')).toBe(
      'down',
    );
  });

  it('draws no arrow when nothing changed', () => {
    render({ value: '87,00%', change: '0,00 p.p.', tone: 'flat', direction: 'up' });

    expect(
      element().querySelector('.delta:not(.comparison)')?.getAttribute('data-direction'),
    ).toBeNull();
    expect(element().querySelector('.delta:not(.comparison) ovyx-icon')).toBeNull();
  });
});
