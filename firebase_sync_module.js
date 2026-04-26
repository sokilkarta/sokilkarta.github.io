// ============================================================
//  FIREBASE SYNC MODULE вЂ” Р—Р°С…РёС‰РµРЅР° СЃРїС–Р»СЊРЅР° РєР°СЂС‚Р°  рџ¦… SOKIL
//  Р’СЃС‚Р°РІРёС‚Рё РїРµСЂРµРґ </body> РїС–СЃР»СЏ РІСЃС–С… С–РЅС€РёС… СЃРєСЂРёРїС‚С–РІ
//
//  РљР РћРљ 1: Р—Р°РјС–РЅРёС‚Рё DATABASE_URL СЃРІРѕС—Рј РїРѕСЃРёР»Р°РЅРЅСЏРј Р· Firebase Console
//          Realtime Database в†’ СЃРєРѕРїС–СЋР№ URL РІРёРґСѓ:
//          https://sokolcarta-default-rtdb.europe-west1.firebasedatabase.app
// ============================================================

(function(){
'use strict';

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// РљРћРќР¤Р†Р“ вЂ” С‚РІРѕС— РґР°РЅС– Firebase
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBC06miFDEZoPMjifZJGyASZJ7h-qq7QWE",
  authDomain:        "sokolcarta.firebaseapp.com",
  projectId:         "sokolcarta",
  storageBucket:     "sokolcarta.firebasestorage.app",
  messagingSenderId: "128255233343",
  appId:             "1:128255233343:web:fbf7a4b1c053b18753578a",
  measurementId:     "G-B5J1CRV03E",
  // вљ пёЏ  Р—РђРњР†РќРРўР вЂ” СЃРєРѕРїС–СЋР№ Р· Firebase Console в†’ Realtime Database в†’ РїРѕСЃРёР»Р°РЅРЅСЏ Р·РІРµСЂС…Сѓ
  databaseURL: "https://sokolcarta-default-rtdb.europe-west1.firebasedatabase.app"
};

function withTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise((_, reject)=>setTimeout(()=>reject(new Error('timeout')), ms))
  ]);
}

async function probeDbUrl(url){
  try{
    // REST probe: if host exists, Firebase returns JSON/error payload with HTTP response.
    const r = await withTimeout(fetch(String(url).replace(/\/+$/,'') + '/.json?shallow=true', { method:'GET' }), 5000);
    return !!r;
  }catch(_e){
    return false;
  }
}

