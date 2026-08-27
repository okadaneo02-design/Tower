/* ============ TOWER DEFENDERS — hand-drawn SVG art ============
   Every UI icon is a small flat vector drawing (no emojis, no ASCII).
   TD.art(id) returns a data-URI SVG for that icon. */
window.TD = window.TD || {};
TD.art = (function(){
  const V = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">';
  const A = {
    mg:'<path d="M4 18 h6 a3 3 0 0 1 3 3 v2 h-9 a3 3 0 0 1 -3 -3 z" fill="#3b4a5a"/>'+
       '<rect x="10" y="14" width="14" height="5" rx="1.5" fill="#54647a"/>'+
       '<rect x="24" y="15" width="5" height="3" rx="1" fill="#2f3b4a"/>'+
       '<path d="M13 19 l-2 6" stroke="#3b4a5a" stroke-width="2"/>'+
       '<circle cx="13" cy="25" r="1.6" fill="#2f3b4a"/>',
    scatter:'<path d="M3 15 L13 12 a2 2 0 0 1 2 2 v3 a2 2 0 0 1 -2 2 z" fill="#8a5a3a"/>'+
       '<rect x="13" y="13" width="10" height="4" rx="1" fill="#a06a45"/>'+
       '<path d="M23 13 l6 -5 M23 15 l7 1 M23 17 l5 6" stroke="#e07b39" stroke-width="1.8" stroke-linecap="round"/>'+
       '<circle cx="29" cy="8" r="1.8" fill="#f2b880"/>'+
       '<circle cx="30" cy="16" r="1.8" fill="#f2b880"/>'+
       '<circle cx="28" cy="23" r="1.8" fill="#f2b880"/>',
    mortar:'<path d="M10 22 L26 6" stroke="#7a4a3a" stroke-width="5" stroke-linecap="round"/>'+
       '<circle cx="10" cy="22" r="4" fill="#5c3a2e"/>'+
       '<path d="M8 26 a14 14 0 0 0 22 -2" stroke="#c9844a" stroke-width="2" stroke-dasharray="3 2"/>'+
       '<circle cx="28" cy="6" r="3" fill="#e08f7a"/>',
    tesla:'<rect x="12" y="10" width="8" height="12" rx="4" fill="#3f6f80"/>'+
       '<path d="M16 6 l-3 4 h6 z" fill="#3f6f80"/>'+
       '<path d="M10 6 l-2 3 2 2 -2 3 2 2" stroke="#ffe9a8" stroke-width="1.6" stroke-linecap="round"/>'+
       '<path d="M22 6 l2 3 -2 2 2 3 -2 2" stroke="#ffe9a8" stroke-width="1.6" stroke-linecap="round"/>',
    sniper:'<circle cx="16" cy="16" r="11" stroke="#8a7ab8" stroke-width="2.5"/>'+
       '<circle cx="16" cy="16" r="4" fill="#8a7ab8"/>'+
       '<path d="M16 3 v5 M16 24 v5 M3 16 h5 M24 16 h5" stroke="#8a7ab8" stroke-width="2.5" stroke-linecap="round"/>',
    relay:'<rect x="14.5" y="10" width="3" height="14" fill="#b0558a"/>'+
       '<path d="M16 8 a9 9 0 0 1 9 9" stroke="#b0558a" stroke-width="2"/>'+
       '<path d="M16 12 a5 5 0 0 1 5 5" stroke="#d87bb0" stroke-width="2"/>'+
       '<circle cx="16" cy="8" r="2" fill="#b0558a"/>',
    market:'<circle cx="16" cy="16" r="12" fill="#f7dd72"/>'+
       '<circle cx="16" cy="16" r="8.5" stroke="#b8962a" stroke-width="1.8"/>'+
       '<path d="M16 11 v10 M13 13 h3 a2.5 2.5 0 0 1 0 5 h-3 M16 13 h3 a2.5 2.5 0 0 1 0 5 h-3" stroke="#8a6d1a" stroke-width="1.8" stroke-linecap="round"/>',
    rail:'<path d="M4 10 L28 6" stroke="#9aa6b5" stroke-width="3" stroke-linecap="round"/>'+
       '<path d="M4 22 L28 18" stroke="#9aa6b5" stroke-width="3" stroke-linecap="round"/>'+
       '<path d="M4 10 v12 M28 6 v12" stroke="#6f7d8c" stroke-width="2"/>'+
       '<rect x="11" y="8" width="9" height="9" rx="1.5" fill="#dce4ec"/>'+
       '<circle cx="15.5" cy="12.5" r="2.2" fill="#8fa6c0"/>',
    repair:'<circle cx="11" cy="11" r="5" fill="#8a6a4a"/>'+
       '<rect x="13.5" y="13.5" width="4" height="12" rx="2" fill="#8a6a4a" transform="rotate(45 15.5 19)"/>'+
       '<circle cx="11" cy="11" r="2.2" fill="#ffd9a8"/>',
    missile:'<path d="M16 3 c3 4 4 8 4 12 l-4 13 -4 -13 c0 -4 1 -8 4 -12 z" fill="#7d95d8"/>'+
       '<path d="M16 3 c2 2 2.6 4 2.6 6 h-5.2 c0 -2 0.6 -4 2.6 -6 z" fill="#ff8a8a"/>'+
       '<rect x="14.4" y="15" width="3.2" height="9" rx="1" fill="#dce4ec"/>',
    radar:'<path d="M4 24 a16 16 0 0 1 24 0" stroke="#5aa08a" stroke-width="3"/>'+
       '<path d="M16 20 l4 -8 M16 20 l-4 -8" stroke="#5aa08a" stroke-width="3" stroke-linecap="round"/>'+
       '<circle cx="16" cy="20" r="2.5" fill="#5aa08a"/>',
    block:'<path d="M4 6 h24 v7 h-24 z M4 13 h11 v6 h-11 z M15 13 h13 v6 h-13 z M4 19 h11 v7 h-11 z M15 19 h13 v7 h-13 z" fill="#8f9aa8" stroke="#6f7d8c" stroke-width="1.2"/>',
    wire:'<path d="M3 16 h26" stroke="#7a5a3a" stroke-width="2.4"/>'+
       '<path d="M9 12 l3 4 -3 4 M19 12 l3 4 -3 4 M13 10 l1.5 6 M19 10 l-1.5 6" stroke="#8f6a44" stroke-width="1.8" stroke-linecap="round"/>',
    tar:'<path d="M5 24 a11 11 0 0 1 22 0" stroke="#8a6f3a" stroke-width="2.4"/>'+
       '<path d="M9 24 a7 7 0 0 1 14 0" stroke="#a88a4a" stroke-width="2.4"/>'+
       '<path d="M13 24 a3 3 0 0 1 6 0" stroke="#cbb26a" stroke-width="2.4"/>'+
       '<circle cx="16" cy="24" r="1.6" fill="#cbb26a"/>',
    spike:'<path d="M16 4 l6 9 h-12 z" fill="#6f7d8c"/>'+
       '<path d="M6 17 l6 9 h-12 z" fill="#8d99ae"/>'+
       '<path d="M26 17 l6 9 h-12 z" fill="#8d99ae"/>'+
       '<rect x="2" y="26" width="28" height="4" rx="1.5" fill="#6f7d8c"/>',
    trap:'<rect x="5" y="5" width="22" height="22" rx="2" fill="#4c5a66" stroke="#333f4a" stroke-width="2"/>'+
       '<path d="M5 10 h22 M10 5 v22 M22 5 v22" stroke="#7d8d99" stroke-width="1.5"/>'+
       '<path d="M5 16 L14 16 L16 20 L27 20" stroke="#20262c" stroke-width="2"/>',
    minigun:'<circle cx="16" cy="16" r="9" stroke="#3d4a5a" stroke-width="2" fill="#54647a"/>'+
       '<circle cx="16" cy="16" r="3" fill="#2f3b4a"/>'+
       '<circle cx="16" cy="10.5" r="2.4" fill="#9dd6f2"/>'+
       '<circle cx="19.7" cy="18.5" r="2.4" fill="#9dd6f2"/>'+
       '<circle cx="12.3" cy="18.5" r="2.4" fill="#9dd6f2"/>'+
       '<path d="M16 0 v4 M16 28 v-4 M0 16 h4 M28 16 h-4" stroke="#2f3b4a" stroke-width="2"/>',
    flame:'<path d="M16 2 c4 5 7 8 7 13 a7 7 0 0 1 -14 0 c0 -2 1 -4 2 -6 1 2 2 3 3 3 -1 -4 0 -7 2 -10 z" fill="#ff6b3d"/>'+
       '<path d="M16 12 c2 2 3 4 3 6 a3 3 0 0 1 -6 0 c0 -1 0 -2 1 -3 1 1 1 2 2 2 0 -2 0 -3 0 -5 z" fill="#ffd166"/>',
    laser:'<rect x="4" y="13" width="24" height="6" rx="2" fill="#54647a"/>'+
       '<circle cx="25" cy="16" r="4" fill="#ff5f8a"/>'+
       '<path d="M27 13 l5 -3 M27 19 l5 3 M4 13 l-2 -3 M4 19 l-2 3" stroke="#ff8fb0" stroke-width="1.6" stroke-linecap="round"/>'+
       '<path d="M26 16 l4 0" stroke="#ffd1dd" stroke-width="1.4"/>',
    orbital:'<path d="M16 2 l3.5 7 7 3.5 -7 3.5 -3.5 7 -3.5 -7 -7 -3.5 7 -3.5 z" fill="#ff9f6e"/>'+
       '<circle cx="24" cy="24" r="4" fill="#ff6b6b"/>',
    overclock:'<path d="M17 2 L8 18 h6 l-2 12 11 -16 h-6 z" fill="#ffd34d"/>',
    aegis:'<path d="M16 2 L28 7 v9 c0 8 -5.5 12 -12 14 C9 28 4 24 4 16 V7 z" fill="#5aa0d8"/>'+
       '<path d="M16 8 v12 M11 14 h10" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>',
    coin:'<circle cx="16" cy="16" r="13" fill="#fbbf24"/>'+
       '<circle cx="16" cy="16" r="9.5" stroke="#b45309" stroke-width="2"/>'+
       '<text x="16" y="21" font-size="13" font-weight="bold" text-anchor="middle" fill="#92400e" font-family="Arial">$</text>',
    flask:'<path d="M11 4 h10 M12.5 4 v7 L6 24 a3 3 0 0 0 3 4 h14 a3 3 0 0 0 3 -4 l-6.5 -13 v-7" stroke="#a855f7" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'+
       '<path d="M9 20 h14" stroke="#c084fc" stroke-width="2.4"/>',
    play:'<path d="M9 5 L25 16 L9 27 z" fill="#22c55e"/>',
    coop:'<circle cx="10" cy="9" r="4" fill="#0ea5e9"/>'+
       '<path d="M4 21 a6 6 0 0 1 12 0 v3 h-12 z" fill="#0ea5e9"/>'+
       '<circle cx="22" cy="9" r="4" fill="#a855f7"/>'+
       '<path d="M16 21 a6 6 0 0 1 12 0 v3 h-12 z" fill="#a855f7"/>',
    cal:'<rect x="4" y="6" width="24" height="22" rx="3" fill="#ffffff" stroke="#0ea5e9" stroke-width="2.4"/>'+
       '<path d="M4 12 h24 M10 3 v6 M22 3 v6" stroke="#0ea5e9" stroke-width="2.4" stroke-linecap="round"/>'+
       '<rect x="8" y="17" width="4" height="4" rx="1" fill="#f43f5e"/>'+
       '<rect x="15" y="17" width="4" height="4" rx="1" fill="#22c55e"/>'+
       '<rect x="22" y="17" width="4" height="4" rx="1" fill="#f59e0b"/>',
    lab:'<path d="M11 4 h10 M12.5 4 v7 L6 24 a3 3 0 0 0 3 4 h14 a3 3 0 0 0 3 -4 l-6.5 -13 v-7" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'+
       '<path d="M9 20 h14" stroke="#fbbf24" stroke-width="2.4"/>',
    tree:'<path d="M16 3 L9 12 h14 z" fill="#22c55e"/>'+
       '<path d="M16 11 L6 21 h20 z" fill="#16a34a"/>'+
       '<rect x="15" y="20" width="2.5" height="9" rx="1" fill="#8a5a3a"/>',
    gear:'<circle cx="16" cy="16" r="6" fill="#94a3b8"/>'+
       '<path d="M16 4 l1.6 4 h-3.2 z M16 28 l-1.6 -4 h3.2 z M4 16 l4 -1.6 v3.2 z M28 16 l-4 1.6 v-3.2 z M8 8 l2.8 2.8 -2.3 2.3 z M24 24 l-2.8 -2.8 2.3 -2.3 z M24 8 l-2.8 2.8 2.3 2.3 z M8 24 l2.8 -2.8 -2.3 -2.3 z" fill="#64748b"/>'+
       '<circle cx="16" cy="16" r="2.6" fill="#cbd5e1"/>',
    star:'<path d="M16 3 l3.4 6.9 7.6 1.1 -5.5 5.4 1.3 7.6 -6.8 -3.6 -6.8 3.6 1.3 -7.6 -5.5 -5.4 7.6 -1.1 z" fill="#f0c24a"/>',
    shield:'<path d="M16 3 L27 7 v8 c0 7 -4.8 11 -11 13 C9 26 5 22 5 15 V7 z" fill="#5aa0d8"/>'+
       '<path d="M16 9 v9 M12 13 h8" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>',
    blade:'<path d="M6 26 L22 10 l-3 -3 L3 23 z" fill="#cbd5e1"/>'+
       '<rect x="5" y="22" width="14" height="4" rx="1.5" transform="rotate(45 12 24)" fill="#8a6a4a"/>'+
       '<path d="M20 9 l3 -3 3 3 -3 3 z" fill="#f0c24a"/>',
    crate:'<rect x="4" y="10" width="24" height="16" rx="2" fill="#a06a45"/>'+
       '<path d="M4 16 h24 M16 10 v16" stroke="#7a4a2e" stroke-width="2"/>',
  };
  return function(id){
    const s=A[id];
    if (!s) return '';
    return 'data:image/svg+xml;utf8,'+encodeURIComponent(V+s+'</svg>');
  };
})();