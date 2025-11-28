document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.querySelector('.lightbox-caption');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    let currentImages = [];
    let currentImageIndex = 0;
    
    const skeleton = document.getElementById('loading-skeleton');
    const realContent = document.getElementById('real-content');

    if (!eventId) {
        showError('No event ID provided');
        return;
    }
    
    const CACHE_KEY = `news_event_detail_${eventId}`;
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    let cached = localStorage.getItem(CACHE_KEY);
    let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
    let now = Date.now();

    let event;
    if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
        event = JSON.parse(cached);
        displayEventDetails(event);
        loadRelatedPosts(event);
        setTimeout(() => {
            skeleton.style.display = 'none';
            realContent.style.display = 'block';
        }, 300);
    } else {
        db.collection('newsEvents').doc(eventId).get()
            .then((doc) => {
                if (!doc.exists) {
                    showError('Event not found');
                    return;
                }
                
                event = { id: doc.id, ...doc.data() };
                localStorage.setItem(CACHE_KEY, JSON.stringify(event));
                localStorage.setItem(CACHE_KEY + '_time', now);
                displayEventDetails(event);
                loadRelatedPosts(event);

                setTimeout(() => {
                    skeleton.style.display = 'none';
                    realContent.style.display = 'block';
                }, 300);
            })
            .catch((error) => {
                showError('Error loading event details');
            });
    }
    
    function showError(message) {
        const skeleton = document.getElementById('loading-skeleton');
        const mainWrapper = document.querySelector('.main-wrapper');
        
        if (skeleton) skeleton.style.display = 'none';
        
        if (mainWrapper) {
            mainWrapper.innerHTML = `<p style="color: black; text-align: center; padding: 100px; font-family: 'Poppins', sans-serif;">${message}</p>`;
        }
    }
    
    function displayEventDetails(event) {
        document.title = event.title + ' - UC InTTO';
        
        const eventShowcase = document.querySelector('.event-showcase');
        if (eventShowcase) {
            const categoryDateDiv = eventShowcase.querySelector('.event-category-date');
            const titleDiv = eventShowcase.querySelector('.event-title');
            
            if (categoryDateDiv) {
                categoryDateDiv.innerHTML = `
                    <div class="event-tag" style="font-family: 'Poppins', sans-serif;">${event.type ? event.type.toUpperCase() : 'EVENT'}</div>
                    <div class="event-date" style="font-family: 'Poppins', sans-serif;">${formatDate(event.date)}</div>
                `;
            }
            
            if (titleDiv) {
                titleDiv.textContent = event.title;
                titleDiv.style.fontFamily = "'Poppins', sans-serif";
            }
        }
        
        const heroSection = document.querySelector('.hero');
        if (heroSection && event.images && event.images.length > 0) {
            heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${event.images[0]}')`;
            heroSection.style.backgroundSize = 'cover';
            heroSection.style.backgroundPosition = 'center';
        }
        
        const infoCards = document.querySelector('.info-cards-grid');
        if (infoCards) {
            const dateValue = infoCards.querySelector('.info-card:nth-child(1) .info-value');
            if (dateValue) {
                dateValue.textContent = formatDate(event.date);
                dateValue.style.fontFamily = "'Poppins', sans-serif";
            }
            
            const authorValue = infoCards.querySelector('.info-card:nth-child(2) .info-value');
            if (authorValue) {
                authorValue.textContent = 'UC InTTO';
                authorValue.style.fontFamily = "'Poppins', sans-serif";
            }
            
            const sdgIconsContainer = infoCards.querySelector('.sdg-icons');
            if (sdgIconsContainer && event.sdgs && event.sdgs.length > 0) {
                sdgIconsContainer.innerHTML = '';
                event.sdgs.forEach(sdgNumber => {
                    const img = document.createElement('img');
                    img.src = `graphics/goal${sdgNumber}.png`;
                    img.alt = `SDG ${sdgNumber}`;
                    img.className = 'sdg-icon';
                    img.onerror = function() {
                        this.style.display = 'none';
                    };
                    sdgIconsContainer.appendChild(img);
                });
            }
        }
        
        const aboutTitle = document.querySelector('.about-title');
        if (aboutTitle) {
            aboutTitle.textContent = `About This ${event.type === 'event' ? 'Event' : 'News'}`;
            aboutTitle.style.fontFamily = "'Poppins', sans-serif";
        }
        
        const aboutDescription = document.querySelector('.about-description');
        if (aboutDescription) {
            const textContent = event.content || event.description || '';
            aboutDescription.innerHTML = textContent.replace(/[\r\n]+/g, '<br><br>');
            aboutDescription.style.fontFamily = "'Poppins', sans-serif";
        }
        
        const eventGallery = document.querySelector('.event-gallery');
        if (eventGallery && event.images && event.images.length > 0) {
            currentImages = event.images; 
            
            const mainImage = eventGallery.querySelector('.main-image img');
            if (mainImage) {
                mainImage.src = event.images[0];
                mainImage.alt = event.title;
                mainImage.onclick = () => openLightbox(0);
            }
            
            const thumbnailContainer = eventGallery.querySelector('.thumbnail-images');
            if (thumbnailContainer) {
                thumbnailContainer.innerHTML = '';
                
                for (let i = 1; i < event.images.length; i++) {
                    const img = document.createElement('img');
                    img.src = event.images[i];
                    img.alt = `${event.title} - Image ${i + 1}`;
                    img.className = 'gallery-img thumbnail';
                    img.onclick = () => {
                        mainImage.src = event.images[i];
                        openLightbox(i);
                    };
                    thumbnailContainer.appendChild(img);
                }
            }
        } else {
            const galleryTitle = document.querySelector('.gallery-title');
            if (galleryTitle) galleryTitle.style.display = 'none';
            if (eventGallery) eventGallery.style.display = 'none';
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'Date not available';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    function loadRelatedPosts(currentEvent) {
        db.collection('newsEvents')
            .where('type', '==', currentEvent.type)
            .where('status', '==', 'published')
            .limit(4)
            .get()
            .then((snapshot) => {
                const relatedPosts = [];
                snapshot.forEach((doc) => {
                    if (doc.id !== currentEvent.id) {
                        relatedPosts.push({ id: doc.id, ...doc.data() });
                    }
                });
                
                const newsCardsContainer = document.querySelector('.news-cards');
                if (newsCardsContainer && relatedPosts.length > 0) {
                    newsCardsContainer.innerHTML = '';
                    
                    relatedPosts.slice(0, 3).forEach(post => {
                        const card = document.createElement('div');
                        card.className = 'news-card';
                        
                        const imgUrl = (post.images && post.images.length > 0) ? post.images[0] : 'graphics/news.png';
                        const excerpt = (post.content || '').substring(0, 120) + '...';
                        
                        card.innerHTML = `
                            <img src="${imgUrl}" alt="${post.title}" onerror="this.src='graphics/news.png'">
                            <div class="news-content">
                                <div class="news-meta">
                                    <span class="tag" style="font-family: 'Poppins', sans-serif;">${(post.type || 'news').toUpperCase()}</span>
                                    <span class="date" style="font-family: 'Poppins', sans-serif;">${formatDate(post.date)}</span>
                                </div>
                                <h3 class="news-title" style="font-family: 'Poppins', sans-serif;">${post.title}</h3>
                                <p class="news-desc" style="font-family: 'Poppins', sans-serif;">${excerpt}</p>
                                <a href="newsEventPage.html?id=${post.id}" class="read-more" style="font-family: 'Poppins', sans-serif;">Read More →</a>
                            </div>
                        `;
                        
                        newsCardsContainer.appendChild(card);
                    });
                } else if (newsCardsContainer) {
                    const relatedSection = document.querySelector('.related-posts-section');
                    if (relatedSection) relatedSection.style.display = 'none';
                }
            })
            .catch((error) => {
            });
    }
    
    function openLightbox(index) {
        if (!currentImages || currentImages.length === 0) return;
        
        currentImageIndex = index;
        lightboxImg.src = currentImages[index];
        lightboxCaption.textContent = `Image ${index + 1} of ${currentImages.length}`;
        lightboxCaption.style.fontFamily = "'Poppins', sans-serif";
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    function showPrevImage() {
        currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
        lightboxImg.src = currentImages[currentImageIndex];
        lightboxCaption.textContent = `Image ${currentImageIndex + 1} of ${currentImages.length}`;
    }
    
    function showNextImage() {
        currentImageIndex = (currentImageIndex + 1) % currentImages.length;
        lightboxImg.src = currentImages[currentImageIndex];
        lightboxCaption.textContent = `Image ${currentImageIndex + 1} of ${currentImages.length}`;
    }
    
    if (closeBtn) closeBtn.onclick = closeLightbox;
    if (prevBtn) prevBtn.onclick = showPrevImage;
    if (nextBtn) nextBtn.onclick = showNextImage;
    
    if (lightbox) {
        lightbox.onclick = (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        };
    }
    
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });
});