'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  FolderOpen,
  Eye,
  FileText,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

import { helpApi } from '@/lib/api/help';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate, getApiErrorMessage } from '@/lib/utils';
import { HelpCollection, HelpArticle } from '@/types/support';

interface CollectionFormData {
  title: string;
  description: string;
  icon: string;
  order: number;
}

interface ArticleFormData {
  title: string;
  content: string;
  collectionId: string;
  status: 'DRAFT' | 'PUBLISHED';
  order: number;
}

export default function HelpCenterPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('collections');

  // Collections state
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<HelpCollection | null>(null);
  const [deletingCollection, setDeletingCollection] =
    useState<HelpCollection | null>(null);
  const [collectionForm, setCollectionForm] = useState<CollectionFormData>({
    title: '',
    description: '',
    icon: '',
    order: 0,
  });

  // Articles state
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<HelpArticle | null>(
    null
  );
  const [articleForm, setArticleForm] = useState<ArticleFormData>({
    title: '',
    content: '',
    collectionId: '',
    status: 'DRAFT',
    order: 0,
  });
  const [articlesPage, setArticlesPage] = useState(1);
  const [articlesSearch, setArticlesSearch] = useState('');
  const debouncedSearch = useDebouncedValue(articlesSearch, 300, 2);
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Queries
  const { data: collections, isLoading: loadingCollections } = useQuery({
    queryKey: ['help-collections'],
    queryFn: helpApi.getCollections,
  });

  const { data: articlesData, isLoading: loadingArticles } = useQuery({
    queryKey: [
      'help-articles',
      articlesPage,
      debouncedSearch,
      collectionFilter,
      statusFilter,
    ],
    queryFn: () =>
      helpApi.getArticles({
        page: articlesPage,
        limit: 10,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(collectionFilter !== 'all' && { collectionId: collectionFilter }),
        ...(statusFilter !== 'all' && {
          status: statusFilter as 'DRAFT' | 'PUBLISHED',
        }),
      }),
  });

  // Collection Mutations
  const createCollectionMutation = useMutation({
    mutationFn: (data: CollectionFormData) => helpApi.createCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-collections'] });
      setShowCollectionDialog(false);
      resetCollectionForm();
      toast.success('Collection created');
    },
    onError: (error: unknown) => {
      toast.error('Failed to create collection', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const updateCollectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CollectionFormData }) =>
      helpApi.updateCollection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-collections'] });
      setEditingCollection(null);
      resetCollectionForm();
      toast.success('Collection updated');
    },
    onError: (error: unknown) => {
      toast.error('Failed to update collection', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (id: string) => helpApi.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-collections'] });
      setDeletingCollection(null);
      toast.success('Collection deleted');
    },
    onError: (error: unknown) => {
      toast.error('Failed to delete collection', {
        description: getApiErrorMessage(error),
      });
    },
  });

  // Article Mutations
  const createArticleMutation = useMutation({
    mutationFn: (data: ArticleFormData) => helpApi.createArticle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      setShowArticleDialog(false);
      resetArticleForm();
      toast.success('Article created');
    },
    onError: (error: unknown) => {
      toast.error('Failed to create article', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ArticleFormData }) =>
      helpApi.updateArticle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      setEditingArticle(null);
      resetArticleForm();
      toast.success('Article updated');
    },
    onError: (error: unknown) => {
      toast.error('Failed to update article', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => helpApi.deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      setDeletingArticle(null);
      toast.success('Article deleted');
    },
    onError: (error: unknown) => {
      toast.error('Failed to delete article', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const publishArticleMutation = useMutation({
    mutationFn: (id: string) => helpApi.publishArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      toast.success('Article published');
    },
    onError: (error: unknown) => {
      toast.error('Failed to publish article', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const unpublishArticleMutation = useMutation({
    mutationFn: (id: string) => helpApi.unpublishArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      toast.success('Article unpublished');
    },
    onError: (error: unknown) => {
      toast.error('Failed to unpublish article', {
        description: getApiErrorMessage(error),
      });
    },
  });

  // Form helpers
  const resetCollectionForm = () => {
    setCollectionForm({ title: '', description: '', icon: '', order: 0 });
  };

  const resetArticleForm = () => {
    setArticleForm({
      title: '',
      content: '',
      collectionId: '',
      status: 'DRAFT',
      order: 0,
    });
  };

  const handleEditCollection = (collection: HelpCollection) => {
    setEditingCollection(collection);
    setCollectionForm({
      title: collection.title,
      description: collection.description || '',
      icon: collection.icon || '',
      order: collection.order,
    });
  };

  const handleEditArticle = (article: HelpArticle) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      content: article.content,
      collectionId: article.collectionId,
      status: article.status,
      order: article.order,
    });
  };

  const handleCollectionSubmit = () => {
    if (editingCollection) {
      updateCollectionMutation.mutate({
        id: editingCollection.id,
        data: collectionForm,
      });
    } else {
      createCollectionMutation.mutate(collectionForm);
    }
  };

  const handleArticleSubmit = () => {
    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, data: articleForm });
    } else {
      createArticleMutation.mutate(articleForm);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Help Center</h2>
          <p className="text-muted-foreground">
            Manage help articles and collections for customers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
          </TabsList>
          {activeTab === 'collections' ? (
            <Button onClick={() => setShowCollectionDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Collection
            </Button>
          ) : (
            <Button onClick={() => setShowArticleDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Article
            </Button>
          )}
        </div>

        {/* Collections Tab */}
        <TabsContent value="collections" className="mt-6">
          {loadingCollections ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : collections && collections.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <Card key={collection.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {collection.title}
                          </CardTitle>
                          <CardDescription>
                            {collection._count?.articles || 0} articles
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCollection(collection)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCollection(collection)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {collection.description || 'No description'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No collections yet</p>
                <Button
                  variant="link"
                  onClick={() => setShowCollectionDialog(true)}
                >
                  Create your first collection
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Articles Tab */}
        <TabsContent value="articles" className="mt-6 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search articles..."
                    value={articlesSearch}
                    onChange={(e) => setArticlesSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={collectionFilter}
                  onValueChange={setCollectionFilter}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Collection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Collections</SelectItem>
                    {collections?.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Articles Table */}
          <Card>
            <CardContent className="pt-6">
              {loadingArticles ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : articlesData?.data && articlesData.data.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Collection</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {articlesData.data.map((article) => (
                          <TableRow key={article.id}>
                            <TableCell className="font-medium">
                              {article.title}
                            </TableCell>
                            <TableCell>
                              {article.collection?.title || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  article.status === 'PUBLISHED'
                                    ? 'success'
                                    : 'secondary'
                                }
                              >
                                {article.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{article.viewCount}</TableCell>
                            <TableCell>{formatDate(article.updatedAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {article.status === 'DRAFT' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      publishArticleMutation.mutate(article.id)
                                    }
                                    disabled={publishArticleMutation.isPending}
                                  >
                                    Publish
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      unpublishArticleMutation.mutate(article.id)
                                    }
                                    disabled={unpublishArticleMutation.isPending}
                                  >
                                    Unpublish
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditArticle(article)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingArticle(article)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {articlesData.meta && (
                    <Pagination
                      currentPage={articlesPage}
                      totalPages={articlesData.meta.totalPages}
                      totalItems={articlesData.meta.total}
                      itemsPerPage={articlesData.meta.limit}
                      onPageChange={setArticlesPage}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No articles found</p>
                  <Button
                    variant="link"
                    onClick={() => setShowArticleDialog(true)}
                  >
                    Create your first article
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Collection Dialog */}
      <Dialog
        open={showCollectionDialog || !!editingCollection}
        onOpenChange={(open) => {
          if (!open) {
            setShowCollectionDialog(false);
            setEditingCollection(null);
            resetCollectionForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? 'Edit Collection' : 'Create Collection'}
            </DialogTitle>
            <DialogDescription>
              {editingCollection
                ? 'Update the collection details'
                : 'Add a new help article collection'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="col-title">Title</Label>
              <Input
                id="col-title"
                placeholder="e.g., Getting Started"
                value={collectionForm.title}
                onChange={(e) =>
                  setCollectionForm({ ...collectionForm, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-desc">Description</Label>
              <Textarea
                id="col-desc"
                placeholder="Describe this collection..."
                value={collectionForm.description}
                onChange={(e) =>
                  setCollectionForm({
                    ...collectionForm,
                    description: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-icon">Icon Name (optional)</Label>
              <Input
                id="col-icon"
                placeholder="e.g., rocket"
                value={collectionForm.icon}
                onChange={(e) =>
                  setCollectionForm({ ...collectionForm, icon: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-order">Display Order</Label>
              <Input
                id="col-order"
                type="number"
                value={collectionForm.order}
                onChange={(e) =>
                  setCollectionForm({
                    ...collectionForm,
                    order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCollectionDialog(false);
                setEditingCollection(null);
                resetCollectionForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCollectionSubmit}
              disabled={
                !collectionForm.title ||
                createCollectionMutation.isPending ||
                updateCollectionMutation.isPending
              }
            >
              {editingCollection ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Dialog */}
      <Dialog
        open={showArticleDialog || !!editingArticle}
        onOpenChange={(open) => {
          if (!open) {
            setShowArticleDialog(false);
            setEditingArticle(null);
            resetArticleForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Edit Article' : 'Create Article'}
            </DialogTitle>
            <DialogDescription>
              {editingArticle
                ? 'Update the article details'
                : 'Add a new help article'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="art-title">Title</Label>
              <Input
                id="art-title"
                placeholder="e.g., How to reset your password"
                value={articleForm.title}
                onChange={(e) =>
                  setArticleForm({ ...articleForm, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="art-collection">Collection</Label>
                <Select
                  value={articleForm.collectionId}
                  onValueChange={(value) =>
                    setArticleForm({ ...articleForm, collectionId: value })
                  }
                >
                  <SelectTrigger id="art-collection">
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections?.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="art-status">Status</Label>
                <Select
                  value={articleForm.status}
                  onValueChange={(value: 'DRAFT' | 'PUBLISHED') =>
                    setArticleForm({ ...articleForm, status: value })
                  }
                >
                  <SelectTrigger id="art-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="art-content">Content (Markdown supported)</Label>
              <Textarea
                id="art-content"
                placeholder="Write your article content here..."
                value={articleForm.content}
                onChange={(e) =>
                  setArticleForm({ ...articleForm, content: e.target.value })
                }
                rows={12}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="art-order">Display Order</Label>
              <Input
                id="art-order"
                type="number"
                value={articleForm.order}
                onChange={(e) =>
                  setArticleForm({
                    ...articleForm,
                    order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowArticleDialog(false);
                setEditingArticle(null);
                resetArticleForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleArticleSubmit}
              disabled={
                !articleForm.title ||
                !articleForm.content ||
                !articleForm.collectionId ||
                createArticleMutation.isPending ||
                updateArticleMutation.isPending
              }
            >
              {editingArticle ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Collection Confirmation */}
      <ConfirmDialog
        open={!!deletingCollection}
        onOpenChange={(open) => !open && setDeletingCollection(null)}
        title="Delete Collection"
        description={`Are you sure you want to delete "${deletingCollection?.title}"? All articles in this collection will also be deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deletingCollection) {
            deleteCollectionMutation.mutate(deletingCollection.id);
          }
        }}
        isLoading={deleteCollectionMutation.isPending}
      />

      {/* Delete Article Confirmation */}
      <ConfirmDialog
        open={!!deletingArticle}
        onOpenChange={(open) => !open && setDeletingArticle(null)}
        title="Delete Article"
        description={`Are you sure you want to delete "${deletingArticle?.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deletingArticle) {
            deleteArticleMutation.mutate(deletingArticle.id);
          }
        }}
        isLoading={deleteArticleMutation.isPending}
      />
    </div>
  );
}
