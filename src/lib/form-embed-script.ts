/**
 * Vanilla JS widget for embedding a lead form on third-party sites.
 * Injected values are JSON-stringified for safe embedding in the script source.
 */
export function buildFormEmbedScript(formId: string, origin: string): string {
  const fid = JSON.stringify(formId);
  const org = JSON.stringify(origin.replace(/\/$/, ""));
  return `(function(){
'use strict';
var FORM_ID=${fid};
var ORIGIN=${org};
function esc(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
var s=document.currentScript;
if(!s||!s.parentNode)return;
var host=document.createElement('div');
host.setAttribute('data-solarflow-form',FORM_ID);
s.parentNode.insertBefore(host,s.nextSibling);
var root=host.attachShadow({mode:'open'});
var style=document.createElement('style');
style.textContent=
  '.sf-wrap{font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111;line-height:1.4;max-width:420px;}'+
  '.sf-wrap *{box-sizing:border-box;}'+
  '.sf-title{font-size:1.25rem;font-weight:700;margin:0 0 0.5rem;}'+
  '.sf-desc{color:#555;margin:0 0 1rem;font-size:0.9rem;}'+
  '.sf-field{margin-bottom:1rem;}'+
  '.sf-label{display:block;font-weight:600;margin-bottom:0.35rem;font-size:0.85rem;}'+
  '.sf-req{color:#b45309;}'+
  '.sf-input,.sf-textarea,.sf-select{width:100%;padding:0.55rem 0.65rem;border:1px solid #d1d5db;border-radius:8px;font:inherit;background:#fff;color:#111;}'+
  '.sf-textarea{min-height:88px;resize:vertical;}'+
  '.sf-check{display:flex;align-items:flex-start;gap:0.5rem;}'+
  '.sf-check input{margin-top:0.2rem;}'+
  '.sf-btn{display:inline-flex;align-items:center;justify-content:center;padding:0.65rem 1.25rem;border:none;border-radius:8px;font:inherit;font-weight:600;cursor:pointer;color:#fff;}'+
  '.sf-btn:disabled{opacity:0.6;cursor:not-allowed;}'+
  '.sf-msg{margin-top:0.75rem;font-size:0.9rem;}'+
  '.sf-err{color:#b91c1c;}'+
  '.sf-ok{color:#15803d;}'+
  '.sf-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;}';
root.appendChild(style);
var wrap=document.createElement('div');
wrap.className='sf-wrap';
root.appendChild(wrap);

function showErr(msg){
  var e=wrap.querySelector('.sf-msg');
  if(!e){e=document.createElement('div');e.className='sf-msg sf-err';wrap.appendChild(e);}
  e.className='sf-msg sf-err';
  e.textContent=msg||'Something went wrong.';
}
function showOk(msg){
  wrap.innerHTML='<div class="sf-msg sf-ok">'+(msg?esc(msg):'Thank you! We will be in touch soon.')+'</div>';
}

function fieldHtml(f){
  var req=f.required?' <span class="sf-req">*</span>':'';
  var id='sf-'+f.key;
  var ph=f.placeholder?(' placeholder="'+esc(f.placeholder)+'"'):'';
  var lab='<label class="sf-label" for="'+esc(id)+'">'+esc(f.label)+req+'</label>';
  if(f.type==='textarea'){
    return '<div class="sf-field">'+lab+'<textarea class="sf-textarea" id="'+esc(id)+'" name="'+esc(f.key)+'" '+(f.required?'required':'')+ph+'></textarea></div>';
  }
  if(f.type==='select'){
    var opts=(f.options||[]).map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join('');
    return '<div class="sf-field">'+lab+'<select class="sf-select" id="'+esc(id)+'" name="'+esc(f.key)+'" '+(f.required?'required':'')+'><option value="">Choose…</option>'+opts+'</select></div>';
  }
  if(f.type==='checkbox'){
    return '<div class="sf-field sf-check"><input type="checkbox" id="'+esc(id)+'" name="'+esc(f.key)+'" value="true" '+(f.required?'required':'')+'/><label class="sf-label" for="'+esc(id)+'" style="margin:0;font-weight:500;">'+esc(f.label)+req+'</label></div>';
  }
  if(f.type==='number'){
    return '<div class="sf-field">'+lab+'<input class="sf-input" type="number" step="any" id="'+esc(id)+'" name="'+esc(f.key)+'" '+(f.required?'required':'')+ph+'/></div>';
  }
  var inputType=f.type==='email'?'email':f.type==='phone'?'tel':'text';
  return '<div class="sf-field">'+lab+'<input class="sf-input" type="'+inputType+'" id="'+esc(id)+'" name="'+esc(f.key)+'" '+(f.required?'required':'')+ph+' autocomplete="'+(f.type==='address'?'street-address':'on')+'"/></div>';
}

fetch(ORIGIN+'/api/forms/'+encodeURIComponent(FORM_ID)+'/public',{credentials:'omit'})
  .then(function(r){if(!r.ok)throw new Error('Form not found');return r.json();})
  .then(function(cfg){
    var accent=cfg.brandColor||'#f59e0b';
    style.textContent+= '.sf-btn{background:'+accent+';}';
    var html='';
    if(cfg.name)html+='<h2 class="sf-title">'+esc(cfg.name)+'</h2>';
    if(cfg.description)html+='<p class="sf-desc">'+esc(cfg.description)+'</p>';
    html+='<form class="sf-form">';
    html+='<div class="sf-hp"><label>Leave blank<input type="text" name="website" tabindex="-1" autocomplete="off"/></div>';
    (cfg.fields||[]).forEach(function(f){html+=fieldHtml(f);});
    html+='<button type="submit" class="sf-btn">Submit</button></form>';
    html+='<div class="sf-msg sf-err" style="display:none;"></div>';
    wrap.innerHTML=html;
    var formEl=wrap.querySelector('form');
    if(!formEl)return;
    var errEl=wrap.querySelector('.sf-msg.sf-err');
    if(errEl)errEl.style.display='none';
    formEl.addEventListener('submit',function(ev){
      ev.preventDefault();
      if(errEl){errEl.style.display='none';errEl.textContent='';}
      var btn=formEl.querySelector('button[type="submit"]');
      btn.disabled=true;
      var payload={};
      var fd=new FormData(formEl);
      fd.forEach(function(v,k){payload[k]=v;});
      (cfg.fields||[]).forEach(function(f){
        if(f.type==='checkbox'){
          var el=formEl.querySelector('#sf-'+f.key);
          payload[f.key]=el&&el.checked===true;
        }
      });
      fetch(ORIGIN+'/api/forms/'+encodeURIComponent(FORM_ID)+'/submit',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'omit',
        body:JSON.stringify(payload)
      })
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,status:r.status,j:j};});})
      .then(function(res){
        btn.disabled=false;
        if(res.ok&&res.j&&res.j.ok){
          showOk(cfg.successMessage||'');
          return;
        }
        var msg=(res.j&&res.j.error)||'Submit failed';
        if(errEl){errEl.style.display='block';errEl.textContent=msg;}
        else showErr(msg);
      })
      .catch(function(){
        btn.disabled=false;
        showErr('Network error');
      });
    });
  })
  .catch(function(){showErr('Unable to load form');});
})();`;
}
