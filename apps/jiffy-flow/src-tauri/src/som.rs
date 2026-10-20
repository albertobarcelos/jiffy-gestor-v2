//! Som de pedido novo no Windows, fora do WebView.
//! HTMLAudio some quando a janela está oculta; PlaySound não.

const WAV: &[u8] = include_bytes!("../sounds/pedido-novo.wav");

pub const SCRIPT_INTERCEPTA_AUDIO: &str = include_str!("som_inject.js");

#[tauri::command]
pub fn tocar_som_pedido_novo() {
    if tocar() {
        eprintln!("Fredy: som nativo ok");
    } else {
        eprintln!("Fredy: som nativo falhou");
    }
}

#[cfg(windows)]
fn tocar() -> bool {
    const SND_ASYNC: u32 = 0x0001;
    const SND_NODEFAULT: u32 = 0x0002;
    const SND_MEMORY: u32 = 0x0004;

    #[link(name = "winmm")]
    extern "system" {
        fn PlaySoundA(psz_sound: *const u8, hmod: *mut std::ffi::c_void, fdw_sound: u32) -> i32;
    }

    unsafe {
        PlaySoundA(
            WAV.as_ptr(),
            std::ptr::null_mut(),
            SND_ASYNC | SND_MEMORY | SND_NODEFAULT,
        ) != 0
    }
}

#[cfg(not(windows))]
fn tocar() -> bool {
    false
}
