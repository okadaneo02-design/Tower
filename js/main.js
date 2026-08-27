/* ============ TOWER DEFENDERS — boot ============ */
(function(){
  function boot(){
    document.getElementById('loading').classList.add('hidden');  // never get stuck on the loading screen
    const canvas=document.getElementById('game-canvas');
    const eng=new TD.Engine(canvas);
    const game=new TD.Game(eng);
    TD.eng=eng; TD.game=game; // console/debug handles
    // apply saved settings
    const st=game.save.settings;
    TD.Audio.setSfxVol(st.sfx); TD.Audio.setMusVol(st.mus); TD.Audio.setMusicOn(st.musicOn);
    eng.showDmgNums=st.dmgNums;
    // build a pretty idle backdrop behind the menus
    eng.buildMap(TD.MAPS[0]);
    const idleBase=eng.makeBase(); eng.mapGroup.add(idleBase);
    TD.ui.init(game,eng);
    // main loop
    let last=performance.now();
    const SUB=1/45; // sim substep cap — full frame-rate sim at 1x, stable at 3x
    function frame(now){
      requestAnimationFrame(frame);
      let dt=Math.min(0.05,(now-last)/1000); last=now;
      let sim=dt*game.speed;
      while (sim>1e-6){ const step=Math.min(SUB,sim); game.update(step); sim-=step; }
      eng.update(dt);
      if (game.state==='playing') TD.ui.updateHUD();
      eng.render();
    }
    requestAnimationFrame(frame);
    // menu idle camera drift
    setInterval(()=>{ if(game.state==='menu'){ eng.camAngle+=0.0012; eng.updateCamera(); } },16);
  }
  function start(){
    const bar=document.querySelector('#loading .load-fill');
    const sub=document.querySelector('#loading .load-sub');
    if (bar) bar.style.width='2%';
    let fired=false;
    const finish=()=>{ if (fired) return; fired=true; setTimeout(boot,250); };
    const prog=(n,t)=>{
      const p=Math.min(100,Math.round(n/t*100));
      if (bar) bar.style.width=p+'%';
      if (sub) sub.textContent='loading models… '+p+'%';
    };
    if (TD.loadAssets) TD.loadAssets(finish,prog);
    else { if (bar) bar.style.width='100%'; finish(); }
    // watchdog: never leave the player stuck on the loading screen
    setTimeout(()=>{ if(!fired){ if (bar) bar.style.width='100%'; finish(); } },10000);
  }
  if (typeof THREE==='undefined'){
    document.querySelector('#loading .load-sub').textContent='⚠ could not load Three.js — check your internet connection and refresh';
  } else if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
