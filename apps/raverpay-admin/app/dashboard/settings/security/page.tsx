'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Monitor,
  Network,
  ArrowRight,
  Download,
} from 'lucide-react';

import { authApi } from '@/lib/api/auth';
import { MfaVerifyModal } from '@/components/security/mfa-verify-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AxiosError } from 'axios';

const disableMfaSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type DisableMfaFormData = z.infer<typeof disableMfaSchema>;

export default function SecuritySettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Note: This page is accessible to all admin roles (ADMIN, SUPER_ADMIN, SUPPORT)
  // to allow self-service MFA management. System settings remain SUPER_ADMIN only.
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showMfaVerifyModal, setShowMfaVerifyModal] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const {
    register: registerDisable,
    handleSubmit: handleDisableSubmit,
    formState: { errors: disableErrors },
    reset: resetDisable,
  } = useForm<DisableMfaFormData>({
    resolver: zodResolver(disableMfaSchema),
  });

  // Fetch MFA status
  const { data: mfaStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['mfa-status'],
    queryFn: authApi.getMfaStatus,
  });

  // Disable MFA mutation
  const disableMfaMutation = useMutation({
    mutationFn: authApi.disableMfa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
      setShowDisableDialog(false);
      resetDisable();
      toast.success('MFA Disabled', {
        description: 'Multi-factor authentication has been disabled',
      });
    },
    onError: (error: AxiosError) => {
      const errorMessage =
        (error.response?.data as { message?: string })?.message || 'Failed to disable MFA';
      toast.error('Disable Failed', {
        description: errorMessage,
      });
    },
  });

  // Regenerate backup codes mutation
  const regenerateCodesMutation = useMutation({
    mutationFn: (mfaCode: string) => authApi.regenerateBackupCodes(mfaCode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
      setNewBackupCodes(data.backupCodes);
      setShowRegenerateDialog(false);
      setShowMfaVerifyModal(false);
      toast.success('Backup Codes Regenerated', {
        description: 'Your old backup codes are no longer valid',
      });
    },
    onError: (error: AxiosError) => {
      const errorMessage =
        (error.response?.data as { message?: string })?.message ||
        'Failed to regenerate backup codes';
      toast.error('Regeneration Failed', {
        description: errorMessage,
      });
    },
  });

  const onDisableSubmit = (data: DisableMfaFormData) => {
    disableMfaMutation.mutate(data.password);
  };

  const handleRegenerate = () => {
    setShowRegenerateDialog(false);
    setShowMfaVerifyModal(true);
  };

  const handleMfaVerified = (code: string) => {
    regenerateCodesMutation.mutate(code);
  };

  const downloadBackupCodes = () => {
    if (!newBackupCodes || newBackupCodes.length === 0) return;

    const content = `RaverPay Admin Dashboard - Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nIMPORTANT: Save these codes in a secure location. Each code can only be used once.\n\n${newBackupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nIf you lose access to your authenticator app, you can use these backup codes to log in.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raverpay-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Backup codes downloaded', {
      description: 'Save the file in a secure location',
    });
  };

  const copyBackupCodes = () => {
    const codesToCopy = newBackupCodes || [];
    if (codesToCopy.length > 0) {
      navigator.clipboard.writeText(codesToCopy.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
      toast.success('Backup codes copied to clipboard');
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Security Settings</h2>
        <p className="text-muted-foreground">Manage your account security preferences</p>
      </div>

      {/* MFA Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Factor Authentication (MFA)
          </CardTitle>
          <CardDescription>Add an extra layer of security to your admin account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {mfaStatus?.mfaEnabled ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">MFA Status</p>
                  <p className="text-sm text-muted-foreground">
                    Enabled on{' '}
                    {mfaStatus.mfaEnabledAt
                      ? new Date(mfaStatus.mfaEnabledAt).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-500">
                    Enabled
                  </span>
                </div>
              </div>

              {mfaStatus.lastMfaSuccess && (
                <div className="text-sm text-muted-foreground">
                  Last successful verification:{' '}
                  {new Date(mfaStatus.lastMfaSuccess).toLocaleString()}
                </div>
              )}

              {/* Backup Codes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Backup Codes</p>
                    <p className="text-sm text-muted-foreground">
                      {mfaStatus.backupCodesRemaining} codes remaining
                    </p>
                  </div>
                  <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Regenerate Backup Codes</DialogTitle>
                        <DialogDescription>
                          This will invalidate all your existing backup codes and generate new ones.
                          Make sure to save the new codes securely.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Your old backup codes will no longer work after regeneration.
                          </AlertDescription>
                        </Alert>
                        <Button
                          onClick={handleRegenerate}
                          disabled={regenerateCodesMutation.isPending}
                          className="w-full"
                        >
                          {regenerateCodesMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            'Regenerate Backup Codes'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {mfaStatus.backupCodesRemaining === 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You have no backup codes remaining. Please regenerate them to ensure you can
                      access your account if you lose your authenticator device.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* New Backup Codes Display */}
              {newBackupCodes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">New Backup Codes</CardTitle>
                    <CardDescription>
                      Save these codes in a safe place. They are only shown once.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowBackupCodes(!showBackupCodes)}
                      >
                        {showBackupCodes ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Hide Codes
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Show Codes
                          </>
                        )}
                      </Button>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={copyBackupCodes}>
                          {copiedCodes ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy All
                            </>
                          )}
                        </Button>
                        <Button type="button" variant="outline" onClick={downloadBackupCodes}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>

                    {showBackupCodes && (
                      <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                        {newBackupCodes.map((code, index) => (
                          <div
                            key={index}
                            className="font-mono text-sm p-2 bg-background rounded border text-center"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Disable MFA */}
              <div className="pt-4 border-t">
                <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Disable MFA
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Disable Multi-Factor Authentication</DialogTitle>
                      <DialogDescription>
                        Enter your password to disable MFA. This will reduce your account security.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDisableSubmit(onDisableSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="disable-password">Password</Label>
                        <Input
                          id="disable-password"
                          type="password"
                          placeholder="Enter your password"
                          {...registerDisable('password')}
                          disabled={disableMfaMutation.isPending}
                        />
                        {disableErrors.password && (
                          <p className="text-sm text-destructive">
                            {disableErrors.password.message}
                          </p>
                        )}
                      </div>

                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Disabling MFA will make your account less secure. Are you sure you want to
                          continue?
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowDisableDialog(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="destructive"
                          disabled={disableMfaMutation.isPending}
                          className="flex-1"
                        >
                          {disableMfaMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Disabling...
                            </>
                          ) : (
                            'Disable MFA'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Multi-factor authentication is not enabled. Enable it to add an extra layer of
                  security to your account.
                </AlertDescription>
              </Alert>
              <Button onClick={() => router.push('/dashboard/security/mfa/setup')}>
                <Shield className="mr-2 h-4 w-4" />
                Setup MFA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IP Whitelist Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            IP Whitelist
          </CardTitle>
          <CardDescription>
            Manage IP addresses allowed to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Restrict admin access to specific IP addresses or CIDR ranges for enhanced security
              </p>
            </div>
            <Link href="/dashboard/security/ip-whitelist">
              <Button variant="outline">
                Manage IP Whitelist
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Session Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            View and manage your active sessions across different devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Monitor all devices with access to your account and revoke suspicious sessions
              </p>
            </div>
            <Link href="/dashboard/security/sessions">
              <Button variant="outline">
                View Sessions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* MFA Verification Modal */}
      <MfaVerifyModal
        open={showMfaVerifyModal}
        onOpenChange={setShowMfaVerifyModal}
        onSuccess={handleMfaVerified}
        title="MFA Verification Required"
        description="Enter your 6-digit code from your authenticator app to regenerate backup codes"
      />
    </div>
  );
}
