const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase keys not loaded correctly.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Connecting to:', supabaseUrl);
  
  // 1. Check empresas
  const { data: emps, error: errEmps } = await supabase.from('empresas').select('*');
  if (errEmps) {
    console.error('Error fetching empresas:', errEmps);
  } else {
    console.log(`\n--- EMPRESAS (${emps.length}) ---`);
    emps.forEach(e => console.log(`ID: ${e.id} | Nombre: ${e.nombre} | WhatsApp: ${e.whatsapp_habilitado}`));
  }

  // 2. Check usuarios
  const { data: usrs, error: errUsrs } = await supabase.from('usuarios').select('*');
  if (errUsrs) {
    console.error('Error fetching usuarios:', errUsrs);
  } else {
    console.log(`\n--- USUARIOS (${usrs.length}) ---`);
    usrs.forEach(u => console.log(`ID: ${u.id} | Email: ${u.email} | Nombre: ${u.nombre} | Rol: ${u.role} | Empresa: ${u.empresa_id}`));
  }

  // 3. Check auth.users
  const { data: authUsers, error: errAuth } = await supabase.auth.admin.listUsers();
  if (errAuth) {
    console.error('Error fetching auth users:', errAuth);
  } else {
    console.log(`\n--- AUTH.USERS (${authUsers.users.length}) ---`);
    authUsers.users.forEach(u => {
      console.log(`ID: ${u.id} | Email: ${u.email} | Confirmed At: ${u.email_confirmed_at} | Meta: ${JSON.stringify(u.user_metadata)}`);
    });
  }

  // 4. Check trigger
  const { data: triggers, error: errTriggers } = await supabase.rpc('get_triggers'); // wait, rpc might not exist. Let's do raw query
  const { data: triggerCheck, error: errTriggerQuery } = await supabase.from('usuarios').select('id').limit(1); // just a connection check
  
  // We can query pg_trigger using a raw RPC or if we don't have RPC, we can query it through a system query?
  // In Supabase client, you cannot run arbitrary SQL unless you define an RPC function.
  // But wait, we can check if handle_new_user function or trigger exists by attempting to fetch something or just inspecting the schemas.
  // Wait, let's write a query using RPC if available, or just tell the user how to check it.
  // Actually, we can check if they created the user, if the trigger is missing, then the user gets created in auth.users but public.usuarios is empty!
  // Let's print this.
}

run();
