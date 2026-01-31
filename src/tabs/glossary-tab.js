// Glossary Tab - Displays searchable glossary of game terms

const GlossaryTab = {
    currentCategory: 'all',
    searchText: '',
    expandedEntries: new Set(),

    init() {
        // Initialize search
        const searchInput = document.getElementById('glossary-search');
        searchInput.addEventListener('input', (e) => {
            this.searchText = e.target.value.toLowerCase();
            this.renderGlossary();
        });

        // Initialize category filters
        const filterButtons = document.querySelectorAll('.glossary-filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setCategory(btn.dataset.category);
            });
        });

        // Render initial glossary
        this.renderGlossary();
    },

    refresh() {
        this.renderGlossary();
    },

    setCategory(category) {
        this.currentCategory = category;

        // Update button states
        document.querySelectorAll('.glossary-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        this.renderGlossary();
    },

    getCategoryLabel(category) {
        const labels = {
            'conditions': 'Conditions',
            'terms': 'Game Rules',
            'combatTerms': 'Combat Rules',
            'weaponTraits': 'Weapon Traits',
            'armorTraits': 'Armor Traits',
            'keywords': 'Keywords',
            'characterTerms': 'Character Terms'
        };
        return labels[category] || category;
    },

    renderGlossary() {
        const glossaryData = DataLoader.getGlossary();
        const container = document.getElementById('glossary-content');

        if (!glossaryData) {
            container.innerHTML = '<div class="glossary-empty">Loading glossary...</div>';
            return;
        }

        // Get categories to display
        const categories = this.currentCategory === 'all'
            ? ['characterTerms', 'conditions', 'combatTerms', 'terms', 'weaponTraits', 'armorTraits', 'keywords']
            : [this.currentCategory];

        let html = '';

        for (const category of categories) {
            const categoryData = glossaryData[category];
            if (!categoryData) continue;

            // Get and filter entries
            let entries = Object.entries(categoryData).map(([key, value]) => ({
                key,
                ...value,
                category
            }));

            // Apply search filter
            if (this.searchText) {
                entries = entries.filter(entry =>
                    entry.name.toLowerCase().includes(this.searchText) ||
                    entry.description.toLowerCase().includes(this.searchText)
                );
            }

            if (entries.length === 0) continue;

            // Sort alphabetically
            entries.sort((a, b) => a.name.localeCompare(b.name));

            html += `
                <div class="glossary-group">
                    <h3 class="glossary-group-title">${this.getCategoryLabel(category)}</h3>
                    <div class="glossary-entries">
                        ${entries.map(entry => this.renderEntry(entry)).join('')}
                    </div>
                </div>
            `;
        }

        if (!html) {
            container.innerHTML = '<div class="glossary-empty">No entries found</div>';
            return;
        }

        container.innerHTML = html;

        // Attach click handlers
        container.querySelectorAll('.glossary-entry-header').forEach(header => {
            header.addEventListener('click', () => {
                const entry = header.closest('.glossary-entry');
                const entryId = entry.dataset.entryId;
                this.toggleEntry(entryId, entry);
            });
        });

        // Enhance glossary terms in descriptions
        container.querySelectorAll('.glossary-entry-description').forEach(el => {
            Glossary.enhanceElement(el);
        });
    },

    renderEntry(entry) {
        const isExpanded = this.expandedEntries.has(entry.key);
        const entryId = `${entry.category}-${entry.key}`;

        return `
            <div class="glossary-entry ${isExpanded ? 'expanded' : ''}" data-entry-id="${entryId}">
                <div class="glossary-entry-header">
                    <span class="glossary-entry-expand">▶</span>
                    <span class="glossary-entry-name">${entry.name}</span>
                    <span class="glossary-entry-category">${this.getCategoryLabel(entry.category)}</span>
                </div>
                <div class="glossary-entry-body ${isExpanded ? '' : 'hidden'}">
                    <div class="glossary-entry-description">${entry.description}</div>
                </div>
            </div>
        `;
    },

    toggleEntry(entryId, entryElement) {
        const body = entryElement.querySelector('.glossary-entry-body');

        if (this.expandedEntries.has(entryId)) {
            this.expandedEntries.delete(entryId);
            entryElement.classList.remove('expanded');
            body.classList.add('hidden');
        } else {
            this.expandedEntries.add(entryId);
            entryElement.classList.add('expanded');
            body.classList.remove('hidden');

            // Enhance glossary terms if not already done
            const description = body.querySelector('.glossary-entry-description');
            if (description && !description.dataset.enhanced) {
                Glossary.enhanceElement(description);
                description.dataset.enhanced = 'true';
            }
        }
    }
};
