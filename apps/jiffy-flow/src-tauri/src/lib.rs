use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;

mod quadro_url;
mod update;

pub use update::try_run_apply_pending;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                app.deep_link().register_all()?;
            }

            let url = quadro_url::url_do_quadro();
            let parsed: url::Url = url.parse().expect("GESTOR_PEDIDOS_URL inválida");
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
                .title("Pedidos")
                .maximized(true)
                .resizable(true)
                .decorations(true)
                .build()?;

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                if update::maybe_prompt_and_apply() {
                    handle.exit(0);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Jiffy Flow");
}