async function resolveDatabaseUrl(){
  const fromConfig = String(FIREBASE_CONFIG.databaseURL || '').trim();
  const pid = String(FIREBASE_CONFIG.projectId || '').trim();
  if(fromConfig) return fromConfig.replace(/\/+$/,'');
  if(pid) return `https://${pid}-default-rtdb.firebaseio.com`;
  return '';
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// Р—РђРҐРРЎРў вЂ” SHA-256 С…РµС€ Р°РґРјС–РЅ РїР°СЂРѕР»СЏ
//
//  РЇРє РІСЃС‚Р°РЅРѕРІРёС‚Рё РЎР’Р†Р™ РїР°СЂРѕР»СЊ:
//  1. Р’С–РґРєСЂРёР№ F12 в†’ РљРѕРЅСЃРѕР»СЊ
//  2. Р’РІРµРґРё: generateAdminHash("С‚РІС–Р№РџР°СЂРѕР»СЊ")
//  3. РЎРєРѕРїС–СЋР№ С…РµС€ С– РІСЃС‚Р°РІ РЅРёР¶С‡Рµ Р·Р°РјС–СЃС‚СЊ РїРѕС‚РѕС‡РЅРѕРіРѕ
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
const ADMIN_HASH = '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b';
// ^ Р¦Рµ С…РµС€ РїР°СЂРѕР»СЏ "sokil2025" вЂ” Р—РђРњР†РќР РќРђ РЎР’Р†Р™

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// РљР†РњРќРђРўРђ
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
const urlRoom = new URLSearchParams(location.search).get('room');
let ROOM_ID   = (urlRoom || 'default').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32) || 'default';

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// РЈРќР†РљРђР›Р¬РќРР™ ID Р‘Р РђРЈР—Р•Р Рђ
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
let MY_UID = localStorage.getItem('ku_sync_uid');
if(!MY_UID){
  MY_UID = 'u' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2,'0')).join('');
  localStorage.setItem('ku_sync_uid', MY_UID);
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// РЎРўРђРќ
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
let db            = null;
let isAdmin       = !!sessionStorage.getItem('ku_admin');
let isSharing     = false;
let isWatching    = false;
let uploadTimer   = null;
let remoteMarkers = new Map();
let remoteLines   = new Map();
let remoteLabels  = new Map();
let remoteLocalLinks = new Map(); // key: uid:itemId -> local item
let remotePushTimer = null;
let shareChangeTimer = null;
let myLastItemsSig = '';
let myLastUploadAt = 0;
let fastSyncBound = false;
let fbListeners   = [];
let initialized   = false;
let syncPanelEl   = null;

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// РђР”РњР†Рќ
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
async function hashPassword(pass){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function tryAdminLogin(pass){
  const h = await hashPassword(pass);
  if(h === ADMIN_HASH){
    isAdmin = true;
    sessionStorage.setItem('ku_admin','1');
    updateAdminBadge();
    showToast('вњ… РђРґРјС–РЅ РґРѕСЃС‚СѓРї РЅР°РґР°РЅРѕ','#4ade80');
    return true;
  }
  showToast('вќЊ РќРµРІС–СЂРЅРёР№ РїР°СЂРѕР»СЊ','#f87171');
  await new Promise(r => setTimeout(r, 2000)); // Р·Р°С…РёСЃС‚ РІС–Рґ Р±СЂСѓС‚С„РѕСЂСЃСѓ
  return false;
}

// РљРѕРјР°РЅРґРё РґР»СЏ РєРѕРЅСЃРѕР»С– (F12)
window.setAdmin = async function(pass){
  if(typeof pass !== 'string' || !pass){ console.error('Р’РёРєРѕСЂРёСЃС‚Р°РЅРЅСЏ: setAdmin("РїР°СЂРѕР»СЊ")'); return; }
  const ok = await tryAdminLogin(pass);
  if(ok) console.log('%c[рџ¦… SOKIL] РђРґРјС–РЅ СЂРµР¶РёРј Р°РєС‚РёРІРѕРІР°РЅРѕ','color:#4ade80;font-weight:bold;font-size:14px;');
  else   console.error('[SOKIL] РќРµРІС–СЂРЅРёР№ РїР°СЂРѕР»СЊ');
};

window.generateAdminHash = async function(pass){
  const h = await hashPassword(pass);
  console.log('%c[рџ¦… SOKIL] РҐРµС€ РґР»СЏ ADMIN_HASH:','color:#4ade80;font-weight:bold;');
  console.log('%c' + h, 'color:#fbbf24;font-size:13px;font-weight:bold;');
  console.log('РЎРєРѕРїС–СЋР№ С– РІСЃС‚Р°РІ Сѓ firebase_sync_module.js в†’ ADMIN_HASH');
};

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// РЎР•Р Р†РђР›Р†Р—РђР¦Р†РЇ
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
function serializeItems(){
  if(!window.state || !window.state.items) return {};
  const out = {};
  for(const [id, item] of state.items){
    if(item && item.__remoteLinked) continue;
    try{
      const ll = item.marker.getLatLng();
      const entry = {
        id,
        type:          String(item.type||'drone').slice(0,40),
        lat:           Math.round(ll.lat * 1e6) / 1e6,
        lng:           Math.round(ll.lng * 1e6) / 1e6,
        headingDeg:    Number(item.headingDeg)||0,
        count:         Number(item.count)||1,
        customIconUrl: item.customIconUrl ? String(item.customIconUrl).slice(0,200) : null
      };
      if(item.track && item.track.length > 1)
        entry.track = item.track.slice(0,500).map(p=>[Math.round(p.lat*1e6)/1e6, Math.round(p.lng*1e6)/1e6]);
      if(item.pathHistory && item.pathHistory.length > 1)
        entry.path  = item.pathHistory.slice(-300).map(p=>[Math.round(p.lat*1e6)/1e6, Math.round(p.lng*1e6)/1e6]);
      out[id] = entry;
    }catch(e){}
  }
  return out;
}

function linkedKey(uid, itemId){ return String(uid) + ':' + String(itemId); }

function removeLocalItemSafe(item){
  if(!item || !window.map) return;
  try{ if(item.marker) map.removeLayer(item.marker); }catch(e){}
  try{ if(item.arrowLine) map.removeLayer(item.arrowLine); }catch(e){}
  try{ if(item.decorator) map.removeLayer(item.decorator); }catch(e){}
  try{ if(item.label) map.removeLayer(item.label); }catch(e){}
  try{ if(item.pathPolyline) map.removeLayer(item.pathPolyline); }catch(e){}
  if(window.state && window.state.items instanceof Map){
    try{ window.state.items.delete(item.id); }catch(e){}
  }
}

function applyEntryToLocalItem(item, entry){
  if(!item || !entry || !item.marker) return;
  const ll = L.latLng(Number(entry.lat)||0, Number(entry.lng)||0);
  item.marker.setLatLng(ll);
  item.headingDeg = Number(entry.headingDeg)||0;
  item.count = Math.max(1, Number(entry.count)||1);
  if(typeof item.marker.setRotationAngle === 'function') item.marker.setRotationAngle(item.headingDeg);
  if(item.label && typeof item.label.setIcon === 'function'){
    item.label.setIcon(L.divIcon({
      className: (window.__hideCount ? '' : 'label-count'),
      html: window.__hideCount ? '' : String(item.count),
      iconAnchor: [-10, -10]
    }));
  }
  if(Array.isArray(entry.track) && entry.track.length>1){
    item.track = entry.track.map(p=>L.latLng(Number(p[0])||0, Number(p[1])||0));
  }
  if(Array.isArray(entry.path) && entry.path.length>1){
    item.pathHistory = entry.path.map(p=>L.latLng(Number(p[0])||0, Number(p[1])||0));
    if(item.pathPolyline) item.pathPolyline.setLatLngs(item.pathHistory);
  }
  try{ if(typeof window.createArrowFor === 'function') window.createArrowFor(item); }catch(e){}
}

function upsertAdminLinkedItem(uid, itemId, entry){
  if(!window.isAdmin || !window.addItem || !window.state || !(window.state.items instanceof Map)) return null;
  const k = linkedKey(uid, itemId);
  let item = remoteLocalLinks.get(k) || null;
  if(!item){
    const opt = entry && entry.customIconUrl ? { iconUrl: entry.customIconUrl } : undefined;
    item = window.addItem(entry.type || 'drone', L.latLng(Number(entry.lat)||0, Number(entry.lng)||0), opt);
    if(!item) return null;
    item.__remoteLinked = true;
    item.__remoteOwnerUid = String(uid);
    item.__remoteItemId = String(itemId);
    remoteLocalLinks.set(k, item);
  }
  applyEntryToLocalItem(item, entry);
  return item;
}

function serializeLinkedItem(item){
  try{
    const ll = item.marker.getLatLng();
    const out = {
      type: String(item.type||'drone').slice(0,40),
      lat: Math.round(ll.lat*1e6)/1e6,
      lng: Math.round(ll.lng*1e6)/1e6,
      headingDeg: Number(item.headingDeg)||0,
      count: Number(item.count)||1,
      customIconUrl: item.customIconUrl ? String(item.customIconUrl).slice(0,200) : null
    };
    if(item.track && item.track.length>1){
      out.track = item.track.slice(0,500).map(p=>[Math.round(p.lat*1e6)/1e6, Math.round(p.lng*1e6)/1e6]);
    }
    if(item.pathHistory && item.pathHistory.length>1){
      out.path = item.pathHistory.slice(-300).map(p=>[Math.round(p.lat*1e6)/1e6, Math.round(p.lng*1e6)/1e6]);
    }
    return out;
  }catch(e){ return null; }
}

function pushAdminLinkedChanges(){
  if(!db || !window.isAdmin) return;
  const touchedOwners = new Set();
  remoteLocalLinks.forEach((item)=>{
    if(!item || !item.__remoteOwnerUid || !item.__remoteItemId) return;
    const payload = serializeLinkedItem(item);
    if(!payload) return;
    const sig = JSON.stringify(payload);
    if(item.__remoteLastSentSig === sig) return;
    item.__remoteLastSentSig = sig;
    db.ref(`rooms/${ROOM_ID}/users/${item.__remoteOwnerUid}/items/${item.__remoteItemId}`).set(payload).catch(()=>{});
    touchedOwners.add(String(item.__remoteOwnerUid));
  });
  if(touchedOwners.size){
    const now = Date.now();
    touchedOwners.forEach((uid)=>{
      db.ref(`rooms/${ROOM_ID}/users/${uid}/ts`).set(now).catch(()=>{});
    });
  }
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// РўР РђРќРЎР›РЇР¦Р†РЇ
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
function uploadMyState(force){
  if(!isSharing||!db) return;
  try{
    const items = serializeItems();
    const sig = JSON.stringify(items);
    const now = Date.now();
    if(!force && sig === myLastItemsSig && (now - myLastUploadAt) < 2000) return;
    myLastItemsSig = sig;
    myLastUploadAt = now;
    db.ref(`rooms/${ROOM_ID}/users/${MY_UID}`).set({
      uid: MY_UID, ts: now, items
    }).catch(()=>{});
  }catch(e){}
}

function queueFastUpload(){
  if(!isSharing || !db) return;
  clearTimeout(shareChangeTimer);
  shareChangeTimer = setTimeout(()=>uploadMyState(true), 40);
}

function bindFastSyncTriggers(){
  if(fastSyncBound) return;
  fastSyncBound = true;
  const quick = ()=>queueFastUpload();
  try{
    if(window.map){
      map.on('click', quick);
      map.on('mouseup', quick);
      map.on('dragend', quick);
      map.on('moveend', quick);
    }
  }catch(e){}
  try{ window.addEventListener('ku-track-draft-changed', quick); }catch(e){}
}

function startSharing(){
  if(!db) return;
  isSharing = true;
  uploadMyState(true);
  clearInterval(uploadTimer);
  uploadTimer = setInterval(()=>uploadMyState(false), 90);
  db.ref(`rooms/${ROOM_ID}/users/${MY_UID}`).onDisconnect().remove();
  updateUI();
  showToast('рџ“¤ РўСЂР°РЅСЃР»СЏС†С–СЏ СѓРІС–РјРєРЅРµРЅР°','#4ade80');
}

function stopSharing(){
  isSharing = false;
  clearInterval(uploadTimer);
  clearTimeout(shareChangeTimer);
  shareChangeTimer = null;
  myLastItemsSig = '';
  myLastUploadAt = 0;
  if(db) db.ref(`rooms/${ROOM_ID}/users/${MY_UID}`).remove().catch(()=>{});
  updateUI();
  showToast('рџ“¤ РўСЂР°РЅСЃР»СЏС†С–СЏ РІРёРјРєРЅРµРЅР°','#94a3b8');
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// Р’Р†Р”РћР‘Р РђР–Р•РќРќРЇ Р§РЈР–РРҐ
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
const USER_COLORS = ['#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#10b981','#ef4444'];
function colorForUid(uid){ let h=0; for(const c of uid) h=(h*31+c.charCodeAt(0))&0xffff; return USER_COLORS[h%USER_COLORS.length]; }

function makeRemoteIcon(type, color, customIconUrl){
  let src=null, w=28, h=28;
  if(customIconUrl){ src=customIconUrl; }
  else if(window.getIconForType){
    const b=window.getIconForType(type);
    if(b?.options?.iconUrl){ src=b.options.iconUrl; w=b.options.iconSize?.[0]||28; h=b.options.iconSize?.[1]||28; }
  }
  if(src){
    return L.icon({ iconUrl:src, iconSize:[w,h], iconAnchor:[Math.round(w/2),Math.round(h/2)] });
  }
  return L.divIcon({
    className:'',
    html:`<div style="width:14px;height:14px;border-radius:50%;background:#ff3b30;border:2px solid #fff;"></div>`,
    iconSize:[14,14], iconAnchor:[7,7]
  });
}

function makeRemoteLabel(entry, color, uid){
  return L.divIcon({
    className:'',
    html:`<div style="background:rgba(0,0,0,0.82);color:${color};border:1px solid ${color}66;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:9px;white-space:nowrap;">[${uid.slice(0,6)}] ${entry.type||'?'} Г—${entry.count||1}</div>`,
    iconAnchor:[-6,20], iconSize:[100,14]
  });
}

function applyRemoteUser(uid, data){
  if(!window.map||!data) return;
  const color=colorForUid(uid);
  if(window.isAdmin){
    const itemsAdmin = data.items || {};
    const incomingAdmin = new Set(Object.keys(itemsAdmin).map(id=>linkedKey(uid,id)));
    remoteLocalLinks.forEach((item,k)=>{
      if(k.startsWith(String(uid)+':') && !incomingAdmin.has(k)){
        removeLocalItemSafe(item);
        remoteLocalLinks.delete(k);
      }
    });
    for(const [idStr,entry] of Object.entries(itemsAdmin)){
      upsertAdminLinkedItem(uid, String(idStr), entry || {});
    }
    clearRemoteUser(uid);
    return;
  }
  if(!remoteMarkers.has(uid)) remoteMarkers.set(uid,new Map());
  if(!remoteLines.has(uid))   remoteLines.set(uid,new Map());
  if(!remoteLabels.has(uid))  remoteLabels.set(uid,new Map());
  const mMap=remoteMarkers.get(uid), lMap=remoteLines.get(uid), lblMap=remoteLabels.get(uid);
  const items=data.items||{};
  const incoming=new Set(Object.keys(items));

  for(const [id,m] of mMap){
    if(!incoming.has(String(id))){
      try{map.removeLayer(m);}catch(e){} mMap.delete(id);
      for(const pre of['t_','p_']){ const k=pre+id; if(lMap.has(k)){try{map.removeLayer(lMap.get(k));}catch(e){} lMap.delete(k);} }
      if(lblMap.has(id)){try{map.removeLayer(lblMap.get(id));}catch(e){} lblMap.delete(id);}
    }
  }

  for(const [idStr,entry] of Object.entries(items)){
    const id=String(idStr);
    const ll=[entry.lat,entry.lng];
    const ico=makeRemoteIcon(entry.type,color,entry.customIconUrl);
    if(mMap.has(id)){
      const m=mMap.get(id); m.setLatLng(ll); m.setIcon(ico);
      if(typeof m.setRotationAngle==='function') m.setRotationAngle(entry.headingDeg||0);
    } else {
      const m=L.marker(ll,{icon:ico,rotationAngle:entry.headingDeg||0,zIndexOffset:100}).addTo(map);
      m.on('click',()=>openRemoteEditor(uid,id,entry,m));
      mMap.set(id,m);
    }
    if(entry.track&&entry.track.length>1){
      const pts=entry.track.map(p=>[p[0],p[1]]);
      if(lMap.has('t_'+id)) lMap.get('t_'+id).setLatLngs(pts);
      else { const ln=L.polyline(pts,{color:'#ff3b30',weight:2.5,dashArray:'6,8',opacity:0.75}).addTo(map); lMap.set('t_'+id,ln); }
    } else if(lMap.has('t_'+id)){ try{map.removeLayer(lMap.get('t_'+id));}catch(e){} lMap.delete('t_'+id); }
    if(entry.path&&entry.path.length>1){
      const pts=entry.path.map(p=>[p[0],p[1]]);
      if(lMap.has('p_'+id)) lMap.get('p_'+id).setLatLngs(pts);
      else { const ln=L.polyline(pts,{color:'#ff3b30',weight:1.5,opacity:0.55}).addTo(map); lMap.set('p_'+id,ln); }
    } else if(lMap.has('p_'+id)){ try{map.removeLayer(lMap.get('p_'+id));}catch(e){} lMap.delete('p_'+id); }
    if(lblMap.has(id)){ try{ map.removeLayer(lblMap.get(id)); }catch(e){} lblMap.delete(id); }
  }
}

function clearRemoteUser(uid){
  for(const m of(remoteMarkers.get(uid)||new Map()).values()){try{map.removeLayer(m);}catch(e){}}
  for(const l of(remoteLines.get(uid)||new Map()).values())  {try{map.removeLayer(l);}catch(e){}}
  for(const l of(remoteLabels.get(uid)||new Map()).values()) {try{map.removeLayer(l);}catch(e){}}
  remoteMarkers.delete(uid); remoteLines.delete(uid); remoteLabels.delete(uid);
}
window.__syncClearRemoteUser = clearRemoteUser;

function startWatching(){
  if(!db) return;
  isWatching=true;
  clearInterval(remotePushTimer);
  remotePushTimer = setInterval(pushAdminLinkedChanges, 180);
  const ref=db.ref(`rooms/${ROOM_ID}/users`);
  const handler=ref.on('value',snap=>{
    const all=snap.val()||{};
    const seen=new Set(Object.keys(all).filter(u=>u!==MY_UID));
    for(const uid of remoteMarkers.keys()) if(!seen.has(uid)) clearRemoteUser(uid);
    if(window.isAdmin){
      const toDrop = [];
      remoteLocalLinks.forEach((_item,k)=>{
        const uid = String(k).split(':')[0];
        if(!seen.has(uid)) toDrop.push(k);
      });
      toDrop.forEach((k)=>{
        const item = remoteLocalLinks.get(k);
        if(item) removeLocalItemSafe(item);
        remoteLocalLinks.delete(k);
      });
    }
    for(const [uid,data] of Object.entries(all)){
      if(uid===MY_UID) continue;
      if(data.ts&&Date.now()-data.ts>60000) continue; // С–РіРЅРѕСЂСѓРІР°С‚Рё РґР°РЅС– СЃС‚Р°СЂС–С€С– 60СЃ
      applyRemoteUser(uid,data);
    }
    updateUserList(all);
  });
  fbListeners.push(()=>ref.off('value',handler));
  updateUI();
  showToast('рџ“Ґ РџРµСЂРµРіР»СЏРґ С‡СѓР¶РѕС— РѕР±СЃС‚Р°РЅРѕРІРєРё СѓРІС–РјРєРЅРµРЅРѕ','#3b82f6');
}

function stopWatching(){
  isWatching=false;
  clearInterval(remotePushTimer);
  remotePushTimer = null;
  fbListeners.forEach(fn=>{try{fn();}catch(e){}});
  fbListeners=[];
  for(const uid of [...remoteMarkers.keys()]) clearRemoteUser(uid);
  remoteLocalLinks.forEach((item)=>removeLocalItemSafe(item));
  remoteLocalLinks.clear();
  updateUI();
  showToast('📥 Перегляд вимкнено','#94a3b8');
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// Р Р•Р”РђРљРўРћР  Р§РЈР–РРҐ РњРђР РљР•Р Р†Р’
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
function openRemoteEditor(uid, itemId, entry, marker){
  const color=colorForUid(uid);
  const canEdit=!!isAdmin;
  const html=`
    <div style="font-family:monospace;font-size:12px;min-width:190px;">
      <div style="color:${color};font-size:9px;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid ${color}33;padding-bottom:6px;">
        рџ‘¤ ${uid.slice(0,12)}вЂ¦ ${uid===MY_UID?'<span style="color:#4ade80;">[РўР]</span>':''}
        ${isAdmin?'<span style="color:#fbbf24;">[ADMIN]</span>':''}<br>рџЋЇ Р¦С–Р»СЊ #${itemId} В· ${entry.type||'?'}
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
        <span style="color:rgba(74,222,128,0.8);font-size:10px;min-width:40px;">РљРЈРў:</span>
        <input id="reHdg" type="number" min="0" max="359" value="${entry.headingDeg||0}" ${canEdit?'':'disabled'}
          style="width:64px;background:rgba(255,255,255,0.1);border:1px solid rgba(74,222,128,0.5);color:#e2e8f0;border-radius:4px;padding:3px 6px;font-family:monospace;">
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;">
        <span style="color:rgba(74,222,128,0.8);font-size:10px;min-width:40px;">Рљ-РЎРўР¬:</span>
        <input id="reCnt" type="number" min="1" value="${entry.count||1}" ${canEdit?'':'disabled'}
          style="width:64px;background:rgba(255,255,255,0.1);border:1px solid rgba(74,222,128,0.5);color:#e2e8f0;border-radius:4px;padding:3px 6px;font-family:monospace;">
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;">
        ${canEdit?`
          <button id="reSave" style="background:rgba(74,222,128,0.18);border:1px solid rgba(74,222,128,0.6);color:#4ade80;border-radius:5px;padding:4px 10px;cursor:pointer;font-family:monospace;font-size:10px;">вњ” Р—Р±РµСЂРµРіС‚Рё</button>
          <button id="reDel"  style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.5);color:#f87171;border-radius:5px;padding:4px 10px;cursor:pointer;font-family:monospace;font-size:10px;">рџ—‘ Р’РёРґР°Р»РёС‚Рё</button>
        `:'<span style="color:rgba(255,255,255,0.35);font-size:10px;">РўС–Р»СЊРєРё Р°РґРјС–РЅ РјРѕР¶Рµ СЂРµРґР°РіСѓРІР°С‚Рё С‡СѓР¶С– С†С–Р»С–</span>'}
        ${isAdmin&&uid!==MY_UID?`<button id="reBan" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.4);color:#f87171;border-radius:5px;padding:4px 10px;cursor:pointer;font-family:monospace;font-size:10px;margin-top:4px;width:100%;">рџљ« РљС–РєРЅСѓС‚Рё РєРѕСЂРёСЃС‚СѓРІР°С‡Р°</button>`:''}
      </div>
    </div>`;
  L.popup({closeButton:true,className:'mytooltip'}).setLatLng(marker.getLatLng()).setContent(html).openOn(window.map);
  setTimeout(()=>{
    document.getElementById('reSave')?.addEventListener('click',()=>{
      const hdg=Number(document.getElementById('reHdg')?.value||0);
      const cnt=Number(document.getElementById('reCnt')?.value||1);
      db.ref(`rooms/${ROOM_ID}/users/${uid}/items/${itemId}`).update({headingDeg:hdg,count:cnt});
      map.closePopup();
    });
    document.getElementById('reDel')?.addEventListener('click',()=>{
      if(!confirm('Р’РёРґР°Р»РёС‚Рё С†СЋ С†С–Р»СЊ?')) return;
      db.ref(`rooms/${ROOM_ID}/users/${uid}/items/${itemId}`).remove();
      map.closePopup();
    });
    document.getElementById('reBan')?.addEventListener('click',()=>{
      if(!isAdmin){ showToast('вќЊ РўС–Р»СЊРєРё Р°РґРјС–РЅ','#f87171'); return; }
      if(!confirm('Р’РёР»СѓС‡РёС‚Рё С†СЊРѕРіРѕ РєРѕСЂРёСЃС‚СѓРІР°С‡Р° Р· РєС–РјРЅР°С‚Рё?')) return;
      db.ref(`rooms/${ROOM_ID}/users/${uid}`).remove();
      clearRemoteUser(uid);
      map.closePopup();
      showToast('рџљ« РљРѕСЂРёСЃС‚СѓРІР°С‡Р° РІРёРґР°Р»РµРЅРѕ','#f97316');
    });
  },30);
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// TOAST
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
function showToast(msg, color='#4ade80'){
  const t=document.createElement('div');
  t.textContent=msg;
  t.style.cssText=`position:fixed;bottom:80px;right:14px;z-index:9999;background:rgba(10,14,22,0.97);color:${color};border:1px solid ${color}88;border-radius:8px;padding:8px 14px;font-family:monospace;font-size:11px;box-shadow:0 4px 16px rgba(0,0,0,0.6);transition:opacity .4s;pointer-events:none;`;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),400);},2500);
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// UI
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
function buildUI(){
  const panel=document.createElement('div');
  panel.id='syncPanel';
  panel.style.cssText='position:fixed;bottom:14px;right:14px;z-index:4000;background:rgba(8,12,20,0.98);border:1px solid rgba(74,222,128,0.4);border-radius:12px;padding:12px 14px;font-family:\'Courier New\',monospace;font-size:11px;min-width:230px;max-width:265px;box-shadow:0 8px 32px rgba(0,0,0,0.7);backdrop-filter:blur(14px);display:none;';
  panel.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(74,222,128,0.18);">
      <span style="color:rgba(74,222,128,0.85);font-size:9px;letter-spacing:2px;text-transform:uppercase;">рџ“Ў РЎРїС–Р»СЊРЅР° РљР°СЂС‚Р°</span>
      <div style="display:flex;gap:5px;align-items:center;">
        <span id="syncAdminBadge" style="display:none;background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.5);border-radius:4px;padding:1px 6px;font-size:9px;">рџ¦… РђР”РњР†Рќ</span>
        <span id="syncConnStatus" style="color:#f87171;font-size:9px;">в¬¤ РћР¤Р›РђР™Рќ</span>
      </div>
    </div>
    <div style="display:flex;gap:5px;align-items:center;margin-bottom:8px;">
      <span style="color:rgba(255,255,255,0.45);font-size:9px;min-width:54px;">РљР†РњРќРђРўРђ:</span>
      <input id="syncRoomInput" value="${ROOM_ID}" maxlength="32"
        style="flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);border-radius:5px;color:#e2e8f0;font-family:monospace;font-size:10px;padding:3px 7px;outline:none;">
      <button id="syncRoomApply"
        style="background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.5);color:#4ade80;border-radius:5px;padding:3px 8px;cursor:pointer;font-family:monospace;font-size:10px;">вњ”</button>
    </div>
    <div style="margin-bottom:8px;font-size:9px;color:rgba(255,255,255,0.3);">ID: ${MY_UID.slice(0,14)}вЂ¦</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
      <button id="syncShareBtn"
        style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.18);color:#94a3b8;border-radius:8px;padding:8px 4px;cursor:pointer;font-family:monospace;font-size:10px;text-align:center;line-height:1.4;transition:all .2s;">
        рџ“¤ РњРѕСЏ<br>РѕР±СЃС‚Р°РЅРѕРІРєР°<br><span style="font-size:9px;color:rgba(255,255,255,0.35);">Р’РРњРљРќР•РќРћ</span>
      </button>
      <button id="syncWatchBtn"
        style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.18);color:#94a3b8;border-radius:8px;padding:8px 4px;cursor:pointer;font-family:monospace;font-size:10px;text-align:center;line-height:1.4;transition:all .2s;">
        рџ“Ґ Р†РЅС€С–<br>РєРѕСЂРёСЃС‚СѓРІР°С‡С–<br><span style="font-size:9px;color:rgba(255,255,255,0.35);">Р’РРњРљРќР•РќРћ</span>
      </button>
    </div>
    <button id="syncAdminBtn"
      style="width:100%;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);color:#d97706;border-radius:7px;padding:5px;cursor:pointer;font-family:monospace;font-size:10px;margin-bottom:8px;transition:all .2s;">
      рџ”‘ РђРґРјС–РЅ СЂРµР¶РёРј
    </button>
    <div id="syncUserList" style="font-size:9px;color:rgba(74,222,128,0.6);max-height:90px;overflow-y:auto;scrollbar-width:thin;"></div>
  `;
  document.body.appendChild(panel);
  syncPanelEl = panel;

  document.getElementById('syncShareBtn').onclick = ()=>{
    if(!db){showToast('вљ  Firebase РЅРµ РїС–РґРєР»СЋС‡РµРЅРѕ!','#f87171');return;}
    if(isSharing) stopSharing(); else startSharing();
  };
  document.getElementById('syncWatchBtn').onclick = ()=>{
    if(!db){showToast('вљ  Firebase РЅРµ РїС–РґРєР»СЋС‡РµРЅРѕ!','#f87171');return;}
    if(isWatching) stopWatching(); else startWatching();
  };
  document.getElementById('syncRoomApply').onclick = changeRoom;
  document.getElementById('syncRoomInput').addEventListener('keypress',e=>{if(e.key==='Enter')changeRoom();});
  document.getElementById('syncAdminBtn').onclick = async ()=>{
    if(isAdmin){
      isAdmin=false; sessionStorage.removeItem('ku_admin');
      updateAdminBadge(); showToast('рџ”“ РђРґРјС–РЅ СЂРµР¶РёРј РІРёРјРєРЅРµРЅРѕ','#94a3b8'); return;
    }
    const pass=prompt('рџ”‘ Р’РІРµРґРё Р°РґРјС–РЅ РїР°СЂРѕР»СЊ:');
    if(pass!==null) await tryAdminLogin(pass);
  };
  updateAdminBadge();
}

function setSyncPanelVisible(visible){
  if(!syncPanelEl) return;
  syncPanelEl.style.display = visible ? 'block' : 'none';
}
function toggleSyncPanel(force){
  const isVisible = !!(syncPanelEl && syncPanelEl.style.display !== 'none');
  const nextVisible = (typeof force === 'boolean') ? force : !isVisible;
  setSyncPanelVisible(nextVisible);
}
window.toggleSyncPanel = toggleSyncPanel;

function changeRoom(){
  const val=(document.getElementById('syncRoomInput')?.value||'').trim().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32);
  if(!val){showToast('вљ  РќРµРєРѕСЂРµРєС‚РЅРёР№ ID РєС–РјРЅР°С‚Рё','#f87171');return;}
  const wasS=isSharing, wasW=isWatching;
  if(isSharing)  stopSharing();
  if(isWatching) stopWatching();
  ROOM_ID=val;
  const url=new URL(location.href);
  url.searchParams.set('room',ROOM_ID);
  history.replaceState(null,'',url.toString());
  if(wasS) startSharing();
  if(wasW) startWatching();
  showToast(`рџљЄ РљС–РјРЅР°С‚Р°: ${ROOM_ID}`,'#4ade80');
}

function updateAdminBadge(){
  const badge=document.getElementById('syncAdminBadge');
  const btn=document.getElementById('syncAdminBtn');
  if(!badge||!btn) return;
  badge.style.display   = isAdmin?'inline-block':'none';
  btn.style.background  = isAdmin?'rgba(251,191,36,0.2)':'rgba(251,191,36,0.08)';
  btn.style.borderColor = isAdmin?'rgba(251,191,36,0.7)':'rgba(251,191,36,0.3)';
  btn.style.color       = isAdmin?'#fbbf24':'#d97706';
  btn.textContent       = isAdmin?'рџ‘‘ РђРґРјС–РЅ РђРљРўРР’РќРР™ (РІРёРјРєРЅСѓС‚Рё)':'рџ”‘ РђРґРјС–РЅ СЂРµР¶РёРј';
}

function updateUI(){
  const sBtn=document.getElementById('syncShareBtn');
  const wBtn=document.getElementById('syncWatchBtn');
  if(sBtn){
    sBtn.style.background  = isSharing?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.05)';
    sBtn.style.borderColor = isSharing?'#4ade80':'rgba(255,255,255,0.18)';
    sBtn.style.color       = isSharing?'#4ade80':'#94a3b8';
    sBtn.innerHTML=`рџ“¤ РњРѕСЏ<br>РѕР±СЃС‚Р°РЅРѕРІРєР°<br><span style="font-size:9px;color:${isSharing?'#4ade80':'rgba(255,255,255,0.35);'};">${isSharing?'в—Џ РђРљРўРР’РќРћ':'Р’РРњРљРќР•РќРћ'}</span>`;
  }
  if(wBtn){
    wBtn.style.background  = isWatching?'rgba(59,130,246,0.2)':'rgba(255,255,255,0.05)';
    wBtn.style.borderColor = isWatching?'#3b82f6':'rgba(255,255,255,0.18)';
    wBtn.style.color       = isWatching?'#93c5fd':'#94a3b8';
    wBtn.innerHTML=`рџ“Ґ Р†РЅС€С–<br>РєРѕСЂРёСЃС‚СѓРІР°С‡С–<br><span style="font-size:9px;color:${isWatching?'#93c5fd':'rgba(255,255,255,0.35);'};">${isWatching?'в—Џ РђРљРўРР’РќРћ':'Р’РРњРљРќР•РќРћ'}</span>`;
  }
}

