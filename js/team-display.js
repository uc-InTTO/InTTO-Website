// Frontend Team Display - Loads team members from Firestore
document.addEventListener('DOMContentLoaded', () => {
    const teamCardsContainer = document.querySelector('.team-cards');
    
    if (!teamCardsContainer) {
        return;
    }

    // Show loading state
    teamCardsContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 40px;">Loading team members...</p>';

    // Load team members from Firestore
    const CACHE_KEY = 'public_team_members';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    let cached = localStorage.getItem(CACHE_KEY);
    let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
    let now = Date.now();

    if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
        // Use cached value
        const activeMembers = JSON.parse(cached);
        teamCardsContainer.innerHTML = '';
        activeMembers.forEach((member) => {
            const teamCard = createTeamCard(member);
            teamCardsContainer.appendChild(teamCard);
        });
        return;
    }

    db.collection('team')
        .orderBy('displayOrder', 'asc')
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                teamCardsContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 40px;">No team members found.</p>';
                return;
            }

            teamCardsContainer.innerHTML = '';

            // Filter active members on the client side
            const activeMembers = [];
            snapshot.forEach((doc) => {
                const member = doc.data();
                // Only show active members (default to true if not set)
                if (member.active !== false) {
                    activeMembers.push(member);
                }
            });

            // Cache result
            localStorage.setItem(CACHE_KEY, JSON.stringify(activeMembers));
            localStorage.setItem(CACHE_KEY + '_time', now);

            if (activeMembers.length === 0) {
                teamCardsContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 40px;">No team members found.</p>';
                return;
            }

            activeMembers.forEach((member) => {
                const teamCard = createTeamCard(member);
                teamCardsContainer.appendChild(teamCard);
            });
        })
        .catch((error) => {
            teamCardsContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 40px; color: #e74c3c;">Error loading team members. Please refresh the page.</p>';
        });
});

/**
 * Create a team card element
 */
function createTeamCard(member) {
    const card = document.createElement('div');
    card.className = 'team-card';

    // Use uploaded photo or default placeholder
    const avatarDisplay = member.photoUrl 
        ? `<img src="${member.photoUrl}" alt="${member.fullName}">`
        : `<img src="graphics/drThelma.png" alt="${member.fullName}">`;

    card.innerHTML = `
        ${avatarDisplay}
        <div class="team-info">
            <h3>${member.fullName}</h3>
            <p>${member.position}</p>
        </div>
        <div class="team-hover-overlay">
            <div class="overlay-label">
                <span>Team Member</span>
            </div>
            <h3 class="overlay-name">${member.fullName}</h3>
            <p class="overlay-position">${member.position}</p>
            <hr class="overlay-divider">
            <p class="overlay-description">${member.roleDescription || ''}</p>
            <hr class="overlay-divider-bottom">
            <div class="overlay-contact">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="email-icon">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <a href="mailto:${member.email}">${member.email}</a>
            </div>
        </div>
    `;

    return card;
}
