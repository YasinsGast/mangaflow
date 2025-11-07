# MangaFlow Bildirim Sistemi - Migration Uygulama Talimatları

## Adım 1: Supabase Dashboard'a Giriş Yapın

1. https://supabase.com adresine gidin
2. MangaFlow projesini açın (Project ID: ucfcnwoamttfvbzpijlm)

## Adım 2: SQL Editor'ü Açın

1. Sol menüden "SQL Editor" seçeneğine tıklayın
2. "New query" butonuna tıklayın

## Adım 3: Migration SQL'ini Kopyalayın

Aşağıdaki migration dosyasını açın ve içeriğini kopyalayın:
`/workspace/mangaflow/migrations/002_create_notification_system.sql`

Veya direkt bu SQL komutlarını kopyalayın ve SQL Editor'e yapıştırın, sonra "Run" butonuna tıklayın.

## Adım 4: Edge Functions Deploy Edin

Terminal'de şu komutu çalıştırın:

```bash
cd /workspace/mangaflow

# Her edge function için ayrı ayrı deploy et
supabase functions deploy manage-follow
supabase functions deploy mark-notifications-read
supabase functions deploy notify-new-chapter
```

## Test Senaryoları

Migration başarıyla uygulandıktan sonra:

1. **Takip Etme Testi:**
   - Manga detay sayfasına gidin
   - "Takip Et" butonuna tıklayın
   - Butonun "Takip Ediliyor" olarak değiştiğini görmelisiniz

2. **Takip Listesi Testi:**
   - Kütüphane sayfasına gidin
   - "Takip Ettiklerim" sekmesine tıklayın
   - Takip ettiğiniz manga'ların listesini görmelisiniz

3. **Bildirim Testi:**
   - Navbar'da bildirim ikonu (🔔) görünmelidir
   - Yeni bölüm eklendiğinde bildirim almalısınız

## Troubleshooting

Eğer sorun yaşarsanız:

1. **Tablo oluşturma hatası:** SQL Editor'de tabloların mevcut olup olmadığını kontrol edin
2. **RLS hatası:** Policies'lerin doğru uygulandığını kontrol edin
3. **Edge Function hatası:** Supabase logs'larını kontrol edin

## Deployment URL

Frontend: https://wde8jyzxonje.space.minimax.io

