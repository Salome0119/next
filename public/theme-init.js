(function() {
  try {
    var saved = localStorage.getItem('theme');
    var theme = saved && saved !== 'system' ? saved : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();