// La función global para inyectar autorización en todas partes
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('zodia_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
    
    // Prevención de Crashes en el Frontend (Regla de Oro)
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error [${response.status}]:`, errorText);
        throw new Error(`Error en el servidor: Ver consola para detalles.`);
    }

    return response.json();
}