/**
 * Card Engine — Renders provider data into categorized sections
 *
 * Card renderers register themselves via CardEngine.register().
 * The engine groups providers by category and renders sections.
 */

const CardEngine = (() => {
  const renderers = new Map();
  let container = null;
  let lastState = null;

  /**
   * Register a card renderer for a provider
   */
  function register(providerId, renderFn) {
    renderers.set(providerId, renderFn);
  }

  /**
   * Initialize the engine with a DOM container
   */
  function init(containerEl) {
    container = containerEl;
  }

  /**
   * Render all sections from state data
   */
  function render(state) {
    if (!container || !state) return;
    lastState = state;

    const { providers, categories, categories_config } = state;
    if (!providers || !categories_config) return;

    // Sort categories by order
    const sortedCategories = Object.entries(categories || {})
      .filter(([, providerIds]) => providerIds.length > 0)
      .sort(([a], [b]) => {
        const orderA = categories_config[a]?.order || 99;
        const orderB = categories_config[b]?.order || 99;
        return orderA - orderB;
      });

    // Build sections
    const fragment = document.createDocumentFragment();

    for (const [categoryId, providerIds] of sortedCategories) {
      const catConfig = categories_config[categoryId] || { title: categoryId, icon: '📦' };
      const section = createSection(categoryId, catConfig, providerIds, providers);
      fragment.appendChild(section);
    }

    // Smooth transition: only replace if structure changed
    const newHTML = fragment.cloneNode(true);
    container.innerHTML = '';
    container.appendChild(fragment);
  }

  /**
   * Create a section element for a category
   */
  function createSection(categoryId, catConfig, providerIds, providers) {
    const section = document.createElement('section');
    section.className = 'section';
    section.id = `section-${categoryId}`;

    // Section header
    const header = document.createElement('div');
    header.className = 'section__header';
    header.innerHTML = `
      <span class="section__icon">${catConfig.icon}</span>
      <h2 class="section__title">${catConfig.title}</h2>
      <span class="section__badge">${providerIds.length} source${providerIds.length !== 1 ? 's' : ''}</span>
    `;
    section.appendChild(header);

    // Card grid
    const grid = document.createElement('div');
    grid.className = 'card-grid';

    for (const providerId of providerIds) {
      const providerData = providers[providerId];
      if (!providerData) continue;

      const renderer = renderers.get(providerId);
      if (renderer) {
        try {
          const cardHTML = renderer(providerData.data, providerData.provider);
          const wrapper = document.createElement('div');
          wrapper.innerHTML = cardHTML;
          const card = wrapper.firstElementChild;
          if (card) grid.appendChild(card);
        } catch (e) {
          console.error(`[CardEngine] Render error for ${providerId}:`, e);
          grid.appendChild(createErrorCard(providerId, e.message));
        }
      } else {
        grid.appendChild(createFallbackCard(providerData));
      }
    }

    section.appendChild(grid);
    return section;
  }

  /**
   * Fallback card for providers without a custom renderer
   */
  function createFallbackCard(providerData) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__header">
        <span class="card__title">${providerData.provider.icon} ${providerData.provider.name}</span>
      </div>
      <div class="card__body">
        <pre style="font-size: var(--text-xs); overflow: auto; max-height: 200px;">${JSON.stringify(providerData.data, null, 2)}</pre>
      </div>
    `;
    return card;
  }

  /**
   * Error card when rendering fails
   */
  function createErrorCard(providerId, error) {
    const card = document.createElement('div');
    card.className = 'card card--accent-rose';
    card.innerHTML = `
      <div class="card__header">
        <span class="card__title">⚠️ ${providerId}</span>
      </div>
      <div class="card__body">
        <p class="text-muted">Render error: ${error}</p>
      </div>
    `;
    return card;
  }

  return { register, init, render };
})();
