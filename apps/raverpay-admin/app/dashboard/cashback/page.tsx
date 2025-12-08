'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as cashbackApi from '@/lib/api/cashback';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, TrendingUp, Users, Wallet } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';

export default function CashbackPage() {
  const queryClient = useQueryClient();
  const { canModifySettings } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [filterServiceType, setFilterServiceType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    serviceType: 'DATA' as cashbackApi.VTUServiceType,
    provider: '',
    percentage: 2.0,
    minAmount: 100,
    maxCashback: 50,
    isActive: true,
    description: '',
  });

  // Fetch configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ['cashback', 'configs'],
    queryFn: cashbackApi.getAllConfigs,
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['cashback', 'analytics'],
    queryFn: cashbackApi.getAnalytics,
    refetchInterval: 60000, // Refresh every minute
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: cashbackApi.createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashback'] });
      setIsModalOpen(false);
      resetForm();
      toast.success('Cashback configuration created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create configuration');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: cashbackApi.UpdateCashbackConfigDto }) =>
      cashbackApi.updateConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashback'] });
      setIsModalOpen(false);
      setEditingConfig(null);
      resetForm();
      toast.success('Cashback configuration updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update configuration');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: cashbackApi.deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashback'] });
      toast.success('Cashback configuration deactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete configuration');
    },
  });

  const resetForm = () => {
    setFormData({
      serviceType: 'DATA',
      provider: '',
      percentage: 2.0,
      minAmount: 100,
      maxCashback: 50,
      isActive: true,
      description: '',
    });
  };

  const handleOpenModal = (config?: cashbackApi.CashbackConfig) => {
    if (config) {
      setEditingConfig(config.id);
      setFormData({
        serviceType: config.serviceType,
        provider: config.provider || '',
        percentage: Number(config.percentage),
        minAmount: Number(config.minAmount),
        maxCashback: config.maxCashback ? Number(config.maxCashback) : 50,
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
        data: {
          percentage: formData.percentage,
          minAmount: formData.minAmount,
          maxCashback: formData.maxCashback,
          isActive: formData.isActive,
          description: formData.description || undefined,
        },
      });
    } else {
      createMutation.mutate({
        serviceType: formData.serviceType,
        provider: formData.provider || undefined,
        percentage: formData.percentage,
        minAmount: formData.minAmount,
        maxCashback: formData.maxCashback,
        isActive: formData.isActive,
        description: formData.description || undefined,
      });
    }
  };

  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{ id: string; config: cashbackApi.CashbackConfig } | null>(null);

  const handleDelete = (id: string, config: cashbackApi.CashbackConfig) => {
    setDeleteConfirmConfig({ id, config });
  };

  const confirmDelete = () => {
    if (deleteConfirmConfig) {
      deleteMutation.mutate(deleteConfirmConfig.id);
      setDeleteConfirmConfig(null);
    }
  };

  // Filter configurations
  const filteredConfigs = configs?.filter((config) => {
    if (filterServiceType !== 'all' && config.serviceType !== filterServiceType) {
      return false;
    }
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active';
      if (config.isActive !== isActive) return false;
    }
    return true;
  });

  if (!canModifySettings) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You don&apos;t have permission to manage cashback settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cashback Configuration</h2>
          <p className="text-muted-foreground">Manage cashback rewards for VTU services</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Configuration
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{analytics.totalCashbackEarned.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime cashback earned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Redeemed</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{analytics.totalCashbackRedeemed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime cashback used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{analytics.outstandingBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Available to redeem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">With cashback balance</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={filterServiceType} onValueChange={setFilterServiceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="DATA">Data</SelectItem>
                  <SelectItem value="AIRTIME">Airtime</SelectItem>
                  <SelectItem value="CABLE_TV">Cable TV</SelectItem>
                  <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cashback Configurations</CardTitle>
          <CardDescription>
            {filteredConfigs?.length || 0} configuration(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Min Amount</TableHead>
                  <TableHead>Max Cashback</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs && filteredConfigs.length > 0 ? (
                  filteredConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.serviceType}</TableCell>
                      <TableCell>{config.provider || 'All'}</TableCell>
                      <TableCell>{config.percentage}%</TableCell>
                      <TableCell>₦{Number(config.minAmount).toLocaleString()}</TableCell>
                      <TableCell>
                        {config.maxCashback ? `₦${Number(config.maxCashback).toLocaleString()}` : 'No cap'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.isActive ? 'default' : 'secondary'}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenModal(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(config.id, config)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No configurations found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Configuration' : 'Add Configuration'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Update the cashback configuration details below.'
                : 'Create a new cashback configuration for VTU services.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingConfig && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value: cashbackApi.VTUServiceType) =>
                      setFormData({ ...formData, serviceType: value })
                    }
                  >
                    <SelectTrigger id="serviceType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DATA">Data</SelectItem>
                      <SelectItem value="AIRTIME">Airtime</SelectItem>
                      <SelectItem value="CABLE_TV">Cable TV</SelectItem>
                      <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider (Optional)</Label>
                  <Input
                    id="provider"
                    placeholder="e.g., MTN, GLO (leave empty for all)"
                    value={formData.provider}
                    onChange={(e) =>
                      setFormData({ ...formData, provider: e.target.value.toUpperCase() })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to apply to all providers
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="percentage">Percentage (%)</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={formData.percentage}
                onChange={(e) =>
                  setFormData({ ...formData, percentage: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minAmount">Minimum Amount (₦)</Label>
              <Input
                id="minAmount"
                type="number"
                min="0"
                value={formData.minAmount}
                onChange={(e) =>
                  setFormData({ ...formData, minAmount: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCashback">Maximum Cashback (₦)</Label>
              <Input
                id="maxCashback"
                type="number"
                min="0"
                value={formData.maxCashback}
                onChange={(e) =>
                  setFormData({ ...formData, maxCashback: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Internal note"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (users can earn cashback)
              </Label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingConfig ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmConfig} onOpenChange={() => setDeleteConfirmConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deactivation</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {deleteConfirmConfig?.config.serviceType} cashback for{' '}
              {deleteConfirmConfig?.config.provider || 'All'} providers?
              <br />
              <br />
              This will prevent users from earning cashback on this service until reactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmConfig(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
