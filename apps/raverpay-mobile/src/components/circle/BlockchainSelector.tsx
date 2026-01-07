// src/components/circle/BlockchainSelector.tsx
import { Card, Text } from "@/src/components/ui";
import {
  ChainMetadata,
  CircleBlockchain,
  CircleWallet,
} from "@/src/types/circle.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";

// Support both old (chains) and new (wallets) API
interface BlockchainSelectorPropsWithWallets {
  wallets: CircleWallet[];
  selectedWalletId?: string;
  onSelect: (wallet: CircleWallet) => void;
  label?: string;
  showTestnets?: boolean;
  chains?: never;
  selectedChain?: never;
}

interface BlockchainSelectorPropsWithChains {
  chains: CircleBlockchain[] | ChainMetadata[];
  selectedChain?: CircleBlockchain;
  onSelect: (chain: CircleBlockchain) => void;
  label?: string;
  showTestnets?: boolean;
  wallets?: never;
  selectedWalletId?: never;
}

type BlockchainSelectorProps =
  | BlockchainSelectorPropsWithWallets
  | BlockchainSelectorPropsWithChains;

const BLOCKCHAIN_INFO: Record<
  CircleBlockchain,
  {
    name: string;
    shortName: string;
    color: string;
    icon: string;
    isTestnet: boolean;
  }
> = {
  ETH: {
    name: "Ethereum",
    shortName: "ETH",
    color: "#627EEA",
    icon: "Ξ",
    isTestnet: false,
  },
  "ETH-SEPOLIA": {
    name: "Ethereum Sepolia",
    shortName: "ETH",
    color: "#627EEA",
    icon: "Ξ",
    isTestnet: true,
  },
  MATIC: {
    name: "Polygon",
    shortName: "MATIC",
    color: "#8247E5",
    icon: "⬣",
    isTestnet: false,
  },
  "MATIC-AMOY": {
    name: "Polygon Amoy",
    shortName: "MATIC",
    color: "#8247E5",
    icon: "⬣",
    isTestnet: true,
  },
  ARB: {
    name: "Arbitrum",
    shortName: "ARB",
    color: "#28A0F0",
    icon: "A",
    isTestnet: false,
  },
  "ARB-SEPOLIA": {
    name: "Arbitrum Sepolia",
    shortName: "ARB",
    color: "#28A0F0",
    icon: "A",
    isTestnet: true,
  },
  SOL: {
    name: "Solana",
    shortName: "SOL",
    color: "#9945FF",
    icon: "◎",
    isTestnet: false,
  },
  "SOL-DEVNET": {
    name: "Solana Devnet",
    shortName: "SOL",
    color: "#9945FF",
    icon: "◎",
    isTestnet: true,
  },
  AVAX: {
    name: "Avalanche",
    shortName: "AVAX",
    color: "#E84142",
    icon: "🔺",
    isTestnet: false,
  },
  "AVAX-FUJI": {
    name: "Avalanche Fuji",
    shortName: "AVAX",
    color: "#E84142",
    icon: "🔺",
    isTestnet: true,
  },
  BASE: {
    name: "Base",
    shortName: "BASE",
    color: "#0052FF",
    icon: "🔵",
    isTestnet: false,
  },
  "BASE-SEPOLIA": {
    name: "Base Sepolia",
    shortName: "BASE",
    color: "#0052FF",
    icon: "🔵",
    isTestnet: true,
  },
  OP: {
    name: "Optimism",
    shortName: "OP",
    color: "#FF0420",
    icon: "🔴",
    isTestnet: false,
  },
  "OP-SEPOLIA": {
    name: "Optimism Sepolia",
    shortName: "OP",
    color: "#FF0420",
    icon: "🔴",
    isTestnet: true,
  },
};

