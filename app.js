const GEMINI_API_KEY = "API-KEY";

// Catalog Seeding Data
const INITIAL_PRODUCTS = [
    { id: "aerobuds", name: "AeroBuds Pro", category: "audio", price: 149.99, icon: "fa-headphones-simple", desc: "Premium active noise-canceling wireless earbuds with spatial audio." },
    { id: "horizonwatch", name: "Horizon Watch", category: "wearables", price: 249.99, icon: "fa-stopwatch", desc: "Sleek health tracking smartwatch with built-in GPS and vivid OLED display." },
    { id: "neocharge", name: "NeoCharge Station", category: "accessories", price: 59.99, icon: "fa-bolt-lightning", desc: "3-in-1 fast wireless charging stand for phone, watch, and earbuds." },
    { id: "flexikey", name: "FlexiKey Go", category: "accessories", price: 79.99, icon: "fa-keyboard", desc: "Ultra-thin folding Bluetooth keyboard designed for mobile typing productivity." },
    { id: "luminabeam", name: "Lumina Beam", category: "entertainment", price: 399.99, icon: "fa-video", desc: "Compact full HD smart LED projector with cinematic sound." },
    { id: "vortexbar", name: "Vortex Soundbar", category: "audio", price: 189.99, icon: "fa-volume-high", desc: "Immersive 3D surround sound home theater soundbar with wireless sub." }
];

// Database Manager (Firestore with LocalStorage Fallback)
class DatabaseManager {
    constructor() {
        this.isFirestore = false;
        this.db = null;
        this.products = [];
        this.cart = [];
        this.orders = [];
        this.onCartChange = null;
        this.onOrdersChange = null;
    }

    async init() {
        const badgeText = document.getElementById("dbModeText");
        const badge = document.getElementById("dbModeBadge");

        try {
            // Check if we are running in non-local Firebase Hosting environment
            const isLocal = window.location.hostname === "localhost" || 
                            window.location.hostname === "127.0.0.1" || 
                            window.location.hostname === "";

            if (!isLocal && typeof firebase !== "undefined") {
                // Load init.js dynamically to avoid local 404 MIME type errors
                try {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement("script");
                        script.src = "/__/firebase/init.js";
                        script.onload = resolve;
                        script.onerror = () => reject(new Error("init.js load failed"));
                        document.head.appendChild(script);
                    });
                } catch (loadErr) {
                    console.warn("Firebase auto-init script failed to load. Falling back.");
                }
            }

