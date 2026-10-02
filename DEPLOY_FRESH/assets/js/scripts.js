// Google Analytics (gtag.js) Integration
(function() {
  // Global event tracker fallback
  window.trackGAEvent = function(eventName, eventParams = {}) {
    if (window.gtag) {
      window.gtag('event', eventName, eventParams);
      console.log(`🔥 Google Analytics Event: ${eventName}`, eventParams);
    } else {
      console.log(`📡 GA (Pending Config): ${eventName}`, eventParams);
    }
  };

  let loadedScripts = {};

  window.initGoogleAnalytics = async function(forcedStoreId) {
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
    const storeId = forcedStoreId || localStorage.getItem('laundry_selected_store_id');
    let gaId = 'G-2ML4Q9DYGH'; // Default fallback ID

    if (storeId) {
      try {
        const res = await fetch(`${API_BASE}/public/stores`);
        if (res.ok) {
          const stores = await res.json();
          const store = stores.find(s => s.id === storeId);
          if (store && store.googleAnalyticsId && store.googleAnalyticsId.trim().startsWith('G-')) {
            gaId = store.googleAnalyticsId.trim();
            console.log(`📍 Google Analytics loaded dynamically for branch ${store.name}: ${gaId}`);
          }
        }
      } catch (err) {
        console.error("Error loading branch GA4 configuration:", err);
      }
    }

    if (!gaId || gaId === 'G-XXXXXXXXXX') return;

    // Avoid loading the same GA script tag multiple times
    if (!loadedScripts[gaId]) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);
      loadedScripts[gaId] = true;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    window.gtag('js', new Date());
    window.gtag('config', gaId, {
      page_path: window.location.pathname
    });
  };

  // Run initial load
  window.initGoogleAnalytics();
})();

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
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
    const response = await fetch(adjustedUrl);
    if (!response.ok) return;
    let html = await response.text();

    // Fix links in the loaded partial to be relative to the current page
    if (isInPages) {
      // Replace href="index.html" with href="../index.html"
      html = html.replace(/href="index.html"/g, 'href="../index.html"');
      // Replace src="images/..." with src="../images/..."
      html = html.replace(/src="images\//g, 'src="../images/');
      html = html.replace(/src='images\//g, "src='../images/");
    } else {
      // We are in root. Replace href="services.html" with href="Pages/services.html"
      // But only if it doesn't already have Pages/
      const pages = ['services.html', 'about.html', 'feedback.html', 'store-locator.html', 'contact.html', 'booking.html', 'privacy-policy.html', 'terms-and-conditions.html', 'account-deletion-policy.html', 'admin.html', 'store-manager.html', 'profile.html'];
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
        <a href="${isInPages ? 'booking.html' : 'Pages/booking.html'}" class="btn-checkout">Proceed to Checkout <i class="fas fa-arrow-right"></i></a>
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

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

  window.addToCart = function(item, price, serviceId) {
    if (window.laundryCart[item]) {
      window.laundryCart[item].qty += 1;
    } else {
      window.laundryCart[item] = { price, service: serviceId, qty: 1 };
    }
    localStorage.setItem('laundry_cart', JSON.stringify(window.laundryCart));
    window.updateCartUI();
    window.showCart();
  };

  window.updateCartUI = function() {
    const user = JSON.parse(localStorage.getItem('laundry_user'));
    const cartBtn = document.getElementById('header-cart-btn');
    const badges = document.querySelectorAll('.cart-badge-count');
    const count = Object.values(window.laundryCart).reduce((acc, curr) => acc + curr.qty, 0);
    
    if (cartBtn) {
      if (user || count > 0) {
        cartBtn.style.display = 'flex';
      } else {
        cartBtn.style.display = 'none';
      }
    }

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
          <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 32px;">Enter your phone number to continue.</p>
          
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
          
          <div style="display: flex; align-items: center; margin: 24px 0;">
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
            <span style="padding: 0 16px; color: #94a3b8; font-size: 0.85rem; font-weight: 500;">or</span>
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
          </div>
          
          <button onclick="window.handleGoogleSignIn()" style="width: 100%; padding: 14px 20px; background: white; border: 1.5px solid #e2e8f0; border-radius: 100px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 0.95rem; font-weight: 600; color: #334155; transition: all 0.2s;" onmouseover="this.style.background='#f8fafc';this.style.borderColor='#cbd5e1'" onmouseout="this.style.background='white';this.style.borderColor='#e2e8f0'">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
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

        <div id="login-step-3" style="display: none;">
          <div style="width: 64px; height: 64px; background: var(--brand); color: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 24px; box-shadow: 0 8px 20px rgba(26, 111, 219, 0.2);">
            <i class="fas fa-user-plus"></i>
          </div>
          <h2 style="font-weight: 800; margin-bottom: 8px;">Create Profile</h2>
          <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 32px;">Complete your registration details.</p>
          
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="cx-new-name" class="booking-input" placeholder="Enter your name" style="background: white; margin-bottom: 15px;">
          </div>

          <div class="form-group">
            <label class="form-label">Account Type</label>
            <select id="cx-new-account-type" class="booking-input" style="background: white;">
              <option value="Residential">Residential</option>
              <option value="Business">Business</option>
            </select>
          </div>

          <div class="form-group" style="margin-top: 15px;">
            <label class="form-label">How did you know about us?</label>
            <select id="cx-new-source-segment" class="booking-input" style="background: white;">
              <option value="WS">WS - Website Directly</option>
              <option value="NP">NP - NewsPaper</option>
              <option value="SM">SM - Social Media</option>
              <option value="RF">RF - Reference</option>
              <option value="AP">AP - App Directly</option>
            </select>
          </div>

          <button class="button button-accent" style="width: 100%; margin-top: 28px; padding: 16px;" onclick="window.completeRegistration()">
            Complete Registration <i class="fas fa-check-circle" style="margin-left: 10px;"></i>
          </button>
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
    document.getElementById('login-step-3').style.display = 'none';
  };

  window.requestOTP = async function() {
    const phone = document.getElementById('cx-login-phone').value;
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
            window.showNotification(`Verification code sent to +91 ${phone}`);
            if (window.trackGAEvent) window.trackGAEvent('otp_requested', { phone: phone });
        } else {
            window.showNotification(data.error || 'Failed to send OTP', 'error');
        }
    } catch (err) { window.showNotification('Connection error. Is the backend running?', 'error'); }
  };

  window.verifyOTP = async function() {
    const otp = document.getElementById('cx-login-otp').value;
    const phone = document.getElementById('cx-login-phone').value;

    try {
        const res = await fetch('/api/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp })
        });
        const data = await res.json();

        if (res.ok) {
            sessionStorage.setItem('temp_login_token', data.token);
            sessionStorage.setItem('temp_login_phone', data.phone);
            
            if (data.isNewUser) {
                // Show registration profile setup step (Step 3)
                document.getElementById('login-step-2').style.display = 'none';
                document.getElementById('login-step-3').style.display = 'block';
                if (window.trackGAEvent) window.trackGAEvent('otp_signin_new_user', { phone: data.phone });
            } else {
                // Existing user: proceed directly to login
                localStorage.setItem('laundry_user', JSON.stringify({
                    phone: data.phone,
                    name: data.name || 'Laundry Basket User',
                    token: data.token,
                    sourceSegment: data.sourceSegment || null,
                    loggedIn: true
                }));
                window.updateLoginUI();
                window.updateCartUI();
                window.closeLoginModal();
                window.showNotification(`Login successful! Welcome back, ${data.name || 'User'}.`);
                window.handlePostLoginActions(data.phone, data.name || 'Laundry Basket User');
                if (window.trackGAEvent) window.trackGAEvent('login_success', { method: 'otp' });
            }
        } else {
            window.showNotification(data.error || 'Invalid OTP. Please try again.', 'error');
        }
    } catch (err) { window.showNotification('Connection error.', 'error'); }
  };

  window.completeRegistration = async function() {
    const name = document.getElementById('cx-new-name').value.trim();
    const accountType = document.getElementById('cx-new-account-type').value;
    const sourceSegment = document.getElementById('cx-new-source-segment')?.value || 'WS';
    const token = sessionStorage.getItem('temp_login_token');
    const phone = sessionStorage.getItem('temp_login_phone');

    if (!name) { alert('Please enter your name.'); return; }

    try {
        const res = await fetch('/api/customer/profile', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, accountType, sourceSegment })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('laundry_user', JSON.stringify({
                phone: phone,
                name: name,
                token: token,
                sourceSegment: sourceSegment,
                loggedIn: true
            }));
            window.updateLoginUI();
            window.updateCartUI();
            window.closeLoginModal();
            window.showNotification(`Registration successful! Welcome, ${name}.`);
            window.handlePostLoginActions(phone, name);
            if (window.trackGAEvent) window.trackGAEvent('registration_completed', { name: name, accountType: accountType, sourceSegment: sourceSegment });
        } else {
            window.showNotification(data.error || 'Failed to complete registration.', 'error');
        }
    } catch (e) {
        window.showNotification('Connection error.', 'error');
    }
  };

  window.handlePostLoginActions = function(phone, name) {
    const nextAction = sessionStorage.getItem('post_login_action');
    if (nextAction === 'place_order') {
        sessionStorage.removeItem('post_login_action');
        const bookingForm = document.querySelector('.booking-form');
        if (bookingForm) {
            const phoneInput = document.getElementById('phone-number');
            const nameInput = document.getElementById('full-name');
            if (phoneInput) phoneInput.value = phone;
            if (nameInput) nameInput.value = name;
            bookingForm.dispatchEvent(new Event('submit'));
        }
    } else if (nextAction && nextAction.startsWith('select_membership_')) {
        sessionStorage.removeItem('post_login_action');
        const plan = nextAction.split('_').pop();
        const isInPages = window.location.pathname.includes('Pages');
        window.location.href = isInPages ? `booking.html?package=${plan}` : `Pages/booking.html?package=${plan}`;
    }
  };

  window.updateLoginUI = function() {
    const user = JSON.parse(localStorage.getItem('laundry_user'));
    const loginLabel = document.getElementById('user-display-name');
    if (loginLabel) {
        loginLabel.innerText = user ? user.name : 'Login';
    }
  };

  window.logoutCustomer = function() {
    localStorage.removeItem('laundry_user');
    const isInPages = window.location.pathname.includes('Pages');
    window.location.href = isInPages ? '../index.html' : 'index.html';
  };

  // --- Google Sign-In ---
  window.handleGoogleSignIn = function() {
    // Load Google Identity Services if not already loaded
    if (!window.google || !window.google.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => window._initGoogleSignIn();
      document.head.appendChild(script);
    } else {
      window._initGoogleSignIn();
    }
  };

  window._initGoogleSignIn = function() {
    google.accounts.id.initialize({
      client_id: '387907120699-3qsenigfh59kv5ko7j4fnm1aeb82d5nr.apps.googleusercontent.com',
      callback: window._handleGoogleCredential,
    });
    google.accounts.id.prompt(); // Shows the One Tap or popup
  };

  window._handleGoogleCredential = async function(response) {
    const idToken = response.credential;
    if (!idToken) { window.showNotification('Google sign-in failed.', 'error'); return; }

    try {
      const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();

      if (res.ok) {
        if (data.isNewUser) {
          // Store temp token and show registration step
          sessionStorage.setItem('temp_login_token', data.token);
          sessionStorage.setItem('temp_login_phone', data.phone || '');
          if (data.name) document.getElementById('cx-new-name').value = data.name;
          document.getElementById('login-step-1').style.display = 'none';
          document.getElementById('login-step-3').style.display = 'block';
          if (window.trackGAEvent) window.trackGAEvent('google_signin_new_user', { name: data.name });
        } else {
          localStorage.setItem('laundry_user', JSON.stringify({
            phone: data.phone || '',
            email: data.email || '',
            name: data.name || 'Laundry Basket User',
            token: data.token,
            sourceSegment: data.sourceSegment || null,
            loggedIn: true
          }));
          window.updateLoginUI();
          window.updateCartUI();
          window.closeLoginModal();
          window.showNotification(`Welcome back, ${data.name || 'User'}!`);
          window.handlePostLoginActions(data.phone, data.name || 'Laundry Basket User');
          if (window.trackGAEvent) window.trackGAEvent('login_success', { method: 'google' });
        }
      } else {
        window.showNotification(data.error || 'Google authentication failed.', 'error');
      }
    } catch (err) {
      window.showNotification('Connection error during Google sign-in.', 'error');
    }
  };

  window.updateStats = async function() {
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
    try {
      const res = await fetch(`${API_BASE}/public/stats`);
      if (res.ok) {
        const data = await res.json();
        const ordersEl = document.getElementById('stat-orders');
        const customersEl = document.getElementById('stat-customers');
        if (ordersEl) ordersEl.innerText = data.orderCount.toLocaleString() + '+';
        if (customersEl) customersEl.innerText = data.customerCount.toLocaleString() + '+';
      }
    } catch (e) { console.warn("Stats fetch failed"); }
  };

  window.updateLoginUI();
  window.updateCartUI();
  window.updateStats();

  // Auto-track if URL has ?track=ID
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('track');
  if (trackId) {
    const trackInput = document.getElementById('track-order-id');
    if (trackInput) {
      trackInput.value = trackId;
      // Wait for scripts to load fully
      setTimeout(() => {
        if (typeof window.trackOrder === 'function') {
          window.trackOrder();
        }
      }, 1000);
    }
  }
});

