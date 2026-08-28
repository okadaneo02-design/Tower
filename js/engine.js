/* ============ TOWER DEFENDERS v2 — 3D engine (Three.js) ============ */
TD.Engine = class {
  constructor(canvas){
    const C = TD.CONFIG;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.scene = new THREE.Scene();
    this.worldSize = C.GRID*C.CELL;

    // --- orbit camera rig (smoothed: current values chase targets) ---
    this.camTarget = new THREE.Vector3(0,0,0);
    this.camAngle = Math.PI/4;
    this.camElev  = 0.62;
    this.camSize  = 34;
    this.camSize = 24;
    this.tTarget = this.camTarget.clone();
    this.tAngle = this.camAngle; this.tElev = this.camElev; this.tSize = this.camSize;
    this.camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,700);
    this.updateCamera();

    // --- lights ---
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8fae6e, 0.5));
    const sun = new THREE.DirectionalLight(0xfff6d8, 0.75);
    sun.position.set(60,95,30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024,1024);
    const s = this.worldSize*0.56;
    Object.assign(sun.shadow.camera,{ left:-s,right:s,top:s,bottom:-s,near:10,far:300 });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    this.matCache = {};
    this.mapGroup = null;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    this.time = 0;
    this.animated = new Set();
    this._boxGeo = new THREE.BoxGeometry(1,1,1);
    this._skyGroup=new THREE.Group(); this.scene.add(this._skyGroup);
    this._clouds=[]; this.weather=null; this._baseAura=null;
    this.makeSky();
    this.initFX();
    this.resize();
  }

  /* ============ materials & primitives ============ */
  _gradMap(){
    if (this.__grad) return this.__grad;
    const cv=document.createElement('canvas'); cv.width=4; cv.height=1;
    const g=cv.getContext('2d');
    ['#4e535a','#84898f','#b4b8bd','#e2e4e7'].forEach((c,i)=>{ g.fillStyle=c; g.fillRect(i,0,1,1); });
    const t=new THREE.CanvasTexture(cv);
    t.minFilter=t.magFilter=THREE.NearestFilter;
    return this.__grad=t;
  }
  // stylized toon shading — stepped light bands make simple shapes read as deliberate
  mat(color, opts={}){
    const key = color+'|'+(opts.e||0)+'|'+(opts.o??1);
    if (!this.matCache[key]){
      this.matCache[key] = new THREE.MeshToonMaterial({
        color, gradientMap:this._gradMap(),
        // damped so glows stay saturated neon instead of blowing out to white
        emissive:opts.e?color:0x000000, emissiveIntensity:(opts.e||0)*0.62,
        transparent:(opts.o??1)<1, opacity:opts.o??1 });
    }
    return this.matCache[key];
  }
  aoDisc(r){ // soft contact shadow that grounds every model
    if (!this.__aoGeo) this.__aoGeo=new THREE.CircleGeometry(1,24);
    if (!this.__aoMat) this.__aoMat=new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.25, depthWrite:false });
    const m=new THREE.Mesh(this.__aoGeo,this.__aoMat);
    m.rotation.x=-Math.PI/2; m.scale.setScalar(r); m.position.y=0.025;
    m.renderOrder=1;
    return m;
  }
  // raycast real meshes and walk up to the owning game object (tower/block)
  pickOwner(nx,ny,objects){
    this.raycaster.setFromCamera({x:nx,y:ny}, this.camera);
    const hits=this.raycaster.intersectObjects(objects,true);
    for (const h of hits){
      let o=h.object;
      while (o){ if (o.userData&&o.userData.owner) return o.userData.owner; o=o.parent; }
    }
    return null;
  }
  geo(key,make){ this._geoCache=this._geoCache||{}; if(!this._geoCache[key]) this._geoCache[key]=make(); return this._geoCache[key]; }
  box(w,h,d,color,opts){ const m=new THREE.Mesh(this._boxGeo,this.mat(color,opts)); m.scale.set(w,h,d); m.castShadow=true; m.receiveShadow=true; return m; }
  cyl(rt,rb,h,color,opts,seg=16){
    const m=new THREE.Mesh(this.geo(`c${rt.toFixed(3)}|${rb.toFixed(3)}|${h.toFixed(3)}|${seg}`,()=>new THREE.CylinderGeometry(rt,rb,h,seg)),this.mat(color,opts));
    m.castShadow=true; m.receiveShadow=true; return m; }
  sph(r,color,opts,seg=14){
    const m=new THREE.Mesh(this.geo(`s${r.toFixed(3)}|${seg}`,()=>new THREE.SphereGeometry(r,seg,Math.max(6,seg-4))),this.mat(color,opts));
    m.castShadow=true; return m; }
  cone(r,h,color,opts,seg=10){
    const m=new THREE.Mesh(this.geo(`k${r.toFixed(3)}|${h.toFixed(3)}|${seg}`,()=>new THREE.ConeGeometry(r,h,seg)),this.mat(color,opts));
    m.castShadow=true; return m; }
  torus(r,t,color,opts,seg=20){
    const m=new THREE.Mesh(this.geo(`t${r.toFixed(3)}|${t.toFixed(3)}|${seg}`,()=>new THREE.TorusGeometry(r,t,10,seg)),this.mat(color,opts));
    m.castShadow=true; return m; }
  P(mesh,x,y,z,parent){ mesh.position.set(x,y,z); if(parent) parent.add(mesh); return mesh; }

  /* ============ camera ============ */
  updateCamera(){
    const d=200;
    const cx=Math.cos(this.camAngle)*Math.cos(this.camElev), cz=Math.sin(this.camAngle)*Math.cos(this.camElev);
    this.camera.position.set(this.camTarget.x+cx*d, this.camTarget.y+Math.sin(this.camElev)*d, this.camTarget.z+cz*d);
    this.camera.lookAt(this.camTarget);
    const a=innerWidth/innerHeight;
    this.camera.left=-this.camSize*a; this.camera.right=this.camSize*a;
    this.camera.top=this.camSize; this.camera.bottom=-this.camSize;
    this.camera.updateProjectionMatrix();
  }
  zoom(dy){ this.tSize=THREE.MathUtils.clamp(this.tSize+dy*0.025,9,42); }
  orbit(dx,dy){
    this.tAngle+=dx*0.0042;
    this.tElev=THREE.MathUtils.clamp(this.tElev+dy*0.0038,0.3,1.3);
  }
  rotate(step){ this.tAngle+=step*Math.PI/2; }
  pan(dx,dy){
    const a=this.camAngle;
    const fx=-Math.cos(a), fz=-Math.sin(a);
    const rx=Math.cos(a-Math.PI/2), rz=Math.sin(a-Math.PI/2);
    const k=this.camSize/400;
    this.tTarget.x+=(rx*dx+fx*-dy)*k; this.tTarget.z+=(rz*dx+fz*-dy)*k;
    const lim=this.worldSize*0.55;
    this.tTarget.x=THREE.MathUtils.clamp(this.tTarget.x,-lim,lim);
    this.tTarget.z=THREE.MathUtils.clamp(this.tTarget.z,-lim,lim);
  }
  resetCam(){ this.camTarget.set(0,0,0); this.tTarget.set(0,0,0);
    this.camSize=this.tSize=24; this.camElev=this.tElev=0.62; this.camAngle=this.tAngle=Math.PI/4; this.updateCamera(); }
  focus(x,z){ this.tTarget.set(x,0,z); }
  smoothCamera(dt){
    const k=1-Math.exp(-dt*11);
    let moved=false;
    if (Math.abs(this.tAngle-this.camAngle)>1e-4){ this.camAngle+=(this.tAngle-this.camAngle)*k; moved=true; }
    if (Math.abs(this.tElev-this.camElev)>1e-4){ this.camElev+=(this.tElev-this.camElev)*k; moved=true; }
    if (Math.abs(this.tSize-this.camSize)>1e-3){ this.camSize+=(this.tSize-this.camSize)*k; moved=true; }
    if (this.camTarget.distanceToSquared(this.tTarget)>1e-5){ this.camTarget.lerp(this.tTarget,k); moved=true; }
    if (moved) this.updateCamera();
  }

  /* ============ coordinates ============ */
  cellToWorld(c,r){ const C=TD.CONFIG; return new THREE.Vector3((c-C.GRID/2+0.5)*C.CELL, 0, (r-C.GRID/2+0.5)*C.CELL); }
  worldToCell(p){ const C=TD.CONFIG; return { c:Math.floor(p.x/C.CELL+C.GRID/2), r:Math.floor(p.z/C.CELL+C.GRID/2) }; }
  pickGround(nx,ny){
    this.raycaster.setFromCamera({x:nx,y:ny}, this.camera);
    const pt=new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, pt) ? pt : null;
  }
  toScreen(pos){
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    const v=pos.clone().project(this.camera);
    return { x:(v.x+1)/2*innerWidth, y:(-v.y+1)/2*innerHeight };
  }

  /* ============ map ============ */
  groundTexture(pal,size=2048){
    const cv=document.createElement('canvas'); cv.width=cv.height=size;
    const g=cv.getContext('2d');
    const c1='#'+new THREE.Color(pal.ground).getHexString(), c2='#'+new THREE.Color(pal.ground2).getHexString();
    g.fillStyle=c1; g.fillRect(0,0,size,size);
    const blobs=Math.round(size*1.3);
    for(let i=0;i<blobs;i++){ g.fillStyle=Math.random()<0.5?c2:c1;
      g.globalAlpha=0.10+Math.random()*0.18;
      g.beginPath(); g.arc(Math.random()*size,Math.random()*size,size/240+Math.random()*size/60,0,7); g.fill(); }
    g.globalAlpha=0.12; g.strokeStyle='#000'; g.lineWidth=Math.max(1,size/1400);
    const step=size/TD.CONFIG.GRID;
    for(let i=0;i<=TD.CONFIG.GRID;i++){ g.beginPath();g.moveTo(i*step,0);g.lineTo(i*step,size);g.stroke();
      g.beginPath();g.moveTo(0,i*step);g.lineTo(size,i*step);g.stroke(); }
    g.globalAlpha=1;
    const tex=new THREE.CanvasTexture(cv); tex.encoding=THREE.sRGBEncoding; tex.anisotropy=8;
    return tex;
  }
  // real rendered thumbnail of a map (cached)
  renderMapPreview(map){
    this._pvCache=this._pvCache||{};
    if (this._pvCache[map.id]) return this._pvCache[map.id];
    if (!this._pvR){ this._pvR=new THREE.WebGLRenderer({antialias:true});
      this._pvR.setSize(300,300); this._pvR.outputEncoding=THREE.sRGBEncoding; }
    const W=this.worldSize, sc=new THREE.Scene();
    sc.background=new THREE.Color(map.pal.sky);
    const gr=new THREE.Mesh(new THREE.PlaneGeometry(W,W),
      new THREE.MeshStandardMaterial({map:this.groundTexture(map.pal,512),roughness:0.95}));
    gr.rotation.x=-Math.PI/2; sc.add(gr);
    const terr=TD.mapTerrain(map);
    const rockM=new THREE.MeshStandardMaterial({color:map.pal.rock,flatShading:true});
    for (const [c,r] of terr.rocks){
      const p=this.cellToWorld(c,r);
      const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),rockM);
      m.position.set(p.x,0.5,p.z); m.scale.y=0.65; m.rotation.set(c,r,0); sc.add(m);
    }
    const capM=new THREE.MeshStandardMaterial({color:new THREE.Color(map.pal.ground).offsetHSL(0,-0.05,0.08).getHex(),flatShading:true});
    for (const cl of terr.mtns) for (const [c,r] of cl){
      const p=this.cellToWorld(c,r), h=2.6+((c*13+r*7)%20)/9;
      const m=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.95,h,7),rockM);
      m.position.set(p.x,h/2,p.z); m.rotation.y=c*1.7+r; sc.add(m);
      const cp=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,0.14,7),capM);
      cp.position.set(p.x,h+0.07,p.z); sc.add(cp);
    }
    const pts=[]; for(let i=0;i<=80;i++){ const a=i/80*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*W/2*1.02,0.2,Math.sin(a)*W/2*1.02)); }
    sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0xef4444})));
    sc.add(new THREE.HemisphereLight(0xffffff,0x8fae6e,0.55));
    const dl=new THREE.DirectionalLight(0xfff6d8,0.75); dl.position.set(30,50,15); sc.add(dl);
    const k=W*0.60;
    const cam=new THREE.OrthographicCamera(-k,k,k,-k,1,400);
    cam.position.set(60,80,60); cam.lookAt(0,0,0);
    this._pvR.render(sc,cam);
    const url=this._pvR.domElement.toDataURL();
    sc.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
    this._pvCache[map.id]=url;
    return url;
  }
  buildMap(map){
    if (this.mapGroup) this.scene.remove(this.mapGroup);
    this.animated.clear();
    if (this._sun) this.animated.add(this._sun);
    this.makeWeather(map);
    if (this._baseAura){ this.scene.remove(this._baseAura); this._baseAura=null; }
    const C=TD.CONFIG, grp=new THREE.Group();
    this.scene.background=new THREE.Color(map.pal.sky);

    // fog measured from the camera (~200 away) — keep the playfield clear, fade the horizon
    this.scene.fog=new THREE.Fog(map.pal.sky, 200+this.worldSize*0.7, 200+this.worldSize*2.6);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(this.worldSize,this.worldSize),
      new THREE.MeshStandardMaterial({ map:this.groundTexture(map.pal), roughness:0.95 }));
    ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; grp.add(ground);
    const apron=new THREE.Mesh(new THREE.PlaneGeometry(this.worldSize*5,this.worldSize*5),
      this.mat(new THREE.Color(map.pal.sky).offsetHSL(0,0,0.03).getHex(),{r:1}));
    apron.rotation.x=-Math.PI/2; apron.position.y=-0.08; apron.receiveShadow=true; grp.add(apron);

    // sunken lake ring removed — land builds only
    map._waterCells=[];

    // terrain: rocks + mountain massifs
    const terr=TD.mapTerrain(map);
    for (const [c,r] of terr.rocks){
      const p=this.cellToWorld(c,r);
      const rock=new THREE.Mesh(this.geo('rock',()=>new THREE.IcosahedronGeometry(1,0)), this.mat(map.pal.rock,{flat:true,r:0.9}));
      rock.position.set(p.x,0.5,p.z); rock.rotation.set(c,r,c+r);
      rock.scale.set(0.9+((c*7+r*13)%10)/20,0.6,0.9+((c*3+r*11)%10)/20);
      rock.castShadow=rock.receiveShadow=true; grp.add(rock);
    }
    for (const cluster of terr.mtns) for (const [c,r] of cluster){
      const p=this.cellToWorld(c,r);
      const h=2.6+((c*13+r*7)%20)/9;   // mesa height 2.6-4.8
      // flat-topped mesa: truncated lower tier + narrower upper tier + pale flat cap
      const lower=new THREE.Mesh(this.geo('mesaL',()=>new THREE.CylinderGeometry(1.35,1.95,1,7)), this.mat(map.pal.rock,{flat:true}));
      lower.scale.y=h*0.62; lower.position.set(p.x,h*0.31,p.z); lower.rotation.y=c*1.7+r;
      lower.castShadow=lower.receiveShadow=true; grp.add(lower);
      const upper=new THREE.Mesh(this.geo('mesaU',()=>new THREE.CylinderGeometry(1.05,1.4,1,7)), this.mat(new THREE.Color(map.pal.rock).offsetHSL(0,0,0.05).getHex(),{flat:true}));
      upper.scale.y=h*0.38; upper.position.set(p.x,h*0.62+h*0.19,p.z); upper.rotation.y=c*1.7+r+0.4;
      upper.castShadow=upper.receiveShadow=true; grp.add(upper);
      const cap=new THREE.Mesh(this.geo('mesaC',()=>new THREE.CylinderGeometry(1.06,1.06,0.12,7)), this.mat(new THREE.Color(map.pal.ground).offsetHSL(0,-0.05,0.08).getHex(),{flat:true}));
      cap.position.set(p.x,h+0.06,p.z); cap.rotation.y=c*1.7+r+0.4;
      grp.add(cap);
    }
    map._rocks=terr.rocks.concat(terr.mtns.flat());

    // spawn ring — they come from everywhere
    const ringR=this.worldSize/2*1.02;
    const ringPts=[];
    for(let i=0;i<=120;i++){ const a=i/120*Math.PI*2; ringPts.push(new THREE.Vector3(Math.cos(a)*ringR,0.15,Math.sin(a)*ringR)); }
    const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color:0xef4444, transparent:true, opacity:0.35 }));
    grp.add(ring);
    ring.userData.anim=(dt,t)=>{ ring.material.opacity=0.22+Math.sin(t*2)*0.12; };
    this.animated.add(ring);

    // grid overlay + flow arrows
    const gh=new THREE.GridHelper(this.worldSize, C.GRID, 0xffffff, 0xffffff);
    gh.material.transparent=true; gh.material.opacity=0.06; gh.position.y=0.02;
    grp.add(gh); this.gridOverlay=gh;
    const arrowGeo=new THREE.ConeGeometry(0.16,0.5,6); arrowGeo.rotateX(Math.PI/2);
    this.flowArrows=new THREE.InstancedMesh(arrowGeo,
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.3}), C.GRID*C.GRID);
    this.flowArrows.count=0; this.flowArrows.visible=false;
    grp.add(this.flowArrows);

    this.scene.add(grp); this.mapGroup=grp;
    return grp;
  }
  updateFlowArrows(field, blocked){
    const C=TD.CONFIG, M=new THREE.Matrix4(), Q=new THREE.Quaternion(), up=new THREE.Vector3(0,1,0), S=new THREE.Vector3(1,1,1);
    let i=0;
    for (let r=0;r<C.GRID;r++) for (let c=0;c<C.GRID;c++){
      const f=field[r*C.GRID+c];
      if (!f||blocked[r*C.GRID+c]) continue;
      const p=this.cellToWorld(c,r);
      Q.setFromAxisAngle(up, Math.atan2(f.dx,f.dz));
      M.compose(new THREE.Vector3(p.x,0.07,p.z),Q,S);
      this.flowArrows.setMatrixAt(i++,M);
    }
    this.flowArrows.count=i; this.flowArrows.instanceMatrix.needsUpdate=true;
  }
  setPlacementMode(on){ if(this.gridOverlay) this.gridOverlay.material.opacity=on?0.2:0.06; if(this.flowArrows) this.flowArrows.visible=on; }

  /* ============ THE BASE ============ */
  makeBase(){
    const g=new THREE.Group();
    const plinth=this.P(this.cyl(2.2,2.5,0.45,0x565f6b),0,0.22,0,g);
    for(let i=0;i<8;i++){ const a=i*Math.PI/4;
      this.P(this.box(0.36,0.65,0.8,0x6a7482,{m:0.3}),Math.cos(a)*2.0,0.32,Math.sin(a)*2.0,g).rotation.y=-a; }
    this.P(this.cyl(1.25,1.6,1.8,0x7b8694,{r:0.5,m:0.4}),0,1.3,0,g);
    this.P(this.cyl(1.42,1.42,0.26,0x454d58),0,2.3,0,g);
    const core=this.P(this.sph(0.7,0x4ade80,{e:1.2}),0,3.0,0,g);
    const ring=this.P(this.torus(1.05,0.07,0x9fe8bd,{e:0.7}),0,3.0,0,g);
    const ring2=this.P(this.torus(1.35,0.045,0x9fe8bd,{e:0.5}),0,3.0,0,g);
    core.userData.anim=(dt,t)=>{ core.scale.setScalar(1+Math.sin(t*2.4)*0.06); };
    ring.userData.anim=(dt,t)=>{ ring.rotation.y=t*0.8; ring.rotation.x=Math.sin(t*0.5)*0.4; };
    ring2.userData.anim=(dt,t)=>{ ring2.rotation.y=-t*0.5; ring2.rotation.z=Math.sin(t*0.4)*0.5; };
    this.animated.add(core); this.animated.add(ring); this.animated.add(ring2);
    g.userData.core=core;
    g.add(this.aoDisc(2.9));
    return g;
  }
  setBaseStress(base,frac){
    const c=base.userData.core; if(!c) return;
    const col=new THREE.Color().setHSL(THREE.MathUtils.lerp(0.0,0.35,Math.max(0,frac)),0.75,0.55);
    c.material=this.mat(col.getHex(),{e:1.2});
  }
  absorbFX(basePos,color=0xff5f5f){
    this.ring(basePos,3.5,color,0.5);
    this.burst(new THREE.Vector3(basePos.x,4,basePos.z),color,18,5,0.5,3);
  }

  /* ============ TURRET MODELS — detailed hardware ============ */
  // shared armored mount: skirt plates, glowing accent ring, status light
  _mount(g,color=0x4c545f,accent=0x4ade80){
    this.P(this.cyl(1.02,1.16,0.3,0x343b44),0,0.15,0,g);
    const ring=this.P(this.torus(0.95,0.045,accent,{e:0.85}),0,0.33,0,g);
    ring.rotation.x=Math.PI/2;
    this.P(this.cyl(0.78,0.95,0.34,color,{m:0.3}),0,0.5,0,g);
    for(let i=0;i<6;i++){ const a=i*Math.PI/3;
      const plate=this.P(this.box(0.36,0.32,0.09,0x3b424c,{m:0.4}),Math.cos(a)*0.84,0.5,Math.sin(a)*0.84,g);
      plate.rotation.y=-a+Math.PI/2;
      this.P(this.sph(0.045,0x22262c,{m:0.6,r:0.4}),Math.cos(a+0.5)*0.95,0.24,Math.sin(a+0.5)*0.95,g); }
    this.P(this.cyl(0.32,0.4,0.55,0x2f353d,{m:0.5}),0,0.85,0,g);
    for(let i=0;i<3;i++) this.P(this.box(0.09,0.4,0.02,0x22272e),0.33,0.85,-0.12+i*0.12,g); // vents
    const st=this.P(this.sph(0.05,accent,{e:1.6}),0.44,0.68,0.44,g);
    st.userData.anim=(dt,t)=>{ st.material.emissiveIntensity=1+Math.sin(t*3.5)*0.7; };
    this.animated.add(st);
  }
  // fork yoke that visibly holds the gun assembly
  _yoke(head,color=0x39404a){
    this.P(this.box(0.52,0.12,0.36,color,{m:0.4}),0,-0.24,0,head);
    this.P(this.box(0.1,0.36,0.32,color,{m:0.4}),0.31,-0.04,0,head);
    this.P(this.box(0.1,0.36,0.32,color,{m:0.4}),-0.31,-0.04,0,head);
    this.P(this.sph(0.07,0x22262c,{m:0.6}),0.31,0.05,0,head);
    this.P(this.sph(0.07,0x22262c,{m:0.6}),-0.31,0.05,0,head);
  }
  // gun barrel with muzzle brake; returns barrel group (recoil moves it -z)
  _barrel(len,cal,color=0x2d3239){
    const b=new THREE.Group();
    this.P(this.cyl(cal,cal*1.15,len,color,{m:0.6,r:0.35}),0,0,0,b).rotation.x=Math.PI/2;
    b.children[0].position.z=len/2;
    this.P(this.cyl(cal*1.5,cal*1.5,cal*3,0x22262c,{m:0.7,r:0.3}),0,0,len,b).rotation.x=Math.PI/2;
    this.P(this.torus(cal*1.35,cal*0.3,0x1a1e23,{m:0.6}),0,0,len*0.82,b);
    return b;
  }
  makeTower(id){
    const d=TD.TOWERS[id], g=new THREE.Group(), col=d.color;
    this._mount(g,0x4c545f,col);
    const head=new THREE.Group(); head.position.y=1.15; g.add(head);
    if (['mg','scatter','flak','sniper','rail','missile'].includes(id)) this._yoke(head);
    let barrel=null, muzzle=new THREE.Vector3(0,1.15,1.0);
    const B=(w,h,dd,c,o)=>this.box(w,h,dd,c,o), CY=(a,b2,h,c,o)=>this.cyl(a,b2,h,c,o), S=(r,c,o)=>this.sph(r,c,o);
    switch(id){
      case 'mg': {
        this.P(B(0.66,0.46,0.95,0x59636e,{m:0.3}),0,0.06,-0.05,head);
        this.P(B(0.54,0.1,0.65,col,{e:0.3}),0,0.34,0,head);
        this.P(B(0.5,0.34,0.08,0x49525c,{m:0.4}),0,0.1,0.44,head); // front shield plate
        barrel=this._barrel(0.95,0.06); barrel.position.set(0.13,0.08,0.44); head.add(barrel);
        const b2=this._barrel(0.95,0.06); b2.position.set(-0.13,0.08,0.44); head.add(b2); head.userData.b2=b2;
        this.P(B(0.32,0.4,0.55,0x424a54),-0.48,0.02,-0.12,head); // ammo box
        this.P(B(0.06,0.22,0.45,0xc9a227,{m:0.6}),-0.34,0.16,0.14,head); // belt
        this.P(B(0.13,0.14,0.26,0x20242a),0.24,0.38,-0.28,head); // optic
        this.P(this.sph(0.04,0xff5f5f,{e:1.4}),0.24,0.48,-0.28,head);
        break; }
      case 'scatter': {
        this.P(B(0.72,0.5,0.7,0x6e5540,{r:0.7}),0,0.05,-0.15,head);
        const bl=this.P(CY(0.13,0.13,0.95,0x3a3026,{m:0.5}),0.14,0.1,0.45,head); bl.rotation.x=Math.PI/2;
        const br=bl.clone(); br.position.x=-0.14; head.add(br);
        this.P(B(0.55,0.14,0.35,col,{e:0.2}),0,0.36,-0.1,head);
        this.P(CY(0.17,0.17,0.16,0x20242b,{m:0.6}),0.14,0.1,0.95,head).rotation.x=Math.PI/2;
        this.P(CY(0.17,0.17,0.16,0x20242b,{m:0.6}),-0.14,0.1,0.95,head).rotation.x=Math.PI/2;
        for(let i=0;i<4;i++) this.P(CY(0.05,0.05,0.18,0xb03a2e),-0.28+i*0.19,0.33,-0.42,head); // shell rack
        barrel=new THREE.Group(); barrel.position.set(0,0.1,0.5); head.add(barrel);
        muzzle=new THREE.Vector3(0,1.25,1.1);
        break; }
      case 'mortar': {
        head.position.y=0.9;
        this.P(B(1.5,0.22,1.5,0x4a463f),0,0.62,0,g);
        for(let i=0;i<8;i++){ const a=i*Math.PI/4; // sandbag ring
          const bag=this.P(B(0.5,0.26,0.3,0x8a7d5e,{r:0.95}),Math.cos(a)*1.05,0.5,Math.sin(a)*1.05,g);
          bag.rotation.y=-a+Math.PI/2; }
        for(let i=0;i<3;i++) this.P(this.cyl(0.09,0.09,0.4,0xb03a2e),0.85,0.78+0,-0.6+i*0.2,g).rotation.z=Math.PI/2; // shell stack
        const tube=this.P(CY(0.3,0.36,1.9,0x434a52,{m:0.5}),0,0.6,-0.2,head);
        tube.rotation.x=Math.PI/3.4;
        this.P(this.torus(0.34,0.05,col,{e:0.35}),0,0.25,-0.48,head).rotation.x=Math.PI/3.4;
        this.P(this.torus(0.37,0.05,0x353b42,{m:0.5}),0,0.85,-0.02,head).rotation.x=Math.PI/3.4;
        this.P(B(0.1,0.8,0.1,0x333941),0.55,0.35,0.35,head).rotation.z=0.5;
        this.P(B(0.1,0.8,0.1,0x333941),-0.55,0.35,0.35,head).rotation.z=-0.5;
        const crate=this.P(B(0.6,0.35,0.42,0x5d564d),0.8,0.2,-0.5,head);
        for(let i=0;i<3;i++) this.P(CY(0.07,0.07,0.3,0x8a8f96,{m:0.6}),0.68+i*0.12,0.42,-0.5,head).rotation.z=Math.PI/2;
        barrel=tube; muzzle=new THREE.Vector3(0,2.4,0.6);
        break; }
      case 'emp': {
        const core=this.P(CY(0.16,0.2,1.7,0x8b949e,{m:0.7}),0,0.9,0,g);
        [0.7,1.15,1.6].forEach((y,i)=>{
          const t=this.P(this.torus(0.55-i*0.1,0.09,0x2f6f7d,{m:0.4,e:0.25}),0,y,0,g);
          t.rotation.x=Math.PI/2;
          t.userData.anim=(dt,tm)=>{ t.rotation.z=tm*(1+i*0.5); }; this.animated.add(t);
        });
        const orb=this.P(S(0.34,col,{e:1.2}),0,2.15,0,g);
        orb.userData.anim=(dt,t)=>{ orb.scale.setScalar(1+Math.sin(t*5)*0.09); };
        this.animated.add(orb);
        for(let i=0;i<4;i++){ const a=i*Math.PI/2;
          this.P(B(0.1,0.5,0.24,0xd8dee6),Math.cos(a)*0.5,0.55,Math.sin(a)*0.5,g).rotation.y=-a; }
        head.position.y=2.15; muzzle=new THREE.Vector3(0,2.15,0);
        break; }
      case 'acid': {
        const drum=this.P(CY(0.42,0.42,0.9,0x55683c),0,0.95,-0.3,g);
        drum.rotation.x=Math.PI/2.6;
        this.P(this.torus(0.43,0.04,0xf2c94c),0,1.08,-0.42,g).rotation.x=Math.PI/2.6-Math.PI/2;
        this.P(this.torus(0.43,0.04,0x2a2f36),0,0.82,-0.28,g).rotation.x=Math.PI/2.6-Math.PI/2; // hazard band
        this.P(B(0.3,0.3,0.02,0xf2c94c,{e:0.3}),0,0.98,0.12,g).rotation.z=Math.PI/4; // warning diamond
        const tank=this.P(S(0.3,0x89c45a,{e:0.5}),0,1.45,-0.55,g);
        tank.userData.anim=(dt,t)=>{ tank.material.emissiveIntensity=0.35+Math.sin(t*3)*0.2; };
        this.animated.add(tank);
        barrel=new THREE.Group();
        this.P(CY(0.07,0.07,0.9,0x39422c),0,0,0.45,barrel).rotation.x=Math.PI/2;
        this.P(this.cone(0.12,0.25,col,{e:0.4}),0,0,0.98,barrel).rotation.x=Math.PI/2;
        barrel.position.set(0,0.15,0.2); head.add(barrel);
        break; }
      case 'sniper': {
        // tripod
        for(let i=0;i<3;i++){ const a=i*2.1+0.5;
          this.P(B(0.09,1.15,0.09,0x3a4048),Math.cos(a)*0.55,0.6,Math.sin(a)*0.55,g).rotation.z=Math.cos(a)*0.45, g.children[g.children.length-1].rotation.x=Math.sin(a)*0.45; }
        head.position.y=1.35;
        this.P(B(0.4,0.36,0.9,0x666f7b,{m:0.3}),0,0.05,-0.15,head);
        barrel=this._barrel(1.9,0.07); barrel.position.set(0,0.1,0.3); head.add(barrel);
        const scope=this.P(CY(0.1,0.1,0.42,0x22262c,{m:0.5}),0,0.32,0.1,head); scope.rotation.x=Math.PI/2;
        this.P(S(0.075,col,{e:1.4}),0,0.32,0.32,head);
        this.P(B(0.14,0.24,0.5,0x4a5158),0,-0.05,-0.6,head); // stock counterweight
        muzzle=new THREE.Vector3(0,1.45,2.2);
        break; }
      case 'tesla': {
        this.P(CY(0.62,0.78,0.5,0x4c545f,{m:0.3}),0,0.55,0,g);
        [0.85,1.1,1.35,1.6].forEach((y,i)=>this.P(this.torus(0.42-i*0.07,0.07,0x9a7038,{m:0.7,r:0.35}),0,y,0,g).rotation.x=Math.PI/2);
        [0.98,1.23,1.48].forEach(y=>this.P(this.cyl(0.3,0.3,0.04,0xd8dee6,{r:0.4,m:0.2}),0,y,0,g)); // insulator discs
        this.P(CY(0.1,0.1,1.1,0x8b949e,{m:0.7}),0,1.3,0,g);
        const orb=this.P(S(0.45,col,{e:1.1}),0,2.15,0,g);
        orb.userData.anim=(dt,t)=>{ orb.scale.setScalar(1+Math.sin(t*6)*0.07); };
        this.animated.add(orb);
        const halo=this.P(this.torus(0.6,0.02,0x9fd8ff,{e:1.2}),0,2.15,0,g);
        halo.userData.anim=(dt,t)=>{ halo.rotation.x=t*2.4; halo.rotation.y=t*1.7; };
        this.animated.add(halo);
        head.position.y=2.15; muzzle=new THREE.Vector3(0,2.15,0);
        break; }
      case 'relay': {
        this.P(CY(0.09,0.13,2.2,0x8b949e,{m:0.6}),0,1.35,0,g);
        for(let i=0;i<3;i++){ const a=i*2.09;
          const dish=this.P(S(0.3,col,{e:0.5}),Math.cos(a)*0.4,1.9+i*0.25,Math.sin(a)*0.4,g);
          dish.scale.set(1,0.4,1); dish.rotation.z=0.6; dish.rotation.y=-a; }
        const beacon=this.P(S(0.14,0xff5f8f,{e:1.6}),0,2.6,0,g);
        beacon.userData.anim=(dt,t)=>{ beacon.material.emissiveIntensity=1+Math.sin(t*4)*0.7; };
        this.animated.add(beacon);
        const ring=this.P(this.torus(0.9,0.05,0xf7a8d8,{e:0.8}),0,0.9,0,g);
        ring.rotation.x=Math.PI/2;
        ring.userData.anim=(dt,t)=>{ ring.rotation.z=t; const s=1+Math.sin(t*3)*0.1; ring.scale.set(s,s,1); };
        this.animated.add(ring);
        break; }
      case 'salvage': {
        this.P(B(1.1,0.7,0.9,0x84744c),0,0.75,0,g);
        this.P(B(1.2,0.12,1.0,0x5f5436),0,1.16,0,g);
        for(let i=0;i<3;i++) this.P(B(0.34,0.1,0.26,[0x7d8791,0x9b5f45,0x6d7d55][i]),0.55,0.2+i*0.11,0.5,g).rotation.y=i*0.5; // scrap pallet
        const arm=new THREE.Group(); arm.position.set(0,1.25,0); g.add(arm);
        this.P(B(0.12,0.9,0.12,0x6b5d3a),0,0.45,0,arm);
        this.P(B(0.12,0.12,0.9,0x6b5d3a),0,0.9,0.4,arm);
        this.P(this.cyl(0.015,0.015,0.32,0x2a2f36),0,0.75,0.8,arm); // hook cable
        const mag=this.P(CY(0.25,0.25,0.1,0x8a8f96,{m:0.8}),0,0.6,0.8,arm);
        arm.userData.anim=(dt,t)=>{ arm.rotation.y=Math.sin(t*0.7)*0.9; mag.position.y=0.6+Math.sin(t*1.4)*0.15; };
        this.animated.add(arm);
        const sign=this.P(B(0.5,0.5,0.08,0xf7dd72,{e:0.6}),0,0.8,0.5,g);
        sign.userData.anim=(dt,t)=>{ sign.material.emissiveIntensity=0.4+Math.sin(t*2)*0.25; };
        this.animated.add(sign);
        this.P(B(0.4,0.25,0.3,0x7d7264),0.6,0.15,0.45,g).rotation.y=0.5;
        this.P(B(0.3,0.2,0.24,0x6d6255),-0.62,0.12,0.4,g).rotation.y=-0.3;
        break; }
      case 'flak': {
        this.P(CY(0.55,0.7,0.6,0x596270,{m:0.3}),0,0.6,0,g);
        head.position.y=1.15;
        this.P(B(0.8,0.36,0.6,col,{m:0.2}),0,0,-0.1,head);
        barrel=new THREE.Group(); barrel.position.set(0,0.15,0.2); head.add(barrel);
        [[0.16,0.1],[-0.16,0.1],[0.16,-0.12],[-0.16,-0.12]].forEach(([x,y])=>{
          const t=this._barrel(1.15,0.05); t.position.set(x,y+0.15,0); t.rotation.x=-0.45; barrel.add(t); });
        const radar=this.P(B(0.5,0.36,0.06,0xdde3ea),0,0.55,-0.45,head);
        radar.userData.anim=(dt,t)=>{ radar.rotation.y=t*2.4; };
        this.animated.add(radar);
        muzzle=new THREE.Vector3(0,1.9,1.0);
        break; }
      case 'flame': {
        const t1=this.P(CY(0.28,0.28,0.9,0xb0512f),-0.3,0.75,-0.3,g);
        const t2=this.P(CY(0.22,0.22,0.75,0x86381c),0.32,0.68,-0.3,g);
        [t1,t2].forEach(t=>this.P(this.torus(t.geometry.parameters.radiusTop+0.01,0.03,0x3d2c22),t.position.x,t.position.y+0.2,t.position.z,g).rotation.x=Math.PI/2);
        this.P(B(0.55,0.4,0.5,0x59636e,{m:0.3}),0,0.05,0,head);
        barrel=new THREE.Group(); barrel.position.set(0,0.08,0.3); head.add(barrel);
        this.P(CY(0.11,0.14,0.8,0x3d2c22),0,0,0.4,barrel).rotation.x=Math.PI/2;
        this.P(this.torus(0.15,0.035,0x8a4a2a,{m:0.4}),0,0,0.62,barrel);
        const pilot=this.P(S(0.1,0xffb36b,{e:1.5}),0,0,0.85,barrel);
        pilot.userData.anim=(dt,t)=>{ pilot.scale.setScalar(1+Math.sin(t*11)*0.3); };
        this.animated.add(pilot);
        muzzle=new THREE.Vector3(0,1.23,1.1);
        break; }
      case 'rail': {
        this.P(B(1.1,0.6,1.1,0x3f454e,{m:0.3}),0,0.65,0,g);
        head.position.y=1.35;
        const railL=this.P(B(0.1,0.16,2.2,col,{e:0.3,m:0.6}),0.16,0.12,0.55,head);
        const railR=railL.clone(); railR.position.x=-0.16; head.add(railR);
        const strip=this.P(B(0.08,0.06,1.9,0x9fd0ff,{e:1.2}),0,0.12,0.5,head);
        strip.userData.anim=(dt,t)=>{ strip.material.emissiveIntensity=0.7+Math.sin(t*6)*0.5; };
        this.animated.add(strip);
        const charge=this.P(S(0.15,0x9fd0ff,{e:1.4}),0,0.12,-0.15,head);
        charge.userData.anim=(dt,t)=>{ charge.scale.setScalar(1+Math.sin(t*4)*0.3); };
        this.animated.add(charge);
        // capacitor bank + coolant pipes
        this.P(B(0.6,0.45,0.55,0x2a2f37,{m:0.4}),0,0.05,-0.6,head);
        for(let i=0;i<3;i++) this.P(CY(0.07,0.07,0.5,0x6fb3d8,{m:0.6,e:0.2}),-0.2+i*0.2,0.35,-0.6,head);
        barrel=railL; muzzle=new THREE.Vector3(0,1.5,1.7);
        break; }
      case 'repair': {
        this.P(B(1.15,0.85,1.0,0x8a6f4d),0,0.75,0,g);
        this.P(B(1.3,0.14,1.15,0x5f4a32),0,1.24,0,g);
        this.P(B(0.4,0.5,0.06,0x2c2620),0,0.55,0.51,g); // door
        const cross=this.P(B(0.34,0.1,0.05,0xff6b6b,{e:0.8}),0,1.0,0.52,g);
        this.P(B(0.1,0.34,0.05,0xff6b6b,{e:0.8}),0,1.0,0.52,g);
        // hovering repair drone
        const drone=new THREE.Group();
        this.P(B(0.22,0.08,0.22,0xffd9a8,{e:0.3}),0,0,0,drone);
        for(let i=0;i<4;i++){ const a=i*Math.PI/2+0.78;
          this.P(CY(0.09,0.09,0.02,0x8a8f96,{m:0.5}),Math.cos(a)*0.18,0.06,Math.sin(a)*0.18,drone); }
        drone.position.y=1.9; g.add(drone);
        drone.userData.anim=(dt,t)=>{ drone.position.x=Math.cos(t*1.3)*0.7; drone.position.z=Math.sin(t*1.3)*0.7;
          drone.position.y=1.9+Math.sin(t*2.6)*0.15; drone.rotation.y=-t*1.3; };
        this.animated.add(drone);
        break; }
      case 'missile': {
        this.P(B(1.05,0.45,1.05,0x4d5666,{m:0.2}),0,0.5,0,g);
        head.position.y=0.95;
        const rack=new THREE.Group(); rack.rotation.x=-0.55; rack.position.y=0.3; head.add(rack);
        this.P(B(0.85,0.6,1.0,col,{m:0.2}),0,0,0,rack);
        const rackMissiles=[];
        for(let i=0;i<6;i++){
          const x=(i%3-1)*0.26, y=(i<3?0.16:-0.16);
          this.P(CY(0.1,0.1,1.05,0x2f3540),x,y,0.05,rack).rotation.x=Math.PI/2;
          const rm=this.cone(0.08,0.16,0xb03a2e); rm.rotation.x=Math.PI/2;
          rm.position.set(x,y,0.62); rack.add(rm);
          rackMissiles.push(rm);
        }
        head.userData.rackMissiles=rackMissiles; head.userData.rack=rack;
        this.P(B(0.08,0.7,0.08,0x8b949e,{m:0.6}),0.5,0.65,-0.35,head);
        this.P(S(0.07,0x9fb8f0,{e:1.2}),0.5,1.05,-0.35,head);
        this.P(B(0.12,0.4,0.12,0x394050),0,-0.15,-0.5,head).rotation.x=0.4; // hydraulic
        barrel=rack; muzzle=new THREE.Vector3(0,1.7,0.6);
        break; }
      case 'radar': {
        // armored control cabin
        this.P(B(0.8,0.55,0.7,0x4b5563,{m:0.25}),0,0.95,0,g);
        this.P(B(0.62,0.2,0.06,0x9fe8c8,{e:0.7}),0,1.0,0.36,g); // glowing readout
        this.P(this.cyl(0.14,0.18,0.85,0x39414c,{m:0.4}),0,1.6,0,g);
        // proper parabolic dish on a gimbal, sweeping
        const dishG=new THREE.Group(); dishG.position.y=2.15; g.add(dishG);
        const dish=new THREE.Mesh(this.geo('rdish',()=>new THREE.SphereGeometry(0.62,18,12,0,Math.PI*2,0,Math.PI/2.6)),
          this.mat(0xdbe7ee,{m:0.35,r:0.5}));
        dish.rotation.x=Math.PI/2-0.55; dish.position.z=0.1; dishG.add(dish);
        const dishBack=new THREE.Mesh(this.geo('rdishb',()=>new THREE.SphereGeometry(0.6,14,10,0,Math.PI*2,0,Math.PI/2.8)),
          this.mat(col,{e:0.35}));
        dishBack.rotation.x=Math.PI/2-0.55; dishBack.position.z=0.06; dishBack.scale.setScalar(0.96); dishG.add(dishBack);
        // feed horn
        this.P(this.cyl(0.03,0.03,0.55,0x8b949e,{m:0.6}),0,0.28,0.32,dishG).rotation.x=0.55;
        const horn=this.P(S(0.08,0xd7fbe8,{e:1.8}),0,0.52,0.45,dishG);
        horn.userData.anim=(dt,t)=>{ horn.material.emissiveIntensity=1.2+Math.sin(t*4)*0.8; };
        this.animated.add(horn);
        dishG.userData.anim=(dt,t)=>{ dishG.rotation.y=t*1.3; };
        this.animated.add(dishG);
        // small comms whip + blinker
        this.P(this.cyl(0.02,0.02,0.9,0xaab4bf),0.35,1.75,-0.25,g);
        const blink=this.P(S(0.05,0xff5f5f,{e:2}),0.35,2.24,-0.25,g);
        blink.userData.anim=(dt,t)=>{ blink.material.emissiveIntensity=(Math.sin(t*5)>0.4)?2:0.2; };
        this.animated.add(blink);
        head.position.y=2.15; muzzle=new THREE.Vector3(0,2.15,0);
        break; }
    }
    const recoilAmp={ mg:0.22, scatter:0.34, mortar:0.5, sniper:0.55, rail:0.6, flak:0.28, acid:0.16, missile:0.2 }[id]||0.2;
    g.add(this.aoDisc(1.25));
    g.scale.setScalar(1.28); muzzle.multiplyScalar(1.28);
    g.userData={ head, barrel, muzzleLocal:muzzle, recoil:0, recoilAmp, cosmetics:null };
    return g;
  }

  /* upgrade cosmetics — turrets visibly grow with tiers */
  applyCosmetics(model,id,tiers){
    const u=model.userData;
    if (u.cosmetics){ model.remove(u.cosmetics); u.cosmetics.traverse(o=>{ if(this.animated.has(o)) this.animated.delete(o); }); }
    const c=new THREE.Group(); u.cosmetics=c; model.add(c);
    const head=u.head||model, col=TD.TOWERS[id].color;
    const hy=head.position.y;
    // RATE path — heat fins, then golden accelerator ring
    if (tiers[0]>=2 && u.barrel){
      for(let i=0;i<3;i++){ const fin=this.box(0.34,0.05,0.12,0x2a2f36,{m:0.6});
        fin.position.set(0,hy+0.28,0.35+i*0.25); c.add(fin); }
    }
    if (tiers[0]>=3){
      const disc=this.torus(0.3,0.06,0xffd166,{e:0.8,m:0.5});
      disc.position.set(0,hy,0.55);
      disc.userData.anim=(dt,t)=>{ disc.rotation.z=t*6; };
      this.animated.add(disc); c.add(disc);
    }
    // SYSTEMS path — antenna, then spinning mini-dish
    if (tiers[1]>=2){
      const ant=this.cyl(0.02,0.03,0.9,0xaab4bf,{m:0.7}); ant.position.set(0.35,hy+0.75,-0.3); c.add(ant);
      const tip=this.sph(0.05,0x7dd3fc,{e:1.6}); tip.position.set(0.35,hy+1.22,-0.3);
      tip.userData.anim=(dt,t)=>{ tip.material.emissiveIntensity=1+Math.sin(t*5)*0.7; };
      this.animated.add(tip); c.add(tip);
    }
    if (tiers[1]>=3){
      const mini=this.sph(0.2,0x7dd3fc,{e:0.7}); mini.scale.set(1,0.35,0.7);
      mini.position.set(-0.4,hy+0.75,-0.3);
      mini.userData.anim=(dt,t)=>{ mini.rotation.y=t*3; };
      this.animated.add(mini); c.add(mini);
    }
    // POWER path — reinforced muzzle, then pulsing power ring
    if (tiers[2]>=2 && u.barrel){ u.barrel.scale.setScalar(1.18); }
    else if (u.barrel) u.barrel.scale.setScalar(1);
    if (tiers[2]>=3){
      const ring=this.torus(0.75,0.07,col,{e:1.0});
      ring.rotation.x=Math.PI/2; ring.position.y=0.55;
      ring.userData.anim=(dt,t)=>{ ring.rotation.z=t*1.5; ring.material.emissiveIntensity=0.7+Math.sin(t*3)*0.4; };
      this.animated.add(ring); c.add(ring);
    }
    // tier pips
    const total=tiers[0]+tiers[1]+tiers[2];
    for(let i=0;i<total;i++){
      const p=this.sph(0.07,0xffd166,{e:1}); const a=Math.PI*0.25+i*0.35;
      p.position.set(Math.cos(a)*0.95,0.15,Math.sin(a)*0.95); c.add(p);
    }
  }

  /* ============ VEHICLE MODELS ============ */
  _wheel(r,w,parent,x,y,z){
    const wrap=new THREE.Group(); wrap.position.set(x,y,z);
    const tire=this.cyl(r,r,w,0x1d2126,{r:0.9},14); tire.rotation.z=Math.PI/2; wrap.add(tire);
    const hub=this.cyl(r*0.45,r*0.45,w+0.02,0x6a7178,{m:0.6},10); hub.rotation.z=Math.PI/2; wrap.add(hub);
    parent.add(wrap); return wrap;
  }
  makeEnemy(type){
    const d=TD.ENEMIES[type], g=new THREE.Group(), s=d.size, col=d.color;
    const parts={ wheels:[] };
    const B=(w,h,dd,c,o)=>this.box(w,h,dd,c,o);
    const W=(r,w,x,y,z)=>{ const wh=this._wheel(r*s,w*s,g,x*s,y*s,z*s); parts.wheels.push(wh); return wh; };
    switch(type){
      case 'junker': {
        this.P(B(0.85*s,0.3*s,1.6*s,col),0,0.42*s,0,g);
        this.P(B(0.8*s,0.32*s,0.75*s,new THREE.Color(col).offsetHSL(0,-0.08,-0.06).getHex()),0,0.72*s,-0.15*s,g);
        this.P(B(0.7*s,0.2*s,0.06*s,0xbfd9e2,{e:0.15}),0,0.72*s,0.24*s,g); // windshield
        this.P(B(0.6*s,0.1*s,0.2*s,0x5f5148),0,0.62*s,-0.62*s,g); // trunk junk
        this.P(B(0.3*s,0.14*s,0.1*s,0x756a5f),0.15*s,0.68*s,-0.6*s,g);
        this.P(B(0.16*s,0.08*s,0.04*s,0xffe6a8,{e:1.2}),0.28*s,0.42*s,0.8*s,g);
        this.P(B(0.16*s,0.08*s,0.04*s,0xffe6a8,{e:1.2}),-0.28*s,0.42*s,0.8*s,g);
        this.P(this.cyl(0.05*s,0.05*s,0.3*s,0x3a3f45),-0.35*s,0.3*s,-0.82*s,g).rotation.x=Math.PI/2;
        W(0.26,0.16,0.45,0.26,0.55); W(0.26,0.16,-0.45,0.26,0.55);
        W(0.26,0.16,0.45,0.26,-0.5); W(0.26,0.16,-0.45,0.26,-0.5);
        break; }
      case 'buggy': {
        this.P(B(0.6*s,0.16*s,1.3*s,col),0,0.35*s,0,g);
        this.P(B(0.44*s,0.3*s,0.5*s,0x4a4438),0,0.55*s,-0.1*s,g); // seat block
        // rollbar
        this.P(B(0.06*s,0.5*s,0.06*s,0x3a3f45),0.24*s,0.75*s,-0.3*s,g).rotation.x=-0.3;
        this.P(B(0.06*s,0.5*s,0.06*s,0x3a3f45),-0.24*s,0.75*s,-0.3*s,g).rotation.x=-0.3;
        this.P(B(0.54*s,0.06*s,0.06*s,0x3a3f45),0,0.97*s,-0.37*s,g);
        this.P(B(0.5*s,0.06*s,0.3*s,0x5d5546),0,0.5*s,0.55*s,g).rotation.x=0.25; // hood scoop
        W(0.2,0.14,0.36,0.2,0.5); W(0.2,0.14,-0.36,0.2,0.5);
        W(0.3,0.2,0.4,0.3,-0.45); W(0.3,0.2,-0.4,0.3,-0.45);
        break; }
      case 'moto': {
        this.P(B(0.2*s,0.24*s,0.9*s,col),0,0.45*s,0,g);
        this.P(B(0.3*s,0.08*s,0.08*s,0x3a3f45),0,0.62*s,0.35*s,g); // bars
        this.P(B(0.16*s,0.3*s,0.2*s,0x39404a),0,0.72*s,-0.05*s,g); // rider
        this.P(this.sph(0.1*s,0x2c3138),0,0.94*s,-0.05*s,g); // helmet
        W(0.22,0.08,0,0.22,0.42); W(0.22,0.08,0,0.22,-0.38);
        break; }
      case 'apc': {
        g.userData.smoke=[-0.42*s,0.85*s,-0.85*s];
        const hull=this.P(B(1.0*s,0.42*s,1.7*s,col,{m:0.35,r:0.5}),0,0.55*s,0,g);
        const nose=this.P(B(0.9*s,0.34*s,0.5*s,new THREE.Color(col).offsetHSL(0,0,-0.05).getHex(),{m:0.35}),0,0.62*s,0.95*s,g);
        nose.rotation.x=0.5;
        this.P(B(0.5*s,0.2*s,0.5*s,0x5f7183,{m:0.4}),0,0.86*s,-0.2*s,g); // hatch
        this.P(this.cyl(0.04*s,0.04*s,0.5*s,0x2d3239),0.1*s,1.0*s,0,g).rotation.x=Math.PI/2;
        this.P(B(0.1*s,0.06*s,0.1*s,0x9fb4c8,{e:0.5}),-0.3*s,0.82*s,0.4*s,g);
        for(const z of [0.55,0,-0.55]){ W(0.24,0.18,0.52,0.24,z); W(0.24,0.18,-0.52,0.24,z); }
        break; }
      case 'chopper': {
        this.P(B(0.55*s,0.5*s,1.3*s,col),0,1.3*s,0.1*s,g);
        this.P(B(0.4*s,0.3*s,0.5*s,0xbfd9e2,{e:0.2}),0,1.42*s,0.75*s,g); // canopy
        this.P(this.cyl(0.08*s,0.12*s,1.1*s,new THREE.Color(col).offsetHSL(0,0,-0.06).getHex()),0,1.35*s,-1.0*s,g).rotation.x=Math.PI/2;
        this.P(B(0.06*s,0.4*s,0.2*s,col),0,1.5*s,-1.5*s,g); // tail fin
        const rotor=new THREE.Group(); rotor.position.set(0,1.75*s,0.1*s); g.add(rotor);
        this.P(B(2.4*s,0.03*s,0.12*s,0x22262b),0,0,0,rotor);
        this.P(B(0.12*s,0.03*s,2.4*s,0x22262b),0,0,0,rotor);
        parts.rotor=rotor;
        const tr=new THREE.Group(); tr.position.set(0.08*s,1.5*s,-1.52*s); g.add(tr);
        this.P(B(0.02*s,0.5*s,0.08*s,0x22262b),0,0,0,tr); parts.tailRotor=tr;
        this.P(B(0.06*s,0.06*s,1.0*s,0x3a3f45),0.28*s,0.95*s,0.1*s,g);
        this.P(B(0.06*s,0.06*s,1.0*s,0x3a3f45),-0.28*s,0.95*s,0.1*s,g);
        break; }
      case 'hauler': {
        g.userData.smoke=[0.45*s,1.05*s,0.55*s];
        this.P(B(0.8*s,0.6*s,0.65*s,0x8a6f3f),0,0.62*s,0.75*s,g); // cab
        this.P(B(0.7*s,0.25*s,0.06*s,0xbfd9e2,{e:0.15}),0,0.78*s,1.06*s,g);
        this.P(B(0.85*s,0.14*s,0.14*s,0x59606a,{m:0.5}),0,0.3*s,1.1*s,g); // grille
        this.P(B(0.95*s,0.85*s,1.5*s,col),0,0.75*s,-0.5*s,g); // container
        this.P(B(0.97*s,0.06*s,1.52*s,0x8f7440),0,1.2*s,-0.5*s,g);
        for(const z of [0.75,-0.2,-0.85]){ W(0.26,0.18,0.5,0.26,z); W(0.26,0.18,-0.5,0.26,z); }
        break; }
      case 'mechvan': {
        this.P(B(0.9*s,0.75*s,1.6*s,col),0,0.68*s,0,g);
        this.P(B(0.8*s,0.3*s,0.06*s,0xbfd9e2,{e:0.15}),0,0.85*s,0.81*s,g);
        // wrench cross decal
        this.P(B(0.4*s,0.12*s,0.04*s,0xd84343,{e:0.5}),0,0.72*s,-0.82*s,g);
        this.P(B(0.12*s,0.4*s,0.04*s,0xd84343,{e:0.5}),0,0.72*s,-0.82*s,g);
        const beacon=this.P(this.sph(0.1*s,0xff9c50,{e:1.8}),0,1.15*s,0.3*s,g);
        beacon.userData.anim=(dt,t)=>{ beacon.material.emissiveIntensity=1+Math.sin(t*8)*0.9; };
        this.animated.add(beacon); parts.beacon=beacon;
        W(0.24,0.16,0.47,0.24,0.55); W(0.24,0.16,-0.47,0.24,0.55);
        W(0.24,0.16,0.47,0.24,-0.55); W(0.24,0.16,-0.47,0.24,-0.55);
        break; }
      case 'prowler': {
        this.P(B(0.8*s,0.22*s,1.6*s,col,{r:0.4,m:0.5}),0,0.34*s,0,g);
        const ws=this.P(B(0.66*s,0.2*s,0.5*s,0x14171c,{r:0.3,m:0.6}),0,0.52*s,0.1*s,g);
        ws.rotation.x=0.15;
        this.P(B(0.7*s,0.06*s,0.16*s,col,{m:0.5}),0,0.5*s,-0.75*s,g); // spoiler
        this.P(B(0.06*s,0.12*s,0.06*s,0x2a2f36),0.28*s,0.42*s,-0.72*s,g);
        this.P(B(0.06*s,0.12*s,0.06*s,0x2a2f36),-0.28*s,0.42*s,-0.72*s,g);
        const glow=this.P(B(0.6*s,0.02*s,1.2*s,0x8f4fd6,{e:1.2}),0,0.12*s,0,g);
        parts.underglow=glow;
        W(0.2,0.14,0.42,0.2,0.5); W(0.2,0.14,-0.42,0.2,0.5);
        W(0.2,0.14,0.42,0.2,-0.5); W(0.2,0.14,-0.42,0.2,-0.5);
        break; }
      case 'tank': {
        g.userData.smoke=[0.4*s,1.0*s,-0.8*s];
        this.P(B(1.0*s,0.36*s,1.7*s,col),0,0.5*s,0,g);
        // treads
        for(const x of [0.55,-0.55]){
          this.P(B(0.3*s,0.4*s,1.8*s,0x2c2f33,{r:0.9}),x*s,0.34*s,0,g);
          for(let i=0;i<4;i++) W(0.16,0.28,x,0.18,0.6-i*0.4);
        }
        const tur=this.P(this.cyl(0.42*s,0.5*s,0.34*s,new THREE.Color(col).offsetHSL(0,0,-0.05).getHex(),{m:0.2}),0,0.85*s,-0.1*s,g);
        const gun=this.P(this.cyl(0.07*s,0.09*s,1.5*s,0x2d3239,{m:0.5}),0,0.9*s,0.65*s,g);
        gun.rotation.x=Math.PI/2;
        this.P(this.cyl(0.1*s,0.1*s,0.2*s,0x22262b,{m:0.6}),0,0.9*s,1.35*s,g).rotation.x=Math.PI/2;
        this.P(this.cyl(0.02*s,0.02*s,0.6*s,0x8b949e),0.3*s,1.2*s,-0.3*s,g);
        break; }
      case 'rammer': {
        this.P(B(0.85*s,0.4*s,1.5*s,col),0,0.5*s,-0.1*s,g);
        const wedge=this.P(B(1.0*s,0.55*s,0.16*s,0x3c3f44,{m:0.5}),0,0.45*s,0.85*s,g);
        wedge.rotation.x=-0.5;
        for(let i=0;i<3;i++) this.P(B(0.22*s,0.1*s,0.05*s,i%2?0xf2c94c:0x22262b),(i-1)*0.3*s,0.62*s,0.92*s,g).rotation.x=-0.5;
        const core=this.P(this.sph(0.16*s,0xff4030,{e:1.6}),0,0.75*s,-0.35*s,g);
        core.userData.anim=(dt,t)=>{ core.material.emissiveIntensity=1.2+Math.sin(t*10)*0.8; };
        this.animated.add(core);
        this.P(B(0.5*s,0.3*s,0.5*s,0x8a4030),0,0.78*s,0.1*s,g);
        W(0.24,0.16,0.45,0.24,0.5); W(0.24,0.16,-0.45,0.24,0.5);
        W(0.24,0.16,0.45,0.24,-0.5); W(0.24,0.16,-0.45,0.24,-0.5);
        break; }
      case 'shieldvan': {
        this.P(B(0.9*s,0.7*s,1.5*s,col),0,0.65*s,0,g);
        this.P(B(0.8*s,0.28*s,0.06*s,0xbfd9e2,{e:0.15}),0,0.8*s,0.76*s,g);
        this.P(this.cyl(0.12*s,0.16*s,0.3*s,0x44505e,{m:0.5}),0,1.15*s,-0.2*s,g);
        const emitter=this.P(this.sph(0.12*s,0x9fd0ff,{e:1.8}),0,1.35*s,-0.2*s,g);
        const dome=this.P(this.sph(1.4*s,0x7fa7d8,{e:0.25,o:0.13}),0,0.8*s,0,g);
        dome.castShadow=false;
        dome.userData.anim=(dt,t)=>{ dome.scale.setScalar(1+Math.sin(t*2.2)*0.05); };
        this.animated.add(dome);
        emitter.userData.anim=(dt,t)=>{ emitter.material.emissiveIntensity=1.3+Math.sin(t*5)*0.6; };
        this.animated.add(emitter);
        W(0.24,0.16,0.47,0.24,0.5); W(0.24,0.16,-0.47,0.24,0.5);
        W(0.24,0.16,0.47,0.24,-0.5); W(0.24,0.16,-0.47,0.24,-0.5);
        break; }
      case 'digger': {
        this.P(B(0.8*s,0.5*s,1.3*s,col),0,0.55*s,-0.15*s,g);
        this.P(B(0.6*s,0.3*s,0.5*s,0x6e653f),0,0.9*s,-0.35*s,g);
        const drill=this.cone(0.32*s,0.9*s,0x8a8f96,{m:0.7,r:0.3});
        drill.rotation.x=Math.PI/2; drill.position.set(0,0.5*s,0.95*s); g.add(drill);
        parts.drill=drill;
        this.P(this.torus(0.34*s,0.05*s,0x5c5433,{m:0.4}),0,0.5*s,0.55*s,g);
        for(const z of [0.35,-0.35]){ W(0.26,0.2,0.48,0.26,z); W(0.26,0.2,-0.48,0.26,z); }
        break; }
      case 'gunship': {
        this.P(B(0.7*s,0.55*s,1.7*s,col),0,1.3*s,0,g);
        this.P(B(0.5*s,0.3*s,0.5*s,0xbfd9e2,{e:0.2}),0,1.45*s,0.75*s,g);
        this.P(B(1.2*s,0.08*s,0.3*s,new THREE.Color(col).offsetHSL(0,0,-0.06).getHex()),0,1.35*s,-0.2*s,g); // stub wings
        this.P(this.cyl(0.06*s,0.06*s,0.5*s,0x2d3239),0.55*s,1.28*s,-0.2*s,g).rotation.x=Math.PI/2;
        this.P(this.cyl(0.06*s,0.06*s,0.5*s,0x2d3239),-0.55*s,1.28*s,-0.2*s,g).rotation.x=Math.PI/2;
        const rotor=new THREE.Group(); rotor.position.set(0.55*s,1.75*s,0.3*s); g.add(rotor);
        this.P(B(1.6*s,0.03*s,0.1*s,0x22262b),0,0,0,rotor);
        this.P(B(0.1*s,0.03*s,1.6*s,0x22262b),0,0,0,rotor);
        const rotor2=rotor.clone(); rotor2.position.x=-0.55*s; g.add(rotor2);
        parts.rotor=rotor; parts.tailRotor=rotor2;
        this.P(B(0.06*s,0.4*s,0.25*s,col),0,1.6*s,-0.85*s,g);
        break; }
      case 'racer': {
        this.P(B(0.6*s,0.18*s,1.7*s,col,{r:0.4,m:0.4}),0,0.3*s,0,g);
        this.P(B(0.4*s,0.16*s,0.5*s,0x14171c,{r:0.3,m:0.5}),0,0.44*s,0,g);
        this.P(B(0.8*s,0.06*s,0.2*s,col,{m:0.5}),0,0.55*s,-0.8*s,g); // rear wing
        this.P(B(0.08*s,0.14*s,0.08*s,0x2a2f36),0.3*s,0.42*s,-0.78*s,g);
        this.P(B(0.08*s,0.14*s,0.08*s,0x2a2f36),-0.3*s,0.42*s,-0.78*s,g);
        this.P(B(0.5*s,0.05*s,0.3*s,0x2a2f36),0,0.22*s,0.85*s,g); // splitter
        const flame=this.P(this.sph(0.08*s,0x7dd3fc,{e:1.8}),0,0.32*s,-0.95*s,g);
        flame.userData.anim=(dt,t)=>{ flame.scale.setScalar(1+Math.sin(t*20)*0.3); };
        this.animated.add(flame);
        W(0.2,0.13,0.36,0.2,0.55); W(0.2,0.13,-0.36,0.2,0.55);
        W(0.22,0.16,0.38,0.22,-0.55); W(0.22,0.16,-0.38,0.22,-0.55);
        break; }
      case 'boss': {
        g.userData.smoke=[0.45*s,2.25*s,-0.6*s];
        this.P(B(1.5*s,0.6*s,2.2*s,col,{r:0.6}),0,0.75*s,0,g);
        this.P(B(1.2*s,0.5*s,0.8*s,new THREE.Color(col).offsetHSL(0,0.05,-0.04).getHex()),0,1.25*s,-0.3*s,g);
        // plow blade
        const plow=this.P(B(1.7*s,0.7*s,0.14*s,0x3c3f44,{m:0.5}),0,0.55*s,1.25*s,g);
        plow.rotation.x=-0.35;
        for(let i=0;i<5;i++) this.P(this.cone(0.08*s,0.3*s,0x9aa3ad,{m:0.7}),(i-2)*0.36*s,0.75*s,1.38*s,g).rotation.x=Math.PI/2-0.35;
        // stacks
        for(const x of [0.45,-0.45]){
          this.P(this.cyl(0.1*s,0.13*s,0.8*s,0x2a2d31),x*s,1.8*s,-0.6*s,g);
        }
        const core=this.P(this.sph(0.28*s,0xff4040,{e:1.5}),0,1.35*s,0.35*s,g);
        core.userData.anim=(dt,t)=>{ core.scale.setScalar(1+Math.sin(t*3)*0.12); };
        this.animated.add(core);
        for(let i=0;i<3;i++) this.P(this.cone(0.14*s,0.5*s,0x39482c),(i-1)*0.5*s,1.6*s,-0.2*s,g);
        for(const z of [0.8,0.27,-0.27,-0.8]){ W(0.3,0.24,0.72,0.3,z); W(0.3,0.24,-0.72,0.3,z); }
        break; }
    }
    g.userData.parts=parts; g.userData.phase=Math.random()*7; g.userData.size=s; g.userData.fly=!!d.fly;
    if (!d.fly) g.add(this.aoDisc(0.95*s));
    g.scale.setScalar(1.12);
    return g;
  }
  animEnemy(g,dt,speedFrac){
    const u=g.userData, p=u.parts;
    u.phase+=dt*10*Math.max(0.15,speedFrac);
    if (u.fly){
      g.position.y=1.1+Math.sin(u.phase*0.35)*0.3;
      if (p.rotor) p.rotor.rotation.y+=dt*22;
      if (p.tailRotor) p.tailRotor.rotation.x+=dt*30;
      g.rotation.z=Math.sin(u.phase*0.3)*0.06;
    } else {
      for (const w of p.wheels) w.rotation.x+=dt*10*speedFrac;
      if (p.drill) p.drill.rotation.z+=dt*14;
      g.rotation.z=Math.sin(u.phase)*0.015;
      // chugging exhaust on the heavies
      if (u.smoke&&Math.random()<dt*6){
        const o=u.smoke, a=g.rotation.y;
        const wx=g.position.x+o[0]*Math.cos(a)+o[2]*Math.sin(a);
        const wz=g.position.z-o[0]*Math.sin(a)+o[2]*Math.cos(a);
        this.burst(new THREE.Vector3(wx,g.position.y+o[1],wz),0x6b7076,1,0.6,0.7,-1.2);
      }
    }
  }
  setStealth(g,hidden){
    g.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); o.material.transparent=true; o.material.opacity=hidden?0.16:1; } });
    const ug=g.userData.parts&&g.userData.parts.underglow;
    if (ug) ug.visible=!hidden;
  }

  /* ============ BLOCK MODELS ============ */
  makeBlock(type){
    const C=TD.CONFIG.CELL, g=new THREE.Group();
    switch(type){
      case 'block': {
        this.P(this.box(C*0.94,1.35,C*0.94,0xaab4bf,{r:0.85}),0,0.68,0,g);
        this.P(this.box(C*0.99,0.16,C*0.99,0x8d97a2),0,1.43,0,g);
        this.P(this.box(C*0.8,0.05,C*0.8,0x939da8),0,1.52,0,g);
        break; }
      case 'wire': { // 1x2 cells, long axis = local Z
        for(const z of [-C*0.85,0,C*0.85]){
          this.P(this.cyl(0.05,0.06,0.85,0x6b5844),-0.6,0.42,z,g);
          this.P(this.cyl(0.05,0.06,0.85,0x6b5844),0.6,0.42,z,g);
        }
        for(const x of [-0.6,0.6]) for(const y of [0.3,0.62]){
          const w=this.P(this.cyl(0.018,0.018,C*1.8,0x8f8577,{m:0.5}),x,y,0,g);
          w.rotation.x=Math.PI/2;
        }
        for(let i=0;i<6;i++){
          const coil=this.torus(0.14,0.02,0xb08968,{m:0.5},10);
          coil.position.set((i%2?0.6:-0.6),0.46,-C*0.8+i*C*0.32);
          coil.rotation.y=Math.PI/2+i; g.add(coil);
        }
        break; }
      case 'tar': { // quicksand
        this.P(this.cyl(0.95,1.0,0.1,0xcbb26a,{r:0.95}),0,0.05,0,g);
        this.P(this.cyl(0.7,0.75,0.06,0xb89d55,{r:0.95}),0,0.11,0,g);
        const swirl=this.P(this.torus(0.45,0.05,0xa5894a,{r:0.9}),0,0.13,0,g);
        swirl.rotation.x=Math.PI/2;
        const swirl2=this.P(this.torus(0.25,0.04,0x97803f,{r:0.9}),0,0.15,0,g);
        swirl2.rotation.x=Math.PI/2;
        swirl.userData.anim=(dt,t)=>{ swirl.rotation.z=t*0.7; };
        swirl2.userData.anim=(dt,t)=>{ swirl2.rotation.z=-t*1.1; };
        this.animated.add(swirl); this.animated.add(swirl2);
        for(let i=0;i<3;i++){
          const puff=this.sph(0.05,0xd9c17e,{r:0.9});
          const a=i*2.1, rr=0.2+((i*7)%3)*0.15;
          puff.position.set(Math.cos(a)*rr,0.12,Math.sin(a)*rr); g.add(puff);
          puff.userData.anim=(dt,t)=>{
            const ph=(t*0.8+i*0.9)%2;
            if (ph<1.5){ const k=ph/1.5; puff.visible=true; puff.position.y=0.1+k*0.1; puff.scale.setScalar(0.5+k); }
            else puff.visible=false;
          };
          this.animated.add(puff);
        }
        break; }
      case 'spike': {
        this.P(this.box(C*0.9,0.12,C*0.9,0x5a636e,{m:0.5}),0,0.06,0,g);
        for(let i=0;i<9;i++) this.P(this.cone(0.09,0.44,0xaeb9c5,{m:0.7,r:0.3}),(i%3-1)*0.55,0.32,(Math.floor(i/3)-1)*0.55,g);
        break; }
      case 'trap': {
        // rim with hazard stripes
        const rim=this.P(this.box(C*0.98,0.14,C*0.98,0x3a3f45),0,0.07,0,g);
        for(let i=0;i<4;i++){
          const st=this.box(0.3,0.15,0.12,i%2?0xf2c94c:0x22262b);
          st.position.set(-0.65+i*0.44,0.08,C*0.44); g.add(st);
          const st2=st.clone(); st2.position.z=-C*0.44; g.add(st2);
        }
        this.P(this.box(C*0.8,0.02,C*0.8,0x08090b),0,0.02,0,g); // the pit
        const doorL=new THREE.Group(); doorL.position.set(-C*0.42,0.12,0); g.add(doorL);
        this.P(this.box(C*0.42,0.06,C*0.84,0x6b7d8f,{m:0.4}),C*0.21,0,0,doorL);
        const doorR=new THREE.Group(); doorR.position.set(C*0.42,0.12,0); g.add(doorR);
        this.P(this.box(C*0.42,0.06,C*0.84,0x6b7d8f,{m:0.4}),-C*0.21,0,0,doorR);
        g.userData.doors=[doorL,doorR];
        break; }
    }
    return g;
  }
  setTrapOpen(model,k){ // k: 0 closed .. 1 open
    const d=model.userData.doors; if(!d) return;
    d[0].rotation.z= k*1.9; d[1].rotation.z=-k*1.9;
  }

  /* ============ FX SYSTEM ============ */
  initFX(){
    const N=this.PN=2600;
    this.pPos=new Float32Array(N*3); this.pCol=new Float32Array(N*3);
    this.pVel=new Float32Array(N*3); this.pLife=new Float32Array(N); this.pMax=new Float32Array(N);
    this.pGrav=new Float32Array(N); this.pHead=0;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(this.pPos,3));
    geo.setAttribute('color',new THREE.BufferAttribute(this.pCol,3));
    this.points=new THREE.Points(geo,new THREE.PointsMaterial({ size:0.38, vertexColors:true,
      transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, depthWrite:false }));
    this.points.frustumCulled=false; this.scene.add(this.points);
    this.beams=[];
    for(let i=0;i<48;i++){
      const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
        new THREE.MeshBasicMaterial({ transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false }));
      m.visible=false; this.scene.add(m); this.beams.push({m,life:0,max:1});
    }
    this.bolts=[];
    for(let i=0;i<28;i++){
      const geo2=new THREE.BufferGeometry(); geo2.setAttribute('position',new THREE.BufferAttribute(new Float32Array(8*3),3));
      const l=new THREE.Line(geo2,new THREE.LineBasicMaterial({ transparent:true, opacity:0, blending:THREE.AdditiveBlending }));
      l.visible=false; l.frustumCulled=false; this.scene.add(l); this.bolts.push({l,life:0,max:1});
    }
    this.rings=[];
    for(let i=0;i<30;i++){
      const m=new THREE.Mesh(new THREE.RingGeometry(0.8,1,32),
        new THREE.MeshBasicMaterial({ transparent:true, opacity:0, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false }));
      m.rotation.x=-Math.PI/2; m.visible=false; this.scene.add(m); this.rings.push({m,life:0,max:1,grow:1});
    }
    this.texts=[];
    for(let i=0;i<48;i++){
      const cv=document.createElement('canvas'); cv.width=128; cv.height=48;
      const tex=new THREE.CanvasTexture(cv);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, opacity:0, depthWrite:false }));
      sp.scale.set(2.6,1,1); sp.visible=false; this.scene.add(sp);
      this.texts.push({sp,cv,tex,life:0,max:1,vel:0});
    }
    this.showDmgNums=true;
    this.tweens=[];
    // debris chunks
    this.debrisPool=[];
    for(let i=0;i<36;i++){
      const m=new THREE.Mesh(this._boxGeo,new THREE.MeshStandardMaterial({color:0x777777,roughness:0.9}));
      m.visible=false; m.castShadow=true; this.scene.add(m);
      this.debrisPool.push({m,life:0,max:1,vel:new THREE.Vector3(),rv:new THREE.Vector3()});
    }
    // muzzle flash sprites (bright 4-point star)
    const fcv=document.createElement('canvas'); fcv.width=fcv.height=64;
    const fg=fcv.getContext('2d');
    const grad=fg.createRadialGradient(32,32,2,32,32,30);
    grad.addColorStop(0,'rgba(255,255,255,1)'); grad.addColorStop(0.35,'rgba(255,230,160,0.9)'); grad.addColorStop(1,'rgba(255,180,80,0)');
    fg.fillStyle=grad; fg.beginPath(); fg.arc(32,32,30,0,7); fg.fill();
    fg.strokeStyle='rgba(255,255,230,0.95)'; fg.lineWidth=3;
    fg.beginPath(); fg.moveTo(32,2); fg.lineTo(32,62); fg.moveTo(2,32); fg.lineTo(62,32); fg.stroke();
    const ftex=new THREE.CanvasTexture(fcv);
    this.flashes=[];
    for(let i=0;i<14;i++){
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({ map:ftex, transparent:true, opacity:0,
        blending:THREE.AdditiveBlending, depthWrite:false }));
      sp.visible=false; this.scene.add(sp);
      this.flashes.push({sp,life:0,max:1});
    }
    // missile meshes (body + nose + fins) — they launch out of the racks
    this.missilePool=[];
  }
  getMissileMesh(){
    let g=this.missilePool.pop();
    if (!g){
      g=new THREE.Group();
      const body=this.cyl(0.06,0.06,0.55,0xd8dee6,{},8); body.rotation.x=Math.PI/2; g.add(body);
      const nose=this.cone(0.07,0.18,0xb03a2e,{},8); nose.rotation.x=Math.PI/2; nose.position.z=0.35; g.add(nose);
      for(let i=0;i<3;i++){ const fin=this.box(0.02,0.12,0.1,0x8b949e);
        fin.position.set(Math.cos(i*2.09)*0.06,Math.sin(i*2.09)*0.06,-0.22);
        fin.rotation.z=i*2.09; g.add(fin); }
      const jet=this.sph(0.06,0xffb36b,{e:2}); jet.position.z=-0.32; g.add(jet); g.userData.jet=jet;
    }
    g.visible=true; this.scene.add(g);
    return g;
  }
  freeMissileMesh(g){ g.visible=false; this.scene.remove(g); this.missilePool.push(g); }
  tween(dur,fn){ this.tweens.push({t:0,dur,fn}); }
  dropIn(model){
    const y=model.position.y, s=model.scale.x;
    model.position.y=y+5; model.scale.setScalar(s*0.6);
    this.tween(0.32,k=>{ const e=1-Math.pow(1-k,3);
      model.position.y=y+5*(1-e); model.scale.setScalar(s*(0.6+0.4*e)); });
    this.ring(new THREE.Vector3(model.position.x,0,model.position.z),1.6,0xffffff,0.35);
  }
  shake(model){
    const px=model.position.x, pz=model.position.z;
    this.tween(0.16,k=>{ const a=(1-k)*0.1;
      model.position.x=px+(Math.random()-0.5)*a; model.position.z=pz+(Math.random()-0.5)*a;
      if (k>=1){ model.position.x=px; model.position.z=pz; } });
  }
  casings(pos){ this.burst(pos,0xd9b44a,2,3,0.45,11); }
  shakeCam(a){ this.shakeA=Math.min(1.2,(this.shakeA||0)+a); }
  debris(pos,color,n=5){
    for(let i=0;i<n;i++){
      const d=this.debrisPool.find(x=>x.life<=0); if(!d) return;
      d.life=d.max=0.8+Math.random()*0.5;
      d.m.visible=true; d.m.material.color.set(color);
      d.m.position.copy(pos);
      const s=0.12+Math.random()*0.22; d.m.scale.set(s,s,s);
      d.vel=new THREE.Vector3((Math.random()-0.5)*7,3+Math.random()*4.5,(Math.random()-0.5)*7);
      d.rv=new THREE.Vector3(Math.random()*9,Math.random()*9,Math.random()*9);
    }
  }
  burst(pos,color,count=10,speed=4,life=0.5,grav=6){
    const col=new THREE.Color(color);
    for(let i=0;i<count;i++){
      const k=this.pHead=(this.pHead+1)%this.PN, k3=k*3;
      this.pPos[k3]=pos.x; this.pPos[k3+1]=pos.y; this.pPos[k3+2]=pos.z;
      const th=Math.random()*Math.PI*2, ph=Math.random()*Math.PI, sp=speed*(0.4+Math.random()*0.6);
      this.pVel[k3]=Math.sin(ph)*Math.cos(th)*sp; this.pVel[k3+1]=Math.abs(Math.cos(ph))*sp; this.pVel[k3+2]=Math.sin(ph)*Math.sin(th)*sp;
      this.pCol[k3]=col.r; this.pCol[k3+1]=col.g; this.pCol[k3+2]=col.b;
      this.pLife[k]=this.pMax[k]=life*(0.6+Math.random()*0.6); this.pGrav[k]=grav;
    }
  }
  beam(a,b,color,thick=0.08,life=0.09){
    const slot=this.beams.find(x=>x.life<=0); if(!slot) return;
    const m=slot.m, dir=new THREE.Vector3().subVectors(b,a), len=Math.max(0.01,dir.length());
    m.position.copy(a).addScaledVector(dir,0.5);
    m.scale.set(thick,thick,len);
    m.lookAt(b); m.material.color=new THREE.Color(color); m.material.opacity=0.9;
    m.visible=true; slot.life=slot.max=life;
  }
  lightning(a,b,color,life=0.12){
    const slot=this.bolts.find(x=>x.life<=0); if(!slot) return;
    const pos=slot.l.geometry.attributes.position, n=8;
    for(let i=0;i<n;i++){
      const t=i/(n-1), p=new THREE.Vector3().lerpVectors(a,b,t);
      if(i>0&&i<n-1){ p.x+=(Math.random()-0.5)*0.7; p.y+=(Math.random()-0.5)*0.5; p.z+=(Math.random()-0.5)*0.7; }
      pos.setXYZ(i,p.x,p.y,p.z);
    }
    pos.needsUpdate=true;
    slot.l.material.color=new THREE.Color(color); slot.l.material.opacity=0.95;
    slot.l.visible=true; slot.life=slot.max=life;
  }
  ring(pos,radius,color,life=0.4){
    const slot=this.rings.find(x=>x.life<=0); if(!slot) return;
    slot.m.position.set(pos.x,0.12,pos.z);
    slot.m.scale.setScalar(0.3); slot.grow=radius;
    slot.m.material.color=new THREE.Color(color); slot.m.material.opacity=0.75;
    slot.m.visible=true; slot.life=slot.max=life;
  }
  text(pos,str,color='#fff',big=false){
    if(!this.showDmgNums) return;
    const slot=this.texts.find(x=>x.life<=0); if(!slot) return;
    const g=slot.cv.getContext('2d'); g.clearRect(0,0,128,48);
    g.font=`800 ${big?30:24}px -apple-system,Arial`; g.textAlign='center'; g.textBaseline='middle';
    g.strokeStyle='rgba(0,0,0,.8)'; g.lineWidth=5; g.strokeText(str,64,24);
    g.fillStyle=color; g.fillText(str,64,24);
    slot.tex.needsUpdate=true;
    slot.sp.position.copy(pos); slot.sp.position.y+=1.8;
    slot.sp.material.opacity=1; slot.sp.visible=true;
    slot.life=slot.max=0.8; slot.vel=2.2;
  }
  explosion(pos,radius,color=0xffa94d){
    this.burst(pos,color,26,7,0.55,7);
    this.burst(pos,0xffe8c2,10,3.5,0.35,4);
    this.ring(pos,radius,color,0.35);
  }
  muzzleFlash(pos,color=0xffe8a0,scale=1){
    this.burst(pos,color,4,2.5,0.12,0);
    const slot=this.flashes.find(f=>f.life<=0); if(!slot) return;
    slot.sp.position.copy(pos);
    slot.sp.material.color.set(color);
    slot.sp.material.rotation=Math.random()*Math.PI;
    slot.sp.scale.setScalar(1.1*scale*(0.85+Math.random()*0.3));
    slot.sp.material.opacity=1; slot.sp.visible=true;
    slot.life=slot.max=0.07;
  }
  updateFX(dt){
    for(let k=0;k<this.PN;k++){
      if(this.pLife[k]<=0) continue;
      this.pLife[k]-=dt; const k3=k*3;
      this.pVel[k3+1]-=this.pGrav[k]*dt;
      this.pPos[k3]+=this.pVel[k3]*dt; this.pPos[k3+1]+=this.pVel[k3+1]*dt; this.pPos[k3+2]+=this.pVel[k3+2]*dt;
      if(this.pPos[k3+1]<0.05){ this.pPos[k3+1]=0.05; this.pVel[k3+1]*=-0.3; }
      const f=Math.max(0,this.pLife[k]/this.pMax[k]);
      this.pCol[k3]*=0.92+f*0.08; this.pCol[k3+1]*=0.92+f*0.08; this.pCol[k3+2]*=0.92+f*0.08;
      if(this.pLife[k]<=0) this.pPos[k3+1]=-999;
    }
    this.points.geometry.attributes.position.needsUpdate=true;
    this.points.geometry.attributes.color.needsUpdate=true;
    for(const b of this.beams){ if(b.life>0){ b.life-=dt; b.m.material.opacity=0.9*(b.life/b.max); if(b.life<=0) b.m.visible=false; } }
    for(const b of this.bolts){ if(b.life>0){ b.life-=dt; b.l.material.opacity=0.95*(b.life/b.max); if(b.life<=0) b.l.visible=false; } }
    for(const r of this.rings){ if(r.life>0){ r.life-=dt; const t=1-r.life/r.max;
      r.m.scale.setScalar(0.3+r.grow*t); r.m.material.opacity=0.75*(1-t); if(r.life<=0) r.m.visible=false; } }
    for(const t of this.texts){ if(t.life>0){ t.life-=dt; t.sp.position.y+=t.vel*dt; t.vel*=0.94;
      t.sp.material.opacity=Math.min(1,t.life/t.max*2); if(t.life<=0) t.sp.visible=false; } }
    for(const f of this.flashes){ if(f.life>0){ f.life-=dt;
      f.sp.material.opacity=f.life/f.max; f.sp.scale.multiplyScalar(1+dt*6);
      if(f.life<=0) f.sp.visible=false; } }
    for(const d of this.debrisPool){ if(d.life>0){ d.life-=dt;
      d.vel.y-=14*dt;
      d.m.position.addScaledVector(d.vel,dt);
      if (d.m.position.y<0.12){ d.m.position.y=0.12; d.vel.y*=-0.35; d.vel.x*=0.7; d.vel.z*=0.7; }
      d.m.rotation.x+=d.rv.x*dt; d.m.rotation.y+=d.rv.y*dt; d.m.rotation.z+=d.rv.z*dt;
      const f=d.life/d.max; if(f<0.3) d.m.scale.multiplyScalar(0.94);
      if (d.life<=0) d.m.visible=false; } }
  }

  /* ============ mini 3D turret portraits (equipping / placing) ============ */
  renderPortrait(id){
    if (!this._portCtx){
      try{
        const cv=document.createElement('canvas'); cv.width=96; cv.height=96;
        const gl=cv.getContext('webgl',{antialias:true,alpha:true,preserveDrawingBuffer:true});
        if (!gl) return null;
        const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
        r.setPixelRatio(1); r.setClearColor(0x000000,0);
        const cam=new THREE.OrthographicCamera(-2,2,2,-2,0.1,20);
        cam.position.set(2.6,2.6,3.2);
        const sc=new THREE.Scene();
        sc.add(new THREE.HemisphereLight(0xffffff,0x8899aa,0.9));
        const s1=new THREE.DirectionalLight(0xffffff,0.9); s1.position.set(3,5,4); sc.add(s1);
        const s2=new THREE.DirectionalLight(0xfff2cc,0.35); s2.position.set(-3,2,-4); sc.add(s2);
        this._portCtx={cv,r,cam,sc};
      }catch(e){ this._portCtx=null; return null; }
    }
    if (this.portraits&&this.portraits[id]) return this.portraits[id];
    try{
      const model=this.makeTower(id);
      model.rotation.y=0.6;
      model.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); o.material.transparent=false; o.material.opacity=1; } });
      const sc=this._portCtx.sc; sc.add(model);
      const bb=new THREE.Box3().setFromObject(model);
      const size=bb.getSize(new THREE.Vector3());
      const c=bb.getCenter(new THREE.Vector3());
      const m=Math.max(size.x,size.y,size.z,0.001);
      const k=3.2/m;
      const cam=this._portCtx.cam;
      cam.left=-k; cam.right=k; cam.top=k; cam.bottom=-k;
      cam.updateProjectionMatrix();
      cam.lookAt(c.x,c.y,c.z);
      this._portCtx.r.render(sc,cam);
      const url=this._portCtx.cv.toDataURL('image/png');
      sc.remove(model);
      if (!this.portraits) this.portraits={};
      this.portraits[id]=url;
      return url;
    }catch(e){ return null; }
  }

  /* ============ ghosts & indicators ============ */
  makeGhost(kind,id){
    const g = kind==='tower'? this.makeTower(id) : (kind==='base'? this.makeBase() : this.makeBlock(id));
    g.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); o.material.transparent=true; o.material.opacity=0.55; o.castShadow=false; } });
    const C=TD.CONFIG.CELL;
    const def = kind==='tower'? TD.TOWERS[id] : (kind==='block'? TD.BLOCKS[id] : null);
    const len = def&&def.len? def.len : (kind==='base'? 2 : 1);
    const wid = kind==='base'? 2 : 1;
    const inv=1/g.scale.x; // ghost pad/ring must ignore the model's cosmetic scale
    const pad=new THREE.Mesh(new THREE.PlaneGeometry(C*wid*0.98,C*len*0.98),
      new THREE.MeshBasicMaterial({ color:0x4ade80, transparent:true, opacity:0.35, side:THREE.DoubleSide, depthWrite:false }));
    pad.rotation.x=-Math.PI/2; pad.position.y=0.04; pad.scale.setScalar(inv); g.add(pad); g.userData.pad=pad;
    if (kind==='tower'&&TD.TOWERS[id].range>0){
      const rr=this.makeRangeRing(TD.TOWERS[id].range*C, 0x7dd3fc);
      this.scene.remove(rr); rr.scale.setScalar(inv); g.add(rr); g.userData.rring=rr;
    }
    this.scene.add(g);
    return g;
  }
  setGhostValid(g,ok){ if(g.userData.pad) g.userData.pad.material.color.set(ok?0x4ade80:0xf87171); }
  makeRangeRing(radius,color=0x7dd3fc){
    const seg=56, pts=[];
    for(let i=0;i<=seg;i++){ const a=i/seg*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(a)*radius,0.1,Math.sin(a)*radius)); }
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.7 }));
    const fill=new THREE.Mesh(new THREE.CircleGeometry(radius,seg),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.07, side:THREE.DoubleSide, depthWrite:false }));
    fill.rotation.x=-Math.PI/2; fill.position.y=0.05;
    line.add(fill);
    this.scene.add(line);
    return line;
  }

  /* ============ frame ============ */
  _softTex(){
    const cv=document.createElement('canvas'); cv.width=cv.height=64;
    const g=cv.getContext('2d');
    const gr=g.createRadialGradient(32,32,4,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,0.9)');
    gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr; g.fillRect(0,0,64,64);
    const t=new THREE.CanvasTexture(cv);
    t.encoding=THREE.sRGBEncoding;
    return t;
  }
  _discTex(){
    const cv=document.createElement('canvas'); cv.width=cv.height=128;
    const g=cv.getContext('2d');
    g.clearRect(0,0,128,128);
    const gr=g.createRadialGradient(64,64,4,64,64,64);
    gr.addColorStop(0,'rgba(235,240,246,0.55)');
    gr.addColorStop(0.7,'rgba(235,240,246,0.2)');
    gr.addColorStop(1,'rgba(235,240,246,0)');
    g.fillStyle=gr; g.fillRect(0,0,128,128);
    g.strokeStyle='rgba(235,240,246,0.9)'; g.lineWidth=2.5;
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2;
      g.beginPath(); g.moveTo(64,64); g.lineTo(64+Math.cos(a)*58,64+Math.sin(a)*58); g.stroke();
    }
    g.strokeStyle='rgba(235,240,246,0.5)'; g.lineWidth=1.5;
    g.beginPath(); g.arc(64,64,40,0,7); g.stroke();
    const t=new THREE.CanvasTexture(cv);
    t.encoding=THREE.sRGBEncoding;
    return t;
  }
  makeSky(){
    const tex=this._softTex();
    for(let i=0;i<7;i++){
      const c=new THREE.Mesh(new THREE.PlaneGeometry(30+Math.random()*34,15+Math.random()*16),
        new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0.15+Math.random()*0.1,depthWrite:false}));
      const a=Math.random()*Math.PI*2, r=58+Math.random()*55;
      c.position.set(Math.cos(a)*r,26+Math.random()*16,Math.sin(a)*r);
      c.userData.spd=(0.4+Math.random()*0.8)*(Math.random()<0.5?1:-1);
      this._clouds.push(c); this._skyGroup.add(c);
    }
    this._sun=new THREE.Mesh(new THREE.PlaneGeometry(70,70),
      new THREE.MeshBasicMaterial({map:this._softTex(),transparent:true,opacity:0.85,depthWrite:false,blending:THREE.AdditiveBlending}));
    this._sun.position.set(-80,95,-60);
    this._skyGroup.add(this._sun);
    this.animated.add(this._sun);
    this._sun.userData.anim=(dt,t)=>{ this._sun.material.opacity=0.7+Math.sin(t*0.7)*0.18; };
  }
  makeWeather(map){
    if (this.weather){ this.scene.remove(this.weather); this.weather=null; }
    const w=map.weather||'none';
    if (w==='none') return;
    const N=w==='leaf'?70:95;
    const pos=new Float32Array(N*3), cols=new Float32Array(N*3);
    const vel=[], size=this.worldSize/2+12;
    const col=w==='leaf'? new THREE.Color(0x8fdcb0) : w==='ash'? new THREE.Color(0xa8957e) : w==='dust'? new THREE.Color(0xd8c9a0) : new THREE.Color(0xbfe4f2);
    for(let i=0;i<N;i++){
      pos[i*3]=(Math.random()*2-1)*size; pos[i*3+1]=Math.random()*32; pos[i*3+2]=(Math.random()*2-1)*size;
      cols[i*3]=col.r*(0.7+Math.random()*0.3); cols[i*3+1]=col.g*(0.7+Math.random()*0.3); cols[i*3+2]=col.b*(0.7+Math.random()*0.3);
      vel.push({ x:(Math.random()-0.5)*0.7, y:(w==='rain'?-3.2-Math.random()*1.6:-0.7-Math.random()*0.9), z:(Math.random()-0.5)*0.7 });
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols,3));
    const pts=new THREE.Points(geo, new THREE.PointsMaterial({size:w==='leaf'?0.42:0.24,vertexColors:true,transparent:true,opacity:w==='leaf'?0.55:0.45,depthWrite:false,sizeAttenuation:true}));
    pts.userData.vel=vel; pts.userData.size=size; pts.userData.top=32;
    this.weather=pts; this.scene.add(pts);
  }
  baseAura(pos){
    if (this._baseAura){ this.scene.remove(this._baseAura); this._baseAura=null; }
    const g=new THREE.Group(); g.position.copy(pos); this.scene.add(g); this._baseAura=g;
    const ring=new THREE.Mesh(new THREE.RingGeometry(1.5,1.8,40), new THREE.MeshBasicMaterial({color:0x4ade80,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2; ring.position.y=0.07; g.add(ring);
    ring.userData.anim=(dt,t)=>{ ring.material.opacity=0.3+Math.sin(t*2.6)*0.22; };
    this.animated.add(ring);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.9,5,14,1,true),
      new THREE.MeshBasicMaterial({color:0x4ade80,transparent:true,opacity:0.14,depthWrite:false,side:THREE.DoubleSide}));
    beam.position.y=2.5; g.add(beam);
    beam.userData.anim=(dt,t)=>{ beam.material.opacity=0.1+Math.sin(t*2)*0.05; };
    this.animated.add(beam);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(0.3,14,10), new THREE.MeshBasicMaterial({color:0x8ff0b8,transparent:true,opacity:0.85}));
    g.add(orb);
    orb.userData.anim=(dt,t)=>{ orb.position.y=2.3+Math.sin(t*1.7)*0.55; };
    this.animated.add(orb);
  }
  goldCrateGlow(model){
    const ring=new THREE.Mesh(new THREE.RingGeometry(0.9,1.15,24), new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:0.8,depthWrite:false}));
    ring.rotation.x=-Math.PI/2; ring.position.y=0.12; model.add(ring);
    ring.userData.anim=(dt,t)=>{ ring.scale.setScalar(1+Math.sin(t*5)*0.12); ring.material.opacity=0.5+Math.sin(t*5)*0.3; };
    this.animated.add(ring);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(0.28,10,8), new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:0.9}));
    orb.position.y=0.55; model.add(orb);
    orb.userData.anim=(dt,t)=>{ orb.position.y=0.55+Math.sin(t*4)*0.15; };
    this.animated.add(orb);
  }
  sqBurst(pos,color,count=6,spd=3,size=0.16,life=0.5){
    for(let i=0;i<count;i++){
      const m=new THREE.Mesh(this._boxGeo, this.mat(color,{e:1.1}));
      m.material.transparent=true;
      const dir=new THREE.Vector3((Math.random()-0.5)*2,0.3+Math.random()*1.1,(Math.random()-0.5)*2).normalize();
      m.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*0.25,Math.random()*0.2,(Math.random()-0.5)*0.25));
      m.scale.setScalar(size*(0.6+Math.random()*0.8));
      m.userData.vel=dir.multiplyScalar(spd*(0.5+Math.random()));
      m.userData.life=life*(0.7+Math.random()*0.6);
      m.userData.max=life;
      this.scene.add(m);
      const self=this;
      m.userData.anim=(dt,t)=>{
        m.userData.life-=dt;
        if (m.userData.life<=0){ self.scene.remove(m); self.animated.delete(m); return; }
        m.position.addScaledVector(m.userData.vel,dt);
        m.userData.vel.y-=dt*6;
        m.rotation.x+=dt*5; m.rotation.y+=dt*6; m.rotation.z+=dt*4;
        m.material.opacity=Math.max(0,Math.min(1,m.userData.life/m.userData.max*1.6));
      };
      this.animated.add(m);
    }
  }
  update(dt){
    this.time+=dt;
    this.smoothCamera(dt);
    if (this.shakeA>0){
      this.shakeA=Math.max(0,this.shakeA-dt*2.4);
      this.updateCamera();
      const s=this.shakeA*0.4;
      this.camera.position.x+=(Math.random()-0.5)*s;
      this.camera.position.y+=(Math.random()-0.5)*s*0.5;
      this.camera.position.z+=(Math.random()-0.5)*s;
    }
    for (const o of this.animated){ if(o.userData.anim) o.userData.anim(dt,this.time); }
    // ambient weather particles
    if (this.weather){
      const w=this.weather, pos=w.geometry.attributes.position, vel=w.userData.vel, size=w.userData.size, top=w.userData.top;
      const arr=pos.array;
      for(let i=0;i<vel.length;i++){
        arr[i*3]+=vel[i].x*dt; arr[i*3+1]+=vel[i].y*dt; arr[i*3+2]+=vel[i].z*dt;
        if (arr[i*3+1]<0) arr[i*3+1]=top;
        if (arr[i*3]>size) arr[i*3]=-size; else if (arr[i*3]<-size) arr[i*3]=size;
        if (arr[i*3+2]>size) arr[i*3+2]=-size; else if (arr[i*3+2]<-size) arr[i*3+2]=size;
      }
      pos.needsUpdate=true;
    }
    for (const c of this._clouds){
      c.position.x+=c.userData.spd*dt;
      if (Math.abs(c.position.x)>this.worldSize*1.5) c.position.x=-c.position.x;
    }
    for (let i=this.tweens.length-1;i>=0;i--){
      const tw=this.tweens[i]; tw.t+=dt;
      const k=Math.min(1,tw.t/tw.dur); tw.fn(k);
      if (k>=1) this.tweens.splice(i,1);
    }
    this.updateFX(dt);
  }
  render(){ this.renderer.render(this.scene,this.camera); }
  resize(){ this.renderer.setSize(innerWidth,innerHeight,false); this.updateCamera(); }
};