            // Check if Firebase is available from CDN and has been initialized by init.js
            if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0) {
                this.db = firebase.firestore();
                this.isFirestore = true;
                
                badgeText.innerText = "Firebase Cloud Database";
                badge.style.color = "var(--color-success)";
                badge.style.borderColor = "rgba(0, 230, 118, 0.4)";
                badge.style.background = "rgba(0, 230, 118, 0.1)";
                console.log("Firebase initialized successfully in App!");
                
                await this.syncProductsFromFirestore();
                await this.loadCartFromFirestore();
                await this.loadOrdersFromFirestore();
            } else {
                throw new Error("Firebase SDK not found or init.js failed");
            }
        } catch (e) {
            console.warn("Using LocalStorage fallback database:", e.message);
            this.isFirestore = false;
            
            badgeText.innerText = "Local Database Fallback";
            badge.style.color = "var(--color-secondary)";
            badge.style.borderColor = "var(--glass-border-glow)";
            badge.style.background = "rgba(0, 229, 255, 0.1)";

            // Initialize LocalStorage Data
            this.products = INITIAL_PRODUCTS;
            this.cart = JSON.parse(localStorage.getItem("v_cart")) || [];
            this.orders = JSON.parse(localStorage.getItem("v_orders")) || [];
            
            if (this.onCartChange) this.onCartChange(this.cart);
            if (this.onOrdersChange) this.onOrdersChange(this.orders);
        }
    }

    // --- PRODUCTS COLLECTION ---
    async syncProductsFromFirestore() {
        try {
            const snapshot = await this.db.collection("products").get();
            if (snapshot.empty) {
                console.log("Seeding initial products collection into Firestore...");
                const batch = this.db.batch();
                INITIAL_PRODUCTS.forEach(p => {
                    const ref = this.db.collection("products").doc(p.id);
                    batch.set(ref, p);
                });
                await batch.commit();
                this.products = INITIAL_PRODUCTS;
            } else {
                this.products = [];
                snapshot.forEach(doc => {
                    this.products.push(doc.data());
                });
            }
        } catch (err) {
            console.error("Error syncing products from Firestore:", err);
            this.products = INITIAL_PRODUCTS; // Fallback
        }
    }

    getProducts() {
        return this.products;
    }

    getProductById(id) {
        return this.products.find(p => p.id === id);
    }

    // --- CART COLLECTION ---
    async loadCartFromFirestore() {
        try {
            // Using a single static cart document for prototype simplicity
            const doc = await this.db.collection("cart").doc("current_user").get();
            if (doc.exists) {
                this.cart = doc.data().items || [];
            } else {
                this.cart = [];
                await this.db.collection("cart").doc("current_user").set({ items: [] });
            }
            if (this.onCartChange) this.onCartChange(this.cart);
        } catch (err) {
            console.error("Error loading cart:", err);
        }
    }

    async saveCartState() {
        if (this.isFirestore) {
            try {
                await this.db.collection("cart").doc("current_user").set({ items: this.cart });
            } catch (err) {
                console.error("Error saving cart to Firestore:", err);
            }
        } else {
            localStorage.setItem("v_cart", JSON.stringify(this.cart));
        }
        if (this.onCartChange) this.onCartChange(this.cart);
    }

    async addToCart(productId, quantity = 1) {
        const itemIndex = this.cart.findIndex(item => item.productId === productId);
        const product = this.getProductById(productId);
        
        if (!product) return false;

        if (itemIndex > -1) {
            this.cart[itemIndex].quantity += quantity;
        } else {
            this.cart.push({
                productId: productId,
                name: product.name,
                price: product.price,
                icon: product.icon,
                quantity: quantity
            });
        }
        await this.saveCartState();
        return true;
    }

    async removeFromCart(productId) {
        const itemIndex = this.cart.findIndex(item => item.productId === productId);
        if (itemIndex > -1) {
            this.cart.splice(itemIndex, 1);
            await this.saveCartState();
            return true;
        }
        return false;
    }

    async clearCart() {
        this.cart = [];
        await this.saveCartState();
    }

    getCart() {
        return this.cart;
    }

    // --- ORDERS COLLECTION ---
    async loadOrdersFromFirestore() {
        try {
            const snapshot = await this.db.collection("orders").orderBy("timestamp", "desc").get();
            this.orders = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                this.orders.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
                });
            });
            if (this.onOrdersChange) this.onOrdersChange(this.orders);
        } catch (err) {
            console.error("Error loading orders:", err);
        }
    }

    async checkout() {
        if (this.cart.length === 0) return null;

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
        
        const newOrder = {
            items: [...this.cart],
            total: subtotal,
            status: "processing",
            timestamp: new Date()
        };

        if (this.isFirestore) {
            try {
                await this.db.collection("orders").doc(orderId).set(newOrder);
                // Clear cart in firestore
                this.cart = [];
                await this.db.collection("cart").doc("current_user").set({ items: [] });
                await this.loadOrdersFromFirestore();
            } catch (err) {
                console.error("Firestore Checkout Failed:", err);
                return null;
            }
        } else {
            newOrder.id = orderId;
            this.orders.unshift(newOrder);
            localStorage.setItem("v_orders", JSON.stringify(this.orders));
            this.cart = [];
            localStorage.setItem("v_cart", JSON.stringify([]));
            if (this.onCartChange) this.onCartChange(this.cart);
            if (this.onOrdersChange) this.onOrdersChange(this.orders);
        }

        return orderId;
    }

    async loadOrders() {
        if (this.isFirestore) {
            await this.loadOrdersFromFirestore();
        }
        return this.orders;
    }
}

