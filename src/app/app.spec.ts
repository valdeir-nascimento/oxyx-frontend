import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('creates the application shell', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('wraps the screens in the container the design system measures its width by', () => {
    // O design system responde por container queries no contêiner "app", e não pela janela.
    expect(render().querySelector('.av-app-root > router-outlet')).not.toBeNull();
  });

  it('keeps the toast region at the root, so a toast survives the change of screen', () => {
    expect(render().querySelector('.av-app-root > ovyx-toast-stack [role="status"]')).not.toBeNull();
  });
});
