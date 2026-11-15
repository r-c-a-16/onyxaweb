'use strict';
/* =====================================================================
   ONYXA — website deployment for GitHub Pages
   Sections: Core · Localization · GitHub API · Auth & data · UI rendering
             · Websites · Wizard · File manager · Preview · Actions
   ===================================================================== */

/* ---------- Core: config, state, helpers ---------- */
const API='https://api.github.com';
const TK='onyxa_tk';
const MAX_FILE=25*1024*1024;      // per-file limit used by Onyxa
const WARN_TOTAL=100*1024*1024;   // warn above this total
const EDIT_MAX=1024*1024;         // in-app editing limit
const PREV_ASSET_MAX=8*1024*1024; // preview asset inline limit
const POLL_MS=3000, POLL_MAX=180000;

const S={
  lang:'ar',token:null,user:null,scopes:null,tokenKind:'',persist:false,rate:null,
  repos:[],reposErr:null,
  view:'gate',tab:'home',stack:[],
  tokIn:'',showTok:false,gateErr:null,busy:false,
  reg:[],act:[],sites:new Map(),
  w:null,cur:null,det:null,fm:null,pv:null,modal:null,
  key:null,lockOn:false,tokExp:null,lockFails:0,lockUntil:0
};
S.theme='light';
try{const l=localStorage.getItem('onyxa_lang');if(l==='ar'||l==='en')S.lang=l}catch(e){}
try{if(localStorage.getItem('onyxa_theme')==='dark')S.theme='dark'}catch(e){}
const TG_URL='https://t.me/r_c_a_16';
const GH_URL='https://github.com/r-c-a-16';
function applyTheme(){
  document.documentElement.setAttribute('data-theme',S.theme);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',S.theme==='dark'?'#000000':'#ffffff');
}

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const encPath=p=>p.split('/').map(encodeURIComponent).join('/');
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const repoName=f=>String(f).split('/')[1]||f;
const dirOf=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';
const baseOf=p=>p.slice(p.lastIndexOf('/')+1);
const joinPath=(a,b)=>a?(b?a+'/'+b:a):b;
const isAbort=e=>!!(e&&e.name==='AbortError');

function fmtDate(d,time){
  if(!d)return '—';
  try{
    const o=time?{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}:{year:'numeric',month:'short',day:'numeric'};
    return new Date(d).toLocaleString(S.lang==='ar'?'ar-DZ-u-nu-latn':'en-GB',o);
  }catch(e){return String(d).slice(0,16)}
}
const iso=s=>'\u2066'+s+'\u2069';
function fmtSize(n){n=+n||0;return iso(n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB')}
function fmtDur(ms){if(!ms&&ms!==0)return '—';return iso(ms<1000?ms+' ms':(ms/1000).toFixed(1)+' s')}

let rq=0;
function renderSoon(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;render()})}

/* ---------- icons / logo ---------- */
const P={tg:'M21 4L3 11l6 2 2 6 3-4 4 3zM9 13l8-6',x:'M6 6l12 12M18 6L6 18',home:'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',repo:'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h13',user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',up:'M12 16V4m0 0L7 9m5-5l5 5M4 20h16',back:'M15 5l-7 7 7 7',chev:'M9 5l7 7-7 7',trash:'M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13',folder:'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',file:'M6 3h8l5 5v13H6zM14 3v5h5',plus:'M12 5v14M5 12h14',ext:'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',copy:'M9 9h11v11H9zM5 15V4h11',refresh:'M20 11a8 8 0 1 0-2 5.3M20 4v7h-7',globe:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',check:'M5 12l5 5 10-10',alert:'M12 4l9 16H3zM12 10v4M12 17v.5',logout:'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',key:'M14 10a4 4 0 1 0-3.9-5A4 4 0 0 0 14 10zM11 8l-8 8v4h4v-2h2v-2h2l1-1',clock:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',sliders:'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6',edit:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',phone:'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',desktop:'M3 5h18v11H3zM8 20h8M12 16v4',dot:'M12 12h.01',minus:'M6 12h12',eyeoff:'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.7A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4.2-1'};
const ic=(n,c)=>`<svg class="ic ${c||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${P[n]}"/></svg>`;
const LOGO_URI='logo.png';
const LOGO=s=>`<img src="${LOGO_URI}" width="${s}" height="${s}" alt="Onyxa" style="display:block;margin:0 auto;object-fit:contain">`;
const loader=()=>`<div style="display:grid;place-items:center;padding:40px"><span class="spin" style="width:24px;height:24px"></span></div>`;
const alertBox=(k,msg,i)=>`<div class="alert ${k}">${ic(i||(k==='ok'?'check':'alert'))}<div>${msg}</div></div>`;

function toast(m,k){const d=document.createElement('div');d.className='toast '+(k||'');d.textContent=m;$('#toast').appendChild(d);setTimeout(()=>d.remove(),3000)}

/* ---------- Localization ---------- */
const t=(k,v)=>{
  let s=(TR[S.lang]&&TR[S.lang][k]!==undefined)?TR[S.lang][k]:(TR.en[k]!==undefined?TR.en[k]:k);
  if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);
  return s;
};

/* ---------- Error handling & GitHub API ---------- */
class GhErr extends Error{constructor(m,status,kind,data){super(m);this.status=status;this.kind=kind;this.data=data}}
const CANCEL={cancelled:true};

function san(s){
  s=String(s==null?'':s);
  if(S.token&&S.token.length>8)s=s.split(S.token).join('•••');
  return s.replace(/(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/g,'•••');
}
function rateBlocked(){const r=S.rate;return !!(r&&r.remaining===0&&r.reset*1000>Date.now())}
function trackRate(h){const rem=h.get('x-ratelimit-remaining'),rs=h.get('x-ratelimit-reset');if(rem!=null)S.rate={remaining:+rem,reset:+rs||0,limit:+h.get('x-ratelimit-limit')||0}}
function mkErr(status,data,h){
  let msg=(data&&data.message)||('HTTP '+status);
  if(data&&Array.isArray(data.errors)&&data.errors.length)msg+=' — '+data.errors.map(x=>(x&&(x.message||x.code))||x).join('; ');
  let kind='api';
  const rem=h.get('x-ratelimit-remaining');
  if(status===401)kind='auth';
  else if(status===403||status===429)kind=(rem==='0'||status===429||/rate limit/i.test(msg))?'rate':'perm';
  else if(status===404)kind='notfound';
  else if(status===409||status===422)kind='conf';
  const e=new GhErr(san(msg),status,kind,data);
  if(kind==='rate'){const rs=+h.get('x-ratelimit-reset')||0,ra=+h.get('retry-after')||0;e.resetAt=rs?rs*1000:(ra?Date.now()+ra*1000:0)}
  return e;
}
const inflight=new Map();
function gh(path,o){
  o=o||{};
  const method=o.method||'GET';
  const dk=(method==='GET'&&!o.signal)?path:null;
  if(dk&&inflight.has(dk))return inflight.get(dk);
  const p=ghCall(path,o,method);
  if(dk){inflight.set(dk,p);p.then(()=>inflight.delete(dk),()=>inflight.delete(dk))}
  return p;
}
async function ghCall(path,o,method){
  if(rateBlocked()){const e=new GhErr('rate limit',429,'rate');e.resetAt=S.rate.reset*1000;throw e}
  const h={'Accept':'application/vnd.github+json','Authorization':'Bearer '+S.token,'X-GitHub-Api-Version':'2022-11-28'};
  if(o.body)h['Content-Type']='application/json';
  let r;
  try{r=await fetch(API+path,{method,headers:h,body:o.body,signal:o.signal,cache:'no-store'})}
  catch(e){if(isAbort(e))throw e;throw new GhErr(san(e&&e.message||'network'),0,'net')}
  trackRate(r.headers);
  if(path==='/user'&&r.ok){S.scopes=r.headers.get('x-oauth-scopes');S.tokExp=parseExp(r.headers.get('github-authentication-token-expiration'))}
  let data=null;try{data=await r.json()}catch(e){}
  if(!r.ok)throw mkErr(r.status,data,r.headers);
  return data;
}
function errInfo(e,ctx){
  if(!(e instanceof GhErr))return {label:ctx==='upload'?t('k_upload'):t('k_api'),msg:san(e&&e.message||t('eGen')),kind:'api'};
  let msg;
  if(e.kind==='net')msg=t('eNet');
  else if(e.kind==='auth')msg=t('e401');
  else if(e.kind==='rate')msg=t('rate_msg',{time:e.resetAt?new Date(e.resetAt).toLocaleTimeString():'…'});
  else msg=e.message;
  let label=t('k_'+e.kind);
  if(ctx==='upload'&&(e.kind==='api'||e.kind==='conf'||e.kind==='notfound'))label=t('k_upload');
  if(ctx==='build')label=t('k_build');
  return {label,msg,kind:e.kind};
}
function infoBox(i,withHint){
  const hint=withHint&&i.kind&&TR.en['hint_'+i.kind]!==undefined?`<div class="mt" style="margin-top:4px;color:inherit;opacity:.85">${t('hint_'+i.kind)}</div>`:'';
  return `<div class="alert err">${ic('alert')}<div><b>${esc(i.label)}</b><div>${esc(i.msg)}</div>${hint}</div></div>`;
}
const errBox=(e,ctx)=>infoBox(errInfo(e,ctx),true);

let CTL=null;
function newScope(){if(CTL)CTL.abort();CTL=new AbortController();return CTL.signal}
function abortScope(){if(CTL){CTL.abort();CTL=null}}

/* ---------- Git helpers shared by wizard & file manager ---------- */
async function loadTreeMap(full,branch,signal){
  const map=new Map();let trunc=false,empty=false;
  try{
    const d=await gh('/repos/'+full+'/git/trees/'+encodeURI(branch)+'?recursive=1',{signal});
    d.tree.forEach(x=>map.set(x.path,{type:x.type,size:x.size||0,sha:x.sha,mode:x.mode}));
    trunc=!!d.truncated;
  }catch(e){if(e.status===404||e.status===409)empty=true;else throw e}
  return {map,trunc,empty};
}
async function headOf(full,br){
  try{
    const rf=await gh('/repos/'+full+'/git/ref/heads/'+encodeURI(br));
    const c=await gh('/repos/'+full+'/git/commits/'+rf.object.sha);
    return {commit:rf.object.sha,tree:c.tree.sha};
  }catch(e){if(e.status===404||e.status===409)return null;throw e}
}
async function headOfRetry(full,br,tries){
  for(let i=0;i<tries;i++){const h=await headOf(full,br);if(h)return h;if(i<tries-1)await sleep(1200)}
  return null;
}
async function commitChanges(full,br,changes,message){
  const head=await headOf(full,br);
  if(!head)throw new GhErr('Branch not found',404,'notfound');
  const tree=changes.map(c=>c.sha===null?{path:c.path,mode:'100644',type:'blob',sha:null}:{path:c.path,mode:c.mode||'100644',type:'blob',sha:c.sha});
  const tr=await gh('/repos/'+full+'/git/trees',{method:'POST',body:JSON.stringify({base_tree:head.tree,tree})});
  const cm=await gh('/repos/'+full+'/git/commits',{method:'POST',body:JSON.stringify({message,tree:tr.sha,parents:[head.commit]})});
  await gh('/repos/'+full+'/git/refs/heads/'+encodeURI(br),{method:'PATCH',body:JSON.stringify({sha:cm.sha})});
  return cm.sha;
}
const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(r.error||new Error('read'));r.readAsDataURL(f)});
function utf8ToB64(s){const b=new TextEncoder().encode(s);let bin='';for(let i=0;i<b.length;i+=0x8000)bin+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(bin)}
function b64ToBytes(b){const bin=atob(String(b).replace(/\s/g,''));const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}

const TEXT_EXT=/\.(html?|css|js|mjs|json|txt|md|xml|svg|csv|webmanifest|yml|yaml|ts|map|ini|toml|cfg|conf|htaccess|gitignore|nojekyll|gitkeep|sh|py|php)$/i;
const TEXT_NAMES=new Set(['CNAME','LICENSE','README','.nojekyll','.gitignore','.htaccess','.gitkeep','robots.txt']);
const isTextName=n=>TEXT_EXT.test(n)||TEXT_NAMES.has(baseOf(n));
const IMG_EXT=/\.(png|jpe?g|gif|webp|avif|ico|bmp)$/i;
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',ico:'image/x-icon',bmp:'image/bmp',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',css:'text/css',js:'text/javascript',json:'application/json',html:'text/html',htm:'text/html',txt:'text/plain'};
const mimeOf=p=>MIME[(p.split('.').pop()||'').toLowerCase()]||'application/octet-stream';

/* path validation (repository paths) */
function pathIssue(p){
  if(!p)return 'empty';
  if(p.length>240)return 'long';
  if(/[\x00-\x1f\\]/.test(p)||p.startsWith('/')||p.endsWith('/'))return 'chars';
  const seg=p.split('/');
  for(const s of seg){if(s===''||s==='.'||s==='..')return 'chars';if(s.toLowerCase()==='.git')return 'git'}
  return '';
}
function normDir(s){return String(s||'').trim().replace(/\\/g,'/').replace(/\/+/g,'/').replace(/^\/+|\/+$/g,'')}

/* token expiry (GitHub sends e.g. "2026-12-01 00:00:00 UTC") */
function parseExp(h){if(!h)return null;const d=new Date(String(h).replace(' UTC','Z').replace(' ','T'));return isNaN(d)?null:d.toISOString()}
function daysLeft(iso){if(!iso)return null;return Math.ceil((new Date(iso)-Date.now())/86400000)}
function expText(iso){const n=daysLeft(iso);if(n===null)return '';return n<=0?t('expDone'):n===1?t('expToday'):t('expIn',{n})}


