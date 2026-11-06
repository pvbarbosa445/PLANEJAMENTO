/* Sincronização do Calendário Financeiro — HTML puro, sem build. */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL = 'https://ucnpiensihyrecivxlxo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aLiVvmDdGWZ4QJqtcstQKA_XO6VBncw';
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const $ = id => document.getElementById(id);
let session = null, timer = null, busy = false, initialized = false, activated = false;
const profiles = ['1','2'];
const key = p => p === '2' ? 'mpf2' : 'mpf1';
const readLocal = p => { try { return JSON.parse(localStorage.getItem(key(p)) || 'null'); } catch { return null; } };
const writeLocal = (p, data) => localStorage.setItem(key(p), JSON.stringify(data));
function ensureUI(){
 if ($('cloud-sync-root')) return;
 const root=document.createElement('div'); root.id='cloud-sync-root'; root.innerHTML=`<style>
 #cloud-sync-root{position:fixed;right:14px;bottom:14px;z-index:10000;font:14px system-ui;color:#f5f5f5}#cloud-sync-open{border:1px solid #A9D4F5;background:#171b20;color:#A9D4F5;border-radius:22px;padding:10px 15px;font-weight:700;box-shadow:0 5px 22px #0008;cursor:pointer}#cloud-sync-panel{display:none;width:min(360px,calc(100vw - 28px));background:#1c1c20;border:1px solid #424249;border-radius:16px;padding:16px;margin-bottom:9px;box-shadow:0 12px 40px #000b}#cloud-sync-panel.open{display:block}#cloud-sync-panel h3{margin:0 0 8px;font-size:17px}#cloud-sync-panel p{color:#b8bdc6;font-size:12px;line-height:1.5}#cloud-sync-panel input{width:100%;padding:11px;margin:5px 0;background:#111;border:1px solid #444;border-radius:8px;color:white}#cloud-sync-panel button.action{width:100%;padding:10px;margin-top:7px;border-radius:8px;border:1px solid #A9D4F5;background:#A9D4F5;color:#101820;font-weight:700;cursor:pointer}#cloud-sync-panel button.alt{background:#25272b;color:#e8edf5;border-color:#555}#cloud-sync-status{font-size:12px;color:#A9D4F5;margin:8px 0;min-height:18px}
 </style><section id="cloud-sync-panel"><h3>Sincronização</h3><p>Entre com o mesmo e-mail no celular e no computador. Seus dados locais permanecem salvos neste aparelho.</p><div id="cloud-auth"><input id="cloud-email" type="email" autocomplete="email" placeholder="Seu e-mail"><input id="cloud-password" type="password" autocomplete="current-password" placeholder="Senha (mínimo 6 caracteres)"><button class="action" id="cloud-login">Entrar</button><button class="action alt" id="cloud-signup">Criar conta</button></div><div id="cloud-sync-status" aria-live="polite"></div><div id="cloud-account" hidden><div id="cloud-user"></div><button class="action" id="cloud-pull">Baixar dados da nuvem para este aparelho</button><button class="action alt" id="cloud-push">Enviar dados deste aparelho para a nuvem</button><button class="action alt" id="cloud-logout">Sair</button></div></section><button id="cloud-sync-open">☁ Sincronizar</button>`;
 document.body.append(root); $('cloud-sync-open').onclick=()=>$('cloud-sync-panel').classList.toggle('open');
 $('cloud-login').onclick=()=>auth('signInWithPassword'); $('cloud-signup').onclick=()=>auth('signUp'); $('cloud-pull').onclick=pullAll; $('cloud-push').onclick=pushAll; $('cloud-logout').onclick=async()=>{await sb.auth.signOut();};
}
function status(t){const n=$('cloud-sync-status');if(n)n.textContent=t;}
async function auth(method){const email=$('cloud-email').value.trim(),password=$('cloud-password').value;if(!email||password.length<6)return status('Informe e-mail e senha com pelo menos 6 caracteres.');status('Conectando…');try{const {data,error}=await sb.auth[method]({email,password});if(error)throw error;if(method==='signUp'&&!data.session)status('Conta criada. Confirme o e-mail recebido para entrar.');else status('Login realizado.');}catch(e){status('Erro: '+(e.message||'não foi possível autenticar'));}}
async function getRemote(p){const {data,error}=await sb.from('finance_state').select('payload,updated_at').eq('profile_id',p).maybeSingle();if(error)throw error;return data;}
async function putRemote(p,payload){const {error}=await sb.from('finance_state').upsert({user_id:session.user.id,profile_id:p,payload,updated_at:new Date().toISOString()},{onConflict:'user_id,profile_id'});if(error)throw error;}
async function pullAll(){if(!session)return;status('Baixando dados…');try{for(const p of profiles){const r=await getRemote(p);if(r&&r.payload){writeLocal(p,r.payload);localStorage.setItem('mpf_cloud_stamp_'+p,r.updated_at||'');}}activated=true;status('Dados da nuvem aplicados. Recarregando…');setTimeout(()=>location.reload(),500);}catch(e){status('Falha ao baixar: '+e.message);}}
async function pushAll(){if(!session)return;status('Enviando dados…');try{for(const p of profiles){const local=readLocal(p);if(local){await putRemote(p,local);const r=await getRemote(p);if(r)localStorage.setItem('mpf_cloud_stamp_'+p,r.updated_at||'');}}activated=true;status('Dados deste aparelho enviados. Sincronização automática ativada.');}catch(e){status('Falha ao enviar: '+e.message);}}
function schedulePush(){if(!session||!initialized||!activated)return;clearTimeout(timer);timer=setTimeout(async()=>{if(busy)return;busy=true;try{const p=localStorage.getItem('mpf_acc')==='2'?'2':'1';const local=readLocal(p);if(local){await putRemote(p,local);const r=await getRemote(p);if(r)localStorage.setItem('mpf_cloud_stamp_'+p,r.updated_at||'');}status('Sincronizado agora.');}catch(e){status('Não sincronizou: '+e.message);}finally{busy=false;}},1500);}
function paint(){if(!$('cloud-auth'))return;$('cloud-auth').hidden=!!session;$('cloud-account').hidden=!session;if(session){$('cloud-user').textContent='Conectado: '+session.user.email;status('Conta conectada. Na primeira utilização, escolha baixar a nuvem ou enviar os dados locais.');}}
async function pollRemote(){if(!session||!activated||busy||timer)return;busy=true;try{const p=localStorage.getItem('mpf_acc')==='2'?'2':'1';const r=await getRemote(p);const seen=localStorage.getItem('mpf_cloud_stamp_'+p)||'';if(r&&r.updated_at&&r.updated_at>seen){writeLocal(p,r.payload);localStorage.setItem('mpf_cloud_stamp_'+p,r.updated_at);status('Atualização recebida da nuvem. Recarregando…');setTimeout(()=>location.reload(),400);}}catch(e){status('Falha ao verificar atualizações: '+e.message);}finally{busy=false;}}
async function onSession(s){session=s;paint();initialized=!!s;activated=false;}
ensureUI();
const originalSave=window.save;
if(typeof originalSave==='function')window.save=function(...args){const result=originalSave.apply(this,args);schedulePush();return result;};
sb.auth.onAuthStateChange((_event,s)=>{setTimeout(()=>onSession(s),0);});
sb.auth.getSession().then(({data})=>onSession(data.session));
window.addEventListener('online',schedulePush);setInterval(pollRemote,10000);
