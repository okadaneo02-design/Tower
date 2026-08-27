/* ============ TOWER DEFENDERS — MODELS v5: curvy low-poly / futuristic ============
   Capsules, domes, tapered cylinders and torus arcs instead of boxes.
   Graphite + ceramic + per-unit neon energy. Floating parts, glowing seams.
   Mounts are compact (half-size pads). All userData contracts preserved. */
(function(){
const E=TD.Engine.prototype;
const GRAPH=0x2b323b, GRAPH2=0x39424d, CERAMIC=0xdfe5ea, DARK=0x1d2229, GOLD=0xc9a227, GLASS=0x9fd0e8;

/* ---------- curvy primitives ---------- */
E.caps=function(r,len,color,opts,seg=10){
  const m=new THREE.Mesh(this.geo(`cap${r.toFixed(3)}|${len.toFixed(3)}|${seg}`,
    ()=>new THREE.CapsuleGeometry(r,len,4,seg)),this.mat(color,opts));
  m.castShadow=m.receiveShadow=true; return m;
};
E.dome=function(r,color,opts,seg=12){
  const m=new THREE.Mesh(this.geo(`dom${r.toFixed(3)}|${seg}`,
    ()=>new THREE.SphereGeometry(r,seg,Math.max(6,seg>>1),0,Math.PI*2,0,Math.PI/2)),this.mat(color,opts));
  m.castShadow=true; return m;
};
E.arc=function(r,t,arcLen,color,opts,seg=14){
  const m=new THREE.Mesh(this.geo(`arc${r.toFixed(3)}|${t.toFixed(3)}|${arcLen.toFixed(2)}|${seg}`,
    ()=>new THREE.TorusGeometry(r,t,8,seg,arcLen)),this.mat(color,opts));
  m.castShadow=true; return m;
};
E.shell=function(r,h,color,opts,seg=12){ // half-pipe shell (curved plow)
  const m=new THREE.Mesh(this.geo(`shl${r.toFixed(3)}|${h.toFixed(3)}|${seg}`,
    ()=>new THREE.CylinderGeometry(r,r,h,seg,1,true,0,Math.PI)),this.mat(color,opts));
  m.material.side=THREE.DoubleSide; m.castShadow=true; return m;
};

/* ---------- compact rounded mount (half-size) ---------- */
E._mountV2=function(g,accent){
  this.P(this.cyl(0.72,0.82,0.26,GRAPH,{},12),0,0.13,0,g);
  this.P(this.cyl(0.55,0.66,0.16,GRAPH2,{},12),0,0.33,0,g);
  const rim=this.P(this.torus(0.6,0.035,accent,{e:1.0}),0,0.27,0,g);
  rim.rotation.x=Math.PI/2;
  this.P(this.cyl(0.26,0.38,0.55,DARK,{},10),0,0.68,0,g);
  const joint=this.P(this.cyl(0.3,0.25,0.09,accent,{e:0.85},10),0,0.99,0,g);
  joint.userData.anim=(dt,t)=>{ joint.material.emissiveIntensity=0.6+Math.sin(t*2.5)*0.3; };
  this.animated.add(joint);
  for(let i=0;i<3;i++){ const a=i*2.094+0.5;
    this.P(this.sph(0.1,GRAPH2,{},10),Math.cos(a)*0.66,0.12,Math.sin(a)*0.66,g); }
  return 1.06;
};
E._ebarrel=function(len,cal,accent){
  const b=new THREE.Group();
  const rail=this.P(this.cyl(cal*1.3,cal*1.5,len,DARK,{},10),0,0,len/2,b);
  rail.rotation.x=Math.PI/2;
  for(let i=1;i<=3;i++){
    const ring=this.P(this.torus(cal*1.6,cal*0.35,accent,{e:1.1}),0,0,len*i/3.4,b);
    ring.userData.anim=(dt,t)=>{ ring.material.emissiveIntensity=0.8+Math.sin(t*6+i)*0.35; };
    this.animated.add(ring);
  }
  this.P(this.cyl(cal*1.8,cal*1.4,cal*2.4,GRAPH2,{m:0.3},10),0,0,len,b).rotation.x=Math.PI/2;
  this.P(this.cyl(cal*0.8,cal*0.8,cal*2.6,accent,{e:1.4},8),0,0,len,b).rotation.x=Math.PI/2;
  return b;
};
E._holo=function(g,x,y,z,r,color,spd=1.5){
  const h=this.P(this.torus(r,0.028,color,{e:1.3}),x,y,z,g);
  h.rotation.x=Math.PI/2;
  h.userData.anim=(dt,t)=>{ h.position.y=y+Math.sin(t*1.8*spd)*0.07; h.rotation.z=t*spd; };
  this.animated.add(h);
  return h;
};

E.makeTower=function(id){
  const d=TD.TOWERS[id], g=new THREE.Group(), col=d.color;
  const hy=this._mountV2(g,col);
  const head=new THREE.Group(); head.position.y=hy; g.add(head);
  const ph=Math.random()*7;
  head.userData.anim=(dt,t)=>{ head.position.y=hy+Math.sin(t*1.7+ph)*0.045; };
  this.animated.add(head);
  let barrel=null, muzzle=new THREE.Vector3(0,hy,1.0);
  const B=(w,h,dd,c,o)=>this.box(w,h,dd,c,o), CY=(a,b2,h,c,o,sg)=>this.cyl(a,b2,h,c,o,sg||12), S=(r,c,o)=>this.sph(r,c,o,14);
  const glowstrip=(w,h,dd,x,y,z,p,e=1.1)=>this.P(B(w,h,dd,col,{e}),x,y,z,p);

  switch(id){
    case 'mg': {
      const body=this.P(this.caps(0.32,0.6,GRAPH2,{m:0.2}),0,0.12,-0.05,head);
      body.rotation.x=Math.PI/2;
      this.P(this.caps(0.2,0.5,CERAMIC,{}),0,0.38,-0.1,head).rotation.x=Math.PI/2;
      barrel=this._ebarrel(0.95,0.075,col); barrel.position.set(0.15,0.12,0.35); head.add(barrel);
      const b2=this._ebarrel(0.95,0.075,col); b2.position.set(-0.15,0.12,0.35); head.add(b2); head.userData.b2=b2;
      const cell=this.P(CY(0.13,0.13,0.36,col,{e:0.9}),-0.42,0.05,-0.2,head);
      cell.rotation.z=0.4;
      cell.userData.anim=(dt,t)=>{ cell.material.emissiveIntensity=0.7+Math.sin(t*4)*0.3; };
      this.animated.add(cell);
      const sight=this.P(this.torus(0.09,0.02,col,{e:1.3}),0,0.45,0.25,head);
      sight.userData.anim=(dt,t)=>{ sight.rotation.z=t*2; };
      this.animated.add(sight);
      muzzle=new THREE.Vector3(0.15,hy+0.12,1.35); // x flips per shot — barrels alternate
      break; }
    case 'scatter': {
      const body=this.P(this.caps(0.32,0.55,GRAPH2,{m:0.2}),0,0.12,-0.15,head);
      body.rotation.x=Math.PI/2;
      this.P(this.caps(0.22,0.45,CERAMIC,{}),0,0.4,-0.15,head).rotation.x=Math.PI/2;
      barrel=new THREE.Group(); barrel.position.set(0,0.1,0.25); head.add(barrel);
      for(const sx of [0.15,-0.15]){
        const bl=this.P(CY(0.17,0.11,0.62,DARK,{m:0.3}),sx,0,0.35,barrel); bl.rotation.x=Math.PI/2;
        const mouth=this.P(this.torus(0.15,0.03,col,{e:1.4}),sx,0,0.66,barrel);
        mouth.userData.anim=(dt,t)=>{ mouth.material.emissiveIntensity=1+Math.sin(t*3+sx*5)*0.5; };
        this.animated.add(mouth);
        this.P(CY(0.08,0.08,0.05,col,{e:1.6},8),sx,0,0.64,barrel).rotation.x=Math.PI/2;
      }
      this.P(this.caps(0.1,0.3,GRAPH,{m:0.3}),0,-0.14,0.3,head).rotation.x=Math.PI/2; // pump
      for(let i=0;i<3;i++) this.P(this.torus(0.3-i*0.03,0.02,GRAPH,{m:0.4}),0,0.12,-0.5-i*0.09,head);
      muzzle=new THREE.Vector3(0,hy+0.1,0.95);
      break; }
    case 'mortar': {
      head.position.y=hy-0.08;
      // armored platform + pivot dome (deliberately sturdy, not curvy)
      this.P(B(1.0,0.18,1.0,GRAPH2,{m:0.2}),0,0.02,0,head);
      this.P(this.dome(0.4,GRAPH,{m:0.25}),0,0.1,-0.05,head);
      barrel=new THREE.Group(); barrel.position.set(0,0.26,-0.05); head.add(barrel);
      const tube=this.P(CY(0.24,0.3,1.25,GRAPH2,{m:0.3},12),0,0.5,0.28,barrel);
      tube.rotation.x=Math.PI/4.6;
      const throat=this.P(this.torus(0.24,0.045,col,{e:1.3}),0,0.93,0.66,barrel);
      throat.rotation.x=Math.PI/4.6;
      throat.userData.anim=(dt,t)=>{ throat.material.emissiveIntensity=0.9+Math.sin(t*2.2)*0.5; };
      this.animated.add(throat);
      this.P(CY(0.15,0.15,0.03,col,{e:1.6},10),0,0.88,0.61,barrel).rotation.x=Math.PI/4.6;
      // hydraulic recoil arms
      for(const sx of [0.34,-0.34]){
        this.P(B(0.09,0.55,0.09,DARK),sx,0.36,0.32,head).rotation.x=0.55;
        this.P(B(0.13,0.12,0.13,GRAPH,{m:0.4}),sx,0.1,0.12,head);
      }
      // shell crate
      this.P(B(0.44,0.28,0.34,0x4a463f),0.6,0.14,-0.32,head);
      for(let i=0;i<3;i++) this.P(this.cone(0.05,0.1,col,{e:1.1},8),0.5+i*0.11,0.32,-0.32,head);
      muzzle=new THREE.Vector3(0,hy+1.1,0.72);
      break; }
    case 'tesla': {
      const column=this.P(CY(0.12,0.2,1.5,DARK,{},10),0,0.65,0,head);
      const core=this.P(CY(0.05,0.05,1.42,col,{e:1.6},8),0,0.65,0,head);
      core.userData.anim=(dt,t)=>{ core.material.emissiveIntensity=1.2+Math.sin(t*5)*0.6; };
      this.animated.add(core);
      [0.3,0.7,1.1].forEach((y,i)=>{
        const rg=this.P(this.torus(0.52-i*0.09,0.045,col,{e:1.1}),0,y,0,head);
        rg.rotation.x=Math.PI/2;
        rg.userData.anim=(dt,t)=>{ rg.rotation.z=t*(1.2+i*0.8)*(i%2?-1:1); rg.position.y=y+Math.sin(t*2+i)*0.05; };
        this.animated.add(rg);
      });
      const orb=this.P(S(0.28,col,{e:1.4}),0,1.5,0,head);
      orb.userData.anim=(dt,t)=>{ orb.scale.setScalar(1+Math.sin(t*4.5)*0.1); };
      this.animated.add(orb);
      muzzle=new THREE.Vector3(0,hy+1.5,0);
      break; }
    case 'sniper': {
      const body=this.P(this.caps(0.24,0.6,GRAPH2,{m:0.2}),0,0.12,-0.3,head);
      body.rotation.x=Math.PI/2;
      this.P(this.caps(0.16,0.5,CERAMIC,{}),0,0.34,-0.3,head).rotation.x=Math.PI/2;
      barrel=new THREE.Group(); barrel.position.set(0,0.16,0.1); head.add(barrel);
      this.P(CY(0.045,0.06,2.1,DARK,{},10),0,0,1.05,barrel).rotation.x=Math.PI/2;
      this.P(CY(0.02,0.02,2.0,col,{e:1.3},8),0,0.06,1.0,barrel).rotation.x=Math.PI/2;
      this.P(CY(0.09,0.07,0.3,GRAPH2,{m:0.4},10),0,0,2.05,barrel).rotation.x=Math.PI/2;
      [0.8,1.5].forEach((z,i)=>{
        const ring=this.P(this.torus(0.14,0.022,col,{e:1.4}),0,0,z,barrel);
        ring.userData.anim=(dt,t)=>{ ring.rotation.z=t*(3+i*2); ring.position.y=Math.sin(t*2.2+i*1.7)*0.03; };
        this.animated.add(ring);
      });
      const eye=this.P(S(0.1,col,{e:1.8}),0,0.4,0.0,head);
      eye.userData.anim=(dt,t)=>{ eye.material.emissiveIntensity=1.2+((Math.sin(t*1.3)>0.85)?0.8:0); };
      this.animated.add(eye);
      this.P(this.caps(0.1,0.24,GRAPH,{m:0.3}),0,-0.02,-0.62,head).rotation.x=Math.PI/2-0.3;
      muzzle=new THREE.Vector3(0,hy+0.16,2.25);
      break; }
    case 'relay': {
      const mono=this.P(this.caps(0.28,1.3,GRAPH2,{m:0.25}),0,0.85,0,head);
      glowstrip(0.04,1.2,0.04,0.22,0.85,0.12,head,1.2);
      glowstrip(0.04,1.2,0.04,-0.22,0.85,-0.12,head,1.2);
      const tip=this.P(S(0.12,col,{e:1.8}),0,1.75,0,head);
      tip.userData.anim=(dt,t)=>{ tip.material.emissiveIntensity=1.2+Math.sin(t*4)*0.7; };
      this.animated.add(tip);
      for(let i=0;i<3;i++){
        const panel=this.P(this.caps(0.09,0.16,col,{e:1.0,o:0.6}),0,0,0,head);
        panel.userData.anim=(dt,t)=>{ const a=t*0.9+i*2.094;
          panel.position.set(Math.cos(a)*0.7,0.9+Math.sin(t*1.6+i)*0.12,Math.sin(a)*0.7);
          panel.rotation.z=Math.sin(t+i)*0.3; };
        this.animated.add(panel);
      }
      this._holo(head,0,1.3,0,0.55,col,0.8);
      break; }
    case 'rail': {
      const core=this.P(this.caps(0.26,0.55,GRAPH2,{m:0.25}),0,0.12,-0.4,head);
      core.rotation.x=Math.PI/2;
      this.P(this.caps(0.18,0.45,CERAMIC,{}),0,0.36,-0.4,head).rotation.x=Math.PI/2;
      barrel=new THREE.Group(); barrel.position.set(0,0.12,0); head.add(barrel);
      for(const sy of [0.12,-0.12]){
        const blade=this.P(this.caps(0.05,2.1,DARK,{}),0,sy,1.05,barrel);
        blade.rotation.x=Math.PI/2;
      }
      const gap=this.P(CY(0.028,0.028,2.15,col,{e:1.6},8),0,0,1.02,barrel);
      gap.rotation.x=Math.PI/2;
      gap.userData.anim=(dt,t)=>{ gap.material.emissiveIntensity=1+Math.sin(t*7)*0.6; };
      this.animated.add(gap);
      const charge=this.P(this.torus(0.24,0.04,col,{e:1.5}),0,0.12,-0.45,head);
      charge.userData.anim=(dt,t)=>{ charge.rotation.z=t*4; charge.position.z=-0.45+((t*1.4)%1)*0.5; };
      this.animated.add(charge);
      muzzle=new THREE.Vector3(0,hy+0.12,2.15);
      break; }
    case 'repair': {
      const hangar=this.P(this.dome(0.55,GRAPH2,{m:0.2}),0,0.08,-0.15,head);
      hangar.scale.y=0.75;
      const door=this.P(this.arc(0.42,0.03,Math.PI/1.9,col,{e:1.2}),0,0.1,0.28,head);
      door.userData.anim=(dt,t)=>{ door.material.emissiveIntensity=0.9+Math.sin(t*2.4)*0.5; };
      this.animated.add(door);
      const padRing=this.P(this.torus(0.55,0.03,col,{e:1.2}),0,0.06,0.15,head);
      padRing.rotation.x=Math.PI/2;
      this.animated.add(padRing);
      padRing.userData.anim=(dt,t)=>{ padRing.material.emissiveIntensity=0.8+Math.sin(t*2.4)*0.4; };
      for(let i=0;i<2;i++){
        const drone=new THREE.Group(); head.add(drone);
        this.P(S(0.1,CERAMIC,{}),0,0,0,drone);
        this.P(S(0.045,col,{e:1.9}),0,-0.08,0,drone);
        const rot=this.P(this.torus(0.13,0.014,DARK,{}),0,0.08,0,drone);
        rot.rotation.x=Math.PI/2;
        drone.userData.anim=(dt,t)=>{ const a=t*1.4+i*Math.PI;
          drone.position.set(Math.cos(a)*0.8,1.0+Math.sin(t*2.4+i*2)*0.14,Math.sin(a)*0.8);
          rot.rotation.z=t*14; };
        this.animated.add(drone);
      }
      this._holo(head,0,1.35,0,0.38,col,1.1);
      break; }
    case 'missile': {
      const drum=this.P(CY(0.42,0.46,0.6,GRAPH2,{m:0.2},12),0,0.3,0,head);
      drum.rotation.x=-0.45+Math.PI/2;
      const faceRing=this.P(this.torus(0.42,0.035,col,{e:1.1}),0,0.44,0.28,head);
      faceRing.rotation.x=-0.45;
      faceRing.userData.anim=(dt,t)=>{ faceRing.material.emissiveIntensity=0.8+Math.sin(t*3)*0.4; };
      this.animated.add(faceRing);
      const rack=new THREE.Group(); rack.rotation.x=-0.45; rack.position.set(0,0.3,0); head.add(rack);
      const rackMissiles=[];
      for(let i=0;i<6;i++){
        const a=i/6*Math.PI*2, rr=0.24;
        const x=Math.cos(a)*rr, y=Math.sin(a)*rr;
        this.P(CY(0.1,0.1,0.4,DARK,{},10),x,y,0.15,rack).rotation.x=Math.PI/2;
        const rm=new THREE.Group(); rm.position.set(x,y,0.28); rack.add(rm);
        this.P(this.caps(0.05,0.2,CERAMIC,{},8),0,0,0,rm).rotation.x=Math.PI/2;
        this.P(this.cone(0.055,0.12,col,{e:0.9},8),0,0,0.2,rm).rotation.x=Math.PI/2;
        rackMissiles.push(rm);
      }
      head.userData.rackMissiles=rackMissiles; head.userData.rack=rack;
      const stalk=this.P(CY(0.02,0.03,0.5,GRAPH,{},8),0.4,0.7,-0.3,head);
      const sensor=this.P(S(0.06,col,{e:1.7}),0.4,0.98,-0.3,head);
      sensor.userData.anim=(dt,t)=>{ sensor.material.emissiveIntensity=1.2+Math.sin(t*5)*0.6; };
      this.animated.add(sensor);
      muzzle=new THREE.Vector3(0,hy+0.75,0.45);
      break; }
    case 'market': {
      // food stall: sturdy counter, curved striped awning, floating burger holo
      this.P(B(0.95,0.5,0.7,0x8a6f4d),0,0.25,0,head);
      this.P(B(1.0,0.06,0.75,CERAMIC),0,0.53,0,head);
      for(const sx of [0.42,-0.42]) this.P(CY(0.035,0.035,0.8,GRAPH2,{},8),sx,0.9,0.25,head);
      const awn=this.P(this.arc(0.62,0.07,Math.PI,0xe05a5a,{}),0,1.28,0.15,head);
      awn.rotation.z=Math.PI/2; awn.rotation.y=Math.PI/2; awn.scale.set(1,1,1.5);
      const awn2=this.P(this.arc(0.63,0.05,Math.PI,CERAMIC,{}),0,1.28,0.15,head);
      awn2.rotation.z=Math.PI/2; awn2.rotation.y=Math.PI/2; awn2.scale.set(1,1,0.7);
      const sign=this.P(B(0.4,0.26,0.04,col,{e:0.7}),0,0.86,0.42,head);
      sign.userData.anim=(dt,t)=>{ sign.rotation.z=Math.sin(t*1.3)*0.1; sign.material.emissiveIntensity=0.5+Math.sin(t*2)*0.3; };
      this.animated.add(sign);
      const snack=new THREE.Group(); snack.position.set(0,1.75,0.1); head.add(snack);
      this.P(this.dome(0.16,0xf2c94c,{e:0.6}),0,0.05,0,snack);
      this.P(CY(0.16,0.16,0.05,0x9b5f45,{e:0.5},10),0,0.02,0,snack);
      this.P(CY(0.17,0.17,0.03,0x6dbf5c,{e:0.5},10),0,-0.02,0,snack);
      this.P(CY(0.15,0.16,0.05,0xf2c94c,{e:0.6},10),0,-0.07,0,snack);
      snack.userData.anim=(dt,t)=>{ snack.position.y=1.75+Math.sin(t*1.8)*0.08; snack.rotation.y=t*1.2; };
      this.animated.add(snack);
      for(let i=0;i<2;i++){
        const puff=this.P(S(0.05,CERAMIC,{o:0.5}),0.25-i*0.5,0.62,0,head);
        puff.userData.anim=(dt,t)=>{ const k=(t*0.7+i*0.5)%1.4;
          puff.visible=k<1; puff.position.y=0.62+k*0.5; puff.scale.setScalar(0.6+k); };
        this.animated.add(puff);
      }
      break; }
    case 'radar': {
      // twin-blade AESA scanner on a mast, live sweep line, ping orb
      this.P(CY(0.14,0.2,1.1,GRAPH2,{m:0.3},10),0,0.5,0,head);
      const collar=this.P(this.torus(0.2,0.03,col,{e:1.0}),0,0.98,0,head);
      collar.rotation.x=Math.PI/2;
      const gimbal=new THREE.Group(); gimbal.position.y=1.28; head.add(gimbal);
      for(const sx of [1,-1]){
        const blade=this.P(B(0.95,0.5,0.06,GRAPH,{m:0.2}),sx*0.5,0,0,gimbal);
        blade.rotation.y=sx*0.12;
        const face=this.P(B(0.85,0.4,0.02,col,{e:0.85}),sx*0.5,0,sx*0.05,gimbal);
        face.rotation.y=sx*0.12;
      }
      const sweep=this.P(B(0.05,0.42,0.03,0xffffff,{e:1.9}),0,0,0.07,gimbal);
      sweep.userData.anim=(dt,t)=>{ sweep.position.x=Math.sin(t*2.4)*0.85; };
      this.animated.add(sweep);
      gimbal.userData.anim=(dt,t)=>{ gimbal.rotation.y=t*1.5; };
      this.animated.add(gimbal);
      const orb=this.P(S(0.09,0xd7fbe8,{e:1.9}),0,1.78,0,head);
      orb.userData.anim=(dt,t)=>{ orb.material.emissiveIntensity=1.3+((Math.sin(t*3)>0.6)?0.9:0); };
      this.animated.add(orb);
      this._holo(head,0,1.05,0,0.5,col,0.9);
      break; }
  }
  const recoilAmp={ mg:0.24, scatter:0.34, mortar:0.5, sniper:0.55, rail:0.6, missile:0.2 }[id]||0.2;
  g.add(this.aoDisc(0.85));
  g.scale.setScalar(1.22); muzzle.multiplyScalar(1.22);
  g.userData={ head, barrel, muzzleLocal:muzzle, recoil:0, recoilAmp, cosmetics:null };
  return g;
};

/* ---------- THE BASE ---------- */
E.makeBase=function(){
  const g=new THREE.Group();
  this.P(this.cyl(2.1,2.4,0.4,GRAPH,{},12),0,0.2,0,g);
  this.P(this.cyl(1.7,2.0,0.35,GRAPH2,{},12),0,0.55,0,g);
  const rim=this.P(this.torus(1.85,0.05,0x4ade80,{e:1.0}),0,0.45,0,g);
  rim.rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){ const a=i*Math.PI/3;
    const fin=this.P(this.caps(0.14,0.7,CERAMIC,{}),Math.cos(a)*1.6,0.85,Math.sin(a)*1.6,g);
    fin.rotation.z=Math.cos(a)*0.15; fin.rotation.x=Math.sin(a)*0.15;
  }
  this.P(this.cyl(0.8,1.3,1.2,GRAPH2,{m:0.3},12),0,1.25,0,g);
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(0.7), this.mat(0x4ade80,{e:1.3}));
  core.position.y=2.8; g.add(core);
  core.userData.anim=(dt,t)=>{ core.position.y=2.8+Math.sin(t*1.6)*0.12; core.rotation.y=t*0.9; };
  this.animated.add(core);
  const ring=this.P(this.torus(1.0,0.045,0x9fe8bd,{e:0.9}),0,2.8,0,g);
  const ring2=this.P(this.torus(1.35,0.028,0x9fe8bd,{e:0.6}),0,2.8,0,g);
  ring.userData.anim=(dt,t)=>{ ring.rotation.y=t*0.8; ring.rotation.x=Math.sin(t*0.5)*0.5; ring.position.y=2.8+Math.sin(t*1.6)*0.12; };
  ring2.userData.anim=(dt,t)=>{ ring2.rotation.y=-t*0.5; ring2.rotation.z=Math.sin(t*0.4)*0.6; ring2.position.y=2.8+Math.sin(t*1.6)*0.12; };
  this.animated.add(ring); this.animated.add(ring2);
  g.userData.core=core;
  g.add(this.aoDisc(2.4));
  return g;
};

