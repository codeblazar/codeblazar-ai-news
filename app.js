const state = {
  records: [],
  topStories: [],
  search: "",
  area: "All",
  usefulness: "All"
};

const elements = {
  search: document.querySelector("#search"),
  area: document.querySelector("#area"),
  usefulness: document.querySelector("#usefulness"),
  clear: document.querySelector("#clear-filters"),
  cards: document.querySelector("#cards"),
  topStories: document.querySelector("#top-stories"),
  topStoriesEmpty: document.querySelector("#top-stories-empty"),
  count: document.querySelector("#result-count"),
  updated: document.querySelector("#site-updated"),
  empty: document.querySelector("#empty-state"),
  error: document.querySelector("#error-state")
};

const areaColors = ["#2457d6", "#8a3ffc", "#087f5b", "#c2410c", "#b42318", "#0369a1"];
const topicBrands = {
  Claude: { color: "#D97757", asset: "claude.svg", fallback: "C" },
  Codex: { color: "#000000", asset: "openai.svg", fallback: ">_" },
  Grok: { color: "#000000", asset: "grok.svg", fallback: "G" },
  n8n: { color: "#EA4B71", asset: "n8n.svg", fallback: "n8n" }
};
const dataUrl = "https://n8n-nuc.codeblazar.org/webhook/codeblazar-ai-news";

