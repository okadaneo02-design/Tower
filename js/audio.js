/* ============ TOWER DEFENDERS — synthesized audio ============ */
TD.Audio = (function(){
  let ctx=null, master=null, sfxGain=null, musGain=null, started=false, musicOn=true;
  let sfxVol=0.7, musVol=0.45;
  const throttle={}; // per-name rate limit so 30 shots/frame don't clip

  function init(){
    if (ctx) return;
    ctx = new (window.AudioContext||window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value=0.9; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value=sfxVol; sfxGain.connect(master);
    musGain = ctx.createGain(); musGain.gain.value=musVol; musGain.connect(master);
  }
  function resume(){ init(); if (ctx.state==='suspended') ctx.resume(); if(!started){ started=true; scheduleMusic(); } }

  // ---------- tiny synth helpers ----------
  function env(g,t,a,d,peak){ g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
  function osc(type,f0,f1,t,dur,peak,dest){
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f0,t);
    if (f1!==f0) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
    env(g,t,0.005,dur,peak); o.connect(g); g.connect(dest||sfxGain);
    o.start(t); o.stop(t+dur+0.1);
  }
  let noiseBuf=null;
  function noise(t,dur,peak,fLow,fHigh,dest){
    if(!noiseBuf){ const n=ctx.sampleRate*1.2, b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
      for(let i=0;i<n;i++) d[i]=Math.random()*2-1; noiseBuf=b; }
    const s=ctx.createBufferSource(); s.buffer=noiseBuf; s.loop=true;
    const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=(fLow+fHigh)/2; f.Q.value=0.7;
    const g=ctx.createGain(); env(g,t,0.003,dur,peak);
    s.connect(f); f.connect(g); g.connect(dest||sfxGain); s.start(t); s.stop(t+dur+0.1);
  }

  // ---------- sfx recipes ----------
  const R = {
    rifle:   t=>{ noise(t,0.06,0.25,1500,4000); osc('square',420,180,t,0.05,0.10); },
    shotgun: t=>{ noise(t,0.16,0.5,400,2200); osc('sine',150,60,t,0.12,0.35); },
    mortar:  t=>{ osc('sine',140,45,t,0.25,0.5); noise(t,0.1,0.2,200,900); },
    frost:   t=>{ osc('triangle',900,1600,t,0.18,0.12); osc('triangle',1400,2400,t+0.03,0.15,0.08); },
    dart:    t=>{ noise(t,0.05,0.15,2500,6000); osc('sine',800,300,t,0.06,0.08); },
    sniper:  t=>{ noise(t,0.12,0.45,900,3000); osc('square',220,70,t,0.14,0.22); },
    tesla:   t=>{ for(let i=0;i<4;i++) osc('sawtooth',1800-i*300+Math.random()*400,300,t+i*0.015,0.05,0.09); },
    flak:    t=>{ noise(t,0.08,0.3,800,2500); osc('square',300,120,t,0.07,0.14); },
    flame:   t=>{ noise(t,0.12,0.12,300,1200); },
    rail:    t=>{ osc('sawtooth',80,900,t,0.12,0.2); noise(t+0.05,0.15,0.35,1200,4500); },
    missile: t=>{ noise(t,0.25,0.18,600,1800); osc('sawtooth',500,900,t,0.2,0.08); },
    ping:    t=>{ osc('sine',1200,1180,t,0.15,0.12); osc('sine',2400,2380,t+0.02,0.1,0.05); },
    explode: t=>{ noise(t,0.4,0.6,80,600); osc('sine',120,35,t,0.35,0.5); },
    hit:     t=>{ noise(t,0.03,0.12,1000,3000); },
    squish:  t=>{ osc('sine',160,50,t,0.12,0.25); noise(t,0.09,0.18,150,700); },
    baseHit: t=>{ osc('square',180,90,t,0.2,0.3); osc('square',240,120,t+0.05,0.2,0.2); },
    place:   t=>{ osc('sine',300,500,t,0.08,0.2); noise(t,0.05,0.1,400,1400); },
    sell:    t=>{ osc('sine',600,320,t,0.15,0.2); osc('sine',900,480,t+0.05,0.12,0.12); },
    ui:      t=>{ osc('sine',700,900,t,0.05,0.12); },
    upgrade: t=>{ [440,554,659].forEach((f,i)=>osc('triangle',f,f,t+i*0.06,0.12,0.15)); },
    error:   t=>{ osc('square',180,140,t,0.12,0.15); },
    waveStart:t=>{ [220,220,330].forEach((f,i)=>osc('sawtooth',f,f*0.98,t+i*0.12,0.18,0.14)); noise(t,0.3,0.08,100,500); },
    waveClear:t=>{ [523,659,784,1047].forEach((f,i)=>osc('triangle',f,f,t+i*0.09,0.22,0.16)); },
    freezeHit:t=>{ osc('triangle',2200,600,t,0.12,0.1); },
    gold:    t=>{ osc('sine',1300,1900,t,0.07,0.1); osc('sine',1900,2500,t+0.05,0.07,0.08); },
    research:t=>{ [880,1174,1568].forEach((f,i)=>osc('sine',f,f,t+i*0.07,0.15,0.1)); },
    win:     t=>{ [392,523,659,784,1047].forEach((f,i)=>osc('triangle',f,f,t+i*0.13,0.4,0.18)); },
    lose:    t=>{ [330,277,220,165].forEach((f,i)=>osc('sawtooth',f,f*0.97,t+i*0.22,0.4,0.16)); },
    roar:    t=>{ osc('sawtooth',90,45,t,0.6,0.35); noise(t,0.5,0.25,60,400); },
  };

  function sfx(name){
    if (!ctx || !R[name]) return;
    const now=performance.now();
    if (throttle[name] && now-throttle[name]<40) return;
    throttle[name]=now;
    try{ R[name](ctx.currentTime); }catch(e){}
  }

  // ---------- generative music: dark chill loop ----------
  // Am – F – C – G  pads with a soft bass pulse and hats
  const CHORDS=[[220,261.6,329.6],[174.6,220,261.6],[130.8,164.8,196],[196,246.9,293.7]];
  const BASS=[110,87.3,65.4,98];
  let musicTimer=null, bar=0;
  function scheduleMusic(){
    if (musicTimer) return;
    const BARLEN=2.4; // seconds per chord
    const tick=()=>{
      if (!ctx || !musicOn){ return; }
      const t=ctx.currentTime+0.05, c=CHORDS[bar%4];
      // pad
      c.forEach(f=>{
        const o=ctx.createOscillator(), g=ctx.createGain(), fl=ctx.createBiquadFilter();
        o.type='sawtooth'; o.frequency.value=f; o.detune.value=(Math.random()*8-4);
        fl.type='lowpass'; fl.frequency.value=900;
        g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.05,t+0.7);
        g.gain.linearRampToValueAtTime(0.0001,t+BARLEN+0.2);
        o.connect(fl); fl.connect(g); g.connect(musGain); o.start(t); o.stop(t+BARLEN+0.4);
      });
      // bass pulses on the beat
      for(let i=0;i<4;i++){
        const bt=t+i*(BARLEN/4);
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.type='sine'; o.frequency.setValueAtTime(BASS[bar%4],bt);
        g.gain.setValueAtTime(0.0001,bt); g.gain.linearRampToValueAtTime(0.09,bt+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001,bt+0.4);
        o.connect(g); g.connect(musGain); o.start(bt); o.stop(bt+0.5);
        // hat
        if(noiseBuf||ctx){ noise(bt+BARLEN/8,0.03,0.03,6000,10000,musGain); }
      }
      bar++;
    };
    tick();
    musicTimer=setInterval(tick,2400);
  }

  return {
    resume, sfx,
    setSfxVol(v){ sfxVol=v; if(sfxGain) sfxGain.gain.value=v; },
    setMusVol(v){ musVol=v; if(musGain) musGain.gain.value=v; },
    getSfxVol:()=>sfxVol, getMusVol:()=>musVol,
    setMusicOn(on){ musicOn=on; if(on&&ctx){ scheduleMusic(); } if(!on&&musicTimer){ clearInterval(musicTimer); musicTimer=null; } },
  };
})();
