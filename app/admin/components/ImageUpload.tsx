'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  bucket: string;
  folder?: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  className?: string;
  aspectRatio?: 'square' | 'landscape' | 'wide';
}

export function ImageUpload({
  bucket,
  folder = '',
  currentUrl,
  onUpload,
  onRemove,
  label,
  className,
  aspectRatio = 'square',
}: ImageUploadProps) {
  const { supabase } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasImage = !!currentUrl;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const prefix = folder ? `${folder}/` : '';
      const fileName = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onUpload(data.publicUrl);
    } catch (err: any) {
      setError('Erro ao enviar imagem. Tente novamente.');
      console.error(err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const aspectClass = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    wide: 'aspect-[3/1]',
  }[aspectRatio];

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-gray-400">{label}</label>
      )}

      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden group',
          aspectClass,
          hasImage
            ? 'border-gray-700 bg-gray-800/50'
            : 'border-gray-700 bg-gray-800/30 cursor-pointer hover:border-purple-500/60 hover:bg-gray-800/50'
        )}
        onClick={() => !hasImage && !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900/80">
            <Loader2 className="text-purple-400 animate-spin" size={22} />
            <span className="text-xs text-gray-400 font-medium">Enviando...</span>
          </div>
        ) : hasImage ? (
          <>
            <Image
              src={currentUrl!}
              alt="Preview"
              fill
              className="object-contain p-1.5"
              unoptimized
            />
            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <Upload size={13} /> Trocar
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  className="flex items-center gap-1.5 bg-red-500/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-500 transition-colors"
                >
                  <X size={13} /> Remover
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <div className="p-2.5 bg-gray-700/50 rounded-xl">
              <ImageIcon className="text-gray-500" size={22} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-400">Clique para enviar</p>
              <p className="text-[10px] text-gray-600 mt-0.5">PNG, JPG, WEBP · máx 5MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
