; Arranque com o Windows (HKCU). O Print é outro Setup — só oferecemos o download.

!define JIFFY_PRINT_SETUP_URL "https://pub-f30dc155e8504591ac42219788281ee9.r2.dev/JiffyPrint-setup.exe"

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "JiffyFlow" '"$INSTDIR\${MAINBINARYNAME}.exe"'
  MessageBox MB_YESNO "O Jiffy Flow precisa do Jiffy Print neste PC para imprimir os cupons.$\r$\n$\r$\nJá tem o Print instalado?$\r$\nSim = continuar. Não = abrir o download." IDYES skip_print
  ExecShell "open" "${JIFFY_PRINT_SETUP_URL}"
  skip_print:
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "JiffyFlow"
!macroend
