/* ============ TOWER DEFENDERS — Kenney kit integration (CC0) ============
   Loads the embedded GLBs, converts materials to our toon look, and swaps in
   real low-poly models for vehicles, crates, debris and map dressing.
   Anything without a kit model keeps its procedural build (same palette). */
(function(){
TD.MODELS={};
let grad=null;
function gradMap(){
  if (grad) return grad;
  const cv=document.createElement('canvas'); cv.width=4; cv.height=1;
  const g=cv.getContext('2d');
  ['#4e535a','#84898f','#b4b8bd','#e2e4e7'].forEach((c,i)=>{ g.fillStyle=c; g.fillRect(i,0,1,1); });
  grad=new THREE.CanvasTexture(cv);
  grad.minFilter=grad.magFilter=THREE.NearestFilter;
  return grad;
}
const TDKEYS=new Set(['tree','rocks','crystal']);   // these come from the TD kit's palette
TD.loadAssets=function(done,onProg){
  if (typeof THREE.GLTFLoader==='undefined'||!TD.ASSETS){ if(onProg) onProg(1,1); done(); return; }
  // Kenney GLBs reference an external shared palette texture — feed it in manually
  const texLoader=new THREE.TextureLoader();
  const palettes={};
  if (TD.ASSET_TEX) for (const k in TD.ASSET_TEX){
    const t=texLoader.load(TD.ASSET_TEX[k]);
    t.encoding=THREE.sRGBEncoding; t.flipY=false;   // GLTF UV convention
    t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
    palettes[k]=t;
  }
  palettes.city=gradMap();   // flat-color fallback for building GLBs
  const loader=new THREE.GLTFLoader();
  const keys=Object.keys(TD.ASSETS);
  const total=keys.length;
  let left=total, fired=false;
  const tick=()=>{
    if (onProg) onProg(total-left,total);
    if (left<=0&&!fired){ fired=true; done(); }
  };
  keys.forEach(k=>{
    const ok=gltf=>{
      try{
        const scene=gltf.scene;
        const pal=palettes[TDKEYS.has(k)?'td':BLDCITY.has(k)?'city':'car']||null;
        scene.traverse(o=>{
          if (o.isMesh){
            const src=o.material;
            const useMap=src.map||( (src.name==='colormap'&&o.geometry.attributes.uv)? pal : null );
            o.material=new THREE.MeshToonMaterial({ color:src.color?src.color.clone():new THREE.Color(0xffffff),
              map:useMap, vertexColors:!!(o.geometry&&o.geometry.attributes.color)&&!useMap, gradientMap:gradMap() });
            o.castShadow=true; o.receiveShadow=true;
          }
        });
        const box=new THREE.Box3().setFromObject(scene);
        TD.MODELS[k]={ scene, size:box.getSize(new THREE.Vector3()), minY:box.min.y };
      }catch(e){}
      left--; tick();
    };
    try{ loader.load(TD.ASSETS[k], ok, undefined, ()=>{ left--; tick(); }); }
    catch(e){ left--; tick(); }
  });
  if (total===0) tick();
};

const E=TD.Engine.prototype;
/* clone an asset normalized: faces +Z, ground at y0, length fit */
E.asset=function(key,{len,tint,tintAmt=0.55}={}){
  const m=TD.MODELS[key]; if(!m) return null;
  const g=new THREE.Group();
  const c=m.scene.clone(true);
  // face +Z (kenney vehicles are longest on X or Z; rotate if X-long)
  let sx=m.size.x, sz=m.size.z, rotated=false;
  if (sx>sz){ c.rotation.y=-Math.PI/2; const t=sx; sx=sz; sz=t; rotated=true; }
  const s=len? len/sz : 1;
  c.scale.setScalar(s);
  c.position.y=-m.minY*s;
  g.userData.rotated=rotated;
  if (tint){
    const T=new THREE.Color(tint);
    c.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); o.material.color.lerp(T,tintAmt); } });
  }
  g.add(c);
  g.userData.fitLen=len; g.userData.fitW=sx*s; g.userData.fitH=m.size.y*s;
  return g;
};

