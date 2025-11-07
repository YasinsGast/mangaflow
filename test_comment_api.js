const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ucfcnwoamttfvbzpijlm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZmNud29hbXR0ZnZienBpamxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NjIyMDksImV4cCI6MjA3NzUzODIwOX0.ZVwqy9PCLHDPYRVzxofzYFOg5hdDDHmH_VtLHJkNh4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommentAPI() {
  console.log('Testing comment API...');
  
  // Get first manga
  const { data: manga } = await supabase
    .from('mangas')
    .select('id')
    .limit(1)
    .single();
  
  console.log('Manga ID:', manga.id);
  
  // Get comments with user join
  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!comments_user_id_fkey (
        username,
        avatar_url,
        user_role
      )
    `)
    .eq('manga_id', manga.id)
    .is('parent_id', null)
    .limit(3);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\nComments with user data:');
    console.log(JSON.stringify(comments, null, 2));
  }
}

testCommentAPI().catch(console.error);
