(function(){
'use strict';

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBC06miFDEZoPMjifZJGyASZJ7h-qq7QWE",
  authDomain:        "sokolcarta.firebaseapp.com",
  projectId:         "sokolcarta",
  storageBucket:     "sokolcarta.firebasestorage.app",
  messagingSenderId: "128255233343",
  appId:             "1:128255233343:web:fbf7a4b1c053b18753578a",
  measurementId:     "G-B5J1CRV03E",
  databaseURL:       "https://sokolcarta-default-rtdb.europe-west1.firebasedatabase.app"
};

const ADMIN_HASH = "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b";

const roomFromUrl = new URLSearchParams(location.search).get('room');
let ROOM_ID = (roomFromUrl || 'default').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32) || 'default';

let MY_UID = localStorage.getItem('ku_sync_uid');
if(!MY_UID){
  MY_UID = 'u' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2,'0')).join('');
  localStorage.setItem('ku_sync_uid', MY_UID);
}

let db = null;
let initialized = false;
let panel = null;
let listeners = [];
let remoteLayer = null;

let isAdmin = !!sessionStorage.getItem('ku_admin');
let isSharing = false;
let isWatching = false;

let uploadTimer = null;
let adminPushTimer = null;
let shareQuickTimer = null;
let myLastSig = '';
let myLastTs = 0;

const remoteSnapshot = new Map(); // uid -> user data
const remoteGhost = new Map();    // uid -> {markers, lines}
const adminLinked = new Map();    // "uid:itemId" -> local item

function key(uid, itemId){ return `${uid}:${itemId}`; }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function isTrackUiOn(){
  const b = document.getElementById('urTrackBtn');
  return !!(window.isDrawingTrack || (b && b.classList.contains('active')));
}