/* ---------- vehicles: kit bodies + auto-fitted spinning kit wheels ---------- */
const VMAP={
  junker:   { key:'sedan',      len:1.9,  tint:0x9b5f45, tintAmt:0.45 },
  buggy:    { key:'suv',        len:1.7,  tint:0xc9a55a, tintAmt:0.35 },
  prowler:  { key:'sedansport', len:1.9,  tint:0x23262e, tintAmt:0.6 },
  racer:    { key:'race',       len:1.9,  tint:0xe05a78, tintAmt:0.35 },
  mechvan:  { key:'ambulance',  len:1.95 },
  shieldvan:{ key:'van',        len:1.9,  tint:0x7fa7d8, tintAmt:0.4 },
  apc:      { key:'van',        len:1.95, tint:0x5f7183, tintAmt:0.6 },
  hauler:   { key:'truckflat',  len:2.3,  tint:0xa8874f, tintAmt:0.3 },
  rammer:   { key:'truck',      len:1.9,  tint:0xd0543a, tintAmt:0.45 },
  digger:   { key:'tractor',    len:1.9,  tint:0x8a7f52, tintAmt:0.3 },
  boss:     { key:'tankboss',   len:2.4,  tint:0x54423a, tintAmt:0.4 },
};
const _makeEnemyProc=E.makeEnemy;   // procedural fallback (moto, chopper, gunship, tank, boss)
E.makeEnemy=function(type){
  const map=VMAP[type];
  if (!map||!TD.MODELS[map.key]) return _makeEnemyProc.call(this,type);
  const d=TD.ENEMIES[type], s=d.size, g=new THREE.Group();
  const parts={ wheels:[] };
  const body=this.asset(map.key,{len:map.len,tint:map.tint,tintAmt:map.tintAmt});
  g.add(body);
  // bosses face the base they're attacking — reverse their models 180° on Y
  if (type==='boss'||type==='boss2'||type==='boss3'||type==='bossH') body.rotation.y=Math.PI;
  // kit bodies ship their own wheels as pivot nodes — spin those
  body.traverse(o=>{ if(/wheel/i.test(o.name)) parts.wheels.push(o); });
  g.userData.wheelAxis=body.userData.rotated? 'z':'x';
  const w2=body.userData.fitW/2, l2=map.len/2;
  // faction extras kept from the procedural designs
  const glow=(w,x,y,z,c=0xff8a4d)=>{ const e2=this.P(this.box(w,0.09,0.04,c,{e:1.5}),x,y,z,g);
    e2.userData.anim=(dt,t)=>{ e2.material.emissiveIntensity=1.1+Math.sin(t*9+x)*0.5; };
    this.animated.add(e2); return e2; };
  glow(0.4,0,0.5,-l2*1.02);
  if (type==='rammer'){
    const plow=this.P(this.box(1.15,0.55,0.1,0x3c3f44,{m:0.4}),0,0.5,l2*0.98,g); plow.rotation.x=-0.4;
    for(let i=0;i<3;i++) this.P(this.box(0.2,0.08,0.04,i%2?0xf2c94c:0x22262b),(i-1)*0.32,0.62,l2*1.04,g).rotation.x=-0.4;
    const core=this.P(this.sph(0.13,0xff4030,{e:1.7},10),0,0.95,-0.2,g);
    core.userData.anim=(dt,t)=>{ core.material.emissiveIntensity=1.2+Math.sin(t*11)*0.8; core.scale.setScalar(1+Math.sin(t*11)*0.12); };
    this.animated.add(core);
  }
  if (type==='shieldvan'){
    const emitter=this.P(this.sph(0.11,0x9fd0ff,{e:1.9},12),0,1.35,-0.2,g);
    const dome=this.P(this.sph(1.35,0x7fa7d8,{e:0.3,o:0.12},18),0,0.75,0,g);
    dome.castShadow=false;
    dome.userData.anim=(dt,t)=>{ dome.scale.setScalar(1+Math.sin(t*2.2)*0.05); };
    emitter.userData.anim=(dt,t)=>{ emitter.material.emissiveIntensity=1.4+Math.sin(t*5)*0.6; };
    this.animated.add(dome); this.animated.add(emitter);
  }
  if (type==='mechvan'){
    const beacon=this.P(this.sph(0.09,0xff9c50,{e:1.9},10),0,1.28,0.3,g);
    beacon.userData.anim=(dt,t)=>{ beacon.material.emissiveIntensity=1+Math.sin(t*8)*0.9; };
    this.animated.add(beacon); parts.beacon=beacon;
  }
  if (type==='prowler'){
    const ug=this.P(this.box(0.56,0.02,1.15,0x8f4fd6,{e:1.4}),0,0.08,0,g);
    parts.underglow=ug;
  }
  if (type==='apc'){ g.userData.smoke=[-0.4,0.9,-0.85]; }
  if (type==='hauler'){
    g.userData.smoke=[0.4,1.1,0.6];
    const b1=this.asset('boxcrate',{len:0.55}); if(b1){ b1.position.set(0.12,0.65,-0.45); b1.rotation.y=0.2; g.add(b1); }
    const b2=this.asset('boxcrate',{len:0.55}); if(b2){ b2.position.set(-0.15,0.65,-0.85); b2.rotation.y=-0.35; g.add(b2); }
  }
  g.userData.parts=parts; g.userData.phase=Math.random()*7; g.userData.size=s; g.userData.fly=!!d.fly;
  g.add(this.aoDisc(0.95));
  const bs=1.12*s;
  g.userData.baseScale=bs;
  if (g.userData.smoke) g.userData.smoke=g.userData.smoke.map(v=>v*bs);
  g.scale.setScalar(bs);
  return g;
};

