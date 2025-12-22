'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRightLeft,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';

import { circleApi, CCTPTransferState } from '@/lib/api/circle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const STATE_COLORS: Record<CCTPTransferState, string> = {
  INITIATED: 'bg-yellow-100 text-yellow-800',
  BURN_PENDING: 'bg-yellow-100 text-yellow-800',
  BURN_COMPLETE: 'bg-blue-100 text-blue-800',
  ATTESTATION_PENDING: 'bg-blue-100 text-blue-800',
  ATTESTATION_COMPLETE: 'bg-purple-100 text-purple-800',
  MINT_PENDING: 'bg-purple-100 text-purple-800',
  COMPLETE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const STATE_ICONS: Record<CCTPTransferState, React.ReactNode> = {
  INITIATED: <Clock className="h-5 w-5 text-yellow-600" />,
  BURN_PENDING: <Clock className="h-5 w-5 text-yellow-600" />,
  BURN_COMPLETE: <CheckCircle2 className="h-5 w-5 text-blue-600" />,
  ATTESTATION_PENDING: <Clock className="h-5 w-5 text-blue-600" />,
  ATTESTATION_COMPLETE: <CheckCircle2 className="h-5 w-5 text-purple-600" />,
  MINT_PENDING: <Clock className="h-5 w-5 text-purple-600" />,
  COMPLETE: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  FAILED: <XCircle className="h-5 w-5 text-red-600" />,
  CANCELLED: <XCircle className="h-5 w-5 text-gray-600" />,
};

const BLOCKCHAIN_EXPLORERS: Record<string, string> = {
  ETH: 'https://etherscan.io/tx/',
  'ETH-SEPOLIA': 'https://sepolia.etherscan.io/tx/',
  MATIC: 'https://polygonscan.com/tx/',
  'MATIC-AMOY': 'https://amoy.polygonscan.com/tx/',
  ARB: 'https://arbiscan.io/tx/',
  'ARB-SEPOLIA': 'https://sepolia.arbiscan.io/tx/',
  AVAX: 'https://snowtrace.io/tx/',
  'AVAX-FUJI': 'https://testnet.snowtrace.io/tx/',
};

export default function CCTPTransferDetailsPage() {
  const params = useParams();
  const transferId = params.id as string;

  const { data: transfer, isLoading } = useQuery({
    queryKey: ['cctp-transfer', transferId],
    queryFn: () => circleApi.getCCTPTransferById(transferId),
    enabled: !!transferId,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Transfer Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The CCTP transfer you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/dashboard/circle-wallets/cctp-transfers">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to CCTP Transfers
          </Button>
        </Link>
      </div>
    );
  }

  const burnExplorerUrl = transfer.burnTransactionHash
    ? `${BLOCKCHAIN_EXPLORERS[transfer.sourceChain] || ''}${transfer.burnTransactionHash}`
    : null;
  const mintExplorerUrl = transfer.mintTransactionHash
    ? `${BLOCKCHAIN_EXPLORERS[transfer.destinationChain] || ''}${transfer.mintTransactionHash}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/circle-wallets/cctp-transfers">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">CCTP Transfer Details</h2>
            <p className="text-muted-foreground">Cross-Chain Transfer Protocol</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {STATE_ICONS[transfer.state]}
          <Badge className={STATE_COLORS[transfer.state]}>{transfer.state}</Badge>
        </div>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-100">
                <ArrowRightLeft className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  <span className="text-purple-600">${parseFloat(transfer.amount).toFixed(2)}</span>
                  <span className="text-muted-foreground text-lg ml-2">USDC</span>
                </CardTitle>
                <CardDescription>
                  {transfer.sourceChain} → {transfer.destinationChain}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transfer Reference */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Transfer Reference</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm bg-muted px-3 py-2 rounded flex-1">
                {transfer.reference}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(transfer.reference || '', 'Reference')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chains */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Source Chain</label>
              <div className="mt-1">
                <Badge variant="outline" className="text-sm">
                  {transfer.sourceChain}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Destination Chain</label>
              <div className="mt-1">
                <Badge variant="outline" className="text-sm">
                  {transfer.destinationChain}
                </Badge>
              </div>
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Destination Address</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm bg-muted px-3 py-2 rounded flex-1 truncate">
                {transfer.destinationAddress}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(transfer.destinationAddress, 'Destination address')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Transfer Type */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Transfer Type</label>
            <div className="text-sm mt-1">
              <Badge variant="outline">{transfer.transferType}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Hashes */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Burn Transaction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Burn Transaction</CardTitle>
            <CardDescription>Source chain transaction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {transfer.burnTransactionHash ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Transaction Hash
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {transfer.burnTransactionHash}
                    </code>
                    {burnExplorerUrl && (
                      <a href={burnExplorerUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-7 w-7">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
                {transfer.burnConfirmedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Confirmed At
                    </label>
                    <div className="text-sm mt-1">{formatDate(transfer.burnConfirmedAt)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Pending...</div>
            )}
          </CardContent>
        </Card>

        {/* Mint Transaction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mint Transaction</CardTitle>
            <CardDescription>Destination chain transaction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {transfer.mintTransactionHash ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Transaction Hash
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {transfer.mintTransactionHash}
                    </code>
                    {mintExplorerUrl && (
                      <a href={mintExplorerUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-7 w-7">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
                {transfer.mintConfirmedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Confirmed At
                    </label>
                    <div className="text-sm mt-1">{formatDate(transfer.mintConfirmedAt)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Pending...</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attestation */}
      {transfer.attestationHash && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attestation</CardTitle>
            <CardDescription>Circle attestation service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Attestation Hash</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-3 py-2 rounded flex-1 truncate">
                  {transfer.attestationHash}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(transfer.attestationHash!, 'Attestation hash')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {transfer.attestationReceivedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Received At</label>
                <div className="text-sm mt-1">{formatDate(transfer.attestationReceivedAt)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timestamps & User Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Initiated At</label>
              <div className="text-sm mt-1">{formatDate(transfer.initiatedAt)}</div>
            </div>
            {transfer.completedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Completed At</label>
                <div className="text-sm mt-1">{formatDate(transfer.completedAt)}</div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <div className="text-sm mt-1">{formatDate(transfer.updatedAt)}</div>
            </div>
          </CardContent>
        </Card>

        {/* User Info */}
        {transfer.user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="text-sm mt-1">
                  {transfer.user.firstName} {transfer.user.lastName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="text-sm mt-1">{transfer.user.email}</div>
              </div>
              <Link href={`/dashboard/users/${transfer.userId}`}>
                <Button variant="outline" className="w-full mt-2">
                  View User Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error Info */}
      {transfer.errorMessage && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-700">{transfer.errorMessage}</div>
            {transfer.errorCode && (
              <div className="text-xs text-red-600 mt-2">Code: {transfer.errorCode}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
