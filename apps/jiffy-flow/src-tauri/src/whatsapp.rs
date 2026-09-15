//! WebView persistente do WhatsApp Web. Sem leitura de conversas.
//! Pasta própria (`whatsapp-web`) para não misturar com a sessão do Gestor.
//!
//! Comandos são `async`: `Window::add_child` e vários métodos do WebView
//! postam na thread principal e esperam. Num comando síncrono isso deadlocka
//! (o IPC já corre nessa thread) e a página fica em «A abrir o WhatsApp Web…».

use std::sync::Mutex;
use tauri::webview::WebviewBuilder;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl, Window};

pub const WHATSAPP_LABEL: &str = "whatsapp";
const WHATSAPP_URL: &str = "https://web.whatsapp.com/";
const CHROME_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

pub struct WhatsAppState {
    loaded: Mutex<bool>,
    visible: Mutex<bool>,
}

impl Default for WhatsAppState {
    fn default() -> Self {
        Self {
            loaded: Mutex::new(false),
            visible: Mutex::new(false),
        }
    }
}

#[derive(serde::Deserialize)]
pub struct WhatsAppBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(serde::Serialize)]
pub struct WhatsAppStatus {
    pub visible: bool,
    pub loaded: bool,
}

#[derive(serde::Serialize, Default)]
pub struct WhatsAppChatHint {
    pub telefone: Option<String>,
    pub titulo: Option<String>,
}

/// Número da conversa aberta. Só o chat selecionado, o header dela ou os Dados do contato
/// (se o nome bater). Não varre a lista — senão pega o +55 de outro chat.
const CHAT_HINT_JS: &str = r#"
(function () {
  function fromWid(s) {
    var m = String(s || '').match(/(\d{10,15})(?::\d+)?@(?:c\.us|s\.whatsapp\.net)/);
    return m ? m[1] : '';
  }
  function soDigitosNacionais(s) {
    var d = String(s || '').replace(/\D/g, '');
    if (d.startsWith('55') && d.length >= 12 && d.length <= 13) d = d.slice(2);
    return d.length >= 10 && d.length <= 11 ? d : '';
  }
  function brPhoneFormatado(s) {
    var text = String(s || '').replace(/\u00a0/g, ' ').replace(/[\u2010-\u2015]/g, '-');
    var m = text.match(/\+55\s*\(?\s*(\d{2})\s*\)?\s*(\d{4,5})\s*-?\s*(\d{4})/);
    return m ? m[1] + m[2] + m[3] : '';
  }
  function brPhoneCurto(s) {
    var t = String(s || '');
    if (t.length > 48) return brPhoneFormatado(t);
    return brPhoneFormatado(t) || soDigitosNacionais(t);
  }
  function painelMisturouLista(text) {
    return /Pesquisar ou come|Search or start|Baixar o WhatsApp|Download (WhatsApp|the app)/i.test(text);
  }
  function nomeChave(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^\w\u00c0-\u024f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  var sel = document.querySelector('#pane-side [aria-selected="true"]');
  var titulo = '';
  var tel = '';
  if (sel) {
    tel = fromWid(sel.getAttribute('data-id') || '');
    var st = sel.querySelector('[title]');
    titulo = (st && st.getAttribute('title')) || '';
    if (!tel) tel = brPhoneCurto(titulo);
  }
  var main = document.querySelector('#main header');
  if (main) {
    if (!tel) tel = fromWid(main.getAttribute('data-id') || '') || fromWid(main.outerHTML);
    var titles = main.querySelectorAll('[title]');
    for (var i = 0; i < titles.length; i++) {
      var rawTitle = titles[i].getAttribute('title') || '';
      if (!titulo) titulo = rawTitle;
      if (!tel) tel = brPhoneCurto(rawTitle);
    }
    var ht = main.querySelector('[data-testid="conversation-info-header-chat-title"], span[title]');
    if (ht) {
      titulo = titulo || ht.getAttribute('title') || String(ht.textContent || '').trim();
    }
    if (!tel) tel = brPhoneCurto(String(main.innerText || '').slice(0, 80));
  }
  if (!tel) {
    var esperado = nomeChave(titulo);
    var headers = document.querySelectorAll('#app header, #app h1, #app [role="heading"]');
    for (var h = 0; h < headers.length; h++) {
      var rotulo = String(headers[h].textContent || '').replace(/\s+/g, ' ').trim();
      if (!/Dados do contato|Contact info|Info\. del contacto|Info contatto/i.test(rotulo)) continue;
      if (painelMisturouLista(rotulo)) continue;
      var box = headers[h].parentElement;
      for (var up = 0; up < 6 && box && box !== document.body; up++) {
        var txt = String(box.innerText || '');
        if (painelMisturouLista(txt) || txt.length > 2500) break;
        var p = brPhoneFormatado(txt);
        var nomePainel = nomeChave(txt.slice(0, 400));
        var nomeBate = !esperado || nomePainel.indexOf(esperado) !== -1;
        if (p && nomeBate) {
          tel = p;
          break;
        }
        box = box.parentElement;
      }
      if (tel) break;
    }
  }
  return JSON.stringify({ telefone: tel || null, titulo: titulo || null });
})()
"#;

pub fn pasta_dados_whatsapp(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|p| p.join("whatsapp-web"))
        .map_err(|e| e.to_string())
}

