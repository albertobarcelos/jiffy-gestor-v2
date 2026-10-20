include!("src/env_arquivo.rs");

fn main() {
    carregar_env_local();
    println!("cargo:rerun-if-env-changed=GESTOR_PEDIDOS_URL");
    println!("cargo:rerun-if-env-changed=JIFFY_FLOW_R2_PUBLIC_BASE");
    println!("cargo:rerun-if-changed=../.env");
    println!("cargo:rerun-if-changed=.env");
    if let Ok(url) = std::env::var("GESTOR_PEDIDOS_URL") {
        let url = url.trim();
        if !url.is_empty() {
            println!("cargo:rustc-env=JIFFY_FLOW_BAKED_GESTOR_URL={url}");
        }
    }
    if let Ok(base) = std::env::var("JIFFY_FLOW_R2_PUBLIC_BASE") {
        let base = base.trim();
        if !base.is_empty() {
            println!("cargo:rustc-env=JIFFY_FLOW_R2_PUBLIC_BASE={base}");
        }
    }
    tauri_build::build()
}
