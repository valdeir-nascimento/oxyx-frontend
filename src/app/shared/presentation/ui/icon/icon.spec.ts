import { TestBed } from '@angular/core/testing';
import { Icon, IconSize } from './icon';
import { IconName } from './icons';

/** Ícone do design system: sempre decorativo, desenhado forma por forma, sem innerHTML. */
describe('Icon', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Icon] }));

  function render(name: IconName, size?: IconSize): SVGElement {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', name);
    if (size) {
      fixture.componentRef.setInput('size', size);
    }
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('svg')!;
  }

  it('is hidden from the screen reader and from the keyboard, since the control around it names the action', () => {
    const svg = render('plus');

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
  });

  it('draws each shape of the icon as an SVG element', () => {
    const svg = render('clock');

    expect(svg.querySelector('circle')?.getAttribute('r')).toBe('9');
    expect(svg.querySelector('path')?.getAttribute('d')).toBe('M12 7v5l3 2');
  });

  it('keeps the dashed outline of the empty box', () => {
    expect(render('box').querySelector('rect')?.getAttribute('stroke-dasharray')).toBe('3 3');
  });

  it('draws a solid rectangle when the shape has no dash', () => {
    expect(render('cage').querySelector('rect')?.hasAttribute('stroke-dasharray')).toBe(false);
  });

  it('uses the size classes of the design system, with 20 px as the default', () => {
    expect(render('plus').getAttribute('class')).toBe('i');
    expect(render('plus', 18).classList).toContain('s18');
  });
});
