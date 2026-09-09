---
title: "Aplicaciones en sandbox: cuando el aislamiento deja la base de datos sin .pgpass"
description: "Cómo llevé OmniDB al sandbox de macOS y me topé con un archivo .pgpass inaccesible — y cómo debería ser una concesión de permisos bajo demanda segura en macOS, Linux y Windows."
locale: "es"
categories: ["PostgreSQL", "Software Engineering"]
date: 2026-09-09
tags: ["sandbox", "macOS", "Linux", "Windows", "seguridad", "PostgreSQL", "OmniDB", "Flatpak", "MSIX"]
draft: false
translation_id: "2026-09-09_1"
---

Como desarrolladores queremos hacer aplicaciones seguras. Uno de los mejores pasos para proteger al usuario es encerrar la aplicación en un sandbox (un entorno aislado). El sandbox garantiza que, incluso si se encuentra una vulnerabilidad en la aplicación, un atacante no pueda recorrer libremente el disco del usuario ni leer datos sensibles de otros programas.

Pero la seguridad tiene su precio, en forma de obstáculos tanto para el desarrollador como para el usuario. Hace poco llevé OmniDB al sandbox en macOS y muy rápidamente me topé con un problema clásico: de repente, la aplicación no podía cargar las contraseñas de mis bases de datos PostgreSQL.

---

## 1. Una historia real: ¿dónde está mi `.pgpass` y por qué está bien que esté oculto?

PostgreSQL usa habitualmente el archivo `~/.pgpass` guardado en el directorio personal del usuario. Ese archivo contiene credenciales en texto plano: hosts, puertos, bases de datos, usuarios y contraseñas.

