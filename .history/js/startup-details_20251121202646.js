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
        
        const iconContainer = document.getElementById('detail-icon');
        if (data.imageUrls && data.imageUrls.length > 0 && (data.imageUrls[0].startsWith('http') || data.imageUrls[0].startsWith('data:'))) {
             iconContainer.innerHTML = `<img src="${data.imageUrls[0]}" alt="Logo">`;
        } else {
             iconContainer.textContent = data.logo || "🚀";
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

        // FIX 1: Use detailedDescription for the main overview
        document.getElementById('detail-long-desc').textContent = data.detailedDescription || data.description || 'No detailed description available.';
        
        // FIX 2: Use problemStatement and solution
        document.getElementById('detail-problem').textContent = data.problemStatement || "Information coming soon.";
        document.getElementById('detail-solution').textContent = data.solution || "Information coming soon.";

        const galleryGrid = document.getElementById('detail-gallery-grid');
        galleryGrid.innerHTML = ''; 
        if (imageUrls.length > 0) {
            imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.className = 'gallery-image';
                img.src = url;
                img.onclick = () => openLightbox(url);
                galleryGrid.appendChild(img);
            });
        } else {
            galleryGrid.innerHTML = '<p style="color:#888; font-style:italic;">No additional images.</p>';
        }

        // FIX 3: Key Features (Innovation, Sustainability, Scalability, Community Impact)
        const featuresGrid = document.getElementById('detail-features-grid');
        const features = [
            { title: "Innovation", text: data.innovation },
            { title: "Sustainability", text: data.sustainability },
            { title: "Scalability", text: data.scalability },
            { title: "Community Impact", text: data.communityImpact }
        ];
        
        featuresGrid.innerHTML = ''; 
        let hasFeatures = false;
        features.forEach(feat => {
            if(feat.text) {
                hasFeatures = true;
                featuresGrid.innerHTML += `
                    <div class="feature-item">
                        <h4>${feat.title}</h4>
                        <p>${feat.text}</p>
                    </div>`;
            }
        });
        if(!hasFeatures) featuresGrid.innerHTML = '<p>Features not listed.</p>';

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

        document.getElementById('detail-start-date').textContent = data.startDate || "2025";
        document.getElementById('detail-team-size').textContent = data.teamSize || "Unknown";
        document.getElementById('detail-college').textContent = data.college || "UC";
        document.getElementById('detail-industry').textContent = data.industry || "Tech";

        document.getElementById('detail-founder-name').textContent = data.founderName || data.contactPerson || data.publisherName || "Admin";
        document.getElementById('detail-founder-role').textContent = data.founderRole || data.publisherRole || "Project Lead";
        document.getElementById('detail-founder-affiliation').textContent = data.founderAffiliation || data.affiliation || "University of the Cordilleras";
        
        if(data.founderEmail) document.getElementById('detail-founder-email').textContent = data.founderEmail;

        // FIX 4: Use founderPhone and ensure container is visible
        const phoneContainer = document.getElementById('detail-founder-phone-container');
        const phoneValue = document.getElementById('detail-founder-phone');
        
        if(data.founderPhone) {
            phoneValue.textContent = data.founderPhone;
            if (phoneContainer) {
                // Assuming it needs to be flex to align icon/text
                phoneContainer.style.display = 'flex'; 
            }
        } else {
            phoneValue.textContent = '--';
             if (phoneContainer) {
                // If no phone data, hide the entire row.
                phoneContainer.style.display = 'none';
            }
        }


    } catch (error) {
        console.error("Error loading project:", error);
        document.getElementById('detail-title').textContent = "Error Loading Data";
    }

    function updateHeroImage() {
        const imgElement = document.getElementById('detail-image');
        if (imageUrls.length > 0) {
            imgElement.src = imageUrls[currentImageIndex];
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