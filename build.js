// يجهّز مجلد dist للنشر على Vercel ويكتب config.js من متغيرات البيئة
const fs = require('fs'), path = require('path');
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (!url || !anonKey) {
  console.error('\n✖ ناقص SUPABASE_URL أو SUPABASE_ANON_KEY في إعدادات Vercel (Environment Variables).\n');
  process.exit(1);
}
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('public', 'dist', { recursive: true });
fs.writeFileSync(path.join('dist', 'config.js'),
  'window.BOARD_CONFIG=' + JSON.stringify({ url, anonKey }) + ';\n');
console.log('✔ dist جاهز');