/* ---------- Localization strings ---------- */
const TR={
ar:{
tagline:'انشر مواقعك. بدون تعقيد.',
tokenLabel:'رمز الوصول (Token)',showHide:'إظهار أو إخفاء',remember:'إبقائي مسجّل الدخول على هذا الجهاز',
persistNote:'الافتراضي: يُحفظ التوكن لهذه الجلسة فقط ويُمسح عند إغلاق التبويب. عند التفعيل يُحفظ في تخزين المتصفح، وقد يقرأه أي شخص يستخدم هذا المتصفح أو أي سكربت خبيث. استخدم توكن قصير المدة.',
enterBtn:'تحقق وادخل',verifying:'جارٍ التحقق…',howToken:'كيف أحصل على التوكن؟',
s1:'افتح صفحة إنشاء التوكن من الأزرار أدناه وسجّل الدخول إلى GitHub.',
s2:'الدقيق الصلاحيات: اختر مستودعاتك، وفعّل Contents وPages بصلاحية قراءة وكتابة (وAdministration فقط إن أردت إنشاء مستودعات). الكلاسيكي: يكفي public_repo، أو repo للمستودعات الخاصة.',
s3:'اضغط Generate token وانسخ الرمز فورًا، فلن يظهر مرة أخرى.',
s4:'الصقه في الحقل أعلاه واضغط «تحقق وادخل».',
tokFine:'توكن دقيق الصلاحيات',tokClassic:'توكن كلاسيكي',
eEmpty:'الصق التوكن أولًا.',eFormat:'صيغة التوكن غير صالحة. انسخه كاملًا بدون مسافات.',
e401:'التوكن غير صحيح أو منتهي الصلاحية.',e404:'غير موجود، أو لا تملك صلاحية الوصول إليه.',eNet:'تعذّر الاتصال بـ GitHub. تحقق من الإنترنت.',eGen:'حدث خطأ غير متوقع.',
k_input:'خطأ في الإدخال',k_api:'خطأ من GitHub',k_perm:'خطأ في الصلاحيات',k_conf:'خطأ في إعداد المستودع',k_upload:'فشل الرفع',k_build:'فشل بناء GitHub Pages',k_rate:'تجاوز حد الطلبات',k_auth:'فشل المصادقة',k_notfound:'غير موجود',k_net:'خطأ في الاتصال',
hint_auth:'أنشئ توكن جديدًا وسجّل الدخول به.',hint_perm:'تأكد أن التوكن يملك صلاحية الكتابة على هذا المستودع (Contents وPages).',hint_rate:'انتظر حتى ينتهي الحد ثم أعد المحاولة.',hint_conf:'راجع اسم المستودع والفرع والمسار ثم أعد المحاولة.',hint_build:'افتح ملفات الموقع وصحّح المشكلة ثم اضغط «إعادة البناء».',
rate_msg:'تجاوزت حد طلبات GitHub. يُعاد الضبط عند {time}.',rate_low:'تبقّى {n} طلبًا فقط من حد GitHub، ويُعاد الضبط عند {time}.',
back:'رجوع',next:'التالي',cancel:'إلغاء',close:'إغلاق',create:'إنشاء',save:'حفظ',edit:'تعديل',delete:'حذف',rename:'إعادة تسمية',remove:'إزالة',retry:'إعادة المحاولة',refresh:'تحديث',clear:'مسح',details:'التفاصيل',preview:'معاينة',
moreN:'و {n} أخرى',noMatch:'لا نتائج',noRepos:'لا توجد مستودعات بعد.',searchPh:'ابحث في المستودعات',private:'خاص',public:'عام',archived:'مؤرشف',noWrite:'لا تملك صلاحية الكتابة',
nav_home:'الرئيسية',nav_sites:'المواقع',nav_activity:'النشاط',nav_settings:'الإعدادات',
hello:'أهلًا، {n}',s_total:'مواقع مُدارة',s_pub:'منشورة',s_build:'قيد البناء',s_err:'بها أخطاء',
recentSites:'آخر المشاريع تحديثًا',recentAct:'آخر نشاط نشر',viewAll:'عرض الكل',noSites:'لا توجد مواقع بعد. انشر موقعك الأول.',noAct:'لا يوجد نشاط مسجّل بعد.',
sitesCount:'{n} موقع',connect:'ربط مستودع',connectS:'اختر مستودعًا موجودًا لإدارته في Onyxa.',connected:'تم ربط المستودع',repoGone:'هذا المستودع غير متاح لهذا التوكن.',
f_branch:'الفرع',f_vis:'الظهور',f_last:'آخر نشر',f_result:'نتيجة آخر بناء',f_commit:'الإيداع',f_by:'بواسطة',f_dur:'المدة',f_size:'الحجم',
st_published:'منشور',st_building:'قيد البناء',st_uploading:'جارٍ الرفع',st_failed:'فشل',st_none:'غير منشور',st_unknown:'غير معروف',st_loading:'جارٍ التحميل',
openSite:'فتح الموقع',copyLink:'نسخ الرابط',copied:'تم النسخ',uploadNew:'رفع نسخة جديدة',manageFiles:'إدارة الملفات',rebuild:'إعادة البناء',rebuildStarted:'بدأت إعادة البناء',refreshStatus:'تحديث الحالة',
deployStatus:'حالة النشر',latestBuild:'آخر بناء',actions:'الإجراءات',history:'سجل النشر',current:'الحالية',restore:'استرجاع',restoreNote:'كل صف نسخة بناها GitHub. الاسترجاع ينشئ إيداعًا جديدًا يعيد محتوى المستودع كما كان في تلك النسخة، ولا يُفقد شيء.',restoreT:'استرجاع نسخة سابقة؟',restoreB:'سيعود محتوى المستودع كله إلى النسخة {s}. النسخة الحالية تبقى في سجل Git ويمكنك استرجاعها مرة أخرى.',restoreOk:'نعم، استرجع',restoredOk:'بدأ نشر النسخة المسترجعة',msgRestore:'استرجاع النسخة {s} عبر Onyxa',act_restored:'تم استرجاع نسخة سابقة',noHistory:'لا يوجد سجل بناء من GitHub.',
siteNotLiveSub:'فعّل النشر ليصبح موقعك متاحًا برابط عام.',enable:'تفعيل GitHub Pages',enabledOk:'تم تفعيل النشر',
wfWarn:'هذا الموقع يُنشر عبر GitHub Actions. يرفع Onyxa الملفات لكنه لا يستطيع مراقبة بناء Actions، لذلك لا تُعرض حالة نشر مؤكدة.',
buildFailedNoMsg:'أبلغ GitHub عن فشل البناء بدون رسالة تفصيلية.',
danger:'منطقة الخطر',disable:'إيقاف النشر',disableBody:'سيصبح الموقع غير متاح للعامة. ملفاتك تبقى في المستودع.',disableTitle:'إيقاف نشر الموقع؟',disableOk:'نعم، أوقف',disabledOk:'تم إيقاف النشر',
removeList:'إزالة من قائمة Onyxa',removeBody:'يزيل المستودع من قائمتك المحلية فقط، ولا يغيّر شيئًا في GitHub.',
pagesPriv:'نشر المستودعات الخاصة عبر GitHub Pages يحتاج خطة GitHub مدفوعة.',noAdmin:'لا تملك صلاحية إدارة المستودع، لذلك لا يمكن تفعيل GitHub Pages أو تغيير مصدره. سيُرفع الملفات فقط.',
ghBuilds:'آخر عمليات البناء (من GitHub)',noBuilds:'لا توجد بيانات بناء بعد.',localAct:'سجل محلي',
actLocalNote:'هذا سجل محلي في متصفحك فقط وليس سجل تدقيق كاملًا من GitHub.',clearT:'مسح السجل المحلي؟',clearB:'يُحذف السجل من هذا المتصفح فقط.',
act_repo_selected:'تم اختيار مستودع',act_repo_created:'تم إنشاء مستودع',act_files_uploaded:'تم رفع ملفات',act_file_modified:'تم تعديل ملفات',act_deployed:'تم نشر الموقع',act_deploy_failed:'فشل النشر',act_pages_enabled:'تم تفعيل GitHub Pages',act_pages_disabled:'تم إيقاف GitHub Pages',act_pages_updated:'تم تغيير مصدر GitHub Pages',
lang:'اللغة',theme:'المظهر',themeLight:'فاتح',themeDark:'داكن',tgChannel:'قناتنا تلجرام',tokenSec:'التوكن',tokenType:'نوع التوكن',tt_classic:'كلاسيكي',tt_fine:'دقيق الصلاحيات',tt_unknown:'غير معروف',scopes:'الصلاحيات',storage:'التخزين',stor_session:'الجلسة الحالية فقط',stor_persist:'محفوظ في هذا المتصفح',rateLimit:'طلبات GitHub المتبقية',
scopeWarn:'هذا التوكن الكلاسيكي لا يحمل صلاحية public_repo أو repo. قد تفشل عمليات الرفع. الصلاحية الفعلية تُفحص لكل مستودع على حدة.',
secNote:'Onyxa يعمل بالكامل في المتصفح. أي تخزين للتوكن في المتصفح له حدوده الأمنية: لا تستخدم الحفظ الدائم على جهاز مشترك، وفضّل توكن دقيق الصلاحيات بمدة قصيرة، وألغِه من GitHub عند الانتهاء.',
accounts:'الحسابات',accHint:'بدّل بين حساباتك المحفوظة أو أضف حساباً جديداً.',accAdd:'إضافة حساب',accAddHint:'أدخل توكن حساب GitHub آخر. حسابك الحالي يبقى محفوظاً.',accCurrent:'الحالي',accForget:'إزالة الحساب',accForgot:'أُزيل @{u} من هذا المتصفح',accSaved:'حساباتك المحفوظة',accContinue:'اضغط للدخول',accOr:'أو أضف حساباً جديداً',accSwitching:'جارٍ التبديل إلى @{u}…',accExpired:'انتهت صلاحية توكن @{u} وأُزيل. أضفه من جديد.',accBusy:'لا يمكن تبديل الحساب أثناء نشر جارٍ.',
lock:'قفل بكلمة سر',lockHint:'تُشفَّر التوكنات المحفوظة بكلمة سر تدخلها عند فتح الموقع. تحمي من وصول شخص آخر إلى جهازك، ولا تحمي من برمجيات خبيثة عليه. إن نسيتها تضطر لإضافة حساباتك من جديد.',lockOnT:'تفعيل القفل',lockPin:'كلمة السر',lockPin2:'أعد كتابتها',lockShort:'كلمة السر قصيرة (4 أحرف على الأقل).',lockMismatch:'كلمتا السر غير متطابقتين.',lockEnable:'تفعيل القفل',lockDisable:'إيقاف القفل',lockOffT:'إيقاف القفل؟',lockOffB:'ستُحفظ التوكنات بدون تشفير في هذا المتصفح.',lockStatusOn:'مفعّل',lockTitle:'أدخل كلمة السر لفتح حساباتك',lockOpen:'فتح',lockWrong:'كلمة السر غير صحيحة.',lockWait:'انتظر {n} ثانية ثم أعد المحاولة.',lockForgot:'نسيت كلمة السر',lockForgotT:'مسح الحسابات المحفوظة؟',lockForgotB:'سيُحذف القفل وكل الحسابات المحفوظة من هذا المتصفح، وعليك إضافة التوكنات من جديد.',lockForgotOk:'مسح',accEdit:'تعديل الاسم واللون',accNick:'الاسم المستعار',accNickPh:'مثال: شخصي، عمل',accColor:'اللون',expIn:'ينتهي بعد {n} يوم',expToday:'ينتهي غدًا أو أقل',expDone:'منتهي',expAlert:'ينتهي توكن هذا الحساب بعد {n} يوم. أنشئ توكناً جديداً قبل ذلك.',expAlertDone:'انتهت صلاحية توكن هذا الحساب.',tokExp:'انتهاء التوكن',noExp:'بدون انتهاء',
manageTokens:'إدارة التوكنات على GitHub',viewProfile:'الملف الشخصي',logout:'تسجيل الخروج',logoutTitle:'تسجيل الخروج؟',logoutBody:'سيُزال هذا الحساب والتوكن من هذا المتصفح، وتبقى حساباتك الأخرى المحفوظة. يمكنك الدخول مجددًا في أي وقت.',logoutOk:'خروج',
w_title:'نشر موقع جديد',ws_source:'المصدر',ws_upload:'الملفات',ws_config:'الإعداد',ws_review:'المراجعة',ws_deploy:'النشر',
w1_t:'اختر المصدر',w1_s:'اختر مستودعًا موجودًا أو أنشئ مستودعًا جديدًا لموقعك.',w_existing:'مستودع موجود',w_new:'مستودع جديد',w_repo:'المستودع',
repoName:'اسم المستودع',repoNameHint:'أحرف إنجليزية وأرقام و - و _ و . فقط',repoDesc:'وصف (اختياري)',visibility:'الظهور',vPublic:'عام',vPublicS:'مطلوب للنشر المجاني على GitHub Pages',vPrivate:'خاص',vPrivateS:'النشر يحتاج خطة GitHub مدفوعة',
nameBad:'اسم غير صالح. استخدم أحرفًا إنجليزية وأرقامًا و - و _ و . فقط.',nameTaken:'يوجد مستودع بهذا الاسم في حسابك. اختر اسمًا آخر.',
w2_t:'ارفع ملفات الموقع',w2_s:'اختر ملفات أو مجلد الموقع كاملًا أو ملف ZIP. تُحفظ بنية المجلدات كما هي. الصفحة الرئيسية يجب أن تكون index.html.',
dropHere:'اسحب الملفات أو المجلدات وأفلتها هنا، أو اخترها بالأزرار.',chooseFiles:'اختيار ملفات',chooseZip:'ملف ZIP',zipBusy:'جارٍ فك ضغط الملف…',zipDone:'تم فك الضغط: {n} ملف',zipUnsupported:'هذا المتصفح لا يدعم فك ZIP. حدّث المتصفح أو اختر الملفات يدويًا.',zipBad:'ملف ZIP تالف أو غير صالح.',zipBig:'ملف ZIP كبير جدًا أو بصيغة ZIP64 غير مدعومة.',zipEnc:'ملف ZIP محمي بكلمة مرور وغير مدعوم.',zipHuge:'محتوى ZIP بعد فك الضغط أكبر من 300MB.',zipMethod:'طريقة ضغط غير مدعومة داخل ZIP.',zipEmpty:'ملف ZIP لا يحتوي ملفات.',chooseFolder:'اختيار مجلد',stripRoot:'احذف اسم المجلد الخارجي',nothingSel:'لم تختر أي ملفات بعد.',
selSummary:'{n} ملف · {s}',bigTotal:'الحجم الإجمالي كبير، وقد يستغرق الرفع وقتًا طويلًا. فكّر في تقليل الصور والملفات الكبيرة.',tooMany:'تم الوصول إلى الحد الأقصى (5000 ملف). لم تُضف بقية الملفات.',
fixIssues:'{n} ملف به مشكلة ولن يُرفع حتى تعالجها.',removeBad:'إزالة الملفات المشكلة',
iss_chars:'مسار غير صالح',iss_long:'مسار طويل جدًا',iss_git:'مجلد .git ممنوع',iss_big:'أكبر من 25MB',iss_dup:'مسار مكرر',
w3_t:'إعداد النشر',w3_s:'حدد الفرع ومجلد النشر الذي ستقرأ منه GitHub Pages.',newDefault:'الفرع الافتراضي للمستودع الجديد',
pubDir:'مجلد النشر',dirRoot:'جذر المستودع',dirRootS:'يُنشر المحتوى من المجلد الرئيسي',dirDocsS:'يُنشر المحتوى من المجلد docs',subDir:'مجلد فرعي (اختياري)',subDirS:'ضع الملفات داخل مجلد فرعي من مجلد النشر. سيصبح الموقع على رابط/المجلد.',subBad:'مسار غير صالح.',pagesSource:'مصدر GitHub Pages',
w4_t:'مراجعة قبل النشر',w4_s:'راجع كل شيء. لن يُرفع أي ملف قبل أن تضغط «نشر».',w_files:'الملفات',replaced:'ستُستبدل',badgeNew:'جديد',badgeReplace:'استبدال',
noIndex:'لا يمكن النشر: لا يوجد ملف index.html في {p}. GitHub Pages يعرض هذا الملف فقط كصفحة رئيسية، وبدونه يظهر README أو صفحة 404 بدل ملفك. أعد تسمية ملفك الرئيسي إلى index.html.',makeIndex:'استخدام {f} كصفحة رئيسية (index.html)',
srcChange:'سيتغير مصدر GitHub Pages من ({a}) إلى ({b}).',emptyRepoNote:'المستودع فارغ. سيُنشأ أول إيداع بأول ملف، ثم بقية الملفات في إيداع ثانٍ.',truncated:'المستودع كبير وقد لا تظهر كل ملفاته، فقد لا تكتمل معرفة الملفات المستبدلة.',
caseClash:'يوجد ملف بنفس الاسم مع اختلاف حالة الأحرف ({p}). المسارات في GitHub Pages حساسة لحالة الأحرف.',pathConflict:'تعارض مسار: {p} يتعارض مع ملف أو مجلد موجود.',
commitMsg:'رسالة التحديث',defaultMsg:'نشر عبر Onyxa',confirmReplace:'سيتم استبدال {n} ملف موجود.',confirmSource:'وسيتغير مصدر GitHub Pages.',histNote:'تبقى النسخ القديمة في سجل Git ويمكن استرجاعها.',deployBtn:'نشر الآن',
w5_t:'جارٍ النشر',w5_tdone:'اكتملت عملية النشر',w5_tfail:'تعذّر إكمال النشر',w5_run:'يرفع Onyxa ملفاتك ويراقب بناء GitHub Pages الفعلي.',w5_done:'اكتملت العملية.',w5_fail:'لم تكتمل العملية.',
rs_repo:'المستودع',rs_verify:'فحص الصلاحيات',rs_upload:'رفع الملفات',rs_commit:'إيداع واحد على الفرع',rs_pages:'إعداد GitHub Pages',rs_build:'مراقبة البناء',
uploading:'جارٍ الرفع {a} من {b}',uploadedN:'{n} مرفوع، {m} دون تغيير',noChanges:'لا تغييرات',alreadyOn:'مفعّل مسبقًا',srcUpdated:'تم تحديث المصدر',
bs_wait:'بانتظار بناء GitHub',bs_queued:'في الانتظار',bs_building:'قيد البناء',bs_built:'اكتمل',bs_errored:'فشل',
res_published:'تم نشر الموقع بنجاح',res_uploaded:'رُفعت الملفات لكن GitHub Pages غير مفعّل',res_unknown:'رُفعت الملفات، وحالة النشر غير معروفة',res_timeout:'ما زال البناء جاريًا. تحقق من الحالة لاحقًا.',
cancelled:'أُلغيت العملية',cancelDeployT:'إلغاء النشر؟',cancelDeployB:'سيتوقف الرفع. إن لم يُنفَّذ الإيداع بعد فلن يتغير شيء في المستودع.',cancelDeployOk:'نعم، ألغِ',keepGoing:'متابعة',leaveT:'مغادرة المعالج؟',leaveB:'ستفقد الملفات المختارة والإعدادات.',leave:'مغادرة',
fm_title:'ملفات الموقع',searchFiles:'ابحث في أسماء الملفات',newFile:'ملف جديد',newFolder:'مجلد جديد',folderNote:'لا يحتفظ Git بالمجلدات الفارغة، لذلك سيُنشأ ملف .gitkeep داخل المجلد.',
emptyRepo:'المستودع فارغ. أنشئ ملفًا أو انشر موقعك من «نشر موقع جديد».',emptyDir:'هذا المجلد فارغ',filesN:'{n} ملف',
filePath:'مسار الملف',filePathHint:'مثال: pages/about.html. يُنشأ المجلد تلقائيًا.',exists:'يوجد ملف أو مجلد بهذا المسار ({p}). لن يُستبدل بصمت.',
fileHist:'السجل',noPreview:'لا توجد معاينة لهذا النوع. يمكنك فتحه على GitHub.',cutNote:'عُرض جزء من الملف فقط.',tooBigEdit:'الملف أكبر من حد التعديل داخل التطبيق (1MB).',notUtf8:'الملف ليس نصًا بترميز UTF-8 ولا يمكن تعديله هنا.',
recoverNote:'تبقى النسخ السابقة في سجل GitHub ويمكن استرجاعها من صفحة السجل.',noChangesMade:'لم يتغير شيء.',
msgCreate:'إنشاء {p} عبر Onyxa',msgEdit:'تعديل {p} عبر Onyxa',msgFolder:'إنشاء مجلد {p} عبر Onyxa',msgRename:'نقل {a} إلى {b}',msgDelete:'حذف {p} عبر Onyxa',
fileCreated:'تم إنشاء {p}',fileSaved:'تم حفظ {p}',folderCreated:'تم إنشاء المجلد {p}',renamed:'تمت إعادة التسمية من {a} إلى {b}',deleted:'تم حذف {p}',
renameNote:'اكتب المسار الجديد كاملًا. لن يُستبدل أي ملف موجود.',delTitle:'حذف الملف؟',delBody:'سيُحذف {p} من المستودع. تبقى نسخته في سجل GitHub ويمكن استرجاعها.',delOk:'نعم، احذف',
discardT:'تجاهل التغييرات؟',discardB:'لم تُحفظ تعديلاتك.',discard:'تجاهل',
pvNote:'معاينة محلية فقط وليست الموقع المنشور. قد تختلف عن النتيجة الفعلية على GitHub Pages، ولا تعمل الطلبات (fetch) إلى ملفات الموقع.',pvMissing:'ملف غير موجود',pvMissingAssets:'{n} ملف مرتبط غير موجود: {p}',noHtml:'لا يوجد ملف HTML للمعاينة.',mobile:'جوال',desktop:'حاسوب'
},
en:{
tagline:'Deploy websites. Without complexity.',
tokenLabel:'Access token',showHide:'Show or hide',remember:'Keep me signed in on this device',
persistNote:'By default the token lives for this session only and is cleared when the tab closes. If enabled, it is stored in the browser, where anyone using this browser or any malicious script could read it. Use a short-lived token.',
enterBtn:'Verify and enter',verifying:'Verifying…',howToken:'How do I get a token?',
s1:'Open a token page with the buttons below and sign in to GitHub.',
s2:'Fine-grained: pick your repositories and grant Contents and Pages read & write (Administration only if you want to create repositories). Classic: public_repo is enough, or repo for private repositories.',
s3:'Press Generate token and copy it right away. It is shown only once.',
s4:'Paste it above and press Verify and enter.',
tokFine:'Fine-grained token',tokClassic:'Classic token',
eEmpty:'Paste your token first.',eFormat:'The token format is invalid. Copy it in full with no spaces.',
e401:'The token is invalid or expired.',e404:'Not found, or you do not have access to it.',eNet:'Could not reach GitHub. Check your connection.',eGen:'Something went wrong.',
k_input:'Input error',k_api:'GitHub API error',k_perm:'Permission error',k_conf:'Repository configuration error',k_upload:'Upload failed',k_build:'GitHub Pages build failed',k_rate:'Rate limit reached',k_auth:'Authentication failed',k_notfound:'Not found',k_net:'Connection error',
hint_auth:'Create a new token and sign in with it.',hint_perm:'Make sure the token has write access to this repository (Contents and Pages).',hint_rate:'Wait for the limit to reset, then try again.',hint_conf:'Check the repository name, branch and path, then try again.',hint_build:'Open the site files, fix the problem, then press Rebuild.',
rate_msg:'GitHub rate limit reached. It resets at {time}.',rate_low:'Only {n} GitHub requests are left. The limit resets at {time}.',
back:'Back',next:'Next',cancel:'Cancel',close:'Close',create:'Create',save:'Save',edit:'Edit',delete:'Delete',rename:'Rename',remove:'Remove',retry:'Try again',refresh:'Refresh',clear:'Clear',details:'Details',preview:'Preview',
moreN:'and {n} more',noMatch:'No results',noRepos:'No repositories yet.',searchPh:'Search repositories',private:'Private',public:'Public',archived:'Archived',noWrite:'No write access',
nav_home:'Home',nav_sites:'Websites',nav_activity:'Activity',nav_settings:'Settings',
hello:'Hello, {n}',s_total:'Managed sites',s_pub:'Published',s_build:'Building',s_err:'With errors',
recentSites:'Recently updated projects',recentAct:'Recent deployment activity',viewAll:'View all',noSites:'No websites yet. Deploy your first one.',noAct:'No recorded activity yet.',
sitesCount:'{n} websites',connect:'Connect repository',connectS:'Pick an existing repository to manage in Onyxa.',connected:'Repository connected',repoGone:'This repository is not available to this token.',
f_branch:'Branch',f_vis:'Visibility',f_last:'Last deployment',f_result:'Last build result',f_commit:'Commit',f_by:'By',f_dur:'Duration',f_size:'Size',
st_published:'Published',st_building:'Building',st_uploading:'Uploading',st_failed:'Failed',st_none:'Not published',st_unknown:'Unknown',st_loading:'Loading',
openSite:'Open website',copyLink:'Copy link',copied:'Copied',uploadNew:'Upload new version',manageFiles:'Manage files',rebuild:'Rebuild',rebuildStarted:'Rebuild started',refreshStatus:'Refresh status',
deployStatus:'Deployment status',latestBuild:'Latest build',actions:'Actions',history:'Deployment history',current:'Current',restore:'Restore',restoreNote:'Each row is a version GitHub built. Restoring creates a new commit that returns the repository content to that version, so nothing is lost.',restoreT:'Restore a previous version?',restoreB:'The whole repository content returns to version {s}. The current version stays in Git history and can be restored again.',restoreOk:'Yes, restore',restoredOk:'Publishing the restored version',msgRestore:'Restore version {s} via Onyxa',act_restored:'Previous version restored',noHistory:'No build history from GitHub.',
siteNotLiveSub:'Enable publishing to get a public link for your site.',enable:'Enable GitHub Pages',enabledOk:'Publishing enabled',
wfWarn:'This site is published through GitHub Actions. Onyxa uploads the files but cannot monitor Actions builds, so no confirmed deployment status is shown.',
buildFailedNoMsg:'GitHub reported a failed build without a detailed message.',
danger:'Danger zone',disable:'Stop publishing',disableBody:'The site will no longer be public. Your files stay in the repository.',disableTitle:'Stop publishing this site?',disableOk:'Yes, stop',disabledOk:'Publishing stopped',
removeList:'Remove from Onyxa list',removeBody:'Removes the repository from your local list only. Nothing changes on GitHub.',
pagesPriv:'Publishing private repositories with GitHub Pages needs a paid GitHub plan.',noAdmin:'You do not have admin access to this repository, so GitHub Pages cannot be enabled or its source changed. Files will be uploaded only.',
ghBuilds:'Latest builds (from GitHub)',noBuilds:'No build data yet.',localAct:'Local log',
actLocalNote:'This is a local log in your browser only. It is not a complete audit log from GitHub.',clearT:'Clear the local log?',clearB:'This removes the log from this browser only.',
act_repo_selected:'Repository selected',act_repo_created:'Repository created',act_files_uploaded:'Files uploaded',act_file_modified:'Files modified',act_deployed:'Website deployed',act_deploy_failed:'Deployment failed',act_pages_enabled:'GitHub Pages enabled',act_pages_disabled:'GitHub Pages disabled',act_pages_updated:'GitHub Pages source changed',
lang:'Language',theme:'Appearance',themeLight:'Light',themeDark:'Dark',tgChannel:'Our Telegram channel',tokenSec:'Token',tokenType:'Token type',tt_classic:'Classic',tt_fine:'Fine-grained',tt_unknown:'Unknown',scopes:'Scopes',storage:'Storage',stor_session:'Current session only',stor_persist:'Saved in this browser',rateLimit:'GitHub requests left',
scopeWarn:'This classic token has neither public_repo nor repo scope, so uploads may fail. Real permissions are checked per repository.',
secNote:'Onyxa runs entirely in your browser. Any token stored in a browser has security limits: avoid persistent storage on shared devices, prefer a short-lived fine-grained token, and revoke it on GitHub when you are done.',
accounts:'Accounts',accHint:'Switch between your saved accounts or add a new one.',accAdd:'Add account',accAddHint:'Enter another GitHub account token. Your current account stays saved.',accCurrent:'Current',accForget:'Remove account',accForgot:'@{u} removed from this browser',accSaved:'Your saved accounts',accContinue:'Tap to sign in',accOr:'or add a new account',accSwitching:'Switching to @{u}…',accExpired:'The token for @{u} expired and was removed. Add it again.',accBusy:'Cannot switch accounts while a deploy is running.',
lock:'Password lock',lockHint:'Saved tokens are encrypted with a password you enter when opening the site. It protects against someone else using your device, not against malware on it. If you forget it you must add your accounts again.',lockOnT:'Enable lock',lockPin:'Password',lockPin2:'Repeat password',lockShort:'Password too short (4 characters minimum).',lockMismatch:'Passwords do not match.',lockEnable:'Enable lock',lockDisable:'Turn off lock',lockOffT:'Turn off the lock?',lockOffB:'Tokens will be stored unencrypted in this browser.',lockStatusOn:'Enabled',lockTitle:'Enter your password to unlock your accounts',lockOpen:'Unlock',lockWrong:'Wrong password.',lockWait:'Wait {n} seconds and try again.',lockForgot:'Forgot password',lockForgotT:'Erase saved accounts?',lockForgotB:'The lock and all saved accounts will be removed from this browser. You will need to add your tokens again.',lockForgotOk:'Erase',accEdit:'Edit name and color',accNick:'Nickname',accNickPh:'e.g. Personal, Work',accColor:'Color',expIn:'Expires in {n} days',expToday:'Expires within a day',expDone:'Expired',expAlert:'This accounts token expires in {n} days. Create a new one before then.',expAlertDone:'This accounts token has expired.',tokExp:'Token expiry',noExp:'No expiry',
manageTokens:'Manage tokens on GitHub',viewProfile:'Profile',logout:'Sign out',logoutTitle:'Sign out?',logoutBody:'This account and its token will be removed from this browser. Your other saved accounts stay. You can sign in again anytime.',logoutOk:'Sign out',
w_title:'Deploy New Website',ws_source:'Source',ws_upload:'Files',ws_config:'Configure',ws_review:'Review',ws_deploy:'Deploy',
w1_t:'Choose source',w1_s:'Pick an existing repository or create a new one for your site.',w_existing:'Existing repository',w_new:'New repository',w_repo:'Repository',
repoName:'Repository name',repoNameHint:'English letters, numbers, - _ . only',repoDesc:'Description (optional)',visibility:'Visibility',vPublic:'Public',vPublicS:'Required for free publishing on GitHub Pages',vPrivate:'Private',vPrivateS:'Publishing needs a paid GitHub plan',
nameBad:'Invalid name. Use English letters, numbers, - _ . only.',nameTaken:'A repository with this name already exists in your account. Pick another name.',
w2_t:'Upload website files',w2_s:'Pick files, your whole site folder, or a ZIP file. Folder structure is preserved. The main page must be index.html.',
dropHere:'Drag and drop files or folders here, or use the buttons.',chooseFiles:'Choose files',chooseZip:'ZIP file',zipBusy:'Extracting the archive…',zipDone:'Extracted {n} files',zipUnsupported:'This browser cannot extract ZIP files. Update the browser or pick the files manually.',zipBad:'The ZIP file is corrupted or invalid.',zipBig:'The ZIP file is too large or uses the unsupported ZIP64 format.',zipEnc:'Password-protected ZIP files are not supported.',zipHuge:'The extracted content is larger than 300MB.',zipMethod:'Unsupported compression method inside the ZIP.',zipEmpty:'The ZIP file has no files.',chooseFolder:'Choose folder',stripRoot:'Remove outer folder name',nothingSel:'No files selected yet.',
selSummary:'{n} files · {s}',bigTotal:'The total size is large and uploading may take a while. Consider shrinking images and big files.',tooMany:'Reached the limit (5000 files). The rest were not added.',
fixIssues:'{n} files have problems and will not upload until you fix them.',removeBad:'Remove problem files',
iss_chars:'Invalid path',iss_long:'Path too long',iss_git:'.git folder not allowed',iss_big:'Over 25MB',iss_dup:'Duplicate path',
w3_t:'Configure deployment',w3_s:'Choose the branch and publishing directory GitHub Pages will read from.',newDefault:'Default branch of the new repository',
pubDir:'Publishing directory',dirRoot:'Repository root',dirRootS:'Content is published from the top-level folder',dirDocsS:'Content is published from the docs folder',subDir:'Subfolder (optional)',subDirS:'Place files inside a subfolder of the publishing directory. The site will be at url/subfolder.',subBad:'Invalid path.',pagesSource:'GitHub Pages source',
w4_t:'Review before deploying',w4_s:'Check everything. Nothing is uploaded until you press Deploy.',w_files:'Files',replaced:'Will be replaced',badgeNew:'New',badgeReplace:'Replace',
noIndex:'Cannot deploy: there is no index.html in {p}. GitHub Pages serves only this file as the home page; without it you get the README or a 404 page instead of your file. Rename your main file to index.html.',makeIndex:'Use {f} as the home page (index.html)',
srcChange:'The GitHub Pages source will change from ({a}) to ({b}).',emptyRepoNote:'The repository is empty. The first commit is created with the first file, and the rest go in a second commit.',truncated:'This repository is large and not all files may be listed, so replaced files may not be fully detected.',
caseClash:'A file with the same name but different letter case exists ({p}). GitHub Pages paths are case-sensitive.',pathConflict:'Path conflict: {p} collides with an existing file or folder.',
commitMsg:'Update message',defaultMsg:'Deploy via Onyxa',confirmReplace:'{n} existing files will be replaced.',confirmSource:'The GitHub Pages source will change.',histNote:'Old versions stay in Git history and can be restored.',deployBtn:'Deploy now',
w5_t:'Deploying',w5_tdone:'Deployment finished',w5_tfail:'Deployment did not finish',w5_run:'Onyxa is uploading your files and watching the real GitHub Pages build.',w5_done:'The process finished.',w5_fail:'The process did not finish.',
rs_repo:'Repository',rs_verify:'Check permissions',rs_upload:'Upload files',rs_commit:'Single commit to the branch',rs_pages:'Configure GitHub Pages',rs_build:'Monitor build',
uploading:'Uploading {a} of {b}',uploadedN:'{n} uploaded, {m} unchanged',noChanges:'No changes',alreadyOn:'Already enabled',srcUpdated:'Source updated',
bs_wait:'Waiting for GitHub build',bs_queued:'Queued',bs_building:'Building',bs_built:'Done',bs_errored:'Failed',
res_published:'Website published successfully',res_uploaded:'Files uploaded but GitHub Pages is not enabled',res_unknown:'Files uploaded, deployment status unknown',res_timeout:'The build is still running. Check the status later.',
cancelled:'Operation cancelled',cancelDeployT:'Cancel deployment?',cancelDeployB:'Uploading will stop. If the commit has not happened yet, nothing changes in the repository.',cancelDeployOk:'Yes, cancel',keepGoing:'Keep going',leaveT:'Leave the wizard?',leaveB:'You will lose the selected files and settings.',leave:'Leave',
fm_title:'Website files',searchFiles:'Search file names',newFile:'New file',newFolder:'New folder',folderNote:'Git does not keep empty folders, so a .gitkeep file is created inside.',
emptyRepo:'This repository is empty. Create a file or deploy your site from Deploy New Website.',emptyDir:'This folder is empty',filesN:'{n} files',
filePath:'File path',filePathHint:'Example: pages/about.html. Folders are created automatically.',exists:'A file or folder already exists at this path ({p}). It will not be overwritten silently.',
fileHist:'History',noPreview:'No preview for this file type. You can open it on GitHub.',cutNote:'Only part of the file is shown.',tooBigEdit:'The file is over the in-app editing limit (1MB).',notUtf8:'The file is not UTF-8 text and cannot be edited here.',
recoverNote:'Previous versions stay in GitHub history and can be restored from the history page.',noChangesMade:'Nothing changed.',
msgCreate:'Create {p} via Onyxa',msgEdit:'Edit {p} via Onyxa',msgFolder:'Create folder {p} via Onyxa',msgRename:'Move {a} to {b}',msgDelete:'Delete {p} via Onyxa',
fileCreated:'Created {p}',fileSaved:'Saved {p}',folderCreated:'Created folder {p}',renamed:'Renamed {a} to {b}',deleted:'Deleted {p}',
renameNote:'Type the full new path. An existing file is never overwritten.',delTitle:'Delete this file?',delBody:'{p} will be removed from the repository. It stays in GitHub history and can be restored.',delOk:'Yes, delete',
discardT:'Discard changes?',discardB:'Your edits are not saved.',discard:'Discard',
pvNote:'Local preview only, not the published site. It can differ from the real result on GitHub Pages, and requests (fetch) to site files do not work.',pvMissing:'File not found',pvMissingAssets:'{n} linked files are missing: {p}',noHtml:'There is no HTML file to preview.',mobile:'Mobile',desktop:'Desktop'
}
};


