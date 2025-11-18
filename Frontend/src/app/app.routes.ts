import { Routes } from '@angular/router';
import { MainLayoutComponent } from './componets/layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./componets/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'auth/callback',
        loadComponent: () => import('./componets/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent)
    },
    {
        path: 'admin',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
        { 
            path: 'dashboard', 
            loadComponent: () => import('./componets/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
        },
        { 
            path: 'salas', 
            loadComponent: () => import('./componets/salas/salas.component').then(m => m.SalasComponent)
        },
        { 
            path: 'calendario', 
            loadComponent: () => import('./componets/dashboard/calendario/calendario.component').then(m => m.CalendarioComponent)
        },
        { 
            path: 'equipos', 
            loadComponent: () => import('./componets/equipos/equipos.component').then(m => m.EquiposComponent)
        },
        { 
            path: 'equipo-historial', 
            loadComponent: () => import('./componets/equipo-historial/equipo-historial.component').then(m => m.EquipoHistorialComponent)
        },
        ]
    }

];
