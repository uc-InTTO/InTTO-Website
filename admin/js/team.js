document.addEventListener('DOMContentLoaded', () => {
    let teamData = [];
    let editingMemberId = null;

    // --- DOM Elements ---
    const teamGrid = document.getElementById('team-grid');
    const searchInput = document.getElementById('search-input');
    const addMemberBtn = document.getElementById('add-member-btn');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const photoGalleryContainer = document.getElementById('photo-gallery-container');
    const photoGalleryGrid = document.getElementById('photo-gallery-grid');

    let isGalleryView = false;

    // Modal elements
    const teamMemberModalOverlay = document.getElementById('team-member-modal-overlay');
    const closeTeamMemberModalBtn = document.getElementById('close-team-member-modal-btn');
    const cancelMemberBtn = document.getElementById('cancel-member-btn');
    const teamMemberForm = document.getElementById('team-member-form');
    const teamMemberModalTitle = document.getElementById('team-member-modal-title');
    const teamMemberModalSubtitle = document.getElementById('team-member-modal-subtitle');
    const submitMemberBtn = document.getElementById('submit-member-btn');
    
    // Photo Gallery Modal
    const photoGalleryModal = document.getElementById('photo-gallery-modal');
    const closePhotoGalleryModal = document.getElementById('close-photo-gallery-modal');
    const viewPhotosBtn = document.getElementById('view-photos-btn');
    const modalPhotoGalleryGrid = document.getElementById('modal-photo-gallery-grid');
    
    // Image Cropper Modal
    const imageCropperModal = document.getElementById('image-cropper-modal');
    const closeCropperModal = document.getElementById('close-cropper-modal');
    const cropPhotoBtn = document.getElementById('crop-photo-btn');
    const cropperImage = document.getElementById('cropper-image');
    const applyCropBtn = document.getElementById('apply-crop-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const resetCropBtn = document.getElementById('reset-crop-btn');

    let cropper = null;
    let originalImageFile = null;

    // Form input elements
    const memberFullNameInput = document.getElementById('member-full-name');
    const memberPositionInput = document.getElementById('member-position');
    const memberEmailInput = document.getElementById('member-email');
    const memberPhotoInput = document.getElementById('member-photo');
    const photoPreview = document.getElementById('photo-preview');
    const previewImage = document.getElementById('preview-image');
    const memberDisplayOrderInput = document.getElementById('member-display-order');
    const memberRoleDescriptionTextarea = document.getElementById('member-role-description');

    let uploadedPhotoUrl = null;

    // Photo preview functionality
    memberPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            originalImageFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImage.src = event.target.result;
                photoPreview.style.display = 'block';
                cropPhotoBtn.style.display = 'block'; // Show crop button
            };
            reader.readAsDataURL(file);
        } else {
            photoPreview.style.display = 'none';
            cropPhotoBtn.style.display = 'none';
            originalImageFile = null;
        }
    });

    // --- Load Team Members from Firestore ---
    const loadTeamMembers = () => {
        const CACHE_KEY = 'admin_team_members';
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        let cached = localStorage.getItem(CACHE_KEY);
        let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
        let now = Date.now();

        if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
            // Use cached value
            teamData = JSON.parse(cached);
            renderTeamMembers();
            return;
        }

        db.collection('team').get().then((snapshot) => {
            teamData = [];
            snapshot.forEach((doc) => {
                teamData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            // Cache result
            localStorage.setItem(CACHE_KEY, JSON.stringify(teamData));
            localStorage.setItem(CACHE_KEY + '_time', now);
            renderTeamMembers();
        }).catch((error) => {
            console.error('Error loading team members:', error);
            teamGrid.innerHTML = '<p style="text-align: center; color: var(--text-light); margin-top: 30px;">Error loading team members. Please refresh the page.</p>';
        });
    };

    // --- Render Team Members ---
    const renderTeamMembers = () => {
        const searchTerm = searchInput.value.toLowerCase();

        const filteredData = teamData.filter(member => {
            return member.fullName.toLowerCase().includes(searchTerm) ||
                   member.position.toLowerCase().includes(searchTerm) ||
                   member.email.toLowerCase().includes(searchTerm) ||
                   (member.roleDescription && member.roleDescription.toLowerCase().includes(searchTerm));
        }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)); // Sort by display order

        teamGrid.innerHTML = '';
        if (filteredData.length === 0) {
            teamGrid.innerHTML = '<p style="text-align: center; color: var(--text-light); margin-top: 30px;">No team members found.</p>';
            return;
        }

        filteredData.forEach(member => {
            const card = document.createElement('div');
            card.className = 'team-member-card';
            card.dataset.id = member.id;

            // Use photo URL or default avatar
            let avatarContent;
            if (member.photoUrl) {
                avatarContent = `<img src="${member.photoUrl}" alt="${member.fullName}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">`;
            } else {
                avatarContent = '<i class="fa-solid fa-user" style="font-size: 40px;"></i>';
            }

            card.innerHTML = `
                <div class="avatar">${avatarContent}</div>
                <h3>${member.fullName}</h3>
                <p class="position">${member.position}</p>
                <p class="description">${member.roleDescription || ''}</p>
                <a href="mailto:${member.email}" class="contact-email"><i class="fa-solid fa-envelope"></i> ${member.email}</a>
                <div class="card-actions">
                    <button class="action-btn edit-btn" title="Edit"><i class="fa-solid fa-pencil"></i> Edit</button>
                    <button class="action-btn remove-btn" title="Remove"><i class="fa-solid fa-trash-can"></i> Remove</button>
                </div>
            `;
            teamGrid.appendChild(card);
        });
        attachActionListeners();
    };

    // --- Attach Listeners to Dynamic Buttons ---
    const attachActionListeners = () => {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', e => {
                const id = e.target.closest('.team-member-card').dataset.id;
                editMember(id);
            });
        });
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', e => {
                const id = e.target.closest('.team-member-card').dataset.id;
                deleteMember(id);
            });
        });
    };

    // --- Modal Functions ---
    const openModal = () => teamMemberModalOverlay.classList.add('active');
    
    const closeModal = () => {
        teamMemberModalOverlay.classList.remove('active');
        teamMemberForm.reset();
        photoPreview.style.display = 'none';
        uploadedPhotoUrl = null;
        editingMemberId = null;
        memberDisplayOrderInput.value = teamData.length + 1; // Suggest next order
    };

    // --- CRUD Functions ---
    const editMember = (id) => {
        const member = teamData.find(m => m.id === id);
        if (!member) return;

        editingMemberId = id;

        memberFullNameInput.value = member.fullName;
        memberPositionInput.value = member.position;
        memberEmailInput.value = member.email;
        uploadedPhotoUrl = member.photoUrl || null;
        
        // Show existing photo if available
        if (member.photoUrl) {
            previewImage.src = member.photoUrl;
            photoPreview.style.display = 'block';
        } else {
            photoPreview.style.display = 'none';
        }
        
        memberDisplayOrderInput.value = member.displayOrder || 1;
        memberRoleDescriptionTextarea.value = member.roleDescription || '';

        teamMemberModalTitle.textContent = 'Edit Team Member';
        teamMemberModalSubtitle.textContent = 'Update team member information';
        submitMemberBtn.textContent = 'Update Member';
        openModal();
    };

    const deleteMember = (id) => {
        if (confirm('Are you sure you want to remove this team member?')) {
            db.collection('team').doc(id).delete()
                .then(() => {
                    console.log('Team member deleted successfully');
                    // Auto-reload to reflect changes
                    setTimeout(() => location.reload(), 1000);
                })
                .catch((error) => {
                    console.error('Error deleting team member:', error);
                    alert('Error deleting team member. Please try again.');
                });
        }
    };

    // --- Event Listeners ---
    addMemberBtn.addEventListener('click', () => {
        editingMemberId = null;
        teamMemberForm.reset();
        memberDisplayOrderInput.value = teamData.length > 0 ? Math.max(...teamData.map(m => m.displayOrder || 0)) + 1 : 1;
        teamMemberModalTitle.textContent = 'Add Team Member';
        teamMemberModalSubtitle.textContent = 'Add a new member to the InTTO team';
        submitMemberBtn.textContent = 'Add Member';
        openModal();
    });

    closeTeamMemberModalBtn.addEventListener('click', closeModal);
    cancelMemberBtn.addEventListener('click', closeModal);
    teamMemberModalOverlay.addEventListener('click', (e) => {
        if (e.target === teamMemberModalOverlay) closeModal();
    });

    // Photo Gallery Modal Event Listeners
    viewPhotosBtn.addEventListener('click', () => {
        openPhotoGalleryModal();
    });

    closePhotoGalleryModal.addEventListener('click', () => {
        photoGalleryModal.classList.remove('active');
    });

    photoGalleryModal.addEventListener('click', (e) => {
        if (e.target === photoGalleryModal) {
            photoGalleryModal.classList.remove('active');
        }
    });

    // Image Cropper Modal Event Listeners
    cropPhotoBtn.addEventListener('click', () => {
        if (originalImageFile) {
            openImageCropper();
        }
    });

    closeCropperModal.addEventListener('click', () => {
        closeImageCropper();
    });

    cancelCropBtn.addEventListener('click', () => {
        closeImageCropper();
    });

    imageCropperModal.addEventListener('click', (e) => {
        if (e.target === imageCropperModal) {
            closeImageCropper();
        }
    });

    applyCropBtn.addEventListener('click', () => {
        applyCroppedImage();
    });

    // Cropper controls
    zoomInBtn.addEventListener('click', () => {
        if (cropper) cropper.zoom(0.1);
    });

    zoomOutBtn.addEventListener('click', () => {
        if (cropper) cropper.zoom(-0.1);
    });

    rotateLeftBtn.addEventListener('click', () => {
        if (cropper) cropper.rotate(-90);
    });

    rotateRightBtn.addEventListener('click', () => {
        if (cropper) cropper.rotate(90);
    });

    resetCropBtn.addEventListener('click', () => {
        if (cropper) cropper.reset();
    });

    // Open Image Cropper
    const openImageCropper = () => {
        const reader = new FileReader();
        reader.onload = (e) => {
            cropperImage.src = e.target.result;
            imageCropperModal.classList.add('active');
            
            // Initialize cropper
            if (cropper) {
                cropper.destroy();
            }
            
            cropper = new Cropper(cropperImage, {
                aspectRatio: 1, // Square crop for profile photos
                viewMode: 2,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(originalImageFile);
    };

    // Close Image Cropper
    const closeImageCropper = () => {
        imageCropperModal.classList.remove('active');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    };

    // Apply cropped image
    const applyCroppedImage = () => {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({
            width: 800,
            height: 800,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        canvas.toBlob((blob) => {
            // Create a new File object from the blob
            const croppedFile = new File([blob], originalImageFile.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });

            // Update the preview
            const croppedUrl = URL.createObjectURL(blob);
            previewImage.src = croppedUrl;

            // Create a new FileList-like object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(croppedFile);
            memberPhotoInput.files = dataTransfer.files;

            closeImageCropper();
        }, 'image/jpeg', 0.95);
    };

    // Open Photo Gallery Modal
    const openPhotoGalleryModal = () => {
        photoGalleryModal.classList.add('active');
        renderModalPhotoGallery();
    };

    // Render photos in modal
    const renderModalPhotoGallery = () => {
        const sortedMembers = [...teamData].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
        modalPhotoGalleryGrid.innerHTML = '';
        
        if (sortedMembers.length === 0) {
            modalPhotoGalleryGrid.innerHTML = '<p style="text-align: center; width: 100%; padding: 40px; grid-column: 1/-1;">No team members found. Add team members first.</p>';
            return;
        }

        sortedMembers.forEach((member, index) => {
            const galleryItem = createModalGalleryItem(member, index + 1);
            modalPhotoGalleryGrid.appendChild(galleryItem);
        });
        
        initializeModalDragAndDrop();
    };

    // Create gallery item for modal
    const createModalGalleryItem = (member, orderNumber) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.draggable = true;
        item.dataset.id = member.id;
        item.dataset.order = member.displayOrder || 0;

        const imageContent = member.photoUrl 
            ? `<img src="${member.photoUrl}" alt="${member.fullName}" class="gallery-item-image">`
            : `<div class="no-photo-placeholder"><i class="fa-solid fa-user"></i></div>`;

        item.innerHTML = `
            ${imageContent}
            <div class="gallery-item-info">
                <h4 class="gallery-item-name">${member.fullName}</h4>
                <p class="gallery-item-position">${member.position}</p>
                <span class="gallery-item-order">
                    <i class="fa-solid fa-grip-vertical"></i> Position: ${orderNumber}
                </span>
            </div>
        `;

        return item;
    };

    // Initialize drag and drop for modal
    let draggedModalElement = null;

    const initializeModalDragAndDrop = () => {
        const items = modalPhotoGalleryGrid.querySelectorAll('.gallery-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', handleModalDragStart);
            item.addEventListener('dragover', handleModalDragOver);
            item.addEventListener('drop', handleModalDrop);
            item.addEventListener('dragend', handleModalDragEnd);
            item.addEventListener('dragenter', handleModalDragEnter);
            item.addEventListener('dragleave', handleModalDragLeave);
        });
    };

    const handleModalDragStart = (e) => {
        draggedModalElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleModalDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    };

    const handleModalDragEnter = (e) => {
        const target = e.target.closest('.gallery-item');
        if (target) {
            target.classList.add('drag-over');
        }
    };

    const handleModalDragLeave = (e) => {
        const target = e.target.closest('.gallery-item');
        if (target) {
            target.classList.remove('drag-over');
        }
    };

    const handleModalDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target.closest('.gallery-item');
        if (!target || target === draggedModalElement) return;

        target.classList.remove('drag-over');

        // Get IDs
        const draggedId = draggedModalElement.dataset.id;
        const targetId = target.dataset.id;

        // Swap display orders
        swapDisplayOrders(draggedId, targetId);

        return false;
    };

    const handleModalDragEnd = (e) => {
        e.target.classList.remove('dragging');
        modalPhotoGalleryGrid.querySelectorAll('.gallery-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    };

    teamMemberForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Disable submit button to prevent double submission
        submitMemberBtn.disabled = true;
        submitMemberBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

        try {
            // Upload photo if a new one was selected
            if (memberPhotoInput.files.length > 0) {
                const file = memberPhotoInput.files[0];
                uploadedPhotoUrl = await uploadImageToCloudinary(file);
            }

            const formData = {
                fullName: memberFullNameInput.value.trim(),
                position: memberPositionInput.value.trim(),
                email: memberEmailInput.value.trim(),
                photoUrl: uploadedPhotoUrl || null,
                displayOrder: parseInt(memberDisplayOrderInput.value) || 1,
                roleDescription: memberRoleDescriptionTextarea.value.trim(),
                active: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (editingMemberId !== null) {
                // Update existing member
                await db.collection('team').doc(editingMemberId).update(formData);
                console.log('Team member updated successfully');
            } else {
                // Add new member
                formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('team').add(formData);
                console.log('Team member added successfully');
            }

            closeModal();
            // Auto-reload to reflect changes
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('Error saving team member:', error);
            alert('Error saving team member. Please try again.');
        } finally {
            submitMemberBtn.disabled = false;
            submitMemberBtn.textContent = editingMemberId ? 'Update Member' : 'Add Member';
        }
    });

    // Upload image to Cloudinary
    async function uploadImageToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'team_members');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error('Failed to upload image to Cloudinary');
        }

        const data = await response.json();
        return data.secure_url;
    }

    searchInput.addEventListener('input', renderTeamMembers);

    // Toggle between list and gallery view
    toggleViewBtn.addEventListener('click', () => {
        isGalleryView = !isGalleryView;
        
        if (isGalleryView) {
            teamGrid.style.display = 'none';
            photoGalleryContainer.style.display = 'block';
            toggleViewBtn.innerHTML = '<i class="fa-solid fa-list"></i> List View';
            renderPhotoGallery();
        } else {
            teamGrid.style.display = 'grid';
            photoGalleryContainer.style.display = 'none';
            toggleViewBtn.innerHTML = '<i class="fa-solid fa-images"></i> Photo Gallery';
        }
    });

    // --- Photo Gallery Functions ---
    const renderPhotoGallery = () => {
        const sortedMembers = [...teamData].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
        photoGalleryGrid.innerHTML = '';
        
        if (sortedMembers.length === 0) {
            photoGalleryGrid.innerHTML = '<p style="text-align: center; width: 100%; padding: 40px;">No team members found.</p>';
            return;
        }

        sortedMembers.forEach((member, index) => {
            const galleryItem = createGalleryItem(member, index + 1);
            photoGalleryGrid.appendChild(galleryItem);
        });
        
        initializeDragAndDrop();
    };

    const createGalleryItem = (member, orderNumber) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.draggable = true;
        item.dataset.id = member.id;
        item.dataset.order = member.displayOrder || 0;

        const imageContent = member.photoUrl 
            ? `<img src="${member.photoUrl}" alt="${member.fullName}" class="gallery-item-image">`
            : `<div class="no-photo-placeholder"><i class="fa-solid fa-user"></i></div>`;

        item.innerHTML = `
            ${imageContent}
            <div class="gallery-item-info">
                <h4 class="gallery-item-name">${member.fullName}</h4>
                <p class="gallery-item-position">${member.position}</p>
                <span class="gallery-item-order">
                    <i class="fa-solid fa-grip-vertical"></i> Order: ${orderNumber}
                </span>
                <div class="gallery-item-actions">
                    <button class="gallery-edit-btn" onclick="editMemberFromGallery('${member.id}')">
                        <i class="fa-solid fa-pencil"></i> Edit
                    </button>
                    <button class="gallery-delete-btn" onclick="deleteMemberFromGallery('${member.id}')">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;

        return item;
    };

    // Drag and Drop functionality
    let draggedElement = null;

    const initializeDragAndDrop = () => {
        const items = document.querySelectorAll('.gallery-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragenter', handleDragEnter);
            item.addEventListener('dragleave', handleDragLeave);
        });
    };

    const handleDragStart = (e) => {
        draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    };

    const handleDragEnter = (e) => {
        if (e.target.classList.contains('gallery-item')) {
            e.target.classList.add('drag-over');
        }
    };

    const handleDragLeave = (e) => {
        if (e.target.classList.contains('gallery-item')) {
            e.target.classList.remove('drag-over');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target.closest('.gallery-item');
        if (!target || target === draggedElement) return;

        target.classList.remove('drag-over');

        // Get IDs
        const draggedId = draggedElement.dataset.id;
        const targetId = target.dataset.id;

        // Swap display orders
        swapDisplayOrders(draggedId, targetId);

        return false;
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    };

    const swapDisplayOrders = async (id1, id2) => {
        const member1 = teamData.find(m => m.id === id1);
        const member2 = teamData.find(m => m.id === id2);

        if (!member1 || !member2) return;

        const order1 = member1.displayOrder || 0;
        const order2 = member2.displayOrder || 0;

        try {
            // Update in Firestore
            await db.collection('team').doc(id1).update({ displayOrder: order2 });
            await db.collection('team').doc(id2).update({ displayOrder: order1 });

            console.log('Display orders swapped successfully');
        } catch (error) {
            console.error('Error swapping display orders:', error);
            alert('Error reordering team members. Please try again.');
        }
    };

    // Global functions for gallery buttons
    window.editMemberFromGallery = (id) => {
        editMember(id);
    };

    window.deleteMemberFromGallery = (id) => {
        deleteMember(id);
    };

    // --- Initial Load ---
    loadTeamMembers();
});