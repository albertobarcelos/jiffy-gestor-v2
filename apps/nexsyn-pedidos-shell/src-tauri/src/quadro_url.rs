pub const URL_DEV_PADRAO: &str = "http://localhost:5000";
pub const PATH_PEDIDOS: &str = "/pedidos";
pub const QUERY_GESTOR: &str = "gestor";

pub fn url_do_quadro() -> String {
    let origem = std::env::var("GESTOR_PEDIDOS_URL")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| URL_DEV_PADRAO.to_string());
    montar_url_quadro(&origem)
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
        Err(_) => return format!("{URL_DEV_PADRAO}{PATH_PEDIDOS}?{QUERY_GESTOR}"),
    };

    if parsed.path() == "/" || parsed.path().is_empty() {
        parsed.set_path(PATH_PEDIDOS);
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
    fn origem_sem_path_vira_pedidos_gestor() {
        assert_eq!(
            montar_url_quadro("http://localhost:5000"),
            "http://localhost:5000/pedidos?gestor"
        );
    }

    #[test]
    fn nao_duplica_gestor() {
        assert_eq!(
            montar_url_quadro("http://localhost:5000/pedidos?gestor"),
            "http://localhost:5000/pedidos?gestor"
        );
    }

    #[test]
    fn preserva_outros_params() {
        assert_eq!(
            montar_url_quadro("https://gestor.homolog.jiffy.run/pedidos?x=1"),
            "https://gestor.homolog.jiffy.run/pedidos?x=1&gestor"
        );
    }

    #[test]
    fn origem_invalida_cai_no_dev() {
        assert_eq!(
            montar_url_quadro(":::"),
            "http://localhost:5000/pedidos?gestor"
        );
    }
}
