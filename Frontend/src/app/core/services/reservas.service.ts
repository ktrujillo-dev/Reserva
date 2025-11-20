import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService } from './auth.service';

export interface Reserva {
  id: number;
  usuario_id: number;
  sala_id: number;
  evento_calendar_id: string;
  meet_link: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  // Campos que vienen del JOIN en la API
  sala_nombre?: string;
  sala_color?: string;
  usuario_nombre?: string;
  invitados?: string[];
  equipos?: string[] ;
}

// Para crear una nueva reserva
export type NuevaReserva = Omit<Reserva, 'id' | 'usuario_id' | 'evento_calendar_id' | 'meet_link'> & {
  invitados?: string[];
};

@Injectable({
  providedIn: 'root'
})
export class ReservasService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reservas`;

  getReservas(startDate: Date, endDate: Date): Observable<Reserva[]> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get<Reserva[]>(this.apiUrl, { params });
  }

  createReserva(reserva: NuevaReserva): Observable<HttpResponse<Reserva>> {
    return this.http.post<Reserva>(this.apiUrl, reserva, { observe: 'response' });
  }

  deleteReserva(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getMisReservasActivas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/mis-activas`);
  }

  updateReserva(id: number, cambios: Partial<Reserva>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, cambios);
  }
}
