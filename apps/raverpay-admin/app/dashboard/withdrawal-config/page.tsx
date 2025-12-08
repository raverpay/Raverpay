'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as withdrawalApi from '@/lib/api/withdrawal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit, Trash2, Wallet, ArrowDownToLine } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';

export default function WithdrawalConfigPage() {
  const queryClient = useQueryClient();
  const { canModifySettings } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{
    id: string;
    config: withdrawalApi.WithdrawalConfig;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<withdrawalApi.CreateWithdrawalConfigDto>({
    feeType: 'PERCENTAGE',
    feeValue: 1.5,
    minFee: 50,
    maxFee: 500,
    tierLevel: undefined,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    isActive: true,
    description: '',
  });

  // Fetch configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ['withdrawal', 'configs'],
    queryFn: withdrawalApi.getAllConfigs,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: withdrawalApi.createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal'] });
      setIsModalOpen(false);
      resetForm();
      toast.success('Withdrawal configuration created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create configuration');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: withdrawalApi.UpdateWithdrawalConfigDto }) =>
      withdrawalApi.updateConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal'] });
      setIsModalOpen(false);
      setEditingConfig(null);
      resetForm();
      toast.success('Withdrawal configuration updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update configuration');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: withdrawalApi.deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal'] });
      toast.success('Withdrawal configuration deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete configuration');
    },
  });

  const resetForm = () => {
    setFormData({
      feeType: 'PERCENTAGE',
      feeValue: 1.5,
      minFee: 50,
      maxFee: 500,
      tierLevel: undefined,
      minWithdrawal: 100,
      maxWithdrawal: 50000,
      isActive: true,
      description: '',
    });
  };

  const handleOpenModal = (config?: withdrawalApi.WithdrawalConfig) => {
    if (config) {
      setEditingConfig(config.id);
      setFormData({
        feeType: config.feeType,
        feeValue: Number(config.feeValue),
        minFee: Number(config.minFee),
        maxFee: config.maxFee ? Number(config.maxFee) : undefined,
        tierLevel: config.tierLevel || undefined,
        minWithdrawal: Number(config.minWithdrawal),
        maxWithdrawal: Number(config.maxWithdrawal),
        isActive: config.isActive,
        description: config.description || '',
      });
    } else {
      setEditingConfig(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingConfig) {
      updateMutation.mutate({
        id: editingConfig,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, config: withdrawalApi.WithdrawalConfig) => {
    setDeleteConfirmConfig({ id, config });
  };

  const confirmDelete = () => {
    if (deleteConfirmConfig) {
      deleteMutation.mutate(deleteConfirmConfig.id);
      setDeleteConfirmConfig(null);
    }
  };

  if (!canModifySettings) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You don&apos;t have permission to manage withdrawal settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Withdrawal Configuration</h1>
          <p className="text-muted-foreground mt-2">Manage withdrawal fees and limits for users</p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={!canModifySettings}>
          <Plus className="mr-2 h-4 w-4" />
          Add Configuration
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active withdrawal configs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Configs</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configs?.filter((c) => c.isActive).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Config</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configs?.find((c) => !c.tierLevel) ? '✓' : '✗'}
            </div>
            <p className="text-xs text-muted-foreground">Default fallback</p>
          </CardContent>
        </Card>
      </div>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Configurations</CardTitle>
          <CardDescription>
            Configure withdrawal fees and limits per KYC tier or set global defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : configs && configs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KYC Tier</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Fee Value</TableHead>
                  <TableHead>Min/Max Fee</TableHead>
                  <TableHead>Withdrawal Limits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">
                      {config.tierLevel ? (
                        <Badge variant="outline">{config.tierLevel}</Badge>
                      ) : (
                        <Badge>Global</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {config.feeType === 'FLAT' ? 'Fixed' : 'Percentage'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.feeType === 'FLAT'
                        ? `₦${Number(config.feeValue).toLocaleString()}`
                        : `${Number(config.feeValue)}%`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      Min: ₦{Number(config.minFee).toLocaleString()}
                      {config.maxFee && <> / Max: ₦{Number(config.maxFee).toLocaleString()}</>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      ₦{Number(config.minWithdrawal).toLocaleString()} - ₦
                      {Number(config.maxWithdrawal).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {config.isActive ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(config)}
                          disabled={!canModifySettings}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id, config)}
                          disabled={!canModifySettings}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No withdrawal configurations found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Edit' : 'Create'} Withdrawal Configuration</DialogTitle>
            <DialogDescription>
              Configure withdrawal fees and limits. Leave tier empty for global configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* KYC Tier */}
            <div className="space-y-2">
              <Label>KYC Tier (Optional)</Label>
              <Select
                value={formData.tierLevel || 'global'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    tierLevel: value === 'global' ? undefined : (value as withdrawalApi.KYCTier),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tier or leave global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Tiers)</SelectItem>
                  <SelectItem value="TIER_0">TIER 0 - Unverified</SelectItem>
                  <SelectItem value="TIER_1">TIER 1 - Email/Phone</SelectItem>
                  <SelectItem value="TIER_2">TIER 2 - BVN Verified</SelectItem>
                  <SelectItem value="TIER_3">TIER 3 - Full KYC</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Leave as Global to apply to all users. Tier-specific configs override global.
              </p>
            </div>

            {/* Fee Type */}
            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Select
                value={formData.feeType}
                onValueChange={(value) =>
                  setFormData({ ...formData, feeType: value as withdrawalApi.WithdrawalFeeType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FLAT">Fixed Amount (₦)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fee Value */}
            <div className="space-y-2">
              <Label>Fee Value {formData.feeType === 'PERCENTAGE' ? '(%)' : '(₦)'}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.feeValue}
                onChange={(e) => setFormData({ ...formData, feeValue: Number(e.target.value) })}
                placeholder={formData.feeType === 'PERCENTAGE' ? '1.5' : '50'}
              />
              <p className="text-sm text-muted-foreground">
                {formData.feeType === 'PERCENTAGE'
                  ? 'Percentage of withdrawal amount (e.g., 1.5 for 1.5%)'
                  : 'Fixed fee amount in Naira'}
              </p>
            </div>

            {/* Min Fee */}
            <div className="space-y-2">
              <Label>Minimum Fee (₦)</Label>
              <Input
                type="number"
                value={formData.minFee}
                onChange={(e) => setFormData({ ...formData, minFee: Number(e.target.value) })}
                placeholder="50"
              />
              <p className="text-sm text-muted-foreground">
                Minimum fee to charge regardless of calculation
              </p>
            </div>

            {/* Max Fee */}
            <div className="space-y-2">
              <Label>Maximum Fee (₦) - Optional</Label>
              <Input
                type="number"
                value={formData.maxFee || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxFee: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="500"
              />
              <p className="text-sm text-muted-foreground">Cap fee at this amount (optional)</p>
            </div>

            {/* Min Withdrawal */}
            <div className="space-y-2">
              <Label>Minimum Withdrawal (₦)</Label>
              <Input
                type="number"
                value={formData.minWithdrawal}
                onChange={(e) =>
                  setFormData({ ...formData, minWithdrawal: Number(e.target.value) })
                }
                placeholder="100"
              />
            </div>

            {/* Max Withdrawal */}
            <div className="space-y-2">
              <Label>Maximum Withdrawal (₦)</Label>
              <Input
                type="number"
                value={formData.maxWithdrawal}
                onChange={(e) =>
                  setFormData({ ...formData, maxWithdrawal: Number(e.target.value) })
                }
                placeholder="50000"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Standard withdrawal fee for verified users"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{editingConfig ? 'Update' : 'Create'}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmConfig} onOpenChange={() => setDeleteConfirmConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the withdrawal configuration for{' '}
              <strong>{deleteConfirmConfig?.config.tierLevel || 'Global'}</strong>. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
