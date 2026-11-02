// يجهّز مجلد dist للنشر على Vercel ويكتب config.js من متغيرات البيئة
const fs = require('fs'), path = require('path');
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
if (!url || !anonKey) {
  console.error('\n✖ ناقص SUPABASE_URL أو SUPABASE_ANON_KEY في إعدادات Vercel (Environment Variables).');
  console.error('  موجود حالياً: ' + (Object.keys(process.env).filter(k => /SUPABASE/i.test(k)).join(', ') || 'لا شيء') + '\n');
  process.exit(1);
}
fs.rmSync('dist', { recursive: true, force: true });
// الملفات التقيلة (ZIP والفيديو وملف نصوص الأسبوع الأول) ما بتتنسخش في كل نشر عشان مساحة Vercel،
// وبتتحوّل من vercel.json لنسختها في GitHub (المستودع عام)
const HEAVY = /\.(zip|mp4|mov)$/i, HEAVY_FILES = ['files/week1/week1-texts.pdf'];
fs.cpSync('public', 'dist', { recursive: true, filter: function (src) {
  const rel = path.relative('public', src).split(path.sep).join('/');
  return !(HEAVY.test(rel) || HEAVY_FILES.indexOf(rel) >= 0);
} });
fs.writeFileSync(path.join('dist', 'config.js'),
  'window.BOARD_CONFIG=' + JSON.stringify({ url, anonKey }) + ';\n');
console.log('✔ dist جاهز');
