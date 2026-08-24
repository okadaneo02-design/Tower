/* ============ TOWER DEFENDERS v2 — game data ============
   Enemies are hostile VEHICLES converging on your base from every direction.
   Turrets are stationary hardware. Upgrade paths (BTD-style):
     Path 0 (TOP)    = RATE    — attack speed
     Path 1 (MIDDLE) = SYSTEMS — detection (stealth), reaction, range
     Path 2 (BOTTOM) = POWER   — damage
   Rules: max 2 paths invested; the 3rd locks; only ONE path may pass tier 1. */
window.TD = window.TD || {};

TD.CONFIG = {
  GRID: 30, CELL: 2, BASE_SIZE: 2,
  SELL_REFUND: 0.7,
  CAMPAIGN_WAVES: 30,
  SLOT_POINTS: 9, BLOCK_SLOTS: 3,
  BLOCK_LIMIT: 15,            // max block pieces on the field at once
  MAX_ENEMIES: 170,
  MAX_STACK: 2,               // blocks may stack 2 high
  ELEV_RANGE_BONUS: 0.5,      // +range (cells) per block of elevation
  SAVE_KEY: 'towerDefenders.save.v2',
};

TD.DIFFICULTY = {
  easy:   { label:'EASY',   hpMul:0.80, spdMul:1.00, goldMul:1.25, baseHp:1500, startGold:520 },
  normal: { label:'NORMAL', hpMul:1.00, spdMul:1.00, goldMul:1.00, baseHp:1000, startGold:450 },
  hard:   { label:'HARD',   hpMul:1.35, spdMul:1.08, goldMul:0.85, baseHp:650,  startGold:400 },
};

/* ---------------- MAPS (5) — open fields, attacked from a full circle ----------------
   rocks are generated from a seed; maps differ in terrain, density and mood. */
