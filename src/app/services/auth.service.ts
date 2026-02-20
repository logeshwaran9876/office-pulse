// auth.service.ts (Complete Fixed Version - Backend Response Compatible)

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer, of } from 'rxjs';
import { map, tap, catchError, switchMap, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

/* ============================= */
/* ✅ USER MODEL FIXED */
/* ============================= */
export interface User {
  id: string;
  email: string;
  role: string; // ✅ Accept SuperAdmin, Admin, User
  name?: string;
  permissions?: string[];
}

/* ============================= */
/* ✅ BACKEND RESPONSE FIXED */
/* ============================= */
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    uId: string;
    name: string;
    email: string;
    role: string;
    token: string;
    refreshToken: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:7000/api/auth';

  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'current_user';

  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  private refreshTokenTimeout: any;
  private isRefreshing = false;
  private logoutInProgress = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      this.getUserFromStorage()
    );

    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  /* ============================= */
  /* ✅ LOGIN FIXED */
  /* ============================= */
  login(email: string, password: string, rememberMe: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          // ✅ FIX: Use response.data
          this.handleAuthentication(response.data, rememberMe);
        }),
        catchError(this.handleError)
      );
  }

  /* ============================= */
  /* SOCIAL LOGIN */
  /* ============================= */
  socialLogin(provider: 'google' | 'github'): void {
    window.location.href = `${this.apiUrl}/${provider}`;
  }

  /* ============================= */
  /* ✅ LOGOUT FIXED */
  /* ============================= */
  logout(skipRedirect: boolean = false): void {

    if (this.logoutInProgress) {
      return;
    }

    this.logoutInProgress = true;

    // Clear refresh timeout
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }

    // Clear storage
    this.clearStorage();

    // Clear current user
    this.currentUserSubject.next(null);

    // Notify server (optional)
    this.http.post(`${this.apiUrl}/logout`, {})
      .pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.logoutInProgress = false;

          if (!skipRedirect) {
            this.router.navigate(['/login']);
          }
        })
      )
      .subscribe();
  }

  /* ============================= */
  /* REFRESH TOKEN */
  /* ============================= */
  refreshToken(): Observable<any> {

    if (this.isRefreshing) {
      return throwError(() => new Error('Refresh already in progress'));
    }

    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    this.isRefreshing = true;

    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, { refreshToken })
      .pipe(
        tap(response => {
          this.isRefreshing = false;
          this.handleAuthentication(response.data, true);
        }),
        catchError(error => {
          this.isRefreshing = false;

          this.clearStorage();
          this.currentUserSubject.next(null);

          this.router.navigate(['/login'], {
            queryParams: { session: 'expired' }
          });

          return throwError(() => error);
        })
      );
  }

  /* ============================= */
  /* PASSWORD APIs */
  /* ============================= */
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, newPassword })
      .pipe(catchError(this.handleError));
  }

  /* ============================= */
  /* ✅ AUTH CHECK FIXED */
  /* ============================= */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  /* ============================= */
  /* ✅ ROLE CHECK FIXED */
  /* ============================= */
  hasRole(requiredRole: string | string[]): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }

    return user.role === requiredRole;
  }

  /* ============================= */
  /* PERMISSION CHECK */
  /* ============================= */
  hasPermission(permission: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.permissions?.includes(permission) || false;
  }

  /* ============================= */
  /* TOKEN GETTERS */
  /* ============================= */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey) ||
           sessionStorage.getItem(this.tokenKey);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey) ||
           sessionStorage.getItem(this.refreshTokenKey);
  }

  private getUserFromStorage(): User | null {
    const userStr =
      localStorage.getItem(this.userKey) ||
      sessionStorage.getItem(this.userKey);

    return userStr ? JSON.parse(userStr) : null;
  }

  /* ============================= */
  /* ✅ MAIN FIX: AUTH STORAGE */
  /* ============================= */
  private handleAuthentication(data: any, rememberMe: boolean): void {

    const storage = rememberMe ? localStorage : sessionStorage;

    // ✅ Save token correctly
    storage.setItem(this.tokenKey, data.token);

    // ✅ Save refresh token only if exists
    if (data.refreshToken) {
      storage.setItem(this.refreshTokenKey, data.refreshToken);
    }

    // ✅ Build correct user object
    const user: User = {
      id: data.uId,
      email: data.email,
      role: data.role,
      name: data.name
    };

    storage.setItem(this.userKey, JSON.stringify(user));

    // ✅ Update current user
    this.currentUserSubject.next(user);

    console.log("✅ LOGIN SUCCESS USER SAVED:", user);

    // ❌ DO NOT start timer (backend doesn't send expiresIn)
    // this.startRefreshTokenTimer();
  }

  /* ============================= */
  /* TIMER OPTIONAL (DISABLED) */
  /* ============================= */
  private startRefreshTokenTimer(): void {
    // Backend doesn't send expiresIn so skip
  }

  /* ============================= */
  /* CLEAR STORAGE */
  /* ============================= */
  private clearStorage(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);

    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.refreshTokenKey);
    sessionStorage.removeItem(this.userKey);
  }

  /* ============================= */
  /* ERROR HANDLER */
  /* ============================= */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Auth Service Error:', error);
    return throwError(() => error);
  }
}
