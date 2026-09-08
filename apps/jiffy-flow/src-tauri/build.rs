fn main() {
    println!("cargo:rerun-if-env-changed=GESTOR_PEDIDOS_URL");
    println!("cargo:rerun-if-env-changed=JIFFY_FLOW_R2_PUBLIC_BASE");
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
