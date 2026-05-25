const CARD_TYPES = {
  MONSTER: { type: 'monster', emoji: '👹', label: 'Monstruo' },
  MAGE: { type: 'mage', emoji: '🔮', label: 'Hechicero' },
  SHIELD: { type: 'shield', emoji: '🛡️', label: 'Escudo' },
  POTION: { type: 'potion', emoji: '🧪', label: 'Poción' },
  WEAPON: { type: 'weapon', emoji: '⚔️', label: 'Arma' } // <-- NUEVA CARTA
};

let gameState = {
  deck: [],
  dungeonRow: [],
  player: { hp: 20, maxHp: 20, shield: 5, maxShield: 15, atk: 5, maxAtk: 15 },
  gameOver: false,
  score: 0,
  combo: 1,
  highScore: 0, // <-- NUEVO: Agrega esta línea para evitar el error
  hasRevived: false // <-- NUEVO: Control de resurrección
};

let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

// (La función playSound se mantiene igual a la que tienes)


function playSound(type) {
  initAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'hit') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  } else if (type === 'magic') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.25);
    gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  } else if (type === 'shield') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  } else if (type === 'heal') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.07); osc.frequency.setValueAtTime(900, now + 0.14);
    gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  } else if (type === 'combo') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(500 + (gameState.combo * 40), now);
    gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  } else {
    osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  }
  osc.start(now); osc.stop(now + 0.25);
}

document.addEventListener('DOMContentLoaded', () => {
  // Cargar el récord guardado antes de iniciar
  gameState.highScore = parseInt(localStorage.getItem('dungeon_highscore')) || 0;

  // Abrir Créditos
  const btnCredits = document.getElementById('btn-credits');
  if (btnCredits) {
    btnCredits.addEventListener('click', () => {
      playSound('click');
      const creditsPanel = document.getElementById('credits-panel');
      if (creditsPanel) creditsPanel.style.display = 'flex';
    });
  }

  // Cerrar Créditos
  const btnCloseCredits = document.getElementById('btn-close-credits');
  if (btnCloseCredits) {
    btnCloseCredits.addEventListener('click', () => {
      playSound('click');
      const creditsPanel = document.getElementById('credits-panel');
      if (creditsPanel) creditsPanel.style.display = 'none';
    });
  }

  // --- BOTONES DEL MENÚ PRINCIPAL ---
  // Botón Iniciar Juego
  document.getElementById('btn-start-game').addEventListener('click', () => {
    playSound('click');
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-zone').style.display = 'block';
    initGame(); // <-- Aquí es donde arranca de verdad
  });

  // Botón Abrir Ayuda
  document.getElementById('btn-how-to').addEventListener('click', () => {
    playSound('click');
    document.getElementById('help-panel').style.display = 'flex';
  });

  // Botón Cerrar Ayuda
  document.getElementById('btn-close-help').addEventListener('click', () => {
    playSound('click');
    document.getElementById('help-panel').style.display = 'none';
  });

  // Controles estándar de la partida
  document.getElementById('btn-skip').addEventListener('click', () => { playSound('click'); skipVanguard(); });
  document.getElementById('btn-modal-restart').addEventListener('click', () => { playSound('click'); initGame(); });
  document.getElementById('btn-restart').addEventListener('click', () => { playSound('click'); initGame(); });
});

function initGame() {
  gameState.hasRevived = false;
  gameState.deck = [];
  // Generar cartas para los 5 tipos
  for (const key in CARD_TYPES) {
    for (let v = 2; v <= 14; v++) {
      gameState.deck.push({
        value: v,
        type: CARD_TYPES[key].type,
        emoji: CARD_TYPES[key].emoji,
        label: CARD_TYPES[key].label
      });
    }
  }
  // Barajado
  for (let i = gameState.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
  }
  gameState.player.hp = 20; gameState.player.shield = 5; gameState.player.atk = 5;
  gameState.dungeonRow = []; gameState.gameOver = false; gameState.score = 0; gameState.combo = 1;

  for (let i = 0; i < 3; i++) {
    if (gameState.deck.length > 0) gameState.dungeonRow.push(gameState.deck.pop());
  }

  // --- CORRECCIÓN AQUÍ ---
  // Nos aseguramos de que la zona del juego pase de 'none' a 'block' para que sea visible
  document.getElementById('game-zone').style.display = 'block';

  document.getElementById('overlay').style.display = 'none';
  document.getElementById('btn-restart').style.display = 'none';
  document.getElementById('btn-skip').style.display = 'block';
  render();
}


