/* ==========================================================================
   QUAY 9 — interactions
   Explorer map · home finder · events filter · count-up · phases · voices
   ========================================================================== */
(function(){
  "use strict";

  /* ───── scroll reveal (robust: guarantees visibility, animates when able) ───── */
  var prefersReduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var revEls = [].slice.call(document.querySelectorAll('[data-reveal]'));
  function reveal(el){
    if(el.dataset.shown) return;
    el.dataset.shown = '1';
    el.classList.add('in');
    // Force the final visible state directly so content can NEVER stay hidden,
    // even if CSS transitions / animations are throttled in this environment.
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.transform = 'none';
    // Nicety: a transform-only slide-up via WAAPI. Opacity is left untouched (always 1),
    // so even if the animation stalls the content stays fully visible — never blank.
    if(!prefersReduced && el.animate){
      try{ el.animate(
        [{transform:'translateY(24px)'},{transform:'none'}],
        {duration:650, easing:'cubic-bezier(.2,.7,.1,1)'}
      ); }catch(e){}
    }
  }
  function primeInView(){
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revEls = revEls.filter(function(el){
      if(el.dataset.shown) return false;
      var r = el.getBoundingClientRect();
      if(r.top < vh*0.94 && r.bottom > 0){ reveal(el); return false; }
      return true;
    });
  }
  var revIO = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ reveal(e.target); revIO.unobserve(e.target); } });
  }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});
  revEls.forEach(function(el){ revIO.observe(el); });
  // prime immediately + on scroll/resize so above-the-fold never stays hidden
  primeInView();
  requestAnimationFrame(primeInView);
  window.addEventListener('scroll', primeInView, {passive:true});
  window.addEventListener('resize', primeInView);
  window.addEventListener('load', function(){ setTimeout(primeInView, 150); });
  // ultimate safety net: force everything visible if observers never fired
  setTimeout(function(){ document.querySelectorAll('[data-reveal]').forEach(reveal); }, 1400);

  /* ───── mobile menu ───── */
  var nav=document.getElementById('nav'), burger=document.getElementById('burger'), mobile=document.getElementById('mobile');
  burger.addEventListener('click', function(){ nav.classList.toggle('open'); });
  mobile.addEventListener('click', function(e){ if(e.target.closest('a')) nav.classList.remove('open'); });

  /* ───── hero parallax on image ───── */
  var heroMedia=document.getElementById('heroMedia');
  if(heroMedia) requestAnimationFrame(function(){ heroMedia.classList.add('seen'); });

  /* ───── count-up ───── */
  function animateCount(el){
    var target=parseFloat(el.getAttribute('data-count')),
        dec=parseInt(el.getAttribute('data-dec')||'0',10),
        suf=el.getAttribute('data-suffix')||'',
        start=null, dur=1400;
    function step(t){
      if(!start) start=t;
      var p=Math.min((t-start)/dur,1);
      var eased=1-Math.pow(1-p,3);
      var val=(target*eased).toFixed(dec);
      el.textContent=val+suf;
      if(p<1) requestAnimationFrame(step);
      else el.textContent=target.toFixed(dec)+suf;
    }
    requestAnimationFrame(step);
  }
  var strip=document.getElementById('strip');
  var stripIO=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.querySelectorAll('[data-count]').forEach(animateCount); stripIO.disconnect(); } });
  }, {threshold:0.4});
  if(strip) stripIO.observe(strip);
  // fallback: if the observer / rAF never ran, show the final figures anyway
  setTimeout(function(){
    document.querySelectorAll('[data-count]').forEach(function(el){
      if(parseFloat(el.textContent)===0 || el.textContent==='0'){
        var t=parseFloat(el.getAttribute('data-count')),
            dec=parseInt(el.getAttribute('data-dec')||'0',10),
            suf=el.getAttribute('data-suffix')||'';
        el.textContent=t.toFixed(dec)+suf;
      }
    });
  }, 1500);

  /* ───── interactive map ───── */
  var SPOTS=[
    {n:1, cat:"gather", catLabel:"Gather", color:"var(--coral)", x:30, y:38, title:"The Food Hall", blurb:"Thirty independent kitchens under the old grain-store roof — open from breakfast to late.", meta:["30 kitchens","Open daily"], img:"img/foodhall.webp"},
    {n:2, cat:"play",   catLabel:"Play",   color:"#0E9C8C",     x:62, y:26, title:"The Lido & Tidal Pool", blurb:"Swim in filtered harbour water from a timber-decked lido, May through September.", meta:["Open May–Sep","Free for residents"], img:"img/lido.webp"},
    {n:3, cat:"work",   catLabel:"Work",   color:"var(--sun)",  x:46, y:58, title:"Makers' Studios", blurb:"Thirty-five affordable workshops for makers, small brands and a co-working loft.", meta:["35 studios","From £180/mo"], img:"img/makers2.webp"},
    {n:4, cat:"gather", catLabel:"Gather", color:"var(--coral)", x:18, y:66, title:"Market Square", blurb:"A Saturday makers' market, weekday play and year-round events — the wharf's living room.", meta:["Sat 9–2","Year-round"], img:"img/market2.webp"},
    {n:5, cat:"play",   catLabel:"Play",   color:"#0E9C8C",     x:78, y:54, title:"The Boardwalk", blurb:"1.2 km of public waterfront that stays open to everyone, day and night, always.", meta:["1.2 km","Always open"], img:"img/boardwalk.webp"},
    {n:6, cat:"live",   catLabel:"Live",   color:"#0E9C8C",     x:40, y:80, title:"The Green", blurb:"Six hectares of new park, a community garden and the sail club down at the point.", meta:["6 hectares","Sail club"], img:"img/green.webp"},
    {n:7, cat:"live",   catLabel:"Live",   color:"#0E9C8C",     x:86, y:78, title:"Ferry Steps", blurb:"Hop the harbour ferry — nine minutes across the water to the old town.", meta:["9 min crossing","Every 20 min"], img:"img/ferry.webp"}
  ];
  var CATCOLOR={live:"var(--teal)",work:"var(--sun)",gather:"var(--coral)",play:"var(--teal)"};
  var CATTEXT ={live:"#fff",work:"var(--ink)",gather:"#fff",play:"#fff"};

  var map=document.getElementById('map'), spot=document.getElementById('spot'), legend=document.getElementById('legend');
  var active=0, autoTimer=null;

  SPOTS.forEach(function(s,i){
    var pin=document.createElement('button');
    pin.className='pin'; pin.setAttribute('data-cat',s.cat); pin.setAttribute('aria-label',s.title);
    pin.style.left=s.x+'%'; pin.style.top=s.y+'%'; pin.textContent=s.n;
    pin.addEventListener('click', function(){ setSpot(i,true); });
    pin.addEventListener('pointerenter', function(){ if(window.matchMedia('(hover:hover)').matches) setSpot(i,true); });
    map.appendChild(pin);

    var lb=document.createElement('button');
    lb.setAttribute('aria-pressed', i===0?'true':'false');
    lb.innerHTML='<span class="ld" style="background:'+s.color+'"></span>'+s.title;
    lb.addEventListener('click', function(){ setSpot(i,true); });
    legend.appendChild(lb);
  });
  var pins=map.querySelectorAll('.pin'), legends=legend.querySelectorAll('button');

  function setSpot(i, userAction){
    active=i; var s=SPOTS[i];
    pins.forEach(function(p,j){ p.classList.toggle('active', j===i); });
    legends.forEach(function(l,j){ l.setAttribute('aria-pressed', j===i?'true':'false'); });
    spot.innerHTML=
      '<div class="spot__img"><img src="'+(s.img||('https://picsum.photos/seed/'+s.seed+'/800/520'))+'" alt="'+s.title+'">'+
        '<span class="spot__no" style="background:'+s.color+';color:'+CATTEXT[s.cat]+'">'+s.n+'</span></div>'+
      '<div class="spot__b">'+
        '<span class="spot__cat" style="background:'+s.color+';color:'+CATTEXT[s.cat]+'">'+s.catLabel+'</span>'+
        '<h3>'+s.title+'</h3><p>'+s.blurb+'</p>'+
        '<div class="spot__meta"><span><b>'+s.meta[0]+'</b></span><span>'+s.meta[1]+'</span></div>'+
        '<div class="spot__nav"><button id="spotPrev" aria-label="Previous">‹</button><button id="spotNext" aria-label="Next">›</button></div>'+
      '</div>';
    document.getElementById('spotPrev').addEventListener('click', function(){ setSpot((active-1+SPOTS.length)%SPOTS.length,true); });
    document.getElementById('spotNext').addEventListener('click', function(){ setSpot((active+1)%SPOTS.length,true); });
    if(userAction) restartAuto();
  }
  function restartAuto(){ if(autoTimer) clearInterval(autoTimer); autoTimer=setInterval(function(){ setSpot((active+1)%SPOTS.length,false); }, 4200); }
  setSpot(0,false);
  // start auto only when map in view
  new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ restartAuto(); } else if(autoTimer){ clearInterval(autoTimer); autoTimer=null; } });
  }, {threshold:0.25}).observe(map);

  /* ───── find your home ───── */
  var HOMES=[
    {key:"Studio",  name:"The Studio",     price:"£245k", beds:"Studio", size:"38 m²", count:24, sold:70, blurb:"Compact, light and clever — a complete first home opening straight onto the boardwalk.", img:"img/plan-studio.webp"},
    {key:"1 bed",   name:"The One-Bed",    price:"£330k", beds:"1 bed",  size:"52 m²", count:38, sold:54, blurb:"A proper one-bedroom with a galley kitchen and a balcony facing the water.", img:"img/plan-1bed.webp"},
    {key:"2 bed",   name:"The Two-Bed",    price:"£465k", beds:"2 bed",  size:"74 m²", count:31, sold:42, blurb:"Dual-aspect living, two double bedrooms and a wide terrace for the long evenings.", img:"img/plan-2bed.webp"},
    {key:"Townhouse",name:"The Townhouse", price:"£720k", beds:"3–4 bed",size:"128 m²",count:12, sold:25, blurb:"A three-storey family home with a roof garden and its own door onto the green.", img:"img/plan-townhouse.webp"}
  ];
  var htabs=document.getElementById('htabs');
  HOMES.forEach(function(h,i){
    var b=document.createElement('button'); b.className='htab'; b.textContent=h.key;
    b.setAttribute('aria-pressed', i===0?'true':'false');
    b.addEventListener('click', function(){ setHome(i); });
    htabs.appendChild(b);
  });
  var htabBtns=htabs.querySelectorAll('.htab');
  function setHome(i){
    var h=HOMES[i];
    htabBtns.forEach(function(b,j){ b.setAttribute('aria-pressed', j===i?'true':'false'); });
    document.getElementById('hPrice').textContent=h.price;
    document.getElementById('hName').textContent=h.name;
    document.getElementById('hBlurb').textContent=h.blurb;
    document.getElementById('hBeds').textContent=h.beds;
    document.getElementById('hSize').textContent=h.size;
    document.getElementById('hCount').textContent=h.count;
    document.getElementById('hSold').textContent=h.sold+'% reserved in Phase 1';
    document.getElementById('hBar').style.width=h.sold+'%';
    var img=document.getElementById('hplanImg');
    img.style.opacity='0';
    setTimeout(function(){ img.src=h.img||('https://picsum.photos/seed/'+h.seed+'/900/700'); img.onload=function(){ img.style.opacity='.9'; }; }, 120);
  }

  /* ───── what's on ───── */
  var EVENTS=[
    {d:"14", m:"Jun · Sat", cat:"Market",    title:"Quayside Makers' Market",   loc:"Market Square · 9–2"},
    {d:"21", m:"Jun · Sat", cat:"Music",     title:"Sundown Sessions · Live",   loc:"The Boardwalk · 6pm"},
    {d:"28", m:"Jun · Sat", cat:"Family",    title:"Tidal Pool Opening Splash", loc:"The Lido · all day"},
    {d:"05", m:"Jul · Sat", cat:"Food",      title:"Food Hall Street Feast",    loc:"The Food Hall · 12–9"},
    {d:"12", m:"Jul · Sat", cat:"Community", title:"Open Studios on the Wharf", loc:"Makers' Studios · 11–4"},
    {d:"19", m:"Jul · Sat", cat:"Family",    title:"Boatyard Open Day",         loc:"The Point · 10–4"},
    {d:"26", m:"Jul · Sat", cat:"Music",     title:"Harbour Jazz on the Green",  loc:"The Green · 5pm"},
    {d:"02", m:"Aug · Sat", cat:"Market",    title:"Vintage & Flea Market",     loc:"Market Square · 9–3"},
    {d:"09", m:"Aug · Sat", cat:"Food",      title:"Oyster & Cider Night",      loc:"Ferry Steps · 7pm"}
  ];
  var EVCOLOR={Market:"var(--coral)",Music:"var(--teal)",Food:"var(--sun)",Family:"#0E9C8C",Community:"var(--coral)"};
  var EVTEXT ={Market:"#fff",Music:"#fff",Food:"var(--ink)",Family:"#fff",Community:"#fff"};
  var eventsEl=document.getElementById('events');
  EVENTS.forEach(function(ev){
    var c=document.createElement('article'); c.className='ev'; c.setAttribute('data-cat',ev.cat);
    c.innerHTML='<div class="ev__top"><div class="ev__date">'+ev.d+'<span>'+ev.m+'</span></div>'+
      '<span class="ev__cat" style="background:'+EVCOLOR[ev.cat]+';color:'+EVTEXT[ev.cat]+'">'+ev.cat+'</span></div>'+
      '<h3>'+ev.title+'</h3><span class="loc">'+ev.loc+'</span>';
    eventsEl.appendChild(c);
  });
  var efilter=document.getElementById('efilter');
  efilter.addEventListener('click', function(e){
    var b=e.target.closest('button'); if(!b) return;
    var cat=b.getAttribute('data-cat');
    efilter.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', x===b?'true':'false'); });
    eventsEl.querySelectorAll('.ev').forEach(function(c){
      c.classList.toggle('hide', !(cat==='all' || c.getAttribute('data-cat')===cat));
    });
  });

  /* ───── phases progress ───── */
  var ptrack=document.getElementById('ptrack'), pfill=document.getElementById('pfill');
  var phaseIO=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){
      var vertical=window.matchMedia('(max-width:760px)').matches;
      pfill.style[vertical?'height':'width']='12%'; // Phase 1 of 3, partway
      phaseIO.disconnect();
    }});
  }, {threshold:0.3});
  if(ptrack) phaseIO.observe(ptrack);

  /* ───── voices ───── */
  var VOICES=[
    {q:"“We swapped a flat in the city for a studio over the food hall. I make ceramics downstairs and sell them upstairs.”", nm:"Mara K.", rl:"Maker · Phase 1 resident", img:"img/face1.webp"},
    {q:"“The kids learned to swim in the tidal pool. By August they knew half the wharf by name.”", nm:"Daniel O.", rl:"Resident · The Green", img:"img/face2.webp"},
    {q:"“Saturday market is our whole weekend now. We never planned to stay — now we can't imagine leaving.”", nm:"Priya & Sam", rl:"Phase 1 residents", img:"img/face3.webp"},
    {q:"“As a small brand, an affordable studio on the water was unthinkable anywhere else in the city.”", nm:"Theo L.", rl:"Maker · The Studios", img:"img/face4.webp"}
  ];
  var vscroll=document.getElementById('vscroll');
  VOICES.forEach(function(v){
    var c=document.createElement('article'); c.className='vcard';
    c.innerHTML='<p class="quote">'+v.q+'</p><div class="who"><img src="'+v.img+'" alt=""><div><div class="nm">'+v.nm+'</div><div class="rl">'+v.rl+'</div></div></div>';
    vscroll.appendChild(c);
  });
  // drag scroll
  (function(el){
    var down=false,sx=0,sl=0,moved=0;
    el.addEventListener('pointerdown',function(e){down=true;moved=0;sx=e.clientX;sl=el.scrollLeft;el.classList.add('drag');el.setPointerCapture(e.pointerId);});
    el.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));el.scrollLeft=sl-dx;});
    function up(){down=false;el.classList.remove('drag');}
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',up);
    el.addEventListener('click',function(e){if(moved>6)e.preventDefault();},true);
  })(vscroll);

  /* ───── tide time (gentle, real-ish) ───── */
  (function(){
    var t=document.getElementById('tideTime');
    if(!t) return;
    var now=new Date(); var h=(now.getHours()+ (now.getMinutes()>30?1:0) +2)%24;
    var mins=[ '05','20','35','50' ][now.getMinutes()%4];
    t.textContent=(h<10?'0'+h:h)+':'+mins;
  })();

  /* ───── join form + confetti ───── */
  var form=document.getElementById('joinForm');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var email=form.querySelector('input[name=email]'), s=document.querySelector('#join .status');
    var ok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email.value||'').trim());
    if(!ok){ s.textContent='Pop in a valid email and we\u2019ll keep you posted.'; email.focus(); return; }
    form.querySelectorAll('input,button').forEach(function(el){ el.disabled=true; });
    s.textContent="You\u2019re on the list — see you on the wharf.";
    burstConfetti();
  });
  function burstConfetti(){
    var join=document.getElementById('join');
    var cols=['#F4B740','#0E9C8C','#FBFAF5','#10302B','#DCEFEA'];
    for(var i=0;i<28;i++){
      (function(i){
        var c=document.createElement('span'); c.className='confetti';
        c.style.background=cols[i%cols.length];
        c.style.left=(10+Math.random()*80)+'%';
        join.appendChild(c);
        var dx=(Math.random()*2-1)*120, dy=260+Math.random()*220, rot=Math.random()*720-360, dur=1100+Math.random()*900;
        c.animate([
          {transform:'translate(0,0) rotate(0)',opacity:1},
          {transform:'translate('+dx+'px,'+dy+'px) rotate('+rot+'deg)',opacity:0}
        ],{duration:dur,easing:'cubic-bezier(.2,.6,.2,1)',delay:Math.random()*250,fill:'forwards'});
        setTimeout(function(){ c.remove(); }, dur+400);
      })(i);
    }
  }
})();
