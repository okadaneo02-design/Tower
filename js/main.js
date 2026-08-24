/* ============ TOWER DEFENDERS — boot ============ */
(function(){
  function boot(){
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
    document.getElementById('loading').classList.add('hidden');
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
  if (typeof THREE==='undefined'){
    document.querySelector('#loading .load-sub').textContent='⚠ could not load Three.js — check your internet connection and refresh';
  } else if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