// --- Premium Notification System ---
window.showNotification = function(message, type = 'info') {
    const existing = document.getElementById('lb-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'lb-notification';
    notification.className = `lb-notification ${type}`;
    notification.innerHTML = `
        <div class="lb-noti-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            <span>${message}</span>
        </div>
        <div class="lb-noti-progress"></div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 4000);
};

// --- Order Tracking Logic ---
window.trackOrder = async function() {
  const orderIdInput = document.getElementById('track-order-id');
  const statusDisplay = document.getElementById('tracking-status-display');
  const statusLabel = document.getElementById('status-main-label');
  const itemsList = document.getElementById('tracking-items-list');
  const totalValue = document.getElementById('status-total-value');
  
  const orderId = orderIdInput.value.trim().toUpperCase();
  
  if (!orderId) {
    window.showNotification('Please enter a valid Order ID.', 'error');
    return;
  }

  statusDisplay.style.display = 'block';
  statusLabel.innerText = 'Fetching Order...';
  itemsList.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px; padding: 10px 0;">
      <div style="height: 14px; background: rgba(0,0,0,0.06); border-radius: 6px; width: 100%; animation: pulse 1.5s infinite ease-in-out;"></div>
      <div style="height: 14px; background: rgba(0,0,0,0.06); border-radius: 6px; width: 80%; animation: pulse 1.5s infinite ease-in-out;"></div>
      <div style="height: 14px; background: rgba(0,0,0,0.06); border-radius: 6px; width: 90%; animation: pulse 1.5s infinite ease-in-out;"></div>
    </div>
  `;

  try {
      const res = await fetch(`/api/public/track/${orderId}`);
      if (!res.ok) throw new Error('Order not found');
      const order = await res.json();

      if (order) {
        statusLabel.innerText = 'Order ' + (order.status || 'Processing');
        totalValue.innerText = '₹' + (order.total || 0);
        let itemsHtml = '';
        if (order.amount_estimate_details && order.amount_estimate_details.length > 0) {
          itemsHtml = order.amount_estimate_details.map(item => `
            <div class="tracking-item-row">
              <span class="item-name">${order.service_type || 'Wash & Iron'} - ${item.matchedItem || item.rawName} (${item.qty} pcs)</span>
              <span class="item-status">${order.status || 'Pending'}</span>
            </div>
          `).join('');
        } else {
          const items = order.itemSummary ? order.itemSummary.split(', ') : (Array.isArray(order.services) ? order.services : [order.services || 'Laundry Service']);
          // If any item contains newline, split it!
          const cleanItems = [];
          items.forEach(i => {
            String(i).split('\n').forEach(line => {
              if (line.trim()) cleanItems.push(line.trim());
            });
          });
          itemsHtml = cleanItems.map(item => `
            <div class="tracking-item-row">
              <span class="item-name">${item}</span>
              <span class="item-status">${order.status || 'Pending'}</span>
            </div>
          `).join('');
        }
        itemsList.innerHTML = itemsHtml;

        // Live Tracking Map Logic
        const mapContainer = document.getElementById('live-tracking-map');
        if (order.status === 'Out for Delivery' || order.status === 'Picked Up') {
            mapContainer.style.display = 'block';
            if (!window.trackMap) {
                if (typeof L === 'undefined') {
                    // Dynamically load Leaflet stylesheet and script
                    const loadLeaflet = () => new Promise((resolve) => {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                        document.head.appendChild(link);
                        
                        const script = document.createElement('script');
                        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                        script.onload = () => resolve();
                        document.head.appendChild(script);
                    });
                    await loadLeaflet();
                }
                window.trackMap = L.map('live-tracking-map').setView([23.2599, 77.4126], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.trackMap);
                window.riderMarker = L.marker([23.2599, 77.4126]).addTo(window.trackMap);
            }

            // Connect to Live Tracking Socket
            if (!window.trackSocket) {
                window.trackSocket = io();
                window.trackSocket.emit('join_room', { orderId: orderId });
                
                window.trackSocket.on('rider_moved', (data) => {
                    console.log("Rider moved:", data);
                    if (window.riderMarker) {
                        window.riderMarker.setLatLng([data.lat, data.lng]);
                        window.trackMap.panTo([data.lat, data.lng]);
                    }
                });

                window.trackSocket.on('order_updated', (updatedOrder) => {
                    if (updatedOrder && updatedOrder.id === orderId) {
                        window.trackOrder(); // Reload tracker UI
                    }
                });
            }
        } else {
            mapContainer.style.display = 'none';
        }
      } else {
        statusLabel.innerText = 'Order Not Found';
        itemsList.innerHTML = '<p style="color: var(--error); font-size: 0.9rem;">Please check your Order ID and try again.</p>';
        totalValue.innerText = '₹0';
      }
  } catch (err) {
      statusLabel.innerText = 'Server Error';
      window.showNotification('Connection error. Is the backend running?', 'error');
  }
};

window.closeTracking = function() {
  const statusDisplay = document.getElementById('tracking-status-display');
  if (statusDisplay) statusDisplay.style.display = 'none';
};
