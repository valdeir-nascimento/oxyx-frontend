import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Navigation } from './navigation';

/**
 * A navegação desenha os itens que recebe, na ordem em que vieram. Quem escolhe os itens pelo
 * perfil (FR-011) é a casca de `identity`; o teste dessa escolha está lá.
 */
describe('Navigation', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navigation],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('draws one link per item, in order, pointing to its route', () => {
    const fixture = TestBed.createComponent(Navigation);
    fixture.componentRef.setInput('items', [
      { label: 'Início', route: '/' },
      { label: 'Setores', route: '/setores' },
    ]);
    fixture.detectChanges();

    const anchors = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));

    expect(anchors.map((anchor) => anchor.textContent?.trim())).toEqual(['Início', 'Setores']);
    expect(anchors[1].getAttribute('href')).toBe('/setores');
  });
});