function toast(msg, color='#4ade80'){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:80px;right:14px;z-index:9999;background:rgba(10,14,22,.97);color:${color};border:1px solid ${color}88;border-radius:8px;padding:8px 14px;font-family:monospace;font-size:11px;box-shadow:0 4px 16px rgba(0,0,0,.6);transition:opacity .35s;pointer-events:none;`;
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),350); }, 1800);
}

async function sha256Hex(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

window.generateAdminHash = async function(pass){
  const h = await sha256Hex(String(pass || ''));
  console.log('[SOKIL] Хеш для ADMIN_HASH:');
  console.log(h);
};

window.setAdmin = async function(pass){
  const h = await sha256Hex(String(pass || ''));
  if(h !== ADMIN_HASH){
    toast('Невірний пароль', '#f87171');
    return false;
  }
  isAdmin = true;
  window.isAdmin = true;
  sessionStorage.setItem('ku_admin','1');
  updateUi();
  rebuildRemoteView();
  toast('Адмін-режим увімкнено', '#fbbf24');
  return true;
};

function getKuZoneForItem(item){
  if(!(window.kuCircles instanceof Map) || !item) return null;
  const z = window.kuCircles.get(item.id);
  if(!z || !z.weapon) return null;
  return {
    weapon: {
      id: z.weapon.id || '',
      name: z.weapon.name || '',
      range_km: Number(z.weapon.range_km) || 0
    },
    zoneType: z.zoneType || 'circle',
    sectorDeg: Number(z.sectorDeg) || 360,
    headingDeg: Number(z.headingDeg) || 0,
    opacity: Number(z.opacity) || 0.15,
    color: z.color || '#ef4444',
    hidden: !!z.hidden,
    ppo: !!z.ppo
  };
}

function clearKuZoneForItem(item){
  if(!(window.kuCircles instanceof Map) || !item) return;
  const z = window.kuCircles.get(item.id);
  if(!z) return;
  if(Array.isArray(z.layers)){
    z.layers.forEach(ly => { try{ map.removeLayer(ly); }catch(_e){} });
  }
  window.kuCircles.delete(item.id);
}

function applyKuZoneForItem(item, zone){
  if(!item) return;
  const sig = JSON.stringify(zone || null);
  if(item.__remoteKuSig === sig) return;
  item.__remoteKuSig = sig;
  clearKuZoneForItem(item);
  if(!zone || typeof window.kuDrawZone !== 'function') return;
  try{
    window.kuDrawZone(
      item,
      zone.weapon || { id:'', name:'Зона', range_km:0 },
      zone.zoneType || 'circle',
      Number(zone.sectorDeg) || 360,
      Number(zone.headingDeg) || 0,
      Number(zone.opacity) || 0.15,
      zone.color || '#ef4444'
    );
    if(window.kuCircles instanceof Map){
      const z = window.kuCircles.get(item.id);
      if(z){
        z.ppo = !!zone.ppo;
        if(zone.hidden){
          if(Array.isArray(z.layers)){
            z.layers.forEach(ly => { try{ map.removeLayer(ly); }catch(_e){} });
          }
          z.layers = [];
          z.hidden = true;
        }
        window.kuCircles.set(item.id, z);
      }
    }
  }catch(_e){}
}

function serializeItem(item){
  const ll = item.marker.getLatLng();
  const out = {
    type: String(item.type || 'drone').slice(0,40),
    lat: Math.round(ll.lat * 1e6) / 1e6,
    lng: Math.round(ll.lng * 1e6) / 1e6,
    headingDeg: Number(item.headingDeg) || 0,
    count: Number(item.count) || 1,
    customIconUrl: item.customIconUrl ? String(item.customIconUrl).slice(0,200) : null
  };
  if(item.__kuConfig) out.kuConfig = item.__kuConfig;
  const zone = getKuZoneForItem(item);
  if(zone) out.kuZone = zone;
  if(Array.isArray(item.track) && item.track.length > 1){
    out.track = item.track.slice(0,500).map(p => [Math.round(p.lat*1e6)/1e6, Math.round(p.lng*1e6)/1e6]);
  }
  if(Array.isArray(item.pathHistory) && item.pathHistory.length > 1){
    out.path = item.pathHistory.slice(-400).map(p => [Math.round(p.lat*1e6)/1e6, Math.round(p.lng*1e6)/1e6]);
  }
  return out;
}

function serializeOwnState(){
  if(!(window.state && window.state.items instanceof Map)) return {};
  const out = {};
  window.state.items.forEach((item, id)=>{
    if(item && item.__remoteLinked) return;
    try{ out[id] = serializeItem(item); }catch(_e){}
  });
  return out;
}

function applyEntryToLocal(item, entry){
  if(!item || !entry || !item.marker) return;
  item.marker.setLatLng([Number(entry.lat)||0, Number(entry.lng)||0]);
  item.headingDeg = Number(entry.headingDeg) || 0;
  item.count = Math.max(1, Number(entry.count) || 1);
  if(entry.kuConfig) item.__kuConfig = entry.kuConfig;
  if(typeof item.marker.setRotationAngle === 'function') item.marker.setRotationAngle(item.headingDeg);
  if(item.label && typeof item.label.setIcon === 'function'){
    item.label.setIcon(L.divIcon({
      className: window.__hideCount ? '' : 'label-count',
      html: window.__hideCount ? '' : String(item.count),
      iconAnchor: [-10, -10]
    }));
  }
  if(Array.isArray(entry.track) && entry.track.length > 1){
    item.track = entry.track.map(p => L.latLng(Number(p[0])||0, Number(p[1])||0));
  }
  if(Array.isArray(entry.path) && entry.path.length > 1){
    item.pathHistory = entry.path.map(p => L.latLng(Number(p[0])||0, Number(p[1])||0));
    if(item.pathPolyline) item.pathPolyline.setLatLngs(item.pathHistory);
  }
  applyKuZoneForItem(item, entry.kuZone || null);
  try{ if(typeof window.createArrowFor === 'function') window.createArrowFor(item); }catch(_e){}
}

function removeLocalItem(item){
  if(!item) return;
  try{ if(item.marker) map.removeLayer(item.marker); }catch(_e){}
  try{ if(item.arrowLine) map.removeLayer(item.arrowLine); }catch(_e){}
  try{ if(item.decorator) map.removeLayer(item.decorator); }catch(_e){}
  try{ if(item.label) map.removeLayer(item.label); }catch(_e){}
  try{ if(item.pathPolyline) map.removeLayer(item.pathPolyline); }catch(_e){}
  clearKuZoneForItem(item);
  if(window.state && window.state.items instanceof Map){
    try{ window.state.items.delete(item.id); }catch(_e){}
  }
}

function upsertAdminLinked(uid, itemId, entry){
  if(!isAdmin || !window.addItem || !(window.state && window.state.items instanceof Map)) return;
  const k = key(uid, itemId);
  let item = adminLinked.get(k) || null;
  if(!item){
    const options = entry && entry.customIconUrl ? { iconUrl: entry.customIconUrl } : undefined;
    item = window.addItem(entry.type || 'drone', L.latLng(Number(entry.lat)||0, Number(entry.lng)||0), options);
    if(!item) return;
    item.__remoteLinked = true;
    item.__remoteOwnerUid = String(uid);
    item.__remoteItemId = String(itemId);
    item.__remoteLockUntil = 0;
    adminLinked.set(k, item);
  }
  const entrySig = JSON.stringify(entry || {});
  if(item.__remoteLastSentSig && item.__remoteLastSentSig === entrySig){
    item.__remoteLastSeenSig = entrySig;
    return;
  }
  if(Date.now() < (item.__remoteLockUntil || 0)) return;
  item.__remoteLastSeenSig = entrySig;
  applyEntryToLocal(item, entry || {});
}

function pushAdminLinked(){
  if(!db || !isAdmin) return;
  const touched = new Set();
  adminLinked.forEach((item)=>{
    if(!item || !item.__remoteOwnerUid || !item.__remoteItemId) return;
    let payload = null;
    try{ payload = serializeItem(item); }catch(_e){}
    if(!payload) return;
    const sig = JSON.stringify(payload);
    if(sig === item.__remoteLastSentSig) return;
    item.__remoteLastSentSig = sig;
    item.__remoteLockUntil = Date.now() + 1200;
    db.ref(`rooms/${ROOM_ID}/users/${item.__remoteOwnerUid}/items/${item.__remoteItemId}`).set(payload).catch(()=>{});
    touched.add(String(item.__remoteOwnerUid));
  });
  if(touched.size){
    const now = Date.now();
    touched.forEach(uid => db.ref(`rooms/${ROOM_ID}/users/${uid}/ts`).set(now).catch(()=>{}));
  }
}

function uploadOwn(force){
  if(!isSharing || !db) return;
  const items = serializeOwnState();
  const sig = JSON.stringify(items);
  const now = Date.now();
  if(!force && sig === myLastSig && (now - myLastTs) < 1200) return;
  myLastSig = sig;
  myLastTs = now;
  db.ref(`rooms/${ROOM_ID}/users/${MY_UID}`).set({
    uid: MY_UID,
    ts: now,
    items
  }).catch(()=>{});
}

function queueOwnUpload(){
  if(!isSharing || !db) return;
  clearTimeout(shareQuickTimer);
  shareQuickTimer = setTimeout(()=>uploadOwn(true), 1);
}

function bindOwnChangeHooks(){
  const trigger = ()=>queueOwnUpload();
  try{
    if(window.map){
      map.on('click', trigger);
      map.on('mouseup', trigger);
      map.on('dragend', trigger);
      map.on('moveend', trigger);
    }
  }catch(_e){}
  try{ window.addEventListener('ku-track-draft-changed', trigger); }catch(_e){}
}

function ensureGhost(uid){
  if(remoteGhost.has(uid)) return remoteGhost.get(uid);
  const obj = { markers:new Map(), lines:new Map() };
  remoteGhost.set(uid, obj);
  return obj;
}

function clearGhost(uid){
  const g = remoteGhost.get(uid);
  if(!g) return;
  g.markers.forEach(m=>{ try{ map.removeLayer(m); }catch(_e){} });
  g.lines.forEach(l=>{ try{ map.removeLayer(l); }catch(_e){} });
  remoteGhost.delete(uid);
}

function iconFor(entry){
  let src = entry.customIconUrl || null;
  let w = 28, h = 28;
  if(!src && window.getIconForType){
    const base = window.getIconForType(entry.type);
    if(base && base.options && base.options.iconUrl){
      src = base.options.iconUrl;
      w = (base.options.iconSize && base.options.iconSize[0]) || 28;
      h = (base.options.iconSize && base.options.iconSize[1]) || 28;
    }
  }
  if(src) return L.icon({ iconUrl:src, iconSize:[w,h], iconAnchor:[Math.round(w/2), Math.round(h/2)] });
  return L.divIcon({ className:'', html:'<div style="width:14px;height:14px;border-radius:50%;background:#ff3b30;border:2px solid #fff;"></div>', iconSize:[14,14], iconAnchor:[7,7] });
}

function renderGhostUser(uid, user){
  const g = ensureGhost(uid);
  const items = user && user.items ? user.items : {};
  const incoming = new Set(Object.keys(items));

  g.markers.forEach((m,id)=>{
    if(incoming.has(id)) return;
    try{ map.removeLayer(m); }catch(_e){}
    g.markers.delete(id);
  });
  g.lines.forEach((ln,id)=>{
    if(incoming.has(id.replace(/^t_/,'')) || incoming.has(id.replace(/^p_/,''))) return;
    try{ map.removeLayer(ln); }catch(_e){}
    g.lines.delete(id);
  });

  Object.entries(items).forEach(([id, entry])=>{
    const ll = [Number(entry.lat)||0, Number(entry.lng)||0];
    const ico = iconFor(entry || {});
    if(g.markers.has(id)){
      const m = g.markers.get(id);
      m.setLatLng(ll);
      m.setIcon(ico);
      if(typeof m.setRotationAngle === 'function') m.setRotationAngle(Number(entry.headingDeg)||0);
    } else {
      const m = L.marker(ll, { icon:ico, rotationAngle:Number(entry.headingDeg)||0, zIndexOffset:100 }).addTo(map);
      g.markers.set(id, m);
    }
    if(Array.isArray(entry.path) && entry.path.length > 1){
      const pts = entry.path.map(p=>[Number(p[0])||0, Number(p[1])||0]);
      const idp = `p_${id}`;
      if(g.lines.has(idp)) g.lines.get(idp).setLatLngs(pts);
      else g.lines.set(idp, L.polyline(pts, { color:'#ff3b30', weight:1.5, opacity:.6 }).addTo(map));
    } else {
      const idp = `p_${id}`;
      if(g.lines.has(idp)){ try{ map.removeLayer(g.lines.get(idp)); }catch(_e){} g.lines.delete(idp); }
    }
    if(isTrackUiOn() && Array.isArray(entry.track) && entry.track.length > 1){
      const pts = entry.track.map(p=>[Number(p[0])||0, Number(p[1])||0]);
      const idt = `t_${id}`;
      if(g.lines.has(idt)) g.lines.get(idt).setLatLngs(pts);
      else g.lines.set(idt, L.polyline(pts, { color:'#22c55e', weight:2.2, dashArray:'6,7', opacity:.85 }).addTo(map));
    } else {
      const idt = `t_${id}`;
      if(g.lines.has(idt)){ try{ map.removeLayer(g.lines.get(idt)); }catch(_e){} g.lines.delete(idt); }
    }
  });
}

function rebuildRemoteView(){
  if(!isWatching) return;
  // clear current visual layer
  remoteGhost.forEach((_g, uid)=>clearGhost(uid));
  adminLinked.forEach(item=>removeLocalItem(item));
  adminLinked.clear();

  const seen = new Set();
  remoteSnapshot.forEach((user, uid)=>{
    if(uid === MY_UID) return;
    if(user && user.ts && Date.now() - user.ts > 120000) return;
    seen.add(uid);
    if(isAdmin){
      const items = (user && user.items) || {};
      Object.entries(items).forEach(([itemId, entry])=>upsertAdminLinked(uid, itemId, entry || {}));
    } else {
      renderGhostUser(uid, user || {});
    }
  });

  updateUsersList();
}

function updateUsersList(){
  const el = document.getElementById('syncUserList');
  if(!el) return;
  const rows = [];
  remoteSnapshot.forEach((user, uid)=>{
    if(uid === MY_UID) return;
    const cnt = Object.keys((user && user.items) || {}).length;
    const age = Math.max(0, Math.round((Date.now() - Number((user && user.ts) || 0))/1000));
    const ageStr = age < 60 ? `${age}s` : `${Math.round(age/60)}m`;
    rows.push(`<div style="display:flex;gap:6px;align-items:center;margin:3px 0;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06);"><span style="color:#93c5fd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${escapeHtml(uid.slice(0,10))}...</span><span style="color:rgba(255,255,255,.45)">${cnt} · ${ageStr}</span></div>`);
  });
  if(!rows.length){
    el.innerHTML = '<div style="color:rgba(255,255,255,.35);text-align:center;padding:4px 0;">Немає інших користувачів</div>';
  }else{
    el.innerHTML = rows.join('');
  }
}

