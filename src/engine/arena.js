// Page 2 · walk-around 3D arena with a hidden invitation.
// createArena(container,{onInvite}) mounts the scene; onInvite fires when the envelope is clicked up close.
import * as THREE_NS from 'three';
import markup from './arena.html?raw';

const $=id=>document.getElementById(id);

export function createArena(container,{onInvite}={}){
  container.innerHTML=markup;
  let disposed=false;const kd=e=>{keys[e.code]=true;},ku=e=>{keys[e.code]=false;};
  let started=false,THREE=null,renderer,scene,camera,clock,raf=0;
  const S={yaw:0,pitch:-0.32,x:0,z:0,y:0,vy:0};
  const keys={};let stick={x:0,y:0,id:null,ox:0,oy:0},look={id:null,x:0,y:0};

  // ---- bowl layout (meters) ----
  const A=19,B=12.5,RC=6;                 // inner edge of the lower tier: rounded rectangle half-extents + corner radius
  const ROW=0.85,RISE=0.42,NL=18;         // lower tier
  const CONC=3.2,URISE=0.6,UROW=0.82,NU=20;// concourse width, upper tier
  const L1=NL*ROW,H1=NL*RISE,U0=L1+CONC,H2=H1+1.6;
  const LOUT=U0+NU*UROW;
  function sd(x,z){const qx=Math.abs(x)-(A-RC),qz=Math.abs(z)-(B-RC);return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-RC;}
  function ground(x,z){
    const d=sd(x,z);
    if(d<0)return 0;
    if(d<L1)return (Math.floor(d/ROW)+1)*RISE;
    if(d<U0)return H1;
    if(d<LOUT)return H2+(Math.floor((d-U0)/UROW)+1)*URISE;
    return H2+NU*URISE;
  }
  // point on the rounded rectangle offset by o, at arclength u; returns position + outward normal
  function ring(o){
    const a=A-RC,b=B-RC,r=RC+o,segs=[2*a,Math.PI*r/2,2*b,Math.PI*r/2,2*a,Math.PI*r/2,2*b,Math.PI*r/2];
    const L=segs.reduce((s,v)=>s+v,0);
    function at(u){u=((u%L)+L)%L;let i=0;while(u>segs[i]){u-=segs[i];i++;}
      switch(i){
        case 0:return{x:-a+u,z:b+r,nx:0,nz:1};
        case 1:{const t=u/r;return{x:a+Math.sin(t)*r,z:b+Math.cos(t)*r,nx:Math.sin(t),nz:Math.cos(t)};}
        case 2:return{x:a+r,z:b-u,nx:1,nz:0};
        case 3:{const t=u/r;return{x:a+Math.cos(t)*r,z:-b-Math.sin(t)*r,nx:Math.cos(t),nz:-Math.sin(t)};}
        case 4:return{x:a-u,z:-b-r,nx:0,nz:-1};
        case 5:{const t=u/r;return{x:-a-Math.sin(t)*r,z:-b-Math.cos(t)*r,nx:-Math.sin(t),nz:-Math.cos(t)};}
        case 6:return{x:-a-r,z:-b+u,nx:-1,nz:0};
        default:{const t=u/r;return{x:-a-Math.cos(t)*r,z:b+Math.sin(t)*r,nx:-Math.cos(t),nz:Math.sin(t)};}
      }}
    return{L,at};
  }

  // a horizontal band (tread) + vertical face (riser) following the ring
  function stepGeo(o0,o1,y,riserH){
    const r0=ring(o0),r1=ring(o1),n=Math.max(64,Math.round(r1.L/0.6));
    const pos=[],idx=[];
    for(let i=0;i<=n;i++){const p=r0.at(r0.L*i/n),q=r1.at(r1.L*i/n);
      pos.push(p.x,y,p.z,q.x,y,q.z,p.x,y-riserH,p.z);}
    for(let i=0;i<n;i++){const k=i*3,m=(i+1)*3;
      idx.push(k,m,k+1,k+1,m,m+1);            // tread
      idx.push(k+2,m+2,k,k,m+2,m);}           // riser
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
  }

  function courtTexture(){
    const PX=60,Wm=34,Hm=21,c=document.createElement('canvas');c.width=Wm*PX;c.height=Hm*PX;const g=c.getContext('2d');
    const X=m=>(m+Wm/2)*PX,Y=m=>(m+Hm/2)*PX;
    g.fillStyle='#16318f';g.fillRect(0,0,c.width,c.height);
    // maple boards
    g.save();g.beginPath();g.rect(X(-14),Y(-7.5),28*PX,15*PX);g.clip();
    for(let y=-7.5;y<7.5;y+=0.06){const t=0.84+Math.random()*0.18;g.fillStyle=`rgb(${222*t|0},${164*t|0},${92*t|0})`;g.fillRect(X(-14),Y(y),28*PX,0.06*PX+1);
      g.fillStyle='rgba(110,70,30,.25)';let x=-14+Math.random()*2;while(x<14){g.fillRect(X(x),Y(y),1.2,0.06*PX);x+=0.9+Math.random()*2.2;}}
    g.restore();
    const blue='#16318f',line='#f3f1ea',lw=0.05*PX;
    // keys + centre circle painted blue
    for(const s of[-1,1]){const bx=s*14;g.fillStyle=blue;g.fillRect(Math.min(X(bx),X(bx-s*5.8)),Y(-2.45),5.8*PX,4.9*PX);}
    g.beginPath();g.arc(X(0),Y(0),1.8*PX,0,Math.PI*2);g.fill();
    g.strokeStyle=line;g.lineWidth=lw;
    g.strokeRect(X(-14),Y(-7.5),28*PX,15*PX);
    g.beginPath();g.moveTo(X(0),Y(-7.5));g.lineTo(X(0),Y(7.5));g.stroke();
    g.beginPath();g.arc(X(0),Y(0),1.8*PX,0,Math.PI*2);g.stroke();
    for(const s of[-1,1]){const bx=s*14,hx=s*(14-1.575);
      g.strokeRect(Math.min(X(bx),X(bx-s*5.8)),Y(-2.45),5.8*PX,4.9*PX);
      g.beginPath();g.arc(X(bx-s*5.8),Y(0),1.8*PX,s>0?Math.PI/2:-Math.PI/2,s>0?Math.PI*1.5:Math.PI/2);g.stroke();
      // three-point line: straight 0.9 m from the sidelines, arc of 6.75 m
      const ang=Math.asin(6.6/6.75),cx=X(hx);
      g.beginPath();g.moveTo(X(bx),Y(-6.6));g.lineTo(X(hx-s*Math.cos(ang)*6.75),Y(-6.6));
      g.arc(cx,Y(0),6.75*PX,s>0?Math.PI+ang:-ang, s>0?Math.PI-ang:ang, s>0);g.lineTo(X(bx),Y(6.6));g.stroke();
      g.beginPath();g.arc(cx,Y(0),1.25*PX,s>0?Math.PI/2:-Math.PI/2,s>0?Math.PI*1.5:Math.PI/2);g.stroke();
    }
    const t=new THREE.CanvasTexture(c);t.anisotropy=8;t.encoding=THREE.sRGBEncoding;return t;
  }

  function hoop(s){
    const grp=new THREE.Group(),white=new THREE.MeshStandardMaterial({color:0xe9e9e6,roughness:.4,metalness:.3}),
      pad=new THREE.MeshStandardMaterial({color:0x1d3ba6,roughness:.7});
    const bx=s*14;
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.0,2.2),pad);base.position.set(bx+s*2.4,0.5,0);base.castShadow=true;grp.add(base);
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.35,1.6,0.6),pad);post.position.set(bx+s*2.2,1.8,0);grp.add(post);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.18,0.3),white);arm.position.set(bx+s*0.9,3.05,0);arm.rotation.z=s*0.42;arm.castShadow=true;grp.add(arm);
    const arm2=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.14,0.26),white);arm2.position.set(bx+s*0.4,3.6,0);grp.add(arm2);
    const board=new THREE.Mesh(new THREE.BoxGeometry(0.04,1.05,1.8),new THREE.MeshPhysicalMaterial({color:0xddeeff,roughness:0.05,transmission:0.0,transparent:true,opacity:0.22}));
    board.position.set(bx-s*1.2,3.425,0);grp.add(board);
    const fr=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.3});
    const edge=(w,h,d,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),fr);m.position.set(x,y,z);grp.add(m);};
    const fx=bx-s*1.2;edge(0.05,0.05,1.8,fx,3.95,0);edge(0.05,0.05,1.8,fx,2.9,0);edge(0.05,1.05,0.05,fx,3.425,0.9);edge(0.05,1.05,0.05,fx,3.425,-0.9);
    edge(0.05,0.05,0.59,fx,3.5,0);edge(0.05,0.45,0.05,fx,3.275,0.295);edge(0.05,0.45,0.05,fx,3.275,-0.295);
    const shot=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.45,0.7),new THREE.MeshStandardMaterial({color:0x111111,emissive:0xff3b1f,emissiveIntensity:0.6}));shot.position.set(fx+s*0.05,4.25,0);grp.add(shot);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.2286,0.01,8,40),new THREE.MeshStandardMaterial({color:0xe2531f,roughness:.4,metalness:.4}));
    rim.rotation.x=Math.PI/2;rim.position.set(s*(14-1.575),3.05,0);rim.castShadow=true;grp.add(rim);
    // net
    const pts=[],N=12;for(let i=0;i<N;i++){const a=i/N*Math.PI*2,b=(i+1.5)/N*Math.PI*2,c=(i-1.5)/N*Math.PI*2;
      for(const e of[b,c])pts.push(new THREE.Vector3(Math.cos(a)*0.2286,0,Math.sin(a)*0.2286),new THREE.Vector3(Math.cos(e)*0.14,-0.42,Math.sin(e)*0.14));}
    const net=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff}));net.position.copy(rim.position);grp.add(net);
    return grp;
  }

  function build(){
    scene=new THREE.Scene();scene.background=new THREE.Color(0x07080b);scene.fog=new THREE.FogExp2(0x07080b,0.011);
    // ---- light rig: roof spots on the court, soft fill everywhere ----
    scene.add(new THREE.HemisphereLight(0x8fa0d8,0x120e0a,0.18));
    const amb=new THREE.AmbientLight(0x30364a,0.12);scene.add(amb);
    for(const[x,z]of[[-9,-5],[-9,5],[0,-6],[0,6],[9,-5],[9,5]]){
      const sp=new THREE.SpotLight(0xfff1dc,2.1,95,0.42,0.55,1.1);sp.position.set(x*1.3,34,z*1.6);sp.target.position.set(x,0,z);
      sp.castShadow=true;sp.shadow.mapSize.set(1024,1024);sp.shadow.bias=-0.0004;scene.add(sp,sp.target);}
    const bowlLight=new THREE.PointLight(0xb8c6ff,0.35,120,1.4);bowlLight.position.set(0,26,0);scene.add(bowlLight);

    // ---- floors ----
    const conc=new THREE.MeshStandardMaterial({color:0x3a3b3e,roughness:.8});
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(120,90),conc);fl.rotation.x=-Math.PI/2;fl.position.y=-0.01;fl.receiveShadow=true;scene.add(fl);
    const court=new THREE.Mesh(new THREE.PlaneGeometry(34,21),new THREE.MeshStandardMaterial({map:courtTexture(),roughness:.16,metalness:.08}));
    court.rotation.x=-Math.PI/2;court.receiveShadow=true;scene.add(court);
    // courtside LED boards + scorer's table
    const led=new THREE.MeshStandardMaterial({color:0x0b0d18,emissive:0x1d3cff,emissiveIntensity:0.55});
    for(const z of[-11.2,11.2]){const m=new THREE.Mesh(new THREE.BoxGeometry(30,0.9,0.15),led);m.position.set(0,0.45,z);scene.add(m);}
    const table=new THREE.Mesh(new THREE.BoxGeometry(9,0.8,0.8),new THREE.MeshStandardMaterial({color:0x111318,roughness:.5}));table.position.set(0,0.4,-12.3);scene.add(table);

    // ---- bowl: lower tier, concourse, upper tier ----
    const step=new THREE.MeshStandardMaterial({color:0x4b4b4a,roughness:.9,side:THREE.DoubleSide});
    for(let i=0;i<NL;i++){const m=new THREE.Mesh(stepGeo(i*ROW,(i+1)*ROW,(i+1)*RISE,RISE),step);m.receiveShadow=true;scene.add(m);}
    {const m=new THREE.Mesh(stepGeo(L1,U0,H1,0.01),new THREE.MeshStandardMaterial({color:0x5c5953,roughness:.8,side:THREE.DoubleSide}));scene.add(m);
     const wall=new THREE.Mesh(stepGeo(U0-0.02,U0,H2,H2-H1),new THREE.MeshStandardMaterial({color:0x8d877b,roughness:.7,side:THREE.DoubleSide}));scene.add(wall);
     // glowing ribbon board under the upper tier
     const rb=new THREE.Mesh(stepGeo(U0-0.05,U0-0.04,H2-0.2,0.6),new THREE.MeshStandardMaterial({color:0x0a1030,emissive:0x2a55ff,emissiveIntensity:0.9,side:THREE.DoubleSide}));scene.add(rb);}
    for(let i=0;i<NU;i++){const m=new THREE.Mesh(stepGeo(U0+i*UROW,U0+(i+1)*UROW,H2+(i+1)*URISE,URISE),step);scene.add(m);}
    {const back=new THREE.Mesh(stepGeo(LOUT,LOUT+0.3,40,40-H2-NU*URISE),new THREE.MeshStandardMaterial({color:0x2a2a2c,roughness:.9,side:THREE.DoubleSide}));scene.add(back);}
    // railings along the front of the lower tier and the concourse
    const rail=new THREE.MeshStandardMaterial({color:0xb8bcc2,metalness:.8,roughness:.3});
    for(const[o,y]of[[-0.1,1.0],[L1+0.05,H1+1.05],[U0-0.1,H2+1.0]]){const g=stepGeo(o,o+0.06,y,0.06);scene.add(new THREE.Mesh(g,rail));}

    // ---- seats: instanced, navy with charcoal blocks, aisles every 16 seats ----
    const cushion=new THREE.BoxGeometry(0.46,0.09,0.42),backG=new THREE.BoxGeometry(0.46,0.5,0.07);
    const seatMat=new THREE.MeshStandardMaterial({roughness:.5,metalness:.05});
    const seats=[];
    function rowSeats(o,y,tier,rowI){const r=ring(o+0.42),n=Math.floor(r.L/0.52);
      for(let i=0;i<n;i++){if(i%18>=16)continue;const p=r.at(r.L*i/n);seats.push({p,y,tier,rowI,col:i});}}
    for(let i=0;i<NL;i++)rowSeats(i*ROW,(i+1)*RISE,0,i);
    for(let i=0;i<NU;i++)rowSeats(U0+i*UROW,H2+(i+1)*URISE,1,i);
    const im1=new THREE.InstancedMesh(cushion,seatMat,seats.length),im2=new THREE.InstancedMesh(backG,seatMat,seats.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),SC=new THREE.Vector3(1,1,1),C=new THREE.Color();
    const navy=new THREE.Color(0x132a6e),navy2=new THREE.Color(0x1a3a8f),char=new THREE.Color(0x141519);
    seats.forEach((s,i)=>{
      const yaw=Math.atan2(s.p.nx,s.p.nz);E.set(0,yaw,0);Q.setFromEuler(E);
      V.set(s.p.x,s.y+0.45,s.p.z);M.compose(V,Q,SC);im1.setMatrixAt(i,M);
      V.set(s.p.x+s.p.nx*0.2,s.y+0.72,s.p.z+s.p.nz*0.2);M.compose(V,Q,SC);im2.setMatrixAt(i,M);
      const block=Math.floor(s.col/18);const dark=(block+s.tier)%3===0||(s.rowI%9===8);
      C.copy(dark?char:((s.col+s.rowI)%7===0?navy2:navy));C.offsetHSL(0,0,(Math.random()-.5)*0.03);im1.setColorAt(i,C);im2.setColorAt(i,C);
    });
    scene.add(im1,im2);

    // ---- roof: dark deck, truss grid, rows of spot fixtures ----
    const roof=new THREE.Mesh(new THREE.PlaneGeometry(140,110),new THREE.MeshStandardMaterial({color:0x0c0d10,roughness:1}));roof.rotation.x=Math.PI/2;roof.position.y=40;scene.add(roof);
    const tpts=[];for(let x=-60;x<=60;x+=4){tpts.push(new THREE.Vector3(x,37,-48),new THREE.Vector3(x,37,48));}
    for(let z=-48;z<=48;z+=4){tpts.push(new THREE.Vector3(-60,37.6,z),new THREE.Vector3(60,37.6,z));}
    for(let x=-60;x<60;x+=4)for(let z=-48;z<48;z+=8){tpts.push(new THREE.Vector3(x,37,z),new THREE.Vector3(x+4,37.6,z+4));}
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tpts),new THREE.LineBasicMaterial({color:0x3a3d44})));
    const bulb=new THREE.MeshBasicMaterial({color:0xffffff}),bulbG=new THREE.SphereGeometry(0.28,10,8);
    const bulbs=new THREE.InstancedMesh(bulbG,bulb,180);let bi=0;
    for(const[o,cnt]of[[-6,40],[6,46],[20,60],[34,34]]){const r=ring(o);for(let i=0;i<cnt&&bi<180;i++){const p=r.at(r.L*i/cnt);M.makeTranslation(p.x,36.4,p.z);bulbs.setMatrixAt(bi++,M);}}
    bulbs.count=bi;scene.add(bulbs);
    // ---- centre-hung video board ----
    const jb=new THREE.Group();
    const screen=new THREE.MeshStandardMaterial({color:0x0d0e11,roughness:.35,metalness:.2});
    for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(7.5,5.2,0.3),screen);const a=i*Math.PI/2;s.position.set(Math.sin(a)*3.9,0,Math.cos(a)*3.9);s.rotation.y=a;s.rotation.x=0.08;jb.add(s);}
    const top=new THREE.Mesh(new THREE.BoxGeometry(8,0.4,8),new THREE.MeshStandardMaterial({color:0x111216}));top.position.y=2.8;jb.add(top);
    const ringL=new THREE.Mesh(new THREE.TorusGeometry(4.6,0.07,6,64),new THREE.MeshBasicMaterial({color:0xffffff}));ringL.rotation.x=Math.PI/2;ringL.position.y=-2.9;jb.add(ringL);
    jb.position.set(0,24,0);scene.add(jb);
    const cab=[];for(const[x,z]of[[3,3],[-3,3],[3,-3],[-3,-3]])cab.push(new THREE.Vector3(x,27,z),new THREE.Vector3(x,40,z));
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cab),new THREE.LineBasicMaterial({color:0x2b2d33})));
    // ---- hoops + a ball at centre court ----
    scene.add(hoop(-1),hoop(1));
    buildInvite();
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.121,32,24),new THREE.MeshStandardMaterial({color:0xd9632a,roughness:.65}));ball.position.set(0.6,0.121,0.4);ball.castShadow=true;scene.add(ball);
  }

  // ---------- invitation hunt ----------
  // a glowing envelope bobbing over one seat across the court, with sparkles, a soft light beam and a warm light
  const INV={x:0,z:-(B+4*ROW+0.42),seatY:5*RISE,yaw:0};let inv=null,opened=false,near=false;
  // a different seat every visit: any row of either tier, never right next to where you start
  (function pickSeat(){
    const SX=4.5,SZ=B+11.2,rows=[];
    for(let i=1;i<NL;i++)rows.push({o:i*ROW+0.42,y:(i+1)*RISE});
    for(let i=1;i<NU-1;i++)rows.push({o:U0+i*UROW+0.42,y:H2+(i+1)*URISE});
    for(let tries=0;tries<200;tries++){
      const row=rows[Math.floor(Math.random()*rows.length)],r=ring(row.o),n=Math.floor(r.L/0.52),i=Math.floor(Math.random()*n);
      if(i%18>=16)continue;const p=r.at(r.L*i/n);
      if(Math.hypot(p.x-SX,p.z-SZ)<14)continue;
      INV.x=p.x;INV.z=p.z;INV.seatY=row.y;INV.yaw=Math.atan2(p.nx,p.nz);return;
    }})();
  function envelopeTexture(){const c=document.createElement('canvas');c.width=512;c.height=340;const g=c.getContext('2d');
    g.fillStyle='#f4ecdc';g.fillRect(0,0,512,340);g.strokeStyle='rgba(120,90,50,.35)';g.lineWidth=3;
    g.beginPath();g.moveTo(0,0);g.lineTo(256,190);g.lineTo(512,0);g.stroke();g.beginPath();g.moveTo(0,340);g.lineTo(200,160);g.moveTo(512,340);g.lineTo(312,160);g.stroke();
    g.fillStyle='#d84a1b';g.beginPath();g.arc(256,190,34,0,Math.PI*2);g.fill();g.fillStyle='#ffd8c2';g.font='800 30px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('B',256,192);
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
  function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const r=g.createRadialGradient(64,64,0,64,64,64);
    r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.2,'rgba(255,220,150,.8)');r.addColorStop(.5,'rgba(255,170,80,.25)');r.addColorStop(1,'rgba(255,150,60,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
  function buildInvite(){
    const grp=new THREE.Group(),glow=glowTexture();
    const env=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.37,0.02),new THREE.MeshStandardMaterial({map:envelopeTexture(),emissive:0xffd9a0,emissiveIntensity:0.55,roughness:.6}));grp.add(env);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffd28a,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,transparent:true}));halo.scale.set(1.8,1.8,1);grp.add(halo);
    const N=70,pos=new Float32Array(N*3),seeds=[];for(let i=0;i<N;i++)seeds.push([Math.random()*Math.PI*2,0.25+Math.random()*0.75,Math.random()*1.6-0.4,0.4+Math.random()*1.2]);
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const sparks=new THREE.Points(pg,new THREE.PointsMaterial({map:glow,size:0.22,color:0xfff0c8,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));grp.add(sparks);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.9,9,24,1,true),new THREE.MeshBasicMaterial({color:0xffc98a,transparent:true,opacity:0.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    beam.position.y=4.4;grp.add(beam);
    const light=new THREE.PointLight(0xffc47a,2.2,6,1.6);light.position.y=0.6;grp.add(light);
    env.rotation.set(-Math.PI/2+0.12,0,0);env.position.y=0.02;halo.position.y=0.15;
    const hit=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.6,0.9),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=0.15;grp.add(hit);
    grp.position.set(INV.x,INV.seatY+0.52,INV.z);grp.rotation.y=INV.yaw+0.35;scene.add(grp);
    inv={grp,env,halo,sparks,seeds,pos,beam,light,hit};
  }
  function animateInvite(t){
    if(!inv)return;const{grp,env,halo,sparks,seeds,pos,beam,light}=inv;
    const tw=0.75+0.25*Math.sin(t*6)*Math.sin(t*2.3);
    halo.material.opacity=opened?0.15:(near?0.3+0.2*tw:0.55+0.45*tw);halo.scale.setScalar(near?0.9+0.3*tw:1.6+0.6*tw);
    light.intensity=opened?0.4:1.2+1.0*tw;beam.material.opacity=opened?0:0.07+0.05*tw;sparks.visible=!opened;
    env.material.emissiveIntensity=near?0.9+0.3*Math.sin(t*8):0.5;
    seeds.forEach(([a,r,h,sp],i)=>{const k=a+t*sp*0.6;pos[i*3]=Math.cos(k)*r*0.8;pos[i*3+1]=0.05+((t*0.3*sp+i*0.13)%1.3);pos[i*3+2]=Math.sin(k)*r*0.8;});
    sparks.geometry.attributes.position.needsUpdate=true;
    const d=Math.hypot(camera.position.x-INV.x,camera.position.z-INV.z),dy=Math.abs(camera.position.y-grp.position.y);
    near=d<4.2&&dy<3;
    const chip=$('invDist');
    if(opened){chip.hidden=true;}
    else{chip.hidden=false;chip.textContent=near?'초대장을 눌러서 열어보세요':'초대장까지 '+Math.max(0,Math.round(d))+'m';chip.classList.toggle('near',near);}
    renderer.domElement.style.cursor=near&&hoverInv?'pointer':'';
  }
  // click (tap) on the envelope: pick it with a ray from the camera
  let hoverInv=false;
  function hitInvite(cx,cy){
    if(!inv||!THREE)return false;const r=renderer.domElement.getBoundingClientRect();
    const v=new THREE.Vector2(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);const rc=new THREE.Raycaster();rc.setFromCamera(v,camera);
    return rc.intersectObject(inv.hit,false).length>0;
  }
  function tryOpen(cx,cy){
    if(opened||!hitInvite(cx,cy))return;
    if(!near){const c=$('invDist');c.textContent='더 가까이 가야 열 수 있어요';c.classList.add('shake');setTimeout(()=>c.classList.remove('shake'),500);return;}
    openInvite();
  }
  function openInvite(){
    opened=true;$('invDist').hidden=true;$('arenaHint').classList.add('off');onInvite&&onInvite();
    try{const ac=new (window.AudioContext||window.webkitAudioContext)(),t=ac.currentTime;
      [784,988,1175,1568].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t+i*0.08);g.gain.linearRampToValueAtTime(0.12,t+i*0.08+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.08+0.9);o.connect(g);g.connect(ac.destination);o.start(t+i*0.08);o.stop(t+i*0.08+1);});}catch{}
  }

  function setupControls(el){
    addEventListener('keydown',kd);addEventListener('keyup',ku);
    let press=null;
    el.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&!look.id&&THREE)hoverInv=near&&hitInvite(e.clientX,e.clientY);});
    el.addEventListener('pointerup',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<8&&performance.now()-press.t<450)tryOpen(e.clientX,e.clientY);press=null;});
    el.addEventListener('pointerdown',e=>{
      press={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()};
      el.setPointerCapture(e.pointerId);
      if(e.pointerType==='touch'&&e.clientX<innerWidth*0.45&&stick.id===null){stick={id:e.pointerId,ox:e.clientX,oy:e.clientY,x:0,y:0};showStick(e.clientX,e.clientY,0,0);}
      else if(look.id===null){look={id:e.pointerId,x:e.clientX,y:e.clientY};}
      hideHint();
    });
    el.addEventListener('pointermove',e=>{
      if(e.pointerId===stick.id){const dx=e.clientX-stick.ox,dy=e.clientY-stick.oy,l=Math.min(1,Math.hypot(dx,dy)/60)||0,a=Math.atan2(dy,dx);
        stick.x=Math.cos(a)*l;stick.y=Math.sin(a)*l;showStick(stick.ox,stick.oy,stick.x*60,stick.y*60);}
      else if(e.pointerId===look.id){S.yaw-=(e.clientX-look.x)*0.0042;S.pitch=Math.max(-1.3,Math.min(1.2,S.pitch-(e.clientY-look.y)*0.0042));look.x=e.clientX;look.y=e.clientY;}
    });
    const end=e=>{if(e.pointerId===stick.id){stick={id:null,x:0,y:0};$('stick').hidden=true;}if(e.pointerId===look.id)look.id=null;};
    el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  }
  function showStick(x,y,dx,dy){const s=$('stick');s.hidden=false;s.style.left=x+'px';s.style.top=y+'px';s.firstElementChild.style.transform=`translate(${dx}px,${dy}px)`;}
  function hideHint(){$('arenaHint').classList.add('off');}

  function tick(){
    const dt=Math.min(0.05,clock.getDelta());
    let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-stick.y;
    let r=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+stick.x;
    if(keys.KeyQ)S.yaw+=dt*1.6;if(keys.KeyE)S.yaw-=dt*1.6;
    const sp=(keys.ShiftLeft||keys.ShiftRight?7:3.6)*dt,l=Math.hypot(f,r);if(l>1){f/=l;r/=l;}
    if(f||r){hideHint();
      const fx=-Math.sin(S.yaw),fz=-Math.cos(S.yaw),rx=Math.cos(S.yaw),rz=-Math.sin(S.yaw);
      let nx=S.x+(fx*f+rx*r)*sp,nz=S.z+(fz*f+rz*r)*sp;
      if(sd(nx,nz)>LOUT-0.6){nx=S.x;nz=S.z;}                 // stay inside the building
      if(Math.abs(nx)>11.95&&Math.abs(nx)<17.6&&Math.abs(nz)<1.2&&Math.abs(S.x)<11.95){nx=S.x;}   // don't walk through the stanchions
      S.x=nx;S.z=nz;}
    const gy=ground(S.x,S.z)+1.65;S.y+=(gy-S.y)*Math.min(1,dt*10);    // eye height, easing up and down the steps
    camera.position.set(S.x,S.y+Math.sin(performance.now()/1000*7)*(f||r?0.025:0),S.z);
    camera.rotation.set(S.pitch,S.yaw,0,'YXZ');
    animateInvite(performance.now()/1000);
    if(!opened)renderer.render(scene,camera);   // the scene freezes behind the open card
    if(!disposed)raf=requestAnimationFrame(tick);
  }
  function stop(){disposed=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);removeEventListener('keydown',kd);removeEventListener('keyup',ku);try{renderer&&renderer.dispose();}catch{}container.innerHTML='';}
  function resize(){if(!renderer)return;const c=renderer.domElement;renderer.setSize(c.clientWidth,c.clientHeight,false);camera.aspect=c.clientWidth/c.clientHeight;camera.updateProjectionMatrix();}

  function closeInvite(){opened=false;}
  async function start(){
    if(started)return;started=true;
    const sec=container;
    THREE=THREE_NS;
    const cv=$('arenaCv');
    renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.95;
    camera=new THREE.PerspectiveCamera(62,1,0.05,400);
    build();
    // start like the reference photo: high in the lower bowl behind the near sideline, looking across the court
    S.x=4.5;S.z=B+11.2;S.y=ground(S.x,S.z)+1.65;S.yaw=Math.atan2(S.x-(-2),S.z-0)*1;S.yaw=Math.atan2(S.x+1,S.z);S.pitch=-0.36;
    setupControls(cv);resize();addEventListener('resize',resize);clock=new THREE.Clock();
    requestAnimationFrame(()=>sec.classList.add('in'));
    tick();
  }
  return{start,closeInvite,stop};
}
