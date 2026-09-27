import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthLayout } from './auth-layout';

@Component({
  imports: [AuthLayout],
  template: `
    <ovyx-auth-layout>
      <form class="login-form"><h1>Entrar</h1></form>
    </ovyx-auth-layout>
  `,
})
class SignInScreen {}

/** Layout das telas de acesso: o painel da marca e o formulário que a tela projeta. */
describe('AuthLayout', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ imports: [SignInScreen] });
    const fixture = TestBed.createComponent(SignInScreen);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('puts the form beside the brand panel, as the login grid of the design system expects', () => {
    const login = render().querySelector('main.login')!;

    expect(Array.from(login.children).map((child) => child.className)).toEqual(['login-art', 'login-form']);
  });

  it('leaves the only first-level heading to the form', () => {
    // A frase do painel é um parágrafo: o título da tela é o que a pessoa veio fazer.
    const element = render();

    expect(Array.from(element.querySelectorAll('h1')).map((heading) => heading.textContent)).toEqual(['Entrar']);
    expect(element.querySelector('.login-art .headline')?.tagName).toBe('P');
  });

  it('keeps the illustration out of the accessibility tree', () => {
    expect(render().querySelector('.login-art img')?.getAttribute('alt')).toBe('');
  });
});
