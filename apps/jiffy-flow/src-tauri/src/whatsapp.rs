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

/// Identidade da conversa aberta (número / título). Não lê mensagens.
const CHAT_HINT_JS: &str = r#"
(function () {
  function fromWid(s) {
    var m = String(s || '').match(/(\d{10,15})@c\.us/);
    return m ? m[1] : '';
  }
  function digitsPhone(s) {
    var d = String(s || '').replace(/\D/g, '');
    return d.length >= 10 && d.length <= 15 ? d : '';
  }
  var tel = '';
  var titulo = '';
  var sel = document.querySelector('#pane-side [aria-selected="true"]');
  if (sel) {
    tel = fromWid(sel.getAttribute('data-id') || '') || fromWid(sel.outerHTML);
    var t = sel.querySelector('[title]');
    titulo = (t && t.getAttribute('title')) || '';
  }
  var main = document.querySelector('#main header');
  if (main) {
    if (!tel) tel = fromWid(main.outerHTML);
    var ht = main.querySelector('span[title], [data-testid="conversation-info-header-chat-title"]');
    if (ht) {
      titulo = titulo || ht.getAttribute('title') || String(ht.textContent || '').trim();
    }
    if (!tel) tel = digitsPhone(titulo);
  }
  return { telefone: tel || null, titulo: titulo || null };
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
    let texto = raw.trim().trim_matches('"');
    let Ok(v) = serde_json::from_str::<serde_json::Value>(texto) else {
        if let Ok(inner) = serde_json::from_str::<String>(raw) {
            return parse_chat_hint(&inner);
        }
        return WhatsAppChatHint::default();
    };
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
