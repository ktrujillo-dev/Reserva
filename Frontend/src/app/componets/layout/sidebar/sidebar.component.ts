import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { AuthService } from '../../../core/services/auth.service';

export const ROLES = {
  ADMIN: 'administrador',
  USER: 'user',
};


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
    { label: 'Dashboard', icon: '📊', route: '/admin/dashboard',  roles: [ROLES.ADMIN, ROLES.USER] },
    { label: 'Salas', icon: '🏢', route: '/admin/salas',  roles: [ROLES.ADMIN] },
    { label: 'Calendario', icon: '📅', route: '/admin/calendario', roles: [ROLES.ADMIN, ROLES.USER] },
    { label: 'Equipos', icon: '🔌', route: '/admin/equipos',  roles: [ROLES.ADMIN]},
    { label: 'Historial Equipos', icon: '📜', route: '/admin/equipo-historial', roles: [ROLES.ADMIN, ROLES.USER] },
    { label: 'Usuarios', icon: '👥', route: '/usuarios',  roles: [ROLES.ADMIN] },
    { label: 'Configuración', icon: '⚙️', route: '/configuracion',  roles: [ROLES.ADMIN] },
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
