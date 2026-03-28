document.addEventListener('DOMContentLoaded', () => {
    // Register GSAP Plugins
    gsap.registerPlugin(ScrollTrigger);

    // --- CONFIG & GLOBAL DATA ---
    const CONFIG = {
        // REPLACE THIS URL with your SheetDB API or Google Apps Script URL
        // Example: https://sheetdb.io/api/v1/your-api-id
        spreadsheetApiUrl: "https://sheetdb.io/api/v1/ej6zj2jqlacnn", // Actual SheetDB URL
        refreshIntervalMs: 30000 // 30 seconds
    };

    let cakes = []; // Dynamic data will be stored here

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

    // --- FETCH DATA ---
    async function fetchCakes(showIndicator = true) {
        if (showIndicator) {
            loadingIndicator.classList.add('show');
            refreshBtn.classList.add('loading');
        }

        try {
            const response = await fetch(CONFIG.spreadsheetApiUrl);
            const data = await response.json();

            if (Array.isArray(data)) {
                // Map Google Sheet columns to JS objects
                // Expected columns: Name | Price | Image | Category
                cakes = data.map((item, index) => ({
                    id: index + 1,
                    name: item.Name || item.name || "Special Cake",
                    price: parseFloat(item.Price || item.price || 0),
                    image: item.Image || item.image || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800",
                    category: (item.Category || item.category || "all").toLowerCase().trim(),
                    tag: item.Tag || item.tag || "Freshly Baked"
                }));
                
                renderProducts();
                populateCakeSelector();
            }
        } catch (error) {
            console.error("Failed to fetch cakes:", error);
            // Fallback to empty or previous data if it exist
        } finally {
            if (showIndicator) {
                loadingIndicator.classList.remove('show');
                refreshBtn.classList.remove('loading');
            }
        }
    }

    // --- LOADER ---
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

    // --- RENDER PRODUCTS ---
    function renderProducts(filter = 'all') {
        const gridItems = productsGrid.querySelectorAll('.premium-card');
        gridItems.forEach(item => item.remove()); // Clear old items but keep loading indicator

        const activeFilter = filter || document.querySelector('.filter-btn.active').dataset.filter;
        const filtered = activeFilter === 'all' ? cakes : cakes.filter(c => c.category === activeFilter);

        if (filtered.length === 0 && cakes.length > 0) {
            const noMsg = document.createElement('p');
            noMsg.className = 'no-results';
            noMsg.style.textAlign = 'center';
            noMsg.style.gridColumn = '1/-1';
            noMsg.textContent = 'Our bakers are working on this collection. Check back soon!';
            productsGrid.appendChild(noMsg);
            return;
        }

        filtered.forEach((cake, index) => {
            const card = document.createElement('div');
            card.className = 'premium-card';
            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${cake.image}" alt="${cake.name}" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800'">
                </div>
                <div class="card-content">
                    <h3>${cake.name}</h3>
                    <div class="card-price">₹${cake.price.toLocaleString()}</div>
                    <div class="card-category-badge">${cake.category}</div>
                    <button class="btn btn-primary full-width add-to-cart" data-id="${cake.id}">Add to Cart</button>
                </div>
            `;
            productsGrid.appendChild(card);

            // Entry animation for cards
            gsap.from(card, {
                opacity: 0,
                y: 50,
                duration: 0.8,
                delay: index * 0.1,
                ease: "power2.out"
            });
        });

        // Add to cart listeners
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                addToCart(id);
            });
        });
    }

    function populateCakeSelector() {
        if (!custCakeSelect) return;
        
        custCakeSelect.innerHTML = '';
        
        if (cakes.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'No cakes available';
            custCakeSelect.appendChild(option);
            return;
        }

        cakes.forEach(cake => {
            const option = document.createElement('option');
            option.value = cake.name;
            option.textContent = cake.name;
            custCakeSelect.appendChild(option);
        });

        // Set initial preview image and price
        if (cakes.length > 0) {
            previewImg.src = cakes[0].image;
            updateCustomPrice();
        }
    }

    function updateCustomPrice() {
        if (!custCakeSelect || cakes.length === 0) return 0;
        
        const selectedCakeName = custCakeSelect.value;
        const baseCake = cakes.find(c => c.name === selectedCakeName);
        if (!baseCake) return 0;

        const sizeInput = document.querySelector('input[name="size"]:checked');
        const size = sizeInput ? sizeInput.value : '1kg';
        
        // Pricing logic: 0.5kg = 1/2 price, 1kg = base, 2kg = 2x price
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

    // --- INTERACTIVE LOGIC ---
    refreshBtn.addEventListener('click', () => fetchCakes());

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(e.target.dataset.filter);
        });
    });

    // Auto-refresh timer
    setInterval(() => {
        fetchCakes(false); // Refresh silently in background
    }, CONFIG.refreshIntervalMs);

    // --- CART SYSTEM ---
    let cart = JSON.parse(localStorage.getItem('jenz_cart')) || [];

    function addToCart(id, options = null) {
        const item = cakes.find(c => c.id === id);
        if (item) {
            const cartItem = {
                ...item,
                cartId: Date.now(),
                options: options || { size: '1kg', flavor: 'Standard', message: '' }
            };
            cart.push(cartItem);
            updateCart();
            openCartDrawer();

            // Animation for cart counter
            gsap.to(cartCount, { scale: 1.5, duration: 0.2, yoyo: true, repeat: 1 });
        }
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
            cartItemsContainer.innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:50px;">Your basket is empty.</p>';
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
            btn.addEventListener('click', (e) => {
                const cartId = parseInt(btn.dataset.cartid);
                cart = cart.filter(item => item.cartId !== cartId);
                updateCart();
            });
        });
    }

    function calculateTotal() {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        cartTotalAmount.textContent = `₹${total.toLocaleString()}`;
    }

    function openCartDrawer() {
        cartDrawer.classList.add('open');
        cartOverlay.classList.add('show');
    }

    function closeCartDrawer() {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('show');
    }

    cartBtn.addEventListener('click', openCartDrawer);
    closeCart.addEventListener('click', closeCartDrawer);
    cartOverlay.addEventListener('click', closeCartDrawer);

    // --- ANIMATIONS ---
    function initAnimations() {
        // Hero Reveal
        const tl = gsap.timeline();
        tl.from('.hero-title', { x: -100, opacity: 0, duration: 1.2, ease: "power4.out" })
            .from('.hero-subtitle', { x: -50, opacity: 0, duration: 1, ease: "power3.out" }, "-=0.8")
            .from('.hero-cta .btn', { y: 30, opacity: 0, duration: 0.8, stagger: 0.2 }, "-=0.6")
            .from('.hero-visual', { scale: 0.8, opacity: 0, duration: 1.5, ease: "elastic.out(1, 0.5)" }, "-=1");

        // Floating Hero Cake
        gsap.to('.hero-cake-img', {
            y: -20,
            rotation: 5,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        // Mouse move effect on hero
        const heroVisual = document.querySelector('.hero-visual');
        heroVisual.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const x = (clientX - innerWidth / 2) / 25;
            const y = (clientY - innerHeight / 2) / 25;
            gsap.to('.hero-cake-img', { x: x, y: y, duration: 2, ease: "power3.out" });
            gsap.to('.cake-glow', { x: x * 1.5, y: y * 1.5, duration: 2, ease: "power3.out" });
        });

        heroVisual.addEventListener('mouseleave', () => {
            gsap.to('.hero-cake-img', { x: 0, y: 0, duration: 2, ease: "elastic.out(1, 0.3)" });
            gsap.to('.cake-glow', { x: 0, y: 0, duration: 2, ease: "elastic.out(1, 0.3)" });
        });

        // Parallax Items
        gsap.to('.hero-cake-img', {
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            },
            y: 150,
            rotation: 15,
            scale: 1.2
        });

        // Section Headers
        document.querySelectorAll('.section-header').forEach(header => {
            gsap.from(header, {
                scrollTrigger: {
                    trigger: header,
                    start: "top 90%"
                },
                opacity: 0,
                y: 30,
                duration: 1,
                ease: "power2.out"
            });
        });

        // Testimonial Scroll Reveal
        gsap.from('.testimonial-card', {
            scrollTrigger: {
                trigger: '.testimonials',
                start: "top 80%"
            },
            x: 100,
            opacity: 0,
            duration: 1,
            stagger: 0.3
        });

        // Testimonial Slider Dot Sync
        const slider = document.getElementById('testimonial-slider');
        const dots = document.querySelectorAll('.dot');
        
        if (slider && dots.length > 0) {
            slider.addEventListener('scroll', () => {
                const scrollPercentage = slider.scrollLeft / (slider.scrollWidth - slider.clientWidth);
                const activeIndex = Math.round(scrollPercentage * (dots.length - 1));
                
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === activeIndex);
                });
            });

            // Auto-slide logic
            let autoSlide = setInterval(() => {
                const maxScroll = slider.scrollWidth - slider.clientWidth;
                let nextScroll = slider.scrollLeft + (slider.clientWidth / 2);
                
                if (nextScroll >= maxScroll) {
                    nextScroll = 0;
                }
                
                slider.scrollTo({
                    left: nextScroll,
                    behavior: 'smooth'
                });
            }, 6000);

            // Pause auto-slide on user interaction
            slider.addEventListener('mouseenter', () => clearInterval(autoSlide));
            
            // Re-enable could be complex, keeping it simple for now as per instructions.
        }
    }

    // --- SCROLL EFFECTS ---
    window.addEventListener('scroll', () => {
        // Navbar Scrolled State
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Scroll Progress
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        scrollProgress.style.width = scrolled + "%";
    });

    // --- THEME TOGGLE ---
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

    // --- CUSTOMIZER ---
    custMessage.addEventListener('input', (e) => {
        cakeTextPreview.textContent = e.target.value;
        gsap.fromTo(cakeTextPreview, { scale: 1.2 }, { scale: 1, duration: 0.3 });
    });

    custCakeSelect.addEventListener('change', (e) => {
        const selectedCake = cakes.find(c => c.name === e.target.value);
        if (selectedCake) {
            previewImg.src = selectedCake.image;
            updateCustomPrice();
        }
        gsap.from(previewImg, { opacity: 0, scale: 0.9, duration: 0.5 });
    });

    document.querySelectorAll('input[name="size"]').forEach(input => {
        input.addEventListener('change', updateCustomPrice);
    });

    addCustomBtn.addEventListener('click', () => {
        const selectedCakeName = custCakeSelect.value;
        const message = custMessage.value;
        const sizeInput = document.querySelector('input[name="size"]:checked');
        const size = sizeInput ? sizeInput.value : '1kg';
        
        const baseCake = cakes.find(c => c.name === selectedCakeName);
        if (!baseCake) {
            alert('Please select a cake first!');
            return;
        }

        const finalPrice = updateCustomPrice();

        const customCake = {
            id: 99, // Specific ID for custom
            name: selectedCakeName,
            price: finalPrice,
            image: baseCake.image,
            options: { flavor: selectedCakeName, message, size }
        };

        // Standard add to cart logic helper
        const cartId = Date.now();
        cart.push({ ...customCake, cartId });
        updateCart();
        openCartDrawer();
    });

    // --- CHECKOUT ---
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        checkoutModal.classList.add('show');
    });

    closeModal.addEventListener('click', () => {
        checkoutModal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === checkoutModal) checkoutModal.classList.remove('show');
    });

    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const details = {
            name: document.getElementById('order-name').value,
            phone: document.getElementById('order-phone').value,
            address: document.getElementById('order-address').value,
            date: document.getElementById('order-date').value,
            notes: document.getElementById('order-notes').value || "None"
        };

        // Format items for message
        let itemsText = cart.map(item => {
            return `🍰 Cake: ${item.name}
🔢 Quantity: 1
📏 Size: ${item.options.size || '1kg'}
🎨 Flavor: ${item.options.flavor || 'Standard'}
💰 Price: ₹${item.price.toLocaleString()}
📝 Message: ${item.options.message || 'None'}`;
        }).join('\n---\n');

        const message = `🎂 New Cake Order - Jenz Cakes
👤 Name: ${details.name}
📞 Phone: ${details.phone}

${itemsText}

📍 Address: ${details.address}
📅 Delivery Date: ${details.date}
🗒 Notes: ${details.notes}`;

        const encodedMessage = encodeURIComponent(message);
        const waUrl = `https://wa.me/919400774175?text=${encodedMessage}`;

        // Open WhatsApp
        window.open(waUrl, '_blank');

        // Clear cart after order
        cart = [];
        updateCart();
        checkoutModal.classList.remove('show');
        closeCartDrawer();
        alert('Order sent to WhatsApp! Thank you for choosing Jenz Cakes.');
    });

    // Initial fetch
    fetchCakes();
});
