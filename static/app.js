const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const COL={Low:'#2E9E7C',Short:'#2E9E7C',Medium:'#E0A81F',High:'#D64545',Long:'#D64545'};
const get=async u=>(await fetch(u)).json();
const post=async(u,b)=>(await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})).json();
const facts=new Set();let timer,last;
function setup(cv){const r=devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;cv.width=w*r;cv.height=h*r;const g=cv.getContext('2d');g.scale(r,r);return[g,w,h]}
function plot(cv,xs,series,xmax,ymax,mark){
 const[g,w,h]=setup(cv),p={l:36,r:10,t:10,b:24},X=x=>p.l+x/xmax*(w-p.l-p.r),Y=y=>h-p.b-y/ymax*(h-p.t-p.b);
 g.font='11px sans-serif';g.fillStyle='#4B6279';g.strokeStyle='#D5E1EB';
 for(let i=0;i<=4;i++){const y=ymax*i/4;g.beginPath();g.moveTo(p.l,Y(y));g.lineTo(w-p.r,Y(y));g.stroke();g.fillText(+y.toFixed(1),2,Y(y)+4)}
 for(let i=0;i<=5;i++){const x=xmax*i/5;g.fillText(Math.round(x),X(x)-6,h-8)}
 series.forEach(s=>{g.beginPath();xs.forEach((x,i)=>g[i?'lineTo':'moveTo'](X(x),Y(s.ys[i])));g.strokeStyle=s.c;g.lineWidth=2.5;g.stroke();
  if(s.fill){g.lineTo(X(xs.at(-1)),Y(0));g.lineTo(X(xs[0]),Y(0));g.fillStyle=s.c+'55';g.fill()}
  if(s.name){g.fillStyle=s.c;g.fillText(s.name,X(xs[s.at||0])+6,Y(s.ys[s.at||0])-6)}});
 if(mark!=null){g.strokeStyle='#12263A';g.setLineDash([5,4]);g.beginPath();g.moveTo(X(mark),p.t);g.lineTo(X(mark),h-p.b);g.stroke();g.setLineDash([])}
}
const val=()=>({dirt:+$('#dirt').value,grease:+$('#grease').value,load:+$('#load').value,facts:[...facts]});
async function update(){
 const v=val();$('#vD').textContent=v.dirt;$('#vG').textContent=v.grease;$('#vL').textContent=v.load;
 const r=last=await post('/api/run',v),f=r.fuzzy,fin=r.final;
 $('#oTime').textContent=fin.time.toFixed(1);$('#oWater').textContent=fin.water.toFixed(0);$('#note').textContent=fin.note;
 $('#verdict').textContent={NORMAL:'Fuzzy control',ADAPT:'Safe cycle',STOP:'Stopped'}[fin.action];$('#verdict').className='verdict '+fin.action;
 $('#porthole').classList.toggle('stop',fin.action==='STOP');
 $('#drum').style.animationDuration=Math.max(1.5,8-fin.time/10)+'s';
 $('#water').setAttribute('y',String(204-fin.water*1.2));
 $('#fz').innerHTML=Object.entries(f.fuzz).map(([n,m])=>`<div><b>${n}</b>${Object.entries(m).map(([k,d])=>`<div class="bar">${k}<span><i style="width:${d*100}%;background:${COL[k]}"></i></span>${d.toFixed(2)}</div>`).join('')}</div>`).join('');
 $('#rules').innerHTML=f.fired.map(x=>`<tr><td>${x.text}</td><td>${x.s.toFixed(2)}</td></tr>`).join('');
 const ts=[...new Set(f.fired.filter(x=>x.text.includes('Wash')).map(x=>x.text.split(' ').pop()))];
 plot($('#cAgg'),f.tx,[{ys:f.tagg,c:'#2F7DE1',fill:1}],60,1,f.time);
 $('#cent').textContent=`Centroid = Σ(u·μ) / Σμ = ${f.num.toFixed(1)} / ${f.den.toFixed(2)} = ${f.time.toFixed(2)} min.  A crisp machine would run ${f.crisp_time} min.`;
 const u=f.usage,cl=n=>n>=0?'good':'bad';
 $('#save').innerHTML=`<div>Water used<b>${u.litres.toFixed(0)} L</b>vs 60 L</div><div>Water saved<b class="${cl(u.water_saved)}">${u.water_saved.toFixed(0)}%</b></div><div>Energy used<b>${u.kwh.toFixed(2)} kWh</b>vs 0.68 kWh</div><div>Energy saved<b class="${cl(u.energy_saved)}">${u.energy_saved.toFixed(0)}%</b></div>`;
 const e=r.expert;
 $('#diag').innerHTML=e.diagnoses.length?e.diagnoses.map(d=>`<div class="d ${d.sev}"><b>${d.id.replace(/_/g,' ')}</b> (certainty ${Math.round(d.cf*100)}%, ${d.sev})<br>${d.advice}</div>`).join(''):'<p>No fault found. Tick the symptoms you see.</p>';
 $('#trace').innerHTML=e.trace.map(t=>`<li><b>${t.rule}</b> fired because ${t.because.map(c=>c.startsWith('!')?'not '+c.slice(1):c).join(' and ')} → <b>${t.concl}</b> (CF ${t.cf})</li>`).join('');
 draw();
}
async function draw(){const t=$('#tabs .on').dataset.t,v=val();
 if(t==='mf'){const c=await get('/api/curves');
  plot($('#cIn'),c.x,Object.entries(c.in).map(([k,ys],i)=>({ys,c:COL[k],name:k,at:[0,50,100][i]})),100,1,v.dirt);
  plot($('#cTime'),c.tx,Object.entries(c.time).map(([k,ys],i)=>({ys,c:COL[k],name:k,at:[0,30,60][i]})),60,1,last.fuzzy.time)}
 if(t==='surf'){const s=await get('/api/surface?load='+v.load),[g,w,h]=setup($('#cSurf')),n=s.axis.length,cw=w/n,ch=h/n;
  s.z.forEach((row,i)=>row.forEach((z,j)=>{const k=z/60;g.fillStyle=`rgb(${18+k*224},${38+k*155},${58+k*20})`;g.fillRect(i*cw,h-(j+1)*ch,cw+1,ch+1)}));
  g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(v.dirt/100*w,h-v.grease/100*h,7,0,7);g.stroke()}
 if(t==='cmp'){const b=await get(`/api/boundary?grease=${v.grease}&load=${v.load}`);
  plot($('#cCmp'),b.x,[{ys:b.crisp,c:'#D64545',name:'Crisp',at:5},{ys:b.fuzzy,c:'#2F7DE1',name:'Fuzzy',at:5}],100,60,v.dirt)}}
$('#tabs').onclick=e=>{if(!e.target.dataset.t)return;$$('#tabs button,.tab').forEach(x=>x.classList.remove('on'));e.target.classList.add('on');$('#'+e.target.dataset.t).classList.add('on');draw()};
['dirt','grease','load'].forEach(i=>$('#'+i).oninput=()=>{clearTimeout(timer);timer=setTimeout(update,40)});
(async()=>{const F=await get('/api/facts'),groups=[...new Set(F.map(f=>f.group))];
 $('#chips').innerHTML=groups.map(g=>`<div style="width:100%"><h3>${g}</h3>${F.filter(f=>f.group===g).map(f=>`<label class="chip"><input type="checkbox" value="${f.id}">${f.label}</label>`).join(' ')}</div>`).join('');
 $('#chips').onchange=e=>{e.target.checked?facts.add(e.target.value):facts.delete(e.target.value);e.target.parentElement.classList.toggle('on',e.target.checked);update()};
 update()})();
addEventListener('resize',()=>last&&draw());
