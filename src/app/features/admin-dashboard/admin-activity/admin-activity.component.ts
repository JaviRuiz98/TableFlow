import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { analyticsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-admin-activity',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './admin-activity.component.html',
  styleUrl: './admin-activity.component.scss',
})
export class AdminActivityComponent {
  constructor() {
    addIcons({ analyticsOutline });
  }
}
