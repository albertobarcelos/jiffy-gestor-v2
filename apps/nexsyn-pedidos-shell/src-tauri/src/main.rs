// Sem consola/CMD no Windows (debug e release). O quadro corre na janela Pedidos.
#![windows_subsystem = "windows"]

fn main() {
    if nexsyn_pedidos_shell_lib::try_run_apply_pending() {
        return;
    }
    nexsyn_pedidos_shell_lib::run()
}
