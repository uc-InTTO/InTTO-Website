document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const applicationsContainer = document.getElementById('applications-container');
    const searchInput = document.getElementById('search-input');
    const statusFilters = document.getElementById('status-filters');
    const sortSelect = document.getElementById('sort-select');
    const detailsModal = document.getElementById('details-modal');
    const confirmModal = document.getElementById('confirm-modal');
    
    // Stats counters
    const totalApplicationsEl = document.getElementById('total-applications');
    const pendingCountEl = document.getElementById('pending-count');
    const approvedCountEl = document.getElementById('approved-count');
    const rejectedCountEl = document.getElementById('rejected-count');
    
    // State
    let applications = [];
    let currentApplicationId = null;
    let currentAction = null;
    let delegateAttached = false;
    let currentActionReason = null;
    let unsubscribe = null; // Firestore onSnapshot unsubscribe
    
    // Initialize
    loadApplications();
    setupEventListeners();
    
    /**
     * Load applications from Firestore
     */
    // Helper: Safely convert Firestore Timestamp / Date / string to Date
    function toDateSafe(ts) {
        if (!ts) return new Date(0);
        // Firestore Timestamp object
        if (typeof ts.toDate === 'function') return ts.toDate();
        // Object with seconds (Firestore JSON repr)
        if (ts && (typeof ts.seconds === 'number' || typeof ts._seconds === 'number')) return new Date((ts.seconds || ts._seconds) * 1000);
        // Timestamp-like with toMillis
        if (ts && typeof ts.toMillis === 'function') return new Date(ts.toMillis());
        // Already a Date
        if (ts instanceof Date) return ts;
        // String ISO
        if (typeof ts === 'string') return new Date(ts);
        // Fallback
        return new Date(0);
    }
    function loadApplications() {
        // Unsubscribe existing listener if present
        if (typeof unsubscribe === 'function') {
            try { unsubscribe(); } catch (e) { /* ignore */ }
            unsubscribe = null;
        }

        showLoading();

        // Use onSnapshot so the UI reflects Firestore updates in real-time
        unsubscribe = db.collection('incubation_applications')
            .orderBy('submittedAt', 'desc')
            .onSnapshot((snapshot) => {
                applications = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const status = (data.status || 'pending').toLowerCase();
                    applications.push({ id: doc.id, ...data, status });
                });
                updateStats();
                renderApplications();
            }, (error) => {
                showError('Failed to load applications: ' + (error && error.message ? error.message : error));
            });
    }
    
    /**
     * Update statistics counters
     */
    function updateStats() {
        const total = applications.length;
        const pending = applications.filter(app => {
            const status = (app.status || 'pending').toLowerCase();
            return status === 'pending';
        }).length;
        const approved = applications.filter(app => {
            const status = (app.status || 'pending').toLowerCase();
            return status === 'approved' || status === 'approve';
        }).length;
        const rejected = applications.filter(app => {
            const status = (app.status || 'pending').toLowerCase();
            return status === 'rejected' || status === 'reject';
        }).length;
        
        totalApplicationsEl.textContent = total;
        pendingCountEl.textContent = pending;
        approvedCountEl.textContent = approved;
        rejectedCountEl.textContent = rejected;
    }
    
    /**
     * Render applications list
     */
    function renderApplications() {
        const searchTerm = searchInput.value.toLowerCase();
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const activeStatus = activeFilterBtn ? activeFilterBtn.dataset.status : 'all';
        const sortValue = sortSelect.value;

        let filtered = applications.filter(app => {
            const appStatus = (app.status || 'pending').toLowerCase();
            
            const matchesSearch = 
                (app.fullName || '').toLowerCase().includes(searchTerm) ||
                (app.email || '').toLowerCase().includes(searchTerm) ||
                (app.startupName || '').toLowerCase().includes(searchTerm);
            
            let matchesStatus = false;
            if (activeStatus === 'all') {
                matchesStatus = true;
            } else if (activeStatus === 'pending') {
                matchesStatus = appStatus === 'pending';
            } else if (activeStatus === 'approved') {
                matchesStatus = appStatus === 'approved' || appStatus === 'approve';
            } else if (activeStatus === 'rejected') {
                matchesStatus = appStatus === 'rejected' || appStatus === 'reject';
            }
            
            return matchesSearch && matchesStatus;
        });

        filtered.sort((a, b) => {
            switch (sortValue) {
                case 'recent':
                    return toDateSafe(b.submittedAt) - toDateSafe(a.submittedAt);
                case 'oldest':
                    return toDateSafe(a.submittedAt) - toDateSafe(b.submittedAt);
                case 'name-asc':
                    return (a.fullName || '').localeCompare(b.fullName || '');
                case 'name-desc':
                default:
                    return 0;
            }
        });

        if (filtered.length === 0) {
            showEmptyState();
        } else {
            applicationsContainer.innerHTML = filtered.map(app => createApplicationCard(app)).join('');
            attachCardEventListeners();
        }
    }

    function createApplicationCard(app) {
        const status = (app.status || 'pending').toLowerCase();
        const submittedAt = toDateSafe(app.submittedAt) || new Date();
        const formattedDate = submittedAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        let statusDisplay = '';
        let statusClass = '';

        if (status === 'approved' || status === 'approve') {
            statusDisplay = 'Approved';
            statusClass = 'approved';
        } else if (status === 'rejected' || status === 'reject') {
            statusDisplay = 'Rejected';
            statusClass = 'rejected';
        } else {
            statusDisplay = 'Pending';
            statusClass = 'pending';
        }

        return `
            <div class="application-row" data-id="${app.id}">
                
                <div class="row-section profile-section">
                    <div class="profile-main">
                        <div class="startup-icon">
                            <i class="fas fa-rocket"></i>
                        </div>
                        <div>
                            <h3 class="row-title">${app.fullName || 'N/A'}</h3>
                            <div class="row-subtitle">
                                <span>${app.startupName || 'No Startup'}</span>
                                <span class="dot-separator">•</span>
                                <span>${app.email || 'N/A'}</span>
                            </div>
                            <p class="row-desc">${(app.briefDescription || app.detailedDescription || '').substring(0, 120)}${(app.briefDescription || app.detailedDescription || '').length > 120 ? '...' : ''}</p>
                        </div>
                    </div>
                </div>

                <div class="row-section details-section">
                    <div class="detail-item">
                        <span class="detail-label">Department</span>
                        <span class="detail-value">${app.deptCollege || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Industry</span>
                        <span class="detail-value">${app.industry || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Submitted</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    <div class="detail-item status-wrapper">
                        <span class="status-badge ${statusClass}">${statusDisplay}</span>
                    </div>
                </div>

                <div class="row-section action-section">
                    <button class="action-btn-icon view" title="View Details" data-id="${app.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    
                    ${statusClass !== 'approved' ? `
                        <button class="action-btn-icon approve" title="Approve" data-id="${app.id}" data-action="approve">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}

                    ${statusClass !== 'rejected' ? `
                        <button class="action-btn-icon reject" title="Reject" data-id="${app.id}" data-action="reject">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}

                    <button class="action-btn-icon delete" title="Delete" data-id="${app.id}" data-action="delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>

            </div>
        `;
    }

    function attachCardEventListeners() {
        const buttons = applicationsContainer.querySelectorAll('.action-btn-icon');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const id = btn.dataset.id;
                const action = btn.dataset.action;

                if (btn.classList.contains('view')) {
                    showApplicationDetails(id);
                } else if (action === 'approve') {
                    confirmAction(id, 'approve');
                } else if (action === 'reject') {
                    confirmAction(id, 'reject');
                } else if (action === 'delete') {
                    confirmAction(id, 'delete');
                }
            });
        });
        // Fallback: event delegation in case the elements dynamically change
        if (!delegateAttached) {
            delegateAttached = true;
            applicationsContainer.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.action-btn-icon.view');
                if (viewBtn && viewBtn.dataset && viewBtn.dataset.id) {
                    e.stopPropagation();
                    showApplicationDetails(viewBtn.dataset.id);
                }
            });
        }
    }
    
    /**
     * Show application details in modal
     */
    function showApplicationDetails(id) {
        const app = applications.find(a => a.id === id);
        if (!app) {
            console.warn('Application not found for id', id);
            showError('Application not found');
            return;
        }
        currentApplicationId = id;
        
        // Personal Information
        const fullNameEl = document.getElementById('detail-fullName');
        if (fullNameEl) fullNameEl.textContent = app.fullName || 'N/A';
        const emailEl = document.getElementById('detail-email');
        if (emailEl) emailEl.textContent = app.email || 'N/A';
        const phoneEl = document.getElementById('detail-phone');
        if (phoneEl) phoneEl.textContent = app.phone || 'N/A';
        const studentIdEl = document.getElementById('detail-studentId');
        if (studentIdEl) studentIdEl.textContent = app.studentId || 'N/A';
        const deptEl = document.getElementById('detail-deptCollege');
        if (deptEl) deptEl.textContent = app.deptCollege || 'N/A';
        const yearEl = document.getElementById('detail-yearLevel');
        if (yearEl) yearEl.textContent = app.yearLevel ? `${app.yearLevel} Year` : 'N/A';
        
        // Startup Information
        const startupNameEl = document.getElementById('detail-startupName');
        if (startupNameEl) startupNameEl.textContent = app.startupName || 'N/A';
        const industryEl = document.getElementById('detail-industry');
        if (industryEl) industryEl.textContent = app.industry || 'N/A';
        const devStageEl = document.getElementById('detail-developmentStage');
        if (devStageEl) devStageEl.textContent = app.developmentStage || 'N/A';
        // Short description (form field: briefDescription)
        const briefDescEl = document.getElementById('detail-briefDescription');
        if (briefDescEl) briefDescEl.textContent = app.briefDescription || app.description || app.detailedDescription || 'N/A';
        // Support legacy or combined field names: 'problemSolution' may contain both problem and solution
        const rawProblemSolution = app.problemSolution || ((app.problemStatement || '') + (app.solution ? '\n\n' + app.solution : '')) || '';
        function parseProblemSolution(raw) {
            if (!raw) return { problem: '', solution: '' };
            const labelIndex = raw.search(/solution\s*:/i);
            if (labelIndex !== -1) {
                const problemPart = raw.substring(0, labelIndex).trim().replace(/^problem\s*:/i, '').trim();
                const solutionPart = raw.substring(labelIndex + raw.match(/solution\s*:/i)[0].length).trim();
                return { problem: problemPart || '', solution: solutionPart || '' };
            }
            if (raw.indexOf('\n\n') !== -1) {
                const parts = raw.split(/\n\n+/);
                return { problem: parts[0].trim(), solution: parts.slice(1).join('\n\n').trim() };
            }
            return { problem: raw.trim(), solution: '' };
        }
        const parsed = parseProblemSolution(rawProblemSolution);
        const probEl = document.getElementById('detail-problemStatement');
        if (probEl) probEl.textContent = parsed.problem || 'N/A';
        const solEl = document.getElementById('detail-solution');
        if (solEl) solEl.textContent = parsed.solution || app.solution || 'N/A';
        const targetEl = document.getElementById('detail-targetMarket');
        if (targetEl) targetEl.textContent = app.targetMarket || 'N/A';
        
        const websiteEl = document.getElementById('detail-websiteSocial');
        if (websiteEl) {
            if (app.websiteSocial) {
                websiteEl.innerHTML = `<a href="${app.websiteSocial}" target="_blank" style="color: var(--secondary-color);">${app.websiteSocial}</a>`;
            } else {
                websiteEl.textContent = 'N/A';
            }
        }
        
        // Team Information
        const teamSizeEl = document.getElementById('detail-teamSize');
        if (teamSizeEl) teamSizeEl.textContent = app.teamSize || 'N/A';
        const coFoundersEl = document.getElementById('detail-coFounders');
        if (coFoundersEl) coFoundersEl.textContent = app.coFounders || 'N/A';
        const teamExpEl = document.getElementById('detail-teamExperience');
        if (teamExpEl) teamExpEl.textContent = app.teamExperience || 'N/A';
        
        // Program Expectations
        const supportNeededEl = document.getElementById('detail-supportNeeded');
        if (supportNeededEl) {
            if (app.supportNeeded && app.supportNeeded.length > 0) {
                supportNeededEl.innerHTML = app.supportNeeded.map(support => 
                    `<span class="tag">${support}</span>`
                ).join('');
            } else {
                supportNeededEl.textContent = 'N/A';
            }
        }
        
        const goalsEl = document.getElementById('detail-goals');
        if (goalsEl) goalsEl.textContent = app.goals || 'N/A';
        
        // Submission Info
        const applicationIdEl = document.getElementById('detail-applicationId');
        if (applicationIdEl) applicationIdEl.textContent = id;
        const submittedAt = toDateSafe(app.submittedAt) || new Date();
        const submittedAtEl = document.getElementById('detail-submittedAt');
        if (submittedAtEl) submittedAtEl.textContent = submittedAt.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        const status = (app.status || 'pending').toLowerCase();
        const statusEl = document.getElementById('detail-status');
        
        // Normalize status for display
        let statusDisplay = '';
        let statusClass = '';
        if (status === 'approved' || status === 'approve') {
            statusDisplay = 'Approved';
            statusClass = 'approved';
        } else if (status === 'rejected' || status === 'reject') {
            statusDisplay = 'Rejected';
            statusClass = 'rejected';
        } else {
            statusDisplay = 'Pending';
            statusClass = 'pending';
        }
        
        statusEl.textContent = statusDisplay;
        statusEl.className = `status-badge ${statusClass}`;
        
        // Show modal
        detailsModal.classList.add('active');
    }
    
    /**
     * Confirm action before executing
     */
    function confirmAction(id, action) {
        currentApplicationId = id;
        currentAction = action;
        
        const messages = {
            approve: 'Are you sure you want to approve this application?',
            reject: 'Are you sure you want to reject this application?',
            pending: 'Set this application back to pending status?',
            delete: 'Are you sure you want to delete this application? This action cannot be undone.'
        };
        
        const titles = {
            approve: 'Approve Application',
            reject: 'Reject Application',
            pending: 'Set Pending',
            delete: 'Delete Application'
        };
        
        document.getElementById('confirm-title').textContent = titles[action];
        document.getElementById('confirm-message').textContent = messages[action];
        
        // If rejecting, ask for a reason (optional)
        if (action === 'reject') {
            const reason = prompt('Enter a reason for rejection (optional):');
            currentActionReason = reason === null ? '' : reason;
        } else {
            currentActionReason = null;
        }
        confirmModal.classList.add('active');
    }
    
    /**
     * Execute confirmed action
     */
    function executeAction() {
        if (!currentApplicationId || !currentAction) return;
        
        if (currentAction === 'delete') {
            deleteApplication(currentApplicationId);
        } else {
            updateApplicationStatus(currentApplicationId, currentAction, currentActionReason);
        }
        
        confirmModal.classList.remove('active');
        detailsModal.classList.remove('active');
        currentApplicationId = null;
        currentAction = null;
        currentActionReason = null;
    }
    
    /**
     * Update application status
     */
    function updateApplicationStatus(id, status, reason = '') {
        // Normalize status to lowercase
        const normalizedStatus = status.toLowerCase();
        
        // Get the application data before updating
        const app = applications.find(a => a.id === id);
        
        // Show loading or disable buttons while updating
        const updateData = {
            status: normalizedStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if ((normalizedStatus === 'reject' || normalizedStatus === 'rejected') && reason) {
            updateData.rejectionReason = reason;
        }
        db.collection('incubation_applications').doc(id).update(updateData).then(() => {
            const statusText = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
            showSuccess(`Application ${statusText} successfully`);
            
            // Update local applications array immediately for instant UI update
            const appIndex = applications.findIndex(app => app.id === id);
            if (appIndex !== -1) {
                applications[appIndex].status = normalizedStatus;
                if (updateData.rejectionReason) {
                    applications[appIndex].rejectionReason = updateData.rejectionReason;
                }
            }
            
            // Force re-render
            updateStats();
            renderApplications();
            // No local cache used; Firestore onSnapshot will update the UI automatically
            
            // If approved, open Gmail to send notification email
            if ((normalizedStatus === 'approve' || normalizedStatus === 'approved')) {
                if (app && app.email) {
                    sendApprovalEmail(app);
                }
            }
            // If rejected, send rejection email
            if ((normalizedStatus === 'reject' || normalizedStatus === 'rejected')) {
                if (app && app.email) {
                    sendRejectionEmail(app, reason || '');
                }
            }
        }).catch((error) => {
            showError('Failed to update status: ' + error.message);
        });
    }
    
    /**
     * Open Gmail to send approval email
     */
    function sendApprovalEmail(app) {
        const recipientEmail = app.email;
        const applicantName = app.fullName || 'Applicant';
        const startupName = app.startupName || 'your startup';
        
        // Email template
        const appliedDateStr = app.submittedAt ? toDateSafe(app.submittedAt).toLocaleDateString() : 'N/A';
        const subject = encodeURIComponent(`Congratulations! Your Innovation Program Application has been Approved`);
        const body = encodeURIComponent(
`Dear ${applicantName},

Congratulations! We are pleased to inform you that your application for the UC InTTO Innovation Program has been APPROVED.

Application Details:
- Startup Name: ${startupName}
- Application ID: ${app.id || 'N/A'}
- Date Applied: ${appliedDateStr}

Next Steps:
1. We will contact you shortly to discuss the onboarding process
2. Please prepare any additional documentation that may be required
3. Join our orientation session (details to follow)

If you have any questions or need immediate assistance, please don't hesitate to reach out to us.

We look forward to working with you and supporting your innovation journey!

Best regards,
UC InTTO Team
University of the Cordilleras - Innovation Technology and Transfer Office`
        );
        
        // Open Gmail compose with pre-filled content
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${subject}&body=${body}`;
        
        // Open in new tab
        window.open(gmailUrl, '_blank');
    }

    /**
     * Send rejection email via Gmail (admin-triggered)
     * @param {Object} app - The application object
     * @param {string} reason - Optional reason for rejection
     */
    function sendRejectionEmail(app, reason = '') {
        const recipientEmail = app.email;
        const applicantName = app.fullName || 'Applicant';
        const startupName = app.startupName || 'your startup';
        const appliedDateStr = app.submittedAt ? toDateSafe(app.submittedAt).toLocaleDateString() : 'N/A';

        const subject = encodeURIComponent(`Important: Your Innovation Program Application Status`);
        const body = encodeURIComponent(
`Dear ${applicantName},

We regret to inform you that your application for the UC InTTO Innovation Program has been REJECTED.

Application Details:
- Startup Name: ${startupName}
- Application ID: ${app.id || 'N/A'}
- Date Applied: ${appliedDateStr}

Rejection Reason:
${reason || 'Not specified'}

Next Steps:
1. If you have questions or want feedback, please reply to this email.
2. You may re-apply in the next intake with updated documentation or improvements.

We appreciate your interest in UC InTTO and encourage you to keep innovating.

Best regards,
UC InTTO Team
University of the Cordilleras - Innovation, Technology Transfer Office`
        );

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
    }
    
    /**
     * Delete application
     */
    function deleteApplication(id) {
        db.collection('incubation_applications').doc(id).delete()
        .then(() => {
            showSuccess('Application deleted successfully');
            // Update local state; onSnapshot will also sync with Firestore
            applications = applications.filter(app => String(app.id) !== String(id));
            // Re-render to update the UI immediately
            updateStats();
            renderApplications();
        }).catch((error) => {
            showError('Failed to delete application: ' + error.message);
        });
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Search
        searchInput.addEventListener('input', renderApplications);
        
        // Status filters
        statusFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                renderApplications();
            }
        });
        
        // Sort
        sortSelect.addEventListener('change', renderApplications);
        
        // Modal actions from details modal
        document.getElementById('approve-btn').addEventListener('click', () => {
            confirmAction(currentApplicationId, 'approve');
        });
        
        document.getElementById('pending-btn').addEventListener('click', () => {
            confirmAction(currentApplicationId, 'pending');
        });
        
        document.getElementById('reject-btn').addEventListener('click', () => {
            confirmAction(currentApplicationId, 'reject');
        });
        
        document.getElementById('delete-btn').addEventListener('click', () => {
            confirmAction(currentApplicationId, 'delete');
        });
        
        // Close modals
        document.getElementById('close-details-modal').addEventListener('click', () => {
            detailsModal.classList.remove('active');
        });
        
        document.getElementById('close-confirm-modal').addEventListener('click', () => {
            confirmModal.classList.remove('active');
        });
        
        // Confirm modal buttons
        document.getElementById('cancel-confirm').addEventListener('click', () => {
            confirmModal.classList.remove('active');
        });
        
        document.getElementById('proceed-confirm').addEventListener('click', executeAction);
        
        // Close modal on overlay click
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                detailsModal.classList.remove('active');
            }
        });
        
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('active');
            }
        });

        // Unsubscribe Firestore listeners on page hide
        window.addEventListener('pagehide', () => {
            if (typeof unsubscribe === 'function') {
                try { unsubscribe(); } catch (e) { /* ignore */ }
            }
        });
    }
    
    /**
     * Show loading state
     */
    function showLoading() {
        applicationsContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading applications...</p>
            </div>
        `;
    }
    
    /**
     * Show empty state
     */
    function showEmptyState() {
        applicationsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Applications Found</h3>
                <p>No applications match your current filters</p>
            </div>
        `;
    }
    
    /**
     * Show success message
     */
    function showSuccess(message) {
        // You can implement a toast notification here
        alert(message);
    }
    
    /**
     * Show error message
     */
    function showError(message) {
        // You can implement a toast notification here
        alert(message);
    }
});
