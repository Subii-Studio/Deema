const savedTab = localStorage.getItem('activeTab');
if (savedTab) {
  document.querySelectorAll('.content-container').forEach(c => c.classList.remove('active'));
  document.getElementById(savedTab).classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.remove('nav-active');
    if (l.getAttribute('href') === '#' + savedTab) l.classList.add('nav-active');
  });
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href').substring(1);

    document.querySelectorAll('.content-container').forEach(c => c.classList.remove('active'));
    document.getElementById(target).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('nav-active'));
    link.classList.add('nav-active');

    localStorage.setItem('activeTab', target);
  });
});

document.querySelectorAll('.tooth-zone').forEach(zone => {
  zone.addEventListener('click', () => {
    const wasActive = zone.classList.contains('active');
    document.querySelectorAll('.tooth-zone').forEach(z => z.classList.remove('active'));
    if (!wasActive) zone.classList.add('active');
  });
});

// ========== Firebase Setup ==========
const firebaseConfig = {
  apiKey: "AIzaSyCgEO6Xr2N6bpprYtUppOe8wJTCCCmyi-0",
  authDomain: "deemaport.firebaseapp.com",
  databaseURL: "https://deemaport-default-rtdb.firebaseio.com",
  projectId: "deemaport",
  storageBucket: "deemaport.firebasestorage.app",
  messagingSenderId: "410634828678",
  appId: "1:410634828678:web:1b45df8edc963924300a07"
};

let database;
try {
  firebase.initializeApp(firebaseConfig);
  database = firebase.database();
} catch (e) {
  console.log("Firebase not configured yet");
}

// ========== Blog Functionality ==========
let blogPosts = [];

function initBlog() {
  const postsContainer = document.getElementById('blog-posts');
  loadBlogPosts(postsContainer);
}

function loadBlogPosts(container) {
  if (!database) {
    renderBlogPosts(container);
    return;
  }

  database.ref('blogPosts').orderByChild('timestamp').on('value', function(snapshot) {
    blogPosts = [];
    snapshot.forEach(function(childSnapshot) {
      const post = childSnapshot.val();
      post.id = childSnapshot.key;
      blogPosts.unshift(post);
    });
    const currentContainer = document.querySelector('#blog-posts');
    renderBlogPosts(currentContainer || container);
  });
}

