document.addEventListener('DOMContentLoaded', async function() {
    
    let uploadedImageUrls = ["", "", "", "", ""]; 
    let projectId = null;

    // Debounce function to prevent rapid writes
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // 1. Get Project ID
    const params = new URLSearchParams(window.location.search);
    projectId = params.get('id');

    if (!projectId) {
        alert("No project ID provided.");
        window.close();
        return;
    }

    // 2. Init Auth & Data
    auth.onAuthStateChanged(async function(user) {
        if (user) {
            initializeCustomDropdown('college-dropdown-btn', 'college-checkbox-list', 'college-selected-pills');
            initializeCustomDropdown('sdg-dropdown-btn', 'sdg-checkbox-list', 'sdg-selected-pills');
            initializeImageUploaders();
            initializeCancel();

            await loadProjectData(projectId);
            initializeSubmit();
        } else {
            alert("Please sign in to edit.");
            window.location.href = 'index.html';
        }
    });

    // 3. Load Data
    async function loadProjectData(id) {
        const CACHE_KEY = `ucolab_edit_project_${id}`;
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        let cached = localStorage.getItem(CACHE_KEY);
        let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
        let now = Date.now();

        let data;
        if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
            data = JSON.parse(cached);
        } else {
            try {
                const doc = await db.collection('startups').doc(id).get();
                if (!doc.exists) {
                    alert("Project not found.");
                    window.close();
                    return;
                }
                data = doc.data();
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                localStorage.setItem(CACHE_KEY + '_time', now);
            } catch (error) {
                alert("Error loading project.");
                window.close();
                return;
            }
        }

            // Standard Fields
            setVal('project-name', data.name);
            setVal('project-type', data.type);
            setVal('industry', data.category || data.industry);
            setVal('trl-level', data.trl);
            
            // --- LOAD INCUBATION STATUS ---
            setVal('incubation-status', data.incubationStatus || 'not-incubated');

            setVal('short-description', data.shortDescription || data.description);
            setVal('detailed-description', data.detailedDescription);
            setVal('problem-statement', data.problemStatement);
            setVal('solution', data.solution);
            setVal('start-date', data.startDate);
            setVal('team-size', data.teamSize);
            setVal('founder-role', data.founderRole);
            setVal('founder-affiliation', data.founderAffiliation);
            setVal('founder-email', data.founderEmail);
            setVal('founder-phone', data.founderPhone);

            if (data.founderName) {
                const parts = data.founderName.split(' ');
                setVal('founder-first-name', parts[0]);
                setVal('founder-last-name', parts.slice(1).join(' '));
            }

            // Populate Key Features (Title + Desc)
            if (data.features && Array.isArray(data.features)) {
                data.features.forEach((feat, index) => {
                    if (index < 4) {
                        const i = index + 1;
                        setVal(`feature${i}-title`, feat.title || '');
                        setVal(`feature${i}-desc`, feat.description || '');
                    }
                });
            }

            checkMultiSelect('college-checkbox-list', data.college);
            checkMultiSelect('sdg-checkbox-list', data.sdgs);

            if (data.imageUrls) {
                data.imageUrls.forEach((url, idx) => {
                    if (url && idx < 5) {
                        uploadedImageUrls[idx] = url;
                        const img = document.getElementById(`image-preview-${idx+1}`);
                        const btn = img.parentNode.querySelector('.remove-image-btn');
                        if (img) { img.src = url; img.classList.add('visible'); }
                        if (btn) btn.style.display = 'block';
                    }
                });
            }

            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('edit-content').style.display = 'block';

        } catch (e) {
            console.error(e);
            alert("Error loading data.");
        }
    }

    // 4. Save Changes
    function initializeSubmit() {
        const form = document.querySelector('.submit-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('.btn-submit');
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;

            const fName = document.getElementById('founder-first-name').value;
            const lName = document.getElementById('founder-last-name').value;
            
            // Collect Features as Title + Desc
            const featuresArr = [];
            for(let i=1; i<=4; i++) {
                const title = getVal(`feature${i}-title`);
                const desc = getVal(`feature${i}-desc`);
                if(title || desc) featuresArr.push({ title: title, description: desc });
            }

            const updatedData = {
                name: getVal('project-name'),
                title: getVal('project-name'),
                type: getVal('project-type'),
                category: getVal('industry'),
                industry: getVal('industry'),
                trl: getVal('trl-level'),
                
                // --- SAVE INCUBATION STATUS ---
                incubationStatus: getVal('incubation-status'),

                shortDescription: getVal('short-description'),
                description: getVal('short-description'),
                detailedDescription: getVal('detailed-description'),
                problemStatement: getVal('problem-statement'),
                solution: getVal('solution'),
                startDate: getVal('start-date'),
                teamSize: getVal('team-size'),
                founderName: `${fName} ${lName}`,
                founderRole: getVal('founder-role'),
                founderAffiliation: getVal('founder-affiliation'),
                founderEmail: getVal('founder-email'),
                founderPhone: getVal('founder-phone'),
                updatedAt: firebase.firestore.Timestamp.now(),
                
                features: featuresArr, 
                
                college: getCheckedValues('college-checkbox-list'),
                sdgs: getCheckedValues('sdg-checkbox-list'),
                imageUrls: uploadedImageUrls.filter(u => u)
            };

            try {
                const debouncedUpdate = debounce(async (data) => {
                    await db.collection('startups').doc(projectId).update(data);
                }, 1000);
                await debouncedUpdate(updatedData);
                alert("Saved successfully!");
                if (window.opener && !window.opener.closed) {
                    window.opener.location.reload();
                }
                window.close();
            } catch (err) {
                alert("Error saving: " + err.message);
                submitBtn.textContent = 'Save Changes';
                submitBtn.disabled = false;
            }
        });
    }

    // --- Helpers ---
    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    }
    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }
    function checkMultiSelect(listId, values) {
        if (!values || !Array.isArray(values)) return;
        const list = document.getElementById(listId);
        if (!list) return;
        values.forEach(v => {
            const cb = list.querySelector(`input[value="${v}"]`);
            if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
        });
    }
    function getCheckedValues(listId) {
        const list = document.getElementById(listId);
        if (!list) return [];
        return Array.from(list.querySelectorAll('input:checked')).map(cb => cb.value);
    }
    function initializeCustomDropdown(btnId, listId, pillsId) {
        const btn = document.getElementById(btnId);
        const list = document.getElementById(listId);
        const pills = document.getElementById(pillsId);
        if(!btn || !list) return;

        btn.addEventListener('click', () => {
            list.classList.toggle('visible');
            btn.classList.toggle('open');
        });

        const updatePills = () => {
            pills.innerHTML = '';
            const checked = list.querySelectorAll('input:checked');
            checked.forEach(cb => {
                const span = document.createElement('span');
                span.className = 'pill';
                span.textContent = cb.value;
                pills.appendChild(span);
            });
            const txt = btn.querySelector('.dropdown-button-text');
            if(txt) txt.style.display = checked.length > 0 ? 'none' : 'block';
        };
        list.querySelectorAll('input').forEach(cb => cb.addEventListener('change', updatePills));
    }
    function initializeImageUploaders() {
        for(let i=1; i<=5; i++) {
            const input = document.getElementById(`image-upload-${i}`);
            const img = document.getElementById(`image-preview-${i}`);
            if(input) {
                input.addEventListener('change', async (e) => {
                    if(e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                            img.src = ev.target.result;
                            img.classList.add('visible');
                        };
                        reader.readAsDataURL(e.target.files[0]);
                        try {
                            const url = await CloudinaryUploader.uploadImage(e.target.files[0], i-1);
                            uploadedImageUrls[i-1] = url;
                        } catch(err) { console.error(err); }
                    }
                });
            }
        }
    }
    function initializeCancel() {
        document.querySelector('.btn-cancel').addEventListener('click', () => window.close());
    }
});