import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <ovyx-empty-state title="Nenhum responsável encontrado" message="Busque por outro trecho do nome.">
      <a href="/responsaveis/novo">Novo responsável</a>
    </ovyx-empty-state>
    <ovyx-empty-state title="Acesso negado" [level]="1" />
  `,
})
class EmptyStates {}

/** Estado vazio: o que aconteceu e o próximo passo, com o título no nível certo da página. */
describe('EmptyState', () => {
  function render(): HTMLElement[] {
    TestBed.configureTestingModule({ imports: [EmptyStates] });
    const fixture = TestBed.createComponent(EmptyStates);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.empty'));
  }

  it('says what happened below a heading that does not skip levels under the page title', () => {
    const [inPage] = render();

    expect(inPage.querySelector('h2')?.textContent).toBe('Nenhum responsável encontrado');
    expect(inPage.querySelector('p')?.textContent).toBe('Busque por outro trecho do nome.');
  });

  it('offers the next step it is given', () => {
    const [inPage] = render();

    expect(inPage.querySelector('a')?.textContent).toBe('Novo responsável');
  });

  it('makes the title the heading of the page when it is the whole page', () => {
    const [, wholePage] = render();

    expect(wholePage.querySelector('h1')?.textContent).toBe('Acesso negado');
    expect(wholePage.querySelector('p')).toBeNull();
  });

  it('keeps the emblem out of the accessibility tree', () => {
    const [inPage] = render();

    expect(inPage.querySelector('.emblem svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
