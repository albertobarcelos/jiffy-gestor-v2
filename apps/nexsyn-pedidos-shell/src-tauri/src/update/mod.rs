//! Update do Jiffy Flow — mesmo contrato do Jiffy Print (`schemaVersion: 1`).
//!
//! Manifesto HTTP + SHA-256. Não substitui o `.exe` em execução: baixa, lança
//! `apply-pending` destacado, sai e o helper troca o ficheiro e relança.

mod apply;
mod check;
mod manifest;
mod semver;

pub use apply::{apply_from_ui, try_run_apply_pending};
pub use check::{check, CheckResult};
pub use manifest::{DEFAULT_MANIFEST_URL, ENV_MANIFEST_URL};

pub fn current_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

pub fn manifest_url() -> String {
    std::env::var(ENV_MANIFEST_URL)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_MANIFEST_URL.to_string())
}

/// Arranque: se houver versão mais nova, popup obrigatório e troca.
/// Falha de rede não bloqueia o quadro.
pub fn maybe_prompt_and_apply() -> bool {
    let url = manifest_url();
    let res = match check(&url, current_version()) {
        Ok(r) => r,
        Err(_) => return false,
    };
    if !res.newer {
        return false;
    }
    if !prompt_atualizar(&res) {
        return false;
    }
    match apply_from_ui(&res) {
        Ok(()) => true,
        Err(err) => {
            alert_erro(&format!("Não foi possível atualizar o Jiffy Flow.\n{err}"));
            false
        }
    }
}

fn prompt_atualizar(res: &CheckResult) -> bool {
    let notas = if res.notes.trim().is_empty() {
        String::new()
    } else {
        format!("\n\n{}", res.notes.trim())
    };
    let texto = format!(
        "Há uma nova versão do Jiffy Flow ({}). A atual é {}.{} \n\nAtualizar agora.",
        res.latest, res.current, notas
    );
    native_ok("Atualizar Jiffy Flow", &texto)
}

pub(crate) fn alert_erro(texto: &str) {
    let _ = native_ok("Jiffy Flow", texto);
}

#[cfg(windows)]
fn native_ok(titulo: &str, texto: &str) -> bool {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONINFORMATION, MB_OK};

    fn wide(s: &str) -> Vec<u16> {
        std::ffi::OsStr::new(s)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }
    let t = wide(titulo);
    let m = wide(texto);
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            m.as_ptr(),
            t.as_ptr(),
            MB_OK | MB_ICONINFORMATION,
        )
    };
    true
}

#[cfg(not(windows))]
fn native_ok(_titulo: &str, _texto: &str) -> bool {
    true
}
