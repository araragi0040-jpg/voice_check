const ABILITY = {
  imagery: { name: '脳内再生力', short: '頭の中で原曲・メロディーを鳴らす力' },
  memory: { name: '音程記憶力', short: '聞いた音をしばらく保持する力' },
  discrimination: { name: '音程識別力', short: '音の高低やズレを聞き分ける力' },
  vocal: { name: '発声変換力', short: 'イメージした高さを声として再現する力' },
};

const questions = [
  ['imagery','好きな曲を思い浮かべると、頭の中でメロディーが音として聞こえる。'],
  ['imagery','原曲の歌手の声質や歌い方まで、頭の中である程度再現できる。'],
  ['imagery','曲を止めても、続きのメロディーを頭の中で流せる。'],
  ['imagery','頭の中だけで、メロディーを速くしたり遅くしたりできる。'],
  ['imagery','無音の状態でも、知っている曲を頭の中で最初から再生しやすい。'],

  ['memory','一度聞いた短いメロディーを、すぐなら覚えていられる。'],
  ['memory','歌っている途中で伴奏が消えても、元の音程を保ちやすい。'],
  ['memory','曲の途中からでも、次の音程を思い出しやすい。'],
  ['memory','初めて聞く短いフレーズでも、数秒後なら真似しやすい。'],
  ['memory','同じ曲を何度か聞くと、メロディーを比較的早く覚える。'],

  ['discrimination','人が歌ったときに「少し高い／低い」が分かりやすい。'],
  ['discrimination','自分の声が伴奏から外れたとき、自分で気づきやすい。'],
  ['discrimination','近い高さの2音でも、どちらが高いか判断しやすい。'],
  ['discrimination','ハモリと主旋律を、ある程度分けて聞ける。'],
  ['discrimination','同じメロディーでもキーが変わったことに気づきやすい。'],

  ['vocal','頭では正しい音が分かっているとき、その高さを声で出しやすい。'],
  ['vocal','聞いた1音をすぐに声で真似しやすい。'],
  ['vocal','歌い出しの最初の音を、大きく外さずに入りやすい。'],
  ['vocal','外れたと気づいたあと、声の高さをすぐ修正しやすい。'],
  ['vocal','伴奏なしでも、歌い慣れた曲なら音程を保って歌いやすい。'],
];

const state = {
  answers: Array(questions.length).fill(null),
  disc: { trial:0, correct:0, current:null, completed:false, skipped:false },
  memory: { trial:0, correct:0, current:null, completed:false, skipped:false },
  vocal: { trial:0, scores:[], range:'mid', target:null, completed:false, skipped:false },
  currentScreen:'intro',
};

const screens = {
  intro:document.getElementById('screenIntro'), questions:document.getElementById('screenQuestions'),
  discrimination:document.getElementById('screenDiscrimination'), memory:document.getElementById('screenMemory'),
  vocal:document.getElementById('screenVocal'), result:document.getElementById('screenResult')
};
const progressMap = {intro:[1,5,5],questions:[2,5,25],discrimination:[3,5,45],memory:[4,5,65],vocal:[5,5,85],result:[5,5,100]};
function showScreen(name){
  Object.values(screens).forEach(s=>s.classList.remove('active')); screens[name].classList.add('active'); state.currentScreen=name;
  const [step,total,pct]=progressMap[name]; document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressText').textContent = name==='result' ? '診断完了' : `STEP ${step} / ${total}`;
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderQuestions(){
  const list=document.getElementById('questionList'); list.innerHTML='';
  const labels={imagery:'脳内再生',memory:'音程記憶',discrimination:'音程識別',vocal:'発声変換'};
  questions.forEach((q,i)=>{
    const wrap=document.createElement('div');wrap.className='question';
    wrap.innerHTML=`<span class="category-label">${labels[q[0]]}</span><div class="q-title">${i+1}. ${q[1]}</div><div class="scale" data-q="${i}"></div><div class="scale-legend"><span>まったく当てはまらない</span><span>とても当てはまる</span></div>`;
    const scale=wrap.querySelector('.scale');
    for(let v=1;v<=5;v++){
      const b=document.createElement('button'); b.textContent=v; if(state.answers[i]===v)b.classList.add('selected');
      b.onclick=()=>{state.answers[i]=v; scale.querySelectorAll('button').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); updateQuestionCounter();};
      scale.appendChild(b);
    }
    list.appendChild(wrap);
  }); updateQuestionCounter();
}
function updateQuestionCounter(){
  const done=state.answers.filter(v=>v!==null).length; document.getElementById('questionCount').textContent=`${done} / ${questions.length}`;
}

