/* طبقة تشغيل اللوحة خارج Claude
   توفّر window.claude.use('user'|'db') بنفس الواجهة اللي اللوحة الأصلية متعودة عليها،
   لكن فوق Supabase (تسجيل دخول برابط على الإيميل + قاعدة بيانات + تحديث لحظي). */
(function () {
  'use strict';
  var CFG = window.BOARD_CONFIG || {};
  var sb = window.supabase.createClient(CFG.url, CFG.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  var SESSION = null, ROLE = null, MEMBERS = {};

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
    '#team-dlg .card{width:100%;max-width:520px;max-height:85vh;overflow:auto;background:#fff;border-radius:14px;padding:22px}' +
    '#team-dlg h2{margin:0 0 12px;font-size:18px}#team-dlg table{width:100%;border-collapse:collapse;font-size:14px}' +
    '#team-dlg td{padding:8px 4px;border-bottom:1px solid #EEE8DA}#team-dlg input.nm{width:100%;box-sizing:border-box;border:1px solid transparent;background:#FBF8F1;padding:6px 8px}#team-dlg input.nm:focus{border-color:#C29B3C;outline:0;background:#fff}#team-dlg td.e{direction:ltr;text-align:left}' +
    '#team-dlg .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}#team-dlg input,#team-dlg select{padding:9px 10px;border:1px solid #CFC6B2;border-radius:8px;font:inherit;font-size:14px}' +
    '#team-dlg input.e{direction:ltr;flex:2 1 200px}#team-dlg input.n{flex:1 1 120px}' +
    '#team-dlg button{padding:9px 14px;border:0;border-radius:8px;background:#1F2427;color:#fff;font:inherit;cursor:pointer}' +
    '#team-dlg button.x{background:none;color:#9A3B2E;padding:4px 8px}#team-dlg .close{background:#EEE8DA;color:#1F2427}' +
    '#files-link{margin-inline-start:8px;padding:6px 12px;border:1px solid #C29B3C;border-radius:999px;font-size:13px;text-decoration:none;color:inherit;white-space:nowrap}#files-link:hover{background:rgba(194,155,60,.15)}' +
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
    return sb.from('members').select('email,role,name').then(function (r) {
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
      return loadMembers().then(function () { domReady(function () { closeGate(); readyResolve(); addFilesLink(); addTeamButton(); }); });
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
    if (ev === 'SIGNED_IN' && session && !SESSION) { start(session); if (location.hash) history.replaceState(null, '', location.pathname); }
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
      return Promise.resolve({ id: email, name: name, isOwner: ROLE === 'owner', canEdit: ROLE !== 'viewer', avatarUrl: avatar(name) });
    },
    can: function (what) { return Promise.resolve(what === 'data.write' ? ROLE !== 'viewer' : true); },
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
  var ROLE_AR = { owner: 'مدير المحتوى', team: 'فريق التنفيذ', viewer: 'اطلاع فقط' };
  function addFilesLink() {
    var who = document.getElementById('who');
    if (!who || document.getElementById('files-link') || /files\.html$/.test(location.pathname)) return;
    var a = document.createElement('a'); a.id = 'files-link'; a.href = 'files.html'; a.textContent = 'ملفات المشروع';
    who.parentNode.insertBefore(a, who.nextSibling);
  }
  function addTeamButton() {
    if (ROLE !== 'owner') return;
    var who = document.getElementById('who');
    if (!who || document.getElementById('team-btn')) return;
    var b = document.createElement('button'); b.id = 'team-btn'; b.type = 'button'; b.textContent = 'الفريق';
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
  function drawTeam(d) {
    loadMembers().then(function () {
      var me = SESSION.user.email.toLowerCase();
      var rows = Object.keys(MEMBERS).sort().map(function (k) {
        var m = MEMBERS[k];
        return '<tr><td><input class="nm" data-nm="' + esc(m.email) + '" value="' + esc(m.name || '') + '" placeholder="اكتب الاسم" title="عدّل الاسم واضغط Enter"></td><td class="e">' + esc(m.email) + '</td><td>' + ROLE_AR[m.role] + '</td><td>' +
          (k === me ? '' : '<button class="x" data-del="' + esc(m.email) + '">إزالة</button>') + '</td></tr>';
      }).join('');
      d.innerHTML = '<div class="card"><h2>فريق اللوحة</h2><table>' + rows + '</table>' +
        '<form class="row" id="tm-f"><input class="n" id="tm-n" placeholder="الاسم"><input class="e" id="tm-e" type="email" required placeholder="email@example.com">' +
        '<select id="tm-r"><option value="team">فريق التنفيذ (المصمم)</option><option value="viewer">اطلاع فقط (الإدارة)</option><option value="owner">مدير المحتوى</option></select>' +
        '<button>إضافة</button></form><p style="font-size:13px;color:#5A6166;line-height:1.7;margin:12px 0 0">الشخص يفتح رابط اللوحة ويكتب نفس الإيميل، وهيوصله رابط دخول.</p>' +
        '<div class="row"><button type="button" class="close" id="tm-c">إغلاق</button></div></div>';
      d.querySelector('#tm-c').onclick = function () { d.remove(); };
      d.querySelector('#tm-f').onsubmit = function (ev) {
        ev.preventDefault();
        var e = d.querySelector('#tm-e').value.trim().toLowerCase();
        if (e === me && d.querySelector('#tm-r').value !== 'owner') { alert('ده إيميلك. عدّل اسمك من الجدول فوق، ودورك يفضل مدير المحتوى.'); return; }
        sb.from('members').upsert({ email: e, role: d.querySelector('#tm-r').value, name: d.querySelector('#tm-n').value.trim() || null })
          .then(function (r) { if (r.error) alert('ما تمت الإضافة: ' + r.error.message); drawTeam(d); });
      };
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
          sb.from('members').delete().eq('email', x.getAttribute('data-del')).then(function () { drawTeam(d); });
        };
      });
    });
  }

  /* ---------- الواجهة اللي اللوحة بتستخدمها ---------- */
  window.claude = {
    use: function (cap) {
      return ready.then(function () { return cap === 'user' ? userApi : cap === 'db' ? dbApi : null; });
    }
  };
})();
