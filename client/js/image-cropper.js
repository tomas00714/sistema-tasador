// =========================
// RECORTADOR DE IMÁGENES GLOBAL (Cropper.js)
// =========================
// Componente compartido para todo el sistema. Un solo modal, una sola
// lógica: cada flujo de carga (perfil, logo, fotos del inmueble, fotos
// de comparables) lo invoca con su configuración.
//
// Uso:
//   const blob = await recortarImagen(file, {
//       aspectRatio: 1,          // 1 = cuadrado, 4/3, 4/5, etc.
//       maxWidth: 1600,          // opcional, límite del canvas de salida
//       maxHeight: 1600,         // opcional
//       outputFormat: 'image/jpeg', // o 'preserve' para conservar png/webp
//       quality: 0.9,            // calidad jpeg/webp
//       titulo: 'Recortar imagen'
//   });
//   // blob === null → el usuario canceló; la imagen anterior queda intacta.
//
// Para lotes de archivos (varias fotos):
//   const blobs = await recortarImagenes(files, opts);
//   // Cancelar un archivo lo omite y continúa con el siguiente.
//
// La imagen original nunca se persiste: solo el canvas confirmado.

const CROPPER_CDN = {
    js: 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js',
    css: 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css'
};

let _cropperLibPromise = null;

