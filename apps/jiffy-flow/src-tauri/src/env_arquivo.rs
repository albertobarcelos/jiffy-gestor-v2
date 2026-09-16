/// Lê `apps/jiffy-flow/.env` (e `.env` junto do `src-tauri`) sem sobrescrever o ambiente já definido.
pub fn carregar_env_local() {
    let mut caminhos = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        caminhos.push(cwd.join(".env"));
        caminhos.push(cwd.join("apps/jiffy-flow/.env"));
    }
    if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
        let dir = std::path::PathBuf::from(manifest);
        caminhos.push(dir.join(".env"));
        caminhos.push(dir.join("..").join(".env"));
    }

    for path in caminhos {
        if aplicar_arquivo_env(&path) {
            return;
        }
    }
}

fn aplicar_arquivo_env(path: &std::path::Path) -> bool {
    let Ok(texto) = std::fs::read_to_string(path) else {
        return false;
    };
    for linha in texto.lines() {
        let linha = linha.trim();
        if linha.is_empty() || linha.starts_with('#') {
            continue;
        }
        let Some((chave, valor)) = linha.split_once('=') else {
            continue;
        };
        let chave = chave.trim();
        if chave.is_empty() {
            continue;
        }
        if std::env::var_os(chave).is_some() {
            continue;
        }
        let valor = valor
            .trim()
            .trim_matches(|c| c == '"' || c == '\'')
            .to_string();
        std::env::set_var(chave, valor);
    }
    true
}
