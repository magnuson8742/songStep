use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const SESSION_DEBUG_DIRECTORY: &str = r"C:\Programs\songStep\debug";

struct SessionDebugState {
    file_path: PathBuf,
}

fn build_session_debug_file_path() -> PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    PathBuf::from(SESSION_DEBUG_DIRECTORY).join(format!("songstep-session-debug-{millis}.jsonl"))
}

fn append_jsonl_line(file_path: &PathBuf, line: &str) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(file_path)
        .map_err(|error| format!("open append file failed: {error}"))?;
    file.write_all(line.as_bytes())
        .map_err(|error| format!("write failed: {error}"))?;
    file.write_all(b"\n")
        .map_err(|error| format!("write newline failed: {error}"))?;
    file.flush()
        .map_err(|error| format!("flush failed: {error}"))?;
    file.sync_data()
        .map_err(|error| format!("sync_data failed: {error}"))?;
    Ok(())
}

fn initialize_session_debug_state() -> Result<SessionDebugState, String> {
    create_dir_all(SESSION_DEBUG_DIRECTORY)
        .map_err(|error| format!("create debug directory failed: {error}"))?;
    let file_path = build_session_debug_file_path();
    let startup_events = [
        r#"{"type":"session-start"}"#,
        r#"{"type":"backend-ready"}"#,
    ];
    for event in startup_events {
        append_jsonl_line(&file_path, event)?;
    }
    Ok(SessionDebugState { file_path })
}

#[tauri::command]
fn get_session_debug_log_path(state: tauri::State<'_, Mutex<SessionDebugState>>) -> Result<String, String> {
    let guard = state
        .lock()
        .map_err(|error| format!("session debug state lock failed: {error}"))?;
    Ok(guard.file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn append_session_debug_event(
    event_json: String,
    state: tauri::State<'_, Mutex<SessionDebugState>>,
) -> Result<(), String> {
    let guard = state
        .lock()
        .map_err(|error| format!("session debug state lock failed: {error}"))?;
    append_jsonl_line(&guard.file_path, event_json.trim_end_matches('\n')).map_err(|error| {
        eprintln!("append_session_debug_event failed: {error}");
        error
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let session_debug_state =
        initialize_session_debug_state().expect("failed to initialize backend session logger");
    tauri::Builder::default()
        .manage(Mutex::new(session_debug_state))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_session_debug_log_path,
            append_session_debug_event
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
