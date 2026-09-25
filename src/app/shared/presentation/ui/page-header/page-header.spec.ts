import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <ovyx-page-header eyebrow="Administração" title="Responsáveis" subtitle="Quem pode entrar no sistema.">
      <a href="/novo">Novo</a>
    </ovyx-page-header>
  `,
})
class PageWithHeader {}

/** Cabeçalho de página: o título é o `<h1>` da tela, e as ações ficam ao lado dele. */
describe('PageHeader', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ imports: [PageWithHeader] });
    const fixture = TestBed.createComponent(PageWithHeader);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('makes the title the heading of the page and keeps the actions beside it', () => {
    const element = render();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Responsáveis');
    expect(element.querySelector('.page-head .actions a')?.textContent).toBe('Novo');
  });

  it('shows the area above the title and a sentence about the page below it', () => {
    const element = render();

    expect(element.querySelector('.eyebrow')?.textContent?.trim()).toBe('Administração');
    expect(element.querySelector('.page-sub')?.textContent?.trim()).toBe('Quem pode entrar no sistema.');
  });
});
