import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ReservasService, Reserva } from '../../../core/services/reservas.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import Swal, { SweetAlertResult } from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private reservasService = inject(ReservasService);
  private webSocketService = inject(WebSocketService);
  
  reservasActivas: Reserva[] = [];
  private websocketSubscription!: Subscription;

  ngOnInit(): void {
    this.loadMisReservasActivas();

    // Escuchar eventos de WebSocket para actualizaciones en tiempo real
    this.websocketSubscription = this.webSocketService.listen('reservas_actualizadas').subscribe(() => {
      console.log('Dashboard: ¡Actualización de reservas recibida por WebSocket!');
      this.loadMisReservasActivas();
    });
  }

  ngOnDestroy(): void {
    if (this.websocketSubscription) {
      this.websocketSubscription.unsubscribe();
    }
  }

  loadMisReservasActivas(): void {
    this.reservasService.getMisReservasActivas().subscribe(data => {
      // Ordenar las reservas por fecha de inicio
      this.reservasActivas = data.sort((a, b) => 
        new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
      );
    });
  }

  showReservaDetails(reserva: Reserva): void {
    const invitadosHtml = reserva.invitados && reserva.invitados.length > 0
      ? `<ul>${reserva.invitados.map((email: string) => `<li>${email}</li>`).join('')}</ul>`
      : '<p>No hay invitados adicionales.</p>';

    const equipoHtml = reserva.equipos && reserva.equipos.length > 0
      ? `<ul>${reserva.equipos.map((equipo: string) => `<li>${equipo}</li>`).join('')}</ul>`
      : '<p>No se solicitó equipo.</p>';

    Swal.fire({
      title: reserva.titulo,
      html: `
        <div style="text-align: left; padding: 0 1rem;">
          <p><strong>Sala:</strong> ${reserva.sala_nombre}</p>
          <p><strong>Reservado por:</strong> ${reserva.usuario_nombre}</p>
          <p><strong>Horario:</strong> ${new Date(reserva.fecha_inicio).toLocaleString()} - ${new Date(reserva.fecha_fin).toLocaleString()}</p>
          <hr>
          <p><strong>Descripción:</strong> ${reserva.descripcion || 'N/A'}</p>
          <p><strong>Invitados:</strong></p>
          ${invitadosHtml}
          <p><strong>Equipamiento Solicitado:</strong></p>
          ${equipoHtml}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Unirse a Meet',
      cancelButtonText: 'Cerrar',
    }).then((result: SweetAlertResult) => {
      if (result.isConfirmed) {
        window.open(reserva.meet_link, '_blank');
      }
    });
  }
}


