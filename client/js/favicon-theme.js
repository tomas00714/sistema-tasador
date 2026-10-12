// Favicon Theme Sync - Actualiza favicon según tema guardado en localStorage
// Para páginas que no tienen el selector de apariencia (landing, login, registro, etc.)

(function() {
    const THEME_KEY = 'theme';
    
    function getTheme() {
        return localStorage.getItem(THEME_KEY) || 'light';
    }
    
    function updateFavicon() {
        const theme = getTheme();
        
        // Detectar si estamos en app/ o en client/ raíz
        const isApp = window.location.pathname.includes('/app/');
        const basePath = isApp ? '../assets/images/' : 'assets/images/';
        
        const faviconPath = theme === 'dark' 
            ? basePath + 'favicon-light.svg' 
            : basePath + 'favicon-dark.svg';
        
        // Actualizar el favicon dinámico por ID
        const dynamicFavicon = document.getElementById('dynamicFavicon');
        if (dynamicFavicon) {
            dynamicFavicon.href = faviconPath;
        }
    }
    
    // Ejecutar al cargar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateFavicon);
    } else {
        updateFavicon();
    }
})();
