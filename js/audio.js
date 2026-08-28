/* ============ TOWER DEFENDERS — audio v2: layered, punchy, realistic ============ */
TD.Audio = (function(){
  let ctx=null, master=null, comp=null, sfxGain=null, musGain=null, started=false, musicOn=true;
  let sfxVol=0.38, musVol=0.35;
  const throttle={};

  function init(){
    if (ctx) return;
    ctx = new (window.AudioContext||window.webkitAudioContext)();
    comp = ctx.createDynamicsCompressor();          // glue + punch
    comp.threshold.value=-16; comp.knee.value=18; comp.ratio.value=5;
    comp.attack.value=0.003; comp.release.value=0.16;
    master = ctx.createGain(); master.gain.value=0.9;
    comp.connect(master); master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value=sfxVol; sfxGain.connect(comp);
    musGain = ctx.createGain(); musGain.gain.value=musVol; musGain.connect(comp);
    // gentle lowpass shaves the harsh clicks that make rapid shots sound choppy
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=8000; lp.Q.value=0.4;
    sfxGain.disconnect(comp); sfxGain.connect(lp); lp.connect(comp);
  }
  function resume(){ init(); if (ctx.state==='suspended') ctx.resume(); if(!started){ started=true; scheduleMusic(); } }

  /* ---------- synth building blocks ---------- */
  let noiseBuf=null;
  function getNoise(){
    if (!noiseBuf){ const n=ctx.sampleRate*1.5, b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
      let last=0;
      for(let i=0;i<n;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=(w*0.6+last*1.6); } // pinkish
      noiseBuf=b; }
    return noiseBuf;
  }
  // filtered noise hit: type, freq sweep, envelope
  function nz(t,{dur=0.2,peak=0.3,f0=2000,f1=400,q=0.8,type='lowpass',a=0.01,dest}={}){
    const s=ctx.createBufferSource(); s.buffer=getNoise(); s.loop=true;
    s.playbackRate.value=0.9+Math.random()*0.2;
    const f=ctx.createBiquadFilter(); f.type=type; f.Q.value=q;
    f.frequency.setValueAtTime(f0,t);
    if (f1!==f0) f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);
    const g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+a);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.05);
    s.connect(f); f.connect(g); g.connect(dest||sfxGain);
    s.start(t); s.stop(t+dur+0.12);
  }
  // tonal element
  function tone(t,{type='sine',f0=200,f1,dur=0.2,peak=0.2,a=0.01,dest}={}){
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f0,t);
    if (f1&&f1!==f0) o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    o.detune.value=Math.random()*10-5;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+a);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.05);
    o.connect(g); g.connect(dest||sfxGain);
    o.start(t); o.stop(t+dur+0.12);
  }
  // sub thump
  function thump(t,f=95,dur=0.18,peak=0.4){ tone(t,{type:'sine',f0:f,f1:f*0.4,dur,peak,a:0.002}); }
  // mechanical click/clack
  function click(t,peak=0.12,f=3200){ nz(t,{dur:0.018,peak,f0:f,f1:f*0.6,type:'bandpass',q:2,a:0.001}); }

  /* ---------- realistic recipes ---------- */
  const R = {
    // gunshot: crack (HP noise) + body (LP noise) + sub + action click
    rifle:   t=>{ nz(t,{dur:0.05,peak:0.2,f0:5200,f1:2400,type:'highpass',q:0.6});
                  nz(t,{dur:0.12,peak:0.16,f0:1400,f1:300});
                  thump(t,120,0.1,0.13); click(t+0.045,0.07); },
    shotgun: t=>{ nz(t,{dur:0.07,peak:0.26,f0:3800,f1:1600,type:'highpass',q:0.5});
                  nz(t,{dur:0.26,peak:0.24,f0:900,f1:160});
                  thump(t,80,0.22,0.3); click(t+0.16,0.09,2200); click(t+0.24,0.08,1800); },
    mortar:  t=>{ nz(t,{dur:0.3,peak:0.24,f0:600,f1:120});
                  thump(t,70,0.3,0.32); nz(t+0.02,{dur:0.5,peak:0.06,f0:2600,f1:900,type:'bandpass',q:1}); },
    frost:   t=>{ tone(t,{type:'sine',f0:520,f1:1600,dur:0.28,peak:0.07});
                  nz(t,{dur:0.3,peak:0.08,f0:5000,f1:9000,type:'highpass',q:0.4});
                  tone(t+0.04,{type:'sine',f0:780,f1:2400,dur:0.22,peak:0.05}); },
    dart:    t=>{ nz(t,{dur:0.08,peak:0.12,f0:3000,f1:800,type:'bandpass',q:1.4}); click(t,0.05); },
    sniper:  t=>{ nz(t,{dur:0.06,peak:0.3,f0:6000,f1:2000,type:'highpass',q:0.5});
                  nz(t,{dur:0.42,peak:0.2,f0:1100,f1:140});
                  thump(t,65,0.34,0.35); click(t+0.28,0.09,1600); },
    tesla:   t=>{ for(let i=0;i<5;i++) nz(t+i*0.02+Math.random()*0.01,{dur:0.03,peak:0.12,f0:4000+Math.random()*4000,f1:1500,type:'bandpass',q:3});
                  tone(t,{type:'sawtooth',f0:180,f1:60,dur:0.16,peak:0.05}); },
    flak:    t=>{ nz(t,{dur:0.05,peak:0.18,f0:4500,f1:2200,type:'highpass'}); nz(t,{dur:0.16,peak:0.14,f0:1200,f1:280}); thump(t,110,0.12,0.15); },
    flame:   t=>{ nz(t,{dur:0.3,peak:0.09,f0:600,f1:1400,type:'bandpass',q:0.5}); nz(t,{dur:0.24,peak:0.05,f0:3000,f1:5000,type:'highpass'}); },
    rail:    t=>{ tone(t,{type:'sawtooth',f0:70,f1:900,dur:0.14,peak:0.09});
                  nz(t+0.1,{dur:0.09,peak:0.3,f0:6500,f1:2600,type:'highpass'});
                  nz(t+0.1,{dur:0.5,peak:0.2,f0:1300,f1:150}); thump(t+0.1,60,0.4,0.32); },
    missile: t=>{ nz(t,{dur:0.5,peak:0.16,f0:500,f1:2400,type:'bandpass',q:0.8});
                  nz(t,{dur:0.35,peak:0.09,f0:2500,f1:5200,type:'highpass'}); thump(t,90,0.14,0.12); },
    ping:    t=>{ tone(t,{type:'sine',f0:1250,f1:1230,dur:0.22,peak:0.055});
                  tone(t+0.03,{type:'sine',f0:2500,f1:2470,dur:0.14,peak:0.03}); },
    explode: t=>{ nz(t,{dur:0.65,peak:0.36,f0:900,f1:70,q:0.5});
                  thump(t,55,0.5,0.4);
                  nz(t+0.02,{dur:0.2,peak:0.18,f0:4200,f1:1500,type:'highpass'});
                  nz(t+0.25,{dur:0.6,peak:0.08,f0:400,f1:90}); },
    hit:     t=>{ nz(t,{dur:0.035,peak:0.07,f0:2600,f1:1000,type:'bandpass',q:1.2}); click(t,0.04,4200); },
    squish:  t=>{ nz(t,{dur:0.28,peak:0.18,f0:700,f1:110}); thump(t,85,0.2,0.18);
                  nz(t+0.03,{dur:0.16,peak:0.1,f0:2400,f1:700,type:'bandpass',q:1}); },
    baseHit: t=>{ tone(t,{type:'square',f0:190,f1:95,dur:0.22,peak:0.12}); thump(t,75,0.26,0.24);
                  nz(t,{dur:0.2,peak:0.11,f0:900,f1:250}); },
    place:   t=>{ thump(t,140,0.1,0.14); click(t+0.03,0.09,2600); nz(t,{dur:0.08,peak:0.06,f0:800,f1:300}); },
    sell:    t=>{ click(t,0.07,2400); tone(t+0.02,{type:'sine',f0:660,f1:380,dur:0.14,peak:0.07}); },
    ui:      t=>{ click(t,0.05,3000); tone(t,{type:'sine',f0:750,f1:900,dur:0.05,peak:0.04}); },
    upgrade: t=>{ [420,540,680].forEach((f,i)=>tone(t+i*0.055,{type:'triangle',f0:f,dur:0.14,peak:0.07}));
                  click(t,0.06,2000); nz(t+0.16,{dur:0.12,peak:0.05,f0:3000,f1:6000,type:'highpass'}); },
    error:   t=>{ tone(t,{type:'square',f0:170,f1:130,dur:0.12,peak:0.06}); },
    waveStart:t=>{ nz(t,{dur:0.7,peak:0.12,f0:250,f1:900,type:'bandpass',q:1});
                  [180,180,270].forEach((f,i)=>tone(t+i*0.13,{type:'sawtooth',f0:f,f1:f*0.97,dur:0.22,peak:0.06}));
                  thump(t,60,0.4,0.17); },
    waveClear:t=>{ [523,659,784,1047].forEach((f,i)=>tone(t+i*0.08,{type:'triangle',f0:f,dur:0.26,peak:0.07})); },
    freezeHit:t=>{ nz(t,{dur:0.14,peak:0.09,f0:6000,f1:9000,type:'highpass'}); tone(t,{type:'triangle',f0:2100,f1:700,dur:0.12,peak:0.05}); },
    gold:    t=>{ tone(t,{type:'sine',f0:1320,f1:1900,dur:0.08,peak:0.05}); tone(t+0.05,{type:'sine',f0:1980,f1:2600,dur:0.08,peak:0.04}); click(t,0.04,5200); },
    research:t=>{ [880,1174,1568].forEach((f,i)=>tone(t+i*0.06,{type:'sine',f0:f,dur:0.16,peak:0.05})); },
    win:     t=>{ [392,523,659,784,1047].forEach((f,i)=>tone(t+i*0.12,{type:'triangle',f0:f,dur:0.4,peak:0.08}));
                  nz(t+0.5,{dur:0.5,peak:0.06,f0:3000,f1:7000,type:'highpass'}); },
    lose:    t=>{ [330,277,220,165].forEach((f,i)=>tone(t+i*0.2,{type:'sawtooth',f0:f,f1:f*0.96,dur:0.4,peak:0.07}));
                  thump(t+0.7,50,0.6,0.24); },
    roar:    t=>{ tone(t,{type:'sawtooth',f0:85,f1:40,dur:0.7,peak:0.18});
                  nz(t,{dur:0.6,peak:0.18,f0:400,f1:90}); nz(t+0.1,{dur:0.4,peak:0.09,f0:1500,f1:400,type:'bandpass',q:1}); },
  };

  function sfx(name){
    if (!ctx||!R[name]) return;
    const now=performance.now();
    if (throttle[name]&&now-throttle[name]<45) return;
    throttle[name]=now;
    try{ R[name](ctx.currentTime); }catch(e){}
  }

  /* ---------- generative music (kept minimal under the combat) ---------- */
  const CHORDS=[[220,261.6,329.6],[174.6,220,261.6],[130.8,164.8,196],[196,246.9,293.7]];
  const BASS=[110,87.3,65.4,98];
  let musicTimer=null, bar=0;
  function scheduleMusic(){
    if (musicTimer) return;
    const BARLEN=2.4;
    const tick=()=>{
      if (!ctx||!musicOn) return;
      const t=ctx.currentTime+0.05, c=CHORDS[bar%4];
      c.forEach(f=>{
        const o=ctx.createOscillator(), g=ctx.createGain(), fl=ctx.createBiquadFilter();
        o.type='sawtooth'; o.frequency.value=f; o.detune.value=(Math.random()*8-4);
        fl.type='lowpass'; fl.frequency.value=750;
        g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.038,t+0.7);
        g.gain.linearRampToValueAtTime(0.0001,t+BARLEN+0.2);
        o.connect(fl); fl.connect(g); g.connect(musGain); o.start(t); o.stop(t+BARLEN+0.4);
      });
      for(let i=0;i<4;i++){
        const bt=t+i*(BARLEN/4);
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.type='sine'; o.frequency.setValueAtTime(BASS[bar%4],bt);
        g.gain.setValueAtTime(0.0001,bt); g.gain.linearRampToValueAtTime(0.07,bt+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001,bt+0.4);
        o.connect(g); g.connect(musGain); o.start(bt); o.stop(bt+0.5);
        nz(bt+BARLEN/8,{dur:0.03,peak:0.02,f0:7000,f1:9000,type:'highpass',dest:musGain});
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
    setMusicOn(on){ musicOn=on; if(on&&ctx) scheduleMusic(); if(!on&&musicTimer){ clearInterval(musicTimer); musicTimer=null; } },
  };
})();
