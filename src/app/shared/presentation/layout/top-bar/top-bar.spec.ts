import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TopBar } from './top-bar';

/** Quem usa a barra: encaixa uma ação à direita, como o seletor de tema. */
@Component({
  imports: [TopBar],
  template: `<ovyx-top-bar [crumbs]="['Início']" menuId="gaveta">
    <button type="button" top-bar-actions>Ação</button>
  </ovyx-top-bar>`,
})
class Host {}

/** A barra do topo (feature 011): o encaixe à direita, para as ações da casca. */
describe('TopBar', () => {
  it('shows the actions given to it at the right end of the bar', async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const bar = (fixture.nativeElement as HTMLElement).querySelector('.topbar')!;
    const action = bar.querySelector('[top-bar-actions]');

    expect(action?.textContent).toContain('Ação');
    expect(bar.lastElementChild).toBe(action);
  });
});
