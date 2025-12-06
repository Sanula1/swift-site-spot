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
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, imageUrl, status, isAttendanceAlert, ...props }) {
        const variant = isAttendanceAlert 
          ? (status === 'present' ? 'success' : status === 'absent' ? 'absent' : status === 'late' ? 'late' : 'default')
          : props.variant;
        
        return (
          <Toast key={id} {...props} variant={variant}>
            <div className="flex items-center gap-2">
              {isAttendanceAlert && imageUrl && (
                <img 
                  src={imageUrl} 
                  alt="Student" 
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div className="grid gap-0.5 flex-1">
                {title && <ToastTitle className="text-xs font-medium">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs">{description}</ToastDescription>
                )}
              </div>
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
