import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface WatermarkData {
  id: string;
  text: string;
  top: number;
  left: number;
  opacity: number;
}

interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
}

const VideoPreviewDialog = ({ open, onOpenChange, url, title }: VideoPreviewDialogProps) => {
  const { user } = useAuth();
  const [watermarks, setWatermarks] = useState<WatermarkData[]>([]);
  const [userInfo, setUserInfo] = useState({
    ip: '',
    location: '',
    timestamp: new Date().toLocaleString()
  });

  const getEmbedUrl = (url: string): string | null => {
    // YouTube URL patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`;
    }

    // Google Drive URL patterns
    if (url.includes('drive.google.com')) {
      const driveFileIdRegexA = /\/file\/d\/([^\/]+)/;
      const driveFileIdRegexB = /[?&]id=([^&]+)/; // alternative share format
      const driveMatch = url.match(driveFileIdRegexA) || url.match(driveFileIdRegexB);
      if (driveMatch) {
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      }
      // Already a preview URL
      if (url.includes('/preview')) {
        return url;
      }
    }

    return null;
  };

  const embedUrl = useMemo(() => getEmbedUrl(url), [url]);
  const [loaded, setLoaded] = useState(false);
  const [fallback, setFallback] = useState(false);

  const isGoogleDrive = embedUrl?.includes('drive.google.com') || false;
  const isYouTube = embedUrl?.includes('youtube') || false;

  // Fallback if iframe doesn't load (common when provider blocks embedding)
  useEffect(() => {
    setLoaded(false);
    setFallback(false);
    if (!embedUrl) return;
    const t = window.setTimeout(() => {
      if (!loaded) setFallback(true);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [embedUrl, open]);

  const shouldUseIframe = !!embedUrl && !fallback;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleSelectStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    return false;
  };

  // Fetch user IP and location
  useEffect(() => {
    if (!open) return;
    
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        setUserInfo(prev => ({ ...prev, ip: data.ip }));
        return fetch(`https://ipapi.co/${data.ip}/json/`);
      })
      .then(res => res.json())
      .then(data => {
        setUserInfo(prev => ({ 
          ...prev, 
          location: `${data.city || ''}, ${data.country_name || ''}`.trim()
        }));
      })
      .catch(() => {});
  }, [open]);

  // Generate random watermarks
  useEffect(() => {
    if (!open) return;

    const generateWatermark = () => {
      const infoParts = [
        userInfo.ip,
        userInfo.location,
        user?.email || 'User',
        new Date().toLocaleTimeString(),
        `ID: ${user?.id?.substring(0, 8) || 'XXXX'}`
      ].filter(Boolean);

      const randomInfo = infoParts[Math.floor(Math.random() * infoParts.length)];
      
      return {
        id: Math.random().toString(36),
        text: randomInfo,
        top: Math.random() * 80 + 10,
        left: Math.random() * 80 + 10,
        opacity: Math.random() * 0.3 + 0.1
      };
    };

    const interval = setInterval(() => {
      // Randomly show watermarks (30% chance every interval)
      if (Math.random() > 0.7) {
        setWatermarks(prev => {
          const newMarks = [...prev, generateWatermark()];
          return newMarks.slice(-3); // Keep max 3 watermarks
        });

        // Remove watermark after random duration
        setTimeout(() => {
          setWatermarks(prev => prev.slice(1));
        }, Math.random() * 5000 + 3000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, userInfo, user]);

  // Simplified recording detection - removed aggressive checks

  // Block keyboard shortcuts for DevTools
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      toast({ title: "Action blocked", variant: "destructive" });
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      toast({ title: "Action blocked", variant: "destructive" });
      return false;
    }
    // Ctrl+U (view source)
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      toast({ title: "Action blocked", variant: "destructive" });
      return false;
    }
    // Ctrl+S (save)
    if (e.ctrlKey && e.keyCode === 83) {
      e.preventDefault();
      toast({ title: "Action blocked", variant: "destructive" });
      return false;
    }
  }, []);

  const blockContextMenu = useCallback((e: Event) => { e.preventDefault(); }, []);
  const blockCopy = useCallback((e: ClipboardEvent) => { e.preventDefault(); }, []);
  const blockDrag = useCallback((e: DragEvent) => { e.preventDefault(); }, []);

  // DevTools detection removed - was causing false positives

  // Block keyboard shortcuts when dialog is open
  useEffect(() => {
    if (!open) return;

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', blockContextMenu as EventListener);
    document.addEventListener('copy', blockCopy as EventListener);
    document.addEventListener('dragstart', blockDrag as EventListener);

    // Disable text selection globally
    document.body.style.userSelect = 'none';
    ;(document.body.style as any).webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', blockContextMenu as EventListener);
      document.removeEventListener('copy', blockCopy as EventListener);
      document.removeEventListener('dragstart', blockDrag as EventListener);
      document.body.style.userSelect = '';
      ;(document.body.style as any).webkitUserSelect = '';
    };
  }, [open, handleKeyDown, blockContextMenu, blockCopy, blockDrag]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl w-full p-0" 
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>{title || 'Video Preview'}</span>
          </DialogTitle>
        </DialogHeader>
        <div 
          className="p-6 pt-4" 
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
        >
          {shouldUseIframe ? (
            <div 
              className="relative w-full select-none" 
              style={{ paddingBottom: '56.25%', userSelect: 'none', pointerEvents: 'none' }}
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
            >
              <iframe
                src={embedUrl!}
                className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-auto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setLoaded(true)}
                allowFullScreen
                style={{ border: 'none' }}
              />
              {/* Security overlay to prevent interactions */}
              <div 
                className="absolute inset-0 z-10"
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
                style={{ 
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  pointerEvents: 'none'
                }}
              />
              
              {/* Recording detection overlay removed */}

              {/* Random watermarks */}
              {watermarks.map(mark => (
                <div
                  key={mark.id}
                  className="absolute z-30 text-foreground font-mono text-xs pointer-events-none select-none"
                  style={{
                    top: `${mark.top}%`,
                    left: `${mark.left}%`,
                    opacity: mark.opacity,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    transform: `rotate(${Math.random() * 20 - 10}deg)`,
                    userSelect: 'none'
                  }}
                >
                  {mark.text}
                </div>
              ))}
            </div>
          ) : embedUrl ? (
            <div 
              className="relative w-full select-none" 
              style={{ paddingBottom: '56.25%', userSelect: 'none' }}
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
            >
              <iframe
                src={embedUrl!}
                title={title || 'Video Preview'}
                className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-auto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setLoaded(true)}
                allowFullScreen
                style={{ border: 'none' }}
              />
              {!loaded && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/40 border-top-primary" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Unable to preview this video format
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPreviewDialog;
