import { Component, inject } from '@angular/core';
import { Toast } from '@app/core/services/toast';
import { UiIcon } from '@app/shared/icons/ui-icon/ui-icon';

@Component({
  selector: 'app-toast-container',
  imports: [UiIcon],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss'
})
export class ToastContainer {
  protected readonly toast = inject(Toast);
}