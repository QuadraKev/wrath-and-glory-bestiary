// Encounter Tab - Encounter Builder UI

const EncounterTab = {
    selectedId: null,
    selectionType: null, // 'individual' or 'mob'
    multiSelectedIds: new Set(), // For multi-selection

    init() {
        // Initialize the tab
        this.bindEvents();
        this.render();
    },

    refresh() {
        this.render();
    },

    clearMultiSelection() {
        this.multiSelectedIds.clear();
    },

    bindEvents() {
        // Settings events
        document.getElementById('encounter-tier').addEventListener('change', (e) => {
            EncounterState.updateSettings({ tier: parseInt(e.target.value) });
            this.render();
        });

        document.getElementById('encounter-players').addEventListener('change', (e) => {
            EncounterState.updateSettings({ playerCount: parseInt(e.target.value) });
            this.renderPlayerCharacterInputs();
            this.renderEncounterList();
        });

        document.getElementById('encounter-name').addEventListener('input', (e) => {
            EncounterState.updateSettings({ name: e.target.value });
        });

        // Save/Load events
        document.getElementById('btn-save-encounter').addEventListener('click', () => {
            this.handleSave();
        });

        document.getElementById('btn-load-encounter').addEventListener('click', () => {
            this.handleLoad();
        });

        document.getElementById('btn-clear-encounter').addEventListener('click', () => {
            this.handleClear();
        });
    },

    render() {
        this.renderSettings();
        this.renderPlayerCharacterInputs();
        this.renderEncounterList();
        this.renderDetail();
    },

    // ===== Settings Section =====

    renderSettings() {
        document.getElementById('encounter-tier').value = EncounterState.settings.tier;
        document.getElementById('encounter-players').value = EncounterState.settings.playerCount;
        document.getElementById('encounter-name').value = EncounterState.settings.name;
    },

    // ===== Player Character Inputs =====

    renderPlayerCharacterInputs() {
        const container = document.getElementById('player-character-inputs');
        const playerCount = EncounterState.settings.playerCount;

        // Build input rows - show existing PCs first, then empty slots for remaining
        let html = '';
        for (let i = 0; i < playerCount; i++) {
            const pc = EncounterState.playerCharacters[i];
            if (pc) {
                html += `
                    <div class="player-character-row" data-index="${i}" data-id="${pc.id}">
                        <input type="text" class="pc-name-input" value="${this.escapeHtml(pc.name)}"
                               data-index="${i}" data-id="${pc.id}" placeholder="Player ${i + 1}">
                        <input type="number" class="pc-initiative-input" value="${pc.initiative || ''}"
                               data-index="${i}" data-id="${pc.id}" placeholder="Init" min="1" max="99">
                    </div>
                `;
            } else {
                html += `
                    <div class="player-character-row" data-index="${i}">
                        <input type="text" class="pc-name-input" value=""
                               data-index="${i}" placeholder="Player ${i + 1}">
                        <input type="number" class="pc-initiative-input" value=""
                               data-index="${i}" placeholder="Init" min="1" max="99">
                    </div>
                `;
            }
        }
        container.innerHTML = html;

        // Remove excess player characters if player count was reduced
        while (EncounterState.playerCharacters.length > playerCount) {
            const lastPc = EncounterState.playerCharacters[EncounterState.playerCharacters.length - 1];
            EncounterState.removePlayerCharacter(lastPc.id);
        }

        // Bind events
        container.querySelectorAll('.pc-name-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const existingId = e.target.dataset.id;
                const newName = e.target.value.trim();

                if (existingId) {
                    // Update existing player character
                    if (newName) {
                        EncounterState.updatePlayerCharacterName(existingId, newName);
                    }
                } else if (newName) {
                    // Create new player character at this index
                    const newId = EncounterState.addPlayerCharacter(newName);
                    // Re-render to update the data-id attribute
                    this.renderPlayerCharacterInputs();
                }
                this.renderEncounterList();
                if (this.selectedId && this.selectionType === 'player') {
                    this.renderDetail();
                }
            });
        });

        container.querySelectorAll('.pc-initiative-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const existingId = e.target.dataset.id;
                const index = parseInt(e.target.dataset.index);

                if (existingId) {
                    EncounterState.setPlayerCharacterInitiative(existingId, e.target.value);
                } else if (e.target.value) {
                    // Create player character if setting initiative on empty slot
                    const nameInput = container.querySelector(`.pc-name-input[data-index="${index}"]`);
                    const name = nameInput?.value.trim() || `Player ${index + 1}`;
                    const newId = EncounterState.addPlayerCharacter(name);
                    EncounterState.setPlayerCharacterInitiative(newId, e.target.value);
                    this.renderPlayerCharacterInputs();
                }
                this.renderEncounterList();
            });
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ===== Encounter List =====

    renderEncounterList() {
        const container = document.getElementById('encounter-list');
        const items = EncounterState.getEncounterListItems();

        if (items.length === 0) {
            container.innerHTML = `
                <div class="encounter-list-empty">
                    <p>No threats in encounter</p>
                    <p class="text-muted">Add threats from the Threats tab</p>
                </div>
            `;
            this.renderSelectionToolbar();
            return;
        }

        container.innerHTML = items.map(item => this.renderEncounterItem(item)).join('');

        // Render selection toolbar
        this.renderSelectionToolbar();

        // Bind click handlers
        container.querySelectorAll('.encounter-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const id = el.dataset.id;
                const type = el.dataset.type;

                // Check if Ctrl/Cmd key is held for multi-select
                if (e.ctrlKey || e.metaKey) {
                    this.toggleMultiSelect(id, type);
                } else {
                    this.selectItem(id, type);
                }
            });
        });

        // Bind checkbox handlers for multi-select
        container.querySelectorAll('.multi-select-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                if (e.target.checked) {
                    this.multiSelectedIds.add(id);
                } else {
                    this.multiSelectedIds.delete(id);
                }
                this.renderSelectionToolbar();
            });
        });

        // Bind initiative input handlers
        container.querySelectorAll('.initiative-input').forEach(input => {
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                if (type === 'individual') {
                    EncounterState.setInitiative(id, e.target.value);
                } else if (type === 'mob') {
                    EncounterState.setMobInitiative(id, e.target.value);
                } else if (type === 'player') {
                    EncounterState.setPlayerCharacterInitiative(id, e.target.value);
                    // Also update the sidebar input
                    this.renderPlayerCharacterInputs();
                }
                this.renderEncounterList();
            });
        });

        // Bind wound/shock buttons
        container.querySelectorAll('.wound-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const delta = parseInt(btn.dataset.delta);
                EncounterState.updateWounds(id, delta);
                this.renderEncounterList();
                if (this.selectedId === id) {
                    this.renderDetail();
                }
            });
        });

        container.querySelectorAll('.shock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const delta = parseInt(btn.dataset.delta);
                EncounterState.updateShock(id, delta);
                this.renderEncounterList();
                if (this.selectedId === id) {
                    this.renderDetail();
                }
            });
        });

        // Bind duplicate buttons
        container.querySelectorAll('.duplicate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                this.handleDuplicate(id, type);
            });
        });

        // Bind bonus select handlers
        container.querySelectorAll('.bonus-select').forEach(select => {
            select.addEventListener('click', (e) => e.stopPropagation());
            select.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const bonus = e.target.value;
                EncounterState.updateBonus(id, bonus);
                this.renderEncounterList();
                if (this.selectedId === id) {
                    this.renderDetail();
                }
            });
        });
    },

    renderEncounterItem(item) {
        if (item.type === 'individual') {
            return this.renderIndividualItem(item);
        } else if (item.type === 'mob') {
            return this.renderMobItem(item);
        } else if (item.type === 'player') {
            return this.renderPlayerItem(item);
        }
        return '';
    },

    renderPlayerItem(item) {
        const pc = item.data;
        const isSelected = this.selectedId === item.id && this.selectionType === 'player';

        return `
            <div class="encounter-item player-item ${isSelected ? 'selected' : ''}"
                 data-id="${item.id}" data-type="player">
                <div class="encounter-item-header">
                    <input type="number" class="initiative-input" value="${item.initiative || ''}"
                           data-id="${item.id}" data-type="player" placeholder="Init"
                           min="1" max="99">
                    <span class="encounter-item-name">${this.escapeHtml(pc.name)}</span>
                    <span class="player-badge">PC</span>
                </div>
            </div>
        `;
    },

    renderIndividualItem(item) {
        const individual = item.data;
        const threat = DataLoader.getThreat(individual.threatId);
        const isSelected = this.selectedId === item.id && this.selectionType === 'individual';
        const isMultiSelected = this.multiSelectedIds.has(item.id);
        const deadClass = item.isDead ? 'dead' : '';

        const woundPercent = (individual.currentWounds / individual.maxWounds) * 100;
        const shockPercent = (individual.currentShock / individual.maxShock) * 100;

        // Show checkbox for individuals not in a mob
        const showCheckbox = !individual.mobId;
        const bonus = individual.bonus || 'none';

        return `
            <div class="encounter-item ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''} ${deadClass}"
                 data-id="${item.id}" data-type="individual" data-threat-id="${individual.threatId}">
                <div class="encounter-item-header">
                    ${showCheckbox ? `
                        <input type="checkbox" class="multi-select-checkbox"
                               data-id="${item.id}" data-type="individual"
                               ${isMultiSelected ? 'checked' : ''}>
                    ` : ''}
                    <input type="number" class="initiative-input" value="${item.initiative || ''}"
                           data-id="${item.id}" data-type="individual" placeholder="Init"
                           min="1" max="99">
                    <span class="encounter-item-name">${item.name}</span>
                    <select class="bonus-select bonus-${bonus}" data-id="${item.id}">
                        <option value="none" ${bonus === 'none' ? 'selected' : ''}>No Bonus</option>
                        <option value="elite" ${bonus === 'elite' ? 'selected' : ''}>Elite</option>
                        <option value="adversary" ${bonus === 'adversary' ? 'selected' : ''}>Adversary</option>
                    </select>
                </div>
                <div class="encounter-item-stats">
                    <div class="stat-tracker wounds-tracker">
                        <span class="stat-label">W:</span>
                        <button class="wound-btn" data-id="${item.id}" data-delta="-1">-</button>
                        <span class="stat-value">${individual.currentWounds}/${individual.maxWounds}</span>
                        <button class="wound-btn" data-id="${item.id}" data-delta="1">+</button>
                        <div class="stat-bar">
                            <div class="stat-bar-fill wounds-bar" style="width: ${woundPercent}%"></div>
                        </div>
                    </div>
                    <div class="stat-tracker shock-tracker">
                        <span class="stat-label">S:</span>
                        <button class="shock-btn" data-id="${item.id}" data-delta="-1">-</button>
                        <span class="stat-value">${individual.currentShock}/${individual.maxShock}</span>
                        <button class="shock-btn" data-id="${item.id}" data-delta="1">+</button>
                        <div class="stat-bar">
                            <div class="stat-bar-fill shock-bar" style="width: ${shockPercent}%"></div>
                        </div>
                    </div>
                </div>
                <div class="encounter-item-actions">
                    <button class="duplicate-btn" data-id="${item.id}" data-type="individual" title="Duplicate">
                        <span>+</span>
                    </button>
                </div>
            </div>
        `;
    },

    renderMobItem(item) {
        const mob = item.data;
        const bonus = EncounterState.getMobAttackBonus(item.id);
        const isSelected = this.selectedId === item.id && this.selectionType === 'mob';
        const deadClass = item.isDead ? 'dead' : '';

        return `
            <div class="encounter-item mob-item ${isSelected ? 'selected' : ''} ${deadClass}"
                 data-id="${item.id}" data-type="mob">
                <div class="encounter-item-header">
                    <input type="number" class="initiative-input" value="${item.initiative || ''}"
                           data-id="${item.id}" data-type="mob" placeholder="Init"
                           min="1" max="99">
                    <span class="encounter-item-name">${mob.name}</span>
                    <span class="mob-badge">MOB</span>
                </div>
                <div class="mob-info">
                    <span class="mob-count">${bonus.count} members (${item.livingCount} alive)</span>
                    <span class="mob-bonus">+${bonus.bonus} dice (max ${bonus.max})</span>
                </div>
                <div class="encounter-item-actions">
                    <button class="duplicate-btn" data-id="${item.id}" data-type="mob" title="Duplicate Mob">
                        <span>+</span>
                    </button>
                </div>
            </div>
        `;
    },

    selectItem(id, type) {
        this.selectedId = id;
        this.selectionType = type;
        this.clearMultiSelection();
        this.renderEncounterList();
        this.renderDetail();
    },

    toggleMultiSelect(id, type) {
        // Only allow multi-select for standalone individuals
        if (type !== 'individual') return;

        const individual = EncounterState.getIndividual(id);
        if (!individual || individual.mobId) return;

        if (this.multiSelectedIds.has(id)) {
            this.multiSelectedIds.delete(id);
        } else {
            this.multiSelectedIds.add(id);
        }

        // Clear single selection when multi-selecting
        if (this.multiSelectedIds.size > 0) {
            this.selectedId = null;
            this.selectionType = null;
        }

        this.renderEncounterList();
        this.renderDetail();
    },

    renderSelectionToolbar() {
        let toolbar = document.getElementById('selection-toolbar');

        // Create toolbar if it doesn't exist
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'selection-toolbar';
            toolbar.className = 'selection-toolbar';
            const listContainer = document.querySelector('.encounter-list-container');
            if (listContainer) {
                listContainer.insertBefore(toolbar, listContainer.firstChild);
            }
        }

        const count = this.multiSelectedIds.size;

        if (count < 2) {
            toolbar.classList.add('hidden');
            return;
        }

        // Check if all selected are same threat type (required for mob)
        const selectedIndividuals = Array.from(this.multiSelectedIds)
            .map(id => EncounterState.getIndividual(id))
            .filter(i => i !== undefined);

        const threatIds = new Set(selectedIndividuals.map(i => i.threatId));
        const canFormMob = threatIds.size === 1 && selectedIndividuals.every(i => !i.mobId);

        toolbar.classList.remove('hidden');
        toolbar.innerHTML = `
            <div class="toolbar-info">
                <span>${count} threats selected</span>
                ${threatIds.size > 1 ? '<span class="toolbar-warning">(different types - cannot form mob)</span>' : ''}
            </div>
            <div class="toolbar-actions">
                <button class="btn-primary toolbar-btn" id="btn-form-mob" ${canFormMob ? '' : 'disabled'}>
                    Form Mob
                </button>
                <button class="btn-secondary toolbar-btn" id="btn-clear-selection">
                    Clear
                </button>
            </div>
        `;

        // Bind events
        document.getElementById('btn-form-mob')?.addEventListener('click', () => {
            this.handleFormMob();
        });

        document.getElementById('btn-clear-selection')?.addEventListener('click', () => {
            this.clearMultiSelection();
            this.renderEncounterList();
        });
    },

    handleFormMob() {
        if (this.multiSelectedIds.size < 2) return;

        const ids = Array.from(this.multiSelectedIds);
        const firstIndividual = EncounterState.getIndividual(ids[0]);
        if (!firstIndividual) return;

        const threatId = firstIndividual.threatId;

        // Create the mob
        const mobId = EncounterState.createMob(threatId, ids);

        if (mobId) {
            this.clearMultiSelection();
            this.selectItem(mobId, 'mob');
            this.showNotification('Mob formed!');
        }
    },

    // ===== Detail Panel =====

    renderDetail() {
        const container = document.getElementById('encounter-detail');

        if (!this.selectedId) {
            container.innerHTML = `
                <div class="encounter-detail-placeholder">
                    <p>Select an entry to view details</p>
                </div>
            `;
            return;
        }

        if (this.selectionType === 'individual') {
            this.renderIndividualDetail(container);
        } else if (this.selectionType === 'mob') {
            this.renderMobDetail(container);
        } else if (this.selectionType === 'player') {
            this.renderPlayerDetail(container);
        }
    },

    renderPlayerDetail(container) {
        const pc = EncounterState.getPlayerCharacter(this.selectedId);
        if (!pc) {
            container.innerHTML = '<p>Player not found</p>';
            return;
        }

        container.innerHTML = `
            <div class="encounter-detail-content">
                <div class="detail-header">
                    <h3>${this.escapeHtml(pc.name)}</h3>
                    <span class="player-badge">PLAYER CHARACTER</span>
                </div>

                <div class="player-detail-initiative">
                    <label class="filter-label">Initiative</label>
                    <input type="number" id="player-detail-initiative" class="search-input"
                           value="${pc.initiative || ''}" placeholder="Initiative" min="1" max="99">
                </div>

                <div class="notes-section">
                    <label class="notes-label">Notes</label>
                    <textarea id="player-notes" class="notes-textarea" placeholder="Add notes...">${pc.notes || ''}</textarea>
                </div>
            </div>
        `;

        // Bind events
        document.getElementById('player-detail-initiative')?.addEventListener('change', (e) => {
            EncounterState.setPlayerCharacterInitiative(this.selectedId, e.target.value);
            this.renderPlayerCharacterInputs();
            this.renderEncounterList();
        });

        document.getElementById('player-notes')?.addEventListener('input', (e) => {
            EncounterState.updatePlayerCharacterNotes(this.selectedId, e.target.value);
        });
    },

    renderIndividualDetail(container) {
        const individual = EncounterState.getIndividual(this.selectedId);
        if (!individual) {
            container.innerHTML = '<p>Entry not found</p>';
            return;
        }

        const threat = DataLoader.getThreat(individual.threatId);
        if (!threat) {
            container.innerHTML = '<p>Threat data not found</p>';
            return;
        }

        const isDead = EncounterState.isIndividualDead(this.selectedId);

        container.innerHTML = `
            <div class="encounter-detail-content">
                <div class="detail-header">
                    <h3>${threat.name}</h3>
                    ${individual.bonus !== 'none' ? `<span class="bonus-badge bonus-${individual.bonus}">${individual.bonus === 'elite' ? 'ELITE' : 'ADVERSARY'}</span>` : ''}
                    ${isDead ? '<span class="status-badge dead-badge">DEAD</span>' : ''}
                </div>

                <div class="wound-shock-trackers">
                    <div class="large-tracker wounds-large">
                        <div class="tracker-label">Wounds</div>
                        <div class="tracker-controls">
                            <button class="tracker-btn" id="detail-wound-minus">-</button>
                            <span class="tracker-value">${individual.currentWounds} / ${individual.maxWounds}</span>
                            <button class="tracker-btn" id="detail-wound-plus">+</button>
                        </div>
                        <div class="tracker-bar">
                            <div class="tracker-bar-fill wounds-bar" style="width: ${(individual.currentWounds / individual.maxWounds) * 100}%"></div>
                        </div>
                    </div>
                    <div class="large-tracker shock-large">
                        <div class="tracker-label">Shock</div>
                        <div class="tracker-controls">
                            <button class="tracker-btn" id="detail-shock-minus">-</button>
                            <span class="tracker-value">${individual.currentShock} / ${individual.maxShock}</span>
                            <button class="tracker-btn" id="detail-shock-plus">+</button>
                        </div>
                        <div class="tracker-bar">
                            <div class="tracker-bar-fill shock-bar" style="width: ${(individual.currentShock / individual.maxShock) * 100}%"></div>
                        </div>
                    </div>
                </div>

                ${individual.mobId ? `
                    <div class="mob-membership">
                        <span>Part of: ${EncounterState.getMob(individual.mobId)?.name || 'Unknown Mob'}</span>
                        <button class="btn-secondary" id="btn-remove-from-mob">Remove from Mob</button>
                    </div>
                ` : ''}

                <div class="notes-section">
                    <label class="notes-label">Notes</label>
                    <textarea id="individual-notes" class="notes-textarea" placeholder="Add notes...">${individual.notes || ''}</textarea>
                </div>

                <div class="detail-actions">
                    <button class="btn-secondary" id="btn-duplicate-individual">Duplicate</button>
                    <button class="btn-danger" id="btn-remove-individual">Remove</button>
                </div>

                <div class="threat-card-mini">
                    ${this.renderThreatCardMini(threat)}
                </div>
            </div>
        `;

        // Bind events
        this.bindDetailEvents();
        Glossary.enhanceDescriptions(container);
    },

    renderMobDetail(container) {
        const mob = EncounterState.getMob(this.selectedId);
        if (!mob) {
            container.innerHTML = '<p>Mob not found</p>';
            return;
        }

        const threat = DataLoader.getThreat(mob.threatId);
        const members = EncounterState.getMobMembers(this.selectedId);
        const bonus = EncounterState.getMobAttackBonus(this.selectedId);
        const compatible = EncounterState.getCompatibleIndividualsForMob(mob.threatId);

        container.innerHTML = `
            <div class="encounter-detail-content">
                <div class="detail-header">
                    <h3>${mob.name}</h3>
                    <span class="mob-badge">MOB</span>
                </div>

                <div class="mob-stats">
                    <div class="mob-stat">
                        <span class="mob-stat-label">Members</span>
                        <span class="mob-stat-value">${bonus.count} alive / ${members.length} total</span>
                    </div>
                    <div class="mob-stat">
                        <span class="mob-stat-label">Attack Bonus</span>
                        <span class="mob-stat-value">+${bonus.bonus} dice (max ${bonus.max})</span>
                    </div>
                </div>

                <p class="mob-death-note">Members die if they take damage exceeding Resilience, or Shock equal to Max Shock.</p>

                <div class="mob-members-section">
                    <div class="mob-members-header">Members</div>
                    <div class="mob-members-list">
                        ${members.map(m => this.renderMobMemberItem(m, threat)).join('')}
                    </div>
                </div>

                ${compatible.length > 0 ? `
                    <div class="add-to-mob-section">
                        <div class="add-to-mob-header">Add Troops to Mob</div>
                        <div class="compatible-list">
                            ${compatible.map(c => `
                                <label class="compatible-item">
                                    <input type="checkbox" class="compatible-checkbox" data-id="${c.id}">
                                    <span>${threat.name} (W: ${c.currentWounds}/${c.maxWounds})</span>
                                </label>
                            `).join('')}
                        </div>
                        <button class="btn-secondary" id="btn-add-to-mob">Add Selected</button>
                    </div>
                ` : ''}

                <div class="split-mob-section">
                    <div class="split-mob-header">Split Mob</div>
                    <div class="split-controls">
                        <input type="number" id="split-count" class="split-input" placeholder="# to split" min="1" max="${bonus.count - 1}">
                        <button class="btn-secondary" id="btn-split-mob">Split</button>
                        <button class="btn-secondary" id="btn-disband-mob">Disband</button>
                    </div>
                </div>

                <div class="notes-section">
                    <label class="notes-label">Notes</label>
                    <textarea id="mob-notes" class="notes-textarea" placeholder="Add notes...">${mob.notes || ''}</textarea>
                </div>

                <div class="detail-actions">
                    <button class="btn-danger" id="btn-remove-mob">Remove Mob</button>
                </div>

                ${threat ? `
                    <div class="threat-card-mini">
                        ${this.renderThreatCardMini(threat)}
                    </div>
                ` : ''}
            </div>
        `;

        // Bind events
        this.bindMobDetailEvents();
        Glossary.enhanceDescriptions(container);
    },

    renderMobMemberItem(individual, threat) {
        const isDead = EncounterState.isIndividualDead(individual.id);
        const isDeadFromWounds = individual.currentWounds >= individual.maxWounds;
        const isDeadFromShock = individual.currentShock >= individual.maxShock;

        return `
            <div class="mob-member ${isDead ? 'dead' : ''}" data-id="${individual.id}">
                <div class="member-top-row">
                    <span class="member-name">${threat?.name || 'Unknown'}</span>
                    ${isDead ? `
                        <button class="member-revive-btn" data-id="${individual.id}" title="Revive">Revive</button>
                    ` : `
                        <button class="member-kill-btn" data-id="${individual.id}" title="Mark as Dead">Kill</button>
                    `}
                    <button class="member-remove-btn" data-id="${individual.id}" title="Remove from mob">×</button>
                </div>
                <div class="member-trackers">
                    <div class="member-tracker ${isDeadFromWounds ? 'tracker-death' : ''}">
                        <span class="tracker-label-mini">W</span>
                        <button class="member-stat-btn" data-id="${individual.id}" data-stat="wounds" data-delta="-1" ${isDead ? 'disabled' : ''}>-</button>
                        <span class="tracker-value-mini">${individual.currentWounds}/${individual.maxWounds}</span>
                        <button class="member-stat-btn" data-id="${individual.id}" data-stat="wounds" data-delta="1" ${isDead ? 'disabled' : ''}>+</button>
                    </div>
                    <div class="member-tracker ${isDeadFromShock ? 'tracker-death' : ''}">
                        <span class="tracker-label-mini">S</span>
                        <button class="member-stat-btn" data-id="${individual.id}" data-stat="shock" data-delta="-1" ${isDead ? 'disabled' : ''}>-</button>
                        <span class="tracker-value-mini">${individual.currentShock}/${individual.maxShock}</span>
                        <button class="member-stat-btn" data-id="${individual.id}" data-stat="shock" data-delta="1" ${isDead ? 'disabled' : ''}>+</button>
                    </div>
                </div>
            </div>
        `;
    },

    renderThreatCardMini(threat) {
        // Simplified threat card for the detail panel
        const keywordsHtml = (threat.keywords || []).map(kw =>
            `<span class="threat-keyword-mini">${kw}</span>`
        ).join('');

        const abilitiesHtml = (threat.abilities || []).map(ability => {
            let statsHtml = '';
            if (ability.type === 'ACTION' && ability.weaponId) {
                const weapon = DataLoader.getThreatWeapon(ability.weaponId);
                if (weapon) {
                    statsHtml = this.formatWeaponStats(weapon);
                }
            } else if (ability.stats) {
                statsHtml = `, ${ability.stats}`;
            }

            return `
                <div class="ability-mini">
                    <span class="ability-type-mini">${ability.type}:</span>
                    <span class="ability-name-mini" data-glossary-enhance>${ability.name}</span>
                    ${statsHtml ? `<span class="ability-stats-mini" data-glossary-enhance>${statsHtml}</span>` : ''}
                    ${ability.description ? `<div class="ability-desc-mini" data-glossary-enhance>${ability.description}</div>` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="mini-card">
                <div class="mini-card-header">Threat Stats</div>
                <div class="mini-card-body">
                    <div class="mini-stats-row">
                        <span class="mini-stat"><b>Defence:</b> ${threat.defence || '-'}</span>
                        <span class="mini-stat"><b>Resilience:</b> ${threat.resilience?.value || '-'}</span>
                    </div>
                    <div class="mini-stats-row">
                        <span class="mini-stat"><b>Shock:</b> ${threat.shock || '-'}</span>
                        <span class="mini-stat"><b>Speed:</b> ${threat.speed || '-'}</span>
                        <span class="mini-stat"><b>Size:</b> ${threat.size || '-'}</span>
                    </div>
                    <div class="mini-keywords">
                        ${keywordsHtml}
                    </div>
                    <div class="mini-abilities">
                        ${abilitiesHtml}
                    </div>
                </div>
            </div>
        `;
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

    bindDetailEvents() {
        const id = this.selectedId;

        // Wound buttons
        document.getElementById('detail-wound-minus')?.addEventListener('click', () => {
            EncounterState.updateWounds(id, -1);
            this.renderEncounterList();
            this.renderDetail();
        });

        document.getElementById('detail-wound-plus')?.addEventListener('click', () => {
            EncounterState.updateWounds(id, 1);
            this.renderEncounterList();
            this.renderDetail();
        });

        // Shock buttons
        document.getElementById('detail-shock-minus')?.addEventListener('click', () => {
            EncounterState.updateShock(id, -1);
            this.renderEncounterList();
            this.renderDetail();
        });

        document.getElementById('detail-shock-plus')?.addEventListener('click', () => {
            EncounterState.updateShock(id, 1);
            this.renderEncounterList();
            this.renderDetail();
        });

        // Notes
        document.getElementById('individual-notes')?.addEventListener('input', (e) => {
            EncounterState.updateIndividualNotes(id, e.target.value);
        });

        // Remove from mob
        document.getElementById('btn-remove-from-mob')?.addEventListener('click', () => {
            EncounterState.removeFromMob(id);
            this.renderEncounterList();
            this.renderDetail();
        });

        // Duplicate
        document.getElementById('btn-duplicate-individual')?.addEventListener('click', () => {
            const newId = EncounterState.duplicateIndividual(id);
            if (newId) {
                this.selectItem(newId, 'individual');
            }
        });

        // Remove
        document.getElementById('btn-remove-individual')?.addEventListener('click', () => {
            EncounterState.removeIndividual(id);
            this.selectedId = null;
            this.selectionType = null;
            this.renderEncounterList();
            this.renderDetail();
        });
    },

    bindMobDetailEvents() {
        const mobId = this.selectedId;

        // Member stat buttons (wounds and shock)
        document.querySelectorAll('.member-stat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const stat = btn.dataset.stat;
                const delta = parseInt(btn.dataset.delta);
                if (stat === 'wounds') {
                    EncounterState.updateWounds(id, delta);
                } else if (stat === 'shock') {
                    EncounterState.updateShock(id, delta);
                }
                this.renderEncounterList();
                this.renderDetail();
            });
        });

        // Member kill buttons
        document.querySelectorAll('.member-kill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                EncounterState.markAsDead(id);
                this.renderEncounterList();
                this.renderDetail();
            });
        });

        // Member revive buttons
        document.querySelectorAll('.member-revive-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                EncounterState.reviveIndividual(id);
                this.renderEncounterList();
                this.renderDetail();
            });
        });

        // Member remove buttons
        document.querySelectorAll('.member-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                EncounterState.removeFromMob(id);
                this.renderEncounterList();
                this.renderDetail();
            });
        });

        // Add to mob
        document.getElementById('btn-add-to-mob')?.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.compatible-checkbox:checked');
            const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
            if (ids.length > 0) {
                EncounterState.addToMob(mobId, ids);
                this.renderEncounterList();
                this.renderDetail();
            }
        });

        // Split mob - splits off N members into a new mob
        document.getElementById('btn-split-mob')?.addEventListener('click', () => {
            const input = document.getElementById('split-count');
            const splitCount = parseInt(input.value);
            const living = EncounterState.getMobLivingMembers(mobId).length;

            if (isNaN(splitCount) || splitCount < 1 || splitCount >= living) {
                return; // Invalid split count
            }

            // Split off the specified number into a new mob
            const newMobId = EncounterState.splitOffFromMob(mobId, splitCount);

            if (newMobId) {
                // Select the new mob
                this.selectItem(newMobId, 'mob');
            } else {
                this.renderEncounterList();
                this.renderDetail();
            }
        });

        document.getElementById('btn-disband-mob')?.addEventListener('click', () => {
            EncounterState.disbandMob(mobId);
            this.selectedId = null;
            this.selectionType = null;
            this.renderEncounterList();
            this.renderDetail();
        });

        // Notes
        document.getElementById('mob-notes')?.addEventListener('input', (e) => {
            EncounterState.updateMobNotes(mobId, e.target.value);
        });

        // Remove mob
        document.getElementById('btn-remove-mob')?.addEventListener('click', () => {
            EncounterState.removeMob(mobId);
            this.selectedId = null;
            this.selectionType = null;
            this.renderEncounterList();
            this.renderDetail();
        });
    },

    // ===== Event Handlers =====

    handleDuplicate(id, type) {
        if (type === 'individual') {
            const newId = EncounterState.duplicateIndividual(id);
            if (newId) {
                this.selectItem(newId, 'individual');
            }
        }
        // Mob duplication would create copies of all members
        this.renderEncounterList();
    },

    async handleSave() {
        const result = await EncounterState.saveEncounterToFile();

        if (result.success) {
            this.showNotification(`Encounter saved to file!`);
            this.renderSettings(); // Update name field with filename
        } else if (result.error) {
            this.showNotification(`Error saving: ${result.error}`);
        }
        // If canceled, do nothing
    },

    async handleLoad() {
        const result = await EncounterState.loadEncounterFromFile();

        if (result.success) {
            this.selectedId = null;
            this.selectionType = null;
            this.render();
            this.showNotification(`Encounter "${result.fileName}" loaded!`);
        } else if (result.error) {
            this.showNotification(`Error loading: ${result.error}`);
        }
        // If canceled, do nothing
    },

    showNotification(message) {
        // Remove any existing notification
        const existing = document.querySelector('.encounter-notification');
        if (existing) existing.remove();

        // Create notification
        const notification = document.createElement('div');
        notification.className = 'encounter-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    },

    handleClear() {
        if (confirm('Clear current encounter? This cannot be undone.')) {
            EncounterState.clearEncounter();
            this.selectedId = null;
            this.selectionType = null;
            this.render();
        }
    }
};
