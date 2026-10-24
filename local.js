function drawPick(){
  const old = [...document.querySelectorAll('#names input')].map(i => i.value);
  $('nPick').innerHTML = [2,3,4,5,6].map(n => `<button class="${n===N?'on':''}" onclick="N=${n};drawPick()">${n}</button>`).join('');
  $('names').innerHTML = Array.from({length:N}, (_,i) =>
    `<input style="margin-bottom:6px" placeholder="Jucător ${i+1}" maxlength="14" value="${esc(old[i]||'')}">`).join('');
}
function startLocal(){
  const cr = Math.max(10, parseInt($('startCr').value) || 1000);
  const ins = document.querySelectorAll('#names input');
  mode = 'local'; myId = null;
  S = newState(null);
  S.players = Array.from({length:N}, (_,i) => ({ id:'L'+i, name: cleanName(ins[i].value) || 'Jucător '+(i+1), credits: cr }));
  lastRound = -1;
  startBet();
}
