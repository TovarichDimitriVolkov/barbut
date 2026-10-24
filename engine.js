function newState(code){
  return { code, phase:'lobby', startCr:1000, players:[], shooter:0, point:null, stake:0,
           covers:[], dice:null, rolling:false, msg:'', msgCls:'', log:[], round:0 };
}

const alive = () => S.players.map((p,i) => i).filter(i => S.players[i].credits > 0);
function addLog(t){ S.log.unshift(t); if(S.log.length > 40) S.log.pop(); }
function push(){
  if(mode === 'host'){
    Object.values(conns).forEach(c => { try{ if(c.open) c.send({ t:'state', S }); }catch(e){} });
  }
  render();
}
function advanceShooter(){
  do { S.shooter = (S.shooter + 1) % S.players.length; } while(S.players[S.shooter].credits <= 0);
}
function startBet(){
  while(S.players[S.shooter].credits <= 0) S.shooter = (S.shooter + 1) % S.players.length;
  S.phase = 'bet'; S.point = null; S.dice = null; S.rolling = false; S.covers = []; S.stake = 0;
  S.round++;
  S.msg = esc(S.players[S.shooter].name) + ' alege miza și aruncă zarurile.'; S.msgCls = '';
  push();
}
function minStake(){ return Math.min(alive().length - 1, S.players[S.shooter].credits); }
function maxStake(){
  const oppTotal = alive().filter(i => i !== S.shooter).reduce((s,i) => s + S.players[i].credits, 0);
  return Math.max(minStake(), Math.min(S.players[S.shooter].credits, oppTotal));
}
function computeCovers(stake){
  const opps = alive().filter(i => i !== S.shooter);
  const per = Math.max(1, Math.floor(stake / opps.length));
  const cv = opps.map(i => ({ i, amt: Math.min(per, S.players[i].credits) }));
  const tot = () => cv.reduce((s,c) => s + c.amt, 0);
  while(tot() > stake){ cv.sort((a,b) => b.amt - a.amt); cv[0].amt--; }
  return cv.filter(c => c.amt > 0);
}
function hostRoll(stake){
  if(S.rolling || (S.phase !== 'bet' && S.phase !== 'point')) return;
  if(S.phase === 'bet'){
    const mn = minStake(), mx = maxStake();
    stake = Math.max(mn, Math.min(mx, parseInt(stake) || mn));
    S.stake = stake; S.covers = computeCovers(stake);
  }
  const g = ++rollGen;
  S.rolling = true; S.msg = 'Zarurile se rostogolesc...'; S.msgCls = '';
  push();
  setTimeout(() => {
    if(g !== rollGen || !S) return;
    const a = r6(), b = r6(), s = a + b;
    S.dice = [a,b]; S.rolling = false;
    const nm = S.players[S.shooter].name, en = esc(nm);
    addLog(`${nm} a dat ${a}+${b} = ${s}`);
    if(S.phase === 'bet'){
      if(s === 7 || s === 11) return finish(true,  `${s}! Câștigă ${en}`);
      if(s === 2 || s === 3 || s === 12) return finish(false, `${s}! Pierde ${en}`);
      S.point = s; S.phase = 'point';
      S.msg = `Punct: <b>${s}</b>. Dacă dă ${s} câștigă, dacă dă 7 pierde.`;
      push();
    } else {
      if(s === S.point) return finish(true,  `A dat punctul ${S.point}! Câștigă ${en}`);
      if(s === 7)       return finish(false, `7! Pierde ${en}`);
      S.msg = `A dat ${s}. Punct: <b>${S.point}</b>. Mai aruncă.`;
      push();
    }
  }, 1000);
}
function finish(win, text){
  S.covers.forEach(c => { c.amt = Math.min(c.amt, Math.max(0, S.players[c.i].credits)); });
  const total = S.covers.reduce((s,c) => s + c.amt, 0);
  const sh = S.players[S.shooter];
  if(win){ S.covers.forEach(c => S.players[c.i].credits -= c.amt); sh.credits += total; }
  else   { S.covers.forEach(c => S.players[c.i].credits += c.amt); sh.credits -= total; }
  addLog(`${sh.name} ${win ? 'câștigă' : 'pierde'} ${total} credite`);
  S.players.forEach(p => {
    if(p.credits <= 0 && !p.out){ p.out = true; addLog('❌ ' + p.name + ' este eliminat'); }
  });
  const msg = `${text} (${win ? '+' : '-'}${total})`;
  S.msgCls = win ? 'win' : 'lose';
  if(alive().length <= 1) return endGame(msg + '<br>');
  S.phase = 'roundEnd'; S.msg = msg;
  push();
}
function endGame(prefix){
  const left = alive();
  S.phase = 'over'; S.rolling = false;
  if(left.length){
    const w = S.players[left[0]];
    S.msg = (prefix || '') + `🏆 <b>${esc(w.name)}</b> a câștigat jocul cu ${w.credits} credite!`;
    addLog('🏆 ' + w.name + ' a câștigat');
  } else S.msg = 'Joc terminat.';
  S.msgCls = 'win';
  push();
}
function hostNext(){
  if(!S || S.phase !== 'roundEnd') return;
  advanceShooter(); startBet();
}
