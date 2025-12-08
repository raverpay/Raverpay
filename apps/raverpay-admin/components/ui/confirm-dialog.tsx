'use client';

import * as React from 'react';
import { AlertTriangle, Trash2, RefreshCcw, Ban, CheckCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: ConfirmDialogVariant;
  icon?: 'warning' | 'delete' | 'reverse' | 'ban' | 'success' | 'info';
  isLoading?: boolean;
  children?: React.ReactNode;
}

const iconMap = {
  warning: AlertTriangle,
  delete: Trash2,
  reverse: RefreshCcw,
  ban: Ban,
  success: CheckCircle,
  info: Info,
};

const variantStyles: Record<
  ConfirmDialogVariant,
  {
    iconBg: string;
    iconColor: string;
    confirmButton: string;
  }
> = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  success: {
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    confirmButton: 'bg-green-600 hover:bg-green-700 text-white',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  icon = 'warning',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = React.useState(false);
  const IconComponent = iconMap[icon];
  const styles = variantStyles[variant];

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const loading = isLoading || isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn('rounded-full p-3', styles.iconBg)}>
              <IconComponent className={cn('h-6 w-6', styles.iconColor)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="mt-2">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {children && <div className="py-4">{children}</div>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button className={styles.confirmButton} onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier usage
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>>({
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const confirm = React.useCallback(
    (options: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
      return new Promise<boolean>((resolve) => {
        setConfig({
          ...options,
          onConfirm: async () => {
            await options.onConfirm();
            setIsOpen(false);
            resolve(true);
          },
          onCancel: () => {
            options.onCancel?.();
            resolve(false);
          },
        });
        setIsOpen(true);
      });
    },
    [],
  );

  const ConfirmDialogComponent = React.useCallback(
    () => <ConfirmDialog open={isOpen} onOpenChange={setIsOpen} {...config} />,
    [isOpen, config],
  );

  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
    isOpen,
    setIsOpen,
  };
}