/* ---------- Authentication & session ---------- */
const locks=new Set();
async function once(key,fn){if(locks.has(key))return;locks.add(key);try{return await fn()}finally{locks.delete(key)}}

const tokenFormatOk=tk=>/^[\x21-\x7e]{20,255}$/.test(tk);
function storeToken(tk,persist){
  clearToken();
  if(!S.lockOn){try{(persist?localStorage:sessionStorage).setItem(TK,tk)}catch(e){}}
  S.persist=!!persist;
}
function clearToken(){try{localStorage.removeItem(TK)}catch(e){}try{sessionStorage.removeItem(TK)}catch(e){}}
function readToken(){
  try{const a=sessionStorage.getItem(TK);if(a)return {tk:a,persist:false}}catch(e){}
  try{const b=localStorage.getItem(TK);if(b)return {tk:b,persist:true}}catch(e){}
  return null;
}
const regKey=()=>'onyxa_reg_'+S.user.login;
const actKey=()=>'onyxa_act_'+S.user.login;

/* ---------- Saved accounts (multi-account) + optional PIN lock ---------- */
const ACC='onyxa_accts',LOCKK='onyxa_lock',LASTK='onyxa_last';
let ACCS=[],accQ=Promise.resolve();
const b64=u=>{let s='';new Uint8Array(u).forEach(x=>s+=String.fromCharCode(x));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const cryptoOk=()=>!!(window.crypto&&crypto.subtle&&crypto.getRandomValues);
async function deriveKey(pin,salt,iter){
  const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encStr(key,s){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(s));return b64(iv)+'.'+b64(ct)}
async function decStr(key,s){const p=String(s).split('.');const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(p[0])},key,unb64(p[1]));return new TextDecoder().decode(pt)}
const lockCfg=()=>lsGet(LOCKK,null);

