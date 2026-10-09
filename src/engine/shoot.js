// Page 1 · webcam free throw.
// The engine owns the DOM inside its container (markup in shoot.html) and calls onMade() after a made shot.
import markup from './shoot.html?raw';
import gymFront from '../assets/gym-front.jpg';
import gymPatch from '../assets/gym-patch.png';
import ballMolten from '../assets/ball-molten.jpg';

export function startShoot(container,{onMade}={}){
  container.innerHTML=markup;
  let stopped=false;
  const goNext=()=>{if(!stopped&&onMade)onMade();};
  const view=document.getElementById('court'), cv=view, ctx=view.getContext('2d');
  const bgCv=document.createElement('canvas'), bg=bgCv.getContext('2d');
  const hudCv=document.getElementById('hudCv'), hctx=hudCv.getContext('2d');      // HUD stays crisp, outside the look
  let W=0,H=0,DPR=1;

  // ---- world (meters) ----
  const G=9.8, CAM_H=1.42, BALL_R=0.121, RIM_R=0.2286, RIM_T=0.009;
  // you stand on the free-throw line (4.225 m to rim center), eye just behind it
  const HOOP={x:0,y:3.05,z:8.6};
  const BB={z:HOOP.z+RIM_R+0.15, w:1.8, top:3.95, bot:2.9};
  const START={x:0,y:1.3,z:1.7};
  // speed that lands a shot at launch angle th (rad) just past the rim center
  const V_REQ=th=>{const dz=HOOP.z+0.06-START.z, dy=HOOP.y-START.y, c=Math.cos(th);return Math.sqrt(G*dz*dz/(2*c*c*(dz*Math.tan(th)-dy)));};

  // Camera solved from the photo (see IMG below); image pixels -> screen with a cover fit around the hoop
  let K=1,OX=0,OY=0;
  const P=(x,y,z)=>({x:OX+K*(IMG.cx+IMG.f*x/z), y:OY+K*(IMG.hy-IMG.f*(y-CAM_H)/z), s:K*IMG.f/z});
  function resize(){
    DPR=Math.min(window.devicePixelRatio||1,2);
    W=view.clientWidth;H=view.clientHeight;
    for(const c of[view,bgCv]){c.width=Math.round(W*DPR);c.height=Math.round(H*DPR);}
    const hd=DPR;hudCv.width=Math.round(W*hd);hudCv.height=Math.round(H*hd);hudCv._dpr=hd;
    K=Math.max(W/IMG.w,H/IMG.h);
    OX=Math.min(0,Math.max(W-IMG.w*K,W/2-IMG.cx*K));
    OY=Math.min(0,Math.max(H-IMG.h*K,H/2-IMG.focusY*K));
    drawBackground();
  }

  // ---- scene: the user's gym photo, with a 3D camera solved from its rim ----
  // Rim center (1014, 402) px, ~302 px/m at the rim, rim ellipse tilt ~11°, horizon from the lane lines at y=894.
  const IMG={w:2048,h:2048,cx:1014,hy:894,f:2597,focusY:720};
  const FY=0.28;                 // floor plane height that lands on the photo's floor under the hoop
  const photo=new Image(), patch=new Image(), PATCH={x:900,y:360,w:230,h:220};
  photo.onload=()=>drawBackground();
  photo.src=gymFront;
  patch.src=gymPatch;   // same area with the photo's own rim and net removed
  function drawBackground(){
    bg.setTransform(1,0,0,1,0,0);bg.fillStyle='#2b2a27';bg.fillRect(0,0,bgCv.width,bgCv.height);
    bg.setTransform(DPR,0,0,DPR,0,0);
    if(photo.complete&&photo.naturalWidth)bg.drawImage(photo,OX,OY,IMG.w*K,IMG.h*K);
  }

  // ---- rim & net: the photo's net is swapped for a simulated cord net while the ball is near ----
  let netSwing=0;
  const NS=12, NR=9, NET_LEN=0.43, NET_BOT=0.137;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const net={p:[],q:[],rest:[],links:[],home:[]};
  (function netInit(){
    for(let j=0;j<NR;j++)for(let i=0;i<NS;i++){
      const a=(i+(j%2)*0.5)/NS*Math.PI*2, r=lerp(RIM_R,NET_BOT,Math.pow(j/(NR-1),0.85)), y=HOOP.y-j*NET_LEN/(NR-1);
      const v={x:HOOP.x+Math.cos(a)*r,y,z:HOOP.z+Math.sin(a)*r};net.p.push({...v});net.q.push({...v});net.home.push({...v});net.rest.push({r});}
    const id=(j,i)=>j*NS+((i%NS)+NS)%NS;
    for(let j=0;j<NR-1;j++)for(let i=0;i<NS;i++){
      const a=id(j,i),b1=j%2===0?id(j+1,i-1):id(j+1,i),b2=j%2===0?id(j+1,i):id(j+1,i+1);
      for(const b of[b1,b2]){const A=net.p[a],B=net.p[b];net.links.push([a,b,Math.hypot(A.x-B.x,A.y-B.y,A.z-B.z)*1.04]);}}
  })();
  let netEnergy=0;
  function netStep(dt,withBall){
    let n=0,e=0;
    for(let k=NS;k<net.p.length;k++){
      const p=net.p[k],q=net.q[k],dm=withBall?0.978:0.955;const vx=(p.x-q.x)*dm,vy=(p.y-q.y)*dm,vz=(p.z-q.z)*dm;
      e+=vx*vx+vy*vy+vz*vz;
      q.x=p.x;q.y=p.y;q.z=p.z;p.x+=vx;p.y+=vy-G*dt*dt*0.6;p.z+=vz;
      const dx=p.x-HOOP.x,dz=p.z-HOOP.z,r=Math.hypot(dx,dz)||1e-6,tr=net.rest[k].r;p.x+=(dx/r*tr-dx)*0.06;p.z+=(dz/r*tr-dz)*0.06;
    }
    netEnergy=e/(dt*dt);
    for(let it=0;it<10;it++){
      for(const[a,b,L]of net.links){const A=net.p[a],B=net.p[b];const dx=B.x-A.x,dy=B.y-A.y,dz=B.z-A.z,d=Math.hypot(dx,dy,dz)||1e-6;
        if(d<=L)continue;const k=(d-L)/d,wa=a<NS?0:1,wb=b<NS?0:1,ws=wa+wb;if(!ws)continue;
        A.x+=dx*k*wa/ws;A.y+=dy*k*wa/ws;A.z+=dz*k*wa/ws;B.x-=dx*k*wb/ws;B.y-=dy*k*wb/ws;B.z-=dz*k*wb/ws;}
      if(withBall){const bp=ball.p,bv=ball.v;
        for(let k=NS;k<net.p.length;k++){const p=net.p[k];const dx=p.x-bp.x,dy=p.y-bp.y,dz=p.z-bp.z,d=Math.hypot(dx,dy,dz),m=BALL_R+0.006;
          if(d<m&&d>1e-6){p.x=bp.x+dx/d*m;p.y=bp.y+dy/d*m;p.z=bp.z+dz/d*m;const q=net.q[k];
            q.x=lerp(q.x,p.x-bv.x*dt,0.35);q.y=lerp(q.y,p.y-bv.y*dt,0.35);q.z=lerp(q.z,p.z-bv.z*dt,0.35);if(it===0)n++;}}}
    }
    return n;
  }
  // how much of the simulated hoop is shown over the photo (0 = pure photo)
  let hoopMix=0,hoopActive=false,hoopQuiet=0;
  function netReset(){net.p.forEach((p,i)=>{Object.assign(p,net.home[i]);Object.assign(net.q[i],net.home[i]);});}
  function rimPath(c,front){c.beginPath();for(let i=0;i<=48;i++){const a=(front?Math.PI:0)+i/48*Math.PI,p=P(HOOP.x+Math.cos(a)*RIM_R,HOOP.y,HOOP.z+Math.sin(a)*RIM_R);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}}
  function drawRim(c,front){
    const s=P(0,0,HOOP.z).s;c.lineCap='round';
    rimPath(c,front);c.strokeStyle=front?'#b8410f':'#8f300c';c.lineWidth=Math.max(2,s*0.026);c.stroke();
    c.save();c.translate(0,-Math.max(.8,s*0.006));rimPath(c,front);c.strokeStyle=front?'#f0742f':'#cf5420';c.lineWidth=Math.max(1.2,s*0.012);c.stroke();c.restore();
  }
  function drawNet(c,back){
    const s=P(0,0,HOOP.z).s;c.lineWidth=Math.max(1,s*0.007);c.lineCap='round';
    c.strokeStyle=back?'rgba(205,205,200,.95)':'rgba(250,250,247,.98)';c.beginPath();
    for(const[a,b]of net.links){const A=net.p[a],B=net.p[b];if(((A.z+B.z)/2>HOOP.z)!==back)continue;
      const pa=P(A.x,A.y,A.z),pb=P(B.x,B.y,B.z);c.moveTo(pa.x,pa.y);c.lineTo(pb.x,pb.y);}
    c.stroke();
  }
  // photo-clean patch + simulated rim/net, faded in only around the hoop
  const hoopCv=document.createElement('canvas'),hoopCtx=hoopCv.getContext('2d');
  function drawHoop(ballBehind){
    if(hoopMix<0.003){if(ballBehind)drawBall();return;}
    const x0=OX+PATCH.x*K,y0=OY+PATCH.y*K,w=PATCH.w*K,h=PATCH.h*K;
    hoopCv.width=Math.ceil(w*DPR);hoopCv.height=Math.ceil(h*DPR);
    const c=hoopCtx;c.setTransform(DPR,0,0,DPR,-x0*DPR,-y0*DPR);
    if(patch.complete&&patch.naturalWidth)c.drawImage(patch,x0,y0,w,h);
    drawRim(c,false);drawNet(c,true);
    if(ballBehind)drawBall(c);
    drawNet(c,false);drawRim(c,true);
    ctx.save();ctx.globalAlpha=hoopMix;ctx.drawImage(hoopCv,x0,y0,w,h);ctx.restore();
    if(ballBehind&&hoopMix<1){ctx.save();ctx.globalAlpha=1-hoopMix;drawBall();ctx.restore();}
  }

  // ---- ball ----
  const ball={state:'idle',p:{...START},v:{x:0,y:0,z:0},t:0,spin:0,backspin:0,touched:false,scored:false,airball:true,cross:null,info:null};
  function resetBall(){Object.assign(ball,{state:'idle',p:{...START},v:{x:0,y:0,z:0},t:0,spin:0,backspin:0,touched:false,scored:false,airball:true,cross:null,info:null});}
  // the Molten ball photo wrapped onto a sphere, so backspin rolls the logo over the top like a real ball
  const texImg=new Image();let tex=null;const TEX=320;
  texImg.onload=()=>{const c=document.createElement('canvas');c.width=c.height=TEX;const g=c.getContext('2d');g.drawImage(texImg,0,0,TEX,TEX);tex=g.getImageData(0,0,TEX,TEX).data;sprKey='';};
  texImg.src=ballMolten;
  const spr=document.createElement('canvas'),sctx=spr.getContext('2d');
  let sprKey='';
  function ballSprite(r,ang){
    const key=Math.round(r*2)+'|'+Math.round(ang*60)+'|'+(tex?1:0);if(key===sprKey)return spr;sprKey=key;
    const R=Math.ceil(r)+2,S=R*2;spr.width=S;spr.height=S;
    const img=sctx.createImageData(S,S),d=img.data;
    const ca=Math.cos(ang),sa=Math.sin(ang);
    const L=[0.12,0.9,0.42],Ln=Math.hypot(...L),lx=L[0]/Ln,ly=L[1]/Ln,lz=L[2]/Ln,hn=Math.hypot(lx,ly,lz+1);
    for(let py=0;py<S;py++)for(let px=0;px<S;px++){
      const u=(px+0.5-R)/r,v=-(py+0.5-R)/r,rr=u*u+v*v;if(rr>1.02)continue;
      const edge=Math.min(1,Math.max(0,(1-Math.sqrt(rr))*r+0.5)),nz=Math.sqrt(Math.max(0,1-rr));
      // camera normal -> ball space (undo the backspin about the horizontal axis)
      const qx=u,qy=v*ca+nz*sa,qz=-v*sa+nz*ca;
      let cr=200,cg=88,cb=38;
      if(tex){
        // front half shows the photo, the back half a mirrored copy of it
        const tx=qz>=0?qx:-qx,ty=qy;
        const ix=Math.min(TEX-1,Math.max(0,((tx*0.985)*0.5+0.5)*TEX|0)),iy=Math.min(TEX-1,Math.max(0,((-ty*0.985)*0.5+0.5)*TEX|0)),o=(iy*TEX+ix)*4;
        // the photo already has its own edge falloff; take it out so it doesn't roll onto the face
        const baked=0.58+0.42*Math.sqrt(Math.max(0,1-(tx*tx+ty*ty)));
        cr=Math.min(255,tex[o]/baked);cg=Math.min(255,tex[o+1]/baked);cb=Math.min(255,tex[o+2]/baked);
      }
      const dif=Math.max(0,u*lx+v*ly+nz*lz),spec=Math.pow(Math.max(0,(u*lx+v*ly+nz*(lz+1))/hn),18)*0.16;
      const lit=(0.42+0.66*dif)*(0.78+0.22*nz),bounce=Math.max(0,-v)*0.1;
      const o=(py*S+px)*4;
      d[o]=Math.min(255,cr*lit+255*spec+cr*bounce);d[o+1]=Math.min(255,cg*lit+245*spec+cg*bounce*0.7);d[o+2]=Math.min(255,cb*lit+225*spec);d[o+3]=255*edge;
    }
    sctx.putImageData(img,0,0);return spr;
  }
  function drawBall(c=ctx){
    // the projection divides by z: near or behind the camera the radius blows up or goes negative and canvas throws
    if(ball.p.z<0.6)return;
    const b=ball.p, p=P(b.x,b.y,b.z), r=BALL_R*p.s;
    // soft shadow from the overhead lights on the photo's floor plane
    const sh=P(b.x,FY,b.z),h=Math.max(0,b.y-FY-BALL_R);
    c.save();c.filter=`blur(${(2+h*5).toFixed(1)}px)`;c.fillStyle=`rgba(40,28,16,${Math.max(0.04,0.45-h*0.14)})`;
    c.beginPath();c.ellipse(sh.x,sh.y,r*(1+h*0.3),r*(0.26+h*0.05),0,0,Math.PI*2);c.fill();c.restore();
    const s=ballSprite(r,ball.spin),R=s.width/2;
    // motion blur over half a frame
    const v=ball.v,q=P(b.x-v.x/120,b.y-v.y/120,b.z-v.z/120);
    const steps=ball.state==='flying'?Math.min(6,Math.max(0,Math.round(Math.hypot(p.x-q.x,p.y-q.y)/(r*0.35)))):0;
    const base=c.globalAlpha;
    for(let k=steps;k>=0;k--){const t=k/Math.max(1,steps);c.globalAlpha=base*(k===0?1:0.22);c.drawImage(s,lerp(p.x,q.x,t)-R,lerp(p.y,q.y,t)-R);}
    c.globalAlpha=base;
  }

  let lastHit=-1;
  function step(dt){
    const b=ball.p,v=ball.v,prevY=b.y;
    v.y-=G*dt;b.x+=v.x*dt;b.y+=v.y*dt;b.z+=v.z*dt;ball.t+=dt;ball.spin+=dt*(3+ball.backspin*14);
    // rim
    const dx=b.x-HOOP.x,dz=b.z-HOOP.z,L=Math.hypot(dx,dz)||1e-6;
    const cx=HOOP.x+dx/L*RIM_R,cz=HOOP.z+dz/L*RIM_R;
    const nx=b.x-cx,ny=b.y-HOOP.y,nz=b.z-cz,d=Math.hypot(nx,ny,nz),min=BALL_R+RIM_T;
    if(d<min){const ux=nx/d,uy=ny/d,uz=nz/d;b.x=cx+ux*min;b.y=HOOP.y+uy*min;b.z=cz+uz*min;
      const vn=v.x*ux+v.y*uy+v.z*uz;if(vn<0){const e=0.58-0.22*ball.backspin,fr=0.9-0.12*ball.backspin;
        v.x-=(1+e)*vn*ux;v.y-=(1+e)*vn*uy;v.z-=(1+e)*vn*uz;
        const n2=v.x*ux+v.y*uy+v.z*uz;v.x=n2*ux+(v.x-n2*ux)*fr;v.y=n2*uy+(v.y-n2*uy)*fr;v.z=n2*uz+(v.z-n2*uz)*fr;}
      if(-vn>0.6&&ball.t-lastHit>0.06){lastHit=ball.t;sfx.rim(Math.min(1,-vn/6));}ball.touched=true;ball.airball=false;}
    // backboard
    if(b.z+BALL_R>BB.z&&b.z<BB.z+0.1&&Math.abs(b.x)<BB.w/2&&b.y>BB.bot&&b.y<BB.top&&v.z>0){b.z=BB.z-BALL_R;if(ball.t-lastHit>0.06){lastHit=ball.t;sfx.board(Math.min(1,v.z/6));}v.z*=-(0.5-0.15*ball.backspin);v.x*=0.9-0.12*ball.backspin;ball.airball=false;}
    // floor
    if(b.y<FY+BALL_R){b.y=FY+BALL_R;if(v.y<-0.8)sfx.floor(Math.min(1,-v.y/7));if(v.y<0){v.y*=-0.7;if(Math.abs(v.y)<0.2)v.y=0;v.x*=.85;v.z=v.z*0.6-ball.backspin*0.9;}}
    // score
    if(!ball.cross&&prevY>=HOOP.y&&b.y<HOOP.y&&v.y<0)ball.cross={x:b.x-HOOP.x,z:b.z-HOOP.z};
    if(!ball.scored&&prevY>=HOOP.y&&b.y<HOOP.y&&v.y<0&&Math.hypot(b.x-HOOP.x,b.z-HOOP.z)<RIM_R-0.02){ball.scored=true;netSwing=1;sfx.swish(ball.touched);setTimeout(onScored,0);}
  }

  // ---- HUD / type / sound ----
  let att=0,made=false;
  const $=id=>document.getElementById(id);
  function showPower(p,extra){$('powFill').style.width=(p*100).toFixed(0)+'%';$('powTxt').textContent=Math.round(p*100)+'%'+(extra||'');}
  const pad=(n,l=2)=>String(n).padStart(l,'0');
  let subT=0;
  function sub(ko,en,ms=2600){$('subKo').textContent=ko;$('subEn').textContent=en;$('subEn').hidden=!en;$('sub').classList.add('on');clearTimeout(subT);subT=setTimeout(()=>$('sub').classList.remove('on'),ms);}
  function big(word,meta){$('bigW').textContent=word;$('bigM').textContent=meta;const b=$('big');b.classList.remove('on');void b.offsetWidth;b.classList.add('on');}
  function flash(){$('flash').animate([{opacity:.55},{opacity:0}],{duration:420,easing:'ease-out'});}
  function showTag(shot){
    const t=$('tag'),rim=P(0,HOOP.y,HOOP.z),r=v=>v.toFixed(2);
    const dir=Math.abs(shot.aim)<0.4?'CENTER':(shot.aim>0?'R ':'L ')+Math.abs(shot.aim).toFixed(1)+'°';
    t.innerHTML=`<div class="hd"><b>Release ${pad(att)}</b><span>LIVE</span></div>
  <div class="row"><span>Arc</span><span>${shot.arc.toFixed(1)}°</span></div>
  <div class="row"><span>Wrist speed</span><span>${r(shot.speed||0)} m/s</span></div>
  <div class="row"><span>Arm rise</span><span>${r(shot.rise||0)} m/s</span></div>
  <div class="row"><span>Finger close</span><span>${r(shot.gather||0)} /s</span></div>
  <div class="row"><span>Backspin</span><span>${r(shot.spin)}</span></div>
  <div class="row"><span>Line</span><span>${dir}</span></div>
  <div class="row"><span>Distance</span><span>4.23 m</span></div><div class="bc"></div>`;
    const x=Math.max(16,rim.x-P(0,0,HOOP.z).s*1.6-190), y=Math.max(40,rim.y-60);
    t.style.left=x+'px';t.style.top=y+'px';t.classList.add('on');
  }
  function hideTag(){$('tag').classList.remove('on');}


  // synthesized sound design (no audio files); browsers allow it after the first click or key press
  const sfx=(()=>{let ac=null,master=null,noiseBuf=null;
    const ok=()=>{if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.7;master.connect(ac.destination);
      noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}catch{return false;}}
      if(ac.state==='suspended')ac.resume();return ac.state==='running';};
    const noise=(dur,freq,q,gain,type='bandpass',t0=0)=>{if(!ok())return null;const t=ac.currentTime+t0,s=ac.createBufferSource();s.buffer=noiseBuf;
      const f=ac.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.05);return f;};
    const tone=(freq,dur,gain,type='sine',t0=0,glide)=>{if(!ok())return;const t=ac.currentTime+t0,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
      if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.05);};
    addEventListener('pointerdown',ok);addEventListener('keydown',ok);
    return{
      release(){const f=noise(.35,900,.7,.18);if(f)f.frequency.exponentialRampToValueAtTime(2600,ac.currentTime+.3);},
      rim(k){[610,1270,2210,3170].forEach((fq,i)=>tone(fq*(1+Math.random()*.01),.5-i*.08,.22*k/(i+1),'triangle'));noise(.06,3000,1,.2*k);},
      board(k){tone(140,.25,.45*k,'sine',0,70);noise(.12,600,.8,.3*k);},
      floor(k){tone(95,.22,.6*k,'sine',0,55);noise(.05,400,1,.25*k,'lowpass');},
      swish(touched){noise(.42,touched?4200:5200,.5,.32,'highpass');noise(.3,2400,.6,.18,'bandpass',.05);},
      made(){tone(55,1.2,.55,'sine',0,38);tone(110,.9,.18,'sawtooth',0,90);noise(1.1,180,.7,.25,'lowpass');[0,.08,.16].forEach((d,i)=>tone([659,784,988][i],.6,.06,'triangle',.12+d));},
      miss(){tone(196,.25,.08,'square',0,150);}
    };})();

  // shot = {f: speed factor (1 = perfect length for this arc), arc: launch angle deg, aim: left/right deg, spin: 0..1 backspin}
  function shoot(shot){
    if(ball.state!=='idle')return;
    const arc=Math.max(32,Math.min(75,shot.arc))*Math.PI/180, aim=Math.max(-15,Math.min(15,shot.aim))*Math.PI/180;
    const v=V_REQ(arc)*Math.max(0.7,Math.min(1.3,shot.f)), hz=v*Math.cos(arc);
    ball.v.y=v*Math.sin(arc);ball.v.z=hz*Math.cos(aim);ball.v.x=hz*Math.sin(aim);
    ball.backspin=Math.max(0,Math.min(1,shot.spin));ball.info=shot;
    ball.state='flying';att++;sfx.release();$('attTxt').textContent='Attempt '+pad(att)+' · Ball in flight';ball.trail=[];
  }
  // fires the instant the ball drops through the rim: big type now, next page after it lands
  function onScored(){
    if(made)return;made=true;sfx.made();flash();
    const info=ball.info||{arc:55,spin:0};
    big(ball.touched?'MADE.':'SWISH.',`Attempt ${pad(att)} · Arc ${info.arc.toFixed(1)}° · Snap ${info.spin.toFixed(2)}`);
    $('attTxt').textContent='Attempt '+pad(att)+' · Made';
    setTimeout(()=>{$('big').classList.remove('on');hideTag();},2000);
    setTimeout(goNext,2450);
  }
  function finishShot(){
    ball.state='done';
    if(ball.info&&ball.info.report)ball.info.report(ball);
    if(ball.scored){
      // the made sequence already started the moment the ball dropped through (onScored)
    }else{
      sfx.miss();$('attTxt').textContent='Attempt '+pad(att)+' · Missed · Shoot again';
      setTimeout(()=>{hideTag();resetBall();},900);
    }
  }

  // tracking box that rides the ball, with live readouts
  function drawTracking(){
    if(ball.p.z<0.6)return;
    const b=ball.p,sp=P(b.x,b.y,b.z),r=Math.max(10,BALL_R*sp.s);
    if(ball.state==='flying'){ball.trail=ball.trail||[];ball.trail.push({...b});if(ball.trail.length>90)ball.trail.shift();}
    const tr=ball.trail||[];
    hctx.save();
    hctx.strokeStyle='rgba(255,90,31,.75)';hctx.lineWidth=1;hctx.setLineDash([2,4]);hctx.beginPath();
    tr.forEach((q,i)=>{const p=P(q.x,q.y,q.z);i?hctx.lineTo(p.x,p.y):hctx.moveTo(p.x,p.y);});hctx.stroke();hctx.setLineDash([]);
    if(ball.state==='flying'){
      const s=r*1.5,x0=sp.x-s,y0=sp.y-s,L=Math.max(5,s*.35);
      hctx.strokeStyle='rgba(236,232,223,.9)';hctx.lineWidth=1;hctx.beginPath();
      for(const[cx,cy,dx,dy]of[[x0,y0,1,1],[x0+2*s,y0,-1,1],[x0,y0+2*s,1,-1],[x0+2*s,y0+2*s,-1,-1]]){hctx.moveTo(cx+dx*L,cy);hctx.lineTo(cx,cy);hctx.lineTo(cx,cy+dy*L);}
      hctx.stroke();
      const v=Math.hypot(ball.v.x,ball.v.y,ball.v.z),dr=Math.hypot(b.x-HOOP.x,b.y-HOOP.y,b.z-HOOP.z);
      hctx.font='400 10px "JetBrains Mono",ui-monospace,monospace';hctx.textBaseline='top';
      const lines=['OBJ 01 · BALL','V    '+v.toFixed(2)+' M/S','H    '+b.y.toFixed(2)+' M','RIM  '+dr.toFixed(2)+' M'];
      const lx=x0+2*s+8,ly=y0;
      hctx.fillStyle='rgba(10,13,16,.55)';hctx.fillRect(lx-3,ly-2,118,lines.length*13+4);
      lines.forEach((t,i)=>{hctx.fillStyle=i?'rgba(236,232,223,.85)':'#ff5a1f';hctx.fillText(t,lx,ly+i*13);});
    }
    hctx.restore();
  }
  const T0=performance.now();
  function timecode(now){const f=Math.floor((now-T0)/1000*24),s=Math.floor(f/24),m=Math.floor(s/60),h=Math.floor(m/60);return pad(h)+':'+pad(m%60)+':'+pad(s%60)+':'+pad(f%24);}

  let last=performance.now();
  function frame(now){
    if(stopped)return;
    // queue the next frame first: one bad frame must not stop the loop (and with it the ball reset)
    requestAnimationFrame(frame);
    const dt=Math.min(0.05,(now-last)/1000);last=now;
    const live=ball.state==='flying'||ball.state==='done';
    const n=Math.ceil(dt*240);
    for(let i=0;i<n;i++){
      if(live)step(dt/n);
      const near=live&&Math.abs(ball.p.y-HOOP.y)<0.8&&Math.hypot(ball.p.x-HOOP.x,ball.p.z-HOOP.z)<0.6;
      const c=hoopMix>0||hoopActive?netStep(dt/n,near):0;
      if(near&&c){const k=1-0.0016*Math.min(c,20);ball.v.x*=k;ball.v.y*=k;ball.v.z*=k;}
    }
    if(ball.state==='flying'&&(ball.t>3.6||ball.p.z>11||ball.p.z<1.2||(ball.p.y<FY+0.2&&Math.hypot(ball.v.x,ball.v.y,ball.v.z)<0.5)))finishShot();
    if(!live)ball.p.y=START.y+Math.sin(now/400)*0.015;
    // show the simulated net only while the ball is around the hoop or the net is still moving
    // latch: switch to the simulated net once when the ball arrives, keep it until the net has been calm
    // for a while, then fade back to the photo once (no flicker between the two nets)
    const nearHoop=live&&Math.hypot(ball.p.x-HOOP.x,ball.p.y-HOOP.y,ball.p.z-HOOP.z)<1.6;
    if(nearHoop){hoopActive=true;hoopQuiet=0;}
    else if(hoopActive){hoopQuiet=netEnergy<0.05?hoopQuiet+dt:0;if(hoopQuiet>0.9)hoopActive=false;}
    hoopMix+=((hoopActive?1:0)-hoopMix)*Math.min(1,dt*(hoopActive?14:2.2));
    if(!hoopActive&&hoopMix<0.01){hoopMix=0;netReset();}
    netSwing*=Math.pow(0.04,dt);
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bgCv,0,0);ctx.setTransform(DPR,0,0,DPR,0,0);
    const inHoop=ball.p.z>HOOP.z-RIM_R-BALL_R&&ball.p.y<HOOP.y+BALL_R*1.5&&ball.p.y>HOOP.y-0.6&&Math.hypot(ball.p.x-HOOP.x,ball.p.z-HOOP.z)<RIM_R+BALL_R;
    const behind=ball.p.z>HOOP.z||inHoop;
    drawHoop(behind);
    if(!behind)drawBall();
    hctx.setTransform(1,0,0,1,0,0);hctx.clearRect(0,0,hudCv.width,hudCv.height);hctx.setTransform(hudCv._dpr,0,0,hudCv._dpr,0,0);
    if(ball.state!=='idle')drawTracking();
    $('tc').textContent=timecode(now);
  }

  // ---- camera / pose / hands ----
  // Pipeline per camera frame (rAF, only when the video has a new frame):
  // pose (full model) -> One Euro filter on 2D + 3D world landmarks -> crop around each wrist -> hand model on crop
  // -> per-hand state machine: loaded -> rising (track peak 3D wrist speed) -> release on wrist snap / deceleration / timeout.
  const POSE_URL={lite:'pose_landmarker_lite/float16/1/pose_landmarker_lite.task',full:'pose_landmarker_full/float16/1/pose_landmarker_full.task',heavy:'pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task'};
  const MP='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  let vision=null,files=null,pose=null,handLM={l:null,r:null},video=$('video'),camCv=$('camCv'),cc=camCv.getContext('2d');
  const crop=document.createElement('canvas');crop.width=crop.height=224;const cropCtx=crop.getContext('2d',{willReadFrequently:false});
  let sens=7.8,latBias=0,needFingers=true,fingerThr=0.51,palmFlip=false,palmMin=0.34,gatherRef=1.2,riseRef=0.5;const calib=[];
  let lastT=0,frames=0,fpsT=0,fps=0;
  let msPose=0,msHand=0;                                  // EMA of inference cost, shown in the debug row
  const hTs={l:0,r:0};                                    // VIDEO mode wants a strictly rising clock per instance
  const handTs=(k,ms)=>(hTs[k]=Math.max(hTs[k]+1,Math.round(ms)));

  // One Euro filter (Casiez et al.): low jitter at rest, low lag when moving fast
  class OneEuro{constructor(minCut,beta,dCut=1){this.mc=minCut;this.b=beta;this.dc=dCut;this.x=null;this.dx=0;this.t=0;}
    a(c,dt){const r=2*Math.PI*c*dt;return r/(r+1);}
    f(x,t){if(this.x===null||t-this.t>0.5){this.x=x;this.dx=0;this.t=t;return x;}
      const dt=Math.max(1e-3,t-this.t);this.t=t;const dx=(x-this.x)/dt;this.dx+=this.a(this.dc,dt)*(dx-this.dx);
      const c=this.mc+this.b*Math.abs(this.dx);this.x+=this.a(c,dt)*(x-this.x);return this.x;}}
  const filt={};
  function F1(key,x,t,mc,beta){return (filt[key]||(filt[key]=new OneEuro(mc,beta))).f(x,t);}

  // least-squares slope over the last `win` seconds -> stable velocity
  function slope(arr,key,t,win){let n=0,st=0,sv=0,stt=0,stv=0;
    for(let i=arr.length-1;i>=0;i--){const s=arr[i];if(t-s.t>win)break;const x=s.t-t;n++;st+=x;sv+=s[key];stt+=x*x;stv+=x*s[key];}
    if(n<3)return 0;const den=n*stt-st*st;return den>1e-9?(n*stv-st*sv)/den:0;}

  const SIDE={l:{w:15,e:13},r:{w:16,e:14}};
  const S={};for(const k of['l','r'])S[k]={spH:[],mv:[],palm:false,openT:0,hist:[],ang:[],tilt:[],snapAmt:0,pfv:null,p0:null,state:'idle',peak:0,peakUp:0,peakLat:0,start:0,lastTogether:-9,lastHand:-9,spread:null,box:null,hl:null};
  let cooldown=false;

  $('sens').addEventListener('input',e=>{sens=+e.target.value;$('sensVal').textContent=sens.toFixed(1);});
  $('needFingers').addEventListener('change',e=>{needFingers=e.target.checked;});
  $('palmFlip').addEventListener('change',e=>{palmFlip=e.target.checked;});
  $('gatherMin').addEventListener('input',e=>{STD.gather=gatherRef=+e.target.value;$('gatherMinVal').textContent=gatherRef.toFixed(2);saveStd();updateCollect();});
  $('diff').addEventListener('input',e=>{difficulty=+e.target.value;$('diffVal').textContent=difficulty.toFixed(2);});
  $('riseMin').addEventListener('input',e=>{STD.rise=riseRef=+e.target.value;$('riseMinVal').textContent=riseRef.toFixed(2);saveStd();updateCollect();});
  $('palmMin').addEventListener('input',e=>{palmMin=+e.target.value;$('palmMinVal').textContent=palmMin.toFixed(2);});
  $('fthr').addEventListener('input',e=>{fingerThr=+e.target.value;$('fthrVal').textContent=fingerThr.toFixed(2);});
  $('recal').hidden=true;$('recal').addEventListener('click',()=>{calib.length=0;bias={arc:0,lat:0,tilt:0};$('status').innerHTML='보정 중 <strong>0/3</strong> · 평소처럼 편하게 세 번 던져주세요.';});
  $('bhlModel').addEventListener('change',async e=>{if(!vision)return;const prev=pose;pose=null;$('camTag').textContent='LOADING';
    try{pose=await makePose(e.target.value);prev&&prev.close();}catch(err){console.error(err);pose=prev;}$('camTag').textContent='LIVE';});

  async function makePose(q){
    const o=d=>({baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/'+POSE_URL[q],delegate:d},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:0.5,minPosePresenceConfidence:0.5,minTrackingConfidence:0.5});
    try{return await vision.PoseLandmarker.createFromOptions(files,o('GPU'));}catch{return await vision.PoseLandmarker.createFromOptions(files,o('CPU'));}
  }

  function camError(err){
    const n=err&&err.name||'Error';
    const inFrame=(()=>{try{return window.top!==window;}catch{return true;}})();
    const why={
      NotAllowedError: inFrame?'Claude 미리보기 창 안에서는 카메라가 막혀요. 파일을 <strong>다운로드해서 크롬에서 직접</strong> 열어주세요.':'카메라 권한이 막혀 있어요. 주소창 왼쪽 아이콘 → 카메라 → <strong>허용</strong> 후 새로고침하세요. 그래도 안 되면 OS 설정에서 크롬의 카메라 접근을 켜주세요.',
      NotReadableError:'다른 프로그램이나 다른 탭이 카메라를 쓰고 있어요. <strong>예전 슛 페이지 탭, 줌, 디스코드</strong>를 닫고 다시 켜주세요.',
      NotFoundError:'연결된 카메라를 못 찾았어요.',
      OverconstrainedError:'카메라가 요청한 해상도를 지원하지 않아요.',
      SecurityError:'이 주소에서는 카메라를 쓸 수 없어요. https 또는 내 컴퓨터 파일로 열어주세요.'
    }[n]||'인식 모델을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 켜주세요.';
    $('status').innerHTML=why+' <span style="opacity:.6">('+n+(err&&err.message?': '+String(err.message).slice(0,80):'')+')</span>';
    document.body.classList.remove('clean');
    $('camBtn').hidden=false;$('camBtn').disabled=false;$('camTag').textContent='OFF';$('camDot').classList.remove('on');
  }
  async function getStream(){
    const tries=[
      {facingMode:'user',width:{ideal:1280},height:{ideal:720},frameRate:{ideal:60}},
      {facingMode:'user',width:{ideal:640},height:{ideal:480}},
      true];
    let last;
    for(const v of tries){try{return await navigator.mediaDevices.getUserMedia({audio:false,video:v});}
      catch(e){last=e;if(e.name==='NotAllowedError'||e.name==='SecurityError')throw e;}}
    throw last;
  }
  let loopOn=false,lastVT=-1;
  async function startCamera(){
    $('camBtn').disabled=true;$('camBtn').hidden=true;$('camWrap').hidden=false;$('camTag').textContent='LOADING';
    try{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Object.assign(new Error('getUserMedia 없음'),{name:'SecurityError'});
      if(video.srcObject)video.srcObject.getTracks().forEach(tr=>tr.stop());
      const stream=await getStream();
      video.srcObject=stream;await video.play();
      if(!video.videoWidth)await new Promise(r=>video.addEventListener('loadedmetadata',r,{once:true}));
      camCv.width=320;camCv.height=Math.round(320*video.videoHeight/video.videoWidth)||180;
      $('camWrap').style.aspectRatio=camCv.width+'/'+camCv.height;
      if(!loopOn){loopOn=true;camLoop();}
      if(!pose){
        $('status').innerHTML='카메라 연결됨. 인식 모델을 불러오는 중이에요…';
        vision=vision||await import('@mediapipe/tasks-vision');
        files=files||await vision.FilesetResolver.forVisionTasks(MP+'/wasm');
        try{pose=await makePose($('bhlModel').value);}catch(e){console.warn('pose fallback to lite',e);$('bhlModel').value='lite';pose=await makePose('lite');}
        // VIDEO mode reuses the previous frame's landmarks as the ROI, so the palm detector only reruns when tracking drops.
        // That state lives in the instance, so each hand gets its own -- feeding two crops to one would corrupt it.
        const ho=d=>({baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:d},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:0.35,minHandPresenceConfidence:0.35,minTrackingConfidence:0.3});
        for(const k of['l','r']){
          try{handLM[k]=await vision.HandLandmarker.createFromOptions(files,ho('GPU'));}catch{handLM[k]=await vision.HandLandmarker.createFromOptions(files,ho('CPU'));}
        }
      }
      $('camDot').classList.add('on');$('camTag').textContent='LIVE';$('sensRow').hidden=false;$('fingerRow').hidden=false;$('bhlDbg').hidden=false;
      $('status').innerHTML='<strong>손바닥을 카메라 쪽으로</strong> 보이며 손가락을 펴고, 팔을 올리면서 손가락을 모으면 슛이에요.';
    }catch(err){console.error(err);camError(err);}
  }
  let frameErrShown=false;
  function camLoop(){
    if(stopped)return;
    requestAnimationFrame(camLoop);
    if(video.readyState<2||video.currentTime===lastVT)return;lastVT=video.currentTime;
    const w=camCv.width,h=camCv.height;
    cc.save();cc.translate(w,0);cc.scale(-1,1);cc.filter='saturate(1.25) contrast(1.15)';cc.drawImage(video,0,0,w,h);cc.filter='none';cc.restore();
    try{onFrame(performance.now());}
    catch(e){console.error(e);if(!frameErrShown){frameErrShown=true;$('dbgTxt').textContent='인식 오류: '+(e.message||e);}}
  }
  $('camBtn').addEventListener('click',startCamera);

  startCamera();

  const BONES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24]];
  const HB=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

  function onFrame(now){
    if(!pose)return;
    let t=now/1000;if(t<=lastT)t=lastT+0.001;lastT=t;
    frames++;if(t-fpsT>1){fps=frames/(t-fpsT);frames=0;fpsT=t;}
    const _tp=performance.now();
    const res=pose.detectForVideo(video,now);
    msPose+=(performance.now()-_tp-msPose)*0.1;
    const vw=video.videoWidth,vh=video.videoHeight,w=camCv.width,h=camCv.height;
    const raw=res.landmarks&&res.landmarks[0],rw=res.worldLandmarks&&res.worldLandmarks[0];
    if(!raw||!rw){dbg('사람이 안 보여요');return;}
    // filtered 2D (normalized image) + 3D world (meters, hip-centered)
    const L={},Wd={};
    for(const i of[0,11,12,13,14,15,16]){L[i]={x:F1('x'+i,raw[i].x,t,1.2,4),y:F1('y'+i,raw[i].y,t,1.2,4)};}
    for(const i of[15,16]){Wd[i]={x:F1('wx'+i,rw[i].x,t,1.0,1.5),y:F1('wy'+i,rw[i].y,t,1.0,1.5),z:F1('wz'+i,rw[i].z,t,0.8,1.2)};}
    const X=p=>(1-p.x)*w, Y=p=>p.y*h;
    cc.strokeStyle='rgba(236,232,223,.55)';cc.lineWidth=1.2;
    for(const[a,b]of BONES){const A=L[a]||raw[a],B=L[b]||raw[b];cc.beginPath();cc.moveTo(X(A),Y(A));cc.lineTo(X(B),Y(B));cc.stroke();}

    const shW=Math.hypot(L[11].x-L[12].x,L[11].y-L[12].y)||0.2, shY=(L[11].y+L[12].y)/2, noseY=L[0].y;

    for(const k of['l','r']){
      const s=S[k],wI=SIDE[k].w,eI=SIDE[k].e,wr=L[wI],el=L[eI];
      // hand crop: centered a bit past the wrist along the forearm, sized from forearm length
      const fx=(wr.x-el.x)*vw,fy=(wr.y-el.y)*vh,fl=Math.hypot(fx,fy)||1;
      const size=Math.max(96,Math.min(vh,fl*1.6)),cx=wr.x*vw+fx/fl*size*0.3,cy=wr.y*vh+fy/fl*size*0.3;
      const sx=cx-size/2,sy=cy-size/2;s.box={sx,sy,size};
      cropCtx.fillStyle='#000';cropCtx.fillRect(0,0,224,224);
      cropCtx.drawImage(video,sx,sy,size,size,0,0,224,224);
      const _th=performance.now();
      const hr=handLM[k]?handLM[k].detectForVideo(crop,handTs(k,now)):null;
      msHand+=(performance.now()-_th-msHand)*0.1;
      s.hl=null;
      if(hr&&hr.landmarks&&hr.landmarks[0]){
        const hl=hr.landmarks[0].map(p=>({x:(sx+p.x*size)/vw,y:(sy+p.y*size)/vh}));
        // sanity: detected hand's wrist must sit near the pose wrist
        if(Math.hypot((hl[0].x-wr.x)*vw,(hl[0].y-wr.y)*vh)<size*0.45){
          s.hl=hl;s.lastHand=t;
          const d=(a,b)=>Math.hypot((hl[a].x-hl[b].x)*vw,(hl[a].y-hl[b].y)*vh);
          const palm=d(0,9)||1;
          s.spread=F1('sp'+k,(d(8,12)+d(12,16)+d(16,20))/3/palm,t,1.5,0.5);
          s.spH.push({t,v:s.spread});while(s.spH.length&&t-s.spH[0].t>0.6)s.spH.shift();
          if(s.spread<fingerThr)s.lastTogether=t;
          // wrist flex angle: forearm vs. hand (wrist->middle knuckle)
          const hx=(hl[9].x-hl[0].x)*vw,hy=(hl[9].y-hl[0].y)*vh,hlen=Math.hypot(hx,hy)||1;
          const ang=Math.acos(Math.max(-1,Math.min(1,(fx*hx+fy*hy)/(fl*hlen))))*180/Math.PI;
          s.ang.push({t,a:F1('ang'+k,ang,t,2,0.05)});
          // finger direction on screen (wrist -> middle fingertip), 0 = straight, + = toward screen right
          const tdx=-(hl[12].x-hl[0].x)*vw, tdy=(hl[12].y-hl[0].y)*vh;
          s.tilt.push({t,v:F1('tilt'+k,Math.atan2(tdx,Math.abs(tdy)+1e-3)*180/Math.PI,t,1.5,0.05)});
          // palm toward the camera? sign of (wrist->index knuckle) x (wrist->pinky knuckle), per anatomical hand
          const v1x=(hl[5].x-hl[0].x)*vw,v1y=(hl[5].y-hl[0].y)*vh,v2x=(hl[17].x-hl[0].x)*vw,v2y=(hl[17].y-hl[0].y)*vh;
          const crs=(v1x*v2y-v1y*v2x)/(palm*palm);let facing=k==='r'?crs<0:crs>0;if(palmFlip)facing=!facing;
          // edge of the hand toward the camera: the knuckle row collapses to a line, so its visible width drops
          s.kw=F1('kw'+k,d(5,17)/palm,t,2,0.3);
          s.edge=s.kw<palmMin;
          // latch on fast, let go slowly: a one-frame flicker mid-shot would reset the state machine
          const pw=(facing&&!s.edge)?1:0;
          s.pfv=s.pfv==null?pw:s.pfv+(pw-s.pfv)*(pw>s.pfv?0.6:0.12);
          s.palm=s.pfv>0.5;
        }
      }
      while(s.ang.length&&t-s.ang[0].t>0.4)s.ang.shift();
      while(s.tilt.length&&t-s.tilt[0].t>0.4)s.tilt.shift();
      // draw hand
      // hand: skeleton + tracking brackets + live label
      const live=s.hl&&s.spread!=null, ok=live&&s.spread<fingerThr;
      if(s.hl){cc.strokeStyle=ok?'rgba(236,232,223,.95)':'#ff5a1f';cc.lineWidth=1.4;
        for(const[a,b]of HB){cc.beginPath();cc.moveTo(X(s.hl[a]),Y(s.hl[a]));cc.lineTo(X(s.hl[b]),Y(s.hl[b]));cc.stroke();}
        cc.fillStyle=ok?'#fff':'#ff5a1f';for(const i of[4,8,12,16,20]){cc.beginPath();cc.arc(X(s.hl[i]),Y(s.hl[i]),2.2,0,7);cc.fill();}}
      if(live){
        const bx=w-(sx+size)/vw*w,by=sy/vh*h,bw=size/vw*w,bh=size/vh*h,L=Math.min(10,bw*.2);
        cc.strokeStyle=ok?'rgba(236,232,223,.9)':'#ff5a1f';cc.lineWidth=1;cc.beginPath();
        for(const[cx,cy,dx,dy]of[[bx,by,1,1],[bx+bw,by,-1,1],[bx,by+bh,1,-1],[bx+bw,by+bh,-1,-1]]){cc.moveTo(cx+dx*L,cy);cc.lineTo(cx,cy);cc.lineTo(cx,cy+dy*L);}cc.stroke();
        cc.font='600 9px "JetBrains Mono",monospace';cc.textBaseline='bottom';
        const lab=(k==='l'?'L':'R')+'.HAND '+(s.palm?'PALM':s.edge?'EDGE':'BACK')+' · '+(ok?'SET':'OPEN')+' '+s.spread.toFixed(2);
        cc.fillStyle='rgba(10,13,16,.7)';cc.fillRect(bx,by-13,cc.measureText(lab).width+8,12);
        cc.fillStyle=ok?'#ece8df':'#ff5a1f';cc.fillText(lab,bx+4,by-2);
      }
      cc.fillStyle='#ff5a1f';cc.beginPath();cc.arc(X(wr),Y(wr),2.5,0,7);cc.fill();

      // motion: 3D wrist velocity in m/s (hip-centered, so body sway cancels out)
      const W3=Wd[wI];s.hist.push({t,y:W3.y,z:W3.z,x:W3.x});while(s.hist.length&&t-s.hist[0].t>0.6)s.hist.shift();
      const up=-slope(s.hist,'y',t,0.08), fwd=-slope(s.hist,'z',t,0.08), lat=-slope(s.hist,'x',t,0.08);
      s.mv.push({t,speed:Math.hypot(Math.max(0,up),Math.max(0,fwd)*0.6),up,lat,p:{...W3}});while(s.mv.length&&t-s.mv[0].t>0.5)s.mv.shift();

      if(cooldown||made||ball.state!=='idle'){s.state='idle';continue;}
      // only a hand showing its palm to the camera can shoot
      const palmNow=t-s.lastHand<0.15&&s.palm;
      if(!palmNow){if(t-s.lastHand>0.3||!s.palm)s.state='idle';continue;}
      const OPEN=fingerThr+0.1;
      if(s.spread>OPEN){if(s.state!=='open'){s.state='open';s.openT=t;}}
      else if(s.state==='open'&&s.spread<fingerThr&&t-s.openT>0.08){
        // fingers just gathered: check HOW they gathered and how fast the arm was rising
        s.state='idle';
        const sw=s.spH.filter(x=>t-x.t<=0.35);let mx=sw[0]||{t,v:s.spread};for(const x of sw)if(x.v>mx.v)mx=x;
        const gather=(mx.v-s.spread)/Math.max(0.03,t-mx.t);            // spread units per second
        const win=s.mv.filter(m=>t-m.t<=0.35);
        let pk=win[0]||{speed:0,up:0,lat:0};for(const m of win)if(m.speed>pk.speed)pk=m;
        const rise=Math.max(0,...win.map(m=>m.up));                        // arm lift, m/s
        dbg(`손가락 ${gather.toFixed(2)}/s (기준 ${gatherRef.toFixed(2)}) · 팔 ${rise.toFixed(2)}m/s (기준 ${riseRef.toFixed(2)})`);s._dbg=1;
        s.gather=gather;s.rise=rise;
        s.peak=pk.speed;s.peakUp=pk.up;s.peakLat=pk.lat;s.p0=(win[0]||{p:W3}).p;s.p1={...W3};
        release(s,'모음');
      }
    }
    // finger readout
    const live=['l','r'].map(k=>S[k]).filter(s=>t-s.lastHand<0.3&&s.spread!=null);
    if(live.length){const sp=Math.min(...live.map(s=>s.spread));$('fingerTxt').textContent=(sp<fingerThr?'모음 ✓ ':'벌어짐 ')+sp.toFixed(2);$('fingerTxt').style.color=sp<fingerThr?'var(--good)':'var(--bad)';}
    else{$('fingerTxt').textContent='손 안 보임';$('fingerTxt').style.color='var(--muted)';}
    $('bhlFps').textContent=Math.round(fps)+' fps · '+msPose.toFixed(0)+'+'+msHand.toFixed(0)+'ms';$('camFps').textContent=Math.round(fps)+' FPS';
  }

  // Turns the measured arm/hand motion into the actual ball flight. Nothing is auto-corrected toward the hoop:
  // a crooked push or fingers pointing off-line send the ball off-line, a flat push gives a flat arc, etc.
  let bias={arc:0,lat:0,tilt:0};
  // how strongly each measured deviation moves the ball (x difficulty). Make window is ~±3% length, ~±1.3° line.
  const GAIN={power:0.42,arc:0.9,aim:13};let difficulty=0.5;
  // ---- the standard shot every player is measured against ----
  // rise: wrist lift (m/s, pose world coords) / gather: finger close speed (spread per s, palm-normalized)
  // arc: measured push angle (deg) that maps to a 55° launch / lat: sideways ratio that counts as straight
  const STD_DEFAULT={rise:0.261,gather:0.550,arc:90.0,lat:0.060};   // measured on site, 2026-10-09
  let STD={...STD_DEFAULT};
  try{const v=JSON.parse(localStorage.getItem('bhl-std-v2')||'null');if(v&&v.rise)STD={...STD,...v};}catch{}
  riseRef=STD.rise;gatherRef=STD.gather;
  // collect mode: gather many people's shots on site, then lock the medians in as the standard
  let collecting=false;const samples=[];
  const median=a=>{a=a.filter(x=>Number.isFinite(x)).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:NaN;};
  function stdText(o){return `STD={rise:${o.rise.toFixed(3)},gather:${o.gather.toFixed(3)},arc:${o.arc.toFixed(1)},lat:${o.lat.toFixed(3)}}`;}
  function updateCollect(){
    $('collectN').textContent=samples.length+'개';
    if(!samples.length){$('stdOut').value='현재 '+stdText(STD);return;}
    const m={rise:median(samples.map(x=>x.rise)),gather:median(samples.map(x=>x.gather)),arc:median(samples.map(x=>x.arc)),lat:median(samples.map(x=>x.lat))};
    $('stdOut').value='현재 '+stdText(STD)+'\n수집 중간값 '+stdText(m);
  }
  function saveStd(){try{localStorage.setItem('bhl-std-v2',JSON.stringify(STD));}catch{}}
  function setStd(o){STD={...o};riseRef=STD.rise;gatherRef=STD.gather;saveStd();
    $('gatherMin').value=STD.gather;$('gatherMinVal').textContent=STD.gather.toFixed(2);$('riseMin').value=STD.rise;$('riseMinVal').textContent=STD.rise.toFixed(2);updateCollect();}
  $('collect').addEventListener('change',e=>{collecting=e.target.checked;});
  $('applyStd').addEventListener('click',()=>{if(samples.length<5){$('stdOut').value='최소 5개 이상 모아주세요 ('+samples.length+'개)';return;}
    setStd({rise:median(samples.map(x=>x.rise)),gather:median(samples.map(x=>x.gather)),arc:median(samples.map(x=>x.arc)),lat:median(samples.map(x=>x.lat))});});
  $('resetStd').addEventListener('click',()=>{samples.length=0;setStd({...STD_DEFAULT});});
  $('clearSamples').addEventListener('click',()=>{samples.length=0;updateCollect();});
  setTimeout(()=>setStd(STD),0);
  function release(s,why){
    for(const k of['l','r'])S[k].state='idle';
    cooldown=true;setTimeout(()=>{cooldown=false;},900);
    const t=lastT;
    // whole-push displacement (start of rise -> release), hip-centered meters
    const p0=s.p0,p1=s.p1||p0, dUp=p0.y-p1.y, dFwd=p0.z-p1.z, dLat=-(p1.x-p0.x);
    const arcM=Math.atan2(Math.max(0.05,dUp),Math.max(0,dFwd))*180/Math.PI;
    const latM=dLat/Math.max(0.1,dUp);
    const tl=s.tilt.filter(x=>t-x.t<=0.15), tiltM=tl.length?tl.reduce((a,x)=>a+x.v,0)/tl.length:null;
    const spin=Math.max(0.1,Math.min(0.9,0.55*s.gather/gatherRef-0.05));
    let shot;
    const realShot=()=>{
      const D=difficulty;
      const arc=55+GAIN.arc*D*(arcM-STD.arc);
      const aim=GAIN.aim*D*(latM-STD.lat);
      const power=0.65*(s.rise/STD.rise)+0.35*(s.gather/STD.gather);
      // too strong never sails over the rim: anything at or above the standard lands at the ideal length
      return{f:Math.min(1.04,1.04+GAIN.power*D*(power-1)),arc,aim,spin,power};
    };
    shot=realShot();
    if(collecting){samples.push({rise:s.rise,gather:s.gather,arc:arcM,lat:latM});updateCollect();}
    shot.speed=s.peak;shot.gather=s.gather;shot.rise=s.rise;
    shot.report=b=>{
      if(!b.scored)coach(b,shot);
      const lr=shot.aim>0.4?'오른쪽 '+shot.aim.toFixed(1)+'°':shot.aim<-0.4?'왼쪽 '+(-shot.aim).toFixed(1)+'°':'정중앙';
      let hint='';
      if(!b.scored&&b.cross){const c=b.cross;
        if(Math.abs(c.x)>Math.abs(c.z))hint=c.x>0?'오른쪽으로 빗나감 · 손끝/팔꿈치가 오른쪽으로 갔어요':'왼쪽으로 빗나감 · 손끝/팔꿈치가 왼쪽으로 갔어요';
        else hint=c.z<0?'짧았어요 · 조금 더 세게, 또는 더 높게':'길었어요 · 힘을 조금 빼세요';
      }else if(!b.scored)hint=shot.f<1?'림까지 못 갔어요 · 더 세게':'너무 멀리 갔어요';
      if(!b.scored&&shot.arc<45)hint+=' · 포물선이 너무 낮아요';
      if(!b.scored&&shot.spin<0.25)hint+=' · 손목 스냅을 주면 림에서 부드럽게 떨어져요';
      $('status').innerHTML=`각도 <strong>${shot.arc.toFixed(0)}°</strong> · 방향 <strong>${lr}</strong> · 백스핀 <strong>${shot.spin>0.6?'강':shot.spin>0.25?'중':'약'}</strong>${hint?'<br>'+hint:''}`;
    };
    showPower(Math.max(0,Math.min(1,0.5+(shot.f-1.04)*4)),' · 팔 '+(s.rise||0).toFixed(2)+' · 손가락 '+(s.gather||0).toFixed(2));
    dbg(`팔 ${(s.rise||0).toFixed(2)}/${riseRef.toFixed(2)} · 손가락 ${(s.gather||0).toFixed(2)}/${gatherRef.toFixed(2)} → 세기 ${((shot.f/1.04-1)*100).toFixed(1)}% · 각도 ${shot.arc.toFixed(1)}° · 방향 ${shot.aim.toFixed(1)}° · 스핀 ${shot.spin.toFixed(2)}`);
    shoot(shot);showTag(shot);
  }
  function coach(b,shot){
    const c=b.cross;
    const short=c?c.z<0:(b.p.z<HOOP.z);
    sub(short?'짧았어요':'길었어요','',2000);
  }

  function dbg(m){$('dbgTxt').textContent=m;}

  addEventListener('resize',resize);
  resize();
  requestAnimationFrame(frame);

  return function stop(){
    stopped=true;
    removeEventListener('resize',resize);
    try{if(video.srcObject)video.srcObject.getTracks().forEach(t=>t.stop());}catch{}
    try{pose&&pose.close();for(const k of['l','r'])handLM[k]&&handLM[k].close();}catch{}
    pose=null;handLM={l:null,r:null};
    container.innerHTML='';
  };
}
