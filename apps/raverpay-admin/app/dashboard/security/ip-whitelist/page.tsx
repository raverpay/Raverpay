'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Shield,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Network,
  Copy,
  Check,
} from 'lucide-react';

import { securityApi, type IpWhitelistEntry } from '@/lib/api/security';
import { MfaVerifyModal } from '@/components/security/mfa-verify-modal';
import { useQuery as useMfaQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/utils';
import { AxiosError } from 'axios';

const createIpSchema = z.object({
  ipAddress: z
    .string()
    .min(1, 'IP address is required')
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/\d{1,3})?$/,
      'Invalid IP address or CIDR notation',
    ),
  description: z.string().optional(),
  userId: z.string().optional(),
  isActive: z.boolean(),
});

const updateIpSchema = z.object({
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

type CreateIpFormData = z.infer<typeof createIpSchema>;
type UpdateIpFormData = z.infer<typeof updateIpSchema>;

export default function IpWhitelistPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IpWhitelistEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<IpWhitelistEntry | null>(null);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);
  const [showMfaVerifyModal, setShowMfaVerifyModal] = useState(false);
  const [pendingIpData, setPendingIpData] = useState<CreateIpFormData | null>(null);

  const createForm = useForm<CreateIpFormData>({
    resolver: zodResolver(createIpSchema),
    defaultValues: {
      isActive: true,
    },
  });

  const updateForm = useForm<UpdateIpFormData>({
    resolver: zodResolver(updateIpSchema),
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    formState: { errors: createErrors },
    reset: resetCreate,
    setValue: setCreateValue,
    control: createControl,
  } = createForm;

  const {
    register: registerUpdate,
    handleSubmit: handleUpdateSubmit,
    formState: { errors: updateErrors },
    reset: resetUpdate,
    setValue: setUpdateValue,
    control: updateControl,
  } = updateForm;

  const createIsActive = useWatch({ control: createControl, name: 'isActive' }) ?? true;
  const updateIsActive = useWatch({ control: updateControl, name: 'isActive' });

  const { data: ipWhitelistData, isLoading } = useQuery({
    queryKey: ['ip-whitelist', page, isActiveFilter],
    queryFn: () =>
      securityApi.getIpWhitelist({
        page,
        limit: 20,
        isActive: isActiveFilter !== 'all' ? isActiveFilter === 'true' : undefined,
      }),
  });

  // Fetch current IP address
  const { data: currentIpData, isLoading: isLoadingIp } = useQuery({
    queryKey: ['current-ip'],
    queryFn: () => securityApi.getCurrentIp(),
  });

  useEffect(() => {
    if (currentIpData?.ipAddress) {
      setCurrentIp(currentIpData.ipAddress);
    }
  }, [currentIpData]);

  // Check MFA status
  const { data: mfaStatus } = useMfaQuery({
    queryKey: ['mfa-status'],
    queryFn: authApi.getMfaStatus,
  });

  const handleUseCurrentIp = () => {
    if (currentIp && currentIp !== 'unknown') {
      setCreateValue('ipAddress', currentIp);
      setCreateValue('description', 'My Current IP');
    }
  };

  const copyCurrentIp = async () => {
    if (currentIp && currentIp !== 'unknown') {
      await navigator.clipboard.writeText(currentIp);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
      toast.success('IP address copied to clipboard');
    }
  };

  const addIpMutation = useMutation({
    mutationFn: securityApi.addIpWhitelist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] });
      setShowAddDialog(false);
      resetCreate();
      toast.success('IP Address Added', {
        description: 'The IP address has been added to the whitelist',
      });
    },
    onError: (error: AxiosError) => {
      const errorMessage =
        (error.response?.data as { message?: string })?.message || 'Failed to add IP address';
      toast.error('Add Failed', {
        description: errorMessage,
      });
    },
  });

  const updateIpMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIpFormData }) =>
      securityApi.updateIpWhitelist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] });
      setEditingEntry(null);
      resetUpdate();
      toast.success('IP Whitelist Updated', {
        description: 'The IP whitelist entry has been updated',
      });
    },
    onError: (error: AxiosError) => {
      const errorMessage =
        (error.response?.data as { message?: string })?.message || 'Failed to update IP whitelist';
      toast.error('Update Failed', {
        description: errorMessage,
      });
    },
  });

  const deleteIpMutation = useMutation({
    mutationFn: securityApi.removeIpWhitelist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] });
      setDeleteEntry(null);
      toast.success('IP Address Removed', {
        description: 'The IP address has been removed from the whitelist',
      });
    },
    onError: (error: AxiosError) => {
      const errorMessage =
        (error.response?.data as { message?: string })?.message || 'Failed to remove IP address';
      toast.error('Delete Failed', {
        description: errorMessage,
      });
    },
  });

  const onCreateSubmit = (data: CreateIpFormData) => {
    // If MFA is enabled, require MFA verification before adding IP
    if (mfaStatus?.mfaEnabled) {
      setPendingIpData(data);
      setShowAddDialog(false);
      setShowMfaVerifyModal(true);
    } else {
      addIpMutation.mutate(data);
    }
  };

  const handleMfaVerified = (code: string) => {
    if (pendingIpData) {
      // For now, proceed with adding IP after MFA verification
      // In a real implementation, you'd send the MFA code to the backend
      addIpMutation.mutate(pendingIpData);
      setPendingIpData(null);
      setShowMfaVerifyModal(false);
    }
  };

  const onUpdateSubmit = (data: UpdateIpFormData) => {
    if (editingEntry) {
      updateIpMutation.mutate({ id: editingEntry.id, data });
    }
  };

  const handleEdit = (entry: IpWhitelistEntry) => {
    setEditingEntry(entry);
    resetUpdate({
      description: entry.description || '',
      isActive: entry.isActive,
    });
  };

  const handleDelete = (entry: IpWhitelistEntry) => {
    deleteIpMutation.mutate(entry.id);
  };

  // Filter entries by search
  const filteredEntries =
    ipWhitelistData?.data.filter(
      (entry) =>
        !debouncedSearch ||
        entry.ipAddress.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        entry.description?.toLowerCase().includes(debouncedSearch.toLowerCase()),
    ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">IP Whitelist</h2>
          <p className="text-muted-foreground">
            Manage IP addresses allowed to access the admin dashboard
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add IP Address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add IP Address to Whitelist</DialogTitle>
              <DialogDescription>
                Add an IP address or CIDR range to allow admin access. Supports IPv4, IPv6, and CIDR
                notation (e.g., 192.168.1.1 or 192.168.1.0/24).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ip-address">IP Address or CIDR</Label>
                  {currentIp && currentIp !== 'unknown' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleUseCurrentIp}
                      className="h-auto py-1 text-xs"
                    >
                      <Network className="mr-1 h-3 w-3" />
                      Use My IP ({currentIp})
                    </Button>
                  )}
                </div>
                <Input
                  id="ip-address"
                  placeholder="192.168.1.1 or 192.168.1.0/24"
                  {...registerCreate('ipAddress')}
                  disabled={addIpMutation.isPending}
                />
                {createErrors.ipAddress && (
                  <p className="text-sm text-destructive">{createErrors.ipAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g., Office WiFi, VPN Server"
                  {...registerCreate('description')}
                  disabled={addIpMutation.isPending}
                />
                {createErrors.description && (
                  <p className="text-sm text-destructive">{createErrors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="is-active">Status</Label>
                <Select
                  value={createIsActive ? 'true' : 'false'}
                  onValueChange={(value) => setCreateValue('isActive', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addIpMutation.isPending} className="flex-1">
                  {addIpMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add IP Address'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current IP Card */}
      {currentIp && currentIp !== 'unknown' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Your Current IP Address</p>
                  <p className="font-mono text-sm text-muted-foreground">{currentIp}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyCurrentIp}
                  disabled={copiedIp}
                >
                  {copiedIp ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    handleUseCurrentIp();
                    setShowAddDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Whitelist
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by IP address or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* IP Whitelist Table */}
      <Card>
        <CardHeader>
          <CardTitle>Whitelisted IP Addresses</CardTitle>
          <CardDescription>
            {ipWhitelistData?.meta.total || 0} IP address(es) in whitelist
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEntries.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm">{entry.ipAddress}</TableCell>
                        <TableCell>{entry.description || '-'}</TableCell>
                        <TableCell>
                          {entry.isActive ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <XCircle className="h-4 w-4" />
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{entry.usageCount} times</TableCell>
                        <TableCell>
                          {entry.lastUsedAt ? formatDate(entry.lastUsedAt) : 'Never'}
                        </TableCell>
                        <TableCell>{formatDate(entry.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteEntry(entry)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {ipWhitelistData?.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={ipWhitelistData.meta.totalPages}
                  totalItems={ipWhitelistData.meta.total}
                  itemsPerPage={ipWhitelistData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No IP addresses whitelisted</p>
              <p className="text-sm text-muted-foreground mt-1">Add an IP address to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit IP Whitelist Entry</DialogTitle>
            <DialogDescription>Update the IP whitelist entry details</DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <form onSubmit={handleUpdateSubmit(onUpdateSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>IP Address</Label>
                <Input value={editingEntry.ipAddress} disabled className="font-mono" />
                <p className="text-xs text-muted-foreground">
                  IP address cannot be changed. Delete and recreate to change.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  placeholder="e.g., Office WiFi, VPN Server"
                  {...registerUpdate('description')}
                  disabled={updateIpMutation.isPending}
                />
                {updateErrors.description && (
                  <p className="text-sm text-destructive">{updateErrors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={
                    updateIsActive !== undefined
                      ? updateIsActive
                        ? 'true'
                        : 'false'
                      : editingEntry.isActive
                        ? 'true'
                        : 'false'
                  }
                  onValueChange={(value) => setUpdateValue('isActive', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEntry(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateIpMutation.isPending} className="flex-1">
                  {updateIpMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteEntry}
        onOpenChange={(open) => !open && setDeleteEntry(null)}
        title="Remove IP Address"
        description={`Are you sure you want to remove ${deleteEntry?.ipAddress} from the whitelist? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteEntry) {
            handleDelete(deleteEntry);
          }
        }}
      />

      {/* MFA Verification Modal */}
      <MfaVerifyModal
        open={showMfaVerifyModal}
        onOpenChange={setShowMfaVerifyModal}
        onSuccess={handleMfaVerified}
        title="MFA Verification Required"
        description="Enter your 6-digit code from your authenticator app to add IP address to whitelist"
      />
    </div>
  );
}
