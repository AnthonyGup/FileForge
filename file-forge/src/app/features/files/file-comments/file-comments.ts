import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ApiError, Comment } from '@app/core/models';
import { CommentApi } from '@app/core/api';
import { Auth } from '@app/core/services/auth';
import { Toast } from '@app/core/services/toast';
import { UiIcon } from '@app/shared/icons/ui-icon/ui-icon';
import { ConfirmDialog } from '@app/shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-file-comments',
  imports: [DatePipe, UiIcon, ConfirmDialog],
  templateUrl: './file-comments.html',
  styleUrl: './file-comments.scss'
})
export class FileComments {
  private readonly commentApi = inject(CommentApi);
  private readonly toast = inject(Toast);
  private readonly auth = inject(Auth);

  readonly fileId = input.required<string>();
  readonly canComment = input(false);
  readonly canModerate = input(false);

  protected readonly comments = signal<Comment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly text = signal('');
  protected readonly sending = signal(false);
  protected readonly sendError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editText = signal('');
  protected readonly savingId = signal<string | null>(null);
  protected readonly pendingDelete = signal<Comment | null>(null);
  protected readonly deleting = signal(false);

  protected readonly meId = computed(() => this.auth.user()?.id ?? null);

  private readonly refreshTick = signal(0);

  constructor() {
    toObservable(computed(() => ({ id: this.fileId(), tick: this.refreshTick() })))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ id }) =>
          this.commentApi.list(id).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.comments.set(result ?? []);
        this.loading.set(false);
      });
  }

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected submit(): void {
    if (this.sending() || !this.text().trim()) return;
    this.sending.set(true);
    this.sendError.set(null);

    this.commentApi.create(this.fileId(), { text: this.text().trim() }).subscribe({
      next: () => {
        this.sending.set(false);
        this.text.set('');
        this.toast.success('Comentario publicado');
        this.refreshTick.update(v => v + 1);
      },
      error: (e: ApiError) => {
        this.sending.set(false);
        this.sendError.set(e.message);
        this.toast.error(e.message);
      }
    });
  }

  protected isAuthor(comment: Comment): boolean {
    return comment.author.id === this.meId();
  }

  protected canEdit(comment: Comment): boolean {
    return this.isAuthor(comment);
  }

  protected canDelete(comment: Comment): boolean {
    return this.isAuthor(comment) || this.canModerate();
  }

  protected startEdit(comment: Comment): void {
    this.editingId.set(comment.id);
    this.editText.set(comment.text);
    this.sendError.set(null);
  }

  protected onEditInput(event: Event): void {
    this.editText.set((event.target as HTMLTextAreaElement).value);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editText.set('');
  }

  protected saveEdit(comment: Comment): void {
    const text = this.editText().trim();
    if (!text || this.savingId()) return;
    this.savingId.set(comment.id);
    this.sendError.set(null);

    this.commentApi.update(this.fileId(), comment.id, { text }).subscribe({
      next: () => {
        this.savingId.set(null);
        this.editingId.set(null);
        this.editText.set('');
        this.toast.success('Comentario actualizado');
        this.refreshTick.update(v => v + 1);
      },
      error: (e: ApiError) => {
        this.savingId.set(null);
        this.sendError.set(e.message);
        this.toast.error(e.message);
      }
    });
  }

  protected requestDelete(comment: Comment): void {
    this.pendingDelete.set(comment);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const comment = this.pendingDelete();
    if (!comment || this.deleting()) return;
    this.deleting.set(true);
    this.commentApi.remove(this.fileId(), comment.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success('Comentario eliminado');
        this.refreshTick.update(v => v + 1);
      },
      error: (e: ApiError) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.error(e.message);
      }
    });
  }
}