let audioCtx=null;
function ctx(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); return audioCtx; }
function tone(freq,duration=.5,when=0,volume=.16){
  const a=ctx(), o=a.createOscillator(), g=a.createGain(); o.type='sine'; o.frequency.value=freq;
  const t=a.currentTime+when; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(volume,t+.02); g.gain.exponentialRampToValueAtTime(0.0001,t+duration);
  o.connect(g).connect(a.destination);o.start(t);o.stop(t+duration+.03);
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function centsToFreq(base,cents){return base*Math.pow(2,cents/1200)}

// Discrimination
const discStatus=document.getElementById('discStatus'), discFeedback=document.getElementById('discFeedback');
async function newDiscTrial(){
  if(state.disc.trial>=5){ state.disc.completed=true; discStatus.textContent=`完了：${state.disc.correct} / 5 正解`; document.getElementById('playDiscBtn').disabled=true; document.getElementById('toMemoryBtn').disabled=false; return; }
  const base=220*Math.pow(2,(Math.floor(Math.random()*5)-2)/12);
  const cents=[35,50,70,100,140][state.disc.trial]; const dir=Math.random()<.5?-1:1;
  state.disc.current={base,second:centsToFreq(base,cents*dir),answer:dir>0?'higher':'lower'};
  discStatus.textContent=`第${state.disc.trial+1}問 / 5`; discFeedback.textContent='';
  document.getElementById('discLowerBtn').disabled=true; document.getElementById('discHigherBtn').disabled=true;
}
async function playDisc(){
  if(!state.disc.current) await newDiscTrial(); const c=state.disc.current; tone(c.base,.55,0); tone(c.second,.55,.78);
  document.getElementById('discLowerBtn').disabled=false; document.getElementById('discHigherBtn').disabled=false;
}
function answerDisc(ans){
  if(!state.disc.current)return; const ok=ans===state.disc.current.answer; if(ok)state.disc.correct++;
  discFeedback.textContent=ok?'○ 正解':'△ 今回は違いました'; state.disc.trial++; state.disc.current=null;
  document.getElementById('discLowerBtn').disabled=true; document.getElementById('discHigherBtn').disabled=true;
  setTimeout(newDiscTrial,500);
}

// Memory
const memoryStatus=document.getElementById('memoryStatus'), memoryFeedback=document.getElementById('memoryFeedback');
const sequences=[[0,2,4],[0,4,2],[0,-2,3],[0,3,5],[0,-3,2]];
async function newMemoryTrial(){
  if(state.memory.trial>=4){ state.memory.completed=true; memoryStatus.textContent=`完了：${state.memory.correct} / 4 正解`; document.getElementById('playMemoryBtn').disabled=true; document.getElementById('toVocalBtn').disabled=false; return; }
  const base=196*Math.pow(2,(Math.floor(Math.random()*5)-2)/12), seq=sequences[Math.floor(Math.random()*sequences.length)].slice();
  const same=Math.random()<.5, seq2=seq.slice(); if(!same){ const idx=1+Math.floor(Math.random()*2); seq2[idx]+=Math.random()<.5?-1:1; }
  state.memory.current={base,seq,seq2,answer:same?'same':'different'}; memoryStatus.textContent=`第${state.memory.trial+1}問 / 4`; memoryFeedback.textContent='';
  document.getElementById('memorySameBtn').disabled=true; document.getElementById('memoryDifferentBtn').disabled=true;
}
function playSequence(base,seq,start=0){ seq.forEach((semi,i)=>tone(base*Math.pow(2,semi/12),.38,start+i*.47,.13)); }
async function playMemory(){
  if(!state.memory.current) await newMemoryTrial(); const c=state.memory.current; playSequence(c.base,c.seq,0); playSequence(c.base,c.seq2,3.0);
  memoryStatus.textContent='1回目 → 記憶 → 2回目'; await sleep(4550); document.getElementById('memorySameBtn').disabled=false; document.getElementById('memoryDifferentBtn').disabled=false;
}
function answerMemory(ans){
  if(!state.memory.current)return; const ok=ans===state.memory.current.answer; if(ok)state.memory.correct++;
  memoryFeedback.textContent=ok?'○ 正解':'△ 今回は違いました'; state.memory.trial++; state.memory.current=null;
  document.getElementById('memorySameBtn').disabled=true; document.getElementById('memoryDifferentBtn').disabled=true; setTimeout(newMemoryTrial,500);
}

// Vocal
const rangeNotes={
  low:[{n:'D3',f:146.83},{n:'F3',f:174.61},{n:'G3',f:196.00}],
  mid:[{n:'G3',f:196.00},{n:'A3',f:220.00},{n:'C4',f:261.63}],
  high:[{n:'C4',f:261.63},{n:'E4',f:329.63},{n:'G4',f:392.00}],
};
function prepareVocalTarget(){
  if(state.vocal.trial>=3){state.vocal.completed=true; document.getElementById('vocalStatus').textContent='発声テスト完了';document.getElementById('targetNote').textContent='✓';document.getElementById('playTargetBtn').disabled=true;document.getElementById('recordPitchBtn').disabled=true;document.getElementById('showResultBtn').disabled=false;return;}
  const pool=rangeNotes[state.vocal.range], t=pool[state.vocal.trial%pool.length]; state.vocal.target=t;
  document.getElementById('targetNote').textContent=t.n; document.getElementById('vocalStatus').textContent=`第${state.vocal.trial+1}回 / 3　基準音を聞いてください`;
  document.getElementById('vocalFeedback').textContent=''; document.getElementById('playTargetBtn').disabled=false;document.getElementById('recordPitchBtn').disabled=false;
}
function playTarget(){ if(!state.vocal.target)prepareVocalTarget(); tone(state.vocal.target.f,.9,0,.15); }
function autoCorrelate(buf,sampleRate){
  let rms=0; for(let i=0;i<buf.length;i++)rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/buf.length); if(rms<0.015)return -1;
  let r1=0,r2=buf.length-1,thres=.2; for(let i=0;i<buf.length/2;i++){if(Math.abs(buf[i])<thres){r1=i;break}} for(let i=1;i<buf.length/2;i++){if(Math.abs(buf[buf.length-i])<thres){r2=buf.length-i;break}}
  buf=buf.slice(r1,r2); const c=new Array(buf.length).fill(0); for(let i=0;i<buf.length;i++)for(let j=0;j<buf.length-i;j++)c[i]+=buf[j]*buf[j+i];
  let d=0;while(c[d]>c[d+1])d++; let maxval=-1,maxpos=-1;for(let i=d;i<c.length;i++){if(c[i]>maxval){maxval=c[i];maxpos=i}}
  let T0=maxpos; const x1=c[T0-1]||0,x2=c[T0]||0,x3=c[T0+1]||0,a=(x1+x3-2*x2)/2,b=(x3-x1)/2;if(a)T0-=b/(2*a); return sampleRate/T0;
}
function freqToNoteName(freq){ if(!freq||freq<20)return '—'; const midi=Math.round(69+12*Math.log2(freq/440)); const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']; return names[(midi%12+12)%12]+(Math.floor(midi/12)-1); }
async function recordPitch(){
  if(!state.vocal.target)prepareVocalTarget();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const a=ctx(); if(a.state==='suspended')await a.resume(); const src=a.createMediaStreamSource(stream), analyser=a.createAnalyser(); analyser.fftSize=1024; src.connect(analyser);
    const buf=new Float32Array(analyser.fftSize), vals=[]; const status=document.getElementById('vocalStatus'), detected=document.getElementById('detectedPitch'); status.textContent='「あー」と2〜3秒伸ばしてください…';
    const start=performance.now();
    while(performance.now()-start<3000){
      analyser.getFloatTimeDomainData(buf); const f=autoCorrelate(buf,a.sampleRate);
      if(f>70&&f<800){vals.push(f);detected.textContent=`検出音程：${freqToNoteName(f)} / ${f.toFixed(1)} Hz`; const cents=1200*Math.log2(f/state.vocal.target.f); const pos=Math.max(-1,Math.min(1,cents/200)); document.getElementById('meterNeedle').style.left=(50+pos*48)+'%';}
      await sleep(80);
    }
    stream.getTracks().forEach(t=>t.stop());
    if(vals.length<4){ document.getElementById('vocalFeedback').textContent='声を十分検出できませんでした。もう一度試してください。'; status.textContent='再測定できます'; return; }
    vals.sort((a,b)=>a-b); const med=vals[Math.floor(vals.length/2)], cents=Math.abs(1200*Math.log2(med/state.vocal.target.f));
    const score=cents<=25?100:cents<=50?88:cents<=100?68:cents<=150?48:cents<=250?25:8; state.vocal.scores.push(score); state.vocal.trial++;
    document.getElementById('vocalFeedback').textContent=`平均との差：約${Math.round(cents)} cent`; status.textContent=score>=88?'かなり近い音程です':score>=68?'概ね近い音程です':'少し差がありました';
    document.getElementById('meterNeedle').style.left='50%'; setTimeout(prepareVocalTarget,650);
  }catch(e){ document.getElementById('vocalFeedback').textContent='マイクを利用できません。HTTPS環境・ブラウザ権限を確認するか、スキップしてください。'; }
}

