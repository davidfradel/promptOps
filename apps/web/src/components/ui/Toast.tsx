import { useToast } from '../../hooks/useToast';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const bgColor =
          toast.type === 'success' ? 'bg-green-600' :
          toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        return (
          <div
            key={toast.id}
            className={`${bgColor} flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/70 hover:text-white"
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}
