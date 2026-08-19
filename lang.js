(function(){
  var KEY='iolab-lang';
  function apply(lang){
    var en=lang==='en';
    document.documentElement.lang=en?'en':'ko';
    document.body.classList.toggle('lang-en',en);
    localStorage.setItem(KEY,lang);
    document.querySelectorAll('.nl-en').forEach(function(el){
      el.style.background=en?'#5eead4':'';
      el.style.color=en?'#0b1120':'rgba(255,255,255,0.55)';
    });
    document.querySelectorAll('.nl-ko').forEach(function(el){
      el.style.background=en?'':'#5eead4';
      el.style.color=en?'rgba(255,255,255,0.55)':'#0b1120';
    });
  }
  window.setLang=function(l){apply(l);};
  document.addEventListener('DOMContentLoaded',function(){
    apply(localStorage.getItem(KEY)||'ko');
  });
})();
