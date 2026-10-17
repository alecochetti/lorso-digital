/* =====================================================================
   Identidade visual LORSO · camada didática
   Depois de cada tela desenhada: ícone em degradê no cabeçalho e a caixa
   "Como usar esta tela", com os passos do Guia de preenchimento.
   Só aparência e ajuda. Não lê nem grava respostas, notas ou tarefas.
   ===================================================================== */
(function(){
  const telaAtual=()=>{
    if(typeof ui==='undefined') return null;
    if(ui.view==='fases'){
      if(ui.stage==='diagnostico') return ui.dstep||'base';
      if(ui.stage==='resultados') return 'resultados';
      if(ui.stage==='execucao') return 'execucao';
      if(ui.stage==='estrategia'||ui.stage==='otimizacao') return 'fases_auto';
      return null;
    }
    return {visao:'tela',plano:'plano',dores:'dores',sistemas:'sistemas',dre:'dre',pessoas:'pessoas'}[ui.view]||null;
  };
  const chave=k=>'cd.iv.como.'+k;
  const lerOculto=k=>{ let v=null; try{ v=localStorage.getItem(chave(k)); }catch(e){} if(v==='1') return true; if(v==='0') return false; return window.innerWidth<640; };
  const gravarOculto=(k,v)=>{ try{ localStorage.setItem(chave(k),v?'1':'0'); }catch(e){} };

  function caixaComo(k){
    if(typeof GUIA==='undefined') return '';
    const c=GUIA.find(x=>x.id===k); if(!c||!c.passos||!c.passos.length) return '';
    if(lerOculto(k)) return `<div class="iv-como-min" data-iv="como"><button type="button" data-ivc="como-abrir" data-v="${k}">Como usar esta tela</button></div>`;
    return `<section class="iv-como" data-iv="como" aria-label="Como usar esta tela"><div class="iv-como-h"><b>Como usar esta tela</b><span class="acts"><button type="button" class="btn sm" data-ivc="como-guia" data-v="${k}">Ver no guia</button><button type="button" class="btn sm" data-ivc="como-esconder" data-v="${k}">Entendi, esconder</button></span></div>
      <ol>${c.passos.slice(0,3).map(p=>`<li><span>${p}</span></li>`).join('')}</ol></section>`;
  }

  /* Cliente em modo leitura (ex.: reitoria): vê tudo, não altera nada. O banco também bloqueia. */
  const soLeitura=()=>typeof me!=='undefined'&&me&&typeof cur!=='undefined'&&cur&&((me.papel==='cliente'&&cur.clienteLeitura)||(me.papel==='equipe'&&cur.meuNivel==='leitura'));
  if(typeof touch==='function'){ const _touch=touch; touch=function(full){ if(soLeitura()){ try{ if(typeof snap!=='undefined'&&snap) cur=clone(snap); }catch(e){} if(typeof toast==='function') toast('Modo leitura: a LORSO mantém estes dados'); if(full&&typeof render==='function') render(); return; } return _touch(full); }; }
  function travarLeitura(main){ document.body.classList.toggle('so-leitura',!!soLeitura()); if(!soLeitura()) return;
    main.querySelectorAll('input,select,textarea').forEach(el=>{ if(['pes-busca','hr-pessoa','hr-de','hr-ate'].includes(el.id)||el.closest('.hr-filtros')) return; el.disabled=true; });
    if(!main.querySelector('.iv-leitura')){ main.insertAdjacentHTML('afterbegin','<p class="pz-aviso iv-leitura"><span class="i">!</span><span>Modo leitura. Os dados são mantidos pela equipe LORSO.</span></p>'); } }
  function enfeitar(){
    const main=document.getElementById('main'); if(!main) return;
    travarLeitura(main);
    const ph=main.querySelector('.ph'); if(!ph||ph.dataset.iv) return;
    ph.dataset.iv='1';
    const ic=document.querySelector('.sb .sn.on svg');
    if(ic&&ph.firstElementChild){ const box=document.createElement('span'); box.className='ph-ic'; box.setAttribute('aria-hidden','true'); box.appendChild(ic.cloneNode(true)); ph.firstElementChild.prepend(box); ph.classList.add('ivic'); }
    const k=telaAtual(); const html=k?caixaComo(k):'';
    if(html) ph.insertAdjacentHTML('afterend',html);
  }

  let agendado=false;
  const obs=new MutationObserver(()=>{ if(agendado) return; agendado=true; requestAnimationFrame(()=>{ agendado=false; enfeitar(); }); });
  function iniciar(){ const main=document.getElementById('main'); if(!main) return setTimeout(iniciar,200); obs.observe(main,{childList:true}); enfeitar(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-ivc]'); if(!b) return;
    const k=b.dataset.v, act=b.dataset.ivc;
    if(act==='como-guia'){ ui.guiaCap=k; if(typeof go==='function') go('guia'); return; }
    gravarOculto(k,act==='como-esconder');
    const alvo=b.closest('[data-iv="como"]'); if(alvo) alvo.outerHTML=caixaComo(k);
  });
})();
