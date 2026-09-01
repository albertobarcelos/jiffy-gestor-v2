use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;

mod bolha;
mod quadro_url;
mod update;
mod whatsapp;

pub use update::try_run_apply_pending;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            let janela = app
                .get_window("main")
                .or_else(|| app.get_webview("main").map(|wv| wv.window()));
            if let Some(window) = janela {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .manage(whatsapp::WhatsAppState::default())
        .invoke_handler(tauri::generate_handler![
            whatsapp::whatsapp_show,
            whatsapp::whatsapp_hide,
            whatsapp::whatsapp_reload,
            whatsapp::whatsapp_clear_session,
            whatsapp::whatsapp_status,
            whatsapp::whatsapp_chat_hint,
            whatsapp::whatsapp_inserir_texto,
            bolha::bolha_clique,
            bolha::bolha_arrastar,
        ])
        .on_window_event(|window, event| bolha::no_evento(window, event))
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                app.deep_link().register_all()?;
            }

            let url = quadro_url::url_do_quadro();
            eprintln!("Fredy a abrir {url}");
            let parsed: url::Url = url.parse().expect("GESTOR_PEDIDOS_URL inválida");
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
                .title("Fredy")
                .maximized(true)
                .resizable(true)
                .decorations(true)
                .user_agent(concat!(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ",
                    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Fredy/0.1.1 JiffyFlow/0.1.1"
                ))
                .initialization_script(
                    "Object.defineProperty(window,'__JIFFY_FLOW_KIOSK__',{value:true,enumerable:true});",
                )
                .build()?;

            if let Err(err) = bolha::abrir(app.handle()) {
                eprintln!("Fredy: bolha não criou ({err})");
            } else {
                eprintln!("Fredy: bolha criada (oculta até minimizar)");
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                if update::maybe_prompt_and_apply() {
                    handle.exit(0);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Fredy");
}
