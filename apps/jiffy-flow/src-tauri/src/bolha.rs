//! Bolha flutuante + modos de segundo plano.
//! Minimizar → bolha + bandeja. Fechar (X) → só bandeja. Sair = menu da bandeja.

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{
    AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent,
};

static BOLHA_A_MOSTRA: AtomicBool = AtomicBool::new(false);
static VIGIA_LIGADA: AtomicBool = AtomicBool::new(false);

const MODO_VISIVEL: u8 = 0;
const MODO_BOLHA: u8 = 1;
const MODO_BANDEJA: u8 = 2;
static MODO: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(MODO_VISIVEL);

fn modo() -> u8 {
    MODO.load(Ordering::Relaxed)
}

pub const BOLHA_LABEL: &str = "bolha";
const LADO_PX: f64 = 56.0;
const HTML: &str = include_str!("../bolha.html");
const LOGO_PNG: &[u8] = include_bytes!("../../brand/icon.png");

#[derive(serde::Serialize, serde::Deserialize)]
struct PosSalva {
    x: i32,
    y: i32,
}

fn pasta_posicao(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_local_data_dir()
        .ok()
        .map(|p| p.join("bolha-posicao.json"))
}

fn ler_posicao(app: &AppHandle) -> Option<PhysicalPosition<i32>> {
    let path = pasta_posicao(app)?;
    let raw = fs::read_to_string(path).ok()?;
    let pos: PosSalva = serde_json::from_str(&raw).ok()?;
    Some(PhysicalPosition::new(pos.x, pos.y))
}

pub fn guardar_posicao(app: &AppHandle, pos: &PhysicalPosition<i32>) {
    let Some(path) = pasta_posicao(app) else {
        return;
    };
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    let _ = fs::write(
        path,
        serde_json::to_string(&PosSalva { x: pos.x, y: pos.y }).unwrap_or_default(),
    );
}

/// `get_webview_window("main")` fica `None` assim que existe o filho WhatsApp
/// (a janela deixa de ter um único webview com o mesmo label).
fn janela_main(app: &AppHandle) -> Option<Window> {
    app.get_window("main")
        .or_else(|| app.get_webview("main").map(|wv| wv.window()))
}

fn dentro_de_algum_monitor(app: &AppHandle, pos: PhysicalPosition<i32>) -> bool {
    let Some(main) = janela_main(app) else {
        return true;
    };
    let Ok(monitores) = main.available_monitors() else {
        return true;
    };
    monitores.iter().any(|m| {
        let p = m.position();
        let s = m.size();
        pos.x >= p.x
            && pos.y >= p.y
            && pos.x < p.x + s.width as i32
            && pos.y < p.y + s.height as i32
    })
}

fn posicao_padrao(app: &AppHandle) -> PhysicalPosition<i32> {
    let Some(main) = janela_main(app) else {
        return PhysicalPosition::new(40, 40);
    };
    let scale = main.scale_factor().unwrap_or(1.0);
    let lado = (LADO_PX * scale) as i32;
    if let (Ok(origem), Ok(tam)) = (main.outer_position(), main.outer_size()) {
        return PhysicalPosition::new(
            origem.x + tam.width as i32 - lado - 24,
            origem.y + tam.height as i32 - lado - 24,
        );
    }
    PhysicalPosition::new(40, 40)
}

fn url_da_bolha(app: &AppHandle) -> Result<url::Url, String> {
    // Mesma origem do Gestor: o invoke do Tauri (clique/arrasto) só funciona aí.
    // O mascote novo entra por `script_mascote_bolha`, não por file://.
    let quadro = crate::quadro_url::url_do_quadro();
    if let Ok(mut u) = url::Url::parse(&quadro) {
        u.set_path("/jiffy-flow-bolha.html");
        u.set_query(None);
        u.set_fragment(None);
        return Ok(u);
    }
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("jiffy-flow-bolha.png"), LOGO_PNG).map_err(|e| e.to_string())?;
    let path = dir.join("bolha.html");
    fs::write(&path, HTML).map_err(|e| e.to_string())?;
    url::Url::from_file_path(&path).map_err(|_| format!("URL da bolha: {}", path.display()))
}

