import React, { useState, useEffect } from 'react';
import { X, Upload, Save, Tag } from 'lucide-react';
import { supabase, type Manga } from '@/lib/supabase';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface EditMangaModalProps {
  manga: Manga & { categories?: Category[] };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedManga: Manga) => void;
}

export default function EditMangaModal({ manga, isOpen, onClose, onUpdate }: EditMangaModalProps) {
  const { canModerate } = useRoleCheck(['fansub', 'moderator', 'admin']);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  const [formData, setFormData] = useState({
    title: manga.title,
    description: manga.description || '',
    author: manga.author || '',
    artist: manga.artist || '',
    status: manga.status,
    coverImage: null as File | null,
    coverImageUrl: manga.cover_image_url || ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Mevcut kategorileri selectedCategories'e aktar
      const mangaCategories = Array.isArray(manga.categories) 
        ? manga.categories.map(c => typeof c === 'string' ? c : (c as Category).id)
        : [];
      setSelectedCategories(mangaCategories);
    }
  }, [isOpen, manga.categories]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, color')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Kategoriler yüklenirken hata:', error);
        toast.error('Kategoriler yüklenirken hata oluştu');
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${manga.id}/cover.${fileExt}`;
    const filePath = `manga-covers/${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('manga-covers')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Dosya yükleme hatası:', uploadError);
        toast.error('Dosya yüklenirken hata oluştu');
        return;
      }

      // Public URL al
      const { data: { publicUrl } } = supabase.storage
        .from('manga-covers')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        coverImage: file,
        coverImageUrl: publicUrl
      }));

      toast.success('Kapak resmi başarıyla yüklendi');
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canModerate()) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    setLoading(true);
    try {
      // Manga'yı güncelle
      const { error: mangaError } = await supabase
        .from('mangas')
        .update({
          title: formData.title,
          description: formData.description,
          author: formData.author,
          artist: formData.artist,
          status: formData.status,
          cover_image_url: formData.coverImageUrl,
          approval_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', manga.id);

      if (mangaError) {
        console.error('Manga güncellenirken hata:', mangaError);
        toast.error('Manga güncellenirken hata oluştu');
        return;
      }

      // Kategorileri güncelle
      // Önce mevcut kategorileri sil
      const { error: deleteError } = await supabase
        .from('manga_categories')
        .delete()
        .eq('manga_id', manga.id);

      if (deleteError) {
        console.error('Kategori silme hatası:', deleteError);
      }

      // Yeni kategorileri ekle
      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map(categoryId => ({
          manga_id: manga.id,
          category_id: categoryId
        }));

        const { error: insertError } = await supabase
          .from('manga_categories')
          .insert(categoryInserts);

        if (insertError) {
          console.error('Kategori ekleme hatası:', insertError);
          toast.error('Kategoriler güncellenirken hata oluştu');
        }
      }

      // Updated manga objesini oluştur
      const updatedManga: Manga = {
        ...manga,
        title: formData.title,
        description: formData.description,
        author: formData.author,
        artist: formData.artist,
        status: formData.status,
        cover_image_url: formData.coverImageUrl,
        categories: selectedCategories // Pass category IDs as string[]
      } as Manga;

      onUpdate(updatedManga);
      toast.success('Manga başarıyla güncellendi ve admin onayına gönderildi');
      onClose();

    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Manga Düzenle: {manga.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Başlık *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Manga başlığını girin"
              required
            />
          </div>

          {/* Author & Artist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Yazar</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                className="w-full bg-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Yazar adı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Çizer</label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                className="w-full bg-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Çizer adı"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Açıklama</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Manga açıklaması"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Durum</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="ongoing">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
              <option value="hiatus">Ara Verdi</option>
            </select>
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium mb-2">Kapak Resmi</label>
            
            {/* Mevcut kapak resmi */}
            {formData.coverImageUrl && (
              <div className="mb-4">
                <img
                  src={formData.coverImageUrl}
                  alt="Mevcut kapak"
                  className="w-32 h-44 object-cover rounded-lg border border-gray-600"
                />
              </div>
            )}

            {/* Upload alanı */}
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
                id="cover-upload"
              />
              <label htmlFor="cover-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">
                  {uploading ? 'Yükleniyor...' : 'Kapak resmi seçin veya sürükleyip bırakın'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, GIF - Max 5MB
                </p>
              </label>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium mb-2">Kategoriler</label>
            {loadingCategories ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategories.includes(category.id)
                        ? 'text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    style={{
                      backgroundColor: selectedCategories.includes(category.id) 
                        ? category.color 
                        : undefined,
                      borderColor: category.color,
                      border: selectedCategories.includes(category.id) ? 'none' : `1px solid ${category.color}40`
                    }}
                  >
                    <Tag className="h-3 w-3" />
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Güncelleniyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}