/* ---------- BLOCKS ---------- */
E.makeBlock=function(type){
  const C=TD.CONFIG.CELL, g=new THREE.Group();
  switch(type){
    case 'block': {
      this.P(this.box(C*0.92,1.3,C*0.92,GRAPH2),0,0.65,0,g);
      this.P(this.box(C*0.98,0.14,C*0.98,CERAMIC),0,1.37,0,g);
      for(const [x,z] of [[1,1],[1,-1],[-1,1],[-1,-1]])
        this.P(this.box(0.09,1.34,0.09,0x7dd3fc,{e:0.7}),x*C*0.44,0.67,z*C*0.44,g);
      this.P(this.box(C*0.7,0.03,C*0.7,0x7dd3fc,{e:0.9}),0,1.46,0,g);
      break; }
    case 'wire': {
      for(const z of [-C*0.85,0,C*0.85]){
        for(const x of [-0.6,0.6]){
          const post=this.P(this.caps(0.06,0.6,GRAPH2,{}),x,0.42,z,g);
          const tip=this.P(this.sph(0.055,0xffb36b,{e:1.5},10),x,0.86,z,g);
          tip.userData.anim=(dt,t)=>{ tip.material.emissiveIntensity=1+Math.sin(t*4+x+z)*0.5; };
          this.animated.add(tip);
        }
      }
      for(const x of [-0.6,0.6]) for(const y of [0.3,0.6]){
        const w=this.P(this.cyl(0.018,0.018,C*1.8,0x8f8577,{m:0.5},6),x,y,0,g);
        w.rotation.x=Math.PI/2;
      }
      for(let i=0;i<7;i++){
        const coil=this.torus(0.16,0.022,0xb08968,{m:0.5},12);
        coil.position.set((i%2?0.6:-0.6),0.45,-C*0.82+i*C*0.28);
        coil.rotation.y=Math.PI/2+i*0.8; g.add(coil);
      }
      const beam=this.P(this.cyl(0.014,0.014,C*1.7,0xffb36b,{e:1.3},6),0,0.76,0,g);
      beam.rotation.x=Math.PI/2;
      beam.userData.anim=(dt,t)=>{ beam.material.emissiveIntensity=0.8+Math.sin(t*6)*0.5; };
      this.animated.add(beam);
      break; }
    case 'tar': {
      this.P(this.cyl(0.95,1.0,0.1,0xcbb26a,{},14),0,0.05,0,g);
      this.P(this.cyl(0.7,0.75,0.06,0xb89d55,{},14),0,0.11,0,g);
      const swirl=this.P(this.torus(0.45,0.05,0xa5894a),0,0.13,0,g); swirl.rotation.x=Math.PI/2;
      const swirl2=this.P(this.torus(0.25,0.04,0x97803f),0,0.15,0,g); swirl2.rotation.x=Math.PI/2;
      swirl.userData.anim=(dt,t)=>{ swirl.rotation.z=t*0.7; };
      swirl2.userData.anim=(dt,t)=>{ swirl2.rotation.z=-t*1.1; };
      this.animated.add(swirl); this.animated.add(swirl2);
      for(let i=0;i<3;i++){
        const puff=this.sph(0.05,0xd9c17e,{},8);
        const a=i*2.1, rr=0.2+((i*7)%3)*0.15;
        puff.position.set(Math.cos(a)*rr,0.12,Math.sin(a)*rr); g.add(puff);
        puff.userData.anim=(dt,t)=>{ const k=(t*0.8+i*0.9)%2;
          if (k<1.5){ puff.visible=true; puff.position.y=0.1+(k/1.5)*0.1; puff.scale.setScalar(0.5+k/1.5); }
          else puff.visible=false; };
        this.animated.add(puff);
      }
      break; }
    case 'spike': {
      this.P(this.cyl(0.8,0.9,0.14,GRAPH2,{},12),0,0.07,0,g);
      const glowRing=this.P(this.torus(0.62,0.025,0x7dd3fc,{e:0.9}),0,0.15,0,g);
      glowRing.rotation.x=Math.PI/2;
      glowRing.userData.anim=(dt,t)=>{ glowRing.material.emissiveIntensity=0.7+Math.sin(t*3)*0.4; };
      this.animated.add(glowRing);
      for(let i=0;i<5;i++){
        const a=i/5*Math.PI*2, rr=i===0?0:0.45;
        const x=i===0?0:Math.cos(a)*rr, z=i===0?0:Math.sin(a)*rr;
        this.P(this.cone(0.14,0.6,CERAMIC,{},10),x,0.42,z,g);
        this.P(this.cone(0.05,0.28,0x7dd3fc,{e:1.3},8),x,0.6,z,g);
      }
      break; }
    case 'trap': {
      this.P(this.box(C*0.98,0.14,C*0.98,GRAPH2),0,0.07,0,g);
      for(let i=0;i<4;i++){
        const st=this.box(0.3,0.15,0.12,i%2?0xf2c94c:0x22262b);
        st.position.set(-0.65+i*0.44,0.08,C*0.44); g.add(st);
        const st2=st.clone(); st2.position.z=-C*0.44; g.add(st2);
      }
      const glow=this.P(this.box(C*0.8,0.02,C*0.8,0xff5f5f,{e:1.2}),0,0.03,0,g);
      glow.userData.anim=(dt,t)=>{ glow.material.emissiveIntensity=0.5+Math.sin(t*3)*0.4; };
      this.animated.add(glow);
      const doorL=new THREE.Group(); doorL.position.set(-C*0.42,0.12,0); g.add(doorL);
      this.P(this.box(C*0.42,0.06,C*0.84,0x6b7d8f,{m:0.4}),C*0.21,0,0,doorL);
      const doorR=new THREE.Group(); doorR.position.set(C*0.42,0.12,0); g.add(doorR);
      this.P(this.box(C*0.42,0.06,C*0.84,0x6b7d8f,{m:0.4}),-C*0.21,0,0,doorR);
      g.userData.doors=[doorL,doorR];
      break; }
  }
  return g;
};

