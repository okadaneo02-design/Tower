/* ============ TOWER DEFENDERS v2 — core game ============ */
(function(){
const C = TD.CONFIG, G = C.GRID;
const idx = (c,r)=>r*G+c;
const inB = (c,r)=>c>=0&&r>=0&&c<G&&r<G;
const isBorder = (c,r)=>c===0||r===0||c===G-1||r===G-1;

/* ---------- stat folding ---------- */
function applyMod(s,m){
  for (const k in m){ const v=m[k];
    switch(k){
      case 'rofMul': s.rof*=v; break;
      case 'dmgAdd': s.dmg+=v; break;
      case 'dmgMul': s.dmg*=v; break;
      case 'rangeAdd': s.range+=v; break;
      case 'detect': s.detect=true; break;
      case 'aimMul': s.aim*=v; break;
      case 'projMul': s.proj*=v; break;
      case 'pelletsAdd': s.pellets+=v; break;
      case 'splashAdd': s.splash+=v; break;
      case 'chainAdd': s.chain+=v; break;
      case 'chainRangeAdd': s.chainRange+=v; break;
      case 'volleyAdd': s.volley+=v; break;
      case 'vacPullMul': s.vacPullMul*=v; break;
      case 'vacValMul': s.vacValMul*=v; break;
      case 'barNAdd': s.barN+=v; break;
      case 'barHpAdd': s.barHp+=v; break;
      case 'barDmgMul': s.barDmgMul*=v; break;
      case 'barSpdMul': s.barSpdMul*=v; break;
      case 'barRofMul': s.barRofMul*=v; break;
      case 'barTank': s.barTank=true; break;
      case 'minRangeSub': s.minRange=Math.max(0,s.minRange-v); break;
      case 'slowAdd': s.slow+=v; break;
      case 'slowDur': s.slowDur=Math.max(s.slowDur,v); break;
      case 'freezeProb': s.freezeProb=Math.max(s.freezeProb,v); break;
      case 'freezeDur': s.freezeDur=Math.max(s.freezeDur,v); break;
      case 'burnDps': case 'burnDpsAdd': s.burnDps+=v; break;
      case 'burnDur': s.burnDur=Math.max(s.burnDur,v); break;
      case 'burnDurAdd': s.burnDur+=v; break;
      case 'poisonDpsAdd': s.poisonDps+=v; break;
      case 'poisonDurAdd': s.poisonDur+=v; break;
      case 'stacksAdd': s.stacks+=v; break;
      case 'armorPierce': s.armorPierce=true; break;
      case 'critProb': s.critProb=Math.max(s.critProb,v); break;
      case 'critMul': s.critMul=Math.max(s.critMul,v); break;
      case 'stunProb': s.stunProb=Math.max(s.stunProb,v); break;
      case 'stunDur': s.stunDur=Math.max(s.stunDur,v); break;
      case 'pierceAdd': s.pierce+=v; break;
      case 'mark': s.mark=Math.max(s.mark,v); break;
      case 'markAdd': s.mark+=v; break;
      case 'markDur': s.markDur=Math.max(s.markDur,v); break;
      case 'buffDmgAdd': s.buffDmg+=v; break;
      case 'buffRofAdd': s.buffRof+=v; break;
      case 'buffRangeAdd': s.buffRange+=v; break;
      case 'buffDetect': s.buffDetect=true; break;
      case 'goldWaveAdd': s.goldWave+=v; break;
      case 'interestAdd': s.interest+=v; break;
      case 'killGoldAdd': s.killGold+=v; break;
      case 'healAdd': s.heal+=v; break;
      case 'lowBoost': s.lowBoost=true; break;
      case 'baseHpMul': s.baseHpMul*=v; break;
      case 'shieldAdd': s.shield+=v; break;
      case 'spreadOnDeath': s.spreadOnDeath=true; break;
      case 'coneAdd': s.cone+=v; break;
      case 'aaDmgAdd': s.aaDmg+=v; break;
      case 'aaRofMul': s.aaRof*=v; break;
      case 'planeAdd': s.planeN+=v; break;
      case 'planeSpdMul': s.planeSpd*=v; break;
      case 'planeDmgAdd': s.planeDmg+=v; break;
      case 'bombDmgAdd': s.bombDmg+=v; break;
      case 'heliRangeAdd': s.heliRange+=v; break;
      case 'chargeSub': s.chargeT=Math.max(0.12,(s.chargeT||0.6)-v); break;
      case 'ability': s.ability=v; break;
    }
  }
}

/* ---------- Tower ---------- */
class Tower {
  constructor(game,id,c,r,elev){
    this.game=game; this.id=id; this.def=TD.TOWERS[id];
    this.c=c; this.r=r; this.elev=elev||0;
    this.tiers=[0,0,0];
    this.spent=this.def.cost;
    this.mode=0;
    this.cd=0; this.target=null; this.kills=0;
    this.model=game.eng.makeTower(id);
    this.model.userData.owner=this;
    const u0=this.model.userData;
    u0.recoilList=[u0.barrel, u0.head&&u0.head.userData.b2].filter(Boolean)
      .map(grp=>({grp,pos:0,vel:0,z0:grp.position.z}));
    this.altIdx=0;
    const p=game.eng.cellToWorld(c,r);
    p.y=this.elev*1.51;
    this.model.position.copy(p);
    game.eng.scene.add(this.model);
    this.pos=p; this.aimAngle=Math.random()*6.28;
    this.stats=null;
    this.planes=[]; this.abilityCd=8; this.aaCd=0; this.strikes=0;
    this.spin=0; this.heat=0;
    this.animRefs={};
    this.model.traverse(o=>{ if (o.userData&&o.userData.tag) this.animRefs[o.userData.tag]=o; });
  }
  totalTiers(){ return this.tiers[0]+this.tiers[1]+this.tiers[2]; }
  computeSelf(){
    const d=this.def, g=this.game;
    const s={ range:d.range, rof:d.rof, dmg:d.dmg, pellets:d.pellets||0, cone:d.cone||0, splash:d.splash||0,
      minRange:d.minRange||0, chain:d.chain||0, chainRange:d.chainRange||0, volley:d.volley||1,
      slow:d.slow||0, slowDur:d.slowDur||0, burnDps:d.burnDps||0, burnDur:d.burnDur||0,
      poisonDps:d.poisonDps||0, poisonDur:d.poisonDur||0, stacks:d.stacks||0,
      mark:d.mark||0, markDur:d.markDur||0, detect:!!d.detect, aim:1, proj:1,
      heal:d.heal||0, goldWave:d.goldWave||0, interest:0, killGold:0,
      buffDmg:d.buffDmg||0, buffRof:0, buffRange:0, buffDetect:false,
      armorPierce:false, critProb:0, critMul:2, stunProb:0, stunDur:0, pierce:0,
      freezeProb:0, freezeDur:0, spreadOnDeath:false, lowBoost:false, baseHpMul:1, shield:0,
      aaDmg:d.aaDmg||0, aaRof:d.aaRof||0, planeN:d.planeN||0, planeSpd:d.planeSpd||1,
      planeDmg:d.planeDmg||0, bombDmg:d.bombDmg||0, heliRange:d.heliRange||6, chargeT:d.chargeT||0.6, ability:null,
      vacPullMul:1, vacValMul:1, barN:0, barHp:0, barDmgMul:1, barSpdMul:1, barRofMul:1, barTank:false,
      targets:d.targets };
    this.tiers.forEach((tier,pi)=>{ for(let k=0;k<tier;k++) applyMod(s, d.paths[pi].tiers[k].mod); });
    s.dmg*=1+g.techDmg; s.range*=1+g.techRange;
    s.dmg*=C.TOWER_DMG_MUL; s.rof*=C.TOWER_ROF_MUL; s.range*=C.TOWER_RANGE_MUL;
    if (TD.materialOf&&TD.materialOf(this.id)==='gold'){ s.dmg*=1.30; s.rof*=1.20; s.range*=1.15; }
    s.range+=this.elev*C.ELEV_RANGE_BONUS;   // high ground advantage
    // run perks + veterancy ranks
    if (g.hasPerk&&g.hasPerk('sharp')) s.dmg*=1.10;
    if (g.hasPerk&&g.hasPerk('reach')) s.range*=1.08;
    if (g.hasPerk&&g.hasPerk('crit')){ s.critProb+=0.10; s.critMul=Math.max(s.critMul,1.8); }
    if (g.rankOf) s.dmg*=1+0.05*g.rankOf(this.kills);
    this.stats=s;
  }
  applyAuras(auras){
    const s=this.stats;
    if (this.def.arche==='aura') return;
    for (const a of auras){
      const dx=a.pos.x-this.pos.x, dz=a.pos.z-this.pos.z;
      const rr=a.stats.range*C.CELL;
      if (dx*dx+dz*dz<=rr*rr){
        s.dmg*=1+a.stats.buffDmg; s.rof*=1+a.stats.buffRof; s.range+=a.stats.buffRange;
        if (a.stats.buffDetect) s.detect=true;
      }
    }
  }
  rangeW(){ return this.stats.range*C.CELL; }
  canSee(e){
    if (e.absorbing||e.falling||e.burrowed) return false;
    if (e.def.fly && this.stats.targets==='g') return false;
    if (!e.def.fly && this.stats.targets==='a') return false;
    if (e.stealth && !e.detected && !this.stats.detect) return false;
    return true;
  }
  inRange(e){
    const dx=e.pos.x-this.pos.x, dz=e.pos.z-this.pos.z, d2=dx*dx+dz*dz, r=this.rangeW();
    if (d2>r*r) return false;
    const mr=this.stats.minRange*C.CELL;
    if (mr && d2<mr*mr) return false;
    return true;
  }
  pickTarget(){
    const g=this.game; let best=null, bv=Infinity;
    for (const e of g.enemies){
      if (e.dead||!this.canSee(e)||!this.inRange(e)) continue;
      let v;
      if (this.mode===0) v=e.progress();
      else if (this.mode===1) v=-e.progress();
      else if (this.mode===2) v=-e.hp;
      else { const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z; v=dx*dx+dz*dz; }
      if (v<bv){ bv=v; best=e; }
    }
    return best;
  }
  muzzleWorld(){
    const m=this.model.userData.muzzleLocal;
    const v=new THREE.Vector3(m.x,m.y,m.z);
    v.applyAxisAngle(new THREE.Vector3(0,1,0), this.model.userData.head? this.model.userData.head.rotation.y : 0);
    return v.add(this.pos);
  }
  update(dt){
    const s=this.stats, u=this.model.userData;
    // per-barrel spring recoil: each barrel slams back and springs forward
    if (u.recoilList) for (const ent of u.recoilList){
      if (!ent.pos&&!ent.vel) continue;
      ent.vel+=(-150*ent.pos-13*ent.vel)*dt;
      ent.pos+=ent.vel*dt;
      if (Math.abs(ent.pos)<0.001&&Math.abs(ent.vel)<0.02){ ent.pos=0; ent.vel=0; }
      ent.grp.position.z=ent.z0+ent.pos;
    }
    // rack reloads (missiles visibly slot back in)
    if (this.reloads){
      for (let i=this.reloads.length-1;i>=0;i--){ const r=this.reloads[i]; r.t-=dt;
        if (r.t<=0){ r.mesh.visible=true; this.reloads.splice(i,1); } }
    }
    const arche=this.def.arche;
    if (arche==='aura'||arche==='bank'||arche==='repair') return;
    if (arche==='barracks'){ this.updateBarracks(dt); return; }
    if (arche==='vacuum'){
      // sucks every crate in range straight into the intake
      const g2=this.game, R=s.range*C.CELL;
      for (const c of g2.crates){
        const dx=this.pos.x-c.pos.x, dz=this.pos.z-c.pos.z;
        const d2=dx*dx+dz*dz;
        if (d2>R*R) continue;
        const d=Math.sqrt(d2);
        if (d<1.15*C.CELL){ g2.collectCrate(c,s.vacValMul); continue; }
        const force=Math.min(1,1.6-d/R);
        const spd=(6+s.vacPullMul*8)*C.CELL;
        c.pos.x+=dx/d*dt*spd*force; c.pos.z+=dz/d*dt*spd*force;
        c.model.position.x=c.pos.x; c.model.position.z=c.pos.z;
        c.model.rotation.y+=dt*4;
        if (Math.random()<dt*7) g2.eng.sqBurst(c.pos.clone().setY(0.7),[0x9ff0c8,0xd8f7ea],1,1.8,0.25,0.6);
      }
      const refs=this.animRefs||{}, g3=this.game;
      if (refs.spin) refs.spin.rotation.y+=dt*(8+s.vacPullMul*6);
      if (refs.lens) refs.lens.material.emissiveIntensity=1.3+Math.sin(g3.eng.time*7)*0.5;
      return;
    }
    const noAim = arche==='frost'||arche==='echo'||arche==='tesla';
    if (this.target && (this.target.dead||!this.inRange(this.target)||!this.canSee(this.target))) this.target=null;
    if (!this.target) this.target=this.pickTarget();
    if (this.target && u.head){
      const want=Math.atan2(this.target.pos.x-this.pos.x, this.target.pos.z-this.pos.z);
      let d=want-this.aimAngle;
      while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
      const spd=5*s.aim;
      this.aimAngle+=THREE.MathUtils.clamp(d,-spd*dt,spd*dt);
      u.head.rotation.y=this.aimAngle;
      this.aligned=Math.abs(d)<0.35||noAim;
    } else {
      // idle: lazily sweep the field looking for trouble
      if (u.head&&!noAim){ this.aimAngle+=dt*0.35; u.head.rotation.y=this.aimAngle; }
      this.aligned=noAim;
    }
    this.cd=Math.max(this.cd-dt,-0.5);
    if (this.cd<=0 && this.target && this.aligned){
      const spinK=this.def.id==='minigun'?(0.15+0.85*(this.spin||0)):1;
      this.cd=1/Math.max(0.05,s.rof*spinK*(this.game.overclockT>0?1.5:1));
      this.fire();
    }
    // ---- turret flair animations ----
    const refs=this.animRefs||{}, g2=this.game;
    if (this.def.id==='minigun'){
      const want=this.target?1:0;
      this.spin=(this.spin||0)+(want-(this.spin||0))*Math.min(1,dt/(want?(s.chargeT||0.6):0.3));
      if (u.barrel) u.barrel.rotation.z+=this.spin*30*dt;   // rotary barrels spin up
      if (refs.heat) refs.heat.material.emissiveIntensity=Math.max(this.spin*1.6,(this.heat||0)*1.6);
    }
    if (this.heat>0){ this.heat=Math.max(0,(this.heat||0)-dt*0.55);
      if (refs.heat) refs.heat.material.emissiveIntensity=Math.max(refs.heat.material.emissiveIntensity||0,this.heat*1.6); }
    if (this.def.arche==='rail'&&refs.coil){
      const ready=this.target?Math.max(0,Math.min(1,1-this.cd*3)):0;
      refs.coil.material.emissiveIntensity=0.4+ready*2.2;
      refs.coil.scale.setScalar(1+ready*0.4);
      if (this.cd<=0.03&&this.target&&Math.random()<dt*30) g2.eng.burst(this.muzzleWorld(),0xbfe6ff,2,2,0.2,3);
    }
    if (this.def.arche==='laser'){
      if (refs.lens) refs.lens.material.emissiveIntensity=(this.cd<0.2?2.0:0.5)+Math.random()*0.4;
    }
    if (this.def.arche==='sniper'){
      if (refs.scope) refs.scope.material.emissiveIntensity=0.8+Math.sin(g2.eng.time*4)*0.5;
      if (this.target&&this.aligned&&Math.random()<dt*6) g2.eng.beam(this.muzzleWorld(),this.target.center(),0xd0e2ff,0.02);
    }
    if (this.def.arche==='frost'&&Math.random()<dt*5&&this.target)
      g2.eng.lightning(this.pos.clone().setY(2.1),this.target.pos.clone().setY(0.8),0x9fd8ff);
    if (this.def.arche==='flame'){
      if (refs.nozzle) refs.nozzle.material.emissiveIntensity=(this.target&&this.cd<0.25?1.6:0.25)+Math.random()*0.5;
      // continuous stream of big squares while it's spraying (fills the gaps between shots)
      if (this.target&&this.cd<0.35){
        const fdir=new THREE.Vector3(Math.sin(this.aimAngle),0.05,Math.cos(this.aimAngle));
        if (Math.random()<dt*30){
          const d=Math.random()*this.rangeW()*0.95;
          const fp=this.muzzleWorld().clone().addScaledVector(fdir,d)
            .add(new THREE.Vector3((Math.random()-0.5)*0.5,Math.random()*0.4,(Math.random()-0.5)*0.5));
          g2.eng.sqBurst(fp,[0xff6b3d,0xffc46b,0xffd166][Math.floor(Math.random()*3)],2,2.4,0.3,0.5);
        }
      }
    }
    if (s.ability){
      this.abilityCd-=dt;
      if (this.abilityCd<=0 && this.target) this.castAbility();
    }
  }
  updateBarracks(dt){
    const g=this.game, s=this.stats;
    if (!this.barUnits) this.barUnits=[];
    const units=this.barUnits;
    this.barT=(this.barT||0)+dt;
    const cap=2+s.barN;
    if (units.length<cap&&this.barT>=2.5){ this.barT=0; this.spawnBarUnit(s); }
    if (!units.length) return;
    // ---- claim budget: how many friendlies a target needs (1 if any single
    // unit can take it down, else exactly as many as it takes — no extras) ----
    const claims=new Map();
    for (const e of g.enemies){
      if (e.dead||e.def.fly||e.absorbing) continue;
      let bestKill=0, solo=false;
      for (const u of units){
        const ram=Math.max(4,u.dmg);
        const hits=Math.ceil(e.hp/ram);
        const hitsBeforeDeath=Math.max(1,Math.floor(u.hp/Math.max(0.001,e.hp*0.8)));
        if (hitsBeforeDeath>=hits) solo=true;
        bestKill=Math.max(bestKill,Math.min(hits,hitsBeforeDeath)*ram);
      }
      claims.set(e, solo?1:Math.max(1,Math.ceil(e.hp/Math.max(1,bestKill))));
    }
    // ---- assign: strongest units first, keep a valid claim if they have one ----
    const ordered=units.slice().sort((a,b)=>(b.dmg*b.hp)-(a.dmg*a.hp));
    for (const u of ordered){
      if (u.target&&!u.target.dead&&claims.has(u.target)&&claims.get(u.target)>0){
        claims.set(u.target,claims.get(u.target)-1);
        continue;
      }
      let best=null,bd=Infinity;
      for (const e of g.enemies){
        if (e.dead||e.def.fly||e.absorbing||!claims.has(e)||claims.get(e)<=0) continue;
        const dx=e.pos.x-u.pos.x,dz=e.pos.z-u.pos.z,d2=dx*dx+dz*dz;
        if (d2<bd){ bd=d2; best=e; }
      }
      u.target=best||null;
      if (best) claims.set(best,claims.get(best)-1);
    }
    // ---- drive & fight ----
    for (let i=units.length-1;i>=0;i--){
      const u=units[i], best=u.target;
      if (best){
        const dx=best.pos.x-u.pos.x,dz=best.pos.z-u.pos.z,d=Math.sqrt(dx*dx+dz*dz);
        u.model.rotation.y=Math.atan2(dx,dz);
        if (d<1.15*C.CELL){
          u.cd=(u.cd||0)-dt;
          if (u.cd<=0){
            u.cd=0.7;
            const ehp=best.hp;
            g.hitEnemy(best,Math.round(u.dmg),{tower:this});
            if (!best.dead) u.hp-=Math.round(ehp*0.8);  // friendly eats 80% of the victim's HP
            g.eng.burst(u.pos.clone().setY(0.6),0x4ade80,8,3,0.35,4);
            g.eng.shake(best.model);
            TD.Audio.sfx('hit');
          }
        } else {
          const spd=s.barSpdMul*2.6*C.CELL;
          u.pos.x+=dx/d*dt*spd; u.pos.z+=dz/d*dt*spd;
          u.model.position.x=u.pos.x; u.model.position.z=u.pos.z;
          if (u.wheels) for (const w of u.wheels) w.rotation.x+=dt*10;
        }
        if (u.tank){
          u.shot=(u.shot||0)-dt;
          if (u.shot<=0&&d<4.5*C.CELL){
            u.shot=1.6/(s.barRofMul||1);
            const mp=u.model.position.clone().setY(1.2);
            g.eng.beam(mp,best.center(),0x9ff0c8,0.05,0.08);
            g.eng.muzzleFlash(mp,0x9ff0c8,1.2);
            g.hitEnemy(best,Math.round(40*s.barDmgMul),{tower:this});
            TD.Audio.sfx('rail');
          }
        }
      } else {
        const dx=this.pos.x-u.pos.x,dz=this.pos.z-u.pos.z,d=Math.sqrt(dx*dx+dz*dz);
        if (d>0.6){
          const spd=s.barSpdMul*2.6*C.CELL;
          u.pos.x+=dx/d*dt*spd; u.pos.z+=dz/d*dt*spd;
          u.model.position.x=u.pos.x; u.model.position.z=u.pos.z;
          u.model.rotation.y=Math.atan2(dx,dz);
          if (u.wheels) for (const w of u.wheels) w.rotation.x+=dt*10;
        }
      }
      if (u.hp<=0){
        g.eng.mapGroup.remove(u.model);
        g.eng.explosion(u.pos.clone(),1.4,0x4ade80);
        units.splice(i,1);
      }
    }
  }
  spawnBarUnit(s){
    const g=this.game;
    let model=null;
    if (s.barTank){
      const m=g.eng.asset&&g.eng.asset('tankboss',{len:1.9,tint:0x4ade80,tintAmt:0.45});
      if (m){ const wrap=new THREE.Group(); wrap.add(m); m.rotation.y=Math.PI; model=wrap; }
    }
    if (!model){
      const cars=['sedan','suv','van'];
      model=g.eng.asset&&g.eng.asset(cars[(this.barUnits&&this.barUnits.length)%cars.length],{len:1.5,tint:0x4ade80,tintAmt:0.5});
    }
    if (!model) return;
    model.position.copy(this.pos); model.position.y=0.02;
    g.eng.mapGroup.add(model);
    g.eng.eliteRing(model,0x4ade80);
    const u={ model, pos:this.pos.clone(), hp:100+s.barHp, dmg:Math.round(22*s.barDmgMul), spd:s.barSpdMul,
      tank:!!s.barTank, wheels:[] };
    model.traverse(o=>{ if(o.isMesh&&/wheel/i.test(o.name)) u.wheels.push(o); });
    model.userData.owner=u;
    if (!this.barUnits) this.barUnits=[];
    this.barUnits.push(u);
  }
  castAbility(){
    const g=this.game, s=this.stats;
    this.abilityCd=(this.def.abilityCd||40);
    switch(s.ability){
      case 'inferno': {
        const R=6*C.CELL;
        g.eng.ring(this.pos,R,0xff8a3d,0.8);
        g.eng.shakeCam(0.7);
        for (const e of g.enemies){
          if (e.dead) continue;
          const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z;
          if (dx*dx+dz*dz<R*R){ e.applyBurn(60,5); g.hitEnemy(e,80,{tower:this}); }
        }
        for(let i=0;i<14;i++){
          const a=Math.random()*Math.PI*2, r=Math.random()*R;
          g.eng.burst(new THREE.Vector3(this.pos.x+Math.cos(a)*r,1,this.pos.z+Math.sin(a)*r),0xff8a3d,6,3,0.5,4);
        }
        TD.Audio.sfx('flame');
        break; }
      case 'rain': {
        const R=this.rangeW()*1.6;
        for (let i=0;i<70;i++){
          const a=Math.random()*Math.PI*2, r=Math.random()*R;
          const to=new THREE.Vector3(this.pos.x+Math.cos(a)*r,0.1,this.pos.z+Math.sin(a)*r);
          const from=new THREE.Vector3(to.x,22,to.z);
          g.projectiles.push({ kind:'arc', from, to, t:-Math.random()*0.6, dur:0.7, splash:0.35, dmg:8, opts:{tower:this}, stun:0, stunDur:0, mesh:g.getShellMesh(0xffc46b,0.08) });
        }
        g.eng.burst(this.pos.clone().setY(12),0xffc46b,30,6,0.5,6);
        g.eng.shakeCam(0.6);
        TD.Audio.sfx('shotgun');
        break; }
      case 'seismic': {
        const R=5*C.CELL;
        g.eng.ring(this.pos,R,0xff9d5c,0.8);
        g.eng.shakeCam(0.9);
        for (const e of g.enemies){
          if (e.dead) continue;
          const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z;
          if (dx*dx+dz*dz<R*R) e.applyStun(1.5);
        }
        TD.Audio.sfx('explode');
        break; }
      case 'emp': {
        const R=6*C.CELL;
        g.eng.ring(this.pos,R,0x9fe8ff,0.7);
        g.eng.lightning(this.pos.clone().setY(2),this.pos.clone().add(new THREE.Vector3(R*0.7,0,0)),0x9fd8ff);
        g.eng.shakeCam(0.6);
        for (const e of g.enemies){
          if (e.dead) continue;
          const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z;
          if (dx*dx+dz*dz<R*R) e.applyStun(2);
        }
        TD.Audio.sfx('freezeHit');
        break; }
      case 'exec': {
        let best=null,bf=Infinity;
        for (const e of g.enemies){ if(e.dead||!this.canSee(e)) continue; if (e.hp<bf){bf=e.hp;best=e;} }
        if (best){
          const mp=this.muzzleWorld();
          g.eng.beam(mp,best.center(),0xff6b6b,0.12,0.16);
          g.eng.text(best.center(),'EXECUTED','#ff6b6b',true);
          g.hitEnemy(best,2000,{armorPierce:true});
        }
        TD.Audio.sfx('sniper');
        break; }
    }
  }
  fire(){
    const g=this.game, s=this.stats, e=this.target, eng=g.eng, col=this.def.color;
    const u=this.model.userData;
    // alternate barrels (MG): flip muzzle side + kick only the firing barrel
    if (u.recoilList&&u.recoilList.length>1){
      u.muzzleLocal.x=Math.abs(u.muzzleLocal.x)*((this.altIdx%2)?-1:1);
      const ent=u.recoilList[this.altIdx%u.recoilList.length];
      ent.pos=-(u.recoilAmp||0.2)*1.25; ent.vel=0;
      this.altIdx++;
    } else if (u.recoilList&&u.recoilList.length){
      const ent=u.recoilList[0];
      ent.pos=-(u.recoilAmp||0.2)*1.25; ent.vel=0;
    }
    const mp=this.muzzleWorld();
    TD.Audio.sfx(this.def.sfx);
    if (['gun','shotgun','flak','sniper'].includes(this.def.arche)) eng.casings(mp);
    const hitOpts={ armorPierce:s.armorPierce, tower:this };
    switch(this.def.arche){
      case 'gun': {
        eng.beam(mp, e.center(), col, 0.05);
        eng.muzzleFlash(mp);
        if (this.animRefs&&this.animRefs.heat) this.heat=Math.min(1,(this.heat||0)+(this.def.id==='minigun'?0.09:0.05));
        let dm=s.dmg; if (Math.random()<s.critProb) dm*=s.critMul;
        g.hitEnemy(e,dm,hitOpts);
        break; }
      case 'shotgun': {
        eng.muzzleFlash(mp,0xffc98a);
        const targets=g.enemiesInCone(this.pos,this.aimAngle,this.rangeW(),s.cone,this);
        for (let i=0;i<s.pellets;i++){
          const t=targets[i%Math.max(1,targets.length)];
          if (t){ eng.beam(mp,t.center(),col,0.035,0.06); g.hitEnemy(t,s.dmg,hitOpts);
            if (s.burnDps) t.applyBurn(s.burnDps,s.burnDur); }
        }
        break; }
      case 'mortar': {
        eng.muzzleFlash(mp,0xffd9a8,1.5);
        eng.ring(new THREE.Vector3(this.pos.x,0,this.pos.z),1.2,0xd9c8a8,0.3);
        for(let v=0;v<s.volley;v++){
          const aim=e.predictPos(0.9);
          g.projectiles.push({ kind:'arc', from:mp.clone(), to:new THREE.Vector3(aim.x,0.1,aim.z),
            t:-v*0.15, dur:0.9, splash:s.splash, dmg:s.dmg, opts:hitOpts, stun:s.stunProb, stunDur:s.stunDur,
            mesh:g.getShellMesh(col) });
        }
        break; }
      case 'frost': {
        eng.ring(this.pos,this.rangeW(),0x9fe8ff,0.45);
        for (const t of g.enemiesInRange(this.pos,this.rangeW(),this)){
          g.hitEnemy(t,s.dmg,hitOpts);
          t.applySlow(s.slow,s.slowDur);
          if (Math.random()<s.freezeProb){ t.applyStun(s.freezeDur); eng.burst(t.center(),0xbfefff,8,3,0.4,4); TD.Audio.sfx('freezeHit'); }
        }
        break; }
      case 'dart': {
        g.projectiles.push({ kind:'homing', pos:mp.clone(), target:e, spd:26*s.proj, dmg:s.dmg, opts:hitOpts,
          poison:{dps:s.poisonDps,dur:s.poisonDur,stacks:s.stacks}, trail:0x9fdc6a,
          mesh:g.getShellMesh(col,0.09) });
        break; }
      case 'sniper': {
        let dm=s.dmg; const crit=Math.random()<s.critProb; if(crit) dm*=s.critMul;
        eng.beam(mp,e.center(),0xf3ecff,0.09,0.12); eng.muzzleFlash(mp,0xfff3d0);
        g.hitEnemy(e,dm,hitOpts,crit);
        if (s.mark) e.applyMark(s.mark,s.markDur);
        if (s.pierce>0){
          const dir=new THREE.Vector3().subVectors(e.center(),mp).normalize();
          let n=0;
          for (const t of g.enemies){ if (t===e||t.dead||!this.canSee(t)) continue;
            const to=new THREE.Vector3().subVectors(t.center(),mp);
            const proj=to.dot(dir);
            if (proj>0&&proj<this.rangeW()*1.2&&to.sub(dir.clone().multiplyScalar(proj)).length()<1.0){
              g.hitEnemy(t,dm*0.6,hitOpts); if(++n>=s.pierce) break; }
          }
        }
        break; }
      case 'tesla': {
        const hit=[e]; let cur=e;
        for(let i=0;i<s.chain;i++){
          let nx=null,bd=Infinity;
          for(const t of g.enemies){ if(t.dead||hit.includes(t)||!this.canSee(t)) continue;
            const dx=t.pos.x-cur.pos.x,dz=t.pos.z-cur.pos.z,d2=dx*dx+dz*dz;
            const cr=s.chainRange*C.CELL;
            if(d2<cr*cr&&d2<bd){bd=d2;nx=t;} }
          if(!nx) break; hit.push(nx); cur=nx;
        }
        let from=new THREE.Vector3(this.pos.x,this.pos.y+2.2,this.pos.z);
        let dm=s.dmg;
        for(const t of hit){
          eng.lightning(from,t.center(),0x9fd8ff);
          // synergy: EMP-stalled vehicles conduct — tesla hits 2x
          const stalled=t.stunT>0||t.slow>=0.3;
          g.hitEnemy(t,dm*(stalled?2:1),hitOpts); dm*=0.8;
          if(Math.random()<s.stunProb) t.applyStun(s.stunDur);
          from=t.center();
        }
        break; }
      case 'flak': {
        eng.beam(mp,e.center(),col,0.05,0.07); eng.muzzleFlash(mp);
        g.hitEnemy(e,s.dmg,hitOpts);
        eng.burst(e.center(),0xd8dee8,8,3,0.35,3);
        if (s.splash>0){
          const sr=s.splash*C.CELL;
          for(const t of g.enemies){ if(t.dead||t===e||!t.def.fly) continue;
            const dx=t.pos.x-e.pos.x,dz=t.pos.z-e.pos.z;
            if(dx*dx+dz*dz<sr*sr) g.hitEnemy(t,s.dmg*0.6,hitOpts); }
        }
        break; }
      case 'flame': {
        const targets=g.enemiesInCone(this.pos,this.aimAngle,this.rangeW(),s.cone,this);
        const dir=new THREE.Vector3(Math.sin(this.aimAngle),0.05,Math.cos(this.aimAngle));
        const cols=[0xff6b3d,0xffc46b,0xffd166,0xef4444];
        // big square flame particles stream out to the end of range
        for(let i=0;i<40;i++){
          const d=(0.05+Math.random()*0.95)*this.rangeW();
          const p=mp.clone().addScaledVector(dir,d)
            .add(new THREE.Vector3((Math.random()-0.5)*0.6,Math.random()*0.5,(Math.random()-0.5)*0.6));
          eng.sqBurst(p,cols[i%4],1,2.6,0.28+Math.random()*0.14,0.5);
        }
        for(let i=0;i<5;i++){ const d=(0.2+Math.random()*0.8)*this.rangeW();
          eng.burst(mp.clone().addScaledVector(dir,d),cols[i%4],2,1.5,0.3,-1); }
        for(const t of targets){ g.hitEnemy(t,s.dmg,hitOpts); if(s.burnDps) t.applyBurn(s.burnDps,s.burnDur); }
        // AOE: anything close to a torched vehicle catches fire too
        if (s.burnDps) for (const t of targets){
          for (const o of g.enemies){
            if (o.dead||o===t) continue;
            const dx=o.pos.x-t.pos.x,dz=o.pos.z-t.pos.z;
            if (dx*dx+dz*dz<Math.pow(1.15*C.CELL,2)) o.applyBurn(s.burnDps,s.burnDur);
          }
        }
        if (targets.length) TD.Audio.sfx('flame');
        break; }
      case 'laser': {
        const end=e.center();
        eng.beam(mp,end,0xff4d7d,0.08,0.12);
        eng.muzzleFlash(mp,0xff8fb0,1.2);
        g.hitEnemy(e,s.dmg,hitOpts);
        // heat splash around the impact point
        for (const t of g.enemiesInRange(e.pos,0.9*C.CELL,this)){
          if (t===e) continue;
          g.hitEnemy(t,s.dmg*0.5,hitOpts);
        }
        break; }
      case 'rail': {
        const dir=new THREE.Vector3().subVectors(e.center(),mp); dir.y=0; dir.normalize();
        const end=mp.clone().addScaledVector(dir,this.rangeW()+2); end.y=1;
        eng.beam(mp,end,0xcfe6ff,0.13,0.16); eng.muzzleFlash(mp,0xbcd9ff,1.6);
        for(const t of g.enemies){ if(t.dead||!this.canSee(t)) continue;
          const to=new THREE.Vector3().subVectors(t.center(),mp); to.y=0;
          const proj=to.dot(dir);
          if(proj>0&&proj<this.rangeW()+2&&to.sub(dir.clone().multiplyScalar(proj)).length()<0.9){
            // synergy: acid-corroded hulls give the railgun a clean punch-through
            const corroded=t.poisons.length>0;
            g.hitEnemy(t,s.dmg*(corroded?1.25:1),corroded?{armorPierce:true,tower:this}:hitOpts);
            if(s.mark) t.applyMark(s.mark,s.markDur); }
        }
        break; }
      case 'missile': {
        // synergy: radar-painted targets get priority lock
        const cands=g.enemiesInRange(this.pos,this.rangeW(),this)
          .sort((a,b2)=>((b2.markT>0)?1:0)-((a.markT>0)?1:0));
        cands.sort((a,b)=>(b.markT>0?1:0)-(a.markT>0?1:0)); // synergy: radar-painted targets first
        const rackM=(u.head&&u.head.userData.rackMissiles)||[];
        for(let i=0;i<s.volley;i++){
          const t=cands[i%Math.max(1,cands.length)]||e;
          // pull a live missile off the rack — it flies out and the tube reloads
          const rm=rackM.find(m=>m.visible);
          let start=mp.clone().add(new THREE.Vector3((Math.random()-0.5)*0.3,0.15*i,0));
          if (rm){ rm.visible=false;
            (this.reloads=this.reloads||[]).push({mesh:rm, t:1.1+i*0.18});
            start=rm.getWorldPosition(new THREE.Vector3());
          }
          const launchDir=new THREE.Vector3(Math.sin(this.aimAngle)*0.55,1.5,Math.cos(this.aimAngle)*0.55).normalize();
          g.projectiles.push({ kind:'missileP', pos:start, dir:launchDir, spd:8, delay:i*0.09,
            target:t, dmg:s.dmg, opts:hitOpts, splash:s.splash, projMul:s.proj, life:5,
            mesh:g.eng.getMissileMesh() });
          if (i===0) eng.muzzleFlash(start,0xffc46b,0.9);
        }
        break; }
      case 'echo': {
        eng.ring(this.pos,this.rangeW(),0xa7f3d0,0.5);
        for(const t of g.enemiesInRange(this.pos,this.rangeW(),this)){
          g.hitEnemy(t,s.dmg,hitOpts);
          if(s.mark) t.applyMark(s.mark,s.markDur);
          if(s.slow) t.applySlow(s.slow,s.slowDur||0.8);
        }
        break; }
    }
  }
}

/* ---------- Enemy vehicle ---------- */
class Enemy {
  constructor(game,type,angle,wave,affix,opts){
    this.game=game; this.type=type; this.def=TD.ENEMIES[type];
    const o=opts||{};
    this.hpMul=o.hpMul||1; this.goldMul=o.goldMul||1; this.sizeMul=o.sizeMul||1;
    const diff=game.diff;
    this.affix=affix||null;
    const af=this.affix? TD.AFFIXES[this.affix] : null;
    const daily=game.daily;
    const hpScale=TD.scaleHp(wave)*diff.hpMul*C.ENEMY_HP_MUL*(this.def.boss? 1+(Math.floor(wave/10)-1)*1.2 : 1);
    this.maxHp=Math.round(this.def.hp*hpScale*this.hpMul*(af?af.hpMul:1)*(daily&&daily.mod.id==='brittle'?0.8:1));
    this.hp=this.maxHp;
    this.armor=(this.def.armor||0)+((af&&af.armorAdd)||0);
    this.speed=this.def.spd*diff.spdMul*C.ENEMY_SPD_MUL*((af&&af.spdMul)||1)*(daily&&daily.mod.id==='fast'?1.15:1)*C.CELL;
    this.exposedT=0; this.escorts=null; this.shieldDome=null;
    this.stealth=!!this.def.stealth; this.detected=false;
    this.dead=false; this.absorbing=false; this.falling=false;
    this.slow=0; this.slowT=0; this.stunT=0; this.burn=null; this.poisons=[]; this.markAmp=0; this.markT=0;
    this.hordeOff=(Math.random()-0.5)*0.8;
    this.rootCd=0; this.breachT=Math.random(); this.breachTarget=null; this.biteT=0; this.sinkK=0;
    this.jx=(Math.random()-0.5)*0.9; this.jz=(Math.random()-0.5)*0.9;
    const R=game.eng.worldSize/2*1.02;
    if (game.track&&!game.horde&&!this.def.fly){
      const ws=game.trackW[0];
      this.pos=new THREE.Vector3(ws.x+(Math.random()-0.5)*1.2,0,ws.z+(Math.random()-0.5)*1.2);
      this.tIdx=0;
    } else {
      this.pos=new THREE.Vector3(Math.cos(angle)*R,0,Math.sin(angle)*R);
    }
    this.wp=null;
    this.model=game.eng.makeEnemy(type);
    this.model.userData.owner=this;
    if (this.sizeMul>1){
      this.model.userData.baseScale=(this.model.userData.baseScale||1.12)*this.sizeMul;
      this.model.scale.multiplyScalar(this.sizeMul);
    }
    this.model.position.copy(this.pos);
    game.eng.scene.add(this.model);
    if (this.stealth) game.eng.setStealth(this.model,true);
    if (af) game.eng.eliteRing(this.model,af.color);
    if (this.def.vip) game.eng.eliteRing(this.model,0xffd166);
    this._wasHidden=true;
    const bar=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.1,0.02),
      new THREE.MeshBasicMaterial({color:0x4ade80}));
    bar.position.y=1.9; bar.visible=false;  // child of the size-scaled model
    this.model.add(bar); this.bar=bar;
    this.healT=0; this.roarT=this.def.roarCd||0;
  }
  center(){ return new THREE.Vector3(this.pos.x, 0.8*this.def.size+(this.def.fly?1.2:0), this.pos.z); }
  cell(){ return this.game.eng.worldToCell(this.pos); }
  progress(){
    if (this.def.fly){ const b=this.game.basePos; return Math.hypot(this.pos.x-b.x,this.pos.z-b.z); }
    if (this.game.track) return (this.game.trackW.length-(this.tIdx||0));
    const c=this.cell(); if(!inB(c.c,c.r)) return 999;
    const d=this.game.dist[idx(c.c,c.r)];
    return d===32767? 999 : d;
  }
  predictPos(t){ const v=this._lastVel||new THREE.Vector3(); return { x:this.pos.x+v.x*t*0.5, z:this.pos.z+v.z*t*0.5 }; }
  applySlow(a,dur){ this.slow=Math.min(0.85,Math.max(this.slow,a)); this.slowT=Math.max(this.slowT,dur); }
  applyStun(d){ this.stunT=Math.max(this.stunT,d); }
  applyBurn(dps,dur){ if(!this.burn||dps>=this.burn.dps) this.burn={dps,t:dur}; else this.burn.t=Math.max(this.burn.t,dur*0.5); }
  applyPoison(dps,dur,maxStacks){ if(this.poisons.length<maxStacks) this.poisons.push({dps,t:dur});
    else { let w=this.poisons[0]; for(const p of this.poisons) if(p.t<w.t) w=p; w.dps=dps; w.t=dur; } }
  applyMark(amp,dur){ this.markAmp=Math.max(this.markAmp,amp); this.markT=Math.max(this.markT,dur); }
  startAbsorb(){
    this.absorbing=true; this.absorbT=0.7;
    this.bar.visible=false;
    TD.Audio.sfx('baseHit');
  }
  startFalling(){
    this.falling=true; this.fallT=0.6;
    this.bar.visible=false;
  }
  update(dt){
    const g=this.game;
    if (this.absorbing){
      this.absorbT-=dt;
      const b=g.basePos, k=Math.max(0,this.absorbT/0.7);
      this.pos.lerp(new THREE.Vector3(b.x,0,b.z),1-Math.pow(k,0.5));
      this.model.position.set(this.pos.x,(1-k)*2.5,this.pos.z);
      this.model.scale.setScalar((this.model.userData.baseScale||1.12)*Math.max(0.05,k));
      this.model.rotation.y+=dt*9;
      if (this.absorbT<=0){
        g.eng.absorbFX(g.basePos);
        g.damageBase(Math.ceil(this.hp));
        this.remove(false);
      }
      return;
    }
    if (this.falling){
      this.fallT-=dt;
      this.model.position.y-=dt*4;
      this.model.rotation.x+=dt*4;
      this.model.scale.multiplyScalar(1-dt*1.2);
      if (this.fallT<=0){ g.awardKill(this,null); this.remove(true); }
      return;
    }
    // dots
    if (this.burn){ this.burn.t-=dt; g.dotDamage(this,this.burn.dps*dt,0xff8c42); if(this.burn&&this.burn.t<=0) this.burn=null; }
    if (this.burn){
      if (Math.random()<dt*16){
        const bx=this.pos.x+(Math.random()-0.5)*0.7, bz=this.pos.z+(Math.random()-0.5)*0.7;
        g.eng.sqBurst(new THREE.Vector3(bx,0.3*this.def.size+Math.random()*0.7,bz),
          [0xff6b3d,0xffc46b,0xffd166][Math.floor(Math.random()*3)],1,1.4,0.2,0.6);
      }
    }
    if (this.poisons.length){ let total=0;
      for(let i=this.poisons.length-1;i>=0;i--){ const p=this.poisons[i]; p.t-=dt; total+=p.dps; if(p.t<=0) this.poisons.splice(i,1); }
      g.dotDamage(this,total*dt,0xa3e635);
    }
    if (this.dead) return;
    this.flashT=Math.max(0,(this.flashT||0)-dt*6);
    this.model.scale.setScalar((this.model.userData.baseScale||1.12)*(1+this.flashT*0.08));
    if (this.slowT>0){ this.slowT-=dt; if(this.slowT<=0) this.slow=0; }
    if (this.markT>0){ this.markT-=dt; if(this.markT<=0) this.markAmp=0; }
    if (this.rootCd>0) this.rootCd-=dt;
    if (this.stunT>0){ this.stunT-=dt; this.model.position.set(this.pos.x,this._yOff||0,this.pos.z); this.updateBar(); return; }
    // medic van
    if (this.def.heal){ this.healT-=dt;
      if(this.healT<=0){ this.healT=this.def.healCd;
        let best=null,bf=1;
        for(const e of g.enemies){ if(e.dead||e===this||e.absorbing||e.falling) continue;
          const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z, rr=this.def.healRad*C.CELL;
          if(dx*dx+dz*dz<rr*rr){ const f=e.hp/e.maxHp; if(f<bf){bf=f;best=e;} } }
        if(best){ best.hp=Math.min(best.maxHp,best.hp+this.def.heal);
          g.eng.ring(this.pos,this.def.healRad*C.CELL*0.6,0x86efac,0.4);
          g.eng.burst(best.center(),0x86efac,6,2,0.4,2); }
      }
    }
    // boss: roar spawns adds AND exposes the core for 3s (2x damage window)
    if (this.def.boss){ this.roarT-=dt;
      if (this.exposedT>0){ this.exposedT-=dt;
        if (Math.random()<dt*8) g.eng.burst(this.center(),0xff4040,2,2,0.3,2); }
      if (this.escorts&&this.shieldDome&&this.shieldDome.visible&&!this.escorts.some(x=>!x.dead)){
        this.shieldDome.visible=false;
        if (TD.ui) TD.ui.toast('Boss shield DOWN!');
        TD.Audio.sfx('research');
        g.eng.ring(this.pos,5,0x7dd3fc,0.6);
      }
      if(this.roarT<=0){ this.roarT=this.def.roarCd; TD.Audio.sfx('roar');
        g.eng.ring(this.pos,5,0xf87171,0.6);
        g.eng.shakeCam(0.6);
        this.exposedT=3;
        g.eng.text(this.center(),'CORE EXPOSED','#ff6b6b',true);
        for(let i=0;i<this.def.roarN;i++) g.spawnEnemyAt(this.def.roarSpawn,this.pos,g.wave);
      }
    }
    // digger: dives under the field, untargetable until it surfaces
    if (this.def.burrow){
      this.burrowT=(this.burrowT===undefined?2.5:this.burrowT)-dt;
      if (this.burrowT<=0){
        this.burrowed=!this.burrowed;
        this.burrowT=this.burrowed?2.2:3.2;
        g.eng.burst(new THREE.Vector3(this.pos.x,0.3,this.pos.z),0xa89a5e,12,3.5,0.45,6);
        g.eng.ring(this.pos,1.4,0xa89a5e,0.35);
        if (this._wasHidden!==!!this.burrowed){ g.eng.setStealth(this.model,!!this.burrowed); this._wasHidden=!!this.burrowed; }
      }
      this.burrowK=this.burrowK||0;
      this.burrowK+=((this.burrowed?1:0)-this.burrowK)*Math.min(1,dt*5);
      if (this.burrowed&&Math.random()<dt*6) g.eng.burst(new THREE.Vector3(this.pos.x,0.15,this.pos.z),0xa89a5e,2,1.5,0.3,4);
    }
    // ground hazards (diggers slip beneath them while burrowed)
    const cl=this.cell();
    let inSand=false;
    if (!this.def.fly && !this.burrowed && inB(cl.c,cl.r)){
      const b=g.groundMap[idx(cl.c,cl.r)];
      if (b){
        if (b.def.id==='tar'){ this.applySlow(b.def.slow,0.25); inSand=true; }
        if (b.def.id==='wire'){
          if (this.rootCd<=0){ this.applyStun(b.def.root); this.rootCd=6;
            g.eng.burst(this.center(),0xb08968,8,2,0.4,4); TD.Audio.sfx('hit');
            // angry vehicles try to rip the wire out — the wire wins that trade (5x)
            if (this.def.heavy||Math.random()<0.4) this.breachTarget=b;
          }
          g.dotDamage(this,b.def.dps*dt,0xd9a066);
        }
        if (b.def.id==='spike'){
          this.spikeT=(this.spikeT||0)-dt;
          if(this.spikeT<=0){ this.spikeT=0.5; g.hitEnemy(this,b.def.hit,{});
            TD.Audio.sfx('hit'); b.uses--; g.eng.burst(this.center(),0xc9d3dd,5,3,0.3,5);
            if(b.uses<=0) g.breakBlock(b); }
        }
      }
    }
    if (this.dead) return;
    // quicksand sinking + burrow depth (visual)
    if (!this.def.fly){
      this.sinkK+=((inSand?1:0)-this.sinkK)*Math.min(1,dt*4);
      this._yOff=-0.5*this.sinkK-0.95*(this.burrowK||0);
      this.model.position.y=this._yOff;
    }
    // movement → absorb at the base
    if (this.def.fly){
      const b=g.basePos, dx=b.x-this.pos.x, dz=b.z-this.pos.z, d=Math.hypot(dx,dz);
      if (d<3.6){ this.startAbsorb(); return; }
      const spd=this.speed*(1-this.slow);
      this.pos.x+=dx/d*spd*dt; this.pos.z+=dz/d*spd*dt;
      this._lastVel=new THREE.Vector3(dx/d*spd,0,dz/d*spd);
      this.model.position.set(this.pos.x,this.model.position.y,this.pos.z);
      this.model.rotation.y=Math.atan2(dx,dz);
      g.eng.animEnemy(this.model,dt,1-this.slow);
      this.updateBar(); return;
    }
    const cc=this.cell();
    if (!g.horde&&inB(cc.c,cc.r) && g.dist[idx(cc.c,cc.r)]<=1){ this.startAbsorb(); return; }
    // breach mode: the maze detour is too long — smash through instead
    this.breachT-=dt;
    if (!g.horde&&!this.breachTarget&&this.breachT<=0){ this.breachT=0.9+Math.random()*0.4; this.evalBreach(); }
    if (this.breachTarget){
      const b=this.breachTarget;
      if (!g.blocks.includes(b)) this.breachTarget=null;
      else {
        const dx=b.pos.x-this.pos.x, dz=b.pos.z-this.pos.z, d=Math.hypot(dx,dz);
        if (d>C.CELL*1.3){
          const spd=this.speed*(1-this.slow);
          this.pos.x+=dx/d*spd*dt; this.pos.z+=dz/d*spd*dt;
          this._lastVel=new THREE.Vector3(dx/d*spd,0,dz/d*spd);
          this.model.position.set(this.pos.x,this._yOff||0,this.pos.z);
          this.model.rotation.y=Math.atan2(dx,dz);
          g.eng.animEnemy(this.model,dt,1-this.slow);
        } else if (this.def.ram){
          g.ramExplode(this,b); return;
        } else {
          this.biteT-=dt;
          this.model.rotation.y=Math.atan2(dx,dz);
          g.eng.animEnemy(this.model,dt,0.15);
          if (this.biteT<=0){ this.biteT=0.8; g.attackBlock(this,b); }
        }
        this.updateBar(); return;
      }
    }
    if (!this.wp) this.nextWp();
    if (g.track&&!this.def.fly){ // TDS: follow the winding track, cell by cell
      const tr=g.trackW, ti=this.tIdx||0;
      if (ti<tr.length){
        const [cc,rr]=g.track[ti];
        const st=g.cellStack[idx(cc,rr)];
        if (st&&st.length){ // something built on the road — smash it
          const blk=st[st.length-1];
          const dx=blk.pos.x-this.pos.x,dz=blk.pos.z-this.pos.z;
          this.model.rotation.y=Math.atan2(dx,dz);
          this.biteT-=dt;
          g.eng.animEnemy(this.model,dt,0.15);
          if (this.biteT<=0){ this.biteT=0.8; g.attackBlock(this,blk); }
          this.updateBar(); return;
        }
        const wp=tr[ti], dx=wp.x-this.pos.x, dz=wp.z-this.pos.z, d=Math.hypot(dx,dz);
        if (d<0.3){
          this.tIdx=ti+1;
          if (this.tIdx>=tr.length){ this.startAbsorb(); return; }
        } else {
          const spd=this.speed*(1-this.slow);
          this.pos.x+=dx/d*spd*dt; this.pos.z+=dz/d*spd*dt;
          this._lastVel=new THREE.Vector3(dx/d*spd,0,dz/d*spd);
          this.model.position.set(this.pos.x,this._yOff||0,this.pos.z);
          this.model.rotation.y=Math.atan2(dx,dz);
          g.eng.animEnemy(this.model,dt,1-this.slow);
        }
      } else { this.startAbsorb(); return; }
      this.updateBar(); return;
    }
    if (g.horde){ // horde: ignore the maze — charge the base from every angle
      const b=g.basePos, dx=b.x-this.pos.x, dz=b.z-this.pos.z, d=Math.hypot(dx,dz);
      const a=Math.atan2(dx,dz)+this.hordeOff;
      // player walls DO block in horde — smash them like the maze walls
      const ahead=this.pos.clone().add(new THREE.Vector3(Math.sin(a)*0.55,0,Math.cos(a)*0.55));
      const ac=g.eng.worldToCell(ahead);
      if (inB(ac.c,ac.r)){
        const st=g.cellStack[idx(ac.c,ac.r)];
        if (st&&st.length){
          const blk=st[st.length-1];
          this.model.rotation.y=Math.atan2(Math.sin(a),Math.cos(a));
          this.biteT-=dt;
          g.eng.animEnemy(this.model,dt,0.15);
          if (this.biteT<=0){ this.biteT=0.8; g.attackBlock(this,blk); }
          this.updateBar(); return;
        }
      }
      if (d<1.8){ this.startAbsorb(); return; }
      const spd=this.speed*(1-this.slow);
      this.pos.x+=Math.sin(a)*spd*dt; this.pos.z+=Math.cos(a)*spd*dt;
      this._lastVel=new THREE.Vector3(Math.sin(a)*spd,0,Math.cos(a)*spd);
      this.model.position.set(this.pos.x,this._yOff||0,this.pos.z);
      this.model.rotation.y=Math.atan2(Math.sin(a),Math.cos(a));
      g.eng.animEnemy(this.model,dt,1-this.slow);
      this.updateBar(); return;
    }
    if (this.wp){
      const dx=this.wp.x-this.pos.x, dz=this.wp.z-this.pos.z, d=Math.hypot(dx,dz);
      if (d<0.25) this.nextWp();
      else {
        const spd=this.speed*(1-this.slow);
        this.pos.x+=dx/d*spd*dt; this.pos.z+=dz/d*spd*dt;
        this._lastVel=new THREE.Vector3(dx/d*spd,0,dz/d*spd);
        this.model.position.set(this.pos.x,this._yOff||0,this.pos.z);
        // smooth turn
        const want=Math.atan2(dx,dz);
        let dr=want-this.model.rotation.y;
        while(dr>Math.PI)dr-=2*Math.PI; while(dr<-Math.PI)dr+=2*Math.PI;
        this.model.rotation.y+=THREE.MathUtils.clamp(dr,-4*dt,4*dt);
        g.eng.animEnemy(this.model,dt,1-this.slow);
      }
    }
    // burning spreads: a lit vehicle torches anyone it touches
    if (this.burn&&!this.dead){
      this.spreadT=(this.spreadT||0)-dt;
      if (this.spreadT<=0){
        this.spreadT=0.6;
        for (const o of g.enemies){
          if (o.dead||o===this||o.burrowed||o.burn) continue;
          const dx=o.pos.x-this.pos.x,dz=o.pos.z-this.pos.z;
          if (dx*dx+dz*dz<Math.pow(0.85*C.CELL,2)) o.applyBurn(this.burn.dps*0.6,1.8);
        }
      }
    }
    this.updateBar();
  }
  evalBreach(){
    const g=this.game;
    if (!g.basePos) return;
    const straight=Math.hypot(g.basePos.x-this.pos.x,g.basePos.z-this.pos.z)/C.CELL;
    const path=this.progress();
    const ratio=this.def.heavy?1.6:2.4;
    if (path!==999&&path<straight*ratio+2){ this.breachTarget=null; return; }
    // scan the straight line to the base for the first player-built block
    const dx=g.basePos.x-this.pos.x, dz=g.basePos.z-this.pos.z, len=Math.hypot(dx,dz);
    const steps=Math.ceil(len/(C.CELL*0.5));
    for (let i=1;i<=steps;i++){
      const t=i/steps;
      const c=g.eng.worldToCell({x:this.pos.x+dx*t, z:this.pos.z+dz*t});
      if (!inB(c.c,c.r)) continue;
      const ii=idx(c.c,c.r);
      const v=g.cells[ii];
      if (v===1||v===2) return;             // rock or the base itself — nothing to chew
      if (v===3){
        const st=g.cellStack[ii];
        if (st&&st.length){ this.breachTarget=st[st.length-1]; }
        return;                              // tower-only cell: can't break turrets
      }
    }
  }
  nextWp(){
    const g=this.game, c0=this.cell();
    if (!inB(c0.c,c0.r)){
      const cw=g.eng.cellToWorld(THREE.MathUtils.clamp(c0.c,0,G-1),THREE.MathUtils.clamp(c0.r,0,G-1));
      this.wp={x:cw.x,z:cw.z}; return;
    }
    // beeline: walk the flow field ahead, then drive straight at the farthest
    // point we can see — no cell-by-cell shuffling across open ground
    let cur=c0; const chain=[];
    for(let k=0;k<16;k++){
      const d=g.dir[idx(cur.c,cur.r)];
      if (!d) break;
      cur={c:cur.c+d.dc, r:cur.r+d.dr};
      chain.push(cur);
      if (g.cells[idx(cur.c,cur.r)]===2) break;
    }
    if (!chain.length){ this.wp=null; return; }
    let pick=chain[0];
    for (let i=chain.length-1;i>0;i--){
      const w=g.eng.cellToWorld(chain[i].c,chain[i].r);
      if (g.losClear(this.pos.x,this.pos.z,w.x,w.z)){ pick=chain[i]; break; }
    }
    const w=g.eng.cellToWorld(pick.c,pick.r);
    this.wp={ x:w.x+this.jx*0.55, z:w.z+this.jz*0.55 };
  }
  updateBar(){
    // HP bar only shows for the vehicle under the cursor
    if (this.game.hovered!==this||this.burrowed){ this.bar.visible=false; return; }
    const f=this.hp/this.maxHp;
    this.bar.visible=true; this.bar.scale.x=Math.max(0.02,f);
    this.bar.material.color.setHSL(f*0.33,0.8,0.5);
    this.bar.rotation.y=-this.model.rotation.y+this.game.eng.camAngle+Math.PI/2;
  }
  remove(counted){
    this.dead=true;
    this.game.eng.scene.remove(this.model);
    if (this.def.boss && TD.ui) TD.ui.bossBar(null);
  }
}