function handleCardClick(index) {
  if (gameState.gameOver || index !== 0) return;
  initAudio();
  const card = gameState.dungeonRow[index];
  const cardElement = document.querySelectorAll('.card')[index];
  if (cardElement) cardElement.classList.add('burn-anim');

  setTimeout(() => {
    let damageText = ''; let textColor = '#fff';

    // COMBATE: Monstruo o Hechicero
    if (card.type === 'monster' || card.type === 'mage') {
      let enemyPower = card.value;
      let usedAtk = Math.min(gameState.player.atk, enemyPower);
      gameState.player.atk -= usedAtk;
      enemyPower -= usedAtk;

      if (enemyPower <= 0) {
        damageText = `⚔️ -${usedAtk} Atk`; textColor = '#10b981'; playSound('shield');
      } else {
        if (card.type === 'monster') {
          if (gameState.player.shield > 0) {
            let blocked = Math.min(gameState.player.shield, enemyPower);
            gameState.player.shield -= blocked; enemyPower -= blocked;
          }
          if (enemyPower > 0) {
            gameState.player.hp -= enemyPower; damageText = `💥 -${enemyPower} Vida`;
          } else {
            damageText = `🛡️ Bloqueado`;
          }
          textColor = '#ef4444';
        } else {
          gameState.player.hp -= enemyPower; damageText = `🔮 -${enemyPower} Vida`; textColor = '#a855f7';
        }
        playSound(card.type === 'monster' ? 'hit' : 'magic'); triggerScreenShake();
      }
      gameState.score += 10 * gameState.combo;
      damageText += ` (+${10 * gameState.combo})`;
      gameState.combo += 1; playSound('combo');
      const comboEl = document.getElementById('stat-combo');
      if (comboEl) {
        comboEl.classList.remove('combo-pump'); void comboEl.offsetWidth; comboEl.classList.add('combo-pump');
      }

      // ESCUDO: Solo repara defensas
    } else if (card.type === 'shield') {
      gameState.player.shield = Math.min(gameState.player.shield + card.value, gameState.player.maxShield);
      damageText = `🛡️ +${card.value} Escudo`; textColor = '#60a5fa';
      gameState.combo = 1; playSound('shield');

      // ARMA: Recarga ataque respetando el límite máximo de 15
    } else if (card.type === 'weapon') {
      gameState.player.atk = Math.min(gameState.player.atk + card.value, gameState.player.maxAtk);
      damageText = `⚔️ +${card.value} Ataque`; textColor = '#fb923c';
      gameState.combo = 1; playSound('shield');

      // POCIÓN: Recupera salud
    } else if (card.type === 'potion') {
      gameState.player.hp = Math.min(gameState.player.hp + card.value, gameState.player.maxHp);
      damageText = `❤️ +${card.value}`; textColor = '#34d399';
      gameState.combo = 1; playSound('heal');
    }

    // Crear los textos voladores en pantalla
    const container = document.querySelector('.game-container');
    if (container) {
      const el = document.createElement('div');
      el.className = 'floating-text'; el.innerText = damageText; el.style.color = textColor;
      el.style.left = '32%'; el.style.top = '48%'; container.appendChild(el);
      setTimeout(() => el.remove(), 700);
    }

    // Avanzar la fila y robar nueva carta
    gameState.dungeonRow.shift();
    if (gameState.deck.length > 0) gameState.dungeonRow.push(gameState.deck.pop());

    // Comprobación final de condiciones de derrota / victoria
    if (gameState.player.hp <= 0 || (gameState.dungeonRow.length === 0 && gameState.deck.length === 0)) {
      let esVictoria = gameState.player.hp > 0;
      if (!esVictoria) gameState.player.hp = 0;
      gameState.gameOver = true;

      let nuevoRecord = false;
      if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('dungeon_highscore', gameState.highScore);
        nuevoRecord = true;
      }

      const overlayTitle = document.getElementById('overlay-title');
      if (overlayTitle) overlayTitle.innerText = esVictoria ? '🏆 ¡VICTORIA!' : '☠️ ¡HAS CAÍDO!';

      let mensajeFinal = esVictoria ? '¡Sobreviviste a la mazmorra!' : 'Los peligros pudieron contigo.';
      if (nuevoRecord) mensajeFinal += `<br><br><span style="color: #f59e0b; font-weight: bold;">🔥 ¡NUEVO RÉCORD MÁXIMO! 🔥</span>`;

      const overlayMsg = document.getElementById('overlay-message');
      if (overlayMsg) overlayMsg.innerHTML = `${mensajeFinal}<br><br><strong>Puntuación Final: ${gameState.score}</strong>`;

      //boton revivir con anuncios
      const btnRevive = document.getElementById('btn-revive');
      if (btnRevive) {
        //btnRevive.style.display = (!esVictoria && !gameState.hasRevived) ? 'block' : 'none';

        // Y pon esto en su lugar para asegurar que siempre se quede oculto:
        btnRevive.style.display = 'none';
      }
      //////7

      const overlay = document.getElementById('overlay');
      if (overlay) overlay.style.display = 'flex';

      const btnSkip = document.getElementById('btn-skip');
      if (btnSkip) btnSkip.style.display = 'none';
    }
    render();
  }, 180);
}




