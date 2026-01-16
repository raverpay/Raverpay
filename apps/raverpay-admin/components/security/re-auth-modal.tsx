'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Lock, AlertCircle, Shield } from 'lucide-react';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth-store';
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

// Extend Window interface for re-auth token storage
declare global {
  interface Window {
    __reAuthToken?: string;
    __reAuthTokenExpiry?: number;
  }
}

const reAuthMfaSchema = z.object({
  mfaCode: z
    .string()
    .min(1, 'MFA code is required')
    .regex(/^\d{6}$|^\d{8}$/, 'MFA code must be 6 digits (TOTP) or 8 digits (backup code)'),
});

const reAuthPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type ReAuthMfaFormData = z.infer<typeof reAuthMfaSchema>;
type ReAuthPasswordFormData = z.infer<typeof reAuthPasswordSchema>;

interface ReAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (reAuthToken: string) => void;
  title?: string;
  description?: string;
}

export function ReAuthModal({
  open,
  onOpenChange,
  onSuccess,
  title = 'Re-authentication Required',
  description,
}: ReAuthModalProps) {
  const user = useAuthStore((state) => state.user);

  // Check if user has MFA enabled
  const { data: mfaStatus } = useQuery({
    queryKey: ['mfa-status'],
    queryFn: authApi.getMfaStatus,
    enabled: open && !!user,
  });

  const hasMfaEnabled = mfaStatus?.mfaEnabled || user?.twoFactorEnabled || false;

  const {
    register: registerMfa,
    handleSubmit: handleMfaSubmit,
    formState: { errors: mfaErrors },
    reset: resetMfa,
  } = useForm<ReAuthMfaFormData>({
    resolver: zodResolver(reAuthMfaSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ReAuthPasswordFormData>({
    resolver: zodResolver(reAuthPasswordSchema),
  });

  // Check for existing valid re-auth token first
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const existingToken = window.__reAuthToken;
      const expiry = window.__reAuthTokenExpiry;
      if (existingToken && expiry && Date.now() < expiry) {
        // Token is still valid, use it directly
        onSuccess(existingToken);
        onOpenChange(false);
        return;
      }
    }
  }, [open, onSuccess, onOpenChange]);

  const verifyMfaMutation = useMutation({
    mutationFn: authApi.verifyMfaReauth,
    onSuccess: (data) => {
      // Store re-auth token in memory (not localStorage for security)
      // The token will be sent in X-Recent-Auth-Token header
      if (typeof window !== 'undefined') {
        window.__reAuthToken = data.reAuthToken;
        window.__reAuthTokenExpiry = Date.now() + data.expiresIn * 1000;
      }

      resetMfa();
      onOpenChange(false);
      onSuccess(data.reAuthToken);
      toast.success('Re-authentication successful', {
        description: 'You can now proceed with the operation',
      });
    },
    onError: (error: AxiosError) => {
      const errorMessage =
        (error.response?.data as { message?: string })?.message || 'Invalid MFA code';
      toast.error('Re-authentication Failed', {
        description: errorMessage,
      });
    },
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: authApi.verifyPasswordReauth,
    onSuccess: (data) => {
      // Store re-auth token in memory
      if (typeof window !== 'undefined') {
        window.__reAuthToken = data.reAuthToken;
        window.__reAuthTokenExpiry = Date.now() + data.expiresIn * 1000;
      }

      resetPassword();
      onOpenChange(false);
      onSuccess(data.reAuthToken);
      toast.success('Re-authentication successful', {
        description: 'You can now proceed with the operation',
      });
    },
    onError: (error: AxiosError) => {
      const errorMessage =
        (error.response?.data as { message?: string })?.message || 'Invalid password';
      toast.error('Re-authentication Failed', {
        description: errorMessage,
      });
    },
  });

  // Clear form when dialog closes
  useEffect(() => {
    if (!open) {
      resetMfa();
      resetPassword();
    }
  }, [open, resetMfa, resetPassword]);

  // If MFA is enabled, show MFA code input
  if (hasMfaEnabled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>
              {description || 'Enter your MFA code to continue with this sensitive operation'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleMfaSubmit((data) => verifyMfaMutation.mutate(data.mfaCode))}
            className="space-y-4"
          >
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This operation requires additional verification for security purposes. Please enter
                your MFA code from your authenticator app or use a backup code.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="reauth-mfa">MFA Code</Label>
              <Input
                id="reauth-mfa"
                type="text"
                placeholder="123456 or backup code"
                maxLength={8}
                className="text-center text-xl tracking-widest font-mono"
                {...registerMfa('mfaCode')}
                disabled={verifyMfaMutation.isPending}
                autoFocus
              />
              {mfaErrors.mfaCode && (
                <p className="text-sm text-destructive">{mfaErrors.mfaCode.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter your 6-digit TOTP code or 8-digit backup code
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={verifyMfaMutation.isPending} className="flex-1">
                {verifyMfaMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback to password if MFA not enabled
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || 'Enter your password to continue with this sensitive operation'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handlePasswordSubmit((data) => verifyPasswordMutation.mutate(data.password))}
          className="space-y-4"
        >
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This operation requires additional verification for security purposes.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reauth-password">Password</Label>
            <Input
              id="reauth-password"
              type="password"
              placeholder="Enter your password"
              {...registerPassword('password')}
              disabled={verifyPasswordMutation.isPending}
              autoFocus
            />
            {passwordErrors.password && (
              <p className="text-sm text-destructive">{passwordErrors.password.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={verifyPasswordMutation.isPending} className="flex-1">
              {verifyPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use re-authentication
export function useReAuth() {
  const [isOpen, setIsOpen] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<((token: string) => void) | null>(
    null,
  );

  const requireReAuth = (onSuccess: (token: string) => void) => {
    setOnSuccessCallback(() => onSuccess);
    setIsOpen(true);
  };

  const handleSuccess = (token: string) => {
    if (onSuccessCallback) {
      onSuccessCallback(token);
      setOnSuccessCallback(null);
    }
  };

  return {
    requireReAuth,
    ReAuthModal: <ReAuthModal open={isOpen} onOpenChange={setIsOpen} onSuccess={handleSuccess} />,
  };
}
