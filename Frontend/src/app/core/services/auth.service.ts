import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environment/environment';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { jwtDecode } from 'jwt-decode';

export interface DecodedToken {
  user: {
    id: number;
    nombre: string;
    email: string;
    roles: string[];
    avatar_url?: string;
  };
  iat: number;
  exp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private readonly apiAuthUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<DecodedToken['user'] | null>(this.getUserFromToken());

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('jwt_token');
    }
    return null;
  }

  saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('jwt_token', token);
      this.currentUser.set(this.getUserFromToken());
    }
  }

  private getUserFromToken(): DecodedToken['user'] | null {
    const token = this.getToken();
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          return decoded.user;
        }
      } catch (error) {
        console.error('Error decodificando el token:', error);
      }
    }
    return null;
  }

  loginWithGoogle(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = `${this.apiAuthUrl}/google`;
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('jwt_token');
    }
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return !!user && user.roles.includes(role);
  }
}

