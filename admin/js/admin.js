document.addEventListener('DOMContentLoaded', () => {
    let preciosData = null;
    let currentSchoolIndex = null;

    const PRECIOS_URL = '../onboarding/data/precios.json';

    // DOM Elements
    const schoolsContainer = document.getElementById('schoolsContainer');
    const schoolEditor = document.getElementById('schoolEditor');
    const packagesContainer = document.getElementById('packagesContainer');
    const packageTemplate = document.getElementById('packageTemplate');
    
    // Header Info
    const currentSchoolCode = document.getElementById('currentSchoolCode');
    const schoolVisibility = document.getElementById('schoolVisibility');
    
    // Stats
    const statTotal = document.getElementById('statTotal');
    const statPublished = document.getElementById('statPublished');
    const statPending = document.getElementById('statPending');
    const statHidden = document.getElementById('statHidden');

    // Load Data
    async function init() {
        try {
            const response = await fetch(PRECIOS_URL);
            if (!response.ok) throw new Error('No se pudo cargar precios.json');
            preciosData = await response.json();
            
            updateStats();
            renderSchoolsList();
        } catch (error) {
            schoolsContainer.innerHTML = `<p class="loading-text" style="color:red">Error: ${error.message}</p>`;
            console.error(error);
        }
    }

    function updateStats() {
        if (!preciosData) return;
        
        const escuelas = preciosData.escuelas;
        statTotal.textContent = escuelas.length;
        
        let pub = 0, pen = 0, hid = 0;
        escuelas.forEach(e => {
            if (e.visibilidad === 'publicar') pub++;
            else if (e.visibilidad === 'no_publicar') hid++;
            else if (e.visibilidad === 'pendiente') pen++;
        });

        statPublished.textContent = pub;
        statPending.textContent = pen;
        statHidden.textContent = hid;
    }

    function renderSchoolsList() {
        schoolsContainer.innerHTML = '';
        
        preciosData.escuelas.forEach((school, index) => {
            const item = document.createElement('div');
            item.className = 'school-item';
            
            // Add active class if it's currently selected
            if (currentSchoolIndex === index) item.classList.add('active');

            item.innerHTML = `
                <span class="school-code">${school.code}</span>
                <span class="status-dot ${school.visibilidad}" title="${school.visibilidad}"></span>
            `;

            item.addEventListener('click', () => selectSchool(index));
            schoolsContainer.appendChild(item);
        });
    }

    function selectSchool(index) {
        currentSchoolIndex = index;
        const school = preciosData.escuelas[index];
        
        // Update UI state
        renderSchoolsList(); // refresh to highlight active
        schoolEditor.style.display = 'block';
        
        currentSchoolCode.textContent = school.code;
        schoolVisibility.value = school.visibilidad || 'pendiente';

        renderPackages(school.paquetes || []);
    }

    function renderPackages(paquetes) {
        packagesContainer.innerHTML = '';
        
        paquetes.forEach((pkg, pkgIndex) => {
            const clone = packageTemplate.content.cloneNode(true);
            const card = clone.querySelector('.package-card');
            
            // Populate Basic Info
            card.querySelector('.pkg-id').value = pkg.id || '';
            card.querySelector('.pkg-name').value = pkg.nombre || '';
            card.querySelector('.pkg-price').value = pkg.precio || 0;
            card.querySelector('.pkg-desc').value = pkg.descripcion || '';

            // Populate Tabla Comparativa
            const tc = pkg.tabla_comparativa || {};
            card.querySelector('.tc-digital').value = tc.fotos_digitales || 0;
            card.querySelector('.tc-prints').value = tc.impresiones || '';
            card.querySelector('.tc-framed').value = tc.foto_enmarcada || '';
            card.querySelector('.tc-ideal').value = tc.ideal_para || '';
            
            card.querySelector('.tc-group').checked = !!tc.foto_grupal;
            card.querySelector('.tc-family').checked = !!tc.fotos_familiares;

            // Delete button
            card.querySelector('.delete-package-btn').addEventListener('click', () => {
                if (confirm('¿Seguro que deseas eliminar este paquete?')) {
                    const school = preciosData.escuelas[currentSchoolIndex];
                    school.paquetes.splice(pkgIndex, 1);
                    renderPackages(school.paquetes);
                }
            });

            packagesContainer.appendChild(card);
        });
    }

    // Save temporary changes to memory
    document.getElementById('btnSaveChanges').addEventListener('click', () => {
        if (currentSchoolIndex === null) return;
        
        const school = preciosData.escuelas[currentSchoolIndex];
        
        // Update visibility
        school.visibilidad = schoolVisibility.value;

        // Rebuild packages array
        const newPackages = [];
        const cards = packagesContainer.querySelectorAll('.package-card');
        
        cards.forEach((card, index) => {
            // Keep existing entregables block to not break backward compatibility
            const existingPkg = school.paquetes[index] || {};
            const entregables = existingPkg.entregables || {
                impresos: [],
                digitales: { plataforma: "Galería online" }
            };

            const pkg = {
                id: card.querySelector('.pkg-id').value || `paquete_${index + 1}`,
                nombre: card.querySelector('.pkg-name').value,
                precio: parseInt(card.querySelector('.pkg-price').value) || 0,
                descripcion: card.querySelector('.pkg-desc').value,
                tabla_comparativa: {
                    fotos_digitales: parseInt(card.querySelector('.tc-digital').value) || 0,
                    foto_grupal: card.querySelector('.tc-group').checked,
                    impresiones: card.querySelector('.tc-prints').value || null,
                    foto_enmarcada: card.querySelector('.tc-framed').value || null,
                    fotos_familiares: card.querySelector('.tc-family').checked,
                    ideal_para: card.querySelector('.tc-ideal').value || null
                },
                entregables: entregables
            };
            newPackages.push(pkg);
        });

        school.paquetes = newPackages;
        updateStats();
        renderSchoolsList();
        
        alert('Cambios guardados en memoria. ¡No olvides descargar el archivo final!');
    });

    // Add empty package
    document.getElementById('btnAddPackage').addEventListener('click', () => {
        if (currentSchoolIndex === null) return;
        const school = preciosData.escuelas[currentSchoolIndex];
        if (!school.paquetes) school.paquetes = [];
        
        school.paquetes.push({
            id: `paquete_${school.paquetes.length + 1}`,
            nombre: "Nuevo Paquete",
            precio: 0,
            descripcion: "",
            tabla_comparativa: {
                fotos_digitales: 0,
                foto_grupal: true,
                impresiones: null,
                foto_enmarcada: null,
                fotos_familiares: false,
                ideal_para: ""
            },
            entregables: { impresos: [], digitales: { plataforma: "Galería online" } }
        });
        
        renderPackages(school.paquetes);
    });

    // Download JSON
    document.getElementById('btnDownloadJson').addEventListener('click', () => {
        if (!preciosData) return;
        
        const dataStr = JSON.stringify(preciosData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'precios.json';
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Init App
    init();
});
