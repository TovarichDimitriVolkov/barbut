const PIPS = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const r6 = () => 1 + Math.floor(Math.random()*6);

let mode = null;
let S = null;
let myId = null, peer = null, conns = {}, hostConn = null;
let N = 3, rollTimer = null, rollGen = 0, lastRound = -1, wake = null;

function show(name){
  ['home','localSetup','lobby','game'].forEach(id => $(id).classList.toggle('hide', id !== name));
}
function homeMsg(t){ $('homeMsg').textContent = t || ''; }
function cleanName(s){ return String(s || '').replace(/\s+/g,' ').trim().slice(0,14); }
function saveName(n){ try{ localStorage.setItem('barbut_name', n); }catch(e){} }
try{ $('myName').value = localStorage.getItem('barbut_name') || ''; }catch(e){}

async function keepAwake(){ try{ if(navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); }catch(e){} }
function releaseAwake(){ try{ wake && wake.release(); }catch(e){} wake = null; }
document.addEventListener('visibilitychange', () => { if(!document.hidden && mode && mode !== 'local') keepAwake(); });

function leaveToHome(msg){
  const p = peer;
  mode = null; peer = null; hostConn = null; conns = {}; S = null; myId = null;
  rollGen++; clearInterval(rollTimer); rollTimer = null; lastRound = -1;
  try{ p && p.destroy(); }catch(e){}
  releaseAwake();
  show('home'); homeMsg(msg || '');
}
function confirmLeave(){
  if(confirm('Sigur vrei să ieși?')) leaveToHome('')
    ;
  }
