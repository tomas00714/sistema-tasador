import re, os, sys

JS_DIR = os.path.dirname(os.path.abspath(__file__))

# Async functions that return a Promise based on known patterns
PROMISE_RETURNING = {
    'generarId', 'crearTasacionAPI', 'actualizarTasacionAPI', 'crearComparableAPI', 'actualizarComparableAPI',
    'crearSolicitudAPI', 'actualizarSolicitudAPI', 'obtenerTasacionAPI', 'obtenerComparableAPI', 'obtenerSolicitudAPI',
    'listarTasacionesAPI', 'listarComparablesAPI', 'listarSolicitudesAPI', 'obtenerComparablesBatchAPI',
    'eliminarTasacionAPI', 'eliminarComparableAPI', 'eliminarSolicitudAPI',
    'leerTasaciones', 'leerComparables', 'leerSolicitudes',
    'obtenerTasacionPorID', 'obtenerComparablePorID', 'obtenerSolicitudPorID',
    'guardarTasacionEntidad', 'guardarComparableEntidad', 'guardarSolicitudEntidad',
    'eliminarTasacionEntidad', 'eliminarComparableEntidad', 'eliminarSolicitudEntidad',
    'crearTasacion', 'crearComparable', 'crearSolicitud', 'crearTasacionAPI',
    'guardarTasacion', 'guardarBorrador', 'compartirTasacion', 'compartirComparable',
    'responderSolicitud', 'crearComparableDerivadoDesdeTasacion', 'guardarComparableTemporalComoGuardado',
    'obtenerDatosComparableDerivado', 'crearComparableCompartido',
    'obtenerCoeficienteValvano', 'recalcularConCoeficientes', 'recalcularConCoeficientesDepartamento',
    'recalcularConCoeficientesCasa', 'calcularYMostrarResultado', 'cargarProvincias', 'cargarLocalidadesUI',
    'actualizarMapa', 'leerHistorialDesdeAPI', 'abrirPanelComparableManual', 'abrirPanelComparableHistorial',
    'cargarLocalidadesComparableManual', 'asegurarDatasetProvincias', 'cargarLocalidades',
    'obtenerTasacionPorId', 'obtenerComparablePorId', 'obtenerSolicitudPorId', 'obtenerTasacionPorID', 'obtenerSolicitudPorID',
    'cargarDatosCompletos', 'guardarTodosLosDatos', 'guardarDatosPantalla1', 'guardarDatosPantallaDepartamento',
    'guardarDatosCaracteristicasDepartamento', 'guardarDatosPantalla3', 'formatearDireccion',
    'mostrarFormularioLote', 'mostrarFormularioDepartamento', 'mostrarFormularioCasa', 'volverSeleccionTipo',
    'inicializarBotonesTasacion', 'verificarModoEdicion', 'manejarBtnSiguiente',
    'mostrarModalConfirmacionGuardarTasacion', 'mostrarConfirmacionSalir', 'confirmarGuardarTasacion',
    'cerrarTasacionHome', 'abrirTasacionHome', 'initHomeTasacion',
    'initAppShell', 'renderizarAppShell', 'activarItemSidebar', 'toggleSidebar', 'initSidebar'
}

def find_function_body(text, start):
    # Locate the opening parenthesis of the parameters and balance it
    # so default parameters with braces are not mistaken for the body.
    paren = text.find('(', start)
    if paren == -1:
        # Fallback to first brace for arrow without parentheses
        i = text.find('{', start)
        if i == -1:
            return None, None
        depth = 0
        end = i
        while end < len(text):
            if text[end] == '{':
                depth += 1
            elif text[end] == '}':
                depth -= 1
                if depth == 0:
                    return i, end
            end += 1
        return None, None

    depth = 0
    close_paren = paren
    while close_paren < len(text):
        if text[close_paren] == '(':
            depth += 1
        elif text[close_paren] == ')':
            depth -= 1
            if depth == 0:
                break
        close_paren += 1
    if close_paren >= len(text):
        return None, None

    # For arrow functions, skip the => before the body
    body_start = close_paren + 1
    while body_start < len(text) and text[body_start] in ' \t\n\r':
        body_start += 1
    if body_start + 1 < len(text) and text[body_start:body_start+2] == '=>':
        body_start += 2
        while body_start < len(text) and text[body_start] in ' \t\n\r':
            body_start += 1
        # arrow body may be a single expression without braces
        if body_start < len(text) and text[body_start] != '{':
            return body_start, body_start

    # Find the opening brace of the function body
    brace = text.find('{', body_start)
    if brace == -1:
        return None, None
    depth = 0
    end = brace
    while end < len(text):
        if text[end] == '{':
            depth += 1
        elif text[end] == '}':
            depth -= 1
            if depth == 0:
                return brace, end
        end += 1
    return None, None

def async_functions(text):
    # find top-level async functions with names
    regex = re.compile(r'async\s+(?:function\s+(\w+)|function\s*(\w+)?\s*\(|(\w+)\s*=\s*async\s*\(|(\w+)\s*:\s*async\s*\()', re.S)
    matches = []
    for m in regex.finditer(text):
        name = m.group(1) or m.group(2) or m.group(3) or m.group(4) or '(anonymous)'
        open_pos, close_pos = find_function_body(text, m.start())
        if open_pos is None:
            continue
        body = text[open_pos:close_pos+1]
        matches.append((name, body, m.start()))
    return matches

def find_promise_assignments(text):
    issues = []
    lines = text.splitlines()
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('/*'):
            continue
        if 'await ' in line:
            continue
        # look for assignment without await, e.g. const x = funcName( or let x = funcName( or x = funcName(
        for fname in PROMISE_RETURNING:
            # Pattern: identifier = funcName( (with optional whitespace and not preceded by await)
            pat = re.compile(r'(?:const|let|var)\s+\w+\s*=\s*' + re.escape(fname) + r'\s*\(')
            if pat.search(line):
                issues.append((idx+1, line.strip()))
    return issues

def audit_file(path):
    issues = []
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    funcs = async_functions(text)
    for name, body, start in funcs:
        # remove comments and strings
        body_clean = re.sub(r'/\*.*?\*/', '', body, flags=re.S)
        body_clean = re.sub(r'//.*?$', '', body_clean, flags=re.M)
        body_clean = re.sub(r'"(?:\\"|[^"])*"', 'STRING', body_clean)
        body_clean = re.sub(r"'(?:\\'|[^'])*'", 'STRING', body_clean)
        body_clean = re.sub(r'`(?:\\`|[^`])*`', 'STRING', body_clean)
        # count await usages
        if not re.search(r'\bawait\b', body_clean):
            issues.append(f'async function `{name}` no contiene await')
    issues.extend([f'L{ln}: asignación de Promise sin await ({line[:80]})' for ln, line in find_promise_assignments(text)])
    return issues

def walk(dir):
    results = []
    for root, _, files in os.walk(dir):
        for f in files:
            if f.endswith('.js'):
                full = os.path.join(root, f)
                issues = audit_file(full)
                if issues:
                    rel = os.path.relpath(full, JS_DIR)
                    results.append(f'\n=== {rel} ===')
                    results.extend(issues)
    return results

results = walk(JS_DIR)
print('\n'.join(results))
print(f'\nTotal issues: {len(results)}')
