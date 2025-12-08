'use client';

import { useState } from 'react';
import { Settings, DollarSign, Shield, Bell, Server, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as appConfigApi from '@/lib/api/app-config';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const { canModifySettings } = usePermissions();
  const [activeTab, setActiveTab] = useState('general');
  const queryClient = useQueryClient();

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'RaverPay',
    supportEmail: 'support@raverpay.com',
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
    toast.success('Settings saved! (This is a demo - implement API call)');
  };

  const handleSaveFees = () => {
    toast.success('Fee settings saved! (This is a demo - implement API call)');
  };

  const handleSaveKYC = () => {
    toast.success('KYC settings saved! (This is a demo - implement API call)');
  };

  // Rating Configuration
  const { data: ratingConfig, isLoading: isLoadingRating } = useQuery({
    queryKey: ['app-config', 'rating'],
    queryFn: appConfigApi.getRatingConfig,
  });

  const updateRatingMutation = useMutation({
    mutationFn: appConfigApi.updateRatingConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config', 'rating'] });
      toast.success('Rating configuration updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update rating configuration');
    },
  });

  const [ratingFormData, setRatingFormData] = useState({
    enabled: true,
    promptFrequencyDays: 30,
    minTransactionsRequired: 3,
    minUsageDaysRequired: 7,
    promptTitle: 'Enjoying RaverPay?',
    promptMessage: 'Rate us on the app store! Your feedback helps us improve.',
    iosAppStoreUrl: '',
    androidPlayStoreUrl: '',
  });

  // Update form when data is loaded
  if (ratingConfig && !isLoadingRating && ratingFormData.iosAppStoreUrl === '') {
    setRatingFormData({
      enabled: ratingConfig.enabled,
      promptFrequencyDays: ratingConfig.promptFrequencyDays,
      minTransactionsRequired: ratingConfig.minTransactionsRequired,
      minUsageDaysRequired: ratingConfig.minUsageDaysRequired,
      promptTitle: ratingConfig.promptTitle,
      promptMessage: ratingConfig.promptMessage,
      iosAppStoreUrl: ratingConfig.iosAppStoreUrl,
      androidPlayStoreUrl: ratingConfig.androidPlayStoreUrl,
    });
  }

  const handleSaveRating = () => {
    updateRatingMutation.mutate(ratingFormData);
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
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="rating" className="gap-2">
            <Star className="h-4 w-4" />
            App Rating
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
                    onChange={(e) => setFeeSettings({ ...feeSettings, depositFee: e.target.value })}
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
                    onChange={(e) => setFeeSettings({ ...feeSettings, vtuFee: e.target.value })}
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
                    onChange={(e) => setFeeSettings({ ...feeSettings, cryptoFee: e.target.value })}
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
                    onChange={(e) => setKycSettings({ ...kycSettings, tier0Limit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier1Limit">Tier 1 Daily Limit (NGN)</Label>
                  <Input
                    id="tier1Limit"
                    type="number"
                    value={kycSettings.tier1Limit}
                    onChange={(e) => setKycSettings({ ...kycSettings, tier1Limit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier2Limit">Tier 2 Daily Limit (NGN)</Label>
                  <Input
                    id="tier2Limit"
                    type="number"
                    value={kycSettings.tier2Limit}
                    onChange={(e) => setKycSettings({ ...kycSettings, tier2Limit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier3Limit">Tier 3 Daily Limit (NGN)</Label>
                  <Input
                    id="tier3Limit"
                    type="number"
                    value={kycSettings.tier3Limit}
                    onChange={(e) => setKycSettings({ ...kycSettings, tier3Limit: e.target.value })}
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
                    <p className="text-sm text-muted-foreground">Send SMS for critical alerts</p>
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
                      <p className="text-sm text-muted-foreground">Primary payment gateway</p>
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
                      <p className="text-sm text-muted-foreground">Airtime and data provider</p>
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
                      <p className="text-sm text-muted-foreground">Virtual account generation</p>
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

        {/* App Rating Configuration */}
        <TabsContent value="rating">
          <Card>
            <CardHeader>
              <CardTitle>App Rating Configuration</CardTitle>
              <CardDescription>
                Configure when and how users are prompted to rate the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingRating ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Enable Rating Prompts</p>
                      <p className="text-sm text-muted-foreground">
                        Show rating prompts to eligible users
                      </p>
                    </div>
                    <Select
                      value={ratingFormData.enabled ? 'enabled' : 'disabled'}
                      onValueChange={(value) =>
                        setRatingFormData({ ...ratingFormData, enabled: value === 'enabled' })
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Eligibility Criteria */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Eligibility Criteria</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="promptFrequency">Prompt Frequency (Days)</Label>
                        <Input
                          id="promptFrequency"
                          type="number"
                          min="1"
                          value={ratingFormData.promptFrequencyDays}
                          onChange={(e) =>
                            setRatingFormData({
                              ...ratingFormData,
                              promptFrequencyDays: parseInt(e.target.value) || 30,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">Days between rating prompts</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minTransactions">Minimum Transactions</Label>
                        <Input
                          id="minTransactions"
                          type="number"
                          min="0"
                          value={ratingFormData.minTransactionsRequired}
                          onChange={(e) =>
                            setRatingFormData({
                              ...ratingFormData,
                              minTransactionsRequired: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Required successful transactions
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minUsageDays">Minimum Usage Days</Label>
                        <Input
                          id="minUsageDays"
                          type="number"
                          min="0"
                          value={ratingFormData.minUsageDaysRequired}
                          onChange={(e) =>
                            setRatingFormData({
                              ...ratingFormData,
                              minUsageDaysRequired: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">Days since account creation</p>
                      </div>
                    </div>
                  </div>

                  {/* Prompt Content */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Prompt Content</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="promptTitle">Prompt Title</Label>
                        <Input
                          id="promptTitle"
                          value={ratingFormData.promptTitle}
                          onChange={(e) =>
                            setRatingFormData({
                              ...ratingFormData,
                              promptTitle: e.target.value,
                            })
                          }
                          placeholder="Enjoying RaverPay?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="promptMessage">Prompt Message</Label>
                        <Input
                          id="promptMessage"
                          value={ratingFormData.promptMessage}
                          onChange={(e) =>
                            setRatingFormData({
                              ...ratingFormData,
                              promptMessage: e.target.value,
                            })
                          }
                          placeholder="Rate us on the app store! Your feedback helps us improve."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Store URLs */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">App Store URLs</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="iosUrl">iOS App Store URL</Label>
                        <Input
                          id="iosUrl"
                          type="url"
                          value={ratingFormData.iosAppStoreUrl}
                          onChange={(e) =>
                            setRatingFormData({
                              ...ratingFormData,
                              iosAppStoreUrl: e.target.value,
                            })
                          }
                          placeholder="https://apps.apple.com/app/id..."
                        />
                        <p className="text-xs text-muted-foreground">Apple App Store listing URL</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="androidUrl">Android Play Store URL</Label>
                        <Input
                          id="androidUrl"
                          type="url"
                          value={ratingFormData.androidPlayStoreUrl}
                          onChange={(e) =>
                            setRatingFormData({
                              ...ratingFormData,
                              androidPlayStoreUrl: e.target.value,
                            })
                          }
                          placeholder="https://play.google.com/store/apps/details?id=..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Google Play Store listing URL
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Preview</h3>
                    <div className="p-6 rounded-lg border bg-muted/50">
                      <div className="max-w-sm mx-auto bg-background rounded-lg shadow-lg p-6 space-y-4">
                        <div className="text-center">
                          <Star className="h-12 w-12 mx-auto text-yellow-500 mb-3" />
                          <h4 className="text-xl font-bold mb-2">{ratingFormData.promptTitle}</h4>
                          <p className="text-sm text-muted-foreground">
                            {ratingFormData.promptMessage}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" className="w-full">
                            Rate Now
                          </Button>
                          <Button size="sm" variant="outline" className="w-full">
                            Maybe Later
                          </Button>
                          <Button size="sm" variant="ghost" className="w-full">
                            Don&apos;t Ask Again
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveRating} disabled={updateRatingMutation.isPending}>
                    {updateRatingMutation.isPending && (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                    )}
                    Save Rating Configuration
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
