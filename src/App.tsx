import { useState, useRef, useEffect, useCallback } from "react";

// ─── In-Memory Store ──────────────────────────────────────────────────────────
const STORE = {
  users: [
    { id: "u_demo_team", name: "Jordan Lee", email: "jordan@agency.com", password: "team123", role: "team", avatar: "JL", company: "Proof Studio" },
    { id: "u_demo_client", name: "Alex Chen", email: "alex@client.com", password: "client123", role: "client", avatar: "AC", company: "TechCorp" },
  ],
  assets: [
    {
      id: "a1", title: "Homepage Banner Ad", type: "image", status: "pending",
      uploadedBy: "u_demo_team", uploadedAt: "2026-04-06T10:00:00Z", version: 2,
      url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=80",
      comments: [
        { id: "c1", userId: "u_demo_client", text: "Logo feels too small here", x: 15, y: 22, resolved: false, createdAt: "2026-04-06T11:00:00Z" },
        { id: "c2", userId: "u_demo_team", text: "Will bump it in v3!", x: 15, y: 22, resolved: false, createdAt: "2026-04-06T11:30:00Z" },
      ],
    },
    {
      id: "a2", title: "Social Media Carousel — Spring", type: "image", status: "approved",
      uploadedBy: "u_demo_team", uploadedAt: "2026-04-05T14:00:00Z", version: 1,
      url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80",
      comments: [
        { id: "c3", userId: "u_demo_client", text: "Love the color palette!", x: 50, y: 50, resolved: true, createdAt: "2026-04-05T15:00:00Z" },
      ],
    },
    {
      id: "a3", title: "Email Header — Newsletter", type: "image", status: "revision",
      uploadedBy: "u_demo_team", uploadedAt: "2026-04-07T09:00:00Z", version: 1,
      url: "https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=900&q=80",
      comments: [
        { id: "c4", userId: "u_demo_client", text: "Change font to match brand guide", x: 40, y: 30, resolved: false, createdAt: "2026-04-07T10:00:00Z" },
      ],
    },
    {
      id: "a4", title: "Product Launch Copy — Draft", type: "copy", status: "pending",
      uploadedBy: "u_demo_team", uploadedAt: "2026-04-08T08:00:00Z", version: 1,
      content: "🚀 Introducing the Future of Productivity\n\nMeet the tool your team didn't know they needed. Designed for modern teams, our platform combines AI power with the simplicity of a notepad.\n\n✦ Ship faster. Think clearer. Collaborate better.\n\nAvailable April 15 — early access spots are limited.\n\n[Get Early Access →]",
      comments: [],
    },
  ],
  _nextId: 100,
  genId() { return "id_" + (++this._nextId); },
};

const api = {
  register({ name, email, password, role, company }) {
    if (STORE.users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: "An account with this email already exists." };
    const initials = name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const user = { id: STORE.genId(), name: name.trim(), email: email.trim().toLowerCase(), password, role, company: company || "", avatar: initials };
    STORE.users.push(user);
    return { ok: true, user };
  },
  login(email, password) {
    const user = STORE.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    return user ? { ok: true, user } : { ok: false, error: "Incorrect email or password." };
  },
  getAssets() { return STORE.assets; },
  getAsset(id) { return STORE.assets.find(a => a.id === id); },
  approveAsset(id, userId) {
    const a = STORE.assets.find(a => a.id === id);
    if (a) { a.status = "approved"; a.approvedBy = userId; a.approvedAt = new Date().toISOString(); }
    return a;
  },
  revisionAsset(id) {
    const a = STORE.assets.find(a => a.id === id);
    if (a) a.status = "revision";
    return a;
  },
  addComment(assetId, userId, text, x, y) {
    const comment = { id: STORE.genId(), userId, text, x, y, resolved: false, createdAt: new Date().toISOString() };
    const a = STORE.assets.find(a => a.id === assetId);
    if (a) a.comments.push(comment);
    return comment;
  },
  resolveComment(assetId, commentId) {
    const a = STORE.assets.find(a => a.id === assetId);
    const c = a && a.comments.find(c => c.id === commentId);
    if (c) c.resolved = true;
  },
  uploadAsset(data) {
    const asset = { id: STORE.genId(), ...data, status: "pending", uploadedAt: new Date().toISOString(), version: 1, comments: [] };
    STORE.assets.push(asset);
    return asset;
  },
  getUser(id) { return STORE.users.find(u => u.id === id); },
};

