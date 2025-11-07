# MangaFlow Bildirim Sistemi - Deployment Checklist

## Durum: Frontend TAMAMLANDI ✅ | Backend BEKLEMEDE ⏳

### Frontend Deployment ✅
- **URL:** https://wde8jyzxonje.space.minimax.io
- **Build:** Başarılı (1.16 MB)
- **Status:** READY

---

## Backend Deployment (Manuel Gerekli)

### 1. Database Migration Uygulama

#### Supabase Dashboard Üzerinden:
1. https://supabase.com → MangaFlow projesi
2. SQL Editor → New Query
3. Dosya içeriğini kopyala: `/workspace/mangaflow/migrations/002_create_notification_system.sql`
4. Run butonuna tıkla

#### Beklenen Sonuç:
- ✅ `user_manga_follows` tablosu oluşturuldu
- ✅ `notifications` tablosu oluşturuldu
- ✅ RLS policies uygulandı
- ✅ Performance indexes eklendi

---

### 2. Edge Functions Deployment

#### Üç Edge Function Deploy Edilmeli:

**A) manage-follow**
- Dosya: `/workspace/mangaflow/supabase/functions/manage-follow/index.ts`
- Açıklama: Manga takip etme/bırakma
- Komut: `supabase functions deploy manage-follow`

**B) mark-notifications-read**
- Dosya: `/workspace/mangaflow/supabase/functions/mark-notifications-read/index.ts`
- Açıklama: Bildirimleri okundu işaretle
- Komut: `supabase functions deploy mark-notifications-read`

**C) notify-new-chapter**
- Dosya: `/workspace/mangaflow/supabase/functions/notify-new-chapter/index.ts`
- Açıklama: Yeni bölüm bildirim gönder
- Komut: `supabase functions deploy notify-new-chapter`

#### Terminal'de Tek Komutla:
```bash
cd /workspace/mangaflow
supabase functions deploy manage-follow
supabase functions deploy mark-notifications-read  
supabase functions deploy notify-new-chapter
```

---

## Geliştirilen Özellikler

### Backend (3 Tablo, 3 Edge Function)

#### Tablolar:
1. **user_manga_follows** - Kullanıcı manga takip sistemi
2. **notifications** - Bildirimler sistemi

#### Edge Functions:
1. **manage-follow** - Takip yönetimi (follow/unfollow)
2. **mark-notifications-read** - Bildirim okundu işaretleme
3. **notify-new-chapter** - Yeni bölüm bildirimi

### Frontend (5 Yeni Bileşen + 3 Hook)

#### Hooks:
- `useFollow.ts` - Takip durumu yönetimi
- `useNotifications.ts` - Bildirim yönetimi + Real-time

#### Bileşenler:
- `FollowButton.tsx` - Manga takip butonu
- `NotificationDropdown.tsx` - Bildirim dropdown menü

#### Güncellenen Sayfalar:
- `Navbar.tsx` - Bildirim ikonu eklendi
- `MangaDetailPage.tsx` - Takip Et butonu eklendi
- `LibraryPage.tsx` - "Takip Ettiklerim" sekmesi eklendi

---

## Test Senaryoları

### 1. Takip Etme Testi
1. Manga detay sayfasına git
2. "Takip Et" butonuna tıkla
3. Buton "Takip Ediliyor" olarak değişmeli
4. Toast mesajı görünmeli

### 2. Takip Listesi Testi
1. Kütüphane sayfasına git
2. "Takip Ettiklerim" sekmesine tıkla
3. Takip edilen manga'lar listelenmeli
4. Boşsa uygun empty state görünmeli

### 3. Bildirim Testi
1. Navbar'da bildirim ikonu görünmeli
2. Yeni bölüm eklendiğinde:
   - Bildirim oluşturulmalı
   - Okunmamış sayısı artmalı
   - Real-time güncelleme yapılmalı
3. Bildirime tıklayınca:
   - İlgili bölüme yönlendirmeli
   - Okundu olarak işaretlenmeli

### 4. Real-time Test
1. İki farklı tarayıcıda aynı kullanıcıyla giriş yap
2. Birinde manga takip et
3. Diğerinde takip listesi otomatik güncellenmeli

---

## Teknik Detaylar

### RLS Policies
- **anon ve service_role** için çift rol desteği
- Güvenli kullanıcı bazlı erişim
- Real-time subscription desteği

### Performance
- Database indexler eklendi
- Pagination (50 bildirim)
- Debounced operations

### Real-time Features
- Supabase Realtime subscriptions
- Anlık bildirim güncellemeleri
- Live takip durumu

---

## Troubleshooting

### Migration Hataları:
- **Tablo zaten var:** Normal, IF NOT EXISTS kullanıldı
- **Policy zaten var:** DROP POLICY IF EXISTS kullanıldı
- **RLS hatası:** auth.uid() doğru çalıştığını kontrol et

### Edge Function Hataları:
- **500 Error:** RLS policies kontrol et
- **CORS Error:** corsHeaders doğru ayarlandı mı?
- **Auth Error:** SUPABASE_SERVICE_ROLE_KEY set edildi mi?

### Frontend Hataları:
- **Bildirim gözükmüyor:** useNotifications hook çalışıyor mu?
- **Takip butonu çalışmıyor:** Edge function deploy edildi mi?
- **Real-time çalışmıyor:** Supabase Realtime enabled mi?

---

## Deployment Sonrası Kontrol

✅ Migration uygulandı mı?
✅ Edge functions deploy edildi mi?
✅ Frontend deploy edildi mi?
✅ Test kullanıcısı ile test edildi mi?
✅ Real-time çalışıyor mu?

