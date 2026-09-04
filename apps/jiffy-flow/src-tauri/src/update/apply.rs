use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

use sha2::{Digest, Sha256};

use super::check::CheckResult;

const MAX_BINARY_BYTES: u64 = 80 << 20;

pub fn apply_from_ui(res: &CheckResult) -> Result<(), String> {
    if !res.newer {
        return Ok(());
    }
    if res.url.trim().is_empty() {
        return Err("manifest latest.url is required to apply an update".into());
    }
    if res.sha256.trim().is_empty() {
        return Err("manifest latest.sha256 is required to apply an update".into());
    }

    let dest = running_exe()?;
    let tmp = download_binary(&res.url, &dest, &res.latest)?;
    if let Err(err) = verify_sha256(&tmp, &res.sha256) {
        let _ = fs::remove_file(&tmp);
        return Err(err);
    }
    start_pending_replace(std::process::id(), &tmp, &dest)?;
    Ok(())
}

/// Se o processo foi lançado como helper `apply-pending`, executa e sai.
pub fn try_run_apply_pending() -> bool {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) != Some("apply-pending") {
        return false;
    }
    let pid = flag_u32(&args, "--pid").unwrap_or(0);
    let from = flag_val(&args, "--from").unwrap_or_default();
    let dest = flag_val(&args, "--dest").unwrap_or_default();
    let relaunch = args.iter().any(|a| a == "--relaunch");
    if let Err(err) = run_pending_replace(pid, Path::new(&from), Path::new(&dest), relaunch) {
        let msg = format!("apply-pending: {err}");
        eprintln!("{msg}");
        super::alert_erro(&msg);
        std::process::exit(1);
    }
    true
}

fn flag_val<'a>(args: &'a [String], name: &str) -> Option<String> {
    args.windows(2).find(|w| w[0] == name).map(|w| w[1].clone())
}

fn flag_u32(args: &[String], name: &str) -> Option<u32> {
    flag_val(args, name)?.parse().ok()
}

fn running_exe() -> Result<PathBuf, String> {
    std::env::current_exe()
        .and_then(|p| p.canonicalize().or(Ok(p)))
        .map_err(|e| format!("current exe: {e}"))
}

fn updates_dir(dest: &Path) -> Result<PathBuf, String> {
    let parent = dest.parent().ok_or("exe sem pasta")?;
    let local = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| parent.to_path_buf());
    let dir = local.join("JIFFY_FLOW").join("updates");
    fs::create_dir_all(&dir).map_err(|e| format!("create updates dir: {e}"))?;
    Ok(dir)
}

fn download_binary(raw_url: &str, dest: &Path, ver: &str) -> Result<PathBuf, String> {
    let safe: String = ver
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let path = updates_dir(dest)?.join(format!("flow-{safe}.exe"));

    let resp = ureq::get(raw_url)
        .timeout(Duration::from_secs(120))
        .call()
        .map_err(|e| format!("download update: {e}"))?;
    if resp.status() != 200 {
        return Err(format!("download update: HTTP {}", resp.status()));
    }
    let reader = resp.into_reader();
    let mut buf = Vec::new();
    reader
        .take(MAX_BINARY_BYTES + 1)
        .read_to_end(&mut buf)
        .map_err(|e| format!("download update: {e}"))?;
    if buf.is_empty() {
        return Err("update binary is empty".into());
    }
    if buf.len() as u64 > MAX_BINARY_BYTES {
        return Err(format!("update binary exceeds {MAX_BINARY_BYTES} bytes"));
    }
    fs::write(&path, &buf).map_err(|e| format!("write update: {e}"))?;
    Ok(path)
}

fn verify_sha256(path: &Path, want_hex: &str) -> Result<(), String> {
    let want = want_hex.trim().to_ascii_lowercase();
    if want.is_empty() {
        return Err("sha256 is empty".into());
    }
    let mut f = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = f.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    let got = hex::encode(hasher.finalize());
    if got != want {
        return Err(format!("sha256 mismatch: got {got} want {want}"));
    }
    Ok(())
}

