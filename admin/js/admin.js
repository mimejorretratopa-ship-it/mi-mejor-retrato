document.addEventListener('DOMContentLoaded', () => {
    let preciosData = null;
    let currentSchoolIndex = null;
    let activePackageIndex = null;

    const PRECIOS_URL = '../onboarding/data/precios.json';

    // DOM Elements
    const schoolsContainer = document.getElementById('schoolsContainer');
    const schoolEditor = document.getElementById('schoolEditor');
    const packagesContainer = document.getElementById('packagesContainer');
    const packageTemplate = document.getElementById('packageTemplate');
    const packageSelect = document.getElementById('packageSelect');
    const packageSelectorContainer = document.getElementById('packageSelectorContainer');
    
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
            
            if (preciosData && preciosData.escuelas) {
                preciosData.escuelas.sort((a, b) => a.code.localeCompare(b.code));
            }
            
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
        // Auto-save active changes before switching
        if (currentSchoolIndex !== null && currentSchoolIndex !== index) {
            saveCurrentSchoolChanges();
        }

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

        activePackageIndex = (school.paquetes && school.paquetes.length > 0) ? 0 : null;
        renderPackages(school.paquetes || []);
    }

    function saveActivePackageFromDOM(card) {
        if (currentSchoolIndex === null || activePackageIndex === null) return;
        const school = preciosData.escuelas[currentSchoolIndex];
        const pkg = school.paquetes[activePackageIndex];
        if (!pkg) return;

        pkg.id = card.querySelector('.pkg-id').value.trim() || `paquete_${activePackageIndex + 1}`;
        pkg.nombre = card.querySelector('.pkg-name').value.trim();
        pkg.precio = parseInt(card.querySelector('.pkg-price').value, 10) || 0;
        pkg.descripcion = card.querySelector('.pkg-desc').value.trim();
        
        if (!pkg.tabla_comparativa) pkg.tabla_comparativa = {};
        pkg.tabla_comparativa.fotos_digitales = parseInt(card.querySelector('.tc-digital').value, 10) || 0;
        pkg.tabla_comparativa.foto_grupal = card.querySelector('.tc-group').checked;
        pkg.tabla_comparativa.impresiones = card.querySelector('.tc-prints').value.trim() || null;
        pkg.tabla_comparativa.foto_enmarcada = card.querySelector('.tc-framed').value.trim() || null;
        pkg.tabla_comparativa.fotos_familiares = card.querySelector('.tc-family').checked;
        pkg.tabla_comparativa.ideal_para = card.querySelector('.tc-ideal').value.trim() || null;
    }

    function renderPackages(paquetes) {
        packagesContainer.innerHTML = '';
        packageSelect.innerHTML = '';
        
        if (!paquetes || paquetes.length === 0) {
            packageSelectorContainer.style.display = 'none';
            packagesContainer.innerHTML = '<p style="padding: 1rem; color: var(--color-ink-light);">No hay paquetes en este colegio. Haz clic en "+ Agregar Paquete" para crear uno.</p>';
            renderPreview();
            return;
        }
        
        packageSelectorContainer.style.display = 'flex';
        
        paquetes.forEach((pkg, pkgIndex) => {
            const option = document.createElement('option');
            option.value = pkgIndex;
            option.textContent = `${pkg.nombre || '(Sin Nombre)'} [${pkg.id || 'sin_id'}]`;
            packageSelect.appendChild(option);
        });
        
        if (activePackageIndex === null || activePackageIndex >= paquetes.length) {
            activePackageIndex = 0;
        }
        packageSelect.value = activePackageIndex;
        
        const pkg = paquetes[activePackageIndex];
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

        // Reactive events
        card.addEventListener('input', () => {
            saveActivePackageFromDOM(card);
            const option = packageSelect.options[activePackageIndex];
            if (option) {
                const nameVal = card.querySelector('.pkg-name').value || 'Nuevo Paquete';
                const idVal = card.querySelector('.pkg-id').value || '';
                option.textContent = `${nameVal} [${idVal}]`;
            }
            renderPreview();
        });
        
        card.addEventListener('change', () => {
            saveActivePackageFromDOM(card);
            renderPreview();
        });

        // Delete button
        card.querySelector('.delete-package-btn').addEventListener('click', () => {
            if (confirm('¿Seguro que deseas eliminar este paquete?')) {
                const school = preciosData.escuelas[currentSchoolIndex];
                school.paquetes.splice(activePackageIndex, 1);
                activePackageIndex = school.paquetes.length > 0 ? 0 : null;
                renderPackages(school.paquetes);
            }
        });

        packagesContainer.appendChild(card);
        renderPreview();
    }

    // Select package from dropdown
    packageSelect.addEventListener('change', (e) => {
        const card = packagesContainer.querySelector('.package-card');
        if (card && activePackageIndex !== null) {
            saveActivePackageFromDOM(card);
        }
        activePackageIndex = parseInt(e.target.value, 10);
        const school = preciosData.escuelas[currentSchoolIndex];
        renderPackages(school.paquetes);
    });

    function renderPreview() {
        const tablePreview = document.getElementById('tablePreview');
        if (currentSchoolIndex === null) return;
        const school = preciosData.escuelas[currentSchoolIndex];
        const paquetes = school.paquetes || [];
        
        if (paquetes.length === 0) {
            tablePreview.innerHTML = '<div class="pt-cell">No hay paquetes para comparar.</div>';
            tablePreview.style.gridTemplateColumns = '1fr';
            return;
        }

        // Configure Grid Columns: 1 for features + 1 for each package
        tablePreview.style.gridTemplateColumns = `minmax(200px, 1fr) repeat(${paquetes.length}, minmax(180px, 1fr))`;
        
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
            paquetes.forEach(pkg => {
                const tc = pkg.tabla_comparativa || {};
                if (row.key === 'header') {
                    const name = pkg.nombre || 'Paquete';
                    const price = pkg.precio || '0';
                    html += `<div class="pt-cell header"><h4>${name}</h4><div class="price">$${price}</div></div>`;
                } else if (row.key === 'digitales') {
                    const val = tc.fotos_digitales || 0;
                    html += `<div class="pt-cell text-center" style="text-align:center;">${val > 0 ? val + ' Fotos' : '-'}</div>`;
                } else if (row.key === 'impresiones') {
                    const val = tc.impresiones;
                    html += `<div class="pt-cell text-center" style="text-align:center;">${val ? val : '-'}</div>`;
                } else if (row.key === 'enmarcada') {
                    const val = tc.foto_enmarcada;
                    html += `<div class="pt-cell text-center" style="text-align:center;">${val ? val : '-'}</div>`;
                } else if (row.key === 'grupal') {
                    const val = tc.foto_grupal;
                    html += `<div class="pt-cell text-center" style="text-align:center; font-size: 1.2rem;">${val ? '✅' : '❌'}</div>`;
                } else if (row.key === 'familiar') {
                    const val = tc.fotos_familiares;
                    html += `<div class="pt-cell text-center" style="text-align:center; font-size: 1.2rem;">${val ? '✅' : '❌'}</div>`;
                } else if (row.key === 'ideal') {
                    const val = tc.ideal_para;
                    html += `<div class="pt-cell ideal-para">${val ? val : ''}</div>`;
                }
            });
        });

        tablePreview.innerHTML = html;
    }

    // Save current school changes to memory
    function saveCurrentSchoolChanges() {
        if (currentSchoolIndex === null) return;
        
        const school = preciosData.escuelas[currentSchoolIndex];
        
        // Update visibility and identity
        school.visibilidad = schoolVisibility.value;
        school.name = schoolNameInput.value.trim();
        school.years = schoolYearsInput.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        school.ga_id = schoolGaIdInput.value.trim();

        // Save current active package DOM to memory
        const card = packagesContainer.querySelector('.package-card');
        if (card && activePackageIndex !== null) {
            saveActivePackageFromDOM(card);
        }

        updateStats();
        renderSchoolsList();
    }

    // Save temporary changes to memory
    document.getElementById('btnSaveChanges').addEventListener('click', () => {
        saveCurrentSchoolChanges();
        alert('Cambios guardados en memoria. ¡No olvides descargar el archivo final!');
    });

    // Add empty package
    document.getElementById('btnAddPackage').addEventListener('click', () => {
        if (currentSchoolIndex === null) return;
        const school = preciosData.escuelas[currentSchoolIndex];
        if (!school.paquetes) school.paquetes = [];
        
        // Save current package before adding
        const card = packagesContainer.querySelector('.package-card');
        if (card && activePackageIndex !== null) {
            saveActivePackageFromDOM(card);
        }
        
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
        
        activePackageIndex = school.paquetes.length - 1;
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
        preciosData.escuelas.sort((a, b) => a.code.localeCompare(b.code));
        
        updateStats();
        renderSchoolsList();
        
        // Select the newly created school
        const newIndex = preciosData.escuelas.findIndex(e => e.code === cleanCode);
        currentSchoolIndex = newIndex;
        selectSchool(newIndex);
        
        alert(`¡Colegio ${cleanCode} creado con éxito en memoria! Recuerda guardar y descargar el archivo al finalizar.`);
    });

    // Duplicate existing school
    document.getElementById('btnDuplicateSchool').addEventListener('click', () => {
        if (!preciosData || currentSchoolIndex === null) return;
        
        // Auto-save changes of current school first to copy current inputs
        saveCurrentSchoolChanges();
        
        const sourceSchool = preciosData.escuelas[currentSchoolIndex];
        
        const code = prompt("Ingresa el código único para el nuevo colegio clonado (4 letras minúsculas, ej: sanj):");
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

        const name = prompt("Ingresa el nombre completo para el colegio clonado:", `${sourceSchool.name} (Copia)`);
        if (!name) return;

        // Deep copy the original school configuration
        const duplicatedSchool = JSON.parse(JSON.stringify(sourceSchool));
        duplicatedSchool.code = cleanCode;
        duplicatedSchool.name = name.trim();

        // Push new school configuration into array
        preciosData.escuelas.push(duplicatedSchool);
        
        // Sort schools alphabetically by code
        preciosData.escuelas.sort((a, b) => a.code.localeCompare(b.code));
        
        // Update dashboard state
        updateStats();
        renderSchoolsList();
        
        // Select the newly duplicated school
        const newIndex = preciosData.escuelas.findIndex(e => e.code === cleanCode);
        currentSchoolIndex = newIndex;
        selectSchool(newIndex);
        
        alert(`¡Colegio ${cleanCode} duplicado con éxito en memoria! Recuerda guardar y descargar el archivo al finalizar.`);
    });

    // Download JSON
    document.getElementById('btnDownloadJson').addEventListener('click', () => {
        if (!preciosData) return;
        
        // Auto-save whatever is currently open to prevent data loss
        saveCurrentSchoolChanges();
        
        const dataStr = JSON.stringify(preciosData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'precios.json';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    });

    // Init App
    init();
});

