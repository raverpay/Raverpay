// components/fund-wallet/VirtualAccountLoading.tsx
import { Card, Text } from '@/src/components/ui';
import { ActivityIndicator } from 'react-native';

export function VirtualAccountLoading() {
  return (
    <Card variant="elevated" className="p-6 items-center">
      <ActivityIndicator size="large" color="#5B55F6" />
      <Text variant="body" color="secondary" className="mt-4">
        Loading account details...
      </Text>
    </Card>
  );
}
