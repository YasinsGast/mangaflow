import React, { useState, useEffect } from 'react';
import { X, Upload, BookOpen, User, FileText, Image, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRoleCheck } from '../hooks/useRoleCheck';
import toast from 'react-hot-toast';

interface CreateMangaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMangaCreated: () => void;
}

interface MangaFormData {
  title: string;
  description: string;
  author: string;
  artist: string;
  cover_image_url: string;
  status: 'ongoing' | 'completed';
  categories: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function CreateMangaModal({ isOpen, onClose, onMangaCreated }: CreateMangaModalProps) {
  const [formData, setFormData] = useState<MangaFormData>({
    title: '',
    description: '',
    author: '',
    artist: '',
    cover_image_url: '',
    status: 'ongoing',
    categories: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { user } = useAuth();
  const { canCreateContent, isAdmin, loading: roleLoading } = useRoleCheck();

  // Kategorileri yükle
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, color')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Oturum açmanız gerekiyor');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Manga başlığı gereklidir');
      return;
    }

    setSubmitting(true);

    try {
      // Slug oluştur
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();

      // Manga'yı ekle (onay bekleyen durumda)
      const { data, error } = await supabase
        .from('mangas')
        .insert({
          title: formData.title,
          slug: slug,
          description: formData.description,
          author: formData.author,
          artist: formData.artist,
          cover_image_url: formData.cover_image_url,
          status: formData.status,
          creator_id: user.id,
          approval_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Manga oluşturulurken hata:', error);
        toast.error('Manga oluşturulurken hata oluştu');
        return;
      }

      // Seçili kategorileri kaydet
      if (formData.categories.length > 0) {
        const categoryInserts = formData.categories.map(categoryId => ({
          manga_id: data.id,
          category_id: categoryId
        }));

        const { error: categoryError } = await supabase
          .from('manga_categories')
          .insert(categoryInserts);

        if (categoryError) {
          console.error('Kategoriler kaydedilirken hata:', categoryError);
        }
      }

      toast.success('Manga başarıyla oluşturuldu! Admin onayı bekleniyor.');
      
      // Form'u temizle
      setFormData({
        title: '',
        description: '',
        author: '',
        artist: '',
        cover_image_url: '',
        status: 'ongoing',
        categories: []
      });
      
      onMangaCreated();
      onClose();

    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof MangaFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  // 🔒 GÜVENLİK KONTROLÜ: Yetki yoksa modal açma
  if (!isOpen) return null;
  
  if (roleLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="text-white">Yetki kontrol ediliyor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!canCreateContent()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <X className="h-6 w-6 text-red-400" />
            <h3 className="text-lg font-bold text-white">Yetkisiz Erişim</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Manga oluşturma yetkiniz bulunmuyor. Bu işlemi yapabilmek için fansub, moderator veya admin yetkisine sahip olmanız gerekiyor.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            Yeni Manga Ekle
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Manga Başlığı *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              placeholder="Manga başlığını girin..."
              required
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              placeholder="Manga açıklamasını girin..."
              disabled={submitting}
            />
          </div>

          {/* Author & Artist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Yazar
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                placeholder="Yazar adı..."
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Çizer
              </label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => handleInputChange('artist', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                placeholder="Çizer adı..."
                disabled={submitting}
              />
            </div>
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Image className="h-4 w-4 inline mr-2" />
              Kapak Görseli URL
            </label>
            <input
              type="url"
              value={formData.cover_image_url}
              onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              placeholder="https://example.com/cover.jpg"
              disabled={submitting}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Durum
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as 'ongoing' | 'completed')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              disabled={submitting}
            >
              <option value="ongoing">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Tag className="h-4 w-4 inline mr-2" />
              Kategoriler
            </label>
            {loadingCategories ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400"></div>
                <span className="ml-2 text-gray-400">Kategoriler yükleniyor...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.categories.includes(category.id)
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                    style={{
                      backgroundColor: formData.categories.includes(category.id) ? `${category.color}20` : undefined,
                      borderColor: formData.categories.includes(category.id) ? category.color : undefined
                    }}
                    disabled={submitting}
                  >
                    <div className="flex items-center justify-between">
                      <span>{category.name}</span>
                      {formData.categories.includes(category.id) && (
                        <span className="text-xs">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {formData.categories.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Seçili kategoriler: {formData.categories.length}
              </p>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              <strong>Not:</strong> Manga'nız admin onayından sonra yayınlanacaktır. 
              Onay süreci genellikle 24-48 saat sürer.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              disabled={submitting}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.title.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Manga Oluştur
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}