function startSharing(){
  if(!db) return;
  isSharing = true;
  uploadOwn(true);
  clearInterval(uploadTimer);
  uploadTimer = setInterval(()=>uploadOwn(false), 16);
  db.ref(`rooms/${ROOM_ID}/users/${MY_UID}`).onDisconnect().remove();
  updateUi();
  toast('Трансляцію увімкнено');
}

function stopSharing(){
  isSharing = false;
  clearInterval(uploadTimer);
  uploadTimer = null;
  clearTimeout(shareQuickTimer);
  shareQuickTimer = null;
  myLastSig = '';
  myLastTs = 0;
  if(db) db.ref(`rooms/${ROOM_ID}/users/${MY_UID}`).remove().catch(()=>{});
  updateUi();
  toast('Трансляцію вимкнено', '#94a3b8');
}

function startWatching(){
  if(!db) return;
  isWatching = true;
  clearInterval(adminPushTimer);
  adminPushTimer = setInterval(pushAdminLinked, 16);
  const ref = db.ref(`rooms/${ROOM_ID}/users`);
  const cb = ref.on('value', snap=>{
    const all = snap.val() || {};
    remoteSnapshot.clear();
    Object.entries(all).forEach(([uid, data])=>remoteSnapshot.set(uid, data || {}));
    rebuildRemoteView();
  });
  listeners.push(()=>ref.off('value', cb));
  updateUi();
  toast('Перегляд увімкнено', '#3b82f6');
}

