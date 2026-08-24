/* ============ TOWER DEFENDERS — 2-player co-op (WebRTC, no server) ============
   The HOST runs the real simulation. The GUEST sees a live replica and sends
   commands (build / upgrade / sell / waves / abilities / crates).
   Connection is made by swapping two codes — works with zero backend. */
TD.Net=(function(){
  const cfg={ iceServers:[{urls:'stun:stun.l.google.com:19302'}] };
  let pc=null, dc=null;
  const N={ role:null, connected:false, onOpen:null, onClose:null, onMsg:null };
  function wire(){
    dc.onopen=()=>{ N.connected=true; if(N.onOpen) N.onOpen(); };
    dc.onclose=()=>{ N.connected=false; if(N.onClose) N.onClose(); };
    dc.onmessage=e=>{ let m; try{ m=JSON.parse(e.data); }catch(_){ return; } if(N.onMsg) N.onMsg(m); };
  }
  function iceDone(){
    return new Promise(res=>{
      if (pc.iceGatheringState==='complete') return res();
      const t=setTimeout(res,3000);
      pc.addEventListener('icegatheringstatechange',()=>{
        if (pc.iceGatheringState==='complete'){ clearTimeout(t); res(); } });
    });
  }
  N.host=async function(){
    pc=new RTCPeerConnection(cfg);
    dc=pc.createDataChannel('td'); wire();
    await pc.setLocalDescription(await pc.createOffer());
    await iceDone(); N.role='host';
    return btoa(JSON.stringify(pc.localDescription));
  };
  N.acceptAnswer=async function(code){
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(code.trim()))));
  };
  N.join=async function(code){
    pc=new RTCPeerConnection(cfg);
    pc.ondatachannel=e=>{ dc=e.channel; wire(); };
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(code.trim()))));
    await pc.setLocalDescription(await pc.createAnswer());
    await iceDone(); N.role='guest';
    return btoa(JSON.stringify(pc.localDescription));
  };
  N.send=function(m){ if(dc&&dc.readyState==='open') dc.send(JSON.stringify(m)); };
  N.active=function(){ return N.connected; };
  return N;
})();
