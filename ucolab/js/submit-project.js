document.addEventListener('DOMContentLoaded', function() {
    let uploadedImageUrls = ["", "", "", "", ""]; 
    let uploadingImages = [false, false, false, false, false]; 

    auth.onAuthStateChanged(function(user) {
        if (user) {
            const loggedInUser = user.displayName || user.email;
            updateHeader(user, loggedInUser);
            initializeImageUploaders();
            initializeCustomDropdown('industry-dropdown-btn', 'industry-checkbox-list', 'industry-selected-pills', 'industry-validation');
            initializeCustomDropdown('college-dropdown-btn', 'college-checkbox-list', 'college-selected-pills', 'college-validation');
            initializeCustomDropdown('sdg-dropdown-btn', 'sdg-checkbox-list', 'sdg-selected-pills', 'sdg-validation');
            initializeCharCounter();
            initializeFormSubmit(user);
            initializeNavigationLogic();
        } else {
            alert("You must be signed in to submit a project.");
            window.location.href = 'index.html';
        }
    });

    function closeTabOrRedirect() {
        if (window.opener) {
            window.close();
        } else {
            window.location.href = 'index.html';
        }
    }

    function updateHeader(user, loggedInUser) {
        const userDisplayPill = document.getElementById('user-display');
        const signOutButton = document.getElementById('signout-btn-main');
        if (userDisplayPill) {
            userDisplayPill.innerHTML = `<i class="fa-solid fa-user"></i> ${loggedInUser.split('@')[0]}`;
            userDisplayPill.style.fontFamily = "'Poppins', sans-serif";
        }
        if (signOutButton) signOutButton.addEventListener('click', (e) => { e.preventDefault(); auth.signOut().then(() => { alert("Signed out."); window.location.href = 'index.html'; }); });
        
        const founderEmailInput = document.getElementById('founder-email');
        if (founderEmailInput && user.email) { founderEmailInput.value = user.email; founderEmailInput.readOnly = true; }
        
        const founderFirstNameInput = document.getElementById('founder-first-name');
        const founderLastNameInput = document.getElementById('founder-last-name');
        if (founderFirstNameInput && founderLastNameInput && user.displayName) {
            const names = user.displayName.split(' ');
            founderFirstNameInput.value = names[0];
            founderLastNameInput.value = names.slice(1).join(' ');
        }
    }

    function initializeCustomDropdown(btnId, listId, pillsId, validationId) {
        const dropdownBtn = document.getElementById(btnId);
        const checkboxList = document.getElementById(listId);
        const pillsContainer = document.getElementById(pillsId);
        const defaultText = document.querySelector(`#${btnId} .dropdown-button-text`);
        const validationInput = document.getElementById(validationId);

        if (!dropdownBtn || !checkboxList || !pillsContainer) return;

        const checkboxes = checkboxList.querySelectorAll('input[type="checkbox"]');

        function updatePills() {
            pillsContainer.innerHTML = '';
            let hasSelection = false;
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    hasSelection = true;
                    const pill = document.createElement('span');
                    pill.className = 'pill';
                    pill.textContent = checkbox.value;
                    pill.style.fontFamily = "'Poppins', sans-serif";
                    
                    const removeBtn = document.createElement('span');
                    removeBtn.className = 'pill-remove';
                    removeBtn.innerHTML = '&times;';
                    removeBtn.onclick = (e) => {
                        e.stopPropagation();
                        checkbox.checked = false;
                        updatePills();
                    };
                    pill.appendChild(removeBtn);
                    pillsContainer.appendChild(pill);
                }
            });

            if (hasSelection) {
                if(defaultText) defaultText.style.display = 'none';
                pillsContainer.style.display = 'flex';
                if (validationInput) validationInput.value = 'selected';
            } else {
                if(defaultText) defaultText.style.display = 'block';
                pillsContainer.style.display = 'none';
                if (validationInput) validationInput.value = '';
            }
        }

        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            checkboxList.classList.toggle('visible');
            dropdownBtn.classList.toggle('open');
        });

        window.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target) && !checkboxList.contains(e.target)) {
                checkboxList.classList.remove('visible');
                dropdownBtn.classList.remove('open');
            }
        });

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updatePills);
        });
    }
    
    function initializeCharCounter() {
        const shortDescTextarea = document.getElementById('short-description');
        const counterElement = document.getElementById('short-desc-counter');
        if (shortDescTextarea && counterElement) {
            shortDescTextarea.addEventListener('input', () => { 
                counterElement.textContent = `${shortDescTextarea.value.length} / 100`; 
                counterElement.style.fontFamily = "'Poppins', sans-serif";
            });
        }
    }

    function initializeImageUploaders() {
        async function blobFromCanvas(canvas, mimeType, quality) {
            if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
                // OffscreenCanvas uses convertToBlob
                return await canvas.convertToBlob({ type: mimeType, quality });
            }
            return await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), mimeType, quality);
            });
        }

        async function compressImageToTarget(file, targetKB = 50, options = { maxWidth: 1200, minQuality: 0.12, qualityStep: 0.07, scaleStep: 0.9 }) {
            if (!file) return file;
            // Skip GIFs and SVGs (animated or vector) and very small files
            if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size <= targetKB * 1024) return file;

            // Determine if image has alpha - if so, try webp to preserve transparency
            const useWebP = file.type === 'image/png' || file.type === 'image/webp';
            const targetType = useWebP ? 'image/webp' : 'image/jpeg';

            // Create an image bitmap for drawing where possible, else use an Image element
            let bitmap = null;
            let imgEl = null;
            const supportsCreateImageBitmap = typeof createImageBitmap === 'function';
            if (supportsCreateImageBitmap) {
                try {
                    bitmap = await createImageBitmap(file);
                } catch (err) {
                    // ignore and fall back to Image element
                    bitmap = null;
                }
            }
            let tmpObjectUrl = null;
            if (!bitmap) {
                tmpObjectUrl = URL.createObjectURL(file);
                imgEl = await new Promise((resolve, reject) => {
                    const i = new Image();
                    i.onload = () => resolve(i);
                    i.onerror = reject;
                    i.src = tmpObjectUrl;
                });
            }

            const sourceWidth = bitmap ? bitmap.width : imgEl.width;
            const sourceHeight = bitmap ? bitmap.height : imgEl.height;
            let width = Math.min(options.maxWidth, sourceWidth);
            let height = Math.round((sourceHeight / sourceWidth) * width);
            let quality = 0.92;
            let bestBlob = null;

            while (true) {
                // Canvas creation: use OffscreenCanvas if available to avoid layout thrash
                let canvas;
                if (typeof OffscreenCanvas !== 'undefined') {
                    canvas = new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
                } else {
                    canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, width);
                    canvas.height = Math.max(1, height);
                }
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (bitmap) {
                    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                } else if (imgEl) {
                    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
                }

                const blob = await blobFromCanvas(canvas, targetType, quality);
                if (blob) {
                    bestBlob = blob; // store last produced blob in case we can't reach target
                    if (blob.size <= targetKB * 1024) {
                        // build file
                        const ext = targetType === 'image/webp' ? '.webp' : '.jpg';
                        bitmap && bitmap.close && bitmap.close();
                        tmpObjectUrl && URL.revokeObjectURL(tmpObjectUrl);
                        return new File([blob], file.name.replace(/\.[^/.]+$/, ext), { type: targetType });
                    }
                }

                // If quality can be reduced more, try reducing quality first
                if (quality > options.minQuality + 0.01) {
                    quality = Math.max(options.minQuality, quality - options.qualityStep);
                    continue; // try again with same dimensions, lower quality
                }

                // Quality floor reached, try scale down
                const newWidth = Math.round(width * options.scaleStep);
                if (newWidth < 64) {
                    // Can't scale more - stop and return best attempt
                    bitmap && bitmap.close && bitmap.close();
                    tmpObjectUrl && URL.revokeObjectURL(tmpObjectUrl);
                    if (bestBlob) return new File([bestBlob], file.name.replace(/\.[^/.]+$/, targetType === 'image/webp' ? '.webp' : '.jpg'), { type: targetType });
                    return file; // fallback to original
                }

                width = newWidth;
                height = Math.max(1, Math.round((bitmap ? bitmap.height : imgEl.height) / (bitmap ? bitmap.width : imgEl.width) * width));
                // reset quality for next pass
                quality = 0.9;
            }
        }

        // Cropper variables (global within this module)
        let cropperModal = null;
        let cropperInstance = null;
        let cropperImageEl = null;
        let currentCropFile = null;
        let currentCropIndex = null;
        let currentCropPreview = null;

        function initCropperModal() {
            cropperModal = document.getElementById('image-cropper-modal');
            cropperImageEl = document.getElementById('cropper-image');
            const closeCropBtn = document.getElementById('close-cropper-modal');
            const applyCropBtn = document.getElementById('apply-crop-btn');
            const skipCropBtn = document.getElementById('skip-crop-btn');
            const rotateLeftBtn = document.getElementById('rotate-left-btn');
            const rotateRightBtn = document.getElementById('rotate-right-btn');

            if (closeCropBtn) closeCropBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                // Capture values then close modal
                const file = currentCropFile;
                const preview = currentCropPreview;
                const idx = currentCropIndex;
                closeCropperModal();
                // Close acts as skip -> continue with upload of original file
                if (file && preview && idx !== null) {
                    console.log('[Cropper] Close button pressed - skipping crop and uploading original image');
                    await continueUploadAfterCrop(file, preview, idx);
                }
            });
            if (skipCropBtn) skipCropBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const file = currentCropFile;
                const preview = currentCropPreview;
                const idx = currentCropIndex;
                closeCropperModal();
                // proceed with original file flow
                if (file && preview && idx !== null) {
                    await continueUploadAfterCrop(file, preview, idx);
                }
            });
            if (applyCropBtn) applyCropBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await applyCropAndUpload();
            });
            if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => { if (cropperInstance) cropperInstance.rotate(-90); });
            if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => { if (cropperInstance) cropperInstance.rotate(90); });

            // Overlay click should act as skip (upload original file)
            if (cropperModal) {
                cropperModal.addEventListener('click', async (e) => {
                    if (e.target === cropperModal) {
                        // overlay clicked
                        e.preventDefault();
                        const file = currentCropFile;
                        const preview = currentCropPreview;
                        const idx = currentCropIndex;
                        closeCropperModal();
                        if (file && preview && idx !== null) {
                            console.log('[Cropper] Overlay clicked - skipping crop and uploading original image');
                            await continueUploadAfterCrop(file, preview, idx);
                        }
                    }
                });
            }
        }

        async function openCropperModal(file, previewElement, index) {
            console.log('[Cropper] Opening cropper for slot', index + 1, file);
            if (!cropperModal) initCropperModal();
            if (!cropperImageEl) return;
            currentCropFile = file;
            currentCropIndex = index;
            currentCropPreview = previewElement;

            try {
                const url = URL.createObjectURL(file);
                cropperImageEl.src = url;
                cropperModal.classList.remove('modal-hidden');
                // destroy existing
                if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
                // Choose aspect ratio for slot 1 (cover) => 16/9, else free
                const options = {
                    viewMode: 1,
                    autoCropArea: 0.8,
                    movable: true,
                    scalable: true,
                    zoomable: true,
                    responsive: true
                };
                if (index === 0) options.aspectRatio = 16 / 9;
                cropperInstance = new Cropper(cropperImageEl, options);
            } catch (e) {
                console.warn('Could not open cropper', e);
                // fallback: do not open modal, continue with original file
                await continueUploadAfterCrop(file, previewElement, index);
            }
        }

        function closeCropperModal() {
            if (!cropperModal) return;
            cropperModal.classList.add('modal-hidden');
            if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
            if (cropperImageEl && cropperImageEl.src && cropperImageEl.src.startsWith('blob:')) {
                URL.revokeObjectURL(cropperImageEl.src);
                cropperImageEl.src = '';
            }
            // Reset references
            currentCropFile = null;
            currentCropIndex = null;
            currentCropPreview = null;
        }

        async function applyCropAndUpload() {
            if (!cropperInstance || !currentCropFile || !currentCropPreview) return;
            // Capture the preview & index before closing modal
            const preview = currentCropPreview;
            const idx = currentCropIndex;
            try {
                const canvas = cropperInstance.getCroppedCanvas({ maxWidth: 1600, maxHeight: 1600, fillColor: '#ffffff' });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
                const croppedFile = new File([blob], currentCropFile.name.replace(/\.[^.]+$/, '') + '-cropped.jpg', { type: 'image/jpeg' });
                closeCropperModal();
                await continueUploadAfterCrop(croppedFile, preview, idx);
            } catch (err) {
                console.error('applyCropAndUpload error', err);
                closeCropperModal();
            }
        }

        async function continueUploadAfterCrop(file, previewElement, index) {
            const fileToUse = file;
            // fallback: if previewElement is null (unexpected), try to find it by index
            if (!previewElement) {
                previewElement = document.getElementById(`image-preview-${index + 1}`);
                console.warn('[Uploader] previewElement was null; looked up by index', index + 1, previewElement);
            }
            const slot = previewElement ? previewElement.closest('.image-upload-slot') : null;
            const removeBtn = slot ? slot.querySelector('.remove-image-btn') : null;
            // Show preview of cropped image
            try {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewElement.src = e.target.result;
                    previewElement.classList.add('visible');
                    if (removeBtn) removeBtn.style.display = 'block';
                }
                reader.readAsDataURL(fileToUse);
            } catch (err) {
                console.warn('preview read failed', err);
            }

            uploadingImages[index] = true;
            try {
                console.log(`[Uploader] Uploading image slot ${index + 1}`, fileToUse);
                if (slot) slot.classList.add('uploading');
                // compress and upload
                let compressedFile = fileToUse;
                try { compressedFile = await compressImageToTarget(fileToUse, 50); } catch (err) { compressedFile = fileToUse; }
                const imageUrl = await CloudinaryUploader.uploadImage(compressedFile, index);
                uploadedImageUrls[index] = imageUrl;
                console.log(`[Uploader] Successfully uploaded slot ${index + 1}:`, imageUrl);
            } catch (error) {
                alert(`Error uploading image ${index + 1}`);
            } finally {
                uploadingImages[index] = false;
                if (slot) slot.classList.remove('uploading');
            }
        }

        async function handleImageUpload(fileInput, previewElement, index) {
            const file = fileInput.files[0];
            const slot = previewElement.closest('.image-upload-slot');
            const removeBtn = slot ? slot.querySelector('.remove-image-btn') : null;
            if (file) {
                // Open cropper modal; the cropper will handle upload after crop or skip
                await openCropperModal(file, previewElement, index);
            }
        }
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`image-upload-${i}`);
            const preview = document.getElementById(`image-preview-${i}`);
            if (input && preview) {
                input.addEventListener('change', () => handleImageUpload(input, preview, i - 1));
            }
            const slot = preview?.closest('.image-upload-slot');
            const removeBtn = slot?.querySelector('.remove-image-btn');
            if(removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    input.value = "";
                    preview.src = "";
                    preview.classList.remove('visible');
                    removeBtn.style.display = 'none';
                    uploadedImageUrls[i-1] = "";
                });
            }
        }
    }

    function initializeFormSubmit(user) {
        const submitForm = document.querySelector('.submit-form');
        if (submitForm) {
            submitForm.addEventListener('submit', async function(event) {
                event.preventDefault();

                if (uploadingImages.some(status => status === true)) {
                    alert('Please wait for all images to finish uploading before submitting.');
                    return;
                }

                const submitBtn = submitForm.querySelector('.btn-submit');
                submitBtn.textContent = "Submitting...";
                submitBtn.disabled = true;

                const finalImageUrls = uploadedImageUrls.filter(url => url !== "");
                const projectNameValue = document.getElementById('project-name')?.value || 'Project';
                
                const selectedIndustries = Array.from(document.querySelectorAll('#industry-checkbox-list input[type="checkbox"]:checked')).map(cb => cb.value);
                const selectedColleges = Array.from(document.querySelectorAll('#college-checkbox-list input[type="checkbox"]:checked')).map(cb => cb.value);
                const selectedSdgs = Array.from(document.querySelectorAll('#sdg-checkbox-list input[type="checkbox"]:checked')).map(cb => cb.value);

                const founderFirstName = document.getElementById('founder-first-name')?.value;
                const founderLastName = document.getElementById('founder-last-name')?.value;
                
                const featuresList = [
                    { title: document.getElementById('feature1-title')?.value, description: document.getElementById('feature1-desc')?.value },
                    { title: document.getElementById('feature2-title')?.value, description: document.getElementById('feature2-desc')?.value },
                    { title: document.getElementById('feature3-title')?.value, description: document.getElementById('feature3-desc')?.value },
                    { title: document.getElementById('feature4-title')?.value, description: document.getElementById('feature4-desc')?.value },
                ].filter(f => f.title && f.title.trim() !== ""); 

                const newProject = {
                    name: projectNameValue,
                    title: projectNameValue,
                    type: document.getElementById('project-type')?.value || 'N/A',
                    industry: selectedIndustries,
                    category: selectedIndustries,
                    college: selectedColleges,
                    trl: document.getElementById('trl-level')?.value || 'TRL ?',
                    sdgs: selectedSdgs,
                    shortDescription: document.getElementById('short-description')?.value || '',
                    description: document.getElementById('short-description')?.value || '',
                    detailedDescription: document.getElementById('detailed-description')?.value || '',
                    problemStatement: document.getElementById('problem-statement')?.value || '',
                    solution: document.getElementById('solution')?.value || '',
                    
                    features: featuresList,
                    imageUrls: finalImageUrls,
                    
                    startDate: document.getElementById('start-date')?.value || 'N/A',
                    teamSize: document.getElementById('team-size')?.value || 'N/A',
                    
                    founderFirstName: founderFirstName,
                    founderLastName: founderLastName,
                    founderName: `${founderFirstName} ${founderLastName}`,
                    
                    founderRole: document.getElementById('founder-role')?.value,
                    founderAffiliation: document.getElementById('founder-affiliation')?.value,
                    founderEmail: document.getElementById('founder-email')?.value,
                    
                    founderPhone: document.getElementById('founder-phone')?.value || '', 
                    
                    views: 0,
                    inquiries: 0,
                    userId: user.uid, 
                    submittedByEmail: user.email,
                    status: 'pending',
                    createdAt: firebase.firestore.Timestamp.now(), 
                    updatedAt: firebase.firestore.Timestamp.now()
                };

                try {
                    await db.collection('startups').add(newProject);
                    
                    alert("Project submitted successfully!");
                    closeTabOrRedirect();
                } catch (error) {
                    console.error("Error saving project:", error);
                    alert("Error saving project: " + error.message);
                    submitBtn.textContent = "Submit Project";
                    submitBtn.disabled = false;
                }
            });
        }
    }

    function initializeNavigationLogic() {
        const backLink = document.querySelector('.back-link');
        const cancelButton = document.querySelector('.btn-cancel');

        if (backLink) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                closeTabOrRedirect();
            });
        }

        if (cancelButton) {
            cancelButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm("Are you sure you want to cancel? Unsaved changes will be lost.")) {
                    closeTabOrRedirect();
                }
            });
        }
    }
});