// Instantiate Database
const DB = new DatabaseManager();

// Visual Elements
const recordBtn = document.getElementById("recordBtn");
const orbBtn = document.getElementById("orbBtn");
const micIcon = document.getElementById("micIcon");
const visualizerCard = document.getElementById("visualizerCard");
const voiceStatusText = document.getElementById("voiceStatusText");
const voiceStatusDesc = document.getElementById("voiceStatusDesc");

const transcriptDiv = document.getElementById("transcript");
const productGrid = document.getElementById("productGrid");
const categoryTabs = document.getElementById("categoryTabs");

const cartItemsList = document.getElementById("cartItemsList");
const cartBadge = document.getElementById("cartBadge");
const cartSubtotal = document.getElementById("cartSubtotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const ordersList = document.getElementById("ordersList");

const captionOverlay = document.getElementById("speechCaption");
const captionText = document.getElementById("captionText");

// Toast Manager
function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let iconClass = "fa-info-circle";
    if (type === "success") iconClass = "fa-check-circle";
    if (type === "warning") iconClass = "fa-exclamation-triangle";
    if (type === "error") iconClass = "fa-times-circle";

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(50px)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Visualizer State Machine
function setVisualState(state, desc = "") {
    visualizerCard.className = "glass-card visualizer-container";
    visualizerCard.classList.add(`state-${state}`);
    
    if (state === "idle") {
        voiceStatusText.innerText = "Voice Assistant";
        voiceStatusDesc.innerText = desc || "Click the orb or button below to speak";
        micIcon.className = "fa-solid fa-microphone mic-icon";
        recordBtn.className = "btn-mic";
        recordBtn.querySelector("span").innerText = "Start Speaking";
        captionOverlay.classList.remove("active");
    } else if (state === "listening") {
        voiceStatusText.innerText = "Listening...";
        voiceStatusDesc.innerText = desc || "Say what you want to browse, add to cart, or search!";
        micIcon.className = "fa-solid fa-microphone-lines mic-icon";
        recordBtn.className = "btn-mic recording";
        recordBtn.querySelector("span").innerText = "Listening...";
        captionText.innerText = "Listening closely...";
        captionOverlay.classList.add("active");
    } else if (state === "thinking") {
        voiceStatusText.innerText = "Thinking...";
        voiceStatusDesc.innerText = desc || "Analyzing your speech with Gemini AI...";
        micIcon.className = "fa-solid fa-brain mic-icon";
        recordBtn.className = "btn-mic";
        recordBtn.querySelector("span").innerText = "Thinking...";
        captionText.innerText = "Gemini is analyzing...";
        captionOverlay.classList.add("active");
    } else if (state === "speaking") {
        voiceStatusText.innerText = "Speaking";
        voiceStatusDesc.innerText = desc || "Reading response...";
        micIcon.className = "fa-solid fa-volume-high mic-icon";
        recordBtn.className = "btn-mic";
        recordBtn.querySelector("span").innerText = "Assistant Speaking";
        captionOverlay.classList.add("active");
    }
}

// Speech Recognition Config
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isRecording = true;
        setVisualState("listening");
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        transcriptDiv.innerHTML = `<strong>"</strong>${transcript}<strong>"</strong>`;
        setVisualState("thinking");

        try {
            const result = await analyzeCustomerMessage(transcript);
            
            // Render Gemini AI debug data
            document.getElementById("intent").innerText = result.intent || "N/A";
            document.getElementById("sentiment").innerText = result.sentiment || "N/A";
            document.getElementById("priority").innerText = result.priority || "N/A";
            document.getElementById("targetEntity").innerText = result.targetEntity || "N/A";
            
            const actionStr = result.action ? JSON.stringify(result.action) : "NONE";
            document.getElementById("execAction").innerText = actionStr;
            document.getElementById("aiResponse").innerText = result.response || "";

            // Execute action
            await executeAIAction(result.action, result.response);

        } catch (error) {
            console.error("Gemini failed, trying local NLP fallback:", error);
            showToast("Gemini 429 Limit. Switched to Local NLP Fallback.", "warning");
            
            const localResult = localNLPFallback(transcript);
            
            // Render local NLP debug data
            document.getElementById("intent").innerText = localResult.intent + " (Local)";
            document.getElementById("sentiment").innerText = localResult.sentiment;
            document.getElementById("priority").innerText = localResult.priority;
            document.getElementById("targetEntity").innerText = localResult.targetEntity;
            
            const actionStr = localResult.action ? JSON.stringify(localResult.action) : "NONE";
            document.getElementById("execAction").innerText = actionStr;
            document.getElementById("aiResponse").innerText = localResult.response;

            // Execute action
            await executeAIAction(localResult.action, localResult.response);
        }
    };

    recognition.onend = () => {
        isRecording = false;
        // Don't auto-reset state to idle immediately, wait if Gemini is thinking or speaking
    };

    recognition.onerror = (event) => {
        isRecording = false;
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
            showToast("Microphone access denied. Grant mic access in settings.", "error");
        } else {
            showToast(`Speech recognition error: ${event.error}`, "warning");
        }
        setVisualState("idle", "Mic error. Click to restart.");
    };
} else {
    showToast("Speech Recognition is not supported in this browser. Please use Chrome/Edge.", "error");
    recordBtn.disabled = true;
    orbBtn.style.cursor = "not-allowed";
}