/* ---------- Game ---------- */
TD.Game = class {
  constructor(eng){
    this.eng=eng;
    this.state='menu';
    this.loadSave();
    this.speed=1; this.paused=false;
    this.placing=null; this.placingRot=0; this.ghost=null; this.selected=null; this.rangeRing=null;
    this.shellPool=[];
  }
  /* ----- persistence ----- */
  loadSave(){
    let s={};
    try{ s=JSON.parse(localStorage.getItem(C.SAVE_KEY))||{}; }catch(e){}
    this.save=Object.assign({ research:0, tech:[], maps:{}, codes:[], skins:{scrap:[],metal:[],gold:[]}, settings:{sfx:0.7,mus:0.45,musicOn:false,dmgNums:true} }, s);
    if (!this.save.codes) this.save.codes=[];
    if (!this.save.skins) this.save.skins={scrap:[],metal:[],gold:[]};
    if (!this.save.settings) this.save.settings={sfx:0.7,mus:0.45,musicOn:false,dmgNums:true};
    if (this.save.settings.dark===undefined) this.save.settings.dark=true;   // dark mode default
    if (this.save.settings.musicInit===undefined){
      this.save.settings.musicOn=false;   // one-time migration to the new default: music OFF
      this.save.settings.musicInit=true;
    }
    for (const m of TD.MAPS) this.save.maps[m.id]=Object.assign({ stars:[], bestWave:0, endlessBest:0 }, this.save.maps[m.id]||{});
    this.applyTech();
  }
  persist(){ try{ localStorage.setItem(C.SAVE_KEY, JSON.stringify(this.save)); }catch(e){} }
  techHas(id){ return this.save.tech.includes(id); }
  applyTech(){
    this.techDmg=0; this.techRange=0; this.techBaseHp=0; this.techRegen=0;
    this.techStartGold=0; this.techWaveBonus=0; this.techResWave=0; this.sellRefund=C.SELL_REFUND;
    this.techSlots=C.SLOT_POINTS;
    for (const br of TD.TECH) for (const n of br.nodes){
      if (!this.techHas(n.id)) continue;
      if (n.dmg) this.techDmg+=n.dmg;
      if (n.range) this.techRange+=n.range;
      if (n.baseHp) this.techBaseHp+=n.baseHp;
      if (n.regen) this.techRegen+=n.regen;
      if (n.startGold) this.techStartGold+=n.startGold;
      if (n.waveBonus) this.techWaveBonus+=n.waveBonus;
      if (n.resWave) this.techResWave+=n.resWave;
      if (n.sell) this.sellRefund=n.sell;
      if (n.slots) this.techSlots+=n.slots;
    }
  }
  techBuy(node){
    if (this.techHas(node.id)||this.save.research<node.cost) return false;
    if (node.req&&!this.techHas(node.req)) return false;
    this.save.research-=node.cost; this.save.tech.push(node.id);
    this.applyTech(); this.persist(); TD.Audio.sfx('research');
    return true;
  }
  unlockedTowers(){
    const set=new Set(TD.DEFAULT_UNLOCKED);
    for (const br of TD.TECH) for (const n of br.nodes) if (n.unlock&&this.techHas(n.id)) set.add(n.unlock);
    return set;
  }
  mapUnlocked(i){ return !!(this.save.allMapsUnlocked)||i===0||this.save.maps[i-1].stars.length>0; }
  hasPerk(id){ return !!this.perks&&this.perks.includes(id); }
  rand(){ return this.rng? this.rng() : Math.random(); }
  costOf(kind,def){
    let c=def.cost;
    if (kind==='block'&&this.hasPerk('cheapblocks')) c*=0.5;
    if (kind==='tower'&&this.hasPerk('deploy')) c*=0.85;
    return Math.round(c);
  }
  rankOf(k){ return k>=150?4:k>=75?3:k>=30?2:k>=10?1:0; }
  prestige(t){
    if (this.netGuest||!t||t.isBlock||t.totalTiers()<7) return false;
    const gain=100+Math.round(t.spent*0.05);
    t.tiers=[0,0,0]; t.spent=t.def.cost; t.kills=0;
    this.save.research+=gain; this.runResearch+=gain;
    this.recomputeStats();
    this.eng.applyCosmetics(t.model,t.id,t.tiers);
    this.persist();
    TD.Audio.sfx('research');
    if (TD.ui) TD.ui.toast('PRESTIGE — +'+gain+' research!');
    return true;
  }
  materialRank(id){
    const sk=this.save.skins;
    if (sk.gold.includes(id)) return 3;
    if (sk.metal.includes(id)) return 2;
    if (sk.scrap.includes(id)) return 1;
    return 0;
  }
  buyMaterial(tier){
    const cost={scrap:30,metal:60,gold:100}[tier];
    const rank={scrap:1,metal:2,gold:3}[tier];
    if (this.save.research<cost) return {ok:false,msg:'Need '+cost+' research'};
    const cands=Object.keys(TD.TOWERS).filter(id=>this.materialRank(id)<rank);
    if (!cands.length) return {ok:false,msg:'Every turret is already '+tier+' or better'};
    this.save.research-=cost;
    const id=cands[Math.floor(this.rand()*cands.length)];
    for (const k of ['scrap','metal','gold']) this.save.skins[k]=this.save.skins[k].filter(x=>x!==id);
    this.save.skins[tier].push(id);
    this.persist();
    TD.Audio.sfx('research');
    return {ok:true,id,name:TD.TOWERS[id].name,tier};
  }
  /* ----- redeem codes (settings) ----- */
  codeGoldBonus(){
    let g=0;
    if (this.save.codes.includes('BobitaInHopperCity')) g+=2000;
    if (this.save.codes.includes('MidzWinz')) g+=250;
    return g;
  }
  redeemCode(str){
    const code=(str||'').trim();
    if (!code) return {ok:false,msg:'Enter a code'};
    if (this.save.codes.includes(code)) return {ok:false,msg:'Code already redeemed'};
    if (code==='BobitaInHopperCity'){
      this.save.codes.push(code); this.save.research+=9999; this.persist();
      try{ localStorage.setItem('td.admin','1'); }catch(e){} // marks this device as admin
      TD.Audio.sfx('research');
      return {ok:true,msg:'Code redeemed! +9999 research, +2000 starting gold'};
    }
    if (code==='MidzWinz'){
      const beatNormal=Object.values(this.save.maps).some(m=>m.stars&&m.stars.includes('normal'));
      if (!beatNormal) return {ok:false,msg:'Beat NORMAL on any map first'};
      this.save.codes.push(code); this.save.research+=45; this.persist();
      TD.Audio.sfx('research');
      return {ok:true,msg:'Code redeemed! +45 research, +250 starting gold'};
    }
    return {ok:false,msg:'Invalid code'};
  }

  /* ----- run lifecycle ----- */
  startRun(mapId,diffId,loadout,endless,horde){
    this.cleanupRun(); // full map reset — no ghosts from the last run
    this.map=TD.MAPS[mapId]; this.diffId=diffId; this.diff=TD.DIFFICULTY[diffId];
    this.loadout=loadout; this.endless=endless; this.horde=!!horde;
    this.track=null; this.trackW=null;
    this.eng.buildMap(this.map);
    this.eng.resetCam();
    this.cells=new Uint8Array(G*G);      // 0 empty 1 rock 2 base 3 blocked 5 walkable-block
    this.stackH=new Uint8Array(G*G);
    this.towerMap={}; this.groundMap={}; this.cellStack={};
    for (const [c,r] of this.map._rocks) this.cells[idx(c,r)]=1;
    this.bldgH=new Uint8Array(G*G);
    for (const [c,r,h] of (this.map._bldgs||this.map.bldgs||[])){ this.cells[idx(c,r)]=1; this.bldgH[idx(c,r)]=h*5; }
    this.towers=[]; this.enemies=[]; this.projectiles=[]; this.blocks=[];
    this.gold=Math.round((this.diff.startGold+this.techStartGold+this.codeGoldBonus())*C.START_GOLD_MUL);
    this.baseMaxHp=Math.round(this.diff.baseHp*(1+this.techBaseHp));
    this.baseHp=this.baseMaxHp;
    this.shieldMax=0; this.shield=0; this.shieldT=0;
    this.wave=0; this.waveActive=false; this.spawnQueue=[]; this.spawnT=0;
    this.supplyT=12;
    this.vipTotal=0; this.vipBucket=-1; this.vipInBucket=0; this._vipSlot=-1;
    this.runResearch=0; this.runKills=0;
    this.selected=null; this.placing=null;
    // feature state: abilities, perks, crates, strikes, daily
    this.perks=[];
    this.abilities=TD.ABILITIES.map(a=>({def:a,charge:0}));
    this.overclockT=0; this.strikes=[]; this.crates=[]; this.aiming=null;
    this.daily=this.pendingDaily||null; this.pendingDaily=null;
    this.rng=this.daily? this.daily.rng : null;
    if (this.daily&&this.daily.mod.id==='rich') this.gold+=250;
    this.basePos=null; this.baseModel=null;
    if (this.horde){
      this.state='prep';
      this.setPlacing('base','base');
      if (TD.ui) TD.ui.banner('PLACE YOUR BASE','pick your ground — they will come from every direction');
    } else {
      // TDS: pre-placed base + a winding track the horde follows
      const spot=this.findBaseSpot();
      this.placeBase(spot.c,spot.r);
      this.buildTrack();
      this.drawTrack();
      if (TD.ui) TD.ui.banner('THEY FOLLOW THE TRACK','build along the road — walls off it do nothing');
    }
  }
  findBaseSpot(){
    const G=TD.CONFIG.GRID, mid=Math.floor(G/2);
    for(let d=0;d<G;d++) for(let c=mid-d;c<=mid+d;c++) for(let r=mid-d;r<=mid+d;r++){
      if (Math.max(Math.abs(c-mid),Math.abs(r-mid))!==d) continue;
      if (this.baseSpotOk(c,r)) return {c,r};
    }
    return {c:mid-2,r:mid-2};
  }
  buildTrack(){
    const G=TD.CONFIG.GRID, cells=this.cells, idx2=(c,r)=>r*G+c;
    // entry gate: open cell on a random border
    const side=Math.floor(this.rand()*4);
    let sc,sr;
    for(let i=0;i<40;i++){
      const along=3+Math.floor(this.rand()*(G-6));
      if (side===0){ sc=along; sr=2; } else if(side===1){ sc=along; sr=G-3; }
      else if(side===2){ sc=2; sr=along; } else { sc=G-3; sr=along; }
      if (cells[idx2(sc,sr)]===0) break;
    }
    // goal: an open cell hugging the base
    let target=null;
    for (const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const c=this.baseC+dc, r=this.baseR+dr;
      if (inB(c,r)&&cells[idx2(c,r)]===0){ target=[c,r]; break; }
    }
    if (!target) target=[this.baseC-1,this.baseR-1];
    let cur=[sc,sr];
    const path=[cur.slice()];
    let guard=0;
    while (guard++<600){
      const dx=target[0]-cur[0], dy=target[1]-cur[1];
      if (Math.abs(dx)+Math.abs(dy)<=4){
        // walk the last stretch straight to the goal
        while (cur[0]!==target[0]||cur[1]!==target[1]){
          const nx=cur[0]+Math.sign(target[0]-cur[0]), ny=cur[1]+Math.sign(target[1]-cur[1]);
          if (!inB(nx,ny)||cells[idx2(nx,ny)]!==0) break;
          cur=[nx,ny]; path.push(cur.slice());
        }
        break;
      }
      const steps=[];
      if (Math.abs(dx)>0) steps.push([cur[0]+Math.sign(dx),cur[1]]);
      if (Math.abs(dy)>0) steps.push([cur[0],cur[1]+Math.sign(dy)]);
      if (this.rand()<0.32){ // wiggle: keep the track winding with turns
        const perp=this.rand()<0.5? [0,Math.sign(dy)||1] : [Math.sign(dx)||1,0];
        steps.push([cur[0]+perp[0],cur[1]+perp[1]]);
      }
      if (this.rand()<0.18){ // long straight stretch
        const cont=[cur[0]+Math.sign(dx||1),cur[1]+Math.sign(dy||1)];
        steps.push([cont[0]+Math.sign(dx||1),cont[1]+Math.sign(dy||1)]);
      }
      const opts=steps.filter(([c,r])=>inB(c,r)&&c>=3&&r>=3&&c<=G-4&&r<=G-4
        &&cells[idx2(c,r)]===0&&!path.some(p=>p[0]===c&&p[1]===r));
      let next=null;
      if (opts.length) next=opts[Math.floor(this.rand()*opts.length)];
      else {
        const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dc,dr])=>[cur[0]+dc,cur[1]+dr])
          .filter(([c,r])=>inB(c,r)&&cells[idx2(c,r)]===0&&!path.some(p=>p[0]===c&&p[1]===r));
        if (nb.length) next=nb[Math.floor(this.rand()*nb.length)];
        else { path.pop(); cur=path[path.length-1]||[sc,sr]; continue; }
      }
      cur=next; path.push(cur.slice());
    }
    this.track=path;
    this.trackW=path.map(([c,r])=>this.eng.cellToWorld(c,r));
  }
  drawTrack(){
    const eng=this.eng, W=0.72;
    for(let i=0;i<this.trackW.length-1;i++){
      const a=this.trackW[i], b=this.trackW[i+1];
      const dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz);
      const seg=new THREE.Mesh(new THREE.BoxGeometry(W,0.03,len),
        new THREE.MeshBasicMaterial({color:0x4a5563,transparent:true,opacity:0.85}));
      seg.position.set((a.x+b.x)/2,0.015,(a.z+b.z)/2);
      seg.rotation.y=Math.atan2(dx,dz);
      eng.mapGroup.add(seg);
    }
    const s=this.trackW[0];
    const gate=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.03,24),
      new THREE.MeshBasicMaterial({color:0xef4444,transparent:true,opacity:0.55}));
    gate.position.set(s.x,0.02,s.z); eng.mapGroup.add(gate);
    const fin=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,0.03,24),
      new THREE.MeshBasicMaterial({color:0x4ade80,transparent:true,opacity:0.55}));
    fin.position.set(this.basePos.x,0.02,this.basePos.z); eng.mapGroup.add(fin);
  }
  baseSpotOk(c,r){
    if (c<4||r<4||c>G-6||r>G-6) return false;
    for(let rr=r;rr<r+2;rr++) for(let cc=c;cc<c+2;cc++){
      if (this.cells[idx(cc,rr)]!==0) return false;
    }
    return true;
  }
  placeBase(c,r){
    // base occupies 2x2 with top-left (c,r); snap to a nearby valid spot so
    // clicking next to a rock doesn't silently fail
    let found=null;
    outer:
    for (const [dc,dr] of [[0,0],[-1,0],[0,-1],[-1,-1],[1,0],[0,1],[1,1],[-1,1],[1,-1]]){
      if (this.baseSpotOk(c+dc,r+dr)){ found=[c+dc,r+dr]; break outer; }
    }
    if (!found) return false;
    c=found[0]; r=found[1];
    for(let rr=r;rr<r+2;rr++) for(let cc=c;cc<c+2;cc++) this.cells[idx(cc,rr)]=2;
    this.baseC=c; this.baseR=r;
    const p1=this.eng.cellToWorld(c,r), p2=this.eng.cellToWorld(c+1,r+1);
    this.basePos=new THREE.Vector3((p1.x+p2.x)/2,0,(p1.z+p2.z)/2);
    this.baseModel=this.eng.makeBase();
    this.baseModel.position.copy(this.basePos);
    this.eng.mapGroup.add(this.baseModel);
    this.rebuildField();
    // remember which border cells can reach the base — these must stay open
    this.protectedBorder=[];
    for(let i=0;i<G;i++){
      for (const bi of [idx(i,0),idx(i,G-1),idx(0,i),idx(G-1,i)])
        if (this.dist[bi]!==32767) this.protectedBorder.push(bi);
    }
    this.clearGhost();
    this.state='playing';
    this.eng.focus(this.basePos.x,this.basePos.z);
    TD.Audio.sfx('place');
    this.eng.ring(this.basePos,4,0x4ade80,0.6);
    if (this.eng.baseAura) this.eng.baseAura(this.basePos);
    if (TD.ui){ TD.ui.banner('DEFENSE READY','build your maze, then start the wave'); TD.ui.refreshTowerPanel(); }
    if (TD.Net&&TD.Net.connected&&TD.Net.role==='host') this.netMeta();
    return true;
  }
  // scorched-earth cleanup — kills every ghost bullet/missile/enemy between runs
  cleanupRun(){
    for (const e of this.enemies||[]) this.eng.scene.remove(e.model);
    for (const t of this.towers||[]){
      if (t.planes) for (const p of t.planes) this.eng.scene.remove(p.mesh);
      this.eng.scene.remove(t.model);
    }
    for (const p of this.projectiles||[]){
      if (p.mesh) p.kind==='missileP'? this.eng.freeMissileMesh(p.mesh) : this.freeShell(p.mesh);
    }
    for (const c of this.crates||[]) if(this.eng.mapGroup) this.eng.mapGroup.remove(c.model);
    this.enemies=[]; this.towers=[]; this.projectiles=[]; this.crates=[]; this.strikes=[];
    if (this.rangeRing){ this.eng.scene.remove(this.rangeRing); this.rangeRing=null; }
    if (this.cancelAiming) this.cancelAiming();
    this.overclockT=0; this.selected=null; this.waveActive=false; this.spawnQueue=[];
    this.clearGhost();
    if (TD.ui) TD.ui.bossBar(null);
  }
  quitRun(){
    this.state='menu'; this.showcase=false;
    this.cleanupRun();
    this.daily=null; this.rng=null;
  }
  /* ----- MODEL LAB — the TEST map: every unit on display ----- */
  startShowcase(){
    this.startRun(0,'easy',{towers:Object.keys(TD.TOWERS),blocks:Object.keys(TD.BLOCKS)},true);
    this.showcase=true; this.scT=0.5;
    this.placeBase(14,14);
    this.gold=999999;
    // all 15 turrets in a ring, each with a different upgrade build so cosmetics show
    const ids=Object.keys(TD.TOWERS);
    const builds=[[3,1,0],[3,0,1],[1,3,0],[0,3,1],[1,0,3],[0,1,3]];
    ids.forEach((id,i)=>{
      const a=i/ids.length*Math.PI*2;
      const c0=Math.round(14.5+Math.cos(a)*6.5), r0=Math.round(14.5+Math.sin(a)*6.5);
      this.setPlacing('tower',id);
      for (const [dc,dr] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){
        if (this.place(c0+dc,r0+dr)){
          const t=this.towers[this.towers.length-1];
          t.tiers=[...builds[i%builds.length]];
          t.computeSelf(); this.eng.applyCosmetics(t.model,id,t.tiers);
          break;
        }
      }
    });
    // one of every block in a display row
    const row=[['block',9,22],['block',9,22],['wire',11,22],['tar',13,22],['spike',15,22],['trap',17,22]];
    for (const [id,c,r] of row){ this.setPlacing('block',id); this.place(c,r); }
    this.setPlacing('tower','sniper'); this.place(9,22); // turret on the block stack
    this.clearGhost();
    this.recomputeStats();
    this.gold=999999;
    if (TD.ui) TD.ui.banner('MODEL LAB','every turret, block and vehicle — orbit around and inspect');
  }

  /* ----- flow field ----- */
  rebuildField(){
    const passable=i=>{ const v=this.cells[i]; return v===0||v===5; };
    const dist=this.dist=new Int16Array(G*G).fill(32767);
    const q=[];
    const bc=this.baseC, br=this.baseR;
    if (bc===undefined){ this.dir=new Array(G*G).fill(null); return; }
    for (let r=br-1;r<=br+2;r++) for(let c=bc-1;c<=bc+2;c++){
      if(!inB(c,r)) continue; const i=idx(c,r);
      if (this.cells[i]===2){ dist[i]=0; continue; }
      if (passable(i)){ dist[i]=1; q.push(i); }
    }
    let head=0;
    while(head<q.length){
      const i=q[head++], c=i%G, r=(i-c)/G, d=dist[i];
      for (const [nc,nr] of [[c+1,r],[c-1,r],[c,r+1],[c,r-1]]){
        if(!inB(nc,nr)) continue; const ni=idx(nc,nr);
        if (!passable(ni)||dist[ni]<=d+1) continue;
        dist[ni]=d+1; q.push(ni);
      }
    }
    const dir=this.dir=new Array(G*G).fill(null);
    for (let r=0;r<G;r++) for(let c=0;c<G;c++){
      const i=idx(c,r);
      if (!passable(i)||dist[i]===32767) continue;
      let bd=dist[i], best=null;
      for (let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        if(!dc&&!dr) continue;
        const nc=c+dc, nr=r+dr;
        if(!inB(nc,nr)) continue;
        const ni=idx(nc,nr);
        const target=this.cells[ni]===2? 0 : (passable(ni)? dist[ni] : 32767);
        if (target===32767) continue;
        if (dc&&dr){
          const o1=idx(c+dc,r), o2=idx(c,r+dr);
          if (!(passable(o1)||this.cells[o1]===2)) continue;
          if (!(passable(o2)||this.cells[o2]===2)) continue;
        }
        if (target<bd){ bd=target; best={dc,dr}; }
      }
      dir[i]=best;
    }
    for (const e of this.enemies) e.wp=null;
    this.eng.updateFlowArrows(
      dir.map(d=>d?{dx:d.dc,dz:d.dr}:null),
      Array.from(this.cells).map(v=>v!==0&&v!==5)
    );
  }
  borderOk(){
    if (!this.protectedBorder) return true;
    for (const bi of this.protectedBorder) if (this.dist[bi]===32767) return false;
    return true;
  }
  // wide line-of-sight over passable ground (center + two shoulders)
  losClear(x0,z0,x1,z1){
    const dx=x1-x0, dz=z1-z0, len=Math.hypot(dx,dz);
    if (len<0.01) return true;
    const px=-dz/len*0.55, pz=dx/len*0.55;
    const steps=Math.ceil(len/(C.CELL*0.45));
    for (let i=1;i<=steps;i++){
      const t=i/steps;
      for (const [ox,oz] of [[0,0],[px,pz],[-px,-pz]]){
        const c=this.eng.worldToCell({x:x0+dx*t+ox, z:z0+dz*t+oz});
        if (!inB(c.c,c.r)) return false;
        const v=this.cells[idx(c.c,c.r)];
        if (v!==0&&v!==5&&v!==2) return false;
      }
    }
    return true;
  }

  /* ----- placement ----- */
  wireCells(c,r){
    return this.placingRot%2===0? [[c,r],[c,r+1]] : [[c,r],[c+1,r]];
  }
  placeCellsFor(kind,id,c,r){
    if (kind==='block'&&TD.BLOCKS[id].len===2) return this.wireCells(c,r);
    return [[c,r]];
  }
  canPlace(c,r){
    if (!this.placing||!inB(c,r)) return {ok:false};
    const {kind,id}=this.placing;
    const def=kind==='tower'? TD.TOWERS[id] : TD.BLOCKS[id];
    const cost=this.costOf(kind,def);
    if (this.gold<cost) return {ok:false,reason:'gold'};
    const cellsNeeded=this.placeCellsFor(kind,id,c,r);
    for (const [cc,rr] of cellsNeeded){
      if (!inB(cc,rr)) return {ok:false,reason:'bounds'};
      if (isBorder(cc,rr)) return {ok:false,reason:'border'};
      const v=this.cells[idx(cc,rr)];
      if (v===1||v===2){
        if (kind==='tower'&&v===1&&this.bldgH&&this.bldgH[idx(cc,rr)]) continue; // rooftop slot
        return {ok:false,reason:'occupied'};
      }
    }
    const i=idx(c,r);
    if (kind==='tower'){
      if (this.towerMap[i]) return {ok:false,reason:'occupied'};
      if (this.groundMap[i]) return {ok:false,reason:'occupied'};
      if (this.stackH[i]>0) return {ok:true,cost,elev:this.stackH[i]}; // on a block: path unchanged
      if (this.bldgH&&this.bldgH[i]>0) return {ok:true,cost,elev:this.bldgH[i]}; // rooftop: path unchanged
      return this.horde? {ok:true,cost} : this.checkPathThenOk([ [c,r] ],cost);
    }
    // blocks
    if (def.id==='block'){
      if (this.towerMap[i]) return {ok:false,reason:'tower'};
      if (this.groundMap[i]) return {ok:false,reason:'occupied'};
      if (this.stackH[i]>=C.MAX_STACK) return {ok:false,reason:'stack'};
      if (this.stackH[i]>0) return {ok:true,cost};   // stacking on blocked cell
      return this.horde? {ok:true,cost} : this.checkPathThenOk([[c,r]],cost);
    }
    // walkable ground pieces
    for (const [cc,rr] of cellsNeeded){
      const ii=idx(cc,rr);
      if (this.cells[ii]!==0||this.towerMap[ii]||this.groundMap[ii]||this.stackH[ii]>0) return {ok:false,reason:'occupied'};
    }
    return {ok:true,cost};
  }
  checkPathThenOk(cellList,cost){
    for (const e of this.enemies){ if(e.dead||e.def.fly||e.absorbing) continue;
      const ec=e.cell();
      for (const [cc,rr] of cellList) if (ec.c===cc&&ec.r===rr) return {ok:false,reason:'enemy'};
    }
    const olds=cellList.map(([cc,rr])=>this.cells[idx(cc,rr)]);
    for (const [cc,rr] of cellList) this.cells[idx(cc,rr)]=3;
    this.rebuildField();
    const ok=this.borderOk();
    cellList.forEach(([cc,rr],k)=>this.cells[idx(cc,rr)]=olds[k]);
    this.rebuildField();
    return ok? {ok:true,cost} : {ok:false,reason:'seal'};
  }
  place(c,r){
    if (this.placing&&this.placing.kind==='base'){
      if (!this.placeBase(c,r)){ TD.Audio.sfx('error'); if(TD.ui) TD.ui.toast('Base needs clear ground, away from the edge'); }
      return;
    }
    const chk=this.canPlace(c,r);
    if (!chk.ok){ TD.Audio.sfx('error'); if(TD.ui) TD.ui.toast(this.placeError(chk.reason)); return false; }
    const {kind,id}=this.placing;
    const i=idx(c,r);
    this.gold-=chk.cost;
    if (kind==='tower'){
      const t=new Tower(this,id,c,r,chk.elev||0);
      this.towers.push(t); this.towerMap[i]=t;
      if (!this.stackH[i]&&!(this.bldgH&&this.bldgH[i])) this.cells[i]=3;
      this.eng.applyCosmetics(t.model,id,t.tiers);
      this.eng.dropIn(t.model);
    } else {
      const def=TD.BLOCKS[id];
      const cellsUsed=this.placeCellsFor(kind,id,c,r);
      const model=this.eng.makeBlock(def.id);
      let p;
      if (def.len===2){
        const [a,b]=cellsUsed;
        const pa=this.eng.cellToWorld(a[0],a[1]), pb=this.eng.cellToWorld(b[0],b[1]);
        p=new THREE.Vector3((pa.x+pb.x)/2,0,(pa.z+pb.z)/2);
        model.rotation.y=this.placingRot%2===0?0:Math.PI/2;
      } else p=this.eng.cellToWorld(c,r);
      const level=def.id==='block'? this.stackH[i] : 0;
      model.position.set(p.x,level*1.51,p.z);
      this.eng.mapGroup.add(model);
      const b={ isBlock:true, def, c, r, model, uses:def.uses||0, spent:def.cost, pos:p,
        cells:cellsUsed, level, cd:0, openT:0, trapState:'idle',
        hp:(def.hp||0)*(this.hasPerk('reinforced')?2:1) };
      model.userData.owner=b;
      this.blocks.push(b);
      if (def.id==='block'){ this.stackH[i]++; this.cells[i]=3;
        (this.cellStack[i]=this.cellStack[i]||[]).push(b); }
      else for (const [cc,rr] of cellsUsed){ this.cells[idx(cc,rr)]=5; this.groundMap[idx(cc,rr)]=b; }
      this.eng.dropIn(model);
    }
    this.rebuildField(); this.recomputeStats();
    TD.Audio.sfx('place');
    this.eng.burst(this.eng.cellToWorld(c,r).add(new THREE.Vector3(0,0.5,0)),0xffffff,6,2,0.3,4);
    if (TD.ui) TD.ui.updateHUD();
    return true;
  }
  /* SHIFT+click fill: covers the whole field, needs 500K gold, stacks over blocks */
  bulkPlace(c,r){
    if (!this.placing||this.placing.kind==='base') return;
    const {kind,id}=this.placing;
    const def=kind==='tower'? TD.TOWERS[id] : TD.BLOCKS[id];
    const cost=this.costOf(kind,def);
    if (this.gold<500000){ if(TD.ui) TD.ui.toast('SHIFT-FILL needs 500,000 gold'); TD.Audio.sfx('error'); return; }
    let placed=0;
    for(let rr=2;rr<G-2;rr++) for(let cc=2;cc<G-2;cc++){
      if (this.gold<cost) break;
      const i=idx(cc,rr);
      if (isBorder(cc,rr)) continue;
      if (this.towerMap[i]||this.groundMap[i]) continue;
      const v=this.cells[i];
      if (v===2) continue;
      if (kind==='tower'){
        if (v===1&&!(this.bldgH&&this.bldgH[i])) continue;
        const elev=(this.stackH[i]||(this.bldgH&&this.bldgH[i])||0);
        const t=new Tower(this,id,cc,rr,elev);
        this.towers.push(t); this.towerMap[i]=t;
        if (!this.stackH[i]&&!(this.bldgH&&this.bldgH[i])) this.cells[i]=3;
        this.eng.applyCosmetics(t.model,id,t.tiers);
        this.eng.dropIn(t.model);
        this.gold-=cost; placed++;
      } else if (def.id==='block'){
        if (v===1) continue;
        const model=this.eng.makeBlock(def.id);
        const p=this.eng.cellToWorld(cc,rr);
        const level=this.stackH[i];
        model.position.set(p.x,level*1.51,p.z);
        this.eng.mapGroup.add(model);
        const b={ isBlock:true, def, c:cc, r:rr, model, uses:0, spent:cost, pos:p, cells:[[cc,rr]],
          level, cd:0, openT:0, trapState:'idle', hp:(def.hp||0)*(this.hasPerk('reinforced')?2:1) };
        model.userData.owner=b;
        this.blocks.push(b);
        this.stackH[i]++; this.cells[i]=3;
        (this.cellStack[i]=this.cellStack[i]||[]).push(b);
        this.eng.dropIn(model);
        this.gold-=cost; placed++;
      } else {
        if (v!==0) continue;
        const model=this.eng.makeBlock(def.id);
        const p=this.eng.cellToWorld(cc,rr);
        model.position.set(p.x,0,p.z);
        this.eng.mapGroup.add(model);
        const b={ isBlock:true, def, c:cc, r:rr, model, uses:def.uses||0, spent:cost, pos:p, cells:[[cc,rr]],
          level:0, cd:0, openT:0, trapState:'idle', hp:(def.hp||0)*(this.hasPerk('reinforced')?2:1) };
        model.userData.owner=b;
        this.blocks.push(b);
        this.cells[i]=5; this.groundMap[i]=b;
        this.eng.dropIn(model);
        this.gold-=cost; placed++;
      }
    }
    this.rebuildField(); this.recomputeStats();
    if (TD.ui){ TD.ui.updateHUD(); TD.ui.toast('SHIFT-FILL: '+placed+' '+def.name+(placed?' deployed (over blocks too)':' — nothing left to fill')); }
    TD.Audio.sfx('place');
  }
  placeError(r){
    return { occupied:'Space occupied', gold:'Not enough gold', tower:'A turret is up there',
      enemy:'A vehicle is in the way', seal:"Can't fully seal the base!", stack:'Max stack height ('+C.MAX_STACK+')',
      border:'Too close to the edge', bounds:'Out of bounds',
      limit:'Block limit reached' }[r]||'Can’t build there';
  }
  /* ----- vehicles smashing player structures ----- */
  attackBlock(e,b){
    b.hp=(b.hp===undefined? b.def.hp : b.hp)-e.def.breakDmg;
    this.eng.shake(b.model);
    this.eng.burst(b.pos.clone().add(new THREE.Vector3(0,0.8+(b.level||0)*1.5,0)),0xc9d3dd,6,3,0.35,6);
    TD.Audio.sfx('hit');
    if (b.def.id==='wire') this.hitEnemy(e,b.def.dps*b.def.breakMul,{armorPierce:true}); // wire fights back 5x
    if (b.hp<=0) this.demolishBlock(b);
  }
  demolishBlock(b){
    const i=idx(b.c,b.r);
    if (b.def.id==='block'){
      const st=this.cellStack[i]||[];
      const k=st.indexOf(b); if (k>=0) st.splice(k,1);
      this.stackH[i]=st.length;
      st.forEach((blk,li)=>{ blk.level=li; blk.model.position.y=li*1.51; });
      const t=this.towerMap[i];
      if (t){ t.elev=st.length; t.pos.y=st.length*1.51; t.model.position.y=t.pos.y; }
      if (!st.length&&!t) this.cells[i]=0;
      this.eng.mapGroup.remove(b.model);
      this.blocks=this.blocks.filter(x=>x!==b);
      this.recomputeStats();
      this.rebuildField();
    } else this.breakBlock(b);
    this.eng.explosion(b.pos.clone(),1.2,0x9aa3ad);
    TD.Audio.sfx('explode');
    if (TD.ui){ TD.ui.toast('⚠ They smashed one of your blocks!'); TD.ui.updateHUD(); }
  }
  breakBlock(b){
    for (const [cc,rr] of b.cells){ const i=idx(cc,rr);
      delete this.groundMap[i]; if(this.cells[i]===5) this.cells[i]=0; }
    this.eng.mapGroup.remove(b.model);
    this.blocks=this.blocks.filter(x=>x!==b);
    this.rebuildField();
    this.eng.burst(b.pos.clone().add(new THREE.Vector3(0,0.4,0)),0x8d99ae,12,4,0.5,6);
  }
  sell(obj){
    if (this.netGuest){
      if (obj.isBlock) TD.Net.send({t:'sell',c:obj.c,r:obj.r});
      else TD.Net.send({t:'sell',i:obj.netIdx});
      this.select(null); return;
    }
    const refund=Math.round(obj.spent*this.sellRefund);
    if (obj.isBlock){
      const i=idx(obj.c,obj.r);
      if (obj.def.id==='block'){
        const st=this.cellStack[i]||[];
        if (this.towerMap[i]||st[st.length-1]!==obj){ TD.Audio.sfx('error'); if(TD.ui) TD.ui.toast('Remove what’s on top first'); return; }
        st.pop(); this.stackH[i]--;
        if (this.stackH[i]===0) this.cells[i]=0;
      } else {
        for (const [cc,rr] of obj.cells){ const ii=idx(cc,rr); delete this.groundMap[ii]; if(this.cells[ii]===5) this.cells[ii]=0; }
      }
      this.eng.mapGroup.remove(obj.model);
      this.blocks=this.blocks.filter(x=>x!==obj);
    } else {
      const i=idx(obj.c,obj.r);
      if (obj.planes) for (const p of obj.planes) this.eng.scene.remove(p.mesh);
      if (obj.barUnits) for (const u of obj.barUnits) this.eng.mapGroup.remove(u.model);
      this.eng.scene.remove(obj.model);
      this.towers=this.towers.filter(x=>x!==obj);
      delete this.towerMap[i];
      if (!this.stackH[i]&&!(this.bldgH&&this.bldgH[i])) this.cells[i]=0;
    }
    this.gold+=refund;
    this.rebuildField(); this.recomputeStats();
    if (this.selected===obj) this.select(null);
    TD.Audio.sfx('sell');
    this.eng.text(obj.pos,'+'+refund,'#fbbf24');
  }

  /* ----- upgrades ----- */
  canUpgrade(t,p){
    const nt=t.tiers[p]+1;
    if (nt>5) return {ok:false,why:'max'};
    if (nt>2 && t.tiers.some((v,i)=>i!==p&&v>2)) return {ok:false,why:'capped'};
    const total=t.tiers.reduce((a,b)=>a+b,0)+1;
    if (total>7) return {ok:false,why:'total'};
    const up=t.def.paths[p].tiers[nt-1];
    if (this.gold<up.cost) return {ok:false,why:'gold',cost:up.cost,up};
    return {ok:true,cost:up.cost,up};
  }
  upgrade(t,p){
    const chk=this.canUpgrade(t,p);
    if (!chk.ok){ TD.Audio.sfx('error'); return false; }
    if (this.netGuest){ TD.Net.send({t:'up',i:t.netIdx,p}); return true; }
    this.gold-=chk.cost; t.spent+=chk.cost; t.tiers[p]++;
    this.recomputeStats();
    this.eng.applyCosmetics(t.model,t.id,t.tiers);
    this.eng.burst(t.pos.clone().add(new THREE.Vector3(0,1.5,0)),0xffd166,14,3,0.5,3);
    TD.Audio.sfx('upgrade');
    return true;
  }
  recomputeStats(){
    for (const t of this.towers) t.computeSelf();
    const auras=this.towers.filter(t=>t.def.arche==='aura');
    for (const t of this.towers) t.applyAuras(auras);
    let mul=1, shield=0;
    for (const t of this.towers) if(t.def.arche==='repair'){ mul*=t.stats.baseHpMul; shield+=t.stats.shield; }
    const newMax=Math.round(this.diff.baseHp*(1+this.techBaseHp)*mul);
    if (newMax>this.baseMaxHp) this.baseHp+=newMax-this.baseMaxHp;
    this.baseMaxHp=newMax; this.baseHp=Math.min(this.baseHp,this.baseMaxHp);
    this.shieldMax=shield; this.shield=Math.min(this.shield,this.shieldMax);
  }
  cycleTargeting(t){ t.mode=(t.mode+1)%4; TD.Audio.sfx('ui'); }
  targetingName(t){ return ['FIRST','LAST','STRONG','CLOSE'][t.mode]; }

  /* ----- selection & ghost ----- */
  select(t){
    this.selected=t;
    if (this.rangeRing){ this.eng.scene.remove(this.rangeRing); this.rangeRing=null; }
    if (t&&!t.isBlock&&!t.rangeW&&t.stats) t.rangeW=()=>t.stats.range*C.CELL; // net puppets
    if (t&&!t.isBlock&&t.isCrate) { this.selected=null; return; }
    if (t&&!t.isBlock&&!t.isCrate){
      this.rangeRing=this.eng.makeRangeRing(t.rangeW(),0x7dd3fc);
      this.rangeRing.position.set(t.pos.x,t.pos.y,t.pos.z);
    }
    if (TD.ui) TD.ui.refreshTowerPanel();
  }
  refreshRing(){
    if (this.rangeRing&&this.selected){ this.eng.scene.remove(this.rangeRing);
      this.rangeRing=this.eng.makeRangeRing(this.selected.rangeW(),0x7dd3fc);
      this.rangeRing.position.set(this.selected.pos.x,this.selected.pos.y,this.selected.pos.z); }
  }
  setPlacing(kind,id){
    this.clearGhost();
    if (!id){ this.placing=null; this.eng.setPlacementMode(false); return; }
    this.placing={kind,id};
    this.ghost=this.eng.makeGhost(kind,id);
    this.eng.setPlacementMode(kind!=='base');
    if (this.state==='playing') this.select(null);
  }
  rotatePlacing(){
    if (!this.placing) return;
    this.placingRot=(this.placingRot+1)%2;
    if (this.ghost && this.placing.kind==='block'&&TD.BLOCKS[this.placing.id].len===2)
      this.ghost.rotation.y=this.placingRot%2===0?0:Math.PI/2;
    TD.Audio.sfx('ui');
  }
  clearGhost(){
    if (this.ghost){ this.eng.scene.remove(this.ghost); this.ghost=null; }
    this.placing=null; this.eng.setPlacementMode(false);
  }
  updateGhost(world,cellOv){
    if (!this.ghost||(!world&&!cellOv)) return;
    const c=cellOv||this.eng.worldToCell(world);
    if (!inB(c.c,c.r)){ this.ghost.visible=false; return; }
    this.ghost.visible=true;
    const {kind,id}=this.placing;
    if (kind==='base'){
      const p1=this.eng.cellToWorld(c.c,c.r), p2=this.eng.cellToWorld(c.c+1,c.r+1);
      this.ghost.position.set((p1.x+p2.x)/2,0,(p1.z+p2.z)/2);
      let ok=c.c>=4&&c.r>=4&&c.c<=G-6&&c.r<=G-6;
      if (ok) for(let rr=c.r;rr<c.r+2;rr++) for(let cc=c.c;cc<c.c+2;cc++) if(this.cells[idx(cc,rr)]!==0) ok=false;
      this.eng.setGhostValid(this.ghost,ok);
      this._ghostCell=c;
      return;
    }
    const def=kind==='tower'? TD.TOWERS[id] : TD.BLOCKS[id];
    let px,pz,py=0;
    if (def.len===2){
      const cellsUsed=this.wireCells(c.c,c.r);
      const pa=this.eng.cellToWorld(cellsUsed[0][0],cellsUsed[0][1]), pb=this.eng.cellToWorld(cellsUsed[1][0],cellsUsed[1][1]);
      px=(pa.x+pb.x)/2; pz=(pa.z+pb.z)/2;
    } else { const p=this.eng.cellToWorld(c.c,c.r); px=p.x; pz=p.z; }
    const i=idx(c.c,c.r);
    if (kind==='tower') py=(this.stackH[i]||(this.bldgH&&this.bldgH[i])||0)*1.51;
    if (kind==='block'&&def.id==='block') py=this.stackH[i]*1.51;
    this.ghost.position.set(px,py,pz);
    this._ghostCell=c;
    // quick validity (cheap checks only; full flood runs on click)
    const chkCells=this.placeCellsFor(kind,id,c.c,c.r);
    let ok=this.gold>=this.costOf(kind,def);
    for (const [cc,rr] of chkCells){
      if(!inB(cc,rr)||isBorder(cc,rr)){ ok=false; break; }
      const ii=idx(cc,rr), v=this.cells[ii];
      if (v===1||v===2){
        if (kind==='tower'&&v===1&&this.bldgH&&this.bldgH[ii]) continue; // rooftop slot
        ok=false; break;
      }
      if (kind==='tower'&&(this.towerMap[ii]||this.groundMap[ii])) ok=false;
      if (kind==='block'&&def.id==='block'&&(this.towerMap[ii]||this.groundMap[ii]||this.stackH[ii]>=C.MAX_STACK)) ok=false;
      if (kind==='block'&&def.id!=='block'&&(v!==0||this.towerMap[ii]||this.groundMap[ii]||this.stackH[ii]>0)) ok=false;
    }
    this.eng.setGhostValid(this.ghost,ok);
  }
  clickAt(world,cellOv){
    if (this.state!=='playing'&&this.state!=='prep') return;
    const c=cellOv||this.eng.worldToCell(world);
    if (!inB(c.c,c.r)) return;
    if (this.placing){
      if (this.netGuest){
        TD.Net.send({t:'place', kind:this.placing.kind, id:this.placing.id, c:c.c, r:c.r, rot:this.placingRot});
        return;
      }
      this.place(c.c,c.r); return;
    }
    const i=idx(c.c,c.r);
    const obj=this.towerMap[i]||this.groundMap[i]||((this.cellStack[i]||[]).slice(-1)[0])||null;
    this.select(obj);
  }

  /* ----- waves ----- */
  availableTypes(w){
    return Object.keys(TD.ENEMIES).filter(k=>{
      const d=TD.ENEMIES[k];
      return !d.boss&&!d.vip&&d.unlock<=w;
    });
  }
  rollAffix(type){
    const d=TD.ENEMIES[type];
    if (!d||d.boss||d.pack||this.wave<6) return null;
    const chance=0.08+this.wave*0.002;
    if (this.rand()<chance){
      const keys=Object.keys(TD.AFFIXES);
      return keys[Math.floor(this.rand()*keys.length)];
    }
    return null;
  }
  composeWave(w){
    const q=[];
    const isBoss=w%10===0;
    let budget=TD.waveBudget(w)*(isBoss?0.55:1)*(this.daily&&this.daily.mod.id==='swarm'?1.5:1);
    const types=this.availableTypes(w);
    const cost={junker:5,buggy:5,moto:2,rammer:8,apc:12,chopper:10,hauler:14,shieldvan:16,mechvan:14,prowler:12,digger:14,tank:28,gunship:18,racer:12};
    let t=0.5;
    const newest=types[types.length-1];
    while (budget>0){
      let type=types[Math.floor(this.rand()*types.length)];
      if (this.rand()<0.25) type=newest;
      const cst=cost[type]||6;
      const baseAngle=this.rand()*Math.PI*2;
      if (TD.ENEMIES[type].pack){
        const n=4+Math.floor(this.rand()*3); // swarms halved
        for(let i=0;i<n;i++){ q.push({type,t,angle:baseAngle+(this.rand()-0.5)*0.3}); t+=0.14; }
        budget-=cst*n;
      } else { q.push({type,t,angle:baseAngle}); t+=Math.max(0.25,0.9-w*0.012); budget-=cst; }
    }
    if (isBoss){
      const hard=this.diffId==='hard';
      const b = w>=30 ? (hard?'bossH':'boss3') : (w>=20?'boss2':'boss');
      q.push({type:b,t:t+1.5,angle:this.rand()*Math.PI*2});
      if (w>=30) q.push({type: hard?'boss3':'boss2', t:t+4,angle:this.rand()*Math.PI*2});
    }
    // graphics consolidation: low gfx swaps runs of weak cars for fewer, stronger ones
    // (same total HP per merged group — never more)
    const gfx=this.save&&this.save.settings? (this.save.settings.gfx===undefined?1:this.save.settings.gfx) : 1;
    if (gfx<1&&q.length){
      const K=Math.round(1+(1-gfx)*3);
      const WEAK=new Set(['junker','buggy','moto','racer','prowler','rammer']);
      const out=[];
      let run=[];
      const flush=()=>{
        for (let i=0;i<run.length;i+=K){
          const slice=run.slice(i,i+K);
          if (slice.length===1) out.push(slice[0]);
          else out.push(Object.assign({},slice[0],
            {hpMul:slice.length,goldMul:slice.length,sizeMul:Math.sqrt(slice.length)}));
        }
        run=[];
      };
      for (const sp of q){ if (WEAK.has(sp.type)) run.push(sp); else { flush(); out.push(sp); } }
      flush();
      return out;
    }
    return q;
  }
  startWave(){
    if (this.netGuest){ TD.Net.send({t:'wave'}); return; }
    if (this.state!=='playing') return;
    const netBn=(a,b)=>{ if(TD.Net&&TD.Net.connected&&TD.Net.role==='host') TD.Net.send({t:'bn',a,b}); };
    if (this.waveActive){
      // early call: bonus gold, waves overlap
      const bonus=Math.round((20+this.wave*3)*this.diff.goldMul);
      this.gold+=bonus;
      this.wave++;
      const q=this.composeWave(this.wave).map(sp=>({...sp,t:sp.t+this.spawnT+0.5}));
      this.spawnQueue=this.spawnQueue.concat(q).sort((a,b)=>a.t-b.t);
      TD.Audio.sfx('waveStart');
      return;
    }
    this.wave++;
    this.spawnQueue=this.composeWave(this.wave);
    if (!this.showcase&&this.wave>=10){
      const bucket=Math.floor(this.wave/10);
      if (this.vipBucket!==bucket){ this.vipBucket=bucket; this.vipInBucket=0; }
      const slot=this.wave%10;
      if (this.vipTotal<5&&this.vipInBucket<2&&(slot===0||slot===5)){
        const key=bucket*10+slot;
        if (this._vipSlot!==key){ this._vipSlot=key;
          this.spawnQueue.push({type:'vip',angle:Math.random()*Math.PI*2,t:0.8+Math.random()*4});
          this.vipTotal++; this.vipInBucket++;
        }
      }
    }
    this.spawnT=0; this.waveActive=true;
    TD.Audio.sfx('waveStart');
  }
  spawnEnemyAt(type,pos,wave){
    const e=new Enemy(this,type,0,wave);
    e.pos.set(pos.x+(Math.random()-0.5),0,pos.z+(Math.random()-0.5));
    e.model.position.copy(e.pos);
    this.enemies.push(e);
    return e;
  }
  endWave(){
    this.waveActive=false;
    const bonus=Math.round(TD.waveBonus(this.wave)*this.diff.goldMul*(1+this.techWaveBonus));
    this.gold+=bonus;
    let bankGold=0;
    for (const t of this.towers){
      if (t.def.arche!=='bank') continue;
      bankGold+=t.stats.goldWave;
      if (t.stats.interest) bankGold+=Math.min(100,Math.floor(this.gold*t.stats.interest));
      this.eng.text(t.pos,'+$','#fbbf24');
    }
    this.gold+=Math.round(bankGold);
    if (this.hasPerk('interest')) this.gold+=Math.min(150,Math.floor(this.gold*0.05));
    const res=TD.researchForWave(this.wave)+this.techResWave+(this.hasPerk('learner')?1:0);
    this.save.research+=res; this.runResearch+=res;
    const m=this.save.maps[this.map.id];
    m.bestWave=Math.max(m.bestWave,this.wave);
    if (this.endless) m.endlessBest=Math.max(m.endlessBest,this.wave);
    this.persist();
    TD.Audio.sfx('waveClear');
    if (!this.showcase) this.celebrate();
    if (this.wave%5===0) this.supplyDrop();   // supply crate every 5 cleared waves
    if (!this.showcase&&this.wave%10===0){
      const mGold=Math.round(250*this.diff.goldMul);
      this.gold+=mGold;
      this.supplyDrop(); this.supplyDrop(); this.supplyDrop();
      if (TD.ui){ TD.ui.banner('MILESTONE WAVE '+this.wave,'+$'+mGold+' · supply crates!'); TD.ui.toast('MILESTONE — bonus gold + supply drops!'); }
      TD.Audio.sfx('win');
    }
    if (!this.endless&&this.wave>=C.CAMPAIGN_WAVES){ this.finish(true); return; }
    // roguelite perk choice every 5 waves
    if (!this.showcase&&this.wave>0&&this.wave%5===0) this.offerPerks();
  }
  celebrate(){
    const R=this.eng.worldSize/2-4;
    const cols=[0xffd166,0xff6b9d,0x7dd3fc,0xa3e635,0xf472b6,0x38bdf8];
    const words=['WOOHOO!','NICE!','CLEARED!','ROCK ON!','BEAUTIFUL!'];
    for (let i=0;i<14;i++){
      const a=Math.random()*Math.PI*2, r=Math.random()*R;
      const p=new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r);
      const col=cols[i%cols.length];
      this.eng.ring(p,1+Math.random()*1.5,col,0.6);
      this.eng.burst(p.clone().setY(0.5),col,9,4,0.6,5);
      if (i%2===0) this.eng.text(p.clone().setY(1.4),words[(i/2)%words.length],'#'+new THREE.Color(col).getHexString(),true);
    }
    this.eng.shakeCam(0.35);
  }
  offerPerks(){
    const pool=TD.PERKS.filter(p=>!this.perks.includes(p.id));
    if (!pool.length||!TD.ui) return;
    const opts=[];
    while (opts.length<3&&pool.length) opts.push(pool.splice(Math.floor(this.rand()*pool.length),1)[0]);
    this.paused=true;
    TD.ui.showPerkChoice(opts,id=>this.applyPerk(id));
  }
  applyPerk(id){
    this.perks.push(id);
    this.paused=false;
    this.recomputeStats();
    TD.Audio.sfx('upgrade');
    const p=TD.PERKS.find(x=>x.id===id);
    if (TD.ui) TD.ui.banner('PERK ACQUIRED',p?p.name:'');
  }
  /* ----- abilities (charge with kills + time) ----- */
  castAbility(i){
    const ab=this.abilities&&this.abilities[i];
    if (!ab||this.state!=='playing') return;
    if (ab.charge<ab.def.need){ TD.Audio.sfx('error'); if(TD.ui) TD.ui.toast(ab.def.name+' still charging — kills speed it up'); return; }
    if (this.netGuest&&ab.def.id!=='orbital'){ TD.Net.send({t:'cast',i}); return; }
    if (ab.def.id==='orbital'){
      this.aiming=ab;
      if (!this.reticle) this.reticle=this.eng.makeReticle(3*C.CELL);
      this.reticle.visible=true;
      if (TD.ui) TD.ui.toast('Click anywhere to call the strike — ESC to cancel');
      TD.Audio.sfx('ui');
      return;
    }
    ab.charge=0;
    if (ab.def.id==='overclock'){
      this.overclockT=10;
      for (const t of this.towers) this.eng.burst(t.pos.clone().add(new THREE.Vector3(0,1.5,0)),0xffd166,6,2,0.4,3);
      TD.Audio.sfx('research');
      if (TD.ui) TD.ui.banner('OVERCLOCK','+50% fire rate for 10 seconds');
    } else if (ab.def.id==='aegis'){
      this.shield+=300;
      if (this.basePos) this.eng.ring(this.basePos,4.5,0x7dd3fc,0.7);
      TD.Audio.sfx('research');
      if (TD.ui) TD.ui.banner('AEGIS','+300 base shield');
    }
  }
  confirmAbility(world){
    if (!this.aiming||!world) return;
    const ab=this.aiming; this.aiming=null;
    if (this.reticle) this.reticle.visible=false;
    if (this.netGuest){ TD.Net.send({t:'cast',i:0,x:world.x,z:world.z}); ab.charge=0; return; }
    ab.charge=0;
    const pos=new THREE.Vector3(world.x,0,world.z);
    this.strikes.push({pos,t:1.2});
    this.eng.orbitalWarn(pos,3*C.CELL);
    TD.Audio.sfx('waveStart');
  }
  cancelAiming(){ this.aiming=null; if(this.reticle) this.reticle.visible=false; }
  updateAbilities(dt){
    if (!this.abilities) return;
    const rate=(this.waveActive?1:0.4)*(this.hasPerk('adrenaline')?1.5:1);
    for (const ab of this.abilities) ab.charge=Math.min(ab.def.need,ab.charge+rate*dt);
    if (this.overclockT>0) this.overclockT-=dt;
    for (let i=this.strikes.length-1;i>=0;i--){
      const st=this.strikes[i]; st.t-=dt;
      if (st.t<=0){
        this.strikes.splice(i,1);
        this.eng.orbitalHit(st.pos,3*C.CELL);
        TD.Audio.sfx('explode');
        for (const e of this.enemiesInRange(st.pos,3*C.CELL)) this.hitEnemy(e,400,{armorPierce:true});
      }
    }
  }
  /* ----- scrap crates (10s to grab) ----- */
  dropCrate(pos,vip){
    const model=this.eng.makeCrate();
    if (vip){
      model.scale.setScalar(2);
      if (this.eng.goldCrateGlow) this.eng.goldCrateGlow(model);
    }
    model.position.set(pos.x,0,pos.z);
    this.eng.mapGroup.add(model);
    const crate={ isCrate:true, model, ttl:vip?15:10, pos:pos.clone() };
    model.userData.owner=crate;
    this.crates.push(crate);
  }
  supplyDrop(){
    if (this.netGuest||this.crates.length>=3) return;
    const R=this.eng.worldSize/2-4;
    const pos=new THREE.Vector3((Math.random()-0.5)*R*2,0,(Math.random()-0.5)*R*2);
    const model=this.eng.makeCrate();
    model.position.set(pos.x,9,pos.z);
    this.eng.mapGroup.add(model);
    const crate={ isCrate:true, model, ttl:12, pos:pos.clone(), supply:true, fall:true };
    model.userData.owner=crate;
    this.crates.push(crate);
    this.eng.ring(pos,1.6,0x7dd3fc,0.5);
    this.eng.text(pos.clone().setY(1),'SUPPLY DROP','#7dd3fc',true);
  }
  collectCrate(crate,mul){
    if (this.netGuest){ TD.Net.send({t:'crate',cid:crate.cid}); return; }
    if (!this.crates.includes(crate)) return;
    const m=mul||1;
    this.eng.mapGroup.remove(crate.model);
    this.crates=this.crates.filter(c=>c!==crate);
    if (crate.supply){
      const roll=Math.random();
      if (roll<0.5){
        const gold=Math.round((30+this.wave*3)*this.diff.goldMul*m);
        this.gold+=gold;
        this.eng.text(crate.pos,'SUPPLY +$'+gold,'#ffd166',true);
      } else if (roll<0.7){
        this.overclockT=Math.max(this.overclockT,8);
        this.eng.text(crate.pos,'OVERCLOCK!','#ffd166',true);
      } else if (roll<0.85){
        this.shield+=150;
        this.eng.text(crate.pos,'+150 SHIELD','#7dd3fc',true);
      } else {
        this.save.research+=Math.round(8*m); this.runResearch+=Math.round(8*m);
        this.eng.text(crate.pos,'+'+Math.round(8*m)+' RESEARCH','#c084fc',true);
      }
      this.eng.ring(crate.pos,2.5,0x7dd3fc,0.6);
      this.eng.burst(crate.pos.clone().setY(0.5),0x7dd3fc,12,3,0.5,5);
      TD.Audio.sfx('gold');
    } else {
      const gold=Math.round((15+this.wave*2)*this.diff.goldMul*m);
      this.gold+=gold;
      this.eng.text(crate.pos,'+'+gold,'#ffd166',true);
      TD.Audio.sfx('gold');
      this.eng.burst(crate.pos.clone().setY(0.5),0xffd166,10,3,0.4,4);
    }
    if (TD.ui) TD.ui.updateHUD();
  }
  updateCrates(dt){
    for (let i=this.crates.length-1;i>=0;i--){
      const c=this.crates[i]; c.ttl-=dt;
      if (c.fall){
        c.model.position.y-=dt*7;
        if (c.model.position.y<=0){
          c.model.position.y=0; c.fall=false;
          this.eng.burst(c.pos.clone().setY(0.5),0x7dd3fc,8,3,0.4,4);
          TD.Audio.sfx('place');
        }
        continue;
      }
      // auto-collect magnet: crates drift to the nearest tower/base and get picked up
      let best=null,bd=Math.pow(4*C.CELL,2);
      if (this.basePos){ const dx=this.basePos.x-c.pos.x,dz=this.basePos.z-c.pos.z,d2=dx*dx+dz*dz; if(d2<bd){bd=d2;best=this.basePos;} }
      for (const t of this.towers){ const dx=t.pos.x-c.pos.x,dz=t.pos.z-c.pos.z,d2=dx*dx+dz*dz; if(d2<bd){bd=d2;best=t.pos;} }
      if (best){
        const dx=best.x-c.pos.x,dz=best.z-c.pos.z,d=Math.hypot(dx,dz);
        if (d<1.3*C.CELL){ this.collectCrate(c); continue; }
        const pull=Math.min(1,(4*C.CELL-d)/2);
        c.pos.x+=dx/d*dt*6*pull; c.pos.z+=dz/d*dt*6*pull;
        c.model.position.x=c.pos.x; c.model.position.z=c.pos.z;
      }
      c.model.position.y=0.15+Math.sin(this.eng.time*3+i)*0.08;
      c.model.rotation.y+=dt*1.2;
      if (c.ttl<3) c.model.visible=Math.sin(this.eng.time*10)>-0.4;
      if (c.ttl<=0){ this.eng.mapGroup.remove(c.model); this.crates.splice(i,1); }
    }
  }
  /* ----- daily run: seeded map, loadout & modifier, one attempt ----- */
  startDaily(){
    const today=new Date().toISOString().slice(0,10);
    if (this.save.daily&&this.save.daily.date===today&&this.save.daily.done){
      if (TD.ui) TD.ui.toast('Daily done — score '+(this.save.daily.score||0)+'. Come back tomorrow!');
      return false;
    }
    let seed=0; for (const ch of today) seed=(seed*31+ch.charCodeAt(0))>>>0;
    const rng=()=>{ seed=(seed+0x6D2B79F5)>>>0; let t=Math.imul(seed^(seed>>>15),1|seed);
      t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
    const mapId=Math.floor(rng()*TD.MAPS.length);
    const mod=TD.DAILYMODS[Math.floor(rng()*TD.DAILYMODS.length)];
    const ids=Object.keys(TD.TOWERS).sort(()=>rng()-0.5);
    const towers=[]; let pts=0;
    for (const id of ids){ const cst=TD.TOWERS[id].slotCost||1;
      if (pts+cst<=C.SLOT_POINTS&&towers.length<7){ towers.push(id); pts+=cst; } }
    const blocks=Object.keys(TD.BLOCKS).sort(()=>rng()-0.5).slice(0,3);
    this.save.daily={date:today,done:true,score:0};
    this.persist();
    this.pendingDaily={mod,date:today,rng};
    this.startRun(mapId,'normal',{towers,blocks},false);
    if (TD.ui) TD.ui.banner('DAILY RUN — '+mod.name,mod.desc+' · fixed loadout · one attempt');
    return true;
  }
  finish(win){
    this.state=win?'won':'lost';
    this.waveActive=false;
    // dramatic punch-in on the base
    if (this.basePos){ this.eng.focus(this.basePos.x,this.basePos.z);
      this.eng.tSize=Math.min(this.eng.tSize,14); this.eng.shakeCam(win?0.3:0.8); }
    if (TD.Net&&TD.Net.connected&&TD.Net.role==='host') TD.Net.send({t:'end',win});
    if (this.daily){
      const score=this.wave*100+this.runKills;
      const prev=(this.save.daily&&this.save.daily.score)||0;
      this.save.daily={date:this.daily.date,done:true,score:Math.max(score,prev)};
    }
    if (win){
      const m=this.save.maps[this.map.id];
      if (!m.stars.includes(this.diffId)) m.stars.push(this.diffId);
      this.save.research+=50; this.runResearch+=50;
      TD.Audio.sfx('win');
    } else TD.Audio.sfx('lose');
    if (TD.ui&&TD.ui.flash) TD.ui.flash(win?'green':'red',0.9);
    this.persist();
    if (TD.ui) TD.ui.showResults(win);
  }

  /* rewind one wave after a loss: 5 research, +1000 gold, fresh wave */
  continueFromWave(){
    if (this.state!=='lost'&&this.state!=='won') return;
    this.wave=Math.max(0,this.wave-1);
    this.gold+=1000;
    this.baseHp=this.baseMaxHp; this.shield=this.shieldMax; this.shieldT=0;
    for (const e of this.enemies||[]) this.eng.scene.remove(e.model);
    this.enemies=[]; this.projectiles=[]; this.strikes=[]; this.crates=[];
    this.spawnQueue=this.composeWave(this.wave); this.spawnT=0; this.waveActive=false;
    this.paused=false; this.state='playing';
    TD.Audio.sfx('gold');
    this.eng.burst(this.basePos.clone().setY(1),0x4ade80,16,4,0.5,5);
  }

  /* ----- combat helpers ----- */
  enemiesInRange(pos,rw,tower){
    const out=[];
    for (const e of this.enemies){ if(e.dead) continue;
      if (tower&&!tower.canSee(e)) continue;
      const dx=e.pos.x-pos.x,dz=e.pos.z-pos.z;
      if (dx*dx+dz*dz<=rw*rw) out.push(e); }
    return out;
  }
  enemiesInCone(pos,ang,rw,cone,tower){
    const out=[];
    for (const e of this.enemies){ if(e.dead) continue;
      if (tower&&!tower.canSee(e)) continue;
      const dx=e.pos.x-pos.x,dz=e.pos.z-pos.z, d2=dx*dx+dz*dz;
      if (d2>rw*rw) continue;
      let da=Math.atan2(dx,dz)-ang;
      while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI;
      if (Math.abs(da)<=cone) out.push(e);
    }
    return out;
  }
  shieldAuraFor(e){
    let a=0;
    for (const s of this.enemies){
      if (s.dead||!s.def.shieldAura) continue;
      const dx=s.pos.x-e.pos.x, dz=s.pos.z-e.pos.z, rr=s.def.shieldRad*C.CELL;
      if (dx*dx+dz*dz<rr*rr) a+=s.def.shieldAura;
    }
    return Math.min(a,8);
  }
  ramExplode(e,b){
    this.eng.explosion(e.center(),2.2,0xff6b3d);
    this.eng.debris(e.center(),e.def.color,6);
    this.eng.shakeCam(0.9);
    TD.Audio.sfx('explode');
    b.hp=(b.hp===undefined?b.def.hp:b.hp)-250;
    if (b.hp<=0) this.demolishBlock(b); else this.eng.shake(b.model);
    e.remove(false); // it blew itself up — no bounty
  }
  hitEnemy(e,dmg,opts,crit){
    if (e.dead||e.absorbing||e.falling) return;
    let d=dmg;
    if (e.def.boss){
      if (e.escorts&&e.escorts.some(x=>!x.dead)) d*=0.1;  // escort shield up
      if (e.exposedT>0) d*=2;                              // core exposed
    }
    if (!(opts&&opts.armorPierce)){
      const armor=(e.armor||0)+this.shieldAuraFor(e);
      if (armor) d=Math.max(1,d-armor);
    }
    if (e.markAmp) d*=1+e.markAmp;
    if (e.stunT>0) d*=1.5;   // synergy: stalled vehicles take bonus damage from everything
    e.hp-=d; e.flashT=1;
    this.eng.burst(e.center(),0xffd28a,2,2.5,0.2,5);
    if (crit) this.eng.text(e.center(),Math.round(d)+'!','#ff6b6b',true);
    else if (d>=40) this.eng.text(e.center(),Math.round(d),'#fff');
    if (opts&&opts.poison) e.applyPoison(opts.poison.dps,opts.poison.dur,opts.poison.stacks);
    TD.Audio.sfx('hit');
    if (e.hp<=0){ this.awardKill(e,opts&&opts.tower); this.destroyEnemy(e); }
  }
  dotDamage(e,d,color){
    if (e.dead||e.absorbing||e.falling||d<=0) return;
    e.hp-=d;
    if (Math.random()<0.06) this.eng.burst(e.center(),color,2,1.5,0.3,2);
    if (e.hp<=0){ this.awardKill(e,null); this.destroyEnemy(e); }
  }
  awardKill(e,tower){
    if (tower){
      // veterancy: turrets rank up through kills
      const r0=this.rankOf(tower.kills);
      tower.kills++;
      const r1=this.rankOf(tower.kills);
      if (r1>r0){
        this.recomputeStats();
        this.eng.rankBadge(tower.model,r1);
        this.eng.ring(tower.pos,1.5,0xffd166,0.5);
        this.eng.text(tower.pos.clone(),'RANK UP!','#ffd166',true);
        TD.Audio.sfx('upgrade');
      }
    }
    this.runKills++;
    let gold=Math.round(e.def.gold*(e.goldMul||1)*this.diff.goldMul);
    for (const t of this.towers){
      if (t.stats&&t.stats.killGold){
        const dx=e.pos.x-t.pos.x,dz=e.pos.z-t.pos.z, rr=t.rangeW();
        if (dx*dx+dz*dz<rr*rr) gold+=t.stats.killGold;
      }
    }
    const af=e.affix? TD.AFFIXES[e.affix] : null;
    if (af) gold=Math.round(gold*af.goldMul);
    if (this.hasPerk('bounty')) gold=Math.round(gold*1.25);
    if (this.daily&&this.daily.mod.id==='fortune') gold=Math.round(gold*1.3);
    if (this.hasPerk('hometurf')&&this.basePos){
      const dx=e.pos.x-this.basePos.x, dz=e.pos.z-this.basePos.z;
      if (dx*dx+dz*dz<Math.pow(4*C.CELL,2)) gold*=2;
    }
    this.gold+=gold;
    if (e.def.gold>=10||af) this.eng.text(e.center(),'+'+gold,af?'#ffd166':'#fbbf24',!!af);
    // kills feed the ability charge
    if (this.abilities){
      const k=2*(this.hasPerk('adrenaline')?1.5:1);
      for (const ab of this.abilities) ab.charge=Math.min(ab.def.need,ab.charge+k);
    }
    // kill streaks — chain kills for bonus gold + a flashy callout
    if (this.killT>0) this.streak=(this.streak||0)+1; else this.streak=1;
    this.killT=1.6;
    if (this.streak>=5&&this.streak%5===0){
      const bonus=Math.min(50,this.streak*2);
      this.gold+=bonus;
      this.eng.text(e.center(),'RAMPAGE x'+this.streak+'!  +$'+bonus,'#ff6b6b',true);
      this.eng.shakeCam(0.25);
      TD.Audio.sfx('research');
    }
    // scrap crates
    if (!this.showcase&&Math.random()<0.12*(this.hasPerk('scavenger')?2:1)) this.dropCrate(e.pos);
    // golden VIP: guaranteed one big crate
    if (!this.showcase&&e.def.vip){
      this.dropCrate(e.pos,true);
      this.eng.ring(e.pos,3,0xffd166,0.7);
      this.eng.shakeCam(0.5);
    }
  }
  destroyEnemy(e){
    if (e.dead) return;
    TD.Audio.sfx('squish');
    this.eng.explosion(e.center(),1.2,0xff9d5c);
    this.eng.burst(e.center(),0x53575e,10,3,0.6,6);
    this.eng.debris(e.center(),e.def.color,4+Math.round(e.def.size*2));
    if (e.def.gold>=15||e.def.boss) this.eng.shakeCam(e.def.boss?1:0.35);
    if (e.def.splits) for(let i=0;i<e.def.splitN;i++) this.spawnEnemyAt(e.def.splits,e.pos,this.wave);
    if (e.poisons.length&&this.towers.some(t=>t.def.arche==='dart'&&t.stats.spreadOnDeath)){
      const p=e.poisons[0];
      for (const o of this.enemiesInRange(e.pos,1.6*C.CELL)) if(!o.dead&&o!==e) o.applyPoison(p.dps,2,3);
      this.eng.ring(e.pos,1.6*C.CELL,0xa3e635,0.35);
    }
    e.remove(true);
  }
  damageBase(d){
    if (this.state!=='playing') return;
    if (this.showcase){ this.baseHp=this.baseMaxHp; return; } // lab dummies can't hurt you
    this.shieldT=12;
    if (this.shield>0){ const a=Math.min(this.shield,d); this.shield-=a; d-=a; }
    if (d>0){ this.baseHp-=d; TD.Audio.sfx('baseHit'); this.eng.shakeCam(Math.min(0.9,0.25+d/400));
      if (TD.ui&&TD.ui.flash) TD.ui.flash('red',Math.min(0.6,0.25+d/500)); }
    this.eng.setBaseStress(this.baseModel,Math.max(0,this.baseHp/this.baseMaxHp));
    if (this.baseHp<=0){ this.baseHp=0; this.finish(false); }
  }

  /* ----- projectiles ----- */
  getShellMesh(color,r=0.14){
    let m=this.shellPool.pop();
    if (!m) m=new THREE.Mesh(new THREE.SphereGeometry(1,8,6), new THREE.MeshBasicMaterial({color:0xffffff}));
    m.material.color.set(color); m.scale.setScalar(r);
    m.visible=true; this.eng.scene.add(m);
    return m;
  }
  freeShell(m){ m.visible=false; this.eng.scene.remove(m); this.shellPool.push(m); }
  updateProjectiles(dt){
    for (let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i]; let done=false;
      if (p.kind==='arc'){
        p.t+=dt;
        if (p.t>=p.dur){
          done=true;
          this.eng.explosion(p.to,p.splash*C.CELL,0xffa94d);
          TD.Audio.sfx('explode');
          for (const e of this.enemiesInRange(p.to,p.splash*C.CELL)){
            if (e.def.fly) continue;
            this.hitEnemy(e,p.dmg,p.opts);
            if (p.stun&&Math.random()<p.stun) e.applyStun(p.stunDur);
          }
        } else if (p.t>0){
          const k=p.t/p.dur;
          p.mesh.position.set(
            THREE.MathUtils.lerp(p.from.x,p.to.x,k),
            THREE.MathUtils.lerp(p.from.y,p.to.y,k)+Math.sin(k*Math.PI)*7,
            THREE.MathUtils.lerp(p.from.z,p.to.z,k));
        }
      } else if (p.kind==='missileP'){
        if (p.delay>0){ p.delay-=dt; p.mesh.visible=false; }
        else {
          p.mesh.visible=true;
          p.life-=dt;
          const tgt=p.target&&!p.target.dead? p.target.center() : p.lastPos;
          if (!tgt||p.life<=0) done=true;
          else {
            p.lastPos=tgt.clone? tgt.clone() : tgt;
            const dNow=p.pos.distanceTo(tgt);
            p.spd=Math.min(30*(p.projMul||1), p.spd+42*dt);       // ignition: accelerates hard
            p.turn=(p.turn||1.4)+dt*6;                            // steering authority ramps up
            const closeBoost=dNow<5? 4.5:1;                       // terminal guidance: hard lock-on dive
            const desired=new THREE.Vector3().subVectors(tgt,p.pos).normalize();
            p.dir.lerp(desired,Math.min(1,p.turn*closeBoost*dt)).normalize();
            p.pos.addScaledVector(p.dir,p.spd*dt);
            p.mesh.position.copy(p.pos);
            p.mesh.lookAt(p.pos.clone().add(p.dir));
            if (p.mesh.userData.jet) p.mesh.userData.jet.scale.setScalar(1+Math.random()*0.7);
            this.eng.burst(p.pos.clone().addScaledVector(p.dir,-0.35),0xffb36b,1,0.4,0.14,0);
            if (Math.random()<0.55) this.eng.burst(p.pos.clone().addScaledVector(p.dir,-0.45),0x9aa3ad,1,0.3,0.55,-0.6);
            // proximity fuse: direct hit OR the moment it starts flying past the target
            const flyby=p.prevD!==undefined && dNow>p.prevD && dNow<2.4;
            p.prevD=dNow;
            if (dNow<1.15||flyby){
              done=true;
              this.eng.explosion(p.pos,p.splash*C.CELL,0xffc46b); TD.Audio.sfx('explode');
              for (const en of this.enemiesInRange(p.pos,p.splash*C.CELL)) this.hitEnemy(en,p.dmg,p.opts);
            }
          }
        }
      } else if (p.kind==='homing'){
        const tgt=p.target&&!p.target.dead? p.target.center() : p.lastPos;
        if (!tgt) done=true;
        else {
          p.lastPos=tgt.clone? tgt.clone() : tgt;
          if (p.accel) p.spd+=p.accel*dt;
          const dir=new THREE.Vector3().subVectors(tgt,p.pos);
          const d=dir.length();
          if (d<0.5){
            done=true;
            if (p.splash){
              this.eng.explosion(p.pos,p.splash*C.CELL,0xffc46b); TD.Audio.sfx('explode');
              for (const e of this.enemiesInRange(p.pos,p.splash*C.CELL)) this.hitEnemy(e,p.dmg,p.opts);
            } else if (p.target&&!p.target.dead){
              this.hitEnemy(p.target,p.dmg,p.opts);
              if (p.poison) p.target.applyPoison(p.poison.dps,p.poison.dur,p.poison.stacks);
            }
          } else {
            p.pos.addScaledVector(dir.normalize(),Math.min(d,p.spd*dt));
            p.mesh.position.copy(p.pos);
            if (p.trail&&Math.random()<0.5) this.eng.burst(p.pos,p.trail,1,0.5,0.25,0);
          }
        }
      }
      if (done){
        if (p.mesh){ p.kind==='missileP'? this.eng.freeMissileMesh(p.mesh) : this.freeShell(p.mesh); }
        this.projectiles.splice(i,1);
      }
    }
  }

  /* ----- trapdoors ----- */
  updateTraps(dt){
    for (const b of this.blocks){
      if (b.def.id!=='trap') continue;
      if (b.cd>0) b.cd-=dt;
      const onCell=()=>this.enemies.filter(e=>!e.dead&&!e.def.fly&&!e.absorbing&&!e.falling&&(()=>{const c=e.cell();return c.c===b.c&&c.r===b.r;})());
      if (b.trapState==='idle'){
        if (b.cd<=0&&onCell().length){ b.trapState='opening'; TD.Audio.sfx('ui'); }
      } else if (b.trapState==='opening'){
        b.openT=Math.min(1,b.openT+dt*5);
        this.eng.setTrapOpen(b.model,b.openT);
        if (b.openT>=1){ b.trapState='swallow'; b.swT=0.8; b.points=b.def.capacity; }
      } else if (b.trapState==='swallow'){
        b.swT-=dt;
        for (const e of onCell()){
          // the Juggernaut is too big to swallow — it takes 35% max HP and slams the doors
          if (e.def.boss){
            if (b.points>=21){ b.points=0;
              this.hitEnemy(e,Math.round(e.maxHp*0.35),{armorPierce:true});
              this.eng.shakeCam(0.8);
              this.eng.burst(e.center(),0x8d99ae,14,4,0.5,6);
              this.eng.text(e.center(),'-35%','#ffd166',true);
            }
            continue;
          }
          const w=e.hp>600?21:(e.hp>300?7:3);
          if (b.points>=w){ b.points-=w; e.startFalling(); this.eng.burst(e.center(),0x8d99ae,6,2,0.3,6); }
        }
        if (b.swT<=0) b.trapState='closing';
      } else if (b.trapState==='closing'){
        b.openT=Math.max(0,b.openT-dt*4);
        this.eng.setTrapOpen(b.model,b.openT);
        if (b.openT<=0){ b.trapState='idle'; b.cd=b.def.cooldown; }
      }
    }
  }

  /* ----- detection ----- */
  updateDetection(){
    const dets=[];
    for (const t of this.towers) if (t.stats&&t.stats.detect) dets.push({pos:t.pos,r:t.rangeW()});
    for (const e of this.enemies){
      if (!e.stealth||e.dead) continue;
      let vis=false;
      for (const d of dets){ const dx=e.pos.x-d.pos.x,dz=e.pos.z-d.pos.z;
        if (dx*dx+dz*dz<d.r*d.r){ vis=true; break; } }
      e.detected=vis;
      const hidden=!vis;
      if (hidden!==e._wasHidden){ this.eng.setStealth(e.model,hidden); e._wasHidden=hidden; }
    }
  }

  /* ----- main update ----- */
  update(dt){
    if (this.netGuest){ this.guestTick(dt); return; }  // replica world: host simulates
    if ((this.state!=='playing'&&this.state!=='prep')||this.paused) return;
    if (this.state==='prep') return; // just the ghost, no sim yet
    this.updateAbilities(dt);
    if (this.killT>0) this.killT-=dt;
    this.updateCrates(dt);
    // model lab: a steady parade of every vehicle type
    if (this.showcase){
      this.scT-=dt;
      if (this.scT<=0 && this.enemies.length<22){
        this.scT=1.4;
        const types=Object.keys(TD.ENEMIES).filter(k=>!TD.ENEMIES[k].boss);
        const type=Math.random()<0.04? 'boss' : types[Math.floor(Math.random()*types.length)];
        this.enemies.push(new Enemy(this,type,Math.random()*Math.PI*2,6));
      }
    }
    if (this.waveActive&&this.spawnQueue.length){
      this.spawnT+=dt;
      while (this.spawnQueue.length&&this.spawnQueue[0].t<=this.spawnT){
        const s=this.spawnQueue.shift();
        if (this.enemies.filter(e=>!e.dead).length<C.MAX_ENEMIES){
          const e=new Enemy(this,s.type,s.angle,this.wave,this.rollAffix(s.type),s);
          this.enemies.push(e);
          if (TD.ENEMIES[s.type]&&TD.ENEMIES[s.type].boss){
            // escort shield vans: boss is near-invulnerable until they die
            const v1=new Enemy(this,'shieldvan',s.angle-0.14,this.wave);
            const v2=new Enemy(this,'shieldvan',s.angle+0.14,this.wave);
            this.enemies.push(v1,v2);
            e.escorts=[v1,v2];
            e.shieldDome=this.eng.makeBossDome();
            e.shieldDome.position.y=0.8;
            e.model.add(e.shieldDome);
            if (TD.ui) TD.ui.bossBar(e);
          }
        }
      }
    }
    for (const t of this.towers) t.update(dt);
    for (const e of this.enemies) e.update(dt);
    this.enemies=this.enemies.filter(e=>!e.dead);
    this.updateProjectiles(dt);
    this.updateTraps(dt);
    this.updateDetection();
    let heal=this.techRegen;
    for (const t of this.towers) if (t.def.arche==='repair'){
      let h=t.stats.heal;
      if (t.stats.lowBoost&&this.baseHp<this.baseMaxHp*0.4) h*=2;
      heal+=h;
    }
    if (heal>0&&this.baseHp<this.baseMaxHp&&this.baseHp>0){
      this.baseHp=Math.min(this.baseMaxHp,this.baseHp+heal*dt);
      this.eng.setBaseStress(this.baseModel,this.baseHp/this.baseMaxHp);
    }
    if (this.shieldMax>0){ this.shieldT-=dt;
      if (this.shieldT<=0&&this.shield<this.shieldMax) this.shield=Math.min(this.shieldMax,this.shield+15*dt); }
    if (this.waveActive&&!this.spawnQueue.length&&!this.enemies.length) this.endWave();
    if (TD.Net&&TD.Net.connected&&TD.Net.role==='host') this.hostSync(dt);
  }
};
TD._applyMod=applyMod;
})();

