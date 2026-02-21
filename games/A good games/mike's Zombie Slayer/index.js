const c = document.getElementById('c'), ctx = c.getContext('2d');
const dmgFlash = document.getElementById('dmg');
const overlay = document.getElementById('overlay');
const shopEl = document.getElementById('shop');

let w, h;
function resize() { w = c.width = window.innerWidth; h = c.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// ── Depth buffer (one entry per screen column) ────────────────────────
let zBuf = new Float32Array(1);

// ── Buildings — Town Layout ────────────────────────────────────────────
const BUILDINGS = [
    // ── North row of shops ──────────────────────────────────────────────
    {x1:-11,y1:-11,x2:-7,  y2:-7.5, color:[120,80,60],  label:'SHOP'},
    {x1:-5.5,y1:-11,x2:-2.5,y2:-8,  color:[100,90,70],  label:'BAKERY'},
    {x1:-1,  y1:-11,x2:1,  y2:-8.5, color:[80,70,100],  label:'CHURCH'},
    {x1:2.5, y1:-11,x2:5.5,y2:-8,   color:[100,90,70],  label:'DINER'},
    {x1:7,   y1:-11,x2:11, y2:-7.5, color:[110,75,55],  label:'BANK'},
    // ── South row of shops ──────────────────────────────────────────────
    {x1:-11, y1:7.5, x2:-7, y2:11,  color:[90,80,60],   label:'MOTEL'},
    {x1:-5.5,y1:8,   x2:-2.5,y2:11, color:[100,90,70],  label:'PHARMACY'},
    {x1:2.5, y1:8,   x2:5.5,y2:11,  color:[80,85,65],   label:'MARKET'},
    {x1:7,   y1:7.5, x2:11, y2:11,  color:[95,70,55],   label:'GARAGE'},
    // ── West alley buildings ─────────────────────────────────────────────
    {x1:-11, y1:-5.5,x2:-8, y2:-2,  color:[85,75,65],   label:''},
    {x1:-11, y1:2,   x2:-8, y2:5.5, color:[85,75,65],   label:''},
    // ── East alley buildings ─────────────────────────────────────────────
    {x1:8,   y1:-5.5,x2:11, y2:-2,  color:[75,80,65],   label:''},
    {x1:8,   y1:2,   x2:11, y2:5.5, color:[75,80,65],   label:''},
    // ── Central town square features ─────────────────────────────────────
    {x1:-1.5,y1:-1.5,x2:1.5,y2:1.5, color:[110,100,80], label:'FOUNTAIN'},
    {x1:-6,  y1:-5,  x2:-4, y2:-3,  color:[70,80,55],   label:''},
    {x1:4,   y1:-5,  x2:6,  y2:-3,  color:[70,80,55],   label:''},
    {x1:-6,  y1:3,   x2:-4, y2:5,   color:[70,80,55],   label:''},
    {x1:4,   y1:3,   x2:6,  y2:5,   color:[70,80,55],   label:''},
    // ── Street barriers / planters (small) ───────────────────────────────
    {x1:-2.8,y1:-6.5,x2:-2,y2:-5.5, color:[60,80,50],   label:''},
    {x1:2,   y1:-6.5,x2:2.8,y2:-5.5,color:[60,80,50],   label:''},
    {x1:-2.8,y1:5.5, x2:-2, y2:6.5, color:[60,80,50],   label:''},
    {x1:2,   y1:5.5, x2:2.8,y2:6.5, color:[60,80,50],   label:''},
    {x1:-6.5,y1:-2.8,x2:-5.5,y2:-2, color:[60,80,50],   label:''},
    {x1:-6.5,y1:2,   x2:-5.5,y2:2.8,color:[60,80,50],   label:''},
    {x1:5.5, y1:-2.8,x2:6.5,y2:-2,  color:[60,80,50],   label:''},
    {x1:5.5, y1:2,   x2:6.5,y2:2.8, color:[60,80,50],   label:''},
];

const ROOM = 12;
const ENTITY_R = 0.38;

// ── Procedural Wall Textures ───────────────────────────────────────────
const TEX_SIZE = 128;
const TEXTURES = {};

function makeTex(name, drawFn){
    const oc = document.createElement('canvas');
    oc.width = oc.height = TEX_SIZE;
    drawFn(oc.getContext('2d'), TEX_SIZE);
    TEXTURES[name] = oc;
}

function buildTextures(){
    // ── 1. Brick ──────────────────────────────────────────────────────
    makeTex('brick', (g, S)=>{
        g.fillStyle='#7a3a22'; g.fillRect(0,0,S,S);
        const bh=14, bw=28, mortar=2;
        for(let row=0; row<S/bh+1; row++){
            const off=(row%2)*(bw/2);
            for(let col=-1; col<S/bw+1; col++){
                const x=col*bw+off, y=row*bh;
                const shade=180+Math.sin(row*3.7+col*2.1)*18+(Math.random()*10-5);
                g.fillStyle=`rgb(${shade|0},${(shade*0.52)|0},${(shade*0.32)|0})`;
                g.fillRect(x+mortar, y+mortar, bw-mortar*2, bh-mortar*2);
                if(Math.random()<0.3){
                    g.strokeStyle='rgba(0,0,0,0.18)'; g.lineWidth=0.7;
                    g.beginPath();
                    g.moveTo(x+mortar+4,y+mortar+4);
                    g.lineTo(x+mortar+8+Math.random()*8,y+mortar+3+Math.random()*6);
                    g.stroke();
                }
            }
        }
        g.fillStyle='#5a4030';
        for(let row=0; row<S/bh+1; row++){
            g.fillRect(0, row*bh, S, mortar);
            const off=(row%2)*(bw/2);
            for(let col=-1; col<S/bw+1; col++) g.fillRect(col*bw+off, row*bh, mortar, bh);
        }
    });

    // ── 2. Stone ──────────────────────────────────────────────────────
    makeTex('stone', (g, S)=>{
        g.fillStyle='#5a5a5a'; g.fillRect(0,0,S,S);
        const stones=[
            {x:0,y:0,w:40,h:30},{x:42,y:0,w:36,h:26},{x:80,y:0,w:48,h:32},
            {x:0,y:32,w:52,h:28},{x:54,y:28,w:44,h:30},{x:100,y:34,w:28,h:26},
            {x:0,y:62,w:36,h:32},{x:38,y:60,w:50,h:34},{x:90,y:62,w:38,h:30},
            {x:0,y:96,w:46,h:32},{x:48,y:96,w:36,h:32},{x:86,y:96,w:42,h:32},
        ];
        for(const s of stones){
            const shade=110+Math.random()*40;
            g.fillStyle=`rgb(${shade|0},${shade|0},${(shade*0.95)|0})`;
            g.fillRect(s.x+2,s.y+2,s.w-4,s.h-4);
            g.fillStyle='rgba(255,255,255,0.12)';
            g.fillRect(s.x+2,s.y+2,s.w-4,2);
            g.fillRect(s.x+2,s.y+2,2,s.h-4);
            g.fillStyle='rgba(0,0,0,0.2)';
            g.fillRect(s.x+2,s.y+s.h-4,s.w-4,2);
            g.fillRect(s.x+s.w-4,s.y+2,2,s.h-4);
        }
        g.fillStyle='#333'; g.fillRect(0,30,S,2); g.fillRect(0,58,S,2); g.fillRect(0,94,S,2);
    });

    // ── 3. Wood planks ────────────────────────────────────────────────
    makeTex('wood', (g, S)=>{
        const plankH=16;
        for(let row=0; row<S/plankH+1; row++){
            const y=row*plankH;
            const baseR=120+Math.sin(row*1.7)*15;
            for(let x=0; x<S; x++){
                const grain=Math.sin(x*0.4+row*3.1)*6+Math.sin(x*1.3+row)*3;
                const r=baseR+grain+Math.random()*4;
                const grn=r*0.62, bl=r*0.38;
                g.fillStyle=`rgb(${r|0},${grn|0},${bl|0})`;
                g.fillRect(x,y,1,plankH);
            }
            g.fillStyle='rgba(0,0,0,0.35)'; g.fillRect(0,y,S,1);
            g.fillStyle='rgba(255,255,255,0.06)'; g.fillRect(0,y+1,S,1);
            if(Math.random()<0.4){
                const kx=Math.random()*S;
                g.strokeStyle='rgba(60,30,10,0.5)'; g.lineWidth=1.2;
                g.beginPath(); g.ellipse(kx,y+plankH/2,4,3,0,0,Math.PI*2); g.stroke();
            }
        }
    });

    // ── 4. Plaster / stucco ───────────────────────────────────────────
    makeTex('plaster', (g, S)=>{
        g.fillStyle='#c8b898'; g.fillRect(0,0,S,S);
        for(let i=0;i<400;i++){
            const x=Math.random()*S, y=Math.random()*S;
            const v=Math.random()*20-10;
            const r=200+v, grn=185+v*0.8, bl=155+v*0.6;
            g.fillStyle=`rgba(${r|0},${grn|0},${bl|0},0.3)`;
            g.fillRect(x,y,Math.random()*4+1,Math.random()*4+1);
        }
        g.fillStyle='rgba(0,0,0,0.15)';
        g.fillRect(0,S*0.33,S,2); g.fillRect(0,S*0.66,S,2);
        g.fillStyle='rgba(255,255,255,0.15)';
        g.fillRect(0,S*0.33+2,S,1); g.fillRect(0,S*0.66+2,S,1);
    });

    // ── 5. Dark brick ─────────────────────────────────────────────────
    makeTex('darkbrick', (g, S)=>{
        g.fillStyle='#2a2e3a'; g.fillRect(0,0,S,S);
        const bh=12, bw=24, mortar=2;
        for(let row=0; row<S/bh+1; row++){
            const off=(row%2)*(bw/2);
            for(let col=-1; col<S/bw+1; col++){
                const x=col*bw+off, y=row*bh;
                const shade=70+Math.sin(row*4.1+col*2.9)*12+Math.random()*8;
                g.fillStyle=`rgb(${(shade*0.7)|0},${(shade*0.8)|0},${shade|0})`;
                g.fillRect(x+mortar,y+mortar,bw-mortar*2,bh-mortar*2);
            }
        }
        g.fillStyle='#1a1e28';
        for(let row=0; row<S/bh+1; row++){
            g.fillRect(0,row*bh,S,mortar);
            const off=(row%2)*(bw/2);
            for(let col=-1; col<S/bw+1; col++) g.fillRect(col*bw+off,row*bh,mortar,bh);
        }
    });

    // ── 6. Cobblestone floor ──────────────────────────────────────────
    makeTex('cobble', (g, S)=>{
        g.fillStyle='#3a3530'; g.fillRect(0,0,S,S);
        const stones=[
            {x:0,y:0,w:20,h:18},{x:22,y:2,w:16,h:16},{x:40,y:0,w:22,h:20},
            {x:64,y:1,w:18,h:17},{x:84,y:0,w:24,h:19},{x:110,y:2,w:18,h:16},
            {x:0,y:20,w:24,h:20},{x:26,y:20,w:18,h:22},{x:46,y:20,w:20,h:18},
            {x:68,y:20,w:22,h:22},{x:92,y:20,w:18,h:20},{x:112,y:20,w:16,h:20},
            {x:0,y:42,w:18,h:20},{x:20,y:44,w:24,h:18},{x:46,y:42,w:18,h:22},
            {x:66,y:42,w:20,h:20},{x:88,y:42,w:22,h:18},{x:112,y:44,w:16,h:18},
            {x:0,y:64,w:22,h:20},{x:24,y:64,w:18,h:22},{x:44,y:66,w:24,h:18},
            {x:70,y:64,w:18,h:20},{x:90,y:64,w:20,h:22},{x:112,y:66,w:16,h:18},
            {x:0,y:86,w:20,h:20},{x:22,y:88,w:22,h:18},{x:46,y:86,w:18,h:22},
            {x:66,y:86,w:24,h:20},{x:92,y:88,w:18,h:18},{x:112,y:86,w:16,h:20},
            {x:0,y:108,w:24,h:20},{x:26,y:108,w:18,h:20},{x:46,y:110,w:22,h:18},
            {x:70,y:108,w:20,h:20},{x:92,y:108,w:18,h:20},{x:112,y:110,w:16,h:18},
        ];
        for(const s of stones){
            const shade=75+Math.random()*30;
            g.fillStyle=`rgb(${shade|0},${(shade*0.93)|0},${(shade*0.82)|0})`;
            g.beginPath();g.roundRect(s.x+2,s.y+2,s.w-4,s.h-4,2);g.fill();
            g.fillStyle='rgba(255,255,255,0.1)'; g.fillRect(s.x+3,s.y+3,s.w-6,2);
            g.fillStyle='rgba(0,0,0,0.2)';       g.fillRect(s.x+3,s.y+s.h-5,s.w-6,2);
        }
    });
}

function getBuildingTex(b){
    if(!b) return 'brick';
    const l=b.label||'';
    if(l==='CHURCH'||l==='BANK') return 'darkbrick';
    if(l==='SHOP'||l==='MOTEL'||l==='GARAGE') return 'wood';
    if(l==='DINER'||l==='PHARMACY'||l==='MARKET'||l==='BAKERY') return 'plaster';
    if(l==='FOUNTAIN') return 'stone';
    return 'brick';
}

function getBuildingAABBs(r) {
    const out = [];
    for (const b of BUILDINGS) out.push({x1:b.x1-r, y1:b.y1-r, x2:b.x2+r, y2:b.y2+r});
    out.push({x1:-ROOM-10, y1:-ROOM-10, x2: ROOM+10, y2:-ROOM+r});
    out.push({x1:-ROOM-10, y1: ROOM-r,  x2: ROOM+10, y2: ROOM+10});
    out.push({x1:-ROOM-10, y1:-ROOM-10, x2:-ROOM+r,  y2: ROOM+10});
    out.push({x1: ROOM-r,  y1:-ROOM-10, x2: ROOM+10, y2: ROOM+10});
    return out;
}

function insideBuilding(px, py) {
    const r = ENTITY_R;
    for (const b of BUILDINGS)
        if (px>b.x1+r && px<b.x2-r && py>b.y1+r && py<b.y2-r) return true;
    if (Math.abs(px)>=ROOM-r || Math.abs(py)>=ROOM-r) return true;
    return false;
}

function sweepMove(ox, oy, nx, ny) {
    const boxes = getBuildingAABBs(ENTITY_R);
    let rx = nx, ry = ny;
    for (const b of boxes) {
        if (rx > b.x1 && rx < b.x2 && oy > b.y1 && oy < b.y2) {
            const overlapL = rx - b.x1, overlapR = b.x2 - rx;
            rx = overlapL < overlapR ? b.x1 : b.x2;
        }
    }
    for (const b of boxes) {
        if (rx > b.x1 && rx < b.x2 && ry > b.y1 && ry < b.y2) {
            const overlapT = ry - b.y1, overlapB = b.y2 - ry;
            ry = overlapT < overlapB ? b.y1 : b.y2;
        }
    }
    for (const b of boxes) {
        if (rx > b.x1 && rx < b.x2 && ry > b.y1 && ry < b.y2) return [ox, oy];
    }
    return [rx, ry];
}

function clampToBuildings(ox, oy, nx, ny) { return sweepMove(ox, oy, nx, ny); }

// ── Guns ──────────────────────────────────────────────────────────────
const GUNS = [
    {id:'pistol',    name:'Pistol',          damage:10,  firerate:0.22, magSize:12,  reserve:48,  reloadTime:1.4, price:0,    color:'#aaa', desc:'Free starter sidearm',          barrelLen:80,  bodyW:10},
    {id:'revolver',  name:'Revolver',         damage:55,  firerate:0.55, magSize:6,   reserve:36,  reloadTime:2.0, price:400,  color:'#c8a', desc:'Hard-hitting 6-shooter',         barrelLen:100, bodyW:11},
    {id:'smg',       name:'SMG',              damage:14,  firerate:0.08, magSize:30,  reserve:120, reloadTime:1.5, price:300,  color:'#7bf', desc:'Fast fire, med damage',           barrelLen:95,  bodyW:12},
    {id:'assault',   name:'Assault Rifle',    damage:22,  firerate:0.12, magSize:30,  reserve:90,  reloadTime:1.8, price:600,  color:'#4d4', desc:'Balanced power & speed',          barrelLen:130, bodyW:14},
    {id:'burst',     name:'Burst Rifle',      damage:28,  firerate:0.07, magSize:45,  reserve:135, reloadTime:1.9, price:750,  color:'#8ef', desc:'3-round burst, high accuracy',   barrelLen:125, bodyW:13, burst:3, burstCooldown:0.45},
    {id:'shotgun',   name:'Shotgun',          damage:65,  firerate:0.75, magSize:8,   reserve:32,  reloadTime:2.2, price:800,  color:'#fa0', desc:'Massive close-range burst',       barrelLen:140, bodyW:18},
    {id:'dblshot',   name:'Dbl Shotgun',      damage:90,  firerate:1.1,  magSize:4,   reserve:24,  reloadTime:2.5, price:1100, color:'#f70', desc:'Two barrels, devastating',        barrelLen:145, bodyW:20, pellets:12, ammoPerShot:2},
    {id:'sniper',    name:'Sniper Rifle',      damage:120, firerate:1.2,  magSize:5,   reserve:20,  reloadTime:2.8, price:1200, color:'#f44', desc:'One-shot most enemies',           barrelLen:180, bodyW:12},
    {id:'lmg',       name:'LMG',              damage:20,  firerate:0.09, magSize:75,  reserve:225, reloadTime:3.2, price:1400, color:'#9c6', desc:'Sustained suppressive fire',      barrelLen:140, bodyW:18},
    {id:'carbine',   name:'Carbine',          damage:32,  firerate:0.14, magSize:20,  reserve:80,  reloadTime:1.6, price:950,  color:'#b9f', desc:'Compact & accurate AR',          barrelLen:110, bodyW:13},
    {id:'deagle',    name:'Desert Eagle',     damage:80,  firerate:0.4,  magSize:7,   reserve:35,  reloadTime:1.8, price:1000, color:'#fd8', desc:'Iconic heavy handgun',           barrelLen:105, bodyW:13},
    {id:'trpump',    name:'Tactical Pump',    damage:100, firerate:0.9,  magSize:6,   reserve:24,  reloadTime:2.6, price:1600, color:'#e84', desc:'Pump-action, brutal damage',     barrelLen:148, bodyW:19, pellets:8},
    {id:'railgun',   name:'Railgun',          damage:300, firerate:2.5,  magSize:3,   reserve:9,   reloadTime:3.5, price:2000, color:'#0ff', desc:'Instant kill, pierces all',      barrelLen:200, bodyW:10},
    {id:'minigun',   name:'Minigun',          damage:18,  firerate:0.05, magSize:100, reserve:200, reloadTime:3.5, price:2500, color:'#f8f', desc:'Insane rate of fire',             barrelLen:110, bodyW:22, spinup:1.2},
    {id:'launcher',  name:'Rocket Launcher',  damage:200, firerate:1.8,  magSize:4,   reserve:12,  reloadTime:3.0, price:3000, color:'#f64', desc:'Explosive splash damage',         barrelLen:160, bodyW:26},
    {id:'plasma',    name:'Plasma Cannon',    damage:80,  firerate:0.35, magSize:20,  reserve:60,  reloadTime:2.0, price:4000, color:'#0f8', desc:'Rapid plasma bursts',             barrelLen:150, bodyW:20, plasmaAoe:true},
    {id:'gauss',     name:'Gauss Rifle',      damage:180, firerate:0.9,  magSize:8,   reserve:24,  reloadTime:3.0, price:4500, color:'#f0f', desc:'Charged magnetic slug, pierces',  barrelLen:190, bodyW:14, pierce:true},
    {id:'antimatter',name:'Antimatter Gun',   damage:500, firerate:4.0,  magSize:2,   reserve:6,   reloadTime:5.0, price:7500, color:'#fff', desc:'Ultimate power. Annihilates all', barrelLen:210, bodyW:16, antimatterAoe:true},
];
let equippedGunId='pistol', ownedGuns=new Set(['pistol']), coins=0;
let shopPage=0;
const GUNS_PER_PAGE=6;
function getGun(id){return GUNS.find(g=>g.id===id);}
function equippedGun(){return getGun(equippedGunId);}

// ── State ─────────────────────────────────────────────────────────────
const player={x:0,y:0,angle:0,pitch:0,fov:Math.PI/2.4,health:100,speed:5.5};
let zombies=[],bullets=[],particles=[],drops=[];
let score=0,kills=0,wave=1;
let mag=12,maxMag=12,reserve=48;
let reloading=false,reloadTimer=0;
let shootCooldown=0,muzzleFlash=0;
let shooting=false,locked=false,gameActive=false,shopOpen=false;
let bobTime=0,waveTimer=0;
let coinDouble=false,coinDoubleTimer=0;
const COIN_DOUBLE_DURATION=20;
let jumpVel=0,jumpZ=0;
const GRAVITY=12, JUMP_FORCE=10;
let sensitivity=1.0, vSensitivity=1.0;
let settingsOpen=false;
const keys={};
let minigunSpinup=0;
let scoped=false, scopeZoom=1, scopeTargetZoom=1;
let regenBoostTimer=0;
let lastDamageTime=0;

window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase(); keys[k]=true;
    if(e.key==='Tab'){e.preventDefault();if(gameActive)toggleSettings();}
    if(k==='r'&&gameActive&&!shopOpen&&!settingsOpen) startReload();
    if(k==='b'&&gameActive&&!settingsOpen) toggleShop();
    if(k===' '&&gameActive&&!shopOpen&&!settingsOpen&&jumpVel===0){jumpVel=JUMP_FORCE;sndJump();}
});
window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
c.addEventListener('click',()=>{if(gameActive&&!shopOpen)c.requestPointerLock();});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===c;});
document.addEventListener('mousemove',e=>{
    if(!gameActive||shopOpen||settingsOpen)return;
    if(locked){
        const scopeSensMult=scoped?0.25:1;
        player.angle+=e.movementX*0.003*sensitivity*scopeSensMult;
        player.pitch-=e.movementY*0.005*vSensitivity*scopeSensMult;
    }else if(e.buttons===1) player.angle+=e.movementX*0.008*sensitivity;
});
c.addEventListener('mousedown',e=>{
    if(e.button===2){
        if(gameActive&&locked&&!shopOpen&&equippedGunId==='sniper'){
            scoped=!scoped;
            scopeTargetZoom=scoped?3.5:1;
            if(scoped){ beep(900,0.04,'sine',0.04); setTimeout(()=>beep(1200,0.06,'sine',0.05),40); }
            else       { beep(600,0.05,'sine',0.04); }
        }
        return;
    }
    shooting=true;if(gameActive&&locked&&!shopOpen)tryShoot();
});
c.addEventListener('mouseup',e=>{if(e.button!==2)shooting=false;});
c.addEventListener('contextmenu',e=>e.preventDefault());

