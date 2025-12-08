import { Badge } from './badge';
import { UserStatus, TransactionStatus, KYCTier } from '@/types';

interface StatusBadgeProps {
  status: UserStatus | TransactionStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case 'ACTIVE':
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
      case 'PENDING_VERIFICATION':
      case 'PROCESSING':
        return 'warning';
      case 'FAILED':
      case 'BANNED':
      case 'SUSPENDED':
        return 'destructive';
      case 'REVERSED':
      case 'DEACTIVATED':
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return <Badge variant={getVariant()}>{status?.replace(/_/g, ' ')}</Badge>;
}

interface KYCBadgeProps {
  tier: KYCTier;
}

export function KYCBadge({ tier }: KYCBadgeProps) {
  const getVariant = () => {
    switch (tier) {
      case 'TIER_3':
        return 'success';
      case 'TIER_2':
        return 'info';
      case 'TIER_1':
        return 'warning';
      case 'TIER_0':
      default:
        return 'secondary';
    }
  };

  return <Badge variant={getVariant()}>{tier}</Badge>;
}

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const getVariant = () => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'ADMIN':
        return 'default';
      case 'SUPPORT':
        return 'info';
      case 'USER':
      default:
        return 'secondary';
    }
  };

  return <Badge variant={getVariant()}>{role?.replace(/_/g, ' ')}</Badge>;
}
