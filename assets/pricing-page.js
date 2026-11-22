(function(){
'use strict';
var header=document.getElementById('siteHeader'),burger=document.getElementById('menuToggle'),mobile=document.getElementById('mobileNav');
if(!header||!burger||!mobile)return;
function close(){header.classList.remove('menu-open');burger.setAttribute('aria-expanded','false');}
burger.addEventListener('click',function(){var open=header.classList.toggle('menu-open');burger.setAttribute('aria-expanded',String(open));});
mobile.addEventListener('click',function(e){if(e.target.closest('a'))close();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
// Preserve explicitly chosen locale on internal page links, including email deep links.
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href]');
  if(!a)return;
  var href=a.getAttribute('href');
  if(!/^(?:index|work|services|websites|films|pricing|studio|contact|start)\.html(?:[?#]|$)/.test(href))return;
  var lang=document.documentElement.lang;
  if(!/^(en|de|cs|fr)$/.test(lang))return;
  var u=new URL(href,window.location.href);
  u.searchParams.set('lang',lang);
  a.href=u.pathname+u.search+u.hash;
});
})();