(function(){
'use strict';
var header=document.getElementById('siteHeader'),burger=document.getElementById('menuToggle'),mobile=document.getElementById('mobileNav');
if(!header||!burger||!mobile)return;
function close(){header.classList.remove('menu-open');burger.setAttribute('aria-expanded','false');}
burger.addEventListener('click',function(){var open=header.classList.toggle('menu-open');burger.setAttribute('aria-expanded',String(open));});
mobile.addEventListener('click',function(e){if(e.target.closest('a'))close();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
})();