fn encode_base64(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    let mut i = 0;
    while i + 3 <= data.len() {
        let n = u32::from(data[i]) << 16 | u32::from(data[i + 1]) << 8 | u32::from(data[i + 2]);
        out.push(T[((n >> 18) & 63) as usize] as char);
        out.push(T[((n >> 12) & 63) as usize] as char);
        out.push(T[((n >> 6) & 63) as usize] as char);
        out.push(T[(n & 63) as usize] as char);
        i += 3;
    }
    match data.len() - i {
        1 => {
            let n = u32::from(data[i]) << 16;
            out.push(T[((n >> 18) & 63) as usize] as char);
            out.push(T[((n >> 12) & 63) as usize] as char);
            out.push('=');
            out.push('=');
        }
        2 => {
            let n = u32::from(data[i]) << 16 | u32::from(data[i + 1]) << 8;
            out.push(T[((n >> 18) & 63) as usize] as char);
            out.push(T[((n >> 12) & 63) as usize] as char);
            out.push(T[((n >> 6) & 63) as usize] as char);
            out.push('=');
        }
        _ => {}
    }
    out
}

fn script_mascote_bolha() -> String {
    let b64 = encode_base64(LOGO_PNG);
    format!(
        "(function(){{function a(){{var i=document.querySelector('#bolha img');if(!i)return false;i.src='data:image/png;base64,{b64}';return true;}}if(a())return;document.addEventListener('DOMContentLoaded',a);window.addEventListener('load',a);var n=0,t=setInterval(function(){{if(a()||++n>40)clearInterval(t);}},50);}})();"
    )
}

/// Ícone do Flow: quadrado com cantos arredondados (não círculo).
#[cfg(windows)]
fn aplicar_mascara(janela: &tauri::WebviewWindow) {
    use windows_sys::Win32::Graphics::Gdi::{CreateRoundRectRgn, SetWindowRgn};
    let Ok(hwnd) = janela.hwnd() else {
        return;
    };
    let Ok(tam) = janela.outer_size() else {
        return;
    };
    let w = tam.width.max(1) as i32;
    let h = tam.height.max(1) as i32;
    let lado = w.min(h);
    if w != h {
        let _ = janela.set_size(tauri::PhysicalSize::new(lado as u32, lado as u32));
    }
    let arco = ((lado * 45) / 100).max(16);
    unsafe {
        let rgn = CreateRoundRectRgn(0, 0, lado, lado, arco, arco);
        if rgn.is_null() {
            return;
        }
        SetWindowRgn(hwnd.0 as _, rgn, 1);
    }
}

#[cfg(not(windows))]
fn aplicar_mascara(_janela: &tauri::WebviewWindow) {}

/// Janela fora de cena (minimizada, só bandeja, ou ainda a minimizar).
pub(crate) fn principal_fora_de_cena(app: &AppHandle) -> bool {
    modo() != MODO_VISIVEL || principal_minimizada(app)
}

pub(crate) fn principal_minimizada(app: &AppHandle) -> bool {
    let Some(main) = janela_main(app) else {
        return false;
    };
    #[cfg(windows)]
    {
        if let Ok(hwnd) = main.hwnd() {
            unsafe {
                use windows_sys::Win32::UI::WindowsAndMessaging::{GetAncestor, IsIconic, GA_ROOT};
                let raiz = GetAncestor(hwnd.0 as _, GA_ROOT);
                let alvo = if raiz.is_null() { hwnd.0 as _ } else { raiz };
                if IsIconic(alvo) != 0 {
                    return true;
                }
            }
        }
    }
    if main.is_minimized().unwrap_or(false) {
        return true;
    }
    if let Ok(tam) = main.inner_size() {
        if tam.width == 0 || tam.height == 0 {
            return true;
        }
    }
    false
}

