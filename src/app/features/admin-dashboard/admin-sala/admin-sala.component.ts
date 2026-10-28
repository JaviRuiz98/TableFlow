import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mapOutline, restaurantOutline, cubeOutline, openOutline } from 'ionicons/icons';

@Component({
  selector: 'app-admin-sala',
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon],
  templateUrl: './admin-sala.component.html',
  styleUrl: './admin-sala.component.scss',
})
export class AdminSalaComponent {
  constructor() {
    addIcons({ mapOutline, restaurantOutline, cubeOutline, openOutline });
  }
}