/* ---------- ENEMY VEHICLES — curvy hulls, engine glow ---------- */
E.makeEnemy=function(type){
  const d=TD.ENEMIES[type], g=new THREE.Group(), s=d.size, col=d.color;
  const parts={ wheels:[] };
  const W=(r,w,x,y,z)=>{ const wh=this._wheel(r,w,g,x,y,z); parts.wheels.push(wh); return wh; };
  const hull=(r,len,c,y,z,o)=>{ const h=this.P(this.caps(r,len,c,o),0,y,z||0,g); h.rotation.x=Math.PI/2; return h; };
  const glowdisc=(r,x,y,z,c=0xff8a4d)=>{ const e2=this.P(this.cyl(r,r,0.04,c,{e:1.6},10),x,y,z,g);
    e2.rotation.x=Math.PI/2;
    e2.userData.anim=(dt,t)=>{ e2.material.emissiveIntensity=1.1+Math.sin(t*9+x+z)*0.5; };
    this.animated.add(e2); return e2; };
  const bubble=(r,x,y,z,sy=0.7)=>{ const b=this.P(this.dome(r,GLASS,{e:0.3},12),x,y,z,g); b.scale.y=sy; return b; };
  switch(type){
    case 'junker': {
      hull(0.36,0.95,col,0.46);
      bubble(0.3,0,0.68,-0.15,0.8);
      const bump=this.P(this.arc(0.4,0.05,Math.PI,0x6a5c50,{m:0.3}),0,0.4,0.82,g);
      bump.rotation.x=Math.PI/2;
      glowdisc(0.06,0.24,0.44,0.86,0xffe6a8); glowdisc(0.06,-0.24,0.44,0.86,0xffe6a8);
      glowdisc(0.14,0,0.46,-0.92);
      this.P(this.cyl(0.04,0.05,0.3,0x3a3f45,{},8),-0.3,0.32,-0.85,g).rotation.x=Math.PI/2;
      W(0.26,0.16,0.44,0.26,0.5); W(0.26,0.16,-0.44,0.26,0.5);
      W(0.26,0.16,0.44,0.26,-0.48); W(0.26,0.16,-0.44,0.26,-0.48);
      break; }
    case 'buggy': {
      hull(0.26,0.85,col,0.36);
      bubble(0.24,0,0.55,-0.08);
      const bar=this.P(this.arc(0.32,0.045,Math.PI,0x3a3f45,{m:0.4}),0,0.62,-0.35,g);
      const scoop=this.P(this.dome(0.24,0x5d5546,{}),0,0.42,0.62,g);
      scoop.rotation.x=0.5; scoop.scale.y=0.5;
      glowdisc(0.11,0,0.4,-0.7,0xffd166);
      W(0.2,0.14,0.33,0.2,0.48); W(0.2,0.14,-0.33,0.2,0.48);
      W(0.3,0.2,0.36,0.3,-0.4); W(0.3,0.2,-0.36,0.3,-0.4);
      break; }
    case 'moto': {
      hull(0.13,0.7,col,0.42);
      this.P(this.caps(0.09,0.18,0x39404a,{}),0,0.68,-0.08,g);
      this.P(this.sph(0.1,0x2c3138,{},12),0,0.9,-0.08,g);
      const bars=this.P(this.arc(0.14,0.02,Math.PI,0x3a3f45,{}),0,0.62,0.32,g);
      bars.rotation.x=-Math.PI/2;
      glowdisc(0.07,0,0.42,-0.5,0x7dd3fc);
      W(0.22,0.08,0,0.22,0.38); W(0.22,0.08,0,0.22,-0.34);
      break; }
    case 'rammer': {
      hull(0.34,0.85,col,0.5,-0.1);
      const plow=this.P(this.shell(0.5,1.0,0x3c3f44,{m:0.4}),0,0.5,0.78,g);
      plow.rotation.z=Math.PI/2; plow.rotation.y=Math.PI;
      this.P(this.torus(0.36,0.035,0xf2c94c,{e:0.5}),0,0.5,0.72,g);
      const core=this.P(this.sph(0.15,0xff4030,{e:1.7},12),0,0.78,-0.28,g);
      core.userData.anim=(dt,t)=>{ core.material.emissiveIntensity=1.2+Math.sin(t*11)*0.8; core.scale.setScalar(1+Math.sin(t*11)*0.12); };
      this.animated.add(core);
      glowdisc(0.13,0,0.5,-0.78);
      W(0.24,0.16,0.4,0.24,0.45); W(0.24,0.16,-0.4,0.24,0.45);
      W(0.24,0.16,0.4,0.24,-0.44); W(0.24,0.16,-0.4,0.24,-0.44);
      break; }
    case 'apc': {
      g.userData.smoke=[-0.4,0.85,-0.8];
      hull(0.48,0.85,col,0.58,0,{m:0.3});
      const tur=this.P(this.dome(0.28,0x5f7183,{m:0.3}),0,0.95,-0.15,g);
      this.P(this.cyl(0.035,0.035,0.45,0x2d3239,{},8),0.08,1.05,0.1,g).rotation.x=Math.PI/2;
      bubble(0.16,0,0.85,0.55,0.6);
      glowdisc(0.16,0,0.58,-0.95,0x9fd0ff);
      for(const z of [0.5,0,-0.5]){ W(0.24,0.18,0.48,0.24,z); W(0.24,0.18,-0.48,0.24,z); }
      break; }
    case 'chopper': {
      const body=this.P(this.caps(0.32,0.55,col,{}),0,1.3,0.15,g);
      body.rotation.x=Math.PI/2;
      const nose=this.P(this.dome(0.3,GLASS,{e:0.3},12),0,1.3,0.6,g);
      nose.rotation.x=Math.PI/2;
      const tail=this.P(this.cyl(0.05,0.13,1.0,new THREE.Color(col).offsetHSL(0,0,-0.06).getHex(),{},10),0,1.38,-0.95,g);
      tail.rotation.x=Math.PI/2;
      const fin=this.P(this.sph(0.05,col,{},8),0,1.55,-1.45,g);
      fin.scale.set(0.5,3.2,1.6);
      const rotor=new THREE.Group(); rotor.position.set(0,1.68,0.15); g.add(rotor);
      this.P(this.box(2.3,0.025,0.1,0x22262b),0,0,0,rotor);
      this.P(this.box(0.1,0.025,2.3,0x22262b),0,0,0,rotor);
      this.P(this.sph(0.08,0x22262b,{},8),0,0.03,0,rotor);
      parts.rotor=rotor;
      const tr=new THREE.Group(); tr.position.set(0.08,1.52,-1.42); g.add(tr);
      this.P(this.box(0.02,0.5,0.07,0x22262b),0,0,0,tr); parts.tailRotor=tr;
      for(const sx of [0.24,-0.24]){ const skid=this.P(this.caps(0.03,0.85,0x3a3f45,{}),sx,0.92,0.1,g); skid.rotation.x=Math.PI/2; }
      glowdisc(0.1,0,1.28,-0.5,0xffd166);
      break; }
    case 'hauler': {
      g.userData.smoke=[0.4,1.0,0.5];
      const cab=this.P(this.caps(0.34,0.35,0x8a6f3f,{}),0,0.6,0.85,g);
      cab.rotation.x=Math.PI/2;
      bubble(0.26,0,0.78,1.0,0.6);
      const tank=this.P(this.caps(0.45,1.1,col,{}),0,0.72,-0.4,g);
      tank.rotation.x=Math.PI/2;
      for(const z of [-0.1,-0.7]) this.P(this.torus(0.46,0.03,0x8f7440,{m:0.4}),0,0.72,z,g);
      glowdisc(0.15,0,0.6,-1.15);
      for(const z of [0.7,-0.15,-0.8]){ W(0.26,0.18,0.46,0.26,z); W(0.26,0.18,-0.46,0.26,z); }
      break; }
    case 'shieldvan': {
      hull(0.42,0.75,col,0.62);
      bubble(0.3,0,0.9,0.4,0.55);
      this.P(this.cyl(0.06,0.09,0.3,0x44505e,{},8),0,1.12,-0.2,g);
      const emitter=this.P(this.sph(0.12,0x9fd0ff,{e:1.9},12),0,1.3,-0.2,g);
      const dome=this.P(this.sph(1.35,0x7fa7d8,{e:0.3,o:0.12},16),0,0.75,0,g);
      dome.castShadow=false;
      dome.userData.anim=(dt,t)=>{ dome.scale.setScalar(1+Math.sin(t*2.2)*0.05); };
      emitter.userData.anim=(dt,t)=>{ emitter.material.emissiveIntensity=1.4+Math.sin(t*5)*0.6; };
      this.animated.add(dome); this.animated.add(emitter);
      glowdisc(0.14,0,0.62,-0.85,0x9fd0ff);
      W(0.24,0.16,0.44,0.24,0.46); W(0.24,0.16,-0.44,0.24,0.46);
      W(0.24,0.16,0.44,0.24,-0.46); W(0.24,0.16,-0.44,0.24,-0.46);
      break; }
    case 'mechvan': {
      hull(0.4,0.85,col,0.62);
      bubble(0.28,0,0.9,0.5,0.55);
      this.P(this.caps(0.05,0.28,0xd84343,{e:0.7}),0,0.72,-0.85,g).rotation.z=Math.PI/2;
      this.P(this.caps(0.05,0.28,0xd84343,{e:0.7}),0,0.72,-0.85,g);
      const beacon=this.P(this.sph(0.1,0xff9c50,{e:1.9},12),0,1.1,0.2,g);
      beacon.userData.anim=(dt,t)=>{ beacon.material.emissiveIntensity=1+Math.sin(t*8)*0.9; };
      this.animated.add(beacon); parts.beacon=beacon;
      glowdisc(0.13,0,0.62,-0.9,0x86efac);
      W(0.24,0.16,0.42,0.24,0.48); W(0.24,0.16,-0.42,0.24,0.48);
      W(0.24,0.16,0.42,0.24,-0.48); W(0.24,0.16,-0.42,0.24,-0.48);
      break; }
    case 'prowler': {
      const body=hull(0.32,0.95,col,0.32,0,{m:0.5});
      body.scale.set(1,0.55,1);
      bubble(0.22,0,0.5,0.1,0.6).material=this.mat(0x14171c,{m:0.6});
      const fin=this.P(this.sph(0.05,col,{m:0.5},8),0,0.55,-0.75,g);
      fin.scale.set(0.4,2.6,1.8);
      const glow=this.P(this.cyl(0.5,0.5,0.02,0x8f4fd6,{e:1.4},12),0,0.09,0,g);
      glow.rotation.x=0; parts.underglow=glow;
      glowdisc(0.11,0,0.32,-0.9,0x8f4fd6);
      W(0.2,0.14,0.38,0.2,0.48); W(0.2,0.14,-0.38,0.2,0.48);
      W(0.2,0.14,0.38,0.2,-0.48); W(0.2,0.14,-0.38,0.2,-0.48);
      break; }
    case 'digger': {
      hull(0.36,0.75,col,0.54,-0.15);
      bubble(0.22,0,0.85,-0.35,0.6);
      const drill=this.cone(0.3,0.85,0x9aa3ad,{m:0.6,r:0.3},12);
      drill.rotation.x=Math.PI/2; drill.position.set(0,0.5,0.9); g.add(drill);
      parts.drill=drill;
      this.P(this.torus(0.32,0.05,0xd9a066,{e:0.5}),0,0.5,0.48,g);
      glowdisc(0.13,0,0.54,-0.8,0xd9a066);
      for(const z of [0.3,-0.38]){ W(0.26,0.2,0.44,0.26,z); W(0.26,0.2,-0.44,0.26,z); }
      break; }
    case 'tank': {
      g.userData.smoke=[0.38,0.95,-0.75];
      hull(0.42,0.95,col,0.55);
      for(const x of [0.55,-0.55]){
        const pod=this.P(this.caps(0.2,1.3,0x2c2f33,{}),x,0.28,0,g);
        pod.rotation.x=Math.PI/2;
        for(let i=0;i<3;i++) W(0.13,0.24,x,0.16,0.45-i*0.45);
      }
      const tur=this.P(this.dome(0.34,new THREE.Color(col).offsetHSL(0,0,-0.05).getHex(),{m:0.2}),0,0.9,-0.1,g);
      const gun=this.P(this.cyl(0.05,0.07,1.35,0x2d3239,{m:0.5},10),0,0.98,0.6,g);
      gun.rotation.x=Math.PI/2;
      this.P(this.torus(0.08,0.022,0xff8a4d,{e:1.3}),0,0.98,1.24,g);
      glowdisc(0.16,0,0.55,-1.05);
      break; }
    case 'gunship': {
      const body=this.P(this.caps(0.36,0.95,col,{}),0,1.3,0,g);
      body.rotation.x=Math.PI/2;
      const nose=this.P(this.dome(0.3,GLASS,{e:0.3},12),0,1.32,0.72,g);
      nose.rotation.x=Math.PI/2;
      for(const sx of [0.6,-0.6]){
        const wing=this.P(this.caps(0.07,0.7,new THREE.Color(col).offsetHSL(0,0,-0.06).getHex(),{}),sx,1.32,-0.15,g);
        wing.rotation.z=Math.PI/2;
        this.P(this.cyl(0.09,0.09,0.4,0x2d3239,{},8),sx,1.18,-0.15,g).rotation.x=Math.PI/2;
      }
      const rotor=new THREE.Group(); rotor.position.set(0.6,1.66,-0.15); g.add(rotor);
      this.P(this.box(1.5,0.025,0.09,0x22262b),0,0,0,rotor);
      this.P(this.box(0.09,0.025,1.5,0x22262b),0,0,0,rotor);
      const rotor2=rotor.clone(); rotor2.position.x=-0.6; g.add(rotor2);
      parts.rotor=rotor; parts.tailRotor=rotor2;
      const fin=this.P(this.sph(0.05,col,{},8),0,1.55,-0.85,g);
      fin.scale.set(0.4,2.4,1.6);
      glowdisc(0.12,0,1.28,-0.95,0xc084fc);
      break; }
    case 'racer': {
      const body=hull(0.28,1.05,col,0.3,0,{m:0.4});
      body.scale.set(1,0.6,1);
      bubble(0.18,0,0.46,0.05,0.7);
      const wing=this.P(this.arc(0.34,0.035,Math.PI,col,{m:0.4}),0,0.5,-0.78,g);
      wing.rotation.x=Math.PI; wing.rotation.z=0;
      const flame=this.P(this.sph(0.08,0x7dd3fc,{e:2},10),0,0.3,-0.95,g);
      flame.userData.anim=(dt,t)=>{ flame.scale.set(1,1,1.4+Math.sin(t*22)*0.5); };
      this.animated.add(flame);
      glowdisc(0.1,0,0.3,-0.88,0x7dd3fc);
      W(0.2,0.13,0.33,0.2,0.52); W(0.2,0.13,-0.33,0.2,0.52);
      W(0.22,0.16,0.35,0.22,-0.52); W(0.22,0.16,-0.35,0.22,-0.52);
      break; }
    case 'boss': {
      g.userData.smoke=[0.42,2.1,-0.55];
      const low=this.P(this.caps(0.68,1.35,col,{r:0.6}),0,0.8,0,g);
      low.rotation.x=Math.PI/2;
      const top=this.P(this.caps(0.42,0.75,new THREE.Color(col).offsetHSL(0,0.05,-0.04).getHex(),{}),0,1.4,-0.25,g);
      top.rotation.x=Math.PI/2;
      bubble(0.24,0,1.62,0.25,0.6);
      const plow=this.P(this.shell(0.85,1.7,0x3c3f44,{m:0.5}),0,0.65,1.15,g);
      plow.rotation.z=Math.PI/2; plow.rotation.y=Math.PI;
      for(let i=0;i<5;i++) this.P(this.cone(0.08,0.32,0x9aa3ad,{m:0.6},8),(i-2)*0.34,0.85,1.32,g).rotation.x=Math.PI/2-0.3;
      for(const x of [0.4,-0.4]) this.P(this.cyl(0.09,0.12,0.7,0x2a2d31,{},10),x,1.95,-0.55,g);
      const core=this.P(this.sph(0.27,0xff4040,{e:1.7},14),0,1.45,0.45,g);
      core.userData.anim=(dt,t)=>{ core.scale.setScalar(1+Math.sin(t*3)*0.14); };
      this.animated.add(core);
      glowdisc(0.24,0,0.8,-1.35);
      for(const z of [0.75,0.25,-0.25,-0.75]){ W(0.3,0.24,0.68,0.3,z); W(0.3,0.24,-0.68,0.3,z); }
      break; }
  }
  g.userData.parts=parts; g.userData.phase=Math.random()*7; g.userData.size=s; g.userData.fly=!!d.fly;
  if (!d.fly) g.add(this.aoDisc(0.95));
  const bs=1.12*s;
  g.userData.baseScale=bs;
  if (g.userData.smoke) g.userData.smoke=g.userData.smoke.map(v=>v*bs);
  g.scale.setScalar(bs);
  return g;
};
})();

