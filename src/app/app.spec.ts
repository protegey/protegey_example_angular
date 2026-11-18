import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ProtegeyService } from './protegey.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // Stub the SDK: the real client needs an API key + base URL (window globals set in
      // index.html) and would make network calls / fingerprint the test DOM on construction.
      providers: [
        {
          provide: ProtegeyService,
          useValue: { client: { device: { identify: async () => ({ recorded: true, action: 'ALLOW', riskScore: 0, visitorId: 'test-visitor' }) } } },
        },
      ],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the demo page title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Protegey — Angular example');
  });
});
