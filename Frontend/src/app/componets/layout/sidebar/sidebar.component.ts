import { Component, Input, inject } from '@angular/core';
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
  authService = inject(AuthService);
  
  @Input() isCollapsed = false;

  menuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard',  roles: [ROLES.ADMIN, ROLES.USER] },
    { label: 'Salas', icon: 'meeting_room', route: '/admin/salas',  roles: [ROLES.ADMIN] },
    { label: 'Calendario', icon: 'calendar_today', route: '/admin/calendario', roles: [ROLES.ADMIN, ROLES.USER] },
    { label: 'Equipos', icon: 'computer', route: '/admin/equipos',  roles: [ROLES.ADMIN]},
    { label: 'Historial Equipos', icon: 'history', route: '/admin/equipo-historial', roles: [ROLES.ADMIN, ROLES.USER] },
    { label: 'Usuarios', icon: 'people', route: '/usuarios',  roles: [ROLES.ADMIN] },
    { label: 'Configuración', icon: 'settings', route: '/configuracion',  roles: [ROLES.ADMIN] },
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