export const BlockchainSelector: React.FC<BlockchainSelectorProps> = (
  props
) => {
  const { label = "Select Network", showTestnets = true } = props;

  // Check if we're using the new wallets API or old chains API
  const isWalletsMode = "wallets" in props && props.wallets !== undefined;

  if (isWalletsMode) {
    // New wallets-based API
    const { wallets, selectedWalletId, onSelect } = props;
    const filteredWallets = showTestnets
      ? wallets
      : wallets.filter(
          (wallet) => !BLOCKCHAIN_INFO[wallet.blockchain]?.isTestnet
        );

    return (
      <View>
        {label && (
          <Text variant="bodyMedium" weight="semibold" className="mb-2">
            {label}
          </Text>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-2"
        >
          {filteredWallets.map((wallet) => {
            const info = BLOCKCHAIN_INFO[wallet.blockchain] || {
              name: wallet.blockchain,
              shortName: wallet.blockchain,
              color: "#666",
              icon: "?",
              isTestnet: false,
            };
            const isSelected = selectedWalletId === wallet.id;

            // Determine wallet type label
            const walletTypeLabel =
              wallet.custodyType === "DEVELOPER"
                ? "Custodial"
                : "Non-Custodial";
            const walletTypeColor =
              wallet.custodyType === "DEVELOPER" ? "#10B981" : "#8B5CF6";

            return (
              <TouchableOpacity
                key={wallet.id}
                onPress={() => onSelect(wallet)}
                className="px-2"
              >
                <Card
                  variant={isSelected ? "elevated" : "outlined"}
                  className={`p-3 min-w-[100px] ${isSelected ? "border-2 border-[#2775CA]" : ""}`}
                >
                  <View className="items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mb-2"
                      style={{ backgroundColor: info.color }}
                    >
                      <Text variant="h5" color="inverse">
                        {info.icon}
                      </Text>
                    </View>
                    <Text
                      variant="caption"
                      weight={isSelected ? "bold" : "medium"}
                      align="center"
                      numberOfLines={1}
                    >
                      {info.shortName}
                    </Text>
                    {info.isTestnet && (
                      <Text
                        variant="caption"
                        color="tertiary"
                        className="text-[10px]"
                      >
                        Testnet
                      </Text>
                    )}
                    {/* Wallet Type Tag */}
                    <View
                      className="mt-1 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${walletTypeColor}20` }}
                    >
                      <Text
                        variant="caption"
                        className="text-[9px] font-semibold"
                        style={{ color: walletTypeColor }}
                      >
                        {walletTypeLabel}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#2775CA"
                        style={{ position: "absolute", top: -4, right: -4 }}
                      />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  } else {
    // Old chains-based API (backward compatibility)
    const { chains, selectedChain, onSelect } = props;
    const filteredChains = showTestnets
      ? chains
      : chains.filter((chain) => {
          if (typeof chain === "string") {
            return !BLOCKCHAIN_INFO[chain]?.isTestnet;
          }
          return !chain.isTestnet;
        });

    return (
      <View>
        {label && (
          <Text variant="bodyMedium" weight="semibold" className="mb-2">
            {label}
          </Text>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-2"
        >
          {filteredChains.map((chainItem) => {
            const chain =
              typeof chainItem === "string" ? chainItem : chainItem.blockchain;
            const metadata =
              typeof chainItem === "string" ? undefined : chainItem;

            const info = BLOCKCHAIN_INFO[chain] || {
              name: chain,
              shortName: chain,
              color: "#666",
              icon: "?",
              isTestnet: false,
            };
            const isSelected = selectedChain === chain;

            return (
              <TouchableOpacity
                key={chain}
                onPress={() => onSelect(chain)}
                className="px-2"
              >
                <Card
                  variant={isSelected ? "elevated" : "outlined"}
                  className={`p-3 min-w-[110px] ${isSelected ? "border-2 border-[#2775CA]" : ""}`}
                >
                  <View className="items-center">
                    {/* Recommended Badge */}
                    {/* {metadata?.isRecommended && (
                      <View className="absolute -top-6 bg-yellow-100 px-2 py-0.5 rounded-full mb-1">
                        <Text
                          variant="caption"
                          className="text-[9px] font-bold text-yellow-700"
                        >
                          Recommended
                        </Text>
                      </View>
                    )} */}

                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mb-2"
                      style={{ backgroundColor: info.color }}
                    >
                      <Text variant="h5" color="inverse">
                        {info.icon}
                      </Text>
                    </View>
                    <Text
                      variant="caption"
                      weight={isSelected ? "bold" : "medium"}
                      align="center"
                      numberOfLines={1}
                    >
                      {metadata?.name || info.shortName}
                    </Text>

                    {/* Fee Label Badge */}
                    {metadata?.feeLabel && (
                      <View className="mt-1 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded-full">
                        <Text
                          variant="caption"
                          className="text-[9px] font-bold text-green-700"
                        >
                          ⚡ Free
                        </Text>
                      </View>
                    )}

                    {info.isTestnet && !metadata?.feeLabel && (
                      <Text
                        variant="caption"
                        color="tertiary"
                        className="text-[10px] mt-1"
                      >
                        Testnet
                      </Text>
                    )}

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#2775CA"
                        style={{ position: "absolute", top: -4, right: -4 }}
                      />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }
};
