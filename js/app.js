import { EVENTS, STATIONS } from './data.js';

class MaveApp {
    constructor() {
        // Load state from localStorage if available
        const savedCart = localStorage.getItem('mave_cart');

        this.state = {
            currentEventId: 'none',
            searchTerm: '',
            filterRegime: 'all',
            cart: savedCart ? JSON.parse(savedCart) : [] // Array of { id, name, eventId }
        };

        this.previousTotal = 0;

        this.dom = {
            eventSelect: document.getElementById('event-select'),
            searchInput: document.getElementById('search-input'),
            regimeFilters: document.getElementById('regime-filters'),
            stationGrid: document.getElementById('station-grid'),
            emptyState: document.getElementById('empty-state'),
            cartItems: document.getElementById('cart-items'),
            cartTotal: document.getElementById('cart-total'),
            cartCount: document.getElementById('cart-count'),
            cartEmptyMsg: document.getElementById('cart-empty-msg'),
            clearCartBtn: document.getElementById('clear-cart-btn'),
            copyBtn: document.getElementById('copy-btn'),
            cartSidebar: document.getElementById('cart-sidebar'),
            cartToggle: document.getElementById('cart-toggle'),
            mobileBadge: document.getElementById('mobile-cart-badge'),

            activeEventDisplay: document.getElementById('active-event-display'),
            mobileBackdrop: document.getElementById('mobile-backdrop'),
            cartIcon: document.getElementById('cart-icon'),
            closeIcon: document.getElementById('close-icon')
        };

        this.init();
    }

