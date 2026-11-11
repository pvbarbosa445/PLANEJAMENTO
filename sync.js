/* Sincronização bidirecional automática do Calendário Financeiro.
   Primeiro aparelho autenticado inicializa a nuvem com os dados locais.
   Os demais aparelhos recebem a nuvem automaticamente. Depois disso, cada
   gravação local é enviada e alterações remotas chegam por Supabase Realtime
   (com verificação periódica como contingência). */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ucnpiensihyrecivxlxo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aLiVvmDdGWZ4QJqtcstQKA_XO6VBncw';
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = id => document.getElementById(id);
const profiles = ['1', '2', '3'];
const dataKey = p => p === '2' ? 'mpf2' : p === '3' ? 'mpf3' : 'mpf1';
const stampKey = p => 'mpf_cloud_stamp_' + p;
const dirtyKey = p => 'mpf_cloud_dirty_' + p;
const backupKey = (uid, p) => 'mpf_pre_sync_backup_' + uid + '_' + p;
const readLocal = p => { try { return JSON.parse(localStorage.getItem(dataKey(p)) || 'null'); } catch { return null; } };
let session = null;
let recoveryMode = false;
let syncRoot = null;
let syncReady = false;
let syncUserId = null;
let syncStartPromise = null;
let channel = null;
let reloadPending = false;
let applyingRemote = false;
let pollTimer = null;
const pushTimers = new Map();

function appRedirect() { return window.location.origin + window.location.pathname; }
function status(message) { const el = $('cloud-sync-status'); if (el) el.textContent = message; }
function sameData(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } }

