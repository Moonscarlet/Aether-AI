import React from 'react';
import { X, Download } from 'lucide-react';
import { ImageAttachment } from '../types';

interface ImageLightboxProps {
  image: ImageAttachment | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ image, onClose }) => {
  if (!image) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = image.name || 'image.png';
    link.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview lightbox"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -top-12 right-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download image"
            className="p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <img
          src={image.dataUrl}
          alt={image.name || 'Preview'}
          className="max-h-[80vh] w-auto rounded-lg border border-zinc-800 object-contain shadow-2xl"
          referrerPolicy="no-referrer"
        />
        <div className="mt-3 text-xs text-zinc-400 font-mono">
          {image.name} · {(image.size / 1024).toFixed(1)} KB
        </div>
      </div>
    </div>
  );
};