/* ---------- crate = kit box + gold halo ---------- */
const _makeCrateProc=E.makeCrate;
E.makeCrate=function(){
  if (!TD.MODELS.boxcrate) return _makeCrateProc.call(this);
  const g=new THREE.Group();
  const b=this.asset('boxcrate',{len:0.6}); g.add(b);
  const halo=this.P(this.torus(0.42,0.02,0xffd166,{e:1.2}),0,0.1,0,g);
  halo.rotation.x=Math.PI/2;
  halo.userData.anim=(dt,t)=>{ halo.rotation.z=t*2; };
  this.animated.add(halo);
  const glowB=this.P(this.box(0.62,0.04,0.12,0xffd166,{e:1.5}),0,0.34,0,g);
  glowB.userData.anim=(dt,t)=>{ glowB.material.emissiveIntensity=1+Math.sin(t*5)*0.6; };
  this.animated.add(glowB);
  return g;
};

/* ---------- debris = real car parts flying off wrecks ---------- */
const DEBKEYS=['debtire','debplate','debbumper','debdoor','debspoiler'];
const _debrisProc=E.debris;
E.debris=function(pos,color,n=5){
  if (!TD.MODELS.debtire) return _debrisProc.call(this,pos,color,n);
  if (!this.debris2){
    this.debris2=[];
    for(let i=0;i<24;i++){
      const key=DEBKEYS[i%DEBKEYS.length];
      const m=this.asset(key,{len:0.4});
      m.visible=false; this.scene.add(m);
      this.debris2.push({g:m,life:0,max:1,vel:new THREE.Vector3(),rv:new THREE.Vector3()});
    }
  }
  for(let i=0;i<n;i++){
    const d=this.debris2.find(x=>x.life<=0); if(!d) return;
    d.life=d.max=0.9+Math.random()*0.5;
    d.g.visible=true; d.g.position.copy(pos); d.g.scale.setScalar(1);
    d.vel.set((Math.random()-0.5)*7,3+Math.random()*4.5,(Math.random()-0.5)*7);
    d.rv.set(Math.random()*9,Math.random()*9,Math.random()*9);
  }
};
const _updateFX=E.updateFX;
E.updateFX=function(dt){
  _updateFX.call(this,dt);
  if (this.debris2) for(const d of this.debris2){
    if (d.life<=0) continue;
    d.life-=dt;
    d.vel.y-=14*dt;
    d.g.position.addScaledVector(d.vel,dt);
    if (d.g.position.y<0.1){ d.g.position.y=0.1; d.vel.y*=-0.35; d.vel.x*=0.7; d.vel.z*=0.7; }
    d.g.rotation.x+=d.rv.x*dt; d.g.rotation.y+=d.rv.y*dt; d.g.rotation.z+=d.rv.z*dt;
    if (d.life/d.max<0.25) d.g.scale.multiplyScalar(0.93);
    if (d.life<=0) d.g.visible=false;
  }
};

