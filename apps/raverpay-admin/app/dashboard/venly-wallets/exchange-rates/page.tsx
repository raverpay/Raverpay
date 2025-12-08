'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Save, X, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { venlyWalletsApi, ExchangeRate } from '@/lib/api/venly-wallets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';

export default function ExchangeRatesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ rate: string; fee: string }>({ rate: '', fee: '' });

  const { data: rates, isLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: () => venlyWalletsApi.getExchangeRates(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { currency: string; toNaira: number; platformFeePercent?: number }) =>
      venlyWalletsApi.updateExchangeRate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('Exchange rate updated successfully');
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update exchange rate');
    },
  });

  const handleEdit = (rate: ExchangeRate) => {
    setEditingId(rate.id);
    setEditValues({
      rate: rate.rate.toString(),
      fee: rate.platformFeePercent.toString(),
    });
  };

  const handleSave = (currency: string) => {
    if (!editValues.rate || parseFloat(editValues.rate) <= 0) {
      toast.error('Please enter a valid rate');
      return;
    }

    updateMutation.mutate({
      currency,
      toNaira: parseFloat(editValues.rate),
      platformFeePercent: editValues.fee ? parseFloat(editValues.fee) : undefined,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ rate: '', fee: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Exchange Rate Management</h2>
        <p className="text-muted-foreground">
          Configure exchange rates for crypto to Naira conversions
        </p>
      </div>

      {/* Critical Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Critical:</strong> Exchange rates control how much Naira users receive when
          converting crypto. All conversions use these rates. Changes take effect immediately.
        </AlertDescription>
      </Alert>

      {/* Exchange Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Exchange Rates</CardTitle>
          <CardDescription>Manage USD and stablecoin to Naira conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rates && rates.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Currency</TableHead>
                    <TableHead>To Currency</TableHead>
                    <TableHead className="text-right">Exchange Rate</TableHead>
                    <TableHead className="text-right">Platform Fee (%)</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => {
                    const isEditing = editingId === rate.id;
                    return (
                      <TableRow key={rate.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{rate.fromCurrency}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{rate.toCurrency}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValues.rate}
                              onChange={(e) =>
                                setEditValues({ ...editValues, rate: e.target.value })
                              }
                              className="w-32 text-right"
                              placeholder="1500.00"
                              step="0.01"
                            />
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              <span className="font-mono font-semibold">
                                ₦{parseFloat(rate.rate).toLocaleString('en-NG', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValues.fee}
                              onChange={(e) =>
                                setEditValues({ ...editValues, fee: e.target.value })
                              }
                              className="w-20 text-right"
                              placeholder="1.00"
                              step="0.01"
                              min="0"
                              max="100"
                            />
                          ) : (
                            <span className="font-mono">
                              {parseFloat(rate.platformFeePercent).toFixed(2)}%
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(rate.updatedAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave(rate.fromCurrency)}
                                disabled={updateMutation.isPending}
                                className="gap-1"
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={updateMutation.isPending}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(rate)}
                              className="gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No exchange rates configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Contact support to set up exchange rates
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How Exchange Rates Work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. User converts crypto (USDT/USDC) to Naira</p>
            <p>2. Crypto value is calculated in USD</p>
            <p>3. USD is multiplied by the exchange rate to get NGN</p>
            <p>4. Platform fee is deducted from the final amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Update rates regularly (daily recommended)</p>
            <p>• Check current market rates before updating</p>
            <p>• Keep platform fee between 1-3%</p>
            <p>• Test conversions after rate changes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
