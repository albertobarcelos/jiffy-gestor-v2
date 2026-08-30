use super::manifest::{parse_manifest, CHANNEL_STABLE};
use super::semver::{below_min, is_newer};

#[derive(Debug, Clone)]
pub struct CheckResult {
    pub current: String,
    pub latest: String,
    pub newer: bool,
    pub channel: String,
    pub notes: String,
    pub url: String,
    pub sha256: String,
    pub reason: String,
}

pub fn check(manifest_url: &str, current: &str) -> Result<CheckResult, String> {
    let mut res = CheckResult {
        current: current.to_string(),
        latest: String::new(),
        newer: false,
        channel: CHANNEL_STABLE.to_string(),
        notes: String::new(),
        url: String::new(),
        sha256: String::new(),
        reason: String::new(),
    };
    let url = manifest_url.trim();
    if url.is_empty() {
        res.reason = "no manifestUrl configured; local version only".into();
        return Ok(res);
    }

    let body = ureq::get(url)
        .timeout(std::time::Duration::from_secs(15))
        .call()
        .map_err(|e| format!("fetch manifest: {e}"))?
        .into_string()
        .map_err(|e| format!("read manifest: {e}"))?;
    if body.len() > 1 << 20 {
        return Err("manifest too large".into());
    }
    let man = parse_manifest(body.as_bytes())?;
    res.latest = man.latest.version.clone();
    res.channel = man.channel.clone();
    res.notes = man.latest.notes.clone();
    res.url = man.latest.url.clone();
    res.sha256 = man.latest.sha256.clone();
    res.newer = is_newer(&man.latest.version, current)?;
    if !res.newer {
        res.reason = "already up to date".into();
    }
    if below_min(current, &man.latest.min_agent_version)? {
        return Err(format!(
            "this app {current} is below minAgentVersion {}; reinstall from the shop package",
            man.latest.min_agent_version
        ));
    }
    Ok(res)
}
