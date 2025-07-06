import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AvatarUploaderProps {
  userId: string;
  avatarUrl: string | null;
  onUpload: (url: string) => void;
}

export default function AvatarUploader({ userId, avatarUrl, onUpload }: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo de imagem
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato inválido. Envie uma imagem JPG, JPEG, PNG ou WEBP.');
      return;
    }

    setUploading(true);
    setError(null);

    const fileExt = file.name.split('.').pop();
    const filePath = `public/${userId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      setError('Erro ao enviar imagem. Tente novamente.');
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    onUpload(data.publicUrl);
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-start space-y-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="w-24 h-24 rounded-full object-cover border"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-500">
          Sem avatar
        </div>
      )}

      <div>
        <input
          type="file"
          accept="image/jpeg, image/jpg, image/png, image/webp"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
          disabled={uploading}
        >
          {uploading ? 'Enviando...' : 'Enviar nova foto'}
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    </div>
  );
}
