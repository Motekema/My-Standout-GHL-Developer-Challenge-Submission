// GHL Dashboard Widget JavaScript
// This would integrate with GHL APIs and webhooks in production

class FranchiseDashboard {
    constructor() {
        this.data = null;
        this.refreshInterval = null;
        this.apiConfig = {
            // Free APIs for real data
            jsonbinApiKey: localStorage.getItem('jsonbin_api_key') || '',
            webhookUrl: localStorage.getItem('webhook_url') || '',
            useRealApis: localStorage.getItem('use_real_apis') === 'true'
        };
        this.init();
    }

    async init() {
        this.checkApiConfiguration();
        await this.loadData();
        this.startAutoRefresh();
    }

    checkApiConfiguration() {
        if (!this.apiConfig.jsonbinApiKey && this.apiConfig.useRealApis) {
            this.showApiSetupPrompt();
        }
    }

    showApiSetupPrompt() {
        const setup = confirm(
            'Enable real API integration?\n\n' +
            '1. Get free JSONBin.io API key\n' +
            '2. Get webhook.site URL for testing\n' +
            '3. Click OK to configure'
        );
        
        if (setup) {
            this.showApiSetupModal();
        }
    }

    showApiSetupModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: #1f2937; color: #ffffff; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; border: 1px solid #374151;">
                <h3 style="color: #ffffff; margin-bottom: 15px;">🔗 Enable Real API Integration</h3>
                <p style="color: #d1d5db; margin-bottom: 20px;">Configure free APIs for full functionality:</p>
                
                <div style="margin: 20px 0;">
                    <label style="color: #ffffff; display: block; margin-bottom: 5px;">JSONBin.io API Key (optional):</label>
                    <input type="text" id="jsonbinKey" placeholder="Get from jsonbin.io" 
                           style="width: 100%; padding: 8px; margin: 5px 0; background: #374151; border: 1px solid #4b5563; color: #ffffff; border-radius: 5px;">
                    <small style="color: #9ca3af;">Free tier: 100k requests/month</small>
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="color: #ffffff; display: block; margin-bottom: 5px;">Webhook URL (optional):</label>
                    <input type="text" id="webhookUrl" placeholder="Get from webhook.site" 
                           style="width: 100%; padding: 8px; margin: 5px 0; background: #374151; border: 1px solid #4b5563; color: #ffffff; border-radius: 5px;">
                    <small style="color: #9ca3af;">For testing webhook deliveries</small>
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="color: #ffffff;">
                        <input type="checkbox" id="useReal" checked style="margin-right: 8px;"> Use real APIs where available
                    </label>
                </div>
                
                <div style="text-align: right;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="margin-right: 10px; padding: 8px 16px; background: #4b5563; color: #ffffff; border: none; border-radius: 5px; cursor: pointer;">Skip</button>
                    <button onclick="dashboard.saveApiConfig()" 
                            style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    saveApiConfig() {
        const jsonbinKey = document.getElementById('jsonbinKey').value;
        const webhookUrl = document.getElementById('webhookUrl').value;
        const useReal = document.getElementById('useReal').checked;
        
        localStorage.setItem('jsonbin_api_key', jsonbinKey);
        localStorage.setItem('webhook_url', webhookUrl);
        localStorage.setItem('use_real_apis', useReal.toString());
        
        this.apiConfig = { jsonbinApiKey: jsonbinKey, webhookUrl, useRealApis: useReal };
        
        // Remove modal
        document.querySelector('div[style*="position: fixed"]').remove();
        
        // Reload data with new config
        this.loadData();
    }

    async loadData() {
        try {
            // Try to load real data first if APIs are configured
            if (this.apiConfig.useRealApis && this.apiConfig.jsonbinApiKey) {
                this.data = await this.loadRealData();
            }
            
            // Fallback to simulated data
            if (!this.data) {
                this.data = await this.simulateAPICall();
            }
            
            this.updateUI();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showError();
        }
    }

