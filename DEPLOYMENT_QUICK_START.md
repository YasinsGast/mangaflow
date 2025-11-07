# MangaFlow - Hızlı Deployment Rehberi

## 🚀 En Hızlı Yol: Vercel (5 Dakika)

### 1. GitHub'a Yükle
```bash
cd mangaflow
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI_ADI/mangaflow.git
git push -u origin main
```

### 2. Vercel'e Bağla
1. https://vercel.com → Sign up (GitHub ile)
2. "Add New Project" → GitHub repo'yu seç
3. Environment Variables ekle:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. "Deploy" butonuna tıkla
5. ✅ Hazır! URL: `https://mangaflow.vercel.app`

### 3. Custom Domain (Opsiyonel)
- Settings → Domains → Domain ekle
- DNS ayarlarını yap
- SSL otomatik aktif olur

---

## 📋 Environment Variables

Supabase Dashboard → Settings → API:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon/public key** → `VITE_SUPABASE_ANON_KEY`

---

## 🎯 Diğer Seçenekler

- **Netlify:** `netlify.toml` dosyası hazır
- **Cloudflare Pages:** `public/_redirects` dosyası hazır
- **GitHub Pages:** `.github/workflows/deploy.yml` hazır

Detaylı rehber için: `UCRETSIZ_YAYINLAMA_REHBERI.md`

---

## ✅ Checklist

- [ ] GitHub'a yüklendi
- [ ] Vercel/Netlify/Cloudflare hesabı oluşturuldu
- [ ] Environment variables eklendi
- [ ] Build başarılı
- [ ] Site çalışıyor
- [ ] Custom domain eklendi (opsiyonel)

---

**Toplam Maliyet: $0** 💰