function qScore(key){
  const vals=questions.map((q,i)=>q[0]===key?state.answers[i]:null).filter(v=>v!==null); if(!vals.length)return 50; return Math.round((vals.reduce((a,b)=>a+b,0)/vals.length-1)/4*100);
}
function calculateScores(){
  const q={imagery:qScore('imagery'),memory:qScore('memory'),discrimination:qScore('discrimination'),vocal:qScore('vocal')};
  const scores={imagery:q.imagery,memory:q.memory,discrimination:q.discrimination,vocal:q.vocal};
  if(state.memory.completed&&!state.memory.skipped)scores.memory=Math.round(q.memory*.65+(state.memory.correct/4*100)*.35);
  if(state.disc.completed&&!state.disc.skipped)scores.discrimination=Math.round(q.discrimination*.55+(state.disc.correct/5*100)*.45);
  if(state.vocal.completed&&!state.vocal.skipped&&state.vocal.scores.length)scores.vocal=Math.round(q.vocal*.5+(state.vocal.scores.reduce((a,b)=>a+b,0)/state.vocal.scores.length)*.5);
  return scores;
}
function classify(s){
  const entries=Object.entries(s).sort((a,b)=>b[1]-a[1]), avg=Math.round(entries.reduce((a,[,v])=>a+v,0)/4);
  if(Math.min(...Object.values(s))>=70)return ['統合バランス型','頭の中の音・耳・記憶・発声が比較的バランスよく連携しています。曲を覚える→聞く→歌う→修正する流れを作りやすいタイプです。'];
  if(s.imagery>=72&&s.memory>=65)return ['脳内再生リード型','頭の中で曲を鳴らし、その内的な音を頼りに歌いやすいタイプです。無伴奏や歌い出しでも、自分の中に基準を作りやすい傾向があります。'];
  if(s.discrimination>=72&&s.imagery<65)return ['聴覚反応型','頭の中で鳴らすより、実際に聞こえている伴奏や自分の声を手がかりに修正するのが得意なタイプです。'];
  if(s.vocal>=72&&s.imagery<65)return ['身体・発声型','頭の中の再生が強くなくても、聞いた音や身体感覚を声へ変換しやすいタイプです。歌い慣れた曲では強みが出やすいです。'];
  if(s.memory>=72)return ['メロディー保持型','聞いた音やフレーズを保持する力が強く、反復によって曲を安定させやすいタイプです。'];
  if(avg<52)return ['伸びしろ発見型','現時点では特定能力への依存が少なく、練習方法を整理することで変化を感じやすい段階です。まず最も低い1能力を集中的に鍛えるのがおすすめです。'];
  return ['ミックスタイプ','複数の能力を組み合わせて歌っています。得意な能力を「土台」にして、弱い能力を補う練習をすると伸びやすいタイプです。'];
}
const training={
  imagery:{title:'無音メロディー再生',text:'好きな曲を10秒だけ止め、頭の中で続きを3〜5秒再生してから実音と答え合わせ。1日3曲程度。'},
  memory:{title:'3音まねトレーニング',text:'3音だけ聞く→2秒待つ→声か鍵盤で再現。慣れたら4音・5音へ伸ばします。'},
  discrimination:{title:'微差の聞き分け',text:'基準音と少し高い／低い音を聞き分けます。最初は大きい差、慣れたら半音未満の差へ。'},
  vocal:{title:'1音マッチング',text:'基準音を1回だけ聞き、声を伸ばして合わせます。音程表示を使い「外れた方向→修正」を身体で覚えます。'}
};
const usage={
  imagery:'歌う直前にサビ頭だけ脳内再生してから入り、歌い出しの基準音づくりに使う。',
  memory:'フレーズ単位で覚え、伴奏が薄い場所やロングトーンでも音程を保つために使う。',
  discrimination:'録音を聞き返して「高い／低い」を判断し、修正方向を決めるセンサーとして使う。',
  vocal:'頭で考えすぎず、聞いた基準音→即発声の反復で身体側の再現性を高める。'
};
function renderRadar(scores){
  const c=document.getElementById('radarCanvas'),dpr=window.devicePixelRatio||1, cssW=640,cssH=520;c.width=cssW*dpr;c.height=cssH*dpr;c.style.aspectRatio=`${cssW}/${cssH}`;const x=c.getContext('2d');x.scale(dpr,dpr);x.clearRect(0,0,cssW,cssH);
  const cx=320,cy=255,R=170,keys=['imagery','memory','vocal','discrimination'],angles=[-Math.PI/2,0,Math.PI/2,Math.PI];
  x.strokeStyle='#e3e6e9';x.lineWidth=1;[.25,.5,.75,1].forEach(r=>{x.beginPath();keys.forEach((k,i)=>{const px=cx+Math.cos(angles[i])*R*r,py=cy+Math.sin(angles[i])*R*r;i?x.lineTo(px,py):x.moveTo(px,py)});x.closePath();x.stroke()});
  angles.forEach(a=>{x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);x.stroke()});
  x.beginPath();keys.forEach((k,i)=>{const rr=scores[k]/100*R,px=cx+Math.cos(angles[i])*rr,py=cy+Math.sin(angles[i])*rr;i?x.lineTo(px,py):x.moveTo(px,py)});x.closePath();x.fillStyle='rgba(31,41,55,.13)';x.fill();x.strokeStyle='#1f2937';x.lineWidth=3;x.stroke();
  x.fillStyle='#1f2937';keys.forEach((k,i)=>{const rr=scores[k]/100*R,px=cx+Math.cos(angles[i])*rr,py=cy+Math.sin(angles[i])*rr;x.beginPath();x.arc(px,py,5,0,Math.PI*2);x.fill()});
  x.fillStyle='#373d45';x.font='700 18px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP"';x.textAlign='center';x.textBaseline='middle';
  const labels=[['脳内再生力',cx,48],['音程記憶力',545,cy],['発声変換力',cx,465],['音程識別力',95,cy]];labels.forEach(([t,px,py])=>x.fillText(t,px,py));
}
function showResults(){
  const scores=calculateScores(), [name,desc]=classify(scores); document.getElementById('typeName').textContent=name;document.getElementById('typeDescription').textContent=desc; renderRadar(scores);
  const grid=document.getElementById('scoreGrid');grid.innerHTML='';Object.keys(ABILITY).forEach(k=>grid.innerHTML+=`<div class="score-item"><span>${ABILITY[k].name}</span><b>${scores[k]}</b><small>/ 100</small></div>`);
  const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]),top=sorted[0],low=sorted[sorted.length-1];
  document.getElementById('strengthBox').innerHTML=`<strong>${ABILITY[top[0]].name} ${top[1]}点</strong><br>${ABILITY[top[0]].short}が現在の強みです。まずはこの能力を「歌うときの土台」として使うと安定しやすくなります。`;
  document.getElementById('growthBox').innerHTML=`<strong>${ABILITY[low[0]].name} ${low[1]}点</strong><br>${ABILITY[low[0]].short}を少し伸ばすと、4能力の連携が改善しやすいです。苦手判定ではなく「次に鍛える場所」として見てください。`;
  const tl=document.getElementById('trainingList');tl.innerHTML=''; sorted.slice().reverse().forEach(([k,v])=>tl.innerHTML+=`<div class="training-item"><span class="tag">${ABILITY[k].name} ${v}点</span><h4>${training[k].title}</h4><p>${training[k].text}</p></div>`);
  const ul=document.getElementById('usageList');ul.innerHTML='';sorted.forEach(([k])=>ul.innerHTML+=`<div class="usage-item"><h4>${ABILITY[k].name}</h4><p>${usage[k]}</p></div>`);
  window.latestScores=scores; window.latestType=name; showScreen('result');
}
function resultText(){const s=window.latestScores||calculateScores();return `【歌い方タイプ診断】\nタイプ：${window.latestType||classify(s)[0]}\n脳内再生力：${s.imagery}/100\n音程記憶力：${s.memory}/100\n音程識別力：${s.discrimination}/100\n発声変換力：${s.vocal}/100\n\n※簡易チェック結果。医療・心理診断ではありません。`;}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}

