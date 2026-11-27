import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border-primary/20 !bg-card/85 !text-foreground !shadow-2xl !backdrop-blur-2xl !px-5 !py-4",
          description: "!text-muted-foreground",
          actionButton: "!rounded-full !bg-primary/15 !text-primary",
          cancelButton: "!rounded-full !bg-muted/60 !text-foreground",
          closeButton: "!rounded-full",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