// ── Settings ──────────────────────────────────────────────────────────
function toggleSettings(){settingsOpen?closeSettings():openSettings();}
function openSettings(){settingsOpen=true;if(locked)document.exitPointerLock();document.getElementById('settings').style.display='block';}
function closeSettings(){settingsOpen=false;document.getElementById('settings').style.display='none';if(gameActive)c.requestPointerLock();}

// ── Shop ──────────────────────────────────────────────────────────────
function toggleShop(){shopOpen?closeShop():openShop();}
function openShop(){shopOpen=true;shopPage=0;if(locked)document.exitPointerLock();renderShop();shopEl.style.display='block';}
function closeShop(){shopOpen=false;shopEl.style.display='none';if(gameActive)c.requestPointerLock();}

function renderShop(){
    document.getElementById('coins').textContent=coins;
    const totalPages=Math.ceil(GUNS.length/GUNS_PER_PAGE);
    shopPage=Math.max(0,Math.min(shopPage,totalPages-1));
    document.getElementById('shopPageLabel').textContent=`Page ${shopPage+1} / ${totalPages}`;
    document.getElementById('shopPrev').disabled=shopPage===0;
    document.getElementById('shopNext').disabled=shopPage===totalPages-1;

    const gun=equippedGun();
    const ammoFull=reserve>=gun.reserve;
    const ammoCost=Math.max(50, Math.round(gun.price*0.08 + 80));
    const hpFull=player.health>=100;

    const supplies=[
        {id:'ammo',      icon:'🔫', name:'Ammo Refill',    desc:`Fill reserve for ${gun.name}<br><span style="color:#888">${reserve}/${gun.reserve} remaining</span>`, price:ammoCost, disabled:ammoFull||coins<ammoCost, disabledReason:ammoFull?'FULL':null, cls:''},
        {id:'medsmall',  icon:'💊', name:'Med Kit (25HP)', desc:'Restore 25 health points',    price:150, disabled:hpFull||coins<150,  disabledReason:hpFull?'FULL':null, cls:'health-card'},
        {id:'medlarge',  icon:'❤️', name:'Full Heal',      desc:'Fully restore all health',    price:400, disabled:hpFull||coins<400,  disabledReason:hpFull?'FULL':null, cls:'health-card'},
        {id:'regenboost',icon:'✨', name:'Regen Boost',    desc:'Triple regen rate for 30s',   price:300, disabled:coins<300,          disabledReason:null,               cls:'health-card'},
    ];

    const bar=document.getElementById('suppliesBar'); bar.innerHTML='';
    for(const s of supplies){
        const card=document.createElement('div');
        card.className='supply-card '+s.cls+(s.disabled?' cant-afford':'');
        card.innerHTML=`<span class="supply-icon">${s.icon}</span>
            <div class="supply-name">${s.disabledReason?`<span style="color:#555">${s.disabledReason}</span>`:s.name}</div>
            <div class="supply-desc">${s.desc}</div>
            <div class="supply-price">${s.disabled&&s.disabledReason?'—':'💰 '+s.price}</div>`;
        if(!s.disabled) card.addEventListener('click',()=>buySupply(s.id, s.price, ammoCost));
        else if(!s.disabledReason) card.addEventListener('click',()=>sndCantAfford());
        bar.appendChild(card);
    }

    const grid=document.getElementById('gunGrid'); grid.innerHTML='';
    const sortedGuns=[...GUNS].sort((a,b)=>a.price-b.price);
    const pageGuns=sortedGuns.slice(shopPage*GUNS_PER_PAGE,(shopPage+1)*GUNS_PER_PAGE);
    for(const gun of pageGuns){
        const owned=ownedGuns.has(gun.id),equipped=equippedGunId===gun.id,canAfford=coins>=gun.price;
        const card=document.createElement('div');
        card.className='gun-card'+(owned?' owned':'')+(equipped?' equipped':'');
        const badge=equipped?`<span class="gun-badge badge-equipped">EQUIPPED</span>`
                   :owned?`<span class="gun-badge badge-owned">OWNED</span>`
                   :`<span class="gun-badge badge-locked">${canAfford?'BUY':'LOCKED'}</span>`;
        card.innerHTML=`${badge}<div class="gun-name">${gun.name}</div>
            <div class="gun-stats">DMG:${gun.damage} | RPM:${Math.round(60/gun.firerate)}<br>
            MAG:${gun.magSize} | Reload:${gun.reloadTime}s<br>
            <span style="color:#aaa">${gun.desc}</span></div>
            <div class="gun-price">${gun.price===0?'Free':'💰 '+gun.price}</div>`;
        card.addEventListener('click',()=>{
            if(equipped)return;
            if(owned)equipGun(gun.id);
            else if(canAfford)buyGun(gun.id);
            else sndCantAfford();
        });
        grid.appendChild(card);
    }
}

function shopPageChange(dir){shopPage+=dir;renderShop();}

function buySupply(id, price, ammoCost){
    if(coins<price){sndCantAfford();return;}
    coins-=price;
    document.getElementById('coins').textContent=coins;
    if(id==='ammo'){
        const g=equippedGun(); reserve=g.reserve; updateAmmoUI(); sndPickup();
    } else if(id==='medsmall'){
        player.health=Math.min(100,player.health+25);
        document.getElementById('health').textContent=Math.floor(player.health);
        sndPickup();
        dmgFlash.style.background='rgba(0,200,80,0.3)'; dmgFlash.style.opacity='1';
        setTimeout(()=>{dmgFlash.style.opacity='0';setTimeout(()=>{dmgFlash.style.background='rgba(200,0,0,0.35)';},200);},300);
    } else if(id==='medlarge'){
        player.health=100;
        document.getElementById('health').textContent=100;
        sndBuyGun();
        dmgFlash.style.background='rgba(0,200,80,0.4)'; dmgFlash.style.opacity='1';
        setTimeout(()=>{dmgFlash.style.opacity='0';setTimeout(()=>{dmgFlash.style.background='rgba(200,0,0,0.35)';},300);},500);
    } else if(id==='regenboost'){
        regenBoostTimer=30; sndBuyGun();
    }
    renderShop();
}

function buyGun(id){const g=getGun(id);if(coins<g.price)return;coins-=g.price;ownedGuns.add(id);sndBuyGun();equipGun(id);}
function equipGun(id){equippedGunId=id;const g=getGun(id);maxMag=g.magSize;mag=g.magSize;reserve=g.reserve;reloading=false;shootCooldown=0;burstCount=0;burstCooldown=0;minigunSpinup=0;scoped=false;scopeTargetZoom=1;scopeZoom=1;updateAmmoUI();updateGunNameUI();sndEquipGun();renderShop();}
function updateGunNameUI(){document.getElementById('gunName').textContent='[ '+equippedGun().name+' ]';}

// ── Audio Engine ──────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _actx = null;
function getACtx() {
    if (!_actx) _actx = new AudioCtx();
    if (_actx.state === 'suspended') _actx.resume();
    return _actx;
}
function masterGain() {
    const a = getACtx();
    if (!masterGain._node) {
        masterGain._node = a.createGain();
        masterGain._node.gain.value = 0.7;
        masterGain._node.connect(a.destination);
    }
    return masterGain._node;
}

// ── Background Music ──────────────────────────────────────────────────
const music = {
    playing: false, nodes: [], gainNode: null,
    scheduleAhead: 0.3, nextNoteTime: 0,
    melodyStep: 0, chordStep: 0, pulseStep: 0, intervalId: null,
};

const SCALE_FREQS = [
    36.71,38.89,43.65,49.00,55.00,58.27,65.41,73.42,
    77.78,87.31,98.00,110.00,116.54,130.81,146.83,155.56,174.61,
];

const CHORDS = [
    [0,4,6,9],[2,6,9,13],[1,4,8,11],[6,9,13,16],[0,3,6,9],[4,8,11,14],
];

const MELODY = [14,13,12,null,16,14,null,13,null,12,14,null,11,null,13,null,
                null,14,12,null,16,null,14,13,null,null,11,14,null,13,12,null];

function musicNote(freq, startTime, dur, vol, type='sine', detune=0) {
    try {
        const a=getACtx(), o=a.createOscillator(), g=a.createGain();
        o.type=type; o.frequency.value=freq; o.detune.value=detune;
        g.gain.setValueAtTime(0,startTime);
        g.gain.linearRampToValueAtTime(vol,startTime+Math.min(0.4,dur*0.2));
        g.gain.setValueAtTime(vol,startTime+dur*0.6);
        g.gain.exponentialRampToValueAtTime(0.0001,startTime+dur);
        o.connect(g); g.connect(music.gainNode);
        o.start(startTime); o.stop(startTime+dur+0.05);
        music.nodes.push(o,g);
    } catch(e){}
}

function musicNoise(startTime, dur, filterFreq, vol) {
    try {
        const a=getACtx();
        const bufSize=Math.ceil(a.sampleRate*dur);
        const buf=a.createBuffer(1,bufSize,a.sampleRate);
        const data=buf.getChannelData(0);
        for(let i=0;i<bufSize;i++) data[i]=Math.random()*2-1;
        const src=a.createBufferSource(); src.buffer=buf;
        const flt=a.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=filterFreq;
        const g=a.createGain();
        g.gain.setValueAtTime(0,startTime);
        g.gain.linearRampToValueAtTime(vol,startTime+0.3);
        g.gain.exponentialRampToValueAtTime(0.0001,startTime+dur);
        src.connect(flt); flt.connect(g); g.connect(music.gainNode);
        src.start(startTime); src.stop(startTime+dur);
        music.nodes.push(src,g);
    } catch(e){}
}

function scheduleMusicEvents() {
    const a=getACtx(), now=a.currentTime;
    music.nodes=music.nodes.filter(()=>true);
    while(music.nextNoteTime < now+music.scheduleAhead+2.0){
        const t=music.nextNoteTime, step=music.pulseStep;
        if(step%16===0){
            const chord=CHORDS[music.chordStep%CHORDS.length]; music.chordStep++;
            const dur=16*0.55;
            for(const idx of chord){
                const f=SCALE_FREQS[idx];
                musicNote(f,t,dur,0.045,'sine');
                musicNote(f,t,dur,0.02,'triangle',8);
            }
            musicNote(SCALE_FREQS[chord[0]]*0.5,t,dur,0.06,'sine');
        }
        if(step%4===0){ musicNoise(t,1.2,80,0.018); musicNote(SCALE_FREQS[0]*0.25,t,0.5,0.05,'sine'); }
        const melNote=MELODY[step%MELODY.length];
        if(melNote!==null){
            const f=SCALE_FREQS[melNote];
            musicNote(f,t,0.45,0.03,'sine');
            musicNote(f*2,t,0.3,0.008,'sine',5);
            if(Math.random()<0.3) musicNote(f*4,t+0.05,0.25,0.005,'sine');
        }
        if(step%8===0&&Math.random()<0.6) musicNote(SCALE_FREQS[6+Math.floor(Math.random()*5)]*4,t,1.8,0.006,'sine');
        music.pulseStep++;
        music.nextNoteTime+=0.55;
    }
}

function startMusic() {
    if(music.playing) return;
    try {
        const a=getACtx();
        music.gainNode=a.createGain();
        music.gainNode.gain.setValueAtTime(0,a.currentTime);
        music.gainNode.gain.linearRampToValueAtTime(0.85,a.currentTime+4.0);
        music.gainNode.connect(masterGain());
        music.playing=true; music.nextNoteTime=a.currentTime+0.1;
        music.pulseStep=0; music.chordStep=0; music.melodyStep=0; music.nodes=[];
        music.intervalId=setInterval(scheduleMusicEvents,200);
    } catch(e){}
}

function stopMusic() {
    if(!music.playing) return;
    try {
        const a=getACtx();
        music.gainNode.gain.linearRampToValueAtTime(0,a.currentTime+2.0);
        setTimeout(()=>{ try{music.gainNode.disconnect();}catch(e){} music.nodes=[]; },2500);
        clearInterval(music.intervalId); music.playing=false;
    } catch(e){}
}

function setMusicIntensity(level) {
    if(!music.playing||!music.gainNode) return;
    try {
        const a=getACtx(), target=0.5+level*0.5;
        music.gainNode.gain.linearRampToValueAtTime(target*0.85,a.currentTime+2.0);
    } catch(e){}
}

function beep(freq, dur, type='square', vol=0.08) {
    try {
        const a=getACtx(), t=a.currentTime;
        const o=a.createOscillator(), g=a.createGain();
        o.connect(g); g.connect(masterGain());
        o.type=type; o.frequency.value=freq;
        g.gain.setValueAtTime(vol,t);
        g.gain.exponentialRampToValueAtTime(0.001,t+dur);
        o.start(t); o.stop(t+dur);
    } catch(e){}
}

function noise(dur, vol, filterFreq=2000, filterQ=1) {
    try {
        const a=getACtx(), t=a.currentTime;
        const bufSize=a.sampleRate*dur;
        const buf=a.createBuffer(1,bufSize,a.sampleRate);
        const data=buf.getChannelData(0);
        for(let i=0;i<bufSize;i++) data[i]=Math.random()*2-1;
        const src=a.createBufferSource(); src.buffer=buf;
        const flt=a.createBiquadFilter(); flt.type='bandpass'; flt.frequency.value=filterFreq; flt.Q.value=filterQ;
        const g=a.createGain();
        g.gain.setValueAtTime(vol,t);
        g.gain.exponentialRampToValueAtTime(0.001,t+dur);
        src.connect(flt); flt.connect(g); g.connect(masterGain());
        src.start(t); src.stop(t+dur);
    } catch(e){}
}

function boom(freq, dur, vol) {
    try {
        const a=getACtx(), t=a.currentTime;
        const o=a.createOscillator(), g=a.createGain();
        o.type='sine'; o.frequency.setValueAtTime(freq,t);
        o.frequency.exponentialRampToValueAtTime(20,t+dur*0.8);
        g.gain.setValueAtTime(vol,t);
        g.gain.exponentialRampToValueAtTime(0.001,t+dur);
        o.connect(g); g.connect(masterGain());
        o.start(t); o.stop(t+dur);
    } catch(e){}
}

// ── Gun Sounds ────────────────────────────────────────────────────────
function sndGunshot(gunId) {
    try {
        switch(gunId){
            case 'pistol':   noise(0.08,0.35,1800,0.8); boom(200,0.12,0.25); break;
            case 'revolver': noise(0.12,0.55,900,0.6);  boom(120,0.2,0.45);  break;
            case 'deagle':   noise(0.14,0.6,800,0.5);   boom(100,0.22,0.5);  break;
            case 'smg':      noise(0.055,0.28,2200,1.0); boom(280,0.07,0.18); break;
            case 'assault':  noise(0.09,0.38,1500,0.7); boom(160,0.1,0.3);   break;
            case 'carbine':  noise(0.09,0.36,1600,0.75);boom(170,0.1,0.28);  break;
            case 'burst':    noise(0.08,0.35,1700,0.8); boom(180,0.09,0.28); break;
            case 'lmg':      noise(0.07,0.4,1400,0.6);  boom(140,0.12,0.32); break;
            case 'shotgun':
            case 'trpump':   noise(0.18,0.75,500,0.3);  boom(80,0.3,0.6);    break;
            case 'dblshot':  noise(0.2,0.85,400,0.25);  boom(70,0.35,0.7);   break;
            case 'sniper':   noise(0.25,0.5,600,0.4);   boom(60,0.5,0.8);    beep(3000,0.05,'sine',0.04); break;
            case 'railgun': {
                const a=getACtx(), t=a.currentTime;
                const o=a.createOscillator(), g=a.createGain();
                o.type='sawtooth'; o.frequency.setValueAtTime(4000,t); o.frequency.exponentialRampToValueAtTime(100,t+0.4);
                g.gain.setValueAtTime(0.4,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.4);
                o.connect(g); g.connect(masterGain()); o.start(t); o.stop(t+0.4);
                noise(0.15,0.2,8000,2); break;
            }
            case 'minigun':  noise(0.04,0.3,2000,1.2);  boom(300,0.05,0.15); break;
            case 'launcher': noise(0.2,0.6,300,0.2);    boom(55,0.5,0.9);    break;
            case 'plasma': {
                const a=getACtx(), t=a.currentTime;
                const o=a.createOscillator(), g=a.createGain();
                o.type='sine'; o.frequency.setValueAtTime(1200,t); o.frequency.exponentialRampToValueAtTime(300,t+0.15);
                g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
                o.connect(g); g.connect(masterGain()); o.start(t); o.stop(t+0.15);
                noise(0.08,0.15,5000,3); break;
            }
            case 'gauss': {
                const a=getACtx(), t=a.currentTime;
                const o=a.createOscillator(), g=a.createGain();
                o.type='sawtooth'; o.frequency.setValueAtTime(6000,t); o.frequency.exponentialRampToValueAtTime(40,t+0.5);
                g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.5);
                o.connect(g); g.connect(masterGain()); o.start(t); o.stop(t+0.5);
                boom(40,0.4,0.7); break;
            }
            case 'antimatter': {
                const a=getACtx(), t=a.currentTime;
                boom(30,0.8,1.0); noise(0.3,0.6,200,0.1);
                const o=a.createOscillator(), g=a.createGain();
                o.type='sine'; o.frequency.setValueAtTime(8000,t); o.frequency.exponentialRampToValueAtTime(30,t+0.7);
                g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.7);
                o.connect(g); g.connect(masterGain()); o.start(t); o.stop(t+0.7); break;
            }
            default: noise(0.09,0.35,1600,0.8); boom(180,0.1,0.28);
        }
    } catch(e){}
}

