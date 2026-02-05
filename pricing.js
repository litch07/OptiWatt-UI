// ==========================================
// PRICING DATA ACCESS LAYER
// Cost-per-kWh from Database with Caching
// One-time toast per session
// ==========================================

const Pricing = {
    value: null,
    lastFetch: 0,
    refreshInterval: 10 * 60 * 1000, // 10 minutes

    async get() {
        const now = Date.now();
        
        // Return cached if fresh
        if (this.value && (now - this.lastFetch < this.refreshInterval)) {
            return this.value;
        }

        // Try to fetch from API
        try {
            const response = await fetch('/api/config/pricing', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error(`API returned ${response.status}`);

            const data = await response.json();
            
            if (!data.costPerKwh || typeof data.costPerKwh !== 'number') {
                throw new Error('Invalid pricing data');
            }

            this.value = {
                costPerKwh: data.costPerKwh,
                currency: data.currency || 'USD',
                updatedAt: data.updatedAt || new Date().toISOString()
            };
            
            this.lastFetch = now;
            localStorage.setItem('optiwatt_pricing_cache', JSON.stringify(this.value));
            sessionStorage.removeItem('pricingToastShown');
            
            return this.value;

        } catch (error) {
            console.error('Failed to fetch pricing from API:', error);

            // Return cached value with warning
            if (this.value) {
                this.showToastOnce('Using last known energy rate. Live pricing unavailable.', 'warning', 'pricingWarningShown');
                return this.value;
            }

            // Try localStorage cache
            const cached = localStorage.getItem('optiwatt_pricing_cache');
            if (cached) {
                try {
                    this.value = JSON.parse(cached);
                    this.showToastOnce('Using last known energy rate. Live pricing unavailable.', 'warning', 'pricingWarningShown');
                    return this.value;
                } catch (e) {}
            }

            // Fallback to default
            this.value = {
                costPerKwh: 0.15,
                currency: 'USD',
                updatedAt: new Date().toISOString()
            };
            this.showToastOnce('Couldn\'t load energy rate. Using default $0.15/kWh.', 'warning', 'pricingFallbackShown');
            return this.value;
        }
    },

    costFromKwh(kwh) {
        if (!this.value) return kwh * 0.15;
        return kwh * this.value.costPerKwh;
    },

    kwhFromCost(cost) {
        if (!this.value) return cost / 0.15;
        return cost / this.value.costPerKwh;
    },

    getFormattedRate() {
        if (!this.value) return '$0.15';
        return `$${this.value.costPerKwh.toFixed(3)}`;
    },

    getFormattedUpdateTime() {
        if (!this.value || !this.value.updatedAt) return 'Unknown';
        try {
            const date = new Date(this.value.updatedAt);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Unknown';
        }
    },

    async refresh() {
        this.lastFetch = 0;
        return await this.get();
    },

    showToastOnce(message, type = 'warning', sessionKey) {
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, 'true');

        const colors = {
            warning: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500 text-yellow-800 dark:text-yellow-200',
            error: 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200'
        };

        const icons = {
            warning: '⚠️',
            error: '✗'
        };

        const alert = document.createElement('div');
        alert.className = `fixed top-20 right-4 z-50 px-6 py-4 ${colors[type]} border-2 rounded-lg shadow-2xl fade-in`;
        alert.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-2xl">${icons[type]}</span>
                <p class="font-semibold">${message}</p>
            </div>
        `;

        document.body.appendChild(alert);

        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    }
};
