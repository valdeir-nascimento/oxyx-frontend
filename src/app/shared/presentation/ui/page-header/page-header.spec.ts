import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `<ovyx-page-header title="Responsáveis"><a href="/novo">Novo</a></ovyx-page-header>`,
})
class PageWithHeader {}

/** Cabeçalho de página: o título é o `<h1>` da tela, e as ações ficam ao lado dele. */
describe('PageHeader', () => {
  it('makes the title the heading of the page and keeps the actions beside it', () => {
    TestBed.configureTestingModule({ imports: [PageWithHeader] });
    const fixture = TestBed.createComponent(PageWithHeader);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Responsáveis');
    expect(element.querySelector('.page-header__actions a')?.textContent).toBe('Novo');
  });
});
