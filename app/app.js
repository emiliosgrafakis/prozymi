(function(){
"use strict";
function pad(n){ return String(n).length<2 ? "0"+n : String(n); }
function todayISO(){ var d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
function escapeHtml(s){
  return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function formatDateEl(iso){
  if(!iso) return "";
  var p=iso.split("-"); if(p.length!==3) return iso;
  var months=["Ιαν","Φεβ","Μαρ","Απρ","Μαΐ","Ιουν","Ιουλ","Αυγ","Σεπ","Οκτ","Νοε","Δεκ"];
  var mi=parseInt(p[1],10)-1;
  return parseInt(p[2],10)+" "+(months[mi]||p[1])+" "+p[0];
}
function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

function normalizeStarter(raw, fallbackName){
  var s = {
    name: (raw && raw.name) || fallbackName || "Προζύμι",
    startDate: (raw && raw.startDate) || null,
    targetWeight: (raw && raw.targetWeight) || 260,
    ready: !!(raw && raw.ready),
    jar: (raw && (raw.jar===0 || raw.jar)) ? raw.jar : null,
    feedTime: (raw && raw.feedTime) || "",
    fridge: normFridge(raw && raw.fridge),
    log: (raw && raw.log && typeof raw.log==="object") ? raw.log : {},
    days: {},
    journal: (raw && Array.isArray(raw.journal)) ? raw.journal : [],
    feeds: (raw && Array.isArray(raw.feeds)) ? raw.feeds : []
  };
  DAYS.forEach(function(d){
    var pd = raw && raw.days && raw.days[d.day];
    s.days[d.day] = {
      done: !!(pd && pd.done),
      note: (pd && pd.note) || "",
      cm: (pd && (pd.cm===0 || pd.cm)) ? pd.cm : null,
      grams: (pd && (pd.grams===0 || pd.grams)) ? pd.grams : null,
      gross: (pd && (pd.gross===0 || pd.gross)) ? pd.gross : null,
      time: (pd && pd.time) || "", removed: nn(pd && pd.removed), flour: nn(pd && pd.flour), water: nn(pd && pd.water)
    };
  });
  return s;
}
function currentDayNumber(starter){
  if(!starter.startDate) return 0;
  var start = new Date(starter.startDate+"T00:00:00");
  var now = new Date();
  var todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  var diff = Math.round((todayLocal-startLocal)/86400000)+1;
  return clamp(diff,1,14);
}

function computeFeed(target){
  var t = clamp(parseInt(target,10)||260, 60, 450);
  var each = Math.round(t/3);
  return {keep:each, flour:each, water:each, total:each*3};
}

function renderSwitcher(appState){
  var ids = Object.keys(appState.starters);
  var options = ids.map(function(id){
    var name = appState.starters[id].name;
    var sel = id===appState.activeId ? " selected" : "";
    return '<option value="'+id+'"'+sel+'>'+escapeHtml(name)+'</option>';
  }).join("");
  var activeName = appState.starters[appState.activeId].name;
  return ''+
  '<section class="card">'+
    '<h2 style="font-size:1.05rem;">Προζύμι</h2>'+
    '<div class="field-row">'+
      '<div class="field">'+
        '<label for="starterSelect">Ενεργό προζύμι</label>'+
        '<select id="starterSelect" data-role="starter-select">'+options+'</select>'+
      '</div>'+
      '<button type="button" class="btn ghost" data-role="starter-add">+ Νέο προζύμι</button>'+
    '</div>'+
    '<div class="field-row">'+
      '<div class="field">'+
        '<label for="starterRename">Όνομα</label>'+
        '<input type="text" id="starterRename" data-role="starter-rename" value="'+escapeHtml(activeName)+'">'+
      '</div>'+
    '</div>'+
  '</section>';
}

function renderHeader(appState, starter){
  var cur = currentDayNumber(starter);
  var dayPhrase;
  if(starter.ready){
    dayPhrase = "ώριμο και έτοιμο ✓";
  } else if(!starter.startDate){
    dayPhrase = "όρισε ημερομηνία έναρξης για να ξεκινήσεις";
  } else if(cur>=14){
    dayPhrase = "ημέρα 14+ — έλεγξε τα σημάδια ωριμότητας";
  } else {
    dayPhrase = "ημέρα " + cur + " από 14";
  }
  var statusText = escapeHtml(starter.name) + ": " + dayPhrase;
  var pct = starter.ready ? 100 : clamp((cur/14)*100, cur?4:0, 100);
  return ''+
  '<header class="top"><div class="inner">'+
    '<h1>🍞 Prozymi App</h1>'+
    '<div class="status">'+statusText+'</div>'+
    '<div class="progress-rail"><div class="progress-fill" style="width:'+pct+'%"></div></div>'+
  '</div></header>';
}

function renderSetup(starter){
  return ''+
  '<section class="card">'+
    '<h2 style="font-size:1.05rem;">Ρυθμίσεις εκκίνησης</h2>'+
    '<div class="field-row">'+
      '<div class="field">'+
        '<label for="startDate">Ημερομηνία έναρξης</label>'+
        '<input type="date" id="startDate" data-role="start-date" value="'+escapeHtml(starter.startDate||"")+'">'+
      '</div>'+
    '</div>'+
    '<div class="field-row"><div class="field"><label for="jarW">Βάρος άδειου βάζου (γρ.) · προαιρετικό, συμπληρώνεται και αργότερα</label><input type="number" id="jarW" data-role="jar-weight" inputmode="decimal" min="0" step="1" value="'+(starter.jar==null?"":starter.jar)+'"></div><div class="field"><label for="feedT">Ώρα τάισματος (πλάνο)</label><input type="time" id="feedT" data-role="feed-time" value="'+escapeHtml(starter.feedTime||"")+'"></div></div>'+
    '<p class="muted" style="margin-top:10px;">Βάζο 700ml — αναπαύεται άνετα προζύμι έως ~300γρ όταν διπλασιάζεται μέσα του.</p>'+
  '</section>';
}

function renderCalculator(starter){
  var f = computeFeed(starter.targetWeight);
  return ''+
  '<section class="card">'+
    '<h2 style="font-size:1.05rem;">Υπολογιστής τελικής τάισης</h2>'+
    '<p class="muted">Πόσο προζύμι θες να έχεις έτοιμο (για 2 ψωμιά, 240–300γρ);</p>'+
    '<div class="field-row">'+
      '<div class="field">'+
        '<label for="targetWeight">Στόχος (γρ.)</label>'+
        '<input type="number" id="targetWeight" data-role="target-weight" min="60" max="450" step="10" value="'+starter.targetWeight+'">'+
      '</div>'+
    '</div>'+
    '<div class="calc-result">'+
      '<div class="calc-num"><b>'+f.keep+'γρ</b><span>κράτα προζύμι</span></div>'+
      '<div class="calc-num"><b>'+f.flour+'γρ</b><span>αλεύρι</span></div>'+
      '<div class="calc-num"><b>'+f.water+'γρ</b><span>νερό</span></div>'+
    '</div>'+
    '<p class="calc-note">Πέτα ή χρησιμοποίησε το υπόλοιπο προζύμι, κράτα '+f.keep+'γρ, πρόσθεσε αλεύρι και νερό. Τάισέ το 4–6 ώρες πριν το χρησιμοποιήσεις, στην κορύφωσή του.</p>'+
  '</section>';
}

function renderDay(d, starter, cur){
  var ds = starter.days[d.day];
  var classes = "day" + (ds.done?" done":"") + (d.day===cur && !starter.ready ? " today":"");
  var stepsHtml = d.steps.map(function(s){ return "<li>"+escapeHtml(s)+"</li>"; }).join("");
  var measureLabel = d.day===1 ? "Αρχική μέτρηση (προαιρετικό)" : "Μέτρηση αύξησης (προαιρετικό)";
  return ''+
  '<div class="'+classes+'" data-day-card="'+d.day+'">'+
    '<div class="marker">'+(ds.done?"✓":d.day)+'</div>'+
    '<div class="day-head">'+
      '<h3>'+escapeHtml(d.title)+'</h3>'+
      '<span class="phase-tag">'+escapeHtml(d.phase)+'</span>'+
    '</div>'+
    '<label class="day-check">'+
      '<input type="checkbox" data-role="day-done" data-day="'+d.day+'" '+(ds.done?"checked":"")+'>'+
      'Έγινε το τάισμα σήμερα'+
    '</label>'+
    '<ul class="steps">'+stepsHtml+'</ul>'+removeLine(d.day,starter)+
    '<div class="tip">💡 '+escapeHtml(d.tip)+'</div>'+
    '<div class="day-extra">'+grossField(d.day,ds)+
      '<div class="field" style="flex:2;min-width:180px;">'+
        '<label>'+measureLabel+'</label>'+
        '<div class="measure-pair">'+
          '<input type="number" step="0.1" inputmode="decimal" placeholder="cm" aria-label="cm" data-role="day-cm" data-day="'+d.day+'" value="'+(ds.cm==null?"":ds.cm)+'">'+
          '<input type="number" step="1" inputmode="decimal" placeholder="γρ." aria-label="γραμμάρια" data-role="day-grams" data-day="'+d.day+'" value="'+(ds.grams==null?"":ds.grams)+'">'+
        '</div>'+
      '</div>'+
      '<div class="field">'+
        '<label for="note-'+d.day+'">Σημειώσεις</label>'+
        '<textarea id="note-'+d.day+'" data-role="day-note" data-day="'+d.day+'" placeholder="πώς μυρίζει, πόσο φούσκωσε...">'+escapeHtml(ds.note)+'</textarea>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function renderTimeline(starter){
  var cur = currentDayNumber(starter);
  var items = DAYS.map(function(d){ return renderDay(d, starter, cur); }).join("");
  return ''+
  '<section>'+
    '<h2 style="font-size:1.05rem;padding:0 0 4px;">Ημέρα προς ημέρα</h2>'+
    '<div class="timeline">'+items+'</div>'+
  '</section>';
}

function renderMaintenance(starter){
  return ''+
  '<section class="card">'+
    '<h2 style="font-size:1.05rem;">Μετά την ωρίμανση</h2>'+
    '<ul class="signs">'+
      '<li>Διπλασιάζεται σε 4–6 ώρες μετά το τάισμα, 2 μέρες στη σειρά.</li>'+
      '<li>Περνάει το τεστ επίπλευσης.</li>'+
      '<li>Ευχάριστη ξινή μυρωδιά, ομοιόμορφες φυσαλίδες σε όλη τη μάζα.</li>'+
    '</ul>'+
    '<p class="muted" style="margin-top:10px;">Θερμοκρασία δωματίου: τάισμα 1:1:1 μία φορά την ημέρα. Στο ψυγείο: τάισμα μία φορά την εβδομάδα, βγάλτο σε θερμοκρασία δωματίου και τάισέ το 4–6 ώρες πριν το χρησιμοποιήσεις.</p>'+
    '<label class="ready-row">'+
      '<input type="checkbox" data-role="ready-toggle" '+(starter.ready?"checked":"")+'>'+
      '<span>Το προζύμι μου είναι ώριμο και έτοιμο για ψήσιμο</span>'+
    '</label>'+
  '</section>';
}

function miniChartSvg(points, color){
  var w=560, h=140, padL=26, padR=10, padT=10, padB=22;
  var xs = points.map(function(p){return p.x;});
  var ys = points.map(function(p){return p.y;});
  var minX=1, maxX=14;
  var minY=Math.min.apply(null,ys), maxY=Math.max.apply(null,ys);
  if(minY===maxY){ minY -= 1; maxY += 1; }
  function xPix(x){ return padL + (x-minX)/(maxX-minX) * (w-padL-padR); }
  function yPix(y){ return h-padB - (y-minY)/(maxY-minY) * (h-padT-padB); }
  var path = points.map(function(p,i){ return (i===0?"M":"L")+xPix(p.x).toFixed(1)+","+yPix(p.y).toFixed(1); }).join(" ");
  var dots = points.map(function(p){ return '<circle cx="'+xPix(p.x).toFixed(1)+'" cy="'+yPix(p.y).toFixed(1)+'" r="3.2" fill="'+color+'"></circle>'; }).join("");
  return '<svg class="chart" viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg">'+
    '<line x1="'+padL+'" y1="'+(h-padB)+'" x2="'+(w-padR)+'" y2="'+(h-padB)+'" stroke="var(--line)" stroke-width="1"></line>'+
    '<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2"></path>'+
    dots+
  '</svg>';
}

function renderChart(starter){
  var cmPts=[], gramPts=[];
  DAYS.forEach(function(d){
    var ds = starter.days[d.day];
    if(ds.cm!==null && ds.cm!==undefined) cmPts.push({x:d.day, y:parseFloat(ds.cm)});
    if(ds.grams!==null && ds.grams!==undefined) gramPts.push({x:d.day, y:parseFloat(ds.grams)});
  });
  var blocks = "";
  if(cmPts.length>=2){
    blocks += '<div class="chart-block">'+miniChartSvg(cmPts,"var(--accent)")+
      '<div class="legend"><span><i style="background:var(--accent)"></i>ύψος (cm)</span></div></div>';
  }
  if(gramPts.length>=2){
    blocks += '<div class="chart-block">'+miniChartSvg(gramPts,"var(--done)")+
      '<div class="legend"><span><i style="background:var(--done)"></i>βάρος (γρ.)</span></div></div>';
  }
  if(!blocks){
    blocks = '<p class="chart-empty">Πρόσθεσε μετρήσεις σε τουλάχιστον 2 ημέρες (cm ή γρ.) για να δεις το γράφημα.</p>';
  }
  return ''+
  '<section class="card">'+
    '<h2 style="font-size:1.05rem;">Τάση αύξησης</h2>'+
    blocks+
    '<p class="muted" style="margin-top:10px;">Ημέρες 1–14 στον οριζόντιο άξονα.</p>'+
  '</section>';
}

function renderJournal(starter){
  var items;
  if(!starter.journal.length){
    items = '<p class="journal-empty">Δεν έχεις προσθέσει σημειώσεις ακόμα.</p>';
  } else {
    var lis = starter.journal.slice().reverse().map(function(j){
      return '<li class="journal-item"><div><div class="meta">'+escapeHtml(j.ts)+'</div>'+escapeHtml(j.text)+'</div>'+
        '<button type="button" data-role="journal-delete" data-id="'+j.id+'">Διαγραφή</button></li>';
    }).join("");
    items = '<ul class="journal-list">'+lis+'</ul>';
  }
  return ''+
  '<section class="card">'+
    '<h2 style="font-size:1.05rem;">Ημερολόγιο σημειώσεων</h2>'+
    '<p class="muted">Ελεύθερες σημειώσεις που θες να θυμάσαι.</p>'+
    '<div class="journal-add">'+
      '<input type="text" data-role="journal-input" placeholder="π.χ. μυρίζει σαν ξινόμηλο σήμερα...">'+
      '<button type="button" class="btn" data-role="journal-add">Πρόσθεσε</button>'+
    '</div>'+
    items+
  '</section>';
}

function renderFooter(starter){
  return ''+
  '<footer class="bottom">'+
    '<button type="button" class="btn ghost" data-role="reset-step1">Διαγραφή αυτού του προζυμιού</button>'+
    '<div class="reset-confirm" data-role="reset-confirm-row" hidden>'+
      '<span class="muted">Θα σβηστούν όλα τα δεδομένα του «'+escapeHtml(starter.name)+'». Σίγουρα;</span>'+
      '<button type="button" class="btn warn" data-role="reset-confirm">Ναι, διαγραφή</button>'+
      '<button type="button" class="btn ghost" data-role="reset-cancel">Άκυρο</button>'+
    '</div>'+
  '</footer>'+
  '';
}
var APP_VERSION="3.1",CACHE="sourdough-portable:cache",CFG_KEY="prozymi:sync-cfg",META_KEY="prozymi:sync-meta",T0=document.title,BATCH=4;
var tab="starter",selRid=null,ac=null,rk="",rc=0,rl=0,persisted=null,showTok=false,needDraw=false,form={owner:"",repo:"prozymi-data",token:""};
var root=document.getElementById("app"),instEv=null;
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();instEv=e;if(tab==="data")draw();});
function loc(ms){return new Date(ms-new Date(ms).getTimezoneOffset()*60000).toISOString().slice(0,16);}
function hm(ms){var d=new Date(ms);return pad(d.getHours())+":"+pad(d.getMinutes());}
function dur(m){m=Math.max(0,Math.round(m));var h=Math.floor(m/60);return ((h?h+"ω ":"")+(m%60||!h?(m%60)+"λ":"")).trim();}
function fmtLeft(ms){var s=Math.abs(Math.round(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (ms<0?"+":"")+(h?h+":"+pad(m):m)+":"+pad(s%60);}
function defaultRecipes(){return [{id:"r1",name:"Βασικό ψωμί προζυμιού",steps:[
 {n:"Ανάμειξη & πλάσιμο",m:30,t:"Αλεύρι, νερό, προζύμι· ανάμειξε και ζύμωσε ελαφρά."},
 {n:"Δίπλωμα 1",m:30,t:"Τέντωσε και δίπλωσε τη ζύμη μέσα στο μπολ."},
 {n:"Δίπλωμα 2",m:30,t:""},{n:"Δίπλωμα 3",m:30,t:""},
 {n:"Φούσκωμα",m:120,t:"Μέχρι να φουσκώσει αισθητά."},
 {n:"Ψήσιμο σκεπασμένο",m:30,t:"Με καπάκι / σκεπασμένο σκεύος."},
 {n:"Ψήσιμο ξεσκέπαστο",m:15,t:""},
 {n:"Κρύωμα",m:60,t:"Μην το κόψεις ζεστό."}]}];}
function normalizeAll(p){p=p||{};var st={},ids=Object.keys(p.starters||{});
 if(!ids.length){st.s1=normalizeStarter(null,"Προζύμι 1");ids=["s1"];}else ids.forEach(function(i){st[i]=normalizeStarter(p.starters[i],"Προζύμι");});
 return {v:2,updatedAt:p.updatedAt||0,activeId:st[p.activeId]?p.activeId:ids[0],starters:st,
  recipes:(Array.isArray(p.recipes)&&p.recipes.length)?p.recipes:defaultRecipes(),bake:migBake(p.bake),history:Array.isArray(p.history)?p.history.map(function(x){if(x&&x.id==null)x.id="h"+x.s;return x;}):[],backedUp:p.backedUp||null};}
function initialState(){var c=null;try{c=JSON.parse(localStorage.getItem(CACHE));}catch(e){}return normalizeAll(c);}
var appState=initialState();
function parseData(t){return JSON.parse(String(t).replace(/^[\s\S]*?window\.SOURDOUGH_DATA\s*=\s*/,"").replace(/;\s*$/,""));}
function storeLocal(){try{localStorage.setItem(CACHE,JSON.stringify(appState));}catch(e){}}
function save(redraw){appState.updatedAt=Date.now();storeLocal();if(redraw!==false)draw();markDirty();}
function persist(){save();}
function draw(){needDraw=false;root.innerHTML=renderApp();}
function typing(){var a=document.activeElement;return !!(a&&root.contains(a)&&(a.tagName==="TEXTAREA"||a.tagName==="SELECT"||(a.tagName==="INPUT"&&!/^(checkbox|radio|button|file)$/.test(a.type))));}
function softDraw(){if(typing()){needDraw=true;paintStatus();return;}draw();}
document.addEventListener("focusout",function(){setTimeout(function(){if(needDraw&&!typing())draw();},0);});
document.addEventListener("input",function(ev){var r=ev.target.getAttribute&&ev.target.getAttribute("data-role"),k={"gh-owner":"owner","gh-repo":"repo","gh-token":"token"}[r];if(k)form[k]=ev.target.value;});
function toast(m){var h=root.querySelector('[data-role="save-hint"]');if(!h)return;h.textContent=m;h.classList.add("show");setTimeout(function(){h.classList.remove("show");},1400);}

/* ---------- Συγχρονισμός μέσω GitHub (private repo, ένα αρχείο JSON) ---------- */
function lsGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}
function lsSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
var cfg=lsGet(CFG_KEY),meta=lsGet(META_KEY)||{},sync=cfg?"pending":"off",syncMsg="",syncBusy=false,syncAgain=false,pushT=null,seq=0,choice=null,lastPull=0;
function saveMeta(){lsSet(META_KEY,meta);}
function setSync(s,m){sync=s;syncMsg=m||"";if(tab==="data")softDraw();else paintStatus();}
function markDirty(){if(!cfg)return;meta.dirty=true;saveMeta();seq++;if(sync==="ok")setSync("pending");clearTimeout(pushT);pushT=setTimeout(function(){runSync(false);},2500);}
function b64e(s){var b=new TextEncoder().encode(s),o="";for(var i=0;i<b.length;i+=32768)o+=String.fromCharCode.apply(null,b.subarray(i,i+32768));return btoa(o);}
function b64d(s){var t=atob(String(s).replace(/\s/g,"")),b=new Uint8Array(t.length);for(var i=0;i<t.length;i++)b[i]=t.charCodeAt(i);return new TextDecoder().decode(b);}
function repoPath(c){c=c||cfg;return "/repos/"+encodeURIComponent(c.owner)+"/"+encodeURIComponent(c.repo);}
function filePath(){return repoPath()+"/contents/"+encodeURIComponent(cfg.path);}
function gh(method,path,body,c){c=c||cfg;var h={Authorization:"Bearer "+c.token,Accept:"application/vnd.github+json"};if(body)h["Content-Type"]="application/json";
 return fetch("https://api.github.com"+path,{method:method,headers:h,cache:"no-store",body:body?JSON.stringify(body):undefined});}
function SyncStop(state,msg){this.state=state;this.msg=msg;}
function httpFail(r){
 if(r.status===401)return new SyncStop("auth","Το token δεν ισχύει ή έληξε. Φτιάξε νέο token και πέρασέ το εδώ.");
 if(r.status===403&&r.headers.get("x-ratelimit-remaining")==="0")return new SyncStop("err","Πολλά αιτήματα προς το GitHub. Θα ξαναδοκιμάσει σε λίγο.");
 if(r.status===403)return new SyncStop("auth","Το token δεν έχει δικαίωμα εγγραφής στο repo (χρειάζεται Contents: Read and write).");
 if(r.status===404)return new SyncStop("notfound","Δεν βρέθηκε το repo «"+cfg.owner+"/"+cfg.repo+"» ή το token δεν έχει πρόσβαση σε αυτό.");
 return new SyncStop("err","Σφάλμα GitHub ("+r.status+"). Θα ξαναδοκιμάσει.");}
function devName(){var u=navigator.userAgent;return /iPhone|iPad|iPod/.test(u)?"iPhone":/Android/.test(u)?"Android":/Windows/.test(u)?"Windows":/Macintosh/.test(u)?"Mac":"συσκευή";}

/* Συγχώνευση τριών εκδοχών: base = τελευταία κοινή, l = αυτή η συσκευή, r = GitHub.
   Ό,τι άλλαξε μόνο από τη μία πλευρά περνάει· λίστες με id συγχωνεύονται ανά στοιχείο·
   αν το ίδιο πεδίο άλλαξε και στις δύο, κερδίζει αυτή η συσκευή. */
function stable(x){if(x===undefined)return "~";if(Array.isArray(x))return "["+x.map(stable).join(",")+"]";
 if(x&&typeof x==="object")return "{"+Object.keys(x).sort().map(function(k){return JSON.stringify(k)+":"+stable(x[k]);}).join(",")+"}";return JSON.stringify(x);}
function same(a,b){return stable(a)===stable(b);}
function isObj(x){return !!x&&typeof x==="object"&&!Array.isArray(x);}
function idList(a){return Array.isArray(a)&&a.every(function(e){return isObj(e)&&e.id!=null;});}
function merge3(b,l,r){
 if(same(l,r))return l;if(same(b,l))return r;if(same(b,r))return l;
 if(isObj(l)&&isObj(r)){var o={},bb=isObj(b)?b:{};
  Object.keys(l).concat(Object.keys(r).filter(function(k){return !Object.prototype.hasOwnProperty.call(l,k);})).forEach(function(k){var v=merge3(bb[k],l[k],r[k]);if(v!==undefined)o[k]=v;});return o;}
 if(idList(l)&&idList(r)){var bm=Object.create(null),lm=Object.create(null),rm=Object.create(null),ids=[],out=[];
  if(idList(b))b.forEach(function(e){bm[e.id]=e;});
  l.forEach(function(e){lm[e.id]=e;ids.push(e.id);});
  r.forEach(function(e){rm[e.id]=e;if(!(e.id in lm))ids.push(e.id);});
  ids.forEach(function(id){var v=merge3(bm[id],lm[id],rm[id]);if(v!==undefined)out.push(v);});return out;}
 return l;}
/* Κρατάμε τις παλιές εκδοχές που έχουμε ήδη ξεπεράσει, ώστε μια καθυστερημένη (stale) απάντηση του GitHub να αγνοείται. */
function setSha(n){if(meta.sha&&meta.sha!==n)meta.old=(meta.old||[]).concat(meta.sha).slice(-20);meta.sha=n;}
function adopt(remote,sha,text){appState=remote;setSha(sha);meta.base=text;meta.dirty=false;storeLocal();saveMeta();softDraw();}
async function pull(){
 var r=await gh("GET",filePath());
 if(r.status===404){var rr=await gh("GET",repoPath());if(!rr.ok)throw httpFail(rr);lastPull=Date.now();meta.sha=null;meta.dirty=true;saveMeta();return;}
 if(!r.ok)throw httpFail(r);
 var j=await r.json();lastPull=Date.now();
 if(j.sha===meta.sha||(meta.old&&meta.old.indexOf(j.sha)>=0))return;
 var text=b64d(j.content),remote=normalizeAll(JSON.parse(text));
 if(!meta.sha&&!meta.base){
  if(!appState.updatedAt||same(appState.starters,remote.starters)){adopt(remote,j.sha,text);return;}
  choice={remote:remote,sha:j.sha,text:text};throw new SyncStop("choice","Υπάρχουν δεδομένα και στο GitHub και σε αυτή τη συσκευή. Διάλεξε τι κρατάμε.");}
 if(meta.dirty){var base=meta.base?normalizeAll(JSON.parse(meta.base)):undefined;
  appState=normalizeAll(merge3(base,appState,remote));setSha(j.sha);meta.base=text;storeLocal();saveMeta();softDraw();return;}
 adopt(remote,j.sha,text);}
async function push(){
 var s0=seq,text=JSON.stringify(appState,null,1),body={message:"Ενημέρωση από "+devName(),content:b64e(text)};if(meta.sha)body.sha=meta.sha;
 var r=await gh("PUT",filePath(),body);
 if(r.status===409||r.status===422)return false;
 if(!r.ok)throw httpFail(r);
 var j=await r.json();setSha(j.content&&j.content.sha);meta.base=text;if(seq===s0)meta.dirty=false;saveMeta();return true;}
async function runSync(withPull){
 if(!cfg)return;if(syncBusy){syncAgain=true;return;}
 syncBusy=true;clearTimeout(pushT);setSync("busy");
 try{
  if(withPull||(!meta.sha&&!meta.base))await pull();
  for(var k=0;meta.dirty&&k<4;k++){if(await push())break;await pull();}
  if(meta.dirty&&k>=4)throw new SyncStop("err","Ο συγχρονισμός δεν ολοκληρώθηκε. Θα ξαναδοκιμάσει.");
  meta.last=Date.now();saveMeta();setSync(meta.dirty?"pending":"ok");
 }catch(e){
  if(e instanceof SyncStop)setSync(e.state,e.msg);
  else if(e instanceof TypeError)setSync("offline","Χωρίς σύνδεση. Οι αλλαγές μένουν στη συσκευή και θα σταλούν όταν βρεθεί internet.");
  else setSync("err","Σφάλμα συγχρονισμού: "+(e&&e.message||e));
 }
 syncBusy=false;
 if(syncAgain){syncAgain=false;runSync(false);}}
async function connectSync(){
 var v=function(k){var e=root.querySelector('[data-role="'+k+'"]');return e?e.value.trim():"";};
 var owner=v("gh-owner").replace(/^@/,""),repo=v("gh-repo")||"prozymi-data",token=v("gh-token");
 var m=/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/.exec(repo);if(m){owner=owner||m[1];repo=m[2];}
 repo=repo.replace(/\.git$/,"");
 form={owner:owner,repo:repo,token:token};
 var c={owner:owner,repo:repo,path:"prozymi.json",token:token};
 var fail=function(msg){sync="off";syncMsg=msg;draw();};
 if(!owner||!repo||!token)return fail("Συμπλήρωσε όνομα χρήστη, repo και token.");
 sync="busy";syncMsg="";draw();
 try{
  var r=await gh("GET",repoPath(c),null,c);
  if(r.status===401)return fail("Το token δεν είναι σωστό (ή έχει λήξει).");
  if(r.status===404)return fail("Δεν βρέθηκε το repo «"+owner+"/"+repo+"», ή το token δεν έχει πρόσβαση σε αυτό. Έλεγξε το όνομα χρήστη και ότι στο token επέλεξες αυτό το repo.");
  if(!r.ok)return fail("Σφάλμα GitHub ("+r.status+").");
  var j=await r.json();
  if(!j.private)return fail("Το repo «"+repo+"» είναι δημόσιο, άρα τα δεδομένα σου θα φαίνονταν σε όλους. Κάν' το private (Settings → Danger Zone → Change visibility) και ξαναπάτα Σύνδεση.");
 }catch(e){return fail("Δεν υπάρχει σύνδεση στο internet.");}
 cfg=c;lsSet(CFG_KEY,cfg);meta={};saveMeta();choice=null;form.token="";runSync(true);}
function disconnectSync(){form={owner:cfg.owner,repo:cfg.repo,token:""};cfg=null;lsSet(CFG_KEY,null);meta={};lsSet(META_KEY,null);choice=null;showTok=false;sync="off";syncMsg="";draw();}
function saveToken(){var e=root.querySelector('[data-role="gh-newtoken"]'),t=e&&e.value.trim();if(!t||!cfg)return;cfg.token=t;lsSet(CFG_KEY,cfg);showTok=false;draw();runSync(true);}
function resolveChoice(how){if(!choice)return;var c=choice;choice=null;
 if(how==="remote"){adopt(c.remote,c.sha,c.text);setSync("ok");return;}
 if(how==="merge"){appState=normalizeAll(merge3(undefined,appState,c.remote));appState.updatedAt=Date.now();storeLocal();}
 meta.sha=c.sha;meta.base=c.text;meta.dirty=true;saveMeta();draw();runSync(false);}
function warnState(){return /^(auth|notfound|choice|err)$/.test(sync);}
function chip(){if(!cfg)return "Μόνο σε αυτή τη συσκευή";
 return ({ok:"✓ Συγχρονισμένο",busy:"↻ Συγχρονισμός…",pending:"↻ Αναμονή συγχρονισμού",offline:"Εκτός σύνδεσης · κρατήθηκε στη συσκευή",auth:"⚠ Πρόβλημα με το token",notfound:"⚠ Δεν βρέθηκε το repo",choice:"⚠ Χρειάζεται επιλογή",err:"⚠ Σφάλμα συγχρονισμού"})[sync]||"";}
function paintStatus(){Array.prototype.forEach.call(root.querySelectorAll("[data-chip]"),function(c){c.textContent=chip();c.classList.toggle("warn",warnState());});}
async function askPersist(){try{if(navigator.storage&&navigator.storage.persist){persisted=await navigator.storage.persisted();if(!persisted)persisted=await navigator.storage.persist();}}catch(e){}}
function when(ms){return ms?formatDateEl(loc(ms).slice(0,10))+" "+hm(ms):"—";}
function download(name,txt,type){var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:type+";charset=utf-8"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
function unlock(){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume();}catch(e){}}
function beep(){try{unlock();[0,.35,.7].forEach(function(d){var o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+d;o.frequency.value=880;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.25,t);o.start(t);o.stop(t+.2);});}catch(e){}}
function ring(s){beep();if(navigator.vibrate)navigator.vibrate([300,150,300,150,300]);try{if(window.Notification&&Notification.permission==="granted")new Notification("🍞 Τέλος: "+s.n);}catch(e){}}
async function keepAwake(){try{if(navigator.wakeLock&&appState.bake)await navigator.wakeLock.request("screen");}catch(e){}}
function ics(){var b=appState.bake,t=b.stepStart,z=function(ms){return new Date(ms).toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");},
 q=function(s){return String(s).replace(/[,;]/g,"\\$&");},o=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//sourdough//EL"];
 b.steps.forEach(function(s,i){if(i<b.i)return;t+=s.m*60000;var nx=b.steps[i+1],sm="🍞 Τέλος: "+q(s.n)+(nx?" → "+q(nx.n):"");
  o.push("BEGIN:VEVENT","UID:"+b.started+"-"+i+"@sourdough","DTSTAMP:"+z(Date.now()),"DTSTART:"+z(t),"DTEND:"+z(t+60000),"SUMMARY:"+sm,"BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+sm,"TRIGGER:PT0S","END:VALARM","END:VEVENT");});
 o.push("END:VCALENDAR");download("psisimo.ics",o.join("\r\n"),"text/calendar");}
function curRec(){var a=appState.recipes;for(var k=0;k<a.length;k++)if(a[k].id===selRid)return a[k];selRid=a[0].id;return a[0];}
function renderLog(s){var all=s.feeds.slice().sort(function(a,b){return a.t<b.t?1:-1;}),last=all.filter(function(x){return x.k==="feed";})[0];
 var items=all.slice(0,30).map(function(x){return '<li class="journal-item"><div><div class="meta">'+formatDateEl(x.t.slice(0,10))+" "+x.t.slice(11)+" · "+(x.k==="feed"?"Τάισμα":"Μέτρηση")+'</div>'+
  [x.cm!=null?x.cm+" cm":"",x.g!=null?x.g+" γρ.":"",escapeHtml(x.n||"")].filter(Boolean).join(" · ")+'</div><button type="button" data-role="feed-del" data-id="'+x.id+'">Διαγραφή</button></li>';}).join("");
 return '<section class="card"><h2 style="font-size:1.05rem;">Καταγραφή ωρών</h2><p class="muted">'+(last?'Τελευταίο τάισμα: πριν '+dur((Date.now()-new Date(last.t).getTime())/60000)+'.':'Σημείωσε πότε τάισες ή μέτρησες.')+'</p>'+
 '<div class="field-row"><div class="field"><label>Ώρα</label><input type="datetime-local" data-role="feed-t" value="'+loc(Date.now())+'"></div><div class="field"><label>Είδος</label><select data-role="feed-k"><option value="feed">Τάισμα</option><option value="measure">Μέτρηση</option></select></div></div>'+
 '<div class="field-row"><div class="field"><input type="number" step="0.1" inputmode="decimal" placeholder="cm" data-role="feed-cm"></div><div class="field"><input type="number" inputmode="decimal" placeholder="γρ." data-role="feed-g"></div><div class="field" style="flex:2"><input type="text" placeholder="σημείωση" data-role="feed-n"></div></div>'+
 '<div class="btns"><button type="button" class="btn" data-role="feed-add">Πρόσθεσε</button></div>'+(items?'<ul class="journal-list">'+items+'</ul>':'')+'</section>';}
function renderBake(){var b=appState.bake,rec=curRec();
 if(b){var s=b.steps[b.i],end=b.stepStart+s.m*60000,t=end,nx=b.steps[b.i+1];
  var rows=b.steps.map(function(x,k){return '<li class="'+(x.d?"done":k===b.i?"cur":"")+'"><label><input type="checkbox" data-role="bake-tick" data-i="'+k+'"'+(x.d?" checked":"")+'> '+escapeHtml(x.n)+' · '+dur(x.m)+'</label><span>'+(x.d?"✓":k===b.i?hm(end):hm(t+=x.m*60000))+'</span></li>';}).join("");
  return '<section class="card"><div class="muted">Στάδιο '+(b.i+1)+' από '+b.steps.length+' · '+escapeHtml(b.name)+'</div><h2>'+escapeHtml(s.n)+'</h2><div class="big" data-countdown>'+fmtLeft(end-Date.now())+'</div>'+
  '<p class="muted" style="text-align:center">'+(s.t?escapeHtml(s.t)+' · ':'')+(nx?'Μετά: '+escapeHtml(nx.n):'Τελευταίο στάδιο')+'</p>'+
  '<div class="btns"><button type="button" class="btn" data-role="bake-next">'+(nx?'Έγινε → επόμενο':'Τέλος ψησίματος')+'</button><button type="button" class="btn ghost" data-role="bake-snooze">+5 λεπτά</button></div><ul class="plan">'+rows+'</ul>'+
  '<div class="btns"><button type="button" class="btn ghost" data-role="notif">Ειδοποιήσεις'+(window.Notification&&Notification.permission==="granted"?" ✓":"")+'</button><button type="button" class="btn ghost" data-role="ics">Αλάρμ στο ημερολόγιο (.ics)</button><button type="button" class="btn ghost" data-role="bake-cancel">Ακύρωση</button></div>'+
  '<p class="muted">Ήχος/ειδοποιήσεις δουλεύουν όσο η σελίδα είναι ανοιχτή. Το .ics χτυπάει και με κλειστό browser.</p></section>';}
 var opts=appState.recipes.map(function(r){return '<option value="'+r.id+'"'+(r===rec?" selected":"")+'>'+escapeHtml(r.name)+'</option>';}).join("");
 var total=rec.steps.reduce(function(a,x){return a+x.m;},0);
 var steps=rec.steps.map(function(x,k){var d=' data-role="step-f" data-i="'+k+'"';return '<div class="srow"><input type="text" value="'+escapeHtml(x.n)+'"'+d+' data-f="n" aria-label="Στάδιο"><input type="number" min="1" value="'+x.m+'"'+d+' data-f="m" aria-label="λεπτά">'+
  '<input class="full" type="text" placeholder="σημείωση" value="'+escapeHtml(x.t||"")+'"'+d+' data-f="t"><div class="acts full"><button type="button" class="btn ghost" data-role="step-up" data-i="'+k+'">↑</button><button type="button" class="btn ghost" data-role="step-down" data-i="'+k+'">↓</button><button type="button" class="btn ghost" data-role="step-del" data-i="'+k+'">✕</button></div></div>';}).join("");
 var hist=appState.history.slice(0,5).map(function(x){return '<li class="journal-item"><div><div class="meta">'+formatDateEl(loc(x.s).slice(0,10))+" "+hm(x.s)+'</div>'+escapeHtml(x.n)+' · '+dur((x.e-x.s)/60000)+'</div></li>';}).join("");
 return '<section class="card"><h2 style="font-size:1.05rem;">Νέο ψήσιμο</h2><div class="field-row"><div class="field"><label>Συνταγή</label><select data-role="rec-select">'+opts+'</select></div><button type="button" class="btn" data-role="bake-start">▶ Έναρξη</button></div>'+
 '<p class="muted">'+rec.steps.length+' στάδια · σύνολο '+dur(total)+'. Κάθε στάδιο = τι κάνεις τώρα και πόση ώρα διαρκεί μέχρι το επόμενο.</p></section>'+
 '<section class="card"><h2 style="font-size:1.05rem;">Επεξεργασία συνταγής</h2><div class="field"><label>Όνομα</label><input type="text" data-role="rec-name" value="'+escapeHtml(rec.name)+'"></div>'+steps+
 '<div class="btns"><button type="button" class="btn ghost" data-role="step-add">+ Στάδιο</button><button type="button" class="btn ghost" data-role="rec-add">+ Νέα συνταγή</button><button type="button" class="btn ghost" data-role="rec-del">Διαγραφή συνταγής</button></div></section>'+
 (hist?'<section class="card"><h2 style="font-size:1.05rem;">Τελευταία ψησίματα</h2><ul class="journal-list">'+hist+'</ul></section>':'');}
function renderData(){
 var ios=/iPhone|iPad|iPod/.test(navigator.userAgent),standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
 var cnt=function(st){return Object.keys(st.starters).length;};
 var h='<section class="card"><h2 style="font-size:1.05rem;">☁️ Συγχρονισμός μέσω GitHub</h2>';
 if(!cfg){
  h+='<p class="muted">Σύνδεσε τη συσκευή με το private repo δεδομένων για να έχεις τα ίδια δεδομένα σε κινητό και υπολογιστή. Οδηγίες: εγχειρίδιο, Μέρος 5.</p>'+
  '<div class="field"><label for="ghOwner">Όνομα χρήστη GitHub</label><input type="text" id="ghOwner" data-role="gh-owner" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="το username σου" value="'+escapeHtml(form.owner)+'"></div>'+
  '<div class="field" style="margin-top:10px"><label for="ghRepo">Repo δεδομένων</label><input type="text" id="ghRepo" data-role="gh-repo" autocapitalize="off" autocorrect="off" spellcheck="false" value="'+escapeHtml(form.repo)+'"></div>'+
  '<div class="field" style="margin-top:10px"><label for="ghToken">Token</label><input type="password" id="ghToken" data-role="gh-token" autocomplete="off" placeholder="github_pat_…" value="'+escapeHtml(form.token)+'"></div>'+
  (syncMsg?'<p class="sync-msg">'+escapeHtml(syncMsg)+'</p>':'')+
  '<div class="btns"><button type="button" class="btn" data-role="sync-connect"'+(sync==="busy"?" disabled":"")+'>'+(sync==="busy"?"Έλεγχος…":"Σύνδεση")+'</button></div>';
 }else{
  h+='<p class="muted">Κατάσταση: <b data-chip class="'+(warnState()?"warn":"")+'">'+chip()+'</b></p>'+
  (syncMsg&&sync!=="ok"&&sync!=="busy"?'<p class="sync-msg">'+escapeHtml(syncMsg)+'</p>':'')+
  '<p class="muted">Repo: '+escapeHtml(cfg.owner+"/"+cfg.repo)+' · αρχείο '+escapeHtml(cfg.path)+(meta.last?' · τελευταίος συγχρονισμός '+when(meta.last):'')+'</p>';
  if(sync==="choice"&&choice)h+='<div class="remove" style="margin-top:12px"><b>Υπάρχουν δεδομένα και στις δύο πλευρές</b>'+
   '<div class="muted">GitHub: '+cnt(choice.remote)+' προζύμι(α), τελευταία αλλαγή '+when(choice.remote.updatedAt)+'. Αυτή η συσκευή: '+cnt(appState)+' προζύμι(α), τελευταία αλλαγή '+when(appState.updatedAt)+'.</div>'+
   '<div class="btns"><button type="button" class="btn" data-role="sync-take-remote">Κράτα του GitHub</button><button type="button" class="btn ghost" data-role="sync-merge">Συγχώνευση</button><button type="button" class="btn ghost" data-role="sync-take-local">Κράτα αυτής της συσκευής</button></div>'+
   '<p class="muted">Στη νέα συσκευή διάλεξε «Κράτα του GitHub». Η «Συγχώνευση» κρατά και τα δύο· όπου διαφέρει το ίδιο πεδίο, κερδίζει αυτή η συσκευή. Ό,τι αντικατασταθεί στο GitHub μένει στο ιστορικό του repo.</p></div>';
  h+='<div class="btns"><button type="button" class="btn" data-role="sync-now">Συγχρονισμός τώρα</button><button type="button" class="btn ghost" data-role="sync-tok-show">Νέο token</button><button type="button" class="btn ghost" data-role="sync-off">Αποσύνδεση συσκευής</button></div>';
  if(showTok||sync==="auth")h+='<div class="field-row"><div class="field"><label for="ghNew">Νέο token</label><input type="password" id="ghNew" data-role="gh-newtoken" autocomplete="off" placeholder="github_pat_…"></div><button type="button" class="btn" data-role="sync-tok-save">Αποθήκευση</button></div>';
  h+='<p class="muted">Η αποσύνδεση σβήνει μόνο το token από αυτή τη συσκευή· τα δεδομένα μένουν και εδώ και στο GitHub.</p>';
 }
 h+='</section>';
 if(!standalone)h+='<section class="card"><h2 style="font-size:1.05rem;">📲 Στην αρχική οθόνη</h2>'+(instEv?'<div class="btns"><button type="button" class="btn" data-role="pwa-install">Εγκατάσταση ως εφαρμογή</button></div>':'')+
  '<p class="muted">'+(ios?'iPhone: Safari → κουμπί Κοινοποίηση (τετράγωνο με βέλος) → «Προσθήκη στην οθόνη Αφετηρίας». Μετά άνοιγε την εφαρμογή μόνο από το εικονίδιο: το Safari και το εικονίδιο κρατούν ξεχωριστά δεδομένα.':'Android: μενού ⋮ του Chrome → «Προσθήκη στην αρχική οθόνη» ή «Εγκατάσταση εφαρμογής». Μετά άνοιγε την εφαρμογή από το εικονίδιο.')+'</p></section>';
 h+='<section class="card"><h2 style="font-size:1.05rem;">💾 Αντίγραφα ασφαλείας</h2><p class="muted">'+(cfg?'Κάθε αλλαγή κρατιέται αυτόματα και στο ιστορικό του repo στο GitHub. ':'Χωρίς συγχρονισμό, τα δεδομένα ζουν μόνο σε αυτή τη συσκευή· αν σβηστούν τα δεδομένα του browser, χάνονται. ')+
  'Τελευταίο backup σε αρχείο: '+(appState.backedUp?formatDateEl(loc(appState.backedUp).slice(0,10)):"κανένα")+'.</p><div class="btns">'+
  '<button type="button" class="btn ghost" data-role="file-download">Backup σε αρχείο</button><label class="btn ghost">Επαναφορά από αρχείο<input type="file" accept=".js,.json,application/json" data-role="file-import" hidden></label></div>'+
  '<p class="muted">Μόνιμη αποθήκευση στη συσκευή: '+(persisted===true?"ναι":persisted===false?"όχι ακόμα (άνοιγε την εφαρμογή από το εικονίδιο)":"—")+' · Έκδοση '+APP_VERSION+'</p></section>';
 return h;}
function removeLine(day,s){if(day<3)return "";
 var keep=day===14?computeFeed(s.targetWeight).keep:50,exp=day===3?100:150,g=s.days[day].gross,real=(g!=null&&s.jar!=null),cont=real?g-s.jar:exp,rem=Math.max(0,Math.round(cont-keep));
 return '<div class="remove"><b>➖ Αφαίρεσε ≈ '+rem+'γρ</b> · άφησε '+keep+'γρ στο βάζο<div class="muted">'+(real?'Με βάση τη ζύγιση: '+cont+'γρ μέσα στο βάζο.':'Εκτίμηση: το βάζο έχει ~'+exp+'γρ. Βάλε βάρος βάζου και ζύγιση για ακριβή τιμή.')+
 ' Μηδένισε τη ζυγαριά με το βάζο πάνω και αφαίρεσε μέχρι να δεις −'+rem+'γρ.</div></div>';}
function grossField(day,ds){var s=curS();return '<div class="field"><label>Ώρα τάισματος'+(s.feedTime?' (πλάνο '+s.feedTime+')':'')+'</label><input type="time" data-role="day-time" data-day="'+day+'" value="'+escapeHtml(ds.time||"")+'"></div>'+(day<3?"":'<div class="field"><label>Ζύγιση βάζου+προζυμιού πριν το τάισμα</label><input type="number" inputmode="decimal" placeholder="γρ." data-role="day-gross" data-day="'+day+'" value="'+(ds.gross==null?"":ds.gross)+'"></div>');}
var modalIso=null,calM=null,MN=["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"];
function nn(v){return (v===0||v)?v:null;}
function curS(){return appState.starters[appState.activeId];}
function migBake(b){if(b&&b.steps)b.steps.forEach(function(x,k){if(k<b.i&&x.d===undefined)x.d=true;});return b||null;}
function addDays(iso,n){var d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function dayNo(s,iso){return Math.round((new Date(iso+"T00:00:00")-new Date(s.startDate+"T00:00:00"))/86400000)+1;}
function entry(s,iso,mk){var n=dayNo(s,iso);if(!s.startDate||n<1)return null;if(n<=14)return s.days[n];var e=s.log[iso];if(!e&&mk)e=s.log[iso]={done:false,time:"",removed:null,flour:null,water:null,gross:null,cm:null,note:""};return e||null;}
function fedDates(s){var o=[];for(var n=1;n<=14;n++)if(s.days[n].done&&s.startDate)o.push(addDays(s.startDate,n-1));Object.keys(s.log).forEach(function(k){if(s.log[k].done)o.push(k);});return o.sort();}
function nextFeed(s){var f=s.fridge,fd=fedDates(s).filter(function(x){return x>=f.since;});return addDays(fd.length?fd[fd.length-1]:f.since,f.every);}
function tickStep(k,force){var b=appState.bake,was=b.i;b.steps[k].d=force||!b.steps[k].d;var ni=b.steps.findIndex(function(x){return !x.d;});
 if(ni<0){appState.history.unshift({id:"h"+b.started,n:b.name,s:b.started,e:Date.now()});appState.history=appState.history.slice(0,30);appState.bake=null;}else{b.i=ni;if(ni!==was)b.stepStart=Date.now();}save();}
function dayNote(s,t){var e=entry(s,todayISO(),true);if(e)e.note=(e.note?e.note+"\n":"")+t;}
function icsEsc(s){return String(s).replace(/[\\;,]/g,"\\$&").replace(/\n/g,"\\n");}
function icsStamp(){return new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");}
function icsDoc(lines,method){return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//prozymi//EL","CALSCALE:GREGORIAN"].concat(method?["METHOD:"+method]:[],lines,["END:VCALENDAR"]).join("\r\n");}
function feedEv(uid,k,iso,time,sm,desc,cancel){var t=(time||"10:00").replace(":","");
 var o=["BEGIN:VEVENT","UID:fr-"+uid+"-"+k+"@sourdough","DTSTAMP:"+icsStamp(),"DTSTART:"+iso.replace(/-/g,"")+"T"+t+"00","DURATION:PT15M","SEQUENCE:"+(cancel?1:0),"SUMMARY:"+icsEsc(sm)];
 if(desc)o.push("DESCRIPTION:"+icsEsc(desc));
 if(cancel)o.push("STATUS:CANCELLED");else o.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc(sm),"TRIGGER:PT0S","END:VALARM");
 o.push("END:VEVENT");return o;}
function normFridge(f){f=f||{};var o={on:!!f.on,since:f.since||null,every:f.every||7,sched:null};
 if(f.sched&&Array.isArray(f.sched.dates))o.sched={uid:f.sched.uid,dates:f.sched.dates.slice(),declined:f.sched.declined||null};
 else if(f.uid&&f.n&&f.d0){var ds=[];for(var k=0;k<f.n;k++)ds.push(addDays(f.d0,k*(f.ev||7)));o.sched={uid:f.uid,dates:ds,declined:null};}
 return o;}
function schedLast(f){return f.sched&&f.sched.dates.length?f.sched.dates[f.sched.dates.length-1]:null;}
function schedLeft(f){if(!f.sched)return 0;var td=todayISO();return f.sched.dates.filter(function(d){return d>=td;}).length;}
function dailyIcs(){var s=curS(),dn=s.startDate?dayNo(s,todayISO()):1,n=dn<=14?Math.max(1,15-dn):7,uid=Date.now().toString(36),d0=todayISO(),lines=[];
 for(var k=0;k<n;k++)lines=lines.concat(feedEv(uid,k,addDays(d0,k),s.feedTime,"🍞 Τάισμα προζυμιού","",false));
 download("prozymi.ics",icsDoc(lines),"text/calendar");}
function fridgeIcs(extend){var s=curS(),f=s.fridge,td=todayISO(),start,uid,k0,lines=[],dates=[];
 if(extend&&f.sched&&schedLast(f)){uid=f.sched.uid;k0=f.sched.dates.length;start=addDays(schedLast(f),f.every);if(start<td)start=td;}
 else{uid=Date.now().toString(36);k0=0;start=nextFeed(s);if(start<td)start=td;f.sched={uid:uid,dates:[],declined:null};}
 for(var k=0;k<BATCH;k++)dates.push(addDays(start,k*f.every));
 dates.forEach(function(d,i){var last=i===BATCH-1;
  lines=lines.concat(feedEv(uid,k0+i,d,s.feedTime,"🍞 Τάισμα προζυμιού (ψυγείο)"+(last?" · τελευταίο της σειράς":""),
   last?"Τελευταία υπενθύμιση αυτής της σειράς. Αν δεν έχεις ήδη επεκτείνει, άνοιξε την εφαρμογή για να προσθέσεις "+BATCH+" ακόμα.":"",false));});
 f.sched.dates=f.sched.dates.concat(dates);f.sched.declined=null;save();
 download(extend?"prozymi-psygeio-epektasi.ics":"prozymi-psygeio.ics",icsDoc(lines),"text/calendar");}
function fridgeCancel(){var s=curS(),f=s.fridge,td=todayISO(),lines=[];if(!f.sched)return;
 f.sched.dates.forEach(function(d,k){if(d>=td)lines=lines.concat(feedEv(f.sched.uid,k,d,s.feedTime,"🍞 Τάισμα προζυμιού (ψυγείο)","",true));});
 f.sched=null;save();if(lines.length)download("prozymi-akyrosi.ics",icsDoc(lines,"CANCEL"),"text/calendar");}
function extBanner(s){var f=s.fridge;if(!f.on||!f.sched)return "";var last=schedLast(f),left=schedLeft(f);if(!last||left>1||f.sched.declined===last)return "";
 return '<div class="remove" style="margin-top:14px"><b>📅 '+(left?'Η τελευταία υπενθύμιση ψυγείου στο ημερολόγιο είναι στις '+formatDateEl(last)+'.':'Οι υπενθυμίσεις ψυγείου στο ημερολόγιο τελείωσαν ('+formatDateEl(last)+').')+'</b> Να προσθέσω '+BATCH+' ακόμα;'+
 '<div class="btns"><button type="button" class="btn" data-role="ext-yes">Ναι, '+BATCH+' ακόμα (.ics)</button><button type="button" class="btn ghost" data-role="ext-no">Όχι</button></div></div>';}
async function backup(){var txt=JSON.stringify(appState),f=null;try{f=new File([txt],"prozymi-backup.json",{type:"application/json"});}catch(e){}
 if(f&&navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:"Προζύμι backup"});appState.backedUp=Date.now();save();return;}catch(e){if(e&&e.name==="AbortError")return;}}
 download("prozymi-backup.json",txt,"application/json");appState.backedUp=Date.now();save();}
function banner(s){if(!s.fridge.on||nextFeed(s)>todayISO())return "";return '<div class="remove" style="margin-top:14px"><b>🧊 Ώρα να ταΐσεις το προζύμι</b> (προγραμματισμένο '+formatDateEl(nextFeed(s))+') <button type="button" class="btn" style="margin-left:6px" data-role="fed-today">Τάισα σήμερα</button></div>';}
function renderCal(s){calM=calM||todayISO().slice(0,7);var y=+calM.slice(0,4),m=+calM.slice(5)-1,off=(new Date(y,m,1).getDay()+6)%7,dim=new Date(y,m+1,0).getDate(),td=todayISO(),c="",f=s.fridge;
 ["Δ","Τ","Τ","Π","Π","Σ","Κ"].forEach(function(w){c+="<b>"+w+"</b>";});for(var i=0;i<off;i++)c+="<span></span>";
 for(var d=1;d<=dim;d++){var iso=y+"-"+pad(m+1)+"-"+pad(d),e=entry(s,iso,false);c+='<button type="button" class="cal-d'+(e&&e.done?" fed":"")+(iso===td?" today":"")+(dayNo(s,iso)<1?" off":"")+'" data-role="cal-day" data-iso="'+iso+'">'+d+(e&&e.time?"<small>"+e.time+"</small>":"")+"</button>";}
 return '<section class="card"><div class="cal-h"><button type="button" class="btn ghost" data-role="cal-prev">‹</button><h2 style="font-size:1.05rem;margin:0">'+MN[m]+" "+y+'</h2><button type="button" class="btn ghost" data-role="cal-next">›</button></div><div class="cal">'+c+'</div><p class="muted">Πάτα μια μέρα για να δεις ή να καταχωρίσεις τάισμα. Πράσινο = έγινε τάισμα.</p></section>'+
 '<section class="card"><h2 style="font-size:1.05rem;">🧊 Ψυγείο και υπενθυμίσεις</h2>'+(f.on?'<p class="muted">Στο ψυγείο από '+formatDateEl(f.since)+'.</p><div class="btns"><button type="button" class="btn" data-role="fridge-out">Το έβγαλα από το ψυγείο</button></div>':'<div class="btns"><button type="button" class="btn" data-role="fridge-in">Το έβαλα στο ψυγείο</button></div>')+
 '<div class="field-row"><div class="field"><label>Τάισμα κάθε (ημέρες)</label><input type="number" min="1" max="60" data-role="fridge-every" value="'+f.every+'"></div></div>'+(f.on?'<p class="muted">Επόμενο τάισμα: '+formatDateEl(nextFeed(s))+'</p>':'')+
 (f.on?(schedLeft(f)?'<p class="muted">Στο ημερολόγιο: '+schedLeft(f)+' υπενθύμιση(εις), έως '+formatDateEl(schedLast(f))+'.</p><div class="btns"><button type="button" class="btn ghost" data-role="ext-yes">Πρόσθεσε '+BATCH+' ακόμα (.ics)</button><button type="button" class="btn ghost" data-role="feed-cancel">Ακύρωση υπενθυμίσεων (.ics)</button></div>'
   :'<div class="btns"><button type="button" class="btn ghost" data-role="feed-ics">Υπενθυμίσεις ψυγείου: επόμενες '+BATCH+' (.ics)</button></div>')
  :'<div class="btns"><button type="button" class="btn ghost" data-role="feed-ics">Καθημερινές υπενθυμίσεις (.ics)</button></div>')+
 '<p class="muted">Στο ψυγείο μπαίνουν '+BATCH+' υπενθυμίσεις τη φορά, ώρα '+(s.feedTime||"10:00")+'. Όταν μείνει η τελευταία, η εφαρμογή ρωτάει αν θες '+BATCH+' ακόμα, και η τελευταία υπενθύμιση στο ημερολόγιο το γράφει κι αυτή.</p>'+
 (!f.on&&schedLeft(f)?'<div class="btns"><button type="button" class="btn ghost" data-role="feed-cancel">Ακύρωση υπενθυμίσεων ψυγείου (.ics)</button></div><p class="muted">Έχεις ακόμα '+schedLeft(f)+' υπενθύμιση(εις) ψυγείου στο ημερολόγιο. Άνοιξε το αρχείο ακύρωσης στο ημερολόγιο· αν δεν σβηστούν, σβήσ\' τες με το χέρι (τίτλος «🍞 Τάισμα προζυμιού (ψυγείο)»).</p>':'')+'</section>';}
function renderModal(){if(!modalIso)return "";var s=curS(),n=dayNo(s,modalIso),e=entry(s,modalIso,false),h='<div class="modal" data-role="modal-bg"><div class="sheet"><h3>'+formatDateEl(modalIso)+(n>=1&&n<=14?" · ημέρα "+n:"")+'</h3>';
 if(n<1)return h+'<p class="muted">Πριν την ημερομηνία έναρξης.</p><div class="btns"><button type="button" class="btn" data-role="modal-close">Κλείσιμο</button></div></div></div>';
 e=e||{};var F=function(f,l,ty){return '<div class="field"><label>'+l+'</label><input type="'+ty+'"'+(ty==="number"?' step="any" inputmode="decimal"':'')+' data-role="m-f" data-f="'+f+'" value="'+(e[f]==null?"":escapeHtml(e[f]))+'"></div>';};
 return h+'<label class="day-check"><input type="checkbox" data-role="m-f" data-f="done"'+(e.done?" checked":"")+'>Έγινε το τάισμα'+(s.feedTime?' (πλάνο '+s.feedTime+')':'')+'</label><div class="mgrid">'+F("time","Ώρα","time")+F("removed","Αφαίρεσα (γρ)","number")+F("flour","Πρόσθεσα αλεύρι (γρ)","number")+F("water","Πρόσθεσα νερό (γρ)","number")+F("gross","Ζύγιση βάζο+προζύμι (γρ)","number")+F("cm","Ύψος (cm)","number")+
 '</div><div class="field" style="margin-top:10px"><label>Σημειώσεις</label><textarea data-role="m-f" data-f="note">'+escapeHtml(e.note||"")+'</textarea></div><div class="btns"><button type="button" class="btn" data-role="modal-close">Κλείσιμο</button></div></div></div>';}
function renderApp(){var s=appState.starters[appState.activeId],tabs=[["starter","🌱 Προζύμι"],["cal","📅 Ημερολόγιο"],["bake","🍞 Ψήσιμο"],["data","💾 Δεδομένα"]];
 var body=tab==="cal"?renderCal(s):tab==="bake"?renderBake():tab==="data"?renderData():renderSwitcher(appState)+renderSetup(s)+renderCalculator(s)+renderTimeline(s)+renderMaintenance(s)+renderChart(s)+renderJournal(s)+renderFooter(s);
 return renderHeader(appState,s)+'<div class="wrap"><nav class="tabs">'+tabs.map(function(t){return '<button type="button" class="tab'+(t[0]===tab?" on":"")+'" data-role="tab" data-tab="'+t[0]+'">'+t[1]+'</button>';}).join("")+
 (tab==="data"?'':'<button type="button" class="chip'+(warnState()?" warn":"")+'" data-role="tab" data-tab="data" data-chip>'+chip()+'</button>')+'</nav>'+banner(s)+extBanner(s)+body+'</div>'+renderModal()+'<div class="save-hint"><span data-role="save-hint"></span></div>';}

document.addEventListener("change", function(ev){
  var t = ev.target;
  var role = t.getAttribute && t.getAttribute("data-role");
  if(!role) return;
  var starter = appState.starters[appState.activeId];
  if(role==="starter-select"){
    if(appState.starters[t.value]){ appState.activeId = t.value; persist(); }
  } else if(role==="starter-rename"){
    var name = t.value.trim();
    starter.name = name || starter.name;
    persist();
  } else if(role==="start-date"){
    starter.startDate = t.value || null;
    persist();
  } else if(role==="target-weight"){
    starter.targetWeight = clamp(parseInt(t.value,10)||260, 60, 450);
    persist();
  } else if(role==="day-done"){
    starter.days[t.getAttribute("data-day")].done = t.checked;
    persist();
  } else if(role==="day-cm"){
    var raw1 = t.value;
    starter.days[t.getAttribute("data-day")].cm = raw1==="" ? null : parseFloat(raw1);
    persist();
  } else if(role==="day-grams"){
    var raw2 = t.value;
    starter.days[t.getAttribute("data-day")].grams = raw2==="" ? null : parseFloat(raw2);
    persist();
  } else if(role==="day-note"){
    starter.days[t.getAttribute("data-day")].note = t.value;
    persist();
  } else if(role==="ready-toggle"){
    starter.ready = t.checked;
    persist();
  }
});


document.addEventListener("click", function(ev){
  var t = ev.target.closest ? ev.target.closest("[data-role]") : null;
  if(!t) return;
  var role = t.getAttribute("data-role");
  var starter = appState.starters[appState.activeId];
  if(role==="journal-add"){
    var input = root.querySelector('[data-role="journal-input"]');
    var text = input && input.value.trim();
    if(!text) return;
    var now = new Date();
    var ts = formatDateEl(todayISO()) + " " + pad(now.getHours())+":"+pad(now.getMinutes());
    starter.journal.push({id:genId(), ts:ts, text:text});
    persist();
  } else if(role==="journal-delete"){
    var id = t.getAttribute("data-id");
    starter.journal = starter.journal.filter(function(j){ return j.id!==id; });
    persist();
  } else if(role==="starter-add"){
    var newId = "s"+Date.now().toString(36);
    var n = Object.keys(appState.starters).length+1;
    appState.starters[newId] = normalizeStarter(null, "Προζύμι "+n);
    appState.activeId = newId;
    persist();
  } else if(role==="reset-step1"){
    var row = root.querySelector('[data-role="reset-confirm-row"]');
    if(row) row.hidden = false;
  } else if(role==="reset-cancel"){
    var row2 = root.querySelector('[data-role="reset-confirm-row"]');
    if(row2) row2.hidden = true;
  } else if(role==="reset-confirm"){
    var ids = Object.keys(appState.starters);
    delete appState.starters[appState.activeId];
    ids = Object.keys(appState.starters);
    if(!ids.length){
      var freshId = "s"+Date.now().toString(36);
      appState.starters[freshId] = normalizeStarter(null, "Προζύμι 1");
      appState.activeId = freshId;
    } else {
      appState.activeId = ids[0];
    }
    persist();
  }
});
document.addEventListener("click",function(ev){
 var t=ev.target.closest?ev.target.closest("[data-role]"):null;if(!t)return;
 var r=t.getAttribute("data-role"),i=parseInt(t.getAttribute("data-i"),10),b=appState.bake,rec=curRec(),st=appState.starters[appState.activeId];
 var v=function(k){var e=root.querySelector('[data-role="'+k+'"]');return e?e.value:"";};
 if(r==="tab"){tab=t.getAttribute("data-tab");draw();}
 else if(r==="feed-add"){var cm=v("feed-cm"),g=v("feed-g");st.feeds.push({id:genId(),t:v("feed-t")||loc(Date.now()),k:v("feed-k"),cm:cm===""?null:parseFloat(cm),g:g===""?null:parseFloat(g),n:v("feed-n").trim()});save();}
 else if(r==="feed-del"){st.feeds=st.feeds.filter(function(x){return x.id!==t.getAttribute("data-id");});save();}
 else if(r==="bake-start"){unlock();appState.bake={name:rec.name,steps:JSON.parse(JSON.stringify(rec.steps)),i:0,stepStart:Date.now(),started:Date.now()};save();keepAwake();}
 else if((r==="bake-next"||r==="bake-tick")&&b){tickStep(r==="bake-next"?b.i:i,r==="bake-next");}
 else if(r==="cal-day"){modalIso=t.getAttribute("data-iso");draw();}
 else if(r==="cal-prev"||r==="cal-next"){var cd=new Date(+calM.slice(0,4),+calM.slice(5)-1+(r==="cal-next"?1:-1),1);calM=cd.getFullYear()+"-"+pad(cd.getMonth()+1);draw();}
 else if(r==="modal-close"||(r==="modal-bg"&&ev.target===t)){modalIso=null;draw();}
 else if(r==="fed-today"){var te=entry(st,todayISO(),true);if(te){te.done=true;if(!te.time)te.time=hm(Date.now());save();}}
 else if(r==="feed-ics"){if(st.fridge.on)fridgeIcs(false);else dailyIcs();}
 else if(r==="feed-cancel"){fridgeCancel();}
 else if(r==="ext-yes"){fridgeIcs(true);}
 else if(r==="ext-no"){if(st.fridge.sched){st.fridge.sched.declined=schedLast(st.fridge);save();}}
 else if(r==="fridge-in"||r==="fridge-out"){var fr=st.fridge;fr.on=r==="fridge-in";if(fr.on)fr.since=todayISO();dayNote(st,fr.on?"Μπήκε στο ψυγείο":"Βγήκε από το ψυγείο");save();}
 else if(r==="bake-snooze"&&b){b.stepStart+=300000;save();}
 else if(r==="bake-cancel"){if(confirm("Ακύρωση του ψησίματος;")){appState.bake=null;save();}}
 else if(r==="notif"){unlock();if(window.Notification)Notification.requestPermission().then(draw);}
 else if(r==="ics"&&b){ics();}
 else if(r==="step-up"||r==="step-down"){var j=r==="step-up"?i-1:i+1,a=rec.steps;if(j>=0&&j<a.length){a.splice(j,0,a.splice(i,1)[0]);save();}}
 else if(r==="step-del"){rec.steps.splice(i,1);save();}
 else if(r==="step-add"){rec.steps.push({n:"Νέο στάδιο",m:30,t:""});save();}
 else if(r==="rec-add"){var n={id:genId(),name:"Νέα συνταγή",steps:[{n:"Στάδιο 1",m:30,t:""}]};appState.recipes.push(n);selRid=n.id;save();}
 else if(r==="rec-del"){if(appState.recipes.length>1&&confirm("Διαγραφή της συνταγής;")){appState.recipes=appState.recipes.filter(function(x){return x!==rec;});selRid=null;save();}}
 else if(r==="pwa-install"&&instEv){instEv.prompt();}
 else if(r==="sync-connect")connectSync();
 else if(r==="sync-now"){runSync(true);}
 else if(r==="sync-off")disconnectSync();
 else if(r==="sync-tok-show"){showTok=!showTok;draw();}
 else if(r==="sync-tok-save")saveToken();
 else if(r==="sync-take-remote")resolveChoice("remote");
 else if(r==="sync-take-local")resolveChoice("local");
 else if(r==="sync-merge")resolveChoice("merge");
 else if(r==="file-download")backup();
});
document.addEventListener("change",function(ev){
 var t=ev.target,r=t.getAttribute&&t.getAttribute("data-role");if(!r)return;
 var rec=curRec(),i=parseInt(t.getAttribute("data-i"),10);
 if(r==="day-done"&&t.checked){var dd=curS().days[t.getAttribute("data-day")];if(dd&&!dd.time){dd.time=hm(Date.now());save();}}
 if(r==="rec-select"){selRid=t.value;draw();}
 else if(r==="jar-weight"||r==="day-gross"){var s0=appState.starters[appState.activeId],x=t.value===""?null:parseFloat(t.value);if(r==="jar-weight")s0.jar=x;else s0.days[t.getAttribute("data-day")].gross=x;save();}
 else if(r==="feed-time"){curS().feedTime=t.value;save();}
 else if(r==="day-time"){curS().days[t.getAttribute("data-day")].time=t.value;save(false);}
 else if(r==="fridge-on"){var f0=curS().fridge;f0.on=t.checked;if(f0.on)f0.since=todayISO();save();}
 else if(r==="fridge-every"){curS().fridge.every=clamp(parseInt(t.value,10)||7,1,60);save();}
 else if(r==="m-f"){var e1=entry(curS(),modalIso,true),f1=t.getAttribute("data-f");if(!e1)return;
  if(f1==="done"){e1.done=t.checked;if(t.checked&&!e1.time)e1.time=hm(Date.now());save();}
  else{e1[f1]=(f1==="note"||f1==="time")?t.value:(t.value===""?null:parseFloat(t.value));save(false);}}
 else if(r==="rec-name"){rec.name=t.value.trim()||rec.name;save(false);}
 else if(r==="step-f"){var f=t.getAttribute("data-f");rec.steps[i][f]=f==="m"?clamp(parseInt(t.value,10)||1,1,2880):t.value;save(f==="m");}
 else if(r==="file-import"&&t.files[0]){var rd=new FileReader();rd.onload=function(){try{var d=parseData(rd.result);if(confirm("Να αντικατασταθούν τα τωρινά δεδομένα;")){appState=normalizeAll(d);save();}}catch(e){alert("Μη έγκυρο αρχείο δεδομένων.");}};rd.readAsText(t.files[0]);}
});
document.addEventListener("visibilitychange",function(){if(!document.hidden)keepAwake();});
function tick(){var b=appState.bake;if(!b){document.title=T0;return;}
 var s=b.steps[b.i],left=b.stepStart+s.m*60000-Date.now(),el=root.querySelector("[data-countdown]");
 if(el){el.textContent=fmtLeft(left);el.classList.toggle("late",left<0);}
 document.title=fmtLeft(left)+" · "+s.n;
 var k=b.started+":"+b.i;if(k!==rk){rk=k;rc=0;}
 if(left<=0&&rc<8&&Date.now()-rl>8000){rc++;rl=Date.now();ring(s);}}
(function(){var s=appState.starters[appState.activeId];if(!s.startDate)s.startDate=todayISO();})();
draw();window.__sdLoaded=1;setInterval(tick,1000);keepAwake();askPersist().then(function(){if(tab==="data")softDraw();});
if(cfg)runSync(true);
document.addEventListener("visibilitychange",function(){if(!cfg)return;if(document.hidden){if(meta.dirty)runSync(false);}else if(Date.now()-lastPull>15000)runSync(true);});
window.addEventListener("online",function(){if(cfg)runSync(true);});
setInterval(function(){if(cfg&&!document.hidden&&Date.now()-lastPull>110000)runSync(true);},30000);
window.__sd={merge3:merge3};
if("serviceWorker" in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register("sw.js").catch(function(){});

})();
