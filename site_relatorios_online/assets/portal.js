let __portalConfigCache = null;
window.__portalModuloBase = window.__portalModuloBase || baseAtualPelaUrl();

function baseAtualPelaUrl(){
  const p = window.location.pathname;
  if(p.includes('/site_relatorios_online/')){
    if(p.endsWith('/')) return p;
    return p.replace(/\/index\.html$/,'/').replace(/\/[^\/]*$/,'/');
  }
  return '/site_relatorios_online/';
}

function normalizarUrlModulo(url){
  if(!url) return '/site_relatorios_online/';
  if(url.startsWith('http')) return url;
  if(url.startsWith('/site_relatorios_online/')) return url.endsWith('/') ? url : url + '/';
  return '/site_relatorios_online/' + url.replace(/^\/+/, '');
}

async function carregarConfig(){
  if(__portalConfigCache) return __portalConfigCache;
  try{
    const r=await fetch('/site_relatorios_online/portal_config.json?ts='+Date.now());
    if(r.ok){
      __portalConfigCache = await r.json();
      return __portalConfigCache;
    }
  }catch(e){}
  return null;
}

function linkMenu(item, ativo){
  const id = item.id || '';
  const url = item.url || '';
  return `<a class="menu-link ${ativo===id?'active':''}" data-module-id="${id}" data-url="${url}" href="/site_relatorios_online/${url}"><span>${item.titulo}</span><span>›</span></a>`;
}

function menuHTML(c,a){
  const mods=(c&&c.modulos)||[];
  let h=`<div class="brand"><div class="brand-mark">SV</div><div><h1>${c?.titulo||'Secretaria da Saúde'}</h1><p>${c?.subtitulo||'Prefeitura de Valente'}</p></div></div>
  <div class="profile-card"><strong>${c?.perfil_nome||'Administrador Online'}</strong><small>${c?.perfil_desc||'Administração do Portal Online'}</small><small>Administrador • visão total</small></div>`;
  for(const m of mods){
    if(m.children){
      const grupoAtivo = m.children.some(x=>x.id===a);
      h+=`<div class="menu-group ${grupoAtivo?'active-group':''}"><div class="menu-title">${m.titulo}<span>⌄</span></div><div class="menu-sub">`;
      for(const x of m.children){
        h+=linkMenu({id:x.id,titulo:'• '+x.titulo,url:x.url}, a);
      }
      h+='</div></div>';
    }else{
      h+=linkMenu(m, a);
    }
  }
  return h;
}

function ativarMenu(ativo){
  document.querySelectorAll('.menu-link').forEach(a=>{
    a.classList.toggle('active', a.dataset.moduleId === ativo);
  });
  document.querySelectorAll('.menu-group').forEach(g=>{
    g.classList.toggle('active-group', !!g.querySelector('.menu-link.active'));
  });
}

function conectarMenu(){
  document.querySelectorAll('.menu-link').forEach(a=>{
    if(a.dataset.spaOk) return;
    a.dataset.spaOk='1';
    a.addEventListener('click', async (ev)=>{
      ev.preventDefault();
      const url = a.dataset.url;
      const id = a.dataset.moduleId;
      await carregarPaginaModulo(url, id, true);
    });
  });
}

async function montarMenu(ativo){
  const c=await carregarConfig();
  const s=document.querySelector('.sidebar');
  if(s){
    s.innerHTML=menuHTML(c,ativo);
    conectarMenu();
  }
  ativarMenu(ativo);
}

function executarScriptsDoConteudo(container){
  const scripts = Array.from(container.querySelectorAll('script'));
  for(const antigo of scripts){
    const src = antigo.getAttribute('src') || '';
    if(src.includes('/assets/portal.js')){ antigo.remove(); continue; }
    const novo = document.createElement('script');
    for(const attr of antigo.attributes) novo.setAttribute(attr.name, attr.value);
    if(antigo.textContent) novo.textContent = antigo.textContent;
    antigo.replaceWith(novo);
  }
}

async function carregarPaginaModulo(url, ativo, push=true){
  const destino = normalizarUrlModulo(url);
  const htmlUrl = destino.endsWith('/') ? destino + 'index.html' : destino;
  const r = await fetch(htmlUrl + (htmlUrl.includes('?')?'&':'?') + 'ts=' + Date.now());
  if(!r.ok){ window.location.href = destino; return; }
  const texto = await r.text();
  const doc = new DOMParser().parseFromString(texto, 'text/html');
  const novoMain = doc.querySelector('main.main');
  const main = document.querySelector('main.main');
  if(!novoMain || !main){ window.location.href = destino; return; }

  window.__portalModuloBase = destino;
  document.title = doc.title || document.title;
  main.innerHTML = novoMain.innerHTML;
  ativarMenu(ativo);
  executarScriptsDoConteudo(main);
  if(push) history.pushState({url, ativo}, '', destino);
  window.scrollTo({top:0, behavior:'smooth'});
}

window.addEventListener('popstate', async (ev)=>{
  if(ev.state && ev.state.url){
    await carregarPaginaModulo(ev.state.url, ev.state.ativo, false);
  }else{
    window.location.reload();
  }
});

async function carregarDadosJson(){
  try{
    const base = window.__portalModuloBase || baseAtualPelaUrl();
    const r=await fetch(base.replace(/\/?$/, '/') + 'dados.json?ts='+Date.now());
    if(r.ok)return await r.json();
  }catch(e){}
  return {ok:false,itens:[],movimentacoes:[],estatisticas:{},resumo:{}};
}
