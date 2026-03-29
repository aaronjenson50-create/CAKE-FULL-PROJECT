document.addEventListener('DOMContentLoaded', () => {
    // Register GSAP Plugins
    gsap.registerPlugin(ScrollTrigger);

    // =========================================================
    // CONFIG — REPLACE WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
    // =========================================================
    const CONFIG = {
        apiUrl: "https://script.google.com/macros/s/AKfycbxivFBD1Sx60cB7F91ym8vLBgBanZr_Z1Jn0Da4Ex0zwiJXHTeyhio03RuDJBpSh6Tx/exec",
        refreshIntervalMs: 30000  // 30 seconds silent refresh
    };

    // =========================================================
    // ADMIN PASSWORD — change to something private
    // =========================================================
    const ADMIN_PASSWORD = "jenzcakes2024";

    let cakes = [];          // live data from Google Sheet
    let isAdminMode = false;

    // --- UI ELEMENTS ---
    const loader = document.getElementById('loader');
    const loaderBar = document.querySelector('.loader-bar');
    const productsGrid = document.getElementById('products-grid');
    const loadingIndicator = document.getElementById('loading-indicator');
    const refreshBtn = document.getElementById('refresh-cakes-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const cartBtn = document.getElementById('cart-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const closeCart = document.getElementById('close-cart');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalAmount = document.getElementById('cart-total-amount');
    const cartCount = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeModal = document.getElementById('close-modal');
    const orderForm = document.getElementById('order-form');
    const scrollProgress = document.getElementById('scroll-progress');
    const navbar = document.getElementById('navbar');

    // Customization elements
    const custCakeSelect = document.getElementById('cust-cake-select');
    const custMessage = document.getElementById('cust-message');
    const cakeTextPreview = document.getElementById('cake-text-preview');
    const addCustomBtn = document.getElementById('add-custom-btn');
    const previewImg = document.getElementById('preview-img');
    const custPriceDisplay = document.getElementById('cust-price-display');


    // =========================================================
    // API HELPERS
    // =========================================================

    /** GET all cakes from the sheet */
    async function apiGet() {
        const res = await fetch(`${CONFIG.apiUrl}?action=get`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }

    /** POST a request (add / delete / update) */
    async function apiPost(payload) {
        const res = await fetch(CONFIG.apiUrl, {
            method: "POST",
            // Google Apps Script requires text/plain body in no-cors mode,
            // but since we deploy as "Anyone" we can use JSON directly.
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }


    // =========================================================
    // FETCH & RENDER
    // =========================================================

    async function fetchCakes(showIndicator = true) {
        if (showIndicator) {
            loadingIndicator.classList.add('show');
            refreshBtn.classList.add('loading');
        }
        try {
            const data = await apiGet();

            if (Array.isArray(data)) {
                // Use rowIndex returned by the API (already correct sheet row number)
                cakes = data.map((item, i) => ({
                    rowIndex: item.rowIndex || (i + 2), // prefer API-provided rowIndex
                    name    : item.name     || item.Name     || "Special Cake",
                    price   : parseFloat(item.price || item.Price || 0),
                    image   : item.image    || item.Image    || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800",
                    category: (item.category || item.Category || "all").toLowerCase().trim(),
                    tag     : item.tag      || item.Tag      || "Freshly Baked"
                }));

                renderProducts();
                populateCakeSelector();
            }
        } catch (err) {
            console.error("Failed to fetch cakes:", err);
        } finally {
            if (showIndicator) {
                loadingIndicator.classList.remove('show');
                refreshBtn.classList.remove('loading');
            }
        }
    }


    // =========================================================
    // RENDER PRODUCTS
    // =========================================================

    function renderProducts(filter = null) {
        // Remove old cards (keep loading indicator)
        productsGrid.querySelectorAll('.premium-card').forEach(el => el.remove());

        const activeFilter = filter || (document.querySelector('.filter-btn.active')?.dataset.filter ?? 'all');
        const filtered = activeFilter === 'all' ? cakes : cakes.filter(c => c.category === activeFilter);

        if (filtered.length === 0 && cakes.length > 0) {
            const noMsg = document.createElement('p');
            noMsg.className = 'no-results';
            noMsg.style.cssText = 'text-align:center;grid-column:1/-1;';
            noMsg.textContent = 'Our bakers are working on this collection. Check back soon!';
            productsGrid.appendChild(noMsg);
            return;
        }

        filtered.forEach((cake, index) => {
            const card = document.createElement('div');
            card.className = 'premium-card';
            card.dataset.rowIndex = cake.rowIndex;

            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${cake.image}" alt="${cake.name}"
                         onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800'">
                </div>
                <div class="card-content">
                    <h3>${cake.name}</h3>
                    <div class="card-price">₹${cake.price.toLocaleString()}</div>
                    <div class="card-category-badge">${cake.category}</div>
                    ${isAdminMode ? buildAdminCardActions(cake) : `<button class="btn btn-primary full-width add-to-cart" data-row="${cake.rowIndex}">Add to Cart</button>`}
                </div>
            `;

            productsGrid.appendChild(card);

            gsap.from(card, { opacity: 0, y: 50, duration: 0.8, delay: index * 0.1, ease: "power2.out" });
        });

        // Listeners for shop mode
        if (!isAdminMode) {
            document.querySelectorAll('.add-to-cart').forEach(btn => {
                btn.addEventListener('click', e => {
                    const row = parseInt(e.currentTarget.dataset.row);
                    const cake = cakes.find(c => c.rowIndex === row);
                    if (cake) addToCart(cake);
                });
            });
        } else {
            attachAdminCardListeners();
        }
    }

    function buildAdminCardActions(cake) {
        return `
            <div class="admin-card-actions">
                <button class="btn btn-sm btn-edit" data-row="${cake.rowIndex}">
                    <i class="fas fa-pen"></i> Edit
                </button>
                <button class="btn btn-sm btn-delete" data-row="${cake.rowIndex}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
    }


    // =========================================================
    // ADMIN PANEL
    // =========================================================

    function injectAdminPanel() {
        if (document.getElementById('admin-panel')) return;

        const panel = document.createElement('section');
        panel.id = 'admin-panel';
        panel.style.cssText = `
            padding: 2rem;
            background: var(--bg-card, #1a1a2e);
            border-top: 2px solid var(--accent-light, #f9a8d4);
            margin-top: 2rem;
        `;
        panel.innerHTML = `
            <div class="container">
                <h2 class="section-title" style="margin-bottom:1.5rem;">🛠 Admin — Manage Cakes</h2>

                <form id="admin-add-form" style="display:grid;gap:0.8rem;max-width:600px;margin-bottom:2.5rem;">
                    <h3 style="color:var(--accent-light,#f9a8d4);font-size:1.1rem;">Add New Cake</h3>
                    <input id="a-name"     type="text"   placeholder="Cake Name *"     required style="${adminInputStyle()}">
                    <input id="a-price"    type="number" placeholder="Price (₹) *"     required style="${adminInputStyle()}">
                    <input id="a-image"    type="url"    placeholder="Image URL"                style="${adminInputStyle()}">
                    <input id="a-category" type="text"   placeholder="Category (e.g. chocolate)" style="${adminInputStyle()}">
                    <input id="a-tag"      type="text"   placeholder="Tag (e.g. New, Best Seller)" style="${adminInputStyle()}">
                    <button type="submit" class="btn btn-primary" style="width:fit-content;padding:.6rem 1.8rem;">
                        <i class="fas fa-plus"></i> Add Cake
                    </button>
                </form>

                <!-- Edit area (hidden by default) -->
                <form id="admin-edit-form" style="display:none;gap:0.8rem;max-width:600px;margin-bottom:2.5rem;">
                    <h3 style="color:var(--accent-light,#f9a8d4);font-size:1.1rem;">✏️ Edit Cake  <small id="edit-row-label" style="opacity:.6;"></small></h3>
                    <input id="e-name"     type="text"   placeholder="Cake Name *"     required style="${adminInputStyle()}">
                    <input id="e-price"    type="number" placeholder="Price (₹) *"     required style="${adminInputStyle()}">
                    <input id="e-image"    type="url"    placeholder="Image URL"                style="${adminInputStyle()}">
                    <input id="e-category" type="text"   placeholder="Category"                 style="${adminInputStyle()}">
                    <input id="e-tag"      type="text"   placeholder="Tag"                       style="${adminInputStyle()}">
                    <div style="display:flex;gap:.8rem;">
                        <button type="submit" class="btn btn-primary" style="padding:.6rem 1.8rem;">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button type="button" id="cancel-edit-btn" class="btn btn-outline" style="padding:.6rem 1.8rem;">
                            Cancel
                        </button>
                    </div>
                </form>

                <p id="admin-status" style="color:var(--accent-light,#f9a8d4);min-height:1.4rem;font-weight:600;"></p>
            </div>
        `;

        // Insert before footer
        document.querySelector('footer').before(panel);

        // Wire add form
        document.getElementById('admin-add-form').addEventListener('submit', handleAddCake);

        // Wire edit form
        document.getElementById('admin-edit-form').addEventListener('submit', handleUpdateCake);

        // Wire cancel edit
        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            document.getElementById('admin-edit-form').style.display = 'none';
        });
    }

    function adminInputStyle() {
        return `width:100%;padding:.6rem .9rem;border-radius:8px;border:1px solid rgba(255,255,255,.15);
                background:rgba(255,255,255,.07);color:inherit;font-size:.95rem;`;
    }

    function setAdminStatus(msg, isError = false) {
        const el = document.getElementById('admin-status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? '#f87171' : '#86efac';
        setTimeout(() => { el.textContent = ''; }, 4000);
    }

    // ---- ADD ----
    async function handleAddCake(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Adding…';

        const payload = {
            action: "add",
            name: document.getElementById('a-name').value.trim(),
            price: document.getElementById('a-price').value.trim(),
            image: document.getElementById('a-image').value.trim(),
            category: document.getElementById('a-category').value.trim(),
            tag: document.getElementById('a-tag').value.trim()
        };

        try {
            const result = await apiPost(payload);
            if (result.status === "success") {
                setAdminStatus("✅ Cake added successfully!");
                e.target.reset();
                await fetchCakes(false);
            } else {
                throw new Error(result.message || "Unknown error");
            }
        } catch (err) {
            setAdminStatus("❌ Error: " + err.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Add Cake';
        }
    }

    // ---- DELETE ----
    async function handleDeleteCake(rowIndex) {
        if (!confirm("Delete this cake from Google Sheets? This cannot be undone.")) return;

        setAdminStatus("Deleting…");
        try {
            const result = await apiPost({ action: "delete", rowIndex });
            if (result.status === "success") {
                setAdminStatus("🗑️ Cake deleted.");
                await fetchCakes(false);
            } else {
                throw new Error(result.message || "Unknown error");
            }
        } catch (err) {
            setAdminStatus("❌ Error: " + err.message, true);
        }
    }

    // ---- EDIT (open form) ----
    function openEditForm(rowIndex) {
        const cake = cakes.find(c => c.rowIndex === rowIndex);
        if (!cake) return;

        const form = document.getElementById('admin-edit-form');
        form.style.display = 'grid';
        form.dataset.rowIndex = rowIndex;
        document.getElementById('edit-row-label').textContent = `(Sheet row ${rowIndex})`;
        document.getElementById('e-name').value = cake.name;
        document.getElementById('e-price').value = cake.price;
        document.getElementById('e-image').value = cake.image;
        document.getElementById('e-category').value = cake.category;
        document.getElementById('e-tag').value = cake.tag;

        form.scrollIntoView({ behavior: 'smooth' });
    }

    // ---- UPDATE ----
    async function handleUpdateCake(e) {
        e.preventDefault();
        const form = e.target;
        const rowIndex = parseInt(form.dataset.rowIndex);
        const btn = form.querySelector('button[type=submit]');

        btn.disabled = true;
        btn.textContent = 'Saving…';

        const payload = {
            action: "update",
            rowIndex,
            name: document.getElementById('e-name').value.trim(),
            price: document.getElementById('e-price').value.trim(),
            image: document.getElementById('e-image').value.trim(),
            category: document.getElementById('e-category').value.trim(),
            tag: document.getElementById('e-tag').value.trim()
        };

        try {
            const result = await apiPost(payload);
            if (result.status === "success") {
                setAdminStatus("✅ Cake updated!");
                form.style.display = 'none';
                await fetchCakes(false);
            } else {
                throw new Error(result.message || "Unknown error");
            }
        } catch (err) {
            setAdminStatus("❌ Error: " + err.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }

    // Attach Edit / Delete listeners on rendered cards
    function attachAdminCardListeners() {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openEditForm(parseInt(btn.dataset.row)));
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteCake(parseInt(btn.dataset.row)));
        });
    }


    // =========================================================
    // ADMIN LOGIN TOGGLE
    // Adds a secret "Admin" link in the navbar on Shift+A press
    // =========================================================

    injectAdminToggle();

    function injectAdminToggle() {
        // Add Admin Login button to nav-actions
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        const adminBtn = document.createElement('button');
        adminBtn.id = 'admin-toggle-btn';
        adminBtn.title = 'Admin Login';
        adminBtn.innerHTML = '<i class="fas fa-user-shield"></i>';
        adminBtn.style.cssText = `
            background: transparent;
            border: 1px solid rgba(255,255,255,.2);
            border-radius: 8px;
            padding: .4rem .6rem;
            cursor: pointer;
            color: inherit;
            font-size: .9rem;
            transition: all .3s;
        `;
        navActions.prepend(adminBtn);

        adminBtn.addEventListener('click', toggleAdminMode);
    }

    function toggleAdminMode() {
        if (!isAdminMode) {
            const pwd = prompt("Enter admin password:");
            if (pwd !== ADMIN_PASSWORD) {
                alert("Incorrect password.");
                return;
            }
            isAdminMode = true;
            document.getElementById('admin-toggle-btn').style.color = '#86efac';
            document.getElementById('admin-toggle-btn').title = 'Exit Admin Mode';
            injectAdminPanel();
            renderProducts(); // re-render with admin buttons
            document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            isAdminMode = false;
            document.getElementById('admin-toggle-btn').style.color = '';
            document.getElementById('admin-toggle-btn').title = 'Admin Login';
            document.getElementById('admin-panel')?.remove();
            renderProducts(); // re-render without admin buttons
        }
    }


    // =========================================================
    // POPULATE CAKE SELECTOR (Customise section)
    // =========================================================

    function populateCakeSelector() {
        if (!custCakeSelect) return;
        custCakeSelect.innerHTML = '';

        if (cakes.length === 0) {
            custCakeSelect.innerHTML = '<option>No cakes available</option>';
            return;
        }

        cakes.forEach(cake => {
            const opt = document.createElement('option');
            opt.value = cake.name;
            opt.textContent = cake.name;
            custCakeSelect.appendChild(opt);
        });

        if (cakes.length > 0) {
            previewImg.src = cakes[0].image;
            updateCustomPrice();
        }
    }

    function updateCustomPrice() {
        if (!custCakeSelect || cakes.length === 0) return 0;
        const baseCake = cakes.find(c => c.name === custCakeSelect.value);
        if (!baseCake) return 0;

        const sizeInput = document.querySelector('input[name="size"]:checked');
        const size = sizeInput ? sizeInput.value : '1kg';
        let multiplier = 1;
        if (size === '0.5kg') multiplier = 0.5;
        if (size === '2kg') multiplier = 2;

        const finalPrice = Math.round(baseCake.price * multiplier);
        if (custPriceDisplay) {
            custPriceDisplay.textContent = `₹${finalPrice.toLocaleString()}`;
            gsap.from(custPriceDisplay, { scale: 1.1, duration: 0.2 });
        }
        return finalPrice;
    }


    // =========================================================
    // LOADER
    // =========================================================

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        loaderBar.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.style.display = 'none';
                    initAnimations();
                }, 1000);
            }, 500);
        }
    }, 50);


    // =========================================================
    // INTERACTIVE CONTROLS
    // =========================================================

    refreshBtn.addEventListener('click', () => fetchCakes());

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(e.target.dataset.filter);
        });
    });

    // Silent auto-refresh
    setInterval(() => fetchCakes(false), CONFIG.refreshIntervalMs);


    // =========================================================
    // CART SYSTEM
    // =========================================================

    let cart = JSON.parse(localStorage.getItem('jenz_cart')) || [];

    function addToCart(cake, options = null) {
        const cartItem = {
            ...cake,
            cartId: Date.now(),
            options: options || { size: '1kg', flavor: 'Standard', message: '' }
        };
        cart.push(cartItem);
        updateCart();
        openCartDrawer();
        gsap.to(cartCount, { scale: 1.5, duration: 0.2, yoyo: true, repeat: 1 });
    }

    function updateCart() {
        localStorage.setItem('jenz_cart', JSON.stringify(cart));
        cartCount.textContent = cart.length;
        renderCartItems();
        calculateTotal();
    }

    function renderCartItems() {
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center;opacity:.5;margin-top:50px;">Your basket is empty.</p>';
            return;
        }
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <span>${item.options.size} | ${item.options.flavor}</span>
                </div>
                <div class="cart-item-price">₹${item.price}</div>
                <button class="remove-item" data-cartid="${item.cartId}"><i class="fas fa-trash"></i></button>
            `;
            cartItemsContainer.appendChild(div);
        });
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.cartid);
                cart = cart.filter(i => i.cartId !== id);
                updateCart();
            });
        });
    }

    function calculateTotal() {
        const total = cart.reduce((s, i) => s + i.price, 0);
        cartTotalAmount.textContent = `₹${total.toLocaleString()}`;
    }

    function openCartDrawer() { cartDrawer.classList.add('open'); cartOverlay.classList.add('show'); }
    function closeCartDrawer() { cartDrawer.classList.remove('open'); cartOverlay.classList.remove('show'); }

    cartBtn.addEventListener('click', openCartDrawer);
    closeCart.addEventListener('click', closeCartDrawer);
    cartOverlay.addEventListener('click', closeCartDrawer);


    // =========================================================
    // GSAP ANIMATIONS
    // =========================================================

    function initAnimations() {
        const tl = gsap.timeline();
        tl.from('.hero-title', { x: -100, opacity: 0, duration: 1.2, ease: "power4.out" })
            .from('.hero-subtitle', { x: -50, opacity: 0, duration: 1, ease: "power3.out" }, "-=0.8")
            .from('.hero-cta .btn', { y: 30, opacity: 0, duration: 0.8, stagger: 0.2 }, "-=0.6")
            .from('.hero-visual', { scale: 0.8, opacity: 0, duration: 1.5, ease: "elastic.out(1, 0.5)" }, "-=1");

        gsap.to('.hero-cake-img', { y: -20, rotation: 5, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut" });

        const heroVisual = document.querySelector('.hero-visual');
        heroVisual.addEventListener('mousemove', e => {
            const x = (e.clientX - window.innerWidth / 2) / 25;
            const y = (e.clientY - window.innerHeight / 2) / 25;
            gsap.to('.hero-cake-img', { x, y, duration: 2, ease: "power3.out" });
            gsap.to('.cake-glow', { x: x * 1.5, y: y * 1.5, duration: 2, ease: "power3.out" });
        });
        heroVisual.addEventListener('mouseleave', () => {
            gsap.to('.hero-cake-img', { x: 0, y: 0, duration: 2, ease: "elastic.out(1, 0.3)" });
            gsap.to('.cake-glow', { x: 0, y: 0, duration: 2, ease: "elastic.out(1, 0.3)" });
        });

        gsap.to('.hero-cake-img', {
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
            y: 150, rotation: 15, scale: 1.2
        });

        document.querySelectorAll('.section-header').forEach(h => {
            gsap.from(h, {
                scrollTrigger: { trigger: h, start: "top 90%" },
                opacity: 0, y: 30, duration: 1, ease: "power2.out"
            });
        });

        gsap.from('.testimonial-card', {
            scrollTrigger: { trigger: '.testimonials', start: "top 80%" },
            x: 100, opacity: 0, duration: 1, stagger: 0.3
        });
    }


    // =========================================================
    // SCROLL EFFECTS
    // =========================================================

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
        const scrolled = (document.documentElement.scrollTop /
            (document.documentElement.scrollHeight - document.documentElement.clientHeight)) * 100;
        scrollProgress.style.width = scrolled + "%";
    });


    // =========================================================
    // THEME TOGGLE
    // =========================================================

    const savedTheme = localStorage.getItem('jenz_theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('jenz_theme', isDark ? 'dark' : 'light');
    });


    // =========================================================
    // CUSTOMISER
    // =========================================================

    custMessage.addEventListener('input', e => {
        cakeTextPreview.textContent = e.target.value;
        gsap.fromTo(cakeTextPreview, { scale: 1.2 }, { scale: 1, duration: 0.3 });
    });

    custCakeSelect.addEventListener('change', e => {
        const selected = cakes.find(c => c.name === e.target.value);
        if (selected) { previewImg.src = selected.image; updateCustomPrice(); }
        gsap.from(previewImg, { opacity: 0, scale: 0.9, duration: 0.5 });
    });

    document.querySelectorAll('input[name="size"]').forEach(i => i.addEventListener('change', updateCustomPrice));

    addCustomBtn.addEventListener('click', () => {
        const selectedName = custCakeSelect.value;
        const message = custMessage.value;
        const size = document.querySelector('input[name="size"]:checked')?.value || '1kg';
        const baseCake = cakes.find(c => c.name === selectedName);
        if (!baseCake) { alert('Please select a cake first!'); return; }

        const finalPrice = updateCustomPrice();
        cart.push({
            ...baseCake,
            price: finalPrice,
            cartId: Date.now(),
            options: { flavor: selectedName, message, size }
        });
        updateCart();
        openCartDrawer();
    });


    // =========================================================
    // CHECKOUT / WHATSAPP
    // =========================================================

    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) { alert('Your cart is empty!'); return; }
        checkoutModal.classList.add('show');
    });
    closeModal.addEventListener('click', () => checkoutModal.classList.remove('show'));
    window.addEventListener('click', e => { if (e.target === checkoutModal) checkoutModal.classList.remove('show'); });

    orderForm.addEventListener('submit', e => {
        e.preventDefault();
        const d = {
            name: document.getElementById('order-name').value,
            phone: document.getElementById('order-phone').value,
            address: document.getElementById('order-address').value,
            date: document.getElementById('order-date').value,
            notes: document.getElementById('order-notes').value || "None"
        };

        const itemsText = cart.map(item => `🍰 Cake: ${item.name}
🔢 Quantity: 1
📏 Size: ${item.options.size || '1kg'}
🎨 Flavor: ${item.options.flavor || 'Standard'}
💰 Price: ₹${item.price.toLocaleString()}
📝 Message: ${item.options.message || 'None'}`).join('\n---\n');

        const message = `🎂 New Cake Order - Jenz Cakes
👤 Name: ${d.name}
📞 Phone: ${d.phone}

${itemsText}

📍 Address: ${d.address}
📅 Delivery Date: ${d.date}
🗒 Notes: ${d.notes}`;

        window.open(`https://wa.me/919400774175?text=${encodeURIComponent(message)}`, '_blank');
        cart = [];
        updateCart();
        checkoutModal.classList.remove('show');
        closeCartDrawer();
        alert('Order sent to WhatsApp! Thank you for choosing Jenz Cakes.');
    });


    // =========================================================
    // MOBILE MENU
    // =========================================================

    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
    }


    // =========================================================
    // INITIAL DATA LOAD
    // =========================================================

    fetchCakes();
});
