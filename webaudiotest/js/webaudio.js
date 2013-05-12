var context;
window.addEventListener('load', init, false);
function init() {
  try {
    context = new webkitAudioContext();
  }
  catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
}