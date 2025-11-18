import { Component, inject, effect } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { SafeUrlPipe } from '../../../core/pipes/safe-url.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, TitleCasePipe, SafeUrlPipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private layoutService = inject(LayoutService);

  currentUser = this.authService.currentUser;

  constructor() {
    effect(() => {
      console.log('Datos del usuario en Navbar:', this.currentUser());
    });
  }

  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }

  logout(): void {
    this.authService.logout();
  }
}