En cuanto encerré [OmniDB](https://www.omnidb.net) en el sandbox de macOS, el sistema cortó estrictamente el acceso de la aplicación al directorio personal. OmniDB no podía conectarse a la base de datos, porque sencillamente no veía `.pgpass`.

## 2. ¿Por qué el acceso «solo bajo demanda» es en realidad una victoria para la seguridad?

A primera vista era una complicación, pero visto en retrospectiva es una excelente medida de seguridad. El archivo `.pgpass` suele contener decenas de contraseñas de bases de datos de producción y de desarrollo. ¿De verdad quiere que cualquier aplicación descargada tenga acceso automático a semejante tesoro? Desde luego que no. Si una aplicación no verificada obtuviera acceso completo a ese archivo, podría enviar todas sus contraseñas fuera sin que usted lo supiera.

## 3. ¿Cómo lo resolví en macOS?

En lugar de pedir un permiso amplio a todo el disco (lo que niega el sentido del sandbox), elegí una solución guiada por el usuario y por el principio de mínimo privilegio:

1. Si OmniDB intenta conectarse a una base de datos y falla por falta de permisos sobre `.pgpass`, la interfaz muestra un mensaje de error claro.
2. Ese mensaje incluye un botón para conceder permisos.
3. Al pulsarlo se abre un diálogo del sistema (`NSOpenPanel`) donde el usuario selecciona manualmente el archivo `.pgpass` (o confirma el acceso a él).
4. macOS entrega a la aplicación un llamado Security Scoped Bookmark — una excepción gracias a la cual la aplicación obtiene acceso permanente y legítimo a ese archivo concreto.

El usuario sabe qué le está dando a la aplicación y por qué, mientras el resto del disco y los demás archivos quedan herméticamente protegidos.

## 4. El sandbox de macOS desde la perspectiva del UX y del desarrollador: gran idea, lógica extraña

Lo genial del sandbox en macOS es que puede formar parte de cualquier aplicación, sin importar cómo haya llegado al ordenador: desde la App Store, desde GitHub o como paquete `.dmg` de la web del desarrollador. Sin embargo, al trabajar con él me chocaron varias incoherencias:

### 4.1 Se entera del sandbox cuando quizá ya sea tarde

Como usuario preocupado por la seguridad, antes de ejecutar una aplicación desconocida me gustaría saber si va a correr en un sandbox aislado o si tendrá acceso completo a mi sistema.

¿Dónde esperaría encontrar esa información? Lógicamente, en la ventana de información del archivo (Cmd + I en el Finder). Pero allí no encontrará ni una mención al sandbox. La interfaz gráfica de macOS ofrece un único lugar donde averiguarlo: el Monitor de Actividad (Activity Monitor), donde hay que activar la columna Sandbox y mirar un proceso ya en ejecución. Lo cual es absurdo: en el momento en que lo ve en el Monitor de Actividad, la aplicación peligrosa ya está corriendo y puede haber causado daño.

Comprobarlo de antemano solo es posible desde la línea de comandos:

```bash
codesign -d --entitlements - /Applications/OmniDB.app
```

En la salida hay que buscar `com.apple.security.app-sandbox`. Funciona, pero un usuario corriente — precisamente aquel al que el sandbox debería proteger — no va a abrir el Terminal.

### 4.2 Apple debería ser más indulgente con las aplicaciones en sandbox

Hoy Apple bloquea con mucha dureza la ejecución de aplicaciones de origen desconocido (Gatekeeper, la necesidad de una cuenta de desarrollador cara, la notarización). Pero si el propio desarrollador decide voluntariamente encerrar su aplicación en un sandbox estricto y atarse las manos, el sistema debería ser más indulgente al descargarla desde sitios desconocidos. Si una aplicación que corre aislada no tiene acceso ni a los archivos ni al sistema, el riesgo para el usuario cae drásticamente.

### 4.3 Obstáculos innecesarios al firmar ad hoc

Si el desarrollador firma la aplicación solo de forma local/ad hoc (`codesign -s -`), macOS no le permite establecer ciertos entitlements de sandbox. El desarrollador se ve obligado a crearse su propio certificado autofirmado únicamente para poder probar el sandbox con permisos en local. En la práctica, eso no aporta ninguna seguridad real adicional: es solo un paso burocrático inútil durante el desarrollo.

## 5. ¿Cómo trasladar el mismo concepto a Linux y Windows?

De momento tengo este sistema de concesión de permisos bajo demanda plenamente funcional en macOS. Pero OmniDB es una herramienta multiplataforma, así que ahora estoy resolviendo cómo trasladar exactamente el mismo concepto (botón en la aplicación → diálogo del sistema → concesión de la excepción) a los demás sistemas.

- **Linux (Flatpak y XDG Portals):** Para Linux planeo usar Flatpak. Para comunicarse con el sistema fuera del sandbox utiliza los llamados XDG Desktop Portals. Arquitectónicamente, los portales funcionan de forma muy parecida a macOS: cuando la aplicación pide seleccionar un archivo a través del portal, el diálogo lo dibuja el propio sistema, no la aplicación. En cuanto el usuario elige `.pgpass` en el diálogo, el portal entrega a la aplicación el permiso para leer ese archivo concreto.
- **Windows (MSIX y AppContainer):** En Windows el objetivo es empaquetar en MSIX, donde la aplicación corre en un entorno AppContainer. Aquí se aprovecha la interfaz del sistema `FileOpenPicker`. Si el usuario selecciona un archivo mediante ese diálogo nativo de Windows, el AppContainer concede a la aplicación un token de acceso a dicho archivo.

Así, el principio se mantiene idéntico en todas las plataformas: de base la aplicación no ve nada, pero el usuario puede darle acceso seguro, con un solo clic en la ventana de error, exactamente al único archivo que necesita.

## 6. Panorama de opciones de sandboxing: ¿cómo está el tema en los distintos sistemas?

Además de lo que pienso usar para OmniDB, en cada plataforma existe toda una serie de enfoques adicionales. Se dividen en soluciones nativas del sistema y en herramientas de terceros o contenedores.

### 6.1 macOS

- **Solución nativa:** Apple App Sandbox (mediante entitlements, directamente en el sistema).
- **Alternativas:** Ejecución en Docker o en una máquina virtual ligera (por ejemplo mediante Virtualization.framework, UTM, Parallels).

### 6.2 Linux

- **Soluciones nativas y de empaquetado:**
  - **Flatpak:** Usa por debajo `bubblewrap` (namespaces, seccomp). El estándar para aplicaciones GUI aisladas.
  - **Snap:** La solución de Canonical, basada en perfiles de AppArmor.
- **Alternativas para paquetes convencionales (DEB, RPM, AppImage):**
  - **Firejail:** Una herramienta excelente con la que el propio usuario puede «envolver» cualquier aplicación existente e impedirle leer, por ejemplo, `~/.ssh` o `~/.pgpass`.
  - **systemd/cgroups/bubblewrap:** Scripts propios para aislar procesos a nivel de sistema.
  - **Docker/Podman:** Estupendos para CLI y servidores, pero con aplicaciones GUI chocan con el complicado paso de los sockets X11/Wayland.

### 6.3 Windows

- **Solución nativa:**
  - **MSIX (AppContainer):** El contenedor aislado oficial de Microsoft, con registro y sistema de archivos virtuales.
- **Alternativas:**
  - **Sandboxie-Plus:** Popular herramienta de código abierto. Permite ejecutar cualquier `.exe` clásico en un «cajón de arena» aislado sin modificar la aplicación.
  - **Windows Sandbox:** Entorno virtual rápido y desechable basado en Hyper-V. Adecuado para probar un archivo sospechoso descargado de internet (al cerrarlo se borra todo).

## 7. ¿Por qué la solución nativa del sistema es siempre la mejor opción?

Aunque en Linux o Windows existen diversas herramientas de terceros (Firejail, Sandboxie) o contenedores (Docker), para el desarrollador de una aplicación de escritorio siempre es mejor elegir la solución nativa del sistema (App Sandbox, Flatpak, MSIX).

Las razones son sencillas:

1. **Comodidad del usuario (UX):** El sandbox nativo sabe mostrar al usuario un diálogo del sistema justo en el momento en que la aplicación necesita un archivo. El usuario ni siquiera nota que la aplicación corre aislada.
2. **Rendimiento:** El aislamiento nativo aprovecha directamente el núcleo del sistema operativo (namespaces, AppArmor, AppContainer). Debajo no corre ninguna virtualización pesada.
3. **Sostenibilidad:** Confía en un estándar mantenido por el creador del sistema operativo (Apple, Microsoft, la comunidad de Flatpak), y no en herramientas de terceros que pueden dejar de funcionar con la siguiente actualización del sistema.

## 8. Conclusión: la seguridad debe tener sentido para el usuario y para el desarrollador

El caso de OmniDB y el archivo `.pgpass` muestra dos cosas:

1. **La seguridad bajo demanda funciona:** Negar a la aplicación el acceso automático a archivos sensibles con contraseñas y exigirlo solo mediante una acción explícita del usuario en la interfaz es el camino correcto para proteger la privacidad.
2. **Los sistemas tienen lagunas en el UX del sandbox:** Es una lástima que macOS no le indique claramente al usuario (por ejemplo en `Cmd+I`) que está ejecutando una aplicación en aislamiento seguro, y que ponga a los desarrolladores obstáculos innecesarios, como necesitar certificados autofirmados para una simple prueba local.

El sandbox no debería ser una «caja negra» para el usuario ni un «mal necesario» para el desarrollador, sino un estándar transparente del que se beneficien ambas partes.

---

*¿Se enfrenta a un problema parecido con el sandbox en su aplicación? Escríbame cómo lo resolvió.*