fn marcar_carregado(app: &AppHandle, valor: bool) {
    if let Some(state) = app.try_state::<WhatsAppState>() {
        if let Ok(mut g) = state.loaded.lock() {
            *g = valor;
        }
    }
}

fn marcar_visivel(app: &AppHandle, valor: bool) {
    if let Some(state) = app.try_state::<WhatsAppState>() {
        if let Ok(mut g) = state.visible.lock() {
            *g = valor;
        }
    }
}

fn janela_principal(app: &AppHandle) -> Result<Window, String> {
    if let Some(w) = app.get_window("main") {
        return Ok(w);
    }
    if let Some(wv) = app.get_webview("main") {
        return Ok(wv.window());
    }
    if let Some(foco) = app.get_focused_window() {
        return Ok(foco);
    }
    let janelas: Vec<String> = app.windows().keys().cloned().collect();
    let webviews: Vec<String> = app.webviews().keys().cloned().collect();
    Err(format!(
        "janela principal ausente (janelas={janelas:?} webviews={webviews:?})"
    ))
}

fn garantir_webview(app: &AppHandle, bounds: &WhatsAppBounds) -> Result<(), String> {
    if app.get_webview(WHATSAPP_LABEL).is_some() {
        return Ok(());
    }

    let window = janela_principal(app)?;
    let dir = pasta_dados_whatsapp(app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let url: url::Url = WHATSAPP_URL
        .parse()
        .map_err(|e: url::ParseError| e.to_string())?;
    let handle = app.clone();
    let builder = WebviewBuilder::new(WHATSAPP_LABEL, WebviewUrl::External(url))
        .user_agent(CHROME_UA)
        .data_directory(dir)
        .focused(false)
        .on_page_load(move |_wv, payload| {
            if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                marcar_carregado(&handle, true);
            }
        });

    let x = bounds.x.max(0.0);
    let y = bounds.y.max(0.0);
    let w = bounds.width.max(80.0);
    let h = bounds.height.max(80.0);

    eprintln!("Fredy a criar WebView WhatsApp em ({x}, {y}) {w}x{h}");
    window
        .add_child(builder, LogicalPosition::new(x, y), LogicalSize::new(w, h))
        .map_err(|e| format!("não foi possível criar o WhatsApp Web: {e}"))?;
    eprintln!("Fredy WebView WhatsApp criado");
    Ok(())
}

/// Esconde o host nativo sem alterar o pedido do Gestor (continua “visível”
/// para repor quando a janela principal voltar). Evita que o WebView2 cubra a bolha.
pub fn recolher_host(app: &AppHandle) {
    if let Some(wv) = app.get_webview(WHATSAPP_LABEL) {
        let _ = wv.hide();
    }
}

pub fn repor_host_se_visivel(app: &AppHandle) {
    if crate::bolha::principal_fora_de_cena(app) {
        return;
    }
    let quer = app
        .try_state::<WhatsAppState>()
        .and_then(|s| s.visible.lock().ok().map(|g| *g))
        .unwrap_or(false);
    if !quer {
        return;
    }
    if let Some(wv) = app.get_webview(WHATSAPP_LABEL) {
        let _ = wv.show();
    }
}

#[tauri::command]
pub async fn whatsapp_show(app: AppHandle, bounds: WhatsAppBounds) -> Result<(), String> {
    eprintln!(
        "Fredy WhatsApp a mostrar ({}, {}) {}x{}",
        bounds.x, bounds.y, bounds.width, bounds.height
    );
    garantir_webview(&app, &bounds)?;
    marcar_visivel(&app, true);
    if crate::bolha::principal_fora_de_cena(&app) {
        eprintln!("Fredy WhatsApp show ignorado (principal minimizada)");
        recolher_host(&app);
        return Ok(());
    }
    let wv = app
        .get_webview(WHATSAPP_LABEL)
        .ok_or_else(|| "webview WhatsApp ausente".to_string())?;
    let w = bounds.width.max(80.0);
    let h = bounds.height.max(80.0);
    wv.set_position(LogicalPosition::new(bounds.x.max(0.0), bounds.y.max(0.0)))
        .map_err(|e| e.to_string())?;
    wv.set_size(LogicalSize::new(w, h))
        .map_err(|e| e.to_string())?;
    wv.show().map_err(|e| e.to_string())?;
    eprintln!(
        "Fredy WhatsApp visível em ({}, {}) {w}x{h}",
        bounds.x, bounds.y
    );
    Ok(())
}