function sndReloadStart() { beep(380,0.07,'square',0.04); setTimeout(()=>beep(320,0.06,'square',0.03),80); }
function sndReloadDone()  { beep(500,0.08,'sine',0.06);   setTimeout(()=>beep(650,0.1,'sine',0.07),90); }
function sndDryFire()     { beep(120,0.05,'square',0.06); }
function sndPlayerHit()   { noise(0.12,0.4,300,0.5); beep(80,0.15,'sine',0.12); }
function sndZombieKill()  { noise(0.1,0.3,400,0.4);  boom(150,0.15,0.2); }
function sndBossKill()    { boom(60,0.6,0.5); setTimeout(()=>boom(90,0.4,0.35),200); setTimeout(()=>beep(440,0.3,'sine',0.15),450); setTimeout(()=>beep(550,0.3,'sine',0.12),600); }
function sndExplosion()   { noise(0.5,0.8,200,0.2); boom(50,0.6,0.9); setTimeout(()=>noise(0.3,0.4,600,0.3),80); }
function sndWaveStart()   { beep(220,0.15,'sine',0.1); setTimeout(()=>beep(330,0.15,'sine',0.1),180); setTimeout(()=>beep(440,0.2,'sine',0.12),360); }
function sndPickup()      { beep(660,0.08,'sine',0.09); setTimeout(()=>beep(880,0.12,'sine',0.1),80); }
function sndNuke()        { boom(40,0.8,0.9); noise(0.6,0.7,150,0.15); setTimeout(()=>{boom(60,0.5,0.5);noise(0.4,0.4,400,0.2);},200); }
function sndBuyGun()      { beep(440,0.08,'sine',0.07); setTimeout(()=>beep(550,0.08,'sine',0.07),80); setTimeout(()=>beep(660,0.12,'sine',0.09),160); }
function sndEquipGun()    { beep(330,0.07,'sine',0.06); setTimeout(()=>beep(440,0.1,'sine',0.07),80); }
function sndCantAfford()  { beep(120,0.08,'square',0.06); setTimeout(()=>beep(100,0.1,'square',0.05),90); }
function sndJump()        { beep(200,0.06,'sine',0.05); setTimeout(()=>beep(280,0.05,'sine',0.04),50); }
function sndLand()        { noise(0.06,0.2,400,0.8); }
function sndGameOver()    { beep(440,0.3,'sine',0.12); setTimeout(()=>beep(330,0.3,'sine',0.1),320); setTimeout(()=>beep(220,0.5,'sine',0.09),640); setTimeout(()=>beep(110,0.8,'sine',0.08),960); }
function sndRareAlert()   { beep(880,0.1,'square',0.05); setTimeout(()=>beep(660,0.1,'square',0.06),120); setTimeout(()=>beep(880,0.15,'square',0.07),240); }

let zombieGrowlTimer=0;
function maybeZombieGrowl(dt) {
    zombieGrowlTimer-=dt;
    if(zombieGrowlTimer<=0&&zombies.length>0){
        zombieGrowlTimer=2.5+Math.random()*3;
        try {
            const a=getACtx(), t=a.currentTime;
            const o=a.createOscillator(), g=a.createGain();
            o.type='sawtooth';
            const bf=55+Math.random()*40;
            o.frequency.setValueAtTime(bf,t); o.frequency.setValueAtTime(bf*0.7,t+0.15); o.frequency.setValueAtTime(bf*1.1,t+0.3);
            g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.07,t+0.1); g.gain.exponentialRampToValueAtTime(0.001,t+0.6);
            o.connect(g); g.connect(masterGain()); o.start(t); o.stop(t+0.6);
        } catch(e){}
    }
}

// ── Rare Zombie Types ─────────────────────────────────────────────────
const RARE_ZOMBIES = [
    {id:'shadow',    name:'SHADOW',    chance:1/500, hp:80,   speed:4.2, bodyColor:'#0a0a1a', headColor:'#111133', armColor:'#050510', legColor:'#080820', eyeColor:'#aa00ff', eyeGlow:'#6600cc', label:'☠ SHADOW',    labelColor:'#aa00ff', coinBonus:200, scoreBonus:500,  desc:'Extremely fast, near invisible'},
    {id:'titan',     name:'TITAN',     chance:1/500, hp:600,  speed:0.7, bodyColor:'#4a3010', headColor:'#6a4418', armColor:'#2a1a08', legColor:'#3a2010', eyeColor:'#ffdd00', eyeGlow:'#ffaa00', label:'⚡ TITAN',     labelColor:'#ffdd00', coinBonus:300, scoreBonus:800,  desc:'Massive HP, slow but devastating'},
    {id:'phantom',   name:'PHANTOM',   chance:1/500, hp:120,  speed:2.2, bodyColor:'#1a3a1a', headColor:'#0a5a0a', armColor:'#0a2a0a', legColor:'#0a1a0a', eyeColor:'#00ff88', eyeGlow:'#00cc66', label:'👻 PHANTOM',   labelColor:'#00ff88', coinBonus:250, scoreBonus:600,  desc:'Heals nearby zombies'},
    {id:'berserker', name:'BERSERKER', chance:1/500, hp:200,  speed:1.8, bodyColor:'#6a0a00', headColor:'#8a1500', armColor:'#3a0500', legColor:'#2a0400', eyeColor:'#ff4400', eyeGlow:'#ff2200', label:'🔥 BERSERKER', labelColor:'#ff4400', coinBonus:280, scoreBonus:700,  desc:'Gets faster as HP drops'},
    {id:'wraith',    name:'WRAITH',    chance:1/500, hp:90,   speed:2.8, bodyColor:'#050520', headColor:'#0a0a3a', armColor:'#020210', legColor:'#030318', eyeColor:'#4488ff', eyeGlow:'#2255cc', label:'💀 WRAITH',    labelColor:'#4488ff', coinBonus:220, scoreBonus:550,  desc:'Phases through walls'},
    {id:'colossus',  name:'COLOSSUS',  chance:1/500, hp:1200, speed:0.4, bodyColor:'#3a2a3a', headColor:'#5a3a5a', armColor:'#1a101a', legColor:'#2a1a2a', eyeColor:'#ff00ff', eyeGlow:'#cc00cc', label:'💜 COLOSSUS',  labelColor:'#ff00ff', coinBonus:600, scoreBonus:1500, desc:'Enormous HP, huge coin reward'},
    {id:'plague',    name:'PLAGUE',    chance:1/500, hp:150,  speed:1.5, bodyColor:'#2a4a00', headColor:'#3a6000', armColor:'#1a2a00', legColor:'#182200', eyeColor:'#aaff00', eyeGlow:'#88cc00', label:'☣ PLAGUE',    labelColor:'#aaff00', coinBonus:240, scoreBonus:650,  desc:'Leaves a damaging poison trail'},
];

let texturesBuilt=false;

function startGame(){
    if(!texturesBuilt){buildTextures();texturesBuilt=true;}
    player.x=0;player.y=0;player.angle=0;player.pitch=0;player.health=100;
    zombies=[];bullets=[];particles=[];drops=[];
    score=0;kills=0;wave=1;coins=0;
    equippedGunId='pistol';ownedGuns=new Set(['pistol']);
    const g=equippedGun();maxMag=g.magSize;mag=maxMag;reserve=g.reserve;
    reloading=false;shootCooldown=0;muzzleFlash=0;jumpZ=0;jumpVel=0;
    coinDouble=false;coinDoubleTimer=0;burstCount=0;burstCooldown=0;
    minigunSpinup=0;regenBoostTimer=0;lastDamageTime=-99;
    overlay.style.display='none';shopEl.style.display='none';shopOpen=false;
    gameActive=true;updateAmmoUI();updateGunNameUI();spawnWave();sndWaveStart();startMusic();c.requestPointerLock();
}

function spawnZombieAt(hp, speed, boss=false, rare=null, crawler=false){
    let zx,zy,tries=0;
    do {
        const side=Math.floor(Math.random()*4);
        if(side===0){zx=(Math.random()-.5)*ROOM*2;zy=-ROOM+0.8;}
        else if(side===1){zx=ROOM-0.8;zy=(Math.random()-.5)*ROOM*2;}
        else if(side===2){zx=(Math.random()-.5)*ROOM*2;zy=ROOM-0.8;}
        else{zx=-ROOM+0.8;zy=(Math.random()-.5)*ROOM*2;}
        tries++;
    } while((Math.hypot(zx-player.x,zy-player.y)<4||insideBuilding(zx,zy))&&tries<80);
    zombies.push({x:zx,y:zy,health:hp,maxHp:hp,speed,angle:0,walkCycle:Math.random()*Math.PI*2,boss,rare,crawler});
}

function spawnWave(){
    const count=10+Math.floor((wave-1)/2)*2;
    const hp=10+Math.floor((wave-1)/4)*5;
    for(let i=0;i<count;i++){
        if(Math.random()<0.2) spawnZombieAt(15+wave*2, 3.5+wave*0.1, false, null, false);
        else spawnZombieAt(hp, 1.2+wave*0.12, false);
    }
    if(wave%5===0){ const bossNum=wave/5; spawnZombieAt(250*bossNum, 0.9+wave*0.05, true); }
    if(Math.random()<1/8){
        const crawlerCount=1+Math.floor(Math.random()*3);
        for(let i=0;i<crawlerCount;i++) spawnZombieAt(30+wave*3, 1.8+wave*0.08, false, null, true);
    }
    for(const rt of RARE_ZOMBIES){
        if(Math.random()<rt.chance){ spawnZombieAt(rt.hp, rt.speed, false, rt); showRareAlert(rt); }
    }
    if(wave%6===0){
        const rt=RARE_ZOMBIES[Math.floor(Math.random()*RARE_ZOMBIES.length)];
        spawnZombieAt(rt.hp*1.5, rt.speed, false, rt); showRareAlert(rt);
    }
}

let rareAlert=null, rareAlertTimer=0;
function showRareAlert(rt){rareAlert=rt;rareAlertTimer=4;sndRareAlert();}

function startReload(){const g=equippedGun();if(reloading||mag===maxMag||reserve===0)return;reloading=true;reloadTimer=g.reloadTime;minigunSpinup=0;scoped=false;scopeTargetZoom=1;sndReloadStart();}
let burstCount=0, burstTimer=0, burstCooldown=0;

function tryShoot(){
    const gun=equippedGun();
    if(shootCooldown>0||reloading||burstCooldown>0)return;
    if(mag<=0){startReload();return;}
    if(gun.spinup&&minigunSpinup<1)return;
    const ammoUsed=gun.ammoPerShot||1;
    if(mag<ammoUsed){startReload();return;}
    mag-=ammoUsed;
    shootCooldown=gun.firerate;
    muzzleFlash=0.12;
    sndGunshot(gun.id);

    const pellets=gun.pellets||(gun.id==='shotgun'?7:1);
    const spreadAmt=gun.id==='shotgun'||gun.id==='trpump'?0.22:gun.id==='dblshot'?0.28:gun.id==='plasma'?0.05:gun.id==='lmg'?0.04:gun.id==='smg'?0.03:0;
    for(let p=0;p<pellets;p++){
        const spread=(Math.random()-.5)*spreadAmt;
        const ba=player.angle+spread;
        const spd=gun.id==='launcher'?10:gun.id==='plasma'?28:22;
        bullets.push({x:player.x+Math.cos(ba)*0.5, y:player.y+Math.sin(ba)*0.5,
            vx:Math.cos(ba)*spd, vy:Math.sin(ba)*spd,
            life:gun.id==='launcher'?2:1.2, color:gun.color,
            type:gun.id==='launcher'?'rocket':gun.id==='railgun'||gun.id==='gauss'?'rail':'normal',
            damage:gun.damage, splash:gun.id==='launcher'?3:0});
    }

    if(gun.burst&&gun.burst>1&&burstCount===0){ burstCount=gun.burst-1; burstTimer=gun.firerate*1.1; }

    const bvx=Math.cos(player.angle), bvy=Math.sin(player.angle);

    if(gun.id==='launcher'){
        // handled on bullet expire
    } else if(gun.antimatterAoe){
        for(let zi=zombies.length-1;zi>=0;zi--){
            const z=zombies[zi];
            for(let k=0;k<25;k++) particles.push({x:z.x,y:z.y,vx:(Math.random()-.5)*10,vy:(Math.random()-.5)*10,life:1.2,color:'#fff'});
            killZombie(z);
        }
    } else if(gun.plasmaAoe){
        const coneHalf=0.35;
        for(let zi=zombies.length-1;zi>=0;zi--){
            const z=zombies[zi];
            const dx=z.x-player.x, dy=z.y-player.y;
            const proj=dx*bvx+dy*bvy;
            if(proj<0) continue;
            const dist=Math.hypot(dx,dy);
            if(Math.abs(dx*bvy-dy*bvx)/dist<coneHalf&&!rayHitsWall(player.x,player.y,z.x,z.y)){
                z.health-=gun.damage;
                for(let k=0;k<6;k++) particles.push({x:z.x,y:z.y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:0.5,color:'#0f8'});
                if(z.health<=0) killZombie(z);
            }
        }
    } else if(gun.id==='shotgun'||gun.id==='dblshot'||gun.id==='trpump'){
        const coneHalf=gun.id==='dblshot'?0.30:0.22;
        const maxDist=gun.id==='dblshot'?6:5;
        for(let zi=zombies.length-1;zi>=0;zi--){
            const z=zombies[zi];
            const dx=z.x-player.x, dy=z.y-player.y;
            const proj=dx*bvx+dy*bvy;
            if(proj<0||proj>maxDist) continue;
            const dist=Math.hypot(dx,dy);
            if(Math.abs(dx*bvy-dy*bvx)/dist<coneHalf&&!rayHitsWall(player.x,player.y,z.x,z.y)){
                const falloff=1-Math.min(0.8,dist*0.1);
                z.health-=gun.damage*falloff;
                for(let k=0;k<5;k++) particles.push({x:z.x,y:z.y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:0.4,color:'#c84'});
                if(z.health<=0) killZombie(z);
            }
        }
    } else if(gun.id==='railgun'||gun.pierce){
        const hitW=gun.id==='railgun'?0.4:0.3;
        const targets=zombies.filter(z=>{
            const dx=z.x-player.x, dy=z.y-player.y;
            return dx*bvx+dy*bvy>0&&Math.abs(dx*bvy-dy*bvx)<hitW;
        });
        for(const hit of targets){
            hit.health-=gun.damage;
            for(let k=0;k<10;k++) particles.push({x:hit.x,y:hit.y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,life:0.6,color:gun.id==='railgun'?'#0ff':'#f0f'});
            if(hit.health<=0) killZombie(hit);
        }
    } else {
        const hitW=gun.id==='sniper'?0.15:0.38;
        let hit=null, minD=Infinity;
        for(const z of zombies){
            const dx=z.x-player.x, dy=z.y-player.y, proj=dx*bvx+dy*bvy;
            if(proj<0) continue;
            if(Math.abs(dx*bvy-dy*bvx)<hitW&&proj<minD&&!rayHitsWall(player.x,player.y,z.x,z.y)){minD=proj;hit=z;}
        }
        if(hit){
            hit.health-=gun.damage;
            const hitCol=gun.id==='sniper'?'#f44':gun.id==='deagle'?'#fd8':'#4a0';
            for(let k=0;k<8;k++) particles.push({x:hit.x,y:hit.y,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:0.5,color:hitCol});
            if(hit.health<=0) killZombie(hit);
        }
    }
    updateAmmoUI();
}

function killZombie(z){
    zombies.splice(zombies.indexOf(z),1); kills++;
    const bonus=z.rare?z.rare.scoreBonus:0;
    const coinBonus=z.rare?z.rare.coinBonus:25;
    score+=100*wave+bonus;
    coins+=(coinDouble?2:1)*coinBonus;
    document.getElementById('coins').textContent=coins;
    if(z.boss) sndBossKill(); else sndZombieKill();
    const col=z.rare?z.rare.eyeColor:`hsl(${80+Math.random()*40},80%,35%)`;
    for(let k=0;k<20;k++) particles.push({x:z.x,y:z.y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,life:0.8,color:col});
    const roll=Math.random();
    if(roll<1/500) drops.push({x:z.x,y:z.y,type:'coincash',life:15});
    else if(roll<1/500+1/200) drops.push({x:z.x,y:z.y,type:'healthpack',life:12});
    else if(roll<1/500+1/200+1/50+1/30) drops.push({x:z.x,y:z.y,type:'nuke',life:12});
}

function rayHitsWall(x0,y0,x1,y1){
    const steps=30;
    for(let i=1;i<steps;i++){
        const t=i/steps;
        if(insideBuilding(x0+(x1-x0)*t, y0+(y1-y0)*t)) return true;
    }
    return false;
}

function flashDamage(){dmgFlash.style.opacity='1';setTimeout(()=>dmgFlash.style.opacity='0',150);}
function updateAmmoUI(){document.getElementById('ammoCount').textContent=mag;document.getElementById('ammoReserve').textContent=reserve;}

// ── Raycasting ────────────────────────────────────────────────────────
function castRay(angle){
    const rdx=Math.cos(angle), rdy=Math.sin(angle);
    let minT=Infinity, hitType=null, hitBuilding=null, hitAxis=null, hitCoord=0;
    const tR=(rdx>0)?(ROOM-player.x)/rdx:Infinity;
    const tL=(rdx<0)?(-ROOM-player.x)/rdx:Infinity;
    const tF=(rdy>0)?(ROOM-player.y)/rdy:Infinity;
    const tB=(rdy<0)?(-ROOM-player.y)/rdy:Infinity;
    const tWall=Math.min(tR,tL,tF,tB);
    if(tWall>0.1&&tWall<minT){
        minT=tWall; hitType='outer';
        if(tWall===tR||tWall===tL){hitAxis='x';hitCoord=player.y+rdy*minT;}
        else{hitAxis='y';hitCoord=player.x+rdx*minT;}
    }
    for(const b of BUILDINGS){
        const faces=[
            {t:rdx!==0?(b.x1-player.x)/rdx:Infinity, axis:'x', min:b.y1, max:b.y2},
            {t:rdx!==0?(b.x2-player.x)/rdx:Infinity, axis:'x', min:b.y1, max:b.y2},
            {t:rdy!==0?(b.y1-player.y)/rdy:Infinity, axis:'y', min:b.x1, max:b.x2},
            {t:rdy!==0?(b.y2-player.y)/rdy:Infinity, axis:'y', min:b.x1, max:b.x2},
        ];
        for(const f of faces){
            if(f.t<=0.05||f.t>=minT) continue;
            const hx=player.x+rdx*f.t, hy=player.y+rdy*f.t;
            if(f.axis==='x'&&hy>=f.min-0.01&&hy<=f.max+0.01){minT=f.t;hitType='building';hitBuilding=b;hitAxis='x';hitCoord=hy;}
            if(f.axis==='y'&&hx>=f.min-0.01&&hx<=f.max+0.01){minT=f.t;hitType='building';hitBuilding=b;hitAxis='y';hitCoord=hx;}
        }
    }
    if(!hitType) return null;
    const perp=minT*Math.cos(angle-player.angle);
    const sideBoost=hitAxis==='x'?1.0:0.75;
    return{height:h/perp*1.5, dist:minT, hitType, hitBuilding, hitAxis, wallX:hitCoord, sideBoost};
}

function project(wx,wy){
    const dx=wx-player.x, dy=wy-player.y;
    const dist=Math.hypot(dx,dy);
    let a=Math.atan2(dy,dx)-player.angle;
    while(a>Math.PI)  a-=2*Math.PI;
    while(a<-Math.PI) a+=2*Math.PI;
    const sx=(a/player.fov+0.5)*w;
    const scale=h/(dist||0.01);
    return{sx, dist, scale, inFov:Math.abs(a)<player.fov/2+0.35};
}

