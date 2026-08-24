/* ============ TOWER DEFENDERS v2 — UI ============ */
TD.ui = (function(){
  let game, eng, root;
  const $=s=>document.querySelector(s);
  const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e; };
  const colorHex=c=>'#'+new THREE.Color(c).getHexString();

  let pickT=['mg','sniper'], pickB=['block','wire','trap'];
  let selMap=0, selDiff='normal', selEndless=false;

  function init(g,e){
    game=g; eng=e; root=$('#ui');
    root.innerHTML='';
    buildTitle(); buildMapSelect(); buildLoadout(); buildTech(); buildHUD();
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
  }

  /* ============ TITLE ============ */
  function buildTitle(){
    const s=el('div','screen');
    s.append(el('div','title-big','TOWER<br>DEFENDERS'));
    s.append(el('div','title-sub','hold the line — they come from every direction'));
    const col=el('div','menu-col');
    const play=el('button','btn primary','▶&nbsp; PLAY');
    play.onclick=()=>{ TD.Audio.resume(); show('mapselect'); };
    const daily=el('button','btn','📅&nbsp; DAILY RUN');
    daily.onclick=()=>{ TD.Audio.resume();
      if (game.startDaily()){ buildBuildBar(); show('hud'); updateHUD(true); } };
    const lab=el('button','btn','🧪&nbsp; MODEL LAB (TEST)');
    lab.onclick=()=>{ TD.Audio.resume(); game.startShowcase(); buildBuildBar(); show('hud'); updateHUD(true); };
    const tech=el('button','btn','🧬&nbsp; TECH TREE');
    tech.onclick=()=>{ TD.Audio.resume(); show('tech'); };
    const set=el('button','btn','⚙&nbsp; SETTINGS');
    set.onclick=()=>{ TD.Audio.resume(); openSettings(); };
    col.append(play,daily,lab,tech,set);
    s.append(col);
    root.append(s); screens.title=s;
  }

  /* ============ MAP SELECT ============ */
  let mapGrid,diffRow,endBtn;
  function buildMapSelect(){
    const s=el('div','screen');
    const back=el('div','back-row'); const bb=el('button','btn small','← Back');
    bb.onclick=()=>show('title'); back.append(bb); s.append(back);
    s.append(el('div','h2','CHOOSE A BATTLEFIELD'));
    s.append(el('div','h2sub','Vehicles pour in from the red ring — the whole edge is hostile.'));
    mapGrid=el('div','map-grid'); s.append(mapGrid);
    diffRow=el('div','diff-row'); s.append(diffRow);
    const modeRow=el('div','mode-row');
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
  }

  /* ============ LOADOUT (9 weight points + 3 blocks) ============ */
  let rosterEl,rosterB,slotMeter,slotChips,blockChips,warnEl;
  const weightUsed=()=>pickT.reduce((a,id)=>a+(TD.TOWERS[id].slotCost||1),0);
  function buildLoadout(){
    const s=el('div','screen');
    const back=el('div','back-row'); const bb=el('button','btn small','← Back');
    bb.onclick=()=>show('mapselect'); back.append(bb); s.append(back);
    s.append(el('div','h2','ASSEMBLE YOUR ARSENAL'));
    s.append(el('div','h2sub',`${TD.CONFIG.SLOT_POINTS} loadout points for turrets (heavy weapons cost 2) + ${TD.CONFIG.BLOCK_SLOTS} block types.`));
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
    const startBtn=el('button','btn primary','⚔ DEPLOY');
    startBtn.style.width='100%';
    startBtn.onclick=()=>{
      if (!pickT.length){ warnEl.textContent='Bring at least one turret!'; TD.Audio.sfx('error'); return; }
      game.startRun(selMap,selDiff,{towers:[...pickT],blocks:[...pickB]},selEndless);
      buildBuildBar(); show('hud'); updateHUD(true);
    };
    sp.append(startBtn);
    sp.append(el('div','hint','First: place your base anywhere. Then build a maze of blocks — vehicles path around them, turrets on top shoot farther.'));
    wrap.append(rp,sp); s.append(wrap);
    root.append(s); screens.loadout=s;
  }
  function portrait(def){
    const p=el('div','tportrait',def.icon);
    p.style.background=colorHex(def.color);
    return p;
  }
  function paintLoadout(){
    const unlocked=game.unlockedTowers();
    pickT=pickT.filter(id=>unlocked.has(id));
    rosterEl.innerHTML='';
    for (const id in TD.TOWERS){
      const d=TD.TOWERS[id], has=unlocked.has(id);
      const card=el('div','tcard'+(pickT.includes(id)?' picked':'')+(has?'':' locked'));
      card.append(portrait(d));
      card.append(el('div','tname',d.name));
      card.append(el('div','trole',d.role));
      card.append(el('div','tcost',`$${d.cost} · ${'◆'.repeat(d.slotCost||1)}`));
      card.title=d.desc;
      if (has) card.onclick=()=>{
        const i=pickT.indexOf(id);
        if (i>=0) pickT.splice(i,1);
        else if (weightUsed()+(d.slotCost||1)<=TD.CONFIG.SLOT_POINTS) pickT.push(id);
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
      const p=el('div','tportrait',d.icon); p.style.background=colorHex(d.color); card.append(p);
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
    const used=weightUsed(), max=TD.CONFIG.SLOT_POINTS;
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
    resBanner.innerHTML='🧬 Research: <b>'+game.save.research+'</b>';
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
        node.append(el('div','tn-cost',owned?'OWNED':n.cost+' 🧬'));
        if (afford) node.onclick=()=>{ if(game.techBuy(n)) paintTech(); };
        col.append(node);
      }
      techWrap.append(col);
    }
  }

  /* ============ HUD ============ */
  let hud,goldEl,hpFill,hpText,shieldText,waveEl,resEl,waveBtn,buildBar,speedBtn,bossWrap,bossFill,bossName,bannerEl,toastEl,enemyTip,abilityBar;
  let bossRef=null;
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
    goldEl=el('div','stat gold','<span class="ic">🪙</span><span>0</span>');
    waveEl=el('div','wave-ind','WAVE <b>0</b>/30');
    resEl=el('div','stat research','<span class="ic">🧬</span><span>0</span>');
    tb.append(goldEl,waveEl,resEl);
    hud.append(tb);
    const tr=el('div','corner-tr');
    speedBtn=el('button','icon-btn','1×');
    speedBtn.onclick=()=>{ game.speed=game.speed===1?2:game.speed===2?3:1; speedBtn.textContent=game.speed+'×'; TD.Audio.sfx('ui'); };
    const pauseBtn=el('button','icon-btn','⏸'); pauseBtn.onclick=togglePause;
    const setBtn=el('button','icon-btn','⚙'); setBtn.onclick=()=>openSettings();
    tr.append(speedBtn,pauseBtn,setBtn);
    hud.append(tr);
    waveBtn=el('button','btn primary','START WAVE'); waveBtn.id='wave-btn';
    waveBtn.onclick=()=>game.startWave();
    hud.append(waveBtn);
    // ability bar (charge with kills + time)
    abilityBar=el('div','ability-bar');
    TD.ABILITIES.forEach((a,i)=>{
      const b=el('button','abtn');
      b.innerHTML=`<div class="ab-fill"></div><span class="ab-ic">${a.icon}</span><span class="ab-key">${a.key}</span>`;
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
      const p=el('div','bp',d.icon); p.style.background=colorHex(d.color);
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
        const p=el('div','bp',d.icon); p.style.background=colorHex(d.color);
        b.append(p, el('div','bn',d.name.split(' ')[0]), el('div','bc','$'+d.cost));
        b.title=d.desc;
        b.onclick=()=>selectBuild('block',id);
        buildBar.append(b);
      });
      blkCount=el('div','blk-count','0/'+TD.CONFIG.BLOCK_LIMIT);
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
    resEl.children[1].textContent=game.save.research;
    const f=Math.max(0,game.baseHp/game.baseMaxHp);
    hpFill.style.width=(f*100)+'%';
    hpFill.classList.toggle('low',f<0.35);
    hpText.textContent=Math.ceil(game.baseHp)+' / '+game.baseMaxHp;
    shieldText.textContent=game.shieldMax?('🛡 '+Math.ceil(game.shield)):'';
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
      });
    }
    buildBar.querySelectorAll('.bslot').forEach(b=>{
      const d=b.dataset.kind==='tower'?TD.TOWERS[b.dataset.id]:TD.BLOCKS[b.dataset.id];
      b.classList.toggle('cant',game.gold<d.cost);
    });
    if (blkCount){ blkCount.textContent=game.blocks.length+'/'+TD.CONFIG.BLOCK_LIMIT;
      blkCount.classList.toggle('full',game.blocks.length>=TD.CONFIG.BLOCK_LIMIT); }
    if (bossRef){ if(bossRef.dead) bossBar(null); else bossFill.style.width=(bossRef.hp/bossRef.maxHp*100)+'%'; }
    if (game.selected&&!game.selected.isBlock&&panelTower===game.selected){
      const k=$('#tp-kills'); if(k) k.textContent=game.selected.kills;
    }
  }
  function bossBar(e){
    bossRef=e;
    bossWrap.classList.toggle('on',!!e);
    if (e) bossName.textContent='☠ '+e.def.name+' ☠';
  }

  /* ============ tower panel (opposite side of screen) ============ */
  let panelTower=null;
  function refreshTowerPanel(){
    const tp=$('#tower-panel'), t=game.selected;
    panelTower=t;
    if (!t){ tp.classList.remove('on'); return; }
    tp.classList.add('on');
    // put the panel on the opposite side of the selected turret
    const scr=eng.toScreen(new THREE.Vector3(t.pos.x,0,t.pos.z));
    tp.classList.toggle('right', scr.x<innerWidth/2);
    if (t.isBlock){
      tp.innerHTML='';
      const head=el('div','tp-head');
      const p=el('div','tp-portrait',t.def.icon); p.style.background=colorHex(t.def.color);
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
    const p=el('div','tp-portrait',d.icon); p.style.background=colorHex(d.color);
    head.append(p, el('div','',`<div class="tp-name">${d.name}</div><div class="tp-quip">${d.role}${t.elev?` · elevated +${t.elev}`:''}</div>`));
    tp.append(head);
    const st=el('div','tp-stats');
    const dps = s.rof>0? Math.round(s.dmg*s.rof*(s.pellets||1)*10)/10 : 0;
    st.innerHTML=`<span>dmg <b>${Math.round(s.dmg*10)/10}</b></span><span>rate <b>${Math.round(s.rof*100)/100}/s</b></span>
      <span>range <b>${Math.round(s.range*10)/10}</b></span>${dps?`<span>dps <b>${dps}</b></span>`:''}
      <span>kills <b id="tp-kills">${t.kills}</b></span>
      ${game.rankOf(t.kills)?`<span>rank <b>${'🎖'.repeat(game.rankOf(t.kills))}</b></span>`:''}
      ${s.detect?'<span>👁 <b>stealth-vision</b></span>':''}`;
    tp.append(st);
    d.paths.forEach((path,pi)=>{
      const tier=t.tiers[pi];
      const chk=game.canUpgrade(t,pi);
      const box=el('div','path p'+pi+((chk.why==='locked')?' locked':''));
      box.append(el('div','path-h',`<span>${path.name}</span><span class="tag">${TD.PATH_TAGS[pi]}</span>`));
      const pips=el('div','pips');
      for (let i=0;i<3;i++) pips.append(el('div','pip'+(i<tier?' f'+pi:'')));
      box.append(pips);
      if (chk.ok||chk.why==='gold'){
        const up=d.paths[pi].tiers[tier];
        const btn=el('button','up-btn');
        btn.innerHTML=`<span><span class="un">${up.name}</span><span class="ud">${up.desc}</span></span><span class="uc">$${up.cost}</span>`;
        btn.disabled=!chk.ok;
        btn.onclick=()=>{ if(game.upgrade(t,pi)){ game.refreshRing(); refreshTowerPanel(); } };
        box.append(btn);
      } else if (chk.why==='max') box.append(el('div','up-max','★ MAXED'));
      else if (chk.why==='locked') box.append(el('div','up-lock','🔒 locked — two paths already chosen'));
      else if (chk.why==='capped') box.append(el('div','up-lock','capped at tier 1 (other path went deep)'));
      tp.append(box);
    });
    const foot=el('div','tp-foot');
    const tgt=el('button','btn','🎯 '+game.targetingName(t));
    tgt.onclick=()=>{ game.cycleTargeting(t); refreshTowerPanel(); };
    const sell=el('button','btn danger',`SELL $${Math.round(t.spent*game.sellRefund)}`);
    sell.onclick=()=>game.sell(t);
    foot.append(tgt,sell); tp.append(foot);
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
    const nextUnlock=win&&game.map.id<TD.MAPS.length-1? `<br>🔓 <b>${TD.MAPS[game.map.id+1].name}</b> unlocked!` : '';
    const codeHint=win&&game.diffId==='normal'&&!game.save.codes.includes('MidzWinz')?
      `<br>🎁 Code unlocked: <b>MidzWinz</b> — redeem it in Settings!` : '';
    const endlessNote=win? '<br>∞ Endless mode unlocked for this map' : '';
    const dailyLine=game.daily? `<br>📅 Daily score: <b>${game.wave*100+game.runKills}</b>` : '';
    box.append(el('div','result-stats',
      `Waves survived: <b>${game.wave}</b><br>Vehicles destroyed: <b>${game.runKills}</b><br>
       Research earned: <span class="rr">+${game.runResearch} 🧬</span>${dailyLine}${nextUnlock}${codeHint}${endlessNote}`));
    const row=el('div','row-gap');
    const again=el('button','btn',win?'PLAY AGAIN':'TRY AGAIN');
    again.onclick=()=>{ s.remove(); game.startRun(game.map.id,game.diffId,game.loadout,game.endless); buildBuildBar(); show('hud'); };
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
    const r2=el('div','set-row'); r2.append(el('label','','Music'));
    const mBtn=el('button','btn small',game.save.settings.musicOn?'ON':'OFF');
    mBtn.onclick=()=>{ game.save.settings.musicOn=!game.save.settings.musicOn; TD.Audio.setMusicOn(game.save.settings.musicOn); mBtn.textContent=game.save.settings.musicOn?'ON':'OFF'; game.persist(); };
    r2.append(mBtn); box.append(r2);
    const r3=el('div','set-row'); r3.append(el('label','','Damage numbers'));
    const dBtn=el('button','btn small',game.save.settings.dmgNums?'ON':'OFF');
    dBtn.onclick=()=>{ game.save.settings.dmgNums=!game.save.settings.dmgNums; eng.showDmgNums=game.save.settings.dmgNums; dBtn.textContent=game.save.settings.dmgNums?'ON':'OFF'; game.persist(); };
    r3.append(dBtn); box.append(r3);
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
    const r4=el('div','set-row'); r4.append(el('label','','Reset ALL progress'));
    const rBtn=el('button','btn danger small','RESET');
    rBtn.onclick=()=>{ if(confirm('Delete all progress, research and unlocks?')){ localStorage.removeItem(TD.CONFIG.SAVE_KEY); location.reload(); } };
    r4.append(rBtn); box.append(r4);
    const close=el('button','btn primary','DONE'); close.onclick=()=>s.remove();
    box.append(close); s.append(box);
    root.append(s);
  }

  /* ============ perk choice (every 5 waves) ============ */
  function showPerkChoice(opts,cb){
    const s=el('div','screen overlay');
    const box=el('div','result-box');
    box.append(el('div','h2','CHOOSE A PERK'));
    box.append(el('div','h2sub','wave '+game.wave+' cleared — pick your edge for this run'));
    const row=el('div','perk-row');
    for (const p of opts){
      const card=el('div','perk-card');
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
      if (en.escorts&&en.escorts.some(x=>!x.dead)) tags.push('◈ SHIELDED — kill the escort vans!');
      if (en.exposedT>0) tags.push('💥 CORE EXPOSED (2x dmg)');
      if (d.armor) tags.push('🛡 armor '+d.armor);
      if (d.fly) tags.push('✈ flying');
      if (d.stealth) tags.push('👁 stealth');
      if (d.burrow) tags.push('⛏ burrows');
      if (d.heal) tags.push('🔧 repairs allies');
      if (d.shieldAura) tags.push('◈ shields allies');
      if (d.splits) tags.push('÷ splits');
      if (d.ram) tags.push('💥 kamikaze');
      if (d.spd>=1.8) tags.push('⚡ fast');
      if (d.boss) tags.push('☠ BOSS');
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
          if (w||ov) game.clickAt(w||new THREE.Vector3(),ov);
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

  return { init, show, banner, toast, bossBar, updateHUD, refreshTowerPanel, showResults, showPerkChoice };
})();
