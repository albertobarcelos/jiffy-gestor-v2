use serde::Deserialize;

pub const MANIFEST_SCHEMA: u32 = 1;
pub const CHANNEL_STABLE: &str = "stable";
pub const ENV_MANIFEST_URL: &str = "JIFFY_FLOW_UPDATE_MANIFEST_URL";
pub const DEFAULT_MANIFEST_URL: &str =
    "https://pub-f30dc155e8504591ac42219788281ee9.r2.dev/jiffy-flow-update-manifest.stable.json";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    #[serde(default)]
    pub schema_version: u32,
    #[serde(default)]
    pub channel: String,
    pub latest: Release,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub version: String,
    #[serde(default)]
    pub min_agent_version: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub sha256: String,
    #[serde(default)]
    pub notes: String,
}

pub fn parse_manifest(raw: &[u8]) -> Result<Manifest, String> {
    let mut m: Manifest =
        serde_json::from_slice(raw).map_err(|e| format!("parse update manifest: {e}"))?;
    if m.schema_version == 0 {
        m.schema_version = 1;
    }
    if m.schema_version != MANIFEST_SCHEMA {
        return Err(format!(
            "unsupported manifest schemaVersion {}",
            m.schema_version
        ));
    }
    if m.channel.trim().is_empty() {
        m.channel = CHANNEL_STABLE.to_string();
    }
    if m.latest.version.trim().is_empty() {
        return Err("manifest latest.version is required".into());
    }
    Ok(m)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aceita_schema_1() {
        let raw = br#"{
          "schemaVersion": 1,
          "channel": "stable",
          "latest": {
            "version": "1.0.1",
            "url": "https://example.com/flow.exe",
            "sha256": "abc",
            "notes": "fix"
          }
        }"#;
        let m = parse_manifest(raw).unwrap();
        assert_eq!(m.latest.version, "1.0.1");
        assert_eq!(m.channel, "stable");
    }

    #[test]
    fn recusa_schema_novo() {
        let raw = br#"{"schemaVersion": 9, "latest": {"version": "1.0.0"}}"#;
        assert!(parse_manifest(raw).is_err());
    }
}
