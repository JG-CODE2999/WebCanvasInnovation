document.addEventListener('DOMContentLoaded', function() {
  // Initialize delete post confirmation modal
  const deletePostButtons = document.querySelectorAll('.delete-post-btn');
  const confirmDeletePostBtn = document.getElementById('confirm-delete-post');
  const postDeleteForm = document.getElementById('post-delete-form');
  
  deletePostButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const postId = this.getAttribute('data-post-id');
      const postTitle = this.getAttribute('data-post-title');
      
      document.getElementById('delete-post-title').textContent = postTitle;
      postDeleteForm.setAttribute('action', `/post/${postId}/delete`);
      
      // Show the modal
      const deleteModal = new bootstrap.Modal(document.getElementById('delete-post-modal'));
      deleteModal.show();
    });
  });
  
  // Category management
  const addCategoryForm = document.getElementById('add-category-form');
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', function(e) {
      const categoryName = document.getElementById('category-name').value.trim();
      if (!categoryName) {
        e.preventDefault();
        alert('Category name is required');
      }
    });
  }
  
  const deleteCategoryButtons = document.querySelectorAll('.delete-category-btn');
  const categoryDeleteForm = document.getElementById('category-delete-form');
  
  deleteCategoryButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const categoryId = this.getAttribute('data-category-id');
      const categoryName = this.getAttribute('data-category-name');
      
      if (confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
        categoryDeleteForm.setAttribute('action', `/category/${categoryId}/delete`);
        categoryDeleteForm.submit();
      }
    });
  });
  
  // User management
  const userRoleToggles = document.querySelectorAll('.toggle-admin-role');
  
  userRoleToggles.forEach(toggle => {
    toggle.addEventListener('change', function() {
      const userId = this.getAttribute('data-user-id');
      const isAdmin = this.checked;
      
      // Send AJAX request to update user role
      fetch(`/api/user/${userId}/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ is_admin: isAdmin })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          showAlert('User role updated successfully', 'success');
        } else {
          showAlert('Failed to update user role: ' + data.message, 'danger');
          // Revert toggle if failed
          this.checked = !isAdmin;
        }
      })
      .catch(error => {
        console.error('Error:', error);
        showAlert('An error occurred while updating user role', 'danger');
        // Revert toggle on error
        this.checked = !isAdmin;
      });
    });
  });
  
  // Helper function to show alerts
  function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('admin-alerts');
    if (!alertsContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertsContainer.appendChild(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  }
  
  // Helper function to get CSRF token
  function getCsrfToken() {
    const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
    return csrfTokenMeta ? csrfTokenMeta.getAttribute('content') : '';
  }
  
  // Content editor enhancement
  const contentEditors = document.querySelectorAll('.content-editor');
  contentEditors.forEach(editor => {
    editor.addEventListener('keydown', function(e) {
      // Allow tab in textarea
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
      }
    });
  });
  
  // Post list filtering and sorting
  const postFilterInput = document.getElementById('post-filter');
  if (postFilterInput) {
    postFilterInput.addEventListener('input', function() {
      const filterValue = this.value.toLowerCase();
      const postRows = document.querySelectorAll('.post-row');
      
      postRows.forEach(row => {
        const title = row.querySelector('.post-title').textContent.toLowerCase();
        const author = row.querySelector('.post-author').textContent.toLowerCase();
        
        if (title.includes(filterValue) || author.includes(filterValue)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }
  
  const postSortSelect = document.getElementById('post-sort');
  if (postSortSelect) {
    postSortSelect.addEventListener('change', function() {
      const sortBy = this.value;
      const postRows = Array.from(document.querySelectorAll('.post-row'));
      const postsTable = document.querySelector('.posts-table tbody');
      
      // Sort posts based on selected criteria
      postRows.sort((a, b) => {
        if (sortBy === 'title') {
          const titleA = a.querySelector('.post-title').textContent.toLowerCase();
          const titleB = b.querySelector('.post-title').textContent.toLowerCase();
          return titleA.localeCompare(titleB);
        } else if (sortBy === 'date-asc') {
          const dateA = new Date(a.querySelector('.post-date').getAttribute('data-timestamp'));
          const dateB = new Date(b.querySelector('.post-date').getAttribute('data-timestamp'));
          return dateA - dateB;
        } else if (sortBy === 'date-desc') {
          const dateA = new Date(a.querySelector('.post-date').getAttribute('data-timestamp'));
          const dateB = new Date(b.querySelector('.post-date').getAttribute('data-timestamp'));
          return dateB - dateA;
        } else if (sortBy === 'author') {
          const authorA = a.querySelector('.post-author').textContent.toLowerCase();
          const authorB = b.querySelector('.post-author').textContent.toLowerCase();
          return authorA.localeCompare(authorB);
        }
        return 0;
      });
      
      // Clear table and re-append sorted rows
      while (postsTable.firstChild) {
        postsTable.removeChild(postsTable.firstChild);
      }
      
      postRows.forEach(row => {
        postsTable.appendChild(row);
      });
    });
  }
});