fn start_pending_replace(pid: u32, from: &Path, dest: &Path) -> Result<(), String> {
    let self_exe = running_exe()?;
    let mut cmd = Command::new(&self_exe);
    cmd.arg("apply-pending")
        .arg("--pid")
        .arg(pid.to_string())
        .arg("--from")
        .arg(from)
        .arg("--dest")
        .arg(dest)
        .arg("--relaunch")
        .current_dir(self_exe.parent().unwrap_or(Path::new(".")));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        const CREATE_BREAKAWAY_FROM_JOB: u32 = 0x01000000;
        cmd.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_BREAKAWAY_FROM_JOB);
    }
    cmd.spawn()
        .map_err(|e| format!("start update helper: {e}"))?;
    Ok(())
}

fn run_pending_replace(pid: u32, from: &Path, dest: &Path, relaunch: bool) -> Result<(), String> {
    if pid == 0 {
        return Err("apply-pending: pid is required".into());
    }
    if from.as_os_str().is_empty() || dest.as_os_str().is_empty() {
        return Err("apply-pending: --from and --dest are required".into());
    }
    wait_pid_gone(pid, Duration::from_secs(45))?;
    if let Some(dir) = dest.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let mut last = String::new();
    for _ in 0..15 {
        match replace_file(from, dest) {
            Ok(()) => {
                let _ = fs::remove_file(from);
                if relaunch {
                    return start_detached(dest);
                }
                return Ok(());
            }
            Err(e) => last = e,
        }
        std::thread::sleep(Duration::from_millis(300));
    }
    Err(last)
}

fn wait_pid_gone(pid: u32, timeout: Duration) -> Result<(), String> {
    let deadline = std::time::Instant::now() + timeout;
    while std::time::Instant::now() < deadline {
        if !pid_alive(pid) {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    if !pid_alive(pid) {
        return Ok(());
    }
    Err(format!("timed out waiting for process {pid} to exit"))
}

#[cfg(windows)]
fn pid_alive(pid: u32) -> bool {
    use windows_sys::Win32::Foundation::{CloseHandle, WAIT_TIMEOUT};
    use windows_sys::Win32::System::Threading::{OpenProcess, WaitForSingleObject};
    const SYNCHRONIZE: u32 = 0x0010_0000;
    unsafe {
        let h = OpenProcess(SYNCHRONIZE, 0, pid);
        if h.is_null() {
            return false;
        }
        let ev = WaitForSingleObject(h, 0);
        CloseHandle(h);
        ev == WAIT_TIMEOUT
    }
}

#[cfg(not(windows))]
fn pid_alive(_pid: u32) -> bool {
    false
}

fn replace_file(src: &Path, dst: &Path) -> Result<(), String> {
    let old = dst.with_extension("exe.old");
    let _ = fs::remove_file(&old);
    if dst.exists() {
        fs::rename(dst, &old).map_err(|e| format!("close the app before updating: {e}"))?;
    }
    let bytes = fs::read(src).map_err(|e| e.to_string())?;
    match fs::File::create(dst).and_then(|mut out| out.write_all(&bytes)) {
        Ok(()) => {
            let _ = fs::remove_file(&old);
            Ok(())
        }
        Err(e) => {
            let _ = fs::remove_file(dst);
            if old.exists() {
                let _ = fs::rename(&old, dst);
            }
            Err(e.to_string())
        }
    }
}

fn start_detached(exe: &Path) -> Result<(), String> {
    let mut cmd = Command::new(exe);
    cmd.current_dir(exe.parent().unwrap_or(Path::new(".")));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        const CREATE_BREAKAWAY_FROM_JOB: u32 = 0x01000000;
        cmd.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_BREAKAWAY_FROM_JOB);
    }
    cmd.spawn().map_err(|e| format!("relaunch flow: {e}"))?;
    Ok(())
}
