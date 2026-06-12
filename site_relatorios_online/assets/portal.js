let __portalConfigCache = null;
window.__portalModuloBase = window.__portalModuloBase || baseAtualPelaUrl();



const PORTAL_USUARIOS = {
  '00000000000': {
    nome: 'Marília Oliveira',
    cargo: 'Secretária Municipal de Saúde',
    perfil: 'Perfil executivo • visão total da rede',
    tipo: 'secretaria',
    senhas: ['123456','00123556']
  },
  '11111111111': {
    nome: 'Coordenadora do Almoxarifado',
    cargo: 'Coordenação de Estoque e Almoxarifados',
    perfil: 'Perfil operacional • estatísticas e estoque',
    tipo: 'coordenadora',
    senhas: ['123456','00123556']
  }
};

const PORTAL_ACESSOS = {
  secretaria: null,
  coordenadora: ['AC_Estoque','AC_Estatisticas','AH_Estoque','AH_Estatisticas']
};

function cpfSomenteNumeros(v){ return String(v||'').replace(/\D/g,'').slice(0,11); }
function mascaraCpf(v){
  v = cpfSomenteNumeros(v);
  if(v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  if(v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  if(v.length > 3) return v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
  return v;
}
function portalUsuarioAtual(){
  try{ return JSON.parse(sessionStorage.getItem('portal_valente_usuario')||'null'); }catch(e){ return null; }
}
function salvarPortalUsuario(u){ sessionStorage.setItem('portal_valente_usuario', JSON.stringify(u)); }
function limparPortalUsuario(){ sessionStorage.removeItem('portal_valente_usuario'); }
function usuarioPodeVerModulo(item, usuario){
  if(!usuario) return false;
  if(usuario.tipo === 'secretaria') return true;
  const permitidos = PORTAL_ACESSOS[usuario.tipo] || [];
  return permitidos.includes(item.id);
}
function portalLogin(){
  const cpfEl = document.getElementById('loginCpf');
  const senhaEl = document.getElementById('loginSenha');
  const msg = document.getElementById('loginMsg');
  const cpf = cpfSomenteNumeros(cpfEl?.value || '');
  const senha = String(senhaEl?.value || '').trim();
  const u = PORTAL_USUARIOS[cpf];
  if(!u || !u.senhas.includes(senha)){
    if(msg) msg.textContent = 'CPF ou senha inválidos.';
    return;
  }
  const usuario = {cpf, nome:u.nome, cargo:u.cargo, perfil:u.perfil, tipo:u.tipo};
  salvarPortalUsuario(usuario);
  abrirPortalDepoisLogin(usuario);
}
function portalLogout(){
  limparPortalUsuario();
  window.location.href = '/site_relatorios_online/';
}
function prepararMascaraCpfLogin(){
  const cpfEl = document.getElementById('loginCpf');
  if(!cpfEl || cpfEl.dataset.maskOk) return;
  cpfEl.dataset.maskOk = '1';
  cpfEl.addEventListener('input', ()=>{ cpfEl.value = mascaraCpf(cpfEl.value); });
  document.addEventListener('keydown', (e)=>{
    const loginScreen = document.getElementById('loginScreen');
    if(e.key === 'Enter' && loginScreen && !loginScreen.classList.contains('app-locked')) portalLogin();
  });
}
async function abrirPortalDepoisLogin(usuario){
  const loginScreen = document.getElementById('loginScreen');
  const app = document.getElementById('appLayout') || document.querySelector('.layout');
  if(loginScreen) loginScreen.classList.add('app-locked');
  if(app) app.classList.remove('app-locked');
  const moduloInicial = usuario.tipo === 'coordenadora' ? 'AC_Estoque' : 'VisaoGeral';
  const urlInicial = usuario.tipo === 'coordenadora' ? 'AlmoxerifadoCentral/Estoque/' : 'VisaoGeral/';
  await montarMenu(moduloInicial);
  if(document.querySelector('main.main')) await carregarPaginaModulo(urlInicial, moduloInicial, false);
}
function inicializarLoginPortal(moduloPadrao='VisaoGeral'){
  prepararMascaraCpfLogin();
  const usuario = portalUsuarioAtual();
  if(usuario){
    const loginScreen = document.getElementById('loginScreen');
    const app = document.getElementById('appLayout') || document.querySelector('.layout');
    if(loginScreen) loginScreen.classList.add('app-locked');
    if(app) app.classList.remove('app-locked');
    montarMenu(moduloPadrao);
  }
}
function exigirLoginPortal(){
  const usuario = portalUsuarioAtual();
  if(!usuario){
    if(!window.location.pathname.endsWith('/site_relatorios_online/') && !window.location.pathname.endsWith('/site_relatorios_online/index.html')){
      window.location.href = '/site_relatorios_online/';
    }
    return null;
  }
  return usuario;
}

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
  const usuario = portalUsuarioAtual();
  const mods=(c&&c.modulos)||[];
  const nome = usuario?.nome || c?.perfil_nome || 'Administrador Online';
  const cargo = usuario?.cargo || c?.perfil_desc || 'Administração do Portal Online';
  const perfil = usuario?.perfil || 'Administrador • visão total';
  let h=`<div class="brand"><div class="brand-mark">SV</div><div><h1>${c?.titulo||'Secretaria da Saúde'}</h1><p>${c?.subtitulo||'Prefeitura de Valente'}</p></div></div>
  <div class="profile-card"><strong>${nome}</strong><small>${cargo}</small><small>${perfil}</small></div>`;
  for(const m of mods){
    if(m.children){
      const filhosPermitidos = m.children.filter(x=>usuarioPodeVerModulo(x, usuario));
      if(!filhosPermitidos.length) continue;
      const grupoAtivo = filhosPermitidos.some(x=>x.id===a);
      h+=`<div class="menu-group ${grupoAtivo?'active-group':''}"><div class="menu-title">${m.titulo}<span>⌄</span></div><div class="menu-sub">`;
      for(const x of filhosPermitidos){
        h+=linkMenu({id:x.id,titulo:'• '+x.titulo,url:x.url}, a);
      }
      h+='</div></div>';
    }else{
      if(!usuarioPodeVerModulo(m, usuario)) continue;
      h+=linkMenu(m, a);
    }
  }
  h += `<button class="logout-btn" onclick="portalLogout()">Sair</button>`;
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
  const usuario = exigirLoginPortal();
  if(!usuario) return;
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
  const usuario = exigirLoginPortal();
  if(!usuario) return;
  if(ativo && !usuarioPodeVerModulo({id:ativo}, usuario)){ alert('Acesso não liberado para este módulo.'); return; }
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