function renderBlogPosts(container) {
  if (!container) return;

  if (blogPosts.length === 0) {
    container.innerHTML = '<div class="blog-empty">No posts yet</div>';
    return;
  }

  container.innerHTML = blogPosts.map(post => {
    const tagClass = post.type === 'portfolio' ? 'portfolio' : 'life';
    const tagText = post.type === 'portfolio' ? 'DENTAL UPDATE' : 'LIFE UPDATE';

    const date = new Date(post.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    let imagesHTML = '';
    if (post.images && post.images.length > 0) {
      const imageClass = post.images.length === 1 ? 'single' : (post.images.length === 2 ? 'double' : '');
      imagesHTML = `
        <div class="blog-post-images ${imageClass}">
          ${post.images.map(img => `<img src="${img.url || img}" style="width: ${img.size || 500}px;" alt="Post image">`).join('')}
        </div>
      `;
    }

    return `
      <div class="blog-post" data-type="${post.type}">
        <div class="blog-post-header">
          <div class="blog-post-author">
            <img src="Images/Bunny.png" alt="Avatar" class="blog-post-avatar">
            <span class="blog-post-username">@Deema</span>
          </div>
          <span class="blog-post-tag ${tagClass}">${tagText}</span>
        </div>
        <div class="blog-post-text">${post.text}</div>
        ${imagesHTML}
        <div class="blog-post-date">${formattedDate}</div>
      </div>
    `;
  }).join('');
}

// ========== Blog Admin Panel ==========
let adminImages = [];
let editingPostId = null;

function createBlogAdminPanel() {
  if (document.getElementById('blog-admin-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'blog-admin-overlay';
  overlay.id = 'blog-admin-overlay';
  overlay.innerHTML = `
    <div class="blog-admin-panel">
      <div class="blog-admin-header">
        <h2 class="blog-admin-title">Blog Admin</h2>
        <button class="blog-admin-close" id="blog-admin-close">&times;</button>
      </div>
      <div class="blog-admin-tabs">
        <button class="blog-admin-tab active" data-tab="add">Add Post</button>
        <button class="blog-admin-tab" data-tab="manage">Manage Posts</button>
      </div>
      <form class="blog-admin-form" id="blog-admin-form" data-tab-content="add">
        <div class="blog-admin-field">
          <label class="blog-admin-label">Post Type</label>
          <select class="blog-admin-select" id="blog-post-type">
            <option value="portfolio">Dental Update</option>
            <option value="life">Life Update</option>
          </select>
        </div>
        <div class="blog-admin-field">
          <label class="blog-admin-label">Post Content</label>
          <textarea class="blog-admin-textarea" id="blog-post-text" placeholder="What's on your mind?"></textarea>
        </div>
        <div class="blog-admin-field">
          <label class="blog-admin-label">Date</label>
          <input type="date" class="blog-admin-select" id="blog-post-date">
        </div>
        <div class="blog-admin-field">
          <label class="blog-admin-label">Images</label>
          <input type="file" id="blog-image-input" accept="image/*" style="display: none;" multiple>
          <button type="button" class="blog-admin-add-image" id="blog-add-image-btn">+ Add Image</button>
          <div class="blog-admin-images-preview" id="blog-images-preview"></div>
        </div>
        <button type="submit" class="blog-admin-submit">Post Update</button>
      </form>
      <div class="blog-admin-manage" id="blog-admin-manage" data-tab-content="manage" style="display: none;">
        <div class="blog-admin-posts-list" id="blog-admin-posts-list"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('blog-admin-close').addEventListener('click', closeBlogAdmin);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBlogAdmin();
  });

  document.getElementById('blog-add-image-btn').addEventListener('click', () => {
    document.getElementById('blog-image-input').click();
  });

  document.getElementById('blog-image-input').addEventListener('change', handleImageSelect);
  document.getElementById('blog-admin-form').addEventListener('submit', handleBlogSubmit);

  document.querySelectorAll('.blog-admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.blog-admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const tabName = tab.dataset.tab;
      document.querySelectorAll('[data-tab-content]').forEach(content => {
        content.style.display = content.dataset.tabContent === tabName ? 'block' : 'none';
      });

      if (tabName === 'manage') {
        renderAdminPostsList();
      }
    });
  });
}

function openBlogAdmin() {
  createBlogAdminPanel();
  document.getElementById('blog-admin-overlay').classList.add('active');
  adminImages = [];
  document.getElementById('blog-images-preview').innerHTML = '';
  document.getElementById('blog-post-text').value = '';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('blog-post-date').value = today;
}

function closeBlogAdmin() {
  const overlay = document.getElementById('blog-admin-overlay');
  if (overlay) overlay.classList.remove('active');
}

function handleImageSelect(e) {
  const files = e.target.files;
  const preview = document.getElementById('blog-images-preview');

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(event) {
      const imageData = event.target.result;
      const imageId = Date.now() + Math.random();

      adminImages.push({ id: imageId, url: imageData, size: 500 });

      const imageItem = document.createElement('div');
      imageItem.className = 'blog-admin-image-item';
      imageItem.dataset.id = imageId;
      imageItem.innerHTML = `
        <img src="${imageData}" alt="Preview">
        <button type="button" class="blog-admin-image-remove" onclick="removeAdminImage(${imageId})">&times;</button>
        <input type="number" class="blog-admin-image-size" value="500" placeholder="px" onchange="updateImageSize(${imageId}, this.value)">
      `;
      preview.appendChild(imageItem);
    };
    reader.readAsDataURL(file);
  });

  e.target.value = '';
}

function removeAdminImage(imageId) {
  adminImages = adminImages.filter(img => img.id !== imageId);
  const item = document.querySelector(`.blog-admin-image-item[data-id="${imageId}"]`);
  if (item) item.remove();
}

function updateImageSize(imageId, size) {
  const img = adminImages.find(i => i.id === imageId);
  if (img) img.size = size;
}

function handleBlogSubmit(e) {
  e.preventDefault();

  const postType = document.getElementById('blog-post-type').value;
  const postText = document.getElementById('blog-post-text').value.trim();
  const postDate = document.getElementById('blog-post-date').value;

  if (!postText) {
    alert('Please enter some text for your post');
    return;
  }

  const timestamp = postDate ? new Date(postDate + 'T12:00:00').getTime() : Date.now();

  const postData = {
    type: postType,
    text: postText,
    images: adminImages.map(img => ({ url: img.url, size: img.size }))
  };

  if (database) {
    if (editingPostId) {
      postData.timestamp = timestamp;
      database.ref('blogPosts/' + editingPostId).update(postData).then(() => {
        refreshBlogPosts();
      });
    } else {
      postData.timestamp = timestamp;
      database.ref('blogPosts').push(postData).then(() => {
        refreshBlogPosts();
      });
    }
  } else {
    if (editingPostId) {
      const postIndex = blogPosts.findIndex(p => p.id === editingPostId);
      if (postIndex !== -1) {
        blogPosts[postIndex] = { ...blogPosts[postIndex], ...postData, timestamp: timestamp };
      }
    } else {
      postData.timestamp = timestamp;
      blogPosts.unshift(postData);
    }
    const container = document.querySelector('#blog-posts');
    if (container) renderBlogPosts(container);
  }

  resetAdminForm();
  closeBlogAdmin();
}

function refreshBlogPosts() {
  const container = document.querySelector('#blog-posts');
  if (container && database) {
    database.ref('blogPosts').orderByChild('timestamp').once('value', function(snapshot) {
      blogPosts = [];
      snapshot.forEach(function(childSnapshot) {
        const post = childSnapshot.val();
        post.id = childSnapshot.key;
        blogPosts.unshift(post);
      });
      renderBlogPosts(container);
    });
  }
}

function resetAdminForm() {
  editingPostId = null;
  adminImages = [];
  document.getElementById('blog-post-text').value = '';
  document.getElementById('blog-images-preview').innerHTML = '';
  document.querySelector('.blog-admin-tab[data-tab="add"]').textContent = 'Add Post';
  document.querySelector('.blog-admin-submit').textContent = 'Post Update';
}

function renderAdminPostsList() {
  const listContainer = document.getElementById('blog-admin-posts-list');
  if (!listContainer) return;

  if (blogPosts.length === 0) {
    listContainer.innerHTML = '<div class="blog-admin-empty">No posts to manage</div>';
    return;
  }

  listContainer.innerHTML = blogPosts.map(post => {
    const tagClass = post.type === 'portfolio' ? 'portfolio' : 'life';
    const tagText = post.type === 'portfolio' ? 'Dental' : 'Life';
    const date = new Date(post.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const previewText = post.text.length > 50 ? post.text.substring(0, 50) + '...' : post.text;

    return `
      <div class="blog-admin-post-item" data-id="${post.id}">
        <div class="blog-admin-post-info">
          <span class="blog-admin-post-tag ${tagClass}">${tagText}</span>
          <span class="blog-admin-post-preview">${previewText}</span>
          <span class="blog-admin-post-date">${formattedDate}</span>
        </div>
        <div class="blog-admin-post-actions">
          <button class="blog-admin-edit-btn" onclick="editPost('${post.id}')">Edit</button>
          <button class="blog-admin-delete-btn" onclick="deletePost('${post.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function editPost(postId) {
  const post = blogPosts.find(p => p.id === postId);
  if (!post) return;

  editingPostId = postId;

  document.querySelectorAll('.blog-admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.blog-admin-tab[data-tab="add"]').classList.add('active');
  document.querySelectorAll('[data-tab-content]').forEach(content => {
    content.style.display = content.dataset.tabContent === 'add' ? 'block' : 'none';
  });

  document.querySelector('.blog-admin-tab[data-tab="add"]').textContent = 'Edit Post';
  document.getElementById('blog-post-type').value = post.type;
  document.getElementById('blog-post-text').value = post.text;
  document.querySelector('.blog-admin-submit').textContent = 'Update Post';

  adminImages = [];
  const preview = document.getElementById('blog-images-preview');
  preview.innerHTML = '';

  if (post.images && post.images.length > 0) {
    post.images.forEach(img => {
      const imageId = Date.now() + Math.random();
      const imgUrl = img.url || img;
      const imgSize = img.size || 500;

      adminImages.push({ id: imageId, url: imgUrl, size: imgSize });

      const imageItem = document.createElement('div');
      imageItem.className = 'blog-admin-image-item';
      imageItem.dataset.id = imageId;
      imageItem.innerHTML = `
        <img src="${imgUrl}" alt="Preview">
        <button type="button" class="blog-admin-image-remove" onclick="removeAdminImage(${imageId})">&times;</button>
        <input type="number" class="blog-admin-image-size" value="${imgSize}" placeholder="px" onchange="updateImageSize(${imageId}, this.value)">
      `;
      preview.appendChild(imageItem);
    });
  }
}

function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  if (database) {
    database.ref('blogPosts/' + postId).remove().then(() => {
      renderAdminPostsList();
      const container = document.querySelector('#blog-posts');
      if (container) {
        database.ref('blogPosts').orderByChild('timestamp').once('value', function(snapshot) {
          blogPosts = [];
          snapshot.forEach(function(childSnapshot) {
            const post = childSnapshot.val();
            post.id = childSnapshot.key;
            blogPosts.unshift(post);
          });
          renderBlogPosts(container);
          renderAdminPostsList();
        });
      }
    });
  } else {
    blogPosts = blogPosts.filter(p => p.id !== postId);
    renderAdminPostsList();
    const container = document.querySelector('#blog-posts');
    if (container) renderBlogPosts(container);
  }
}

// Keyboard shortcut: Ctrl + Shift + D + S
let ctrlPressed = false;
let shiftPressed = false;
let dPressed = false;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Control') ctrlPressed = true;
  if (e.key === 'Shift') shiftPressed = true;
  if (e.key === 'd' || e.key === 'D') dPressed = true;

  if (ctrlPressed && shiftPressed && dPressed && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    openBlogAdmin();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Control') ctrlPressed = false;
  if (e.key === 'Shift') shiftPressed = false;
  if (e.key === 'd' || e.key === 'D') dPressed = false;
});

// Initialize blog
initBlog();
