import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Image as ImageIcon, FileText, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UploadPage() {
  const [step, setStep] = useState(1);
  const [mangaData, setMangaData] = useState({
    title: '',
    description: '',
    author: '',
    artist: '',
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [pages, setPages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPages([...pages, ...files]);
  };

  const removePage = (index: number) => {
    setPages(pages.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setUploading(true);

    try {
      // Upload cover image to storage
      let coverUrl = '';
      if (coverImage) {
        const coverPath = `covers/${Date.now()}-${coverImage.name}`;
        const { data: coverData, error: coverError } = await supabase.storage
          .from('manga-covers')
          .upload(coverPath, coverImage);

        if (coverError) throw coverError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-covers')
          .getPublicUrl(coverPath);

        coverUrl = publicUrl;
      }

      // Upload pages to storage
      const pageUrls: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pagePath = `pages/${Date.now()}-${i}-${page.name}`;
        const { error: pageError } = await supabase.storage
          .from('manga-pages')
          .upload(pagePath, page);

        if (pageError) throw pageError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-pages')
          .getPublicUrl(pagePath);

        pageUrls.push(publicUrl);
      }

      // Call upload processor edge function
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Kullanıcı girişi gerekli');

      const response = await fetch(
        'https://ucfcnwoamttfvbzpijlm.supabase.co/functions/v1/upload-processor',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId: user.user.id,
            mangaData: {
              ...mangaData,
              slug: mangaData.title.toLowerCase().replace(/\s+/g, '-'),
              coverImageUrl: coverUrl,
            },
            chapterData: {
              chapterNumber: 1,
              title: 'Bölüm 1',
            },
            pageUrls,
          }),
        }
      );

      if (!response.ok) throw new Error('Yükleme işlemi başarısız');

      alert('Manga başarıyla yüklendi! İncelendikten sonra yayınlanacaktır.');
      
      // Reset form
      setMangaData({ title: '', description: '', author: '', artist: '' });
      setCoverImage(null);
      setCoverPreview('');
      setPages([]);
      setStep(1);
    } catch (error: any) {
      alert(`Hata: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-6 py-24 max-w-4xl">
        <h1 className="text-h1 font-bold mb-2">İçerik Yükle</h1>
        <p className="text-text-secondary mb-8">
          Manga veya webtoon'unuzu platforma yükleyin
        </p>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-accent-primary' : 'bg-bg-elevated'}`}>
              <span className="font-semibold">1</span>
            </div>
            <div className={`h-1 w-20 ${step >= 2 ? 'bg-accent-primary' : 'bg-bg-elevated'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-accent-primary' : 'bg-bg-elevated'}`}>
              <span className="font-semibold">2</span>
            </div>
            <div className={`h-1 w-20 ${step >= 3 ? 'bg-accent-primary' : 'bg-bg-elevated'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-accent-primary' : 'bg-bg-elevated'}`}>
              <span className="font-semibold">3</span>
            </div>
          </div>
        </div>

        {/* Step 1: Manga Info */}
        {step === 1 && (
          <Card>
            <h2 className="text-h3 font-semibold mb-6">Manga Bilgileri</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Başlık *</label>
                <Input
                  placeholder="Manga adı"
                  value={mangaData.title}
                  onChange={(e) => setMangaData({ ...mangaData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Açıklama *</label>
                <textarea
                  className="w-full h-32 px-4 py-3 rounded-md bg-bg-elevated/60 backdrop-blur-xs border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary focus:ring-3 focus:ring-accent-primary/20"
                  placeholder="Manga hakkında kısa açıklama..."
                  value={mangaData.description}
                  onChange={(e) => setMangaData({ ...mangaData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Yazar *</label>
                  <Input
                    placeholder="Yazar adı"
                    value={mangaData.author}
                    onChange={(e) => setMangaData({ ...mangaData, author: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Çizer</label>
                  <Input
                    placeholder="Çizer adı"
                    value={mangaData.artist}
                    onChange={(e) => setMangaData({ ...mangaData, artist: e.target.value })}
                  />
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!mangaData.title || !mangaData.description || !mangaData.author}
              >
                Devam Et
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Cover Upload */}
        {step === 2 && (
          <Card>
            <h2 className="text-h3 font-semibold mb-6">Kapak Görseli</h2>
            
            {!coverPreview ? (
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-border-subtle rounded-lg p-12 text-center hover:border-accent-primary transition-colors">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-text-tertiary" />
                  <p className="text-text-secondary mb-2">Kapak görselini yükleyin</p>
                  <p className="text-sm text-text-tertiary">PNG, JPG (Max 5MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleCoverUpload}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full max-w-sm mx-auto rounded-lg"
                />
                <button
                  className="absolute top-2 right-2 p-2 bg-bg-pure-dark rounded-full"
                  onClick={() => {
                    setCoverImage(null);
                    setCoverPreview('');
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                Geri
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep(3)}
                className="flex-1"
                disabled={!coverImage}
              >
                Devam Et
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Pages Upload */}
        {step === 3 && (
          <Card>
            <h2 className="text-h3 font-semibold mb-6">Sayfa Yükle</h2>

            <label className="block cursor-pointer mb-6">
              <div className="border-2 border-dashed border-border-subtle rounded-lg p-8 text-center hover:border-accent-primary transition-colors">
                <Upload className="h-10 w-10 mx-auto mb-3 text-text-tertiary" />
                <p className="text-text-secondary mb-1">Sayfaları yükleyin</p>
                <p className="text-sm text-text-tertiary">Birden fazla dosya seçebilirsiniz</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handlePagesUpload}
              />
            </label>

            {pages.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-text-secondary mb-3">{pages.length} sayfa yüklendi</p>
                <div className="grid grid-cols-4 gap-3">
                  {pages.map((page, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-[3/4] bg-bg-elevated rounded-lg flex items-center justify-center">
                        <FileText className="h-8 w-8 text-text-tertiary" />
                      </div>
                      <button
                        className="absolute -top-2 -right-2 p-1 bg-semantic-error rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePage(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <p className="text-xs text-center mt-1 text-text-tertiary">
                        Sayfa {index + 1}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">
                Geri
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                className="flex-1"
                disabled={pages.length === 0 || uploading}
              >
                {uploading ? 'Yükleniyor...' : 'Yayınla'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
