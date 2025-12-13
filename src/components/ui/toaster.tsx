import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  // Helper to remove any leading 'Error' prefix from titles so toasts
  // don't look alarming. Also skip rendering an empty title.
  const normalizeTitle = (title?: React.ReactNode) => {
    if (!title) return undefined
    if (typeof title !== 'string') return title
    // Remove leading 'error', 'Error:', 'Error -', etc.
    const stripped = title.replace(/^\s*error[:\s-]*/i, '')
    return stripped.trim() === '' ? undefined : stripped
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const normalizedTitle = normalizeTitle(title)

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {normalizedTitle && <ToastTitle>{normalizedTitle}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
