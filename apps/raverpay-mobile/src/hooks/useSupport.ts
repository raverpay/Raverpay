import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/store/auth.store';
import { supportService, helpService } from '@/src/services/support.service';
import {
  CreateConversationRequest,
  SendMessageRequest,
  RateConversationRequest,
  ConversationStatus,
} from '@/src/types/support';

// Query keys
export const supportKeys = {
  all: ['support'] as const,
  conversations: () => [...supportKeys.all, 'conversations'] as const,
  conversationsList: (params?: any) => [...supportKeys.conversations(), 'list', params] as const,
  conversationDetail: (id: string) => [...supportKeys.conversations(), 'detail', id] as const,
  conversationMessages: (id: string) => [...supportKeys.conversations(), 'messages', id] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
  ticketsList: (params?: any) => [...supportKeys.tickets(), 'list', params] as const,
  ticketDetail: (id: string) => [...supportKeys.tickets(), 'detail', id] as const,
  unreadCount: () => [...supportKeys.all, 'unreadCount'] as const,
};

export const helpKeys = {
  all: ['help'] as const,
  collections: () => [...helpKeys.all, 'collections'] as const,
  collectionDetail: (id: string) => [...helpKeys.collections(), 'detail', id] as const,
  articles: () => [...helpKeys.all, 'articles'] as const,
  articleDetail: (id: string) => [...helpKeys.articles(), 'detail', id] as const,
  articleBySlug: (slug: string) => [...helpKeys.articles(), 'slug', slug] as const,
  search: (query: string) => [...helpKeys.articles(), 'search', query] as const,
  popular: () => [...helpKeys.articles(), 'popular'] as const,
};

// ============================================
// CONVERSATION HOOKS
// ============================================

export function useConversations(params?: {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
}) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: supportKeys.conversationsList(params),
    queryFn: () => supportService.getConversations(params),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useConversation(conversationId: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: supportKeys.conversationDetail(conversationId),
    queryFn: () => supportService.getConversationById(conversationId),
    enabled: isAuthenticated && !!conversationId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useConversationMessages(conversationId: string) {
  const { isAuthenticated } = useAuthStore();

  return useInfiniteQuery({
    queryKey: supportKeys.conversationMessages(conversationId),
    queryFn: ({ pageParam = 1 }) =>
      supportService.getConversationMessages(conversationId, {
        page: pageParam,
        limit: 50,
      }),
    enabled: isAuthenticated && !!conversationId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    staleTime: 0, // Always fetch fresh messages
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConversationRequest) => supportService.createConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: supportKeys.unreadCount() });
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageRequest) => supportService.sendMessage(conversationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supportKeys.conversationMessages(conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: supportKeys.conversationDetail(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: supportKeys.conversations() });
    },
  });
}

export function useMarkMessagesAsRead(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => supportService.markMessagesAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supportKeys.conversationDetail(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: supportKeys.unreadCount() });
    },
  });
}

export function useRateConversation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RateConversationRequest) =>
      supportService.rateConversation(conversationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supportKeys.conversationDetail(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: supportKeys.conversations() });
    },
  });
}

export function useCloseConversation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => supportService.closeConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supportKeys.conversationDetail(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: supportKeys.conversations() });
    },
  });
}

// ============================================
// TICKET HOOKS
// ============================================

export function useTickets(params?: { page?: number; limit?: number; status?: string }) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: supportKeys.ticketsList(params),
    queryFn: () => supportService.getTickets(params),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useTicket(ticketId: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: supportKeys.ticketDetail(ticketId),
    queryFn: () => supportService.getTicketById(ticketId),
    enabled: isAuthenticated && !!ticketId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

// ============================================
// UNREAD COUNT HOOK
// ============================================

export function useUnreadCount() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: supportKeys.unreadCount(),
    queryFn: () => supportService.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// ============================================
// HELP CENTER HOOKS
// ============================================

export function useHelpCollections() {
  return useQuery({
    queryKey: helpKeys.collections(),
    queryFn: () => helpService.getCollections(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useHelpCollection(collectionId: string) {
  return useQuery({
    queryKey: helpKeys.collectionDetail(collectionId),
    queryFn: () => helpService.getCollectionById(collectionId),
    enabled: !!collectionId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useHelpArticle(articleId: string) {
  return useQuery({
    queryKey: helpKeys.articleDetail(articleId),
    queryFn: () => helpService.getArticleById(articleId),
    enabled: !!articleId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useHelpArticleBySlug(slug: string) {
  return useQuery({
    queryKey: helpKeys.articleBySlug(slug),
    queryFn: () => helpService.getArticleBySlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useSearchHelp(query: string) {
  return useQuery({
    queryKey: helpKeys.search(query),
    queryFn: () => helpService.searchArticles(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePopularArticles() {
  return useQuery({
    queryKey: helpKeys.popular(),
    queryFn: () => helpService.getPopularArticles(5),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useMarkArticleHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, helpful }: { articleId: string; helpful: boolean }) =>
      helpService.markArticleHelpful(articleId, helpful),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: helpKeys.articleDetail(variables.articleId),
      });
    },
  });
}
