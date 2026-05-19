document.addEventListener("DOMContentLoaded", () => {
    // 1. Recuperar los datos del Motor Akáshico guardados durante el registro
    const userDataRaw = localStorage.getItem('zodia_pending_user');
    
    if (!userDataRaw) {
        // Si no hay datos, significa que se saltaron el Sello de Ingreso
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userDataRaw);

    // 2. Inyectar los datos básicos en la Matriz
    document.getElementById('userNickname').textContent = user.nombre_actual || "Iniciado";
    document.getElementById('astralSign').textContent = user.signo_zodiacal || "Aries";
    
    // 3. Determinar el Elemento Astrológico
    const fuego = ['Aries', 'Leo', 'Sagitario'];
    const tierra = ['Tauro', 'Virgo', 'Capricornio'];
    const aire = ['Géminis', 'Libra', 'Acuario'];
    
    let elemento = "Agua 🌊";
    if (fuego.includes(user.signo_zodiacal)) elemento = "Fuego 🔥";
    else if (tierra.includes(user.signo_zodiacal)) elemento = "Tierra ⛰️";
    else if (aire.includes(user.signo_zodiacal)) elemento = "Aire 💨";
    
    document.getElementById('astralElement').textContent = elemento;

    // 4. Inyectar Frecuencias Numerológicas Pitagóricas
    document.getElementById('numLifePath').textContent = `Número ${user.camino_vida}`;
    document.getElementById('numExpression').textContent = `Número ${user.expresion}`;
    document.getElementById('numSoul').textContent = `Número ${user.alma}`;

    // Si el usuario ya tiene un avatar guardado localmente, lo mostramos
    if (user.avatar_url) {
        document.getElementById('avatarImage').src = user.avatar_url;
    }

    // 5. Interceptar Deudas Kármicas (Si el Motor Akáshico las detectó)
    if (user.deudas_karmicas && user.deudas_karmicas.length > 0) {
        const karmaBox = document.getElementById('karmaBox');
        const karmaList = document.getElementById('karmaList');
        
        karmaBox.style.display = 'block';
        karmaList.textContent = user.deudas_karmicas.map(k => `Deuda ${k}`).join(' | ');
    }

    // 6. Previsualización Visual del Avatar (Local, persistiendo la imagen)
    const avatarInput = document.getElementById('avatarInput');
    if(avatarInput) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            // Mostrar la imagen inmediatamente en la burbuja de cristal y guardarla en la sesión
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64Avatar = event.target.result;
                document.getElementById('avatarImage').src = base64Avatar;
                
                // Persistencia del avatar para la siguiente interfaz
                user.avatar_url = base64Avatar;
                localStorage.setItem('zodia_pending_user', JSON.stringify(user));
            };
            reader.readAsDataURL(file);
        });
    }

    // 7. Botón de Ingreso a la Plataforma
    document.getElementById('btnEnterPlatform').addEventListener('click', () => {
        const pendingToken = localStorage.getItem('zodia_pending_token');

        // Sellamos el token y el usuario de forma definitiva
        if (pendingToken) localStorage.setItem('zodia_token', pendingToken);
        localStorage.setItem('zodia_user', JSON.stringify(user));

        // Limpiamos la memoria transitoria
        localStorage.removeItem('zodia_pending_user');
        localStorage.removeItem('zodia_pending_token');

        // Transmutación de pantalla hacia el Feed Principal
        window.location.href = 'inicio.html';
    });
});