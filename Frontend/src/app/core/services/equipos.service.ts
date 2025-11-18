import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

export interface Equipo {
  id: number;
  nombre: string;
  descripcion?: string;
  disponible: boolean;
}

export interface HistorialEquipo {
  equipo_nombre: string;
  usuario_nombre: string;
  reserva_titulo: string;
  sala_nombre: string;
  fecha_asignacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class EquiposService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/equipos`;

  getEquipos(): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(this.apiUrl);
  }

  createEquipo(equipo: Omit<Equipo, 'id' | 'disponible'>): Observable<Equipo> {
    return this.http.post<Equipo>(this.apiUrl, equipo);
  }

  updateEquipo(id: number, equipo: Partial<Equipo>): Observable<Equipo> {
    return this.http.put<Equipo>(`${this.apiUrl}/${id}`, equipo);
  }

  deleteEquipo(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getHistorial(): Observable<HistorialEquipo[]> {
    return this.http.get<HistorialEquipo[]>(`${this.apiUrl}/historial`);
  }
}
