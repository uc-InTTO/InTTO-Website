document.addEventListener('DOMContentLoaded', async () => {
    const firebaseConfig = {
        apiKey: "AIzaSyAXNIo4h3Uv7Z8IGdm01zQ8K4WY4G8VLzE",
        authDomain: "uc-intto.firebaseapp.com",
        projectId: "uc-intto",
        storageBucket: "uc-intto.firebasestorage.app",
        messagingSenderId: "156771180433",
        appId: "1:156771180433:web:4f9d57eb6b0e7882ef0430",
        measurementId: "G-ETY9E0F1K6"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    const urlParams = new URLSearchParams(window.location.search);
    const startupId = urlParams.get('id');

    if (!startupId) {
        window.location.href = 'startups.html';
        return;
    }

    let currentImageIndex = 0;
    let imageUrls = [];

    try {
        const doc = await db.collection('startups').doc(startupId).get();

        if (!doc.exists) {
            document.getElementById('detail-title').textContent = 'Startup Not Found';
            return;
        }

        const data = doc.data();
        imageUrls = data.imageUrls || [];

        document.title = `${data.name || 'Details'} - InTTO`;
        document.getElementById('detail-title').textContent = data.name || 'Unnamed Startup';

        // Handle logo/icon display
        const iconContainer = document.getElementById('detail-icon');
        
        // Priority: 1. First image from imageUrls array, 2. logo field, 3. default emoji
        if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
            const firstImage = data.imageUrls[0];
            if (firstImage && (firstImage.startsWith('http://') || firstImage.startsWith('https://') || firstImage.startsWith('data:image'))) {
                iconContainer.innerHTML = `<img src="${firstImage}" alt="${data.name} Logo" onerror="this.style.display='none'; this.parentElement.textContent='🚀';">`;
            } else {
                iconContainer.textContent = data.logo || firstImage || "🚀";
            }
        } else if (data.logo) {
            // Check if logo is an image URL or emoji/text
            if (data.logo.startsWith('http://') || data.logo.startsWith('https://') || data.logo.startsWith('data:image')) {
                iconContainer.innerHTML = `<img src="${data.logo}" alt="${data.name} Logo" onerror="this.style.display='none'; this.parentElement.textContent='🚀';">`;
            } else {
                iconContainer.textContent = data.logo;
            }
        } else {
            iconContainer.textContent = "🚀";
        }

        const tagsContainer = document.getElementById('detail-tags');
        let tagsHtml = '';

        const cohortVal = data.cohort || data.Cohort;
        if (cohortVal) {
            tagsHtml += `<span class="tag-cohort">${cohortVal}</span>`;
        }

        const sdgList = data.sdgs || data.sdg;
        if (sdgList) {
            if (Array.isArray(sdgList)) {
                sdgList.forEach(sdg => {
                    tagsHtml += `<span class="tag-sdg">${sdg}</span>`;
                });
            } else {
                tagsHtml += `<span class="tag-sdg">${sdgList}</span>`;
            }
        }
        tagsContainer.innerHTML = tagsHtml;

        updateHeroImage();

        document.getElementById('detail-long-desc').textContent = data.detailedDescription || data.description || 'No detailed description available.';
        
        document.getElementById('detail-problem').textContent = data.problemStatement || "Information coming soon.";
        document.getElementById('detail-solution').textContent = data.solution || "Information coming soon.";

        const galleryGrid = document.getElementById('detail-gallery-grid');
        galleryGrid.innerHTML = ''; 
        if (imageUrls.length > 0) {
            imageUrls.forEach((url, index) => {
                // Validate URL before adding to gallery
                if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'))) {
                    const img = document.createElement('img');
                    img.className = 'gallery-image';
                    img.src = url;
                    img.alt = `${data.name} - Image ${index + 1}`;
                    img.onerror = function() {
                        this.style.display = 'none';
                        console.warn('Failed to load image:', url);
                    };
                    img.onclick = () => openLightbox(url);
                    galleryGrid.appendChild(img);
                }
            });
            
            // Check if any images were actually added
            if (galleryGrid.children.length === 0) {
                galleryGrid.innerHTML = '<p style="color:#888; font-style:italic;">No additional images.</p>';
            }
        } else {
            galleryGrid.innerHTML = '<p style="color:#888; font-style:italic;">No additional images.</p>';
        }

        const featuresGrid = document.getElementById('detail-features-grid');
        featuresGrid.innerHTML = ''; 
        
        if (data.features && Array.isArray(data.features) && data.features.length > 0) {
            data.features.forEach(feat => {
                featuresGrid.innerHTML += `
                    <div class="feature-item">
                        <h4>${feat.title}</h4>
                        <p>${feat.description || ''}</p>
                    </div>`;
            });
        } else if (data.innovation || data.sustainability) {
             const legacyFeatures = [
                { title: "Innovation", text: data.innovation },
                { title: "Sustainability", text: data.sustainability },
                { title: "Scalability", text: data.scalability },
                { title: "Community Impact", text: data.communityImpact }
            ];
            
            let hasLegacy = false;
            legacyFeatures.forEach(feat => {
                if(feat.text) {
                    hasLegacy = true;
                    featuresGrid.innerHTML += `
                        <div class="feature-item">
                            <h4>${feat.title}</h4>
                            <p>${feat.text}</p>
                        </div>`;
                }
            });
             if(!hasLegacy) featuresGrid.innerHTML = '<p>Features not listed.</p>';
        } else {
            featuresGrid.innerHTML = '<p>Features not listed.</p>';
        }

        let rawTrl = data.trl; 
        let trlNumber = 1;

        if (typeof rawTrl === 'number') {
            trlNumber = rawTrl;
        } else if (typeof rawTrl === 'string') {
            const match = rawTrl.match(/\d+/); 
            if (match) {
                trlNumber = parseInt(match[0]);
            }
        }

        if (trlNumber < 1) trlNumber = 1;
        if (trlNumber > 9) trlNumber = 9;

        const trlNumText = document.getElementById('trl-num-text');
        if(trlNumText) trlNumText.textContent = trlNumber;
        
        const percentage = Math.round((trlNumber / 9) * 100);
        document.getElementById('detail-trl-percent').textContent = `${percentage}%`;
        document.getElementById('detail-trl-progress').style.width = `${percentage}%`;
        
        const trlStatuses = {
            1: "Basic Principles", 2: "Concept Formulated", 3: "Proof of Concept",
            4: "Laboratory Testing", 5: "Relevant Environment", 6: "Demonstrated",
            7: "System Prototype", 8: "System Complete", 9: "Successful Operations"
        };
        document.getElementById('detail-trl-label').textContent = trlStatuses[trlNumber] || "Concept Phase";

        document.getElementById('detail-start-date').textContent = data.startDate || data.dateStarted || "2025";
        document.getElementById('detail-team-size').textContent = data.teamSize || "Unknown";
        
        let collegeDisplay = data.college;
        if(Array.isArray(data.college)) {
            collegeDisplay = data.college.join(', ');
        }
        document.getElementById('detail-college').textContent = collegeDisplay || "UC";
        document.getElementById('detail-industry').textContent = data.industry || "Tech";

        document.getElementById('detail-founder-name').textContent = data.founderName || data.contactPerson || "Admin";
        document.getElementById('detail-founder-role').textContent = data.founderRole || data.publisherRole || "Project Lead";
        document.getElementById('detail-founder-affiliation').textContent = data.founderAffiliation || data.affiliation || "University of the Cordilleras";
        
        if(data.founderEmail || data.email) {
            document.getElementById('detail-founder-email').textContent = data.founderEmail || data.email;
        }
        if(data.founderPhone || data.phone) {
            document.getElementById('detail-founder-phone').textContent = data.founderPhone || data.phone;
        }

    } catch (error) {
        document.getElementById('detail-title').textContent = "Error Loading Data";
    }

    function updateHeroImage() {
        const imgElement = document.getElementById('detail-image');
        if (imageUrls.length > 0) {
            const currentUrl = imageUrls[currentImageIndex];
            // Validate URL before setting
            if (currentUrl && (currentUrl.startsWith('http://') || currentUrl.startsWith('https://') || currentUrl.startsWith('data:image'))) {
                imgElement.src = currentUrl;
                imgElement.alt = `Startup Image ${currentImageIndex + 1}`;
                imgElement.onerror = function() {
                    console.warn('Failed to load image:', currentUrl);
                    this.src = 'graphics/default-cover.jpg';
                };
            } else {
                imgElement.src = 'graphics/default-cover.jpg';
            }
        } else {
            imgElement.src = 'graphics/default-cover.jpg'; 
            return;
        }
        
        if(imageUrls.length <= 1) {
            document.getElementById('hero-prev-btn').style.display = 'none';
            document.getElementById('hero-next-btn').style.display = 'none';
        } else {
            document.getElementById('hero-prev-btn').style.display = 'flex';
            document.getElementById('hero-next-btn').style.display = 'flex';
        }
    }

    document.getElementById('hero-prev-btn').addEventListener('click', () => {
        if (imageUrls.length > 1) {
            currentImageIndex = (currentImageIndex === 0) ? imageUrls.length - 1 : currentImageIndex - 1;
            updateHeroImage();
        }
    });

    document.getElementById('hero-next-btn').addEventListener('click', () => {
        if (imageUrls.length > 1) {
            currentImageIndex = (currentImageIndex === imageUrls.length - 1) ? 0 : currentImageIndex + 1;
            updateHeroImage();
        }
    });
});

function openLightbox(src) {
    const overlay = document.getElementById('lightbox-overlay');
    const img = document.getElementById('lightbox-image');
    img.src = src;
    overlay.style.display = 'flex';
    overlay.onclick = () => overlay.style.display = 'none';
}