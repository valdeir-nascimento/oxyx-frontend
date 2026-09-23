import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Button } from './button';

/**
 * O botão é a única forma de ação do sistema. Ele não sabe o que a ação faz: recebe a variante,
 * avisa o clique e recusa o clique enquanto a operação anterior não terminou.
 */
describe('Button', () => {
  @Component({
    selector: 'ovyx-button-host',
    imports: [Button],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <ovyx-button
        [variant]="variant()"
        [type]="type()"
        [disabled]="disabled()"
        [busy]="busy()"
        (pressed)="presses.set(presses() + 1)"
      >
        Inativar
      </ovyx-button>
    `,
  })
  class ButtonHost {
    readonly variant = signal<'primary' | 'secondary' | 'danger'>('primary');
    readonly type = signal<'button' | 'submit'>('button');
    readonly disabled = signal(false);
    readonly busy = signal(false);
    readonly presses = signal(0);
  }

  @Component({
    selector: 'ovyx-button-defaults-host',
    imports: [Button],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<ovyx-button>Salvar</ovyx-button>',
  })
  class ButtonDefaultsHost {}

  async function render(): Promise<ComponentFixture<ButtonHost>> {
    await TestBed.configureTestingModule({ imports: [ButtonHost] }).compileComponents();
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();
    return fixture;
  }

  function nativeButton(fixture: ComponentFixture<ButtonHost>): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector('button')!;
  }

  it('announces the press to whoever owns the action', async () => {
    const fixture = await render();

    nativeButton(fixture).click();

    expect(fixture.componentInstance.presses()).toBe(1);
  });

  it('projects the label it was given', async () => {
    const fixture = await render();

    expect(nativeButton(fixture).textContent).toContain('Inativar');
  });

  it('carries the native type so a form can be submitted by it', async () => {
    const fixture = await render();
    fixture.componentInstance.type.set('submit');
    fixture.detectChanges();

    expect(nativeButton(fixture).type).toBe('submit');
  });

  it('refuses the press while disabled', async () => {
    const fixture = await render();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    nativeButton(fixture).click();

    expect(nativeButton(fixture).disabled).toBe(true);
    expect(fixture.componentInstance.presses()).toBe(0);
  });

  it('blocks a second press while the first one is still running', async () => {
    // Sem isto, um duplo clique em "Entrar" manda duas requisições e a segunda chega a um estado
    // que a primeira já mudou.
    const fixture = await render();
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    nativeButton(fixture).click();

    expect(nativeButton(fixture).disabled).toBe(true);
    expect(fixture.componentInstance.presses()).toBe(0);
  });

  it('tells assistive technology that the action is running', async () => {
    const fixture = await render();
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    expect(nativeButton(fixture).getAttribute('aria-busy')).toBe('true');
  });

  it('says nothing about running while the action is idle', async () => {
    expect(nativeButton(await render()).getAttribute('aria-busy')).toBeNull();
  });

  it('exposes the variant as data, so it is never told by colour alone', async () => {
    const fixture = await render();
    fixture.componentInstance.variant.set('danger');
    fixture.detectChanges();

    expect(nativeButton(fixture).dataset['variant']).toBe('danger');
  });

  it('does not submit the form around it unless that was asked', async () => {
    // Um `submit` por omissão faria o botão "Sair" da barra superior enviar qualquer formulário que
    // viesse a contê-lo, e nenhum teste perceberia.
    await TestBed.configureTestingModule({ imports: [ButtonDefaultsHost] }).compileComponents();
    const fixture = TestBed.createComponent(ButtonDefaultsHost);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.type).toBe('button');
    expect(button.dataset['variant']).toBe('primary');
  });
});
