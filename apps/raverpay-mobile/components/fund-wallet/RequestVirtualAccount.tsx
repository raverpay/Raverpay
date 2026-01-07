// components/fund-wallet/RequestVirtualAccount.tsx
import { Button, Card, Text } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

interface RequestVirtualAccountProps {
  onRequestAccount: () => void;
}

export function RequestVirtualAccount({
  onRequestAccount,
}: RequestVirtualAccountProps) {
  return (
    <Card variant="elevated" className="p-6 items-center">
      <View className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mb-4">
        <Ionicons name="card-outline" size={25} color="#5B55F6" />
      </View>
      <Text variant="h3" className="mb-2">
        Get your virtual account
      </Text>
      <Text variant="body" color="secondary" align="center" className="mb-6">
        Fund your wallet instantly with a dedicated bank account number
      </Text>
      <Button variant="primary" onPress={onRequestAccount}>
        Request
      </Button>
    </Card>
  );
}