function triggerScreenShake() {
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 300);
}

function skipVanguard() {
  if (gameState.gameOver || gameState.dungeonRow.length === 0) return;
  if (gameState.player.hp > 1) {
    gameState.player.hp -= 1; gameState.combo = 1;
    const skippedCard = gameState.dungeonRow.shift();
    gameState.deck.unshift(skippedCard);
    if (gameState.deck.length > 0) gameState.dungeonRow.push(gameState.deck.pop());
    render();
  }
}

function render() {
  document.getElementById('stat-hp').innerText = `${gameState.player.hp}/${gameState.player.maxHp}`;
  document.getElementById('stat-shield').innerText = `${gameState.player.shield}/${gameState.player.maxShield}`;
  document.getElementById('stat-deck').innerText = gameState.deck.length;
  document.getElementById('stat-combo').innerText = `x${gameState.combo}`;
  document.getElementById('stat-atk').innerText = gameState.player.atk;
  document.getElementById('stat-score').innerText = gameState.score;

  document.getElementById('bar-hp').style.width = `${(gameState.player.hp / gameState.player.maxHp) * 100}%`;
  document.getElementById('bar-shield').style.width = `${(gameState.player.shield / gameState.player.maxShield) * 100}%`;

  document.getElementById('stat-high-score').innerText = gameState.highScore;

  const container = document.getElementById('dungeon-row');
  container.innerHTML = '';

  gameState.dungeonRow.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card draw-anim';
    if (index === 0) cardEl.classList.add('vanguard');
    cardEl.setAttribute('data-type', card.type);
    cardEl.innerHTML = `<div class="card-value">${card.value}</div><div class="card-emoji">${card.emoji}</div><div class="card-title">${card.label}</div>`;
    cardEl.addEventListener('click', () => handleCardClick(index));
    document.body.classList.remove('shake');
  }, 300);
}

function skipVanguard() {
  if (gameState.gameOver || gameState.dungeonRow.length === 0) return;
  if (gameState.player.hp > 1) {
    gameState.player.hp -= 1;
    gameState.combo = 1;
    const skippedCard = gameState.dungeonRow.shift();
    gameState.deck.unshift(skippedCard);
    if (gameState.deck.length > 0) gameState.dungeonRow.push(gameState.deck.pop());
    render();
  }
}

function render() {
  document.getElementById('stat-hp').innerText = `${gameState.player.hp}/${gameState.player.maxHp}`;

  document.getElementById('stat-shield').innerText = `${gameState.player.shield}/${gameState.player.maxShield}`;

  document.getElementById('stat-deck').innerText = gameState.deck.length;

  document.getElementById('stat-combo').innerText = `x${gameState.combo}`;
  document.getElementById('stat-atk').innerText = gameState.player.atk;
  document.getElementById('stat-score').innerText = gameState.score;

  document.getElementById('bar-hp').style.width = `${(gameState.player.hp / gameState.player.maxHp) * 100}%`;

  document.getElementById('bar-shield').style.width = `${(gameState.player.shield / gameState.player.maxShield) * 100}%`;

  document.getElementById('stat-high-score').innerText = gameState.highScore;

  const container = document.getElementById('dungeon-row');
  container.innerHTML = '';

  gameState.dungeonRow.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card draw-anim';
    if (index === 0) cardEl.classList.add('vanguard');
    cardEl.setAttribute('data-type', card.type);
    cardEl.innerHTML = `<div class="card-value">${card.value}</div><div class="card-emoji">${card.emoji}</div><div class="card-title">${card.label}</div>`;
    cardEl.addEventListener('click', () => handleCardClick(index));
    container.appendChild(cardEl);
  });
}
// Registrar el Service Worker de la PWA de forma segura
if ('service worker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('PWA: ¡Service Worker registrado con éxito!', reg))
      .catch(err => console.log('PWA: Error al registrar el Service Worker', err));
  });
}
