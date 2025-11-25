document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
<<<<<<< Updated upstream
    // Lightbox elements
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.querySelector('.lightbox-caption');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    let currentImages = [];
    let currentImageIndex = 0;
    
=======
    const skeleton = document.getElementById('loading-skeleton');
    const realContent = document.getElementById('real-content');

>>>>>>> Stashed changes
    if (!eventId) {
        console.error('No event ID provided');
        showError('No event ID provided');
        return;
    }
    
    db.collection('newsEvents').doc(eventId).get()
        .then((doc) => {
            if (!doc.exists) {
                console.error('Event not found');
                showError('Event not found');
                return;
            }
            
            const event = { id: doc.id, ...doc.data() };
            displayEventDetails(event);
            loadRelatedPosts(event);

            setTimeout(() => {
                skeleton.style.display = 'none';
                realContent.style.display = 'block';
            }, 300);
        })
        .catch((error) => {
            console.error('Error loading event:', error);
            showError('Error loading event details');
        });
    
    function showError(message) {
        const skeleton = document.getElementById('loading-skeleton');
        const mainWrapper = document.querySelector('.main-wrapper');
        
        if (skeleton) skeleton.style.display = 'none';
        
        if (mainWrapper) {
            mainWrapper.innerHTML = `<p style="color: black; text-align: center; padding: 100px; font-family: 'Poppins';">${message}</p>`;
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
                    <div class="event-tag">${event.type ? event.type.toUpperCase() : 'EVENT'}</div>
                    <div class="event-date">${formatDate(event.date)}</div>
                `;
            }
            
            if (titleDiv) {
                titleDiv.textContent = event.title;
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
            }
            
            const authorValue = infoCards.querySelector('.info-card:nth-child(2) .info-value');
            if (authorValue) {
                authorValue.textContent = 'UC InTTO';
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
        }
        
        const aboutDescription = document.querySelector('.about-description');
        if (aboutDescription) {
            aboutDescription.textContent = event.content || event.description || '';
        }
        
        const eventGallery = document.querySelector('.event-gallery');
        if (eventGallery && event.images && event.images.length > 0) {
            currentImages = event.images; // Store images for lightbox
            
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
<<<<<<< Updated upstream
                
                // Add "View More" if there are more than 4 images
                if (event.images.length > 4) {
                    const viewMoreDiv = document.createElement('div');
                    viewMoreDiv.className = 'view-more-thumbnail thumbnail';
                    viewMoreDiv.onclick = () => openLightbox(4);
                    viewMoreDiv.innerHTML = `
                        <img src="${event.images[4]}" alt="View More Thumbnail" class="gallery-img view-more-img">
                        <div class="view-more-overlay">+${event.images.length - 4} More</div>
                    `;
                    thumbnailContainer.appendChild(viewMoreDiv);
                }
=======
>>>>>>> Stashed changes
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
                                    <span class="tag">${(post.type || 'news').toUpperCase()}</span>
                                    <span class="date">${formatDate(post.date)}</span>
                                </div>
                                <h3 class="news-title">${post.title}</h3>
                                <p class="news-desc">${excerpt}</p>
                                <a href="newsEventPage.html?id=${post.id}" class="read-more">Read More →</a>
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
                console.error('Error loading related posts:', error);
            });
    }
<<<<<<< Updated upstream
    
    // Lightbox Functions
    function openLightbox(index) {
        if (!currentImages || currentImages.length === 0) return;
        
        currentImageIndex = index;
        lightboxImg.src = currentImages[index];
        lightboxCaption.textContent = `Image ${index + 1} of ${currentImages.length}`;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto'; // Re-enable scrolling
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
    
    // Event listeners for lightbox
    if (closeBtn) closeBtn.onclick = closeLightbox;
    if (prevBtn) prevBtn.onclick = showPrevImage;
    if (nextBtn) nextBtn.onclick = showNextImage;
    
    // Close lightbox when clicking outside the image
    if (lightbox) {
        lightbox.onclick = (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        };
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });
});
=======
});
>>>>>>> Stashed changes
