import { TestBed } from '@angular/core/testing';
import { Brand } from './brand';

/** A marca: o ovo de codorna, decorativo, e o nome Ovyx, com a linha de apoio. */
describe('Brand', () => {
  function render(tagline?: string): HTMLElement {
    TestBed.configureTestingModule({ imports: [Brand] });
    const fixture = TestBed.createComponent(Brand);
    if (tagline) {
      fixture.componentRef.setInput('tagline', tagline);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the name Ovyx with the default tagline', () => {
    const element = render();

    expect(element.querySelector('.brand-name')?.textContent).toBe('Ovyx');
    expect(element.querySelector('.side-farm')?.textContent).toBe('Gestão de postura');
  });

  it('takes the tagline it is given', () => {
    expect(render('Acesso restrito').querySelector('.side-farm')?.textContent).toBe('Acesso restrito');
  });

  it('keeps the mark out of the accessibility tree, since the name is written beside it', () => {
    expect(render().querySelector('.brand-mark')?.getAttribute('aria-hidden')).toBe('true');
  });
});
