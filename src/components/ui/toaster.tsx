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

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const processedTitle = (() => {
          if (!title) return null
          if (typeof title === "string") {
            const t = title.replace(/^\s*error[:\-\s]*/i, "").trim()
            return t === "" ? null : t
          }
          return title
        })()

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {processedTitle && <ToastTitle>{processedTitle}</ToastTitle>}
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