function placeSyncInDrawer() {
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
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
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
    <span>Sincronização automática</span>
  </button>
  <section id="cloud-sync-panel" aria-label="Sincronização">
    <h3>Sincronização entre aparelhos</h3>
    <p>Entre com o mesmo e-mail no celular e no computador. Depois da conexão inicial, alterações salvas em qualquer aparelho são enviadas e recebidas automaticamente. Não é necessário enviar ou baixar manualmente.</p>
    <div id="cloud-auth">
      <input id="cloud-email" type="email" autocomplete="email" placeholder="Seu e-mail">
      <input id="cloud-password" type="password" autocomplete="current-password" placeholder="Senha">
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
      <p>Este aparelho está conectado. As alterações serão sincronizadas automaticamente com os outros aparelhos conectados à mesma conta.</p>
      <button class="action alt" id="cloud-logout">Sair da conta</button>
    </div>
  </section>`;
  document.body.appendChild(root);
  root.querySelector('#cloud-sync-open').onclick = () => {
    const panel = $('cloud-sync-panel');
    const open = panel.classList.toggle('open');
    $('cloud-sync-open').setAttribute('aria-expanded', String(open));
  };
  $('cloud-login').onclick = () => auth('signInWithPassword');
  $('cloud-signup').onclick = () => auth('signUp');
  $('cloud-recovery').onclick = sendRecovery;
  $('cloud-update-password').onclick = updatePassword;
  $('cloud-logout').onclick = async () => { await sb.auth.signOut(); };

  // O aplicativo recria o conteúdo da aba; só movemos o bloco quando ele sai dela.
  const observer = new MutationObserver(() => {
    const drawer = $('drw');
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

function paint() {
  const authBox = $('cloud-auth'), resetBox = $('cloud-reset'), accountBox = $('cloud-account');
  if (!authBox || !resetBox || !accountBox) return;
  authBox.hidden = !!session || recoveryMode;
  resetBox.hidden = !recoveryMode;
  accountBox.hidden = !session || recoveryMode;
  if (session && !recoveryMode) {
    const user = $('cloud-user');
    if (user) user.textContent = 'Conectado: ' + session.user.email;
  }
}

async function auth(method) {
  const email = $('cloud-email').value.trim();
  const password = $('cloud-password').value;
  if (!email || password.length < 6) return status('Informe seu e-mail e uma senha com pelo menos 6 caracteres.');
  status('Conectando…');
  try {
    const args = { email, password };
    if (method === 'signUp') args.options = { emailRedirectTo: appRedirect() };
    const { data, error } = await sb.auth[method](args);
    if (error) throw error;
    if (method === 'signUp' && !data.session) status('Conta criada. Confirme o e-mail recebido para entrar.');
    else status('Login realizado. Preparando a sincronização automática…');
  } catch (error) { status('Erro: ' + (error.message || 'não foi possível autenticar')); }
}

async function sendRecovery() {
  const email = $('cloud-email').value.trim();
  if (!email) return status('Digite seu e-mail primeiro.');
  status('Solicitando e-mail para redefinir a senha…');
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appRedirect() });
    if (error) throw error;
    status('Solicitação enviada. Confira sua caixa de entrada e Spam.');
  } catch (error) { status('Erro ao solicitar recuperação: ' + (error.message || 'tente novamente')); }
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
    status('Senha alterada com sucesso.');
  } catch (error) { status('Não foi possível alterar a senha: ' + (error.message || 'link expirado')); }
}

async function getRemote(profile) {
  const { data, error } = await sb.from('finance_state')
    .select('payload,updated_at').eq('user_id', session.user.id).eq('profile_id', profile).maybeSingle();
  if (error) throw error;
  return data;
}
async function putRemote(profile, payload, updatedAt) {
  const { error } = await sb.from('finance_state').upsert({
    user_id: session.user.id, profile_id: profile, payload,
    updated_at: updatedAt || new Date().toISOString()
  }, { onConflict: 'user_id,profile_id' });
  if (error) throw error;
}
function safeBackupBeforeReplace(uid, profile, local) {
  if (!local) return;
  const k = backupKey(uid, profile);
  if (localStorage.getItem(k)) return;
  // Guarda uma cópia local anterior à primeira substituição, sem pedir exportação.
  localStorage.setItem(k, JSON.stringify({ saved_at: new Date().toISOString(), payload: local }));
}
function writeRemoteToLocal(profile, payload, updatedAt) {
  applyingRemote = true;
  try {
    nativeStorageSetItem.call(localStorage, dataKey(profile), JSON.stringify(payload));
    nativeStorageSetItem.call(localStorage, stampKey(profile), updatedAt || '');
    nativeStorageSetItem.call(localStorage, dirtyKey(profile), '');
  } finally { applyingRemote = false; }
}

async function pushProfile(profile) {
  if (!session || !syncReady) return;
  const local = readLocal(profile);
  if (!local) return;
  const pending = localStorage.getItem(dirtyKey(profile)) || new Date().toISOString();
  const remote = await getRemote(profile);
  if (remote && remote.updated_at && remote.updated_at > pending && !sameData(remote.payload, local)) {
    safeBackupBeforeReplace(session.user.id, profile, local);
    writeRemoteToLocal(profile, remote.payload, remote.updated_at);
    status('Outra alteração chegou primeiro. A versão local anterior foi guardada e a mais recente foi aplicada.');
    queueReload();
    return;
  }
  const updatedAt = new Date(Math.max(Date.now(), remote?.updated_at ? Date.parse(remote.updated_at) + 1 : 0)).toISOString();
  await putRemote(profile, local, updatedAt);
  localStorage.setItem(stampKey(profile), updatedAt);
  const stillSame = sameData(readLocal(profile), local);
  if (stillSame) localStorage.removeItem(dirtyKey(profile));
  status('Sincronizado automaticamente.');
}

function schedulePush(profile) {
  if (!session || !syncReady) return;
  const old = pushTimers.get(profile);
  if (old) clearTimeout(old);
  pushTimers.set(profile, setTimeout(async () => {
    pushTimers.delete(profile);
    try { await pushProfile(profile); }
    catch (error) { status('Falha ao enviar atualização: ' + (error.message || 'erro de conexão')); }
  }, 650));
}

function queueReload() {
  if (reloadPending) return;
  reloadPending = true;
  setTimeout(() => location.reload(), 450);
}

async function receiveRemote(row) {
  if (!session || !syncReady || !row || row.user_id !== session.user.id) return;
  const profile = String(row.profile_id);
  if (!profiles.includes(profile) || !row.payload) return;
  const local = readLocal(profile);
  if (sameData(local, row.payload)) {
    localStorage.setItem(stampKey(profile), row.updated_at || '');
    localStorage.removeItem(dirtyKey(profile));
    return;
  }
  const dirty = localStorage.getItem(dirtyKey(profile)) || '';
  if (dirty && row.updated_at && dirty > row.updated_at) {
    schedulePush(profile);
    return;
  }
  try { safeBackupBeforeReplace(session.user.id, profile, local); }
  catch (error) { status('Não foi possível guardar a cópia local antes de receber a atualização. Verifique o espaço do navegador.'); return; }
  writeRemoteToLocal(profile, row.payload, row.updated_at);
  status('Alteração recebida de outro aparelho. Atualizando o calendário…');
  queueReload();
}

async function pollRemote() {
  if (!session || !syncReady) return;
  for (const profile of profiles) {
    try {
      const remote = await getRemote(profile);
      if (remote) await receiveRemote({ ...remote, user_id: session.user.id, profile_id: profile });
    } catch (error) { status('Verificação de sincronização: ' + (error.message || 'sem conexão')); }
  }
}

async function initializeProfiles() {
  // Primeira conexão: se a nuvem estiver vazia, este aparelho estabelece a
  // cópia inicial. Nos demais aparelhos, o estado remoto é aplicado sozinho.
  // Uma alteração local feita offline e ainda pendente tem prioridade se for
  // mais recente que a versão remota; a cópia substituída fica preservada.
  let needsReload = false;
  for (const profile of profiles) {
    const local = readLocal(profile);
    const remote = await getRemote(profile);
    const dirty = localStorage.getItem(dirtyKey(profile)) || '';
    if (remote && remote.payload) {
      if (local && !sameData(local, remote.payload) && dirty && remote.updated_at && dirty > remote.updated_at) {
        const updatedAt = new Date(Math.max(Date.now(), Date.parse(remote.updated_at) + 1)).toISOString();
        await putRemote(profile, local, updatedAt);
        localStorage.setItem(stampKey(profile), updatedAt);
        localStorage.removeItem(dirtyKey(profile));
      } else {
        if (!sameData(local, remote.payload)) {
          safeBackupBeforeReplace(session.user.id, profile, local);
          needsReload = true;
        }
        writeRemoteToLocal(profile, remote.payload, remote.updated_at);
      }
    } else if (local) {
      const updatedAt = new Date().toISOString();
      await putRemote(profile, local, updatedAt);
      localStorage.setItem(stampKey(profile), updatedAt);
      localStorage.removeItem(dirtyKey(profile));
    }
  }
  return needsReload;
}

async function startSyncFor(userSession) {
  const uid = userSession?.user?.id;
  if (!uid) return;
  if (syncUserId === uid && syncReady) return;
  if (syncStartPromise && syncUserId === uid) return syncStartPromise;
  syncUserId = uid;
  syncReady = false;
  syncStartPromise = (async () => {
    status('Preparando os dados para sincronização automática…');
    try {
      const needsReload = await initializeProfiles();
      if (!session || session.user.id !== uid) return;
      syncReady = true;
      if (channel) await sb.removeChannel(channel);
      channel = sb.channel('finance-state-' + uid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_state', filter: 'user_id=eq.' + uid }, payload => {
          receiveRemote(payload.new).catch(error => status('Falha ao receber atualização: ' + error.message));
        })
        .subscribe(state => {
          if (state === 'SUBSCRIBED') status('Conectado. Alterações são sincronizadas automaticamente entre seus aparelhos.');
          else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') status('Conectado, mas o canal instantâneo está indisponível. A verificação automática continuará ativa.');
        });
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(pollRemote, 12000);
      status('Sincronização automática ativada neste aparelho.');
      if (needsReload) queueReload();
    } catch (error) {
      syncReady = false;
      status('Não foi possível iniciar a sincronização: ' + (error.message || 'erro desconhecido'));
    } finally { syncStartPromise = null; }
  })();
  return syncStartPromise;
}

function stopSync() {
  syncReady = false;
  syncUserId = null;
  if (channel) { sb.removeChannel(channel); channel = null; }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  for (const t of pushTimers.values()) clearTimeout(t);
  pushTimers.clear();
}

function handleSession(nextSession) {
  const previousUid = session?.user?.id || null;
  session = nextSession || null;
  paint();
  if (!session) {
    stopSync();
    return;
  }
  if (session.user.id !== previousUid || !syncReady) {
    const copy = session;
    setTimeout(() => startSyncFor(copy), 0);
  }
}

ensureUI();

// Intercepta toda gravação dos dados principais (Contas 1, 2 e 3), inclusive
// gravações diretas feitas pelas rotinas de transferência entre contas.
const nativeStorageSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (name, value) {
  nativeStorageSetItem.call(this, name, value);
  if (this === localStorage && !applyingRemote && (name === 'mpf1' || name === 'mpf2' || name === 'mpf3')) {
    const profile = name === 'mpf2' ? '2' : name === 'mpf3' ? '3' : '1';
    nativeStorageSetItem.call(localStorage, dirtyKey(profile), new Date().toISOString());
    schedulePush(profile);
  }
};

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
  if (event !== 'USER_UPDATED') setTimeout(() => handleSession(authSession), 0);
});

sb.auth.getSession().then(({ data, error }) => {
  if (error) status('Não foi possível verificar a sessão: ' + error.message);
  handleSession(data?.session || null);
  if (window.location.hash.includes('type=recovery')) {
    recoveryMode = true;
    revealRecoveryPanel();
    paint();
    status('Link de recuperação recebido. Defina sua nova senha abaixo.');
  }
});

window.addEventListener('online', () => {
  for (const profile of profiles) {
    if (localStorage.getItem(dirtyKey(profile))) schedulePush(profile);
  }
  pollRemote();
});
