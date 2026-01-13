'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Lock, AlertCircle } from 'lucide-react';

import { authApi } from '@/lib/api/auth';
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

const reAuthSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type ReAuthFormData = z.infer<typeof reAuthSchema>;

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
  description = 'Enter your password to continue with this sensitive operation',
}: ReAuthModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReAuthFormData>({
    resolver: zodResolver(reAuthSchema),
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: authApi.verifyPasswordReauth,
    onSuccess: (data) => {
      // Store re-auth token in memory (not localStorage for security)
      // The token will be sent in X-Recent-Auth-Token header
      if (typeof window !== 'undefined') {
        window.__reAuthToken = data.reAuthToken;
        window.__reAuthTokenExpiry = Date.now() + data.expiresIn * 1000;
      }

      reset();
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

  const onSubmit = (data: ReAuthFormData) => {
    verifyPasswordMutation.mutate(data.password);
  };

  // Clear form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {...register('password')}
              disabled={verifyPasswordMutation.isPending}
              autoFocus
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
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