async function accLoad(){
  const out=[];
  for(const [st,p] of [[sessionStorage,false],[localStorage,true]]){
    let arr=[];try{arr=JSON.parse(st.getItem(ACC)||'[]')}catch(e){}
    if(!Array.isArray(arr))continue;
    for(const x of arr){
      if(!x||!x.login||out.some(o=>o.login===x.login))continue;
      let tk=null;
      if(x.e){if(S.key){try{tk=await decStr(S.key,x.e)}catch(e){}}}else if(x.tk)tk=String(x.tk);
      if(!tk)continue;
      out.push({login:String(x.login),avatar:String(x.avatar||''),tk,persist:p,nick:String(x.nick||'').slice(0,24),col:String(x.col||''),exp:x.exp||null});
    }
  }
  ACCS=out;
}
async function accFlush(){
  if(S.lockOn&&!S.key)return;
  for(const [st,p] of [[sessionStorage,false],[localStorage,true]]){
    const l=[];
    for(const x of ACCS.filter(x=>x.persist===p)){
      const o={login:x.login,avatar:x.avatar,nick:x.nick||'',col:x.col||'',exp:x.exp||null};
      if(S.lockOn)o.e=await encStr(S.key,x.tk);else o.tk=x.tk;
      l.push(o);
    }
    try{if(l.length)st.setItem(ACC,JSON.stringify(l));else st.removeItem(ACC)}catch(e){}
  }
}
const accRead=()=>ACCS;
function accWrite(list){ACCS=list;accQ=accQ.then(accFlush).catch(()=>{});return accQ}
function accSave(user,tk,persist){
  const old=ACCS.find(x=>x.login===user.login)||{};
  const l=ACCS.filter(x=>x.login!==user.login);
  l.push({login:user.login,avatar:user.avatar_url||'',tk,persist:!!persist,nick:old.nick||'',col:old.col||'',exp:S.tokExp||null});
  l.sort((a,b)=>a.login.localeCompare(b.login));
  accWrite(l);
}
function accRemove(login){accWrite(ACCS.filter(x=>x.login!==login))}
const accName=a=>a.nick||('@'+a.login);

function resetSession(){
  abortScope();stopPoll();closePreview();
  if(S.w&&S.w.ctl)S.w.ctl.abort();
  S.repos=[];S.reg=[];S.act=[];S.sites=new Map();S.rate=null;
  S.w=null;S.fm=null;S.cur=null;S.det=null;S.stack=[];S.page='';S.tab='home';S.modal=null;
}
async function enter(tk,persist){
  const prev={token:S.token,user:S.user,scopes:S.scopes,kind:S.tokenKind,persist:S.persist};
  S.token=tk;
  try{S.user=await gh('/user')}
  catch(e){
    S.token=prev.token;S.user=prev.user;S.scopes=prev.scopes;
    throw e;
  }
  resetSession();
  S.tokenKind=/^github_pat_/.test(tk)?'fine':(S.scopes!==null?'classic':'unknown');
  S.reg=lsGet(regKey(),[]);S.act=lsGet(actKey(),[]);
  storeToken(tk,persist);
  accSave(S.user,tk,persist);
  try{localStorage.setItem(LASTK,S.user.login)}catch(e){}
  S.adding=false;
  await loadRepos();
  S.tokIn='';S.busy=false;S.gateErr=null;S.view='app';
  render();scrollTo(0,0);
  loadSites(managed());
}
function doLogout(){
  const login=S.user&&S.user.login;
  resetSession();
  clearToken();
  if(login)accRemove(login);
  S.token=null;S.user=null;S.scopes=null;S.tokenKind='';
  S.tokIn='';S.gateErr=null;S.busy=false;S.adding=false;
  S.view='gate';render();scrollTo(0,0);
}
/* switch to a saved account */
async function switchAcc(login){
  if(S.user&&S.user.login===login){S.modal=null;renderModal();return}
  if(S.w&&S.w.run&&S.w.run.active){toast(t('accBusy'));return}
  const a=accRead().find(x=>x.login===login);
  if(!a)return;
  S.modal=null;renderModal();
  const wasGate=S.view==='gate';
  S.busy=true;S.gateErr=null;if(wasGate)render();else toast(t('accSwitching',{u:login}));
  try{await enter(a.tk,a.persist)}
  catch(e){
    S.busy=false;
    if(e.kind==='auth'){accRemove(login);toast(t('accExpired',{u:login}))}
    S.gateErr=wasGate?errInfo(e):null;
    if(!wasGate&&e.kind!=='auth')toast(errInfo(e).msg);
    render();
  }
}

/* ---------- Repositories & permissions ---------- */
async function loadRepos(){
  S.reposErr=null;
  try{
    let all=[];
    for(let p=1;p<=10;p++){
      const l=await gh('/user/repos?per_page=100&sort=pushed&page='+p);
      all=all.concat(l);if(l.length<100)break;
    }
    S.repos=all;
  }catch(e){S.reposErr=e}
}
const repoByFull=f=>S.repos.find(r=>r.full_name===f)||null;
const canPush=r=>!!(r&&r.permissions&&r.permissions.push&&!r.archived);
const canPages=r=>!!(r&&r.permissions&&(r.permissions.admin||r.permissions.maintain));

/* ---------- Local registry & activity (not a server-side audit log) ---------- */
function regAdd(full){if(!S.reg.includes(full)){S.reg.push(full);lsSet(regKey(),S.reg)}}
function regDel(full){S.reg=S.reg.filter(x=>x!==full);lsSet(regKey(),S.reg)}
function addAct(type,full,detail,ok){
  S.act.unshift({ts:Date.now(),type,repo:full||'',detail:String(detail||'').slice(0,160),ok:ok!==false});
  if(S.act.length>200)S.act.length=200;
  lsSet(actKey(),S.act);
}
function managed(){
  const m=new Map();
  S.repos.forEach(r=>{if(r.has_pages)m.set(r.full_name,r)});
  S.reg.forEach(f=>{if(!m.has(f))m.set(f,repoByFull(f))});
  return [...m.entries()].map(([full,repo])=>({full,repo}));
}