TD.MAPS = [
  { id:0, name:'Green Basin',  desc:'Soft ground, light cover. Learn the trade.',
    pal:{ ground:0x7f9164, ground2:0x71835a, rock:0x707a86, sky:0x10141b }, seed:11, rockN:10, mtnN:1 },
  { id:1, name:'Dust Flats',   desc:'Wide open. They come fast here.',
    pal:{ ground:0x9a8f6a, ground2:0x8c815f, rock:0x7a6f5c, sky:0x13110d }, seed:47, rockN:7, mtnN:0 },
  { id:2, name:'Salt Marsh',   desc:'Rock clusters make natural choke points.',
    pal:{ ground:0x74897d, ground2:0x687d71, rock:0x5f6a75, sky:0x0e1214 }, seed:83, rockN:16, mtnN:2 },
  { id:3, name:'Rust Valley',  desc:'A mountain valley. Tight corridors.',
    pal:{ ground:0x8b7a68, ground2:0x7d6e5d, rock:0x62574e, sky:0x120f0c }, seed:129, rockN:12, mtnN:4 },
  { id:4, name:'Ashfall',      desc:'Burned peaks. Everything comes at once.',
    pal:{ ground:0x8f7168, ground2:0x81655d, rock:0x59504c, sky:0x140d0d }, seed:200, rockN:9, mtnN:3 },
];
// deterministic terrain per map: scattered rocks + mountain clusters
TD.mapTerrain = function(map){
  let s=map.seed>>>0;
  const rnd=()=>{ s=(s+0x6D2B79F5)>>>0; let t=Math.imul(s^(s>>>15),1|s);
    t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  const G=TD.CONFIG.GRID, rocks=[], mtns=[], used=new Set();
  const take=(c,r)=>{ const k=r*G+c; if(c<3||r<3||c>G-4||r>G-4||used.has(k)) return false; used.add(k); return true; };
  // mesas: flat-topped massifs hugging the map SIDES, leaving the middle open
  for (let m=0;m<(map.mtnN||0);m++){
    const side=Math.floor(rnd()*4);
    const depth=3+Math.floor(rnd()*4);           // 3-6 cells in from the edge
    const along=6+Math.floor(rnd()*(G-12));
    let c,r;
    if (side===0){ c=along; r=depth; }
    else if (side===1){ c=along; r=G-1-depth; }
    else if (side===2){ c=depth; r=along; }
    else { c=G-1-depth; r=along; }
    const cluster=[];
    if (take(c,r)) cluster.push([c,r]);
    const n=4+Math.floor(rnd()*4);               // chunky 4-8 cell mesas
    for(let i=0;i<n;i++){
      const cc=c+Math.floor(rnd()*3)-1, rr=r+Math.floor(rnd()*3)-1;
      if (take(cc,rr)) cluster.push([cc,rr]);
    }
    if (cluster.length) mtns.push(cluster);
  }
  let tries=0;
  while (rocks.length<map.rockN && tries++<400){
    const c=3+Math.floor(rnd()*(G-6)), r=3+Math.floor(rnd()*(G-6));
    if (!take(c,r)) continue;
    rocks.push([c,r]);
    if (rnd()<0.35){
      const c2=c+(rnd()<0.5?1:-1), r2=r+(rnd()<0.5?1:0);
      if (take(c2,r2)) rocks.push([c2,r2]);
    }
  }
  return { rocks, mtns };
};
TD.mapRocks = function(map){ // all blocked terrain cells
  const t=TD.mapTerrain(map);
  return t.rocks.concat(t.mtns.flat());
};

/* ---------------- BLOCKS (5, pick 3) ---------------- */
TD.BLOCKS = {
  block: { id:'block', name:'Block',       cost:15,  blocks:true,  stack:true, color:0xaab4bf, icon:'▦', hp:160,
           desc:'Blocks vehicles (160 HP — they WILL try to smash it). Stack 2 high; turrets on top gain range.' },
  wire:  { id:'wire',  name:'Barbed Wire', cost:40,  blocks:false, color:0xb08968, icon:'𝍢', len:2, hp:90,
           dps:6, root:1.8, breakMul:5,
           desc:'2 cells long (R to rotate). Roots vehicles 1.8s, then shreds. Chewing on it hurts 5x more.' },
  tar:   { id:'tar',   name:'Quicksand',   cost:20,  blocks:false, color:0xcbb26a, icon:'◍',
           slow:0.6, desc:'Vehicles sink in and crawl through at 40% speed.' },
  spike: { id:'spike', name:'Spike Strip', cost:35,  blocks:false, color:0x8d99ae, icon:'▲',
           hit:34, uses:15, desc:'Heavy damage per crossing. Breaks after 15 hits.' },
  trap:  { id:'trap',  name:'Trapdoor',    cost:130, blocks:false, color:0x6b7d8f, icon:'◫',
           capacity:21, cooldown:10,
           desc:'Swings open and swallows whatever is on it. Fits 7 small vehicles, 3 mid (300+ HP), 1 heavy (600+ HP). 10s cooldown.' },
};

/* ---------------- ENEMY VEHICLES ---------------- */
TD.ENEMIES = {
  junker:   { name:'Junker',     hp:32,  spd:1.00, gold:5,  size:1.0,  color:0x9b5f45, unlock:1,  breakDmg:10 },
  buggy:    { name:'Dune Buggy', hp:18,  spd:2.20, gold:5,  size:0.9,  color:0xc9a55a, unlock:3,  breakDmg:6 },
  moto:     { name:'Moto',       hp:9,   spd:1.90, gold:2,  size:0.6,  color:0xb8bd6a, unlock:5,  pack:true, breakDmg:4 },
  rammer:   { name:'Rammer',     hp:40,  spd:1.60, gold:8,  size:1.05, color:0xd0543a, unlock:6,  ram:true, heavy:true, breakDmg:0 },
  apc:      { name:'APC',        hp:72,  spd:0.85, gold:11, size:1.15, color:0x7d93a8, unlock:7,  armor:6, breakDmg:22, heavy:true },
  chopper:  { name:'Chopper',    hp:45,  spd:1.50, gold:9,  size:0.95, color:0x9a7fae, unlock:9,  fly:true },
  hauler:   { name:'Hauler',     hp:100, spd:0.80, gold:12, size:1.3,  color:0xa8874f, unlock:12, splits:'moto', splitN:3, breakDmg:26, heavy:true },
  shieldvan:{ name:'Shield Van', hp:85,  spd:0.95, gold:14, size:1.1,  color:0x7fa7d8, unlock:13, shieldAura:4, shieldRad:2.5, breakDmg:10 },
  mechvan:  { name:'Mech-Van',   hp:60,  spd:1.00, gold:13, size:1.05, color:0xd8d3c8, unlock:14, heal:16, healRad:2.5, healCd:2.2, breakDmg:8 },
  prowler:  { name:'Prowler',    hp:52,  spd:1.45, gold:13, size:0.95, color:0x3d4450, unlock:16, stealth:true, breakDmg:12 },
  digger:   { name:'Digger',     hp:75,  spd:1.05, gold:15, size:1.05, color:0x8a7f52, unlock:17, burrow:true, breakDmg:16 },
  tank:     { name:'Tank',       hp:270, spd:0.60, gold:20, size:1.5,  color:0x6d7d55, unlock:18, armor:4, breakDmg:50, heavy:true },
  gunship:  { name:'Gunship',    hp:160, spd:1.10, gold:22, size:1.25, color:0x6e5a80, unlock:19, fly:true, armor:4 },
  racer:    { name:'Racer',      hp:60,  spd:3.00, gold:16, size:0.9,  color:0xe05a78, unlock:21, breakDmg:8 },
  boss:     { name:'JUGGERNAUT', hp:2300,spd:0.42, gold:170,size:2.6,  color:0x54423a, unlock:10, armor:8, boss:true, heavy:true,
              roarCd:6, roarSpawn:'buggy', roarN:3, breakDmg:120 },
};
TD.scaleHp = w => 1 + (w-1)*0.20 + Math.pow(Math.max(0,w-9),1.28)*0.045;
TD.waveBudget = w => Math.floor(18 + w*9 + Math.pow(w,1.62));
TD.waveBonus = w => 32 + w*7;
TD.researchForWave = w => 1 + Math.floor(w/5);

/* ---------------- TURRETS (15) ----------------
   slotCost: heavy weapons eat 2 loadout points of your 9. */
TD.TOWERS = {
mg: { id:'mg', name:'MG Turret', role:'Rapid gunfire', cost:110, slotCost:1, color:0x9dd6f2, icon:'⋙',
  desc:'Reliable autofire. Hits ground and air.', targets:'b', arche:'gun', range:3.5, rof:3, dmg:5, sfx:'rifle',
  paths:[
   {name:'Feed System', tiers:[
    {name:'Rapid Feed',  cost:50,  desc:'+25% fire rate', mod:{rofMul:1.25}},
    {name:'Twin Link',   cost:150, desc:'+50% fire rate', mod:{rofMul:1.5}},
    {name:'Vulcan Core', cost:430, desc:'+100% fire rate, +1 dmg', mod:{rofMul:2, dmgAdd:1}}]},
   {name:'Fire Control', tiers:[
    {name:'IR Optics',     cost:60,  desc:'Detects stealth vehicles', mod:{detect:true}},
    {name:'Extended Rails',cost:110, desc:'+1 range, faster tracking', mod:{rangeAdd:1, aimMul:1.6}},
    {name:'Fire Director', cost:300, desc:'+1 range, +15% dmg, instant tracking', mod:{rangeAdd:1, dmgMul:1.15, aimMul:4}}]},
   {name:'Ammunition', tiers:[
    {name:'Hard Rounds', cost:70,  desc:'+3 dmg', mod:{dmgAdd:3}},
    {name:'AP Belt',     cost:180, desc:'+5 dmg, ignores armor', mod:{dmgAdd:5, armorPierce:true}},
    {name:'.50 BMG',     cost:450, desc:'+14 dmg', mod:{dmgAdd:14}}]}]},

scatter: { id:'scatter', name:'Scattergun', role:'Cone blast', cost:140, slotCost:1, color:0xf2b880, icon:'⋔',
  desc:'Devastating up close. Ground only.', targets:'g', arche:'shotgun', range:2.6, rof:0.9, dmg:5, pellets:6, cone:0.55, sfx:'shotgun',
  paths:[
   {name:'Action', tiers:[
    {name:'Fast Cycle',  cost:55,  desc:'+30% fire rate', mod:{rofMul:1.3}},
    {name:'Autoloader',  cost:160, desc:'+40% fire rate', mod:{rofMul:1.4}},
    {name:'Storm Breech',cost:420, desc:'+80% rate, +1 pellet', mod:{rofMul:1.8, pelletsAdd:1}}]},
   {name:'Sensors', tiers:[
    {name:'Wide Scanner',cost:50,  desc:'Detects stealth vehicles', mod:{detect:true}},
    {name:'Choke Bore',  cost:120, desc:'+0.6 range, +15% dmg', mod:{rangeAdd:0.6, dmgMul:1.15}},
    {name:'Incendiary',  cost:320, desc:'Pellets ignite: burn 6/s', mod:{burnDps:6, burnDur:2}}]},
   {name:'Payload', tiers:[
    {name:'Heavy Shot', cost:70,  desc:'+2 pellets', mod:{pelletsAdd:2}},
    {name:'Slug Load',  cost:190, desc:'+4 dmg per pellet', mod:{dmgAdd:4}},
    {name:'Overkill',   cost:480, desc:'+6 dmg, +2 pellets', mod:{dmgAdd:6, pelletsAdd:2}}]}]},

mortar: { id:'mortar', name:'Mortar Post', role:'Long-range splash', cost:240, slotCost:2, color:0xe08f7a, icon:'◎',
  desc:'Arcing shells. Blind up close. Takes 2 loadout slots.', targets:'g', arche:'mortar', range:8, minRange:2.5, rof:0.4, dmg:22, splash:1.4, sfx:'mortar',
  paths:[
   {name:'Crew', tiers:[
    {name:'Fast Crew',   cost:80,  desc:'+30% fire rate', mod:{rofMul:1.3}},
    {name:'Drilled Crew',cost:200, desc:'+40% fire rate', mod:{rofMul:1.4}},
    {name:'Twin Tubes',  cost:520, desc:'Fires 2 shells, +20% rate', mod:{volleyAdd:1, rofMul:1.2}}]},
   {name:'Targeting', tiers:[
    {name:'Spotter Drone', cost:70,  desc:'Detects stealth, -1 min range', mod:{detect:true, minRangeSub:1}},
    {name:'Ranging Radar', cost:180, desc:'+2 range', mod:{rangeAdd:2}},
    {name:'Guided Shells', cost:400, desc:'+25% dmg, +0.4 splash', mod:{dmgMul:1.25, splashAdd:0.4}}]},
   {name:'Ordnance', tiers:[
    {name:'HE Shells',    cost:90,  desc:'+12 dmg', mod:{dmgAdd:12}},
    {name:'Heavy HE',     cost:240, desc:'+16 dmg, +0.3 splash', mod:{dmgAdd:16, splashAdd:0.3}},
    {name:'Bunker Buster',cost:560, desc:'+34 dmg, stuns engines', mod:{dmgAdd:34, splashAdd:0.5, stunProb:0.3, stunDur:0.7}}]}]},

tesla: { id:'tesla', name:'Tesla Coil', role:'Engine staller', cost:170, slotCost:1, color:0xa5e8f5, icon:'◉',
  desc:'Pulses that choke engines — slows everything nearby.', targets:'b', arche:'frost', range:2.8, rof:0.6, dmg:5, slow:0.35, slowDur:1.6, sfx:'frost',
  paths:[
   {name:'Pulse Rate', tiers:[
    {name:'Fast Cycler', cost:60,  desc:'+30% pulse rate', mod:{rofMul:1.3}},
    {name:'Overclocked', cost:170, desc:'+40% pulse rate', mod:{rofMul:1.4}},
    {name:'Resonant Coil',cost:430,desc:'+70% pulse rate', mod:{rofMul:1.7}}]},
   {name:'Field Shape', tiers:[
    {name:'Field Scanner',cost:55, desc:'Detects stealth vehicles', mod:{detect:true}},
    {name:'Wide Field',  cost:150, desc:'+1 range', mod:{rangeAdd:1}},
    {name:'Deep Field',  cost:380, desc:'+1 range, +10% slow', mod:{rangeAdd:1, slowAdd:0.10}}]},
   {name:'Voltage', tiers:[
    {name:'Charged Pulse',cost:75, desc:'+6 dmg', mod:{dmgAdd:6}},
    {name:'Overvolt',    cost:200, desc:'+5 dmg, +15% slow', mod:{dmgAdd:5, slowAdd:0.15}},
    {name:'System Crash',cost:470, desc:'+9 dmg, 25% full stall 1s', mod:{dmgAdd:9, freezeProb:0.25, freezeDur:1}}]}]},

sniper: { id:'sniper', name:'Sniper Cannon', role:'Precision', cost:200, slotCost:1, color:0xd8c9f7, icon:'┼',
  desc:'Massive single shots across the whole field.', targets:'b', arche:'sniper', range:12, rof:0.4, dmg:40, sfx:'sniper',
  paths:[
   {name:'Cycling', tiers:[
    {name:'Fast Bolt',   cost:90,  desc:'+30% fire rate', mod:{rofMul:1.3}},
    {name:'Auto Cycler', cost:240, desc:'+40% fire rate', mod:{rofMul:1.4}},
    {name:'Rapid Rail',  cost:560, desc:'+70% fire rate', mod:{rofMul:1.7}}]},
   {name:'Optics', tiers:[
    {name:'Spotter Scope', cost:80,  desc:'Detects stealth vehicles', mod:{detect:true}},
    {name:'Target Marker', cost:210, desc:'Hits mark: +15% dmg taken', mod:{mark:0.15, markDur:3}},
    {name:'Piercing Lens', cost:460, desc:'Shots pierce +1, instant tracking', mod:{pierceAdd:1, aimMul:4}}]},
   {name:'Caliber', tiers:[
    {name:'Heavy Slug', cost:110, desc:'+25 dmg', mod:{dmgAdd:25}},
    {name:'AP Slug',    cost:280, desc:'+40 dmg, ignores armor', mod:{dmgAdd:40, armorPierce:true}},
    {name:'Annihilator',cost:620, desc:'+80 dmg, 25% crit x2.5', mod:{dmgAdd:80, critProb:0.25, critMul:2.5}}]}]},

relay: { id:'relay', name:'Command Relay', role:'Support buffs', cost:160, slotCost:1, color:0xf7a8d8, icon:'▲',
  desc:'Boosts every turret in its radius.', targets:'b', arche:'aura', range:2.5, rof:0, dmg:0, buffDmg:0.12, sfx:'none',
  paths:[
   {name:'Overdrive Link', tiers:[
    {name:'Overdrive I',  cost:70,  desc:'Nearby turrets +10% speed', mod:{buffRofAdd:0.10}},
    {name:'Overdrive II', cost:190, desc:'+15% more speed', mod:{buffRofAdd:0.15}},
    {name:'Overdrive III',cost:460, desc:'+25% more speed', mod:{buffRofAdd:0.25}}]},
   {name:'Recon Net', tiers:[
    {name:'Recon Link',    cost:65,  desc:'Buffed turrets detect stealth', mod:{buffDetect:true}},
    {name:'Wider Net',     cost:170, desc:'+0.8 radius', mod:{rangeAdd:0.8}},
    {name:'Battle Network',cost:420, desc:'+1 radius, turrets +0.5 range', mod:{rangeAdd:1, buffRangeAdd:0.5}}]},
   {name:'Fire Coordination', tiers:[
    {name:'Coordinated Fire',cost:80, desc:'Nearby turrets +10% dmg', mod:{buffDmgAdd:0.10}},
    {name:'Kill Orders',     cost:210,desc:'+15% more dmg', mod:{buffDmgAdd:0.15}},
    {name:'Total War',       cost:480,desc:'+25% more dmg', mod:{buffDmgAdd:0.25}}]}]},

market: { id:'market', name:'Food Market', role:'Economy', cost:220, slotCost:1, color:0xf7dd72, icon:'🍔',
  desc:'Feeds the defense force. Pays out gold after every wave.', targets:'b', arche:'bank', range:3, rof:0, dmg:0, goldWave:45, sfx:'none',
  paths:[
   {name:'Service Speed', tiers:[
    {name:'Snack Cart',      cost:75,  desc:'+20 gold per wave', mod:{goldWaveAdd:20}},
    {name:'Drive-Thru',      cost:200, desc:'+5% interest each wave (max 100)', mod:{interestAdd:0.05}},
    {name:'Chain Franchise', cost:480, desc:'+60 gold per wave', mod:{goldWaveAdd:60}}]},
   {name:'Delivery Network', tiers:[
    {name:'Delivery Scooters',cost:70, desc:'+1 gold per kill nearby', mod:{killGoldAdd:1}},
    {name:'Wider Routes',    cost:180, desc:'+2 radius', mod:{rangeAdd:2}},
    {name:'Free Samples',    cost:400, desc:'+2 gold per kill nearby', mod:{killGoldAdd:2}}]},
   {name:'Menu', tiers:[
    {name:'Combo Meals',     cost:90,  desc:'+35 gold per wave', mod:{goldWaveAdd:35}},
    {name:'All-You-Can-Eat', cost:230, desc:'+50 gold per wave', mod:{goldWaveAdd:50}},
    {name:'Five-Star Rating',cost:520, desc:'+90 gold per wave', mod:{goldWaveAdd:90}}]}]},

rail: { id:'rail', name:'Railgun', role:'Piercing beam', cost:340, slotCost:2, color:0xe2e8f0, icon:'═',
  desc:'One shot, one line, everything in it. Takes 2 loadout slots.', targets:'b', arche:'rail', range:6.5, rof:0.5, dmg:40, sfx:'rail',
  paths:[
   {name:'Capacitors', tiers:[
    {name:'Quick Charge',cost:110, desc:'+30% fire rate', mod:{rofMul:1.3}},
    {name:'Twin Rails',  cost:280, desc:'+45% fire rate', mod:{rofMul:1.45}},
    {name:'Gauss Storm', cost:620, desc:'+80% fire rate', mod:{rofMul:1.8}}]},
   {name:'Phase Systems', tiers:[
    {name:'Phase Scanner',cost:100, desc:'Detects stealth vehicles', mod:{detect:true}},
    {name:'Painted Targets',cost:260,desc:'Hits mark: +15% dmg taken', mod:{mark:0.15, markDur:3}},
    {name:'Longbore',     cost:560, desc:'+2 range, instant tracking', mod:{rangeAdd:2, aimMul:4}}]},
   {name:'Projectile', tiers:[
    {name:'Heavy Slug', cost:130, desc:'+22 dmg', mod:{dmgAdd:22}},
    {name:'Overcharged',cost:340, desc:'+32 dmg, ignores armor', mod:{dmgAdd:32, armorPierce:true}},
    {name:'Annihilation',cost:700,desc:'+58 dmg', mod:{dmgAdd:58}}]}]},

repair: { id:'repair', name:'Repair Station', role:'Base support', cost:200, slotCost:1, color:0xffd9a8, icon:'+',
  desc:'Drones patch the base hull over time.', targets:'b', arche:'repair', range:3, rof:0, dmg:0, heal:12, sfx:'none',
  paths:[
   {name:'Drone Speed', tiers:[
    {name:'Fast Drones', cost:70,  desc:'+6 base HP/s', mod:{healAdd:6}},
    {name:'Drone Swarm', cost:190, desc:'+9 base HP/s', mod:{healAdd:9}},
    {name:'Nano Cloud',  cost:460, desc:'+15 base HP/s', mod:{healAdd:15}}]},
   {name:'Watch Systems', tiers:[
    {name:'Watchtower', cost:65,  desc:'Detects stealth nearby', mod:{detect:true}},
    {name:'Alarm Grid', cost:170, desc:'+2 detection radius', mod:{rangeAdd:2}},
    {name:'Emergency Crews',cost:400,desc:'Heals x2 when base under 40%', mod:{lowBoost:true}}]},
   {name:'Hull Plating', tiers:[
    {name:'Plating',    cost:90,  desc:'+10% max base HP', mod:{baseHpMul:1.10}},
    {name:'Reinforce',  cost:240, desc:'+15% max base HP', mod:{baseHpMul:1.15}},
    {name:'Aegis Shield',cost:540, desc:'Base gains a 400 HP shield', mod:{shieldAdd:400}}]}]},

missile: { id:'missile', name:'Missile Battery', role:'Homing volleys', cost:260, slotCost:2, color:0x9fb8f0, icon:'⇈',
  desc:'Salvos that hunt their targets. Takes 2 loadout slots.', targets:'b', arche:'missile', range:5.5, rof:0.6, dmg:10, volley:3, splash:0.7, sfx:'missile',
  paths:[
   {name:'Rack Feed', tiers:[
    {name:'Fast Racks',     cost:85,  desc:'+30% fire rate', mod:{rofMul:1.3}},
    {name:'Auto Feeder',    cost:230, desc:'+45% fire rate', mod:{rofMul:1.45}},
    {name:'Rolling Thunder',cost:540, desc:'+70% fire rate', mod:{rofMul:1.7}}]},
   {name:'Seekers', tiers:[
    {name:'Seeker Heads',  cost:80,  desc:'Detects stealth, faster missiles', mod:{detect:true, projMul:1.3}},
    {name:'Smart Warheads',cost:200, desc:'+1 range, faster missiles', mod:{rangeAdd:1, projMul:1.4}},
    {name:'Sat Uplink',    cost:460, desc:'+1.5 range, +20% dmg', mod:{rangeAdd:1.5, dmgMul:1.2}}]},
   {name:'Warheads', tiers:[
    {name:'Big Warheads',cost:100, desc:'+5 dmg', mod:{dmgAdd:5}},
    {name:'Cluster Tips',cost:260, desc:'+2 missiles per volley', mod:{volleyAdd:2}},
    {name:'MIRV',        cost:580, desc:'+3 missiles, +4 dmg', mod:{volleyAdd:3, dmgAdd:4, splashAdd:0.3}}]}]},

radar: { id:'radar', name:'Radar Array', role:'Detection', cost:100, slotCost:1, color:0xa7f3d0, icon:'◠',
  desc:'Reveals stealth vehicles and paints targets for +dmg.', targets:'b', arche:'echo', range:3.4, rof:0.8, dmg:2, mark:0.10, markDur:2, detect:true, sfx:'ping',
  paths:[
   {name:'Sweep Rate', tiers:[
    {name:'Quick Sweep', cost:50,  desc:'+35% pulse rate', mod:{rofMul:1.35}},
    {name:'Twin Emitters',cost:140,desc:'+50% pulse rate', mod:{rofMul:1.5}},
    {name:'Resonance',   cost:360, desc:'+80% rate, +2 dmg', mod:{rofMul:1.8, dmgAdd:2}}]},
   {name:'Antenna Gain', tiers:[
    {name:'Deep Scan',  cost:45,  desc:'+1 range', mod:{rangeAdd:1}},
    {name:'Wide Array', cost:130, desc:'+1.2 range, +5% paint', mod:{rangeAdd:1.2, markAdd:0.05}},
    {name:'Omniscience',cost:320, desc:'+2 range, +10% paint', mod:{rangeAdd:2, markAdd:0.10}}]},
   {name:'Emitter Power', tiers:[
    {name:'Focused Pulse',cost:60,  desc:'+4 dmg', mod:{dmgAdd:4}},
    {name:'Shockwave',    cost:170, desc:'+6 dmg, brief 10% slow', mod:{dmgAdd:6, slowAdd:0.10, slowDur:0.8}},
    {name:'Sonic Lance',  cost:420, desc:'+12 dmg, +10% paint', mod:{dmgAdd:12, markAdd:0.10}}]}]},
};
TD.PATH_TAGS = ['RATE','SYSTEMS','POWER'];
TD.DEFAULT_UNLOCKED = ['mg','sniper'];

/* ---------------- TECH TREE ---------------- */
TD.TECH = [
 { branch:'Arsenal', nodes:[
   { id:'u_radar',   name:'Radar Array',    cost:5,  desc:'Unlock stealth detection + target painting', unlock:'radar' },
   { id:'u_scatter', name:'Scattergun',     cost:8,  desc:'Unlock the cone blaster', unlock:'scatter' },
   { id:'u_tesla',   name:'Tesla Coil',     cost:8,  desc:'Unlock the engine staller', unlock:'tesla' },
   { id:'u_relay',   name:'Command Relay',  cost:12, desc:'Unlock support buffs', unlock:'relay' },
   { id:'u_market',  name:'Food Market',    cost:12, desc:'Unlock wave income', unlock:'market' },
   { id:'u_mortar',  name:'Mortar Post',    cost:12, desc:'Unlock long-range splash', unlock:'mortar' },
   { id:'u_repair',  name:'Repair Station', cost:15, desc:'Unlock base repair', unlock:'repair' },
   { id:'u_missile', name:'Missile Battery',cost:18, desc:'Unlock homing volleys', unlock:'missile' },
   { id:'u_rail',    name:'Railgun',        cost:20, desc:'Unlock the piercing beam', unlock:'rail' }]},
 { branch:'Power', nodes:[
   { id:'dmg1',  name:'Sharpened Steel',  cost:12, desc:'All turrets +4% dmg', dmg:0.04 },
   { id:'dmg2',  name:'Hollow Points',    cost:22, desc:'All turrets +4% dmg', dmg:0.04, req:'dmg1' },
   { id:'dmg3',  name:'Military Surplus', cost:35, desc:'All turrets +5% dmg', dmg:0.05, req:'dmg2' },
   { id:'rng1',  name:'Elevated Optics',  cost:15, desc:'All turrets +5% range', range:0.05 },
   { id:'sell1', name:'Scrap Dealer',     cost:18, desc:'Sell refund 70% → 80%', sell:0.8 }]},
 { branch:'Homestead', nodes:[
   { id:'hp1',   name:'Sandbags',       cost:12, desc:'+25% base HP', baseHp:0.25 },
   { id:'hp2',   name:'Concrete Core',  cost:28, desc:'+25% base HP', baseHp:0.25, req:'hp1' },
   { id:'regen1',name:'Auto-Repair',    cost:22, desc:'Base regens 2 HP/s', regen:2 },
   { id:'gold1', name:'Rainy-Day Fund', cost:10, desc:'+75 starting gold', startGold:75 },
   { id:'gold2', name:'War Chest',      cost:25, desc:'+150 starting gold', startGold:150, req:'gold1' },
   { id:'bonus1',name:'Salvage Team',   cost:18, desc:'+25% wave bonus gold', waveBonus:0.25 },
   { id:'lab1',  name:'Field Lab',      cost:30, desc:'+1 research per wave', resWave:1 }]},
];

/* ---------------- ABILITIES (charge with kills + time) ---------------- */
TD.ABILITIES=[
 { id:'orbital',   name:'Orbital Strike', icon:'☄', key:'A', need:45,
   desc:'Click anywhere: a devastating strike lands after a short delay.' },
 { id:'overclock', name:'Overclock',      icon:'⚡', key:'S', need:35,
   desc:'All turrets fire +50% faster for 10 seconds.' },
 { id:'aegis',     name:'Aegis',          icon:'🛡', key:'D', need:40,
   desc:'Instantly project a 300 HP shield onto the base.' },
];

/* ---------------- WAVE PERKS (pick 1 of 3 every 5 waves) ---------------- */
TD.PERKS=[
 { id:'crit',       name:'Deadeye Rounds',    desc:'All turrets +10% crit chance (x1.8 dmg)' },
 { id:'bounty',     name:'Bounty Contracts',  desc:'+25% gold from kills' },
 { id:'hometurf',   name:'Home Turf',         desc:'Kills near the base pay double' },
 { id:'cheapblocks',name:'Prefab Blocks',     desc:'Blocks cost 50% less' },
 { id:'reinforced', name:'Reinforced Plating',desc:'Blocks have double HP' },
 { id:'deploy',     name:'Rapid Deploy',      desc:'Turrets cost 15% less' },
 { id:'sharp',      name:'Sharpshooters',     desc:'+10% global damage' },
 { id:'reach',      name:'Long Reach',        desc:'+8% global range' },
 { id:'learner',    name:'Fast Learner',      desc:'+1 research per wave' },
 { id:'adrenaline', name:'Adrenaline Feed',   desc:'Abilities charge 50% faster' },
 { id:'scavenger',  name:'Scavenger Crews',   desc:'Scrap crates drop twice as often' },
 { id:'interest',   name:'War Bonds',         desc:'+5% interest on gold each wave (max 150)' },
];

/* ---------------- ELITE AFFIXES ---------------- */
TD.AFFIXES={
 enraged:{ name:'Enraged',  color:0xff5040, hpMul:1.2, spdMul:1.4, goldMul:1.5 },
 shielded:{ name:'Shielded',color:0x7dd3fc, hpMul:1.2, armorAdd:8, goldMul:1.5 },
 bounty:{ name:'Bounty',    color:0xffd166, hpMul:0.9, goldMul:5 },
};

/* ---------------- DAILY RUN MODIFIERS ---------------- */
TD.DAILYMODS=[
 { id:'swarm',   name:'Swarm Day',     desc:'+50% enemies per wave' },
 { id:'rich',    name:'War Chest',     desc:'+250 starting gold' },
 { id:'fast',    name:'Overdrive',     desc:'Enemies move 15% faster' },
 { id:'fortune', name:'Gold Rush',     desc:'+30% kill gold' },
 { id:'brittle', name:'Brittle Armor', desc:'All enemies -20% HP' },
];
