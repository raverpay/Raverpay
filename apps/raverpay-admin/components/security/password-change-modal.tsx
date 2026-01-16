'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth-store';
import { User } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AxiosError } from 'axios';

// Dynamic schema based on MFA status
const createPasswordChangeSchema = (mfaRequired: boolean) =>
  z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
          'Password must contain uppercase, lowercase, number, and special character',
        ),
      confirmPassword: z.string().min(1, 'Please confirm your password'),
      mfaCode: mfaRequired
        ? z
            .string()
            .min(1, 'MFA code is required')
            .regex(/^\d{6}$|^\d{8}$/, 'MFA code must be 6 digits (TOTP) or 8 digits (backup code)')
        : z.string().optional(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    });

interface PasswordChangeModalProps {
  open: boolean;
  passwordChangeToken: string;
  user?: User | null; // User object to check MFA status
  onSuccess?: () => void;
}

export function PasswordChangeModal({
  open,
  passwordChangeToken,
  user,
  onSuccess,
}: PasswordChangeModalProps) {
  const router = useRouter();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { setAuth } = useAuthStore();

  // Check if MFA is required: use requiresMfa flag if available, otherwise check twoFactorSecret
  // This allows pre-provisioned MFA to be verified during password change
  // The backend sends requiresMfa flag to indicate MFA is required even if secret is not in response
  const mfaRequired = user?.requiresMfa ?? !!user?.twoFactorSecret;

  // Create schema based on MFA requirement
  const passwordChangeSchema = createPasswordChangeSchema(mfaRequired);
  type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordChangeFormData) => {
      // Ensure mfaCode is sent when MFA is required
      const requestData: any = {
        passwordChangeToken,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };

      // Always include mfaCode if MFA is required (even if empty, backend will validate)
      if (mfaRequired) {
        requestData.mfaCode = data.mfaCode || '';
      }

      return authApi.changePassword(requestData);
    },
    onSuccess: (data) => {
      // Update auth store with new tokens
      setAuth(data.user, data.accessToken, data.refreshToken);

      // Store re-auth token if provided
      if (data.reAuthToken && typeof window !== 'undefined') {
        window.__reAuthToken = data.reAuthToken;
        window.__reAuthTokenExpiry = Date.now() + (data.expiresIn || 900) * 1000;
      }

      reset();
      toast.success('Password changed successfully!', {
        description: 'You can now access the admin dashboard',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      const errorMessage = Array.isArray(errorData?.message)
        ? errorData.message[0]
        : errorData?.message || 'Failed to change password';

      // Parse error message to determine error type and show appropriate message
      let title = 'Password Change Failed';
      let description = errorMessage;

      // Set field-level errors for better UX
      if (statusCode === 401) {
        if (errorMessage.toLowerCase().includes('current password') || errorMessage.toLowerCase().includes('incorrect')) {
          title = 'Invalid Current Password';
          description = 'The current password you entered is incorrect. Please try again.';
          setError('currentPassword', {
            type: 'manual',
            message: 'Current password is incorrect',
          });
        } else if (errorMessage.toLowerCase().includes('mfa') || errorMessage.toLowerCase().includes('code')) {
          title = 'Invalid MFA Code';
          description = errorMessage; // Keep the backend message as it includes attempt count
          if (mfaRequired) {
            setError('mfaCode', {
              type: 'manual',
              message: errorMessage,
            });
          }
        } else if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('session')) {
          title = 'Session Expired';
          description = 'Your password change session has expired. Please log in again.';
        } else {
          title = 'Authentication Failed';
          description = errorMessage;
        }
      } else if (statusCode === 400) {
        if (errorMessage.toLowerCase().includes('match') || errorMessage.toLowerCase().includes('confirmation')) {
          title = 'Passwords Do Not Match';
          description = 'The new password and confirmation password do not match. Please try again.';
          setError('confirmPassword', {
            type: 'manual',
            message: 'Passwords do not match',
          });
        } else if (errorMessage.toLowerCase().includes('different') || errorMessage.toLowerCase().includes('same')) {
          title = 'Invalid New Password';
          description = 'The new password must be different from your current password.';
          setError('newPassword', {
            type: 'manual',
            message: 'New password must be different from current password',
          });
        } else if (errorMessage.toLowerCase().includes('mfa') || errorMessage.toLowerCase().includes('required')) {
          title = 'MFA Code Required';
          description = 'Please enter your MFA code from your authenticator app or use a backup code.';
          if (mfaRequired) {
            setError('mfaCode', {
              type: 'manual',
              message: 'MFA code is required',
            });
          }
        } else if (errorMessage.toLowerCase().includes('password') && errorMessage.toLowerCase().includes('character')) {
          title = 'Invalid Password Format';
          description = errorMessage; // Keep validation messages as they're descriptive
          setError('newPassword', {
            type: 'manual',
            message: errorMessage,
          });
        } else {
          title = 'Invalid Input';
          description = errorMessage;
        }
      } else if (statusCode === 403) {
        title = 'Access Denied';
        description = 'You do not have permission to change your password at this time.';
      } else if (statusCode === 429) {
        title = 'Too Many Attempts';
        description = 'Too many failed attempts. Please wait a moment before trying again.';
      }

      toast.error(title, {
        description,
        duration: 5000, // Show for 5 seconds so user can read it
      });
    },
  });

  const onSubmit = (data: PasswordChangeFormData) => {
    changePasswordMutation.mutate(data);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      {/* Modal cannot be closed - blocking */}
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password Required
          </DialogTitle>
          <DialogDescription>
            You must change your password before accessing the admin dashboard. This is required for
            security purposes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please enter your current password and choose a new secure password.
              {mfaRequired && ' You will also need to verify with your MFA code.'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Enter current password"
                {...register('currentPassword')}
                disabled={changePasswordMutation.isPending}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                {...register('newPassword')}
                disabled={changePasswordMutation.isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                {...register('confirmPassword')}
                disabled={changePasswordMutation.isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {mfaRequired && (
            <div className="space-y-2">
              <Label htmlFor="mfa-code">MFA Code</Label>
              <Input
                id="mfa-code"
                type="text"
                placeholder="Enter 6-digit MFA code or 8-digit backup code"
                maxLength={8}
                className="text-center text-xl tracking-widest font-mono"
                {...register('mfaCode')}
                disabled={changePasswordMutation.isPending}
              />
              {errors.mfaCode && (
                <p className="text-sm text-destructive">{errors.mfaCode.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter the code from your authenticator app or use a backup code
              </p>
            </div>
          )}

          <Button type="submit" disabled={changePasswordMutation.isPending} className="w-full">
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
