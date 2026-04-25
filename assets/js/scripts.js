async function loadPartial(selector, url) {
  const container = document.querySelector(selector);
  if (!container) return;

  // Adjust URL based on current directory depth
  // index.html is root (depth 0). Pages/about.html is depth 1.
  const pathParts = window.location.pathname.split('/').filter(p => p !== '');
  // On local file systems or GitHub pages, the base path might vary.
  // We check if 'Pages' is in the path.
  const isInPages = pathParts.includes('Pages');
  const prefix = isInPages ? '../' : '';
  const adjustedUrl = prefix + url;

  try {
    const response = await fetch(adjustedUrl);
    if (!response.ok) return;
    let html = await response.text();

    // Fix links in the loaded partial to be relative to the current page
    if (isInPages) {
      // Replace href="index.html" with href="../index.html"
      html = html.replace(/href="index.html"/g, 'href="../index.html"');
      // Replace src="images/..." with src="../images/..."
      html = html.replace(/src="images\//g, 'src="../images/');
    } else {
      // We are in root. Replace href="services.html" with href="Pages/services.html"
      // But only if it doesn't already have Pages/
      const pages = ['services.html', 'about.html', 'feedback.html', 'store-locator.html', 'contact.html', 'booking.html', 'privacy-policy.html', 'terms-and-conditions.html', 'admin.html', 'store-manager.html', 'profile.html'];
      pages.forEach(page => {
        const regex = new RegExp(`href="${page}"`, 'g');
        html = html.replace(regex, `href="Pages/${page}"`);
      });
    }

    container.innerHTML = html;
  } catch (error) {
    console.error(`Unable to load partial ${adjustedUrl}:`, error);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadPartial('#site-header', 'assets/header.html');
  await loadPartial('#site-footer', 'assets/footer.html');

  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  const navLinksItems = document.querySelectorAll('.nav-links a');

  navLinksItems.forEach((link) => {
    const href = link.getAttribute('href');
    // Normalize href for comparison
    const normalizedHref = href.split('/').pop();

    if (normalizedHref === currentFile || (normalizedHref === 'index.html' && (currentFile === '' || currentFile === 'index.html'))) {
      link.classList.add('active');
    }
  });

  // Mobile Menu Toggle logic
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const navContainer = document.querySelector('.nav-links');
  const overlay = document.querySelector('.mobile-menu-overlay');

  if (toggleBtn && navContainer) {
    const toggleMenu = () => {
      const isActive = navContainer.classList.toggle('active');
      toggleBtn.classList.toggle('active');
      if (overlay) overlay.classList.toggle('active');

      const icon = toggleBtn.querySelector('i');
      if (isActive) {
        icon.className = 'fas fa-times';
        document.body.style.overflow = 'hidden';
      } else {
        icon.className = 'fas fa-bars';
        document.body.style.overflow = '';
      }
    };

    toggleBtn.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // Close menu when clicking a link
    navContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (navContainer.classList.contains('active')) toggleMenu();
      });
    });
  }

  // Feedback Carousel Logic
  const feedbackCards = document.querySelectorAll('.feedback-card');
  const dots = document.querySelectorAll('.carousel-dots .dot');
  if (feedbackCards.length === 5) {
    let currentIndex = 2; // Middle card starts active

    function updateCarousel() {
      feedbackCards.forEach((card, index) => {
        card.classList.remove('card-hidden', 'card-hidden-left', 'card-hidden-right', 'card-left', 'card-center', 'card-right', 'card-side');
        card.style.display = ''; // Clear inline fallback

        if (index === currentIndex) {
          card.classList.add('card-center');
        } else if (index === (currentIndex - 1 + feedbackCards.length) % feedbackCards.length) {
          card.classList.add('card-side', 'card-left');
        } else if (index === (currentIndex + 1) % feedbackCards.length) {
          card.classList.add('card-side', 'card-right');
        } else if (index === (currentIndex - 2 + feedbackCards.length) % feedbackCards.length) {
          card.classList.add('card-hidden-left');
        } else {
          card.classList.add('card-hidden-right');
        }
      });

      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
      });
    }

    // Initialize layout
    updateCarousel();

    // Auto-advance every 5 seconds
    setInterval(() => {
      currentIndex = (currentIndex + 1) % feedbackCards.length;
      updateCarousel();
    }, 5000);

    // Allow clicking dots to navigate manually
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        currentIndex = index;
        updateCarousel();
      });
    });
  }

  // --- Global Cart System ---
  const cartDrawerHtml = `
    <div class="cart-drawer">
      <div class="cart-header">
        <h3>My Basket</h3>
        <button class="close-cart" onclick="window.closeCart()"><i class="fas fa-times"></i></button>
      </div>
      <div class="cart-body"></div>
      <div class="cart-footer">
        <div class="cart-total">
          <span>Total Estimate</span>
          <span>₹0</span>
        </div>
        <a href="booking.html" class="btn-checkout">Proceed to Checkout <i class="fas fa-arrow-right"></i></a>
      </div>
    </div>
  `;

  if (!document.querySelector('.cart-drawer')) {
    const drawerContainer = document.createElement('div');
    drawerContainer.id = 'cart-drawer-container';
    drawerContainer.innerHTML = cartDrawerHtml;
    document.body.appendChild(drawerContainer);
  }

  window.laundryCart = JSON.parse(localStorage.getItem('laundry_cart') || '{}');

  window.addToCart = function(item, price, service) {
    if (window.laundryCart[item]) {
      window.laundryCart[item].qty += 1;
    } else {
      window.laundryCart[item] = { price, service, qty: 1 };
    }
    localStorage.setItem('laundry_cart', JSON.stringify(window.laundryCart));
    window.updateCartUI();
    window.showCart();
  };

  window.updateCartUI = function() {
    const badges = document.querySelectorAll('.cart-badge-count');
    const count = Object.values(window.laundryCart).reduce((acc, curr) => acc + curr.qty, 0);
    badges.forEach(badge => {
      badge.innerText = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
    
    const cartBody = document.querySelector('.cart-body');
    if (!cartBody) return;

    if (count === 0) {
      cartBody.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-basket"></i><p>Your basket is empty</p></div>';
      const totalEl = document.querySelector('.cart-total span:last-child');
      if (totalEl) totalEl.innerText = '₹0';
      return;
    }

    let total = 0;
    cartBody.innerHTML = Object.entries(window.laundryCart).map(([name, data]) => {
      total += data.price * data.qty;
      return `
        <div class="cart-item">
          <div>
            <h5>${name}</h5>
            <p>₹${data.price} x ${data.qty}</p>
          </div>
          <div class="qty-controls">
            <button onclick="window.changeCartQty('${name}', -1)">-</button>
            <span>${data.qty}</span>
            <button onclick="window.changeCartQty('${name}', 1)">+</button>
          </div>
        </div>
      `;
    }).join('');
    const totalEl = document.querySelector('.cart-total span:last-child');
    if (totalEl) totalEl.innerText = '₹' + total;
  };

  window.changeCartQty = function(name, delta) {
    if (!window.laundryCart[name]) return;
    window.laundryCart[name].qty += delta;
    if (window.laundryCart[name].qty <= 0) delete window.laundryCart[name];
    localStorage.setItem('laundry_cart', JSON.stringify(window.laundryCart));
    window.updateCartUI();
  };

  window.showCart = function() { document.querySelector('.cart-drawer').classList.add('open'); };
  window.closeCart = function() { document.querySelector('.cart-drawer').classList.remove('open'); };

  // --- Global Customer OTP Login System ---
  const loginModalHtml = `
    <div id="cx-login-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(15px); z-index: 4000; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 400px; padding: 48px; position: relative;">
        <button class="close-btn" onclick="window.closeLoginModal()" style="position: absolute; right: 20px; top: 20px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--muted);"><i class="fas fa-times"></i></button>
        
        <div id="login-step-1">
          <div style="width: 64px; height: 64px; background: var(--brand); color: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 24px; box-shadow: 0 8px 20px rgba(26, 111, 219, 0.2);">
            <i class="fas fa-mobile-alt"></i>
          </div>
          <h2 style="font-weight: 800; margin-bottom: 8px;">Welcome Back</h2>
          <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 32px;">Enter your details to continue.</p>
          
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="cx-login-name" class="booking-input" placeholder="Your Name" style="background: white; margin-bottom: 15px;">
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 16px; font-weight: 700; color: var(--brand-dark);">+91</span>
              <input type="tel" id="cx-login-phone" class="booking-input" placeholder="00000 00000" style="padding-left: 55px; background: white;">
            </div>
          </div>
          <button class="button button-accent" style="width: 100%; margin-top: 32px; padding: 16px;" onclick="window.requestOTP()">
            Get Verification Code <i class="fas fa-paper-plane" style="margin-left: 10px;"></i>
          </button>
        </div>

        <div id="login-step-2" style="display: none;">
          <div style="width: 64px; height: 64px; background: #22c55e; color: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 24px; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.2);">
            <i class="fas fa-shield-alt"></i>
          </div>
          <h2 style="font-weight: 800; margin-bottom: 8px;">Verify OTP</h2>
          <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 32px;">We've sent a code to <strong id="display-otp-phone"></strong></p>
          
          <div class="form-group">
            <label class="form-label">Verification Code</label>
            <input type="text" id="cx-login-otp" class="booking-input" placeholder="Enter 4-digit code" style="text-align: center; letter-spacing: 10px; font-size: 1.2rem; font-weight: 800; background: white;">
          </div>
          <button class="button button-accent" style="width: 100%; margin-top: 32px; padding: 16px;" onclick="window.verifyOTP()">
            Verify & Continue <i class="fas fa-check" style="margin-left: 10px;"></i>
          </button>
          <p style="text-align: center; margin-top: 20px; font-size: 0.85rem; color: var(--muted);">
            Didn't receive code? <a href="#" style="color: var(--brand); font-weight: 700; text-decoration: none;" onclick="window.requestOTP()">Resend</a>
          </p>
        </div>
      </div>
    </div>
  `;

  if (!document.getElementById('cx-login-modal')) {
    const div = document.createElement('div');
    div.innerHTML = loginModalHtml;
    document.body.appendChild(div);
  }

  window.showLoginModal = function() {
    const user = JSON.parse(localStorage.getItem('laundry_user'));
    if (user) {
        // Find if we are in Pages/ or root
        const isInPages = window.location.pathname.includes('Pages');
        window.location.href = isInPages ? 'profile.html' : 'Pages/profile.html';
        return;
    }
    document.getElementById('cx-login-modal').style.display = 'flex';
  };

  window.closeLoginModal = function() {
    document.getElementById('cx-login-modal').style.display = 'none';
    document.getElementById('login-step-1').style.display = 'block';
    document.getElementById('login-step-2').style.display = 'none';
  };

  window.requestOTP = async function() {
    const phone = document.getElementById('cx-login-phone').value;
    const name = document.getElementById('cx-login-name').value;
    if (!name) { alert('Please enter your name.'); return; }
    if (phone.length < 10) { alert('Please enter a valid 10-digit number.'); return; }
    
    try {
        const res = await fetch('/api/otp/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('display-otp-phone').innerText = '+91 ' + phone;
            document.getElementById('login-step-1').style.display = 'none';
            document.getElementById('login-step-2').style.display = 'block';
            sessionStorage.setItem('pending_login_name', name);
            if (phone === '9999999999') alert(`Static OTP enabled for testing. Use: ${data.otp}`);
            else alert(`Verification code sent to +91 ${phone}`);
        } else {
            alert(data.error || 'Failed to send OTP');
        }
    } catch (err) { alert('Connection error. Is the backend running?'); }
  };

  window.verifyOTP = async function() {
    const otp = document.getElementById('cx-login-otp').value;
    const phone = document.getElementById('cx-login-phone').value;
    const name = sessionStorage.getItem('pending_login_name');

    try {
        const res = await fetch('/api/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp, name })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('laundry_user', JSON.stringify({
                phone: data.phone,
                name: data.name,
                token: data.token,
                loggedIn: true
            }));
            window.updateLoginUI();
            window.closeLoginModal();
            alert(`Login successful! Welcome back, ${data.name}.`);
        } else {
            alert(data.error || 'Invalid OTP. Please try again.');
        }
    } catch (err) { alert('Connection error.'); }
  };

  window.updateLoginUI = function() {
    const user = JSON.parse(localStorage.getItem('laundry_user'));
    const loginLabel = document.getElementById('user-display-name');
    if (loginLabel) {
        loginLabel.innerText = user ? user.name : 'Login';
    }
  };

  window.updateLoginUI();
  window.updateCartUI();
});