// ── Update ────────────────────────────────────────────────────────────
function update(dt){
    if(!gameActive||shopOpen||settingsOpen) return;
    bobTime+=dt;

    if(equippedGunId!=='sniper'&&scoped){scoped=false;scopeTargetZoom=1;}
    scopeZoom+=(scopeTargetZoom-scopeZoom)*Math.min(1,dt*12);
    player.fov=(Math.PI/2.4)/scopeZoom;

    const spd=player.speed*(scoped?0.35:1)*dt;
    let dx=0, dy=0;
    if(keys['w']){dx+=Math.cos(player.angle)*spd;dy+=Math.sin(player.angle)*spd;}
    if(keys['s']){dx-=Math.cos(player.angle)*spd;dy-=Math.sin(player.angle)*spd;}
    if(keys['d']){dx-=Math.sin(player.angle)*spd;dy+=Math.cos(player.angle)*spd;}
    if(keys['a']){dx+=Math.sin(player.angle)*spd;dy-=Math.cos(player.angle)*spd;}
    const[nx,ny]=clampToBuildings(player.x,player.y,player.x+dx,player.y+dy);
    player.x=nx; player.y=ny;

    if(jumpZ>0||jumpVel>0){
        jumpVel-=GRAVITY*dt;
        jumpZ=Math.max(0,jumpZ+jumpVel*dt);
        if(jumpZ<=0){jumpZ=0;if(jumpVel<-2)sndLand();jumpVel=0;}
    }

    if(shooting&&locked&&shootCooldown<=0&&!reloading&&burstCount===0&&burstCooldown<=0) tryShoot();

    const gun=equippedGun();
    if(gun.spinup){
        if(shooting&&locked&&!reloading){
            minigunSpinup=Math.min(1,minigunSpinup+dt/gun.spinup);
            if(minigunSpinup<1&&Math.random()<0.15) beep(200+minigunSpinup*300,0.05,'sawtooth',0.02);
        } else {
            minigunSpinup=Math.max(0,minigunSpinup-dt/(gun.spinup*0.6));
        }
    } else { minigunSpinup=1; }

    if(burstCount>0){
        burstTimer-=dt;
        if(burstTimer<=0&&shootCooldown<=0){
            burstCount--; burstTimer=gun.firerate*1.1;
            if(mag>0&&!reloading){
                mag--;muzzleFlash=0.12;shootCooldown=gun.firerate;
                sndGunshot(gun.id);
                const ba=player.angle+(Math.random()-.5)*0.03;
                bullets.push({x:player.x+Math.cos(ba)*0.5,y:player.y+Math.sin(ba)*0.5,
                    vx:Math.cos(ba)*22,vy:Math.sin(ba)*22,life:1.2,color:gun.color,
                    type:'normal',damage:gun.damage,splash:0});
                const bvx2=Math.cos(player.angle), bvy2=Math.sin(player.angle);
                let hit2=null, minD2=Infinity;
                for(const z of zombies){const dx2=z.x-player.x,dy2=z.y-player.y,proj=dx2*bvx2+dy2*bvy2;if(proj<0)continue;if(Math.abs(dx2*bvy2-dy2*bvx2)<0.38&&proj<minD2&&!rayHitsWall(player.x,player.y,z.x,z.y)){minD2=proj;hit2=z;}}
                if(hit2){hit2.health-=gun.damage;for(let k=0;k<6;k++)particles.push({x:hit2.x,y:hit2.y,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:0.5,color:'#8ef'});if(hit2.health<=0)killZombie(hit2);}
                updateAmmoUI();
            }
            if(burstCount===0) burstCooldown=gun.burstCooldown||0;
        }
    }
    burstCooldown=Math.max(0,burstCooldown-dt);
    shootCooldown=Math.max(0,shootCooldown-dt);
    muzzleFlash=Math.max(0,muzzleFlash-dt);

    if(reloading){
        reloadTimer-=dt;
        if(reloadTimer<=0){const need=maxMag-mag,take=Math.min(need,reserve);mag+=take;reserve-=take;reloading=false;sndReloadDone();updateAmmoUI();}
    }
    if(rareAlertTimer>0) rareAlertTimer-=dt;
    maybeZombieGrowl(dt);

    for(let i=zombies.length-1;i>=0;i--){
        const z=zombies[i];
        if(z.rare&&z.rare.id==='phantom'){
            for(const other of zombies){ if(other!==z&&Math.hypot(other.x-z.x,other.y-z.y)<3) other.health=Math.min(other.maxHp,other.health+5*dt); }
        }
        if(z.rare&&z.rare.id==='berserker'){ const hpFrac=z.health/z.maxHp; z.speed=z.rare.speed*(1+(1-hpFrac)*3.5); }
        if(z.rare&&z.rare.id==='plague'){
            if(!z.plagueTimer) z.plagueTimer=0;
            z.plagueTimer-=dt;
            if(z.plagueTimer<=0){ z.plagueTimer=0.4; drops.push({x:z.x,y:z.y,type:'poison',life:5}); }
        }
        const zdx=player.x-z.x, zdy=player.y-z.y, zdist=Math.hypot(zdx,zdy);
        z.angle=Math.atan2(zdy,zdx); z.walkCycle+=dt*4;
        if(zdist>0.55){
            const nx2=z.x+(zdx/zdist)*z.speed*dt, ny2=z.y+(zdy/zdist)*z.speed*dt;
            if(z.rare&&z.rare.id==='wraith'){
                z.x=Math.max(-ROOM+0.5,Math.min(ROOM-0.5,nx2));
                z.y=Math.max(-ROOM+0.5,Math.min(ROOM-0.5,ny2));
            } else {
                [z.x,z.y]=sweepMove(z.x,z.y,nx2,ny2);
            }
        } else {
            player.health-=12*dt; flashDamage(); lastDamageTime=bobTime;
            if(!player._hitSndThrottle||player._hitSndThrottle<=0){sndPlayerHit();player._hitSndThrottle=0.4;}
        }
    }

    for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
        const expired=b.life<=0||Math.abs(b.x)>=ROOM||Math.abs(b.y)>=ROOM||insideBuilding(b.x,b.y);
        if(expired){
            if(b.type==='rocket'){
                sndExplosion();
                for(let k=0;k<30;k++) particles.push({x:b.x,y:b.y,vx:(Math.random()-.5)*12,vy:(Math.random()-.5)*12,life:1.0,color:`hsl(${20+Math.random()*40},100%,55%)`});
                for(let zi=zombies.length-1;zi>=0;zi--){
                    const z=zombies[zi], d=Math.hypot(z.x-b.x,z.y-b.y);
                    if(d<b.splash){z.health-=b.damage*(1-d/b.splash);if(z.health<=0)killZombie(z);}
                }
            }
            bullets.splice(i,1);
        }
    }

    for(let i=particles.length-1;i>=0;i--){
        const p=particles[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; p.vx*=0.9; p.vy*=0.9;
        if(p.life<=0) particles.splice(i,1);
    }

    for(let i=drops.length-1;i>=0;i--){
        const d=drops[i]; d.life-=dt;
        if(d.life<=0){drops.splice(i,1);continue;}
        if(Math.hypot(player.x-d.x,player.y-d.y)<0.8){
            if(d.type==='healthpack'){
                player.health=Math.min(100,player.health+40);
                document.getElementById('health').textContent=Math.floor(player.health);
                lastDamageTime=-99; sndPickup();
                dmgFlash.style.background='rgba(0,200,80,0.3)'; dmgFlash.style.opacity='1';
                setTimeout(()=>{dmgFlash.style.opacity='0';setTimeout(()=>{dmgFlash.style.background='rgba(200,0,0,0.35)';},200);},300);
            } else if(d.type==='nuke'){
                score+=zombies.length*50*wave; kills+=zombies.length;
                for(const z of zombies) for(let k=0;k<12;k++) particles.push({x:z.x,y:z.y,vx:(Math.random()-.5)*8,vy:(Math.random()-.5)*8,life:0.9,color:`hsl(${30+Math.random()*30},100%,55%)`});
                zombies=[]; sndNuke();
            } else if(d.type==='coincash'){
                coinDouble=true; coinDoubleTimer=COIN_DOUBLE_DURATION; sndBuyGun();
            } else if(d.type==='poison'){
                player.health-=6*dt; flashDamage(); lastDamageTime=bobTime; continue;
            }
            drops.splice(i,1);
        }
    }

    if(coinDouble){coinDoubleTimer-=dt;if(coinDoubleTimer<=0){coinDouble=false;coinDoubleTimer=0;}}
    if(player._hitSndThrottle>0) player._hitSndThrottle-=dt;
    if(music.playing) setMusicIntensity(Math.min(1, zombies.length/20 + (wave-1)*0.04));

    if(zombies.length===0){
        if(!waveTimer) waveTimer=3;
        waveTimer-=dt;
        if(waveTimer<=0){waveTimer=0;wave++;reserve=Math.min(reserve+30,equippedGun().reserve*1.5|0);spawnWave();sndWaveStart();}
    } else waveTimer=0;

    if(regenBoostTimer>0) regenBoostTimer-=dt;
    const timeSinceDamage=bobTime-lastDamageTime;
    if(player.health>0&&player.health<100&&timeSinceDamage>4.0){
        player.health=Math.min(100, player.health + 1.5*(regenBoostTimer>0?3:1)*dt);
    }

    player.health=Math.max(0,player.health);
    document.getElementById('health').textContent=Math.floor(player.health);
    document.getElementById('score').textContent=score;
    document.getElementById('wave').textContent=wave;
    document.getElementById('kills').textContent=kills;

    const isRegen=player.health<100&&timeSinceDamage>4.0;
    document.getElementById('regenIndicator').style.display=isRegen?'inline':'none';
    const boostHud=document.getElementById('regenBoostHud');
    if(regenBoostTimer>0){boostHud.style.display='block';document.getElementById('regenBoostTime').textContent=Math.ceil(regenBoostTimer);}
    else boostHud.style.display='none';

    if(player.health<=0){
        gameActive=false; sndGameOver(); stopMusic();
        document.getElementById('overlayTitle').textContent='GAME OVER';
        document.getElementById('overlayMsg').textContent=`Score:${score} | Kills:${kills} | Wave:${wave}`;
        overlay.querySelector('button').textContent='▶ PLAY AGAIN';
        overlay.style.display='flex'; document.exitPointerLock();
    }
}

