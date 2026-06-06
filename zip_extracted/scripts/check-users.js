const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kfiyturknwdfmnjlebxp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_LKKW_EOAU7IDpqeTzMkWdQ_bm3j6Xdx';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Fetching public.usuarios...');
  const { data: usuarios, error } = await supabase.from('usuarios').select('*');
  if (error) {
    console.error('Error fetching users:', error.message);
  } else {
    console.log('Users in public.usuarios:');
    console.log(usuarios);
  }
}

run();
