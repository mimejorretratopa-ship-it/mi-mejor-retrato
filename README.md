# Mi Mejor Retrato — School Proposals

> Brochures digitales de reserva para sesiones de fotografía escolar en Panamá.

## ¿Qué hace esto?

Cada archivo HTML es un brochure independiente para un colegio específico. El visitante llega a la página, ve precios y galería personalizados para su escuela, y puede reservar su espacio llenando el formulario. Mike recibe la reserva y coordina por WhatsApp.

## Flujo de uso

```
ebrv-26.html → se autoconfigura leyendo el nombre del archivo
             → carga JSONs de /data/ (precios, formulario, secciones, escuelas)
             → renderiza contenido personalizado para esa escuela
             → visitante llena formulario → submission se envía al backend
```

## Crear un nuevo brochure

```bash
# 1. Copiar cualquier HTML existente
cp ebrv-26.html sabi-26.html

# 2. Agregar la escuela en data/escuelas.json si no existe
# 3. Crear data/sabi_secciones.json (copiar de ebrv_secciones.json y ajustar)
# 4. Ajustar precios en data/precios.json
# 5. Registrar en data/registro.json
# 6. Abrir en Live Server y verificar
```

El HTML **no necesita edición**. Todo se autoconfigura desde el nombre del archivo.

## Colegios activos

| Código | Nombre completo |
|--------|----------------|
| `clia` | Chiara Lubich International Academy |
| `ebrv` | Escuela Bilingüe Residencial Vacamonte |
| `dolo` | Nuestra Señora De Los Dolores |
| `lasa` | Colegio La Salle |
| `lion` | Lions School |
| `ofxd` | Oxford International School |
| `sabi` | Sabis International School |
| `sagu` | Colegio San Agustín |

## Stack

- **HTML + CSS + Vanilla JS** — sin frameworks, sin build step
- **Vercel** — static hosting (deploy automático desde GitHub)
- **JSONs estáticos** — toda la configuración vive en `/data/` y `onboarding/data/`
- **Enrutamiento Limpio** — reglas de redirección y rewrites en `vercel.json` para URLs tipo `/familias/:slug` y `/propuesta/:slug`

## Estructura de archivos

```
/
├── familias/                 ← landing pages de familias con URLs limpias
│   └── index.html            ← manejador de solicitudes /familias/:slug
│
├── admin/                    ← panel de control administrativo (CRM de precios)
│   ├── index.html            ← interfaz compacta de edición
│   ├── js/admin.js           ← lógica de guardado y previsualización
│   └── css/admin.css         ← estilos densificados/compactados
│
├── onboarding/               ← flujo B2C para registro de fotos
│   ├── index.html            ← cuestionario dinámico
│   └── data/
│       ├── precios.json      ← base de datos central de precios y escuelas
│       └── [code]_secciones.json
│
├── propuesta/                ← propuesta comercial B2B para escuelas
│   ├── index.html            ← plantilla híbrida de propuesta
│   ├── js/app.js             ← script de extracción de slugs e inyección de datos
│   └── css/style.css         ← estilos premium mobile-first
│
├── config/
│   └── brochure-config.js    ← todas las constantes (URLs, WhatsApp, GA, etc.)
│
├── lib/                      ← capa base (NO tocar sin entender el patrón)
│   ├── storage.js            ← TODA la persistencia pasa por aquí
│   ├── state.js              ← estado global centralizado
│   ├── validators.js         ← validación de formulario
│   └── utils.js              ← helpers reutilizables
│
├── modules/                  ← módulos de dominio (renderizado B2C)
│   ├── form-renderer.js      ← renderiza el formulario desde formulario.json
│   ├── paquetes.js           ← renderiza tarjetas de precios
│   └── ...
│
└── vercel.json               ← configuración de rewrites y redirecciones 301
```

## Desarrollo local

1. Abrir la carpeta en VS Code
2. Instalar extensión **Live Server**
3. Click derecho en cualquier `.html` → "Open with Live Server"
4. No se necesita Node, Docker, ni nada más

## Deploy

Push a `master` en GitHub → Vercel despliega automáticamente.

```
Branch: master → https://tu-sitio.vercel.app
```

---

Ver [`ARCHITECTURE.md`](ARCHITECTURE.md) para entender los principios de diseño.  
Ver [`DEVELOPMENT.md`](DEVELOPMENT.md) para setup y flujos de trabajo.
