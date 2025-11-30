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
            initializeCancelButton();
        } else {
            alert("You must be signed in to submit a project.");
            window.location.href = 'index.html';
        }
    });

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
        async function handleImageUpload(fileInput, previewElement, index) {
            const file = fileInput.files[0];
            const slot = previewElement.closest('.image-upload-slot');
            const removeBtn = slot ? slot.querySelector('.remove-image-btn') : null;
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewElement.src = e.target.result;
                    previewElement.classList.add('visible');
                    if(removeBtn) removeBtn.style.display = 'block';
                }
                reader.readAsDataURL(file);
                uploadingImages[index] = true;
                try {
                    const imageUrl = await CloudinaryUploader.uploadImage(file, index);
                    uploadedImageUrls[index] = imageUrl;
                } catch (error) {
                    alert(`Error uploading image ${index + 1}`);
                } finally {
                    uploadingImages[index] = false;
                }
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
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error("❌ Error saving project:", error);
                    alert("Error saving project: " + error.message);
                    submitBtn.textContent = "Submit Project";
                    submitBtn.disabled = false;
                }
            });
        }
    }

    function initializeCancelButton() {
        const cancelButton = document.querySelector('.btn-cancel');
        if(cancelButton) {
            cancelButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm("Are you sure you want to cancel?")) window.history.back();
            });
        }
    }
});