document.addEventListener('DOMContentLoaded', function() {

    const lightboxOverlay = document.getElementById('lightbox-overlay');
    const lightboxImage = document.getElementById('lightbox-image');

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

    function getSDGColor(text) {
        const colors = {
            1: '#E5243B', 
            2: '#DDA63A', 
            3: '#4C9F38', 
            4: '#C5192D', 
            5: '#FF3A21', 
            6: '#26BDE2', 
            7: '#FCC30B', 
            8: '#A21942', 
            9: '#FD6925', 
            10: '#DD1367', 
            11: '#FD9D24', 
            12: '#BF8B2E', 
            13: '#3F7E44', 
            14: '#0A97D9', 
            15: '#56C02B', 
            16: '#00689D', 
            17: '#19486A'  
        };
        const match = text.match(/\d+/); 
        const number = match ? parseInt(match[0]) : 0;
        return colors[number] || '#555555'; 
    }

    async function loadProjectData() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');

        if (!projectId) return setText('detail-title', "No Project ID");

        const CACHE_KEY = `ucolab_project_${projectId}`;
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        let cached = localStorage.getItem(CACHE_KEY);
        let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
        let now = Date.now();

        let project;
        if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
            project = JSON.parse(cached);
        } else {
            try {
                const doc = await db.collection('startups').doc(projectId).get();
                if (!doc.exists) return setText('detail-title', "Project Not Found");
                project = doc.data();
                localStorage.setItem(CACHE_KEY, JSON.stringify(project));
                localStorage.setItem(CACHE_KEY + '_time', now);
            } catch (error) {
                return setText('detail-title', "Error Loading Project");
            }
        }
            
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

            const tagsContainer = document.getElementById('detail-tags');
            if (tagsContainer) {
                tagsContainer.innerHTML = '';
                const sdgs = project.sdg || project.sdgs || []; 
                if (Array.isArray(sdgs) && sdgs.length > 0) {
                    sdgs.forEach(tag => {
                        const span = document.createElement('span');
                        span.className = 'sdg-tag';
                        span.textContent = tag;
                        span.style.backgroundColor = getSDGColor(String(tag));
                        tagsContainer.appendChild(span);
                    });
                }
            }

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
                    featuresGrid.innerHTML = '<p style="color:#777; font-style:italic;">No specific features listed.</p>';
                }
            }

            const phoneLink = document.getElementById('detail-founder-phone-link');
            const phoneText = document.getElementById('detail-founder-phone');
            
            let phoneVal = project.founderPhone;
            if (!phoneVal) phoneVal = project.phone; 
            if (phoneLink && phoneText) {
                if (phoneVal && String(phoneVal).trim() !== "" && String(phoneVal) !== "undefined") {
                    phoneText.textContent = phoneVal;
                    phoneLink.href = `tel:${phoneVal}`;
                    phoneLink.style.display = 'flex'; 
                    phoneLink.style.setProperty('display', 'flex', 'important'); 
                } else {
                    phoneLink.style.display = 'none';
                }
            }

            setText('detail-founder-name', project.founderName);
            setText('detail-founder-role', project.founderRole);
            setText('detail-founder-affiliation', project.founderAffiliation);
            setText('detail-founder-email', project.founderEmail);
            const emailLink = document.getElementById('detail-founder-email-link');
            if(emailLink) emailLink.href = `mailto:${project.founderEmail}`;

            const avatar = document.getElementById('founder-avatar-container');
            if(avatar) {
                const name = project.founderName || 'U';
                avatar.textContent = name.charAt(0).toUpperCase();
            }

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
    
    loadProjectData();
    
    const anims = document.querySelectorAll('.animate-on-scroll');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('is-visible'); });
    }, { threshold: 0.1 });
    anims.forEach(el => obs.observe(el));
});