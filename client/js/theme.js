// Theme Manager - Manejo de modo claro/oscuro

const THEME_KEY = 'theme';

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
}

function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Actualizar estado seleccionado en el modal
    updateThemeSelection(theme);
}

function updateThemeSelection(theme) {
    const lightBtn = document.getElementById('lightThemeBtn');
    const darkBtn = document.getElementById('darkThemeBtn');
    
    if (lightBtn && darkBtn) {
        lightBtn.classList.remove('selected');
        darkBtn.classList.remove('selected');
        
        if (theme === 'light') {
            lightBtn.classList.add('selected');
        } else {
            darkBtn.classList.add('selected');
        }
    }
}

function openThemeModal() {
    const modal = document.getElementById('themeModal');
    const appearanceBtn = document.getElementById('appearanceBtn');
    
    if (modal && appearanceBtn) {
        const rect = appearanceBtn.getBoundingClientRect();
        const modalWidth = 280; // Ancho del modal en CSS
        const modalHeight = 200; // Altura aproximada del modal
        
        // Posicionamiento horizontal
        const spaceOnRight = window.innerWidth - rect.right;
        const spaceOnLeft = rect.left;
        
        if (spaceOnRight >= modalWidth) {
            // Hay espacio a la derecha, mostrar a la derecha
            modal.style.left = (rect.right + 8) + 'px';
            modal.style.right = 'auto';
        } else if (spaceOnLeft >= modalWidth) {
            // No hay espacio a la derecha, mostrar a la izquierda
            modal.style.left = (rect.left - modalWidth - 8) + 'px';
            modal.style.right = 'auto';
        } else {
            // No hay espacio en ningún lado, mostrar a la derecha pero recortado
            modal.style.left = (rect.right + 8) + 'px';
            modal.style.right = 'auto';
        }
        
        // Posicionamiento vertical
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        if (spaceBelow >= modalHeight) {
            // Hay espacio abajo, desplegar hacia abajo
            modal.style.top = rect.top + 'px';
            modal.style.bottom = 'auto';
        } else if (spaceAbove >= modalHeight) {
            // No hay espacio abajo pero sí arriba, desplegar hacia arriba
            modal.style.bottom = (window.innerHeight - rect.bottom) + 'px';
            modal.style.top = 'auto';
        } else {
            // No hay espacio suficiente en ningún lado, desplegar hacia abajo (puede recortarse)
            modal.style.top = rect.top + 'px';
            modal.style.bottom = 'auto';
        }
        
        modal.style.display = 'block';
        
        updateThemeSelection(getTheme());
    }
}

function closeThemeModal() {
    const modal = document.getElementById('themeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleThemeModal() {
    const modal = document.getElementById('themeModal');
    if (modal) {
        if (modal.style.display === 'block') {
            closeThemeModal();
        } else {
            openThemeModal();
        }
    }
}

// Inicializar tema al cargar
document.addEventListener('DOMContentLoaded', function() {
    // Aplicar tema guardado
    const savedTheme = getTheme();
    applyTheme(savedTheme);
    
    // Botón de apariencia en sidebar
    const appearanceBtn = document.getElementById('appearanceBtn');
    if (appearanceBtn) {
        appearanceBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleThemeModal();
        });
    }
    
    // Botón de cerrar modal
    const themeModalClose = document.getElementById('themeModalClose');
    if (themeModalClose) {
        themeModalClose.addEventListener('click', function(e) {
            e.stopPropagation();
            closeThemeModal();
        });
    }
    
    // Botones de selección de tema
    const lightThemeBtn = document.getElementById('lightThemeBtn');
    const darkThemeBtn = document.getElementById('darkThemeBtn');
    
    if (lightThemeBtn) {
        lightThemeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            setTheme('light');
            closeThemeModal();
        });
    }
    
    if (darkThemeBtn) {
        darkThemeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            setTheme('dark');
            closeThemeModal();
        });
    }
    
    // Cerrar modal al hacer click fuera del popover
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('themeModal');
        const appearanceBtn = document.getElementById('appearanceBtn');
        
        if (modal && modal.style.display === 'block') {
            if (!modal.contains(e.target) && !appearanceBtn.contains(e.target)) {
                closeThemeModal();
            }
        }
    });
    
    // Cerrar modal con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeThemeModal();
        }
    });
});
