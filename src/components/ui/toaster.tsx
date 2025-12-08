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

  // Separate attendance alerts (top-left) from error messages (bottom-right)
  const attendanceAlerts = toasts.filter(t => t.isAttendanceAlert);
  const errorToasts = toasts.filter(t => !t.isAttendanceAlert && t.variant === 'destructive');

  return (
    <>
      {/* Attendance Alerts - Top Left */}
      <ToastProvider swipeDirection="left">
        {attendanceAlerts.map(function ({ id, title, description, action, imageUrl, status, isAttendanceAlert, ...props }) {
          const variant = status === 'present' ? 'success' : status === 'absent' ? 'absent' : status === 'late' ? 'late' : 'default';
          
          return (
            <Toast key={id} {...props} variant={variant}>
              <div className="flex items-center gap-2">
                {imageUrl && (
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
        <ToastViewport position="top-left" />
      </ToastProvider>

      {/* Error Messages - Bottom Right */}
      <ToastProvider swipeDirection="right">
        {errorToasts.map(function ({ id, title, description, action, imageUrl, status, isAttendanceAlert, ...props }) {
          return (
            <Toast key={id} {...props} variant="destructive">
              <div className="grid gap-0.5 flex-1">
                {title && <ToastTitle className="text-xs font-medium">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs">{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </Toast>
          )
        })}
        <ToastViewport position="bottom-right" />
      </ToastProvider>
    </>
  )
}