/* ============ FEATURE VISUALS: crates, ranks, elites, boss shield, orbital ============ */
(function(){
const E=TD.Engine.prototype;
const RANKCOL=[0xcd7f32,0xc0c0c0,0xffd166,0x7dd3fc];

E.makeCrate=function(){
  const g=new THREE.Group();
  this.P(this.box(0.5,0.38,0.5,0x8a7440),0,0.32,0,g);
  this.P(this.box(0.54,0.1,0.54,0xc9a227,{m:0.4}),0,0.32,0,g);
  const glow=this.P(this.box(0.56,0.05,0.12,0xffd166,{e:1.5}),0,0.32,0,g);
  glow.userData.anim=(dt,t)=>{ glow.material.emissiveIntensity=1+Math.sin(t*5)*0.6; };
  this.animated.add(glow);
  const halo=this.P(this.torus(0.42,0.02,0xffd166,{e:1.2}),0,0.1,0,g);
  halo.rotation.x=Math.PI/2;
  halo.userData.anim=(dt,t)=>{ halo.rotation.z=t*2; };
  this.animated.add(halo);
  return g;
};
E.rankBadge=function(model,rank){
  if (model.userData.rankGroup){ model.remove(model.userData.rankGroup); }
  if (!rank) return;
  const g=new THREE.Group(); model.userData.rankGroup=g; model.add(g);
  for(let i=0;i<Math.min(rank,4);i++){
    const chev=this.cone(0.09,0.14,RANKCOL[Math.min(rank,4)-1],{e:0.7},4);
    chev.position.set(0.62,0.22+i*0.16,0.62); chev.rotation.y=Math.PI/4;
    g.add(chev);
  }
};
E.eliteRing=function(model,color){
  const ring=this.P(this.torus(0.85,0.045,color,{e:1.3}),0,0.1,0,model);
  ring.rotation.x=Math.PI/2;
  ring.userData.anim=(dt,t)=>{ ring.material.emissiveIntensity=1+Math.sin(t*4)*0.5; ring.rotation.z=t*1.5; };
  this.animated.add(ring);
  return ring;
};
E.makeBossDome=function(){
  const dome=this.sph(2.6,0x7dd3fc,{e:0.4,o:0.16},18);
  dome.castShadow=false;
  dome.userData.anim=(dt,t)=>{ dome.material.emissiveIntensity=0.3+Math.sin(t*2.5)*0.15; };
  this.animated.add(dome);
  return dome;
};
E.makeReticle=function(r){
  const g=new THREE.Group();
  const ring=this.P(this.torus(r,0.06,0xff5f5f,{e:1.3}),0,0.15,0,g);
  ring.rotation.x=Math.PI/2;
  const ring2=this.P(this.torus(r*0.55,0.04,0xffd166,{e:1.2}),0,0.18,0,g);
  ring2.rotation.x=Math.PI/2;
  g.userData.anim=(dt,t)=>{ ring.rotation.z=t*1.6; ring2.rotation.z=-t*2.4; };
  this.animated.add(g); // group anim via userData on g
  const self=this;
  g.userData.anim=(dt,t)=>{ ring.rotation.z=t*1.6; ring2.rotation.z=-t*2.4; };
  this.scene.add(g);
  return g;
};
E.orbitalWarn=function(pos,r){
  this.ring(pos,r,0xff5f5f,1.2);
  const beam=this.P(this.cyl(0.14,0.14,60,0xff8f8f,{e:1.4}),pos.x,30,pos.z,this.scene);
  beam.material=beam.material.clone(); beam.material.transparent=true; beam.material.opacity=0.5;
  this.tween(1.2,k=>{ beam.material.opacity=0.5*(1-k*0.4); beam.scale.x=beam.scale.z=1+k*2; if(k>=1) this.scene.remove(beam); });
};
E.orbitalHit=function(pos,r){
  const beam=this.P(this.cyl(1.1,1.1,70,0xffffff,{e:2}),pos.x,35,pos.z,this.scene);
  beam.material=beam.material.clone(); beam.material.transparent=true;
  this.tween(0.45,k=>{ beam.material.opacity=1-k; beam.scale.x=beam.scale.z=1+k*1.5; if(k>=1) this.scene.remove(beam); });
  this.explosion(pos,r,0xffd166);
  this.explosion(pos,r*0.6,0xffffff);
  this.burst(pos.clone().setY(1),0xffe8a0,40,10,0.8,8);
  this.ring(pos,r*1.4,0xffd166,0.6);
  this.shakeCam(1.2);
};
})();

/* ============ UPGRADE COSMETICS v2 — every tier visibly changes the turret ============ */
(function(){
const E=TD.Engine.prototype;
E.applyCosmetics=function(model,id,tiers){
  const u=model.userData;
  if (u.cosmetics){ model.remove(u.cosmetics); u.cosmetics.traverse(o=>{ this.animated.delete(o); }); }
  const c=new THREE.Group(); u.cosmetics=c; model.add(c);
  const head=u.head||model, col=TD.TOWERS[id].color, hy=head.position.y;
  const add=(mesh,x,y,z)=>{ mesh.position.set(x,y,z); c.add(mesh); return mesh; };
  const b2=u.head&&u.head.userData.b2;
  // RATE (top): heat fins → amber booster ring → golden spinner + longer barrels
  if (tiers[0]>=1) for(const sx of [0.28,-0.28]) add(this.box(0.07,0.16,0.45,0x22262b,{m:0.5}),sx,hy+0.32,0.05);
  if (tiers[0]>=2){ const r=add(this.torus(0.2,0.035,0xffb36b,{e:1.1}),0,hy+0.12,0.75);
    r.userData.anim=(dt,t)=>{ r.material.emissiveIntensity=0.9+Math.sin(t*7)*0.4; }; this.animated.add(r); }
  if (tiers[0]>=3){ const d2=add(this.torus(0.26,0.05,0xffd166,{e:1.0,m:0.5}),0,hy+0.12,0.5);
    d2.userData.anim=(dt,t)=>{ d2.rotation.z=t*7; }; this.animated.add(d2);
    if (u.barrel) u.barrel.scale.z=1.15;
    if (b2) b2.scale.z=1.15;
  } else { if(u.barrel) u.barrel.scale.z=1; if(b2) b2.scale.z=1; }
  // SYSTEMS (middle): whip antenna → scanner orb → floating holo ring
  if (tiers[1]>=1){ add(this.cyl(0.015,0.025,0.7,0xaab4bf,{m:0.6},6),0.34,hy+0.55,-0.25);
    const tip=add(this.sph(0.05,0x7dd3fc,{e:1.7},8),0.34,hy+0.95,-0.25);
    tip.userData.anim=(dt,t)=>{ tip.material.emissiveIntensity=1+Math.sin(t*5)*0.7; }; this.animated.add(tip); }
  if (tiers[1]>=2){ const sc=add(this.sph(0.09,0x7dd3fc,{e:0.9},10),-0.36,hy+0.7,-0.25);
    sc.userData.anim=(dt,t)=>{ sc.rotation.y=t*3; sc.position.y=hy+0.7+Math.sin(t*2.4)*0.06; }; this.animated.add(sc); }
  if (tiers[1]>=3){ const h=add(this.torus(0.55,0.025,0x7dd3fc,{e:1.2}),0,hy+0.95,0);
    h.rotation.x=Math.PI/2;
    h.userData.anim=(dt,t)=>{ h.rotation.z=t*1.4; h.position.y=hy+0.95+Math.sin(t*1.8)*0.06; }; this.animated.add(h); }
  // POWER (bottom): ceramic armor pods → thicker barrels → pulsing power ring + bigger head
  if (tiers[2]>=1) for(const sx of [0.38,-0.38]){ const pod=add(this.caps(0.09,0.3,0xdfe5ea,{}),sx,hy+0.02,-0.1);
    pod.rotation.x=Math.PI/2; }
  if (tiers[2]>=2){ if(u.barrel){ u.barrel.scale.x=u.barrel.scale.y=1.25; } if(b2){ b2.scale.x=b2.scale.y=1.25; } }
  else { if(u.barrel){ u.barrel.scale.x=u.barrel.scale.y=1; } if(b2){ b2.scale.x=b2.scale.y=1; } }
  if (tiers[2]>=3){ const ring=add(this.torus(0.62,0.05,col,{e:1.1}),0,0.45,0);
    ring.rotation.x=Math.PI/2;
    ring.userData.anim=(dt,t)=>{ ring.rotation.z=t*1.5; ring.material.emissiveIntensity=0.8+Math.sin(t*3)*0.4; };
    this.animated.add(ring);
    head.scale.setScalar(1.1);
  } else head.scale.setScalar(1);
  // tier pips on the mount rim
  const total=tiers[0]+tiers[1]+tiers[2];
  for(let i=0;i<total;i++) add(this.sph(0.05,0xffd166,{e:1},8),Math.cos(0.6+i*0.4)*0.7,0.28,Math.sin(0.6+i*0.4)*0.7);
};
})();