function _cargarCropper() {
    if (window.Cropper) return Promise.resolve();
    if (_cropperLibPromise) return _cropperLibPromise;

    _cropperLibPromise = new Promise((resolve, reject) => {
        if (!document.querySelector('link[data-cropper-css]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = CROPPER_CDN.css;
            link.dataset.cropperCss = '1';
            document.head.appendChild(link);
        }
        const script = document.createElement('script');
        script.src = CROPPER_CDN.js;
        script.onload = () => resolve();
        script.onerror = () => {
            _cropperLibPromise = null;
            reject(new Error('No se pudo cargar la librería de recorte de imágenes.'));
        };
        document.head.appendChild(script);
    });
    return _cropperLibPromise;
}

let _cropperEstilosInyectados = false;

function _inyectarEstilosCropper() {
    if (_cropperEstilosInyectados) return;
    _cropperEstilosInyectados = true;
    const style = document.createElement('style');
    style.dataset.imageCropper = '1';
    style.textContent = `
        .icrop-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(0, 0, 0, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            box-sizing: border-box;
        }
        .icrop-modal {
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
            width: min(640px, 100%);
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: inherit;
        }
        .icrop-header {
            padding: 14px 20px;
            font-size: 15px;
            font-weight: 600;
            color: #1a1a1a;
            border-bottom: 1px solid #e5e5e5;
        }
        .icrop-body {
            padding: 16px 20px;
            overflow: auto;
            flex: 1;
            min-height: 0;
        }
        .icrop-canvas-wrap {
            max-width: 100%;
            max-height: 55vh;
            background: #f4f4f4;
        }
        .icrop-canvas-wrap img {
            display: block;
            max-width: 100%;
            max-height: 55vh;
        }
        .icrop-hint {
            margin: 10px 0 0;
            font-size: 12px;
            color: #777;
        }
        .icrop-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 14px 20px;
            border-top: 1px solid #e5e5e5;
        }
        .icrop-btn {
            padding: 9px 18px;
            font-size: 14px;
            border-radius: 6px;
            border: 1px solid transparent;
            cursor: pointer;
        }
        .icrop-btn-cancelar {
            background: #ffffff;
            color: #444;
            border-color: #d4d4d4;
        }
        .icrop-btn-cancelar:hover { background: #f5f5f5; }
        .icrop-btn-confirmar {
            background: #2e7d32;
            color: #ffffff;
        }
        .icrop-btn-confirmar:hover { background: #276a2b; }
        @media print {
            .icrop-overlay { display: none !important; }
        }
    `;
    document.head.appendChild(style);
}

function _formatoSalida(file, outputFormat, excedeImagen) {
    // Si el recuadro sobresale de la imagen, las zonas vacías deben quedar
    // transparentes: JPEG no soporta alpha, así que forzamos PNG.
    if (excedeImagen) return 'image/png';
    if (outputFormat && outputFormat !== 'preserve') return outputFormat;
    // 'preserve': conservar transparencia/formato cuando el origen lo amerita
    return (file.type === 'image/png' || file.type === 'image/webp')
        ? file.type
        : 'image/jpeg';
}

/**
 * Devuelve el nombre de archivo coherente con el formato real del blob.
 */
function nombreArchivoRecortado(file, blob) {
    const ext = blob.type === 'image/png' ? '.png'
        : blob.type === 'image/webp' ? '.webp'
        : '.jpg';
    const base = (file && file.name ? file.name : 'imagen').replace(/\.[^.]+$/, '');
    return base + ext;
}

/**
 * Abre el modal de recorte para un archivo de imagen.
 * @param {File} file
 * @param {object} opts - aspectRatio, maxWidth, maxHeight, outputFormat, quality, titulo
 * @returns {Promise<Blob|null>} Blob recortado o null si se canceló.
 */
async function recortarImagen(file, opts = {}) {
    if (!file) return null;
    _inyectarEstilosCropper();
    try {
        await _cargarCropper();
    } catch (e) {
        alert(e.message || 'No se pudo cargar el recortador de imágenes.');
        return null;
    }

    const {
        aspectRatio = NaN,
        maxWidth,
        maxHeight,
        outputFormat,
        quality = 0.9,
        titulo = 'Recortar imagen'
    } = opts;

    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
    }).catch(() => null);
    if (!dataUrl) return null;

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'icrop-overlay';
        overlay.innerHTML = `
            <div class="icrop-modal" role="dialog" aria-modal="true">
                <div class="icrop-header">${titulo}</div>
                <div class="icrop-body">
                    <div class="icrop-canvas-wrap"><img alt=""></div>
                    <p class="icrop-hint">Arrastrá la imagen para encuadrar. Con la rueda podés acercar o alejar; si el recuadro queda fuera de la imagen, esa zona sale transparente.</p>
                </div>
                <div class="icrop-footer">
                    <button type="button" class="icrop-btn icrop-btn-cancelar">Cancelar</button>
                    <button type="button" class="icrop-btn icrop-btn-confirmar">Recortar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const img = overlay.querySelector('img');
        img.src = dataUrl;
        const cropper = new Cropper(img, {
            aspectRatio,
            // viewMode 0: el recuadro puede exceder los bordes de la imagen;
            // lo que quede fuera se exporta transparente (PNG).
            viewMode: 0,
            dragMode: 'move',
            autoCropArea: 1,
            movable: true,
            zoomable: true,
            zoomOnWheel: true,
            rotatable: false,
            scalable: false,
            background: true
        });

        let cerrado = false;
        const cerrar = (resultado) => {
            if (cerrado) return;
            cerrado = true;
            document.removeEventListener('keydown', onKey, true);
            try { cropper.destroy(); } catch (e) { /* noop */ }
            overlay.remove();
            resolve(resultado);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                cerrar(null);
            }
        };
        document.addEventListener('keydown', onKey, true);

        overlay.querySelector('.icrop-btn-cancelar')
            .addEventListener('click', () => cerrar(null));

        overlay.querySelector('.icrop-btn-confirmar')
            .addEventListener('click', () => {
                const canvasOpts = { imageSmoothingQuality: 'high' };
                if (maxWidth) canvasOpts.maxWidth = maxWidth;
                if (maxHeight) canvasOpts.maxHeight = maxHeight;
                const canvas = cropper.getCroppedCanvas(canvasOpts);
                if (!canvas) { cerrar(null); return; }
                // ¿El recuadro sobresale de la imagen? → PNG con transparencia.
                const cd = cropper.getCanvasData();
                const bd = cropper.getCropBoxData();
                const excede = bd.left < cd.left - 0.5
                    || bd.top < cd.top - 0.5
                    || bd.left + bd.width > cd.left + cd.width + 0.5
                    || bd.top + bd.height > cd.top + cd.height + 0.5;
                const formato = _formatoSalida(file, outputFormat, excede);
                canvas.toBlob((blob) => cerrar(blob), formato, quality);
            });
    });
}

/**
 * Recorta varios archivos en secuencia (un modal por archivo).
 * Cancelar un archivo lo omite; los ya confirmados se conservan.
 * @param {File[]|FileList} files
 * @param {object} opts - mismas opciones que recortarImagen
 * @returns {Promise<{file: File, blob: Blob}[]>}
 */
async function recortarImagenes(files, opts = {}) {
    const resultado = [];
    for (const file of [...files]) {
        const blob = await recortarImagen(file, opts);
        if (blob) resultado.push({ file, blob });
    }
    return resultado;
}

window.recortarImagen = recortarImagen;
window.recortarImagenes = recortarImagenes;
window.nombreArchivoRecortado = nombreArchivoRecortado;
