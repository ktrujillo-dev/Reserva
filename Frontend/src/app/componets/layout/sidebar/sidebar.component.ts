import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { AuthService } from '../../../core/services/auth.service';

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
  authService = inject(AuthService);

  menuItems = [
    { label: 'Dashboard', icon: '📊', route: '/admin/dashboard', roles: ['admin', 'user'] },
    { label: 'Salas', icon: '🏢', route: '/admin/salas', roles: ['admin'] },
    { label: 'Calendario', icon: '📅', route: '/admin/calendario', roles: ['admin', 'user'] },
    { label: 'Equipos', icon: '🔌', route: '/admin/equipos', roles: ['admin'] },
    { label: 'Historial Equipos', icon: '📜', route: '/admin/equipo-historial', roles: ['admin', 'user'] },
    { label: 'Usuarios', icon: '👥', route: '/usuarios', roles: ['admin'] },
    { label: 'Configuración', icon: '⚙️', route: '/configuracion', roles: ['admin'] },
  ];

  get filteredMenuItems() {
    return this.menuItems.filter(item => 
      item.roles.some(role => this.authService.hasRole(role))
    );
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