// Toggle recording session
function toggleRecording() {
    if (!SpeechRecognition) return;
    
    // Stop speaking if assistant is active
    window.speechSynthesis.cancel();
    
    if (isRecording) {
        recognition.stop();
    } else {
        try {
            recognition.start();
        } catch (err) {
            console.warn("Recognition already active", err);
        }
    }
}

recordBtn.addEventListener("click", toggleRecording);
orbBtn.addEventListener("click", toggleRecording);

// Speech Synthesis Config (Text-to-Speech)
function speakText(text, callback) {
    if (!("speechSynthesis" in window)) {
        if (callback) callback();
        return;
    }

    // Stop speaking anything currently
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    setVisualState("speaking", "Speaking response...");
    captionText.innerText = text;

    // Try selecting a high quality English natural sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    let preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Zira") || v.name.includes("David")));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
        setVisualState("idle");
        if (callback) callback();
    };

    utterance.onerror = (e) => {
        console.error("Speech Synthesis Error:", e);
        setVisualState("idle");
        if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
}

// Seed the voices list
if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
}

// Generate the Product Grid HTML
function renderProducts(filterCategory = "all", highlightId = null) {
    const products = DB.getProducts();
    productGrid.innerHTML = "";
    
    products.forEach(p => {
        const isFiltered = filterCategory !== "all" && p.category !== filterCategory;
        const card = document.createElement("div");
        card.className = `product-card ${isFiltered ? 'filtered-out' : ''}`;
        if (highlightId === p.id) {
            card.classList.add("action-highlight");
        }
        
        card.innerHTML = `
            <div class="product-image-container">
                <i class="fa-solid ${p.icon} product-icon"></i>
                <span class="product-badge">${p.category.toUpperCase()}</span>
            </div>
            <div class="product-info">
                <h4 class="product-name">${p.name}</h4>
                <p class="product-desc">${p.desc}</p>
                <div class="product-footer">
                    <span class="product-price">$${p.price.toFixed(2)}</span>
                    <button class="btn-add-cart" onclick="directAdd('${p.id}')" title="Add to cart">
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

// Render Cart Panel
function renderCart(items) {
    const emptyState = document.getElementById("cartEmptyState");
    cartItemsList.innerHTML = "";
    
    if (!items || items.length === 0) {
        cartItemsList.appendChild(emptyState);
        cartBadge.innerText = "0";
        cartSubtotal.innerText = "$0.00";
        checkoutBtn.disabled = true;
        return;
    }

    emptyState.remove();
    cartBadge.innerText = items.reduce((sum, item) => sum + item.quantity, 0);

    let subtotal = 0;
    items.forEach(item => {
        subtotal += item.price * item.quantity;
        const itemRow = document.createElement("div");
        itemRow.className = "cart-item";
        itemRow.innerHTML = `
            <div class="cart-item-icon">
                <i class="fa-solid ${item.icon || 'fa-tag'}"></i>
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-meta">
                    <span class="cart-item-qty">Qty: ${item.quantity}</span>
                    <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            </div>
            <button class="btn-remove-item" onclick="directRemove('${item.productId}')" title="Remove">
                <i class="fa-solid fa-circle-minus"></i>
            </button>
        `;
        cartItemsList.appendChild(itemRow);
    });

    cartSubtotal.innerText = `$${subtotal.toFixed(2)}`;
    checkoutBtn.disabled = false;
}

// Render Order History Panel
function renderOrders(orders) {
    const emptyState = document.getElementById("ordersEmptyState");
    ordersList.innerHTML = "";
    
    if (!orders || orders.length === 0) {
        ordersList.appendChild(emptyState);
        return;
    }

    emptyState.remove();
    orders.forEach(order => {
        const orderRow = document.createElement("div");
        orderRow.className = "order-item";
        const orderDateStr = new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(", ");
        if (itemsSummary.length > 32) itemsSummary = itemsSummary.substring(0, 29) + "...";

        orderRow.innerHTML = `
            <div>
                <div class="order-id">${order.id || 'Order'}</div>
                <div style="color: var(--text-secondary); font-size: 11px;">${itemsSummary}</div>
                <div class="order-date">${orderDateStr}</div>
            </div>
            <div style="text-align: right;">
                <div class="order-total">$${order.total.toFixed(2)}</div>
                <span class="order-status ${order.status}">${order.status}</span>
            </div>
        `;
        ordersList.appendChild(orderRow);
    });
}

// Click-to-add / Remove Handlers for Manual overrides
window.directAdd = async (productId) => {
    const success = await DB.addToCart(productId, 1);
    if (success) {
        const product = DB.getProductById(productId);
        showToast(`Added ${product.name} to cart!`, "success");
        renderProducts("all", productId);
    }
};

window.directRemove = async (productId) => {
    const product = DB.getProductById(productId);
    const success = await DB.removeFromCart(productId);
    if (success) {
        showToast(`Removed ${product ? product.name : 'item'} from cart.`, "info");
    }
};

checkoutBtn.addEventListener("click", async () => {
    const orderId = await DB.checkout();
    if (orderId) {
        showToast(`Order ${orderId} placed successfully!`, "success");
        speakText(`Thank you! Your order has been placed. Your order ID is ${orderId.replace("-", " ")}`);
    } else {
        showToast("Checkout failed. Cart is empty.", "error");
    }
});

// Category Tabs Click Filter
categoryTabs.addEventListener("click", (e) => {
    if (e.target.classList.contains("tab-btn")) {
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
        e.target.classList.add("active");
        renderProducts(e.target.dataset.category);
    }
});

// Suggestion Chip Clicks
document.getElementById("suggestionsContainer").addEventListener("click", (e) => {
    const chip = e.target.closest(".suggestion-chip");
    if (chip) {
        const cmd = chip.dataset.cmd;
        transcriptDiv.innerHTML = `<strong>"</strong>${cmd}<strong>"</strong>`;
        setVisualState("thinking");
        analyzeCustomerMessage(cmd).then(async (result) => {
            // Render debug logs
            document.getElementById("intent").innerText = result.intent || "N/A";
            document.getElementById("sentiment").innerText = result.sentiment || "N/A";
            document.getElementById("priority").innerText = result.priority || "N/A";
            document.getElementById("targetEntity").innerText = result.targetEntity || "N/A";
            document.getElementById("execAction").innerText = result.action ? JSON.stringify(result.action) : "NONE";
            document.getElementById("aiResponse").innerText = result.response || "";

            // Execute
            await executeAIAction(result.action, result.response);
        }).catch(async (err) => {
            console.error("Gemini failed for chip, using fallback:", err);
            showToast("Gemini 429 Limit. Switched to Local NLP Fallback.", "warning");
            
            const localResult = localNLPFallback(cmd);
            
            // Render local NLP debug logs
            document.getElementById("intent").innerText = localResult.intent + " (Local)";
            document.getElementById("sentiment").innerText = localResult.sentiment;
            document.getElementById("priority").innerText = localResult.priority;
            document.getElementById("targetEntity").innerText = localResult.targetEntity;
            document.getElementById("execAction").innerText = localResult.action ? JSON.stringify(localResult.action) : "NONE";
            document.getElementById("aiResponse").innerText = localResult.response;

            // Execute
            await executeAIAction(localResult.action, localResult.response);
        });
    }
});

// Execute Commands Directed from Gemini AI
async function executeAIAction(action, responseSpeech) {
    if (!action) {
        speakText(responseSpeech);
        return;
    }

    console.log("Routing Executable Action:", action);

    switch(action.type) {
        case "FILTER_PRODUCTS":
            const category = action.category || "all";
            // Update UI Tab Active class
            document.querySelectorAll(".tab-btn").forEach(btn => {
                if (btn.dataset.category === category) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
            renderProducts(category);
            showToast(`Filtering items: ${category.toUpperCase()}`, "info");
            speakText(responseSpeech);
            break;

        case "ADD_TO_CART":
            if (action.productId) {
                const added = await DB.addToCart(action.productId, action.quantity || 1);
                if (added) {
                    const prod = DB.getProductById(action.productId);
                    showToast(`Voice added ${prod.name} to cart!`, "success");
                    // Filter "all" and highlight card
                    document.querySelectorAll(".tab-btn").forEach(btn => {
                        if (btn.dataset.category === "all") btn.classList.add("active");
                        else btn.classList.remove("active");
                    });
                    renderProducts("all", action.productId);
                    speakText(responseSpeech);
                } else {
                    speakText(`Sorry, I couldn't find the product ${action.productId} to add.`);
                }
            } else {
                speakText(responseSpeech);
            }
            break;

        case "REMOVE_FROM_CART":
            if (action.productId) {
                const removed = await DB.removeFromCart(action.productId);
                if (removed) {
                    const prod = DB.getProductById(action.productId);
                    showToast(`Voice removed ${prod ? prod.name : 'item'} from cart.`, "info");
                    speakText(responseSpeech);
                } else {
                    speakText(`That item is not in your cart.`);
                }
            } else {
                speakText(responseSpeech);
            }
            break;

        case "CLEAR_CART":
            await DB.clearCart();
            showToast("Cart cleared by voice command.", "info");
            speakText(responseSpeech);
            break;

        case "CHECKOUT":
            const orderId = await DB.checkout();
            if (orderId) {
                showToast(`Order placed successfully: ${orderId}`, "success");
                speakText(responseSpeech);
            } else {
                speakText("Your cart is empty, so I could not place an order. Add some products first!");
            }
            break;

        default:
            speakText(responseSpeech);
            break;
    }
}