const STATUS = {
  pending:  { label: "Awaiting Review", color: "#F4A63A", bg: "rgba(244,166,58,0.1)" },
  approved: { label: "Approved",        color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  revision: { label: "Needs Revision",  color: "#F87171", bg: "rgba(248,113,113,0.1)" },
};

const fmt  = d => new Date(d).toLocaleDateString("en-US",  { month: "short", day: "numeric", year: "numeric" });
const fmtT = d => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#080B10;--bg2:#0F1319;--bg3:#161C26;--bg4:#1C2330;
  --border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.11);
  --text:#DDE2EE;--text2:#7A8299;--text3:#4A5168;
  --gold:#C9A84C;--gold2:#E8C97A;--gold-soft:rgba(201,168,76,0.1);
  --green:#34D399;--red:#F87171;--amber:#F4A63A;
  --r:10px;--r2:16px;--shadow:0 4px 28px rgba(0,0,0,0.5);--shadow2:0 12px 56px rgba(0,0,0,0.7);
  --display:'Playfair Display',Georgia,serif;--body:'Outfit',sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--body);font-size:14px;line-height:1.6}
.auth-bg{
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse 60% 50% at 20% 10%,rgba(201,168,76,0.07) 0%,transparent 70%),
             radial-gradient(ellipse 50% 60% at 85% 85%,rgba(52,211,153,0.04) 0%,transparent 60%),var(--bg);
  padding:20px;
}
.auth-card{width:100%;max-width:440px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r2);box-shadow:var(--shadow2);overflow:hidden}
.auth-header{padding:34px 36px 22px;border-bottom:1px solid var(--border)}
.auth-logo{font-family:var(--display);font-size:26px;color:var(--gold2);font-style:italic;font-weight:400;margin-bottom:3px}
.auth-tagline{font-size:12px;color:var(--text3);letter-spacing:.04em}
.auth-tabs{display:flex}
.auth-tab{flex:1;padding:13px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text2);font-family:var(--body);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s}
.auth-tab.on{color:var(--gold2);border-bottom-color:var(--gold)}
.auth-body{padding:26px 36px 34px}
.role-row{display:flex;gap:8px;margin-bottom:18px}
.role-btn{flex:1;padding:10px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);color:var(--text2);font-family:var(--body);font-size:12px;cursor:pointer;transition:all .2s;text-align:center}
.role-btn.on{background:var(--gold-soft);border-color:var(--gold);color:var(--gold2)}
.role-icon{font-size:20px;display:block;margin-bottom:3px}
.fld{margin-bottom:13px}
.fld label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:5px}
.fld input,.fld select,.fld textarea{width:100%;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);color:var(--text);font-family:var(--body);font-size:13px;outline:none;transition:border .2s}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:var(--gold)}
.fld-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.err{background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.25);color:var(--red);border-radius:8px;padding:9px 13px;font-size:12px;margin-bottom:13px}
.ok{background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);color:var(--green);border-radius:8px;padding:9px 13px;font-size:12px;margin-bottom:13px}
.btn-main{width:100%;padding:12px;background:var(--gold);border:none;border-radius:var(--r);color:#080B10;font-family:var(--body);font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;margin-top:5px}
.btn-main:hover{background:var(--gold2);transform:translateY(-1px);box-shadow:0 4px 18px rgba(201,168,76,0.25)}
.auth-switch{text-align:center;margin-top:16px;color:var(--text3);font-size:12px}
.auth-switch span{color:var(--gold);cursor:pointer;font-weight:500}
.auth-switch span:hover{color:var(--gold2)}
.pass-hint{font-size:11px;color:var(--text3);margin-top:3px}
.demo-row{display:flex;gap:6px;margin-top:10px;justify-content:center;flex-wrap:wrap}
.demo-btn{font-size:11px;padding:3px 10px;border:1px solid var(--border2);border-radius:20px;background:transparent;color:var(--text3);cursor:pointer;transition:all .2s}
.demo-btn:hover{border-color:var(--gold);color:var(--gold2)}
.hdr{height:58px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:14px;position:sticky;top:0;z-index:100}
.hdr-logo{font-family:var(--display);font-size:19px;color:var(--gold2);font-style:italic}
.hdr-sep{flex:1}
.hdr-chip{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);background:var(--bg3);border:1px solid var(--border);border-radius:20px;padding:3px 11px}
.hdr-av{width:32px;height:32px;border-radius:50%;background:var(--gold-soft);border:1px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--gold2)}
.hdr-out{padding:5px 13px;background:transparent;border:1px solid var(--border2);border-radius:8px;color:var(--text2);font-family:var(--body);font-size:12px;cursor:pointer;transition:all .2s}
.hdr-out:hover{border-color:var(--red);color:var(--red)}
.shell{display:flex;flex:1}
.sidebar{width:212px;background:var(--bg2);border-right:1px solid var(--border);padding:20px 12px;display:flex;flex-direction:column;gap:3px;position:sticky;top:58px;height:calc(100vh - 58px);overflow-y:auto}
.sb-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--text3);padding:6px 10px 3px}
.sb-item{padding:9px 11px;border-radius:8px;cursor:pointer;color:var(--text2);font-size:13px;display:flex;align-items:center;gap:9px;transition:all .18s}
.sb-item:hover{background:var(--bg3);color:var(--text)}
.sb-item.on{background:var(--gold-soft);color:var(--gold2)}
.sb-badge{margin-left:auto;font-size:10px;background:var(--amber);color:#080B10;border-radius:20px;padding:1px 7px;font-weight:600}
.sb-div{height:1px;background:var(--border);margin:6px 0}
.content{flex:1;padding:28px 32px;overflow-y:auto}
.pg-title{font-family:var(--display);font-size:28px;font-weight:400;margin-bottom:3px}
.pg-sub{color:var(--text2);font-size:13px;margin-bottom:24px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:26px}
.stat{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:20px}
.stat-n{font-family:var(--display);font-size:34px;line-height:1;margin-bottom:5px}
.stat-l{color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.filters{display:flex;gap:7px;flex-wrap:wrap}
.fbtn{padding:5px 13px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text2);font-family:var(--body);font-size:12px;cursor:pointer;transition:all .2s}
.fbtn.on{background:var(--gold-soft);border-color:var(--gold);color:var(--gold2)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden;cursor:pointer;transition:all .22s;position:relative}
.card:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:var(--shadow)}
.card-img{width:100%;height:174px;object-fit:cover;display:block;background:var(--bg3)}
.card-copy-thumb{width:100%;height:174px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:44px}
.card-body{padding:14px}
.card-title{font-size:13px;font-weight:500;margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-meta{display:flex;align-items:center;justify-content:space-between}
.card-date{font-size:11px;color:var(--text3)}
.badge-v{position:absolute;top:10px;left:10px;background:rgba(8,11,16,0.82);border:1px solid var(--border2);border-radius:20px;padding:2px 9px;font-size:10px;color:var(--text2)}
.badge-c{position:absolute;top:10px;right:10px;background:rgba(8,11,16,0.82);border:1px solid var(--border2);border-radius:20px;padding:2px 9px;font-size:10px;color:var(--text2)}
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500}
.pill-dot{width:5px;height:5px;border-radius:50%}
.back{display:inline-flex;align-items:center;gap:7px;color:var(--text2);font-size:13px;cursor:pointer;margin-bottom:18px;transition:color .2s}
.back:hover{color:var(--text)}
.detail-wrap{display:grid;grid-template-columns:1fr 348px;gap:22px;align-items:start}
.canvas{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden;position:relative;cursor:crosshair}
.canvas.no-pin{cursor:default}
.canvas-copy{padding:26px;font-size:14px;line-height:1.85;white-space:pre-line;min-height:280px}
.pin{position:absolute;width:26px;height:26px;border-radius:50% 50% 50% 0;background:var(--gold);border:2px solid var(--bg);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--bg);transform:translate(-50%,-100%) rotate(-45deg);cursor:pointer;transition:transform .15s;box-shadow:0 2px 10px rgba(0,0,0,0.4)}
.pin:hover{transform:translate(-50%,-100%) rotate(-45deg) scale(1.15)}
.pin.done{background:var(--green)}
.pin-inner{transform:rotate(45deg)}
.pin-tip{position:absolute;background:var(--bg);border:1px solid var(--border2);border-radius:9px;padding:9px 13px;font-size:12px;color:var(--text);max-width:210px;white-space:normal;z-index:10;box-shadow:var(--shadow);pointer-events:none;transform:translateX(-50%);bottom:calc(100% + 7px);left:50%}
.canvas-hint{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,11,16,0.78);border:1px dashed var(--border2);border-radius:9px;padding:11px 18px;color:var(--text2);font-size:12px;pointer-events:none;text-align:center}
.rp{display:flex;flex-direction:column;gap:14px}
.panel{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden}
.panel-hdr{padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:space-between}
.clist{padding:10px;display:flex;flex-direction:column;gap:7px;max-height:290px;overflow-y:auto}
.clist::-webkit-scrollbar{width:3px}
.clist::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
.ci{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:11px;transition:border .15s}
.ci:hover{border-color:var(--border2)}
.ci.done{opacity:.5}
.ci-top{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.ci-av{width:20px;height:20px;border-radius:50%;background:var(--gold-soft);border:1px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--gold2);flex-shrink:0}
.ci-name{font-size:11px;font-weight:500}
.ci-time{font-size:10px;color:var(--text3);margin-left:auto}
.ci-text{font-size:12px;color:var(--text2);line-height:1.5}
.res-btn{margin-top:7px;font-size:10px;padding:2px 9px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--text2);cursor:pointer;transition:all .2s}
.res-btn:hover{border-color:var(--green);color:var(--green)}
.cinput-wrap{padding:11px;border-top:1px solid var(--border)}
.cinput-hint{font-size:11px;color:var(--text3);margin-bottom:7px;line-height:1.5}
.cinput-row{display:flex;gap:7px}
.cinput{flex:1;padding:8px 11px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--body);font-size:13px;outline:none;resize:none;transition:border .2s}
.cinput:focus{border-color:var(--gold)}
.btn-send{padding:8px 13px;background:var(--gold);border:none;border-radius:8px;color:#080B10;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;align-self:flex-end}
.btn-send:hover{background:var(--gold2)}
.btn-send:disabled{opacity:.4;cursor:not-allowed}
.act-row{display:flex;gap:9px;padding:13px 16px;border-top:1px solid var(--border)}
.btn-approve{flex:1;padding:10px;background:rgba(52,211,153,0.1);border:1px solid var(--green);border-radius:8px;color:var(--green);font-family:var(--body);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-approve:hover{background:rgba(52,211,153,0.2)}
.btn-approve:disabled{opacity:.4;cursor:not-allowed}
.btn-rev{flex:1;padding:10px;background:rgba(248,113,113,0.08);border:1px solid var(--red);border-radius:8px;color:var(--red);font-family:var(--body);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-rev:hover{background:rgba(248,113,113,0.18)}
.btn-rev:disabled{opacity:.4;cursor:not-allowed}
.upload-zone{border:2px dashed var(--border2);border-radius:var(--r2);padding:44px;text-align:center;cursor:pointer;transition:all .2s;background:var(--bg2);margin-bottom:18px}
.upload-zone:hover,.upload-zone.drag{border-color:var(--gold);background:var(--gold-soft)}
.upload-icon{font-size:36px;margin-bottom:10px}
.upload-txt{color:var(--text2);font-size:14px;margin-bottom:4px}
.upload-txt strong{color:var(--gold2)}
.uform{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:24px}
.uform h3{margin-bottom:16px;font-size:15px;font-weight:500}
.btn-sec{padding:10px 20px;background:transparent;border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:var(--body);font-size:13px;cursor:pointer;transition:all .2s}
.btn-sec:hover{border-color:var(--gold);color:var(--gold2)}
.toast{position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:13px 18px;font-size:13px;box-shadow:var(--shadow2);z-index:9999;animation:toastIn .22s ease;max-width:300px}
.toast.success{border-color:var(--green);color:var(--green)}
.toast.info{border-color:var(--gold);color:var(--gold2)}
.toast.error{border-color:var(--red);color:var(--red)}
@keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.empty{text-align:center;padding:56px 20px;color:var(--text3)}
.empty-icon{font-size:44px;margin-bottom:10px}
`;

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return <div className={"toast " + type}>{msg}</div>;
}

function Pill({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className="pill" style={{ background: s.bg, color: s.color }}>
      <span className="pill-dot" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("client");
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", company: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const set = k => e => setF(prev => ({ ...prev, [k]: e.target.value }));

  const submit = () => {
    setErr(""); setOk("");
    if (mode === "register") {
      if (!f.name.trim()) return setErr("Please enter your full name.");
      if (!validEmail(f.email)) return setErr("Please enter a valid email address.");
      if (f.password.length < 6) return setErr("Password must be at least 6 characters.");
      if (f.password !== f.confirm) return setErr("Passwords do not match.");
      const res = api.register({ ...f, role });
      if (!res.ok) return setErr(res.error);
      setOk("Account created! Welcome, " + res.user.name.split(" ")[0] + " 🎉");
      setTimeout(() => onAuth(res.user), 900);
    } else {
      if (!f.email || !f.password) return setErr("Please fill in all fields.");
      const res = api.login(f.email, f.password);
      if (!res.ok) return setErr(res.error);
      onAuth(res.user);
    }
  };

  const fillDemo = (email, pw) => { setF(prev => ({ ...prev, email, password: "" + pw })); setMode("login"); setErr(""); setOk(""); };
  const switchMode = m => { setMode(m); setErr(""); setOk(""); };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">Proof.studio</div>
          <div className="auth-tagline">Client Proofing &amp; Approval Portal</div>
        </div>
        <div className="auth-tabs">
          <button className={"auth-tab " + (mode === "login" ? "on" : "")} onClick={() => switchMode("login")}>Sign In</button>
          <button className={"auth-tab " + (mode === "register" ? "on" : "")} onClick={() => switchMode("register")}>Create Account</button>
        </div>
        <div className="auth-body">
          {mode === "register" && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text3)", marginBottom: 8 }}>I am a</div>
                <div className="role-row">
                  <button className={"role-btn " + (role === "client" ? "on" : "")} onClick={() => setRole("client")}>
                    <span className="role-icon">👤</span>Client
                  </button>
                  <button className={"role-btn " + (role === "team" ? "on" : "")} onClick={() => setRole("team")}>
                    <span className="role-icon">🎨</span>Team Member
                  </button>
                </div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Full Name</label><input placeholder="Jane Smith" value={f.name} onChange={set("name")} /></div>
                <div className="fld"><label>{role === "client" ? "Company" : "Agency"}</label><input placeholder={role === "client" ? "Acme Corp" : "Design Co."} value={f.company} onChange={set("company")} /></div>
              </div>
            </>
          )}
          {err && <div className="err">{err}</div>}
          {ok  && <div className="ok">{ok}</div>}
          <div className="fld"><label>Email Address</label><input type="email" placeholder="you@example.com" value={f.email} onChange={set("email")} onKeyDown={e => e.key === "Enter" && submit()} /></div>
          <div className="fld">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={f.password} onChange={set("password")} onKeyDown={e => e.key === "Enter" && submit()} />
            {mode === "register" && <div className="pass-hint">Minimum 6 characters</div>}
          </div>
          {mode === "register" && (
            <div className="fld"><label>Confirm Password</label><input type="password" placeholder="••••••••" value={f.confirm} onChange={set("confirm")} onKeyDown={e => e.key === "Enter" && submit()} /></div>
          )}
          <button className="btn-main" onClick={submit}>{mode === "login" ? "Sign In →" : "Create Account →"}</button>
          {mode === "login" && (
            <div className="demo-row">
              <span style={{ fontSize: 11, color: "var(--text3)" }}>Demo:</span>
              <button className="demo-btn" onClick={() => fillDemo("alex@client.com", "client123")}>Client demo</button>
              <button className="demo-btn" onClick={() => fillDemo("jordan@agency.com", "team123")}>Team demo</button>
            </div>
          )}
          <div className="auth-switch" style={{ marginTop: 14 }}>
            {mode === "login" ? "New here? " : "Already registered? "}
            <span onClick={() => switchMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Asset Detail ──────────────────────────────────────────────────────────────
function Detail({ id, user, onBack, toast }) {
  const [asset, setAsset] = useState(null);
  const [pin, setPin] = useState(null);
  const [ctext, setCtext] = useState("");
  const [hov, setHov] = useState(null);
  const imgRef = useRef();

  const refresh = useCallback(() => {
    const a = api.getAsset(id);
    if (a) setAsset({ ...a, comments: [...a.comments] });
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  const clickCanvas = useCallback(e => {
    if (!asset || asset.type !== "image") return;
    const r = imgRef.current.getBoundingClientRect();
    setPin({ x: +((e.clientX - r.left) / r.width * 100).toFixed(1), y: +((e.clientY - r.top) / r.height * 100).toFixed(1) });
    setCtext("");
  }, [asset]);

  const postComment = () => {
    if (!ctext.trim()) return;
    const p = pin || { x: 50, y: 50 };
    api.addComment(id, user.id, ctext.trim(), p.x, p.y);
    setPin(null); setCtext(""); refresh();
    toast("Comment pinned", "info");
  };

  const approve = () => { api.approveAsset(id, user.id); refresh(); toast("Asset approved ✓", "success"); };
  const requestRev = () => { api.revisionAsset(id); refresh(); toast("Revision requested", "info"); };
  const resolve = cid => { api.resolveComment(id, cid); refresh(); toast("Resolved ✓", "success"); };

  if (!asset) return null;
  const openC = asset.comments.filter(c => !c.resolved);
  const doneC = asset.comments.filter(c => c.resolved);

  return (
    <div>
      <div className="back" onClick={onBack}>← Back to Assets</div>
      <div style={{ marginBottom: 22 }}>
        <div className="pg-title">{asset.title}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 7 }}>
          <Pill status={asset.status} />
          <span style={{ color: "var(--text3)", fontSize: 12 }}>v{asset.version} · {fmt(asset.uploadedAt)} · {api.getUser(asset.uploadedBy)?.name}</span>
        </div>
      </div>

      <div className="detail-wrap">
        <div>
          <div className={"canvas " + (asset.type !== "image" ? "no-pin" : "")} onClick={asset.type === "image" ? clickCanvas : undefined}>
            {asset.type === "image" ? (
              <>
                <img ref={imgRef} src={asset.url} alt={asset.title} draggable={false} style={{ width: "100%", display: "block" }} />
                {asset.comments.map((c, i) => (
                  <div key={c.id} className={"pin " + (c.resolved ? "done" : "")}
                    style={{ left: c.x + "%", top: c.y + "%" }}
                    onMouseEnter={() => setHov(c.id)} onMouseLeave={() => setHov(null)}
                    onClick={e => e.stopPropagation()}>
                    <span className="pin-inner">{i + 1}</span>
                    {hov === c.id && <div className="pin-tip"><strong>{api.getUser(c.userId)?.name}:</strong> {c.text}</div>}
                  </div>
                ))}
                {pin && (
                  <div className="pin" style={{ left: pin.x + "%", top: pin.y + "%", background: "var(--gold2)", opacity: .8 }} onClick={e => e.stopPropagation()}>
                    <span className="pin-inner">+</span>
                  </div>
                )}
                {asset.comments.length === 0 && !pin && <div className="canvas-hint">Click image to drop a comment pin</div>}
              </>
            ) : (
              <div className="canvas-copy">{asset.content}</div>
            )}
          </div>
          {asset.type === "image" && <p style={{ color: "var(--text3)", fontSize: 11, marginTop: 8, textAlign: "center" }}>💬 Click anywhere on the image to pin a comment</p>}
        </div>

        <div className="rp">
          {user.role === "client" && (
            <div className="panel">
              <div className="panel-hdr">Your Decision</div>
              <div style={{ padding: "12px 16px" }}>
                <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>Review the asset, leave comments if needed, then submit your decision.</p>
              </div>
              <div className="act-row">
                <button className="btn-approve" onClick={approve} disabled={asset.status === "approved"}>{asset.status === "approved" ? "✓ Approved" : "✓ Approve"}</button>
                <button className="btn-rev" onClick={requestRev} disabled={asset.status === "revision"}>↩ Revise</button>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-hdr">
              Add Comment
              {pin && <span style={{ fontSize: 10, background: "var(--gold-soft)", color: "var(--gold2)", borderRadius: 20, padding: "2px 8px" }}>Pin placed ✓</span>}
            </div>
            <div className="cinput-wrap">
              {asset.type === "image" && <p className="cinput-hint">{pin ? "Pin placed — type your comment below." : "Click the image first to drop a pin."}</p>}
              <div className="cinput-row">
                <textarea className="cinput" rows={3} placeholder="Write your comment..." value={ctext} onChange={e => setCtext(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.metaKey) postComment(); }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                <span style={{ fontSize: 10, color: "var(--text3)" }}>⌘+Enter to post</span>
                <button className="btn-send" onClick={postComment} disabled={!ctext.trim()}>Post</button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hdr">
              Comments
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{openC.length} open · {doneC.length} resolved</span>
            </div>
            <div className="clist">
              {asset.comments.length === 0 && <div style={{ textAlign: "center", padding: 16, color: "var(--text3)", fontSize: 12 }}>No comments yet</div>}
              {asset.comments.map((c, i) => {
                const u = api.getUser(c.userId);
                return (
                  <div key={c.id} className={"ci " + (c.resolved ? "done" : "")}>
                    <div className="ci-top">
                      <div className="ci-av">{u?.avatar}</div>
                      <span className="ci-name">{u?.name}</span>
                      {asset.type === "image" && <span style={{ fontSize: 9, background: "var(--gold-soft)", color: "var(--gold2)", borderRadius: 12, padding: "1px 6px" }}>#{i + 1}</span>}
                      <span className="ci-time">{fmtT(c.createdAt)}</span>
                    </div>
                    <div className="ci-text">{c.text}</div>
                    {!c.resolved && user.role === "team" && <button className="res-btn" onClick={() => resolve(c.id)}>Mark resolved</button>}
                    {c.resolved && <div style={{ fontSize: 10, color: "var(--green)", marginTop: 5 }}>✓ Resolved</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assets List ───────────────────────────────────────────────────────────────
function Assets({ user, onSelect }) {
  const [filter, setFilter] = useState("all");
  const assets = api.getAssets();
  const list = filter === "all" ? assets : assets.filter(a => a.status === filter);

  return (
    <div>
      <div className="pg-title">Assets</div>
      <div className="pg-sub">All uploaded creatives for review</div>
      <div className="sec-hdr">
        <div className="filters">
          {["all", "pending", "approved", "revision"].map(f => (
            <button key={f} className={"fbtn " + (filter === f ? "on" : "")} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS[f]?.label}
            </button>
          ))}
        </div>
        <span style={{ color: "var(--text3)", fontSize: 12 }}>{list.length} asset{list.length !== 1 ? "s" : ""}</span>
      </div>
      {list.length === 0
        ? <div className="empty"><div className="empty-icon">🗂</div><p>Nothing here yet</p></div>
        : (
          <div className="grid">
            {list.map(a => (
              <div key={a.id} className="card" onClick={() => onSelect(a.id)}>
                {a.type === "image" ? <img className="card-img" src={a.url} alt={a.title} /> : <div className="card-copy-thumb">📝</div>}
                <div className="badge-v">v{a.version}</div>
                {a.comments.length > 0 && <div className="badge-c">💬 {a.comments.length}</div>}
                <div className="card-body">
                  <div className="card-title">{a.title}</div>
                  <div className="card-meta"><span className="card-date">{fmt(a.uploadedAt)}</span><Pill status={a.status} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── Upload ────────────────────────────────────────────────────────────────────
function Upload({ user, toast, onDone }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("image");
  const [copy, setCopy] = useState("");

  const pick = f => { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, "")); };
  const submit = () => {
    if (!title.trim()) { toast("Add a title first", "error"); return; }
    api.uploadAsset({ title: title.trim(), type, uploadedBy: user.id, url: type === "image" ? "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=900&q=80" : null, content: type === "copy" ? copy : null, version: 1 });
    toast('"' + title.trim() + '" uploaded', "success");
    setFile(null); setTitle(""); setCopy(""); setType("image");
    onDone();
  };

  return (
    <div>
      <div className="pg-title">Upload Asset</div>
      <div className="pg-sub">Upload creatives for client review and approval</div>
      <div className={"upload-zone " + (drag ? "drag" : "")}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
        onClick={() => document.getElementById("_fi2").click()}>
        <div className="upload-icon">⬆</div>
        <div className="upload-txt"><strong>Drop files here</strong> or click to browse</div>
        <div style={{ color: "var(--text3)", fontSize: 12 }}>PNG, JPG, GIF, PDF, MP4</div>
        <input id="_fi2" type="file" style={{ display: "none" }} onChange={e => pick(e.target.files[0])} />
      </div>
      <div className="uform">
        <h3>Asset Details</h3>
        <div className="fld"><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Homepage Banner — v2" /></div>
        <div className="fld">
          <label>Type</label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {["image", "copy", "video"].map(t => <button key={t} className={"fbtn " + (type === t ? "on" : "")} onClick={() => setType(t)} style={{ textTransform: "capitalize" }}>{t}</button>)}
          </div>
        </div>
        {type === "copy" && <div className="fld"><label>Copy Content</label><textarea className="cinput" style={{ width: "100%", minHeight: 110 }} value={copy} onChange={e => setCopy(e.target.value)} placeholder="Paste your ad copy here..." /></div>}
        {file && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>📎 {file.name}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-main" style={{ width: "auto", padding: "10px 24px" }} onClick={submit}>Upload</button>
          <button className="btn-sec" onClick={() => { setFile(null); setTitle(""); }}>Clear</button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ user, onSelect }) {
  const assets = api.getAssets();
  const pend = assets.filter(a => a.status === "pending").length;
  const appr = assets.filter(a => a.status === "approved").length;
  const rev  = assets.filter(a => a.status === "revision").length;
  const recent = [...assets].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 3);

  return (
    <div>
      <div className="pg-title">
        Welcome, {user.name.split(" ")[0]}
        {user.company ? <span style={{ fontStyle: "italic", color: "var(--gold)", fontSize: 22 }}> · {user.company}</span> : ""}
      </div>
      <div className="pg-sub">Here's your project overview</div>
      <div className="stats">
        <div className="stat"><div className="stat-n" style={{ color: "var(--gold2)" }}>{assets.length}</div><div className="stat-l">Total Assets</div></div>
        <div className="stat"><div className="stat-n" style={{ color: "var(--amber)" }}>{pend}</div><div className="stat-l">Awaiting Review</div></div>
        <div className="stat"><div className="stat-n" style={{ color: "var(--green)" }}>{appr}</div><div className="stat-l">Approved</div></div>
        <div className="stat"><div className="stat-n" style={{ color: "var(--red)" }}>{rev}</div><div className="stat-l">Need Revision</div></div>
      </div>
      <div className="sec-hdr"><div style={{ fontSize: 15, fontWeight: 500 }}>Recent Assets</div></div>
      <div className="grid">
        {recent.map(a => (
          <div key={a.id} className="card" onClick={() => onSelect(a.id)}>
            {a.type === "image" ? <img className="card-img" src={a.url} alt={a.title} /> : <div className="card-copy-thumb">📝</div>}
            <div className="badge-v">v{a.version}</div>
            {a.comments.length > 0 && <div className="badge-c">💬 {a.comments.length}</div>}
            <div className="card-body">
              <div className="card-title">{a.title}</div>
              <div className="card-meta"><span className="card-date">{fmt(a.uploadedAt)}</span><Pill status={a.status} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dash");
  const [selId, setSelId] = useState(null);
  const [toastData, setToastData] = useState(null);

  const toast = useCallback((msg, type = "info") => setToastData({ msg, type, k: Date.now() }), []);
  const goAsset = id => { setSelId(id); setPage("detail"); };
  const goAssets = () => { setPage("assets"); setSelId(null); };
  const pend = api.getAssets().filter(a => a.status === "pending").length;

  if (!user) return <><style>{CSS}</style><Auth onAuth={u => { setUser(u); setPage("dash"); }} /></>;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header className="hdr">
          <div className="hdr-logo">Proof.studio</div>
          <div className="hdr-sep" />
          <div className="hdr-chip">{user.role === "team" ? "Team" : user.company || "Client"}</div>
          <div className="hdr-av">{user.avatar}</div>
          <button className="hdr-out" onClick={() => { setUser(null); setPage("dash"); }}>Sign Out</button>
        </header>
        <div className="shell">
          <nav className="sidebar">
            <div className="sb-lbl">Menu</div>
            <div className={"sb-item " + (page === "dash" ? "on" : "")} onClick={() => { setPage("dash"); setSelId(null); }}>⊞ Dashboard</div>
            <div className={"sb-item " + (page === "assets" || page === "detail" ? "on" : "")} onClick={goAssets}>
              🗂 Assets {pend > 0 && <span className="sb-badge">{pend}</span>}
            </div>
            {user.role === "team" && (
              <div className={"sb-item " + (page === "upload" ? "on" : "")} onClick={() => setPage("upload")}>⬆ Upload</div>
            )}
            <div className="sb-div" />
            <div className="sb-lbl">Account</div>
            <div className="sb-item" style={{ cursor: "default", opacity: .65, fontSize: 12 }}>👤 {user.name}</div>
            {user.company && <div className="sb-item" style={{ cursor: "default", opacity: .5, fontSize: 11 }}>🏢 {user.company}</div>}
            <div className="sb-item" style={{ cursor: "default", opacity: .5, fontSize: 11, wordBreak: "break-all" }}>✉ {user.email}</div>
          </nav>
          <main className="content">
            {page === "dash"   && <Dashboard user={user} onSelect={goAsset} />}
            {page === "assets" && <Assets user={user} onSelect={goAsset} />}
            {page === "detail" && selId && <Detail id={selId} user={user} onBack={goAssets} toast={toast} />}
            {page === "upload" && user.role === "team" && <Upload user={user} toast={toast} onDone={goAssets} />}
          </main>
        </div>
        {toastData && <Toast key={toastData.k} msg={toastData.msg} type={toastData.type} onDone={() => setToastData(null)} />}
      </div>
    </>
  );
}
