// Threats Tab - Displays threat list and detail view

const ThreatsTab = {
    selectedThreatId: null,
    selectedWeaponId: null,
    filters: {
        search: '',
        selectedTier: 'all',
        threatLevels: ['T', 'E', 'A'],
        factions: []
    },

    init() {
        // Initialize search
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.renderThreatList();
        });

        // Initialize tier filter dropdown
        const tierFilter = document.getElementById('tier-filter');
        tierFilter.addEventListener('change', (e) => {
            this.filters.selectedTier = e.target.value;
            this.renderThreatList();
        });

        // Initialize threat level filters
        const threatLevelFilters = document.querySelectorAll('#threat-level-filters input[type="checkbox"]');
        threatLevelFilters.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateThreatLevelFilters();
                this.renderThreatList();
            });
        });

        // Initialize clear filters button
        document.getElementById('btn-clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Populate faction filters
        this.populateFactionFilters();

        // Render initial threat list
        this.renderThreatList();
    },

    refresh() {
        this.renderThreatList();
        if (this.selectedThreatId) {
            this.renderThreatDetail(this.selectedThreatId);
        }
    },

    populateFactionFilters() {
        const factions = DataLoader.getAllFactions();
        const container = document.getElementById('faction-filters');

        container.innerHTML = factions.map(faction => `
            <label class="checkbox-label">
                <input type="checkbox" data-faction="${faction}">
                <span>${faction}</span>
            </label>
        `).join('');

        // Add event listeners
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateFactionFilters();
                this.renderThreatList();
            });
        });
    },

    updateThreatLevelFilters() {
        const checkboxes = document.querySelectorAll('#threat-level-filters input[type="checkbox"]');
        this.filters.threatLevels = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                this.filters.threatLevels.push(cb.dataset.threat);
            }
        });
    },

    updateFactionFilters() {
        const checkboxes = document.querySelectorAll('#faction-filters input[type="checkbox"]');
        this.filters.factions = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                this.filters.factions.push(cb.dataset.faction);
            }
        });
    },

    clearFilters() {
        // Reset faction filters only
        document.querySelectorAll('#faction-filters input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        this.filters.factions = [];

        this.renderThreatList();
    },

    renderThreatList() {
        let threats = DataLoader.filterThreats({
            search: this.filters.search,
            selectedTier: this.filters.selectedTier !== 'all' ? this.filters.selectedTier : null,
            threatLevels: this.filters.threatLevels.length > 0 ? this.filters.threatLevels : null,
            factions: this.filters.factions.length > 0 ? this.filters.factions : null
        });

        // Sort threats alphabetically by name
        threats = threats.sort((a, b) => a.name.localeCompare(b.name));

        const container = document.getElementById('threat-list');

        if (threats.length === 0) {
            container.innerHTML = `
                <div class="threat-list-empty">
                    <p>No threats match your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = threats.map(threat => {
            const tierBadges = this.renderTierBadges(threat.tierThreat, this.filters.selectedTier);
            const keywords = threat.keywords || [];

            return `
                <div class="threat-list-item ${this.selectedThreatId === threat.id ? 'selected' : ''}"
                     data-threat-id="${threat.id}">
                    <div class="threat-list-header">
                        <span class="threat-list-name">${threat.name}</span>
                        <div class="threat-list-level">${tierBadges}</div>
                    </div>
                    <div class="threat-list-keywords">
                        ${keywords.map(kw => `<span class="threat-list-keyword">${kw}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        container.querySelectorAll('.threat-list-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectThreat(item.dataset.threatId);
            });
        });
    },

    renderTierBadges(tierThreat, selectedTier = 'all') {
        if (!tierThreat) return '';

        if (selectedTier && selectedTier !== 'all') {
            // Show only the selected tier's threat level
            const level = tierThreat[selectedTier];
            if (level) {
                return `<span class="threat-tier-badge">${level}</span>`;
            }
            return '';
        }

        // Show unique threat levels across all tiers
        const levels = new Set(Object.values(tierThreat));
        return Array.from(levels).map(level =>
            `<span class="threat-tier-badge">${level}</span>`
        ).join('');
    },

    selectThreat(threatId) {
        this.selectedThreatId = threatId;
        this.selectedWeaponId = null;

        // Update list selection
        document.querySelectorAll('.threat-list-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.threatId === threatId);
        });

        // Render detail
        this.renderThreatDetail(threatId);
    },

    renderThreatDetail(threatId) {
        const threat = DataLoader.getThreat(threatId);
        const container = document.getElementById('threat-detail');

        if (!threat) {
            container.innerHTML = `
                <div class="threat-detail-placeholder">
                    <p>Threat not found</p>
                </div>
            `;
            return;
        }

        // Find the default weapon (first ACTION ability) or use selected weapon
        let currentWeapon = null;
        if (this.selectedWeaponId) {
            currentWeapon = DataLoader.getThreatWeapon(this.selectedWeaponId);
        } else if (threat.abilities) {
            const actionAbility = threat.abilities.find(a => a.type === 'ACTION');
            if (actionAbility && actionAbility.weaponId) {
                currentWeapon = DataLoader.getThreatWeapon(actionAbility.weaponId);
                this.selectedWeaponId = actionAbility.weaponId;
            }
        }

        container.innerHTML = this.renderThreatCard(threat, currentWeapon);

        // Enhance glossary terms
        Glossary.enhanceDescriptions(container);

        // Attach keyword click handlers
        container.querySelectorAll('.threat-keyword').forEach(kw => {
            kw.addEventListener('click', (e) => {
                const keyword = e.target.textContent;
                this.showKeywordPopup(keyword, e.target);
            });
        });

        // Attach weapon selector handler
        const weaponSelector = container.querySelector('.weapon-selector');
        if (weaponSelector) {
            weaponSelector.addEventListener('change', (e) => {
                this.selectedWeaponId = e.target.value || null;
                this.renderThreatDetail(threatId);
            });
        }
    },

    renderThreatCard(threat, currentWeapon) {
        // Build tier/threat table
        const tierThreatTable = this.renderTierThreatTable(threat.tierThreat);

        // Build keywords row
        const keywordsHtml = (threat.keywords || []).map(kw =>
            `<span class="threat-keyword">${kw}</span>`
        ).join('');

        // Build attributes table
        const attributesTable = this.renderAttributesTable(threat.attributes);

        // Build resilience row
        const resilienceHtml = this.renderResilienceRow(threat);

        // Build combat stats table
        const combatStatsTable = this.renderCombatStatsTable(threat);

        // Build skills row
        const skillsHtml = this.renderSkillsRow(threat.skills);

        // Build abilities section
        const abilitiesHtml = this.renderAbilities(threat.abilities, currentWeapon);

        // Build bonuses section
        const bonusesHtml = this.renderBonuses(threat.bonuses);

        // Build determination row
        const determinationHtml = this.renderDeterminationRow(threat.determination);

        // Build bottom stats table
        const bottomStatsTable = this.renderBottomStatsTable(threat);

        // Build weapon selector
        const weaponSelectorHtml = this.renderWeaponSelector(threat, currentWeapon);

        return `
            <div class="threat-card">
                <div class="threat-card-header">
                    <h2 class="threat-card-title">${threat.name}</h2>
                    ${threat.quote ? `
                        <p class="threat-card-quote">${threat.quote}</p>
                        ${threat.attribution ? `<p class="threat-card-attribution">—${threat.attribution}</p>` : ''}
                    ` : ''}
                </div>
                <div class="threat-card-body">
                    ${threat.description ? `
                        <div class="threat-card-description">
                            ${threat.description}
                        </div>
                    ` : ''}

                    <div class="threat-stats-section">
                        ${tierThreatTable}

                        <div class="threat-keywords-row">
                            <span class="threat-keywords-label">KEYWORDS:</span>
                            ${keywordsHtml}
                        </div>

                        ${attributesTable}

                        ${resilienceHtml}

                        ${combatStatsTable}

                        ${skillsHtml}

                        <div class="abilities-section">
                            <div class="abilities-header">Abilities</div>
                            ${abilitiesHtml}
                        </div>

                        ${bonusesHtml}

                        ${determinationHtml}

                        ${bottomStatsTable}

                        ${weaponSelectorHtml}
                    </div>
                </div>
            </div>
        `;
    },

    renderTierThreatTable(tierThreat) {
        if (!tierThreat) return '';

        const tiers = Object.keys(tierThreat).sort((a, b) => parseInt(a) - parseInt(b));

        return `
            <table class="threat-stat-table tier-threat-table">
                <thead>
                    <tr>
                        <th>Tier</th>
                        ${tiers.map(t => `<th>${t}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Threat</td>
                        ${tiers.map(t => `<td class="stat-value">${tierThreat[t]}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    },

    renderAttributesTable(attributes) {
        if (!attributes) return '';

        const attrOrder = ['S', 'T', 'A', 'I', 'Wil', 'Int', 'Fel'];
        const attrNames = {
            'S': 'STR', 'T': 'TOU', 'A': 'AGI', 'I': 'INI',
            'Wil': 'WIL', 'Int': 'INT', 'Fel': 'FEL'
        };

        return `
            <table class="threat-stat-table attributes-table">
                <thead>
                    <tr>
                        ${attrOrder.map(attr => `<th>${attrNames[attr]}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        ${attrOrder.map(attr => `<td class="stat-value">${attributes[attr] || '-'}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    },

    renderResilienceRow(threat) {
        const resilience = threat.resilience || {};
        const value = resilience.value || '-';
        const note = resilience.note || '';

        return `
            <div class="resilience-row">
                <span class="resilience-label">Resilience</span><br>
                <span class="resilience-value">${value}</span>
                ${note ? `<span class="resilience-note" data-glossary-enhance> (${note})</span>` : ''}
            </div>
        `;
    },

    renderCombatStatsTable(threat) {
        return `
            <table class="threat-stat-table combat-stats-table">
                <thead>
                    <tr>
                        <th>Defence</th>
                        <th>Wounds</th>
                        <th>Shock</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="stat-value">${threat.defence || '-'}</td>
                        <td class="stat-value">${threat.wounds || '-'}</td>
                        <td class="stat-value">${threat.shock || '-'}</td>
                    </tr>
                </tbody>
            </table>
        `;
    },

    renderSkillsRow(skills) {
        if (!skills) return '';

        return `
            <div class="skills-row">
                <span class="skills-label">SKILLS:</span>
                <span class="skills-value" data-glossary-enhance>${skills}</span>
            </div>
        `;
    },

    renderAbilities(abilities, currentWeapon) {
        if (!abilities || abilities.length === 0) return '<p class="text-muted">No abilities</p>';

        return abilities.map(ability => {
            let statsHtml = '';
            let descHtml = '';

            if (ability.type === 'ACTION' && ability.weaponId) {
                // This is a weapon action - show weapon stats
                const weapon = currentWeapon || DataLoader.getThreatWeapon(ability.weaponId);
                if (weapon) {
                    statsHtml = this.formatWeaponStats(weapon);
                }
            } else if (ability.stats) {
                statsHtml = `, ${ability.stats}`;
            }

            if (ability.description) {
                descHtml = `<div class="ability-description" data-glossary-enhance>${ability.description}</div>`;
            }

            return `
                <div class="ability-item">
                    <div>
                        <span class="ability-type">${ability.type}:</span>
                        <span class="ability-name" data-glossary-enhance>${ability.name}</span>
                        ${statsHtml ? `<span class="ability-stats" data-glossary-enhance>${statsHtml}</span>` : ''}
                    </div>
                    ${descHtml}
                </div>
            `;
        }).join('');
    },

    formatWeaponStats(weapon) {
        const parts = [];
        if (weapon.damage !== undefined) parts.push(`${weapon.damage}`);
        if (weapon.ed !== undefined) parts.push(`+${weapon.ed} ED`);
        if (weapon.ap !== undefined && weapon.ap !== 0) parts.push(`AP ${weapon.ap}`);
        if (weapon.range) parts.push(`Range ${weapon.range}`);
        if (weapon.salvo) parts.push(`Salvo ${weapon.salvo}`);

        let result = parts.join(' / ');
        if (weapon.traits && weapon.traits.length > 0) {
            result += ` [${weapon.traits.join(', ')}]`;
        }
        return result;
    },

    renderBonuses(bonuses) {
        if (!bonuses || bonuses.length === 0) return '';

        const bonusItems = bonuses.map(bonus => `
            <div class="bonus-item">
                <span class="bonus-name" data-glossary-enhance>${bonus.name}:</span>
                <span class="bonus-description" data-glossary-enhance>${bonus.description}</span>
            </div>
        `).join('');

        return `
            <div class="bonuses-section">
                <div class="bonuses-header">Bonuses</div>
                ${bonusItems}
            </div>
        `;
    },

    renderDeterminationRow(determination) {
        if (!determination) return '';

        return `
            <div class="determination-row">
                <span class="determination-label">DETERMINATION:</span>
                <span class="determination-value" data-glossary-enhance>${determination}</span>
            </div>
        `;
    },

    renderBottomStatsTable(threat) {
        return `
            <table class="threat-stat-table bottom-stats-table">
                <thead>
                    <tr>
                        <th>Conviction</th>
                        <th>Resolve</th>
                        <th>Speed</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="stat-value">${threat.conviction || '-'}</td>
                        <td class="stat-value">${threat.resolve || '-'}</td>
                        <td class="stat-value">${threat.speed || '-'}</td>
                        <td class="stat-value">${threat.size || '-'}</td>
                    </tr>
                </tbody>
            </table>
        `;
    },

    renderWeaponSelector(threat, currentWeapon) {
        // Get all available threat weapons
        const allWeapons = DataLoader.getAllThreatWeapons();
        if (allWeapons.length === 0) return '';

        // Get the default weapon from the threat
        let defaultWeaponId = null;
        if (threat.abilities) {
            const actionAbility = threat.abilities.find(a => a.type === 'ACTION' && a.weaponId);
            if (actionAbility) {
                defaultWeaponId = actionAbility.weaponId;
            }
        }

        const currentWeaponId = this.selectedWeaponId || defaultWeaponId;

        return `
            <div class="weapon-selector-section">
                <div class="weapon-selector-label">Change Weapon</div>
                <select class="weapon-selector">
                    <option value="">-- Select a weapon --</option>
                    ${allWeapons.map(w => `
                        <option value="${w.id}" ${w.id === currentWeaponId ? 'selected' : ''}>
                            ${w.name}
                        </option>
                    `).join('')}
                </select>
                ${currentWeapon ? this.renderWeaponPreview(currentWeapon) : ''}
            </div>
        `;
    },

    renderWeaponPreview(weapon) {
        return `
            <div class="weapon-stats-preview">
                <div class="stat-row">
                    <span class="stat-label">Damage</span>
                    <span class="stat-value">${weapon.damage || '-'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">ED</span>
                    <span class="stat-value">+${weapon.ed || 0} ED</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">AP</span>
                    <span class="stat-value">${weapon.ap || 0}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Range</span>
                    <span class="stat-value">${weapon.range || '-'}</span>
                </div>
                ${weapon.salvo ? `
                <div class="stat-row">
                    <span class="stat-label">Salvo</span>
                    <span class="stat-value">${weapon.salvo}</span>
                </div>
                ` : ''}
                ${weapon.traits && weapon.traits.length > 0 ? `
                <div class="stat-row">
                    <span class="stat-label">Traits</span>
                    <span class="stat-value" data-glossary-enhance>${weapon.traits.join(', ')}</span>
                </div>
                ` : ''}
            </div>
        `;
    },

    showKeywordPopup(keyword, anchorElement) {
        // Try to find the keyword in the glossary
        const glossaryData = DataLoader.getGlossary();
        if (glossaryData && glossaryData.keywords) {
            const keywordKey = keyword.toLowerCase().replace(/\s+/g, '_');
            const keywordData = Object.values(glossaryData.keywords).find(
                k => k.name.toLowerCase() === keyword.toLowerCase()
            );

            if (keywordData) {
                Glossary.showPopup(keywordData, anchorElement, 'keyword');
            }
        }
    }
};