    async loadRealData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`https://api.jsonbin.io/v3/b/analytics-${today}`, {
                headers: {
                    'X-Master-Key': this.apiConfig.jsonbinApiKey
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                return this.processRealAnalyticsData(result.record);
            }
            
            return null;
        } catch (error) {
            console.warn('Could not load real data:', error);
            return null;
        }
    }

    processRealAnalyticsData(analyticsData) {
        if (!analyticsData || analyticsData.length === 0) {
            return null;
        }
        
        // Process real analytics data
        const totalLeads = analyticsData.length;
        const successfulRoutes = analyticsData.filter(d => d.selectedLocationId !== null).length;
        const conversionRate = Math.round((successfulRoutes / totalLeads) * 100);
        
        // Group by location
        const locationStats = {};
        analyticsData.forEach(record => {
            if (record.selectedLocation && record.selectedLocation !== 'NONE') {
                if (!locationStats[record.selectedLocation]) {
                    locationStats[record.selectedLocation] = {
                        name: record.selectedLocation,
                        leadsToday: 0,
                        distances: []
                    };
                }
                locationStats[record.selectedLocation].leadsToday++;
                if (record.distance) {
                    locationStats[record.selectedLocation].distances.push(record.distance);
                }
            }
        });
        
        // Convert to array format
        const locations = Object.values(locationStats).map(loc => ({
            ...loc,
            conversionRate: Math.floor(Math.random() * 30) + 15, // Simulated for demo
            capacity: Math.floor(Math.random() * 100),
            responseTime: Math.floor(Math.random() * 45) + 5,
            status: 'active',
            city: 'Real Location',
            state: 'CA'
        }));
        
        return {
            summary: {
                totalLeads,
                conversionRate,
                responseTime: Math.round(analyticsData.reduce((sum, d) => sum + (d.responseTime || 20), 0) / analyticsData.length),
                activeLocations: Object.keys(locationStats).length,
                leadsChange: Math.floor(Math.random() * 20) - 5,
                conversionChange: Math.floor(Math.random() * 10) - 3,
                responseChange: Math.floor(Math.random() * 10) - 5
            },
            locations: locations
        };
    }

    async simulateAPICall() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate realistic demo data
        const locations = [
            { name: "Downtown Fitness Hub", city: "Los Angeles", state: "CA" },
            { name: "Westside Wellness Center", city: "Santa Monica", state: "CA" },
            { name: "East Valley Gym", city: "Pasadena", state: "CA" },
            { name: "Beach City Fitness", city: "Manhattan Beach", state: "CA" },
            { name: "NYC Manhattan Gym", city: "New York", state: "NY" },
            { name: "Brooklyn Strength", city: "Brooklyn", state: "NY" },
            { name: "Miami Beach Fitness", city: "Miami", state: "FL" },
            { name: "Orlando Family Gym", city: "Orlando", state: "FL" },
        ];

        const locationData = locations.map(loc => ({
            ...loc,
            leadsToday: Math.floor(Math.random() * 40) + 10,
            conversionRate: Math.floor(Math.random() * 30) + 15,
            capacity: Math.floor(Math.random() * 100),
            responseTime: Math.floor(Math.random() * 45) + 5,
            status: Math.random() > 0.1 ? 'active' : (Math.random() > 0.5 ? 'warning' : 'danger')
        }));

        const totalLeads = locationData.reduce((sum, loc) => sum + loc.leadsToday, 0);
        const avgConversion = Math.round(locationData.reduce((sum, loc) => sum + loc.conversionRate, 0) / locationData.length);
        const avgResponse = Math.round(locationData.reduce((sum, loc) => sum + loc.responseTime, 0) / locationData.length);
        const activeLocations = locationData.filter(loc => loc.status === 'active').length;

        return {
            summary: {
                totalLeads,
                conversionRate: avgConversion,
                responseTime: avgResponse,
                activeLocations,
                leadsChange: Math.floor(Math.random() * 20) - 5,
                conversionChange: Math.floor(Math.random() * 10) - 3,
                responseChange: Math.floor(Math.random() * 10) - 5
            },
            locations: locationData
        };
    }

    updateUI() {
        if (!this.data) return;

        // Update summary metrics
        document.getElementById('totalLeads').textContent = this.data.summary.totalLeads;
        document.getElementById('conversionRate').textContent = `${this.data.summary.conversionRate}%`;
        document.getElementById('responseTime').textContent = `${this.data.summary.responseTime}min`;
        document.getElementById('activeLocations').textContent = this.data.summary.activeLocations;

        // Update change indicators
        this.updateChange('leadsChange', this.data.summary.leadsChange, '%');
        this.updateChange('conversionChange', this.data.summary.conversionChange, '%');
        this.updateChange('responseChange', this.data.summary.responseChange, 'min');
        
        // Update locations operational status
        const operationalText = `${this.data.summary.activeLocations} locations operational`;
        document.getElementById('locationsChange').textContent = operationalText;
        document.getElementById('locationsChange').className = 'metric-change positive';

        // Update locations table
        this.updateLocationsTable();

        // Hide loading indicator
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('locationsTable').style.display = 'table';
    }

    updateChange(elementId, value, unit) {
        const element = document.getElementById(elementId);
        const sign = value >= 0 ? '+' : '';
        element.textContent = `${sign}${value}${unit} from yesterday`;
        element.className = `metric-change ${value >= 0 ? 'positive' : 'negative'}`;
    }

    updateLocationsTable() {
        const tbody = document.getElementById('locationsTableBody');
        tbody.innerHTML = '';

        this.data.locations.forEach(location => {
            const row = document.createElement('tr');
            
            const capacityColor = location.capacity > 70 ? '#27ae60' : 
                                location.capacity > 40 ? '#f39c12' : '#e74c3c';

            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; padding: 5px 0;">
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${location.status === 'active' ? '#27ae60' : location.status === 'warning' ? '#f39c12' : '#e74c3c'}; margin-right: 12px; flex-shrink: 0;"></div>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${location.name}</div>
                            <div style="color: var(--text-secondary); font-weight: 500; font-size: 0.8rem;">${location.city}, ${location.state}</div>
                        </div>
                    </div>
                </td>
                <td><div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); text-align: center;">${location.leadsToday}</div></td>
                <td><div style="font-weight: 600; color: ${location.conversionRate > 25 ? '#27ae60' : location.conversionRate > 15 ? '#f39c12' : '#e74c3c'}; text-align: center; font-size: 0.95rem;">${location.conversionRate}%</div></td>
                <td>
                    <div style="padding: 5px 0;">
                        <div class="capacity-bar">
                            <div class="capacity-fill" style="width: ${location.capacity}%; background: ${capacityColor};"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <small style="font-weight: 600; color: var(--text-secondary); font-size: 0.75rem;">${location.capacity}%</small>
                            <small style="color: var(--text-muted); font-size: 0.7rem;">capacity</small>
                        </div>
                    </div>
                </td>
                <td><div style="font-weight: 600; color: var(--text-primary); text-align: center; font-size: 0.95rem;">${location.responseTime}min</div></td>
                <td style="text-align: center;">
                    <span class="status-badge status-${location.status}">
                        ${location.status}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showError() {
        document.getElementById('loadingIndicator').innerHTML = `
            <div style="color: #e74c3c;">
                ❌ Failed to load data. Please try again.
            </div>
        `;
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadData();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Global functions
let dashboard;

function refreshDashboard() {
    dashboard.loadData();
}

// Initialize dashboard when page loads
window.addEventListener('DOMContentLoaded', () => {
    dashboard = new FranchiseDashboard();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (dashboard) {
        dashboard.stopAutoRefresh();
    }
});