// --- Order Tracking Logic ---
window.trackOrder = async function() {
  const orderIdInput = document.getElementById('track-order-id');
  const statusDisplay = document.getElementById('tracking-status-display');
  const statusLabel = document.getElementById('status-main-label');
  const itemsList = document.getElementById('tracking-items-list');
  const totalValue = document.getElementById('status-total-value');
  
  const orderId = orderIdInput.value.trim().toUpperCase();
  
  if (!orderId) {
    alert('Please enter a valid Order ID.');
    return;
  }

  statusDisplay.style.display = 'block';
  statusLabel.innerText = 'Tracking...';

  try {
      // Look up in backend
      const res = await fetch(`http://localhost:5000/api/orders`);
      const allOrders = await res.json();
      const order = allOrders.find(b => b.id.toUpperCase() === orderId);

      if (order) {
        statusLabel.innerText = 'Order ' + (order.status || 'Processing');
        totalValue.innerText = '₹' + (order.total || 0);
        const items = order.itemSummary ? order.itemSummary.split(', ') : [order.services || 'Laundry Service'];
        itemsList.innerHTML = items.map(item => `
          <div class="tracking-item-row">
            <span class="item-name">${item}</span>
            <span class="item-status">${order.status || 'Pending'}</span>
          </div>
        `).join('');
      } else {
        statusLabel.innerText = 'Order Not Found';
        itemsList.innerHTML = '<p style="color: var(--error); font-size: 0.9rem;">Please check your Order ID and try again.</p>';
        totalValue.innerText = '₹0';
      }
  } catch (err) {
      statusLabel.innerText = 'Server Error';
      console.error(err);
  }
};

window.closeTracking = function() {
  const statusDisplay = document.getElementById('tracking-status-display');
  if (statusDisplay) statusDisplay.style.display = 'none';
};
