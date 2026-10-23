import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { UiIcon } from '@app/shared/icons/ui-icon/ui-icon';

@Component({
  selector: 'app-dialog',
  imports: [UiIcon],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss'
})
export class Dialog {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    afterNextRender(() => this.dialogEl().nativeElement.showModal());
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement) {
      this.closed.emit();
    }
  }
}