window.addEventListener('keydown', function (e) {
  console.log(e.keyCode);
  const key = document.querySelector(`.key[data-key='${e.keyCode}']`);
  const audio = document.querySelector(`audio[data-key='${e.keyCode}']`);

  if (!audio) return;

  audio.currentTime = 0;
  audio.play();
  key.classList.add('playing');
  setTimeout(function () {
    key.classList.remove('playing');
  }, 1000);
});

function removeTransition (e) {
  if (e.propertyName !== 'transform') return;
  this.classList.remove('playing');
}

const keys = document.querySelectorAll('.key');
keys.forEach(key => key.addEventListener('transitionend', removeTransition));
