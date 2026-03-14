import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { ProjectDefinition } from '../../project-definitions';

@Component({
  selector: 'app-demo-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo-shell.component.html',
  styleUrl: './demo-shell.component.scss',
})
export class DemoShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);

  protected readonly project = toSignal(
    this.route.data.pipe(map((data) => data['project'] as ProjectDefinition)),
    { requireSync: true }
  );

  protected readonly projectUrl = computed(() =>
    new URL(this.project().legacyPath ?? '', this.document.baseURI).toString()
  );

  protected readonly safeProjectUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.projectUrl())
  );
}
