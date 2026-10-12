import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApiError, FileItem } from '@app/core/models';
import { FileApi } from '@app/core/api';
import { Auth } from '@app/core/services/auth';
import { FileTransfer, MAX_FILE_SIZE } from '@app/core/services/file-transfer';
import { Toast } from '@app/core/services/toast';
import { ConfirmDialog } from '@app/shared/components/confirm-dialog/confirm-dialog';
import { FileSizePipe } from '@app/shared/pipes/file-size-pipe';
import { MarkdownPipe } from '@app/shared/pipes/markdown-pipe';
import { FileComments } from '../file-comments/file-comments';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';

type Mode = 'view' | 'edit';
type DiscardIntent = 'cancel' | 'leave' | null;

@Component({
  selector: 'app-file-viewer',
  imports: [DatePipe, UpperCasePipe, FileSizePipe, MarkdownPipe, ConfirmDialog, RouterLink, FileComments],
  templateUrl: './file-viewer.html',
  styleUrl: './file-viewer.scss'
})
export class FileViewer {
  private readonly fileApi = inject(FileApi);
  private readonly transfer = inject(FileTransfer);
  private readonly toast = inject(Toast);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  readonly fileId = input.required<string>();

  protected readonly file = signal<FileItem | null>(null);
  protected readonly content = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly mode = signal<Mode>('view');
  protected readonly draft = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly downloading = signal(false);
  protected readonly discardIntent = signal<DiscardIntent>(null);

  protected readonly maxSize = MAX_FILE_SIZE;
  protected readonly dirty = computed(() => this.draft() !== this.content());
  protected readonly meId = computed(() => this.auth.user()?.id ?? null);
  protected readonly byteCount = computed(() => new TextEncoder().encode(this.draft()).length);
  protected readonly backLink = computed<string[]>(() => {
    const folderId = this.file()?.folderId;
    return folderId ? ['/explorer', folderId] : ['/explorer'];
  });

  private readonly refreshTick = signal(0);

  constructor() {
    toObservable(computed(() => ({ id: this.fileId(), tick: this.refreshTick() })))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ id }) =>
          forkJoin({ file: this.fileApi.get(id), content: this.fileApi.getContent(id) }).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        if (!result) {
          this.file.set(null);
          this.loading.set(false);
          return;
        }
        this.file.set(result.file);
        this.content.set(result.content.content);
        this.draft.set(result.content.content);
        this.mode.set('view');
        this.loading.set(false);
      });
  }

  protected icon(file: FileItem): string {
    return file.extension === 'md' ? '📝' : '📄';
  }

  protected startEdit(): void {
    this.draft.set(this.content());
    this.saveError.set(null);
    this.mode.set('edit');
  }

  protected onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected cancelEdit(): void {
    if (this.dirty()) {
      this.discardIntent.set('cancel');
      return;
    }
    this.exitEdit();
  }

  protected save(): void {
    if (!this.dirty() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);

    this.fileApi.updateContent(this.fileId(), { content: this.draft() }).subscribe({
      next: updated => {
        this.saving.set(false);
        this.content.set(this.draft());
        const file = this.file();
        if (file) this.file.set({ ...file, ...updated });
        this.exitEdit();
        this.toast.success('Cambios guardados');
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        this.saveError.set(e.message);
        this.toast.error(e.message);
      }
    });
  }

  protected download(): void {
    const file = this.file();
    if (!file || this.downloading()) return;
    this.downloading.set(true);
    this.transfer.download(file).subscribe({
      next: () => this.downloading.set(false),
      error: (e: ApiError) => {
        this.downloading.set(false);
        this.toast.error(e.message);
      }
    });
  }

  protected goBack(): void {
    if (this.dirty()) {
      this.discardIntent.set('leave');
      return;
    }
    this.navigateBack();
  }

  protected confirmDiscard(): void {
    const intent = this.discardIntent();
    this.discardIntent.set(null);
    if (intent === 'leave') {
      this.navigateBack();
    } else {
      this.exitEdit();
    }
  }

  protected cancelDiscard(): void {
    this.discardIntent.set(null);
  }

  private exitEdit(): void {
    this.draft.set(this.content());
    this.mode.set('view');
    this.saveError.set(null);
  }

  private navigateBack(): void {
    this.router.navigate(this.backLink());
  }
}