// ── Render ────────────────────────────────────────────────────────────
function draw(){
    ctx.clearRect(0,0,w,h);

    const jumpOffset=Math.min(h*0.45, jumpZ*h*0.045);
    const horizon=Math.max(1, Math.min(h-1, h/2-jumpOffset+player.pitch*h));

    // Sky
    ctx.fillStyle='#06060f'; ctx.fillRect(0,0,w,horizon);
    for(let i=0;i<50;i++){
        const sx=((i*2347+13)%w), sy=((i*1873+7)%Math.max(1,horizon*0.8));
        ctx.fillStyle=i%7===0?'rgba(255,255,200,0.8)':'rgba(255,255,255,0.5)';
        ctx.fillRect(sx,sy,i%7===0?2:1,1);
    }
    ctx.fillStyle='rgba(225,220,185,0.55)';
    ctx.beginPath(); ctx.arc(w*0.78,Math.max(20,horizon*0.2),w*0.017,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(5,5,14,0.95)';
    const silBuildings=[
        {x:0.04,w:0.07,h:0.12},{x:0.13,w:0.04,h:0.08},{x:0.20,w:0.05,h:0.16},
        {x:0.33,w:0.05,h:0.09},{x:0.40,w:0.07,h:0.06},{x:0.49,w:0.04,h:0.13},
        {x:0.57,w:0.05,h:0.08},{x:0.65,w:0.06,h:0.11},{x:0.73,w:0.04,h:0.07},
        {x:0.84,w:0.05,h:0.10},{x:0.91,w:0.04,h:0.15},{x:0.96,w:0.03,h:0.07},
    ];
    for(const s of silBuildings) ctx.fillRect(w*s.x, horizon-horizon*s.h, w*s.w, horizon*s.h);

    // Floor
    ctx.fillStyle='#2a2a2e'; ctx.fillRect(0,horizon,w,h-horizon);
    const rays=Math.floor(w/2);
    if(zBuf.length!==rays) zBuf=new Float32Array(rays);

    for(let i=0;i<rays;i++){
        const a=player.angle-player.fov/2+i*(player.fov/rays);
        const s=castRay(a);
        if(!s){zBuf[i]=999;continue;}
        zBuf[i]=s.dist;
        const wallH=Math.min(s.height,h*3);
        const wallTop=Math.max(0,(horizon-wallH/2)|0);
        const wallBot=Math.min(h-1,(horizon+wallH/2)|0);
        const screenX=i*2, colH=wallBot-wallTop;
        if(colH<=0) continue;
        const texName=s.hitType==='outer'?'brick':getBuildingTex(s.hitBuilding);
        const tex=TEXTURES[texName];
        const texU=((s.wallX%2)+2)%2;
        const texCol=Math.min((texU*TEX_SIZE*0.5)|0, TEX_SIZE-2);
        if(tex) ctx.drawImage(tex,texCol,0,2,TEX_SIZE,screenX,wallTop,2,colH);
        const fog=Math.max(0,s.dist/28);
        const side=s.sideBoost<1?0.32:0;
        const dark=Math.min(0.85,fog*0.7+side);
        if(dark>0.04){ ctx.fillStyle=`rgba(0,0,0,${dark.toFixed(2)})`; ctx.fillRect(screenX,wallTop,2,colH); }
        if(wallBot<h){
            const rb=(34+Math.max(0,1-s.dist/18)*18)|0;
            ctx.fillStyle=`rgb(${rb},${(rb*0.97)|0},${(rb*0.92)|0})`;
            ctx.fillRect(screenX,wallBot,2,h-wallBot);
        }
    }

    // Road lines
    ctx.save();
    ctx.strokeStyle='rgba(200,180,50,0.28)'; ctx.lineWidth=2; ctx.setLineDash([16,20]);
    ctx.beginPath(); ctx.moveTo(0,horizon+3); ctx.lineTo(w,horizon+3); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();

    // Street lamps
    const LAMPS=[{x:-7,y:-7},{x:7,y:-7},{x:-7,y:7},{x:7,y:7},{x:0,y:-7.5},{x:0,y:7.5},{x:-7.5,y:0},{x:7.5,y:0}];
    for(const lp of LAMPS){
        const p=project(lp.x,lp.y);
        if(!p.inFov||p.dist<0.5) continue;
        const col=Math.round(p.sx/(w/rays));
        if(col<0||col>=rays||p.dist>zBuf[col]+0.5) continue;
        const lampY=horizon-(h/p.dist)*0.08;
        const brightness=Math.max(0,1-p.dist/20);
        const dotR=Math.max(2,4*brightness);
        ctx.fillStyle=`rgba(255,230,120,${brightness*0.9})`;
        ctx.beginPath(); ctx.arc(p.sx,lampY,dotR,0,Math.PI*2); ctx.fill();
    }

    // Sprites
    const sprites=[];
    for(const z of zombies){const p=project(z.x,z.y);if(p.inFov&&p.dist>0.3)sprites.push({...p,type:'zombie',obj:z});}
    for(const b of bullets){const p=project(b.x,b.y);if(p.inFov&&p.dist>0.1)sprites.push({...p,type:'bullet',obj:b});}
    for(const pt of particles){const p=project(pt.x,pt.y);if(p.inFov&&p.dist>0.1)sprites.push({...p,type:'particle',obj:pt});}
    for(const d of drops){const p=project(d.x,d.y);if(p.inFov&&p.dist>0.1)sprites.push({...p,type:'drop',obj:d});}
    sprites.sort((a,b)=>b.dist-a.dist);

    for(const s of sprites){
        const spriteY=horizon;
        const spriteHalfW=Math.max(1,(s.scale*0.55)/2);
        const colStart=Math.max(0,((s.sx-spriteHalfW)/2)|0);
        const colEnd=Math.min(rays-1,((s.sx+spriteHalfW)/2)|0);
        let occluded=0, total=Math.max(1,colEnd-colStart+1);
        for(let col=colStart;col<=colEnd;col++){ if(zBuf[col]!==undefined&&s.dist>zBuf[col]+0.1) occluded++; }
        if(occluded/total>0.65) continue;

        ctx.save();
        if(s.type==='zombie'){
            const z=s.obj;
            const isRare=!!z.rare;
            const isRunner=!z.boss&&!isRare&&!z.crawler&&z.speed>3;
            const isCrawler=!!z.crawler;
            const baseScale=z.boss?1.7:isRare&&z.rare.id==='titan'?2.0:isRare&&z.rare.id==='colossus'?2.4:isRare&&z.rare.id==='shadow'?0.7:isRare&&z.rare.id==='wraith'?0.85:isCrawler?0.75:isRunner?0.8:0.9;
            const sH=Math.max(7,s.scale*baseScale), sW=sH*0.6;
            const screenTop=spriteY-sH*0.7;
            ctx.globalAlpha=Math.max(0.1,Math.min(isRare&&z.rare.id==='shadow'?0.45:isRare&&z.rare.id==='wraith'?0.6:1, 1-s.dist/25));
            ctx.translate(s.sx, isCrawler?spriteY+sH*0.15:screenTop+sH*0.7);

            const barW=sW*(z.boss?2.4:isRare?2.0:1.6), barH=z.boss?7:isRare?5:4;
            ctx.fillStyle='#300'; ctx.fillRect(-barW/2,-sH*(isCrawler?0.5:1.05),barW,barH);
            ctx.fillStyle=z.boss?'#ff6600':isRare?z.rare.eyeColor:isRunner?'#ff4400':'#0f0';
            ctx.fillRect(-barW/2,-sH*(isCrawler?0.5:1.05),barW*(z.health/z.maxHp),barH);

            if(z.boss){
                ctx.fillStyle='#fff'; ctx.font=`bold ${Math.max(8,sH*0.12)|0}px monospace`;
                ctx.textAlign='center'; ctx.fillText(`BOSS  ${Math.ceil(z.health)}/${z.maxHp}`,0,-sH*1.05-6);
            } else if(isRare){
                ctx.fillStyle=z.rare.labelColor; ctx.shadowColor=z.rare.eyeGlow; ctx.shadowBlur=12;
                ctx.font=`bold ${Math.max(8,sH*0.13)|0}px monospace`; ctx.textAlign='center';
                ctx.fillText(z.rare.label,0,-sH*1.05-6); ctx.shadowBlur=0;
            } else if(isRunner){
                ctx.fillStyle='#ff6600'; ctx.font=`bold ${Math.max(7,sH*0.11)|0}px monospace`;
                ctx.textAlign='center'; ctx.fillText('⚡ RUNNER',0,-sH*1.05-4);
            }

            const wob=Math.sin(z.walkCycle)*0.5;
            const r=sW*0.32, bodyR=sW*0.42;

            function drawFace(hx,hy,hr,eyeColor,eyeGlow,eyeR,mouthY,teethY,eyeSep){
                ctx.fillStyle='rgba(0,0,0,0.22)';
                ctx.beginPath();ctx.ellipse(hx-hr*0.42,hy+hr*0.03,hr*0.28,hr*0.2,0.5,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(hx+hr*0.42,hy+hr*0.03,hr*0.28,hr*0.2,-0.5,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=sW*0.02;
                ctx.beginPath();ctx.moveTo(hx-hr*0.3,hy-hr*0.55);ctx.quadraticCurveTo(hx,hy-hr*0.6,hx+hr*0.3,hy-hr*0.55);ctx.stroke();
                ctx.fillStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.arc(hx-hr*0.28,hy-hr*0.12,hr*0.35,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=sW*0.025;
                ctx.beginPath();ctx.moveTo(hx-hr*0.08,hy+hr*0.05);ctx.lineTo(hx-hr*0.13,hy+hr*0.2);ctx.lineTo(hx,hy+hr*0.22);ctx.lineTo(hx+hr*0.13,hy+hr*0.2);ctx.stroke();
                ctx.fillStyle='rgba(0,0,0,0.5)';
                ctx.beginPath();ctx.ellipse(hx-eyeSep,hy,hr*0.2,hr*0.14,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(hx+eyeSep,hy,hr*0.2,hr*0.14,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle=eyeColor;ctx.shadowColor=eyeGlow;ctx.shadowBlur=14;
                ctx.beginPath();ctx.arc(hx-eyeSep,hy,eyeR,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(hx+eyeSep,hy,eyeR,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                ctx.fillStyle='rgba(0,0,0,0.7)';
                ctx.beginPath();ctx.arc(hx-eyeSep,hy,eyeR*0.45,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(hx+eyeSep,hy,eyeR*0.45,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.6)';
                ctx.beginPath();ctx.arc(hx-eyeSep+eyeR*0.3,hy-eyeR*0.3,eyeR*0.25,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(hx+eyeSep+eyeR*0.3,hy-eyeR*0.3,eyeR*0.25,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#0a0000';ctx.lineWidth=sW*0.05;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(hx-hr*0.45,mouthY);ctx.quadraticCurveTo(hx,mouthY+hr*0.08,hx+hr*0.45,mouthY);ctx.stroke();
                ctx.fillStyle='#d8d0b0';
                for(let ti=0;ti<5;ti++){const tx=hx-hr*0.32+ti*hr*0.16,th=ti%2===0?sH*0.05:sH*0.035;ctx.beginPath();ctx.moveTo(tx-hr*0.06,teethY);ctx.lineTo(tx,teethY+th);ctx.lineTo(tx+hr*0.06,teethY);ctx.fill();}
                ctx.fillStyle='rgba(160,0,0,0.7)';
                ctx.beginPath();ctx.moveTo(hx+hr*0.05,mouthY+hr*0.04);ctx.lineTo(hx+hr*0.03,mouthY+hr*0.18);ctx.lineTo(hx+hr*0.08,mouthY+hr*0.18);ctx.closePath();ctx.fill();
                ctx.strokeStyle='rgba(160,0,0,0.6)';ctx.lineWidth=sW*0.025;
                ctx.beginPath();ctx.moveTo(hx+hr*0.05,hy+hr*0.2);ctx.lineTo(hx+hr*0.38,hy+hr*0.32);ctx.stroke();
            }

            if(isCrawler){
                ctx.save();ctx.scale(1,0.38);
                const legWob=Math.sin(z.walkCycle)*sH*0.08;
                ctx.strokeStyle='#0f2a0a';ctx.lineWidth=sW*0.18;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.2,sH*0.1);ctx.lineTo(-sW*0.55+legWob,sH*0.58);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.2,sH*0.1);ctx.lineTo(sW*0.55-legWob,sH*0.58);ctx.stroke();
                ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=sW*0.04;
                ctx.beginPath();ctx.moveTo(-sW*0.28,sH*0.3);ctx.lineTo(-sW*0.4,sH*0.45);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.28,sH*0.3);ctx.lineTo(sW*0.4,sH*0.45);ctx.stroke();
                const cBg=ctx.createRadialGradient(-bodyR*0.2,-bodyR*0.1,bodyR*0.05,0,0,bodyR*1.3);
                cBg.addColorStop(0,'#2a5a20');cBg.addColorStop(1,'#0d1f08');
                ctx.fillStyle=cBg;ctx.beginPath();ctx.ellipse(0,0,bodyR*1.5,bodyR*0.55,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=sW*0.025;
                ctx.beginPath();ctx.moveTo(-bodyR*0.3,-bodyR*0.1);ctx.lineTo(-bodyR*0.1,bodyR*0.2);ctx.stroke();
                ctx.fillStyle='rgba(120,0,0,0.55)';ctx.beginPath();ctx.ellipse(bodyR*0.2,bodyR*0.05,bodyR*0.28,bodyR*0.12,-0.3,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#0a1a05';ctx.lineWidth=sW*0.09;
                ctx.beginPath();ctx.moveTo(-bodyR*0.75,-sH*0.05);ctx.lineTo(-sW*(0.95+wob*0.2),-sH*(0.32+wob*0.1));ctx.stroke();
                ctx.beginPath();ctx.moveTo(bodyR*0.75,-sH*0.05);ctx.lineTo(sW*(0.95-wob*0.2),-sH*(0.32-wob*0.1));ctx.stroke();
                ctx.strokeStyle='#0a0f05';ctx.lineWidth=sW*0.03;
                for(let ci=0;ci<3;ci++){const ca=-0.3+ci*0.3;
                    ctx.beginPath();ctx.moveTo(-sW*(0.95+wob*0.2),-sH*(0.32+wob*0.1));ctx.lineTo(-sW*(0.95+wob*0.2)+Math.cos(ca+2)*sW*0.12,-sH*(0.32+wob*0.1)+Math.sin(ca+2)*sW*0.12);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(sW*(0.95-wob*0.2),-sH*(0.32-wob*0.1));ctx.lineTo(sW*(0.95-wob*0.2)+Math.cos(Math.PI-ca+1)*sW*0.12,-sH*(0.32-wob*0.1)+Math.sin(Math.PI-ca+1)*sW*0.12);ctx.stroke();
                }
                const chg=ctx.createRadialGradient(-r*0.2,-sH*0.38,r*0.05,0,-sH*0.36,r*1.4);
                chg.addColorStop(0,'#3a5a28');chg.addColorStop(1,'#152010');
                ctx.fillStyle=chg;ctx.beginPath();ctx.ellipse(0,-sH*0.36,r*1.35,r*0.65,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(0,0,0,0.5)';
                ctx.beginPath();ctx.ellipse(-r*0.38,-sH*0.38,r*0.18,r*0.12,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(r*0.38,-sH*0.38,r*0.18,r*0.12,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#ff3300';ctx.shadowColor='#ff0000';ctx.shadowBlur=8;
                ctx.beginPath();ctx.arc(-r*0.38,-sH*0.38,r*0.1,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(r*0.38,-sH*0.38,r*0.1,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                ctx.strokeStyle='#1a0000';ctx.lineWidth=sW*0.04;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-r*0.5,-sH*0.27);ctx.lineTo(-r*0.1,-sH*0.23);ctx.lineTo(r*0.15,-sH*0.26);ctx.lineTo(r*0.45,-sH*0.22);ctx.stroke();
                ctx.fillStyle='#e8e0c8';
                for(let ti=0;ti<4;ti++){ctx.beginPath();ctx.moveTo(-r*0.28+ti*r*0.19,-sH*0.25);ctx.lineTo(-r*0.23+ti*r*0.19,-sH*0.20);ctx.lineTo(-r*0.18+ti*r*0.19,-sH*0.25);ctx.fill();}
                ctx.restore();
            } else if(z.boss){
                const legOff=Math.sin(z.walkCycle)*sH*0.10;
                ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(0,sH*0.6,sW*0.72,sW*0.16,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#4a1010';ctx.lineWidth=sW*0.33;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.28,sH*0.25);ctx.lineTo(-sW*0.32+legOff,sH*0.55);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.28,sH*0.25);ctx.lineTo(sW*0.32-legOff,sH*0.55);ctx.stroke();
                ctx.fillStyle='#111';
                ctx.beginPath();ctx.ellipse(-sW*0.32+legOff,sH*0.57,sW*0.22,sW*0.09,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(sW*0.32-legOff,sH*0.57,sW*0.22,sW*0.09,0,0,Math.PI*2);ctx.fill();
                const bGrad=ctx.createLinearGradient(-sW*0.82,0,sW*0.82,0);
                bGrad.addColorStop(0,'#3a0808');bGrad.addColorStop(0.3,'#9a2020');bGrad.addColorStop(0.7,'#9a2020');bGrad.addColorStop(1,'#3a0808');
                ctx.fillStyle=bGrad;
                ctx.beginPath();ctx.moveTo(-sW*0.82,sH*0.28);ctx.lineTo(sW*0.82,sH*0.28);ctx.lineTo(sW*0.65,-sH*0.05);ctx.lineTo(-sW*0.65,-sH*0.05);ctx.closePath();ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.55)';ctx.lineWidth=sW*0.04;
                ctx.beginPath();ctx.moveTo(-sW*0.3,sH*0.0);ctx.lineTo(-sW*0.05,sH*0.25);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.1,-sH*0.02);ctx.lineTo(sW*0.42,sH*0.2);ctx.stroke();
                ctx.fillStyle='rgba(140,0,0,0.5)';ctx.beginPath();ctx.ellipse(-sW*0.1,sH*0.12,sW*0.34,sW*0.18,-0.4,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#2a0808';
                for(let si=0;si<3;si++){const sx=-sW*0.5+si*sW*0.5,sy=-sH*0.03;ctx.beginPath();ctx.moveTo(sx-sW*0.05,sy);ctx.lineTo(sx,sy-sH*0.09);ctx.lineTo(sx+sW*0.05,sy);ctx.fill();}
                ctx.strokeStyle='#5a1010';ctx.lineWidth=sW*0.26;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.65,-sH*0.01);ctx.lineTo(-sW*(1.15+wob*0.2),sH*(0.08+wob*0.1+0.25));ctx.stroke();
                ctx.lineWidth=sW*0.19;ctx.beginPath();ctx.moveTo(-sW*(1.15+wob*0.2),sH*(0.08+wob*0.1+0.25));ctx.lineTo(-sW*(1.55+wob*0.15),sH*(0.22+wob*0.07+0.25));ctx.stroke();
                ctx.strokeStyle='#5a1010';ctx.lineWidth=sW*0.26;
                ctx.beginPath();ctx.moveTo(sW*0.65,-sH*0.01);ctx.lineTo(sW*(1.15-wob*0.2),sH*(0.08-wob*0.1+0.25));ctx.stroke();
                ctx.lineWidth=sW*0.19;ctx.beginPath();ctx.moveTo(sW*(1.15-wob*0.2),sH*(0.08-wob*0.1+0.25));ctx.lineTo(sW*(1.55-wob*0.15),sH*(0.22-wob*0.07+0.25));ctx.stroke();
                ctx.strokeStyle='#8a3030';ctx.lineWidth=sW*0.055;
                for(let ci=0;ci<4;ci++){const fa=1.55+ci*0.3,fl=sW*0.22;
                    ctx.beginPath();ctx.moveTo(-sW*(1.55+wob*0.15),sH*(0.22+wob*0.07+0.25));ctx.lineTo(-sW*(1.55+wob*0.15)+Math.cos(Math.PI+fa)*fl,sH*(0.22+wob*0.07+0.25)+Math.sin(Math.PI+fa)*fl);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(sW*(1.55-wob*0.15),sH*(0.22-wob*0.07+0.25));ctx.lineTo(sW*(1.55-wob*0.15)+Math.cos(fa-0.2)*fl,sH*(0.22-wob*0.07+0.25)+Math.sin(fa-0.2)*fl);ctx.stroke();
                }
                ctx.fillStyle='#8a3030';ctx.beginPath();ctx.roundRect(-sW*0.2,-sH*0.18,sW*0.4,sH*0.18,sW*0.07);ctx.fill();
                const bhr=r*1.35;
                const bHG=ctx.createRadialGradient(-bhr*0.2,-sH*0.42,bhr*0.05,0,-sH*0.38,bhr*1.15);
                bHG.addColorStop(0,'#aa2222');bHG.addColorStop(1,'rgba(40,0,0,0.95)');
                ctx.fillStyle=bHG;ctx.beginPath();ctx.ellipse(0,-sH*0.42,bhr*1.15,bhr,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#3a0808';ctx.beginPath();ctx.ellipse(0,-sH*0.5,bhr*1.1,bhr*0.3,0,0,Math.PI);ctx.fill();
                drawFace(0,-sH*0.4,bhr,'#ffaa00','#ff8800',bhr*0.16,-sH*0.24,-sH*0.23,bhr*0.33);
            } else if(isRunner){
                const legOff=Math.sin(z.walkCycle)*sH*0.2;
                ctx.fillStyle='rgba(0,0,0,0.2)';ctx.beginPath();ctx.ellipse(0,sH*0.63,sW*0.26,sW*0.06,0,0,Math.PI*2);ctx.fill();
                const kB=Math.sin(z.walkCycle)*sH*0.11;
                const lKX=-sW*0.1+legOff*0.4,lKY=sH*0.37+kB,rKX=sW*0.1-legOff*0.4,rKY=sH*0.37-kB;
                ctx.strokeStyle='#2a0800';ctx.lineWidth=sW*0.12;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.08,sH*0.2);ctx.lineTo(lKX,lKY);ctx.stroke();
                ctx.beginPath();ctx.moveTo(lKX,lKY);ctx.lineTo(-sW*0.1+legOff,sH*0.61);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.08,sH*0.2);ctx.lineTo(rKX,rKY);ctx.stroke();
                ctx.beginPath();ctx.moveTo(rKX,rKY);ctx.lineTo(sW*0.1-legOff,sH*0.61);ctx.stroke();
                ctx.fillStyle='#2a0800';ctx.beginPath();ctx.arc(lKX,lKY,sW*0.065,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#2a0800';ctx.beginPath();ctx.arc(rKX,rKY,sW*0.065,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#222';
                ctx.beginPath();ctx.ellipse(-sW*0.1+legOff,sH*0.62,sW*0.11,sW*0.05,-0.3,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(sW*0.1-legOff,sH*0.62,sW*0.11,sW*0.05,0.3,0,Math.PI*2);ctx.fill();
                ctx.save();ctx.rotate(-0.2);
                const rGrad=ctx.createRadialGradient(-bodyR*0.2,0,bodyR*0.05,bodyR*0.1,sH*0.08,bodyR*0.95);
                rGrad.addColorStop(0,'#7a2800');rGrad.addColorStop(1,'#1a0600');
                ctx.fillStyle=rGrad;ctx.beginPath();ctx.ellipse(0,sH*0.08,bodyR*0.58,bodyR*0.9,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=sW*0.022;
                ctx.beginPath();ctx.moveTo(-bodyR*0.3,0);ctx.lineTo(0,sH*0.2);ctx.stroke();
                ctx.restore();
                ctx.fillStyle='rgba(120,0,0,0.4)';ctx.beginPath();ctx.ellipse(sW*0.05,sH*0.06,bodyR*0.18,bodyR*0.1,0.5,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#3a0a00';ctx.lineWidth=sW*0.08;ctx.lineCap='round';
                const lEX=-sW*(0.72+wob*0.2),lEY=sH*(-0.08+wob*0.15+0.48);
                const lFX=-sW*(1.38+wob*0.18),lFY=sH*(0.06+wob*0.1+0.48);
                ctx.beginPath();ctx.moveTo(-bodyR*0.55,sH*0.0);ctx.lineTo(lEX,lEY);ctx.stroke();
                ctx.lineWidth=sW*0.06;ctx.beginPath();ctx.moveTo(lEX,lEY);ctx.lineTo(lFX,lFY);ctx.stroke();
                ctx.fillStyle='#3a0a00';ctx.beginPath();ctx.arc(lEX,lEY,sW*0.038,0,Math.PI*2);ctx.fill();
                const rEX=sW*(0.72-wob*0.2),rEY=sH*(-0.08-wob*0.15+0.48);
                const rFX=sW*(1.38-wob*0.18),rFY=sH*(0.06-wob*0.1+0.48);
                ctx.lineWidth=sW*0.08;ctx.beginPath();ctx.moveTo(bodyR*0.55,sH*0.0);ctx.lineTo(rEX,rEY);ctx.stroke();
                ctx.lineWidth=sW*0.06;ctx.beginPath();ctx.moveTo(rEX,rEY);ctx.lineTo(rFX,rFY);ctx.stroke();
                ctx.fillStyle='#3a0a00';ctx.beginPath();ctx.arc(rEX,rEY,sW*0.038,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#7a4020';ctx.lineWidth=sW*0.028;
                for(let ci=0;ci<4;ci++){const fa=1.7+ci*0.28,fl=sW*0.18;
                    ctx.beginPath();ctx.moveTo(lFX,lFY);ctx.lineTo(lFX+Math.cos(Math.PI+fa)*fl,lFY+Math.sin(Math.PI+fa)*fl);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(rFX,rFY);ctx.lineTo(rFX+Math.cos(fa-0.2)*fl,rFY+Math.sin(fa-0.2)*fl);ctx.stroke();
                }
                ctx.fillStyle='#7a4020';ctx.beginPath();ctx.roundRect(-sW*0.065,-sH*0.22,sW*0.13,sH*0.1,sW*0.03);ctx.fill();
                const rhr=r*0.82;
                const rHG=ctx.createRadialGradient(-rhr*0.2,-sH*0.45,rhr*0.05,0,-sH*0.37,rhr*1.1);
                rHG.addColorStop(0,'#7a2a00');rHG.addColorStop(1,'rgba(30,5,0,0.95)');
                ctx.fillStyle=rHG;
                ctx.beginPath();ctx.moveTo(0,-sH*0.54);ctx.quadraticCurveTo(rhr*1.1,-sH*0.46,rhr*0.9,-sH*0.34);ctx.quadraticCurveTo(rhr*0.4,-sH*0.2,0,-sH*0.16);ctx.quadraticCurveTo(-rhr*0.4,-sH*0.2,-rhr*0.9,-sH*0.34);ctx.quadraticCurveTo(-rhr*1.1,-sH*0.46,0,-sH*0.54);ctx.fill();
                ctx.fillStyle='#aa2200';ctx.fillRect(-rhr,-sH*0.51,rhr*2,rhr*0.16);
                ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(-rhr,-sH*0.51,rhr*2,rhr*0.04);
                drawFace(0,-sH*0.37,rhr,'#ff6600','#ff4400',rhr*0.13,-sH*0.23,-sH*0.22,rhr*0.27);
            } else if(isRare&&z.rare.id==='titan'){
                const legOff=Math.sin(z.walkCycle)*sH*0.07;
                ctx.fillStyle='rgba(0,0,0,0.45)';ctx.beginPath();ctx.ellipse(0,sH*0.63,sW*0.95,sW*0.18,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle=z.rare.legColor;ctx.lineWidth=sW*0.44;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.34,sH*0.28);ctx.lineTo(-sW*0.37+legOff,sH*0.55);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.34,sH*0.28);ctx.lineTo(sW*0.37-legOff,sH*0.55);ctx.stroke();
                ctx.fillStyle='#0a0a0a';
                ctx.beginPath();ctx.ellipse(-sW*0.37+legOff,sH*0.58,sW*0.28,sW*0.1,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(sW*0.37-legOff,sH*0.58,sW*0.28,sW*0.1,0,0,Math.PI*2);ctx.fill();
                const tGrad=ctx.createRadialGradient(-sW*0.32,sH*0.08,sW*0.1,sW*0.1,sH*0.14,sW*1.15);
                tGrad.addColorStop(0,'#6a4820');tGrad.addColorStop(1,'#1a0e08');
                ctx.fillStyle=tGrad;ctx.beginPath();ctx.roundRect(-sW*0.92,-sH*0.1,sW*1.84,sH*0.44,sW*0.1);ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.lineWidth=sW*0.04;
                ctx.beginPath();ctx.moveTo(0,-sH*0.08);ctx.lineTo(0,sH*0.3);ctx.stroke();
                ctx.beginPath();ctx.moveTo(-sW*0.42,sH*0.05);ctx.lineTo(-sW*0.42,sH*0.26);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.42,sH*0.05);ctx.lineTo(sW*0.42,sH*0.26);ctx.stroke();
                ctx.fillStyle='rgba(120,0,0,0.5)';ctx.beginPath();ctx.ellipse(-sW*0.15,sH*0.15,sW*0.42,sW*0.2,-0.3,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#555';ctx.lineWidth=sW*0.055;ctx.beginPath();ctx.moveTo(-sW*0.92,sH*0.27);ctx.lineTo(sW*0.92,sH*0.27);ctx.stroke();
                const tWob=wob*0.15;
                ctx.strokeStyle=z.rare.armColor;ctx.lineWidth=sW*0.38;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.92,sH*0.06);ctx.lineTo(-sW*(1.5+tWob),sH*(0.2+tWob*0.5));ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.92,sH*0.06);ctx.lineTo(sW*(1.5-tWob),sH*(0.2-tWob*0.5));ctx.stroke();
                ctx.fillStyle='#8a6030';
                ctx.beginPath();ctx.arc(-sW*(1.5+tWob),sH*(0.2+tWob*0.5),sW*0.24,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(sW*(1.5-tWob),sH*(0.2-tWob*0.5),sW*0.24,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(0,0,0,0.4)';
                for(let ki=0;ki<3;ki++){
                    ctx.beginPath();ctx.arc(-sW*(1.5+tWob)-sW*0.11+ki*sW*0.11,sH*(0.2+tWob*0.5)-sW*0.19,sW*0.042,0,Math.PI*2);ctx.fill();
                    ctx.beginPath();ctx.arc(sW*(1.5-tWob)-sW*0.11+ki*sW*0.11,sH*(0.2-tWob*0.5)-sW*0.19,sW*0.042,0,Math.PI*2);ctx.fill();
                }
                const thr=r*1.6;
                const tHG=ctx.createRadialGradient(-thr*0.25,-sH*0.3,thr*0.05,0,-sH*0.25,thr*1.25);
                tHG.addColorStop(0,z.rare.headColor);tHG.addColorStop(1,'rgba(30,15,0,0.95)');
                ctx.fillStyle=tHG;ctx.beginPath();ctx.ellipse(0,-sH*0.26,thr*1.4,thr,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#2a1808';ctx.beginPath();ctx.ellipse(0,-sH*0.36,thr*1.25,thr*0.33,0,0,Math.PI);ctx.fill();
                drawFace(0,-sH*0.23,thr,z.rare.eyeColor,z.rare.eyeGlow,thr*0.17,-sH*0.08,-sH*0.07,thr*0.48);
            } else if(isRare&&z.rare.id==='shadow'){
                const legOff=Math.sin(z.walkCycle)*sH*0.16;
                ctx.strokeStyle=z.rare.legColor;ctx.lineWidth=sW*0.07;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.07,sH*0.22);ctx.lineTo(-sW*0.09+legOff,sH*0.6);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.07,sH*0.22);ctx.lineTo(sW*0.09-legOff,sH*0.6);ctx.stroke();
                ctx.strokeStyle='rgba(30,0,60,0.28)';ctx.lineWidth=sW*0.035;
                ctx.beginPath();ctx.moveTo(-sW*0.07,sH*0.22);ctx.lineTo(-sW*0.2+legOff*1.3,sH*0.78);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.07,sH*0.22);ctx.lineTo(sW*0.2-legOff*1.3,sH*0.78);ctx.stroke();
                const shG=ctx.createRadialGradient(-bodyR*0.12,sH*0.0,bodyR*0.04,bodyR*0.04,sH*0.08,bodyR*0.85);
                shG.addColorStop(0,'rgba(20,5,40,0.88)');shG.addColorStop(0.6,'rgba(10,0,20,0.7)');shG.addColorStop(1,'rgba(5,0,10,0.08)');
                ctx.fillStyle=shG;ctx.beginPath();ctx.ellipse(0,sH*0.08,bodyR*0.45,bodyR*0.95,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(100,0,180,0.1)';
                for(let wi=0;wi<4;wi++){const wa=wi*Math.PI*0.5+z.walkCycle*0.3;ctx.beginPath();ctx.ellipse(Math.cos(wa)*bodyR*0.44,sH*0.08+Math.sin(wa)*bodyR*0.42,bodyR*0.22,bodyR*0.15,wa,0,Math.PI*2);ctx.fill();}
                ctx.strokeStyle=z.rare.armColor;ctx.lineWidth=sW*0.055;ctx.lineCap='round';
                const slEX=-sW*(0.66+wob*0.22),slEY=sH*(-0.04+wob*0.1);
                ctx.beginPath();ctx.moveTo(-bodyR*0.44,sH*0.0);ctx.lineTo(slEX,slEY);ctx.stroke();
                ctx.lineWidth=sW*0.038;ctx.beginPath();ctx.moveTo(slEX,slEY);ctx.lineTo(-sW*(1.05+wob*0.18),sH*(0.08+wob*0.06));ctx.stroke();
                const srEX=sW*(0.66-wob*0.22),srEY=sH*(-0.04-wob*0.1);
                ctx.lineWidth=sW*0.055;ctx.beginPath();ctx.moveTo(bodyR*0.44,sH*0.0);ctx.lineTo(srEX,srEY);ctx.stroke();
                ctx.lineWidth=sW*0.038;ctx.beginPath();ctx.moveTo(srEX,srEY);ctx.lineTo(sW*(1.05-wob*0.18),sH*(0.08-wob*0.06));ctx.stroke();
                ctx.strokeStyle='rgba(80,0,140,0.38)';ctx.lineWidth=sW*0.022;
                for(let ci=0;ci<3;ci++){const fa=1.9+ci*0.4,fl=sW*0.18;
                    ctx.beginPath();ctx.moveTo(-sW*(1.05+wob*0.18),sH*(0.08+wob*0.06));ctx.lineTo(-sW*(1.05+wob*0.18)+Math.cos(Math.PI+fa)*fl,sH*(0.08+wob*0.06)+Math.sin(Math.PI+fa)*fl);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(sW*(1.05-wob*0.18),sH*(0.08-wob*0.06));ctx.lineTo(sW*(1.05-wob*0.18)+Math.cos(fa-0.3)*fl,sH*(0.08-wob*0.06)+Math.sin(fa-0.3)*fl);ctx.stroke();
                }
                const shr=r*0.78;
                const shG2=ctx.createRadialGradient(-shr*0.2,-sH*0.46,shr*0.04,0,-sH*0.38,shr*1.25);
                shG2.addColorStop(0,'#1a0a30');shG2.addColorStop(0.6,'#0a0518');shG2.addColorStop(1,'rgba(5,0,15,0.25)');
                ctx.fillStyle=shG2;
                ctx.beginPath();ctx.moveTo(0,-sH*0.62);ctx.quadraticCurveTo(shr,-sH*0.53,shr*0.88,-sH*0.38);ctx.quadraticCurveTo(shr*0.65,-sH*0.23,0,-sH*0.2);ctx.quadraticCurveTo(-shr*0.65,-sH*0.23,-shr*0.88,-sH*0.38);ctx.quadraticCurveTo(-shr,-sH*0.53,0,-sH*0.62);ctx.fill();
                ctx.shadowColor='#6600cc';ctx.shadowBlur=20;
                ctx.strokeStyle='rgba(100,0,180,0.22)';ctx.lineWidth=sW*0.04;
                ctx.beginPath();ctx.ellipse(0,-sH*0.41,shr*1.08,shr*1.12,0,0,Math.PI*2);ctx.stroke();
                ctx.shadowBlur=0;
                ctx.fillStyle='rgba(0,0,0,0.55)';
                ctx.beginPath();ctx.ellipse(-shr*0.3,-sH*0.41,shr*0.17,shr*0.11,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(shr*0.3,-sH*0.41,shr*0.17,shr*0.11,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle=z.rare.eyeColor;ctx.shadowColor=z.rare.eyeGlow;ctx.shadowBlur=16;
                ctx.beginPath();ctx.arc(-shr*0.3,-sH*0.41,shr*0.09,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(shr*0.3,-sH*0.41,shr*0.09,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                ctx.strokeStyle='rgba(100,0,180,0.75)';ctx.lineWidth=sW*0.025;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-shr*0.38,-sH*0.29);ctx.quadraticCurveTo(0,-sH*0.25,shr*0.38,-sH*0.29);ctx.stroke();
            } else if(isRare&&z.rare.id==='phantom'){
                const float=Math.sin(z.walkCycle*0.8)*sH*0.04;
                const robeG=ctx.createLinearGradient(0,-sH*0.1,0,sH*0.68);
                robeG.addColorStop(0,z.rare.bodyColor);robeG.addColorStop(0.55,'#0a2a0a');robeG.addColorStop(1,'rgba(0,20,0,0)');
                ctx.fillStyle=robeG;
                ctx.beginPath();ctx.moveTo(-bodyR*0.72,sH*0.22+float);ctx.quadraticCurveTo(-bodyR*0.9,sH*0.44+float,0,sH*0.72+float);ctx.quadraticCurveTo(bodyR*0.9,sH*0.44+float,bodyR*0.72,sH*0.22+float);ctx.closePath();ctx.fill();
                ctx.strokeStyle='rgba(0,80,0,0.28)';ctx.lineWidth=sW*0.028;
                ctx.beginPath();ctx.moveTo(-bodyR*0.4,sH*0.22+float);ctx.quadraticCurveTo(-bodyR*0.52,sH*0.5+float,bodyR*0.08,sH*0.66+float);ctx.stroke();
                ctx.beginPath();ctx.moveTo(bodyR*0.4,sH*0.22+float);ctx.quadraticCurveTo(bodyR*0.52,sH*0.5+float,-bodyR*0.08,sH*0.66+float);ctx.stroke();
                ctx.fillStyle='rgba(0,180,80,0.1)';
                for(let wi=0;wi<5;wi++){const wa=wi*Math.PI*0.4+z.walkCycle*0.5;ctx.beginPath();ctx.ellipse(Math.cos(wa)*bodyR*0.62,sH*0.47+Math.sin(wa)*sH*0.12+float,bodyR*0.18,bodyR*0.1,wa,0,Math.PI*2);ctx.fill();}
                const pGrad=ctx.createRadialGradient(-bodyR*0.18,sH*0.0+float,bodyR*0.08,bodyR*0.04,sH*0.07+float,bodyR*0.88);
                pGrad.addColorStop(0,'#1a5a1a');pGrad.addColorStop(1,'#051405');
                ctx.fillStyle=pGrad;ctx.beginPath();ctx.ellipse(0,sH*0.05+float,bodyR*0.52,bodyR*0.84,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.32)';ctx.lineWidth=sW*0.02;
                for(let fi=-1;fi<=1;fi++){ctx.beginPath();ctx.moveTo(fi*bodyR*0.22,-sH*0.07+float);ctx.lineTo(fi*bodyR*0.25,sH*0.2+float);ctx.stroke();}
                ctx.shadowColor='#00ff88';ctx.shadowBlur=13;
                ctx.strokeStyle='rgba(0,200,80,0.18)';ctx.lineWidth=sW*0.055;
                ctx.beginPath();ctx.ellipse(0,sH*0.05+float,bodyR*0.53,bodyR*0.85,0,0,Math.PI*2);ctx.stroke();
                ctx.shadowBlur=0;
                const lFXp=-sW*(1.08+wob*0.2),lFYp=sH*(0.1+wob*0.08)+float;
                const rFXp=sW*(1.08-wob*0.2),rFYp=sH*(0.1-wob*0.08)+float;
                ctx.fillStyle=z.rare.armColor;
                ctx.beginPath();ctx.moveTo(-bodyR*0.52,sH*0.0+float-sH*0.05);ctx.lineTo(-bodyR*0.52,sH*0.0+float+sH*0.06);ctx.lineTo(lFXp,lFYp+sH*0.04);ctx.lineTo(lFXp,lFYp-sH*0.03);ctx.closePath();ctx.fill();
                ctx.beginPath();ctx.moveTo(bodyR*0.52,sH*0.0+float-sH*0.05);ctx.lineTo(bodyR*0.52,sH*0.0+float+sH*0.06);ctx.lineTo(rFXp,rFYp+sH*0.04);ctx.lineTo(rFXp,rFYp-sH*0.03);ctx.closePath();ctx.fill();
                ctx.strokeStyle='rgba(0,200,80,0.48)';ctx.lineWidth=sW*0.022;ctx.lineCap='round';
                for(let ci=0;ci<3;ci++){const fa=1.8+ci*0.35,fl=sW*0.16;
                    ctx.beginPath();ctx.moveTo(lFXp,lFYp);ctx.lineTo(lFXp+Math.cos(Math.PI+fa)*fl,lFYp+Math.sin(Math.PI+fa)*fl);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(rFXp,rFYp);ctx.lineTo(rFXp+Math.cos(fa-0.3)*fl,rFYp+Math.sin(fa-0.3)*fl);ctx.stroke();
                }
                const phr=r*0.92;
                const pHG=ctx.createRadialGradient(-phr*0.2,-sH*0.47+float,phr*0.04,0,-sH*0.4+float,phr*1.12);
                pHG.addColorStop(0,z.rare.headColor);pHG.addColorStop(1,'rgba(0,20,5,0.92)');
                ctx.fillStyle=pHG;ctx.beginPath();ctx.ellipse(0,-sH*0.42+float,phr*0.9,phr*1.12,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#051405';
                ctx.beginPath();ctx.moveTo(-phr*0.9,-sH*0.42+float);ctx.lineTo(-phr*0.68,-sH*0.65+float);ctx.lineTo(0,-sH*0.73+float);ctx.lineTo(phr*0.68,-sH*0.65+float);ctx.lineTo(phr*0.9,-sH*0.42+float);ctx.fill();
                ctx.shadowColor='#00cc66';ctx.shadowBlur=16;
                ctx.strokeStyle='rgba(0,180,80,0.28)';ctx.lineWidth=sW*0.038;
                ctx.beginPath();ctx.ellipse(0,-sH*0.42+float,phr*0.92,phr*1.14,0,0,Math.PI*2);ctx.stroke();
                ctx.shadowBlur=0;
                drawFace(0,-sH*0.4+float,phr,z.rare.eyeColor,z.rare.eyeGlow,phr*0.13,-sH*0.3+float,-sH*0.29+float,phr*0.3);
            } else if(isRare&&z.rare.id==='berserker'){
                const hpFrac=Math.max(0,z.health/z.maxHp);
                const rage=1-hpFrac;
                const legOff=Math.sin(z.walkCycle)*sH*(0.13+rage*0.06);
                ctx.fillStyle=`rgba(200,30,0,${0.15+rage*0.2})`;ctx.beginPath();ctx.ellipse(0,sH*0.61,sW*(0.45+rage*0.1),sW*0.1,0,0,Math.PI*2);ctx.fill();
                const kB=Math.sin(z.walkCycle)*sH*0.09;
                const lKX=-sW*0.22+legOff*0.5,lKY=sH*0.38+kB,rKX=sW*0.22-legOff*0.5,rKY=sH*0.38-kB;
                ctx.strokeStyle='#3a0500';ctx.lineWidth=sW*0.24;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.2,sH*0.2);ctx.lineTo(lKX,lKY);ctx.stroke();
                ctx.beginPath();ctx.moveTo(lKX,lKY);ctx.lineTo(-sW*0.24+legOff,sH*0.58);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.2,sH*0.2);ctx.lineTo(rKX,rKY);ctx.stroke();
                ctx.beginPath();ctx.moveTo(rKX,rKY);ctx.lineTo(sW*0.24-legOff,sH*0.58);ctx.stroke();
                ctx.fillStyle='#3a0500';ctx.beginPath();ctx.arc(lKX,lKY,sW*0.12,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#3a0500';ctx.beginPath();ctx.arc(rKX,rKY,sW*0.12,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#111';
                ctx.beginPath();ctx.ellipse(-sW*0.24+legOff,sH*0.59,sW*0.17,sW*0.08,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(sW*0.24-legOff,sH*0.59,sW*0.17,sW*0.08,0,0,Math.PI*2);ctx.fill();
                const bG=ctx.createRadialGradient(-bodyR*0.2,sH*0.06,bodyR*0.05,bodyR*0.1,sH*0.1,bodyR*1.15);
                bG.addColorStop(0,`hsl(${10-rage*10},85%,${28+rage*8}%)`);bG.addColorStop(1,'#1a0200');
                ctx.fillStyle=bG;
                ctx.beginPath();ctx.moveTo(0,-sH*0.08);ctx.lineTo(sW*0.7,sH*0.1);ctx.lineTo(sW*0.5,sH*0.3);ctx.lineTo(0,sH*0.32);ctx.lineTo(-sW*0.5,sH*0.3);ctx.lineTo(-sW*0.7,sH*0.1);ctx.closePath();ctx.fill();
                if(rage>0.2){
                    ctx.strokeStyle=`rgba(255,${80-rage*80},0,${rage*0.85})`;ctx.lineWidth=sW*0.02;ctx.shadowColor='#ff4400';ctx.shadowBlur=6*rage;
                    ctx.beginPath();ctx.moveTo(-sW*0.2,sH*0.05);ctx.lineTo(-sW*0.05,sH*0.2);ctx.lineTo(-sW*0.18,sH*0.28);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(sW*0.15,sH*0.0);ctx.lineTo(sW*0.3,sH*0.18);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(0,-sH*0.02);ctx.lineTo(sW*0.08,sH*0.12);ctx.lineTo(-sW*0.04,sH*0.22);ctx.stroke();
                    ctx.shadowBlur=0;
                }
                ctx.fillStyle='#1a0200';
                for(let si=0;si<4;si++){const sx=-sW*0.55+si*sW*0.37,sy=sH*0.0,sh=sH*(0.08+si%2*0.04);ctx.beginPath();ctx.moveTo(sx-sW*0.04,sy);ctx.lineTo(sx,sy-sh);ctx.lineTo(sx+sW*0.04,sy);ctx.fill();}
                const armLean=rage*0.3;
                ctx.strokeStyle='#3a0500';ctx.lineWidth=sW*0.16;ctx.lineCap='round';
                const lEXb=-sW*(1.0+wob*0.2),lEYb=sH*(-0.0+wob*0.1+armLean);
                const lHXb=-sW*(1.45+wob*0.18),lHYb=sH*(0.12+wob*0.08+armLean);
                ctx.beginPath();ctx.moveTo(-sW*0.68,sH*0.08);ctx.lineTo(lEXb,lEYb);ctx.stroke();
                ctx.lineWidth=sW*0.13;ctx.beginPath();ctx.moveTo(lEXb,lEYb);ctx.lineTo(lHXb,lHYb);ctx.stroke();
                ctx.fillStyle='#3a0500';ctx.beginPath();ctx.arc(lEXb,lEYb,sW*0.07,0,Math.PI*2);ctx.fill();
                const rEXb=sW*(1.0-wob*0.2),rEYb=sH*(-0.0-wob*0.1+armLean);
                const rHXb=sW*(1.45-wob*0.18),rHYb=sH*(0.12-wob*0.08+armLean);
                ctx.lineWidth=sW*0.16;ctx.beginPath();ctx.moveTo(sW*0.68,sH*0.08);ctx.lineTo(rEXb,rEYb);ctx.stroke();
                ctx.lineWidth=sW*0.13;ctx.beginPath();ctx.moveTo(rEXb,rEYb);ctx.lineTo(rHXb,rHYb);ctx.stroke();
                ctx.fillStyle='#3a0500';ctx.beginPath();ctx.arc(rEXb,rEYb,sW*0.07,0,Math.PI*2);ctx.fill();
                ctx.fillStyle=`hsl(${20-rage*20},80%,${25+rage*15}%)`;ctx.shadowColor='#ff4400';ctx.shadowBlur=rage*14;
                ctx.beginPath();ctx.arc(lHXb,lHYb,sW*0.14,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(rHXb,rHYb,sW*0.14,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                ctx.fillStyle='#5a1000';ctx.beginPath();ctx.roundRect(-sW*0.14,-sH*0.2,sW*0.28,sH*0.14,sW*0.05);ctx.fill();
                const bhrb=r*1.05;
                const hGb=ctx.createRadialGradient(-bhrb*0.2,-sH*0.41,bhrb*0.04,0,-sH*0.36,bhrb*1.1);
                hGb.addColorStop(0,`hsl(${15-rage*15},80%,${35+rage*10}%)`);hGb.addColorStop(1,'rgba(30,2,0,0.95)');
                ctx.fillStyle=hGb;
                ctx.beginPath();ctx.moveTo(-bhrb*0.9,-sH*0.5);ctx.lineTo(bhrb*0.9,-sH*0.5);ctx.quadraticCurveTo(bhrb*1.05,-sH*0.42,bhrb*0.95,-sH*0.32);ctx.lineTo(bhrb*0.65,-sH*0.22);ctx.lineTo(0,-sH*0.18);ctx.lineTo(-bhrb*0.65,-sH*0.22);ctx.quadraticCurveTo(-bhrb*0.95,-sH*0.32,-bhrb*1.05,-sH*0.42);ctx.closePath();ctx.fill();
                if(rage>0.3){ctx.strokeStyle=`rgba(255,60,0,${rage*0.5})`;ctx.shadowColor='#ff2200';ctx.shadowBlur=18*rage;ctx.lineWidth=sW*0.05;ctx.beginPath();ctx.ellipse(0,-sH*0.36,bhrb*1.12,bhrb*1.05,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}
                ctx.fillStyle='#1a0200';ctx.beginPath();ctx.ellipse(0,-sH*0.49,bhrb*0.82,bhrb*0.2,0,0,Math.PI);ctx.fill();
                drawFace(0,-sH*0.37,bhrb,'#ff4400','#ff2200',bhrb*0.14,-sH*0.24,-sH*0.23,bhrb*0.3);
            } else if(isRare&&z.rare.id==='wraith'){
                const drift=Math.sin(z.walkCycle*0.7)*sH*0.05;
                const shimmer=(Math.sin(Date.now()*0.004)*0.5+0.5);
                const tailG=ctx.createLinearGradient(0,sH*0.18,0,sH*0.72);
                tailG.addColorStop(0,'rgba(20,40,120,0.7)');tailG.addColorStop(0.5,'rgba(10,20,80,0.35)');tailG.addColorStop(1,'rgba(0,5,30,0)');
                ctx.fillStyle=tailG;
                ctx.beginPath();ctx.moveTo(-sW*0.28,sH*0.18+drift);ctx.quadraticCurveTo(-sW*(0.35+wob*0.1),sH*0.45+drift,sW*0.05,sH*0.75+drift);ctx.quadraticCurveTo(sW*(0.35-wob*0.1),sH*0.45+drift,sW*0.28,sH*0.18+drift);ctx.closePath();ctx.fill();
                ctx.strokeStyle=`rgba(80,130,255,${0.18+shimmer*0.12})`;ctx.lineWidth=sW*0.025;
                for(let li=0;li<5;li++){const ly=sH*0.22+li*sH*0.09+drift;ctx.beginPath();ctx.moveTo(-sW*0.22,ly);ctx.lineTo(sW*0.22,ly);ctx.stroke();}
                const torsoG=ctx.createRadialGradient(-bodyR*0.1,sH*0.04+drift,bodyR*0.04,bodyR*0.05,sH*0.08+drift,bodyR*0.82);
                torsoG.addColorStop(0,'rgba(30,55,160,0.55)');torsoG.addColorStop(0.6,'rgba(15,25,90,0.4)');torsoG.addColorStop(1,'rgba(5,10,40,0.05)');
                ctx.fillStyle=torsoG;ctx.beginPath();ctx.ellipse(0,sH*0.06+drift,bodyR*0.55,bodyR*0.78,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle=`rgba(150,190,255,${0.3+shimmer*0.2})`;ctx.lineWidth=sW*0.022;
                for(let ri=0;ri<4;ri++){const ry=sH*(-0.02)+ri*sH*0.07+drift;ctx.beginPath();ctx.moveTo(-bodyR*0.42,ry);ctx.quadraticCurveTo(0,ry-sH*0.02,bodyR*0.42,ry);ctx.stroke();}
                ctx.shadowColor='#2255cc';ctx.shadowBlur=16;ctx.strokeStyle='rgba(70,130,255,0.35)';ctx.lineWidth=sW*0.06;ctx.beginPath();ctx.ellipse(0,sH*0.06+drift,bodyR*0.56,bodyR*0.79,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
                ctx.strokeStyle='rgba(50,100,220,0.6)';ctx.lineWidth=sW*0.08;ctx.lineCap='round';
                const wlEX=-sW*(0.85+wob*0.2),wlEY=sH*(-0.02+wob*0.1)+drift;
                const wlHX=-sW*(1.3+wob*0.18),wlHY=sH*(0.1+wob*0.07)+drift;
                ctx.beginPath();ctx.moveTo(-bodyR*0.52,sH*0.0+drift);ctx.lineTo(wlEX,wlEY);ctx.stroke();
                ctx.lineWidth=sW*0.055;ctx.beginPath();ctx.moveTo(wlEX,wlEY);ctx.lineTo(wlHX,wlHY);ctx.stroke();
                const wrEX=sW*(0.85-wob*0.2),wrEY=sH*(-0.02-wob*0.1)+drift;
                const wrHX=sW*(1.3-wob*0.18),wrHY=sH*(0.1-wob*0.07)+drift;
                ctx.lineWidth=sW*0.08;ctx.beginPath();ctx.moveTo(bodyR*0.52,sH*0.0+drift);ctx.lineTo(wrEX,wrEY);ctx.stroke();
                ctx.lineWidth=sW*0.055;ctx.beginPath();ctx.moveTo(wrEX,wrEY);ctx.lineTo(wrHX,wrHY);ctx.stroke();
                ctx.strokeStyle='rgba(100,160,255,0.45)';ctx.lineWidth=sW*0.02;
                for(let ci=0;ci<4;ci++){const fa=1.75+ci*0.32,fl=sW*0.18;
                    ctx.beginPath();ctx.moveTo(wlHX,wlHY);ctx.lineTo(wlHX+Math.cos(Math.PI+fa)*fl,wlHY+Math.sin(Math.PI+fa)*fl);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(wrHX,wrHY);ctx.lineTo(wrHX+Math.cos(fa-0.25)*fl,wrHY+Math.sin(fa-0.25)*fl);ctx.stroke();
                }
                const whr=r*0.95;
                const whG=ctx.createRadialGradient(-whr*0.18,-sH*0.46+drift,whr*0.04,0,-sH*0.4+drift,whr*1.15);
                whG.addColorStop(0,'rgba(60,90,220,0.6)');whG.addColorStop(0.55,'rgba(20,40,120,0.45)');whG.addColorStop(1,'rgba(5,10,40,0.08)');
                ctx.fillStyle=whG;ctx.beginPath();ctx.ellipse(0,-sH*0.41+drift,whr*0.82,whr*1.18,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(0,0,30,0.7)';
                ctx.beginPath();ctx.ellipse(-whr*0.3,-sH*0.43+drift,whr*0.22,whr*0.17,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(whr*0.3,-sH*0.43+drift,whr*0.22,whr*0.17,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#4488ff';ctx.shadowColor='#2255cc';ctx.shadowBlur=18;
                ctx.beginPath();ctx.arc(-whr*0.3,-sH*0.43+drift,whr*0.11,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(whr*0.3,-sH*0.43+drift,whr*0.11,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                ctx.fillStyle='rgba(0,0,20,0.6)';ctx.beginPath();ctx.ellipse(0,-sH*0.34+drift,whr*0.1,whr*0.08,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='rgba(150,190,255,0.5)';ctx.lineWidth=sW*0.02;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-whr*0.42,-sH*0.27+drift);ctx.lineTo(whr*0.42,-sH*0.27+drift);ctx.stroke();
                ctx.fillStyle='rgba(180,210,255,0.8)';
                for(let ti=0;ti<6;ti++){const tx=-whr*0.38+ti*whr*0.15;ctx.beginPath();ctx.moveTo(tx,-sH*0.27+drift);ctx.lineTo(tx+whr*0.04,-sH*0.21+drift);ctx.lineTo(tx+whr*0.09,-sH*0.27+drift);ctx.fill();}
                ctx.shadowColor='#4488ff';ctx.shadowBlur=12+shimmer*8;ctx.strokeStyle=`rgba(70,130,255,${0.15+shimmer*0.15})`;ctx.lineWidth=sW*0.04;ctx.beginPath();ctx.ellipse(0,-sH*0.41+drift,whr*0.85,whr*1.22,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
            } else if(isRare&&z.rare.id==='colossus'){
                const legOff=Math.sin(z.walkCycle)*sH*0.06;
                ctx.fillStyle='rgba(80,0,80,0.35)';ctx.beginPath();ctx.ellipse(0,sH*0.65,sW*1.1,sW*0.2,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#1a0a1a';
                ctx.beginPath();ctx.roundRect(-sW*0.55,sH*0.25,sW*0.45,sH*0.38,sW*0.06);ctx.fill();
                ctx.beginPath();ctx.roundRect(sW*0.1,sH*0.25,sW*0.45,sH*0.38,sW*0.06);ctx.fill();
                ctx.strokeStyle='rgba(180,0,180,0.4)';ctx.lineWidth=sW*0.018;
                ctx.beginPath();ctx.moveTo(-sW*0.4,sH*0.28);ctx.lineTo(-sW*0.3,sH*0.45);ctx.lineTo(-sW*0.38,sH*0.55);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.28,sH*0.3);ctx.lineTo(sW*0.38,sH*0.48);ctx.stroke();
                ctx.fillStyle='rgba(80,0,80,0.3)';
                ctx.beginPath();ctx.ellipse(-sW*0.33+legOff,sH*0.64,sW*0.24,sW*0.08,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(sW*0.33-legOff,sH*0.64,sW*0.24,sW*0.08,0,0,Math.PI*2);ctx.fill();
                const cG=ctx.createLinearGradient(-sW*0.95,-sH*0.15,sW*0.95,sH*0.28);
                cG.addColorStop(0,'#2a1a2a');cG.addColorStop(0.4,'#4a2a4a');cG.addColorStop(0.6,'#3a1a3a');cG.addColorStop(1,'#180a18');
                ctx.fillStyle=cG;ctx.beginPath();ctx.roundRect(-sW*0.95,-sH*0.12,sW*1.9,sH*0.42,sW*0.08);ctx.fill();
                ctx.strokeStyle='rgba(200,0,200,0.6)';ctx.shadowColor='#cc00cc';ctx.shadowBlur=8;ctx.lineWidth=sW*0.025;
                ctx.beginPath();ctx.moveTo(-sW*0.6,sH*0.0);ctx.lineTo(-sW*0.35,sH*0.12);ctx.lineTo(-sW*0.5,sH*0.25);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.2,-sH*0.08);ctx.lineTo(sW*0.5,sH*0.1);ctx.lineTo(sW*0.3,sH*0.28);ctx.stroke();
                ctx.beginPath();ctx.moveTo(-sW*0.1,sH*0.02);ctx.lineTo(sW*0.15,sH*0.18);ctx.stroke();
                ctx.shadowBlur=0;
                ctx.fillStyle='rgba(40,0,60,0.4)';
                for(let mi=0;mi<6;mi++){ctx.beginPath();ctx.ellipse(-sW*0.6+mi*sW*0.24,sH*0.08+(mi%2)*sH*0.1,sW*0.1,sW*0.07,mi*0.5,0,Math.PI*2);ctx.fill();}
                ctx.fillStyle='#2a1a2a';
                ctx.beginPath();ctx.roundRect(-sW*1.55,-sH*0.06,sW*0.65,sW*0.5,sW*0.08);ctx.fill();
                ctx.beginPath();ctx.roundRect(sW*0.9,-sH*0.06,sW*0.65,sW*0.5,sW*0.08);ctx.fill();
                ctx.strokeStyle='rgba(180,0,180,0.45)';ctx.lineWidth=sW*0.018;
                ctx.beginPath();ctx.moveTo(-sW*1.35,-sH*0.02);ctx.lineTo(-sW*1.2,sH*0.12);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*1.1,sH*0.0);ctx.lineTo(sW*1.25,sH*0.14);ctx.stroke();
                ctx.fillStyle='#3a1a3a';
                ctx.beginPath();ctx.roundRect(-sW*1.62,sH*0.36,sW*0.5,sW*0.4,sW*0.07);ctx.fill();
                ctx.beginPath();ctx.roundRect(sW*1.12,sH*0.36,sW*0.5,sW*0.4,sW*0.07);ctx.fill();
                ctx.shadowColor='#cc00cc';ctx.shadowBlur=12;ctx.strokeStyle='rgba(200,0,200,0.4)';ctx.lineWidth=sW*0.03;
                ctx.beginPath();ctx.roundRect(-sW*1.64,sH*0.34,sW*0.54,sW*0.44,sW*0.08);ctx.stroke();
                ctx.beginPath();ctx.roundRect(sW*1.1,sH*0.34,sW*0.54,sW*0.44,sW*0.08);ctx.stroke();
                ctx.shadowBlur=0;
                ctx.fillStyle='#2a1a2a';ctx.beginPath();ctx.roundRect(-sW*0.22,-sH*0.17,sW*0.44,sH*0.1,sW*0.06);ctx.fill();
                const chr=r*1.45;
                const chG2=ctx.createRadialGradient(-chr*0.2,-sH*0.35,chr*0.04,0,-sH*0.28,chr*1.2);
                chG2.addColorStop(0,'#5a3a5a');chG2.addColorStop(0.6,'#3a1a3a');chG2.addColorStop(1,'rgba(15,5,15,0.95)');
                ctx.fillStyle=chG2;
                ctx.beginPath();ctx.moveTo(-chr*0.6,-sH*0.55);ctx.lineTo(-chr*1.1,-sH*0.38);ctx.lineTo(-chr*0.95,-sH*0.18);ctx.lineTo(-chr*0.5,-sH*0.08);ctx.lineTo(chr*0.5,-sH*0.08);ctx.lineTo(chr*0.95,-sH*0.18);ctx.lineTo(chr*1.1,-sH*0.38);ctx.lineTo(chr*0.6,-sH*0.55);ctx.closePath();ctx.fill();
                ctx.strokeStyle='rgba(200,0,200,0.55)';ctx.shadowColor='#cc00cc';ctx.shadowBlur=10;ctx.lineWidth=sW*0.025;
                ctx.beginPath();ctx.moveTo(-chr*0.3,-sH*0.52);ctx.lineTo(-chr*0.1,-sH*0.35);ctx.stroke();
                ctx.beginPath();ctx.moveTo(chr*0.2,-sH*0.5);ctx.lineTo(chr*0.4,-sH*0.3);ctx.stroke();
                ctx.shadowBlur=0;
                drawFace(0,-sH*0.33,chr,'#ff00ff','#cc00cc',chr*0.16,-sH*0.15,-sH*0.14,chr*0.38);
            } else if(isRare&&z.rare.id==='plague'){
                const legOff=Math.sin(z.walkCycle)*sH*0.1;
                const bloat=1.18;
                ctx.fillStyle='rgba(60,100,0,0.3)';ctx.beginPath();ctx.ellipse(0,sH*0.62,sW*0.5,sW*0.11,0,0,Math.PI*2);ctx.fill();
                const kBp=Math.sin(z.walkCycle)*sH*0.07;
                const lKXp=-sW*0.22+legOff*0.5,lKYp=sH*0.41+kBp,rKXp=sW*0.22-legOff*0.5,rKYp=sH*0.41-kBp;
                ctx.strokeStyle='#2a4a00';ctx.lineWidth=sW*0.28;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.2,sH*0.24);ctx.lineTo(lKXp,lKYp);ctx.stroke();
                ctx.beginPath();ctx.moveTo(lKXp,lKYp);ctx.lineTo(-sW*0.24+legOff,sH*0.59);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.2,sH*0.24);ctx.lineTo(rKXp,rKYp);ctx.stroke();
                ctx.beginPath();ctx.moveTo(rKXp,rKYp);ctx.lineTo(sW*0.24-legOff,sH*0.59);ctx.stroke();
                ctx.fillStyle='#3a6000';ctx.beginPath();ctx.arc(lKXp,lKYp,sW*0.15,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#3a6000';ctx.beginPath();ctx.arc(rKXp,rKYp,sW*0.15,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#111';
                ctx.beginPath();ctx.ellipse(-sW*0.24+legOff,sH*0.6,sW*0.18,sW*0.08,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(sW*0.24-legOff,sH*0.6,sW*0.18,sW*0.08,0,0,Math.PI*2);ctx.fill();
                const pGp=ctx.createRadialGradient(-bodyR*0.15,sH*0.05,bodyR*0.08,bodyR*0.1,sH*0.12,bodyR*bloat*1.1);
                pGp.addColorStop(0,'#3a6000');pGp.addColorStop(0.55,'#2a4800');pGp.addColorStop(1,'#0e1800');
                ctx.fillStyle=pGp;ctx.beginPath();ctx.ellipse(0,sH*0.1,bodyR*bloat,bodyR*0.98,0,0,Math.PI*2);ctx.fill();
                const boilPositions=[[-sW*0.3,sH*0.0],[sW*0.35,sH*0.08],[-sW*0.1,sH*0.2],[sW*0.15,-sH*0.05],[sW*0.4,sH*0.22],[-sW*0.42,sH*0.18]];
                for(const [bx,by] of boilPositions){
                    const br=sW*(0.07+Math.sin(bx*by)*0.04);
                    ctx.fillStyle='#4a7a00';ctx.beginPath();ctx.arc(bx,by,br,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='rgba(180,255,0,0.35)';ctx.beginPath();ctx.arc(bx-br*0.25,by-br*0.25,br*0.4,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='rgba(140,200,0,0.5)';ctx.beginPath();ctx.arc(bx,by+br,br*0.3,0,Math.PI*2);ctx.fill();
                }
                ctx.strokeStyle='rgba(120,200,0,0.4)';ctx.lineWidth=sW*0.02;
                ctx.beginPath();ctx.moveTo(-sW*0.1,sH*0.28);ctx.lineTo(-sW*0.08,sH*0.42);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.25,sH*0.3);ctx.lineTo(sW*0.22,sH*0.44);ctx.stroke();
                ctx.strokeStyle='#2a4a00';ctx.lineWidth=sW*0.15;ctx.lineCap='round';
                const plEXp=-sW*(0.9+wob*0.2),plEYp=sH*(-0.02+wob*0.1);
                const plHXp=-sW*(1.25+wob*0.18),plHYp=sH*(0.12+wob*0.07);
                ctx.beginPath();ctx.moveTo(-bodyR*bloat*0.85,sH*0.04);ctx.lineTo(plEXp,plEYp);ctx.stroke();
                ctx.lineWidth=sW*0.13;ctx.beginPath();ctx.moveTo(plEXp,plEYp);ctx.lineTo(plHXp,plHYp);ctx.stroke();
                ctx.fillStyle='#3a6000';ctx.beginPath();ctx.arc(plEXp,plEYp,sW*0.08,0,Math.PI*2);ctx.fill();
                const prEXp=sW*(0.9-wob*0.2),prEYp=sH*(-0.02-wob*0.1);
                const prHXp=sW*(1.25-wob*0.18),prHYp=sH*(0.12-wob*0.07);
                ctx.lineWidth=sW*0.15;ctx.beginPath();ctx.moveTo(bodyR*bloat*0.85,sH*0.04);ctx.lineTo(prEXp,prEYp);ctx.stroke();
                ctx.lineWidth=sW*0.13;ctx.beginPath();ctx.moveTo(prEXp,prEYp);ctx.lineTo(prHXp,prHYp);ctx.stroke();
                ctx.fillStyle='#3a6000';ctx.beginPath();ctx.arc(prEXp,prEYp,sW*0.08,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#4a7a00';
                ctx.beginPath();ctx.arc(plHXp,plHYp,sW*0.12,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(prHXp,prHYp,sW*0.12,0,Math.PI*2);ctx.fill();
                ctx.shadowColor='#aaff00';ctx.shadowBlur=8;ctx.fillStyle='rgba(160,255,0,0.5)';
                ctx.beginPath();ctx.arc(plHXp,plHYp+sW*0.08,sW*0.06,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(prHXp,prHYp+sW*0.08,sW*0.06,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                ctx.fillStyle='#2a4a00';ctx.beginPath();ctx.arc(0,-sH*0.17,sW*0.18,0,Math.PI*2);ctx.fill();
                const phrp=r*1.12;
                const phGp=ctx.createRadialGradient(-phrp*0.2,-sH*0.4,phrp*0.05,0,-sH*0.35,phrp*1.15);
                phGp.addColorStop(0,'#3a6000');phGp.addColorStop(0.6,'#2a4800');phGp.addColorStop(1,'rgba(10,20,0,0.9)');
                ctx.fillStyle=phGp;ctx.beginPath();ctx.ellipse(0,-sH*0.36,phrp*1.08,phrp,0,0,Math.PI*2);ctx.fill();
                const headBoils=[[-phrp*0.55,-sH*0.42],[phrp*0.6,-sH*0.38],[-phrp*0.3,-sH*0.52],[phrp*0.25,-sH*0.5]];
                for(const [hbx,hby] of headBoils){
                    ctx.fillStyle='#4a7a00';ctx.beginPath();ctx.arc(hbx,hby,phrp*0.12,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='rgba(160,255,0,0.3)';ctx.beginPath();ctx.arc(hbx-phrp*0.04,hby-phrp*0.04,phrp*0.05,0,Math.PI*2);ctx.fill();
                }
                ctx.shadowColor='#aaff00';ctx.shadowBlur=12;ctx.strokeStyle='rgba(140,220,0,0.22)';ctx.lineWidth=sW*0.04;ctx.beginPath();ctx.ellipse(0,-sH*0.36,phrp*1.1,phrp*1.02,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
                drawFace(0,-sH*0.36,phrp,'#aaff00','#88cc00',phrp*0.12,-sH*0.24,-sH*0.23,phrp*0.3);
                ctx.fillStyle='rgba(160,255,0,0.6)';ctx.beginPath();ctx.moveTo(-phrp*0.05,-sH*0.24);ctx.lineTo(-phrp*0.08,-sH*0.14);ctx.lineTo(phrp*0.02,-sH*0.14);ctx.closePath();ctx.fill();
            } else {
                // Normal zombie
                const legOff=Math.sin(z.walkCycle)*sH*0.12;
                ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(0,sH*0.6,sW*0.38,sW*0.1,0,0,Math.PI*2);ctx.fill();
                const kBn=Math.sin(z.walkCycle)*sH*0.08;
                const lKXn=-sW*0.2+legOff*0.5,lKYn=sH*0.4+kBn,rKXn=sW*0.2-legOff*0.5,rKYn=sH*0.4-kBn;
                ctx.strokeStyle='#1a3a10';ctx.lineWidth=sW*0.2;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(-sW*0.18,sH*0.22);ctx.lineTo(lKXn,lKYn);ctx.stroke();
                ctx.beginPath();ctx.moveTo(lKXn,lKYn);ctx.lineTo(-sW*0.22+legOff,sH*0.57);ctx.stroke();
                ctx.beginPath();ctx.moveTo(sW*0.18,sH*0.22);ctx.lineTo(rKXn,rKYn);ctx.stroke();
                ctx.beginPath();ctx.moveTo(rKXn,rKYn);ctx.lineTo(sW*0.22-legOff,sH*0.57);ctx.stroke();
                ctx.fillStyle='#1a3a10';ctx.beginPath();ctx.arc(lKXn,lKYn,sW*0.1,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#1a3a10';ctx.beginPath();ctx.arc(rKXn,rKYn,sW*0.1,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.arc(lKXn+sW*0.02,lKYn+sW*0.02,sW*0.07,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.arc(rKXn+sW*0.02,rKYn+sW*0.02,sW*0.07,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#111';
                ctx.beginPath();ctx.ellipse(-sW*0.22+legOff,sH*0.58,sW*0.15,sW*0.07,0,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.ellipse(sW*0.22-legOff,sH*0.58,sW*0.15,sW*0.07,0,0,Math.PI*2);ctx.fill();
                const nGrad=ctx.createRadialGradient(-bodyR*0.25,sH*0.0,bodyR*0.1,bodyR*0.1,sH*0.12,bodyR*1.1);
                nGrad.addColorStop(0,'#3a7020');nGrad.addColorStop(1,'#0e200a');
                ctx.fillStyle=nGrad;ctx.beginPath();ctx.arc(0,sH*0.1,bodyR,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(0,-sH*0.08,sW*0.14,sH*0.07,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=sW*0.028;
                ctx.beginPath();ctx.moveTo(-bodyR*0.4,sH*0.0);ctx.lineTo(-bodyR*0.1,sH*0.22);ctx.stroke();
                ctx.beginPath();ctx.moveTo(bodyR*0.15,-sH*0.05);ctx.lineTo(bodyR*0.45,sH*0.18);ctx.stroke();
                ctx.fillStyle='rgba(100,0,0,0.45)';ctx.beginPath();ctx.ellipse(-bodyR*0.1,sH*0.08,bodyR*0.28,bodyR*0.18,-0.5,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(0,0,0,0.2)';for(let bi=0;bi<3;bi++){ctx.beginPath();ctx.arc(0,sH*0.0+bi*sH*0.1,sW*0.045,0,Math.PI*2);ctx.fill();}
                const lSXn=-bodyR*0.85,lSYn=sH*0.02,lEXn=-sW*(0.9+wob*0.25),lEYn=sH*(-0.05+wob*0.12),lHXn=-sW*(1.25+wob*0.2),lHYn=sH*(0.1+wob*0.08);
                ctx.strokeStyle='#1a2a08';ctx.lineWidth=sW*0.1;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(lSXn,lSYn);ctx.lineTo(lEXn,lEYn);ctx.stroke();
                ctx.lineWidth=sW*0.08;ctx.beginPath();ctx.moveTo(lEXn,lEYn);ctx.lineTo(lHXn,lHYn);ctx.stroke();
                ctx.fillStyle='#1a2a08';ctx.beginPath();ctx.arc(lEXn,lEYn,sW*0.055,0,Math.PI*2);ctx.fill();
                const rSXn=bodyR*0.85,rSYn=sH*0.02,rEXn=sW*(0.9-wob*0.25),rEYn=sH*(-0.05-wob*0.12),rHXn=sW*(1.25-wob*0.2),rHYn=sH*(0.1-wob*0.08);
                ctx.lineWidth=sW*0.1;ctx.beginPath();ctx.moveTo(rSXn,rSYn);ctx.lineTo(rEXn,rEYn);ctx.stroke();
                ctx.lineWidth=sW*0.08;ctx.beginPath();ctx.moveTo(rEXn,rEYn);ctx.lineTo(rHXn,rHYn);ctx.stroke();
                ctx.fillStyle='#1a2a08';ctx.beginPath();ctx.arc(rEXn,rEYn,sW*0.055,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#4a7a30';ctx.lineWidth=sW*0.035;ctx.lineCap='round';
                for(let ci=0;ci<3;ci++){const fa=1.8+ci*0.35,fl=sW*0.13;
                    ctx.beginPath();ctx.moveTo(lHXn,lHYn);ctx.lineTo(lHXn+Math.cos(Math.PI+fa)*fl,lHYn+Math.sin(Math.PI+fa)*fl);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(rHXn,rHYn);ctx.lineTo(rHXn+Math.cos(fa-0.3)*fl,rHYn+Math.sin(fa-0.3)*fl);ctx.stroke();
                }
                ctx.fillStyle='#4a7a30';ctx.beginPath();ctx.roundRect(-sW*0.1,-sH*0.25,sW*0.2,sH*0.12,sW*0.04);ctx.fill();
                const nHG=ctx.createRadialGradient(-r*0.25,-sH*0.45,r*0.05,0,-sH*0.38,r*1.1);
                nHG.addColorStop(0,'#3a7228');nHG.addColorStop(1,'rgba(0,20,0,0.8)');
                ctx.fillStyle=nHG;ctx.beginPath();ctx.arc(0,-sH*0.38,r,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#0d0d0d';ctx.fillRect(-r*0.6,-sH*0.62,r*1.2,r*0.22);ctx.fillRect(-r*0.38,-sH*0.88,r*0.76,r*0.3);
                ctx.fillStyle='#550000';ctx.fillRect(-r*0.38,-sH*0.68,r*0.76,r*0.09);
                ctx.strokeStyle='#222';ctx.lineWidth=sW*0.015;ctx.beginPath();ctx.moveTo(-r*0.38,-sH*0.88);ctx.lineTo(-r*0.38,-sH*0.58);ctx.stroke();
                drawFace(0,-sH*0.38,r,'#ff1100','#ff0000',r*0.11,-sH*0.28,-sH*0.27,r*0.33);
            }
        } else if(s.type==='bullet'){
            const bSize=Math.max(3,s.scale*0.08);
            ctx.fillStyle=s.obj.color||'#ffee44';ctx.shadowColor=s.obj.color||'#ffaa00';ctx.shadowBlur=10;
            ctx.beginPath();ctx.arc(s.sx,spriteY,bSize,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        } else if(s.type==='drop'){
            const d=s.obj, pulse=0.75+Math.sin(Date.now()*0.006)*0.25, sz=Math.max(8,s.scale*0.25)*pulse;
            ctx.globalAlpha=Math.min(1,d.life/3);
            if(d.type==='healthpack'){
                ctx.fillStyle='#00cc44';ctx.shadowColor='#00ff66';ctx.shadowBlur=18;ctx.fillRect(s.sx-sz/2,spriteY-sz/2,sz,sz);
                ctx.fillStyle='#fff';ctx.font=`bold ${Math.max(8,sz*0.55)|0}px monospace`;ctx.textAlign='center';ctx.shadowBlur=0;ctx.fillText('HP',s.sx,spriteY+sz*0.22);
            } else if(d.type==='nuke'){
                ctx.fillStyle='#ffaa00';ctx.shadowColor='#ff4400';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(s.sx,spriteY,sz/2,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#fff';ctx.font=`bold ${Math.max(8,sz*0.5)|0}px monospace`;ctx.textAlign='center';ctx.shadowBlur=0;ctx.fillText('☢',s.sx,spriteY+sz*0.18);
            } else if(d.type==='coincash'){
                const cr=sz/2;
                ctx.shadowColor='#ffaa00';ctx.shadowBlur=28;
                ctx.strokeStyle='#ffdd00';ctx.lineWidth=Math.max(2,cr*0.18);
                ctx.beginPath();ctx.arc(s.sx,spriteY,cr*1.08,0,Math.PI*2);ctx.stroke();
                const grad=ctx.createRadialGradient(s.sx-cr*0.25,spriteY-cr*0.25,cr*0.05,s.sx,spriteY,cr);
                grad.addColorStop(0,'#fff7a0');grad.addColorStop(0.45,'#ffd700');grad.addColorStop(1,'#b8860b');
                ctx.fillStyle=grad;ctx.shadowBlur=0;ctx.beginPath();ctx.arc(s.sx,spriteY,cr,0,Math.PI*2);ctx.fill();
                const fs=Math.max(10,cr*1.05)|0;
                ctx.font=`900 ${fs}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
                ctx.fillStyle='rgba(80,40,0,0.7)';ctx.fillText('X2',s.sx+1,spriteY+1);
                ctx.fillStyle='#1a0a00';ctx.fillText('X2',s.sx,spriteY);ctx.textBaseline='alphabetic';
            } else if(d.type==='poison'){
                const pr=Math.max(6,s.scale*0.18);
                const pFade=Math.min(1,d.life/2)*pulse;
                ctx.globalAlpha=pFade*0.75;
                ctx.shadowColor='#88cc00';ctx.shadowBlur=14;
                const pGrad2=ctx.createRadialGradient(s.sx,spriteY,pr*0.1,s.sx,spriteY,pr);
                pGrad2.addColorStop(0,'rgba(160,255,0,0.8)');pGrad2.addColorStop(0.5,'rgba(80,160,0,0.5)');pGrad2.addColorStop(1,'rgba(20,60,0,0)');
                ctx.fillStyle=pGrad2;ctx.beginPath();ctx.arc(s.sx,spriteY,pr,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
            }
            ctx.shadowBlur=0;
        } else if(s.type==='particle'){
            const pt=s.obj, sz=Math.max(2,s.scale*0.07);
            ctx.globalAlpha=Math.min(1,pt.life*2);ctx.fillStyle=pt.color;
            ctx.beginPath();ctx.arc(s.sx,spriteY,sz,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
    }

    // Wave countdown
    if(zombies.length===0&&waveTimer>0){
        ctx.save();ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(w/2-160,h/2-60,320,80);
        ctx.fillStyle='#ffdd00';ctx.font='bold 28px monospace';ctx.textAlign='center';
        ctx.fillText(`WAVE ${wave+1} IN ${Math.ceil(waveTimer)}s`,w/2,h/2-18);
        ctx.fillStyle='#aaa';ctx.font='16px monospace';ctx.fillText('+30 reserve ammo incoming',w/2,h/2+14);
        ctx.restore();
    }

    // Rare alert
    if(rareAlert&&rareAlertTimer>0){
        const alpha=Math.min(1,rareAlertTimer)*Math.min(1,(4-rareAlertTimer)*2);
        ctx.save();ctx.globalAlpha=alpha;
        ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(w/2-200,h*0.22-30,400,70);
        ctx.strokeStyle=rareAlert.labelColor;ctx.lineWidth=2;ctx.strokeRect(w/2-200,h*0.22-30,400,70);
        ctx.fillStyle=rareAlert.labelColor;ctx.shadowColor=rareAlert.eyeGlow;ctx.shadowBlur=16;
        ctx.font='bold 22px monospace';ctx.textAlign='center';
        ctx.fillText(`${rareAlert.label} APPEARED!`,w/2,h*0.22+2);
        ctx.shadowBlur=0;ctx.fillStyle='#aaa';ctx.font='13px monospace';
        ctx.fillText(rareAlert.desc,w/2,h*0.22+22);ctx.restore();
    }

    // Coin doubler HUD
    if(coinDouble){
        const cdAlpha=coinDoubleTimer<3?coinDoubleTimer/3:1;
        const pulse=0.85+Math.sin(Date.now()*0.008)*0.15;
        ctx.save();ctx.globalAlpha=cdAlpha*pulse;
        ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(w/2-130,14,260,44);
        ctx.strokeStyle='#ffd700';ctx.lineWidth=1.5;ctx.strokeRect(w/2-130,14,260,44);
        ctx.fillStyle='#ffd700';ctx.shadowColor='#ffaa00';ctx.shadowBlur=14;
        ctx.font='bold 20px monospace';ctx.textAlign='center';
        ctx.fillText(`💰 x2 COINS — ${Math.ceil(coinDoubleTimer)}s`,w/2,42);
        ctx.shadowBlur=0;ctx.restore();
    }

    // ── Minimap ───────────────────────────────────────────────────────
    {
        const MM=140, PAD=14, mx=PAD, my=h-PAD-MM, scale=MM/(ROOM*2);
        function worldToMap(wx,wy){return[mx+(wx+ROOM)*scale, my+(wy+ROOM)*scale];}
        ctx.save();
        ctx.globalAlpha=0.72;ctx.fillStyle='#000a00';ctx.strokeStyle='#0f3';ctx.lineWidth=1.5;
        ctx.fillRect(mx,my,MM,MM);ctx.strokeRect(mx,my,MM,MM);
        ctx.lineWidth=0.8;
        for(const b of BUILDINGS){
            const[bx1,by1]=worldToMap(b.x1,b.y1),[bx2,by2]=worldToMap(b.x2,b.y2);
            const bc=b.color||[50,80,50];
            ctx.globalAlpha=0.85;
            ctx.fillStyle=`rgb(${(bc[0]*0.35)|0},${(bc[1]*0.35)|0},${(bc[2]*0.25)|0})`;
            ctx.strokeStyle=`rgb(${(bc[0]*0.6)|0},${(bc[1]*0.6)|0},${(bc[2]*0.5)|0})`;
            ctx.fillRect(bx1,by1,bx2-bx1,by2-by1);ctx.strokeRect(bx1,by1,bx2-bx1,by2-by1);
            if(b.label&&(bx2-bx1)>8){ctx.globalAlpha=0.7;ctx.fillStyle='#aaa';ctx.font='4px monospace';ctx.textAlign='center';ctx.fillText(b.label,(bx1+bx2)/2,(by1+by2)/2+1.5);}
        }
        for(const z of zombies){
            const[zx,zy]=worldToMap(z.x,z.y);const zr=z.boss?4.5:z.rare?3.5:2.5;
            ctx.globalAlpha=0.9;ctx.fillStyle=z.boss?'#ff8800':z.rare?z.rare.eyeColor:(z.crawler?'#aa0':'#f00');
            ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=z.boss?8:4;
            ctx.beginPath();ctx.arc(zx,zy,zr,0,Math.PI*2);ctx.fill();
        }
        ctx.shadowBlur=0;
        ctx.fillStyle='#ffee44';ctx.globalAlpha=0.6;
        for(const b of bullets){const[bx,by]=worldToMap(b.x,b.y);ctx.beginPath();ctx.arc(bx,by,1.2,0,Math.PI*2);ctx.fill();}
        const[px,py]=worldToMap(player.x,player.y);
        const fovHalf=player.fov/2,coneLen=18;
        ctx.globalAlpha=0.25;ctx.fillStyle='#00ff88';
        ctx.beginPath();ctx.moveTo(px,py);ctx.arc(px,py,coneLen,player.angle-fovHalf,player.angle+fovHalf);ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;ctx.fillStyle='#00ff88';ctx.shadowColor='#00ff88';ctx.shadowBlur=8;
        ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.globalAlpha=0.65;ctx.fillStyle='#0f3';ctx.font='9px monospace';ctx.textAlign='left';ctx.fillText('MAP',mx+3,my+10);
        ctx.globalAlpha=0.7;
        for(const lp of LAMPS){const[lx,ly]=worldToMap(lp.x,lp.y);ctx.fillStyle='rgba(255,220,100,0.8)';ctx.beginPath();ctx.arc(lx,ly,1.5,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=0.85;ctx.fillStyle='#f44';ctx.font='bold 9px monospace';ctx.textAlign='right';ctx.fillText(`☣ ${zombies.length}`,mx+MM-3,my+10);
        ctx.restore();
    }

    // Hints above minimap
    ctx.save();ctx.font='13px monospace';ctx.textAlign='left';
    ctx.fillStyle='rgba(180,180,255,0.75)';ctx.fillText('TAB = Settings',14,h-189);
    ctx.fillStyle='rgba(255,215,0,0.7)';ctx.fillText('B = Gun Shop',14,h-172);
    ctx.restore();

    // Paused
    if(settingsOpen){
        ctx.save();ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(w/2-120,h/2-50,240,70);
        ctx.fillStyle='#00cfff';ctx.shadowColor='#00cfff';ctx.shadowBlur=20;
        ctx.font='bold 36px monospace';ctx.textAlign='center';ctx.fillText('⏸ PAUSED',w/2,h/2+2);
        ctx.shadowBlur=0;ctx.fillStyle='#aaa';ctx.font='14px monospace';ctx.fillText('TAB to resume',w/2,h/2+26);
        ctx.restore();
    }

    // Scope overlay
    const scopeAlpha=Math.max(0,(scopeZoom-1)/(scopeTargetZoom-1+0.001));
    if(scoped||scopeZoom>1.05){
        ctx.save();
        const cx=w/2, cy=h/2, scopeR=Math.min(w,h)*0.38;
        ctx.globalAlpha=Math.min(1,scopeAlpha*1.3);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
        ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(cx,cy,scopeR,0,Math.PI*2);ctx.fill();
        ctx.globalCompositeOperation='source-over';
        ctx.globalAlpha=scopeAlpha*0.08;ctx.fillStyle='#00ff88';ctx.beginPath();ctx.arc(cx,cy,scopeR,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=scopeAlpha;
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=14;ctx.beginPath();ctx.arc(cx,cy,scopeR,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#444';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,scopeR,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='rgba(0,255,80,0.9)';ctx.lineWidth=1.2;
        const gap=18;
        ctx.beginPath();ctx.moveTo(cx-scopeR+2,cy);ctx.lineTo(cx-gap,cy);ctx.moveTo(cx+gap,cy);ctx.lineTo(cx+scopeR-2,cy);ctx.moveTo(cx,cy-scopeR+2);ctx.lineTo(cx,cy-gap);ctx.moveTo(cx,cy+gap);ctx.lineTo(cx,cy+scopeR-2);ctx.stroke();
        ctx.strokeStyle='rgba(0,255,80,0.6)';ctx.lineWidth=1;
        for(let i=1;i<=3;i++){
            const hx=cx+i*(scopeR*0.2);ctx.beginPath();ctx.moveTo(hx,cy-8);ctx.lineTo(hx,cy+8);ctx.stroke();
            ctx.beginPath();ctx.moveTo(cx-i*(scopeR*0.2),cy-8);ctx.lineTo(cx-i*(scopeR*0.2),cy+8);ctx.stroke();
        }
        ctx.fillStyle='rgba(255,80,80,0.9)';ctx.beginPath();ctx.arc(cx,cy,2.5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(0,255,80,0.7)';ctx.font='11px monospace';ctx.textAlign='left';ctx.fillText(`${scopeTargetZoom.toFixed(1)}x`,cx+scopeR-52,cy+scopeR-10);
        ctx.restore();
    } else {
        ctx.strokeStyle=reloading?'#ff8800':burstCooldown>0?'#88ccff':'#0f8';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(w/2-18,horizon);ctx.lineTo(w/2+18,horizon);ctx.moveTo(w/2,horizon-18);ctx.lineTo(w/2,horizon+18);ctx.stroke();
    }

    // Gun model
    const gun=equippedGun();
    if(scopeZoom<3.2){
        const gunAlpha=Math.max(0,1-(scopeZoom-1)/1.5);
        const bob=Math.sin(bobTime*6)*3, gunX=w/2, gunY=h-120+bob;
        const bLen=gun.barrelLen, bW=gun.bodyW;
        if(muzzleFlash>0){
            ctx.save();ctx.globalAlpha=muzzleFlash*8*gunAlpha;ctx.fillStyle='rgba(255,230,100,0.9)';ctx.shadowColor='#ffaa00';ctx.shadowBlur=30;
            ctx.beginPath();ctx.ellipse(gunX+2,gunY-bLen-10,22,16,0,0,Math.PI*2);ctx.fill();ctx.restore();
        }
        ctx.save();ctx.globalAlpha=gunAlpha;ctx.translate(gunX,gunY);
        ctx.fillStyle='#1a1a1a';ctx.fillRect(-28,-30,60,28);
        ctx.fillStyle=gun.id==='minigun'?'#333':'#2a2a2a';ctx.fillRect(-bW/2,-bLen,bW,bLen-20);
        ctx.fillStyle=gun.color;ctx.globalAlpha=0.35;ctx.fillRect(-bW/2+2,-bLen+10,bW/4,bLen-30);ctx.globalAlpha=1;
        ctx.fillStyle='#333';ctx.fillRect(-bW/2-2,-bLen-2,bW+4,8);
        ctx.fillStyle='#111';ctx.fillRect(-10,-2,20,36);
        ctx.strokeStyle='#222';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,18,12,0,Math.PI);ctx.stroke();
        ctx.fillStyle='#0a0a0a';ctx.fillRect(-8,12,16,40);
        if(mag>0){const shown=Math.min(mag,5);for(let i=0;i<shown;i++){ctx.fillStyle=`hsl(45,80%,${50-i*5}%)`;ctx.fillRect(-5,38-i*5,4,4);}}
        ctx.fillStyle='#333';ctx.fillRect(-4,-bLen+8,8,bLen-30);
        ctx.fillStyle='#111';ctx.fillRect(bW/2-1,-bLen*0.6,5,15);
        if(gun.id==='minigun'){
            const spin=(bobTime*8*minigunSpinup)%(Math.PI*2);
            for(let i=0;i<6;i++){const a=spin+i*Math.PI/3;ctx.fillStyle='#444';ctx.fillRect(-bW/2+Math.cos(a)*5-2,-bLen+20+Math.sin(a)*5,4,bLen-50);}
            if(minigunSpinup<1){
                ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(-30,-bLen-36,60,10);
                ctx.fillStyle=`hsl(${minigunSpinup*120},100%,50%)`;ctx.fillRect(-30,-bLen-36,60*minigunSpinup,10);
                ctx.strokeStyle='#888';ctx.lineWidth=1;ctx.strokeRect(-30,-bLen-36,60,10);
                ctx.fillStyle='#fff';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText('SPIN UP',0,-bLen-28);
            }
        }
        if(reloading){ctx.fillStyle='rgba(255,140,0,0.85)';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillText('RELOADING...',0,-bLen-20);}
        else if(mag===0){ctx.fillStyle='rgba(255,50,50,0.9)';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillText('[R] RELOAD',0,-bLen-20);}
        else if(burstCooldown>0){ctx.fillStyle='rgba(100,180,255,0.85)';ctx.font='bold 14px monospace';ctx.textAlign='center';ctx.fillText('▪▪▪',0,-bLen-20);}
        ctx.restore();
    }

    if(gun.id==='sniper'&&!scoped){
        ctx.save();ctx.fillStyle='rgba(200,200,255,0.55)';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText('RMB = Scope',w/2,h-20);ctx.restore();
    }
}

// ── Loop ──────────────────────────────────────────────────────────────
let last=0;
function loop(t=0){
    const dt=Math.min((t-last)/1000,0.1);last=t;
    update(dt);if(gameActive)draw();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
