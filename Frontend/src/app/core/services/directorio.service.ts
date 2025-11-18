import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environment/environment';

export interface Contacto {
  nombre: string;
  email: string;
  avatar_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DirectorioService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/directorio`;

  search(term: string): Observable<Contacto[]> {
    if (term.length < 3) {
      return of([]);
    }
    return this.http.get<Contacto[]>(`${this.apiUrl}/search?q=${term}`);
  }

  getContactosByEmails(emails: string[]): Observable<Contacto[]> {
    return this.http.post<Contacto[]>(`${this.apiUrl}/by-emails`, { emails });
  }
}
