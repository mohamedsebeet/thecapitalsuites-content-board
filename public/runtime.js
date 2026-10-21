/* طبقة تشغيل اللوحة خارج Claude
   توفّر window.claude.use('user'|'db') بنفس الواجهة اللي اللوحة الأصلية متعودة عليها،
   لكن فوق Supabase (تسجيل دخول برابط على الإيميل + قاعدة بيانات + تحديث لحظي). */
(function () {
  'use strict';
  var CFG = window.BOARD_CONFIG || {};
  var sb = window.supabase.createClient(CFG.url, CFG.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  var SESSION = null, ROLE = null, MEMBERS = {}, ACCESS = { perms: [], platforms: null };

  /* ---------- الصلاحيات (نفس اللي في قاعدة البيانات: supabase/04-permissions.sql) ---------- */
  var PERMS = [
    { g: 'غرفة التشغيل: إيه اللي يشوفه', items: [
      ['view.campaigns', 'الحملات والصرف ونتائج المبيعات والإعلانات'],
      ['view.plans', 'الخطط والميديا بلان والميزانية'],
      ['view.decks', 'العروض والتقارير للإدارة'],
      ['view.publish', 'جدول النشر']] },
    { g: 'لوحة النشر: المحتوى', items: [
      ['posts.create', 'إضافة منشورات وعناصر جديدة'],
      ['posts.edit', 'تعديل المنشور بالكامل (النص والبريف والمعاد)'],
      ['posts.delete', 'حذف المنشورات والملاحظات'],
      ['posts.status', 'تحريك الحالة (فكرة، نص، تصميم، مراجعة)'],
      ['posts.approve', 'الاعتماد وطلب التعديلات'],
      ['notes.write', 'كتابة ملاحظات']] },
    { g: 'التصاميم', items: [
      ['designs.upload', 'رفع التصاميم وروابط ملفات المصدر'],
      ['designs.delete', 'حذف التصاميم المرفوعة']] },
    { g: 'النشر', items: [
      ['publish.schedule', 'اختيار المنصات وتغيير مواعيد النشر'],
      ['publish.mark', 'تعديل نص كل منصة وتعليم «اتنشر» وروابط المنشورات']] },
    { g: 'الإدارة', items: [
      ['kpis.edit', 'إدخال أرقام المبيعات (محادثات، معاينات، حجوزات)'],
      ['team.manage', 'إضافة أعضاء وتعديل صلاحياتهم']] }
  ];
  var ALL_PERMS = []; PERMS.forEach(function (g) { g.items.forEach(function (i) { ALL_PERMS.push(i[0]); }); });
  var PRESETS = {
    owner: ALL_PERMS.slice(),
    manager: ALL_PERMS.filter(function (k) { return k !== 'team.manage'; }),
    writer: ['view.publish', 'posts.create', 'posts.edit', 'posts.status', 'notes.write'],
    designer: ['posts.status', 'designs.upload', 'designs.delete', 'notes.write'],
    publisher: ['view.publish', 'publish.mark', 'notes.write'],
    reviewer: ['view.campaigns', 'view.plans', 'view.decks', 'view.publish', 'posts.approve', 'notes.write'],
    viewer: ['view.campaigns', 'view.plans', 'view.decks', 'view.publish']
  };
  PRESETS.team = PRESETS.designer;
  // لينكدإن متوقف مؤقتاً (مشكلة في الحساب)، ويرجع بإضافته هنا تاني
  var PLATS = [['IG', 'إنستغرام'], ['FB', 'فيسبوك'], ['TT', 'تيك توك'], ['X', 'X']];
  var WRITE_PERMS = ['posts.create', 'posts.edit', 'posts.status', 'posts.approve', 'designs.upload', 'designs.delete', 'notes.write', 'publish.schedule', 'publish.mark'];
  function can(p) { return ROLE === 'owner' || ACCESS.perms.indexOf(p) >= 0; }
  function canAny(list) { return list.some(can); }
  function permsOf(m) { return m.role === 'owner' ? PRESETS.owner : (Array.isArray(m.perms) ? m.perms : (PRESETS[m.role] || [])); }
  function loadAccess() {
    return sb.rpc('my_access').then(function (r) {
      if (!r.error && r.data) { ACCESS = { perms: r.data.perms || [], platforms: r.data.platforms || null, custom: !!r.data.custom }; if (r.data.role) ROLE = r.data.role; }
      else ACCESS = { perms: (PRESETS[ROLE] || []).slice(), platforms: null };
    }, function () { ACCESS = { perms: (PRESETS[ROLE] || []).slice(), platforms: null }; });
  }

  /* ---------- شاشة الدخول ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#gate{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:var(--bg,#F7F4EC);direction:rtl;font-family:inherit;padding:16px}' +
    '#gate .card{width:100%;max-width:380px;background:#fff;border:1px solid #E5DFD0;border-radius:14px;padding:28px 24px;box-shadow:0 10px 30px rgba(31,36,39,.08)}' +
    '#gate h1{font-size:20px;margin:0 0 6px;color:#1F2427}#gate p{margin:0 0 18px;color:#5A6166;font-size:14px;line-height:1.7}' +
    '#gate input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #CFC6B2;border-radius:10px;font:inherit;font-size:15px;direction:ltr;text-align:left}' +
    '#gate button{margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;background:#1F2427;color:#F7F4EC;font:inherit;font-size:15px;cursor:pointer}' +
    '#gate button[disabled]{opacity:.6}#gate .msg{margin-top:14px;font-size:14px;color:#8C6A1E;line-height:1.7}' +
    '#gate .bar{height:3px;background:#C29B3C;width:48px;border-radius:2px;margin-bottom:18px}' +
    '#team-dlg{position:fixed;inset:0;z-index:9998;background:rgba(31,36,39,.45);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl}' +
    '#team-dlg .card{width:100%;max-width:760px;max-height:85vh;overflow:auto;background:#fff;border-radius:14px;padding:22px}' +
    '#team-dlg h2{margin:0 0 12px;font-size:18px}#team-dlg table{width:100%;border-collapse:collapse;font-size:14px}' +
    '#team-dlg td{padding:8px 4px;border-bottom:1px solid #EEE8DA}#team-dlg input.nm{width:100%;box-sizing:border-box;border:1px solid transparent;background:#FBF8F1;padding:6px 8px}#team-dlg input.nm:focus{border-color:#C29B3C;outline:0;background:#fff}#team-dlg td.e{direction:ltr;text-align:left}' +
    '#team-dlg .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}#team-dlg input,#team-dlg select{padding:9px 10px;border:1px solid #CFC6B2;border-radius:8px;font:inherit;font-size:14px}' +
    '#team-dlg input.e{direction:ltr;flex:2 1 200px}#team-dlg input.n{flex:1 1 120px}' +
    '#team-dlg button{padding:9px 14px;border:0;border-radius:8px;background:#1F2427;color:#fff;font:inherit;cursor:pointer}' +
    '#team-dlg button.x{background:none;color:#9A3B2E;padding:4px 8px}#team-dlg .close{background:#EEE8DA;color:#1F2427}' +
    '#files-link{margin-inline-start:8px;padding:6px 12px;border:1px solid #C29B3C;border-radius:999px;font-size:13px;text-decoration:none;color:inherit;white-space:nowrap}#files-link:hover{background:rgba(194,155,60,.15)}' +
    '#team-dlg .hint{font-size:13px;color:#5A6166;line-height:1.7;margin:0 0 12px}#team-dlg .mb{border:1px solid #EEE8DA;border-radius:10px;padding:10px 12px;margin-bottom:8px}#team-dlg .mh{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#team-dlg .mh .nm{flex:1 1 140px;width:auto}#team-dlg .mh .e{direction:ltr;font-size:13px;color:#5A6166;flex:1 1 160px}#team-dlg .rb{font-size:13px;color:#8C6A1E;font-weight:600}#team-dlg .sum{display:block;font-size:12.5px;color:#5A6166;margin-top:6px}#team-dlg .sum b{color:#8C6A1E}#team-dlg button.tg{background:#F4EFE3;color:#1F2427;border:1px solid #E5DFD0}#team-dlg .pp{margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}#team-dlg fieldset{border:1px solid #EEE8DA;border-radius:8px;padding:8px 10px;margin:0}#team-dlg legend{font-size:12.5px;font-weight:700;color:#8C6A1E;padding:0 4px}#team-dlg fieldset label{display:flex;gap:6px;align-items:flex-start;font-size:13px;line-height:1.6;padding:3px 0}#team-dlg fieldset input{padding:0;margin-top:4px}#team-dlg .pp .row{grid-column:1/-1;margin-top:0;align-items:center}#team-dlg .sv{font-size:13px;color:#2E7D4F}#team-dlg select:disabled,#team-dlg input:disabled{opacity:.7}#team-dlg form.add select{flex:1 1 100%}' +
    '#team-btn{margin-inline-start:8px;padding:6px 12px;border:1px solid #CFC6B2;border-radius:999px;background:transparent;font:inherit;font-size:13px;cursor:pointer;color:inherit}';
  document.head.appendChild(css);

  function domReady(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function gate(html) {
    var g = document.getElementById('gate');
    if (!g) { g = document.createElement('div'); g.id = 'gate'; document.body.appendChild(g); }
    g.innerHTML = '<div class="card"><div class="bar"></div>' + html + '</div>';
    return g;
  }
  function closeGate() { var g = document.getElementById('gate'); if (g) g.remove(); }

  function showLogin(note) {
    var g = gate('<h1>لوحة النشر</h1><p>ذا كابيتال سويتس · تقويم المحتوى<br>اكتب إيميلك ونبعتلك رابط دخول.</p>' +
      '<form id="gate-f"><input id="gate-e" type="email" required placeholder="name@example.com" autocomplete="email">' +
      '<button id="gate-b">ابعت رابط الدخول</button></form><div class="msg" id="gate-m">' + (note || '') + '</div>');
    g.querySelector('#gate-f').onsubmit = function (ev) {
      ev.preventDefault();
      var e = g.querySelector('#gate-e').value.trim(), b = g.querySelector('#gate-b'), m = g.querySelector('#gate-m');
      b.disabled = true; m.textContent = '';
      sb.auth.signInWithOtp({ email: e, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        b.disabled = false;
        m.textContent = r.error ? 'ما قدرنا نبعت الرابط: ' + r.error.message : 'بعتنالك رابط الدخول على ' + e + '. افتحه من نفس الجهاز.';
      });
    };
  }

  function showDenied(email) {
    var g = gate('<h1>مالك صلاحية على اللوحة</h1><p>الإيميل <b dir="ltr">' + esc(email) + '</b> مش مضاف في فريق اللوحة. اطلب من مدير المحتوى يضيفك، وبعدين حدّث الصفحة.</p><button id="gate-out">خروج</button>');
    g.querySelector('#gate-out').onclick = function () { sb.auth.signOut().then(function () { location.reload(); }); };
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  /* ---------- الجلسة والدور ---------- */
  var readyResolve;
  var ready = new Promise(function (r) { readyResolve = r; });

  function loadMembers() {
    return sb.from('members').select('*').then(function (r) {
      MEMBERS = {}; (r.data || []).forEach(function (m) { MEMBERS[m.email.toLowerCase()] = m; });
      return MEMBERS;
    });
  }

  function start(session) {
    SESSION = session;
    var email = session.user.email;
    return sb.rpc('my_role').then(function (r) {
      if (r.data) return r.data;
      return sb.rpc('claim_owner').then(function (c) { return c.data || null; });
    }).then(function (role) {
      if (!role) { domReady(function () { showDenied(email); }); return; }
      ROLE = role;
      return loadAccess().then(loadMembers).then(function () { domReady(function () { closeGate(); readyResolve(); addFilesLink(); addTeamButton(); startBell(); }); });
    });
  }

  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session) start(r.data.session);
    else domReady(function () {
      var h = location.hash || '';
      showLogin(/error_description=/.test(h) ? 'الرابط انتهى أو اتستخدم قبل كده. اطلب رابط جديد.' : '');
    });
  });
  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === 'SIGNED_IN' && session && !SESSION) { start(session); if (/access_token=|error_description=|type=magiclink/.test(location.hash)) history.replaceState(null, '', location.pathname); }
    if (ev === 'SIGNED_OUT') location.reload();
  });

  /* ---------- user ---------- */
  function avatar(name) {
    var ch = (name || '؟').trim().charAt(0);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#1F2427"/><text x="32" y="41" font-size="28" text-anchor="middle" fill="#E2C466" font-family="Tahoma,sans-serif">' + esc(ch) + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  var userApi = {
    me: function () {
      var email = SESSION.user.email.toLowerCase(), m = MEMBERS[email] || {};
      var name = m.name || email.split('@')[0];
      return Promise.resolve({ id: email, name: name, isOwner: can('posts.edit'), canEdit: canAny(WRITE_PERMS), avatarUrl: avatar(name) });
    },
    can: function (what) { return Promise.resolve(what === 'data.write' ? canAny(WRITE_PERMS) : true); },
    profiles: function (ids) {
      var out = {};
      (ids || []).forEach(function (id) {
        var m = id && MEMBERS[String(id).toLowerCase()];
        if (m) out[id] = { name: m.name || m.email.split('@')[0] };
      });
      return Promise.resolve(out);
    }
  };

  /* ---------- db ---------- */
  function err(e) {
    var x = new Error((e && e.message) || 'write failed');
    if (e && (e.code === '42501' || /row-level security|permission|only change/i.test(e.message || ''))) x.code = 'invalid_argument';
    return x;
  }
  function unwrap(r) { if (r.error) throw err(r.error); return r.data; }
  function parse(path) {
    var s = path.split('/');
    if (s[0] !== 'posts') throw new Error('unknown collection ' + path);
    return s.length >= 3 ? { kind: 'notes', postId: s[1] } : { kind: 'posts', id: s[1] };
  }
  function rid() { return Math.random().toString(36).slice(2, 12) + Date.now().toString(36); }
  function snap(rows) {
    return { docs: rows.map(function (r) { return { id: r.id, data: function () { return r.data || {}; } }; }) };
  }

  function Query(path) { this.path = path; this.ord = null; this.lim = 1000; }
  Query.prototype.orderBy = function (f, dir) { this.ord = { f: f, asc: dir !== 'desc' }; return this; };
  Query.prototype.limit = function (n) { this.lim = n; return this; };
  Query.prototype.fetch = function () {
    var t = parse(this.path), q;
    if (t.kind === 'notes') q = sb.from('notes').select('id,data,at').eq('post_id', t.postId).order('at', { ascending: true });
    else q = sb.from('posts').select('id,data');
    return q.limit(this.lim).then(unwrap).then(function (rows) {
      if (this.ord && t.kind === 'posts') {
        var f = this.ord.f, asc = this.ord.asc;
        rows.sort(function (a, b) { var x = (a.data || {})[f], y = (b.data || {})[f]; return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1); });
      }
      return rows;
    }.bind(this));
  };
  Query.prototype.onSnapshot = function (cb, onErr) {
    var self = this, t = parse(this.path), alive = true, timer = null;
    function pull() { self.fetch().then(function (rows) { if (alive) cb(snap(rows)); }).catch(function (e) { if (alive && onErr) onErr(e); }); }
    function soon() { clearTimeout(timer); timer = setTimeout(pull, 150); }
    pull();
    var opts = t.kind === 'notes'
      ? { event: '*', schema: 'public', table: 'notes', filter: 'post_id=eq.' + t.postId }
      : { event: '*', schema: 'public', table: 'posts' };
    var ch = sb.channel('c-' + rid()).on('postgres_changes', opts, soon).subscribe();
    var onFocus = function () { if (document.visibilityState === 'visible') soon(); };
    document.addEventListener('visibilitychange', onFocus);
    return function () { alive = false; clearTimeout(timer); sb.removeChannel(ch); document.removeEventListener('visibilitychange', onFocus); };
  };
  Query.prototype.add = function (obj) {
    var t = parse(this.path);
    if (t.kind !== 'notes') return Promise.reject(new Error('add only supported for notes'));
    var id = rid();
    return sb.from('notes').insert({ id: id, post_id: t.postId, data: obj, at: obj.at || new Date().toISOString() })
      .then(unwrap).then(function () { return { id: id }; });
  };

  function Doc(path) { this.t = parse(path); }
  Doc.prototype.update = function (patch) {
    return sb.rpc('merge_post', { p_id: this.t.id, p_patch: patch }).then(unwrap);
  };
  Doc.prototype.set = function (data) {
    return sb.from('posts').upsert({ id: this.t.id, data: data, updated_at: new Date().toISOString() }).then(unwrap);
  };
  Doc.prototype.delete = function () { return sb.from('posts').delete().eq('id', this.t.id).then(unwrap); };

  var dbApi = {
    collection: function (p) { return new Query(p); },
    doc: function (p) { return new Doc(p); }
  };

  /* ---------- إدارة الفريق (مدير المحتوى فقط) ---------- */
  var ROLE_AR = { owner: 'مدير المحتوى', manager: 'مشرف', writer: 'كاتب محتوى', designer: 'مصمم', team: 'مصمم', publisher: 'مسؤول النشر', reviewer: 'اعتماد (الإدارة)', viewer: 'اطلاع فقط' };
  var ROLE_HINT = {
    manager: 'كل حاجة ما عدا إدارة الفريق',
    writer: 'يضيف ويعدّل المنشورات ويحرّك الحالة',
    designer: 'يرفع التصاميم ويحوّلها للمراجعة',
    publisher: 'ينشر ويعلّم «اتنشر» ويضيف الروابط',
    reviewer: 'يعتمد أو يطلب تعديلات، ويشوف الحملات والعروض',
    viewer: 'يشوف بس، من غير أي تعديل'
  };
  var ROLE_ORDER = ['manager', 'writer', 'designer', 'publisher', 'reviewer', 'viewer'];
  function roleLabel() { return (ROLE_AR[ROLE] || '') + (ACCESS.custom ? ' · مخصص' : ''); }
  function addFilesLink() {
    var who = document.getElementById('who');
    if (!who || document.getElementById('files-link') || /files\.html$/.test(location.pathname)) return;
    var a = document.createElement('a'); a.id = 'files-link'; a.href = 'files.html'; a.textContent = 'غرفة التشغيل';
    who.parentNode.insertBefore(a, who.nextSibling);
    if (!/simple\.html$/.test(location.pathname)) { var sa = document.createElement('a'); sa.id = 'simple-link'; sa.href = 'simple.html'; sa.textContent = 'اللوحة المبسطة'; sa.style.cssText = 'margin-inline-start:8px;padding:6px 12px;border:1px solid #C29B3C;border-radius:999px;font-size:13px;text-decoration:none;color:inherit;white-space:nowrap'; who.parentNode.insertBefore(sa, a.nextSibling); }
  }
  function addTeamButton() {
    if (!can('team.manage')) return;
    var who = document.getElementById('who');
    if (!who || document.getElementById('team-btn')) return;
    var b = document.createElement('button'); b.id = 'team-btn'; b.type = 'button'; b.textContent = 'الفريق والصلاحيات';
    b.onclick = openTeam; who.parentNode.insertBefore(b, who.nextSibling);
  }
  function refreshWho() {
    var w = document.getElementById('who'); if (!w) return;
    var n = w.querySelector('span'); var m = MEMBERS[SESSION.user.email.toLowerCase()];
    if (n && m) n.textContent = m.name || m.email.split('@')[0];
  }
  function openTeam() {
    var d = document.createElement('div'); d.id = 'team-dlg';
    d.onclick = function (e) { if (e.target === d) d.remove(); };
    document.body.appendChild(d); drawTeam(d);
  }
  var OPEN_M = {};
  function sameSet(a, b) { a = (a || []).slice().sort(); b = (b || []).slice().sort(); return a.join() === b.join(); }
  function editable(m, me) { return ROLE === 'owner' ? m.role !== 'owner' : (can('team.manage') && m.role !== 'owner' && m.email !== me); }
  function permPanel(m, ed) {
    var have = permsOf(m), pl = m.platforms || [];
    var h = '<div class="pp">' + PERMS.map(function (g) {
      return '<fieldset><legend>' + esc(g.g) + '</legend>' + g.items.map(function (i) {
        var lock = i[0] === 'team.manage' && ROLE !== 'owner';
        return '<label><input type="checkbox" data-pk="' + i[0] + '"' + (have.indexOf(i[0]) >= 0 ? ' checked' : '') + (ed && !lock ? '' : ' disabled') + '> ' + esc(i[1]) + '</label>';
      }).join('') + '</fieldset>';
    }).join('');
    h += '<fieldset class="plf"><legend>المنصات اللي ينشر عليها</legend><p class="hint">لو ما اخترتش ولا منصة، يقدر ينشر على كل المنصات.</p>' + PLATS.map(function (x) {
      return '<label><input type="checkbox" data-pl="' + x[0] + '"' + (pl.indexOf(x[0]) >= 0 ? ' checked' : '') + (ed ? '' : ' disabled') + '> ' + x[1] + '</label>';
    }).join('') + '</fieldset>';
    if (ed) h += '<div class="row"><button type="button" data-save="' + esc(m.email) + '">حفظ الصلاحيات</button>' + (Array.isArray(m.perms) || (m.platforms && m.platforms.length) ? '<button type="button" class="close" data-reset="' + esc(m.email) + '">رجوع لصلاحيات «' + esc(ROLE_AR[m.role]) + '»</button>' : '') + '<span class="sv" data-sv="' + esc(m.email) + '"></span></div>';
    return h + '</div>';
  }
  function drawTeam(d) {
    loadMembers().then(function () {
      var me = SESSION.user.email.toLowerCase();
      var list = Object.keys(MEMBERS).sort(function (a, b) {
        var x = MEMBERS[a], y = MEMBERS[b]; if ((x.role === 'owner') !== (y.role === 'owner')) return x.role === 'owner' ? -1 : 1; return a < b ? -1 : 1;
      });
      var rows = list.map(function (k) {
        var m = MEMBERS[k], ed = editable(m, me), custom = Array.isArray(m.perms) && m.role !== 'owner', n = permsOf(m).length;
        var sel = m.role === 'owner' ? '<span class="rb">مدير المحتوى · كل الصلاحيات</span>' :
          '<select data-role="' + esc(m.email) + '"' + (ed ? '' : ' disabled') + '>' + ROLE_ORDER.map(function (r) {
            return '<option value="' + r + '"' + ((m.role === r || (m.role === 'team' && r === 'designer')) ? ' selected' : '') + '>' + ROLE_AR[r] + '</option>';
          }).join('') + '</select>';
        var sum = m.role === 'owner' ? '' : '<span class="sum">' + n + ' من ' + ALL_PERMS.length + ' صلاحية' + (custom ? ' · <b>مخصص</b>' : '') + (m.platforms && m.platforms.length ? ' · ينشر على: ' + m.platforms.map(function (p) { return (PLATS.filter(function (x) { return x[0] === p; })[0] || [p, p])[1]; }).join('، ') : '') + '</span>';
        return '<div class="mb"><div class="mh">' +
          '<input class="nm" data-nm="' + esc(m.email) + '" value="' + esc(m.name || '') + '" placeholder="اكتب الاسم"' + (ed || k === me ? '' : ' disabled') + '>' +
          '<span class="e">' + esc(m.email) + '</span>' + sel +
          (m.role === 'owner' ? '' : '<button type="button" class="tg" data-tog="' + esc(m.email) + '">' + (OPEN_M[k] ? 'إخفاء' : 'الصلاحيات') + '</button>') +
          (ed ? '<button class="x" data-del="' + esc(m.email) + '">إزالة</button>' : '') + '</div>' + sum +
          (OPEN_M[k] && m.role !== 'owner' ? permPanel(m, ed) : '') + '</div>';
      }).join('');
      d.innerHTML = '<div class="card"><h2>الفريق والصلاحيات</h2><p class="hint">اختار دور جاهز لكل شخص، أو افتح «الصلاحيات» وحدد بالظبط يقدر يعمل إيه ويشوف إيه، وعلى أنهي منصات ينشر.</p>' + rows +
        '<form class="row add" id="tm-f"><input class="n" id="tm-n" placeholder="الاسم"><input class="e" id="tm-e" type="email" required placeholder="email@example.com">' +
        '<select id="tm-r">' + ROLE_ORDER.map(function (r) { return '<option value="' + r + '"' + (r === 'designer' ? ' selected' : '') + '>' + ROLE_AR[r] + ': ' + ROLE_HINT[r] + '</option>'; }).join('') + (ROLE === 'owner' ? '<option value="owner">مدير المحتوى: كل الصلاحيات</option>' : '') + '</select>' +
        '<button>إضافة</button></form><p class="hint">الشخص يفتح رابط اللوحة ويكتب نفس الإيميل، وهيوصله رابط دخول. الصلاحيات بتتطبق فوراً من قاعدة البيانات نفسها.</p>' +
        '<div class="row"><button type="button" class="close" id="tm-c">إغلاق</button></div></div>';
      d.querySelector('#tm-c').onclick = function () { d.remove(); };
      function done(r, what) { if (r.error) alert('ما اتحفظ ' + what + ': ' + (/permission|security|cannot|only/i.test(r.error.message) ? 'مالكش صلاحية على ده.' : r.error.message)); drawTeam(d); }
      d.querySelector('#tm-f').onsubmit = function (ev) {
        ev.preventDefault();
        var e = d.querySelector('#tm-e').value.trim().toLowerCase();
        if (MEMBERS[e]) { alert('الإيميل ده موجود في الفريق. عدّل دوره من الجدول.'); return; }
        sb.from('members').insert({ email: e, role: d.querySelector('#tm-r').value, name: d.querySelector('#tm-n').value.trim() || null })
          .then(function (r) { done(r, 'العضو'); });
      };
      d.querySelectorAll('[data-role]').forEach(function (x) {
        x.onchange = function () {
          var em = x.getAttribute('data-role'), m = MEMBERS[em];
          if (Array.isArray(m.perms) && !confirm('الصلاحيات المخصصة لـ' + (m.name || em) + ' هتترجع لصلاحيات الدور الجديد. تكمل؟')) { x.value = m.role === 'team' ? 'designer' : m.role; return; }
          sb.from('members').update({ role: x.value, perms: null }).eq('email', em).then(function (r) { done(r, 'الدور'); });
        };
      });
      d.querySelectorAll('[data-tog]').forEach(function (x) { x.onclick = function () { var k = x.getAttribute('data-tog'); OPEN_M[k] = !OPEN_M[k]; drawTeam(d); }; });
      d.querySelectorAll('[data-save]').forEach(function (x) {
        x.onclick = function () {
          var em = x.getAttribute('data-save'), m = MEMBERS[em], box = x.closest('.mb');
          var ps = [].map.call(box.querySelectorAll('[data-pk]:checked'), function (c) { return c.getAttribute('data-pk'); });
          if (ROLE !== 'owner') { var had = permsOf(m).indexOf('team.manage') >= 0; ps = ps.filter(function (p) { return p !== 'team.manage'; }); if (had) ps.push('team.manage'); }
          var pl = [].map.call(box.querySelectorAll('[data-pl]:checked'), function (c) { return c.getAttribute('data-pl'); });
          var preset = PRESETS[m.role] || [];
          sb.from('members').update({ perms: sameSet(ps, preset) ? null : ps, platforms: pl.length && pl.length < PLATS.length ? pl : null }).eq('email', em)
            .then(function (r) { done(r, 'الصلاحيات'); });
        };
      });
      d.querySelectorAll('[data-reset]').forEach(function (x) {
        x.onclick = function () { sb.from('members').update({ perms: null, platforms: null }).eq('email', x.getAttribute('data-reset')).then(function (r) { done(r, 'الصلاحيات'); }); };
      });
      d.querySelectorAll('[data-nm]').forEach(function (x) {
        var save = function () {
          var em = x.getAttribute('data-nm'), v = x.value.trim();
          if ((MEMBERS[em] || {}).name === v) return;
          sb.from('members').update({ name: v || null }).eq('email', em).then(function (r) {
            if (r.error) { alert('ما اتحفظ الاسم: ' + r.error.message); return; }
            MEMBERS[em].name = v; x.style.borderColor = '#2E7D4F';
            if (em === me) refreshWho();
          });
        };
        x.addEventListener('change', save);
        x.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); x.blur(); } });
      });
      d.querySelectorAll('[data-del]').forEach(function (x) {
        x.onclick = function () {
          var em = x.getAttribute('data-del');
          if (!confirm('إزالة ' + ((MEMBERS[em] || {}).name || em) + ' من الفريق؟ مش هيقدر يفتح اللوحة تاني.')) return;
          sb.from('members').delete().eq('email', em).then(function (r) { done(r, 'الإزالة'); });
        };
      });
    });
  }



  /* ---------- الإشعارات ---------- */
  var VAPID_PUB = 'BFQm6RyQtbIhIvO4a3ymzke5bRRZDqkZiF8YQVjcJJL3SOR9Jt2ezB257M7ZFY8zTNr7lUIdHCkI6q5RuYnJhOw';
  var ACTS = [], BELL_OK = false, PUSH_ON = false;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function seenKey() { return 'cs-seen-' + (SESSION ? SESSION.user.email.toLowerCase() : ''); }
  function lastSeen() { return lsGet(seenKey()) || new Date(Date.now() - 3 * 864e5).toISOString(); }
  function mine(a) { return SESSION && a.actor && a.actor.toLowerCase() === SESSION.user.email.toLowerCase(); }
  function unread() { var ls = lastSeen(); return ACTS.filter(function (a) { return !mine(a) && a.at > ls; }).length; }
  function txt(a) { return window.activityText ? window.activityText(a) : { title: 'تحديث', body: '', url: '/files.html' }; }
  function ago(t) { var m = Math.round((Date.now() - new Date(t).getTime()) / 60000); if (m < 1) return 'دلوقتي'; if (m < 60) return 'من ' + m + ' دقيقة'; var h = Math.round(m / 60); if (h < 24) return 'من ' + h + ' ساعة'; var d = Math.round(h / 24); return d === 1 ? 'إمبارح' : 'من ' + d + ' أيام'; }
  function badge() { var b = document.getElementById('bell-n'); if (!b) return; var n = unread(); b.textContent = n > 99 ? '99+' : n; b.hidden = !n; }
  function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function isIOS() { return /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream; }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone; }
  function b64(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
  function swReg() { return navigator.serviceWorker.register('/sw.js', { scope: '/' }); }
  function checkPush() {
    if (!pushSupported()) return Promise.resolve(false);
    return navigator.serviceWorker.getRegistration('/').then(function (r) { return r ? r.pushManager.getSubscription() : null; }).then(function (s) { PUSH_ON = !!s && Notification.permission === 'granted'; return PUSH_ON; }).catch(function () { return false; });
  }
  function enablePush() {
    if (!pushSupported()) return Promise.reject(new Error(isIOS() && !standalone() ? 'ios' : 'unsupported'));
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') throw new Error('denied');
      return swReg();
    }).then(function (reg) {
      return navigator.serviceWorker.ready.then(function () { return reg.pushManager.getSubscription(); }).then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUB) }); });
    }).then(function (sub) {
      var j = sub.toJSON();
      return sb.from('push_subs').upsert({ endpoint: j.endpoint, email: SESSION.user.email.toLowerCase(), sub: j, ua: navigator.userAgent.slice(0, 200), at: new Date().toISOString() }).then(unwrap);
    }).then(function () { PUSH_ON = true; });
  }
  function disablePush() {
    return navigator.serviceWorker.getRegistration('/').then(function (r) { return r ? r.pushManager.getSubscription() : null; }).then(function (s) {
      if (!s) return;
      var ep = s.endpoint;
      return s.unsubscribe().then(function () { return sb.from('push_subs').delete().eq('endpoint', ep).then(unwrap); });
    }).then(function () { PUSH_ON = false; });
  }
  function toast(a) {
    var t = txt(a), el = document.createElement('a');
    el.className = 'cs-toast'; el.href = t.url; el.innerHTML = '<b></b><span></span>';
    el.firstChild.textContent = t.title; el.lastChild.textContent = t.body;
    var box = document.getElementById('cs-toasts'); if (!box) { box = document.createElement('div'); box.id = 'cs-toasts'; document.body.appendChild(box); }
    box.appendChild(el); setTimeout(function () { el.remove(); }, 7000);
  }
  function renderPanel() {
    var p = document.getElementById('bell-p'); if (!p) return;
    var ls = lastSeen(), list = ACTS.filter(function (a) { return !mine(a); }).slice(0, 40);
    var h = '<div class="bh"><b>الإشعارات</b>' + (unread() ? '<button type="button" id="bell-read">علّم الكل مقروء</button>' : '') + '</div>';
    h += '<div class="bpush">';
    if (PUSH_ON) h += '<span>✓ الإشعارات شغالة على الجهاز ده</span><button type="button" id="bell-off">إيقاف</button>';
    else if (pushSupported()) h += '<span>اعرف بأي تحديث حتى لو الموقع مقفول</span><button type="button" id="bell-on" class="on">فعّل على الجهاز ده</button>';
    else if (isIOS()) h += '<span>على الآيفون: من Safari دوس «مشاركة» ← «إضافة إلى الشاشة الرئيسية»، وافتح الموقع من الأيقونة وفعّل الإشعارات من هنا.</span>';
    else h += '<span>المتصفح ده مش بيدعم إشعارات الجهاز، بس هتشوف التحديثات هنا.</span>';
    h += '</div><div class="bl">';
    h += list.length ? list.map(function (a) { var t = txt(a); return '<a href="' + t.url.replace(/"/g, '&quot;') + '" class="' + (a.at > ls ? 'new' : '') + '"><b></b><span></span><i>' + ago(a.at) + '</i></a>'; }).join('') : '<p>مفيش تحديثات لسه.</p>';
    p.innerHTML = h + '</div>';
    var links = p.querySelectorAll('.bl a');
    list.forEach(function (a, i) { if (!links[i]) return; var t = txt(a); links[i].children[0].textContent = t.title; links[i].children[1].textContent = t.body; links[i].onclick = function () { p.hidden = true; if (/#p=/.test(t.url) && location.pathname === new URL(t.url, location.href).pathname) setTimeout(function () { location.reload(); }, 30); }; });
    var r = document.getElementById('bell-read'); if (r) r.onclick = function () { lsSet(seenKey(), new Date().toISOString()); badge(); renderPanel(); };
    var on = document.getElementById('bell-on'); if (on) on.onclick = function () {
      on.disabled = true; on.textContent = 'جارِ التفعيل…';
      enablePush().then(renderPanel).catch(function (e) {
        var m = e && e.message === 'denied' ? 'المتصفح رافض الإشعارات. افتح إعدادات الموقع (القفل جنب العنوان) وخلّي الإشعارات «سماح»، وجرّب تاني.' : e && e.message === 'ios' ? 'على الآيفون لازم تضيف الموقع للشاشة الرئيسية الأول.' : 'ما اتفعّلتش، جرّب تاني.';
        on.disabled = false; on.textContent = 'فعّل على الجهاز ده'; alertBox(m);
      });
    };
    var off = document.getElementById('bell-off'); if (off) off.onclick = function () { disablePush().then(renderPanel); };
  }
  function alertBox(m) { var p = document.getElementById('bell-p'); if (!p) return; var d = document.createElement('div'); d.className = 'bwarn'; d.textContent = m; p.insertBefore(d, p.children[1] || null); }
  function startBell() {
    var who = document.getElementById('who'); if (!who || document.getElementById('bell')) return;
    var st = document.createElement('style');
    st.textContent = '#bell{position:relative;border:1px solid #C29B3C;background:transparent;color:inherit;border-radius:999px;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-inline-start:8px;flex:0 0 auto}#bell svg{width:18px;height:18px}' +
      '#bell-n{position:absolute;top:-5px;inset-inline-end:-5px;background:#B4483A;color:#fff;border-radius:999px;font-size:11px;font-weight:700;min-width:18px;height:18px;line-height:18px;padding:0 4px;text-align:center}' +
      '#bell-p{position:fixed;top:60px;inset-inline-end:12px;width:min(380px,calc(100vw - 24px));max-height:min(70vh,560px);overflow:auto;background:var(--surface,#fff);color:var(--ink,#1F2427);border:1px solid var(--line,#D9D8D1);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.22);z-index:9990;direction:rtl;font-size:14px}' +
      '#bell-p .bh{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line,#D9D8D1);position:sticky;top:0;background:inherit}#bell-p .bh button,#bell-p .bpush button{font:inherit;font-size:12.5px;border:1px solid var(--line,#D9D8D1);background:transparent;color:inherit;border-radius:999px;padding:4px 10px;cursor:pointer}' +
      '#bell-p .bpush{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--soft,#ECEAE3);font-size:13px}#bell-p .bpush button.on{background:#1F2427;color:#F7F4EC;border-color:#1F2427;white-space:nowrap}' +
      '#bell-p .bwarn{padding:8px 14px;background:#FBEAE7;color:#8A2F24;font-size:13px}' +
      '#bell-p .bl a{display:block;padding:10px 14px;border-bottom:1px solid var(--line,#D9D8D1);text-decoration:none;color:inherit}#bell-p .bl a.new{background:rgba(194,155,60,.10)}#bell-p .bl a:hover{background:var(--soft,#ECEAE3)}#bell-p .bl b{display:block;font-size:13.5px}#bell-p .bl span{display:block;font-size:13px;color:var(--ink-2,#4B5560);line-height:1.5}#bell-p .bl i{font-style:normal;font-size:12px;color:var(--ink-3,#77808A)}#bell-p .bl p{padding:18px 14px;color:var(--ink-3,#77808A)}' +
      '#cs-toasts{position:fixed;bottom:16px;inset-inline-start:16px;display:flex;flex-direction:column;gap:8px;z-index:9991;direction:rtl;max-width:min(360px,calc(100vw - 32px))}.cs-toast{display:block;background:#1F2427;color:#F7F4EC;border-radius:12px;padding:10px 14px;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:13.5px}.cs-toast b{display:block;color:#D4AE67}.cs-toast span{display:block;line-height:1.5}';
    document.head.appendChild(st);
    var b = document.createElement('button'); b.id = 'bell'; b.type = 'button'; b.setAttribute('aria-label', 'الإشعارات');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span id="bell-n" hidden>0</span>';
    who.parentNode.insertBefore(b, who);
    var p = document.createElement('div'); p.id = 'bell-p'; p.hidden = true; document.body.appendChild(p);
    b.onclick = function (e) { e.stopPropagation(); p.hidden = !p.hidden; if (!p.hidden) { checkPush().then(renderPanel); renderPanel(); } else { lsSet(seenKey(), new Date().toISOString()); badge(); } };
    document.addEventListener('click', function (e) { if (!p.hidden && !p.contains(e.target) && e.target !== b) { p.hidden = true; lsSet(seenKey(), new Date().toISOString()); badge(); } });
    var sc = document.createElement('script'); sc.src = 'activity-text.js'; sc.onload = function () { renderPanel(); }; document.head.appendChild(sc);
    sb.from('activity').select('id,at,actor,kind,ref,data').order('at', { ascending: false }).limit(60).then(function (r) {
      if (r.error) return; BELL_OK = true; ACTS = r.data || []; badge();
      sb.channel('act-' + rid()).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity' }, function (m) {
        var a = m.new; if (!a || ACTS.some(function (x) { return x.id === a.id; })) return;
        ACTS.unshift(a); badge(); if (!p.hidden) renderPanel();
        if (!mine(a)) { if (document.visibilityState === 'visible') toast(a); }
      }).subscribe();
    });
    checkPush();
    if (pushSupported() && Notification.permission === 'granted') swReg().catch(function () { });
  }
  window.csBell = { enable: function () { return enablePush(); }, state: function () { return { ok: BELL_OK, n: ACTS.length, push: PUSH_ON }; } };
  /* ---------- التحميل ---------- */
  function isStore(u) { try { return /\/storage\/v1\/object\/public\//.test(new URL(u, location.href).pathname); } catch (e) { return false; } }
  function cleanName(n) { return String(n || 'design').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120); }
  function saveAs(url, name) {
    var a = document.createElement('a');
    if (isStore(url)) { a.href = url + (url.indexOf('?') < 0 ? '?' : '&') + 'download=' + encodeURIComponent(cleanName(name)); }
    else { a.href = url; a.download = cleanName(name); }
    a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    return Promise.resolve();
  }
  var JSZIP_P = null;
  function loadZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!JSZIP_P) JSZIP_P = new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; sc.onload = function () { res(window.JSZip); }; sc.onerror = function () { JSZIP_P = null; rej(new Error('zip')); }; document.head.appendChild(sc); });
    return JSZIP_P;
  }
  function zipFiles(files, zipName) {
    return loadZip().then(function (JSZip) {
      var z = new JSZip(), used = {};
      return Promise.all(files.map(function (f, i) {
        return fetch(f.url, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error('fetch'); return r.blob(); }).then(function (b) {
          var n = cleanName(f.name || ('design-' + (i + 1))), base = n, k = 2; while (used[n]) { n = base.replace(/(\.[^.]+)?$/, '-' + (k++) + '$1'); } used[n] = 1;
          z.file(n, b);
        });
      })).then(function () { return z.generateAsync({ type: 'blob' }); });
    }).then(function (blob) {
      var a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = cleanName(zipName || 'designs') + '.zip';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    });
  }
  // أي رابط «تحميل» لملف مرفوع على Supabase يتحمّل فعلاً بدل ما يفتح
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[download]');
    if (!a || !isStore(a.href) || /[?&]download=/.test(a.href)) return;
    e.preventDefault(); saveAs(a.href, a.getAttribute('download') || '');
  }, true);
  /* ---------- التصاميم والبيانات المحمية ---------- */
  var MIME_OK = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|quicktime)|application\/pdf)$/;
  window.capital = {
    ready: ready,
    role: function () { return ROLE; },
    can: can,
    platforms: function () { return ROLE === 'owner' ? null : ACCESS.platforms; },
    roleLabel: roleLabel,
    email: function () { return SESSION ? SESSION.user.email.toLowerCase() : ''; },
    names: function () { var o = {}; Object.keys(MEMBERS).forEach(function (k) { o[k] = MEMBERS[k].name || k.split('@')[0]; }); return o; },
    token: function () { return sb.auth.getSession().then(function (r) { return r.data && r.data.session ? r.data.session.access_token : ''; }); },
    // ترفع ملف تصميم وترجع بياناته عشان تتحفظ على المنشور
    upload: function (postId, file) {
      if (!MIME_OK.test(file.type || '')) return Promise.reject(new Error('نوع الملف غير مدعوم: ' + file.name + ' (صور PNG/JPG/WebP أو فيديو MP4 أو PDF)'));
      if (file.size > 50 * 1024 * 1024) return Promise.reject(new Error('الملف أكبر من 50 ميجا: ' + file.name));
      var ext = ((file.name.split('.').pop() || '') + '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      var path = String(postId).replace(/[^\w-]/g, '_') + '/' + rid() + rid() + '.' + ext;
      return sb.storage.from('designs').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' }).then(function (r) {
        if (r.error) throw err(r.error);
        return { path: path, url: sb.storage.from('designs').getPublicUrl(path).data.publicUrl, name: file.name, type: file.type, size: file.size, at: new Date().toISOString(), by: SESSION.user.email.toLowerCase() };
      });
    },
    kpis: function () { return sb.from('kpis').select('id,data,updated_at').order('id', { ascending: false }).then(unwrap); },
    saveKpi: function (id, data) { return sb.from('kpis').upsert({ id: id, data: data, updated_at: new Date().toISOString() }).then(unwrap); },
    removeFile: function (path) { return sb.storage.from('designs').remove([path]).then(unwrap); },
    // تحميل فعلي للملف (روابط Supabase من دومين تاني، فالمتصفح كان بيفتحها بدل ما ينزّلها)
    download: function (url, name) { return saveAs(url, name); },
    // كذا ملف في ZIP واحد
    zip: function (files, zipName) { return zipFiles(files, zipName); },
    // نسخ تصاميم الإعلانات (جدول ad_versions)
    adVersions: function () { return sb.from('ad_versions').select('id,ad_key,data,at').order('at', { ascending: false }).then(unwrap); },
    addAdVersion: function (adKey, data) { var id = rid(); return sb.from('ad_versions').insert({ id: id, ad_key: adKey, data: data }).then(unwrap).then(function () { return id; }); },
    saveAdVersion: function (id, data) { return sb.from('ad_versions').update({ data: data }).eq('id', id).then(unwrap); },
    removeAdVersion: function (id) { return sb.from('ad_versions').delete().eq('id', id).then(unwrap); },
    api: function (name) {
      return window.capital.token().then(function (t) {
        return fetch('api/' + name, { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' });
      }).then(function (r) { if (!r.ok) throw new Error('api ' + r.status); return r.json(); });
    }
  };

  /* ---------- الواجهة اللي اللوحة بتستخدمها ---------- */
  window.claude = {
    use: function (cap) {
      return ready.then(function () { return cap === 'user' ? userApi : cap === 'db' ? dbApi : null; });
    }
  };
})();
