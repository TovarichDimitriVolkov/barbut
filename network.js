const PEER_OPTS = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'turn:eu-0.turn.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' },
      { urls: 'turn:us-0.turn.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' },
      { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }
    ]
  }
};
function genCode(){
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = '';
  for(let i=0;i<4;i++) c += A[Math.floor(Math.random()*A.length)];
  return c;
}
function createRoom(){
  if(typeof Peer === 'undefined'){ homeMsg('Nu s-a putut încărca PeerJS. Verifică internetul.'); return; }
  const name = cleanName($('myName').value) || 'Gazdă';
  saveName(name);
  homeMsg('Se creează camera...');
  tryHost(name, 0);
}
function tryHost(name, attempt){
  const code = genCode();
  const p = new Peer('barbut-' + code, PEER_OPTS);
  p.on('open', id => {
    peer = p; mode = 'host'; myId = id; conns = {};
    S = newState(code);
    S.players = [{ id, name, credits:0 }];
    $('lobbyCrIn').value = 1000;
    p.on('connection', onHostConn);
    p.on('disconnected', () => { try{ p.reconnect(); }catch(e){} });
    keepAwake(); homeMsg(''); render();
  });
  p.on('error', e => {
    if(!peer){
      if(e.type === 'unavailable-id' && attempt < 5){ try{p.destroy();}catch(x){} tryHost(name, attempt+1); }
      else homeMsg('Eroare conexiune: ' + e.type);
    }
  });
}
function onHostConn(conn){
  conn.on('data', m => hostMsg(conn, m));
  conn.on('close', () => hostLeave(conn.peer));
  conn.on('error', () => hostLeave(conn.peer));
}
function reject(conn, m){ try{ conn.send({t:'err', m}); }catch(e){} setTimeout(() => { try{conn.close();}catch(e){} }, 400); }
function hostMsg(conn, m){
  const id = conn.peer;
  if(!m || !S) return;
  if(m.t === 'join'){
    if(S.phase !== 'lobby') return reject(conn, 'Jocul a început deja.');
    if(S.players.length >= 6) return reject(conn, 'Camera este plină.');
    if(S.players.some(p => p.id === id)) return;
    let name = cleanName(m.name) || 'Jucător', base = name, k = 2;
    while(S.players.some(p => p.name === name)) name = base + ' ' + (k++);
    conns[id] = conn;
    S.players.push({ id, name, credits:0 });
    addLog(name + ' a intrat în cameră');
    push();
  } else if(m.t === 'roll'){
    if(!S.players[S.shooter] || S.players[S.shooter].id !== id) return;
    hostRoll(m.stake);
  } else if(m.t === 'next'){
    hostNext();
  }
}
function hostLeave(id){
  if(!S || !conns[id]) return;
  delete conns[id];
  const i = S.players.findIndex(p => p.id === id);
  if(i < 0) return;
  const name = S.players[i].name;
  if(S.phase === 'lobby'){ S.players.splice(i,1); push(); return; }
  if(S.players[i].credits <= 0){ push(); return; }
  S.players[i].credits = 0; S.players[i].out = true; S.players[i].gone = true;
  addLog(name + ' a ieșit din joc');
  if(alive().length <= 1){ rollGen++; S.rolling = false; return endGame(esc(name) + ' a ieșit.<br>'); }
  if(i === S.shooter && (S.phase === 'bet' || S.phase === 'point')){
    rollGen++; S.rolling = false; advanceShooter(); startBet(); return;
  }
  push();
}
function setStartCr(){
  if(mode !== 'host' || !S) return;
  S.startCr = Math.max(10, parseInt($('lobbyCrIn').value) || 1000);
  push();
}
function hostStart(){
  if(mode !== 'host' || S.phase !== 'lobby' || S.players.length < 2) return;
  S.startCr = Math.max(10, parseInt($('lobbyCrIn').value) || 1000);
  S.players.forEach(p => { p.credits = S.startCr; p.out = false; });
  S.shooter = 0; S.log = []; S.round = 0; lastRound = -1;
  addLog('Jocul a început cu ' + S.players.length + ' jucători');
  startBet();
}
function backToLobby(){
  S.players = S.players.filter(p => p.id === myId || conns[p.id]);
  S.players.forEach(p => { p.credits = 0; p.out = false; });
  S.phase = 'lobby'; S.dice = null; S.point = null; S.rolling = false; S.msg = ''; S.msgCls = '';
  push();
}
function shareCode(){
  const t = 'Intră în barbut cu codul ' + S.code;
  if(navigator.share){ navigator.share({ text:t }).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(S.code).then(() => alert('Cod copiat: ' + S.code)); }
  else alert(t);
}

function joinRoom(){
  if(typeof Peer === 'undefined'){ homeMsg('Nu s-a putut încărca PeerJS. Verifică internetul.'); return; }
  const code = $('joinCode').value.trim().toUpperCase();
  if(code.length !== 4){ homeMsg('Codul are 4 caractere.'); return; }
  const name = cleanName($('myName').value) || 'Jucător';
  saveName(name);
  homeMsg('Se conectează...');
  const p = new Peer(undefined, PEER_OPTS);
  let opened = false, serverOk = false;
  const to = setTimeout(() => {
    if(!opened){
      homeMsg(serverOk
        ? 'Am găsit serverul, dar nu mă pot conecta la gazdă. Gazda să țină aplicația deschisă, iar voi încercați pe același Wi-Fi.'
        : 'Nu pot ajunge la serverul PeerJS. Verifică internetul.');
      try{p.destroy();}catch(e){}
    }
  }, 20000);
  p.on('open', id => {
    serverOk = true;
    const c = p.connect('barbut-' + code, { reliable:true });
    c.on('open', () => {
      opened = true; clearTimeout(to);
      peer = p; hostConn = c; mode = 'client'; myId = id;
      keepAwake(); homeMsg('');
      c.send({ t:'join', name });
    });
    c.on('data', m => {
      if(m.t === 'state'){ S = m.S; render(); }
      else if(m.t === 'err'){ leaveToHome(m.m); }
    });
    c.on('close', () => { if(mode === 'client') leaveToHome('Gazda s-a deconectat.'); });
  });
  p.on('error', e => {
    clearTimeout(to);
    if(!opened){
      homeMsg(e.type === 'peer-unavailable' ? 'Camera nu există. Verifică codul.' : 'Eroare conexiune: ' + e.type);
      try{p.destroy();}catch(x){}
    }
  });
  }