/* ============ VEHICLES v6 — grounded low-poly (boxy where real vehicles are boxy) ============ */
(function(){
const E=TD.Engine.prototype;
const DARK=0x1d2229, STEEL=0x39424d, GLASSC=0x8fb8cc, RUBBER=0x23272c;
E.makeEnemy=function(type){
  const d=TD.ENEMIES[type], g=new THREE.Group(), s=d.size, col=d.color;
  const parts={ wheels:[] };
  const B=(w,h,dd,c,o)=>this.box(w,h,dd,c,o);
  const P2=(m,x,y,z,rx,ry,rz)=>{ m.position.set(x,y,z); if(rx)m.rotation.x=rx; if(ry)m.rotation.y=ry; if(rz)m.rotation.z=rz; g.add(m); return m; };
  const W=(r,w,x,y,z)=>{ const wh=this._wheel(r,w,g,x,y,z); parts.wheels.push(wh); return wh; };
  const glass=(w,h,dd,x,y,z,rx)=>P2(B(w,h,dd,GLASSC,{e:0.2}),x,y,z,rx||0);
  const engine=(w,x,y,z,c=0xff8a4d)=>{ const e2=P2(B(w,0.09,0.04,c,{e:1.5}),x,y,z);
    e2.userData.anim=(dt,t)=>{ e2.material.emissiveIntensity=1.1+Math.sin(t*9+x)*0.5; };
    this.animated.add(e2); return e2; };
  const shade=k=>new THREE.Color(col).offsetHSL(0,0,k).getHex();
  switch(type){
    case 'junker': {
      P2(B(0.9,0.28,1.7,col),0,0.42,0);                       // body pan
      P2(B(0.86,0.16,0.55,shade(-0.04)),0,0.6,0.5,-0.06);      // hood (slight slope)
      P2(B(0.8,0.34,0.75,shade(-0.06)),0,0.72,-0.15);          // cabin
      glass(0.72,0.24,0.05,0,0.76,0.23,-0.35);                 // windshield
      glass(0.72,0.2,0.05,0,0.74,-0.53,0.3);                   // rear glass
      P2(B(0.6,0.14,0.3,0x5f5148),0,0.62,-0.65);               // trunk junk
      P2(B(0.3,0.18,0.22,0x756a5f),0.18,0.7,-0.62,0,0.3);
      P2(B(0.95,0.1,0.14,0x6a5c50),0,0.32,0.86);               // bumper
      P2(B(0.16,0.08,0.03,0xffe6a8,{e:1.3}),0.3,0.52,0.84);    // headlights
      P2(B(0.16,0.08,0.03,0xffe6a8,{e:1.3}),-0.3,0.52,0.84);
      const ex=this.cyl(0.045,0.045,0.3,0x3a3f45,{},8); P2(ex,-0.36,0.26,-0.86,Math.PI/2);
      for(const z of [0.55,-0.5]) for(const x of [0.46,-0.46]) P2(B(0.12,0.2,0.5,shade(-0.08)),x,0.55,z); // fenders
      engine(0.5,0,0.42,-0.87);
      W(0.26,0.16,0.45,0.26,0.55); W(0.26,0.16,-0.45,0.26,0.55);
      W(0.26,0.16,0.45,0.26,-0.5); W(0.26,0.16,-0.45,0.26,-0.5);
      break; }
    case 'buggy': {
      P2(B(0.56,0.12,1.35,col),0,0.32,0);                      // floor pan
      P2(B(0.42,0.3,0.5,0x4a4438),0,0.5,-0.1);                 // seat block
      P2(B(0.05,0.55,0.05,0x3a3f45),0.24,0.72,-0.34,-0.35);    // roll cage
      P2(B(0.05,0.55,0.05,0x3a3f45),-0.24,0.72,-0.34,-0.35);
      P2(B(0.05,0.5,0.05,0x3a3f45),0.24,0.68,0.12,0.5);
      P2(B(0.05,0.5,0.05,0x3a3f45),-0.24,0.68,0.12,0.5);
      P2(B(0.54,0.05,0.05,0x3a3f45),0,0.95,-0.42);
      P2(B(0.5,0.08,0.34,0x5d5546),0,0.42,0.6,0.25);           // nose
      P2(B(0.6,0.04,0.16,0x3a3f45),0,0.3,0.85);                // splitter
      engine(0.34,0,0.38,-0.7,0xffd166);
      W(0.2,0.13,0.35,0.2,0.5); W(0.2,0.13,-0.35,0.2,0.5);
      W(0.3,0.2,0.4,0.3,-0.42); W(0.3,0.2,-0.4,0.3,-0.42);
      break; }
    case 'moto': {
      P2(B(0.16,0.2,0.55,col),0,0.5,0.05);                     // tank
      P2(B(0.14,0.08,0.3,0x2c3138),0,0.44,-0.3);               // seat
      P2(B(0.04,0.3,0.04,0x8b949e),0.08,0.5,0.38,0.5);         // forks
      P2(B(0.04,0.3,0.04,0x8b949e),-0.08,0.5,0.38,0.5);
      P2(B(0.32,0.05,0.05,0x3a3f45),0,0.68,0.3);               // bars
      P2(B(0.15,0.26,0.16,0x39404a),0,0.72,-0.12);             // rider
      P2(this.sph(0.09,0x2c3138,{},10),0,0.93,-0.12);          // helmet
      engine(0.14,0,0.4,-0.48,0x7dd3fc);
      W(0.22,0.08,0,0.22,0.42); W(0.22,0.08,0,0.22,-0.36);
      break; }
    case 'rammer': {
      P2(B(0.84,0.36,1.4,col),0,0.5,-0.1);
      P2(B(0.7,0.3,0.5,0x8a4030),0,0.82,-0.25);                // cab
      glass(0.6,0.2,0.05,0,0.86,0.02,-0.3);
      P2(B(1.05,0.55,0.1,0x3c3f44,{m:0.4}),0,0.45,0.82,-0.45); // plow upper
      P2(B(1.05,0.35,0.1,0x2f3237,{m:0.4}),0,0.24,0.92,0.25);  // plow lower
      for(let i=0;i<3;i++) P2(B(0.2,0.08,0.04,i%2?0xf2c94c:0x22262b),(i-1)*0.3,0.6,0.9,-0.45);
      const core=P2(this.sph(0.14,0xff4030,{e:1.7},10),0,0.75,-0.6);
      core.userData.anim=(dt,t)=>{ core.material.emissiveIntensity=1.2+Math.sin(t*11)*0.8; core.scale.setScalar(1+Math.sin(t*11)*0.12); };
      this.animated.add(core);
      const st=this.cyl(0.05,0.05,0.35,0x2a2d31,{},8); P2(st,0.3,0.95,-0.5);
      engine(0.44,0,0.46,-0.82);
      W(0.24,0.16,0.44,0.24,0.42); W(0.24,0.16,-0.44,0.24,0.42);
      W(0.24,0.16,0.44,0.24,-0.5); W(0.24,0.16,-0.44,0.24,-0.5);
      break; }
    case 'apc': {
      g.userData.smoke=[-0.42,0.85,-0.85];
      P2(B(0.95,0.4,1.6,col,{m:0.25}),0,0.56,0);
      P2(B(0.88,0.3,0.45,shade(-0.04),{m:0.25}),0,0.62,0.92,0.5);   // glacis
      P2(B(0.99,0.16,1.3,shade(-0.07)),0,0.36,0,0);                  // side skirts
      P2(B(0.5,0.16,0.5,0x5f7183,{m:0.3}),0,0.84,-0.2);              // turret bump
      const mg2=this.cyl(0.035,0.035,0.5,0x2d3239,{},8); P2(mg2,0.1,0.94,0.05,Math.PI/2);
      P2(B(0.5,0.05,0.03,0x9fb4c8,{e:0.6}),0,0.7,0.85);              // view slit
      const ant=this.cyl(0.015,0.015,0.6,0x8b949e,{},6); P2(ant,-0.35,1.1,-0.5);
      engine(0.6,0,0.55,-0.82,0x9fd0ff);
      for(const z of [0.55,0,-0.55]){ W(0.24,0.18,0.5,0.24,z); W(0.24,0.18,-0.5,0.24,z); }
      break; }
    case 'chopper': {
      P2(B(0.55,0.45,1.25,col),0,1.3,0.1);
      P2(B(0.45,0.32,0.35,shade(-0.05)),0,1.28,0.85,0.3);       // chamfered nose
      glass(0.42,0.26,0.06,0,1.42,0.68,-0.5);
      P2(B(0.16,0.14,1.0,shade(-0.06)),0,1.38,-0.95);           // tail boom
      P2(B(0.05,0.4,0.24,col),0,1.55,-1.45);                    // fin
      P2(B(0.06,0.05,1.0,0x3a3f45),0.26,0.98,0.1);              // skids
      P2(B(0.06,0.05,1.0,0x3a3f45),-0.26,0.98,0.1);
      P2(B(0.05,0.16,0.05,0x3a3f45),0.26,1.1,0.35,0,0,0.3);
      P2(B(0.05,0.16,0.05,0x3a3f45),-0.26,1.1,0.35,0,0,-0.3);
      engine(0.3,0,1.2,-0.5,0xffd166);
      const rotor=new THREE.Group(); rotor.position.set(0,1.68,0.1); g.add(rotor);
      rotor.add(this.box(2.3,0.025,0.1,0x22262b));
      rotor.add(this.box(0.1,0.025,2.3,0x22262b));
      rotor.add(this.cyl(0.06,0.06,0.1,0x2d3239,{},8));
      parts.rotor=rotor;
      const tr=new THREE.Group(); tr.position.set(0.09,1.5,-1.45); g.add(tr);
      tr.add(this.box(0.02,0.5,0.07,0x22262b)); parts.tailRotor=tr;
      break; }
    case 'hauler': {
      g.userData.smoke=[0.4,1.15,0.62];
      P2(B(0.8,0.62,0.6,0x8a6f3f),0,0.64,0.8);                  // cab-over
      glass(0.7,0.26,0.05,0,0.76,1.08,-0.12);
      P2(B(0.84,0.14,0.12,0x59606a,{m:0.4}),0,0.3,1.12);        // grille/bumper
      P2(B(0.7,0.12,0.4,0x7d6a3c),0,1.02,0.72,-0.4);            // roof deflector
      P2(B(0.95,0.8,1.4,col),0,0.74,-0.45);                     // container
      for(let i=0;i<4;i++) P2(B(0.02,0.72,1.34,shade(0.05)),(i%2? 0.48:-0.48),0.74,-0.45); // corrugation hint
      P2(B(0.95,0.04,1.42,shade(0.08)),0,1.16,-0.45);
      P2(B(0.3,0.2,0.02,0x2a2f36),0.28,0.28,-1.16);             // mud flaps
      P2(B(0.3,0.2,0.02,0x2a2f36),-0.28,0.28,-1.16);
      engine(0.5,0,0.5,-1.17);
      for(const z of [0.72,-0.2,-0.85]){ W(0.26,0.18,0.48,0.26,z); W(0.26,0.18,-0.48,0.26,z); }
      break; }
    case 'shieldvan': {
      P2(B(0.88,0.66,1.5,col),0,0.62,0);
      glass(0.76,0.26,0.05,0,0.78,0.76,-0.15);
      P2(B(0.9,0.1,1.54,shade(0.06)),0,0.98,0);                 // roof
      P2(B(0.12,0.3,0.12,0x44505e,{m:0.4}),0,1.15,-0.2);        // emitter mast
      const emitter=P2(this.sph(0.12,0x9fd0ff,{e:1.9},12),0,1.38,-0.2);
      const dome=P2(this.sph(1.35,0x7fa7d8,{e:0.3,o:0.12},18),0,0.75,0);
      dome.castShadow=false;
      dome.userData.anim=(dt,t)=>{ dome.scale.setScalar(1+Math.sin(t*2.2)*0.05); };
      emitter.userData.anim=(dt,t)=>{ emitter.material.emissiveIntensity=1.4+Math.sin(t*5)*0.6; };
      this.animated.add(dome); this.animated.add(emitter);
      engine(0.5,0,0.6,-0.77,0x9fd0ff);
      W(0.24,0.16,0.45,0.24,0.5); W(0.24,0.16,-0.45,0.24,0.5);
      W(0.24,0.16,0.45,0.24,-0.5); W(0.24,0.16,-0.45,0.24,-0.5);
      break; }
    case 'mechvan': {
      P2(B(0.85,0.68,1.55,col),0,0.64,0);
      glass(0.74,0.26,0.05,0,0.8,0.79,-0.15);
      P2(B(0.87,0.08,1.58,shade(-0.05)),0,1.0,0);
      P2(B(0.38,0.11,0.04,0xd84343,{e:0.7}),0,0.7,-0.79);       // cross
      P2(B(0.11,0.38,0.04,0xd84343,{e:0.7}),0,0.7,-0.79);
      P2(B(0.02,0.5,0.02,0x2a2f36),0,0.72,-0.8);                // door seam
      const beacon=P2(this.sph(0.09,0xff9c50,{e:1.9},10),0,1.12,0.3);
      beacon.userData.anim=(dt,t)=>{ beacon.material.emissiveIntensity=1+Math.sin(t*8)*0.9; };
      this.animated.add(beacon); parts.beacon=beacon;
      engine(0.46,0,0.62,-0.79,0x86efac);
      W(0.24,0.16,0.44,0.24,0.5); W(0.24,0.16,-0.44,0.24,0.5);
      W(0.24,0.16,0.44,0.24,-0.5); W(0.24,0.16,-0.44,0.24,-0.5);
      break; }
    case 'prowler': {
      P2(B(0.78,0.18,1.55,col,{m:0.5}),0,0.32,0);
      P2(B(0.7,0.14,0.5,shade(-0.03),{m:0.5}),0,0.44,0.55,-0.12); // hood wedge
      glass(0.58,0.16,0.45,0,0.5,0,-0.18);
      P2(B(0.66,0.05,0.16,col,{m:0.5}),0,0.52,-0.72);           // wing
      P2(B(0.05,0.12,0.05,0x2a2f36),0.26,0.42,-0.7);
      P2(B(0.05,0.12,0.05,0x2a2f36),-0.26,0.42,-0.7);
      const glow=P2(B(0.56,0.02,1.15,0x8f4fd6,{e:1.4}),0,0.1,0);
      parts.underglow=glow;
      engine(0.4,0,0.3,-0.79,0x8f4fd6);
      W(0.2,0.14,0.4,0.2,0.5); W(0.2,0.14,-0.4,0.2,0.5);
      W(0.2,0.14,0.4,0.2,-0.5); W(0.2,0.14,-0.4,0.2,-0.5);
      break; }
    case 'digger': {
      P2(B(0.78,0.44,1.2,col),0,0.52,-0.15);
      P2(B(0.5,0.34,0.45,0x6e653f),0,0.86,-0.4);                // cab
      glass(0.4,0.2,0.04,0,0.9,-0.16,-0.2);
      const drill=this.cone(0.28,0.85,0x9aa3ad,{m:0.6,r:0.3});
      drill.rotation.x=Math.PI/2; drill.position.set(0,0.48,0.9); g.add(drill);
      parts.drill=drill;
      P2(B(0.2,0.2,0.2,0x5c5433),0,0.48,0.42);                  // drill mount
      const ex=this.cyl(0.05,0.05,0.4,0x2a2d31,{},8); P2(ex,0.34,0.9,-0.6);
      engine(0.44,0,0.5,-0.76,0xd9a066);
      for(const z of [0.32,-0.35]){ W(0.26,0.2,0.46,0.26,z); W(0.26,0.2,-0.46,0.26,z); }
      break; }
    case 'tank': {
      g.userData.smoke=[0.4,1.0,-0.8];
      P2(B(0.95,0.32,1.65,col),0,0.5,0);
      P2(B(0.9,0.24,0.5,shade(-0.04)),0,0.56,0.92,0.5);         // glacis
      for(const x of [0.56,-0.56]){
        P2(B(0.3,0.36,1.75,RUBBER),x,0.34,0);
        for(let i=0;i<4;i++) W(0.14,0.26,x,0.16,0.58-i*0.39);
      }
      const tur=this.cyl(0.42,0.5,0.3,shade(-0.06),{m:0.2},8);  // octagon turret
      P2(tur,0,0.82,-0.1);
      const gun=this.cyl(0.055,0.075,1.45,0x2d3239,{m:0.5},10);
      P2(gun,0,0.86,0.62,Math.PI/2);
      P2(B(0.14,0.12,0.22,0x22262b,{m:0.5}),0,0.86,1.3);        // muzzle brake
      P2(B(0.24,0.1,0.3,shade(-0.1)),0,1.02,-0.2);              // hatch
      const ant=this.cyl(0.012,0.012,0.55,0x8b949e,{},6); P2(ant,0.3,1.25,-0.35);
      engine(0.6,0,0.5,-0.84);
      break; }
    case 'gunship': {
      P2(B(0.62,0.48,1.6,col),0,1.3,0);
      P2(B(0.5,0.34,0.4,shade(-0.05)),0,1.3,0.9,0.35);
      glass(0.44,0.26,0.06,0,1.46,0.72,-0.4);
      P2(B(1.2,0.08,0.3,shade(-0.07)),0,1.34,-0.2);             // stub wings
      for(const x of [0.62,-0.62]){ const pod=this.cyl(0.09,0.09,0.5,0x2f3540,{},8);
        P2(pod,x,1.28,-0.1,Math.PI/2); }
      engine(0.4,0,1.2,-0.82,0xc084fc);
      const rotor=new THREE.Group(); rotor.position.set(0.55,1.66,0.25); g.add(rotor);
      rotor.add(this.box(1.5,0.025,0.09,0x22262b));
      rotor.add(this.box(0.09,0.025,1.5,0x22262b));
      const rotor2=rotor.clone(); rotor2.position.x=-0.55; g.add(rotor2);
      parts.rotor=rotor; parts.tailRotor=rotor2;
      P2(B(0.05,0.36,0.22,col),0,1.56,-0.8);
      break; }
    case 'racer': {
      P2(B(0.4,0.14,1.0,col,{m:0.4}),0,0.3,0.1);                // monocoque
      P2(B(0.2,0.12,0.6,shade(-0.03)),0,0.3,0.85,0);            // nose
      P2(B(0.56,0.03,0.24,0x2a2f36),0,0.24,1.05);               // front wing
      P2(B(0.3,0.16,0.5,0x14171c,{m:0.5}),0,0.44,-0.05);        // cockpit
      P2(B(0.5,0.12,0.55,shade(-0.05)),0,0.32,-0.45);           // sidepods/engine cover
      P2(B(0.74,0.04,0.2,col,{m:0.5}),0,0.58,-0.75);            // rear wing
      P2(B(0.05,0.16,0.05,0x2a2f36),0.3,0.44,-0.72);
      P2(B(0.05,0.16,0.05,0x2a2f36),-0.3,0.44,-0.72);
      const flame=P2(this.sph(0.07,0x7dd3fc,{e:2},8),0,0.32,-0.88);
      flame.userData.anim=(dt,t)=>{ flame.scale.set(1,1,1.4+Math.sin(t*22)*0.5); };
      this.animated.add(flame);
      W(0.2,0.14,0.34,0.2,0.62); W(0.2,0.14,-0.34,0.2,0.62);
      W(0.23,0.17,0.36,0.23,-0.5); W(0.23,0.17,-0.36,0.23,-0.5);
      break; }
    case 'boss': {
      g.userData.smoke=[0.45,2.2,-0.6];
      P2(B(1.45,0.5,2.15,col),0,0.72,0);
      P2(B(1.5,0.2,2.2,shade(-0.06)),0,0.42,0);                 // lower skirt
      P2(B(1.15,0.45,0.8,shade(0.04)),0,1.18,-0.3);             // upper deck
      P2(B(0.8,0.35,0.5,shade(-0.02)),0,1.5,-0.45);             // command cap
      glass(0.6,0.16,0.04,0,1.55,-0.19,-0.3);
      P2(B(1.7,0.6,0.12,0x3c3f44,{m:0.4}),0,0.55,1.22,-0.35);   // plow
      for(let i=0;i<5;i++) P2(this.cone(0.08,0.3,0x9aa3ad,{m:0.6},6),(i-2)*0.35,0.78,1.36,Math.PI/2-0.35);
      for(const x of [0.5,-0.5]){ const st=this.cyl(0.09,0.12,0.8,0x2a2d31,{},8); P2(st,x,1.75,-0.7); }
      const core=P2(this.sph(0.26,0xff4040,{e:1.7},12),0,1.3,0.4);
      core.userData.anim=(dt,t)=>{ core.scale.setScalar(1+Math.sin(t*3)*0.14); };
      this.animated.add(core);
      for(const x of [0.78,-0.78]) P2(B(0.08,0.5,1.9,shade(-0.09)),x,0.75,0); // side armor
      engine(0.9,0,0.72,-1.09);
      for(const z of [0.8,0.27,-0.27,-0.8]){ W(0.3,0.24,0.72,0.3,z); W(0.3,0.24,-0.72,0.3,z); }
      break; }
    case 'boss2': {                                   // MECH TITAN — bipedal walker
      P2(B(1.1,0.4,0.9,shade(-0.05)),0,1.15,0);       // pelvis
      P2(B(1.05,1.0,0.75,shade(-0.03)),0,1.85,0);     // torso
      P2(B(0.85,0.55,0.5,shade(0.03)),0,2.05,0.3);    // chest plate
      glass(0.4,0.14,0.04,0,2.0,0.85,0);              // view slit
      P2(B(0.3,0.12,0.06,0x9fd0ff,{e:0.8}),0,1.62,0.9); // chest light
      for(const x of [0.62,-0.62]){                   // cannon arms
        P2(this.cyl(0.26,0.32,0.5,shade(-0.08),{},8),x,2.45,0.15);
        const arm=this.cyl(0.13,0.16,1.5,0x2a2d31,{m:0.4},8);
        P2(arm,x,2.35,0.75,Math.PI/2-0.3);
        P2(B(0.32,0.32,0.5,shade(0.05)),x,2.35,0.1);  // elbow block
      }
      P2(B(0.4,0.35,0.45,shade(-0.05)),0,2.75,0.1);   // head
      const eye=this.P(this.sph(0.09,0xff4040,{e:1.8},10),0,2.78,0.4,g);
      eye.userData.anim=(dt,t)=>{ eye.material.emissiveIntensity=1.2+Math.sin(t*6)*0.8; };
      this.animated.add(eye);
      for(const x of [0.42,-0.42]){                   // legs
        P2(B(0.36,1.3,0.4,shade(-0.06)),x,0.65,0);
        P2(B(0.3,0.9,0.34,shade(0.02)),x,0.12,0.15,0.18);
        P2(B(0.42,0.24,0.55,0x23272c),x,0.05,0.2);
        const knee=this.P(this.sph(0.14,0xff8a4d,{e:1.4},10),x,1.28,0,g);
        knee.userData.anim=(dt,t)=>{ knee.material.emissiveIntensity=1+Math.sin(t*8)*0.6; };
        this.animated.add(knee);
      }
      P2(B(0.7,0.5,0.3,shade(-0.1)),0,2.3,-0.5);      // back reactor
      const react=this.P(this.sph(0.14,0xff8a4d,{e:1.6},10),0,2.3,-0.72,g);
      react.userData.anim=(dt,t)=>{ react.material.emissiveIntensity=1+Math.sin(t*9)*0.7; react.scale.setScalar(1+Math.sin(t*9)*0.15); };
      this.animated.add(react);
      break; }
    case 'boss3': {                                   // SKY REAPER — fighter jet (nose faces +Z = travel)
      g.userData.smoke=[0,0.95,-1.6];
      P2(B(0.6,0.5,2.3,col),0,1.0,0);                 // fuselage
      const nose=this.cone(0.3,1.2,shade(-0.04),{m:0.3},8);
      nose.rotation.x=Math.PI/2; nose.position.set(0,1.0,1.65); g.add(nose);
      glass(0.4,0.2,0.6,0,1.2,0.6,0);                 // canopy
      for(const sx of [1,-1]){                        // swept delta wings (tips back)
        P2(B(1.5,0.06,0.9,shade(-0.06),{m:0.4}),sx*0.85,1.05,-0.35,0,0.5*sx,0.08*sx);
        const tip=this.P(this.cyl(0.05,0.05,0.5,0xdfe6ee,{m:0.5},8),sx*1.55,1.08,-0.7,g);
        tip.rotation.x=Math.PI/2;                     // wingtip missile
      }
      for(const sx of [0.34,-0.34]){                  // twin engines + afterburners
        P2(this.cyl(0.16,0.16,0.9,shade(-0.09),{m:0.4},10),sx,0.95,-1.35,Math.PI/2);
        const ab=this.P(this.sph(0.11,0xffb36b,{e:2},10),sx,0.95,-1.9,g);
        ab.userData.anim=(dt,t)=>{ ab.scale.set(1+Math.sin(t*26)*0.25,1+Math.sin(t*26)*0.25,1.6+Math.sin(t*26+1)*0.5); ab.material.emissiveIntensity=1.6+Math.sin(t*30)*0.5; };
        this.animated.add(ab);
      }
      P2(B(0.06,0.6,0.5,shade(-0.05)),0,1.35,-1.1,0,0,0.35); // tail fin
      for(const sx of [1,-1]) P2(B(0.9,0.05,0.4,shade(-0.04)),sx*0.5,1.05,-1.15,0,0.35*sx,0); // stabilizers
      const noseL=this.P(this.sph(0.06,0xff5f8a,{e:2},8),0,1.05,2.35,g);
      noseL.userData.anim=(dt,t)=>{ noseL.material.emissiveIntensity=1.2+Math.sin(t*14)*0.8; };
      this.animated.add(noseL);
      break; }
    case 'bossH': {                                   // IRON APEX — siege colossus
      g.userData.smoke=[0,2.5,-1.1];
      P2(B(1.8,0.7,2.7,col),0,1.0,0);                 // hull
      P2(B(1.85,0.25,2.75,shade(-0.06)),0,0.62,0);    // skirt
      P2(B(1.4,0.6,1.1,shade(0.03)),0,1.75,-0.1);     // superstructure
      P2(B(1.1,0.9,0.5,shade(-0.04)),0,2.3,-0.15);    // command tower
      glass(0.8,0.2,0.05,0,2.35,-0.3,-0.3);
      for(const x of [0.6,-0.6]) P2(this.cyl(0.1,0.12,1.6,0x2a2d31,{m:0.4},10),x,1.85,0.9,Math.PI/2-0.12); // side guns
      P2(this.cyl(0.16,0.2,2.2,0x2a2d31,{m:0.4},12),0,2.05,1.1,Math.PI/2-0.1); // main cannon
      P2(B(0.3,0.25,0.4,shade(-0.1)),0,2.05,2.15);    // muzzle block
      const core=this.P(this.sph(0.3,0xff8a4d,{e:1.7},12),0,1.5,0.4,g);
      core.userData.anim=(dt,t)=>{ core.scale.setScalar(1+Math.sin(t*3)*0.12); };
      this.animated.add(core);
      for(const x of [0.95,-0.95]) P2(B(0.12,0.8,2.9,shade(-0.09)),x,1.0,0); // side armor
      engine(0.9,0,0.9,-1.35);
      for(const z of [1.0,0.34,-0.34,-1.0]){ W(0.4,0.32,1.0,0.4,z); W(0.4,0.32,-1.0,0.4,z); }
      break; }
    case 'vip': {
      P2(B(0.56,0.12,1.35,col),0,0.32,0);                      // gold floor pan
      P2(B(0.42,0.3,0.5,0xffc93c),0,0.5,-0.1);                 // seat block
      P2(B(0.05,0.55,0.05,0xffd166),0.24,0.72,-0.34,-0.35);    // roll cage
      P2(B(0.05,0.55,0.05,0xffd166),-0.24,0.72,-0.34,-0.35);
      P2(B(0.05,0.5,0.05,0xffd166),0.24,0.68,0.12,0.5);
      P2(B(0.05,0.5,0.05,0xffd166),-0.24,0.68,0.12,0.5);
      P2(B(0.54,0.05,0.05,0xffd166),0,0.95,-0.42);
      P2(B(0.5,0.08,0.34,0xe0b62c),0,0.42,0.6,0.25);           // nose
      P2(B(0.6,0.04,0.16,0xffd166),0,0.3,0.85);                // splitter
      const vip=P2(this.sph(0.12,0xfff7c0,{e:2},10),0,0.85,-0.2);
      vip.userData.anim=(dt,t)=>{ vip.scale.setScalar(1+Math.sin(t*7)*0.2); };
      this.animated.add(vip);
      engine(0.34,0,0.38,-0.7,0xffd166);
      W(0.2,0.13,0.35,0.2,0.5); W(0.2,0.13,-0.35,0.2,0.5);
      W(0.3,0.2,0.4,0.3,-0.42); W(0.3,0.2,-0.4,0.3,-0.42);
      break; }
  }
  g.userData.parts=parts; g.userData.phase=Math.random()*7; g.userData.size=s; g.userData.fly=!!d.fly;
  if (!d.fly) g.add(this.aoDisc(0.95));
  const bs=1.12*s;
  g.userData.baseScale=bs;
  if (g.userData.smoke) g.userData.smoke=g.userData.smoke.map(v=>v*bs);
  g.scale.setScalar(bs);
  return g;
};
})();