/* ---------- GitHub Pages: status ---------- */
async function loadSite(full,o){
  o=o||{};
  let d=S.sites.get(full);
  if(!d){d={loaded:false,loading:null};S.sites.set(full,d)}
  if(d.loading)return d.loading;
  if(!o.force&&d.loaded&&Date.now()-d.at<60000&&(!o.hist||d.hist))return d;
  const gen=S.token;
  d.loading=(async()=>{
    try{
      let pages=null;
      try{pages=await gh('/repos/'+full+'/pages',{signal:o.signal})}
      catch(e){if(e.status===404)pages=null;else throw e}
      let build=null,hist=d.hist||null;
      if(pages&&pages.build_type!=='workflow'){
        try{build=await gh('/repos/'+full+'/pages/builds/latest',{signal:o.signal})}catch(e){if(e.status!==404)throw e}
        if(o.hist){try{hist=await gh('/repos/'+full+'/pages/builds?per_page=10',{signal:o.signal})}catch(e){if(e.status!==404)throw e;hist=[]}}
      }else if(o.hist)hist=[];
      if(gen!==S.token)return;
      d.pages=pages;d.build=build;d.hist=hist;d.err=null;d.loaded=true;d.at=Date.now();
      const r=repoByFull(full);if(r)r.has_pages=!!pages;
    }catch(e){
      if(isAbort(e)||gen!==S.token)return;
      d.err=e;d.loaded=true;d.at=Date.now();
    }finally{d.loading=null;renderSoon()}
  })();
  renderSoon();
  return d.loading;
}
async function loadSites(list){
  const q=list.map(x=>x.full);let i=0;
  const worker=async()=>{while(i<q.length&&S.token){const f=q[i++];await loadSite(f)}};
  await Promise.all([worker(),worker(),worker()]);
}
function siteStatus(full){
  if(S.deploying&&S.deploying.full===full&&S.deploying.phase==='upload')return 'uploading';
  const d=S.sites.get(full);
  if(!d||!d.loaded)return 'loading';
  if(d.err)return 'unknown';
  if(!d.pages)return 'none';
  const st=(d.build&&d.build.status)||d.pages.status;
  if(st==='built')return 'published';
  if(st==='building'||st==='queued')return 'building';
  if(st==='errored')return 'failed';
  return 'unknown';
}
const isWorkflow=d=>!!(d&&d.pages&&d.pages.build_type==='workflow');

/* ---------- GitHub Pages: operations ---------- */
async function enablePagesApi(full,branch,path){
  const body=JSON.stringify({source:{branch,path}});
  try{await gh('/repos/'+full+'/pages',{method:'POST',body})}
  catch(e){
    if(e.status===409||(e.status===422&&/already/i.test(e.message)))await gh('/repos/'+full+'/pages',{method:'PUT',body});
    else throw e;
  }
}
const updatePagesApi=(full,branch,path)=>gh('/repos/'+full+'/pages',{method:'PUT',body:JSON.stringify({source:{branch,path}})});
const disablePagesApi=full=>gh('/repos/'+full+'/pages',{method:'DELETE'});
const rebuildApi=full=>gh('/repos/'+full+'/pages/builds',{method:'POST'});
const buildKey=b=>b?(b.created_at||'')+'|'+(b.commit||'')+'|'+(b.url||''):'';

/* Poll the real Pages build. opts: {commit, prevKey, signal, onTick}. Never reports success unless GitHub says "built". */
async function waitBuild(full,o){
  const t0=Date.now();let requested=false,last=null;
  while(Date.now()-t0<POLL_MAX){
    if(o.signal&&o.signal.aborted)throw new DOMException('Aborted','AbortError');
    let b=null;
    try{b=await gh('/repos/'+full+'/pages/builds/latest',{signal:o.signal})}catch(e){if(e.status!==404)throw e}
    let fresh=!!b;
    if(b&&o.commit)fresh=b.commit===o.commit;
    else if(b&&o.prevKey!==undefined)fresh=buildKey(b)!==o.prevKey;
    if(fresh){
      last=b;
      if(o.onTick)o.onTick(b);
      if(b.status==='built')return {status:'built',build:b};
      if(b.status==='errored')return {status:'errored',build:b};
    }else if(o.onTick)o.onTick(null);
    if(!fresh&&!requested&&o.commit&&Date.now()-t0>25000){
      requested=true;try{await rebuildApi(full)}catch(e){if(e.kind==='auth'||e.kind==='rate')throw e}
    }
    await sleep(POLL_MS);
  }
  return {status:'timeout',build:last};
}

/* background monitor for the site detail page (rebuild / refresh) */
let POLL=null;
function stopPoll(){if(POLL){POLL.ctl.abort();POLL=null}}
async function monitorSite(full,prevKey){
  stopPoll();
  const ctl=new AbortController();POLL={ctl,full};
  const mine=POLL;
  try{
    const r=await waitBuild(full,{prevKey,signal:ctl.signal,onTick:b=>{const d=S.sites.get(full);if(d&&b){d.build=b;renderSoon()}}});
    if(POLL===mine){
      await loadSite(full,{force:true,hist:true});
      if(r.status==='errored'){addAct('deploy_failed',full,(r.build.error&&r.build.error.message)||'',false)}
      renderSoon();
    }
  }catch(e){if(!isAbort(e)&&POLL===mine){const d=S.sites.get(full);if(d){d.err=e;renderSoon()}}}
  finally{if(POLL===mine)POLL=null}
}

/* ---------- Navigation ---------- */
function go(tab){
  abortScope();stopPoll();
  S.tab=tab;S.page='';S.stack=[];S.modal=null;
  render();scrollTo(0,0);
  if(tab==='home'||tab==='sites')loadSites(managed());
}
function pushPage(page,cur){
  S.stack.push({tab:S.tab,page:S.page,cur:S.cur});
  S.page=page;if(cur!==undefined)S.cur=cur;
  S.modal=null;render();scrollTo(0,0);
}
function back(){
  abortScope();stopPoll();closePreview();
  const p=S.stack.pop();
  if(p){S.tab=p.tab;S.page=p.page;S.cur=p.cur}else{S.page=''}
  S.modal=null;render();scrollTo(0,0);
  if(S.page==='site')openSiteData(S.cur);
}
function openSiteData(full){
  loadSite(full,{force:true,hist:true});
}


