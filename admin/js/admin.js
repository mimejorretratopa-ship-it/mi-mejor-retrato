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
    const schoolNameInput = document.getElementById('schoolName');
    const schoolYearsInput = document.getElementById('schoolYears');
    const schoolGaIdInput = document.getElementById('schoolGaId');
    
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
        
        schoolNameInput.value = school.name || '';
        schoolYearsInput.value = (school.years || []).join(', ');
        schoolGaIdInput.value = school.ga_id || '';

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
        
        renderPreview();
    }

    function renderPreview() {
        const tablePreview = document.getElementById('tablePreview');
        const cards = packagesContainer.querySelectorAll('.package-card');
        
        if (cards.length === 0) {
            tablePreview.innerHTML = '<div class="pt-cell">No hay paquetes para comparar.</div>';
            tablePreview.style.gridTemplateColumns = '1fr';
            return;
        }

        // Configure Grid Columns: 1 for features + 1 for each package
        tablePreview.style.gridTemplateColumns = `minmax(200px, 1fr) repeat(${cards.length}, minmax(180px, 1fr))`;
        
        // Define rows we want to show
        const rows = [
            { key: 'header', label: '' },
            { key: 'digitales', label: 'Fotos Digitales' },
            { key: 'impresiones', label: 'Impresiones' },
            { key: 'enmarcada', label: 'Foto Enmarcada' },
            { key: 'grupal', label: 'Foto Grupal del Salón' },
            { key: 'familiar', label: 'Fotos Familiares' },
            { key: 'ideal', label: 'Ideal para' }
        ];

        let html = '';

        // Generate cells row by row
        rows.forEach(row => {
            // First column: Feature Name
            if (row.key === 'header') {
                html += `<div class="pt-cell header" style="background: transparent;"></div>`;
            } else {
                html += `<div class="pt-cell feature-name">${row.label}</div>`;
            }

            // Columns for each package
            cards.forEach(card => {
                if (row.key === 'header') {
                    const name = card.querySelector('.pkg-name').value || 'Paquete';
                    const price = card.querySelector('.pkg-price').value || '0';
                    html += `<div class="pt-cell header"><h4>${name}</h4><div class="price">$${price}</div></div>`;
                } else if (row.key === 'digitales') {
                    const val = card.querySelector('.tc-digital').value || 0;
                    html += `<div class="pt-cell text-center" style="text-align:center;">${val > 0 ? val + ' Fotos' : '-'}</div>`;
                } else if (row.key === 'impresiones') {
                    const val = card.querySelector('.tc-prints').value;
                    html += `<div class="pt-cell text-center" style="text-align:center;">${val ? val : '-'}</div>`;
                } else if (row.key === 'enmarcada') {
                    const val = card.querySelector('.tc-framed').value;
                    html += `<div class="pt-cell text-center" style="text-align:center;">${val ? val : '-'}</div>`;
                } else if (row.key === 'grupal') {
                    const val = card.querySelector('.tc-group').checked;
                    html += `<div class="pt-cell text-center" style="text-align:center; font-size: 1.2rem;">${val ? '✅' : '❌'}</div>`;
                } else if (row.key === 'familiar') {
                    const val = card.querySelector('.tc-family').checked;
                    html += `<div class="pt-cell text-center" style="text-align:center; font-size: 1.2rem;">${val ? '✅' : '❌'}</div>`;
                } else if (row.key === 'ideal') {
                    const val = card.querySelector('.tc-ideal').value;
                    html += `<div class="pt-cell ideal-para">${val ? val : ''}</div>`;
                }
            });
        });

        tablePreview.innerHTML = html;
    }

    // Attach event delegation for live preview
    packagesContainer.addEventListener('input', renderPreview);
    packagesContainer.addEventListener('change', renderPreview);

    // Save temporary changes to memory
    document.getElementById('btnSaveChanges').addEventListener('click', () => {
        if (currentSchoolIndex === null) return;
        
        const school = preciosData.escuelas[currentSchoolIndex];
        
        // Update visibility and identity
        school.visibilidad = schoolVisibility.value;
        school.name = schoolNameInput.value.trim();
        school.years = schoolYearsInput.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        school.ga_id = schoolGaIdInput.value.trim();

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

    // Add new school
    document.getElementById('btnCreateSchool').addEventListener('click', () => {
        if (!preciosData) return;
        
        const code = prompt("Ingresa el código único del nuevo colegio (4 letras minúsculas, ej: lasa):");
        if (!code) return;
        
        const cleanCode = code.trim().toLowerCase();
        if (cleanCode.length !== 4) {
            alert("El código debe tener exactamente 4 letras minúsculas.");
            return;
        }

        const exists = preciosData.escuelas.some(e => e.code === cleanCode);
        if (exists) {
            alert(`El código ${cleanCode} ya está registrado.`);
            return;
        }

        const name = prompt("Ingresa el nombre completo del colegio (ej: Colegio La Salle):");
        if (!name) return;

        const newSchool = {
            code: cleanCode,
            name: name.trim(),
            years: [26],
            ga_id: "G-6H4H52RL0T",
            visibilidad: "pendiente",
            paquetes: []
        };

        preciosData.escuelas.push(newSchool);
        updateStats();
        renderSchoolsList();
        
        // Select the newly created school
        selectSchool(preciosData.escuelas.length - 1);
        
        alert(`¡Colegio ${cleanCode} creado con éxito en memoria! Recuerda guardar y descargar el archivo al finalizar.`);
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