function updateUserList(allUsers){
  const el=document.getElementById('syncUserList');
  if(!el) return;
  const others=Object.entries(allUsers).filter(([u])=>u!==MY_UID);
  if(!others.length){
    el.innerHTML='<div style="color:rgba(255,255,255,0.25);text-align:center;padding:4px 0;">РќРµРјР°С” С–РЅС€РёС… СѓС‡Р°СЃРЅРёРєС–РІ</div>';
    return;
  }
  el.innerHTML=others.map(([uid,data])=>{
    const color=colorForUid(uid);
    const cnt=Object.keys(data.items||{}).length;
    const ageS=Math.round((Date.now()-(data.ts||0))/1000);
    const ageStr=ageS<60?ageS+'СЃ':Math.round(ageS/60)+'С…РІ';
    const banBtn=isAdmin?`<button onclick="if(db&&confirm('РљС–РєРЅСѓС‚Рё?')){db.ref('rooms/${ROOM_ID}/users/${uid}').remove();window.__syncClearRemoteUser&&window.__syncClearRemoteUser('${uid}');}" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#f87171;border-radius:3px;padding:1px 5px;cursor:pointer;font-family:monospace;font-size:9px;">вњ•</button>`:'';
    return `<div style="display:flex;gap:5px;align-items:center;margin:3px 0;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;box-shadow:0 0 4px ${color};"></span>
      <span style="color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${uid.slice(0,10)}вЂ¦</span>
      <span style="color:rgba(255,255,255,0.35);white-space:nowrap;">${cnt}С†В·${ageStr}</span>
      ${banBtn}
    </div>`;
  }).join('');
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// FIREBASE
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
function initFirebase(){
  const sdks=[
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js'
  ];
  let n=0;
  sdks.forEach(src=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=()=>{if(++n===sdks.length) onFirebaseReady();};
    s.onerror=()=>{
      console.error('[sync] SDK load failed:', src);
      showToast('вљ  Firebase SDK РЅРµ Р·Р°РІР°РЅС‚Р°Р¶РёРІСЃСЏ','#f87171');
      const st=document.getElementById('syncConnStatus');
      if(st){ st.textContent='в¬¤ SDK ERR'; st.style.color='#f87171'; }
    };
    document.head.appendChild(s);
  });
}

