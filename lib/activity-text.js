// نص الإشعار لكل حدث (نفس النص في الصفحة وفي إشعار الموبايل)
(function (root) {
  var STL = { idea: 'فكرة', copy: 'النص جاهز', design: 'عند المصمم', changes: 'تعديلات مطلوبة', review: 'للمراجعة', approved: 'معتمد', scheduled: 'مجدول', published: 'منشور' };
  var PL = { IG: 'إنستغرام', FB: 'فيسبوك', TT: 'تيك توك', X: 'X', LI: 'لينكدإن', WA: 'واتساب' };
  var FL = { t: 'العنوان', c: 'النص', d: 'الميعاد', tm: 'وقت النشر', b: 'البريف', f: 'الشكل', n: 'المطلوب تجهيزه', targets: 'المنصات', dd: 'تاريخ التسليم', cta: 'الدعوة' };
  var AS = { approved: 'اتعتمدت', changes: 'مطلوب تعديلات', live: 'اتركّبت على المنصة', review: 'رجعت للمراجعة' };
  function q(t) { return '«' + (t || 'منشور') + '»'; }
  function fmt(a) {
    var d = a.data || {}, by = d.by || 'حد من الفريق', k = a.kind, ref = a.ref || '';
    var post = '/#p=' + encodeURIComponent(ref), ad = '/files.html#ad-designs';
    switch (k) {
      case 'post.new': return { title: 'منشور جديد', body: by + ' ضاف ' + q(d.t), url: post };
      case 'post.design': return { title: 'تصميم جديد', body: by + ' رفع ' + (d.n > 1 ? d.n + ' تصاميم' : 'تصميم') + ' لـ' + q(d.t) + (d.to === 'review' ? '، ومستني المراجعة' : ''), url: post };
      case 'post.status': return { title: STL[d.to] || 'تحديث حالة', body: q(d.t) + ' بقى «' + (STL[d.to] || d.to) + '» · ' + by, url: post };
      case 'post.pub': return { title: 'اتنشر', body: q(d.t) + ' اتنشر على ' + (d.pl || []).map(function (x) { return PL[x] || x; }).join(' و') + ' · ' + by, url: post };
      case 'post.edit': return { title: 'تعديل', body: by + ' عدّل ' + (d.f || []).map(function (x) { return FL[x] || x; }).join(' و') + ' في ' + q(d.t), url: post };
      case 'note': return { title: 'ملاحظة جديدة', body: by + ' على ' + q(d.t) + ': ' + (d.x || ''), url: post };
      case 'ad.new': if (d.files === 0) return { title: 'طلب تعديل على تصميم إعلان', body: by + ' رسم ملاحظات على التصميم الحالي لـ' + q(d.title) + (d.note ? ': ' + d.note : ''), url: ad };
        return { title: 'نسخة جديدة لتصميم إعلان', body: by + ' رفع النسخة ' + (d.v || '') + ' من ' + q(d.title) + (d.note ? ': ' + d.note : ''), url: ad };
      case 'ad.status': return { title: 'تصميم إعلان ' + (AS[d.to] || ''), body: q(d.title) + ' · النسخة ' + (d.v || '') + ' ' + (AS[d.to] || d.to) + (d.to === 'changes' && d.note ? ': ' + d.note : '') + ' · ' + by, url: ad };
      default: return { title: 'تحديث', body: by, url: '/files.html' };
    }
  }
  if (typeof module !== 'undefined') module.exports = fmt; else root.activityText = fmt;
})(this);
