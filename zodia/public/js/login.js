document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Capturar credenciales
    const payload = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    const btnSubmit = document.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent;
    
    // Feedback visual
    btnSubmit.textContent = "Validando Llave...";
    btnSubmit.style.opacity = "0.7";
    btnSubmit.disabled = true;

    try {
        // 2. Petición al endpoint del Worker
        const response = await fetch('http://localhost:8787/api/public/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // 3. Prevención de Crashes
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Llave incorrecta o inexistente [HTTP ${response.status}]`);
        }

        const data = await response.json();

        // 4. Almacenar el token y restaurar la sesión del usuario activo
        localStorage.setItem('zodia_token', data.token);
        localStorage.setItem('zodia_user', JSON.stringify(data.perfil));
        
        // 5. Redirección al Santuario Social
        window.location.href = 'inicio.html';

    } catch (error) {
        alert(error.message);
        btnSubmit.textContent = originalText;
        btnSubmit.style.opacity = "1";
        btnSubmit.disabled = false;
    }
});