/* ============ MODELS v7 — TDS-STYLE TURRET REBRAND ============
   Reference language: cross-footed octagon pedestal → hex column → armored
   two-tone head (light hull + dark navy insets/vents) → THICK hex barrels
   with hex muzzle brakes. Sniper walks on mech legs. Skins recolor the hull. */
(function(){
const E=TD.Engine.prototype;
TD.SKINS={
  wood:  { name:'Wood',       L:0xc9a06b, M:0xa87e4e, N:0x6f4f2e, G:0x8a6238, glow:0.55 },
  scrap: { name:'Scrap',      L:0xb9b1a4, M:0x9a9080, N:0x5f5a52, G:0x77716a, glow:0.75 },
  metal: { name:'Shiny Metal',L:0xdfe6ee, M:0xaab7c4, N:0x3d4a58, G:0x55626f, glow:1.45 },
  gold:  { name:'Gold',       L:0xffe08a, M:0xf0c24a, N:0x8a6a1a, G:0xc79b2e, glow:2.2 },
  default:{ name:'Standard', L:0xe2e7ee, M:0x9aa7b8, N:0x2e3550, G:0x33384a, glow:1 },
  desert: { name:'Desert',   L:0xe6dcc3, M:0xbfae8a, N:0x5a5142, G:0x4a4438, glow:0.8 },
  neon:   { name:'Neon',     L:0x2b303c, M:0x3a4152, N:0x14161e, G:0x101218, glow:1.8 },
  midnight:{name:'Midnight', L:0x46506a, M:0x323a4e, N:0x181c28, G:0x121520, glow:1.2 },
};
// material skins are optional per-turret purchases (saved per turret id).
// default = the classic Standard look; scrap/metal/gold upgrade the hull only.
function SK(id){
  const g=TD.game, s=(g&&g.save&&g.save.skins)||{scrap:[],metal:[],gold:[]};
  if (id&&s.gold&&s.gold.includes(id)) return TD.SKINS.gold;
  if (id&&s.metal&&s.metal.includes(id)) return TD.SKINS.metal;
  if (id&&s.scrap&&s.scrap.includes(id)) return TD.SKINS.scrap;
  return TD.SKINS.default;
}
TD.materialOf=function(id){
  const g=TD.game, s=(g&&g.save&&g.save.skins)||{scrap:[],metal:[],gold:[]};
  if (id&&s.gold&&s.gold.includes(id)) return 'gold';
  if (id&&s.metal&&s.metal.includes(id)) return 'metal';
  if (id&&s.scrap&&s.scrap.includes(id)) return 'scrap';
  return 'default';
}

E._tdsBase=function(g,K,accent){
  for(let i=0;i<4;i++){ const a=i*Math.PI/2+Math.PI/4;
    const foot=this.box(0.6,0.2,0.55,K.M); foot.position.set(Math.cos(a)*1.02,0.1,Math.sin(a)*1.02); foot.rotation.y=-a; g.add(foot);
    const tip=this.box(0.42,0.14,0.34,K.L); tip.position.set(Math.cos(a)*1.38,0.07,Math.sin(a)*1.38); tip.rotation.y=-a; g.add(tip);
  }
  this.P(this.cyl(1.04,1.14,0.22,K.L,{},8),0,0.11,0,g);
  this.P(this.cyl(0.84,0.94,0.2,K.M,{},8),0,0.32,0,g);
  this.P(this.cyl(0.4,0.5,0.66,K.L,{},6),0,0.72,0,g);
  this.P(this.cyl(0.47,0.47,0.09,K.N,{},6),0,0.47,0,g);
  this.P(this.cyl(0.44,0.44,0.09,K.N,{},6),0,1.0,0,g);
  const dot=this.P(this.sph(0.05,accent,{e:1.4*K.glow},8),0.88,0.46,0.5,g);
  dot.userData.anim=(dt,t)=>{ dot.material.emissiveIntensity=(1+Math.sin(t*3.5)*0.6)*K.glow; };
  this.animated.add(dot);
  return 1.18;
};
E._mechLegs=function(g,K){
  this.P(this.cyl(0.52,0.62,0.35,K.N,{},8),0,0.92,0,g);
  this.P(this.cyl(0.4,0.44,0.14,K.M,{},8),0,1.12,0,g);
  for(let i=0;i<4;i++){ const a=i*Math.PI/2+Math.PI/4;
    const leg=new THREE.Group(); leg.position.set(Math.cos(a)*0.42,0.9,Math.sin(a)*0.42); leg.rotation.y=-a; g.add(leg);
    const th=this.box(0.15,0.17,0.6,K.M); th.position.set(0,-0.05,0.3); th.rotation.x=0.5; leg.add(th);
    this.P(this.sph(0.1,K.G,{},8),0,-0.2,0.55,leg);
    const sh=this.box(0.12,0.55,0.14,K.N); sh.position.set(0,-0.45,0.6); sh.rotation.x=-0.12; leg.add(sh);
    this.P(this.box(0.24,0.09,0.4,K.M),0,-0.73,0.64,leg);
    this.P(this.box(0.1,0.05,0.16,K.G),0,-0.7,0.85,leg);
  }
  return 1.28;
};
E._hexBarrel=function(len,cal,K){
  const b=new THREE.Group();
  const t=this.cyl(cal,cal,len,K.G,{m:0.3},6); t.rotation.x=Math.PI/2; t.position.z=len/2; b.add(t);
  const band=this.cyl(cal*1.3,cal*1.3,cal*1.4,K.N,{},6); band.rotation.x=Math.PI/2; band.position.z=len*0.42; b.add(band);
  const mz=this.cyl(cal*1.6,cal*1.6,cal*2.4,K.N,{m:0.2},6); mz.rotation.x=Math.PI/2; mz.position.z=len; b.add(mz);
  const hole=this.cyl(cal*0.8,cal*0.8,cal*2.5,0x0b0d11,{},6); hole.rotation.x=Math.PI/2; hole.position.z=len+0.004; b.add(hole);
  return b;
};
// armored two-tone housing: light hull, navy inset panels, vent slots
E._tdsHull=function(head,w,h,d,K){
  const body=this.P(this.box(w,h,d,K.L),0,0.08,-0.05,head);
  const hexL=this.cyl(h*0.42,h*0.42,0.05,K.N,{},6); hexL.rotation.z=Math.PI/2;
  this.P(hexL,w/2+0.01,0.08,-0.05,head);
  const hexR=hexL.clone(); hexR.position.x=-w/2-0.01; head.add(hexR);
  this.P(this.box(w*0.66,h*0.2,0.04,K.N),0,0.08+h*0.28,d/2-0.08,head);
  for(let i=0;i<3;i++) this.P(this.box(0.05,h*0.4,0.03,K.N),-w*0.25+i*w*0.25,0.08,-d/2-0.015+0.0,head).position.z=-d/2-0.01;
  this.P(this.box(w*1.06,0.06,d*0.8,K.M),0,0.08+h/2+0.03,-0.08,head);
  return body;
};

E.makeTower=function(id){
  const d=TD.TOWERS[id], g=new THREE.Group(), col=d.color, K=SK(id);
  const legged=(id==='sniper');
  const hy=legged? this._mechLegs(g,K) : this._tdsBase(g,K,col);
  const head=new THREE.Group(); head.position.y=hy; g.add(head);
  let barrel=null, muzzle=new THREE.Vector3(0,hy,1.1);
  const B=(w,h,dd,c,o)=>this.box(w,h,dd,c,o), CY=(a,b2,h,c,o,sg)=>this.cyl(a,b2,h,c,o,sg||12), S=(r,c,o)=>this.sph(r,c,o,12);
  switch(id){
    case 'mg': {
      this._tdsHull(head,0.78,0.5,0.95,K);
      barrel=this._hexBarrel(1.05,0.085,K); barrel.position.set(0.16,0.12,0.42); head.add(barrel);
      const b2=this._hexBarrel(1.05,0.085,K); b2.position.set(-0.16,0.12,0.42); head.add(b2); head.userData.b2=b2;
      this.P(B(0.3,0.36,0.5,K.N),-0.5,0.02,-0.2,head);           // ammo box
      this.P(B(0.05,0.2,0.4,0xc9a227,{m:0.5}),-0.36,0.14,0.05,head);
      const sight=this.P(B(0.12,0.1,0.2,K.G),0.26,0.42,-0.15,head);
      const lens=this.P(S(0.045,col,{e:1.8*K.glow}),0.26,0.42,-0.02,head);
      lens.userData.anim=(dt,t)=>{ lens.material.emissiveIntensity=(1.2+Math.sin(t*4)*0.6)*K.glow; };
      this.animated.add(lens);
      const heatRing=this.torus(0.22,0.02,0xff6b3d,{e:0},10); heatRing.position.set(0,0.12,0.55); barrel.add(heatRing); heatRing.userData.tag='heat';
      muzzle=new THREE.Vector3(0.16,hy+0.12,1.55);
      break; }
    case 'minigun': {
      this._tdsHull(head,0.78,0.5,0.95,K);
      const rot=new THREE.Group(); rot.position.set(0,0.1,0.2); head.add(rot);
      barrel=new THREE.Group(); rot.add(barrel);
      const angs=[0,Math.PI*2/3,Math.PI*4/3];
      for(let i=0;i<3;i++){
        const b=this.cyl(0.07,0.075,1.4,K.N,{},10); b.rotation.x=Math.PI/2;
        b.position.set(Math.cos(angs[i])*0.14,Math.sin(angs[i])*0.14,0.55);
        barrel.add(b);
      }
      // connector rings — the three barrels are linked into one rotary bundle
      for(const z2 of [0.35,0.78]){
        const ring=this.torus(0.21,0.03,K.G,{m:0.6},8); ring.position.z=z2; barrel.add(ring);
      }
      const shroud=this.cyl(0.3,0.32,0.42,0x39424d,{m:0.6},10); shroud.rotation.x=Math.PI/2; shroud.position.z=0.1; rot.add(shroud);
      this.P(B(0.3,0.36,0.5,K.N),-0.5,0.02,-0.2,head);
      this.P(B(0.05,0.2,0.5,0xc9a227,{m:0.5}),-0.36,0.14,0.05,head);
      const heatRing=this.torus(0.22,0.02,0xff6b3d,{e:0},10); heatRing.position.set(0,0,0.6); barrel.add(heatRing); heatRing.userData.tag='heat';
      muzzle=new THREE.Vector3(0,hy+0.1,1.25);
      break; }
    case 'flame': {
      this._tdsHull(head,0.8,0.55,0.9,K);
      // twin fuel canisters lying flat across the back, lowered
      for(const sx of [-0.35,0.35]){
        const tank=this.cyl(0.15,0.15,0.6,K.N,{m:0.5},10); tank.rotation.z=Math.PI/2; this.P(tank,sx,0.28,-0.5,head);
      }
      this.P(B(0.5,0.22,0.3,K.M),0,0.28,-0.15,head);
      barrel=new THREE.Group(); barrel.position.set(0,0.26,0.05); head.add(barrel);
      const tube=this.cyl(0.09,0.11,1.3,K.G,{m:0.4},10); tube.rotation.x=Math.PI/2; tube.position.z=0.55; barrel.add(tube);
      const mz2=this.cyl(0.18,0.2,0.28,0x39424d,{m:0.6},10); mz2.rotation.x=Math.PI/2; mz2.position.z=1.15; barrel.add(mz2);
      for(const sx of [-0.09,0.09]){
        const nz=this.cyl(0.05,0.05,0.4,0x2c3138,{},8); nz.rotation.x=Math.PI/2; nz.position.set(sx,0.03,1.25); barrel.add(nz);
      }
      const glow=this.torus(0.14,0.03,0xff6b3d,{e:1},10); glow.rotation.x=Math.PI/2; glow.position.z=1.28; barrel.add(glow);
      glow.userData.tag='nozzle';
      muzzle=new THREE.Vector3(0,hy+0.26,1.5);
      break; }
    case 'laser': {
      this._tdsHull(head,0.8,0.55,0.9,K);
      for(let i=0;i<3;i++) this.P(CY(0.18,0.18,0.34,K.N,{m:0.5},10),(i-1)*0.42,0.32,-0.35,head);
      barrel=new THREE.Group(); barrel.position.set(0,0.32,0.2); head.add(barrel);
      const tube=this.cyl(0.12,0.14,1.1,K.G,{m:0.4},10); tube.rotation.x=Math.PI/2; tube.position.z=0.5; barrel.add(tube);
      const emitter=this.cyl(0.2,0.24,0.35,0x39424d,{m:0.6},10); emitter.rotation.x=Math.PI/2; emitter.position.z=1.05; barrel.add(emitter);
      const lens=this.sph(0.14,0xff5f8a,{e:1.6},10); lens.scale.set(0.6,0.6,0.8); lens.position.z=1.22; barrel.add(lens);
      lens.userData.tag='lens';
      for(let i=0;i<3;i++){ const ring=this.torus(0.16,0.025,0xff8fb0,{e:1.1},8); ring.position.z=1.1+i*0.06; barrel.add(ring); }
      muzzle=new THREE.Vector3(0,hy+0.32,1.5);
      break; }
    case 'scatter': {
      this._tdsHull(head,0.95,0.52,0.8,K);
      barrel=new THREE.Group(); barrel.position.set(0,0.1,0.3); head.add(barrel);
      for(const sx of [0.2,-0.2]){
        const t=this.cyl(0.11,0.11,0.55,K.G,{m:0.3},6); t.rotation.x=Math.PI/2; t.position.set(sx,0,0.3); barrel.add(t);
        const mz=this.cyl(0.19,0.19,0.22,K.N,{},6); mz.rotation.x=Math.PI/2; mz.position.set(sx,0,0.6); barrel.add(mz);
        for(let k=0;k<4;k++){ const a=k*Math.PI/2+0.78;
          const bore=this.cyl(0.035,0.035,0.24,0x0b0d11,{},6); bore.rotation.x=Math.PI/2;
          bore.position.set(sx+Math.cos(a)*0.07,Math.sin(a)*0.07,0.61); barrel.add(bore); }
      }
      this.P(B(0.4,0.14,0.3,K.N),0,-0.2,0.35,head);
      muzzle=new THREE.Vector3(0,hy+0.1,1.15);
      break; }
    case 'mortar': {
      head.position.y=hy-0.1;
      this.P(CY(0.62,0.72,0.2,K.M,{},8),0,0.02,0,head);
      barrel=new THREE.Group(); barrel.position.set(0,0.2,-0.1); head.add(barrel);
      const tube=this.cyl(0.3,0.36,1.3,K.G,{m:0.25},6); tube.rotation.x=Math.PI/4.4; tube.position.set(0,0.5,0.25); barrel.add(tube);
      const mz=this.cyl(0.44,0.44,0.24,K.N,{},6); mz.rotation.x=Math.PI/4.4; mz.position.set(0,0.94,0.68); barrel.add(mz);
      const hole=this.cyl(0.3,0.3,0.26,0x0b0d11,{},6); hole.rotation.x=Math.PI/4.4; hole.position.set(0,0.95,0.69); barrel.add(hole);
      const ring=this.P(this.torus(0.33,0.035,col,{e:1.2*K.glow},6),0,0.8,0.55,barrel);
      ring.rotation.x=Math.PI/4.4;
      ring.userData.anim=(dt,t)=>{ ring.material.emissiveIntensity=(0.9+Math.sin(t*2.2)*0.5)*K.glow; };
      this.animated.add(ring);
      for(const sx of [0.4,-0.4]) this.P(B(0.1,0.6,0.1,K.N),sx,0.32,0.3,head).rotation.x=0.5;
      this.P(B(0.46,0.3,0.36,K.M),0.62,0.16,-0.35,head);
      for(let i=0;i<3;i++) this.P(this.cone(0.05,0.12,col,{e:0.9*K.glow},6),0.52+i*0.11,0.36,-0.35,head);
      muzzle=new THREE.Vector3(0,hy+1.1,0.8);
      break; }
    case 'tesla': {
      this.P(CY(0.34,0.42,0.5,K.N,{},6),0,0.2,0,head);
      [0.5,0.82,1.14].forEach((y,i)=>{
        const plate=this.P(CY(0.44-i*0.08,0.5-i*0.08,0.1,K.L,{},6),0,y,0,head);
        const glow=this.P(this.torus(0.42-i*0.08,0.03,col,{e:1.1*K.glow},6),0,y+0.08,0,head);
        glow.rotation.x=Math.PI/2;
        glow.userData.anim=(dt,t)=>{ glow.rotation.z=t*(1+i*0.7)*(i%2?-1:1); glow.material.emissiveIntensity=(0.9+Math.sin(t*4+i)*0.4)*K.glow; };
        this.animated.add(glow);
      });
      const cage=this.P(CY(0.3,0.34,0.34,K.N,{},6),0,1.42,0,head);
      const orb=this.P(S(0.26,col,{e:1.5*K.glow}),0,1.62,0,head);
      orb.userData.anim=(dt,t)=>{ orb.scale.setScalar(1+Math.sin(t*5)*0.09); };
      this.animated.add(orb);
      muzzle=new THREE.Vector3(0,hy+1.6,0);
      break; }
    case 'sniper': {
      this._tdsHull(head,0.6,0.48,1.0,K);
      barrel=new THREE.Group(); barrel.position.set(0,0.14,0.35); head.add(barrel);
      const t1=this.cyl(0.075,0.075,1.9,K.G,{m:0.3},6); t1.rotation.x=Math.PI/2; t1.position.z=0.95; barrel.add(t1);
      const mz=this.cyl(0.13,0.13,0.28,K.N,{},6); mz.rotation.x=Math.PI/2; mz.position.z=1.95; barrel.add(mz);
      const hole=this.cyl(0.055,0.055,0.3,0x0b0d11,{},6); hole.rotation.x=Math.PI/2; hole.position.z=1.96; barrel.add(hole);
      this.P(B(0.09,0.14,0.5,K.N),0,-0.12,0.6,head);
      const drum=this.cyl(0.2,0.2,0.3,K.N,{},8); drum.rotation.z=Math.PI/2; this.P(drum,0,0.12,-0.62,head);
      for(let i=0;i<3;i++) this.P(B(0.04,0.1,0.02,col,{e:1.3*K.glow}),0.31,0.2,0.1-i*0.12,head);
      const scope=this.P(B(0.1,0.1,0.35,K.G),0,0.42,0.15,head);
      const lens=this.P(S(0.05,col,{e:2*K.glow}),0,0.42,0.35,head);
      lens.userData.anim=(dt,t)=>{ lens.material.emissiveIntensity=(1.3+(Math.sin(t*1.3)>0.85?0.9:0))*K.glow; };
      this.animated.add(lens);
      const glint=this.P(S(0.035,0xd0e2ff,{e:1.4},8),0,0.42,0.3,head); glint.userData.tag='scope';
      muzzle=new THREE.Vector3(0,hy+0.14,2.4);
      break; }
    case 'relay': {
      const mono=this.P(CY(0.3,0.38,1.5,K.L,{},6),0,0.75,0,head);
      this.P(CY(0.4,0.4,0.1,K.N,{},6),0,0.35,0,head);
      this.P(CY(0.34,0.34,0.1,K.N,{},6),0,1.15,0,head);
      for(let i=0;i<3;i++){ const a=i*2.094;
        const strip=this.P(B(0.04,1.1,0.03,col,{e:1.2*K.glow}),Math.cos(a)*0.32,0.75,Math.sin(a)*0.32,head);
        strip.rotation.y=-a; this.animated.add(strip);
        strip.userData.anim=(dt,t)=>{ strip.material.emissiveIntensity=(0.8+Math.sin(t*3+i*2)*0.5)*K.glow; };
      }
      this.P(CY(0.2,0.26,0.14,K.M,{},6),0,1.56,0,head);
      const tip=this.P(S(0.11,col,{e:1.8*K.glow}),0,1.72,0,head);
      tip.userData.anim=(dt,t)=>{ tip.material.emissiveIntensity=(1.2+Math.sin(t*4)*0.7)*K.glow; };
      this.animated.add(tip);
      this._holo(head,0,1.35,0,0.5,col,0.9);
      break; }
    case 'market': {
      this.P(B(1.0,0.55,0.75,K.M),0,0.28,0,head);
      this.P(B(1.06,0.07,0.8,K.L),0,0.59,0,head);
      for(const sx of [0.45,-0.45]) this.P(CY(0.035,0.035,0.85,K.N,{},6),sx,0.95,0.28,head);
      const awn=this.P(this.arc(0.6,0.07,Math.PI,0xe05a5a,{}),0,1.32,0.16,head);
      awn.rotation.z=Math.PI/2; awn.rotation.y=Math.PI/2; awn.scale.set(1,1,1.6);
      const awn2=this.P(this.arc(0.61,0.05,Math.PI,K.L,{}),0,1.32,0.16,head);
      awn2.rotation.z=Math.PI/2; awn2.rotation.y=Math.PI/2; awn2.scale.set(1,1,0.75);
      const sign=this.P(B(0.42,0.28,0.05,col,{e:0.8*K.glow}),0,0.9,0.44,head);
      sign.userData.anim=(dt,t)=>{ sign.rotation.z=Math.sin(t*1.3)*0.1; };
      this.animated.add(sign);
      const snack=new THREE.Group(); snack.position.set(0,1.8,0.1); head.add(snack);
      this.P(this.dome(0.15,0xf2c94c,{e:0.6}),0,0.05,0,snack);
      this.P(CY(0.15,0.15,0.05,0x9b5f45,{e:0.4},10),0,0.02,0,snack);
      this.P(CY(0.16,0.16,0.03,0x6dbf5c,{e:0.4},10),0,-0.02,0,snack);
      this.P(CY(0.14,0.15,0.05,0xf2c94c,{e:0.6},10),0,-0.07,0,snack);
      snack.userData.anim=(dt,t)=>{ snack.position.y=1.8+Math.sin(t*1.8)*0.08; snack.rotation.y=t*1.2; };
      this.animated.add(snack);
      break; }
    case 'rail': {
      this._tdsHull(head,0.7,0.55,1.0,K);
      barrel=new THREE.Group(); barrel.position.set(0,0.14,0.3); head.add(barrel);
      const hb=this.cyl(0.14,0.14,2.2,K.G,{m:0.3},6); hb.rotation.x=Math.PI/2; hb.position.z=1.1; barrel.add(hb);
      const mz=this.cyl(0.22,0.22,0.35,K.N,{},6); mz.rotation.x=Math.PI/2; mz.position.z=2.2; barrel.add(mz);
      const hole=this.cyl(0.1,0.1,0.37,0x0b0d11,{},6); hole.rotation.x=Math.PI/2; hole.position.z=2.21; barrel.add(hole);
      for(let i=0;i<3;i++){
        const ring=this.P(this.torus(0.2,0.03,col,{e:1.3*K.glow},6),0,0,0.5+i*0.55,barrel);
        ring.userData.anim=(dt,t)=>{ ring.material.emissiveIntensity=(1+Math.sin(t*6+i*2)*0.5)*K.glow; };
        this.animated.add(ring);
      }
      const charge=this.P(S(0.14,col,{e:1.6*K.glow}),0,0.14,-0.6,head);
      charge.userData.anim=(dt,t)=>{ charge.scale.setScalar(1+Math.sin(t*4)*0.25); };
      charge.userData.tag='coil';
      this.animated.add(charge);
      muzzle=new THREE.Vector3(0,hy+0.14,2.6);
      break; }
    case 'repair': {
      this.P(CY(0.7,0.8,0.24,K.L,{},8),0,0.12,0,head);
      const ring=this.P(this.torus(0.55,0.035,col,{e:1.2*K.glow},8),0,0.26,0,head);
      ring.rotation.x=Math.PI/2;
      ring.userData.anim=(dt,t)=>{ ring.material.emissiveIntensity=(0.9+Math.sin(t*2.4)*0.5)*K.glow; };
      this.animated.add(ring);
      this.P(B(0.5,0.6,0.5,K.M),0,0.5,-0.4,head);
      this.P(B(0.54,0.08,0.54,K.L),0,0.84,-0.4,head);
      this.P(B(0.3,0.09,0.04,0xd84343,{e:0.8}),0,0.55,-0.14,head);
      this.P(B(0.09,0.3,0.04,0xd84343,{e:0.8}),0,0.55,-0.14,head);
      for(let i=0;i<2;i++){
        const drone=new THREE.Group(); head.add(drone);
        this.P(B(0.2,0.07,0.2,K.L),0,0,0,drone);
        this.P(S(0.05,col,{e:1.9*K.glow},8),0,-0.07,0,drone);
        for(let k2=0;k2<4;k2++) this.P(CY(0.07,0.07,0.015,K.N,{},8),Math.cos(k2*1.57+0.78)*0.15,0.05,Math.sin(k2*1.57+0.78)*0.15,drone);
        drone.userData.anim=(dt,t)=>{ const a=t*1.4+i*Math.PI;
          drone.position.set(Math.cos(a)*0.8,1.1+Math.sin(t*2.4+i*2)*0.15,Math.sin(a)*0.8);
          drone.rotation.y=-a; };
        this.animated.add(drone);
      }
      break; }
    case 'missile': {
      this._tdsHull(head,1.0,0.6,0.9,K);
      const rack=new THREE.Group(); rack.rotation.x=-0.45; rack.position.set(0,0.28,0); head.add(rack);
      const rackMissiles=[];
      for(let i=0;i<6;i++){
        const x=(i%3-1)*0.28, y=(i<3?0.16:-0.16);
        const cell=this.cyl(0.11,0.11,0.5,K.N,{},6); cell.rotation.x=Math.PI/2; cell.position.set(x,y,0.25); rack.add(cell);
        const rim=this.P(this.torus(0.1,0.02,col,{e:0.8*K.glow},6),x,y,0.5,rack);
        const rm=new THREE.Group(); rm.position.set(x,y,0.32); rack.add(rm);
        const bd=this.cyl(0.06,0.06,0.4,K.L,{},8); bd.rotation.x=Math.PI/2; rm.add(bd);
        const tip=this.cone(0.065,0.14,0xb03a2e,{},8); tip.rotation.x=Math.PI/2; tip.position.z=0.26; rm.add(tip);
        rackMissiles.push(rm);
      }
      head.userData.rackMissiles=rackMissiles; head.userData.rack=rack;
      this.P(B(0.06,0.55,0.06,K.N),0.52,0.6,-0.3,head);
      const s2=this.P(S(0.06,col,{e:1.7*K.glow},8),0.52,0.92,-0.3,head);
      s2.userData.anim=(dt,t)=>{ s2.material.emissiveIntensity=(1.2+Math.sin(t*5)*0.6)*K.glow; };
      this.animated.add(s2);
      muzzle=new THREE.Vector3(0,hy+0.8,0.55);
      break; }
    case 'radar': {
      this.P(CY(0.16,0.24,1.0,K.L,{},6),0,0.5,0,head);
      this.P(CY(0.26,0.26,0.09,K.N,{},6),0,0.9,0,head);
      const gimbal=new THREE.Group(); gimbal.position.y=1.2; head.add(gimbal);
      for(const sx of [1,-1]){
        this.P(B(0.9,0.5,0.07,K.M),sx*0.48,0,0,gimbal).rotation.y=sx*0.1;
        this.P(B(0.8,0.4,0.02,col,{e:0.9*K.glow}),sx*0.48,0,sx*0.05,gimbal).rotation.y=sx*0.1;
      }
      const sweep=this.P(B(0.05,0.42,0.03,0xffffff,{e:2*K.glow}),0,0,0.07,gimbal);
      sweep.userData.anim=(dt,t)=>{ sweep.position.x=Math.sin(t*2.4)*0.8; };
      this.animated.add(sweep);
      gimbal.userData.anim=(dt,t)=>{ gimbal.rotation.y=t*1.5; };
      this.animated.add(gimbal);
      const orb=this.P(S(0.08,0xd7fbe8,{e:2*K.glow},8),0,1.75,0,head);
      orb.userData.anim=(dt,t)=>{ orb.material.emissiveIntensity=(1.3+(Math.sin(t*3)>0.6?0.9:0))*K.glow; };
      this.animated.add(orb);
      break; }
  }
  const recoilAmp={ mg:0.24, scatter:0.34, mortar:0.5, sniper:0.55, rail:0.6, missile:0.2 }[id]||0.2;
  // every turret gets a tiny blinking status LED
  const led=this.P(S(0.025,col,{e:1.5},6),0,hy+0.12,-0.55,head);
  led.userData.anim=(dt,t)=>{ led.material.emissiveIntensity=0.6+Math.sin(t*4)*0.8; };
  this.animated.add(led);
  g.add(this.aoDisc(1.25));
  g.scale.setScalar(1.22); muzzle.multiplyScalar(1.22);
  g.userData={ head, barrel, muzzleLocal:muzzle, recoil:0, recoilAmp, cosmetics:null };
  return g;
};
})();