#[cfg(windows)]
fn trazer_ao_topo(janela: &tauri::WebviewWindow) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
    };
    let Ok(hwnd) = janela.hwnd() else {
        return;
    };
    unsafe {
        SetWindowPos(
            hwnd.0 as _,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        );
    }
}

#[cfg(not(windows))]
fn trazer_ao_topo(_janela: &tauri::WebviewWindow) {}

fn esconder_principal(app: &AppHandle) {
    if let Some(main) = janela_main(app) {
        let _ = main.set_skip_taskbar(true);
        let _ = main.hide();
    }
}

fn sincronizar_whatsapp(app: &AppHandle) {
    let handle = app.clone();
    if modo() == MODO_VISIVEL {
        let _ = std::thread::spawn(move || crate::whatsapp::repor_host_se_visivel(&handle));
    } else {
        let _ = std::thread::spawn(move || crate::whatsapp::recolher_host(&handle));
    }
}

/// Janela de volta: some a bolha. Usado pelo clique, pela bandeja e pela 2.ª instância.
pub fn restaurar(app: &AppHandle) {
    MODO.store(MODO_VISIVEL, Ordering::Relaxed);
    if let Some(main) = janela_main(app) {
        let _ = main.set_skip_taskbar(false);
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();
    }
    aplicar_visibilidade(app);
    sincronizar_whatsapp(app);
}

/// Minimizar: bolha + bandeja, sem botão na barra de tarefas.
pub fn minimizar_para_bolha(app: &AppHandle) {
    if modo() == MODO_BOLHA {
        return;
    }
    MODO.store(MODO_BOLHA, Ordering::Relaxed);
    esconder_principal(app);
    aplicar_visibilidade(app);
    sincronizar_whatsapp(app);
    eprintln!("Fredy minimizado — bolha e bandeja");
}

/// Fechar no X: só bandeja, sem bolha. Sair de verdade é o menu da bandeja.
pub fn fechar_para_bandeja(app: &AppHandle) {
    MODO.store(MODO_BANDEJA, Ordering::Relaxed);
    esconder_principal(app);
    aplicar_visibilidade(app);
    sincronizar_whatsapp(app);
    eprintln!("Fredy na bandeja — sem bolha");
}

fn pagina_e_a_bolha(atual: &url::Url) -> bool {
    let path = atual.path();
    path.ends_with("/jiffy-flow-bolha.html") || path.ends_with("/bolha.html")
}

fn garantir_pagina_bolha(app: &AppHandle, bolha: &tauri::WebviewWindow) {
    let Ok(esperada) = url_da_bolha(app) else {
        return;
    };
    if let Ok(atual) = bolha.url() {
        if pagina_e_a_bolha(&atual) {
            return;
        }
    }
    eprintln!("Fredy bolha a recarregar HTML ({esperada})");
    let _ = bolha.navigate(esperada);
}

fn aplicar_visibilidade(app: &AppHandle) {
    let Some(bolha) = app.get_webview_window(BOLHA_LABEL) else {
        return;
    };
    let deve_mostrar = modo() == MODO_BOLHA;
    if deve_mostrar == BOLHA_A_MOSTRA.load(Ordering::Relaxed) {
        return;
    }
    BOLHA_A_MOSTRA.store(deve_mostrar, Ordering::Relaxed);
    if deve_mostrar {
        garantir_pagina_bolha(app, &bolha);
        let _ = bolha.show();
        let _ = bolha.set_always_on_top(true);
        aplicar_mascara(&bolha);
        trazer_ao_topo(&bolha);
        eprintln!("Fredy bolha visível");
    } else {
        let _ = bolha.hide();
        eprintln!("Fredy bolha oculta");
    }
}