function stopWatching(){
  isWatching = false;
  clearInterval(adminPushTimer);
  adminPushTimer = null;
  listeners.forEach(fn=>{ try{ fn(); }catch(_e){} });
  listeners = [];
  remoteSnapshot.clear();
  remoteGhost.forEach((_g, uid)=>clearGhost(uid));
  adminLinked.forEach(item=>removeLocalItem(item));
  adminLinked.clear();
  updateUi();
  toast('Перегляд вимкнено', '#94a3b8');
}

function changeRoom(){
  const input = document.getElementById('syncRoomInput');
  const value = String(input ? input.value : '').trim().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32);
  if(!value){ toast('Некоректний ID кімнати', '#f87171'); return; }
  const wasShare = isSharing;
  const wasWatch = isWatching;
  if(isSharing) stopSharing();
  if(isWatching) stopWatching();
  ROOM_ID = value;
  const url = new URL(location.href);
  url.searchParams.set('room', ROOM_ID);
  history.replaceState(null, '', url.toString());
  if(wasShare) startSharing();
  if(wasWatch) startWatching();
  toast(`Кімната: ${ROOM_ID}`);
}

function updateUi(){
  const status = document.getElementById('syncConnStatus');
  const shareBtn = document.getElementById('syncShareBtn');
  const watchBtn = document.getElementById('syncWatchBtn');
  const adminBtn = document.getElementById('syncAdminBtn');
  const adminBadge = document.getElementById('syncAdminBadge');
  if(shareBtn){
    shareBtn.style.background = isSharing ? 'rgba(74,222,128,.2)' : 'rgba(255,255,255,.05)';
    shareBtn.style.borderColor = isSharing ? '#4ade80' : 'rgba(255,255,255,.18)';
    shareBtn.style.color = isSharing ? '#4ade80' : '#94a3b8';
    shareBtn.innerHTML = `МОЯ<br>ОБСТАНОВКА<br><span style="font-size:9px;color:${isSharing?'#4ade80':'rgba(255,255,255,.35)'};">${isSharing?'УВІМКНЕНО':'ВИМКНЕНО'}</span>`;
  }
  if(watchBtn){
    watchBtn.style.background = isWatching ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.05)';
    watchBtn.style.borderColor = isWatching ? '#3b82f6' : 'rgba(255,255,255,.18)';
    watchBtn.style.color = isWatching ? '#93c5fd' : '#94a3b8';
    watchBtn.innerHTML = `ІНШІ<br>КОРИСТУВАЧІ<br><span style="font-size:9px;color:${isWatching?'#93c5fd':'rgba(255,255,255,.35)'};">${isWatching?'УВІМКНЕНО':'ВИМКНЕНО'}</span>`;
  }
  if(adminBtn){
    adminBtn.style.background = isAdmin ? 'rgba(251,191,36,.2)' : 'rgba(251,191,36,.08)';
    adminBtn.style.borderColor = isAdmin ? 'rgba(251,191,36,.7)' : 'rgba(251,191,36,.3)';
    adminBtn.style.color = isAdmin ? '#fbbf24' : '#d97706';
    adminBtn.textContent = isAdmin ? 'АДМІН УВІМК (ВИМКНУТИ)' : 'АДМІН РЕЖИМ';
  }
  if(adminBadge) adminBadge.style.display = isAdmin ? 'inline-block' : 'none';
  if(status && !db){
    status.textContent = 'ОФЛАЙН';
    status.style.color = '#f87171';
  }
}

