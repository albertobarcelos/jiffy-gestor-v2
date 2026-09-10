#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Triple {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

pub fn parse_semver(raw: &str) -> Result<Triple, String> {
    let mut s = raw.trim();
    if let Some(rest) = s.strip_prefix('v').or_else(|| s.strip_prefix('V')) {
        s = rest;
    }
    if let Some(i) = s.find(['-', '+']) {
        s = &s[..i];
    }
    let parts: Vec<&str> = s.split('.').collect();
    if parts.len() < 2 || parts.len() > 3 {
        return Err(format!("invalid semver {raw:?}"));
    }
    let major = parts[0]
        .parse::<u32>()
        .map_err(|_| format!("invalid semver major in {raw:?}"))?;
    let minor = parts[1]
        .parse::<u32>()
        .map_err(|_| format!("invalid semver minor in {raw:?}"))?;
    let patch = if parts.len() == 3 {
        parts[2]
            .parse::<u32>()
            .map_err(|_| format!("invalid semver patch in {raw:?}"))?
    } else {
        0
    };
    Ok(Triple {
        major,
        minor,
        patch,
    })
}

pub fn is_newer(latest: &str, current: &str) -> Result<bool, String> {
    Ok(parse_semver(latest)? > parse_semver(current)?)
}

pub fn below_min(current: &str, min: &str) -> Result<bool, String> {
    if min.trim().is_empty() {
        return Ok(false);
    }
    Ok(parse_semver(current)? < parse_semver(min)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compara_semver() {
        assert!(is_newer("1.0.1", "1.0.0").unwrap());
        assert!(!is_newer("1.0.0", "1.0.0").unwrap());
        assert!(!is_newer("1.0.0", "1.0.1").unwrap());
        assert!(is_newer("v1.2.0", "1.1.9").unwrap());
    }
}
