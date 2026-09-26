import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryItem, SummaryStrip } from './summary-strip';

/**
 * Faixa de resumo, o `.summary` do design system: um objeto só, com divisórias, no topo das telas de
 * lançamento. Cada item tem o rótulo, o valor e, se houver, uma nota.
 */
describe('SummaryStrip', () => {
  let fixture: ComponentFixture<SummaryStrip>;

  const items: readonly SummaryItem[] = [
    { label: 'Ovos coletados', value: '89', note: '2 gaiolas' },
    { label: 'Não comercializáveis', value: '4' },
  ];

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function render(): void {
    TestBed.configureTestingModule({ imports: [SummaryStrip] });
    fixture = TestBed.createComponent(SummaryStrip);
    fixture.componentRef.setInput('label', 'Totais de produção do dia');
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  }

  it('is a list named for the screen reader, in the summary style', () => {
    render();

    const strip = element().querySelector('.summary')!;
    expect(strip.getAttribute('role')).toBe('list');
    expect(strip.getAttribute('aria-label')).toBe('Totais de produção do dia');
    expect(strip.querySelectorAll('[role="listitem"]')).toHaveLength(2);
  });

  it('shows the label, the value and the note of each item', () => {
    render();

    const first = element().querySelectorAll('[role="listitem"]')[0];
    expect(first.querySelector('span')?.textContent?.trim()).toBe('Ovos coletados');
    expect(first.querySelector('b')?.textContent?.trim()).toBe('89');
    expect(first.querySelector('em')?.textContent?.trim()).toBe('2 gaiolas');
  });

  it('leaves the note out of an item without one', () => {
    render();

    const second = element().querySelectorAll('[role="listitem"]')[1];
    expect(second.querySelector('b')?.textContent?.trim()).toBe('4');
    expect(second.querySelector('em')).toBeNull();
  });
});
