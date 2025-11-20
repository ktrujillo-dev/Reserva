import { Component, inject, EventEmitter, Output } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
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

  currentUser = this.authService.currentUser;

  // DEFINIMOS EL EVENTO DE SALIDA
  @Output() toggleSidebar = new EventEmitter<void>();

  // ESTA ES LA FUNCIÓN QUE LLAMA TU BOTÓN HTML
  onToggleSidebar() {
    this.toggleSidebar.emit(); // Emite la señal al padre (MainLayout)
  }

  logout(): void {
    this.authService.logout();
  }
}