import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pager, rangeOf, visiblePages } from './pager';

/** Paginação: o intervalo mostrado e as páginas, que começam em zero na API e em um na tela. */
describe('Pager', () => {
  let fixture: ComponentFixture<Pager>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function named(label: string): HTMLButtonElement {
    return element().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
  }

  function render(page: number, totalPages: number, totalElements: number): void {
    TestBed.configureTestingModule({ imports: [Pager] });
    fixture = TestBed.createComponent(Pager);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('size', 20);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.componentRef.setInput('totalElements', totalElements);
    fixture.detectChanges();
  }

  function requested(): ReturnType<typeof vi.fn> {
    const pageChange = vi.fn();
    fixture.componentInstance.pageChange.subscribe(pageChange);
    return pageChange;
  }

  it('is a navigation region named for the screen reader', () => {
    render(0, 3, 45);

    expect(element().querySelector('nav')?.getAttribute('aria-label')).toBe('Paginação');
  });

  it('shows the range on screen, in the Brazilian format', () => {
    render(1, 9, 170);

    expect(element().querySelector('.pager > span')?.textContent).toBe('21–40 de 170');
  });

  it('numbers the pages from one, and marks the current one', () => {
    render(1, 3, 45);

    const pages = ['Página 1', 'Página 2', 'Página 3'].map(named);
    expect(pages.map((page) => page.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(pages.map((page) => page.getAttribute('aria-current'))).toEqual([null, 'page', null]);
  });

  it('asks for the page chosen, counted from zero', () => {
    render(0, 3, 45);
    const pageChange = requested();

    named('Página 3').click();

    expect(pageChange).toHaveBeenCalledWith(2);
  });

  it('asks for nothing when the current page is chosen again', () => {
    render(1, 3, 45);
    const pageChange = requested();

    named('Página 2').click();

    expect(pageChange).not.toHaveBeenCalled();
  });

  it('steps to the previous and to the next page', () => {
    render(1, 3, 45);
    const pageChange = requested();

    named('Página anterior').click();
    named('Próxima página').click();

    expect(pageChange.mock.calls).toEqual([[0], [2]]);
  });

  it('cannot step back from the first page nor forward from the last one, and keeps the focus on the button', () => {
    // QA (D-3): desabilitado de verdade, o botão perdia o foco ao chegar à última página, e o Tab
    // seguinte levava ao começo da tela. Com aria-disabled, ele continua focável e só não faz nada.
    render(0, 1, 5);
    const pageChange = requested();
    const next = named('Próxima página');
    next.focus();

    named('Página anterior').click();
    next.click();

    expect(named('Página anterior').getAttribute('aria-disabled')).toBe('true');
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(next.disabled).toBe(false);
    expect(document.activeElement).toBe(next);
    expect(pageChange).not.toHaveBeenCalled();
  });
});

describe('rangeOf', () => {
  it('ends at the total on the last page', () => {
    expect(rangeOf(8, 20, 170)).toBe('161–170 de 170');
  });

  it('starts at zero when there is nothing', () => {
    expect(rangeOf(0, 20, 0)).toBe('0–0 de 0');
  });

  it('separates the thousands as in Portuguese', () => {
    expect(rangeOf(99, 20, 2500)).toBe('1.981–2.000 de 2.500');
  });
});

describe('visiblePages', () => {
  it('shows every page when there are few', () => {
    expect(visiblePages(0, 3)).toEqual([0, 1, 2]);
  });

  it('keeps the current page in the middle of five', () => {
    expect(visiblePages(5, 10)).toEqual([3, 4, 5, 6, 7]);
  });

  it('does not go past the first nor the last page', () => {
    expect(visiblePages(0, 10)).toEqual([0, 1, 2, 3, 4]);
    expect(visiblePages(9, 10)).toEqual([5, 6, 7, 8, 9]);
  });

  it('shows no page when there is none', () => {
    expect(visiblePages(0, 0)).toEqual([]);
  });
});