// Rule-based Local NLP Fallback Engine for offline / API limit scenarios
function localNLPFallback(message) {
    const text = message.toLowerCase();
    let result = {
        intent: "general_query",
        sentiment: "neutral",
        priority: "medium",
        targetEntity: "N/A",
        action: null,
        response: ""
    };

    // Match products
    let matchedProduct = null;
    if (text.includes("earbud") || text.includes("headphones") || text.includes("aerobud") || text.includes("audio")) matchedProduct = INITIAL_PRODUCTS.find(p => p.id === "aerobuds");
    else if (text.includes("watch") || text.includes("horizon")) matchedProduct = INITIAL_PRODUCTS.find(p => p.id === "horizonwatch");
    else if (text.includes("charge") || text.includes("neocharge") || text.includes("dock") || text.includes("station")) matchedProduct = INITIAL_PRODUCTS.find(p => p.id === "neocharge");
    else if (text.includes("keyboard") || text.includes("flexikey") || text.includes("keys")) matchedProduct = INITIAL_PRODUCTS.find(p => p.id === "flexikey");
    else if (text.includes("beam") || text.includes("projector") || text.includes("lumina")) matchedProduct = INITIAL_PRODUCTS.find(p => p.id === "luminabeam");
    else if (text.includes("vortex") || text.includes("soundbar") || text.includes("bar")) matchedProduct = INITIAL_PRODUCTS.find(p => p.id === "vortexbar");

    if (matchedProduct) {
        result.targetEntity = matchedProduct.name;
    }

    // Determine Action
    if (text.includes("add") || text.includes("buy") || text.includes("purchase") || text.includes("put") || text.includes("order")) {
        if (matchedProduct) {
            result.intent = "add_to_cart";
            result.action = {
                type: "ADD_TO_CART",
                productId: matchedProduct.id,
                quantity: 1
            };
            result.response = `I've added the ${matchedProduct.name} to your cart.`;
        } else {
            result.response = "Which product would you like to add to your cart?";
        }
    } else if (text.includes("remove") || text.includes("delete") || text.includes("take off") || text.includes("take out") || text.includes("subtract")) {
        if (matchedProduct) {
            result.intent = "remove_from_cart";
            result.action = {
                type: "REMOVE_FROM_CART",
                productId: matchedProduct.id
            };
            result.response = `I've removed the ${matchedProduct.name} from your cart.`;
        } else {
            result.response = "Which product should I remove from your cart?";
        }
    } else if (text.includes("clear") || text.includes("empty")) {
        result.intent = "clear_cart";
        result.action = { type: "CLEAR_CART" };
        result.response = "I have cleared your shopping cart.";
    } else if (text.includes("checkout") || text.includes("place order") || text.includes("pay") || text.includes("finish")) {
        result.intent = "checkout";
        result.action = { type: "CHECKOUT" };
        result.response = "I am processing your checkout. Your order has been placed.";
    } else if (text.includes("show") || text.includes("list") || text.includes("browse") || text.includes("find") || text.includes("search")) {
        result.intent = "browse";
        let category = "all";
        if (text.includes("audio") || text.includes("earbud") || text.includes("sound") || text.includes("headphone")) category = "audio";
        else if (text.includes("watch") || text.includes("wearable")) category = "wearables";
        else if (text.includes("charge") || text.includes("keyboard") || text.includes("accessory") || text.includes("accessories")) category = "accessories";
        else if (text.includes("projector") || text.includes("beam") || text.includes("video")) category = "entertainment";
        
        result.action = {
            type: "FILTER_PRODUCTS",
            category: category
        };
        result.response = `Showing ${category === "all" ? "all" : category} gadgets.`;
    } else if (text.includes("cart") || text.includes("basket") || text.includes("bag")) {
        result.intent = "view_cart";
        result.response = "Here is your current cart items list.";
    } else {
        result.response = "I heard you, but I couldn't map that to an action. Try saying 'add earbuds' or 'show watch'.";
    }

    return result;
}

