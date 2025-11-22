document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Firebase
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

    // 2. Get Startup ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const startupId = urlParams.get('id');

    if (!startupId) {
        window.location.href = 'startups.html';
        return;
    }

    // 3. Variables for Slider
    let currentImageIndex = 0;
    let imageUrls = [];

    try {
        // 4. Fetch Data
        const doc = await db.collection('startups').doc(startupId).get();

        if (!doc.exists) {
            document.getElementById('detail-title').textContent = 'Startup Not Found';
            return;
        }

        const data = doc.data();
        imageUrls = data.imageUrls || [];

        // --- POPULATE HERO SECTION ---
        
        // Title & Tab Name
        document.title = `${data.name || 'Details'} - InTTO`;
        document.getElementById('detail-title').textContent = data.name || 'Unnamed Startup';
        
        // Circular Logo Logic
        const iconContainer = document.getElementById('detail-icon');
        // Check if logo is a URL (http) or Base64 (data:)
        if (data.imageUrls && data.imageUrls.length > 0 && (data.imageUrls[0].startsWith('http') || data.imageUrls[0].startsWith('data:'))) {
             iconContainer.innerHTML = `<img src="${data.imageUrls[0]}" alt="Logo">`;
        } else {
             // Use Emoji fallback
             iconContainer.textContent = data.logo || "🚀";
        }

        // --- TAGS (Cohort & SDGs) ---
        const tagsContainer = document.getElementById('detail-tags');
        let tagsHtml = '';

        // 1. Cohort (Green Tag)
        // Checks 'cohort' or 'Cohort' in case of capitalization differences in DB
        const cohortVal = data.cohort || data.Cohort;
        if (cohortVal) {
            tagsHtml += `<span class="tag-cohort">${cohortVal}</span>`;
        }

        // 2. SDGs (White Outline Tags)
        const sdgList = data.sdgs || data.sdg; // Handle array or string
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

        // --- SLIDER LOGIC ---
        updateHeroImage();

        // --- MAIN CONTENT ---
        document.getElementById('detail-long-desc').textContent = data.description || 'No detailed description available.';
        document.getElementById('detail-problem').textContent = data.problem || "Information coming soon.";
        document.getElementById('detail-solution').textContent = data.solution || "Information coming soon.";

        // Gallery Grid
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

        // Features
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

        // --- SIDEBAR (TRL FIX) ---
        
        // 1. Clean the TRL data (Handle string vs number)
        let rawTrl = data.trl; 
        let trlNumber = 1; // Default fallback

        if (typeof rawTrl === 'number') {
            trlNumber = rawTrl;
        } else if (typeof rawTrl === 'string') {
            // Extract the first number found in the string (e.g. "TRL 6" -> 6)
            const match = rawTrl.match(/\d+/); 
            if (match) {
                trlNumber = parseInt(match[0]);
            }
        }

        // Ensure it stays between 1 and 9
        if (trlNumber < 1) trlNumber = 1;
        if (trlNumber > 9) trlNumber = 9;

        // 2. Update the number text
        const trlNumText = document.getElementById('trl-num-text');
        if(trlNumText) trlNumText.textContent = trlNumber;
        
        // 3. Calculate Percentage
        const percentage = Math.round((trlNumber / 9) * 100);
        document.getElementById('detail-trl-percent').textContent = `${percentage}%`;
        document.getElementById('detail-trl-progress').style.width = `${percentage}%`;
        
        // 4. Update Status Label
        const trlStatuses = {
            1: "Basic Principles", 2: "Concept Formulated", 3: "Proof of Concept",
            4: "Laboratory Testing", 5: "Relevant Environment", 6: "Demonstrated",
            7: "System Prototype", 8: "System Complete", 9: "Successful Operations"
        };
        document.getElementById('detail-trl-label').textContent = trlStatuses[trlNumber] || "Concept Phase";


        // --- SIDEBAR (INFO & PUBLISHER) ---
        document.getElementById('detail-start-date').textContent = data.dateStarted || "2025";
        document.getElementById('detail-team-size').textContent = data.teamSize || "Unknown";
        document.getElementById('detail-college').textContent = data.college || "UC";
        document.getElementById('detail-industry').textContent = data.industry || "Tech";

        document.getElementById('detail-founder-name').textContent = data.contactPerson || data.publisherName || "Admin";
        document.getElementById('detail-founder-role').textContent = data.publisherRole || "Project Lead";
        document.getElementById('detail-founder-affiliation').textContent = data.affiliation || "University of the Cordilleras";
        
        if(data.email) document.getElementById('detail-founder-email').textContent = data.email;
        if(data.phone) document.getElementById('detail-founder-phone').textContent = data.phone;


    } catch (error) {
        console.error("Error loading project:", error);
        document.getElementById('detail-title').textContent = "Error Loading Data";
    }

    // --- HELPER FUNCTIONS ---

    function updateHeroImage() {
        const imgElement = document.getElementById('detail-image');
        // If we have images, use the first one (or current index)
        if (imageUrls.length > 0) {
            imgElement.src = imageUrls[currentImageIndex];
        } else {
            // Fallback if NO images at all
            imgElement.src = 'graphics/default-cover.jpg'; 
            return;
        }
        
        // Show/Hide buttons based on number of images
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

// Lightbox Logic (Global)
function openLightbox(src) {
    const overlay = document.getElementById('lightbox-overlay');
    const img = document.getElementById('lightbox-image');
    img.src = src;
    overlay.style.display = 'flex';
    overlay.onclick = () => overlay.style.display = 'none';
}