// =====================================================================
// Configuración de la página. Todo lo que hay que tocar para publicarla
// está en este archivo: de dónde se descarga cada archivo.
// =====================================================================
window.PES11 = window.PES11 || {};

window.PES11.Config = {
  // Online: relay cuando ni la URL (?sv= / ?server=) ni Ajustes indican otro; 'off' = offline.
  netServer: 'wss://sv.optijuegos.net/pes11',
  // Pestaña Online: página que abren los links de servidor privado.
  roomShareBase: '',
  // Loader de Emscripten (chico); va junto a esta página.
  engineScript: 'PES11Recomp.js',
  // Motor y datos precargados, comprimidos con brotli por el build para entrar
  // en el límite de 25 MiB por archivo de Cloudflare Pages.
  // También acepta los archivos sin comprimir (PES11Recomp.wasm / .data).
  wasm: 'PES11Recomp.wasm.br',
  data: 'PES11Recomp.data.br',
  // Datos del juego (pes11.pak de cpk_pack.py), leídos por partes con peticiones Range.
  // '' = /PSP_GAME/USRDIR/pes11.pak en este mismo sitio; 'off' = .cpk sueltos.
  pak: 'https://classroom-webpage.netlify.app/11_releasemodel.html',
  // Bloques de ambos bancos de relatos; se validan contra el PAK antes de usarlos.
  commentaryManifest: 'assets/pak-commentary.json',
  // Pestaña Chat: página embebida en un iframe; '' la oculta.
  chat: 'about:blank',
  // AdSense: se carga cuando el motor ya compiló (js/ads.js); '' lo desactiva.
  adsClient: 'ca-pub-7626037243619661'
};
