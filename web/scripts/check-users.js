const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY antes de ejecutar este script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Fetching public.usuarios...');
  const { data: usuarios, error } = await supabase.from('usuarios').select('id, email, nombre, role, empresa_id');
  if (error) {
    console.error('Error fetching users:', error.message);
    process.exit(1);
  }
  console.log(usuarios);
}

run();
