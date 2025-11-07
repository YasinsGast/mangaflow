// manage-follow Edge Function
// Manga takip etme/bırakma işlemleri

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { mangaId, action } = await req.json();

    if (!mangaId || !action) {
      throw new Error('mangaId ve action parametreleri gerekli');
    }

    if (!['follow', 'unfollow'].includes(action)) {
      throw new Error('action sadece "follow" veya "unfollow" olabilir');
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase yapılandırması eksik');
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Giriş yapmalısınız');
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token and get user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    });

    if (!userResponse.ok) {
      throw new Error('Geçersiz kimlik doğrulama');
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    if (action === 'follow') {
      // Takip et
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_manga_follows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          manga_id: mangaId
        })
      });

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        // Duplicate check (already following)
        if (errorText.includes('duplicate key')) {
          return new Response(JSON.stringify({
            data: { message: 'Bu mangayı zaten takip ediyorsunuz' }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw new Error(`Takip işlemi başarısız: ${errorText}`);
      }

      const followData = await insertResponse.json();

      // Manga bilgilerini al
      const mangaResponse = await fetch(`${supabaseUrl}/rest/v1/mangas?id=eq.${mangaId}`, {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      });

      let mangaTitle = 'Manga';
      if (mangaResponse.ok) {
        const mangaData = await mangaResponse.json();
        if (mangaData && mangaData.length > 0) {
          mangaTitle = mangaData[0].title;
        }
      }

      return new Response(JSON.stringify({
        data: {
          follow: followData[0],
          message: `${mangaTitle} takip listesine eklendi`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // Takibi bırak
      const deleteResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_manga_follows?user_id=eq.${userId}&manga_id=eq.${mangaId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(`Takip bırakma işlemi başarısız: ${errorText}`);
      }

      return new Response(JSON.stringify({
        data: { message: 'Takip listesinden çıkarıldı' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('manage-follow error:', error);

    const errorResponse = {
      error: {
        code: 'FOLLOW_OPERATION_FAILED',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
