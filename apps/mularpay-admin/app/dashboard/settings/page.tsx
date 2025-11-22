'use client';

import { useState } from 'react';
import {
  Settings,
  DollarSign,
  Shield,
  Bell,
  Server,
} from 'lucide-react';

import { usePermissions } from '@/lib/permissions';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function SettingsPage() {
  const { canModifySettings } = usePermissions();
  const [activeTab, setActiveTab] = useState('general');

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'MularPay',
    supportEmail: 'support@mularpay.com',
    supportPhone: '+234...',
    maintenanceMode: 'off',
  });

  const [feeSettings, setFeeSettings] = useState({
    depositFee: '0',
    withdrawalFee: '50',
    transferFee: '10',
    vtuFee: '0',
    giftcardFee: '2',
    cryptoFee: '1',
  });

  const [kycSettings, setKycSettings] = useState({
    tier0Limit: '50000',
    tier1Limit: '200000',
    tier2Limit: '1000000',
    tier3Limit: '5000000',
    bvnVerificationRequired: 'true',
    ninVerificationRequired: 'false',
  });

  const handleSaveGeneral = () => {
    alert('Settings saved! (This is a demo - implement API call)');
  };

  const handleSaveFees = () => {
    alert('Fee settings saved! (This is a demo - implement API call)');
  };

  const handleSaveKYC = () => {
    alert('KYC settings saved! (This is a demo - implement API call)');
  };

  if (!canModifySettings) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You don&apos;t have permission to access settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage platform configuration</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="fees" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Fees
          </TabsTrigger>
          <TabsTrigger value="kyc" className="gap-2">
            <Shield className="h-4 w-4" />
            KYC Limits
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Server className="h-4 w-4" />
            Providers
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic platform settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={generalSettings.platformName}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, platformName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input
                    id="supportPhone"
                    value={generalSettings.supportPhone}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                  <Select
                    value={generalSettings.maintenanceMode}
                    onValueChange={(value) =>
                      setGeneralSettings({ ...generalSettings, maintenanceMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="on">On</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveGeneral}>Save General Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Settings */}
        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle>Fee Configuration</CardTitle>
              <CardDescription>Configure transaction fees (in NGN or percentage)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="depositFee">Deposit Fee (NGN)</Label>
                  <Input
                    id="depositFee"
                    type="number"
                    value={feeSettings.depositFee}
                    onChange={(e) =>
                      setFeeSettings({ ...feeSettings, depositFee: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdrawalFee">Withdrawal Fee (NGN)</Label>
                  <Input
                    id="withdrawalFee"
                    type="number"
                    value={feeSettings.withdrawalFee}
                    onChange={(e) =>
                      setFeeSettings({ ...feeSettings, withdrawalFee: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferFee">Transfer Fee (NGN)</Label>
                  <Input
                    id="transferFee"
                    type="number"
                    value={feeSettings.transferFee}
                    onChange={(e) =>
                      setFeeSettings({ ...feeSettings, transferFee: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vtuFee">VTU Fee (NGN)</Label>
                  <Input
                    id="vtuFee"
                    type="number"
                    value={feeSettings.vtuFee}
                    onChange={(e) =>
                      setFeeSettings({ ...feeSettings, vtuFee: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="giftcardFee">Gift Card Fee (%)</Label>
                  <Input
                    id="giftcardFee"
                    type="number"
                    value={feeSettings.giftcardFee}
                    onChange={(e) =>
                      setFeeSettings({ ...feeSettings, giftcardFee: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cryptoFee">Crypto Fee (%)</Label>
                  <Input
                    id="cryptoFee"
                    type="number"
                    value={feeSettings.cryptoFee}
                    onChange={(e) =>
                      setFeeSettings({ ...feeSettings, cryptoFee: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleSaveFees}>Save Fee Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KYC Settings */}
        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle>KYC Tier Limits</CardTitle>
              <CardDescription>Configure transaction limits per KYC tier (in NGN)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tier0Limit">Tier 0 Daily Limit (NGN)</Label>
                  <Input
                    id="tier0Limit"
                    type="number"
                    value={kycSettings.tier0Limit}
                    onChange={(e) =>
                      setKycSettings({ ...kycSettings, tier0Limit: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier1Limit">Tier 1 Daily Limit (NGN)</Label>
                  <Input
                    id="tier1Limit"
                    type="number"
                    value={kycSettings.tier1Limit}
                    onChange={(e) =>
                      setKycSettings({ ...kycSettings, tier1Limit: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier2Limit">Tier 2 Daily Limit (NGN)</Label>
                  <Input
                    id="tier2Limit"
                    type="number"
                    value={kycSettings.tier2Limit}
                    onChange={(e) =>
                      setKycSettings({ ...kycSettings, tier2Limit: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier3Limit">Tier 3 Daily Limit (NGN)</Label>
                  <Input
                    id="tier3Limit"
                    type="number"
                    value={kycSettings.tier3Limit}
                    onChange={(e) =>
                      setKycSettings({ ...kycSettings, tier3Limit: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bvnRequired">BVN Verification Required</Label>
                  <Select
                    value={kycSettings.bvnVerificationRequired}
                    onValueChange={(value) =>
                      setKycSettings({ ...kycSettings, bvnVerificationRequired: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ninRequired">NIN Verification Required</Label>
                  <Select
                    value={kycSettings.ninVerificationRequired}
                    onValueChange={(value) =>
                      setKycSettings({ ...kycSettings, ninVerificationRequired: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveKYC}>Save KYC Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for important events
                    </p>
                  </div>
                  <Select defaultValue="enabled">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Send SMS for critical alerts
                    </p>
                  </div>
                  <Select defaultValue="enabled">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Send push notifications to mobile apps
                    </p>
                  </div>
                  <Select defaultValue="enabled">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button>Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provider Settings */}
        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Provider Configuration</CardTitle>
              <CardDescription>Manage third-party service providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">Payment Provider</p>
                      <p className="text-sm text-muted-foreground">
                        Primary payment gateway
                      </p>
                    </div>
                    <Select defaultValue="paystack">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paystack">Paystack</SelectItem>
                        <SelectItem value="flutterwave">Flutterwave</SelectItem>
                        <SelectItem value="providus">Providus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">VTU Provider</p>
                      <p className="text-sm text-muted-foreground">
                        Airtime and data provider
                      </p>
                    </div>
                    <Select defaultValue="vtpass">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vtpass">VTPass</SelectItem>
                        <SelectItem value="clubkonnect">ClubKonnect</SelectItem>
                        <SelectItem value="shago">Shago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">KYC Provider</p>
                      <p className="text-sm text-muted-foreground">
                        Identity verification provider
                      </p>
                    </div>
                    <Select defaultValue="verified">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">Verified.Africa</SelectItem>
                        <SelectItem value="smile">Smile ID</SelectItem>
                        <SelectItem value="youverify">YouVerify</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">Virtual Account Provider</p>
                      <p className="text-sm text-muted-foreground">
                        Virtual account generation
                      </p>
                    </div>
                    <Select defaultValue="providus">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="providus">Providus Bank</SelectItem>
                        <SelectItem value="wema">Wema Bank</SelectItem>
                        <SelectItem value="sterling">Sterling Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button>Save Provider Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
