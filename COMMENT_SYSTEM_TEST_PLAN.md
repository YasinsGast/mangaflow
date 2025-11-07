# MangaFlow Yorum Sistemi - Test Senaryoları

## GENEL BİLGİLER
- **Production URL**: https://fc0oo14vnp8k.space.minimax.io
- **Test Sayfası**: Herhangi bir manga detay sayfası
- **Tamamlanma**: 2025-11-04 07:50

## TEST SENARYOLARI

### 1. YORUM GÖRÜNTÜLEME (Anonim Kullanıcı)
**Amaç**: Yorum bölümünün görünür olduğunu doğrulama

- [ ] Manga detay sayfasına git
- [ ] Sayfayı aşağı kaydır
- [ ] "Yorumlar" başlığı görünüyor mu?
- [ ] Yorum sayısı gösteriliyor mu?
- [ ] Mevcut yorumlar listeleniyor mu?
- [ ] Empty state (yorum yoksa) gösteriliyor mu?
- [ ] "Yorum yapmak için giriş yapın" mesajı var mı?

### 2. YORUM EKLEME (Giriş Yapmış Kullanıcı)
**Amaç**: Yorum yazma ve gönderme işlemini test etme

- [ ] Kullanıcı girişi yap
- [ ] Manga detay sayfasına git
- [ ] Yorum yazma formunu bul
- [ ] Textarea'ya yorum yaz (örn: "Harika bir manga!")
- [ ] Karakter sayacı çalışıyor mu? (x/500)
- [ ] "Spoiler içerir" checkbox'ı işaretle/kaldır
- [ ] "Gönder" butonuna tıkla
- [ ] Toast notification: "Yorum başarıyla eklendi" görünüyor mu?
- [ ] Yeni yorum listede görünüyor mu?
- [ ] Form temizlendi mi?

### 3. THREADED REPLIES (Yanıtlama)
**Amaç**: Nested reply sistemini test etme

- [ ] Mevcut bir yorumun altında "Yanıtla" butonunu tıkla
- [ ] Reply formu açıldı mı?
- [ ] Reply yaz (örn: "Katılıyorum!")
- [ ] "Yanıtla" butonuna tıkla
- [ ] Reply, ana yorumun altında görünüyor mu?
- [ ] Reply indented (girintili) görünüyor mu?
- [ ] Ana yorumda reply count güncellendi mi? (örn: "Yanıtla (1)")
- [ ] İptal butonu çalışıyor mu?

### 4. LIKE/DISLIKE SİSTEMİ
**Amaç**: Beğeni sistemini test etme

**Like İşlemi:**
- [ ] Bir yorumun "👍" butonuna tıkla
- [ ] Buton rengi mavi oldu mu?
- [ ] Like count arttı mı?
- [ ] Tekrar tıkla (unlike)
- [ ] Like count azaldı mı?
- [ ] Buton gri renk oldu mu?

**Dislike İşlemi:**
- [ ] Bir yorumun "👎" butonuna tıkla
- [ ] Buton rengi kırmızı oldu mu?
- [ ] Like count azaldı mı? (negatif)
- [ ] Tekrar tıkla (remove dislike)
- [ ] Like count arttı mı?

**Like/Dislike Değişimi:**
- [ ] Bir yorumu beğen (👍)
- [ ] Ardından dislike'a tıkla (👎)
- [ ] Like count 2 puan azaldı mı? (like → dislike = -2)
- [ ] Buton renkleri doğru mu?

### 5. SPOILER BLUR ÖZELLİĞİ
**Amaç**: Spoiler gizleme/gösterme işlemini test etme

- [ ] Yeni yorum yaz, "Spoiler içerir" işaretle
- [ ] Yorum gönder
- [ ] Yorum içeriği bulanık (blur) görünüyor mu?
- [ ] "Spoiler içerir - Görmek için tıklayın" butonu var mı?
- [ ] Butona tıkla
- [ ] İçerik net görünüyor mu?
- [ ] Spoiler olmayan yorumlar normal görünüyor mu?

### 6. YORUM DÜZENLEME (Kendi Yorumun)
**Amaç**: Kullanıcının kendi yorumunu düzenlemesini test etme

- [ ] Kendi yorumunu bul
- [ ] Sağ üstteki "⋮" (3 nokta) menüye tıkla
- [ ] "Düzenle" seçeneğini tıkla
- [ ] Textarea açıldı mı?
- [ ] Yorum içeriğini değiştir
- [ ] Spoiler checkbox'ını değiştir
- [ ] "Kaydet" butonuna tıkla
- [ ] Toast: "Yorum güncellendi" görünüyor mu?
- [ ] Değişiklikler yansıdı mı?
- [ ] "İptal" butonu çalışıyor mu?

### 7. YORUM SİLME (Kendi Yorumun)
**Amaç**: Kullanıcının kendi yorumunu silmesini test etme

