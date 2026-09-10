// Sem consola/CMD no Windows (debug e release). O quadro corre na janela Fredy.
#![windows_subsystem = "windows"]

fn main() {
    if jiffy_flow_lib::try_run_apply_pending() {
        return;
    }
    jiffy_flow_lib::run()
}
