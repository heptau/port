---
title: "¿El fin de la era de Python? Cómo la IA me ayudó a reescribir en Go una herramienta de 10 años"
description: "Reescribir OmniDB de Python a Go como caso de estudio — por qué en la era de la IA ya no tiene sentido sacrificar el rendimiento en tiempo de ejecución en el altar de la comodidad al programar."
locale: "es"
categories: ["AI", "PostgreSQL"]
date: 2026-08-26
tags: ["OmniDB", "Python", "Go", "AI", "PostgreSQL", "Rust", "reescritura de software"]
draft: false
translation_id: "2026-08-26_1"
---

¿Es solo mi impresión, o últimamente compensa recurrir a un lenguaje compilado incluso donde antes se habría elegido Python de forma automática?

OmniDB fue en su día una popular herramienta GUI para PostgreSQL — construida sobre Python/Django, con un frontend de escritorio que empezó en Electron y más tarde se sustituyó por el más ligero NW.js. El proyecto se fue quedando estancado poco a poco. No porque la idea fuera mala, sino porque mantener un stack monolítico de Python se volvió insostenible. Este artículo no es un tutorial de reescritura. Es una reflexión sobre por qué mueren proyectos así — y cómo un stack moderno, junto con la IA, está cambiando las reglas del juego.

**Tesis:** Reescribir software antiguo antes se consideraba casi un suicidio («nunca reescribas desde cero»). Hoy, gracias a los cambios en la tecnología y a la IA, una reescritura se convierte cada vez más en una decisión racional — y no soy el único con esta observación, como muestran varios ejemplos conocidos de grandes empresas.

---

## 1. El viejo dogma: el tiempo del desarrollador cuesta más que la CPU

> «El hardware es barato, el tiempo del desarrollador es caro.»

Este principio ganó la guerra de lenguajes de los últimos quince años. Desarrollar en Python era rápido, la sintaxis amigable, el ecosistema de librerías enorme. ¿Que la aplicación consume 150 MB de RAM y tarda unos segundos en arrancar? No importa — esperamos, compramos una máquina más potente. Prácticamente todos los lenguajes populares de esa época (Python, JavaScript/TypeScript, Java) son interpretados o corren sobre una máquina virtual. A nadie le importaba mucho la eficiencia en tiempo de ejecución, porque «el hardware ya lo compensará».

## 2. La IA cambia la ecuación

Hoy la IA se encarga del código repetitivo, la refactorización e incluso la conversión de lógica entre lenguajes. El tiempo dedicado a escribir código tipado y compilado ya no es automáticamente varias veces mayor que en Python — la IA puede generarlo hoy en cuestión de segundos.

La consecuencia: si el coste de desarrollar baja, vuelven a primer plano la **eficiencia en tiempo de ejecución, la velocidad de respuesta y la huella de memoria** — precisamente lo que durante los últimos quince años se sacrificó de buen grado por la comodidad de programar.

Una pregunta para reflexionar: ¿todavía tiene sentido pagar con el rendimiento de la aplicación por «programar cómodamente», cuando gran parte de ese código ya lo escribe un LLM de todos modos?

## 3. La ilusión de la comodidad, o el infierno del despliegue en Python

Python es cómodo para **escribir** — pero llevarlo hasta el usuario es otra historia:

- entornos virtuales y conflictos de dependencias,
- distintas versiones del intérprete en Linux/macOS/Windows,
- librerías en C que hay que compilar por separado para cada plataforma,
- PyInstaller/cx_Freeze como «solución» — el resultado: una carpeta enorme llena de archivos `.so`/`.dll`,
- una configuración de CI propia para cada plataforma de destino.

Go resuelve todo esto de otra manera:

- **un único binario estático** — sin runtime, sin dependencias,
- **compilación cruzada con un solo comando** (`GOOS=linux`, `GOOS=darwin`, `GOOS=windows`) directamente desde una máquina,
- **sostenibilidad a largo plazo** — dentro de diez años basta con descargar el binario y ejecutarlo. Nada de bailes con `pip install`, nada de cadenas de dependencias rotas.

