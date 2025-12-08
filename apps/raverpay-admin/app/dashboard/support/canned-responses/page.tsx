'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { supportApi } from '@/lib/api/support';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getApiErrorMessage } from '@/lib/utils';
import { CannedResponse } from '@/types/support';

interface CannedResponseFormData {
  title: string;
  content: string;
  category: string;
  shortcut?: string;
}

export default function CannedResponsesPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(
    null
  );
  const [deletingResponse, setDeletingResponse] =
    useState<CannedResponse | null>(null);
  const [formData, setFormData] = useState<CannedResponseFormData>({
    title: '',
    content: '',
    category: '',
    shortcut: '',
  });

  const { data: responses, isLoading } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: supportApi.getCannedResponses,
  });

  const createMutation = useMutation({
    mutationFn: (data: CannedResponseFormData) =>
      supportApi.createCannedResponse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      setShowCreateDialog(false);
      resetForm();
      toast.success('Canned response created');
    },
    onError: (error: unknown) => {
      toast.error('Failed to create canned response', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CannedResponseFormData }) =>
      supportApi.updateCannedResponse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      setEditingResponse(null);
      resetForm();
      toast.success('Canned response updated');
    },
    onError: (error: unknown) => {
      toast.error('Failed to update canned response', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supportApi.deleteCannedResponse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      setDeletingResponse(null);
      toast.success('Canned response deleted');
    },
    onError: (error: unknown) => {
      toast.error('Failed to delete canned response', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', category: '', shortcut: '' });
  };

  const handleCreate = () => {
    setShowCreateDialog(true);
    resetForm();
  };

  const handleEdit = (response: CannedResponse) => {
    setEditingResponse(response);
    setFormData({
      title: response.title,
      content: response.content,
      category: response.category,
      shortcut: response.shortcut || '',
    });
  };

  const handleSubmit = () => {
    if (editingResponse) {
      updateMutation.mutate({ id: editingResponse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Group responses by category
  const groupedResponses = responses?.reduce(
    (acc, response) => {
      const category = response.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(response);
      return acc;
    },
    {} as Record<string, CannedResponse[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Canned Responses</h2>
          <p className="text-muted-foreground">
            Pre-written responses for quick replies in support chats
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Response
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : responses && responses.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedResponses || {}).map(
            ([category, categoryResponses]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4">{category}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryResponses.map((response) => (
                    <Card key={response.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">
                            {response.title}
                          </CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(response)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingResponse(response)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {response.shortcut && (
                          <Badge variant="outline" className="w-fit">
                            /{response.shortcut}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {response.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No canned responses yet</p>
            <Button variant="link" onClick={handleCreate}>
              Create your first response
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingResponse}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingResponse(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingResponse ? 'Edit Canned Response' : 'Create Canned Response'}
            </DialogTitle>
            <DialogDescription>
              {editingResponse
                ? 'Update the canned response details'
                : 'Add a new pre-written response for support chats'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Greeting"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g., General, Refunds, Technical"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortcut">
                Shortcut (optional)
                <span className="text-muted-foreground ml-2 text-xs">
                  Type /shortcut to use
                </span>
              </Label>
              <Input
                id="shortcut"
                placeholder="e.g., greet"
                value={formData.shortcut}
                onChange={(e) =>
                  setFormData({ ...formData, shortcut: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter the response content..."
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingResponse(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.title ||
                !formData.content ||
                !formData.category ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingResponse ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingResponse}
        onOpenChange={(open) => !open && setDeletingResponse(null)}
        title="Delete Canned Response"
        description={`Are you sure you want to delete "${deletingResponse?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deletingResponse) {
            deleteMutation.mutate(deletingResponse.id);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
