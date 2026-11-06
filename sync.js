/* Sincronização do Calendário Financeiro — HTML puro, sem build. */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ucnpiensihyrecivxlxo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aLiVvmDdGWZ4QJqtcstQKA_XO6VBncw';
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = id => document.getElementById(id);
let session = null;
let timer = null;
let busy = false;
let initialized = false;
let activated = false;
let recoveryMode = false;
let syncRoot = null;
const profiles = ['1', '2'];
const key = p => p === '2' ? 'mpf2' : 'mpf1';
const readLocal = p => { try { return JSON.parse(localStorage.getItem(key(p)) || 'null'); } catch { return null; } };
const writeLocal = (p, data) => localStorage.setItem(key(p), JSON.stringify(data));

function appRedirect() {
  // Usa o endereço publicado em que o usuário está, sem localhost fixo.
  return window.location.origin + window.location.pathname;
}

function placeSyncInDrawer() {
  // The app rebuilds #drw with innerHTML. Reattach this node only when it
  // was actually detached. Do not call paint() here: the observer watches
  // childList changes on body, and paint() writes cloud-user.textContent.
  // Doing that on every observer callback caused an endless mutation loop
  // and froze the page immediately after login.
  const root = syncRoot || $('cloud-sync-root');
  if (!root) return;
  const drawer = $('drw');
  if (!drawer) {
    if (root.parentElement !== document.body) document.body.appendChild(root);
    if (!root.hidden) root.hidden = true;
    return;
  }
  if (root.parentElement !== drawer) {
    const headings = Array.from(drawer.querySelectorAll('.dgt'));
    const displayHeading = headings.find(el => el.textContent.trim() === 'Exibição');
    const controls = displayHeading && displayHeading.nextElementSibling;
    if (controls && controls.classList.contains('dgr')) controls.after(root);
    else drawer.append(root);
  }
  if (root.hidden) root.hidden = false;
  if (recoveryMode) {
    const panel = $('cloud-sync-panel');
    if (panel && !panel.classList.contains('open')) panel.classList.add('open');
    const trigger = $('cloud-sync-open');
    if (trigger && trigger.getAttribute('aria-expanded') !== 'true') trigger.setAttribute('aria-expanded', 'true');
  }
}
function ensureUI() {
  if (syncRoot && syncRoot.isConnected) return;
  const root = document.createElement('section');
  root.id = 'cloud-sync-root';
  syncRoot = root;
  root.innerHTML = `<style>
    #cloud-sync-root{position:relative;display:block;width:100%;margin:10px 0 12px;font:14px system-ui;color:#f5f5f5}
    #cloud-sync-open{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:10px 12px;border:1px solid #3b4650;border-radius:10px;background:#202328;color:#A9D4F5;font:600 14px system-ui;text-align:left;cursor:pointer}
    #cloud-sync-open svg{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    #cloud-sync-panel{display:none;width:100%;max-height:55vh;overflow:auto;box-sizing:border-box;background:#1c1c20;border:1px solid #424249;border-radius:12px;padding:13px;margin-top:8px;box-shadow:0 8px 24px #0007}
    #cloud-sync-panel.open{display:block}#cloud-sync-panel h3{margin:0 0 8px;font-size:16px}
    #cloud-sync-panel p{color:#b8bdc6;font-size:12px;line-height:1.5}
    #cloud-sync-panel input{box-sizing:border-box;width:100%;padding:11px;margin:5px 0;background:#111;border:1px solid #444;border-radius:8px;color:white}
    #cloud-sync-panel button.action{width:100%;padding:10px;margin-top:7px;border-radius:8px;border:1px solid #A9D4F5;background:#A9D4F5;color:#101820;font-weight:700;cursor:pointer}
    #cloud-sync-panel button.alt{background:#25272b;color:#e8edf5;border-color:#555}
    #cloud-sync-panel button.link{background:transparent;color:#A9D4F5;border-color:transparent;text-decoration:underline;font-weight:600}
    #cloud-sync-status{font-size:12px;color:#A9D4F5;margin:8px 0;min-height:18px;overflow-wrap:anywhere}
  </style>
  <button id="cloud-sync-open" type="button" aria-expanded="false" aria-controls="cloud-sync-panel">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 16.5a4 4 0 0 0-1.5-7.7A6 6 0 0 0 7 7.2 4.5 4.5 0 0 0 6.5 16H9"/><path d="M12 12v9m-3-3 3 3 3-3"/></svg>
    <span>Sincronizar</span>
  </button>
  <section id="cloud-sync-panel" aria-label="Sincronização">
    <h3>Sincronização</h3>
    <p>Entre com o mesmo e-mail no celular e no computador. Seus dados locais permanecem salvos neste aparelho.</p>
    <div id="cloud-auth">
      <input id="cloud-email" type="email" autocomplete="email" placeholder="Seu e-mail">
      <input id="cloud-password" type="password" autocomplete="current-password" placeholder="Senha (mínimo 6 caracteres)">
      <button class="action" id="cloud-login">Entrar</button>
      <button class="action alt" id="cloud-signup">Criar conta</button>
      <button class="action link" id="cloud-recovery">Esqueci minha senha</button>
    </div>
    <div id="cloud-reset" hidden>
      <p>Digite sua nova senha duas vezes.</p>
      <input id="cloud-new-password" type="password" autocomplete="new-password" placeholder="Nova senha (mínimo 6 caracteres)">
      <input id="cloud-new-password2" type="password" autocomplete="new-password" placeholder="Repita a nova senha">
      <button class="action" id="cloud-update-password">Salvar nova senha</button>
    </div>
    <div id="cloud-sync-status" aria-live="polite"></div>
    <div id="cloud-account" hidden>
      <div id="cloud-user"></div>
      <button class="action" id="cloud-pull">Baixar dados da nuvem para este aparelho</button>
      <button class="action alt" id="cloud-push">Enviar dados deste aparelho para a nuvem</button>
      <button class="action alt" id="cloud-logout">Sair</button>
    </div>
  </section>`;
  // Attach before using document.getElementById for the controls above.
  // It stays hidden until the Planning drawer is present.
  document.body.appendChild(root);
  $('cloud-sync-panel');
  $('cloud-sync-open');
  root.querySelector('#cloud-sync-open').onclick = () => {
    const panel = $('cloud-sync-panel');
    const open = panel.classList.toggle('open');
    $('cloud-sync-open').setAttribute('aria-expanded', String(open));
  };
  $('cloud-login').onclick = () => auth('signInWithPassword');
  $('cloud-signup').onclick = () => auth('signUp');
  $('cloud-recovery').onclick = sendRecovery;
  $('cloud-update-password').onclick = updatePassword;
  $('cloud-pull').onclick = pullAll;
  $('cloud-push').onclick = pushAll;
  $('cloud-logout').onclick = async () => { await sb.auth.signOut(); };

  // O menu lateral é criado e reconstruído pelo app; recoloca o bloco sempre que necessário.
  const observer = new MutationObserver(() => {
    const drawer = $('drw');
    // Ignore all ordinary app mutations while the sync node is already in
    // the drawer. Reinsert only after the app has replaced drawer.innerHTML.
    if (drawer && root.parentElement !== drawer) placeSyncInDrawer();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  placeSyncInDrawer();
}

function revealRecoveryPanel() {
  if (typeof window.openDrw === 'function') window.openDrw();
  setTimeout(() => {
    placeSyncInDrawer();
    const panel = $('cloud-sync-panel');
    if (panel) panel.classList.add('open');
    const trigger = $('cloud-sync-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }, 0);
}

function status(message) {
  const el = $('cloud-sync-status');
  if (el) el.textContent = message;
}

function paint() {
  const authBox = $('cloud-auth');
  const resetBox = $('cloud-reset');
  const accountBox = $('cloud-account');
  if (!authBox || !resetBox || !accountBox) return;
  const authHidden = !!session || recoveryMode;
  const resetHidden = !recoveryMode;
  const accountHidden = !session || recoveryMode;
  if (authBox.hidden !== authHidden) authBox.hidden = authHidden;
  if (resetBox.hidden !== resetHidden) resetBox.hidden = resetHidden;
  if (accountBox.hidden !== accountHidden) accountBox.hidden = accountHidden;
  if (session && !recoveryMode) {
    const user = $('cloud-user');
    const label = 'Conectado: ' + session.user.email;
    // Avoid replacing the text node when the value is already current.
    if (user && user.textContent !== label) user.textContent = label;
  }
}

async function auth(method) {
  const email = $('cloud-email').value.trim();
  const password = $('cloud-password').value;
  if (!email || password.length < 6) return status('Informe e-mail e senha com pelo menos 6 caracteres.');
  status('Conectando…');
  try {
    const options = { email, password };
    if (method === 'signUp') options.options = { emailRedirectTo: appRedirect() };
    const { data, error } = await sb.auth[method](options);
    if (error) throw error;
    if (method === 'signUp' && !data.session) status('Conta criada. Confirme o e-mail recebido para entrar.');
    else status('Login realizado.');
  } catch (error) {
    status('Erro: ' + (error.message || 'não foi possível autenticar'));
  }
}

async function sendRecovery() {
  const email = $('cloud-email').value.trim();
  if (!email) return status('Digite seu e-mail no campo acima primeiro.');
  status('Solicitando e-mail para redefinir a senha…');
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appRedirect() });
    if (error) throw error;
    status('Solicitação enviada. Confira sua caixa de entrada e Spam. Use o link mais recente.');
  } catch (error) {
    status('Erro ao solicitar recuperação: ' + (error.message || 'tente novamente mais tarde'));
  }
}

async function updatePassword() {
  const password = $('cloud-new-password').value;
  const confirmation = $('cloud-new-password2').value;
  if (password.length < 6) return status('A nova senha precisa ter pelo menos 6 caracteres.');
  if (password !== confirmation) return status('As duas senhas não são iguais.');
  status('Salvando nova senha…');
  try {
    const { data, error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    recoveryMode = false;
    if (data.user && session) session.user = data.user;
    $('cloud-new-password').value = '';
    $('cloud-new-password2').value = '';
    paint();
    status('Senha alterada com sucesso. Você já pode continuar no aplicativo.');
  } catch (error) {
    status('Não foi possível alterar a senha: ' + (error.message || 'o link pode ter expirado. Solicite outro.'));
  }
}

async function getRemote(profile) {
  const { data, error } = await sb.from('finance_state').select('payload,updated_at').eq('profile_id', profile).maybeSingle();
  if (error) throw error;
  return data;
}

async function putRemote(profile, payload) {
  const { error } = await sb.from('finance_state').upsert({
    user_id: session.user.id,
    profile_id: profile,
    payload,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,profile_id' });
  if (error) throw error;
}

async function pullAll() {
  if (!session) return;
  status('Baixando dados…');
  try {
    for (const profile of profiles) {
      const remote = await getRemote(profile);
      if (remote && remote.payload) {
        writeLocal(profile, remote.payload);
        localStorage.setItem('mpf_cloud_stamp_' + profile, remote.updated_at || '');
      }
    }
    activated = true;
    status('Dados da nuvem aplicados. Recarregando…');
    setTimeout(() => location.reload(), 500);
  } catch (error) {
    status('Falha ao baixar: ' + error.message);
  }
}

async function pushAll() {
  if (!session) return;
  status('Enviando dados…');
  try {
    for (const profile of profiles) {
      const local = readLocal(profile);
      if (local) {
        await putRemote(profile, local);
        const remote = await getRemote(profile);
        if (remote) localStorage.setItem('mpf_cloud_stamp_' + profile, remote.updated_at || '');
      }
    }
    activated = true;
    status('Dados deste aparelho enviados. Sincronização automática ativada.');
  } catch (error) {
    status('Falha ao enviar: ' + error.message);
  }
}

function schedulePush() {
  if (!session || !initialized || !activated) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    if (busy) return;
    busy = true;
    try {
      const profile = localStorage.getItem('mpf_acc') === '2' ? '2' : '1';
      const local = readLocal(profile);
      if (local) {
        await putRemote(profile, local);
        const remote = await getRemote(profile);
        if (remote) localStorage.setItem('mpf_cloud_stamp_' + profile, remote.updated_at || '');
      }
      status('Sincronizado agora.');
    } catch (error) {
      status('Não sincronizou: ' + error.message);
    } finally {
      busy = false;
    }
  }, 1500);
}

async function pollRemote() {
  if (!session || !activated || busy || timer) return;
  busy = true;
  try {
    const profile = localStorage.getItem('mpf_acc') === '2' ? '2' : '1';
    const remote = await getRemote(profile);
    const seen = localStorage.getItem('mpf_cloud_stamp_' + profile) || '';
    if (remote && remote.updated_at && remote.updated_at > seen) {
      writeLocal(profile, remote.payload);
      localStorage.setItem('mpf_cloud_stamp_' + profile, remote.updated_at);
      status('Atualização recebida da nuvem. Recarregando…');
      setTimeout(() => location.reload(), 400);
    }
  } catch (error) {
    status('Falha ao verificar atualizações: ' + error.message);
  } finally {
    busy = false;
  }
}

ensureUI();
const originalSave = window.save;
if (typeof originalSave === 'function') {
  window.save = function (...args) {
    const result = originalSave.apply(this, args);
    schedulePush();
    return result;
  };
}

sb.auth.onAuthStateChange((event, authSession) => {
  if (event === 'PASSWORD_RECOVERY') {
    recoveryMode = true;
    session = authSession;
    revealRecoveryPanel();
    paint();
    status('Link reconhecido. Defina sua nova senha abaixo.');
    return;
  }
  if (event === 'SIGNED_OUT') recoveryMode = false;
  if (event !== 'USER_UPDATED') {
    session = authSession;
    initialized = !!authSession;
    if (!authSession) activated = false;
    paint();
  }
});

sb.auth.getSession().then(({ data, error }) => {
  if (error) status('Não foi possível verificar a sessão: ' + error.message);
  session = data.session;
  initialized = !!session;
  paint();
  // O evento PASSWORD_RECOVERY normalmente é emitido pelo SDK ao processar o link.
  // Este teste é uma proteção adicional para links que chegam com type=recovery no hash.
  if (window.location.hash.includes('type=recovery')) {
    recoveryMode = true;
    revealRecoveryPanel();
    paint();
    status('Link de recuperação recebido. Defina sua nova senha abaixo.');
  }
});

window.addEventListener('online', schedulePush);
setInterval(pollRemote, 10000);