// Events
document.getElementById('startBtn').onclick=()=>showScreen('questions');
document.getElementById('toDiscriminationBtn').onclick=()=>{if(state.answers.some(v=>v===null)){toast('20問すべて回答してください');return}showScreen('discrimination');newDiscTrial();};
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showScreen(b.dataset.back));
document.getElementById('playDiscBtn').onclick=playDisc;document.getElementById('discLowerBtn').onclick=()=>answerDisc('lower');document.getElementById('discHigherBtn').onclick=()=>answerDisc('higher');
document.getElementById('skipDiscBtn').onclick=()=>{state.disc.skipped=true;state.disc.completed=true;document.getElementById('toMemoryBtn').disabled=false;showScreen('memory');newMemoryTrial();};
document.getElementById('toMemoryBtn').onclick=()=>{showScreen('memory');newMemoryTrial();};
document.getElementById('playMemoryBtn').onclick=playMemory;document.getElementById('memorySameBtn').onclick=()=>answerMemory('same');document.getElementById('memoryDifferentBtn').onclick=()=>answerMemory('different');
document.getElementById('skipMemoryBtn').onclick=()=>{state.memory.skipped=true;state.memory.completed=true;document.getElementById('toVocalBtn').disabled=false;showScreen('vocal');prepareVocalTarget();};
document.getElementById('toVocalBtn').onclick=()=>{showScreen('vocal');prepareVocalTarget();};
document.getElementById('rangeSelector').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.vocal.range=b.dataset.range;document.querySelectorAll('#rangeSelector button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');prepareVocalTarget();});
document.getElementById('playTargetBtn').onclick=playTarget;document.getElementById('recordPitchBtn').onclick=recordPitch;
document.getElementById('skipVocalBtn').onclick=()=>{state.vocal.skipped=true;state.vocal.completed=true;showResults();};document.getElementById('showResultBtn').onclick=showResults;
document.getElementById('copyResultBtn').onclick=async()=>{try{await navigator.clipboard.writeText(resultText());toast('結果をコピーしました')}catch{toast('コピーできませんでした')}};
document.getElementById('restartBtn').onclick=()=>location.reload();

renderQuestions();showScreen('intro');