#[tauri::command]
pub async fn whatsapp_hide(app: AppHandle) -> Result<(), String> {
    if let Some(wv) = app.get_webview(WHATSAPP_LABEL) {
        wv.hide().map_err(|e| e.to_string())?;
    }
    marcar_visivel(&app, false);
    Ok(())
}

#[tauri::command]
pub async fn whatsapp_reload(app: AppHandle) -> Result<(), String> {
    let bounds = WhatsAppBounds {
        x: 0.0,
        y: 48.0,
        width: 800.0,
        height: 600.0,
    };
    garantir_webview(&app, &bounds)?;
    marcar_carregado(&app, false);
    let wv = app
        .get_webview(WHATSAPP_LABEL)
        .ok_or_else(|| "webview WhatsApp ausente".to_string())?;
    wv.reload().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn whatsapp_clear_session(app: AppHandle) -> Result<(), String> {
    if let Some(wv) = app.get_webview(WHATSAPP_LABEL) {
        let _ = wv.hide();
        let _ = wv.clear_all_browsing_data();
        let _ = wv.close();
    }
    marcar_carregado(&app, false);
    marcar_visivel(&app, false);
    let dir = pasta_dados_whatsapp(&app)?;
    if dir.exists() {
        std::thread::sleep(std::time::Duration::from_millis(200));
        if let Err(e) = std::fs::remove_dir_all(&dir) {
            return Err(format!("não foi possível limpar a sessão: {e}"));
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn whatsapp_chat_hint(app: AppHandle) -> WhatsAppChatHint {
    let Some(wv) = app.get_webview(WHATSAPP_LABEL) else {
        return WhatsAppChatHint::default();
    };
    let (tx, rx) = std::sync::mpsc::channel::<String>();
    if wv
        .eval_with_callback(CHAT_HINT_JS, move |raw| {
            let _ = tx.send(raw);
        })
        .is_err()
    {
        return WhatsAppChatHint::default();
    }
    let Ok(raw) = rx.recv_timeout(std::time::Duration::from_millis(1500)) else {
        return WhatsAppChatHint::default();
    };
    parse_chat_hint(&raw)
}

fn parse_chat_hint(raw: &str) -> WhatsAppChatHint {
    let texto = raw.trim();
    let Ok(v) = serde_json::from_str::<serde_json::Value>(texto) else {
        return WhatsAppChatHint::default();
    };
    if let Some(inner) = v.as_str() {
        return parse_chat_hint(inner);
    }
    let tel = v
        .get("telefone")
        .and_then(|x| x.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let titulo = v
        .get("titulo")
        .and_then(|x| x.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    WhatsAppChatHint {
        telefone: tel,
        titulo,
    }
}

#[cfg(test)]
mod tests {
    use super::parse_chat_hint;

    #[test]
    fn le_hint_json() {
        let h = parse_chat_hint(r#"{"telefone":"5565992934536","titulo":"Alberto"}"#);
        assert_eq!(h.telefone.as_deref(), Some("5565992934536"));
        assert_eq!(h.titulo.as_deref(), Some("Alberto"));
    }

    #[test]
    fn le_hint_json_embutido_em_string() {
        let h = parse_chat_hint(r#""{\"telefone\":\"6598138428\",\"titulo\":\"Meu Amor\"}""#);
        assert_eq!(h.telefone.as_deref(), Some("6598138428"));
        assert_eq!(h.titulo.as_deref(), Some("Meu Amor"));
    }
}

#[tauri::command]
pub async fn whatsapp_inserir_texto(app: AppHandle, texto: String) -> Result<bool, String> {
    let Some(wv) = app.get_webview(WHATSAPP_LABEL) else {
        return Err("WhatsApp ainda não está aberto".into());
    };
    let payload = serde_json::to_string(&texto).map_err(|e| e.to_string())?;
    let js = format!(
        "(function(){{\
            var t = {payload};\
            var box = document.querySelector('#main footer [contenteditable=\"true\"]');\
            if (!box) return false;\
            box.focus();\
            try {{ document.execCommand('insertText', false, t); return true; }}\
            catch (e) {{ return false; }}\
        }})()"
    );
    let (tx, rx) = std::sync::mpsc::channel::<String>();
    wv.eval_with_callback(js, move |raw| {
        let _ = tx.send(raw);
    })
    .map_err(|e| e.to_string())?;
    let Ok(raw) = rx.recv_timeout(std::time::Duration::from_millis(1500)) else {
        return Ok(false);
    };
    Ok(raw.to_ascii_lowercase().contains("true"))
}

#[tauri::command]
pub fn whatsapp_status(app: AppHandle) -> WhatsAppStatus {
    let visible = app
        .try_state::<WhatsAppState>()
        .and_then(|s| s.visible.lock().ok().map(|g| *g))
        .unwrap_or(false);
    let loaded = app
        .try_state::<WhatsAppState>()
        .and_then(|s| s.loaded.lock().ok().map(|g| *g))
        .unwrap_or(false);
    WhatsAppStatus { visible, loaded }
}
