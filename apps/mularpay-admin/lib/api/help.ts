import apiClient from '../api-client';
import { HelpCollection, HelpArticle, PaginatedResponse } from '@/types/support';

export interface GetArticlesParams {
  page?: number;
  limit?: number;
  collectionId?: string;
  search?: string;
  status?: 'DRAFT' | 'PUBLISHED';
}

export const helpApi = {
  // Collections
  getCollections: async (): Promise<HelpCollection[]> => {
    const response = await apiClient.get<HelpCollection[]>(
      '/admin/support/help/collections'
    );
    return response.data;
  },

  getCollection: async (id: string): Promise<HelpCollection> => {
    const response = await apiClient.get<HelpCollection>(
      `/admin/support/help/collections/${id}`
    );
    return response.data;
  },

  createCollection: async (data: {
    title: string;
    description?: string;
    icon?: string;
    order?: number;
  }): Promise<HelpCollection> => {
    const response = await apiClient.post<HelpCollection>(
      '/admin/support/help/collections',
      data
    );
    return response.data;
  },

  updateCollection: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      icon?: string;
      order?: number;
    }
  ): Promise<HelpCollection> => {
    const response = await apiClient.patch<HelpCollection>(
      `/admin/support/help/collections/${id}`,
      data
    );
    return response.data;
  },

  deleteCollection: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/support/help/collections/${id}`);
  },

  // Articles
  getArticles: async (
    params?: GetArticlesParams
  ): Promise<PaginatedResponse<HelpArticle>> => {
    const response = await apiClient.get<PaginatedResponse<HelpArticle>>(
      '/admin/support/help/articles',
      { params }
    );
    return response.data;
  },

  getArticle: async (id: string): Promise<HelpArticle> => {
    const response = await apiClient.get<HelpArticle>(
      `/admin/support/help/articles/${id}`
    );
    return response.data;
  },

  createArticle: async (data: {
    title: string;
    content: string;
    collectionId: string;
    status?: 'DRAFT' | 'PUBLISHED';
    order?: number;
    tags?: string[];
  }): Promise<HelpArticle> => {
    const response = await apiClient.post<HelpArticle>(
      '/admin/support/help/articles',
      data
    );
    return response.data;
  },

  updateArticle: async (
    id: string,
    data: {
      title?: string;
      content?: string;
      collectionId?: string;
      status?: 'DRAFT' | 'PUBLISHED';
      order?: number;
      tags?: string[];
    }
  ): Promise<HelpArticle> => {
    const response = await apiClient.patch<HelpArticle>(
      `/admin/support/help/articles/${id}`,
      data
    );
    return response.data;
  },

  deleteArticle: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/support/help/articles/${id}`);
  },

  publishArticle: async (id: string): Promise<HelpArticle> => {
    const response = await apiClient.post<HelpArticle>(
      `/admin/support/help/articles/${id}/publish`
    );
    return response.data;
  },

  unpublishArticle: async (id: string): Promise<HelpArticle> => {
    const response = await apiClient.post<HelpArticle>(
      `/admin/support/help/articles/${id}/unpublish`
    );
    return response.data;
  },
};
