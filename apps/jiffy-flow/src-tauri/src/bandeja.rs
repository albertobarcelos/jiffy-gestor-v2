//! Ícone na bandeja do Windows. Clique esquerdo abre; o menu (botão direito) fecha de verdade.

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::App;

pub fn instalar(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let abrir = MenuItemBuilder::with_id("abrir", "Abrir").build(app)?;
    let fechar = MenuItemBuilder::with_id("fechar", "Fechar").build(app)?;
    let menu = MenuBuilder::new(app).item(&abrir).separator().item(&fechar).build()?;
    let icon = app
        .default_window_icon()
        .ok_or("ícone da bandeja ausente")?
        .clone();

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("Fredy")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "abrir" => crate::bolha::restaurar(app),
            "fechar" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::bolha::restaurar(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}
