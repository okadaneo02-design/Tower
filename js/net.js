/* ============ TOWER DEFENDERS — 2-player co-op ============
   6-digit room codes via the free PeerJS public cloud (WebRTC underneath).
   HOST runs the real simulation; GUEST gets a high-fidelity replica:
   entity snapshots at ~12Hz + replicated projectiles + real FX events. */
TD.Net=(function(){
  let peer=null, conn=null;
  const N={ role:null, connected:false, code:null, onOpen:null, onClose:null, onMsg:null };
  function wire(c){
    conn=c;
    const opened=()=>{ if(!N.connected){ N.connected=true; if(N.onOpen) N.onOpen(); } };
    if (c.open) opened(); else c.on('open',opened);   // may already be open when we attach
    conn.on('data',m=>{ if(N.onMsg) N.onMsg(m); });
    conn.on('close',()=>{ N.connected=false; if(N.onClose) N.onClose(); });
    conn.on('error',()=>{ N.connected=false; if(N.onClose) N.onClose(); });
  }
  N.host=function(){
    return new Promise((res,rej)=>{
      if (typeof Peer==='undefined') return rej(new Error('PeerJS failed to load — check internet'));
      const tryOnce=attempt=>{
        const code=String(Math.floor(100000+Math.random()*900000));
        peer=new Peer('towerdef-'+code);
        peer.on('open',()=>{ N.role='host'; N.code=code; res(code); });
        peer.on('connection',c=>wire(c));
        peer.on('error',err=>{
          if (err.type==='unavailable-id'&&attempt<3){ try{peer.destroy();}catch(e){} tryOnce(attempt+1); }
          else rej(err);
        });
      };
      tryOnce(0);
    });
  };
  N.join=function(code){
    return new Promise((res,rej)=>{
      if (typeof Peer==='undefined') return rej(new Error('PeerJS failed to load — check internet'));
      peer=new Peer();
      peer.on('open',()=>{
        const c=peer.connect('towerdef-'+String(code).trim(),{reliable:true});
        wire(c);
        c.on('open',()=>{ N.role='guest'; res(true); });
        setTimeout(()=>{ if(!N.connected) rej(new Error('No host found for that code')); },12000);
      });
      peer.on('error',err=>rej(err));
    });
  };
  N.send=function(m){ if(conn&&conn.open){ try{ conn.send(m); }catch(e){} } };
  return N;
})();