/* ---------- map dressing: trees / rocks / crystals in the kit style ---------- */
const BLDCITY=new Set(['bldg1','bldg2','bldg3','bldg4','bldg5','bldg6','bldg7','bldg8','bldg9','bldg10','bldg11']);
const BLDKEYS=['bldg1','bldg2','bldg3','bldg4','bldg5','bldg6','bldg7','bldg8','bldg9','bldg10','bldg11'];
/* a building scaled to sit on one cell, up to h cells tall */
E.makeBuilding=function(h,key){
  const m=TD.MODELS[key]; if(!m) return null;
  const g=new THREE.Group();
  const c=m.scene.clone(true);
  const sx=Math.max(m.size.x,m.size.z), sy=m.size.y;
  const s=Math.min(4.5/sx, (h*1.51*5)/sy);   // huge city blocks — 5x scale
  c.scale.setScalar(s);
  c.position.y=-m.minY*s;
  if (!m._flat){
    m._flat=true;
    const T=[0x9aa3ad,0x8a93a3,0xaab3bf,0x98a2b0][key.charCodeAt(4)%4];
    const col=new THREE.Color(T);
    c.traverse(o=>{ if(o.isMesh&&!o.material.map){
      o.material=o.material.clone(); o.material.color.copy(col).offsetHSL(0,0,((key.charCodeAt(4)+key.charCodeAt(5))%7-3)*0.04); o.material.vertexColors=false; } });
  }
  g.add(c);
  g.userData.bldgH=h;
  return g;
};
const _buildMap=E.buildMap;
E.buildMap=function(map){
  const grp=_buildMap.call(this,map);
  const C=TD.CONFIG, G=C.GRID;
  map._bldgs=map.bldgs||[];
  // ---- fixed city layout: buildings + parked city traffic ----
  if (map._bldgs.length){
    for (const [c,r,h] of map._bldgs){
      const key=BLDKEYS[(c*7+r*13)%BLDKEYS.length];
      const m=this.makeBuilding(h,key);
      if (!m) continue;
      const p=this.cellToWorld(c,r);
      m.position.set(p.x,0,p.z);
      m.rotation.y=((r*3+c)%4)*Math.PI/2;
      m.userData.owner={isBldg:true,c,r};
      (map._bldgModels=map._bldgModels||[]).push(m);
      grp.add(m);
    }
    if (map.traffic){
      let seed=(map.seed*13+5)>>>0;
      const rnd=()=>{ seed=(seed+0x6D2B79F5)>>>0; let t=Math.imul(seed^(seed>>>15),1|seed);
        t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
      const cars=['sedan','suv','van','race'];
      const tints=[0xff8a5a,0x5ac8ff,0xffd166,0x86efac,0xd8a7ff];
      const blocked=new Set(map._bldgs.map(([c,r])=>r*G+c));
      (map._rocks||[]).forEach(([c,r])=>blocked.add(r*G+c));
      for (const [c,r] of map._bldgs){
        if (rnd()<0.35) continue;
        const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
        const d=dirs[Math.floor(rnd()*dirs.length)];
        const cc=c+d[0], rr=r+d[1];
        if (blocked.has(rr*G+cc)) continue;
        blocked.add(rr*G+cc);
        const m=this.asset(cars[Math.floor(rnd()*cars.length)],{len:2.3,tint:tints[Math.floor(rnd()*tints.length)],tintAmt:0.5});
        if (!m) continue;
        const p=this.cellToWorld(cc,rr);
        m.position.set(p.x+(rnd()-0.5)*0.6,0,p.z+(rnd()-0.5)*0.6);
        m.rotation.y= d[0]? (d[0]>0?0:Math.PI) : (d[1]>0?Math.PI/2:-Math.PI/2);
        grp.add(m);
      }
    }
  }
  // ---- nature dressing (never on New Tower City) ----
  if (!TD.MODELS.tree||map.id===5) return grp;
  let seed=(map.seed*7+3)>>>0;
  const rnd=()=>{ seed=(seed+0x6D2B79F5)>>>0; let t=Math.imul(seed^(seed>>>15),1|seed);
    t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  const kinds=map.id===2||map.id===4? ['crystal','rocks','tree'] : ['tree','tree','rocks'];
  const blocked=new Set((map._rocks||[]).map(([c,r])=>r*G+c));
  const n=map.id===1?8:14;
  for(let i=0;i<n;i++){
    // dress the outskirts so the build area stays visually clear
    const edge=Math.floor(rnd()*4);
    const depth=1+Math.floor(rnd()*3), along=2+Math.floor(rnd()*(G-4));
    let c,r;
    if (edge===0){ c=along; r=depth; } else if(edge===1){ c=along; r=G-1-depth; }
    else if (edge===2){ c=depth; r=along; } else { c=G-1-depth; r=along; }
    if (blocked.has(r*G+c)) continue;
    const key=kinds[Math.floor(rnd()*kinds.length)];
    const m=this.asset(key,{len:1.2+rnd()*0.9});
    if (!m) continue;
    const p=this.cellToWorld(c,r);
    m.position.set(p.x+(rnd()-0.5)*0.8,0,p.z+(rnd()-0.5)*0.8);
    m.rotation.y=rnd()*6.28;
    grp.add(m);
  }
  return grp;
};
})();

/* wheel spin with the correct axle axis for kit bodies */
(function(){
const E=TD.Engine.prototype;
const _anim=E.animEnemy;
E.animEnemy=function(g,dt,speedFrac){
  const u=g.userData;
  if (u.wheelAxis&&u.parts&&u.parts.wheels.length){
    u.phase+=dt*10*Math.max(0.15,speedFrac);
    for (const w of u.parts.wheels) w.rotation[u.wheelAxis]+=dt*10*speedFrac;
    g.rotation.z=Math.sin(u.phase)*0.015;
    if (u.smoke&&Math.random()<dt*6){
      const o=u.smoke, a=g.rotation.y;
      const wx=g.position.x+o[0]*Math.cos(a)+o[2]*Math.sin(a);
      const wz=g.position.z-o[0]*Math.sin(a)+o[2]*Math.cos(a);
      this.burst(new THREE.Vector3(wx,g.position.y+o[1],wz),0x6b7076,1,0.6,0.7,-1.2);
    }
    return;
  }
  _anim.call(this,g,dt,speedFrac);
};
})();
