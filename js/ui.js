/* ============ TOWER DEFENDERS v2 — UI ============ */
TD.ui = (function(){
  let game, eng, root;
  const $=s=>document.querySelector(s);
  const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e; };
  const colorHex=c=>'#'+new THREE.Color(c).getHexString();
  const ART=TD.art;
  const artSpan=id=>'<span class="mic" style="background-image:url('+ART(id)+')"></span>';
  const turretPortrait=def=>{
    if (def&&TD.TOWERS[def.id]){
      const u=(eng.portraits&&eng.portraits[def.id])||(eng.renderPortrait&&eng.renderPortrait(def.id));
      if (u) return u;
    }
    return ART(def.id);
  };

  let pickT=['mg','sniper'], pickB=['block','wire','trap'];
  let selMap=0, selDiff='normal', selEndless=false, selHorde=true;
  let cheatSeq=[];

  function init(g,e){
    game=g; eng=e; root=$('#ui');
    root.innerHTML='';
    buildTitle(); buildMapSelect(); buildLoadout(); buildTech(); buildSkins(); buildHUD();
    bindInput();
    show('title');
  }

  /* ============ screens ============ */
  const screens={};
  function show(name){
    for (const k in screens) screens[k].style.display='none';
    $('#hud').classList.remove('on');
    if (name==='hud') $('#hud').classList.add('on');
    else if (screens[name]){ screens[name].style.display='flex'; refresh(name); }
    TD.Audio.sfx('ui');
  }
  function refresh(name){
    if (name==='mapselect') paintMapSelect();
    if (name==='loadout') paintLoadout();
    if (name==='tech') paintTech();
    if (name==='skins') paintSkins();
  }

  /* ============ TITLE ============ */
function buildTitle(){
    applyTheme();
    const s=el('div','screen menu-screen');
    // orbiting showcase of your arsenal
    const orb=el('div','orb-ring');
    const orbIds=['mg','sniper','minigun','flame','laser','mortar','missile','tesla'];
    orbIds.forEach((id,i)=>{
      const a=i/orbIds.length*Math.PI*2;
      const ic=el('div','orb-ic');
      ic.style.backgroundImage='url('+ART(id)+')';
      ic.style.transform='rotate('+a+'rad) translateX(250px) rotate('+(-a)+'rad)';
      orb.append(ic);
    });
    s.append(orb);
    // rising sparks
    for(let i=0;i<9;i++){
      const sp=el('div','spark');
      sp.style.left=(6+Math.random()*88)+'%';
      sp.style.animationDelay=(Math.random()*7)+'s';
      sp.style.animationDuration=(5+Math.random()*5)+'s';
      s.append(sp);
    }
    s.append(el('div','title-big','TOWER<br>DEFENDERS'));
    s.append(el('div','title-sub','hold the line — they come from every direction'));
    const col=el('div','menu-col');
    const play=el('button','btn primary',artSpan('play')+'PLAY');
    play.dataset.k='1';
    play.onclick=()=>{ TD.Audio.resume(); show('mapselect'); };
    const coop=el('button','btn',artSpan('coop')+'CO-OP (2P)');
    coop.dataset.k='2';
    coop.onclick=()=>{ TD.Audio.resume(); openCoop(); };
    const daily=el('button','btn',artSpan('cal')+'DAILY RUN');
    daily.dataset.k='3';
    daily.onclick=()=>{ TD.Audio.resume();
      if (game.startDaily()){ buildBuildBar(); show('hud'); updateHUD(true); } };
    const lab=el('button','btn',artSpan('gear')+'SKINS');
    lab.dataset.k='4';
    lab.onclick=()=>{ TD.Audio.resume(); show('skins'); };
    const tech=el('button','btn',artSpan('tree')+'TECH TREE');
    tech.dataset.k='5';
    tech.onclick=()=>{ TD.Audio.resume(); show('tech'); };
    const set=el('button','btn',artSpan('gear')+'SETTINGS');
    set.dataset.k='6';
    set.onclick=()=>{ TD.Audio.resume(); openSettings(); };
    col.append(play,coop,daily,lab,tech,set);
    s.append(col);
    s.append(el('div','hint m-kbd','keys 1-6 open these'));
    // footer stats strip
    const st=game.save.stats||{};
    let stars=0;
    for (const m of TD.MAPS) stars+=(game.save.maps[m.id].stars||[]).length;
    const fs=el('div','menu-stats');
    fs.innerHTML=artSpan('flask')+'Research <b>'+game.save.research+'</b>'
      +artSpan('star')+'Stars <b>'+stars+'</b>'
      +artSpan('coin')+'Gold <b>'+((st.goldEarned||0)|0)+'</b>';
    s.append(fs);
    root.append(s); screens.title=s;
  }

  /* ============ MAP SELECT ============ */
  let mapGrid,diffRow,endBtn,modeRow;
  function buildMapSelect(){
    const s=el('div','screen');
    const back=el('div','back-row'); const bb=el('button','btn small','← Back');
    bb.onclick=()=>show('title'); back.append(bb); s.append(back);
    s.append(el('div','h2','CHOOSE A BATTLEFIELD'));
    s.append(el('div','h2sub','Vehicles pour in from the red ring — the whole edge is hostile.'));
    mapGrid=el('div','map-grid'); s.append(mapGrid);
    diffRow=el('div','diff-row'); s.append(diffRow);
    modeRow=el('div','mode-row');
    endBtn=el('button','btn small','∞ ENDLESS: OFF');
    endBtn.onclick=()=>{ selEndless=!selEndless; paintMapSelect(); };
    modeRow.append(endBtn); s.append(modeRow);
    const goBtn=el('button','btn primary','CHOOSE LOADOUT →');
    goBtn.onclick=()=>show('loadout');
    s.append(goBtn);
    root.append(s); screens.mapselect=s;
  }
  function mapThumb(map){
    const img=el('img','map-thumb');
    img.src=eng.renderMapPreview(map); // real 3D render of the battlefield
    img.draggable=false;
    return img;
  }
  function paintMapSelect(){
    mapGrid.innerHTML='';
    for (const m of TD.MAPS){
      const unlocked=game.mapUnlocked(m.id);
      const card=el('div','map-card'+(unlocked?'':' locked')+(selMap===m.id?' selected':''));
      card.append(mapThumb(m));
      card.append(el('div','map-name',m.name));
      const save=game.save.maps[m.id];
      card.append(el('div','map-stars','★'.repeat(save.stars.length)+'☆'.repeat(3-save.stars.length)));
      card.append(el('div','map-meta',`<span>${TD.CONFIG.GRID}×${TD.CONFIG.GRID}</span><span>best: ${save.bestWave||'—'}</span>`));
      card.append(el('div','trole',m.desc));
      if (unlocked) card.onclick=()=>{ selMap=m.id; if(!game.save.maps[m.id].stars.length) selEndless=false; paintMapSelect(); };
      else card.title='Complete the previous map to unlock';
      mapGrid.append(card);
    }
    diffRow.innerHTML='';
    for (const d of ['easy','normal','hard']){
      const p=el('button','diff-pill'+(selDiff===d?' sel-'+d:''),TD.DIFFICULTY[d].label);
      p.onclick=()=>{ selDiff=d; paintMapSelect(); };
      diffRow.append(p);
    }
    const canEndless=game.save.maps[selMap].stars.length>0;
    endBtn.disabled=!canEndless;
    endBtn.textContent=canEndless?('∞ ENDLESS: '+(selEndless?'ON':'OFF')):'∞ ENDLESS (beat the campaign first)';
    endBtn.style.borderColor=selEndless&&canEndless?'var(--accent)':'';
    modeRow.innerHTML='';
    const tds=el('button','mode-pill'+(selHorde?'':' sel-tds'),'TDS — follow the track');
    tds.onclick=()=>{ selHorde=false; paintMapSelect(); };
    const horde=el('button','mode-pill'+(selHorde?' sel-horde':''),'HORDE — every direction');
    horde.onclick=()=>{ selHorde=true; paintMapSelect(); };
    modeRow.append(tds,horde,endBtn);
  }

  /* ============ LOADOUT (9 weight points + 3 blocks) ============ */
  let rosterEl,rosterB,slotMeter,slotChips,blockChips,warnEl;
  const weightUsed=()=>pickT.reduce((a,id)=>a+(TD.TOWERS[id].slotCost||1),0);
  const maxSlots=()=>game.techSlots||TD.CONFIG.SLOT_POINTS;
  let matStatusEl=null;
  function materialStatus(){
    const sk=game.save.skins;
    return 'SCRAP '+sk.scrap.length+' · METAL '+sk.metal.length+' · GOLD '+sk.gold.length;
  }
  function buildLoadout(){
    const s=el('div','screen');
    const back=el('div','back-row'); const bb=el('button','btn small','← Back');
    bb.onclick=()=>show('mapselect'); back.append(bb); s.append(back);
    s.append(el('div','h2','ASSEMBLE YOUR ARSENAL'));
    s.append(el('div','h2sub',`${maxSlots()} loadout points for turrets (heavy weapons cost 2) + ${TD.CONFIG.BLOCK_SLOTS} block types.`));
    matStatusEl=el('div','h2sub','TURRET MATERIALS: '+materialStatus());
    s.append(matStatusEl);
    const mr=el('div','mat-row');
    const defs=[['scrap','SCRAP',30],['metal','METAL',60],['gold','GOLD',100]];
    for (const [tier,label,cost] of defs){
      const b=el('button','btn small',label+' MATERIAL — '+cost+' RESEARCH (random turret)');
      b.onclick=()=>{
        const r=game.buyMaterial(tier);
        if (r.ok){ showCrateReveal(tier,r.name,r.id); paintLoadout(); }
        else { TD.Audio.sfx('error'); toast(r.msg); }
      };
      mr.append(b);
    }
    s.append(mr);
    const wrap=el('div','loadout-wrap');
    const rp=el('div','roster-panel');
    rp.append(el('div','panel-h','Turret Roster'));
    rosterEl=el('div','roster-grid'); rp.append(rosterEl);
    const bh=el('div','panel-h','Blocks & Traps'); bh.style.marginTop='18px'; rp.append(bh);
    rosterB=el('div','roster-grid'); rp.append(rosterB);
    const sp=el('div','slots-panel');
    sp.append(el('div','panel-h','Loadout'));
    slotMeter=el('div','slot-meter'); sp.append(slotMeter);
    slotChips=el('div','chip-list'); sp.append(slotChips);
    const bh2=el('div','panel-h',`Block Slots (${TD.CONFIG.BLOCK_SLOTS})`); bh2.style.marginTop='14px'; sp.append(bh2);
    blockChips=el('div','chip-list'); sp.append(blockChips);
    warnEl=el('div','loadout-warn',''); sp.append(warnEl);
    const startBtn=el('button','btn primary',artSpan('play')+'DEPLOY');
    startBtn.style.width='100%';
    startBtn.onclick=()=>{
      if (!pickT.length){ warnEl.textContent='Bring at least one turret!'; TD.Audio.sfx('error'); return; }
      game.startRun(selMap,selDiff,{towers:[...pickT],blocks:[...pickB]},selEndless,selHorde);
      const ld=el('div','screen overlay deploy-load');
      ld.innerHTML='<div class="result-box"><div class="h2">DEPLOYING DEFENSES</div><div class="load-bar"><div class="load-fill"></div></div><div class="h2sub">moving pieces into position…</div></div>';
      root.append(ld);
      setTimeout(()=>{ ld.remove(); buildBuildBar(); show('hud'); updateHUD(true); },950);
    };
    sp.append(startBtn);
    sp.append(el('div','hint','First: place your base anywhere. Then build a maze of blocks — vehicles path around them, turrets on top shoot farther.'));
    wrap.append(rp,sp); s.append(wrap);
    root.append(s); screens.loadout=s;
  }
  function portrait(def){
    const p=el('div','tportrait');
    p.style.backgroundColor=colorHex(def.color);
    p.style.backgroundImage='url('+turretPortrait(def)+')';
    if (TD.TOWERS[def.id]) p.style.backgroundSize='contain';
    return p;
  }
  function paintLoadout(){
    const unlocked=game.unlockedTowers();
    pickT=pickT.filter(id=>unlocked.has(id));
    rosterEl.innerHTML='';
    for (const id in TD.TOWERS){
      const d=TD.TOWERS[id], has=unlocked.has(id);
      const card=el('div','tcard'+(pickT.includes(id)?' picked':'')+(has?'':' locked')+
        (has&&game.materialRank(id)>=1?' tcard-'+['scrap','scrap','metal','gold'][game.materialRank(id)]:''));
      card.append(portrait(d));
      card.append(el('div','tname',d.name));
      card.append(el('div','trole',d.role));
      card.append(el('div','tcost',`$${d.cost} · ${'◆'.repeat(d.slotCost||1)}`));
      card.title=d.desc;
      if (has) card.onclick=()=>{
        const i=pickT.indexOf(id);
        if (i>=0) pickT.splice(i,1);
        else if (weightUsed()+(d.slotCost||1)<=maxSlots()) pickT.push(id);
        else { toast('Not enough loadout points'); TD.Audio.sfx('error'); return; }
        TD.Audio.sfx('ui'); paintLoadout();
      };
      else card.title='Unlock in the Tech Tree';
      rosterEl.append(card);
    }
    rosterB.innerHTML='';
    for (const id in TD.BLOCKS){
      const d=TD.BLOCKS[id];
      const card=el('div','tcard'+(pickB.includes(id)?' picked':''));
      const p=el('div','tportrait');
      p.style.backgroundColor=colorHex(d.color);
      p.style.backgroundImage='url('+ART(d.id)+')';
      card.append(p);
      card.append(el('div','tname',d.name));
      card.append(el('div','tcost','$'+d.cost));
      card.title=d.desc;
      card.onclick=()=>{
        const i=pickB.indexOf(id);
        if (i>=0) pickB.splice(i,1);
        else if (pickB.length<TD.CONFIG.BLOCK_SLOTS) pickB.push(id);
        else { toast('Block slots full'); TD.Audio.sfx('error'); return; }
        TD.Audio.sfx('ui'); paintLoadout();
      };
      rosterB.append(card);
    }
    const used=weightUsed(), max=maxSlots();
    slotMeter.innerHTML=`<div class="sm-label">${used} / ${max} points</div>
      <div class="sm-track"><div class="sm-fill" style="width:${used/max*100}%"></div></div>`;
    slotChips.innerHTML='';
    for (const id of pickT){
      const d=TD.TOWERS[id];
      const chip=el('div','chip');
      chip.innerHTML=`<span class="chip-dot" style="background:${colorHex(d.color)}"></span>${d.name} <span class="chip-w">${'◆'.repeat(d.slotCost||1)}</span>`;
      chip.onclick=()=>{ pickT.splice(pickT.indexOf(id),1); paintLoadout(); TD.Audio.sfx('ui'); };
      slotChips.append(chip);
    }
    if (!pickT.length) slotChips.append(el('div','hint','click turrets to add them'));
    blockChips.innerHTML='';
    for (const id of pickB){
      const d=TD.BLOCKS[id];
      const chip=el('div','chip');
      chip.innerHTML=`<span class="chip-dot" style="background:${colorHex(d.color)}"></span>${d.name}`;
      chip.onclick=()=>{ pickB.splice(pickB.indexOf(id),1); paintLoadout(); TD.Audio.sfx('ui'); };
      blockChips.append(chip);
    }
    warnEl.textContent='';
    if (matStatusEl) matStatusEl.textContent='TURRET MATERIALS: '+materialStatus();
  }

  /* ============ TECH TREE ============ */
  let techWrap,resBanner;
  function buildTech(){
    const s=el('div','screen');
    const back=el('div','back-row'); const bb=el('button','btn small','← Back');
    bb.onclick=()=>show('title'); back.append(bb); s.append(back);
    s.append(el('div','h2','TECH TREE'));
    resBanner=el('div','res-banner',''); s.append(resBanner);
    techWrap=el('div','tech-wrap'); s.append(techWrap);
    s.append(el('div','hint','Earn research by clearing waves in any run. Purchases are permanent.'));
    root.append(s); screens.tech=s;
  }
  function paintTech(){
    resBanner.innerHTML=artSpan('flask')+'Research: <b>'+game.save.research+'</b>';
    techWrap.innerHTML='';
    for (const br of TD.TECH){
      const col=el('div','tech-col');
      col.append(el('div','panel-h',br.branch));
      for (const n of br.nodes){
        const owned=game.techHas(n.id);
        const gated=n.req&&!game.techHas(n.req);
        const afford=!owned&&!gated&&game.save.research>=n.cost;
        const node=el('div','tech-node'+(owned?' owned':'')+(afford?' affordable':''));
        node.append(el('div','',`<div class="tn-name">${owned?'✓ ':''}${n.name}</div><div class="tn-desc">${n.desc}${gated?' (requires previous)':''}</div>`));
        node.append(el('div','tn-cost',owned?'OWNED':n.cost+' RESEARCH'));
        if (afford) node.onclick=()=>{ if(game.techBuy(n)) paintTech(); };
        col.append(node);
      }
      techWrap.append(col);
    }
  }

  /* ============ SKINS — buy materials for random turrets ============ */
  let skinsGrid,skinsRes;
  function buildSkins(){
    const s=el('div','screen');
    const back=el('div','back-row'); const bb=el('button','btn small','← Back');
    bb.onclick=()=>show('title'); back.append(bb); s.append(back);
    s.append(el('div','h2','TURRET SKINS'));
    skinsRes=el('div','res-banner',''); s.append(skinsRes);
    const mr=el('div','mat-row');
    const defs=[['scrap','SCRAP',30],['metal','METAL',60],['gold','GOLD',100]];
    for (const [tier,label,cost] of defs){
      const b=el('button','btn',label+' MATERIAL — '+cost+' RESEARCH (random turret)');
      b.onclick=()=>{
        const r=game.buyMaterial(tier);
        if (r.ok){ showCrateReveal(tier,r.name,r.id); paintSkins(); }
        else { TD.Audio.sfx('error'); toast(r.msg); }
      };
      mr.append(b);
    }
    s.append(mr);
    s.append(el('div','h2sub','Gold turrets are the strongest — +30% dmg, +20% fire rate, +15% range.'));
    skinsGrid=el('div','roster-grid'); s.append(skinsGrid);
    root.append(s); screens.skins=s;
  }
  function paintSkins(){
    if (!skinsRes) return;
    skinsRes.innerHTML=artSpan('flask')+'Research: <b>'+game.save.research+'</b>';
    skinsGrid.innerHTML='';
    for (const id in TD.TOWERS){
      const d=TD.TOWERS[id], rank=game.materialRank(id);
      const card=el('div','tcard tcard-'+['default','scrap','metal','gold'][rank]);
      const p=el('div','tportrait');
      p.style.backgroundColor=colorHex(d.color);
      p.style.backgroundImage='url('+ART(d.id)+')';
      card.append(p);
      card.append(el('div','tname',d.name));
      card.append(el('div','trole',['DEFAULT','SCRAP','METAL','GOLD'][rank]));
      card.title=d.desc;
      skinsGrid.append(card);
    }
  }

  /* ============ HUD ============ */
  let hud,goldEl,hpFill,hpText,shieldText,waveEl,resEl,waveBtn,buildBar,speedBtn,bossWrap,bossFill,bossName,bannerEl,toastEl,enemyTip,abilityBar;
  let bossRef=null, lastGold=null, lastBump=0;
  function buildHUD(){
    hud=el('div',''); hud.id='hud';
    // big base HP bar, top center
    const hpWrap=el('div','base-hp');
    hpWrap.innerHTML='<div class="bh-label">BASE</div>';
    const track=el('div','bh-track'); hpFill=el('div','bh-fill'); track.append(hpFill);
    hpText=el('div','bh-text',''); track.append(hpText);
    hpWrap.append(track);
    shieldText=el('div','bh-shield',''); hpWrap.append(shieldText);
    hud.append(hpWrap);
    // stats row under it
    const tb=el('div','topbar');
    goldEl=el('div','stat gold','<span class="ic" style="background-image:url('+ART('coin')+')"></span><span>0</span>');
    waveEl=el('div','wave-ind','WAVE <b>0</b>/30');
    resEl=el('div','stat research','<span class="ic" style="background-image:url('+ART('flask')+')"></span><span>0</span>');
    tb.append(goldEl,waveEl,resEl);
    hud.append(tb);
    const tr=el('div','corner-tr');
    speedBtn=el('button','icon-btn','1×');
    speedBtn.onclick=()=>{ game.speed=game.speed===1?2:game.speed===2?3:1; speedBtn.textContent=game.speed+'×'; TD.Audio.sfx('ui'); };
    const pauseBtn=el('button','icon-btn','II'); pauseBtn.onclick=togglePause;
    const setBtn=el('button','icon-btn',artSpan('gear')); setBtn.onclick=()=>openSettings();
    tr.append(speedBtn,pauseBtn,setBtn);
    hud.append(tr);
    waveBtn=el('button','btn primary','START WAVE'); waveBtn.id='wave-btn';
    waveBtn.onclick=()=>game.startWave();
    hud.append(waveBtn);
    // ability bar (charge with kills + time)
    abilityBar=el('div','ability-bar');
    TD.ABILITIES.forEach((a,i)=>{
      const b=el('button','abtn');
      b.innerHTML=`<div class="ab-fill"></div><span class="ab-ic" style="background-image:url(${ART(a.id)})"></span><span class="ab-key">${a.key}</span><span class="ab-cd"></span>`;
      b.title=`${a.name} — ${a.desc}`;
      b.onclick=()=>{ game.castAbility(i); updateHUD(); };
      abilityBar.append(b);
    });
    hud.append(abilityBar);
    buildBar=el('div','buildbar'); hud.append(buildBar);
    const tp=el('div',''); tp.id='tower-panel'; hud.append(tp);
    bossWrap=el('div',''); bossWrap.id='boss-bar';
    bossName=el('div','bb-name','');
    const btrack=el('div','bb-track'); bossFill=el('div','bb-fill'); btrack.append(bossFill);
    bossWrap.append(bossName,btrack); hud.append(bossWrap);
    bannerEl=el('div',''); bannerEl.id='banner'; hud.append(bannerEl);
    toastEl=el('div',''); toastEl.id='toast'; hud.append(toastEl);
    enemyTip=el('div',''); enemyTip.id='enemy-tip'; hud.append(enemyTip);
    const fl=el('div',''); fl.id='flash'; hud.append(fl);
    const lh=el('div',''); lh.id='lowhp'; hud.append(lh);
    const help=el('div','ctl-hint','<kbd>LMB</kbd> drag orbit · <kbd>RMB</kbd> drag pan · <kbd>wheel</kbd> zoom · <kbd>R</kbd> rotate piece · <kbd>1–9</kbd> turrets · <kbd>Z X C</kbd> blocks · <kbd>SPACE</kbd> wave');
    hud.append(help);
    root.append(hud);
  }
  const HOTKEYS_T=['1','2','3','4','5','6','7','8','9'], HOTKEYS_B=['Z','X','C'];
  function buildBuildBar(){
    buildBar.innerHTML='';
    game.loadout.towers.forEach((id,i)=>{
      const d=TD.TOWERS[id];
      const b=el('div','bslot'); b.dataset.kind='tower'; b.dataset.id=id;
      b.append(el('div','key',HOTKEYS_T[i]));
      const p=el('div','bp');
      p.style.backgroundColor=colorHex(d.color);
      p.style.backgroundImage='url('+turretPortrait(d)+')';
      p.style.backgroundSize='contain';
      b.append(p, el('div','bn',d.name.split(' ')[0]), el('div','bc','$'+d.cost));
      b.title=`${d.name} — ${d.role}\n${d.desc}`;
      b.onclick=()=>selectBuild('tower',id);
      buildBar.append(b);
    });
    if (game.loadout.blocks.length){
      buildBar.append(el('div','bar-div'));
      game.loadout.blocks.forEach((id,i)=>{
        const d=TD.BLOCKS[id];
        const b=el('div','bslot'); b.dataset.kind='block'; b.dataset.id=id;
        b.append(el('div','key',HOTKEYS_B[i]));
        const p=el('div','bp');
        p.style.backgroundColor=colorHex(d.color);
        p.style.backgroundImage='url('+ART(d.id)+')';
        b.append(p, el('div','bn',d.name.split(' ')[0]), el('div','bc','$'+d.cost));
        b.title=d.desc;
        b.onclick=()=>selectBuild('block',id);
        buildBar.append(b);
      });
      blkCount=el('div','blk-count',game.blocks.length+' blocks');
      blkCount.title='Blocks placed / limit';
      buildBar.append(blkCount);
    }
  }
  let blkCount=null;
  function selectBuild(kind,id){
    if (game.state==='prep'){ toast('Place your base first!'); TD.Audio.sfx('error'); return; }
    if (game.placing&&game.placing.id===id){ game.clearGhost(); paintBuildSel(); return; }
    game.setPlacing(kind,id); paintBuildSel(); TD.Audio.sfx('ui');
  }
  function paintBuildSel(){
    buildBar.querySelectorAll('.bslot').forEach(b=>{
      b.classList.toggle('selected', !!game.placing&&game.placing.id===b.dataset.id);
    });
  }
  function updateHUD(force){
    if (game.state!=='playing'&&game.state!=='prep'&&!force) return;
    goldEl.children[1].textContent=Math.floor(game.gold);
    if (game.gold!==lastGold){
      lastGold=game.gold;
      if (performance.now()-(lastBump||0)>150){
        lastBump=performance.now();
        goldEl.classList.remove('bump'); void goldEl.offsetWidth; goldEl.classList.add('bump');
      }
      if (game.selected&&!game.selected.isBlock&&panelTower===game.selected) refreshTowerPanel();
    }
    resEl.children[1].textContent=game.save.research;
    const f=Math.max(0,game.baseHp/game.baseMaxHp);
    hpFill.style.width=(f*100)+'%';
    hpFill.classList.toggle('low',f<0.35);
    const lhEl=document.getElementById('lowhp');
    if (lhEl) lhEl.classList.toggle('on', f<0.35&&game.state==='playing');
    hpText.textContent=Math.ceil(game.baseHp)+' / '+game.baseMaxHp;
    shieldText.textContent=game.shieldMax?('SHD '+Math.ceil(game.shield)):'';
    waveEl.innerHTML=game.endless? 'WAVE <b>'+game.wave+'</b> ∞' : 'WAVE <b>'+game.wave+'</b>/'+TD.CONFIG.CAMPAIGN_WAVES;
    if (game.state==='prep'){
      waveBtn.disabled=true;
      waveBtn.innerHTML='PLACE YOUR BASE <span class="sub">click anywhere on the field</span>';
    } else if (game.waveActive){
      waveBtn.disabled=false;
      const bonus=Math.round((20+game.wave*3)*game.diff.goldMul);
      waveBtn.innerHTML='CALL WAVE '+(game.wave+1)+' EARLY <span class="sub">+$'+bonus+' · '+game.enemies.length+' hostiles</span>';
    } else {
      waveBtn.disabled=false;
      waveBtn.innerHTML='START WAVE '+(game.wave+1)+' <span class="sub">[SPACE]</span>';
    }
    if (abilityBar&&game.abilities){
      abilityBar.querySelectorAll('.abtn').forEach((b,i)=>{
        const ab=game.abilities[i];
        b.querySelector('.ab-fill').style.height=(ab.charge/ab.def.need*100)+'%';
        b.classList.toggle('ready',ab.charge>=ab.def.need);
        b.classList.toggle('running',(ab.def.id==='overclock'&&game.overclockT>0));
        const cd=b.querySelector('.ab-cd');
        if (cd) cd.textContent=ab.charge>=ab.def.need?'READY':Math.ceil(ab.def.need-ab.charge);
      });
    }
    buildBar.querySelectorAll('.bslot').forEach(b=>{
      const d=b.dataset.kind==='tower'?TD.TOWERS[b.dataset.id]:TD.BLOCKS[b.dataset.id];
      b.classList.toggle('cant',game.gold<d.cost);
    });
    if (blkCount){ blkCount.textContent=game.blocks.length+' blocks'; }
    if (bossRef){ if(bossRef.dead) bossBar(null); else bossFill.style.width=(bossRef.hp/bossRef.maxHp*100)+'%'; }
    if (game.selected&&!game.selected.isBlock&&panelTower===game.selected){
      const k=$('#tp-kills'); if(k) k.textContent=game.selected.kills;
    }
  }
  function bossBar(e){
    bossRef=e;
    bossWrap.classList.toggle('on',!!e);
    if (e) bossName.textContent='BOSS — '+e.def.name;
  }

  /* ============ tower panel (opposite side of screen) ============ */
  let panelTower=null;
  function refreshTowerPanel(){
    const tp=$('#tower-panel'), t=game.selected;
    tp.classList.add('noanim');   // upgrades/gold ticks shouldn't re-run panel animations
    panelTower=t;
    if (!t){ tp.classList.remove('on'); return; }
    tp.classList.add('on');
    // put the panel on the opposite side of the selected turret
    const scr=eng.toScreen(new THREE.Vector3(t.pos.x,0,t.pos.z));
    tp.classList.toggle('right', scr.x<innerWidth/2);
    if (t.isBlock){
      tp.innerHTML='';
      const head=el('div','tp-head');
      const p=el('div','tp-portrait');
      p.style.backgroundColor=colorHex(t.def.color);
      p.style.backgroundImage='url('+turretPortrait(t.def)+')';
      if (TD.TOWERS[t.def.id]) p.style.backgroundSize='contain';
      head.append(p, el('div','',`<div class="tp-name">${t.def.name}</div><div class="tp-quip">${t.def.desc}</div>`));
      tp.append(head);
      if (t.def.uses) tp.append(el('div','tp-stats',`<span>uses left: <b>${t.uses}</b></span>`));
      if (t.def.id==='block'&&t.level!==undefined) tp.append(el('div','tp-stats',`<span>stack level: <b>${t.level+1}</b></span>`));
      const foot=el('div','tp-foot');
      const sell=el('button','btn danger',`SELL $${Math.round(t.spent*game.sellRefund)}`);
      sell.onclick=()=>game.sell(t);
      const close=el('button','btn','CLOSE'); close.onclick=()=>game.select(null);
      foot.append(sell,close); tp.append(foot);
      return;
    }
    const d=t.def, s=t.stats;
    tp.innerHTML='';
    const head=el('div','tp-head');
    const p=el('div','tp-portrait');
    p.style.backgroundColor=colorHex(d.color);
    p.style.backgroundImage='url('+ART(d.id)+')';
    const mat=TD.materialOf?TD.materialOf(t.id):'default';
    head.append(p, el('div','',`<div class="tp-name">${d.name}</div><div class="tp-quip">${d.role}${t.elev?` · elevated +${t.elev}`:''}</div>`));
    if (mat!=='default') head.append(el('div','tp-badge '+mat,mat.toUpperCase()));
    tp.append(head);
    const st=el('div','tp-stats');
    const dps = s.rof>0? Math.round(s.dmg*s.rof*(s.pellets||1)*10)/10 : 0;
    st.innerHTML=`<span>dmg <b>${Math.round(s.dmg*10)/10}</b></span><span>rate <b>${Math.round(s.rof*100)/100}/s</b></span>
      <span>range <b>${Math.round(s.range*10)/10}</b></span>${dps?`<span>dps <b>${dps}</b></span>`:''}
      <span>kills <b id="tp-kills">${t.kills}</b></span>
      ${game.rankOf(t.kills)?`<span>rank <b>${'★'.repeat(game.rankOf(t.kills))}</b></span>`:''}
      ${s.detect?'<span><b>stealth-vision</b></span>':''}`;
    tp.append(st);
    d.paths.forEach((path,pi)=>{
      const tier=t.tiers[pi];
      const chk=game.canUpgrade(t,pi);
      const box=el('div','path p'+pi+((chk.why==='locked')?' locked':''));
      box.append(el('div','path-h',`<span>${path.name} <span class="tp-level">Lv ${tier}/5</span></span><span class="tag">${TD.PATH_TAGS[pi]}</span>`));
      const pips=el('div','pips');
      for (let i=0;i<5;i++) pips.append(el('div','pip'+(i<tier?' f'+pi:'')));
      box.append(pips);
      if (tier>0) box.append(el('div','tp-tier-now','now: <b>'+d.paths[pi].tiers[tier-1].name+'</b>'));
      if (chk.ok||chk.why==='gold'){
        const up=d.paths[pi].tiers[tier];
        const btn=el('button','up-btn'+(chk.ok?' ready':''));
        btn.innerHTML=`<span><span class="un">${up.name}</span><span class="ud">${up.desc}</span></span><span class="uc">$${up.cost}</span>`;
        btn.disabled=!chk.ok;
        btn.onclick=()=>{ if(game.upgrade(t,pi)){ lastGold=game.gold; game.refreshRing(); refreshTowerPanel(); } };
        box.append(btn);
      } else if (chk.why==='max') box.append(el('div','up-max','★ MAXED'));
      else if (chk.why==='locked') box.append(el('div','up-lock','locked — two paths already chosen'));
      else if (chk.why==='capped') box.append(el('div','up-lock','only one path may go deep (tier 3+)'));
      else if (chk.why==='total') box.append(el('div','up-lock','7 upgrade points max — sell and re-spec'));
      tp.append(box);
    });
    const foot=el('div','tp-foot');
    const tgt=el('button','btn','TARGET: '+game.targetingName(t));
    tgt.onclick=()=>{ game.cycleTargeting(t); refreshTowerPanel(); };
    const sell=el('button','btn danger',`SELL $${Math.round(t.spent*game.sellRefund)}`);
    sell.onclick=()=>game.sell(t);
    foot.append(tgt,sell); tp.append(foot);
  }

  /* ============ DARK MODE ============ */
  function applyTheme(){
    const dark=game.save.settings.dark!==false;
    document.body.classList.toggle('dark',dark);
  }
  /* ============ overlays ============ */
  let overlayEl=null;
  function closeOverlay(){ if(overlayEl){ overlayEl.remove(); overlayEl=null; } }
  function togglePause(){
    if (game.state!=='playing'&&game.state!=='prep') return;
    if (overlayEl){ closeOverlay(); game.paused=false; return; }
    game.paused=true;
    const s=el('div','screen overlay');
    const box=el('div','result-box');
    box.append(el('div','result-title','PAUSED'));
    const col=el('div','menu-col');
    const res=el('button','btn primary','RESUME'); res.onclick=()=>{ closeOverlay(); game.paused=false; };
    const set=el('button','btn','SETTINGS'); set.onclick=openSettings;
    const quit=el('button','btn danger','QUIT TO MENU'); quit.onclick=()=>{ closeOverlay(); game.paused=false; game.quitRun(); show('title'); };
    col.append(res,set,quit); box.append(col); s.append(box);
    root.append(s); overlayEl=s;
  }
  function showResults(win){
    closeOverlay();
    const s=el('div','screen overlay');
    const box=el('div','result-box');
    box.append(el('div','result-title '+(win?'win':'lose'),win?'VICTORY':'OVERRUN'));
    const nextUnlock=win&&game.map.id<TD.MAPS.length-1? `<br><b>${TD.MAPS[game.map.id+1].name}</b> unlocked!` : '';
    const codeHint=win&&game.diffId==='normal'&&!game.save.codes.includes('MidzWinz')?
      `<br>Code unlocked: <b>MidzWinz</b> — redeem it in Settings!` : '';
    const endlessNote=win? '<br>∞ Endless mode unlocked for this map' : '';
    const dailyLine=game.daily? `<br>Daily score: <b>${game.wave*100+game.runKills}</b>` : '';
    box.append(el('div','result-stats',
      `Waves survived: <b data-c="${game.wave}">${game.wave}</b><br>Vehicles destroyed: <b data-c="${game.runKills}">${game.runKills}</b><br>
       Research earned: <span class="rr">+<b data-c="${game.runResearch}">${game.runResearch}</b> RESEARCH</span>${dailyLine}${nextUnlock}${codeHint}${endlessNote}`));
    box.querySelectorAll('[data-c]').forEach(el=>{
      const target=+el.dataset.c, t0=performance.now();
      const iv=setInterval(()=>{
        const k=Math.min(1,(performance.now()-t0)/750);
        el.textContent=Math.round(target*(1-Math.pow(1-k,3)));
        if (k>=1) clearInterval(iv);
      },20);
    });
    const row=el('div','row-gap');
    const again=el('button','btn',win?'PLAY AGAIN':'TRY AGAIN');
    again.onclick=()=>{ s.remove(); game.startRun(game.map.id,game.diffId,game.loadout,game.endless); buildBuildBar(); show('hud'); };
    if (!win&&game.wave>0){
      const rewind=el('button','btn rewind',`⟲ REWIND 1 WAVE <span class="sub">5 RESEARCH · +$1000</span>`);
      rewind.onclick=()=>{
        if (game.save.research<5){ TD.Audio.sfx('error'); toast('Need 5 research for a rewind'); return; }
        game.save.research-=5; game.persist();
        game.continueFromWave();
        s.remove(); buildBuildBar(); show('hud'); updateHUD();
        toast('REWOUND — wave '+game.wave+' awaits, +$1000');
      };
      row.append(rewind);
    }
    const menu=el('button','btn primary','MAIN MENU');
    menu.onclick=()=>{ s.remove(); game.quitRun(); show('title'); };
    row.append(again,menu); box.append(row); s.append(box);
    root.append(s);
  }
  function openSettings(){
    const s=el('div','screen overlay');
    const box=el('div','result-box');
    box.append(el('div','h2','SETTINGS'));
    const mk=(label,val,cb)=>{
      const r=el('div','set-row');
      r.append(el('label','',label));
      const inp=document.createElement('input'); inp.type='range'; inp.min=0; inp.max=1; inp.step=0.05; inp.value=val;
      inp.oninput=()=>cb(parseFloat(inp.value));
      r.append(inp); return r;
    };
    box.append(mk('SFX volume',TD.Audio.getSfxVol(),v=>{ TD.Audio.setSfxVol(v); game.save.settings.sfx=v; game.persist(); }));
    box.append(mk('Music volume',TD.Audio.getMusVol(),v=>{ TD.Audio.setMusVol(v); game.save.settings.mus=v; game.persist(); }));
    const gfx0=game.save.settings.gfx===undefined?1:game.save.settings.gfx;
    const gfxRow=el('div','set-row'); gfxRow.append(el('label','','Graphics — enemy count'));
    const gfxLbl=el('b','gfx-lbl',gfx0>=1?'FULL CARS':(gfx0<=0?'CONSOLIDATED':Math.round(gfx0*100)+'%'));
    const gfxInp=document.createElement('input'); gfxInp.type='range'; gfxInp.min=0; gfxInp.max=1; gfxInp.step=0.1; gfxInp.value=gfx0;
    gfxInp.oninput=()=>{ game.save.settings.gfx=parseFloat(gfxInp.value); game.persist();
      gfxLbl.textContent=game.save.settings.gfx>=1?'FULL CARS':(game.save.settings.gfx<=0?'CONSOLIDATED':Math.round(game.save.settings.gfx*100)+'%'); };
    gfxRow.append(gfxInp,gfxLbl); box.append(gfxRow);
    const r2=el('div','set-row'); r2.append(el('label','','Music'));
    const mBtn=el('button','btn small',game.save.settings.musicOn?'ON':'OFF');
    mBtn.onclick=()=>{ game.save.settings.musicOn=!game.save.settings.musicOn; TD.Audio.setMusicOn(game.save.settings.musicOn); mBtn.textContent=game.save.settings.musicOn?'ON':'OFF'; game.persist(); };
    r2.append(mBtn); box.append(r2);
    const r3=el('div','set-row'); r3.append(el('label','','Damage numbers'));
    const dBtn=el('button','btn small',game.save.settings.dmgNums?'ON':'OFF');
    dBtn.onclick=()=>{ game.save.settings.dmgNums=!game.save.settings.dmgNums; eng.showDmgNums=game.save.settings.dmgNums; dBtn.textContent=game.save.settings.dmgNums?'ON':'OFF'; game.persist(); };
    r3.append(dBtn); box.append(r3);
    const rd=el('div','set-row'); rd.append(el('label','','Dark mode'));
    const dkBtn=el('button','btn small',game.save.settings.dark!==false?'ON':'OFF');
    dkBtn.onclick=()=>{ game.save.settings.dark=game.save.settings.dark===false; applyTheme(); dkBtn.textContent=game.save.settings.dark?'ON':'OFF'; game.persist(); };
    rd.append(dkBtn); box.append(rd);
    // redeem codes
    const rc=el('div','set-row'); rc.append(el('label','','Redeem code'));
    const rcWrap=el('div','code-wrap');
    const inp=document.createElement('input'); inp.type='text'; inp.placeholder='enter code…'; inp.className='code-input';
    const go=el('button','btn small','REDEEM');
    const msg=el('div','code-msg','');
    go.onclick=()=>{ const res=game.redeemCode(inp.value);
      msg.textContent=res.msg; msg.className='code-msg '+(res.ok?'ok':'bad');
      if(res.ok) inp.value=''; };
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter') go.click(); e.stopPropagation(); });
    rcWrap.append(inp,go); rc.append(rcWrap); box.append(rc); box.append(msg);
    // admin-only: exists ONLY on devices flagged as admin (never shown to other players)
    if (localStorage.getItem('td.admin')==='1'){
      const r4=el('div','set-row'); r4.append(el('label','','ADMIN: reset ALL progress (all players, this device)'));
      const rBtn=el('button','btn danger small','RESET ALL');
      rBtn.onclick=()=>{
        if (!confirm('Wipe EVERY save on this device — progress, research, unlocks, codes, daily?')) return;
        const kill=[];
        for (let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if (k&&(k.startsWith('towerDefenders.'))) kill.push(k);
        }
        kill.forEach(k=>localStorage.removeItem(k));
        location.reload();
      };
      r4.append(rBtn); box.append(r4);
    }
    const close=el('button','btn primary','DONE'); close.onclick=()=>s.remove();
    box.append(close); s.append(box);
    root.append(s);
  }

  /* ============ perk choice (every 5 waves) ============ */
  const PERK_ART={crit:'star',bounty:'coin',hometurf:'aegis',cheapblocks:'block',reinforced:'shield',deploy:'play',sharp:'blade',reach:'radar',learner:'flask',adrenaline:'overclock',scavenger:'crate',interest:'coin'};
  function showPerkChoice(opts,cb){
    const s=el('div','screen overlay');
    const box=el('div','result-box');
    box.append(el('div','h2','CHOOSE A PERK'));
    box.append(el('div','h2sub','wave '+game.wave+' cleared — pick your edge for this run'));
    const row=el('div','perk-row');
    for (const p of opts){
      const card=el('div','perk-card');
      const ic=el('div','pc-icon');
      ic.style.backgroundImage='url('+ART(PERK_ART[p.id]||'star')+')';
      card.append(ic);
      card.append(el('div','pc-name',p.name));
      card.append(el('div','pc-desc',p.desc));
      card.onclick=()=>{ s.remove(); cb(p.id); updateHUD(); };
      row.append(card);
    }
    box.append(row); s.append(box); root.append(s);
  }

  /* ============ banner / toast ============ */
  let bannerT=null,toastT=null;
  function banner(text,sub){
    bannerEl.innerHTML=text+(sub?`<span class="b-sub">${sub}</span>`:'');
    bannerEl.classList.add('show');
    clearTimeout(bannerT); bannerT=setTimeout(()=>bannerEl.classList.remove('show'),2200);
  }
  function toast(text){
    toastEl.textContent=text; toastEl.classList.add('show');
    clearTimeout(toastT); toastT=setTimeout(()=>toastEl.classList.remove('show'),1500);
  }
  let flashT=null;
  function flash(color,intensity){
    const f=document.getElementById('flash'); if (!f) return;
    f.style.background=color==='red'
      ?'radial-gradient(ellipse at center, transparent 40%, rgba(239,68,68,0.55) 100%)'
      :'radial-gradient(ellipse at center, transparent 45%, rgba(74,222,128,0.45) 100%)';
    f.style.opacity=(intensity||0.4);
    clearTimeout(flashT); flashT=setTimeout(()=>{ f.style.opacity=0; },180);
  }

  /* ============ crate reveal — material unlock animation ============ */
  let crateOv=null;
  function showCrateReveal(tier,name,artId){
    if (crateOv) crateOv.remove();
    const ov=el('div','screen overlay crate-overlay'); crateOv=ov;
    const isGold=tier==='gold';
    const tcol={scrap:'#b9b1a4',metal:'#aab7c4',gold:'#f0c24a'}[tier]||'#aab7c4';
    ov.innerHTML=
      '<div class="crate-stage">'+
        '<div class="crate '+(isGold?'gold':'')+'">'+
          (isGold?'<div class="kc-move"><div class="kc-rotate"><div class="keycard"><div class="kc-chip"></div></div></div></div>':'')+
          '<div class="crate-lid"></div>'+
          '<div class="crate-body"><div class="crate-face"><div class="crate-lock"></div></div></div>'+
          '<div class="crate-glow"></div>'+
        '</div>'+
        '<div class="crate-reveal">'+
          '<div class="crate-portrait" style="background-color:'+tcol+';background-image:url('+ART(artId)+')"></div>'+
          '<div class="crate-title">'+name.toUpperCase()+'</div>'+
          '<div class="crate-tier">'+tier.toUpperCase()+' MATERIAL</div>'+
        '</div>'+
      '</div>';
    root.append(ov);
    TD.Audio.sfx(isGold?'upgrade':'place');
    setTimeout(()=>{ ov.remove(); if (crateOv===ov) crateOv=null; },3200);
  }

  /* ============ input ============ */
  function bindInput(){
    const cv=eng.canvas;
    let dragging=false,dragBtn=0,lx=0,ly=0,moved=0;
    cv.addEventListener('contextmenu',e=>e.preventDefault());
    const CLICK_PX=10; // forgiving click threshold — trackpad taps wobble a few px
    let hoverT=0;
    const paintEnemyTip=(e,en)=>{
      if (!en||en.dead){ enemyTip.classList.remove('show'); return; }
      const d=en.def, tags=[];
      const af=en.affix? TD.AFFIXES[en.affix] : null;
      if (en.escorts&&en.escorts.some(x=>!x.dead)) tags.push('SHIELDED — kill the escort vans!');
      if (en.exposedT>0) tags.push('CORE EXPOSED (2x dmg)');
      if (d.armor) tags.push('ARMOR '+d.armor);
      if (d.fly) tags.push('FLYING');
      if (d.stealth) tags.push('STEALTH');
      if (d.burrow) tags.push('BURROWS');
      if (d.heal) tags.push('REPAIRS ALLIES');
      if (d.shieldAura) tags.push('SHIELDS ALLIES');
      if (d.splits) tags.push('÷ splits');
      if (d.ram) tags.push('KAMIKAZE');
      if (d.spd>=1.8) tags.push('FAST');
      if (d.boss) tags.push('BOSS');
      if (d.vip) tags.push('GOLDEN VIP — drops loot');
      const afName=en.affix? `<span style="color:#${new THREE.Color(TD.AFFIXES[en.affix].color).getHexString()}">${TD.AFFIXES[en.affix].name}</span> ` : '';
      enemyTip.innerHTML=`<b>${afName}${d.name}</b><span class="et-hp">${Math.ceil(en.hp)} / ${en.maxHp}</span>`+
        (tags.length?`<span class="et-tags">${tags.join(' · ')}</span>`:'');
      enemyTip.style.left=(e.clientX+16)+'px';
      enemyTip.style.top=(e.clientY+14)+'px';
      enemyTip.classList.add('show');
    };
    cv.addEventListener('mousedown',e=>{ dragging=true; dragBtn=e.button; lx=e.clientX; ly=e.clientY; moved=0; });
    const ndc=e=>({x:(e.clientX/innerWidth)*2-1, y:-(e.clientY/innerHeight)*2+1});
    const objModels=()=>game.towers.map(t=>t.model).concat(game.blocks.map(b=>b.model));
    // when hovering a block with a stackable piece selected, target THAT block's cell
    const hoverCellOverride=e=>{
      if (!game.placing) return null;
      const {kind,id}=game.placing;
      if (!(kind==='tower'||(kind==='block'&&id==='block'))) return null;
      const blocks=game.blocks.filter(b=>b.def.id==='block').map(b=>b.model);
      if (!blocks.length) return null;
      const n=ndc(e);
      const owner=eng.pickOwner(n.x,n.y,blocks);
      return owner? {c:owner.c,r:owner.r} : null;
    };
    window.addEventListener('mouseup',e=>{
      const inGame=game.state==='playing'||game.state==='prep';
      if (dragging&&dragBtn===0&&moved<CLICK_PX&&inGame){
        if (game.aiming){
          const w=pick(e); if(w) game.confirmAbility(w);
        } else if (game.placing){
          const w=pick(e); const ov=hoverCellOverride(e);
          if (e.shiftKey&&game.placing.kind!=='base'){
            const c=ov||(w&&game.eng.worldToCell(w));
            if (c) game.bulkPlace(c.c,c.r);
          } else if (w||ov) game.clickAt(w||new THREE.Vector3(),ov);
        } else {
          const n=ndc(e);
          // scrap crates grab first, then turrets/blocks, then ground
          const crate=game.crates&&game.crates.length?
            eng.pickOwner(n.x,n.y,game.crates.map(c=>c.model)) : null;
          if (crate&&crate.isCrate) game.collectCrate(crate);
          else {
            const owner=eng.pickOwner(n.x,n.y,objModels());
            if (owner) game.select(owner);
            else { const w=pick(e); if(w) game.clickAt(w); }
          }
        }
        paintBuildSel(); refreshTowerPanel(); updateHUD();
      }
      if (dragging&&dragBtn===2&&moved<CLICK_PX&&inGame&&game.state!=='prep'){
        if (game.placing){ game.clearGhost(); paintBuildSel(); }
        else game.select(null);
      }
      dragging=false;
    });
    window.addEventListener('mousemove',e=>{
      const dx=e.clientX-lx, dy=e.clientY-ly;
      if (dragging&&dragBtn===0){ moved+=Math.abs(dx)+Math.abs(dy);
        if (moved>=CLICK_PX) eng.orbit(dx,dy); }
      else if (dragging&&(dragBtn===2||dragBtn===1)){ moved+=Math.abs(dx)+Math.abs(dy); eng.pan(-dx,-dy); }
      lx=e.clientX; ly=e.clientY;
      if ((game.state==='playing'||game.state==='prep')&&game.placing){
        const w=pick(e); game.updateGhost(w,hoverCellOverride(e));
      }
      if (game.aiming&&game.reticle){
        const w=pick(e); if(w) game.reticle.position.set(w.x,0.05,w.z);
      }
      // enemy hover: HP bar + stat tooltip (throttled — raycasts real meshes)
      if (!dragging&&!game.placing&&game.state==='playing'&&performance.now()-hoverT>90){
        hoverT=performance.now();
        let en=null;
        if (game.enemies.length){
          const n=ndc(e);
          en=eng.pickOwner(n.x,n.y,game.enemies.map(x=>x.model));
        }
        game.hovered=(en&&en.def)?en:null;
        paintEnemyTip(e,game.hovered);
      } else if ((game.placing||game.state!=='playing')&&game.hovered){
        game.hovered=null; paintEnemyTip(e,null);
      }
    });
    cv.addEventListener('wheel',e=>{ e.preventDefault(); eng.zoom(e.deltaY); },{passive:false});
    window.addEventListener('keydown',e=>{
      if (e.target.tagName==='INPUT') return;
      const CHEAT='=====';
      if (e.key==='='||e.key==='+'){
        cheatSeq.push('=');
        if (cheatSeq.length>5) cheatSeq.shift();
        if (cheatSeq.join('')===CHEAT){
          cheatSeq=[];
          const inGame=game.state==='playing'||game.state==='prep';
          if (inGame){
            game.gold+=99999999;
            TD.Audio.sfx('gold');
            toast('CHEAT CODE — INFINITE CASH!');
            updateHUD();
          } else {
            game.save.allMapsUnlocked=true;
            TD.Audio.sfx('gold');
            toast('CHEAT CODE — ALL MAPS UNLOCKED!');
            if (screens.mapselect) paintMapSelect();
          }
        }
        return;
      }
      const inGame=game.state==='playing'||game.state==='prep';
      if (!inGame) return;
      const k=e.key.toLowerCase();
      if (k===' '){ e.preventDefault(); if(game.state==='playing') game.startWave(); }
      else if (k==='a'||k==='s'||k==='d'){ game.castAbility({a:0,s:1,d:2}[k]); updateHUD(); }
      else if (k==='escape'){ if(game.aiming) game.cancelAiming();
        else if(overlayEl) togglePause();
        else if(game.placing&&game.state!=='prep'){ game.clearGhost(); paintBuildSel(); }
        else if(game.selected) game.select(null); else togglePause(); }
      else if (k>='1'&&k<='9'){ const i=+k-1; if(game.loadout.towers[i]) selectBuild('tower',game.loadout.towers[i]); }
      else if (k==='z'||k==='x'||k==='c'){ const i={z:0,x:1,c:2}[k]; if(game.loadout.blocks[i]) selectBuild('block',game.loadout.blocks[i]); }
      else if (k==='r'){ game.rotatePlacing(); }
      else if (k==='t'&&game.selected&&!game.selected.isBlock){ game.cycleTargeting(game.selected); refreshTowerPanel(); }
      else if ((k==='delete'||k==='backspace')&&game.selected){ game.sell(game.selected); }
      else if (k==='q') eng.rotate(1);
      else if (k==='e') eng.rotate(-1);
      else if (k==='0') eng.resetCam();
      else if (k==='p') togglePause();
      else if (k==='f'){ game.speed=game.speed===1?2:game.speed===2?3:1; speedBtn.textContent=game.speed+'×'; }
    });
    window.addEventListener('resize',()=>eng.resize());
  }
  function pick(e){
    const nx=(e.clientX/innerWidth)*2-1, ny=-(e.clientY/innerHeight)*2+1;
    return eng.pickGround(nx,ny);
  }

  /* ============ CO-OP connect flow (swap two codes, no server) ============ */
  let coopEl=null;
  function mkArea(v,ro){
    const t=document.createElement('textarea'); t.className='code-area'; t.value=v; t.readOnly=!!ro;
    if (ro) t.onclick=()=>{ t.select(); try{ document.execCommand('copy'); toast('Copied!'); }catch(e){} };
    t.addEventListener('keydown',e=>e.stopPropagation());
    return t;
  }
  function openCoop(){
    const s=el('div','screen overlay'); coopEl=s;
    const box=el('div','result-box'); box.style.maxWidth='540px';
    box.append(el('div','h2','CO-OP · 2 PLAYERS'));
    box.append(el('div','hint','One of you HOSTS, the other JOINS. Send each other the two codes (any chat app). The host runs the game — you both build from a shared wallet.'));
    const row=el('div','row-gap');
    const hostB=el('button','btn primary','HOST');
    const joinB=el('button','btn','JOIN');
    row.append(hostB,joinB); box.append(row);
    const area=el('div','coop-area'); box.append(area);
    const close=el('button','btn small','CLOSE'); close.onclick=()=>{ s.remove(); coopEl=null; };
    box.append(close);
    s.append(box); root.append(s);
    TD.Net.onOpen=()=>{
      game.netInit();
      toast('Connected!');
      if (TD.Net.role==='host'){ if(coopEl){coopEl.remove(); coopEl=null;} show('mapselect'); }
      else area.innerHTML='<div class="hint" style="color:var(--accent)">Connected! Waiting for the host to start the game…</div>';
    };
    hostB.onclick=async()=>{
      area.innerHTML='<div class="hint">creating your room…</div>';
      try{
        const code=await TD.Net.host();
        area.innerHTML='';
        area.append(el('div','panel-h','Give Player 2 this code'));
        const big=el('div','code-big',code.slice(0,3)+' '+code.slice(3));
        big.onclick=()=>{ navigator.clipboard&&navigator.clipboard.writeText(code); toast('Copied!'); };
        area.append(big);
        area.append(el('div','hint','Waiting for Player 2 to join… (keep this open)'));
      }catch(e){ area.innerHTML='<div class="hint">Could not reach the matchmaking service — check your internet.</div>'; }
    };
    joinB.onclick=()=>{
      area.innerHTML='';
      area.append(el('div','panel-h','Enter the host\'s 6-digit code'));
      const inp=document.createElement('input');
      inp.type='text'; inp.maxLength=7; inp.placeholder='000 000'; inp.className='code-big code-entry';
      inp.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter') go.click(); });
      area.append(inp);
      const go=el('button','btn primary','CONNECT');
      area.append(go);
      go.onclick=async()=>{
        const code=inp.value.replace(/\D/g,'');
        if (code.length!==6){ toast('Enter all 6 digits'); return; }
        go.textContent='CONNECTING…'; go.disabled=true;
        try{ await TD.Net.join(code); }
        catch(e){ toast('No host found for that code'); go.textContent='CONNECT'; go.disabled=false; }
      };
    };
  }
  function netEnterGame(){
    if (coopEl){ coopEl.remove(); coopEl=null; }
    buildBuildBar(); show('hud'); updateHUD(true);
    banner('CO-OP','shared gold — build together!');
  }

  return { init, show, banner, toast, flash, bossBar, updateHUD, refreshTowerPanel, showResults, showPerkChoice, netEnterGame };
})();
