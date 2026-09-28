import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Distribution, DistributionPart } from './distribution';

/**
 * A distribuição do design system (`.hero-q`, `.ring` e `.bars` do protótipo, R-009 da 006): o anel com a
 * parte principal e uma barra por parte, com a quantidade e a porcentagem. Não conhece ovos: recebe tudo
 * já escrito.
 */
describe('Distribution', () => {
  let fixture: ComponentFixture<Distribution>;

  const parts: readonly DistributionPart[] = [
    { label: 'Pequenos', count: 30, countText: '30', percentText: '1,7%' },
    { label: 'Jumbo', count: 12, countText: '12', percentText: '0,7%' },
    { label: 'Trincados', count: 0, countText: '0', percentText: '0,0%' },
  ];

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function render(): void {
    TestBed.configureTestingModule({ imports: [Distribution] });
    fixture = TestBed.createComponent(Distribution);
    fixture.componentRef.setInput('label', 'Classificação dos ovos');
    fixture.componentRef.setInput('mainPercent', 94.8);
    fixture.componentRef.setInput('mainText', '94,8%');
    fixture.componentRef.setInput('mainNote', 'padrão · 1.650 de 1.740 ovos');
    fixture.componentRef.setInput('parts', parts);
    fixture.detectChanges();
  }

  it('shows the main share in the ring, with its note', () => {
    render();

    expect(element().querySelector('.hero-q')?.textContent).toContain('94,8%');
    expect(element().querySelector('.hero-q')?.textContent).toContain(
      'padrão · 1.650 de 1.740 ovos',
    );
    expect(element().querySelector('svg.ring')).not.toBeNull();
  });

  it('draws a bar for each part, with the count and the share, as wide as its count against the largest', () => {
    render();

    const rows = Array.from(element().querySelectorAll<HTMLElement>('.bar-row'));
    expect(rows.map((row) => row.querySelector('.lab')?.textContent?.trim())).toEqual([
      'Pequenos',
      'Jumbo',
      'Trincados',
    ]);
    expect(rows[0].querySelector('.val')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('30 1,7%');
    expect(rows[0].querySelector<HTMLElement>('.track i')?.style.width).toBe('100%');
    expect(rows[1].querySelector<HTMLElement>('.track i')?.style.width).toBe('40%');
    expect(rows[2].querySelector<HTMLElement>('.track i')?.style.width).toBe('2%');
  });

  it('is a list named for the screen reader', () => {
    render();

    const list = element().querySelector('.bars')!;
    expect(list.getAttribute('role')).toBe('list');
    expect(list.getAttribute('aria-label')).toBe('Classificação dos ovos');
    expect(element().querySelectorAll('[role="listitem"]')).toHaveLength(3);
  });

  function dash(): string | null {
    return element().querySelector('.ring-value')?.getAttribute('stroke-dasharray') ?? null;
  }

  it('fills the ring as much as the main share', () => {
    render();

    expect(dash()).toBe('154.9 163.4');
  });

  it('keeps the ring between empty and full', () => {
    render();
    fixture.componentRef.setInput('mainPercent', -5);
    fixture.detectChanges();
    const empty = dash();
    fixture.componentRef.setInput('mainPercent', 120);
    fixture.detectChanges();

    expect(empty).toBe('0.0 163.4');
    expect(dash()).toBe('163.4 163.4');
  });
});