/* ============ CO-OP: host-authoritative sync layer ============ */
(function(){
const C=TD.CONFIG;
const TIDX=Object.keys(TD.TOWERS), EIDX=Object.keys(TD.ENEMIES), BIDX=Object.keys(TD.BLOCKS);
const P=TD.Game.prototype;

P.netInit=function(){
  const g=this;
  TD.Net.onMsg=m=>g.netMsg(m);
  TD.Net.onClose=()=>{ if(TD.ui) TD.ui.toast('⚠ Co-op partner disconnected'); g.netGuest=false; };
  this._nid=1; this.netT=0; this.netFx=[];
  if (TD.Net.role==='guest'){ this.netGuest=true; }
  // host: mirror every real FX call to the guest (true fidelity, not fakes)
  if (TD.Net.role==='host'&&!this.eng._netWrapped){
    const eng=this.eng; eng._netWrapped=true;
    const push=ev=>{ if(TD.Net.connected&&g.netFx&&g.netFx.length<90) g.netFx.push(ev); };
    const f2=v=>+v.toFixed(1);
    const oBeam=eng.beam.bind(eng);
    eng.beam=(a,b,c2,th,li)=>{ oBeam(a,b,c2,th,li); push(['b',f2(a.x),f2(a.y),f2(a.z),f2(b.x),f2(b.y),f2(b.z),c2,th||0.08]); };
    const oExp=eng.explosion.bind(eng);
    eng.explosion=(p,r,c2)=>{ oExp(p,r,c2); push(['e',f2(p.x),f2(p.y||1),f2(p.z),f2(r||1),c2||0xffa94d]); };
    const oLtn=eng.lightning.bind(eng);
    eng.lightning=(a,b,c2,li)=>{ oLtn(a,b,c2,li); push(['l',f2(a.x),f2(a.y),f2(a.z),f2(b.x),f2(b.y),f2(b.z),c2]); };
    const oRing=eng.ring.bind(eng);
    eng.ring=(p,r,c2,li)=>{ oRing(p,r,c2,li); push(['r',f2(p.x),f2(p.z),f2(r||1),c2]); };
    const oMuz=eng.muzzleFlash.bind(eng);
    eng.muzzleFlash=(p,c2,s2)=>{ oMuz(p,c2,s2); push(['m',f2(p.x),f2(p.y),f2(p.z),c2||0xffe8a0,s2||1]); };
  }
};
P.netMsg=function(m){
  if (TD.Net.role==='host') return this.hostCmd(m);
  if (m.t==='meta') this.guestMeta(m);
  else if (m.t==='s') this.guestSnap(m);
  else if (m.t==='bn'&&TD.ui) TD.ui.banner(m.a,m.b||'');
  else if (m.t==='toast'&&TD.ui) TD.ui.toast(m.m);
  else if (m.t==='end'&&TD.ui){ this.state=m.win?'won':'lost'; TD.ui.showResults(m.win); }
};
/* ---- host: apply guest commands ---- */
P.hostCmd=function(m){
  if (this.state!=='playing'&&this.state!=='prep') return;
  if (m.t==='place'){
    this.placingRot=m.rot||0; this.setPlacing(m.kind,m.id);
    const ok=this.place(m.c,m.r); this.clearGhost();
    if (!ok) TD.Net.send({t:'toast',m:'Partner: build blocked there'});
  }
  else if (m.t==='up'){ const t=this.towers[m.i]; if(t) this.upgrade(t,m.p); }
  else if (m.t==='sell'){
    if (m.i!==undefined){ const t=this.towers[m.i]; if(t) this.sell(t); }
    else { const b=this.blocks.find(b2=>b2.c===m.c&&b2.r===m.r); if(b) this.sell(b); }
  }
  else if (m.t==='wave') this.startWave();
  else if (m.t==='cast'){
    const ab=this.abilities&&this.abilities[m.i];
    if (m.i===0&&ab&&ab.charge>=ab.def.need){ this.aiming=ab; this.confirmAbility(new THREE.Vector3(m.x,0,m.z)); }
    else this.castAbility(m.i);
  }
  else if (m.t==='crate'){ const cr=this.crates.find(c2=>c2.cid===m.cid); if(cr) this.collectCrate(cr); }
};
P.netMeta=function(){
  if (!TD.Net.connected||TD.Net.role!=='host'||!this.map) return;
  TD.Net.send({t:'meta', map:this.map.id, diff:this.diffId, loadout:this.loadout,
    horde:this.horde?1:0, track:this.track||null, baseC:this.baseC, baseR:this.baseR});
};
P.hostSync=function(dt){
  this.netT=(this.netT||0)-dt;
  if (this.netT>0) return;
  this.netT=0.085;
  const en=this.enemies.map(e=>{
    if (!e.nid) e.nid=this._nid++;
    return [e.nid, EIDX.indexOf(e.type), +e.pos.x.toFixed(1), +e.pos.z.toFixed(1),
      +e.model.rotation.y.toFixed(1), +(e.hp/e.maxHp).toFixed(2),
      (e._wasHidden?1:0)|(e.burrowed?2:0)|(e.absorbing?4:0)|((e.escorts&&e.escorts.some(x=>!x.dead))?8:0)];
  });
  // replicated projectiles: guest renders the REAL shells and missiles
  const pr=this.projectiles.map(p=>{
    const pos=p.kind==='arc'? (p.mesh?p.mesh.position:p.from) : p.pos;
    return [p.kind==='missileP'?1:0, +pos.x.toFixed(1), +pos.y.toFixed(1), +pos.z.toFixed(1)];
  });
  const tw=this.towers.map((t,i)=>[i,TIDX.indexOf(t.id),t.c,t.r,t.tiers[0],t.tiers[1],t.tiers[2],t.elev||0,t.kills]);
  const bl=this.blocks.map(b=>[BIDX.indexOf(b.def.id),b.c,b.r,(b.model.rotation.y>0.5?1:0),b.level||0,
    (b.trapState==='opening'||b.trapState==='swallow')?1:0]);
  const cr=this.crates.map(c2=>{ if(!c2.cid) c2.cid=this._nid++; return [c2.cid,+c2.pos.x.toFixed(1),+c2.pos.z.toFixed(1)]; });
  TD.Net.send({t:'s', g:Math.floor(this.gold), bh:Math.ceil(this.baseHp), bm:this.baseMaxHp,
    sh:Math.ceil(this.shield||0), w:this.wave, wa:this.waveActive?1:0,
    ab:this.abilities? this.abilities.map(a=>+(a.charge/a.def.need).toFixed(2)) : [],
    en, tw, bl, cr, pr, fx:this.netFx.splice(0)});
};
/* ---- guest: replica world ---- */
P.puppetStats=function(id,tiers,elev){
  const d=TD.TOWERS[id];
  const s={ range:d.range, rof:d.rof, dmg:d.dmg, pellets:d.pellets||0, cone:d.cone||0, splash:d.splash||0,
    minRange:d.minRange||0, chain:d.chain||0, chainRange:d.chainRange||0, volley:d.volley||1,
    slow:d.slow||0, slowDur:d.slowDur||0, burnDps:d.burnDps||0, burnDur:d.burnDur||0,
    poisonDps:d.poisonDps||0, poisonDur:d.poisonDur||0, stacks:d.stacks||0,
    mark:d.mark||0, markDur:d.markDur||0, detect:!!d.detect, aim:1, proj:1,
    heal:d.heal||0, goldWave:d.goldWave||0, interest:0, killGold:0,
    buffDmg:d.buffDmg||0, buffRof:0, buffRange:0, buffDetect:false,
    armorPierce:false, critProb:0, critMul:2, stunProb:0, stunDur:0, pierce:0,
    freezeProb:0, freezeDur:0, spreadOnDeath:false, lowBoost:false, baseHpMul:1, shield:0, targets:d.targets };
  tiers.forEach((tier,pi)=>{ for(let k=0;k<tier;k++) TD._applyMod(s,d.paths[pi].tiers[k].mod); });
  s.range+=(elev||0)*C.ELEV_RANGE_BONUS;
  if (TD.materialOf&&TD.materialOf(id)==='gold'){ s.dmg*=1.30; s.rof*=1.20; s.range*=1.15; }
  return s;
};
P.guestMeta=function(m){
  if (this.puppets){ // re-entering: clear the old replica completely
    for (const [,p] of this.puppets.en) this.eng.scene.remove(p.model);
    for (const [,p] of this.puppets.tw) this.eng.scene.remove(p.model);
    for (const p of (this.puppets.pr||[])) if(p.mesh) p.kind===1? this.eng.freeMissileMesh(p.mesh):this.freeShell(p.mesh);
  }
  this.map=TD.MAPS[m.map]; this.diffId=m.diff; this.diff=TD.DIFFICULTY[m.diff];
  this.loadout=m.loadout; this.horde=!!m.horde;
  if (m.track&&m.track.length){
    this.track=m.track;
    this.trackW=m.track.map(([c,r])=>this.eng.cellToWorld(c,r));
    if (this.trackW.length) this.drawTrack();
  }
  this.eng.buildMap(this.map); this.eng.resetCam();
  this.puppets={en:new Map(),tw:new Map(),bl:new Map(),cr:new Map()};
  this.gold=0; this.wave=0; this.baseMaxHp=1; this.baseHp=1;
  this.perks=[]; this.abilities=TD.ABILITIES.map(a=>({def:a,charge:0}));
  this.state='playing';
  if (m.baseC!==undefined&&m.baseC!==null){
    this.baseC=m.baseC; this.baseR=m.baseR;
    const p1=this.eng.cellToWorld(m.baseC,m.baseR), p2=this.eng.cellToWorld(m.baseC+1,m.baseR+1);
    this.basePos=new THREE.Vector3((p1.x+p2.x)/2,0,(p1.z+p2.z)/2);
    this.baseModel=this.eng.makeBase(); this.baseModel.position.copy(this.basePos);
    this.eng.mapGroup.add(this.baseModel);
    this.eng.focus(this.basePos.x,this.basePos.z);
  }
  if (TD.ui) TD.ui.netEnterGame();
};
P.guestSnap=function(m){
  if (!this.puppets) return;
  this.gold=m.g; this.baseHp=m.bh; this.baseMaxHp=m.bm;
  this.shield=m.sh; this.shieldMax=m.sh>0?m.sh:0;
  this.wave=m.w; this.waveActive=!!m.wa;
  if (this.abilities&&m.ab) m.ab.forEach((f,i)=>{ if(this.abilities[i]) this.abilities[i].charge=f*this.abilities[i].def.need; });
  if (this.baseModel) this.eng.setBaseStress(this.baseModel,Math.max(0,this.baseHp/this.baseMaxHp));
  const seen=new Set();
  for (const r of m.en){
    const [nid,ti,x,z,ry,hf,fl]=r; seen.add(nid);
    let p=this.puppets.en.get(nid);
    if (!p){
      const type=EIDX[ti];
      p={ model:this.eng.makeEnemy(type), type, tx:x, tz:z, hidden:false };
      p.model.position.set(x,0,z);
      this.eng.scene.add(p.model);
      this.puppets.en.set(nid,p);
    }
    p.tx=x; p.tz=z; p.try=ry;
    const hidden=!!(fl&1);
    if (p.hidden!==hidden){ this.eng.setStealth(p.model,hidden); p.hidden=hidden; }
    p.model.position.y=(fl&2)?-0.9:0;
    if (fl&4) p.model.scale.multiplyScalar(0.93);
    // boss escort shield dome
    if (TD.ENEMIES[p.type]&&TD.ENEMIES[p.type].boss){
      if (!p.dome){ p.dome=this.eng.makeBossDome(); p.model.add(p.dome); }
      p.dome.visible=!!(fl&8);
    }
  }
  for (const [nid,p] of this.puppets.en) if (!seen.has(nid)){
    this.eng.explosion(p.model.position.clone().setY(0.8),1,0xff9d5c);
    this.eng.scene.remove(p.model); this.puppets.en.delete(nid);
  }
  const tseen=new Set();
  for (const r of m.tw){
    const [i,ti,c2,r2,t0,t1,t2,elev,kills]=r;
    const key=c2+'_'+r2; tseen.add(key);
    let p=this.puppets.tw.get(key);
    const id=TIDX[ti];
    if (!p){
      const w=this.eng.cellToWorld(c2,r2); w.y=(elev||0)*1.51;
      p={ model:this.eng.makeTower(id), id, def:TD.TOWERS[id], c:c2, r:r2, tiers:[t0,t1,t2],
          netIdx:i, kills, elev, isBlock:false, cd:0, pos:w, mode:0, aim:0 };
      p.stats=this.puppetStats(id,p.tiers,elev);
      p.spent=p.def.cost;
      p.rangeW=()=>p.stats.range*C.CELL;
      p.model.position.copy(w); p.model.userData.owner=p;
      this.eng.scene.add(p.model);
      this.eng.applyCosmetics(p.model,id,p.tiers);
      this.puppets.tw.set(key,p);
    }
    p.netIdx=i; p.kills=kills;
    if (p.tiers[0]!==t0||p.tiers[1]!==t1||p.tiers[2]!==t2){
      p.tiers=[t0,t1,t2];
      p.stats=this.puppetStats(id,p.tiers,p.elev);
      this.eng.applyCosmetics(p.model,id,p.tiers);
      if (this.selected===p&&TD.ui) TD.ui.refreshTowerPanel();
    }
  }
  for (const [key,p] of this.puppets.tw) if (!tseen.has(key)){
    if (this.selected===p) this.select(null);
    this.eng.scene.remove(p.model); this.puppets.tw.delete(key);
  }
  const bseen=new Set();
  for (const r of m.bl){
    const [bi,c2,r2,rot,lvl,open]=r;
    const key=c2+'_'+r2+'_'+lvl; bseen.add(key);
    let p=this.puppets.bl.get(key);
    if (!p){
      const id=BIDX[bi], def=TD.BLOCKS[id];
      p={ model:this.eng.makeBlock(id), id };
      let w;
      if (def.len===2){
        const a=this.eng.cellToWorld(c2,r2), b2=this.eng.cellToWorld(rot?c2+1:c2, rot?r2:r2+1);
        w=new THREE.Vector3((a.x+b2.x)/2,0,(a.z+b2.z)/2);
        p.model.rotation.y=rot?Math.PI/2:0;
      } else w=this.eng.cellToWorld(c2,r2);
      w.y=(id==='block')?lvl*1.51:0;
      p.model.position.copy(w);
      p.model.userData.owner={ isBlock:true, def, c:c2, r:r2, spent:def.cost, uses:def.uses||0, level:lvl, net:true };
      this.eng.mapGroup.add(p.model);
      this.puppets.bl.set(key,p);
    }
    if (p.model.userData.doors) this.eng.setTrapOpen(p.model, open?1:0);
  }
  for (const [key,p] of this.puppets.bl) if (!bseen.has(key)){
    this.eng.mapGroup.remove(p.model); this.puppets.bl.delete(key);
  }
  const cseen=new Set();
  for (const [cid,x,z] of m.cr){
    cseen.add(cid);
    if (!this.puppets.cr.has(cid)){
      const model=this.eng.makeCrate(); model.position.set(x,0,z);
      model.userData.owner={ isCrate:true, cid };
      this.eng.mapGroup.add(model);
      this.puppets.cr.set(cid,{model,cid});
    }
  }
  for (const [cid,p] of this.puppets.cr) if (!cseen.has(cid)){
    this.eng.mapGroup.remove(p.model); this.puppets.cr.delete(cid);
  }
  // real projectiles, replicated (reconciled by index — visual only)
  if (!this.puppets.pr) this.puppets.pr=[];
  const prs=m.pr||[];
  while (this.puppets.pr.length<prs.length){
    this.puppets.pr.push({ kind:-1, mesh:null, tx:0, ty:0, tz:0 });
  }
  while (this.puppets.pr.length>prs.length){
    const p=this.puppets.pr.pop();
    if (p.mesh) p.kind===1? this.eng.freeMissileMesh(p.mesh) : this.freeShell(p.mesh);
  }
  prs.forEach((r,i)=>{
    const [kind,x,y,z]=r, p=this.puppets.pr[i];
    if (p.kind!==kind){
      if (p.mesh) p.kind===1? this.eng.freeMissileMesh(p.mesh) : this.freeShell(p.mesh);
      p.kind=kind;
      p.mesh=kind===1? this.eng.getMissileMesh() : this.getShellMesh(0xffd28a,0.13);
      p.mesh.position.set(x,y,z);
    }
    p.tx=x; p.ty=y; p.tz=z;
  });
  // replayed real FX from the host (beams, explosions, lightning, rings, flashes)
  for (const f of (m.fx||[])){
    const tag=f[0];
    if (tag==='b') this.eng.beam(new THREE.Vector3(f[1],f[2],f[3]),new THREE.Vector3(f[4],f[5],f[6]),f[7],f[8]);
    else if (tag==='e') this.eng.explosion(new THREE.Vector3(f[1],f[2],f[3]),f[4],f[5]);
    else if (tag==='l') this.eng.lightning(new THREE.Vector3(f[1],f[2],f[3]),new THREE.Vector3(f[4],f[5],f[6]),f[7]);
    else if (tag==='r') this.eng.ring(new THREE.Vector3(f[1],0,f[2]),f[3],f[4]);
    else if (tag==='m') this.eng.muzzleFlash(new THREE.Vector3(f[1],f[2],f[3]),f[4],f[5]);
  }
};
P.guestTick=function(dt){
  if (!this.puppets) return;
  for (const [,p] of this.puppets.en){
    const k=Math.min(1,dt*10);
    p.model.position.x+=(p.tx-p.model.position.x)*k;
    p.model.position.z+=(p.tz-p.model.position.z)*k;
    if (p.try!==undefined) p.model.rotation.y+=(p.try-p.model.rotation.y)*k;
    this.eng.animEnemy(p.model,dt,1);
  }
  // heads track the nearest hostile (fire FX arrive replicated from the host)
  for (const [,t] of this.puppets.tw){
    if (!t.def.rof) continue;
    let best=null,bd=1e9;
    const rw=t.rangeW();
    for (const [,p] of this.puppets.en){
      const dx=p.model.position.x-t.pos.x, dz=p.model.position.z-t.pos.z, d2=dx*dx+dz*dz;
      if (d2<rw*rw&&d2<bd){ bd=d2; best=p; }
    }
    if (best){
      const u=t.model.userData;
      if (u.head) u.head.rotation.y=Math.atan2(best.model.position.x-t.pos.x, best.model.position.z-t.pos.z);
    }
  }
  // smooth-move replicated projectiles + missile trails
  if (this.puppets.pr) for (const p of this.puppets.pr){
    if (!p.mesh) continue;
    const k=Math.min(1,dt*14);
    p.mesh.position.x+=(p.tx-p.mesh.position.x)*k;
    p.mesh.position.y+=(p.ty-p.mesh.position.y)*k;
    p.mesh.position.z+=(p.tz-p.mesh.position.z)*k;
    if (p.kind===1){
      p.mesh.lookAt(p.tx,p.ty,p.tz);
      if (Math.random()<0.7) this.eng.burst(p.mesh.position.clone(),0xffb36b,1,0.4,0.14,0);
    }
  }
};
})();
