'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Key, 
  Globe, 
  Shield, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { circleApi } from '@/lib/api/circle';
import { useToast } from '@/hooks/use-toast';

interface CircleConfig {
  environment: string;
  supportedBlockchains: string[];
  defaultBlockchain: string;
  defaultAccountType: string;
  isConfigured: boolean;
  paymasterSupported: string[];
}

export default function CircleSettingsPage() {
  const [config, setConfig] = useState<CircleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showEntitySecret, setShowEntitySecret] = useState(false);
  const { toast } = useToast();

  // Masked credentials (for display only)
  const [maskedApiKey, setMaskedApiKey] = useState('TEST_API_KEY:****...****');
  const [maskedEntitySecret, setMaskedEntitySecret] = useState('************************************');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await circleApi.getConfig();
      setConfig(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load Circle configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const testConnection = async () => {
    try {
      toast({
        title: 'Testing Connection',
        description: 'Verifying Circle API connection...',
      });
      
      await circleApi.getConfig();
      
      toast({
        title: 'Success',
        description: 'Circle API connection is working correctly',
      });
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to Circle API',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Circle Settings</h1>
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
        <div className="grid gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Circle Settings
          </h1>
          <p className="text-muted-foreground">
            Manage Circle API configuration and credentials
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={testConnection} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Test Connection
          </Button>
          <Button onClick={loadConfig} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      <Alert className={config?.isConfigured ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}>
        <div className="flex items-center gap-2">
          {config?.isConfigured ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
          <AlertDescription className={config?.isConfigured ? 'text-green-900' : 'text-yellow-900'}>
            {config?.isConfigured
              ? 'Circle API is configured and ready'
              : 'Circle API is not fully configured'}
          </AlertDescription>
        </div>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="paymaster">Paymaster</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Environment Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Environment
                </CardTitle>
                <CardDescription>Current Circle environment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mode</span>
                    <Badge variant={config?.environment === 'mainnet' ? 'default' : 'secondary'}>
                      {config?.environment?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={config?.isConfigured ? 'default' : 'destructive'}>
                      {config?.isConfigured ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Default Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Default Settings
                </CardTitle>
                <CardDescription>Default wallet configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Blockchain</span>
                    <Badge variant="outline">{config?.defaultBlockchain}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account Type</span>
                    <Badge variant="outline">{config?.defaultAccountType}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supported Networks Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Supported Networks
                </CardTitle>
                <CardDescription>
                  {config?.supportedBlockchains?.length || 0} blockchain networks available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {config?.supportedBlockchains?.map((blockchain) => (
                    <Badge key={blockchain} variant="secondary">
                      {blockchain}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Credentials are stored securely in environment variables. Never share your API key or entity secret.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Key
              </CardTitle>
              <CardDescription>Circle API authentication key</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={showApiKey ? process.env.NEXT_PUBLIC_CIRCLE_API_KEY || 'Not configured' : maskedApiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_CIRCLE_API_KEY || '', 'API Key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Environment variable: CIRCLE_API_KEY
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Entity Secret
              </CardTitle>
              <CardDescription>Encrypted entity secret for wallet operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Entity Secret (Hex)</Label>
                <div className="flex gap-2">
                  <Input
                    type={showEntitySecret ? 'text' : 'password'}
                    value={showEntitySecret ? process.env.NEXT_PUBLIC_CIRCLE_ENTITY_SECRET || 'Not configured' : maskedEntitySecret}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowEntitySecret(!showEntitySecret)}
                  >
                    {showEntitySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Environment variable: CIRCLE_ENTITY_SECRET
                </p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Keep your recovery file backed up securely. It's required for entity secret rotation.
                  Location: apps/raverpay-api/recovery/circle-recovery.dat
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Networks Tab */}
        <TabsContent value="networks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supported Blockchains</CardTitle>
              <CardDescription>
                Networks available for USDC wallet creation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config?.supportedBlockchains?.map((blockchain) => (
                  <div
                    key={blockchain}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{blockchain}</p>
                        <p className="text-sm text-muted-foreground">
                          {blockchain === config.defaultBlockchain && 'Default Network'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {blockchain === config?.defaultBlockchain && (
                        <Badge>Default</Badge>
                      )}
                      {config?.paymasterSupported?.includes(blockchain) && (
                        <Badge variant="secondary">Paymaster</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paymaster Tab */}
        <TabsContent value="paymaster" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paymaster Configuration</CardTitle>
              <CardDescription>
                Networks that support gas fee payments in USDC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config?.paymasterSupported?.map((blockchain) => (
                  <div
                    key={blockchain}
                    className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{blockchain}</p>
                        <p className="text-sm text-muted-foreground">
                          Users can pay gas fees in USDC
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                ))}
              </div>

              <Alert className="mt-4">
                <AlertDescription>
                  Paymaster allows users to pay transaction gas fees using USDC instead of native tokens (ETH, MATIC, etc.).
                  This provides a better user experience as users don't need to hold multiple token types.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

