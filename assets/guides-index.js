// Progressive enhancement: all editorial links remain in static HTML for crawlers,
// keyboard users and visitors who disable JavaScript.
const search = document.querySelector('[data-guides-search]');
if (search) {
  const articles = [...document.querySelectorAll('[data-guide-row]')];
  const groups = [...document.querySelectorAll('[data-guide-section]')];
  const count = document.querySelector('[data-guide-count]');
  const empty = document.querySelector('[data-guide-empty]');
  const apply = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const article of articles) {
      const match = !query || (article.dataset.search || '').includes(query);
      article.hidden = !match;
      if (match) visible++;
    }
    for (const group of groups) {
      group.hidden = !group.querySelector('[data-guide-row]:not([hidden])');
    }
    if (count) count.textContent = visible + (visible === 1 ? ' guide' : ' guides');
    if (empty) empty.hidden = visible > 0;
  };
  search.addEventListener('input', apply);
}
