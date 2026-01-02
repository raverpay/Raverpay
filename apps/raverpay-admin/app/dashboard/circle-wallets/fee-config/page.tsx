'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { feesApi, type UpdateFeeConfigDto } from '@/lib/api/fees';
import { toast } from 'sonner';

export default function FeeConfigPage() {
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);

  const [enabled, setEnabled] = useState(true);
  const [percentage, setPercentage] = useState('0.5');
  const [minFee, setMinFee] = useState('0.0625');
  const [exampleAmount, setExampleAmount] = useState('100');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['fee-config'],
    queryFn: () => feesApi.getConfig(),
  });

  // Calculate example fee
  const { data: exampleFee, refetch: recalculateExample } = useQuery({
    queryKey: ['fee-calculation', exampleAmount],
    queryFn: () => feesApi.calculateFee(parseFloat(exampleAmount)),
    enabled: !!exampleAmount && !isNaN(parseFloat(exampleAmount)),
  });

  // Initialize state from server data only once
  useEffect(() => {
    if (configData?.data && !isInitialized.current) {
      setEnabled(configData.data.enabled);
      setPercentage(configData.data.percentage.toString());
      setMinFee(configData.data.minFeeUsdc.toString());
      isInitialized.current = true;
    }
  }, [configData]);

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateFeeConfigDto) => feesApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-config'] });
      setHasChanges(false);
      toast.success('Fee configuration updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update configuration');
    },
  });

  const handleSave = () => {
    const config: UpdateFeeConfigDto = {
      enabled,
      percentage: parseFloat(percentage),
      minFeeUsdc: parseFloat(minFee),
    };

    // Validate
    if (config.percentage! < 0 || config.percentage! > 100) {
      toast.error('Percentage must be between 0 and 100');
      return;
    }

    if (config.minFeeUsdc! < 0) {
      toast.error('Minimum fee cannot be negative');
      return;
    }

    updateMutation.mutate(config);
  };

  const handleInputChange = () => {
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Configuration</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Configure transaction fees for USDC transfers
        </p>
      </div>

      {/* Current Status Alert */}
      {configData?.data && (
        <Alert className={enabled ? 'border-green-500' : 'border-yellow-500'}>
          {enabled ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          )}
          <AlertDescription>
            Transaction fees are currently <strong>{enabled ? 'enabled' : 'disabled'}</strong>
            {enabled && (
              <>
                {' '}
                - Charging {configData.data.percentage}% with minimum {configData.data.minFeeUsdc}{' '}
                USDC
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Settings</CardTitle>
            <CardDescription>Update fee percentage and minimum fee amount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Fee Collection</Label>
                <p className="text-sm text-gray-500">Enable or disable transaction fees</p>
              </div>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={(checked) => {
                  setEnabled(checked);
                  handleInputChange();
                }}
              />
            </div>

            {/* Percentage */}
            <div className="space-y-2">
              <Label htmlFor="percentage">Fee Percentage (%)</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => {
                  setPercentage(e.target.value);
                  handleInputChange();
                }}
                placeholder="0.5"
                disabled={!enabled}
              />
              <p className="text-xs text-gray-500">Percentage of transaction amount (0-100%)</p>
            </div>

            {/* Minimum Fee */}
            <div className="space-y-2">
              <Label htmlFor="minFee">Minimum Fee (USDC)</Label>
              <Input
                id="minFee"
                type="number"
                step="0.0001"
                min="0"
                value={minFee}
                onChange={(e) => {
                  setMinFee(e.target.value);
                  handleInputChange();
                }}
                placeholder="0.0625"
                disabled={!enabled}
              />
              <p className="text-xs text-gray-500">Minimum fee charged per transaction</p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Fee Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Fee Calculator
            </CardTitle>
            <CardDescription>Calculate fees for any transaction amount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Example Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="exampleAmount">Transaction Amount (USDC)</Label>
              <Input
                id="exampleAmount"
                type="number"
                step="0.01"
                min="0"
                value={exampleAmount}
                onChange={(e) => setExampleAmount(e.target.value)}
                placeholder="100"
              />
            </div>

            {/* Calculation Results */}
            {exampleFee?.data && (
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Transfer Amount:</span>
                  <span className="font-medium">{exampleFee.data.amount.toFixed(4)} USDC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Service Fee:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {exampleFee.data.fee.toFixed(4)} USDC
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                  <span className="font-semibold">Total Deducted:</span>
                  <span className="font-bold text-lg">{exampleFee.data.total.toFixed(4)} USDC</span>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  {exampleFee.data.fee === exampleFee.data.minFee
                    ? `Minimum fee of ${exampleFee.data.minFee} USDC applied`
                    : `${exampleFee.data.percentage}% fee applied`}
                </p>
              </div>
            )}

            {/* Example Scenarios */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Quick Examples:</Label>
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => setExampleAmount('10')}
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  10 USDC transfer
                </button>
                <button
                  onClick={() => setExampleAmount('100')}
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  100 USDC transfer
                </button>
                <button
                  onClick={() => setExampleAmount('1000')}
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  1,000 USDC transfer
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Wallets Info */}
      {configData?.data?.collectionWallets && (
        <Card>
          <CardHeader>
            <CardTitle>Collection Wallets</CardTitle>
            <CardDescription>Configured wallet addresses for each blockchain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(configData.data.collectionWallets).map(([chain, address]) => (
                <div key={chain} className="p-3 border rounded-lg space-y-1">
                  <div className="text-sm font-medium">{chain}</div>
                  <div className="text-xs text-gray-500 font-mono truncate">{address}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