- [ ] Kendi yorumunu bul
- [ ] "⋮" menüye tıkla
- [ ] "Sil" seçeneğini tıkla
- [ ] Confirm dialog açıldı mı? ("Bu yorumu silmek istediğinize emin misiniz?")
- [ ] "OK" tıkla
- [ ] Toast: "Yorum silindi" görünüyor mu?
- [ ] Yorum listeden silindi mi?
- [ ] Reply count'lar güncellendi mi? (parent yorum için)
- [ ] İptal edebiliyor musun?

### 8. KARAKTER LİMİTİ (500 Karakter)
**Amaç**: 500 karakter limitini test etme

- [ ] Yorum formuna 450 karakter yaz
- [ ] Karakter sayacı sarı renk oldu mu? (450/500)
- [ ] 50 karakter daha yaz (toplam 500)
- [ ] Daha fazla karakter yazamıyor musun?
- [ ] 501. karakter yazılmıyor mu?
- [ ] "Gönder" butonu çalışıyor mu?
- [ ] Toast error: "Yorum 500 karakterden uzun olamaz" görünüyor mu? (eğer bypass edilirse)

### 9. ROL BADGE'LERİ
**Amaç**: Admin/Moderator/Fansub badge'lerini test etme

- [ ] Farklı rollerde kullanıcı yorumları var mı?
- [ ] Admin yorumunda "Admin" badge'i var mı? (kırmızı)
- [ ] Moderator yorumunda "Moderatör" badge'i var mı? (mor)
- [ ] Fansub yorumunda "Fansub" badge'i var mı? (mavi)
- [ ] Normal kullanıcı yorumunda badge yok mu?

### 10. TIME AGO FORMATTING
**Amaç**: Tarih gösterimini test etme

- [ ] Yeni yorum yaz
- [ ] "birkaç saniye önce" yazıyor mu?
- [ ] Eski yorumlarda doğru zaman gösterimi var mı?
  - "X dakika önce"
  - "X saat önce"
  - "X gün önce"
- [ ] Türkçe format doğru mu?

### 11. LOADING STATES
**Amaç**: Yükleme durumlarını test etme

- [ ] Sayfa ilk yüklenirken loading spinner var mı?
- [ ] Yorum gönderirken "Gönderiliyor..." yazıyor mu?
- [ ] Yorum gönderirken buton disabled mı?
- [ ] Like/dislike tıklarken butonlar disabled mı?

### 12. AUTH KONTROLÜ (Giriş Yapmadan)
**Amaç**: Giriş yapmayan kullanıcıların yorum yapamamasını test etme

- [ ] Çıkış yap (logout)
- [ ] Manga detay sayfasına git
- [ ] "Yorum yapmak için giriş yapın" mesajı var mı?
- [ ] Yorum formu görünmüyor mu?
- [ ] Like/dislike butonları disabled mı?
- [ ] "Yanıtla" butonları disabled mı?

### 13. RESPONSIVE DESIGN
**Amaç**: Mobil ve tablet görünümü test etme

**Desktop (1920x1080):**
- [ ] Yorum kartları düzgün görünüyor mu?
- [ ] Reply indentation doğru mu?
- [ ] Tüm butonlar görünüyor mu?

**Tablet (768px):**
- [ ] Layout kırılmıyor mu?
- [ ] Butonlar erişilebilir mi?
- [ ] Textarea genişliği uygun mu?

**Mobile (375px):**
- [ ] Yorumlar tek sütun mu?
- [ ] Butonlar tıklanabilir mi?
- [ ] Menu açılıyor mu?
- [ ] Textarea kullanılabilir mi?

### 14. NESTED REPLIES LİMİTİ
**Amaç**: Reply'lerin sadece top-level yorumlara yapılabildiğini test etme

- [ ] Top-level yoruma "Yanıtla" butonu var mı?
- [ ] Reply'e "Yanıtla" butonu YOK mu?
- [ ] Reply'ler sadece 1 seviye deep mi?

### 15. EMPTY STATE
**Amaç**: Yorum olmadığında empty state gösterimini test etme

- [ ] Yorum olmayan bir manga bul (veya tüm yorumları sil)
- [ ] "Henüz yorum yok" mesajı görünüyor mu?
- [ ] "İlk yorumu siz yapın!" alt mesajı var mı?
- [ ] İkon (MessageSquare) gösteriliyor mu?

## BEKLENEN SONUÇLAR

### Başarı Kriterleri:
- Tüm test senaryoları PASS
- Yorum ekleme/silme/düzenleme çalışıyor
- Like/dislike sistemi çalışıyor
- Threaded replies çalışıyor
- Spoiler blur çalışıyor
- RLS güvenlik aktif
- Loading states düzgün
- Responsive design çalışıyor

### Bilinen Limitler:
- Reply sadece 1 seviye (reply to reply yok)
- Karakter limiti: 500
- Sadece giriş yapmış kullanıcılar yorum yapabilir
- Kullanıcı sadece kendi yorumlarını düzenleyebilir/silebilir
- Admin/Moderator tüm yorumları yönetebilir

## NOT
Manuel test gerekli çünkü:
- Real-time kullanıcı etkileşimleri
- Auth state kontrolü
- UI/UX deneyimi
- Form validasyonları
- Spoiler reveal interaction
