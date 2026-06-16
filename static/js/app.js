document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let releaseNotes = [];
    let currentSearch = '';
    let currentType = 'all';
    let selectedUpdate = null;

    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const refreshIcon = btnRefresh.querySelector('.spinner-icon');
    const searchInput = document.getElementById('search-input');
    const typeFilters = document.getElementById('type-filters');
    const container = document.getElementById('release-notes-container');
    const feedStatus = document.getElementById('feed-status');

    // Stats Elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statIssues = document.getElementById('stat-issues');
    const statOthers = document.getElementById('stat-others');

    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const btnCopyTweet = document.getElementById('btn-copy-tweet');
    const btnSubmitTweet = document.getElementById('btn-submit-tweet');
    const toastContainer = document.getElementById('toast-container');

    // Initialize
    fetchReleaseNotes(false);

    // Event Listeners
    btnRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().strip();
        filterAndRender();
    });

    // Strip helper equivalent for JS
    String.prototype.strip = function() {
        return this.trim();
    };

    typeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill')) {
            // Update active pill
            typeFilters.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
            e.target.classList.add('active');
            
            currentType = e.target.dataset.type;
            filterAndRender();
        }
    });

    // Close Modal Events
    btnCloseModal.addEventListener('click', closeModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeModal();
        }
    });

    // Character Counter on Tweet Textarea
    tweetTextarea.addEventListener('input', () => {
        updateCharCounter();
    });

    // Copy Tweet Content to Clipboard
    btnCopyTweet.addEventListener('click', () => {
        tweetTextarea.select();
        navigator.clipboard.writeText(tweetTextarea.value)
            .then(() => {
                showToast('Tweet content copied to clipboard!', 'success');
            })
            .catch(() => {
                showToast('Failed to copy text. Please try manually.', 'error');
            });
    });

    // Submit Tweet to Twitter Intent
    btnSubmitTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
        closeModal();
        showToast('Redirected to Twitter/X!', 'success');
    });

    // Fetch Release Notes
    async function fetchReleaseNotes(forceRefresh = false) {
        setLoadingState(true);
        hideFeedStatus();
        
        try {
            const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                releaseNotes = result.data;
                calculateStats();
                filterAndRender();
                if (forceRefresh) {
                    showToast('Release notes successfully refreshed!', 'success');
                }
            } else {
                throw new Error(result.message || 'Unknown backend error');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showFeedStatus(`Error: ${error.message}. Please try again later.`, 'error');
            showToast('Failed to fetch release notes.', 'error');
            
            // If we have cached data, keep showing it, otherwise show empty
            if (releaseNotes.length === 0) {
                renderEmptyState();
            }
        } finally {
            setLoadingState(false);
        }
    }

    // Toggle Loading Animation
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshIcon.classList.add('spinning');
            btnRefresh.disabled = true;
            renderSkeletons();
        } else {
            refreshIcon.classList.remove('spinning');
            btnRefresh.disabled = false;
        }
    }

    // Calculate Statistics
    function calculateStats() {
        let totalCount = 0;
        let features = 0;
        let issues = 0;
        let others = 0;

        releaseNotes.forEach(entry => {
            entry.updates.forEach(u => {
                totalCount++;
                const type = u.type.toLowerCase();
                if (type.includes('feature')) {
                    features++;
                } else if (type.includes('issue') || type.includes('fix') || type.includes('bug')) {
                    issues++;
                } else {
                    others++;
                }
            });
        });

        statTotal.textContent = totalCount;
        statFeatures.textContent = features;
        statIssues.textContent = issues;
        statOthers.textContent = others;
    }

    // Filter and Render UI
    function filterAndRender() {
        const filtered = [];

        releaseNotes.forEach(entry => {
            const matchingUpdates = entry.updates.filter(u => {
                // Type Filter
                let matchesType = true;
                if (currentType !== 'all') {
                    // Match specific type
                    if (currentType === 'Feature') {
                        matchesType = u.type.toLowerCase().includes('feature');
                    } else if (currentType === 'Issue') {
                        matchesType = u.type.toLowerCase().includes('issue') || u.type.toLowerCase().includes('fix');
                    } else if (currentType === 'Deprecated') {
                        matchesType = u.type.toLowerCase().includes('deprecat');
                    } else {
                        matchesType = u.type.toLowerCase() === currentType.toLowerCase();
                    }
                }

                // Search Filter
                let matchesSearch = true;
                if (currentSearch) {
                    const typeText = u.type.toLowerCase();
                    const bodyText = u.text.toLowerCase();
                    const dateText = entry.title.toLowerCase();
                    matchesSearch = typeText.includes(currentSearch) || 
                                    bodyText.includes(currentSearch) || 
                                    dateText.includes(currentSearch);
                }

                return matchesType && matchesSearch;
            });

            if (matchingUpdates.length > 0) {
                filtered.push({
                    ...entry,
                    updates: matchingUpdates
                });
            }
        });

        renderReleaseNotes(filtered);
    }

    // Render Skeletons
    function renderSkeletons() {
        container.innerHTML = `
            <div class="skeleton-group">
                <div class="skeleton-date"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            </div>
            <div class="skeleton-group">
                <div class="skeleton-date"></div>
                <div class="skeleton-card"></div>
            </div>
        `;
    }

    // Render Release Notes
    function renderReleaseNotes(data) {
        if (!data || data.length === 0) {
            renderEmptyState();
            return;
        }

        container.innerHTML = '';
        data.forEach(entry => {
            const dayGroup = document.createElement('div');
            dayGroup.className = 'release-day-group';

            const dayHeading = document.createElement('h2');
            dayHeading.className = 'release-date-heading';
            dayHeading.textContent = entry.title;
            dayGroup.appendChild(dayHeading);

            entry.updates.forEach(update => {
                const card = document.createElement('article');
                card.className = 'release-card';

                // Determine badge type
                let badgeClass = 'badge-other';
                const lowerType = update.type.toLowerCase();
                if (lowerType.includes('feature')) {
                    badgeClass = 'badge-feature';
                } else if (lowerType.includes('issue') || lowerType.includes('fix') || lowerType.includes('bug')) {
                    badgeClass = 'badge-issue';
                } else if (lowerType.includes('deprecat')) {
                    badgeClass = 'badge-deprecated';
                }

                const cardHeader = document.createElement('div');
                cardHeader.className = 'release-card-header';
                cardHeader.innerHTML = `<span class="badge ${badgeClass}">${update.type}</span>`;
                card.appendChild(cardHeader);

                const cardBody = document.createElement('div');
                cardBody.className = 'release-card-body';
                cardBody.innerHTML = update.html;
                card.appendChild(cardBody);

                // Tweet Button
                const btnTweet = document.createElement('button');
                btnTweet.className = 'btn btn-secondary btn-tweet-card';
                btnTweet.innerHTML = `
                    <svg class="icon fill-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet This</span>
                `;
                
                // Add click event for Tweet composer modal
                btnTweet.addEventListener('click', () => {
                    openTweetComposer(entry.title, update);
                });

                card.appendChild(btnTweet);
                dayGroup.appendChild(card);
            });

            container.appendChild(dayGroup);
        });
    }

    // Render Empty State
    function renderEmptyState() {
        container.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3>No Release Notes Found</h3>
                <p>No updates match your current search queries or filter selections. Try adjusting your parameters or refresh to pull the latest details.</p>
            </div>
        `;
    }

    // Open Tweet Composer Modal
    function openTweetComposer(date, update) {
        selectedUpdate = update;
        
        // Formulate a beautiful template text for the tweet
        // Format: "📢 BigQuery Update (June 15, 2026): [Feature] Text... \n\n#BigQuery #GoogleCloud"
        const header = `📢 BigQuery Update (${date}): [${update.type}] `;
        const footer = `\n\nRead more: https://cloud.google.com/bigquery/docs/release-notes\n#BigQuery #GoogleCloud`;
        
        // Calculate max allowed text length
        const availableLength = 280 - header.length - footer.length;
        
        let updateText = update.text;
        if (updateText.length > availableLength) {
            updateText = updateText.substring(0, availableLength - 3) + '...';
        }
        
        const tweetText = `${header}${updateText}${footer}`;
        
        tweetTextarea.value = tweetText;
        updateCharCounter();
        
        // Show modal
        tweetModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Disable background scroll
    }

    // Close Modal
    function closeModal() {
        tweetModal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Enable background scroll
        selectedUpdate = null;
    }

    // Update Character Counter
    function updateCharCounter() {
        const count = tweetTextarea.value.length;
        charCount.textContent = count;
        
        const counterContainer = charCount.parentElement;
        
        if (count > 280) {
            counterContainer.className = 'char-counter over-limit';
            btnSubmitTweet.disabled = true;
        } else if (count > 250) {
            counterContainer.className = 'char-counter near-limit';
            btnSubmitTweet.disabled = false;
        } else {
            counterContainer.className = 'char-counter';
            btnSubmitTweet.disabled = false;
        }
    }

    // Toast Notifications helper
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg class="icon fill-icon" style="color: var(--success);" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
        } else {
            iconSvg = `<svg class="icon fill-icon" style="color: var(--danger);" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
        }

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                ${iconSvg}
                <span>${message}</span>
            </div>
            <button class="btn-toast-close">&times;</button>
        `;

        toastContainer.appendChild(toast);

        // Toast close event
        toast.querySelector('.btn-toast-close').addEventListener('click', () => {
            removeToast(toast);
        });

        // Auto remove toast
        setTimeout(() => {
            removeToast(toast);
        }, 4000);
    }

    function removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.add('toast-fade-out');
            toast.addEventListener('animationend', (e) => {
                if (e.animationName === 'toast-slide-out') {
                    toast.remove();
                }
            });
        }
    }

    // Show feed errors on page
    function showFeedStatus(message, type = 'error') {
        feedStatus.className = `feed-status-info ${type === 'success' ? 'success' : ''}`;
        feedStatus.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>${message}</span>
        `;
        feedStatus.classList.remove('hidden');
    }

    function hideFeedStatus() {
        feedStatus.classList.add('hidden');
        feedStatus.innerHTML = '';
    }
});
