import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/utils/imageUrlHelper';
interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}
const ImagePreviewModal = ({
  isOpen,
  onClose,
  imageUrl,
  title
}: ImagePreviewModalProps) => {
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            
          </div>
        </DialogHeader>
        <div className="p-4">
          <img src={getImageUrl(imageUrl)} alt={title} className="w-full h-auto max-h-[70vh] object-contain rounded-lg" />
        </div>
      </DialogContent>
    </Dialog>;
};
export default ImagePreviewModal;