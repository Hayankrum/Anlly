// Aplica o tema antes do primeiro paint (anti flash). Mantido em sincronia
// com ThemeProvider (chave 'meu-app:tema'); CSP exige script-src 'self',
// por isso fica em arquivo externo e não inline no index.html.
(function () {
  try {
    var tema = localStorage.getItem('meu-app:tema');
    if (tema !== 'claro' && tema !== 'escuro' && tema !== 'sistema') {
      tema = 'sistema';
    }
    var raiz = document.documentElement;
    raiz.setAttribute('data-theme', tema);
    var escuro =
      tema === 'escuro' ||
      (tema === 'sistema' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    raiz.style.colorScheme = escuro ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', escuro ? '#251c15' : '#faecdf');
    }
  } catch (erro) {}
})();
