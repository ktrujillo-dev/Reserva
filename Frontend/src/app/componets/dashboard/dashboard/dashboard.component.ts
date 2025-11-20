import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ReservasService, Reserva } from '../../../core/services/reservas.service';
import Swal, { SweetAlertResult } from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private reservasService = inject(ReservasService);
  
  reservasActivas: Reserva[] = [];

  ngOnInit(): void {
    this.loadMisReservasActivas();
  }

loadMisReservasActivas(): void {
    this.reservasService.getMisReservasActivas().subscribe(data => {
      
      // 1. Transformamos los datos antes de asignarlos
      const reservasFormateadas = data.map(reserva => {
        
        // Corrección EQUIPOS: Si viene como string "A,B", lo convertimos a array ["A","B"]
        let equiposArray: string[] = [];
        if (typeof reserva.equipos === 'string') {
            // @ts-ignore: Si TS se queja, forzamos el tipo string para el split
            equiposArray = (reserva.equipos as string).split(',');
        } else if (Array.isArray(reserva.equipos)) {
            equiposArray = reserva.equipos;
        }

        // Corrección INVITADOS: (Por seguridad, hacemos lo mismo)
        let invitadosArray: string[] = [];
        if (typeof reserva.invitados === 'string') {
             // @ts-ignore
            invitadosArray = (reserva.invitados as string).split(',');
        } else if (Array.isArray(reserva.invitados)) {
            invitadosArray = reserva.invitados;
        }

        return {
          ...reserva,
          equipos: equiposArray,
          invitados: invitadosArray
        };
      });

      // 2. Ordenamos y asignamos
      this.reservasActivas = reservasFormateadas.sort((a, b) => 
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


