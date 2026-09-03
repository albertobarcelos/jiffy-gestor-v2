pub const URL_DEV_PADRAO: &str = "http://127.0.0.1:5000";
pub const PATH_LISTA_EMPRESAS: &str = "/pedidos/empresas";
pub const QUERY_GESTOR: &str = "gestor";

pub fn url_do_quadro() -> String {
    montar_url_quadro(&origem_efectiva())
}

fn origem_e_local(origem: &str) -> bool {
    let lower = origem.to_ascii_lowercase();
    lower.contains("127.0.0.1") || lower.contains("localhost")
}

/// Dev (`tauri:dev`) abre o Gestor local. `GESTOR_PEDIDOS_URL=https://app.jiffy.run`
/// no ambiente do PC não pode silenciar as alterações — senão o mascote é o site de produção.
/// Cloud no .exe de debug: `JIFFY_FLOW_USE_CLOUD_GESTOR=1`.
fn origem_efectiva() -> String {
    let from_env = std::env::var("GESTOR_PEDIDOS_URL")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    #[cfg(debug_assertions)]
    {
        if std::env::var("JIFFY_FLOW_USE_CLOUD_GESTOR").ok().as_deref() != Some("1") {
            return match &from_env {
                Some(u) if origem_e_local(u) => u.clone(),
                _ => URL_DEV_PADRAO.to_string(),
            };
        }
    }

    from_env.unwrap_or_else(origem_gravada)
}

/// URL gravada no `tauri build` da loja. Dev sem env continua em localhost.
fn origem_gravada() -> String {
    option_env!("JIFFY_FLOW_BAKED_GESTOR_URL")
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(URL_DEV_PADRAO)
        .to_string()
}

pub fn montar_url_quadro(origem: &str) -> String {
    let raw = origem.trim();
    let com_scheme = if raw.contains("://") {
        raw.to_string()
    } else {
        format!("http://{raw}")
    };

    let mut parsed = match url::Url::parse(&com_scheme) {
        Ok(u) => u,
        Err(_) => return format!("{URL_DEV_PADRAO}{PATH_LISTA_EMPRESAS}?{QUERY_GESTOR}"),
    };

    let path = parsed.path().trim_end_matches('/');
    if path.is_empty() || path == "/" || path == "/pedidos" {
        parsed.set_path(PATH_LISTA_EMPRESAS);
    }

    let ja_tem_gestor = parsed.query_pairs().any(|(k, _)| k == QUERY_GESTOR);
    if !ja_tem_gestor {
        let atual = parsed.query().unwrap_or("").to_string();
        if atual.is_empty() {
            parsed.set_query(Some(QUERY_GESTOR));
        } else {
            parsed.set_query(Some(&format!("{atual}&{QUERY_GESTOR}")));
        }
    }

    parsed.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn origem_sem_path_vira_lista_empresas() {
        assert_eq!(
            montar_url_quadro("http://localhost:5000"),
            "http://localhost:5000/pedidos/empresas?gestor"
        );
    }

    #[test]
    fn pedidos_sem_empresa_vira_lista() {
        assert_eq!(
            montar_url_quadro("http://localhost:5000/pedidos?gestor"),
            "http://localhost:5000/pedidos/empresas?gestor"
        );
    }

    #[test]
    fn nao_duplica_gestor() {
        assert_eq!(
            montar_url_quadro("http://localhost:5000/pedidos/empresas?gestor"),
            "http://localhost:5000/pedidos/empresas?gestor"
        );
    }

    #[test]
    fn preserva_outros_params() {
        assert_eq!(
            montar_url_quadro("https://gestor.homolog.jiffy.run/pedidos?x=1"),
            "https://gestor.homolog.jiffy.run/pedidos/empresas?x=1&gestor"
        );
    }

    #[test]
    fn origem_invalida_cai_no_dev() {
        assert_eq!(
            montar_url_quadro(":::"),
            "http://127.0.0.1:5000/pedidos/empresas?gestor"
        );
    }

    #[test]
    fn runtime_env_vence_origem_gravada() {
        std::env::set_var("JIFFY_FLOW_USE_CLOUD_GESTOR", "1");
        std::env::set_var("GESTOR_PEDIDOS_URL", "https://gestor.homolog.jiffy.run");
        assert_eq!(
            url_do_quadro(),
            "https://gestor.homolog.jiffy.run/pedidos/empresas?gestor"
        );
        std::env::remove_var("GESTOR_PEDIDOS_URL");
        std::env::remove_var("JIFFY_FLOW_USE_CLOUD_GESTOR");
    }

    #[test]
    fn debug_nao_abre_producao_por_env_esquecida() {
        std::env::remove_var("JIFFY_FLOW_USE_CLOUD_GESTOR");
        std::env::set_var("GESTOR_PEDIDOS_URL", "https://app.jiffy.run");
        assert_eq!(
            url_do_quadro(),
            "http://127.0.0.1:5000/pedidos/empresas?gestor"
        );
        std::env::remove_var("GESTOR_PEDIDOS_URL");
    }
}
