// notify-new-chapter Edge Function
// Yeni bölüm eklendiğinde takipçilere bildirim gönder

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { mangaId, chapterId, chapterNumber } = await req.json();

    if (!mangaId || !chapterId) {
      throw new Error('mangaId ve chapterId parametreleri gerekli');
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase yapılandırması eksik');
    }

    // Manga bilgilerini al
    const mangaResponse = await fetch(`${supabaseUrl}/rest/v1/mangas?id=eq.${mangaId}`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (!mangaResponse.ok) {
      throw new Error('Manga bilgileri alınamadı');
    }

    const mangaData = await mangaResponse.json();
    if (!mangaData || mangaData.length === 0) {
      throw new Error('Manga bulunamadı');
    }

    const manga = mangaData[0];

    // Bu mangayı takip eden kullanıcıları bul
    const followersResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_manga_follows?manga_id=eq.${mangaId}`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      }
    );

    if (!followersResponse.ok) {
      throw new Error('Takipçiler alınamadı');
    }

    const followers = await followersResponse.json();

    if (!followers || followers.length === 0) {
      return new Response(JSON.stringify({
        data: {
          message: 'Bu manga için takipçi bulunamadı',
          notificationCount: 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Her takipçi için bildirim oluştur
    const notifications = followers.map(follower => ({
      user_id: follower.user_id,
      manga_id: mangaId,
      chapter_id: chapterId,
      type: 'new_chapter',
      title: 'Yeni Bölüm Eklendi',
      message: `${manga.title} - Bölüm ${chapterNumber || 'yeni'} yayınlandı!`,
      is_read: false
    }));

    // Bildirimleri toplu olarak ekle
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(notifications)
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      throw new Error(`Bildirimler oluşturulamadı: ${errorText}`);
    }

    const createdNotifications = await insertResponse.json();

    return new Response(JSON.stringify({
      data: {
        message: `${createdNotifications.length} takipçiye bildirim gönderildi`,
        notificationCount: createdNotifications.length,
        mangaTitle: manga.title,
        chapterNumber: chapterNumber
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('notify-new-chapter error:', error);

    const errorResponse = {
      error: {
        code: 'NOTIFICATION_FAILED',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
