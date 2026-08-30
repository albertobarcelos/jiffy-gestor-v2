// Sem consola/CMD no Windows (debug e release). O quadro corre na janela Pedidos.
#![windows_subsystem = "windows"]

fn main() {
    nexsyn_pedidos_shell_lib::run()
}
