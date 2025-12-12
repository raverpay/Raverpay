'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Send, ArrowLeft, MoreVertical, User, X, MessageSquare, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { supportApi } from '@/lib/api/support';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime, getApiErrorMessage, cn } from '@/lib/utils';
import { ConversationStatus, SenderType, Message, CannedResponse } from '@/types/support';

function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.senderType === SenderType.AGENT || message.senderType === SenderType.BOT;
  const isSystem = message.senderType === SenderType.SYSTEM;

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex mb-4', isAgent ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isAgent
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted rounded-bl-none',
        )}
      >
        {message.senderType === SenderType.BOT && (
          <div className="text-xs opacity-70 mb-1">Bot</div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div
          className={cn(
            'text-xs mt-1',
            isAgent ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {formatRelativeTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [showCannedResponses, setShowCannedResponses] = useState(false);

  // Get current user from auth store
  const { user: currentUser } = useAuthStore();

  // Queries
  const { data: conversation, isLoading: loadingConversation } = useQuery({
    queryKey: ['conversation', resolvedParams.id],
    queryFn: () => supportApi.getConversation(resolvedParams.id),
  });

  const {
    data: messagesData,
    isLoading: loadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['conversation-messages', resolvedParams.id],
    queryFn: ({ pageParam = 1 }) =>
      supportApi.getConversationMessages(resolvedParams.id, {
        page: pageParam,
        limit: 50,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    initialPageParam: 1,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const { data: cannedResponses } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: supportApi.getCannedResponses,
  });

  const { data: agents } = useQuery({
    queryKey: ['support-agents'],
    queryFn: supportApi.getAvailableAgents,
    enabled: showTransferDialog,
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => supportApi.sendMessage(resolvedParams.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversation-messages', resolvedParams.id],
      });
      setMessageText('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to send message', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const endConversationMutation = useMutation({
    mutationFn: () => supportApi.endConversation(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', resolvedParams.id] });
      toast.success('Conversation ended');
    },
    onError: (error: unknown) => {
      toast.error('Failed to end conversation', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (agentId: string) => supportApi.transferConversation(resolvedParams.id, agentId),
    onSuccess: () => {
      setShowTransferDialog(false);
      toast.success('Conversation transferred');
      router.push('/dashboard/support/conversations');
    },
    onError: (error: unknown) => {
      toast.error('Failed to transfer conversation', {
        description: getApiErrorMessage(error),
      });
    },
  });

  // Flatten messages and reverse for chronological order
  const messages: Message[] = messagesData?.pages.flatMap((page) => page.data).reverse() || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const handleCannedResponse = (response: CannedResponse) => {
    setMessageText(response.content);
    setShowCannedResponses(false);
  };

  const getStatusBadge = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.BOT_HANDLING:
        return { label: 'Bot Handling', variant: 'secondary' as const };
      case ConversationStatus.AWAITING_AGENT:
        return { label: 'Waiting', variant: 'warning' as const };
      case ConversationStatus.AGENT_ASSIGNED:
        return { label: 'Active', variant: 'success' as const };
      case ConversationStatus.AWAITING_RATING:
        return { label: 'Awaiting Rating', variant: 'info' as const };
      case ConversationStatus.ENDED:
        return { label: 'Ended', variant: 'secondary' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  // Check if conversation is active and if current user can send messages
  const assignedAgentId = conversation?.ticket?.assignedAgentId;
  const isConversationActive =
    conversation?.status === ConversationStatus.AGENT_ASSIGNED ||
    conversation?.status === ConversationStatus.AWAITING_AGENT ||
    conversation?.status === ConversationStatus.BOT_HANDLING;
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAssignedAgent = assignedAgentId === currentUser?.id;
  const isUnassigned = !assignedAgentId;

  // Can send if: super admin, assigned agent, or conversation is unassigned
  const canSendMessages = isConversationActive && (isSuperAdmin || isAssignedAgent || isUnassigned);

  // Get the name of the assigned agent for display
  const assignedAgentName = conversation?.ticket?.assignedAgent
    ? `${conversation.ticket.assignedAgent.firstName} ${conversation.ticket.assignedAgent.lastName}`
    : null;

  if (loadingConversation) {
    return (
      <div className="flex items-center justify-center h-96">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const statusBadge = conversation
    ? getStatusBadge(conversation.status)
    : { label: 'Unknown', variant: 'secondary' as const };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">
                {conversation?.user?.firstName} {conversation?.user?.lastName}
              </div>
              <div className="text-sm text-muted-foreground">{conversation?.user?.email}</div>
            </div>
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {conversation?.ticket && (
            <Badge variant="outline">#{conversation.ticket.ticketNumber}</Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {conversation?.status !== ConversationStatus.ENDED &&
                conversation?.status !== ConversationStatus.AWAITING_RATING && (
                  <>
                    <DropdownMenuItem onClick={() => setShowTransferDialog(true)}>
                      Transfer to Agent
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => endConversationMutation.mutate()}
                      disabled={endConversationMutation.isPending}
                      className="text-destructive"
                    >
                      End Conversation
                    </DropdownMenuItem>
                  </>
                )}
              {(conversation?.status === ConversationStatus.ENDED ||
                conversation?.status === ConversationStatus.AWAITING_RATING) && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  Conversation has ended
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {loadingMessages ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-3/4" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4" />
                <p>No messages yet</p>
              </div>
            ) : (
              <>
                {hasNextPage && (
                  <div className="flex justify-center mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
                    </Button>
                  </div>
                )}
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          {canSendMessages ? (
            <div className="p-4 border-t">
              {isUnassigned && (
                <Alert className="mb-3">
                  <AlertDescription>
                    This conversation is unassigned. Sending a message will automatically assign it
                    to you.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCannedResponses(!showCannedResponses)}
                >
                  <FileText className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>

              {/* Canned Responses */}
              {showCannedResponses && cannedResponses && (
                <div className="mt-4 border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Canned Responses</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCannedResponses(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {cannedResponses.map((response) => (
                      <button
                        key={response.id}
                        onClick={() => handleCannedResponse(response)}
                        className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                      >
                        <div className="font-medium text-sm">{response.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {response.content}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : isConversationActive && assignedAgentName ? (
            <div className="p-4 border-t bg-muted">
              <Alert variant="destructive">
                <AlertDescription>
                  This conversation is assigned to <strong>{assignedAgentName}</strong>. You cannot
                  send messages.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="p-4 border-t bg-muted text-center text-muted-foreground">
              This conversation is not active
            </div>
          )}
        </div>

        {/* Sidebar - User Info */}
        <div className="w-80 border-l p-4 overflow-y-auto hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="font-medium">
                  {conversation?.user?.firstName} {conversation?.user?.lastName}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="font-medium">{conversation?.user?.email}</div>
              </div>
              {conversation?.user?.phone && (
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="font-medium">{conversation?.user?.phone}</div>
                </div>
              )}
              {conversation?.category && (
                <div>
                  <div className="text-xs text-muted-foreground">Category</div>
                  <div className="font-medium">{conversation.category}</div>
                </div>
              )}
              {conversation?.transactionContext && (
                <div>
                  <div className="text-xs text-muted-foreground">Transaction Context</div>
                  <div className="text-sm bg-muted p-2 rounded mt-1">
                    <div>Type: {conversation.transactionContext.transactionType}</div>
                    {conversation.transactionContext.amount && (
                      <div>
                        Amount: {'\u20A6'}
                        {conversation.transactionContext.amount.toLocaleString()}
                      </div>
                    )}
                    {conversation.transactionContext.reference && (
                      <div>Ref: {conversation.transactionContext.reference}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Conversation</DialogTitle>
            <DialogDescription>Select an agent to transfer this conversation to.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName} ({agent.activeChats} active chats)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => transferMutation.mutate(selectedAgent)}
              disabled={!selectedAgent || transferMutation.isPending}
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
