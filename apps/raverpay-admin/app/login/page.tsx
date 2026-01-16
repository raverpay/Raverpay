'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError, User } from '@/types';
import { AxiosError } from 'axios';
import { PasswordChangeModal } from '@/components/security/password-change-modal';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const mfaCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only numbers'),
});

const backupCodeSchema = z.object({
  backupCode: z
    .string()
    .length(8, 'Backup code must be exactly 8 digits')
    .regex(/^\d{8}$/, 'Backup code must contain only numbers'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type MfaCodeFormData = z.infer<typeof mfaCodeSchema>;
type BackupCodeFormData = z.infer<typeof backupCodeSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [passwordChangeToken, setPasswordChangeToken] = useState<string | null>(null);
  const [passwordChangeUser, setPasswordChangeUser] = useState<User | null>(null); // Store user to check MFA status
  const [useBackupCode, setUseBackupCode] = useState(false);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerMfa,
    handleSubmit: handleMfaSubmit,
    formState: { errors: mfaErrors },
  } = useForm<MfaCodeFormData>({
    resolver: zodResolver(mfaCodeSchema),
  });

  const {
    register: registerBackup,
    handleSubmit: handleBackupSubmit,
    formState: { errors: backupErrors },
  } = useForm<BackupCodeFormData>({
    resolver: zodResolver(backupCodeSchema),
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: LoginFormData) => authApi.login(email, password),
    onSuccess: (data) => {
      // Check if password change is required FIRST (before MFA check)
      if (data.mustChangePassword && data.passwordChangeToken) {
        setPasswordChangeRequired(true);
        setPasswordChangeToken(data.passwordChangeToken);
        // Store user object to check MFA status in modal
        if (data.user) {
          setPasswordChangeUser(data.user);
        }
        // DO NOT call setAuth here - it would set isAuthenticated=true and cause redirect loop
        // The password change modal will call setAuth after successful password change
        toast.info('Password Change Required', {
          description: 'You must change your password before accessing the dashboard',
        });
        return;
      }

      // Check if MFA is required (before accessing data.user)
      if (data.mfaRequired && data.tempToken) {
        setMfaRequired(true);
        setTempToken(data.tempToken);
        toast.info('MFA Required', {
          description: 'Please enter your MFA code to continue',
        });
        return;
      }

      // Check if user has admin access (only if MFA not required)
      if (!data.user) {
        toast.error('Login Failed', {
          description: 'Invalid response from server',
        });
        return;
      }

      const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'];
      if (!allowedRoles.includes(data.user.role)) {
        toast.error('Access Denied', {
          description: 'You do not have permission to access the admin dashboard.',
        });
        return;
      }

      // Normal login flow
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Welcome back!', {
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });
      router.push('/dashboard');
    },
    onError: (error: AxiosError<ApiError>) => {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      const errorMessage = Array.isArray(errorData?.message)
        ? errorData.message[0]
        : errorData?.message || 'Login failed. Please try again.';

      // Parse error message to determine error type and show appropriate message
      let title = 'Login Failed';
      let description = errorMessage;

      if (statusCode === 401) {
        const lowerMessage = errorMessage.toLowerCase();
        if (lowerMessage.includes('locked')) {
          title = 'Account Locked';
          description = errorMessage; // Backend message includes time remaining
        } else if (lowerMessage.includes('banned')) {
          title = 'Account Banned';
          description = 'Your account has been banned. Please contact support for assistance.';
        } else if (lowerMessage.includes('suspended')) {
          title = 'Account Suspended';
          description = 'Your account has been suspended. Please contact support for assistance.';
        } else if (lowerMessage.includes('deleted') || lowerMessage.includes('does not exist')) {
          title = 'Account Not Found';
          description =
            'No account found with these credentials. Please check your email and password.';
        } else if (lowerMessage.includes('invalid') || lowerMessage.includes('credentials')) {
          title = 'Invalid Credentials';
          description = 'The email or password you entered is incorrect. Please try again.';
        } else if (lowerMessage.includes('ip') || lowerMessage.includes('whitelist')) {
          title = 'Access Restricted';
          description = errorMessage; // Backend message explains IP restriction
        } else {
          title = 'Authentication Failed';
          description = errorMessage;
        }
      } else if (statusCode === 403) {
        title = 'Access Denied';
        description = 'You do not have permission to access the admin dashboard.';
      } else if (statusCode === 429) {
        title = 'Too Many Attempts';
        description = 'Too many login attempts. Please wait a moment before trying again.';
      } else if (statusCode === 400) {
        title = 'Invalid Input';
        description = errorMessage;
      } else if (statusCode === 404) {
        title = 'Service Unavailable';
        description = 'The login service is currently unavailable. Please try again later.';
      }

      toast.error(title, {
        description,
        duration: 5000,
      });
    },
  });

  const verifyMfaMutation = useMutation({
    mutationFn: ({ code }: MfaCodeFormData) => {
      if (!tempToken) throw new Error('No temporary token');
      return authApi.verifyMfaCode(tempToken, code);
    },
    onSuccess: (data) => {
      // Check if password change is required
      if (data.mustChangePassword && data.passwordChangeToken) {
        setPasswordChangeRequired(true);
        setPasswordChangeToken(data.passwordChangeToken);
        // Store user info temporarily (will be updated after password change)
        if (data.user) {
          setAuth(data.user, data.accessToken || '', data.refreshToken || '');
        }
        return;
      }

      // Normal login flow
      if (!data.user) {
        toast.error('Login Failed', {
          description: 'Invalid response from server',
        });
        return;
      }

      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Welcome back!', {
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });
      router.push('/dashboard');
    },
    onError: (error: AxiosError<ApiError>) => {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      const errorMessage = Array.isArray(errorData?.message)
        ? errorData.message[0]
        : errorData?.message || 'Invalid MFA code';

      // Parse error message to determine error type and show appropriate message
      let title = 'Verification Failed';
      let description = errorMessage;

      if (statusCode === 401) {
        const lowerMessage = errorMessage.toLowerCase();
        if (lowerMessage.includes('locked')) {
          title = 'Account Locked';
          description = errorMessage; // Backend message includes time remaining
        } else if (lowerMessage.includes('invalid') || lowerMessage.includes('code')) {
          title = 'Invalid MFA Code';
          description = errorMessage; // Backend message includes attempt count
        } else if (lowerMessage.includes('expired') || lowerMessage.includes('session')) {
          title = 'Session Expired';
          description = 'Your verification session has expired. Please log in again.';
        } else {
          title = 'MFA Verification Failed';
          description = errorMessage;
        }
      } else if (statusCode === 429) {
        title = 'Too Many Attempts';
        description = 'Too many verification attempts. Please wait a moment before trying again.';
      } else if (statusCode === 400) {
        title = 'Invalid Input';
        description = errorMessage;
      }

      toast.error(title, {
        description,
        duration: 5000,
      });
    },
  });

  const verifyBackupMutation = useMutation({
    mutationFn: ({ backupCode }: BackupCodeFormData) => {
      if (!tempToken) throw new Error('No temporary token');
      return authApi.verifyBackupCode(tempToken, backupCode);
    },
    onSuccess: (data) => {
      // Check if password change is required
      if (data.mustChangePassword && data.passwordChangeToken) {
        setPasswordChangeRequired(true);
        setPasswordChangeToken(data.passwordChangeToken);
        // Store user info temporarily (will be updated after password change)
        if (data.user) {
          setAuth(data.user, data.accessToken || '', data.refreshToken || '');
        }
        return;
      }

      // Normal login flow
      if (!data.user) {
        toast.error('Login Failed', {
          description: 'Invalid response from server',
        });
        return;
      }

      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Welcome back!', {
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });
      router.push('/dashboard');
    },
    onError: (error: AxiosError<ApiError>) => {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      const errorMessage = Array.isArray(errorData?.message)
        ? errorData.message[0]
        : errorData?.message || 'Invalid backup code';

      // Parse error message to determine error type and show appropriate message
      let title = 'Verification Failed';
      let description = errorMessage;

      if (statusCode === 401) {
        const lowerMessage = errorMessage.toLowerCase();
        if (lowerMessage.includes('locked')) {
          title = 'Account Locked';
          description = errorMessage; // Backend message includes time remaining
        } else if (
          lowerMessage.includes('invalid') ||
          lowerMessage.includes('backup') ||
          lowerMessage.includes('code')
        ) {
          title = 'Invalid Backup Code';
          description = errorMessage; // Backend message includes attempt count
        } else if (lowerMessage.includes('expired') || lowerMessage.includes('session')) {
          title = 'Session Expired';
          description = 'Your verification session has expired. Please log in again.';
        } else {
          title = 'Backup Code Verification Failed';
          description = errorMessage;
        }
      } else if (statusCode === 429) {
        title = 'Too Many Attempts';
        description = 'Too many verification attempts. Please wait a moment before trying again.';
      } else if (statusCode === 400) {
        title = 'Invalid Input';
        description = errorMessage;
      }

      console.log(title, description);

      toast.error(title, {
        description,
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onMfaSubmit = (data: MfaCodeFormData) => {
    verifyMfaMutation.mutate(data);
  };

  const onBackupSubmit = (data: BackupCodeFormData) => {
    verifyBackupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Raverpay Admin</CardTitle>
          <CardDescription>
            {mfaRequired ? 'Enter your MFA code' : 'Sign in to access the admin dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!mfaRequired ? (
            <form onSubmit={handleLoginSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@raverpay.com"
                  {...registerLogin('email')}
                  disabled={loginMutation.isPending}
                />
                {loginErrors.email && (
                  <p className="text-sm text-destructive">{loginErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...registerLogin('password')}
                    disabled={loginMutation.isPending}
                  />
                </div>
                {loginErrors.password && (
                  <p className="text-sm text-destructive">{loginErrors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Multi-factor authentication is required. Enter the 6-digit code from your
                  authenticator app.
                </AlertDescription>
              </Alert>

              {!useBackupCode ? (
                <>
                  <form onSubmit={handleMfaSubmit(onMfaSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mfa-code">MFA Code</Label>
                      <Input
                        id="mfa-code"
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-2xl tracking-widest font-mono"
                        {...registerMfa('code')}
                        disabled={verifyMfaMutation.isPending}
                      />
                      {mfaErrors.code && (
                        <p className="text-sm text-destructive">{mfaErrors.code.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={verifyMfaMutation.isPending}>
                      {verifyMfaMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Code'
                      )}
                    </Button>
                  </form>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setUseBackupCode(true)}
                      className="text-sm"
                    >
                      Use backup code instead
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <form onSubmit={handleBackupSubmit(onBackupSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="backup-code">Backup Code</Label>
                      <Input
                        id="backup-code"
                        type="text"
                        placeholder="00000000"
                        maxLength={8}
                        className="text-center text-xl tracking-widest font-mono"
                        {...registerBackup('backupCode')}
                        disabled={verifyBackupMutation.isPending}
                      />
                      {backupErrors.backupCode && (
                        <p className="text-sm text-destructive">
                          {backupErrors.backupCode.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={verifyBackupMutation.isPending}
                    >
                      {verifyBackupMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Backup Code'
                      )}
                    </Button>
                  </form>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setUseBackupCode(false)}
                      className="text-sm"
                    >
                      Use MFA code instead
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change Modal */}
      {passwordChangeRequired && passwordChangeToken && (
        <PasswordChangeModal
          open={passwordChangeRequired}
          passwordChangeToken={passwordChangeToken}
          user={passwordChangeUser}
          onSuccess={() => {
            setPasswordChangeRequired(false);
            setPasswordChangeToken(null);
            setPasswordChangeUser(null);
            router.push('/dashboard');
          }}
        />
      )}
    </div>
  );
}
