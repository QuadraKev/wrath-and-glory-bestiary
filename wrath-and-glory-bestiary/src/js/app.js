// Main Application Controller

const App = {
    // Current active main tab
    currentTab: 'threats',

    // Initialize the application
    async init() {
        console.log('Initializing Wrath & Glory Bestiary...');

        // Load game data
        const gameData = await DataLoader.loadAll();
        console.log('Game data loaded:', Object.keys(gameData));

        // Initialize glossary system
        await Glossary.init();
        console.log('Glossary initialized.');

        // Initialize UI components
        this.initTabNavigation();

        // Initialize tab modules
        ThreatsTab.init();
        GlossaryTab.init();

        // Update threat count
        this.updateThreatCount();

        console.log('Application initialized.');
    },

    // Initialize top tab navigation
    initTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });
    },

    // Switch to a different main tab
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        // Trigger tab-specific refresh
        if (tabName === 'glossary') {
            GlossaryTab.refresh();
        } else if (tabName === 'threats') {
            ThreatsTab.refresh();
        }
    },

    // Update threat count display
    updateThreatCount() {
        const threats = DataLoader.getAllThreats();
        document.getElementById('threat-count').textContent = `${threats.length} Threats`;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
