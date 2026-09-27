import { TestBed } from '@angular/core/testing';
import { Avatar, initialsOf } from './avatar';

/** Avatar com as iniciais: decoração ao lado do nome, que o leitor de tela lê do texto. */
describe('Avatar', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Avatar] }));

  function render(name: string, tone?: 'gema' | 'capim' | 'ceu'): HTMLElement {
    const fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('name', name);
    if (tone) {
      fixture.componentRef.setInput('tone', tone);
    }
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.avatar')!;
  }

  it('shows the initials of the first two words of the name', () => {
    expect(render('João Pereira de Souza').textContent?.trim()).toBe('JP');
  });

  it('stays out of the accessibility tree, since the name is always beside it', () => {
    expect(render('Maria Silva').getAttribute('aria-hidden')).toBe('true');
  });

  it('takes the tone of the design system it is given', () => {
    expect(render('Maria Silva', 'capim').classList).toContain('alt');
    expect(render('Maria Silva', 'ceu').classList).toContain('alt2');
  });
});

describe('initialsOf', () => {
  it('ignores extra spaces between the words', () => {
    expect(initialsOf('  maria   silva ')).toBe('MS');
  });

  it('takes a single initial from a single word', () => {
    expect(initialsOf('Maria')).toBe('M');
  });
});