const weatherDetails = code => {
  if (code === 0) return ["☀️", "Clear"];
  if ([1, 2].includes(code)) return ["🌤️", "Partly cloudy"];
  if (code === 3) return ["☁️", "Cloudy"];
  if ([45, 48].includes(code)) return ["🌫️", "Foggy"];
  if ([51, 53, 55, 56, 57].includes(code)) return ["🌦️", "Drizzle"];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["🌧️", "Rain"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["🌨️", "Snow"];
  if ([95, 96, 99].includes(code)) return ["⛈️", "Thunderstorms"];
  return ["🌡️", "Current weather"];
};

function loadWeather() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=1.3521&longitude=103.8198&current=temperature_2m,weather_code&timezone=Asia%2FSingapore";
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Weather request failed with ${response.status}`);
      return response.json();
    })
    .then(data => {
      const temperature = Math.round(data.current.temperature_2m);
      const [icon, description] = weatherDetails(data.current.weather_code);
      document.querySelector("#weather-icon").textContent = icon;
      document.querySelector("#weather-summary").textContent = `${temperature}°C · ${description}`;
      document.querySelector("#weather").hidden = false;
    })
    .catch(() => {});
}

function formatDate(value, includeTime = false) {
  const options = includeTime
    ? { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" }
    : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-SG", options).format(new Date(includeTime ? value : `${value}T00:00:00Z`));
}

function recentlyUpdated(value) {
  if (!value) return false;
  const age = Date.now() - Date.parse(value);
  return age >= 0 && age <= 48 * 60 * 60 * 1000;
}

function sourceIcon(type) {
  if (type === "x" || type === "github") {
    const label = type === "x" ? "X" : "GH";
    return `<span class="source-icon brand-icon" aria-hidden="true"><img src="assets/${type}.svg" alt=""><span>${label}</span></span>`;
  }
  if (type === "article") return '<span class="source-icon" aria-hidden="true">▤</span>';
  return '<span class="source-icon" aria-hidden="true">◎</span>';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cardHeading(action) {
  const text = String(action || "");
  const colon = text.indexOf(":");
  return colon === -1 ? text : text.slice(colon + 1).trim() || text;
}

function topicBrand(record) {
  if (/^Other AI:\s*Grok\b/i.test(record.action)) return { name: "Grok", ...topicBrands.Grok };
  const name = Object.keys(topicBrands).find(topic => topic.toLowerCase() === String(record.area).toLowerCase());
  return name ? { name, ...topicBrands[name] } : null;
}

function renderTopStories() {
  const stories = state.topStories.slice(0, 6);
  elements.topStories.innerHTML = stories.map(story => {
    const title = story.title || story.headline || "Untitled story";
    const summary = story.summary || story.description || "";
    const source = story.source || story.publisher || "Original source";
    const publishedAt = story.publishedAt || story.date;
    const date = publishedAt ? `<time datetime="${escapeHtml(publishedAt)}">${formatDate(String(publishedAt).slice(0, 10))}</time>` : "";
    const link = story.url
      ? `<a class="story-link" href="${escapeHtml(story.url)}" target="_blank" rel="noopener noreferrer">Read story</a>`
      : "";

    return `
      <article class="story-card">
        <div class="story-meta">
          <span class="story-source">${escapeHtml(source)}</span>
          ${date}
        </div>
        <h3>${escapeHtml(title)}</h3>
        ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
        ${link}
      </article>`;
  }).join("");
  elements.topStoriesEmpty.hidden = stories.length !== 0;
}

function render() {
  const query = state.search.trim().toLowerCase();
  const records = state.records
    .filter(record => state.area === "All" || record.area === state.area)
    .filter(record => state.usefulness === "All" || record.usefulness === state.usefulness)
    .filter(record => {
      if (!query) return true;
      const searchable = [record.area, record.action, ...record.sources.map(source => source.label)].join(" ").toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => b.latestPostDate.localeCompare(a.latestPostDate));

  const areas = [...new Set(state.records.map(record => record.area))].sort();
  const colorFor = area => areaColors[areas.indexOf(area) % areaColors.length];

  elements.cards.innerHTML = records.map((record, recordIndex) => {
    const brand = topicBrand(record);
    const topicName = brand?.name || record.area;
    const topicIcon = brand
      ? `<span class="area-icon topic-brand-icon" aria-hidden="true"><img src="assets/${brand.asset}" alt=""><span>${escapeHtml(brand.fallback)}</span></span>`
      : `<span class="area-icon" aria-hidden="true">${escapeHtml(record.icon)}</span>`;
    const originalX = record.sources.find(source => source.type === "x");
    const orderedSources = [
      ...(originalX ? [originalX] : []),
      ...record.sources.filter(source => source.type !== "x"),
      ...record.sources.filter(source => source.type === "x" && source !== originalX)
    ];
    const sourceListId = `card-sources-${recordIndex}`;
    const hiddenSourceCount = Math.max(orderedSources.length - 3, 0);
    const sources = orderedSources
      .map((source, sourceIndex) => `<a class="source-link${sourceIndex >= 3 ? " extra-source" : ""}" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(source.type)}: ${escapeHtml(source.label)}"${sourceIndex >= 3 ? " hidden" : ""}>${sourceIcon(source.type)}<span>${escapeHtml(source.label)}</span></a>`)
      .join("");
    const sourceToggle = hiddenSourceCount
      ? `<button class="source-toggle" type="button" aria-expanded="false" aria-controls="${sourceListId}" data-more-label="+${hiddenSourceCount} more">+${hiddenSourceCount} more</button>`
      : "";
    const updated = recentlyUpdated(record.contentUpdatedAt) ? '<span class="updated-badge">Updated</span>' : "";

    return `
      <article class="action-card" style="--area-color: ${brand?.color || colorFor(record.area)}">
        <div class="card-body">
          <div class="card-date-row">
            <time class="card-date" datetime="${record.latestPostDate}">Latest post · ${formatDate(record.latestPostDate)}</time>
            ${updated}
          </div>
          <div class="card-label-row">
            ${topicIcon}
            <span class="area-name">${escapeHtml(topicName)}</span>
            <span class="rating">${escapeHtml(record.usefulness)}</span>
          </div>
          <h2>${escapeHtml(cardHeading(record.action))}</h2>
          <div class="sources" id="${sourceListId}">${sources}${sourceToggle}</div>
        </div>
      </article>`;
  }).join("");

  elements.cards.querySelectorAll(".brand-icon img").forEach(icon => {
    icon.addEventListener("error", () => icon.closest(".brand-icon").classList.add("icon-missing"), { once: true });
  });

  elements.cards.querySelectorAll(".topic-brand-icon img").forEach(icon => {
    icon.addEventListener("error", () => icon.closest(".topic-brand-icon").classList.add("icon-missing"), { once: true });
  });

  elements.cards.querySelectorAll(".source-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      const sourceList = document.getElementById(toggle.getAttribute("aria-controls"));
      sourceList.querySelectorAll(".extra-source").forEach(source => { source.hidden = expanded; });
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.textContent = expanded ? toggle.dataset.moreLabel : "Show less";
    });
  });

  elements.count.textContent = records.length;
  elements.empty.hidden = records.length !== 0;
}

function populateAreas() {
  const areas = [...new Set(state.records.map(record => record.area))].sort();
  elements.area.insertAdjacentHTML("beforeend", areas.map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`).join(""));
}

elements.search.addEventListener("input", event => { state.search = event.target.value; render(); });
elements.area.addEventListener("change", event => { state.area = event.target.value; render(); });
elements.usefulness.addEventListener("change", event => { state.usefulness = event.target.value; render(); });
elements.clear.addEventListener("click", () => {
  state.search = "";
  state.area = "All";
  state.usefulness = "All";
  elements.search.value = "";
  elements.area.value = "All";
  elements.usefulness.value = "All";
  render();
  elements.search.focus();
});

fetch(dataUrl)
  .then(response => {
    if (!response.ok) throw new Error(`Data request failed with ${response.status}`);
    return response.json();
  })
  .then(data => {
    state.records = Array.isArray(data.records) ? data.records : [];
    state.topStories = Array.isArray(data.topStories) ? data.topStories : [];
    elements.updated.textContent = formatDate(data.siteUpdatedAt, true);
    populateAreas();
    renderTopStories();
    render();
  })
  .catch(() => {
    elements.updated.textContent = "Unavailable";
    elements.error.hidden = false;
  });

loadWeather();
