import { MessageBubble } from "@/src/components/support/MessageBubble";
import { RatingModal } from "@/src/components/support/RatingModal";
import { ScreenHeader, Text } from "@/src/components/ui";
import {
  supportKeys,
  useConversation,
  useConversationMessages,
  useMarkMessagesAsRead,
  useRateConversation,
  useSendMessage,
} from "@/src/hooks/useSupport";
import { useTheme } from "@/src/hooks/useTheme";
import { toast } from "@/src/lib/utils/toast";
import { socketService } from "@/src/services/socket.service";
import { ConversationStatus, Message, QuickReply } from "@/src/types/support";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatScreen() {
  const { isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [processingQuickReply, setProcessingQuickReply] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Queries
  const { data: conversation, isPending: loadingConversation } =
    useConversation(id);
  const {
    data: messagesData,
    isPending: loadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(id);

  // Mutations
  const sendMessage = useSendMessage(id);
  const markAsRead = useMarkMessagesAsRead(id);
  const rateConversation = useRateConversation(id);

  // Flatten messages from infinite query and merge with local messages
  // const serverMessages: Message[] =
  //   messagesData?.pages.flatMap((page) => page.data) || [];

  // Merge server messages with locally received socket messages
  const messages = useCallback(() => {
    const server: Message[] =
      messagesData?.pages.flatMap((page) => page.data) || [];
    const allMessages = [...server];
    // Add local messages that aren't in server messages yet
    localMessages.forEach((localMsg) => {
      if (!allMessages.find((m) => m.id === localMsg.id)) {
        allMessages.push(localMsg);
      }
    });
    // Sort by createdAt
    return allMessages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messagesData, localMessages])();

  // WebSocket connection and event handling
  useEffect(() => {
    if (!id) return;

    // Connect to socket if not already connected
    socketService.connect();

    // Join the conversation room
    socketService.joinConversation(id);

    // Listen for new messages
    const unsubscribeMessages = socketService.onMessage(id, (message) => {
      // console.log("[Chat] New message received via WebSocket:", message.id);
      setLocalMessages((prev) => {
        // Avoid duplicates
        if (prev.find((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Scroll to bottom when new message arrives
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Invalidate queries to sync with server
      queryClient.invalidateQueries({
        queryKey: supportKeys.conversationMessages(id),
      });
    });

    // Listen for typing indicators
    const unsubscribeTyping = socketService.onTyping(id, (data) => {
      setIsAgentTyping(data.isTyping);
    });

    // Listen for conversation status updates (e.g., when agent ends conversation)
    const unsubscribeConversationUpdate = socketService.onConversationUpdate(
      id,
      (data) => {
        //  console.log("[Chat] Conversation status updated:", data.status);
        // Invalidate conversation query to get updated status
        queryClient.invalidateQueries({
          queryKey: supportKeys.conversationDetail(id),
        });
      }
    );

    // Cleanup on unmount
    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      unsubscribeConversationUpdate();
      socketService.leaveConversation(id);
    };
  }, [id, queryClient]);

  // No longer show modal automatically - we show inline rating UI instead
  // useEffect(() => {
  //   if (conversation?.status === ConversationStatus.AWAITING_RATING) {
  //     setShowRatingModal(true);
  //   }
  // }, [conversation?.status]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversation && conversation.unreadCount > 0) {
      markAsRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.unreadCount]);

  // Handle typing indicator
  const handleTextChange = (text: string) => {
    setMessageText(text);

    // Send typing indicator (debounced behavior could be added)
    if (text.length > 0) {
      socketService.sendTyping(id, true);
    } else {
      socketService.sendTyping(id, false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const text = messageText.trim();
    setMessageText("");

    // Stop typing indicator
    socketService.sendTyping(id, false);

    try {
      // Send via REST API only - WebSocket is used for receiving real-time updates
      // Sending via both causes duplicate messages
      await sendMessage.mutateAsync({ content: text });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch {
      toast.error("Failed to send message");
      setMessageText(text); // Restore message if failed
    }
  };

  const handleQuickReply = async (reply: QuickReply) => {
    setProcessingQuickReply(true);
    try {
      // Send the label (human-readable text) as the displayed message
      // but include the value in metadata for the bot to process
      await sendMessage.mutateAsync({
        content: reply.label,
        metadata: { quickReplyValue: reply.value },
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setProcessingQuickReply(false);
    }
  };

  const handleAction = async (action: string, data?: any) => {
    // Handle different actions
    let actionMessage = "";
    switch (action) {
      case "refund":
        actionMessage = "I would like to request a refund.";
        break;
      case "retry":
        actionMessage = "I would like to retry this transaction.";
        break;
      case "escalate":
        actionMessage = "I would like to speak to an agent.";
        break;
      default:
        // console.log("Unknown action:", action);
        return;
    }

    try {
      // Send via REST API only
      await sendMessage.mutateAsync({ content: actionMessage });
    } catch {
      toast.error("Failed to perform action");
    }
  };

  const handleRatingSubmit = async (rating: number, comment?: string) => {
    try {
      await rateConversation.mutateAsync({ rating, comment });
      setShowRatingModal(false);
      toast.success("Thank you for your feedback!");
      router.back();
    } catch {
      toast.error("Failed to submit rating");
    }
  };

  const handleInlineRating = async (rating: number) => {
    setSelectedRating(rating);
    try {
      await rateConversation.mutateAsync({ rating });
      toast.success("Thank you for your feedback!");
      // Invalidate to update conversation status
      queryClient.invalidateQueries({
        queryKey: supportKeys.conversationDetail(id),
      });
    } catch {
      toast.error("Failed to submit rating");
      setSelectedRating(null);
    }
  };

  const getStatusLabel = () => {
    if (isAgentTyping) {
      return "Agent is typing...";
    }
    switch (conversation?.status) {
      case ConversationStatus.BOT_HANDLING:
        return "Bot is helping you";
      case ConversationStatus.AWAITING_AGENT:
        return "Waiting for agent...";
      case ConversationStatus.AGENT_ASSIGNED:
        return "Agent connected";
      case ConversationStatus.AWAITING_RATING:
        return "Conversation resolved";
      case ConversationStatus.ENDED:
        return "Conversation ended";
      default:
        return "Support Chat";
    }
  };

  if (loadingConversation || loadingMessages) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#5B55F6" />
        <Text variant="body" color="secondary" className="mt-4">
          Loading conversation...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={0}
    >
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Header */}
        <ScreenHeader
          title="Support Chat"
          rightComponent={
            conversation?.ticket ? (
              <View className="bg-[#5B55F6]/10 dark:bg-[#5B55F6]/20 rounded-full px-3 py-1">
                <Text variant="caption" color="primary" weight="medium">
                  #{conversation.ticket.ticketNumber}
                </Text>
              </View>
            ) : undefined
          }
        />

        {/* Status Bar */}
        <View className="bg-white dark:bg-gray-800 px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center">
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                isAgentTyping
                  ? "bg-blue-500"
                  : conversation?.status === ConversationStatus.AGENT_ASSIGNED
                    ? "bg-green-500"
                    : conversation?.status === ConversationStatus.AWAITING_AGENT
                      ? "bg-yellow-500"
                      : "bg-gray-400"
              }`}
            />
            <Text variant="caption" color="secondary">
              {getStatusLabel()}
            </Text>
          </View>
        </View>

        {/* Messages */}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onQuickReplyPress={handleQuickReply}
              onActionPress={handleAction}
              isProcessing={processingQuickReply || sendMessage.isPending}
            />
          )}
          contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.1}
          ListHeaderComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#5B55F6" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <View className="w-16 h-16 rounded-full bg-[#5B55F6]/10 items-center justify-center mb-4">
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color="#5B55F6"
                />
              </View>
              <Text variant="body" color="secondary" className="text-center">
                Start by sending a message
              </Text>
            </View>
          }
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {/* Typing Indicator */}
        {isAgentTyping && (
          <View className="px-5 pb-2">
            <View className="flex-row items-center">
              <View className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-2">
                <View className="flex-row items-center space-x-1">
                  <View className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse" />
                  <View
                    className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse"
                    style={{ opacity: 0.7 }}
                  />
                  <View
                    className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse"
                    style={{ opacity: 0.5 }}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Input Area */}
        {conversation?.status === ConversationStatus.AWAITING_RATING ? (
          <View className="bg-white dark:bg-gray-800 px-5 py-6 border-t border-gray-200 dark:border-gray-700">
            <Text
              variant="body"
              weight="medium"
              color="primary"
              className="text-center mb-4"
            >
              How was your experience?
            </Text>
            <View className="flex-row justify-center items-center space-x-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  onPress={() => handleInlineRating(rating)}
                  disabled={
                    selectedRating !== null || rateConversation.isPending
                  }
                  className={`w-12 h-12 rounded-full items-center justify-center ${
                    selectedRating === rating
                      ? "bg-[#5B55F6]"
                      : selectedRating !== null
                        ? "bg-gray-100 dark:bg-gray-700"
                        : "bg-gray-100 dark:bg-gray-700"
                  }`}
                >
                  <Text variant="h3" weight="medium" color="primary">
                    {rating === 1
                      ? "😞"
                      : rating === 2
                        ? "😕"
                        : rating === 3
                          ? "😐"
                          : rating === 4
                            ? "😊"
                            : "😍"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {rateConversation.isPending && (
              <View className="mt-3 items-center">
                <ActivityIndicator size="small" color="#5B55F6" />
              </View>
            )}
            {selectedRating !== null && !rateConversation.isPending && (
              <Text
                variant="caption"
                color="secondary"
                className="text-center mt-3"
              >
                Thanks for your feedback!
              </Text>
            )}
          </View>
        ) : conversation?.status === ConversationStatus.ENDED ? (
          <View className="bg-gray-100 dark:bg-gray-800 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
            <Text variant="body" color="secondary" className="text-center">
              This conversation has ended
            </Text>
          </View>
        ) : (
          <View className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-row items-end">
              <TouchableOpacity className="w-10 h-10 items-center justify-center">
                <Ionicons
                  name="attach"
                  size={24}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>
              <View className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2 mx-2 max-h-32">
                <TextInput
                  value={messageText}
                  onChangeText={handleTextChange}
                  placeholder="Type a message..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  className="text-gray-900 dark:text-gray-100 text-base"
                  style={{ maxHeight: 100 }}
                />
              </View>
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sendMessage.isPending}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  messageText.trim()
                    ? "bg-[#5B55F6]"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                {sendMessage.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={messageText.trim() ? "white" : "#9CA3AF"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Rating Modal */}
        <RatingModal
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleRatingSubmit}
          isLoading={rateConversation.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