La paradoja: desarrollar en Go acaba siendo más simple y sostenible, porque desaparece todo el lastre administrativo alrededor del despliegue. Lo que la comodidad de Python parece ahorrar al principio, vuelve como una deuda en cada release.

## 4. No soy el único — grandes empresas hacen reescrituras parecidas

Esto no es solo la sensación de un desarrollador reviviendo un proyecto paralelo de diez años. En la misma dirección — alejándose de un runtime cómodo pero lento hacia uno más rápido y predecible — se han movido en los últimos años muchas grandes empresas:

- **Discord** reescribió su servicio Read States (seguimiento de mensajes leídos) de Go a Rust. El motivo no fue «Go es malo», sino un problema concreto: el recolector de basura de Go provocaba picos de latencia bajo carga alta. Rust, sin GC, resolvió el problema — e incluso con solo una optimización básica superó a la versión de Go ajustada a mano ([Discord Blog](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)).
- **Dropbox** reescribió el núcleo de su motor de sincronización (nombre en clave interno Nucleus) de Python a Rust. El modelo de datos antiguo carecía de identificadores estables de archivo a través de los movimientos, y los límites de la huella de memoria no se podían resolver con parches incrementales — hacía falta un núcleo nuevo, determinista y de un solo hilo, que hoy se puede someter a fuzzing de forma masiva. Según las propias palabras del equipo, Rust fue un «multiplicador de fuerza» y una de las mejores decisiones que tomaron ([Dropbox Tech](https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine)).
- **Uber** reescribió los nodos worker de su capa de almacenamiento Schemaless de Python (Flask/uWSGI, una petición por proceso) a Go, para aprovechar la concurrencia ligera en lugar de escalar solo añadiendo más procesos. Más adelante, buena parte de su plataforma siguió el mismo camino — Python y Node.js dejaron de cumplir sus presupuestos de latencia al volumen de tráfico que manejaban ([Uber Blog](https://www.uber.com/en-IT/blog/schemaless-rewrite/)).
- **Cloudflare** publicó en febrero de 2026 cómo un solo ingeniero, con ayuda de la IA, construyó desde cero en una sola semana **vinext** — una reimplementación completa de Next.js sobre Vite en lugar de Turbopack, desplegable directamente en Cloudflare Workers. Cubre el 94 % de la superficie de la API de Next.js 16, compila 4,4 veces más rápido (1,67 s frente a 7,38 s) y el bundle de cliente es un 57 % más pequeño (72,9 KB frente a 168,9 KB comprimido). Coste: aproximadamente 1.100 USD en tokens de API a lo largo de unas 800 sesiones de OpenCode. Según las propias palabras de Cloudflare, «casi cada línea de código de vinext la escribió la IA» — la persona se encargó de las decisiones de arquitectura, la priorización y corregir el rumbo cuando la IA se metía en un callejón sin salida ([Cloudflare Blog](https://blog.cloudflare.com/vinext/)).

El denominador común de los tres primeros casos: nunca se trató de moda ni de «reescribámoslo porque Go/Rust está de moda». Siempre se trató de un límite concreto y medible — latencia, memoria, previsibilidad — que no se podía eliminar en el lenguaje original sin un cambio de arquitectura de fondo. Cloudflare va un paso más allá y muestra en acción la propia tesis de este artículo: lo que antes habría requerido un equipo durante meses, aquí lo logró una sola persona en una semana, a un coste muy por debajo del salario mensual de un solo desarrollador.

## 5. Caso de estudio: OmniDB en cifras

Comparación directa entre el antiguo OmniDB 3.2 (Python/Django + NW.js) y la nueva versión OmniDB 4.2 (Go/Wails), medida en la misma máquina:

| Métrica | OmniDB 3.2 antiguo (Python/NW.js) | OmniDB 4.2 nuevo (Go/Wails) | Diferencia |
|---|---|---|---|
| Tamaño de `.app` | 478 MB | 73 MB | −405 MB (−85 %) |
| Archivo de descarga | 201 MB | 28 MB | −173 MB (−86 %) |
| Arranque del servidor backend (hasta «listening») | 0,32 s | 0,05 s | ~6 x más rápido |
| RSS del backend en reposo | 104 MB | 19 MB | ~5 x menos |

Una nota honesta sobre la metodología: no incluyo una cifra para el arranque de toda la aplicación GUI (NW.js/Chromium frente a Wails/webview del sistema) — la diferencia probablemente sea aún mayor, pero sin una medición limpia solo estaría adivinando. Tampoco se puede comparar de forma justa la RAM de la aplicación completa: NW.js lleva todo su Chromium consigo, mientras que Wails usa el WebKit del sistema, cuya memoria se contabiliza aparte bajo procesos `com.apple. WebKit.*` en macOS. Por eso, lo anterior solo compara el servidor backend — una afirmación más modesta, pero verificable.

Qué se perdió en la reescritura: el sistema de plugins (plugins en Python) y el depurador paso a paso de PL/pgSQL, que necesitaba su propia extensión en C en `shared_preload_libraries` — algo que hoy ningún Postgres gestionado permitiría cargar de todos modos. Junto con ellos desaparecieron también tres integraciones de plugins para proyectos upstream ya muertos hace tiempo (pglogical, Postgres-BDR, Postgres-XL). No toda reescritura es indolora, y no tiene sentido ocultarlo.

## 6. Python en la era de la IA — rendimiento real frente a rendimiento aparente

Python está viviendo un boom gracias a la IA/ML, pero hay una trampa: en el entrenamiento e inferencia de modelos funciona sobre todo como «pegamento» (glue language) — los cálculos reales corren por debajo en C++/CUDA/PyTorch. Pero para herramientas de escritorio, utilidades CLI y clientes de bases de datos, Python trae todo el peso de su runtime — arranque lento, mayor huella de memoria — sin que el usuario se beneficie realmente de su flexibilidad. Solo la paga.

También conviene distinguir un segundo papel en el que Python aparece cada vez más en la era de la IA: como **lenguaje de ejecución para los propios agentes de IA**. Los intérpretes de código, los entornos sandbox para procesar archivos o los frameworks de agentes casi siempre recurren a Python — tiene una librería rica para trabajar con datos (pandas, openpyxl, Pillow), es el lenguaje sobre el que los LLM tienen más datos de entrenamiento y, sobre todo: un script que un agente genera y ejecuta una sola vez no se distribuye a ninguna parte. Vive unos segundos dentro de un sandbox aislado y luego desaparece.

Esa es una situación fundamentalmente distinta de una aplicación que cientos de personas instalan en su ordenador y abren cada día. A nadie le preocupa la velocidad de arranque de un script de sandbox de un solo uso — la velocidad de arranque de una aplicación de escritorio que se abre diez veces al día, sí. Python como «pegamento» para agentes y Python como runtime para una aplicación de escritorio distribuida son dos tareas distintas con requisitos distintos, y es un error meterlas en el mismo saco solo porque comparten lenguaje.

## 7. Conclusión: lecciones para futuros proyectos

1. Reescribir un proyecto en un lenguaje más eficiente ya no es un capricho elitista — la IA ha abaratado significativamente tanto la conversión como el mantenimiento continuo, y también lo hacen grandes empresas como Discord, Dropbox, Uber o Cloudflare, cuando chocan con un límite de rendimiento concreto o quieren aprovechar las nuevas posibilidades del desarrollo asistido por IA.
2. Python se merece su lugar donde domina — ciencia de datos, prototipado con IA, scripting agéntico puntual.
3. Para herramientas distribuidas y aplicaciones cliente, sin embargo, hoy tiene sentido volver a lenguajes compilados y autosuficientes — Go, Rust, Zig.
4. No tengas miedo de revivir buenas herramientas antiguas — un stack moderno más IA puede insuflarles una segunda vida con un coste de mantenimiento mínimo.

El nuevo OmniDB 4.2 se puede descargar gratis en 🔗 [www.omnidb.net](https://www.omnidb.net).

---

*¿Tienes una experiencia parecida reescribiendo una herramienta antigua en otro lenguaje? Cuéntamela.*