function buildUi(){
  panel = document.createElement('div');
  panel.id = 'syncPanel';
  panel.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:4000;background:rgba(8,12,20,.98);border:1px solid rgba(74,222,128,.4);border-radius:12px;padding:12px 14px;font-family:"Courier New",monospace;font-size:11px;min-width:230px;max-width:265px;box-shadow:0 8px 32px rgba(0,0,0,.7);backdrop-filter:blur(14px);display:none;';
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(74,222,128,.18);">
      <span style="color:rgba(74,222,128,.85);font-size:9px;letter-spacing:2px;text-transform:uppercase;">СПІЛЬНА КАРТА</span>
      <div style="display:flex;gap:5px;align-items:center;">
        <span id="syncAdminBadge" style="display:none;background:rgba(251,191,36,.2);color:#fbbf24;border:1px solid rgba(251,191,36,.5);border-radius:4px;padding:1px 6px;font-size:9px;">АДМІН</span>
        <span id="syncConnStatus" style="color:#f87171;font-size:9px;">ОФЛАЙН</span>
      </div>
    </div>
    <div style="display:flex;gap:5px;align-items:center;margin-bottom:8px;">
      <span style="color:rgba(255,255,255,.45);font-size:9px;min-width:54px;">КІМНАТА:</span>
      <input id="syncRoomInput" value="${escapeHtml(ROOM_ID)}" maxlength="32" style="flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#e2e8f0;font-family:monospace;font-size:10px;padding:3px 7px;outline:none;">
      <button id="syncRoomApply" style="background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.5);color:#4ade80;border-radius:5px;padding:3px 8px;cursor:pointer;font-family:monospace;font-size:10px;">OK</button>
    </div>
    <div style="margin-bottom:8px;font-size:9px;color:rgba(255,255,255,.3);">ID: ${escapeHtml(MY_UID.slice(0,14))}...</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
      <button id="syncShareBtn" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.18);color:#94a3b8;border-radius:8px;padding:8px 4px;cursor:pointer;font-family:monospace;font-size:10px;text-align:center;line-height:1.4;transition:all .2s;"></button>
      <button id="syncWatchBtn" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.18);color:#94a3b8;border-radius:8px;padding:8px 4px;cursor:pointer;font-family:monospace;font-size:10px;text-align:center;line-height:1.4;transition:all .2s;"></button>
    </div>
    <button id="syncAdminBtn" style="width:100%;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);color:#d97706;border-radius:7px;padding:5px;cursor:pointer;font-family:monospace;font-size:10px;margin-bottom:8px;transition:all .2s;"></button>
    <div id="syncUserList" style="font-size:9px;color:rgba(74,222,128,.6);max-height:90px;overflow-y:auto;scrollbar-width:thin;"></div>
  `;
  document.body.appendChild(panel);

  document.getElementById('syncRoomApply').onclick = changeRoom;
  document.getElementById('syncRoomInput').addEventListener('keypress', e=>{ if(e.key === 'Enter') changeRoom(); });
  document.getElementById('syncShareBtn').onclick = ()=>{ if(!db) return toast('Firebase не підключено', '#f87171'); if(isSharing) stopSharing(); else startSharing(); };
  document.getElementById('syncWatchBtn').onclick = ()=>{ if(!db) return toast('Firebase не підключено', '#f87171'); if(isWatching) stopWatching(); else startWatching(); };
  document.getElementById('syncAdminBtn').onclick = async ()=>{
    if(isAdmin){
      isAdmin = false;
      window.isAdmin = false;
      sessionStorage.removeItem('ku_admin');
      updateUi();
      rebuildRemoteView();
      toast('Адмін-режим вимкнено', '#94a3b8');
      return;
    }
    const pass = prompt('Введи адмін-пароль:');
    if(pass !== null) await window.setAdmin(pass);
  };
  updateUi();
}

function setPanelVisible(v){
  if(!panel) return;
  panel.style.display = v ? 'block' : 'none';
}

window.toggleSyncPanel = function(force){
  const visible = !!(panel && panel.style.display !== 'none');
  const next = typeof force === 'boolean' ? force : !visible;
  setPanelVisible(next);
};

function initFirebase(){
  const urls = [
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js'
  ];
  let loaded = 0;
  urls.forEach((src)=>{
    const s = document.createElement('script');
    s.src = src;
    s.onload = ()=>{ if(++loaded === urls.length) onFirebaseReady(); };
    s.onerror = ()=>{
      const st = document.getElementById('syncConnStatus');
      if(st){ st.textContent = 'ПОМИЛКА SDK'; st.style.color = '#f87171'; }
      toast('Не вдалося завантажити Firebase SDK', '#f87171');
    };
    document.head.appendChild(s);
  });
}

async function onFirebaseReady(){
  try{
    const dbUrl = String(FIREBASE_CONFIG.databaseURL || '').trim().replace(/\/+$/,'');
    const cfg = { ...FIREBASE_CONFIG, databaseURL: dbUrl };
    if(!firebase.apps.length) firebase.initializeApp(cfg);
    db = firebase.app().database();
    db.ref('.info/connected').on('value', snap=>{
      const ok = !!snap.val();
      const st = document.getElementById('syncConnStatus');
      if(st){
        st.textContent = ok ? 'ОНЛАЙН' : 'ОФЛАЙН';
        st.style.color = ok ? '#4ade80' : '#f87171';
      }
    });
    window.syncDiag = async function(){
      try{
        const connected = await db.ref('.info/connected').once('value');
        console.log('[syncDiag] connected:', !!connected.val());
        const p = `rooms/${ROOM_ID}/diag/${MY_UID}`;
        await db.ref(p).set({ ts: Date.now() });
        await db.ref(p).remove();
        console.log('[syncDiag] write/remove: ok');
      }catch(e){
        console.error('[syncDiag] error:', e);
      }
    };
    setInterval(()=>{
      if(!isAdmin || !db) return;
      db.ref(`rooms/${ROOM_ID}/users`).once('value').then(snap=>{
        const all = snap.val() || {};
        Object.entries(all).forEach(([uid, data])=>{
          if(uid === MY_UID) return;
          const ts = Number((data && data.ts) || 0);
          if(ts && Date.now() - ts > 180000){
            db.ref(`rooms/${ROOM_ID}/users/${uid}`).remove().catch(()=>{});
          }
        });
      }).catch(()=>{});
    }, 30000);
    updateUi();
    console.log('[SOKIL] Firebase підключено');
  }catch(e){
    toast('Помилка Firebase: ' + (e && e.message ? e.message : String(e)), '#f87171');
  }
}

function init(){
  if(initialized) return;
  initialized = true;
  window.isAdmin = isAdmin;
  remoteLayer = L.layerGroup().addTo(map);
  buildUi();
  bindOwnChangeHooks();
  const trackBtn = document.getElementById('urTrackBtn');
  if(trackBtn) trackBtn.addEventListener('click', ()=>setTimeout(rebuildRemoteView, 0));
  setInterval(()=>{ if(isWatching && !isAdmin) rebuildRemoteView(); }, 250);
  initFirebase();
}

if(document.readyState === 'complete' || document.readyState === 'interactive'){
  setTimeout(init, 500);
} else {
  window.addEventListener('DOMContentLoaded', ()=>setTimeout(init, 500));
}

})();

