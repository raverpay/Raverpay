import { formatRelativeTime } from "@/src/lib/utils/formatters";
import { Message, QuickReply, SenderType } from "@/src/types/support";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

import { Text } from "@/src/components/ui/Text";
interface MessageBubbleProps {
  message: Message;
  onQuickReplyPress?: (reply: QuickReply) => void;
  onActionPress?: (action: string, data?: any) => void;
  isProcessing?: boolean;
}

export function MessageBubble({
  message,
  onQuickReplyPress,
  onActionPress,
  isProcessing = false,
}: MessageBubbleProps) {
  const isUser = message.senderType === SenderType.USER;
  const isBot = message.senderType === SenderType.BOT;
  const isAgent = message.senderType === SenderType.AGENT;
  const isSystem = message.senderType === SenderType.SYSTEM;

  const getSenderLabel = () => {
    if (isUser) return null;
    if (isBot) return "RaverPay Bot";
    if (isAgent) return "Support Agent";
    if (isSystem) return "System";
    return null;
  };

  const getBubbleStyle = () => {
    if (isUser) {
      return "bg-[#5B55F6] ml-12";
    }
    return "bg-gray-100 dark:bg-gray-800 mr-12";
  };

  return (
    <View className={`mb-4 ${isUser ? "items-end" : "items-start"}`}>
      {/* Sender label */}
      {getSenderLabel() && (
        <Text variant="caption" color="secondary" className="mb-1 px-1">
          {getSenderLabel()}
        </Text>
      )}

      {/* Message bubble */}
      <View className={`rounded-2xl px-4 py-3 max-w-[85%] ${getBubbleStyle()}`}>
        <Text
          variant="body"
          className={`leading-6 ${isUser ? "text-white" : "text-gray-900 dark:text-gray-100"}`}
        >
          {message.content}
        </Text>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <View className="mt-2 flex-row flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <View
                key={index}
                className="bg-white/20 dark:bg-gray-700/50 rounded-lg px-3 py-2 flex-row items-center"
              >
                <Ionicons
                  name="document-attach"
                  size={16}
                  color={isUser ? "#fff" : "#9CA3AF"}
                />
                <Text
                  variant="body"
                  className={`ml-1 ${isUser ? "text-white" : "text-gray-600 dark:text-gray-300"}`}
                >
                  Attachment {index + 1}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Transaction Card */}
        {message.metadata?.transactionCard && (
          <View className="mt-3 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-[#5B55F6]/10 items-center justify-center">
                <Ionicons name="receipt-outline" size={16} color="#5B55F6" />
              </View>
              <Text
                variant="body"
                weight="semibold"
                color="primary"
                className="ml-2"
              >
                {message.metadata.transactionCard.transactionType}
              </Text>
            </View>
            <View className="space-y-1">
              {message.metadata.transactionCard.amount && (
                <Text variant="body" color="secondary">
                  Amount: {"\u20A6"}
                  {message.metadata.transactionCard.amount.toLocaleString()}
                </Text>
              )}
              {message.metadata.transactionCard.status && (
                <Text variant="body" color="secondary">
                  Status: {message.metadata.transactionCard.status}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Timestamp */}
        <Text
          variant={`${isUser ? "caption" : "body"}`}
          className={`mt-2 ${isUser ? "text-white" : "text-gray-500 dark:text-gray-400"}`}
        >
          {formatRelativeTime(message.createdAt)}
        </Text>
      </View>

      {/* Quick replies */}
      {message.metadata?.quickReplies &&
        message.metadata.quickReplies.length > 0 && (
          <View className="mt-2 flex-row flex-wrap gap-2 max-w-[85%]">
            {isProcessing ? (
              <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2">
                <ActivityIndicator size="small" color="#5B55F6" />
                <Text variant="body" color="secondary" className="ml-2">
                  Processing...
                </Text>
              </View>
            ) : (
              message.metadata.quickReplies.map((reply, index) => (
                <TouchableOpacity
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-[#5B55F6] rounded-full px-4 py-2"
                  onPress={() => onQuickReplyPress?.(reply)}
                  disabled={isProcessing}
                >
                  <Text variant="body" color="primary" weight="semibold">
                    {reply.label}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

      {/* Action buttons */}
      {message.metadata?.actions && message.metadata.actions.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-2 max-w-[85%]">
          {message.metadata.actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              className={`rounded-full px-4 py-2 ${isProcessing ? "bg-gray-300 dark:bg-gray-600" : "bg-[#5B55F6]"}`}
              onPress={() => onActionPress?.(action.action, action.data)}
              disabled={isProcessing}
            >
              <Text variant="button" weight="semibold" className="text-white">
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
