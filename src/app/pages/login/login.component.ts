// login.component.ts (Complete fixed version)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  returnUrl: string = '/dashboard';
  passwordStrength: 'weak' | 'medium' | 'strong' | '' = '';
  
  // Track focused state for floating labels
  focusedFields: { [key: string]: boolean } = {
    email: false,
    password: false
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    this.initForm();
    this.setupPasswordStrengthListener();
    
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }

    // Check for query parameters messages
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['session'] === 'expired') {
          this.errorMessage = 'Your session has expired. Please login again.';
        }
        if (params['reset'] === 'success') {
          this.successMessage = 'Password reset successful! Please login with your new password.';
        }
        if (params['registered'] === 'success') {
          this.successMessage = 'Account created successfully! Please login.';
        }
      });
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
      rememberMe: [false]
    });
  }

  setupPasswordStrengthListener(): void {
    this.loginForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(password => {
        this.passwordStrength = this.calculatePasswordStrength(password);
      });
  }

  calculatePasswordStrength(password: string): 'weak' | 'medium' | 'strong' | '' {
    if (!password) return '';
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 3) return 'weak';
    if (score <= 5) return 'medium';
    return 'strong';
  }

  // Focus handlers for floating labels
  onInputFocus(field: string): void {
    this.focusedFields[field] = true;
  }

  onInputBlur(field: string): void {
    this.focusedFields[field] = false;
  }

  // Check if a field is focused
  isFieldFocused(field: string): boolean {
    return this.focusedFields[field] || false;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // COMPLETE FIXED onSubmit METHOD
  onSubmit(): void {
    // Clear previous messages
    this.errorMessage = '';
    this.successMessage = '';
    
    // Mark all fields as touched to trigger validation display
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      
      // Focus the first invalid field
      const firstInvalidField = Object.keys(this.loginForm.controls).find(
        key => this.loginForm.get(key)?.invalid
      );
      
      if (firstInvalidField) {
        const element = document.querySelector(`[formControlName="${firstInvalidField}"]`);
        if (element) {
          (element as HTMLElement).focus();
        }
      }
      return;
    }

    this.isLoading = true;

    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.login(email, password, rememberMe)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          // Check if user has required role for dashboard
          if (this.authService.hasRole(['SuperAdmin', 'Admin'])) {
            // Show success message briefly before redirect
            this.successMessage = 'Login successful! Redirecting...';
            
            setTimeout(() => {
              this.router.navigate([this.returnUrl]);
            }, 1000);
          } else {
            this.errorMessage = 'You do not have permission to access the admin portal.';
            // Use setTimeout to prevent immediate logout issues
            setTimeout(() => {
              this.authService.logout();
            }, 100);
          }
        },
        error: (error) => {
          this.handleLoginError(error);
        }
      });
  }

  private handleLoginError(error: any): void {
    console.error('Login error:', error);
    
    if (error.status === 0) {
      this.errorMessage = 'Unable to connect to server. Please check your internet connection.';
    } else if (error.status === 400) {
      this.errorMessage = error.error?.message || 'Invalid request. Please check your input.';
    } else if (error.status === 401) {
      this.errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.status === 403) {
      this.errorMessage = 'Your account has been locked. Please contact support.';
    } else if (error.status === 404) {
      this.errorMessage = 'Account not found. Please check your email or sign up.';
    } else if (error.status === 429) {
      this.errorMessage = 'Too many login attempts. Please try again later.';
    } else if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else if (error.message) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'An unexpected error occurred. Please try again later.';
    }
  }

  getEmailErrorMessage(): string {
    const emailControl = this.email;
    
    if (emailControl?.hasError('required')) {
      return 'Email is required';
    }
    if (emailControl?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (emailControl?.hasError('pattern')) {
      return 'Please enter a valid corporate email address';
    }
    
    return '';
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.password;
    
    if (passwordControl?.hasError('required')) {
      return 'Password is required';
    }
    if (passwordControl?.hasError('minlength')) {
      return `Password must be at least ${passwordControl.errors?.['minlength'].requiredLength} characters`;
    }
    
    return '';
  }

  socialLogin(provider: 'google' | 'github'): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.socialLogin(provider);
    
    // Note: socialLogin redirects, so we don't need to handle the response here
    // The isLoading will be reset if the redirect doesn't happen immediately
    setTimeout(() => {
      this.isLoading = false;
    }, 5000); // Timeout after 5 seconds if redirect doesn't happen
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  // Getter methods for form controls
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
  get rememberMe() { return this.loginForm.get('rememberMe'); }

  // Check if form field has value
  hasValue(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return control ? !!control.value : false;
  }

  // Check if form field is invalid and touched
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  // Reset form
  resetForm(): void {
    this.loginForm.reset({
      email: '',
      password: '',
      rememberMe: false
    });
    this.errorMessage = '';
    this.successMessage = '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}