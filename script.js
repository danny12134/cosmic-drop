(function() {
    // --- CONFIG ---
    const API_KEY = 'CfUtIcYZBQ62K8zD3Dr82lNBKGghNJjJ59ZjL5lN';
    const BASE_URL = 'https://api.nasa.gov/planetary/apod';

    // --- stare ---
    let currentData = null;
    let favorites = JSON.parse(localStorage.getItem('cosmicFavorites')) || [];

    // --- elemente DOM ---
    const mediaContainer = document.getElementById('mediaContainer');
    const placeholderDiv = document.getElementById('placeholder');
    const infoPanel = document.getElementById('infoPanel');
    const titleEl = document.getElementById('title');
    const dateDisplay = document.getElementById('dateDisplay');
    const copyrightDisplay = document.getElementById('copyrightDisplay');
    const explanationEl = document.getElementById('explanation');
    const favToggle = document.getElementById('favToggle');
    const favText = document.getElementById('favText');
    const dateInput = document.getElementById('apod-date');
    const fetchBtn = document.getElementById('fetch-date');
    const favoritesGrid = document.getElementById('favoritesGrid');
    const toastEl = document.getElementById('toast');

    // inițializează data maximă (azi) și valoarea implicită
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    dateInput.max = todayStr;
    dateInput.value = todayStr;

    // afișăm favoritele din localStorage la încărcare
    function renderFavorites() {
        if (!favoritesGrid) return;
        if (favorites.length === 0) {
            favoritesGrid.innerHTML = '<div style="color:#4b608b; padding:0.5rem 0;">niciun favorit încă. dă click pe ★</div>';
            return;
        }
        // ordonare invers cronologică
        const sorted = [...favorites].sort((a,b) => new Date(b.date) - new Date(a.date));
        favoritesGrid.innerHTML = sorted.map(fav => `
            <div class="fav-item" data-date="${fav.date}">
                <span>📅 ${fav.date}</span>
                <span style="max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${fav.title || 'fără titlu'}</span>
                <button class="remove-fav" data-rmdate="${fav.date}" title="șterge din favorite">✕</button>
            </div>
        `).join('');

        // evenimente pe elementele favorite
        document.querySelectorAll('.fav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-fav')) return;
                const date = item.dataset.date;
                if (date) fetchAPOD(date);
            });
        });

        document.querySelectorAll('.remove-fav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dateToRemove = btn.dataset.rmdate;
                favorites = favorites.filter(f => f.date !== dateToRemove);
                localStorage.setItem('cosmicFavorites', JSON.stringify(favorites));
                renderFavorites();
                if (currentData && currentData.date === dateToRemove) {
                    updateFavButtonState(false);
                } else {
                    if (currentData) checkCurrentInFavorites();
                }
                showToast('✕ eliminat din favorite', 1500);
            });
        });
    }

    function showToast(text, duration=2000) {
        toastEl.textContent = text;
        toastEl.classList.add('show');
        clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => toastEl.classList.remove('show'), duration);
    }

    function checkCurrentInFavorites() {
        if (!currentData) return false;
        const exists = favorites.some(f => f.date === currentData.date);
        updateFavButtonState(exists);
        return exists;
    }

    function updateFavButtonState(isFav) {
        if (isFav) {
            favToggle.classList.add('active');
            favText.innerText = 'salvat';
        } else {
            favToggle.classList.remove('active');
            favText.innerText = 'salvează';
        }
    }

    function displayMedia(data) {
        currentData = data;
        if (placeholderDiv) placeholderDiv.style.display = 'none';
        infoPanel.style.display = 'flex';
        infoPanel.style.flexDirection = 'column';

        mediaContainer.innerHTML = ''; 

        const mediaType = data.media_type;
        const url = data.url;
        const title = data.title || 'Fără titlu';
        const date = data.date;
        const explanation = data.explanation || 'Nicio descriere disponibilă.';
        const copyright = data.copyright ? `© ${data.copyright}` : 'domeniu public';

        if (mediaType === 'image') {
            const img = document.createElement('img');
            img.src = url;
            img.alt = title;
            img.loading = 'lazy';
            mediaContainer.appendChild(img);
        } else if (mediaType === 'video') {
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.allow = 'autoplay; encrypted-media';
            iframe.allowFullscreen = true;
            iframe.style.border = 'none';
            mediaContainer.appendChild(iframe);
        } else {
            mediaContainer.innerHTML = `<div class="placeholder">🌠 media neacceptată: ${mediaType}</div>`;
        }

        titleEl.textContent = title;
        dateDisplay.innerHTML = `📡 ${date}`;
        copyrightDisplay.innerHTML = `⚡ ${copyright}`;
        explanationEl.textContent = explanation;

        checkCurrentInFavorites();
    }

    async function fetchAPOD(date) {
        placeholderDiv.style.display = 'flex';
        infoPanel.style.display = 'none';
        mediaContainer.innerHTML = ''; 
        mediaContainer.appendChild(placeholderDiv);

        let url = `${BASE_URL}?api_key=${API_KEY}`;
        if (date) url += `&date=${date}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                let errorMsg = `Eroare ${response.status}`;
                if (response.status === 429) errorMsg = 'Prea multe cereri (încearcă mai târziu)';
                if (response.status === 400) errorMsg = 'Dată invalidă (de obicei duminica sau prea veche)';
                if (response.status === 403) errorMsg = 'Cheie API invalidă - verifică cheia ta';
                placeholderDiv.innerHTML = `<span class="astro-icon">⚠️</span><p>${errorMsg}</p><p style="font-size:0.8rem;">încearcă o altă zi</p>`;
                return;
            }
            const data = await response.json();
            displayMedia(data);
        } catch (err) {
            placeholderDiv.innerHTML = `<span class="astro-icon">💫</span><p>Nu pot accesa cosmosul. verifică conexiunea.</p>`;
            console.error(err);
        }
    }

    function toggleFavorite() {
        if (!currentData) return;

        const exists = favorites.some(f => f.date === currentData.date);
        if (exists) {
            favorites = favorites.filter(f => f.date !== currentData.date);
            showToast('✕ eliminat din favorite', 1200);
        } else {
            const favItem = {
                date: currentData.date,
                title: currentData.title,
                url: currentData.url,
                media_type: currentData.media_type
            };
            favorites.push(favItem);
            showToast('★ adăugat în constelație', 1200);
        }
        localStorage.setItem('cosmicFavorites', JSON.stringify(favorites));
        renderFavorites();
        updateFavButtonState(!exists);
    }

    // încărcare inițială (azi)
    fetchAPOD(todayStr);

    fetchBtn.addEventListener('click', () => {
        const selectedDate = dateInput.value;
        if (selectedDate) fetchAPOD(selectedDate);
    });

    favToggle.addEventListener('click', toggleFavorite);

    dateInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') fetchBtn.click();
    });

    renderFavorites();
})();
