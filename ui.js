function sendRoll(){
  const st = S.phase === 'bet' ? clampStake() : 0;
  if(mode === 'client') hostConn.send({ t:'roll', stake:st }); else hostRoll(st);
}
function sendNext(){
  if(mode === 'client') hostConn.send({ t:'next' }); else hostNext();
}
function mainBtn(){
  if(!S) return;
  if(S.phase === 'bet' || S.phase === 'point') sendRoll();
  else if(S.phase === 'roundEnd') sendNext();
  else if(S.phase === 'over'){ if(mode === 'local') leaveToHome(''); else if(mode === 'host') backToLobby(); }
}
function clampStake(){
  let v = parseInt($('stake').value) || minStake();
  v = Math.max(minStake(), Math.min(maxStake(), v));
  $('stake').value = v; return v;
}
function adj(dir){
  const step = Math.max(1, Math.round(maxStake() / 20));
  $('stake').value = (parseInt($('stake').value) || 0) + dir * step; clampStake();
}
function setStake(k){
  $('stake').value = k === 'min' ? minStake() : k === 'max' ? maxStake() : Math.floor(maxStake() / 2);
  clampStake();
}

function drawDie(el, v){
  el.innerHTML = Array.from({length:9}, (_,i) => `<i class="${v && PIPS[v].includes(i) ? 'on' : ''}"></i>`).join('');
}
function renderDice(){
  const d1 = $('d1'), d2 = $('d2');
  if(S.rolling){
    d1.classList.add('roll'); d2.classList.add('roll');
    if(!rollTimer) rollTimer = setInterval(() => { drawDie(d1, r6()); drawDie(d2, r6()); }, 90);
  } else {
    clearInterval(rollTimer); rollTimer = null;
    d1.classList.remove('roll'); d2.classList.remove('roll');
    drawDie(d1, S.dice ? S.dice[0] : 0); drawDie(d2, S.dice ? S.dice[1] : 0);
  }
}
function playerRow(p, i, inGame){
  const cls = (inGame && i === S.shooter && p.credits > 0 && S.phase !== 'over' ? 'shooter ' : '') + (inGame && p.credits <= 0 ? 'out' : '');
  const me = p.id === myId ? ' (tu)' : '';
  const dot = inGame && i === S.shooter && p.credits > 0 && S.phase !== 'over' ? '🎯 ' : '';
  return `<div class="p ${cls}"><span>${dot}${esc(p.name)}${me}</span>${inGame ? `<span class="cr">${p.credits}</span>` : ''}</div>`;
}
function render(){
  if(!S) return;
  if(S.phase === 'lobby'){ show('lobby'); renderLobby(); return; }
  show('game'); renderGame();
}
function renderLobby(){
  $('roomCode').textContent = S.code;
  $('lobbyList').innerHTML = S.players.map((p,i) => playerRow(p,i,false)).join('');
  const host = mode === 'host';
  $('hostCtl').classList.toggle('hide', !host);
  $('waitHost').classList.toggle('hide', host);
  $('lobbyCr').textContent = 'Credite de start: ' + S.startCr;
  $('startBtn').disabled = S.players.length < 2;
  $('startBtn').textContent = S.players.length < 2 ? 'Aștept cel puțin 2 jucători' : 'Pornește jocul (' + S.players.length + ' jucători)';
}
function renderGame(){
  const sh = S.players[S.shooter];
  const canAct = mode === 'local' || sh.id === myId;
  const betting = S.phase === 'bet', inPlay = betting || S.phase === 'point';

  $('plist').innerHTML = S.players.map((p,i) => playerRow(p,i,true)).join('');

  const showStake = betting && canAct && !S.rolling;
  $('stakeBox').classList.toggle('hide', !showStake);
  $('shooterLbl').textContent = mode === 'local' ? sh.name + ', alege miza' : 'Alege miza';
  if(showStake){
    $('stakeRange').textContent = 'Minim ' + minStake() + ', maxim ' + maxStake();
    if(lastRound !== S.round){ lastRound = S.round; setStake('half'); } else clampStake();
  }

  renderDice();
  $('msg').className = 'msg ' + (S.msgCls || '');
  $('msg').innerHTML = S.msg || '';

  const total = (S.covers || []).reduce((s,c) => s + c.amt, 0);
  $('hint').textContent = (S.phase === 'point' || S.rolling || S.phase === 'roundEnd') && S.stake ? 'Miza rundei: ' + total : '';

  const b = $('rollBtn');
  b.disabled = false;
  if(inPlay){
    b.classList.toggle('hide', !canAct);
    b.disabled = S.rolling;
    b.textContent = betting ? 'Aruncă zarurile' : 'Aruncă din nou';
  } else if(S.phase === 'roundEnd'){
    b.classList.remove('hide'); b.textContent = 'Runda următoare';
  } else if(S.phase === 'over'){
    if(mode === 'client'){ b.classList.add('hide'); $('hint').textContent = 'Aștept gazda...'; }
    else { b.classList.remove('hide'); b.textContent = mode === 'local' ? 'Meniu' : 'Înapoi în cameră'; }
  }

  $('log').innerHTML = S.log.map(t => `<div>${esc(t)}</div>`).join
('');
}
