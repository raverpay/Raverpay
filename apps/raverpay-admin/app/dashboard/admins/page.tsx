'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  Search,
  UserPlus,
  Trash2,
  Edit,
  Shield,
  UserCog,
  AlertTriangle,
  Info,
  X,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import { adminsApi, CreateAdminDto, UpdateAdminDto, IpWhitelistEntry } from '@/lib/api/admins';
import { usePermissions } from '@/lib/permissions';
import { UserRole } from '@/types';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { RoleBadge, StatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { useReAuth } from '@/components/security/re-auth-modal';

const adminRoles: UserRole[] = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'];

export default function AdminsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateAdminDto>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    role: 'ADMIN',
    initialIpAddress: '',
    skipIpWhitelist: false,
    personalEmail: '',
    sendCredentials: true,
    sendMfaSetup: false,
  });
  const [editForm, setEditForm] = useState<UpdateAdminDto>({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'ADMIN',
    ipAddresses: [],
    mfaEnabled: undefined,
  });
  const [currentIpWhitelist, setCurrentIpWhitelist] = useState<IpWhitelistEntry[]>([]);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [loadingIpWhitelist, setLoadingIpWhitelist] = useState(false);
  const queryClient = useQueryClient();
  const { canManageAdmins } = usePermissions();
  const { requireReAuth, ReAuthModal } = useReAuth();

  const { data: adminsData, isLoading } = useQuery({
    queryKey: ['admins', page, debouncedSearch, roleFilter],
    queryFn: () =>
      adminsApi.getAll({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAdminDto) => adminsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setCreateDialogOpen(false);
      setCreateForm({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        password: '',
        role: 'ADMIN',
        initialIpAddress: '',
        skipIpWhitelist: false,
        personalEmail: '',
        sendCredentials: true,
        sendMfaSetup: false,
      });
      toast.success('Admin created successfully!');
    },
    onError: (
      error: AxiosError<{ message?: string; error?: string }>,
      variables: CreateAdminDto,
    ) => {
      // Check if re-authentication is required
      if (
        error.response?.status === 428 &&
        error.response?.data?.error === 'ReAuthenticationRequired'
      ) {
        // Trigger re-auth modal, then retry the operation
        requireReAuth(() => {
          // After successful re-auth, retry the operation
          createMutation.mutate(variables);
        });
        return;
      }
      const message = error.response?.data?.message || 'Failed to create admin';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ adminId, data }: { adminId: string; data: UpdateAdminDto }) =>
      adminsApi.update(adminId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setEditDialogOpen(false);
      setSelectedAdmin(null);
      toast.success('Admin updated successfully!');
    },
    onError: (
      error: AxiosError<{ message?: string; error?: string }>,
      variables: { adminId: string; data: UpdateAdminDto },
    ) => {
      // Check if re-authentication is required
      if (
        error.response?.status === 428 &&
        error.response?.data?.error === 'ReAuthenticationRequired'
      ) {
        // Trigger re-auth modal, then retry the operation
        requireReAuth(() => {
          // After successful re-auth, retry the operation
          updateMutation.mutate(variables);
        });
        return;
      }
      const message = error.response?.data?.message || 'Failed to update admin';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (adminId: string) => adminsApi.delete(adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin deleted successfully!');
    },
    onError: (error: AxiosError<{ message?: string; error?: string }>, adminId: string) => {
      // Check if re-authentication is required
      if (
        error.response?.status === 428 &&
        error.response?.data?.error === 'ReAuthenticationRequired'
      ) {
        // Trigger re-auth modal, then retry the operation
        requireReAuth(() => {
          // After successful re-auth, retry the operation
          deleteMutation.mutate(adminId);
        });
        return;
      }
      const message = error.response?.data?.message || 'Failed to delete admin';
      toast.error(message);
    },
  });

  const handleCreate = () => {
    if (
      !createForm.email ||
      !createForm.firstName ||
      !createForm.lastName ||
      !createForm.password
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Prepare form data, removing empty optional fields
    const formData: CreateAdminDto = {
      email: createForm.email,
      firstName: createForm.firstName,
      lastName: createForm.lastName,
      phone: createForm.phone,
      password: createForm.password,
      role: createForm.role,
      ...(createForm.initialIpAddress && { initialIpAddress: createForm.initialIpAddress }),
      ...(createForm.skipIpWhitelist && { skipIpWhitelist: true }),
      ...(createForm.personalEmail && { personalEmail: createForm.personalEmail }),
      ...(createForm.sendCredentials !== undefined && {
        sendCredentials: createForm.sendCredentials,
      }),
      ...(createForm.sendMfaSetup && { sendMfaSetup: true }),
    };

    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedAdmin) return;

    // Prepare update data, only including changed fields
    const updateData: UpdateAdminDto = {
      ...(editForm.firstName && { firstName: editForm.firstName }),
      ...(editForm.lastName && { lastName: editForm.lastName }),
      ...(editForm.phone !== undefined && { phone: editForm.phone }),
      ...(editForm.role && { role: editForm.role }),
      ...(editForm.ipAddresses !== undefined && { ipAddresses: editForm.ipAddresses }),
      ...(editForm.mfaEnabled !== undefined && { mfaEnabled: editForm.mfaEnabled }),
    };

    updateMutation.mutate({ adminId: selectedAdmin, data: updateData });
  };

  const handleDelete = (adminId: string) => {
    if (confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      deleteMutation.mutate(adminId);
    }
  };

  const openEditDialog = async (admin: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: UserRole;
    twoFactorEnabled?: boolean;
  }) => {
    setSelectedAdmin(admin.id);
    setEditForm({
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: admin.phone,
      role: admin.role,
      ipAddresses: [],
      mfaEnabled: admin.twoFactorEnabled,
    });
    setNewIpAddress('');
    setEditDialogOpen(true);

    // Fetch current IP whitelist entries
    setLoadingIpWhitelist(true);
    try {
      const ipEntries = await adminsApi.getIpWhitelist(admin.id);
      setCurrentIpWhitelist(ipEntries);
      // Set current IPs in form
      const userSpecificIps = ipEntries
        .filter((entry) => entry.userId === admin.id && entry.isActive)
        .map((entry) => entry.ipAddress);
      setEditForm((prev) => ({
        ...prev,
        ipAddresses: userSpecificIps,
      }));
    } catch (error) {
      console.error('Failed to load IP whitelist:', error);
      toast.error('Failed to load IP whitelist entries');
    } finally {
      setLoadingIpWhitelist(false);
    }
  };

  const addIpAddress = () => {
    if (!newIpAddress.trim()) {
      toast.error('Please enter an IP address');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIpAddress.trim())) {
      toast.error('Please enter a valid IP address');
      return;
    }

    const currentIps = editForm.ipAddresses || [];
    if (currentIps.includes(newIpAddress.trim())) {
      toast.error('This IP address is already in the list');
      return;
    }

    setEditForm({
      ...editForm,
      ipAddresses: [...currentIps, newIpAddress.trim()],
    });
    setNewIpAddress('');
  };

  const removeIpAddress = (ipToRemove: string) => {
    const currentIps = editForm.ipAddresses || [];
    setEditForm({
      ...editForm,
      ipAddresses: currentIps.filter((ip) => ip !== ipToRemove),
    });
  };

  if (!canManageAdmins) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You don&apos;t have permission to manage admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Management</h2>
          <p className="text-muted-foreground">Manage admin users and permissions</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Admin</DialogTitle>
              <DialogDescription>Add a new administrator to the platform.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="security">Security & IP</TabsTrigger>
                <TabsTrigger value="email">Email Options</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+234..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(value) =>
                      setCreateForm({ ...createForm, role: value as UserRole })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Security & IP Whitelist</h3>
                </div>

                {/* IP Whitelist */}
                <div className="space-y-2">
                  <Label htmlFor="initialIpAddress">Initial IP Address</Label>
                  <Input
                    id="initialIpAddress"
                    value={createForm.initialIpAddress || ''}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, initialIpAddress: e.target.value })
                    }
                    placeholder="203.0.113.45"
                  />
                  <p className="text-xs text-muted-foreground">
                    IP address to whitelist for this admin. Leave empty to skip IP whitelisting.
                  </p>
                </div>

                {createForm.initialIpAddress && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skipIpWhitelist"
                      checked={createForm.skipIpWhitelist || false}
                      onCheckedChange={(checked) =>
                        setCreateForm({ ...createForm, skipIpWhitelist: checked === true })
                      }
                    />
                    <Label htmlFor="skipIpWhitelist" className="text-sm font-normal cursor-pointer">
                      Skip IP whitelist requirement for 24 hours (temporary access)
                    </Label>
                  </div>
                )}

                {/* Security Warnings */}
                {createForm.skipIpWhitelist && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Security Warning</AlertTitle>
                    <AlertDescription>
                      Temporary IP whitelist access expires in 24 hours. Ensure the admin&apos;s IP
                      is permanently whitelisted before expiration.
                    </AlertDescription>
                  </Alert>
                )}

                {!createForm.initialIpAddress && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>IP Whitelist Required</AlertTitle>
                    <AlertDescription>
                      Admin users must have their IP address whitelisted to access the system. You
                      can add it now or provision it later using the provisioning endpoint.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Email Configuration</h3>
                </div>

                {/* Personal Email */}
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Personal Email (Optional)</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={createForm.personalEmail || ''}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, personalEmail: e.target.value })
                    }
                    placeholder="admin.personal@gmail.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use this email for initial credential delivery if corporate email is not ready.
                  </p>
                </div>

                {/* Email Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendCredentials"
                      checked={createForm.sendCredentials !== false}
                      onCheckedChange={(checked) =>
                        setCreateForm({ ...createForm, sendCredentials: checked === true })
                      }
                    />
                    <Label htmlFor="sendCredentials" className="text-sm font-normal cursor-pointer">
                      Send credentials via email
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendMfaSetup"
                      checked={createForm.sendMfaSetup || false}
                      onCheckedChange={(checked) =>
                        setCreateForm({ ...createForm, sendMfaSetup: checked === true })
                      }
                    />
                    <Label htmlFor="sendMfaSetup" className="text-sm font-normal cursor-pointer">
                      Generate and send MFA setup QR code
                    </Label>
                  </div>
                </div>

                {createForm.sendMfaSetup && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>MFA Setup</AlertTitle>
                    <AlertDescription>
                      An MFA QR code and backup codes will be sent via email. The admin must scan
                      the QR code with an authenticator app to complete MFA setup.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Admin'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminsData?.meta?.totalItems || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Super Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {adminsData?.data?.filter((a) => a.role === 'SUPER_ADMIN').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Support Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {adminsData?.data?.filter((a) => a.role === 'SUPPORT').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>View and manage all admin users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {adminRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : adminsData?.data && adminsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminsData.data.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.firstName} {admin.lastName}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{admin.phone || '-'}</TableCell>
                        <TableCell>
                          <RoleBadge role={admin.role} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={admin.status} />
                        </TableCell>
                        <TableCell>{formatDate(admin.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openEditDialog({
                                  id: admin.id,
                                  firstName: admin.firstName,
                                  lastName: admin.lastName,
                                  phone: admin.phone,
                                  role: admin.role,
                                })
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(admin.id)}
                              disabled={deleteMutation.isPending}
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

              {adminsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={adminsData.meta.totalPages}
                  totalItems={adminsData.meta.total}
                  itemsPerPage={adminsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No admin users found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>Update admin user information and permissions.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="security">Security Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Security Settings</h3>
              </div>

              {/* MFA Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mfaEnabled" className="cursor-pointer">
                    Multi-Factor Authentication (MFA)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable two-factor authentication for this admin
                  </p>
                </div>
                <Switch
                  id="mfaEnabled"
                  checked={editForm.mfaEnabled === true}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, mfaEnabled: checked })}
                />
              </div>

              {/* IP Whitelist Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>IP Whitelist</Label>
                  <Badge variant="outline">
                    {editForm.ipAddresses?.length || 0} IP
                    {editForm.ipAddresses?.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {loadingIpWhitelist ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Current IP Addresses */}
                    {editForm.ipAddresses && editForm.ipAddresses.length > 0 ? (
                      <div className="space-y-2">
                        {editForm.ipAddresses.map((ip) => {
                          const entry = currentIpWhitelist.find((e) => e.ipAddress === ip);
                          const isExpired = entry?.expiresAt
                            ? new Date(entry.expiresAt) < new Date()
                            : false;
                          const isTemporary = !!entry?.expiresAt;

                          return (
                            <div
                              key={ip}
                              className="flex items-center justify-between p-2 border rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{ip}</span>
                                {isTemporary && (
                                  <Badge variant="outline" className="text-xs">
                                    {isExpired ? 'Expired' : 'Temporary'}
                                  </Badge>
                                )}
                                {entry?.expiresAt && !isExpired && (
                                  <span className="text-xs text-muted-foreground">
                                    Expires: {formatDate(entry.expiresAt)}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeIpAddress(ip)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>No IP Addresses</AlertTitle>
                        <AlertDescription>
                          This admin has no IP addresses whitelisted. Add at least one IP address
                          for them to access the system.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Add New IP Address */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="203.0.113.45"
                        value={newIpAddress}
                        onChange={(e) => setNewIpAddress(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addIpAddress();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button onClick={addIpAddress} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>IP Whitelist Management</AlertTitle>
                      <AlertDescription>
                        Changes to IP whitelist will sync with the server. Removing an IP will
                        immediately revoke access from that address. Adding an IP will grant
                        immediate access.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ReAuthModal}
    </div>
  );
}
