// Data Loader - Loads game data from JSON files

const DataLoader = {
    // Cache for loaded data
    cache: {},

    // Load a single data file
    async loadFile(filename) {
        if (this.cache[filename]) {
            console.log(`[DataLoader] Cache hit for ${filename}`);
            return this.cache[filename];
        }

        try {
            console.log(`[DataLoader] Loading ${filename}...`);
            const data = await window.api.loadGameData(filename);
            if (data) {
                this.cache[filename] = data;
                console.log(`[DataLoader] Loaded ${filename}:`, Array.isArray(data) ? `${data.length} items` : 'object');
            } else {
                console.warn(`[DataLoader] No data returned for ${filename}`);
            }
            return data;
        } catch (error) {
            console.error(`[DataLoader] Failed to load ${filename}:`, error);
            return null;
        }
    },

    // Load all game data files
    async loadAll() {
        console.log('[DataLoader] Starting to load all game data...');

        const files = [
            'threats.json',
            'threat-weapons.json',
            'glossary.json'
        ];

        const results = await Promise.all(files.map(f => this.loadFile(f)));

        const gameData = {
            threats: results[0] || [],
            threatWeapons: results[1] || [],
            glossary: results[2] || {}
        };

        console.log('[DataLoader] All data loaded. Summary:', {
            threats: gameData.threats.length,
            threatWeapons: gameData.threatWeapons.length
        });

        return gameData;
    },

    // Get all threats
    getAllThreats() {
        return this.cache['threats.json'] || [];
    },

    // Get threat by ID
    getThreat(id) {
        const threats = this.getAllThreats();
        return threats.find(t => t.id === id);
    },

    // Get all threat weapons
    getAllThreatWeapons() {
        return this.cache['threat-weapons.json'] || [];
    },

    // Get threat weapon by ID
    getThreatWeapon(id) {
        const weapons = this.getAllThreatWeapons();
        return weapons.find(w => w.id === id);
    },

    // Get glossary data
    getGlossary() {
        return this.cache['glossary.json'] || {};
    },

    // Load glossary (for Glossary.init compatibility)
    async loadGlossary() {
        if (!this.cache['glossary.json']) {
            await this.loadFile('glossary.json');
        }
        return this.cache['glossary.json'];
    },

    // Get all unique keywords from threats
    getAllKeywords() {
        const threats = this.getAllThreats();
        const keywordSet = new Set();

        threats.forEach(threat => {
            if (threat.keywords && Array.isArray(threat.keywords)) {
                threat.keywords.forEach(kw => keywordSet.add(kw));
            }
        });

        return Array.from(keywordSet).sort();
    },

    // Filter threats by criteria
    filterThreats(criteria = {}) {
        let threats = this.getAllThreats();

        // Filter by search text
        if (criteria.search) {
            const searchLower = criteria.search.toLowerCase();
            threats = threats.filter(t =>
                t.name.toLowerCase().includes(searchLower) ||
                (t.description && t.description.toLowerCase().includes(searchLower))
            );
        }

        // Filter by tier and threat levels
        if (criteria.threatLevels && criteria.threatLevels.length > 0) {
            threats = threats.filter(t => {
                if (!t.tierThreat) return false;

                if (criteria.selectedTier) {
                    // If a specific tier is selected, check only that tier's threat level
                    const tierLevel = t.tierThreat[criteria.selectedTier];
                    return tierLevel && criteria.threatLevels.includes(tierLevel);
                } else {
                    // If no tier selected (all tiers), check if any tier matches
                    return Object.values(t.tierThreat).some(level =>
                        criteria.threatLevels.includes(level)
                    );
                }
            });
        }

        // Filter by keywords
        if (criteria.keywords && criteria.keywords.length > 0) {
            threats = threats.filter(t => {
                if (!t.keywords) return false;
                return criteria.keywords.some(kw => t.keywords.includes(kw));
            });
        }

        return threats;
    }
};
