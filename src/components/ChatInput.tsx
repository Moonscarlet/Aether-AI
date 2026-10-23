import React, { useRef, useState, useEffect } from 'react';
import { ArrowUp, Image as ImageIcon, Square, X, Paperclip } from 'lucide-react';
import { ImageAttachment } from '../types';
import { fileToImageAttachment } from '../utils/aiRouter';

interface ChatInputProps {
  onSend: (text: string, images: ImageAttachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isStreaming,
  disabled,
}) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      onStop();
      return;
    }
    const cleanText = text.trim();
    if (!cleanText && images.length === 0) return;

    onSend(cleanText, images);
    setText('');
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    const validImageFiles = Array.from(files).filter(f =>
      f.type.startsWith('image/')
    );
    if (validImageFiles.length === 0) return;

    try {
      const attachments = await Promise.all(
        validImageFiles.map(fileToImageAttachment)
      );
      setImages(prev => [...prev, ...attachments]);
    } catch (err) {
      console.error('Failed to process image files', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      processFiles(imageFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const hasContent = text.trim().length > 0 || images.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border transition-all duration-150 bg-[#121215] shadow-lg ${
          isDragging
            ? 'border-zinc-400 ring-2 ring-zinc-500/20'
            : 'border-zinc-800 focus-within:border-zinc-700'
        }`}
      >
        {/* Drag overlay notice */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80 backdrop-blur-xs rounded-xl border border-dashed border-zinc-400 text-sm text-zinc-200">
            Drop images to attach
          </div>
        )}

        {/* Selected images list */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 border-b border-zinc-800/80">
            {images.map(img => (
              <div
                key={img.id}
                className="relative group rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-900"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-16 h-16 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  aria-label={`Remove image ${img.name}`}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 hover:bg-black text-zinc-300 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text input area */}
        <div className="flex items-end gap-2 p-2.5">
          {/* File picker button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach images"
            title="Attach images (or paste via Ctrl+V)"
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 rounded-lg transition-colors shrink-0"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isStreaming
                ? 'Streaming response...'
                : 'Send a message or paste images...'
            }
            rows={1}
            disabled={disabled}
            className="flex-1 max-h-[180px] bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none py-1.5 leading-relaxed"
          />

          {/* Action button: Send or Stop */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating response"
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/60 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 text-xs"
            >
              <Square className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!hasContent || disabled}
              aria-label="Send message"
              className={`p-2 rounded-lg transition-all shrink-0 ${
                hasContent && !disabled
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-center text-[11px] text-zinc-500">
        Press <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Shift + Enter</kbd> for new line · Paste images directly
      </div>
    </div>
  );
};