fn ligar_vigia(app: &AppHandle) {
    if VIGIA_LIGADA.swap(true, Ordering::Relaxed) {
        return;
    }
    let handle = app.clone();
    std::thread::Builder::new()
        .name("jiffy-flow-bolha".into())
        .spawn(move || loop {
            std::thread::sleep(Duration::from_millis(200));
            aplicar_visibilidade(&handle);
        })
        .ok();
}

pub fn abrir(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window(BOLHA_LABEL).is_some() {
        ligar_vigia(app);
        aplicar_visibilidade(app);
        return Ok(());
    }
    let url = url_da_bolha(app)?;
    let pos = ler_posicao(app)
        .filter(|p| dentro_de_algum_monitor(app, *p))
        .unwrap_or_else(|| posicao_padrao(app));

    eprintln!("Fredy bolha URL {url}");
    let janela = WebviewWindowBuilder::new(app, BOLHA_LABEL, WebviewUrl::External(url))
        .initialization_script(script_mascote_bolha())
        .on_page_load(|wv, payload| {
            if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                let _ = wv.eval(script_mascote_bolha());
            }
        })
        .title("Fredy")
        .inner_size(LADO_PX, LADO_PX)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .closable(false)
        .decorations(false)
        .transparent(false)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false)
        .focused(false)
        .disable_drag_drop_handler()
        .build()
        .map_err(|e| e.to_string())?;

    let _ = janela.set_position(pos);
    aplicar_mascara(&janela);
    ligar_vigia(app);
    aplicar_visibilidade(app);
    eprintln!("Fredy bolha pronta em ({}, {})", pos.x, pos.y);
    Ok(())
}

pub fn no_evento(window: &tauri::Window, event: &WindowEvent) {
    match window.label() {
        "main" => match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                fechar_para_bandeja(window.app_handle());
            }
            WindowEvent::Resized(_) | WindowEvent::Moved(_) | WindowEvent::Focused(_) => {
                if modo() == MODO_VISIVEL && principal_minimizada(window.app_handle()) {
                    minimizar_para_bolha(window.app_handle());
                } else {
                    aplicar_visibilidade(window.app_handle());
                }
            }
            _ => {}
        },
        BOLHA_LABEL => match event {
            WindowEvent::Moved(pos) => guardar_posicao(window.app_handle(), pos),
            WindowEvent::Resized(_) => {
                if let Some(wv) = window.app_handle().get_webview_window(BOLHA_LABEL) {
                    aplicar_mascara(&wv);
                }
            }
            WindowEvent::CloseRequested { api, .. } => api.prevent_close(),
            _ => {}
        },
        _ => {}
    }
}

#[tauri::command]
pub async fn bolha_clique(app: AppHandle) -> Result<(), String> {
    eprintln!("Fredy bolha clique — restaurar");
    restaurar(&app);
    Ok(())
}

#[tauri::command]
pub async fn bolha_arrastar(app: AppHandle) -> Result<(), String> {
    app.get_webview_window(BOLHA_LABEL)
        .ok_or_else(|| "bolha ausente".to_string())?
        .start_dragging()
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    /// Espelha `Window::is_webview_window` do Tauri: um filho extra invalida essa API.
    fn webviews_formam_webview_window(labels: &[&str], label_janela: &str) -> bool {
        labels.iter().all(|l| *l == label_janela)
    }

    #[test]
    fn main_sozinha_ainda_e_webview_window() {
        assert!(webviews_formam_webview_window(&["main"], "main"));
    }

    #[test]
    fn filho_whatsapp_invalida_get_webview_window_main() {
        assert!(!webviews_formam_webview_window(
            &["main", "whatsapp"],
            "main"
        ));
    }

    #[test]
    fn bolha_continua_webview_window() {
        assert!(webviews_formam_webview_window(&["bolha"], "bolha"));
    }
}
