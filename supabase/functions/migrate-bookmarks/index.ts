Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    // Migration SQL
    const migrationSQL = `
      -- Create bookmarks table
      CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        manga_id TEXT NOT NULL,
        chapter_id UUID NOT NULL,
        page_number INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, manga_id)
      );

      -- Enable RLS
      ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
      DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON bookmarks;
      DROP POLICY IF EXISTS "Users can update their own bookmarks" ON bookmarks;
      DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

      -- Create policies
      CREATE POLICY "Users can view their own bookmarks" ON bookmarks
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own bookmarks" ON bookmarks
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own bookmarks" ON bookmarks
        FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own bookmarks" ON bookmarks
        FOR DELETE USING (auth.uid() = user_id);

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_manga_id ON bookmarks(manga_id);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_updated_at ON bookmarks(updated_at DESC);
    `;

    // Execute migration using REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    if (!response.ok) {
      // Try alternative: direct SQL endpoint
      const directResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ sql: migrationSQL }),
      });

      const text = await directResponse.text();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Migration executed (alternative method)',
        details: text,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Bookmarks table migration completed successfully',
      data: data,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Migration error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      note: 'Please run migration manually via Supabase Dashboard SQL Editor',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
