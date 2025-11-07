// mark-notifications-read Edge Function
// Bildirimleri okundu olarak işaretle

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
    const { notificationIds, markAll } = await req.json();

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

    if (markAll) {
      // Tüm bildirimleri okundu işaretle
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/notifications?user_id=eq.${userId}&is_read=eq.false`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            is_read: true
          })
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Bildirimler güncellenemedi: ${errorText}`);
      }

      const updatedData = await updateResponse.json();

      return new Response(JSON.stringify({
        data: {
          count: updatedData.length,
          message: 'Tüm bildirimler okundu olarak işaretlendi'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Belirli bildirimleri okundu işaretle
      const idsParam = notificationIds.map(id => `"${id}"`).join(',');
      
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/notifications?id=in.(${idsParam})&user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            is_read: true
          })
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Bildirimler güncellenemedi: ${errorText}`);
      }

      const updatedData = await updateResponse.json();

      return new Response(JSON.stringify({
        data: {
          count: updatedData.length,
          message: `${updatedData.length} bildirim okundu olarak işaretlendi`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      throw new Error('notificationIds veya markAll parametresi gerekli');
    }

  } catch (error) {
    console.error('mark-notifications-read error:', error);

    const errorResponse = {
      error: {
        code: 'MARK_READ_FAILED',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
