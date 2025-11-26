document.addEventListener('DOMContentLoaded', function() {

    const lightboxOverlay = document.getElementById('lightbox-overlay');
    const lightboxImage = document.getElementById('lightbox-image');

    // --- 1. VISUALS ---
    function createRandomCircles() {
        const body = document.body;
        if (!body) return;
        const colors = ['#B9F8CF', '#cff8b9', '#b9eef8', '#f8b9d4', '#f8e0b9'];
        for (let i = 0; i < 5; i++) {
            const circle = document.createElement('div');
            circle.classList.add('blur-circle');
            const size = Math.floor(Math.random() * 400) + 200;
            circle.style.width = `${size}px`; circle.style.height = `${size}px`;
            circle.style.top = `${Math.random() * 100}vh`; circle.style.left = `${Math.random() * 100}vw`;
            circle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            circle.style.filter = `blur(120px)`;
            circle.style.opacity = 0.4;
            body.prepend(circle);
        }
    }
    createRandomCircles();

    const contactButton = document.querySelector('.contact-founder-btn');
    if (contactButton) {
        contactButton.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('publisher-info')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- 2. LIGHTBOX ---
    function openLightbox(url) {
        if (!lightboxOverlay || !url || url.includes('No image')) return;
        lightboxImage.src = url;
        lightboxOverlay.style.display = 'flex';
        setTimeout(() => lightboxOverlay.classList.add('visible'), 10);
        document.addEventListener('keydown', handleEscape);
    }
    function closeLightbox() {
        lightboxOverlay.classList.remove('visible');
        setTimeout(() => { lightboxOverlay.style.display = 'none'; lightboxImage.src = ""; }, 300);
        document.removeEventListener('keydown', handleEscape);
    }
    function handleEscape(e) { if (e.key === 'Escape') closeLightbox(); }
    if(lightboxOverlay) lightboxOverlay.addEventListener('click', (e) => { if (e.target === lightboxOverlay) closeLightbox(); });

    // --- 3. LOAD DATA ---
    async function loadProjectData() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');

        if (!projectId) return setText('detail-title', "No Project ID");

        try {
            const doc = await db.collection('startups').doc(projectId).get();
            if (!doc.exists) return setText('detail-title', "Project Not Found");

            const project = doc.data();
            // Basic Info
            document.title = `${project.name} - UCoLab`;
            setText('detail-title', project.name || project.title);
            setText('detail-short-desc', project.shortDescription || project.description);
            setText('detail-long-desc', project.detailedDescription);
            setText('detail-problem', project.problemStatement);
            setText('detail-solution', project.solution);
            setText('detail-start-date', project.startDate);
            setText('detail-team-size', project.teamSize);
            setText('detail-industry', project.category || project.industry);

            const collegeEl = document.getElementById('detail-college');
            if(collegeEl) collegeEl.textContent = Array.isArray(project.college) ? project.college.join(', ') : (project.college || 'N/A');

            // --- DEBUG FEATURES ---
            const featuresGrid = document.getElementById('detail-features-grid');
            if (featuresGrid) {
                featuresGrid.innerHTML = ''; 
                let hasFeatures = false;
                if (project.features && Array.isArray(project.features)) {
                    project.features.forEach(f => {
                        const title = (typeof f === 'object') ? f.title : f;
                        const desc = (typeof f === 'object') ? f.description : '';
                        
                        if (title && String(title).trim() !== "") {
                            hasFeatures = true;
                            featuresGrid.innerHTML += `
                                <div class="feature-item">
                                    <h4>${title}</h4>
                                    ${desc ? `<p>${desc}</p>` : ''}
                                </div>`;
                        }
                    });
                }
                if (!hasFeatures) {
                    console.warn("⚠️ No valid features found to display.");
                    featuresGrid.innerHTML = '<p style="color:#777; font-style:italic;">No specific features listed.</p>';
                } else {
                }
            } else {
                console.error("❌ CRITICAL: HTML Element id='detail-features-grid' NOT FOUND.");
            }

            // --- DEBUG PHONE NUMBER ---
            const phoneLink = document.getElementById('detail-founder-phone-link');
            const phoneText = document.getElementById('detail-founder-phone');
            // Check both possible field names
            let phoneVal = project.founderPhone;
            if (!phoneVal) phoneVal = project.phone; // Try fallback
            if (phoneLink && phoneText) {
                if (phoneVal && String(phoneVal).trim() !== "" && String(phoneVal) !== "undefined") {
                    phoneText.textContent = phoneVal;
                    phoneLink.href = `tel:${phoneVal}`;
                    phoneLink.style.display = 'flex'; 
                    phoneLink.style.setProperty('display', 'flex', 'important'); // Extreme force
                } else {
                    phoneLink.style.display = 'none';
                    console.warn("⚠️ Phone value is empty or undefined. Hiding element.");
                }
            } else {
                console.error("❌ CRITICAL: HTML Elements for phone NOT FOUND.");
            }

            // Founder Info
            setText('detail-founder-name', project.founderName);
            setText('detail-founder-role', project.founderRole);
            setText('detail-founder-affiliation', project.founderAffiliation);
            setText('detail-founder-email', project.founderEmail);
            const emailLink = document.getElementById('detail-founder-email-link');
            if(emailLink) emailLink.href = `mailto:${project.founderEmail}`;

            // Avatar
            const avatar = document.getElementById('founder-avatar-container');
            if(avatar) {
                const name = project.founderName || 'U';
                avatar.textContent = name.charAt(0).toUpperCase();
            }

            // TRL Logic
            const trlNum = parseInt((String(project.trl || '0')).replace(/\D/g,'')) || 0;
            const trlPct = Math.min(Math.round((trlNum/9)*100), 100);
            setText('detail-trl-text', `TRL ${trlNum} of 9`);
            const trlBar = document.getElementById('detail-trl-progress');
            if(trlBar) {
                trlBar.style.width = `${trlPct}%`;
                if(trlNum <= 3) trlBar.style.backgroundColor = '#64b5f6';
                else if(trlNum <= 6) trlBar.style.backgroundColor = '#ffca28';
                else trlBar.style.backgroundColor = '#7cb342';
            }
            const trlLabel = document.getElementById('detail-trl-label');
            if(trlLabel) {
                if(trlNum <= 3) { trlLabel.textContent = "Proof of Concept"; trlLabel.className = "trl-label trl-blue-sidebar"; }
                else if(trlNum <= 6) { trlLabel.textContent = "Prototype"; trlLabel.className = "trl-label trl-orange-sidebar"; }
                else { trlLabel.textContent = "System Ready"; trlLabel.className = "trl-label trl-green-sidebar"; }
            }

            // Images
            const images = (project.imageUrls || []).filter(u => u && !u.includes('No image'));
            const mainImg = document.getElementById('detail-image');
            const galleryGrid = document.getElementById('detail-gallery-grid');
            const prevBtn = document.getElementById('hero-prev-btn');
            const nextBtn = document.getElementById('hero-next-btn');

            if (mainImg) {
                if (images.length > 0) {
                    mainImg.src = images[0];
                    mainImg.onclick = () => openLightbox(images[0]);
                    if(galleryGrid) {
                        galleryGrid.innerHTML = '';
                        images.forEach((url, idx) => {
                            const img = document.createElement('img');
                            img.src = url;
                            img.className = 'gallery-image';
                            img.onclick = () => { mainImg.src = url; mainImg.onclick = () => openLightbox(url); };
                            galleryGrid.appendChild(img);
                        });
                    }
                    if (images.length > 1 && prevBtn && nextBtn) {
                        let idx = 0;
                        prevBtn.style.display = 'flex';
                        nextBtn.style.display = 'flex';
                        prevBtn.onclick = () => { idx = (idx - 1 + images.length) % images.length; mainImg.src = images[idx]; mainImg.onclick = () => openLightbox(images[idx]); };
                        nextBtn.onclick = () => { idx = (idx + 1) % images.length; mainImg.src = images[idx]; mainImg.onclick = () => openLightbox(images[idx]); };
                    }
                } else {
                    mainImg.src = 'ucolab/Logo/No image.png';
                    mainImg.onclick = null;
                    if(galleryGrid) galleryGrid.innerHTML = '<p>No images available.</p>';
                    if(prevBtn) prevBtn.style.display = 'none';
                    if(nextBtn) nextBtn.style.display = 'none';
                }
            }

        } catch (e) {
            console.error(e);
            setText('detail-title', "Error Loading Data");
        }
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if(el) el.textContent = val || 'N/A';
    }
    function stringToHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return hash;
    }
    loadProjectData();
    
    // Animation
    const anims = document.querySelectorAll('.animate-on-scroll');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('is-visible'); });
    }, { threshold: 0.1 });
    anims.forEach(el => obs.observe(el));
});