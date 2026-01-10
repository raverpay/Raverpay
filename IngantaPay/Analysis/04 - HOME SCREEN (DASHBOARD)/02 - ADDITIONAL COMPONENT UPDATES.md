ADDITIONAL COMPONENT UPDATES:
TransactionItem Component Update:

Update src/components/wallet/TransactionItem.tsx to match the dark theme design:

CHANGES:

1. Container Background:
   - Change from transparent/white to dark gray (#2A2A2A)
   - Add border radius: 16px
   - Add padding: 16px
   - Remove border-bottom dividers

2. Icon Circle:
   - Background: Use transaction-type specific colors
     - Outgoing (debit): Blue (#1E3A8A)
     - Incoming (credit): Green (#059669)
   - Size: 48x48px
   - Icon: Directional arrow
     - Outgoing: arrow-up-right or arrow-forward rotated -45deg
     - Incoming: arrow-down-left or arrow-back rotated 45deg

3. Text Colors:
   - Title: White (#FFFFFF)
   - Subtitle/Date: Gray (#9CA3AF)
   - Amount (credit): Green (#10B981)
   - Amount (debit): Red (#EF4444)

4. Layout:
   - Remove border-bottom
   - Add margin-bottom between items: 12px
   - Full rounded card for each transaction

Updated component structure:

```typescript
export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const isCredit = ['DEPOSIT', 'REFUND', 'GIFTCARD_SELL', 'CRYPTO_SELL'].includes(transaction.type);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/transaction-details/${transaction.id}`)}
      className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3"
    >
      {/* Icon Circle */}
      <View
        className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
          isCredit ? 'bg-[#059669]' : 'bg-[#1E3A8A]'
        }`}
      >
        <Ionicons
          name="arrow-forward"
          size={20}
          color="white"
          style={{
            transform: [{ rotate: isCredit ? '135deg' : '-45deg' }]
          }}
        />
      </View>

      {/* Transaction Details */}
      <View className="flex-1">
        <Text variant="bodyMedium" weight="semibold" className="text-white">
          {transaction.description}
        </Text>
        <Text variant="caption" className="text-gray-400 mt-1">
          {formatRelativeTime(transaction.createdAt)}
        </Text>
      </View>

      {/* Amount */}
      <Text
        variant="bodyMedium"
        weight="bold"
        className={isCredit ? 'text-green-500' : 'text-red-500'}
      >
        {isCredit ? '+' : '-'}₦ {formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
};
```