async function onFirebaseReady(){
  try{
    const resolvedDbUrl = await resolveDatabaseUrl();
    const appCfg = { ...FIREBASE_CONFIG, databaseURL: resolvedDbUrl };
    if(!firebase.apps.length) firebase.initializeApp(appCfg);
    db=firebase.app().database();
    console.log('[sync] databaseURL:', resolvedDbUrl);
    db.ref('.info/connected').on('value',snap=>{
      const ok=!!snap.val();
      const st=document.getElementById('syncConnStatus');
      if(st){st.textContent=ok?'в¬¤ РћРќР›РђР™Рќ':'в¬¤ РћР¤Р›РђР™Рќ';st.style.color=ok?'#4ade80':'#f87171';}
    });
    // Quick ping to detect rules/url errors and print clear reason in console.
    db.ref('.info/serverTimeOffset').once('value')
      .then(()=>console.log('[sync] Firebase ping ok'))
      .catch((e)=>{
        console.error('[sync] Firebase ping error:', e);
        const st=document.getElementById('syncConnStatus');
        if(st){ st.textContent='в¬¤ DB ERR'; st.style.color='#f87171'; }
        showToast('вљ  Firebase РґРѕСЃС‚СѓРї: ' + (e && e.message ? e.message : 'error'),'#f87171');
      });
    // РђРІС‚РѕРѕС‡РёС‰РµРЅРЅСЏ РјРµСЂС‚РІРёС… Р·Р°РїРёСЃС–РІ (С‚С–Р»СЊРєРё Р°РґРјС–РЅ, СЂР°Р· РЅР° 30СЃ)
    setInterval(()=>{
      if(!isAdmin||!db) return;
      db.ref(`rooms/${ROOM_ID}/users`).once('value').then(snap=>{
        const all=snap.val()||{};
        for(const [uid,data] of Object.entries(all)){
          if(uid===MY_UID) continue;
          if(data.ts&&Date.now()-data.ts>120000) db.ref(`rooms/${ROOM_ID}/users/${uid}`).remove();
        }
      });
    },30000);
    console.log('%c[рџ¦… SOKIL SYNC] Firebase РїС–РґРєР»СЋС‡РµРЅРѕ вњ“','color:#4ade80;font-weight:bold;font-size:13px;');
    console.log('%cРљРѕРјР°РЅРґРё РєРѕРЅСЃРѕР»С– (F12):\n  setAdmin("РїР°СЂРѕР»СЊ")          вЂ” СѓРІС–Р№С‚Рё СЏРє Р°РґРјС–РЅ\n  generateAdminHash("РїР°СЂРѕР»СЊ") вЂ” РѕС‚СЂРёРјР°С‚Рё С…РµС€ РїР°СЂРѕР»СЏ','color:#94a3b8;');
    window.syncDiag = async function(){
      try{
        if(!db){ console.error('[syncDiag] db is null'); return; }
        const connected = await db.ref('.info/connected').once('value');
        console.log('[syncDiag] connected=', !!connected.val());
        const pingPath = `rooms/${ROOM_ID}/diag/${MY_UID}`;
        await db.ref(pingPath).set({ts:Date.now()});
        console.log('[syncDiag] write ok:', pingPath);
        await db.ref(pingPath).remove();
        console.log('[syncDiag] remove ok');
      }catch(err){
        console.error('[syncDiag] error:', err);
      }
    };
  }catch(e){
    console.error('[sync] Firebase init error:',e);
    showToast('вљ  Firebase РїРѕРјРёР»РєР°: '+e.message,'#f87171');
  }
}

// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
// РЎРўРђР Рў
// в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
function init(){
  if(initialized) return;
  initialized=true;
  buildUI();
  bindFastSyncTriggers();
  initFirebase();
}
if(document.readyState==='complete'||document.readyState==='interactive'){
  setTimeout(init,600);
} else {
  window.addEventListener('DOMContentLoaded',()=>setTimeout(init,600));
}

})();

