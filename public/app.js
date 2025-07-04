// E-Voting System Frontend JavaScript

// Global variables
let currentUser = null;
let currentElection = null;
let selectedCandidate = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    showHome();
});

// Setup event listeners
function setupEventListeners() {
    // Authentication forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const profileForm = document.getElementById('profileForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    showLoading();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateNavigation();
            showToast('Success', 'Login successful!', 'success');
            showHome();
        } else {
            showToast('Error', data.error, 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showLoading();

    const formData = {
        username: document.getElementById('registerUsername').value,
        email: document.getElementById('registerEmail').value,
        fullName: document.getElementById('registerFullName').value,
        voterId: document.getElementById('registerVoterId').value,
        password: document.getElementById('registerPassword').value
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateNavigation();
            showToast('Success', 'Registration successful!', 'success');
            showHome();
        } else {
            showToast('Error', data.error, 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    showLoading();

    const formData = {
        fullName: document.getElementById('profileFullName').value,
        email: document.getElementById('profileEmail').value
    };

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Success', 'Profile updated successfully!', 'success');
        } else {
            showToast('Error', data.error, 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateNavigation();
        } else {
            localStorage.removeItem('token');
        }
    } catch (error) {
        localStorage.removeItem('token');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateNavigation();
    showHome();
    showToast('Info', 'Logged out successfully', 'info');
}

// Navigation functions
function updateNavigation() {
    const authNav = document.getElementById('authNav');
    const profileNav = document.getElementById('profileNav');
    const logoutNav = document.getElementById('logoutNav');
    const electionsNav = document.getElementById('electionsNav');
    const historyNav = document.getElementById('historyNav');
    const adminNav = document.getElementById('adminNav');

    if (currentUser) {
        if (authNav) authNav.style.display = 'none';
        if (profileNav) profileNav.style.display = 'block';
        if (logoutNav) logoutNav.style.display = 'block';
        if (electionsNav) electionsNav.style.display = 'block';
        if (historyNav) historyNav.style.display = 'block';
        
        if (currentUser.role === 'admin' && adminNav) {
            adminNav.style.display = 'block';
        }
    } else {
        if (authNav) authNav.style.display = 'block';
        if (profileNav) profileNav.style.display = 'none';
        if (logoutNav) logoutNav.style.display = 'none';
        if (electionsNav) electionsNav.style.display = 'none';
        if (historyNav) historyNav.style.display = 'none';
        if (adminNav) adminNav.style.display = 'none';
    }
}

// Page display functions
function showHome() {
    hideAllPages();
    const homePage = document.getElementById('homePage');
    if (homePage) {
        homePage.style.display = 'block';
        homePage.classList.add('fade-in');
    }
}

function showAuth() {
    hideAllPages();
    const authPage = document.getElementById('authPage');
    if (authPage) {
        authPage.style.display = 'block';
        authPage.classList.add('fade-in');
    }
}

async function showElections() {
    hideAllPages();
    const electionsPage = document.getElementById('electionsPage');
    if (electionsPage) {
        electionsPage.style.display = 'block';
        electionsPage.classList.add('fade-in');
    }
    
    if (currentUser) {
        await loadElections();
    } else {
        showToast('Info', 'Please login to view elections', 'info');
        showAuth();
    }
}

async function showHistory() {
    hideAllPages();
    const historyPage = document.getElementById('historyPage');
    if (historyPage) {
        historyPage.style.display = 'block';
        historyPage.classList.add('fade-in');
    }
    
    await loadVotingHistory();
}

async function showProfile() {
    hideAllPages();
    const profilePage = document.getElementById('profilePage');
    if (profilePage) {
        profilePage.style.display = 'block';
        profilePage.classList.add('fade-in');
    }
    
    await loadProfile();
}

async function showAdmin() {
    hideAllPages();
    const adminPage = document.getElementById('adminPage');
    if (adminPage) {
        adminPage.style.display = 'block';
        adminPage.classList.add('fade-in');
    }
    
    showAdminSection('dashboard');
}

function hideAllPages() {
    const pages = ['homePage', 'authPage', 'electionsPage', 'electionDetailsPage', 'historyPage', 'profilePage', 'adminPage'];
    pages.forEach(pageId => {
        const page = document.getElementById(pageId);
        if (page) {
            page.style.display = 'none';
            page.classList.remove('fade-in');
        }
    });
}

// Data loading functions
async function loadElections() {
    showLoading();
    try {
        const response = await fetch('/api/voting/elections', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderElections(data.elections);
        } else {
            showToast('Error', 'Failed to load elections', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    } finally {
        hideLoading();
    }
}

async function loadVotingHistory() {
    showLoading();
    try {
        const response = await fetch('/api/voting/history', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderVotingHistory(data.votes);
        } else {
            showToast('Error', 'Failed to load voting history', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    } finally {
        hideLoading();
    }
}

async function loadProfile() {
    showLoading();
    try {
        const response = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderProfile(data.user);
        } else {
            showToast('Error', 'Failed to load profile', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    } finally {
        hideLoading();
    }
}

// Rendering functions
function renderElections(elections) {
    const container = document.getElementById('electionsList');
    if (!container) return;
    
    if (!elections || elections.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No elections available at the moment.
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = elections.map(election => `
        <div class="col-md-6 col-lg-4">
            <div class="election-card ${election.current_status}">
                <h5 class="card-title">${election.title}</h5>
                <p class="card-text">${election.description}</p>
                <div class="mb-3">
                    <span class="status-badge status-${election.current_status}">
                        ${election.current_status}
                    </span>
                </div>
                <div class="row text-muted small mb-3">
                    <div class="col-6">
                        <i class="fas fa-users me-1"></i>
                        ${election.candidate_count} Candidates
                    </div>
                    <div class="col-6">
                        <i class="fas fa-calendar me-1"></i>
                        ${new Date(election.start_date).toLocaleDateString()}
                    </div>
                </div>
                <button class="btn btn-primary w-100" onclick="showElectionDetails(${election.id})">
                    <i class="fas fa-eye me-2"></i>View Details
                </button>
            </div>
        </div>
    `).join('');
}

function renderVotingHistory(votes) {
    const container = document.getElementById('votingHistoryList');
    if (!container) return;
    
    if (!votes || votes.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                You haven't voted in any elections yet.
            </div>
        `;
        return;
    }

    container.innerHTML = votes.map(vote => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h5 class="card-title">${vote.election_title}</h5>
                        <p class="card-text">
                            <strong>Voted for:</strong> ${vote.candidate_name} (${vote.candidate_party})
                        </p>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            ${new Date(vote.timestamp).toLocaleString()}
                        </small>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-outline-primary btn-sm" onclick="verifyVote('${vote.vote_hash}')">
                            <i class="fas fa-search me-1"></i>Verify Vote
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderProfile(user) {
    const fullNameInput = document.getElementById('profileFullName');
    const emailInput = document.getElementById('profileEmail');
    const usernameInput = document.getElementById('profileUsername');
    const voterIdInput = document.getElementById('profileVoterId');

    if (fullNameInput) fullNameInput.value = user.fullName;
    if (emailInput) emailInput.value = user.email;
    if (usernameInput) usernameInput.value = user.username;
    if (voterIdInput) voterIdInput.value = user.voterId;
}

// Admin functions
async function showAdminSection(section) {
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    switch (section) {
        case 'dashboard':
            await loadAdminDashboard();
            break;
        default:
            content.innerHTML = '<div class="alert alert-info">Admin section coming soon...</div>';
    }
}

async function loadAdminDashboard() {
    showLoading();
    try {
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderAdminDashboard(data.stats);
        }
    } catch (error) {
        showToast('Error', 'Failed to load dashboard', 'error');
    } finally {
        hideLoading();
    }
}

function renderAdminDashboard(stats) {
    const content = document.getElementById('adminContent');
    if (!content) return;

    content.innerHTML = `
        <div class="row g-4">
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="stats-number">${stats.total_voters}</div>
                    <div class="stats-label">Total Voters</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="stats-number">${stats.verified_voters}</div>
                    <div class="stats-label">Verified Voters</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="stats-number">${stats.total_elections}</div>
                    <div class="stats-label">Total Elections</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="stats-number">${stats.total_votes}</div>
                    <div class="stats-label">Total Votes</div>
                </div>
            </div>
        </div>
    `;
}

// Utility functions
function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
}

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastTitle || !toastMessage) {
        alert(`${title}: ${message}`);
        return;
    }

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    // Remove existing classes
    toast.className = 'toast';
    
    // Add type-specific styling
    if (type === 'success') {
        toast.classList.add('bg-success', 'text-white');
    } else if (type === 'error') {
        toast.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toast.classList.add('bg-warning', 'text-dark');
    } else {
        toast.classList.add('bg-info', 'text-white');
    }

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Global functions for onclick handlers
function showElectionDetails(electionId) {
    // Implementation for showing election details
    showToast('Info', 'Election details feature coming soon...', 'info');
}

function verifyVote(voteHash) {
    // Implementation for vote verification
    showToast('Info', 'Vote verification feature coming soon...', 'info');
}