/* ---------- UI rendering ---------- */
function render(){
  const y=window.scrollY;
  document.documentElement.lang=S.lang;
  document.documentElement.dir=S.lang==='ar'?'rtl':'ltr';
  applyTheme();
  const app=$('#app');
  app.innerHTML=S.view==='loading'?viewLoading():S.view==='lock'?viewLock():S.view==='gate'?viewGate():viewApp();
  const pk=S.view+'|'+S.tab+'|'+S.page+'|'+(S.page==='wizard'&&S.w?S.w.step:'')+'|'+(S.page==='files'&&S.fm?S.fm.sub||'':'');
  const changed=pk!==render.pk;render.pk=pk;
  app.className=((S.view==='app'&&!S.page)?'has-nav':'')+(changed?' enter':'');
  app.querySelectorAll('.item[data-act],.hist[data-act],.opt[data-act]').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button')});
  renderModal();
  window.scrollTo(0,y);
}
const langBtn=()=>`<button class="btn sm" data-act="lang">${S.lang==='ar'?'EN':'عربي'}</button>`;
const accCur=()=>S.user?accRead().find(x=>x.login===S.user.login):null;
const accColStyle=()=>{const a=accCur();return a&&/^#[0-9a-f]{6}$/i.test(a.col)?` style="box-shadow:0 0 0 2px var(--bg),0 0 0 4px ${a.col}"`:''};
function accRow(a,mode){
  const cur=S.user&&a.login===S.user.login&&mode==='menu';
  const col=/^#[0-9a-f]{6}$/i.test(a.col)?a.col:'';
  const n=daysLeft(a.exp);
  const exp=(n!==null&&n<=7)?`<span class="tag ${n<=0?'r':'a'}">${esc(expText(a.exp))}</span>`:'';
  const sub=a.nick?`<span class="ltr">@${esc(a.login)}</span> · `:'';
  const stor=mode==='menu'?(a.persist?t('stor_persist'):t('stor_session')):t('accContinue');
  return `<div class="item acc ${cur?'cur':''}" data-act="accPick" data-login="${esc(a.login)}"${col?` style="border-inline-start:5px solid ${col}"`:''}>${a.avatar?`<img class="avatar sm" src="${esc(a.avatar)}" alt="">`:`<div class="ib2">${ic('user')}</div>`}<div class="grow"><div class="nm ${a.nick?'':'ltr'}">${esc(accName(a))}</div><div class="mt">${sub}${stor}</div>${exp?`<div style="margin-top:4px">${exp}</div>`:''}</div>${cur?`<span class="tag g">${ic('check')}</span>`:''}${mode==='menu'?`<button class="btn sm" data-act="accEdit" data-login="${esc(a.login)}" aria-label="${esc(t('accEdit'))}">${ic('edit')}</button>`:''}${cur?'':`<button class="btn sm" data-act="accForget" data-login="${esc(a.login)}" aria-label="${esc(t('accForget'))}">${ic('trash')}</button>`}</div>`;
}
const accBtn=()=>S.user?`<button class="accbtn" data-act="accMenu" aria-label="${esc(t('accounts'))}" title="@${esc(S.user.login)}"${accColStyle()}>${S.user.avatar_url?`<img src="${esc(S.user.avatar_url)}" alt="">`:ic('user')}</button>`:'';
const GH_SVG='<svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';
const ghBtn=()=>`<a class="ghbtn" href="${GH_URL}" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">${GH_SVG}</a>`;
const tgBtn=(cls)=>`<a class="btn ${cls||''}" href="${TG_URL}" target="_blank" rel="noopener">${ic('tg')} ${t('tgChannel')}</a>`;
const spinS=()=>'<span class="spin" style="width:11px;height:11px;border-width:2px"></span>';

function viewLoading(){return `<div style="flex:1;display:grid;place-items:center;min-height:100vh"><div style="text-align:center"><div class="pulse">${LOGO(88)}</div><div class="sk-box" style="width:160px;margin:26px auto 0"><i class="sk" style="height:8px"></i></div></div></div>`}

function viewLock(){
  return `<div class="gate"><div class="gate-top"><span></span><div class="row" style="gap:8px">${ghBtn()}${langBtn()}</div></div><div class="gate-body">
  <div class="gate-hero">${LOGO(96)}<h1>Onyxa</h1><p>${t('lockTitle')}</p></div>
  <div class="gate-form"><label class="lb" for="pin">${t('lockPin')}</label>
  <div class="field">${ic('key')}<input id="pin" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" ${S.busy?'disabled':''}></div>
  ${S.gateErr?infoBox(S.gateErr,false):''}
  <button class="btn pri block big" data-act="unlock" ${S.busy?'disabled':''}>${S.busy?'<span class="spin dk"></span> '+t('verifying'):t('lockOpen')}</button>
  <button class="btn block" data-act="lockForgot" style="margin-top:10px">${t('lockForgot')}</button></div></div></div>`;
}

function viewGate(){
  const saved=accRead();
  const savedBox=(saved.length&&!S.adding)?`<div class="gate-form" style="margin-bottom:14px"><div class="lb">${t('accSaved')}</div>${saved.map(a=>accRow(a,'gate')).join('')}${S.gateErr&&S.busy===false&&!S.tokIn?infoBox(S.gateErr,true):''}</div><div class="mt note" style="text-align:center;margin:0 0 12px">${t('accOr')}</div>`:'';
  return `<div class="gate">
  <div class="gate-top">${S.adding?`<button class="btn sm" data-act="accCancel">${ic('back','flip')} ${t('cancel')}</button>`:'<span></span>'}<div class="row" style="gap:8px">${ghBtn()}${langBtn()}</div></div>
  <div class="gate-body">
    <div class="gate-hero">${LOGO(104)}<h1>Onyxa</h1><p>${t('tagline')}</p></div>
    ${savedBox}
    <div class="gate-form">
      ${S.adding?`<div class="mt note" style="margin-bottom:8px">${t('accAddHint')}</div>`:''}
      <label class="lb" for="tok">${t('tokenLabel')}</label>
      <div class="field">
        ${ic('key')}
        <input id="tok" type="${S.showTok?'text':'password'}" data-bind="tokIn" value="${esc(S.tokIn)}" placeholder="github_pat_… / ghp_…" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="eye" data-act="tokEye" aria-label="${esc(t('showHide'))}">${ic(S.showTok?'eyeoff':'eye')}</button>
      </div>
      ${S.gateErr?infoBox(S.gateErr,true):''}
      <label class="chk"><input type="checkbox" data-bind="persistChk" ${S.persistChk?'checked':''}> ${t('remember')}</label>
      <p class="mt note">${t('persistNote')}</p>
      <button class="btn pri block big" data-act="verify" ${S.busy?'disabled':''}>${S.busy?'<span class="spin dk"></span> '+t('verifying'):t('enterBtn')}</button>
    </div>
    <details class="how"><summary>${t('howToken')}</summary><div class="bd"><ol><li>${t('s1')}</li><li>${t('s2')}</li><li>${t('s3')}</li><li>${t('s4')}</li></ol>
    <div class="btns" style="margin-top:14px"><a class="btn sm" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">${ic('ext')} ${t('tokFine')}</a><a class="btn sm" href="https://github.com/settings/tokens/new?scopes=public_repo&description=Onyxa" target="_blank" rel="noopener">${ic('ext')} ${t('tokClassic')}</a></div></div></details>
    <div style="margin-top:18px">${tgBtn('block')}</div>
  </div></div>`;
}

function viewApp(){
  let body='',title='',isBack=false;
  if(S.page==='wizard'){body=viewWizard();title=t('w_title');isBack=true}
  else if(S.page==='site'){body=viewSite();title=repoName(S.cur||'');isBack=true}
  else if(S.page==='files'){body=viewFiles();title=t('fm_title');isBack=true}
  else body=S.tab==='home'?viewHome():S.tab==='sites'?viewSites():S.tab==='activity'?viewActivity():viewSettings();
  const top=`<div class="top">${isBack?`<button class="btn sm" data-act="back" aria-label="${esc(t('back'))}">${ic('back','flip')}</button><div class="ttl ${S.page!=='wizard'?'ltr':''}">${esc(title)}</div>`:`<div class="brand">${LOGO(30)}<span>Onyxa</span></div><div class="ttl"></div>`}${ghBtn()}${langBtn()}${accBtn()}</div>`;
  const nb=(k,i,l)=>`<button class="${S.tab===k?'on':''}" data-act="nav" data-to="${k}">${ic(i)}<span>${t(l)}</span></button>`;
  return top+`<div class="main">${body}</div>`+(isBack?'':`<div class="nav"><div class="nav-brand">${LOGO(34)}<span>Onyxa</span></div>${nb('home','home','nav_home')}${nb('sites','globe','nav_sites')}${nb('activity','clock','nav_activity')}${nb('settings','sliders','nav_settings')}${tgBtn('nav-tg')}</div>`);
}

/* ---------- shared bits ---------- */
function chip(st){
  const m={published:['g','check','st_published'],building:['a','spin','st_building'],uploading:['a','spin','st_uploading'],failed:['r','alert','st_failed'],none:['','dot','st_none'],unknown:['','dot','st_unknown'],loading:['','spin','st_loading']};
  const x=m[st]||m.unknown;
  return `<span class="tag ${x[0]}">${x[1]==='spin'?spinS():ic(x[1])} ${t(x[2])}</span>`;
}
function buildLabel(b){
  if(!b)return '—';
  return b.status==='built'?t('st_published'):b.status==='errored'?t('st_failed'):(b.status==='building'||b.status==='queued')?t('st_building'):t('st_unknown');
}
function expAlert(){const n=daysLeft(S.tokExp);if(n===null||n>7)return '';return alertBox('warn',n<=0?t('expAlertDone'):t('expAlert',{n:Math.max(n,1)}))}
function rateAlert(){
  const r=S.rate;
  return expAlert()+rateAlert0();
}
function rateAlert0(){
  const r=S.rate;
  if(r&&r.limit&&r.remaining<=Math.max(20,r.limit*0.02))return alertBox('warn',t('rate_low',{n:r.remaining,time:r.reset?new Date(r.reset*1000).toLocaleTimeString():'…'}));
  return '';
}
const actIcon={repo_selected:'repo',repo_created:'plus',files_uploaded:'up',file_modified:'edit',deployed:'check',deploy_failed:'alert',pages_enabled:'globe',pages_disabled:'globe',pages_updated:'globe',restored:'refresh'};
function actRow(a,showRepo){
  const txt=t('act_'+a.type);
  return `<div class="hist"><div class="ib2" style="width:32px;height:32px;border-radius:10px;${a.ok?'':'border-color:rgba(248,81,73,.5);color:var(--red)'}">${ic(actIcon[a.type]||'dot')}</div><div class="grow"><div style="font-weight:700">${esc(txt)}</div><div class="mt ltr" style="overflow-wrap:anywhere">${showRepo&&a.repo?esc(a.repo)+(a.detail?' · ':''):''}${esc(a.detail)}</div></div><div class="mt" style="white-space:nowrap">${fmtDate(a.ts,true)}</div></div>`;
}
function siteSort(a,b){const ta=a.repo?new Date(a.repo.pushed_at||0):0,tb=b.repo?new Date(b.repo.pushed_at||0):0;return tb-ta}

/* ---------- Home ---------- */
function viewHome(){
  const u=S.user,L=managed().sort(siteSort);
  const sts=L.map(x=>siteStatus(x.full));
  const pend=sts.includes('loading');
  const n=k=>pend?'<i class="sk sk-n"></i>':sts.filter(s=>k.includes(s)).length;
  const recent=L.slice(0,4);
  const acts=S.act.slice(0,5);
  return `<div class="row" style="margin:2px 0 16px"><img class="avatar" src="${esc(u.avatar_url)}" alt=""><div class="grow"><div class="h2" style="margin:0">${t('hello',{n:esc(u.name||u.login)})}</div><div class="mt ltr">@${esc(u.login)}</div></div></div>
  ${S.reposErr?errBox(S.reposErr):''}${rateAlert()}
  <button class="btn pri block big" data-act="deploy" style="margin-bottom:14px">${ic('up')} ${t('w_title')}</button>
  <div class="stats">
    <div class="stat"><b>${L.length}</b><span>${t('s_total')}</span></div>
    <div class="stat g"><b>${n(['published'])}</b><span>${t('s_pub')}</span></div>
    <div class="stat a"><b>${n(['building','uploading'])}</b><span>${t('s_build')}</span></div>
    <div class="stat r"><b>${n(['failed'])}</b><span>${t('s_err')}</span></div>
  </div>
  <div class="cols"><div>
  <div class="sec"><span>${t('recentSites')}</span><a class="btn sm" data-act="nav" data-to="sites">${t('viewAll')}</a></div>
  ${recent.length?recent.map(x=>siteRow(x)).join(''):`<div class="card empty"><div class="ib2 big">${ic('globe')}</div>${t('noSites')}<div style="margin-top:14px"><button class="btn pri" data-act="deploy">${ic('up')} ${t('w_title')}</button></div></div>`}
  </div><div>
  <div class="sec"><span>${t('recentAct')}</span><a class="btn sm" data-act="nav" data-to="activity">${t('viewAll')}</a></div>
  ${acts.length?`<div class="card" style="padding:4px 14px">${acts.map(a=>actRow(a,true)).join('')}</div>`:`<div class="card empty">${t('noAct')}</div>`}
  </div></div>
  <div style="margin-top:6px">${tgBtn('block')}</div>`;
}
function siteRow(x){
  const st=siteStatus(x.full),r=x.repo;
  return `<div class="item" data-act="openSite" data-full="${esc(x.full)}"><div class="ib2">${ic('globe')}</div><div class="grow"><div class="nm ltr">${esc(repoName(x.full))}</div><div class="mt">${r?fmtDate(r.pushed_at||r.updated_at):'—'}</div></div>${chip(st)}${ic('chev','flip')}</div>`;
}

/* ---------- Websites ---------- */
function siteCard(x){
  const {full,repo}=x,d=S.sites.get(full)||{},st=siteStatus(full);
  const url=d.pages&&d.pages.html_url,b=d.build;
  const branch=d.pages&&d.pages.source?d.pages.source.branch+(d.pages.source.path&&d.pages.source.path!=='/'?' '+d.pages.source.path:''):'—';
  return `<div class="site">
    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px"><div class="grow"><div class="h2 ltr" style="overflow-wrap:anywhere">${esc(repoName(full))}</div><div class="mt ltr" style="overflow-wrap:anywhere">${esc(full)}</div></div>${chip(st)}</div>
    ${url?`<a class="url" style="margin-top:8px" href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`:''}
    ${!repo?alertBox('warn',t('repoGone')):''}
    ${d.err?errBox(d.err):''}
    ${st==='loading'?'<div class="sk-box"><i class="sk"></i><i class="sk" style="width:70%"></i><i class="sk" style="width:55%"></i></div>':''}
    <dl class="kv"${st==='loading'?' hidden':''}>
      <dt>${t('f_branch')}</dt><dd class="ltr">${esc(branch)}</dd>
      <dt>${t('f_vis')}</dt><dd>${repo?(repo.private?t('private'):t('public')):'—'}</dd>
      <dt>${t('f_last')}</dt><dd>${b?fmtDate(b.updated_at||b.created_at,true):'—'}</dd>
      <dt>${t('f_result')}</dt><dd>${esc(buildLabel(b))}</dd>
    </dl>
    <div class="btns">
      ${url&&st!=='none'?`<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">${ic('ext')} ${t('openSite')}</a><button class="btn sm" data-act="copy" data-v="${esc(url)}" aria-label="${esc(t('copyLink'))}">${ic('copy')}</button>`:''}
      ${canPush(repo)?`<button class="btn sm" data-act="deployTo" data-full="${esc(full)}">${ic('up')} ${t('uploadNew')}</button>`:''}
      ${repo?`<button class="btn sm" data-act="openFiles" data-full="${esc(full)}">${ic('folder')} ${t('manageFiles')}</button>`:''}
      <button class="btn sm" data-act="openSite" data-full="${esc(full)}">${ic('sliders')} ${t('details')}</button>
    </div></div>`;
}
function viewSites(){
  const L=managed().sort(siteSort);
  return `<div class="row wrap" style="justify-content:space-between;margin-bottom:12px"><div><div class="h1">${t('nav_sites')}</div><div class="mt">${t('sitesCount',{n:L.length})}</div></div>
    <div class="btns"><button class="btn sm" data-act="reloadAll" aria-label="${esc(t('refresh'))}">${ic('refresh')}</button><button class="btn sm" data-act="connect">${ic('plus')} ${t('connect')}</button><button class="btn pri sm" data-act="deploy">${ic('up')} ${t('w_title')}</button></div></div>
    ${S.reposErr?errBox(S.reposErr):''}${rateAlert()}
    ${L.length?`<div class="grid">${L.map(siteCard).join('')}</div>`:`<div class="card empty">${t('noSites')}</div>`}`;
}

/* ---------- Site detail ---------- */
function viewSite(){
  const full=S.cur,repo=repoByFull(full),d=S.sites.get(full)||{},st=siteStatus(full);
  const pg=d.pages,b=d.build,url=pg&&pg.html_url;
  let h='';
  h+=`<div class="row wrap" style="margin-bottom:12px;gap:8px"><span class="tag">${repo?(repo.private?t('private'):t('public')):'—'}</span>${pg&&pg.source?`<span class="tag ltr">${esc(pg.source.branch)} ${esc(pg.source.path||'/')}</span>`:''}<a class="btn sm" style="margin-inline-start:auto" href="https://github.com/${esc(full)}" target="_blank" rel="noopener">${ic('ext')} GitHub</a></div>`;
  if(d.err)h+=errBox(d.err);
  if(!repo)h+=alertBox('warn',t('repoGone'));
  // status card
  h+=`<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="h2" style="margin:0">${t('deployStatus')}</div>${chip(st)}</div>`;
  if(st==='none'){
    h+=`<p class="sub">${t('siteNotLiveSub')}</p>`;
    if(repo&&canPages(repo)){
      const path=(S.det&&S.det.path)||'/';
      h+=`<label class="lb" style="margin-top:0">${t('pubDir')}</label><select class="input" data-bind="detPath"><option value="/" ${path==='/'?'selected':''}>${t('dirRoot')}</option><option value="/docs" ${path==='/docs'?'selected':''}>/docs</option></select>
      <div class="mt" style="margin:6px 0 12px">${t('f_branch')}: <span class="ltr">${esc(repo.default_branch)}</span></div>
      <button class="btn pri block" data-act="enableHere" ${S.busy?'disabled':''}>${S.busy?'<span class="spin dk"></span> ':ic('globe')+' '}${t('enable')}</button>`;
    }else if(repo)h+=alertBox('warn',t('noAdmin'));
    if(repo&&repo.private)h+=alertBox('warn',t('pagesPriv'));
  }else if(url){
    h+=`<div class="item static ltr" style="word-break:break-all;font-size:14px;margin-bottom:12px"><div class="grow">${esc(url)}</div></div>
    <div class="btns"><a class="btn pri" href="${esc(url)}" target="_blank" rel="noopener">${ic('ext')} ${t('openSite')}</a><button class="btn" data-act="copy" data-v="${esc(url)}">${ic('copy')} ${t('copyLink')}</button></div>`;
  }
  h+=`</div>`;
  if(isWorkflow(d))h+=alertBox('warn',t('wfWarn'));
  if(st==='failed'){
    const m=b&&b.error&&b.error.message;
    h+=`<div class="alert err">${ic('alert')}<div><b>${t('k_build')}</b><div>${esc(m||t('buildFailedNoMsg'))}</div><div class="mt" style="margin-top:4px;color:inherit;opacity:.85">${t('hint_build')}</div></div></div>`;
  }
  if(b)h+=`<div class="card"><div class="h2" style="font-size:15px">${t('latestBuild')}</div><dl class="kv">
    <dt>${t('f_result')}</dt><dd>${esc(buildLabel(b))}</dd>
    <dt>${t('f_last')}</dt><dd>${fmtDate(b.updated_at||b.created_at,true)}</dd>
    <dt>${t('f_commit')}</dt><dd class="ltr">${b.commit?`<a href="https://github.com/${esc(full)}/commit/${esc(b.commit)}" target="_blank" rel="noopener">${esc(String(b.commit).slice(0,7))}</a>`:'—'}</dd>
    <dt>${t('f_by')}</dt><dd class="ltr">${esc((b.pusher&&b.pusher.login)||'—')}</dd>
    <dt>${t('f_dur')}</dt><dd>${fmtDur(b.duration)}</dd></dl></div>`;
  // actions
  if(st!=='none'){
    h+=`<div class="sec"><span>${t('actions')}</span></div><div class="btns" style="margin-bottom:6px">
      ${canPush(repo)?`<button class="btn" data-act="deployTo" data-full="${esc(full)}">${ic('up')} ${t('uploadNew')}</button>`:''}
      ${repo?`<button class="btn" data-act="openFiles" data-full="${esc(full)}">${ic('folder')} ${t('manageFiles')}</button>`:''}
      ${d.pages&&!isWorkflow(d)?`<button class="btn" data-act="rebuild" ${POLL||S.busy?'disabled':''}>${ic('refresh')} ${t('rebuild')}</button>`:''}
      <button class="btn" data-act="refreshSite" ${d.loading?'disabled':''}>${ic('refresh')} ${t('refreshStatus')}</button></div>`;
  }
  // history
  if(d.pages&&!isWorkflow(d)){
    h+=`<div class="sec"><span>${t('history')}</span></div>`;
    if(!d.hist)h+=loader();
    else if(!d.hist.length)h+=`<div class="card empty">${t('noHistory')}</div>`;
    else{
      const seen=new Set();
      const vers=d.hist.filter(x=>{if(x.commit&&seen.has(x.commit))return false;if(x.commit)seen.add(x.commit);return true});
      const mayRestore=canPush(repo)&&d.pages&&d.pages.source;
      h+=`<div class="card" style="padding:4px 14px">${vers.map((x,i)=>`<div class="ver"><div class="grow"><div class="row wrap" style="gap:8px">${chip(x.status==='built'?'published':x.status==='errored'?'failed':(x.status==='building'||x.status==='queued')?'building':'unknown')}<span class="mt ltr">${x.commit?esc(String(x.commit).slice(0,7)):''}</span>${i===0?`<span class="tag">${t('current')}</span>`:''}</div>${x.error&&x.error.message?`<div class="mt" style="color:var(--red);margin-top:4px;overflow-wrap:anywhere">${esc(x.error.message)}</div>`:''}<div class="mt" style="margin-top:2px">${fmtDate(x.updated_at||x.created_at,true)} · ${fmtDur(x.duration)}</div></div>${mayRestore&&i>0&&x.commit&&x.status==='built'?`<button class="btn sm" data-act="restoreVer" data-sha="${esc(x.commit)}" ${POLL||S.busy?'disabled':''}>${ic('refresh')} ${t('restore')}</button>`:''}</div>`).join('')}</div><div class="mt">${t('restoreNote')}</div>`;
    }
  }
  // local activity
  const acts=S.act.filter(a=>a.repo===full).slice(0,6);
  if(acts.length)h+=`<div class="sec"><span>${t('recentAct')}</span></div><div class="card" style="padding:4px 14px">${acts.map(a=>actRow(a,false)).join('')}</div><div class="mt">${t('actLocalNote')}</div>`;
  // danger
  if(st!=='none'&&d.pages&&canPages(repo)||(!repo?false:!repo.has_pages&&S.reg.includes(full))){
    h+=`<div class="dz"><div class="sec">${ic('alert')} ${t('danger')}</div>`;
    if(d.pages&&canPages(repo))h+=`<p class="sub">${t('disableBody')}</p><button class="btn redo block" data-act="disablePages">${t('disable')}</button>`;
    if(S.reg.includes(full)&&!(repo&&repo.has_pages))h+=`<p class="sub" style="margin-top:12px">${t('removeBody')}</p><button class="btn redo block" data-act="unlist">${t('removeList')}</button>`;
    h+=`</div>`;
  }
  return h;
}

/* ---------- Activity ---------- */
function viewActivity(){
  const L=managed().filter(x=>{const d=S.sites.get(x.full);return d&&d.build}).sort((a,b)=>new Date(S.sites.get(b.full).build.updated_at||0)-new Date(S.sites.get(a.full).build.updated_at||0));
  return `<div class="h1">${t('nav_activity')}</div><p class="sub">${t('actLocalNote')}</p>
  <div class="sec"><span>${t('ghBuilds')}</span></div>
  ${L.length?`<div class="card" style="padding:4px 14px">${L.map(x=>{const b=S.sites.get(x.full).build;return `<div class="hist" style="cursor:pointer" data-act="openSite" data-full="${esc(x.full)}"><div class="grow"><div class="nm ltr" style="font-weight:700;overflow-wrap:anywhere">${esc(x.full)}</div><div class="mt">${esc(buildLabel(b))}${b.commit?' · <span class="ltr">'+esc(String(b.commit).slice(0,7))+'</span>':''}</div></div><div class="mt">${fmtDate(b.updated_at||b.created_at,true)}</div></div>`}).join('')}</div>`:`<div class="card empty">${t('noBuilds')}</div>`}
  <div class="sec"><span>${t('localAct')}</span>${S.act.length?`<button class="btn sm redo" data-act="clearAct">${t('clear')}</button>`:''}</div>
  ${S.act.length?`<div class="card" style="padding:4px 14px">${S.act.slice(0,100).map(a=>actRow(a,true)).join('')}</div>`:`<div class="card empty">${t('noAct')}</div>`}`;
}

/* ---------- Settings ---------- */
function viewSettings(){
  const u=S.user;
  const sc=typeof S.scopes==='string'?S.scopes.split(',').map(x=>x.trim()).filter(Boolean):[];
  const noScope=S.tokenKind==='classic'&&!sc.some(s=>s==='repo'||s==='public_repo');
  return `<div class="h1" style="margin-bottom:12px">${t('nav_settings')}</div>
  <div class="card"><div class="row"><img class="avatar" src="${esc(u.avatar_url)}" alt=""><div class="grow"><div style="font-weight:800;font-size:17px">${esc(u.name||u.login)}</div><div class="mt ltr">@${esc(u.login)}</div></div><a class="btn sm" href="${esc(u.html_url)}" target="_blank" rel="noopener">${ic('ext')} ${t('viewProfile')}</a></div></div>
  <div class="card"><div class="h2" style="font-size:16px">${t('theme')}</div>
    <div class="tabs" style="margin:10px 0 0"><button class="${S.theme==='light'?'on':''}" data-act="setTheme" data-th="light">${t('themeLight')}</button><button class="${S.theme==='dark'?'on':''}" data-act="setTheme" data-th="dark">${t('themeDark')}</button></div></div>
  <div class="card"><div class="h2" style="font-size:16px">${t('lang')}</div>
    <div class="tabs" style="margin:10px 0 0"><button class="${S.lang==='ar'?'on':''}" data-act="setLang" data-l="ar">العربية</button><button class="${S.lang==='en'?'on':''}" data-act="setLang" data-l="en">English</button></div></div>
  <div class="card"><div class="h2" style="font-size:16px">${t('tokenSec')}</div>
    <dl class="kv"><dt>${t('tokenType')}</dt><dd>${t('tt_'+S.tokenKind)}</dd>${S.tokenKind==='classic'?`<dt>${t('scopes')}</dt><dd class="ltr">${sc.length?esc(sc.join(', ')):'—'}</dd>`:''}
    ${S.tokExp?`<dt>${t('tokExp')}</dt><dd>${esc(fmtDate(S.tokExp,true))} · ${esc(expText(S.tokExp))}</dd>`:`<dt>${t('tokExp')}</dt><dd>${t('noExp')}</dd>`}
    <dt>${t('storage')}</dt><dd>${S.persist?t('stor_persist'):t('stor_session')}</dd>
    ${S.rate&&S.rate.limit?`<dt>${t('rateLimit')}</dt><dd>${S.rate.remaining} / ${S.rate.limit}</dd>`:''}</dl>
    ${noScope?alertBox('warn',t('scopeWarn')):''}
    <label class="chk"><input type="checkbox" data-act="togglePersist" ${S.persist?'checked':''}> ${t('remember')}</label>
    <p class="mt note" style="margin-bottom:0">${t('persistNote')}</p></div>
  ${cryptoOk()?`<div class="card"><div class="h2" style="font-size:16px">${t('lock')}</div><p class="mt note" style="margin:6px 0 12px">${t('lockHint')}</p>${S.lockOn?`<div class="row" style="margin-bottom:10px"><span class="tag g">${ic('check')} ${t('lockStatusOn')}</span></div><button class="btn block" data-act="lockOff">${t('lockDisable')}</button>`:`<button class="btn block" data-act="lockSet">${ic('key')} ${t('lockEnable')}</button>`}</div>`:''}
  ${alertBox('info',t('secNote'),'key')}
  <div style="margin-bottom:10px">${tgBtn('block')}</div>
  <a class="btn block" href="https://github.com/settings/tokens" target="_blank" rel="noopener" style="margin-bottom:10px">${ic('ext')} ${t('manageTokens')}</a>
  <button class="btn redo block" data-act="logout">${ic('logout')} ${t('logout')}</button>`;
}

/* ---------- Modal ---------- */
function confirmBox(o){S.modal=o;renderModal()}
function renderModal(){
  const m=S.modal;const fresh=!!m&&!renderModal.on;renderModal.on=!!m;
  $('#modal').innerHTML=m?`<div class="modal${fresh?' fresh':''}" data-act="mbg"><div class="sheet ${m.danger?'dg':''}" role="dialog" aria-modal="true"><div class="h2">${esc(m.title)}</div><div class="sub" style="margin-top:6px">${m.body||''}</div>${m.html||''}${m.err?`<div class="alert err">${ic('alert')}<div>${esc(m.err)}</div></div>`:''}<div class="row" style="margin-top:14px"><button class="btn grow" data-act="mcancel">${esc(m.cancel||t('cancel'))}</button>${m.ok?`<button class="btn grow ${m.danger?'red':'pri'}" data-act="mok">${esc(m.ok)}</button>`:''}</div></div></div>`:'';
  if(m&&m.focus){const el=$('#modal '+m.focus);if(el)el.focus()}
}


/* ---------- Deployment wizard: state ---------- */
function newWizard(full,step){
  const r=full?repoByFull(full):null;
  return {step:step||1,mode:'existing',repo:r,newName:'',newDesc:'',newPrivate:false,q:'',
    branches:null,branch:r?r.default_branch:'main',pubDir:'/',sub:'',strip:true,
    sel:[],msg:'',tree:null,pages:null,confirm:false,showAll:false,loading:false,err:null,
    run:null,ctl:null};
}
function openWizard(full,step){
  S.w=newWizard(full,step);
  if(full&&S.w.repo)addAct('repo_selected',full,'');
  pushPage('wizard');
  if(S.w.step>=3)wLoadBranches();
}
const wFull=()=>S.w.repo?S.w.repo.full_name:'';
const wBase=()=>S.w.pubDir==='/docs'?'docs':'';
const wFinal=rel=>joinPath(wBase(),joinPath(normDir(S.w.sub),rel));

function wRows(){
  const w=S.w,cnt=new Map();
  const rows=w.sel.map((it,i)=>{
    let rel=it.rel.replace(/\\/g,'/');
    if(it.folder&&w.strip){const p=rel.split('/');if(p.length>1)p.shift();rel=p.join('/')}
    return {it,i,rel,size:it.file.size,issues:[]};
  });
  rows.forEach(r=>cnt.set(r.rel,(cnt.get(r.rel)||0)+1));
  rows.forEach(r=>{
    const pi=pathIssue(r.rel);
    if(pi)r.issues.push(pi==='long'?'long':pi==='git'?'git':'chars');
    if(r.size>MAX_FILE)r.issues.push('big');
    if(cnt.get(r.rel)>1)r.issues.push('dup');
  });
  return rows;
}
const issueTag=k=>`<span class="tag r">${t('iss_'+k)}</span>`;

/* ---------- Deployment wizard: views ---------- */
function viewWizard(){
  const w=S.w;
  const names=['ws_source','ws_upload','ws_config','ws_review','ws_deploy'];
  const bar=`<div class="steps">${names.map((n,i)=>`<div class="st ${w.step===i+1?'on':w.step>i+1?'done':''}"><i>${w.step>i+1?ic('check'):i+1}</i><span>${t(n)}</span></div>`).join('')}</div>`;
  let body='';
  if(w.step===1)body=wStep1();else if(w.step===2)body=wStep2();else if(w.step===3)body=wStep3();else if(w.step===4)body=wStep4();else body=wStep5();
  return bar+body;
}
function wFoot(nextLabel,nextAct,nextDis,backAct,extra){
  return `<div class="foot">${backAct?`<button class="btn" data-act="${backAct}" ${S.w.loading?'disabled':''}>${ic('back','flip')} ${t('back')}</button>`:''}${extra||''}<button class="btn pri grow" data-act="${nextAct}" ${nextDis||S.w.loading?'disabled':''}>${S.w.loading?'<span class="spin dk"></span> ':''}${nextLabel}</button></div>`;
}
function wRepoList(){
  const q=S.w.q.trim().toLowerCase();
  const l=S.repos.filter(r=>r.full_name.toLowerCase().includes(q));
  if(!l.length)return `<div class="empty">${t(S.repos.length?'noMatch':'noRepos')}</div>`;
  const sel=wFull();
  return l.slice(0,60).map(r=>{
    const ok=canPush(r);
    return `<div class="item ${r.full_name===sel?'sel':''}" ${ok?`data-act="wPick" data-full="${esc(r.full_name)}"`:'style="opacity:.55;cursor:not-allowed"'}><div class="ib2">${ic('repo')}</div><div class="grow"><div class="nm ltr">${esc(r.full_name)}</div><div class="mt">${r.private?t('private'):t('public')} · <span class="ltr">${esc(r.default_branch)}</span>${!ok?' · '+t(r.archived?'archived':'noWrite'):''}</div></div>${r.has_pages?`<span class="tag g">${t('st_published')}</span>`:''}</div>`;
  }).join('')+(l.length>60?`<div class="mt" style="text-align:center">${t('moreN',{n:l.length-60})}</div>`:'');
}
function wStep1(){
  const w=S.w;
  let h=`<div class="h1" style="font-size:20px">${t('w1_t')}</div><p class="sub">${t('w1_s')}</p>
  <div class="tabs"><button class="${w.mode==='existing'?'on':''}" data-act="wMode" data-m="existing">${t('w_existing')}</button><button class="${w.mode==='new'?'on':''}" data-act="wMode" data-m="new">${t('w_new')}</button></div>`;
  if(w.mode==='existing'){
    h+=`<input class="input" data-bind="wq" value="${esc(w.q)}" placeholder="${esc(t('searchPh'))}" style="margin-bottom:12px"><div id="wrl">${wRepoList()}</div>`;
    if(w.repo)h+=`<div class="card" style="margin-top:12px"><dl class="kv" style="margin:0"><dt>${t('w_repo')}</dt><dd class="ltr">${esc(w.repo.full_name)}</dd><dt>${t('f_branch')}</dt><dd class="ltr">${esc(w.repo.default_branch)}</dd><dt>${t('f_vis')}</dt><dd>${w.repo.private?t('private'):t('public')}</dd></dl></div>`;
  }else{
    h+=`<div class="card"><label class="lb" style="margin-top:0">${t('repoName')}</label><input class="input ltr" data-bind="newName" value="${esc(w.newName)}" placeholder="my-site" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="mt" style="margin-top:6px">${t('repoNameHint')}</div>
    <label class="lb">${t('repoDesc')}</label><input class="input" data-bind="newDesc" value="${esc(w.newDesc)}">
    <label class="lb">${t('visibility')}</label>
    <div class="opt ${!w.newPrivate?'on':''}" data-act="wVis" data-v="0"><div class="dot"></div><div><b>${t('vPublic')}</b><span class="mt">${t('vPublicS')}</span></div></div>
    <div class="opt ${w.newPrivate?'on':''}" data-act="wVis" data-v="1"><div class="dot"></div><div><b>${t('vPrivate')}</b><span class="mt">${t('vPrivateS')}</span></div></div></div>`;
  }
  if(w.err)h+=typeof w.err==='string'?alertBox('err',esc(w.err)):errBox(w.err);
  const ok=w.mode==='existing'?!!w.repo:!!w.newName.trim();
  return h+wFoot(t('next'),'wNext1',!ok,'');
}

function wStep2(){
  const w=S.w,rows=wRows();
  const bad=rows.filter(r=>r.issues.length),total=rows.reduce((a,r)=>a+r.size,0);
  const hasFolder=w.sel.some(x=>x.folder);
  const html=rows.find(r=>/\.html?$/i.test(r.rel));
  let h=`<div class="h1" style="font-size:20px">${t('w2_t')}</div><p class="sub">${t('w2_s')}</p>
  <div class="dz2" id="dz"><div>${ic('up')}</div><div style="margin-top:6px">${t('dropHere')}</div>
  <div class="btns"><button class="btn" data-act="pick">${ic('file')} ${t('chooseFiles')}</button><button class="btn" data-act="pickDir">${ic('folder')} ${t('chooseFolder')}</button><button class="btn" data-act="pickZip">${ic('file')} ${t('chooseZip')}</button></div></div>`;
  if(w.zipBusy)h+=`<div class="alert info"><span class="spin"></span><div>${t('zipBusy')}</div></div>`;
  if(w.err&&typeof w.err==='string')h+=alertBox('err',esc(w.err));
  if(hasFolder)h+=`<label class="chk" style="margin:0 0 12px"><input type="checkbox" data-bind="strip" ${w.strip?'checked':''}> ${t('stripRoot')}</label>`;
  if(!rows.length)h+=`<div class="empty">${t('nothingSel')}</div>`;
  else{
    h+=`<div class="row wrap" style="justify-content:space-between;margin-bottom:10px"><div class="mt">${t('selSummary',{n:rows.length,s:fmtSize(total)})}</div><div class="btns">${html?`<button class="btn sm" data-act="wPreview">${ic('eye')} ${t('preview')}</button>`:''}<button class="btn sm" data-act="wClear">${t('clear')}</button></div></div>`;
    if(total>WARN_TOTAL)h+=alertBox('warn',t('bigTotal'));
    if(bad.length)h+=`<div class="alert err">${ic('alert')}<div>${t('fixIssues',{n:bad.length})}<div style="margin-top:8px"><button class="btn sm" data-act="wDropBad">${t('removeBad')}</button></div></div></div>`;
    const lim=w.showAll?rows.length:80;
    h+=rows.slice(0,lim).map(r=>`<div class="item static"><div class="ib2">${ic('file')}</div><div class="grow"><div class="nm ltr" style="font-size:14px">${esc(r.rel)}</div><div class="mt">${fmtSize(r.size)}</div></div>${r.issues.map(issueTag).join('')}<button class="btn sm" data-act="wRm" data-i="${r.i}" aria-label="${esc(t('remove'))}">${ic('x')}</button></div>`).join('');
    if(rows.length>lim)h+=`<div style="text-align:center;margin:6px 0"><button class="btn sm" data-act="wShowAll">${t('moreN',{n:rows.length-lim})}</button></div>`;
  }
  return h+wFoot(t('next'),'wNext2',!rows.length||!!bad.length,'wPrev');
}

function wStep3(){
  const w=S.w,isNew=w.mode==='new';
  const sub=normDir(w.sub),subBad=sub&&pathIssue(sub);
  let h=`<div class="h1" style="font-size:20px">${t('w3_t')}</div><p class="sub">${t('w3_s')}</p><div class="card">
  <label class="lb" style="margin-top:0">${t('f_branch')}</label>`;
  if(isNew)h+=`<div class="input" style="opacity:.7">${t('newDefault')}</div>`;
  else if(!w.branches)h+=`<div class="input" style="opacity:.7"><span class="spin"></span></div>`;
  else h+=`<select class="input ltr" data-bind="branch">${w.branches.map(b=>`<option value="${esc(b)}" ${b===w.branch?'selected':''}>${esc(b)}</option>`).join('')}</select>`;
  h+=`<label class="lb">${t('pubDir')}</label>
  <div class="opt ${w.pubDir==='/'?'on':''}" data-act="wDir" data-v="/"><div class="dot"></div><div><b>${t('dirRoot')}</b><span class="mt">${t('dirRootS')}</span></div></div>
  <div class="opt ${w.pubDir==='/docs'?'on':''}" data-act="wDir" data-v="/docs"><div class="dot"></div><div><b class="ltr">/docs</b><span class="mt">${t('dirDocsS')}</span></div></div>
  <label class="lb">${t('subDir')}</label><input class="input ltr" data-bind="sub" value="${esc(w.sub)}" placeholder="my-folder" autocomplete="off" autocapitalize="off" spellcheck="false">
  <div class="mt" style="margin-top:6px">${t('subDirS')}</div>
  ${subBad?`<div class="alert err">${ic('alert')}<div>${t('subBad')}</div></div>`:''}</div>
  <div class="card"><div class="mt">${t('pagesSource')}</div><div class="ltr" style="font-weight:700;margin-top:4px">${esc(isNew?t('newDefault'):w.branch)} · ${w.pubDir==='/'?'/ (root)':'/docs'}</div></div>`;
  if(w.err)h+=typeof w.err==='string'?alertBox('err',esc(w.err)):errBox(w.err);
  return h+wFoot(t('next'),'wNext3',!!subBad||(!isNew&&!w.branches),'wPrev');
}

function wReview(){
  const w=S.w,rows=wRows(),map=w.tree?w.tree.map:new Map();
  let nNew=0,nRep=0,total=0;const conf=[];
  rows.forEach(r=>{
    r.fin=wFinal(r.rel);total+=r.size;
    const e=map.get(r.fin);
    r.exists=!!(e&&e.type==='blob');
    if(e&&e.type==='tree')conf.push(r.fin);
    else{const seg=r.fin.split('/');for(let k=1;k<seg.length;k++){const x=map.get(seg.slice(0,k).join('/'));if(x&&x.type==='blob'){conf.push(r.fin);break}}}
    if(r.exists)nRep++;else nNew++;
  });
  const idx=joinPath(wBase(),'index.html');
  const hasIdx=rows.some(r=>r.fin===idx)||(map.get(idx)&&map.get(idx).type==='blob');
  const warns=[];
  if(!hasIdx)warns.push(['err',t('noIndex',{p:idx})]);
  const pg=w.pages;
  if(w.mode==='existing'&&w.repo){
    if(pg&&pg.build_type==='workflow')warns.push(['warn',t('wfWarn')]);
    else if(pg&&pg.source&&(pg.source.branch!==w.branch||(pg.source.path||'/')!==w.pubDir))warns.push(['warn',t('srcChange',{a:pg.source.branch+' '+(pg.source.path||'/'),b:w.branch+' '+w.pubDir})]);
    if(!pg&&!canPages(w.repo))warns.push(['warn',t('noAdmin')]);
    if(w.repo.private)warns.push(['warn',t('pagesPriv')]);
    if(w.tree&&w.tree.empty)warns.push(['info',t('emptyRepoNote')]);
    if(w.tree&&w.tree.trunc)warns.push(['warn',t('truncated')]);
  }else if(w.newPrivate)warns.push(['warn',t('pagesPriv')]);
  if(total>WARN_TOTAL)warns.push(['warn',t('bigTotal')]);
  const clash=[];
  rows.forEach(r=>{if(!r.exists){const low=r.fin.toLowerCase();for(const k of map.keys()){if(k!==r.fin&&k.toLowerCase()===low){clash.push(r.fin);break}}}});
  if(clash.length)warns.push(['warn',t('caseClash',{p:clash[0]})]);
  const srcChange=!!(pg&&pg.source&&pg.build_type!=='workflow'&&(pg.source.branch!==w.branch||(pg.source.path||'/')!==w.pubDir));
  const cands=hasIdx?[]:rows.filter(r=>!r.rel.includes('/')&&/\.html?$/i.test(r.rel)).slice(0,3);
  return {rows,nNew,nRep,total,warns,conf,needConfirm:nRep>0||srcChange,srcChange,hasIdx,cands};
}
function wStep4(){
  const w=S.w,R=wReview();
  let h=`<div class="h1" style="font-size:20px">${t('w4_t')}</div><p class="sub">${t('w4_s')}</p>
  <div class="card"><dl class="kv" style="margin:0"><dt>${t('w_repo')}</dt><dd class="ltr">${esc(w.mode==='new'?(S.user.login+'/'+w.newName.trim()):wFull())} ${w.mode==='new'?`<span class="tag g">${t('badgeNew')}</span>`:''}</dd>
  <dt>${t('f_branch')}</dt><dd class="ltr">${esc(w.mode==='new'?t('newDefault'):w.branch)}</dd><dt>${t('pubDir')}</dt><dd class="ltr">${w.pubDir==='/'?'/ (root)':'/docs'}${normDir(w.sub)?' + '+esc(normDir(w.sub)):''}</dd>
  <dt>${t('w_files')}</dt><dd>${t('selSummary',{n:R.rows.length,s:fmtSize(R.total)})}</dd><dt>${t('replaced')}</dt><dd>${R.nRep}</dd><dt>${t('badgeNew')}</dt><dd>${R.nNew}</dd></dl></div>`;
  if(R.conf.length)h+=alertBox('err',t('pathConflict',{p:esc(R.conf[0])}));
  h+=R.warns.map(x=>alertBox(x[0]==='err'?'err':x[0]==='warn'?'warn':'info',esc(x[1]))).join('');
  if(R.cands.length)h+=`<div class="card"><div class="btns">${R.cands.map(r=>`<button class="btn sm" data-act="wMakeIndex" data-i="${r.i}">${ic('check')} ${t('makeIndex',{f:'<span class="ltr">'+esc(r.rel)+'</span>'})}</button>`).join('')}</div></div>`;
  const lim=w.showAll?R.rows.length:60;
  h+=R.rows.slice(0,lim).map(r=>`<div class="item static"><div class="ib2">${ic('file')}</div><div class="grow"><div class="nm ltr" style="font-size:14px">${esc(r.fin)}</div><div class="mt">${fmtSize(r.size)}</div></div>${r.exists?`<span class="tag a">${t('badgeReplace')}</span>`:`<span class="tag g">${t('badgeNew')}</span>`}</div>`).join('');
  if(R.rows.length>lim)h+=`<div style="text-align:center;margin:6px 0"><button class="btn sm" data-act="wShowAll">${t('moreN',{n:R.rows.length-lim})}</button></div>`;
  h+=`<div class="card" style="margin-top:12px"><label class="lb" style="margin-top:0">${t('commitMsg')}</label><input class="input" data-bind="msg" value="${esc(w.msg)}" placeholder="${esc(t('defaultMsg'))}">
  ${R.needConfirm?`<label class="chk"><input type="checkbox" data-bind="confirm" ${w.confirm?'checked':''}> <span>${R.nRep?t('confirmReplace',{n:R.nRep}):''} ${R.srcChange?t('confirmSource'):''} ${t('histNote')}</span></label>`:''}</div>
  <div class="btns" style="margin-bottom:4px"><button class="btn" data-act="wPreview">${ic('eye')} ${t('preview')}</button></div>`;
  const dis=!R.hasIdx||!!R.conf.length||(R.needConfirm&&!w.confirm)||(w.mode==='existing'&&!canPush(w.repo));
  return h+wFoot(t('deployBtn'),'wDeploy',dis,'wPrev');
}

function wStep5(){
  const w=S.w,r=w.run;
  if(!r)return '';
  const icons={wait:'dot',active:'spin',ok:'check',fail:'x',skip:'minus'};
  let h=(!r.active&&r.result?`<div class="okmark"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 14-16"/></svg></div>`:'')+`<div class="h1" style="font-size:20px">${t(r.active?'w5_t':r.result?'w5_tdone':'w5_tfail')}</div><p class="sub">${t(r.active?'w5_run':r.result?'w5_done':'w5_fail')}</p><div class="card" style="padding:6px 16px">`;
  h+=r.steps.map(s=>`<div class="run ${s.state==='ok'?'ok':s.state==='fail'?'fail':s.state==='active'?'active':s.state==='skip'?'skip':''}"><div class="mk">${s.state==='active'?'<span class="spin" style="width:12px;height:12px;border-width:2px"></span>':ic(icons[s.state]||'dot')}</div><div class="grow"><div style="font-weight:700">${t('rs_'+s.id)}</div>${s.note?`<div class="mt" style="overflow-wrap:anywhere">${esc(s.note)}</div>`:''}</div></div>`).join('');
  h+=`</div>`;
  if(r.active&&r.prog.b)h+=`<div class="card"><div class="mt" id="pgt" style="margin-bottom:8px">${t('uploading',{a:r.prog.a,b:r.prog.b})}</div><div class="bar"><i id="pgb" style="width:${Math.round(r.prog.bytes/Math.max(1,r.prog.total)*100)}%"></i></div></div>`;
  if(r.err)h+=r.err.label?infoBox(r.err,true):alertBox('err',esc(String(r.err)));
  (r.warn||[]).forEach(x=>{h+=alertBox('warn',esc(x))});
  if(r.result){
    const u=r.result.url,pub=r.result.state==='published';
    h+=`<div class="alert ${pub?'ok':'info'}">${ic(pub?'check':'alert')}<div><b>${t('res_'+r.result.state)}</b>${u&&pub?`<div class="ltr" style="margin-top:6px;word-break:break-all">${esc(u)}</div>`:''}</div></div>`;
  }
  let f='';
  if(r.active)f=`<div class="foot"><button class="btn redo grow" data-act="wCancel">${t('cancel')}</button></div>`;
  else{
    f=`<div class="foot">`;
    if(r.result&&r.result.url&&r.result.state==='published')f+=`<a class="btn pri grow" href="${esc(r.result.url)}" target="_blank" rel="noopener">${ic('ext')} ${t('openSite')}</a>`;
    if(r.result)f+=`<button class="btn grow" data-act="wDetails">${t('details')}</button>`;
    else f+=`<button class="btn grow" data-act="wPrev">${ic('back','flip')} ${t('back')}</button><button class="btn pri grow" data-act="wDeploy">${t('retry')}</button>`;
    f+=`</div>`;
  }
  return h+f;
}

/* ---------- Deployment wizard: logic ---------- */
function wClearErr(){S.w.err=null}
async function wLoadBranches(){
  const w=S.w;if(w.mode!=='existing'||!w.repo||w.branches)return;
  const full=w.repo.full_name;
  try{
    const l=await gh('/repos/'+full+'/branches?per_page=100');
    const names=l.map(b=>b.name);
    if(S.w===w){w.branches=names.length?names:[w.repo.default_branch];if(!w.branches.includes(w.branch))w.branch=w.branches.includes(w.repo.default_branch)?w.repo.default_branch:w.branches[0]}
  }catch(e){if(S.w===w)w.branches=[w.repo.default_branch]}
  renderSoon();
}
async function wNext1(){
  const w=S.w;if(w.loading)return;w.err=null;
  if(w.mode==='existing'){
    if(!w.repo)return;
    addAct('repo_selected',w.repo.full_name,'');
    w.step=2;render();scrollTo(0,0);return;
  }
  const n=w.newName.trim();
  if(!/^[A-Za-z0-9._-]{1,100}$/.test(n)||n==='.'||n==='..'){w.err=t('nameBad');return render()}
  w.loading=true;render();
  try{
    let exists=true;
    try{await gh('/repos/'+S.user.login+'/'+encodeURIComponent(n))}catch(e){if(e.status===404)exists=false;else throw e}
    if(exists){w.err=t('nameTaken');w.loading=false;return render()}
    w.loading=false;w.step=2;render();scrollTo(0,0);
  }catch(e){w.err=e;w.loading=false;render()}
}
function wNext2(){
  const w=S.w;
  if(wRows().some(r=>r.issues.length))return;
  w.step=3;w.err=null;render();scrollTo(0,0);wLoadBranches();
}
async function wNext3(){
  const w=S.w;if(w.loading)return;
  const sub=normDir(w.sub);
  if(sub&&pathIssue(sub))return;
  w.sub=sub;w.err=null;w.confirm=false;w.showAll=false;w.loading=true;render();
  try{
    if(w.mode==='existing'){
      const full=w.repo.full_name;
      const [tr]=await Promise.all([loadTreeMap(full,w.branch),loadSite(full,{force:true})]);
      w.tree=tr;
      const d=S.sites.get(full);w.pages=d&&d.pages||null;
    }else{w.tree={map:new Map(),trunc:false,empty:true};w.pages=null}
    w.loading=false;w.step=4;render();scrollTo(0,0);
  }catch(e){w.err=e;w.loading=false;render()}
}
function wPrev(){
  const w=S.w;
  if(w.step===5&&w.run&&w.run.active)return;
  if(w.step<=1){back();return}
  w.step=w.step===5?4:w.step-1;w.err=null;render();scrollTo(0,0);
}
function wCancel(){
  const w=S.w;
  confirmBox({danger:true,title:t('cancelDeployT'),body:t('cancelDeployB'),ok:t('cancelDeployOk'),cancel:t('keepGoing'),onOk:()=>{if(w.ctl)w.ctl.abort()}});
}
function wAddFiles(list){
  const w=S.w;if(!w)return;
  const junk=/(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i;
  let skipped=0;
  for(const x of list){
    const rel=x.rel||x.file.webkitRelativePath||x.file.name;
    if(junk.test(rel)||/(^|\/)\.git(\/|$)/.test(rel))continue;
    if(w.sel.length>=5000){skipped++;continue}
    w.sel.push({file:x.file,rel,folder:x.folder!==undefined?x.folder:!!x.file.webkitRelativePath});
  }
  if(skipped)toast(t('tooMany'),'err');
  w.err=null;render();
}
async function readEntry(entry,path,out){
  if(entry.isFile){await new Promise(res=>entry.file(f=>{out.push({file:f,rel:path+entry.name,folder:path!==''});res()},()=>res()))}
  else if(entry.isDirectory){
    const rd=entry.createReader();let all=[];
    for(;;){const b=await new Promise(res=>rd.readEntries(res,()=>res([])));if(!b.length)break;all=all.concat(b)}
    for(const c of all)await readEntry(c,path+entry.name+'/',out);
  }
}
async function wDrop(dt){
  if(dt.files&&dt.files.length===1&&/\.zip$/i.test(dt.files[0].name)){wAddZip(dt.files[0]);return}
  const out=[];
  const items=dt.items?[...dt.items]:[];
  if(items.length&&items[0].w