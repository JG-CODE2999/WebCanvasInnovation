document.addEventListener('DOMContentLoaded', function() {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchLoadingIndicator = document.getElementById('search-loading');
  
  if (searchForm) {
    // Validate search input before form submission
    searchForm.addEventListener('submit', function(e) {
      const query = searchInput.value.trim();
      if (!query) {
        e.preventDefault();
        return false;
      }
    });
    
    // Live search functionality (if enabled)
    if (searchInput && searchInput.hasAttribute('data-live-search')) {
      let debounceTimer;
      
      searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        clearTimeout(debounceTimer);
        
        // Hide previous results if query is empty
        if (!query) {
          if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
          }
          return;
        }
        
        // Show loading indicator
        if (searchLoadingIndicator) {
          searchLoadingIndicator.style.display = 'block';
        }
        
        // Debounce the search to avoid too many requests
        debounceTimer = setTimeout(() => {
          // Make AJAX request to search API
          fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(response => {
              if (!response.ok) {
                throw new Error('Search request failed');
              }
              return response.json();
            })
            .then(data => {
              if (searchLoadingIndicator) {
                searchLoadingIndicator.style.display = 'none';
              }
              
              // Update search results
              if (searchResults) {
                displaySearchResults(data, query);
              }
            })
            .catch(error => {
              console.error('Search error:', error);
              if (searchLoadingIndicator) {
                searchLoadingIndicator.style.display = 'none';
              }
              
              if (searchResults) {
                searchResults.innerHTML = '<div class="alert alert-danger">An error occurred while searching. Please try again.</div>';
                searchResults.style.display = 'block';
              }
            });
        }, 300); // 300ms debounce
      });
      
      // Close search results when clicking outside
      document.addEventListener('click', function(e) {
        if (searchResults && 
            searchResults.style.display === 'block' && 
            e.target !== searchInput && 
            !searchResults.contains(e.target)) {
          searchResults.style.display = 'none';
        }
      });
    }
  }
  
  // Display search results in the dropdown
  function displaySearchResults(data, query) {
    if (!data.posts || data.posts.length === 0) {
      searchResults.innerHTML = `<div class="p-3">No results found for "${query}"</div>`;
    } else {
      let html = `<h6 class="dropdown-header">Results for "${query}"</h6>`;
      
      data.posts.forEach(post => {
        html += `
          <a href="/post/${post.id}" class="dropdown-item">
            <div class="d-flex align-items-center">
              ${post.feature_image ? 
                `<div class="me-2">
                  <img src="${post.feature_image}" alt="${post.title}" width="40" height="40" class="rounded" />
                </div>` : 
                ''
              }
              <div>
                <div class="fw-bold">${post.title}</div>
                <div class="small text-muted">${post.summary || truncateText(post.content, 50)}</div>
              </div>
            </div>
          </a>
        `;
      });
      
      if (data.total_items > data.posts.length) {
        html += `
          <div class="dropdown-divider"></div>
          <a href="/search?q=${encodeURIComponent(query)}" class="dropdown-item text-primary">
            View all ${data.total_items} results
          </a>
        `;
      }
      
      searchResults.innerHTML = html;
    }
    
    searchResults.style.display = 'block';
  }
  
  // Helper function to truncate text
  function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  // Search results page functionality
  const searchResultsPage = document.getElementById('search-results-page');
  if (searchResultsPage) {
    // Handle pagination for search results
    const loadMoreBtn = document.getElementById('load-more-results');
    if (loadMoreBtn) {
      let currentPage = 1;
      
      loadMoreBtn.addEventListener('click', function() {
        const query = this.getAttribute('data-query');
        const totalPages = parseInt(this.getAttribute('data-total-pages'), 10);
        currentPage++;
        
        if (currentPage <= totalPages) {
          this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
          this.disabled = true;
          
          // Make AJAX request to load more results
          fetch(`/api/search?q=${encodeURIComponent(query)}&page=${currentPage}`)
            .then(response => {
              if (!response.ok) {
                throw new Error('Failed to load more results');
              }
              return response.json();
            })
            .then(data => {
              // Append new results
              const resultsContainer = document.querySelector('.search-results-container');
              
              data.posts.forEach(post => {
                const postElement = createPostElement(post);
                resultsContainer.appendChild(postElement);
              });
              
              // Update button state
              this.disabled = false;
              this.innerHTML = 'Load More';
              
              // Hide button if no more pages
              if (currentPage >= totalPages) {
                this.style.display = 'none';
              }
              
              // Update button attributes
              this.setAttribute('data-page', currentPage);
            })
            .catch(error => {
              console.error('Error loading more results:', error);
              this.disabled = false;
              this.innerHTML = 'Try Again';
            });
        } else {
          this.style.display = 'none';
        }
      });
    }
  }
  
  // Create a post element for search results
  function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'card mb-3 fade-in';
    
    div.innerHTML = `
      <div class="row g-0">
        ${post.feature_image ? 
          `<div class="col-md-4">
            <img src="${post.feature_image}" class="img-fluid rounded-start" alt="${post.title}">
          </div>` : 
          ''
        }
        <div class="${post.feature_image ? 'col-md-8' : 'col-12'}">
          <div class="card-body">
            <h5 class="card-title">${post.title}</h5>
            <p class="card-text">${post.summary || truncateText(post.content, 150)}</p>
            <p class="card-text">
              <small class="text-muted">By ${post.author} on ${post.created_at}</small>
            </p>
            <a href="/post/${post.id}" class="btn btn-primary btn-sm">Read More</a>
          </div>
        </div>
      </div>
    `;
    
    return div;
  }
});
