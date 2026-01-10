'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Save, AlertCircle, CheckCircle2, Calculator, Wallet, Edit2 } from 'lucide-react';
import { feesApi, type UpdateFeeConfigDto } from '@/lib/api/fees';
import { toast } from 'sonner';

// Validate Ethereum address format
const isValidEthereumAddress = (address: string): boolean => {
  if (!address || address === '') return true; // Allow empty
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export default function FeeConfigPage() {
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);

  const [enabled, setEnabled] = useState(true);
  const [percentage, setPercentage] = useState('0.5');
  const [minFee, setMinFee] = useState('0.0625');
  const [exampleAmount, setExampleAmount] = useState('100');
  const [hasChanges, setHasChanges] = useState(false);

  // Collection wallets state
  const [collectionWallets, setCollectionWallets] = useState<Record<string, string>>({});
  const [editingWallets, setEditingWallets] = useState(false);
  const [walletChanges, setWalletChanges] = useState(false);
  const [showWalletConfirmDialog, setShowWalletConfirmDialog] = useState(false);

  // Fetch current config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['fee-config'],
    queryFn: () => feesApi.getConfig(),
  });

  // Calculate example fee
  const { data: exampleFee } = useQuery({
    queryKey: ['fee-calculation', exampleAmount],
    queryFn: () => feesApi.calculateFee(parseFloat(exampleAmount)),
    enabled: !!exampleAmount && !isNaN(parseFloat(exampleAmount)),
  });

  // Derive initial values from server data
  const serverEnabled = configData?.data?.enabled;
  const serverPercentage = configData?.data?.percentage;
  const serverMinFee = configData?.data?.minFeeUsdc;
  const serverWallets = configData?.data?.collectionWallets;

  // Initialize state from server data only once
  useEffect(() => {
    if (
      serverEnabled !== undefined &&
      serverPercentage !== undefined &&
      serverMinFee !== undefined &&
      !isInitialized.current
    ) {
      const timeoutId = setTimeout(() => {
        setEnabled(serverEnabled);
        setPercentage(serverPercentage.toString());
        setMinFee(serverMinFee.toString());
        if (serverWallets) {
          setCollectionWallets(serverWallets);
        }
        isInitialized.current = true;
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [serverEnabled, serverPercentage, serverMinFee, serverWallets]);

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateFeeConfigDto) => feesApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-config'] });
      setHasChanges(false);
      setWalletChanges(false);
      setEditingWallets(false);
      toast.success('Fee configuration updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
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

  const handleSaveWallets = () => {
    // Validate all addresses
    for (const [chain, address] of Object.entries(collectionWallets)) {
      if (!isValidEthereumAddress(address)) {
        toast.error(`Invalid address format for ${chain}`);
        return;
      }
    }

    setShowWalletConfirmDialog(true);
  };

  const confirmSaveWallets = () => {
    setShowWalletConfirmDialog(false);

    const config: UpdateFeeConfigDto = {
      collectionWallets,
    };

    updateMutation.mutate(config);
  };

  const handleWalletChange = (chain: string, address: string) => {
    setCollectionWallets((prev) => ({
      ...prev,
      [chain]: address,
    }));
    setWalletChanges(true);
  };

  const handleCancelWalletEdit = () => {
    if (serverWallets) {
      setCollectionWallets(serverWallets);
    }
    setWalletChanges(false);
    setEditingWallets(false);
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

      {/* Collection Wallets */}
      {configData?.data?.collectionWallets && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Collection Wallets
              </CardTitle>
              <CardDescription>
                Wallet addresses where collected fees are sent for each blockchain
              </CardDescription>
            </div>
            {!editingWallets ? (
              <Button variant="outline" size="sm" onClick={() => setEditingWallets(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Wallets
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelWalletEdit}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveWallets}
                  disabled={!walletChanges || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Wallets'
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(collectionWallets).map(([chain, address]) => (
                <div key={chain} className="space-y-2">
                  <Label htmlFor={`wallet-${chain}`} className="text-sm font-medium">
                    {chain}
                  </Label>
                  {editingWallets ? (
                    <div className="space-y-1">
                      <Input
                        id={`wallet-${chain}`}
                        value={address}
                        onChange={(e) => handleWalletChange(chain, e.target.value)}
                        placeholder="0x..."
                        className={`font-mono text-sm ${
                          address && !isValidEthereumAddress(address)
                            ? 'border-red-500 focus:ring-red-500'
                            : ''
                        }`}
                      />
                      {address && !isValidEthereumAddress(address) && (
                        <p className="text-xs text-red-500">Invalid Ethereum address format</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="text-sm font-mono truncate">
                        {address || <span className="text-gray-400 italic">Not configured</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {editingWallets && (
              <Alert className="mt-4 border-yellow-500">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription>
                  <strong>Warning:</strong> Changing collection wallet addresses will affect where
                  future fees are sent. Double-check addresses before saving.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showWalletConfirmDialog} onOpenChange={setShowWalletConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Wallet Address Changes</DialogTitle>
            <DialogDescription>
              Are you sure you want to update the collection wallet addresses? This will affect
              where future fees are sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-4 max-h-60 overflow-y-auto">
            {Object.entries(collectionWallets).map(([chain, address]) => (
              <div
                key={chain}
                className="flex justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <span className="font-medium">{chain}</span>
                <span className="font-mono text-xs truncate max-w-[250px]">
                  {address || <span className="text-gray-400">Not set</span>}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWalletConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSaveWallets} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm & Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
