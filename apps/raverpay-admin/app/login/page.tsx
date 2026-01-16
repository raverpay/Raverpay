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
import { ApiError } from '@/types';
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
      // Check if MFA is required FIRST (before accessing data.user)
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
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error('Login Failed', {
        description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
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
      const errorMessage = error.response?.data?.message || 'Invalid MFA code';
      toast.error('Verification Failed', {
        description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
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
      const errorMessage = error.response?.data?.message || 'Invalid backup code';
      toast.error('Verification Failed', {
        description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
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
          onSuccess={() => {
            setPasswordChangeRequired(false);
            setPasswordChangeToken(null);
            router.push('/dashboard');
          }}
        />
      )}
    </div>
  );
}
