'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import {
  Search,
  AlertCircle,
  User,
  Phone,
  Mail,
  CreditCard,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { virtualAccountsApi } from '@/lib/api/virtual-accounts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface FailedDVAUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  paystackCustomerCode: string;
  bvn: string | null;
  bvnVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastFailure: {
    id: string;
    failureReason: string | null;
    retryCount: number;
    lastRetryAt: string | null;
    createdAt: string;
  } | null;
}

export default function FailedDVACreationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [selectedUser, setSelectedUser] = useState<FailedDVAUser | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [preferredBank, setPreferredBank] = useState<string>('wema-bank');
  const queryClient = useQueryClient();

  const { data, isPending: isLoading } = useQuery({
    queryKey: ['failed-dva-creations', page, debouncedSearch],
    queryFn: () =>
      virtualAccountsApi.getFailedCreations({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
      }),
  });

  const createDVAMutation = useMutation({
    mutationFn: ({ userId, bank }: { userId: string; bank?: string }) =>
      virtualAccountsApi.createDVAForUser(userId, bank),
    onSuccess: () => {
      toast.success('Virtual account created successfully');
      setIsCreateDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['failed-dva-creations'] });
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to create virtual account',
      );
    },
  });

  const handleCreateDVA = () => {
    if (!selectedUser) return;
    createDVAMutation.mutate({
      userId: selectedUser.id,
      bank: preferredBank,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Failed DVA Creations</h2>
          <p className="text-muted-foreground">
            Users with customer code and BVN but no active virtual account
          </p>
        </div>
        <Link href="/dashboard/virtual-accounts">
          <Button variant="outline">Back to Virtual Accounts</Button>
        </Link>
      </div>

      {/* Alert Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Manual Intervention Required</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            These users have Paystack customer codes and BVN but their virtual account creation
            failed. You can manually create their DVA accounts from this page.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Failed DVA Creations</CardTitle>
          <CardDescription>
            {data?.meta?.total || 0} user{data?.meta?.total !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No failed creations found</p>
              <p className="text-muted-foreground">
                All users have active virtual accounts or don't meet the requirements.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Customer Code</TableHead>
                      <TableHead>BVN Status</TableHead>
                      <TableHead>Last Failure</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((user: FailedDVAUser) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {user.paystackCustomerCode}
                          </code>
                        </TableCell>
                        <TableCell>
                          {user.bvn ? (
                            <Badge variant="success">
                              {user.bvnVerified ? 'Verified' : 'Provided'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Missing</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.lastFailure ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-destructive">
                                {user.lastFailure.failureReason || 'Unknown error'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Retries: {user.lastFailure.retryCount} •{' '}
                                {formatDate(user.lastFailure.createdAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No failure record</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsCreateDialogOpen(true);
                            }}
                            disabled={!user.bvn}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create DVA
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {data.meta && data.meta.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={data.meta.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create DVA Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Virtual Account</DialogTitle>
            <DialogDescription>
              Create a virtual account for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">User Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span> {selectedUser.email}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span> {selectedUser.phone}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer Code:</span>{' '}
                    <code className="rounded bg-muted px-1">{selectedUser.paystackCustomerCode}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">BVN:</span>{' '}
                    {selectedUser.bvn ? (
                      <Badge variant="success">Provided</Badge>
                    ) : (
                      <Badge variant="destructive">Missing</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Preferred Bank</label>
                <Select value={preferredBank} onValueChange={setPreferredBank}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wema-bank">Wema Bank</SelectItem>
                    <SelectItem value="providus-bank">Providus Bank</SelectItem>
                    <SelectItem value="kuda-bank">Kuda Bank</SelectItem>
                    <SelectItem value="titan-paystack">Titan Paystack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedUser.lastFailure && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-orange-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Last Failure:</span>
                  </div>
                  <p className="mt-1 text-sm text-orange-700">
                    {selectedUser.lastFailure.failureReason || 'Unknown error'}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createDVAMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDVA}
              disabled={createDVAMutation.isPending || !selectedUser?.bvn}
            >
              {createDVAMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create DVA
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

