import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';

@Component({
  selector: 'app-terminal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.scss',
})
export class TerminalComponent {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly src: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'projects/terminal/index.html'
  );
}
