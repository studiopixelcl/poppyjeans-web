document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Captura de la Materia (Datos del formulario)
    const payload = {
        nombre_completo: document.getElementById('nombreCompleto').value,
        nombre_actual: document.getElementById('nombreActual').value,
        fecha_nacimiento: document.getElementById('fechaNacimiento').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    const btnSubmit = document.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent;
    
    // Feedback visual para el usuario
    btnSubmit.textContent = "Sincronizando con el Akasha...";
    btnSubmit.style.opacity = "0.7";
    btnSubmit.disabled = true;

    try {
        // 2. Conexión al Cerebro Central (El Worker local en el puerto 8787)
        const response = await fetch('http://localhost:8787/api/public/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // 3. Regla de Oro 4: Prevención de Crashes en el Frontend
        if (!response.ok) {
            // Intentamos extraer el mensaje de error exacto que envía el Worker (ej. "Email ya existe")
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Fricción en la matriz [HTTP ${response.status}]`);
        }

        const data = await response.json();

        // 4. Guardamos el perfil y el token temporalmente para la pantalla de bienvenida
        localStorage.setItem('zodia_pending_user', JSON.stringify(data.perfil));
        localStorage.setItem('zodia_pending_token', data.token);

        // 5. Transmutación de pantalla hacia el aterrizaje del alma
        window.location.href = 'bienvenida.html';

    } catch (error) {
        // Manejo de errores visuales y restauración del botón
        alert(error.message);
        btnSubmit.textContent = originalText;
        btnSubmit.style.opacity = "1";
        btnSubmit.disabled = false;
    }
});