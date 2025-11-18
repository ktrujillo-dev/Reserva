import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService } from './auth.service';

export interface Sala {
  id: number;
  nombre: string;
  capacidad: number;
  descripcion?: string;
  calendar_id?: string;
  activa: boolean;
  color?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SalasService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/salas`;

  getSalas(): Observable<Sala[]> {
    return this.http.get<Sala[]>(this.apiUrl);
  }

  createSala(sala: Omit<Sala, 'id' | 'activa'>): Observable<Sala> {
    return this.http.post<Sala>(this.apiUrl, sala);
  }

  updateSala(id: number, sala: Omit<Sala, 'id' | 'activa'>): Observable<Sala> {
    return this.http.put<Sala>(`${this.apiUrl}/${id}`, sala);
  }

  deleteSala(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