    init() {
        this.renderEventOptions();
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        // Global Default Event Change
        this.dom.eventSelect.addEventListener('change', (e) => {
            this.state.currentEventId = e.target.value;
            this.render();
        });

        this.dom.searchInput.addEventListener('input', (e) => {
            this.state.searchTerm = e.target.value.toLowerCase();
            this.renderStations();
        });

        this.dom.regimeFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (btn) {
                this.handleFilterClick(btn);
            }
        });

        // Add to Cart (Grid Click)
        this.dom.stationGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.station-card');
            if (card) {
                const stationName = card.dataset.name;
                this.addToCart(stationName);
            }
        });

        // Cart Interactions (Remove & Change Event)
        this.dom.cartItems.addEventListener('click', (e) => {
            const btn = e.target.closest('.remove-btn');
            if (btn) {
                const itemId = btn.dataset.id;
                this.removeFromCart(itemId);
            }
        });

        this.dom.cartItems.addEventListener('change', (e) => {
            if (e.target.classList.contains('cart-item-event-select')) {
                const itemId = e.target.dataset.id;
                const newEventId = e.target.value;
                this.updateItemEvent(itemId, newEventId);
            }
        });

        this.dom.clearCartBtn.addEventListener('click', () => {
            this.state.cart = [];
            this.saveState();
            this.render();
        });

        this.dom.copyBtn.addEventListener('click', () => {
            this.copyPortfolio();
        });

        this.dom.cartToggle.addEventListener('click', () => {
            this.toggleMobileCart();
        });

        this.dom.mobileBackdrop.addEventListener('click', () => {
            this.toggleMobileCart(false);
        });
    }

    handleFilterClick(clickedBtn) {
        const buttons = this.dom.regimeFilters.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active-filter', 'ring-2', 'ring-white');
            btn.classList.add('opacity-70');
        });

        clickedBtn.classList.add('active-filter', 'ring-2', 'ring-white');
        clickedBtn.classList.remove('opacity-70');

        this.state.filterRegime = clickedBtn.dataset.regime;
        this.renderStations();

    }

    toggleMobileCart(forceState) {
        const isClosed = this.dom.cartSidebar.classList.contains('translate-x-full');
        const shouldOpen = forceState !== undefined ? forceState : isClosed;

        if (shouldOpen) {
            this.dom.cartSidebar.classList.remove('translate-x-full');
            this.dom.mobileBackdrop.classList.remove('hidden');

            // Icon Animation
            this.dom.cartIcon.classList.add('opacity-0', 'rotate-90');
            this.dom.closeIcon.classList.remove('opacity-0', 'rotate-90');
            this.dom.mobileBadge.classList.add('opacity-0');
        } else {
            this.dom.cartSidebar.classList.add('translate-x-full');
            this.dom.mobileBackdrop.classList.add('hidden');

            // Icon Animation
            this.dom.cartIcon.classList.remove('opacity-0', 'rotate-90');
            this.dom.closeIcon.classList.add('opacity-0', 'rotate-90');
            this.dom.mobileBadge.classList.remove('opacity-0');
        }
    }

    addToCart(stationName) {
        const newItem = {
            id: crypto.randomUUID(),
            name: stationName,
            eventId: this.state.currentEventId
        };
        this.state.cart.push(newItem);
        this.saveState();
        this.render();
    }

    removeFromCart(itemId) {
        this.state.cart = this.state.cart.filter(item => item.id !== itemId);
        this.saveState();
        this.render();
    }

    updateItemEvent(itemId, eventId) {
        const item = this.state.cart.find(i => i.id === itemId);
        if (item) {
            item.eventId = eventId;
            this.saveState();
            this.render();
        }
    }

    saveState() {
        localStorage.setItem('mave_cart', JSON.stringify(this.state.cart));
    }

    getEventById(id) {
        return EVENTS.find(e => e.id === id) || EVENTS[0];
    }

    calculateValue(ballRarity, event) {
        if (ballRarity === 0) return 0;

        const K = 10000;
        const specialRarity = event.rarity;
        const duration = event.duration;

        const multiplier = Math.sqrt((1 / specialRarity) * (365 / duration));
        const value = (K / ballRarity) * multiplier;

        return Math.round(value);
    }

    formatNumber(num) {
        return new Intl.NumberFormat('zh-TW').format(num);
    }

    getRegimeClass(regime) {
        if (regime.includes("板南線")) return "line-blue";
        if (regime.includes("淡水信義線")) return "line-red";
        if (regime.includes("文湖線")) return "line-brown";
        if (regime.includes("中和新蘆線")) return "line-orange";
        if (regime.includes("松山新店線")) return "line-green";
        if (regime.includes("環狀線")) return "line-yellow";
        if (regime.includes("桃園機場捷運")) return "line-purple";
        return "bg-gray-700";
    }

    async copyPortfolio() {
        if (this.state.cart.length === 0) return;

        // Group items by Name + Event
        const groups = {};
        let totalValue = 0;

        this.state.cart.forEach(item => {
            const key = `${item.name}|${item.eventId}`;
            if (!groups[key]) {
                const station = STATIONS.find(s => s.name === item.name);
                const event = this.getEventById(item.eventId);
                const value = this.calculateValue(station.rarity, event);
                groups[key] = {
                    name: item.name,
                    eventName: event.name,
                    eventId: item.eventId,
                    value: value,
                    count: 0,
                    total: 0
                };
            }
            groups[key].count++;
            groups[key].total += groups[key].value;
            totalValue += groups[key].value;
        });

        // Generate Markdown
        let text = "我的交易清單\n";
        Object.values(groups).forEach(g => {
            const eventTag = g.eventId !== 'none' ? `[${g.eventName}] ` : '';
            text += `${g.count}x ${eventTag}${g.name} - ${this.formatNumber(g.total)}\n`;
        });
        text += `總估值：${this.formatNumber(totalValue)} （[MAVE](https://taipeimetrodex-mave.pages.dev/)）`;

        try {
            await navigator.clipboard.writeText(text);

            // Visual Feedback
            const originalText = this.dom.copyBtn.innerHTML;
            this.dom.copyBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> 已複製`;
            this.dom.copyBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
            this.dom.copyBtn.classList.add('bg-green-600', 'hover:bg-green-500');

            setTimeout(() => {
                this.dom.copyBtn.innerHTML = originalText;
                this.dom.copyBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
                this.dom.copyBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
            }, 2000);

        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('複製失敗，請手動複製。');
        }
    }

    render() {
        this.renderStations();
        this.renderCart();
    }

    renderEventOptions() {
        this.dom.eventSelect.innerHTML = '';
        EVENTS.forEach(evt => {
            const opt = document.createElement('option');
            opt.value = evt.id;
            opt.textContent = evt.name;
            this.dom.eventSelect.appendChild(opt);
        });
    }

    renderStations() {
        this.dom.stationGrid.innerHTML = '';

        const currentGlobalEvent = this.getEventById(this.state.currentEventId);
        const baseEvent = EVENTS[0];

        // Count occurrences of each station in the cart
        const stationCounts = {};
        this.state.cart.forEach(item => {
            stationCounts[item.name] = (stationCounts[item.name] || 0) + 1;
        });

        const filtered = STATIONS.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(this.state.searchTerm);
            const matchesRegime = this.state.filterRegime === 'all' || s.regime.includes(this.state.filterRegime);
            return matchesSearch && matchesRegime;
        });

        if (filtered.length === 0) {
            this.dom.emptyState.classList.remove('hidden');
        } else {
            this.dom.emptyState.classList.add('hidden');
        }

        const fragment = document.createDocumentFragment();

        filtered.forEach(station => {
            const count = stationCounts[station.name] || 0;
            const isSelected = count > 0;

            // Display value based on GLOBAL default event for the grid view
            const currentScore = this.calculateValue(station.rarity, currentGlobalEvent);
            const baseScore = this.calculateValue(station.rarity, baseEvent);
            const lineClass = this.getRegimeClass(station.regime);

            const card = document.createElement('div');
            card.className = `station-card glass-card rounded-xl p-4 cursor-pointer relative overflow-hidden group select-none ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-900/20' : ''}`;
            card.dataset.name = station.name;

            let scoreHtml = '';
            if (this.state.currentEventId !== 'none') {
                scoreHtml = `
                    <div class="flex flex-col items-end">
                        <span class="text-xs text-gray-500 line-through decoration-red-500 decoration-2">${this.formatNumber(baseScore)}</span>
                        <span class="text-xl font-bold text-green-400 font-mono">↗ ${this.formatNumber(currentScore)}</span>
                    </div>
                `;
            } else {
                scoreHtml = `
                    <div class="text-xl font-bold text-white font-mono">${this.formatNumber(currentScore)}</div>
                `;
            }

            // Badge HTML
            const badgeHtml = isSelected
                ? `<div class="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">x${count}</div>`
                : '';

            card.innerHTML = `
                <div class="absolute top-0 left-0 w-1.5 h-full ${lineClass}"></div>
                ${badgeHtml}
                <div class="pl-3">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-lg text-gray-100 leading-tight">${station.name}</h3>
                        <span class="text-[10px] uppercase tracking-wider text-gray-400 border border-gray-700 rounded px-1.5 py-0.5">${station.type}</span>
                    </div>
                    <div class="flex justify-between items-end mt-4">
                        <div class="text-xs text-gray-500">稀有度: ${station.rarity}</div>
                        ${scoreHtml}
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });

        this.dom.stationGrid.appendChild(fragment);
    }

    renderCart() {
        this.dom.cartItems.innerHTML = '';
        let total = 0;

        if (this.state.cart.length === 0) {
            this.dom.cartEmptyMsg.classList.remove('hidden');
        } else {
            this.dom.cartEmptyMsg.classList.add('hidden');
        }

        const fragment = document.createDocumentFragment();

        // Generate Event Options HTML once
        const eventOptionsHtml = EVENTS.map(e => `<option value="${e.id}">${e.name}</option>`).join('');

        this.state.cart.forEach(item => {
            const station = STATIONS.find(s => s.name === item.name);
            if (!station) return;

            const itemEvent = this.getEventById(item.eventId);
            const score = this.calculateValue(station.rarity, itemEvent);
            total += score;
            const lineClass = this.getRegimeClass(station.regime);

            const div = document.createElement('div');
            // Highlight special events
            const isSpecial = item.eventId !== 'none';
            div.className = `flex flex-col bg-gray-800/40 p-3 rounded-lg border ${isSpecial ? 'border-indigo-500/50' : 'border-gray-700/50'} hover:bg-gray-800 transition-colors group relative`;

            div.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-1.5 h-8 rounded-full ${lineClass}"></div>
                        <div>
                            <div class="font-bold text-sm text-gray-200">${station.name}</div>
                            <div class="text-xs text-gray-500 font-mono">${this.formatNumber(score)}</div>
                        </div>
                    </div>
                    <button class="remove-btn text-gray-600 hover:text-red-400 p-1 transition-colors" data-id="${item.id}" title="移除">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="pl-4">
                    <select class="cart-item-event-select w-full bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500" data-id="${item.id}">
                        ${eventOptionsHtml}
                    </select>
                </div>
            `;

            // Set selected value
            const select = div.querySelector('select');
            select.value = item.eventId;

            fragment.appendChild(div);
        });

        this.dom.cartItems.appendChild(fragment);

        this.dom.cartTotal.textContent = this.formatNumber(total);
        this.dom.cartCount.textContent = this.state.cart.length;

        // Active Event Display in Footer (Summary)
        if (this.dom.activeEventDisplay) {
            const activeEventNames = [...new Set(this.state.cart.map(i => i.eventId).filter(id => id !== 'none').map(id => this.getEventById(id).name))];

            if (activeEventNames.length > 0) {
                this.dom.activeEventDisplay.innerHTML = `<span class="text-indigo-400">包含活動: ${activeEventNames.join(', ')}</span>`;
                this.dom.activeEventDisplay.classList.remove('hidden');
            } else {
                this.dom.activeEventDisplay.classList.add('hidden');
            }
        }

        if (this.state.cart.length > 0) {
            this.dom.mobileBadge.textContent = this.state.cart.length;
            this.dom.mobileBadge.classList.remove('hidden');
        } else {
            this.dom.mobileBadge.classList.add('hidden');
        }

        this.dom.cartTotal.classList.remove('value-increase', 'value-decrease');
        void this.dom.cartTotal.offsetWidth;

        if (total > this.previousTotal) {
            this.dom.cartTotal.classList.add('value-increase');
        } else if (total < this.previousTotal) {
            this.dom.cartTotal.classList.add('value-decrease');
        }

        this.previousTotal = total;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MaveApp();
});