// Prompt formulation & Call to Gemini 2.0 Flash
async function analyzeCustomerMessage(message) {
    const productsCatalogString = INITIAL_PRODUCTS.map(p => {
        return `- Product ID: "${p.id}", Name: "${p.name}", Category: "${p.category}", Price: $${p.price}, Description: "${p.desc}"`;
    }).join("\n");

    const cartStateString = DB.getCart().map(item => {
        return `- ${item.quantity}x ${item.name} (ID: ${item.productId}) - $${item.price} each`;
    }).join("\n") || "No items in cart";

    const ordersStateString = DB.orders.map(o => {
        return `- Order ID: ${o.id}, Total: $${o.total.toFixed(2)}, Status: ${o.status}`;
    }).join("\n") || "No orders placed yet";

    const prompt = `
You are the VoiceCX E-Commerce Assistant, a premium voice agent helping a user operate our Tech Gadget Store entirely by voice.
You must be conversational, helpful, and concise (since your response will be read aloud back to the user via TTS).

### Store Products Catalog:
${productsCatalogString}

### Current Session State:
Cart Items:
${cartStateString}

Recent Orders:
${ordersStateString}

### Your Instructions:
1. Parse the user's voice command: "${message}"
2. Determine their intent and choose one of these types:
   - "browse": User wants to view products or filter them (e.g. "show me earbuds", "what categories do you have?").
   - "add_to_cart": User wants to purchase or add item (e.g. "add watch to cart", "buy the smart projector").
   - "remove_from_cart": User wants to remove item (e.g. "remove aerobuds", "take watch out of cart").
   - "view_cart": User wants to check their cart (e.g. "what is in my cart?", "show cart").
   - "checkout": User wants to place the order (e.g. "checkout", "buy now", "place my order").
   - "clear_cart": User wants to empty cart (e.g. "empty cart", "clear my shopping basket").
   - "general_query": User asks product details or random questions (e.g. "how much is the watch?", "does Lumina beam have good sound?").
3. Set action parameters:
   - Action "type": "FILTER_PRODUCTS" | "ADD_TO_CART" | "REMOVE_FROM_CART" | "CLEAR_CART" | "CHECKOUT" | "NONE"
   - If adding or removing items, map the item name to the correct product ID from the catalog. The "productId" field must match the exact catalog product ID string.
   - If filtering products, map to the correct "category" ("audio", "wearables", "accessories", "entertainment", or "all").
4. Formulate the "response" text. Make it sound like a natural voice assistant reply, confirming the action taken (e.g. "I've added the Horizon Watch to your cart. Anything else?"). Keep it under 25 words if possible.
5. Identify user sentiment ("positive", "neutral", "negative") and priority ("low", "medium", "high") based on tone/wording.

Return ONLY a valid JSON block inside triple backticks (\`\`\`json ... \`\`\`). No other explanatory text.

Example JSON output structure:
\`\`\`json
{
  "intent": "add_to_cart",
  "sentiment": "neutral",
  "priority": "medium",
  "targetEntity": "Horizon Watch",
  "action": {
    "type": "ADD_TO_CART",
    "productId": "horizonwatch",
    "category": null,
    "quantity": 1
  },
  "response": "I've added the Horizon Watch to your cart."
}
\`\`\`
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                // Add system instructions to enforce JSON format
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini API Call failed with status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // Safety JSON clean
    let cleanJson = text;
    if (cleanJson.includes("```json")) {
        cleanJson = cleanJson.substring(cleanJson.indexOf("```json") + 7);
        cleanJson = cleanJson.substring(0, cleanJson.lastIndexOf("```"));
    } else if (cleanJson.includes("```")) {
        cleanJson = cleanJson.substring(cleanJson.indexOf("```") + 3);
        cleanJson = cleanJson.substring(0, cleanJson.lastIndexOf("```"));
    }
    
    return JSON.parse(cleanJson.trim());
}

// App Initialization
window.addEventListener("DOMContentLoaded", async () => {
    // Set callback hooks in database manager to update UI on modifications
    DB.onCartChange = (cartItems) => renderCart(cartItems);
    DB.onOrdersChange = (orderHistory) => renderOrders(orderHistory);

    // Initialize Database (tries Firebase, falls back to LocalStorage)
    await DB.init();
    
    // Initial Render of catalog
    renderProducts("all");
    
    // Set UI visualizer to idle
    setVisualState("idle");
});
