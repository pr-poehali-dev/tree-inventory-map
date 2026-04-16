import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface Props {
  open: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmLabel?: string;
}

export default function DeleteConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
  confirmLabel = 'Удалить',
}: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && !loading && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[var(--forest-dark)] flex items-center gap-2">
            <Icon name="Trash2" size={18} className="text-red-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--stone)] pb-2">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-[var(--forest-dark)] bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 transition-colors font-medium disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Icon name="Loader2" size={14} className="animate-spin" />}
            {loading ? 'Удаляю...' : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
