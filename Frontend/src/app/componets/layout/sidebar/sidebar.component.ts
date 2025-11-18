import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  private router = inject(Router);
  layoutService = inject(LayoutService);

  menuItems = [
    { label: 'Dashboard', icon: '📊', route: '/admin/dashboard' },
    { label: 'Salas', icon: '🏢', route: '/admin/salas' },
    { label: 'Calendario', icon: '📅', route: '/admin/calendario' },
    { label: 'Equipos', icon: '🔌', route: '/admin/equipos' },
    { label: 'Historial Equipos', icon: '📜', route: '/admin/equipo-historial' },
    { label: 'Usuarios', icon: '👥', route: '/usuarios' },
    { label: 'Configuración', icon: '⚙️', route: '/configuracion' },
  ];

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
