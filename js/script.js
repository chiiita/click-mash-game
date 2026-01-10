// =====================
// 状態（ゲームの中身）
// =====================
let score = 0;
let time = 10;           // 現在の残り時間
let limit = 10;          // 選ばれた制限時間
let timerId = null;
let isPlaying = false;

// =====================
// 画面要素
// =====================
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const highScoreEl = document.getElementById("highScore");

const resultTitleEl = document.getElementById("resultTitle");
const resultTextEl = document.getElementById("resultText");
const medalEmojiEl = document.getElementById("medalEmoji");

const clickBtn = document.getElementById("clickBtn");
const resetBtn = document.getElementById("resetBtn");
const difficultyEl = document.getElementById("difficulty");
const soundToggleEl = document.getElementById("soundToggle");
const targetsEl = document.getElementById("targets");
const fxLayer = document.getElementById("fxLayer");

// =====================
// 難易度ごとの目標（銅/銀/金）
// ※ここを調整すれば難易度バランス変更できる
// =====================
const TARGETS = {
  5:  { bronze: 20, silver: 30, gold: 40 },
  10: { bronze: 40, silver: 60, gold: 80 },
  30: { bronze: 120, silver: 170, gold: 220 },
};

// =====================
// ハイスコア（保存）
// =====================
const HIGH_SCORE_KEY = "clickMashHighScore";
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);

// =====================
// 効果音（ビープ）
// =====================
let audioCtx = null;

// ★重要：音はユーザー操作後なら鳴らせる（ブラウザ制限対策）
function beep(freq = 880, durationMs = 40) {
  if (!soundToggleEl.checked) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.value = freq;
  osc.type = "square";     // レトロっぽい音
  gain.gain.value = 0.06;  // 音量

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  setTimeout(() => osc.stop(), durationMs);
}

// =====================
// 表示更新
// =====================
function render() {
  scoreEl.textContent = score;
  timeEl.textContent = time;
  highScoreEl.textContent = highScore;
}

// 目標表示を更新
function renderTargets() {
  const t = TARGETS[limit];
  targetsEl.innerHTML = `
    <span class="badge">🥉 銅 <strong>${t.bronze}</strong> 回</span>
    <span class="badge">🥈 銀 <strong>${t.silver}</strong> 回</span>
    <span class="badge">🥇 金 <strong>${t.gold}</strong> 回</span>
  `;
}

// =====================
// メダル判定
// =====================
function judge(score, limit) {
  const t = TARGETS[limit];

  if (score >= t.gold) {
    return { emoji: "🥇", title: "金メダル！", next: null };
  }
  if (score >= t.silver) {
    return { emoji: "🥈", title: "銀メダル！", next: t.gold };
  }
  if (score >= t.bronze) {
    return { emoji: "🥉", title: "銅メダル！", next: t.silver };
  }
  return { emoji: "🫥", title: "メダルなし…", next: t.bronze };
}

// =====================
// FX: レトロ紙吹雪（ドット粒子）
// =====================
function burstPixels(intensity = 24) {
  const rect = fxLayer.getBoundingClientRect();
  const originX = rect.width * 0.5;
  const originY = rect.height * 0.35;

  for (let i = 0; i < intensity; i++) {
    const px = document.createElement("div");
    px.className = "px";

    // 色を少し変える（レトロっぽく）
    const colors = [
      "rgba(105,255,204,0.95)",  // ネオン
      "rgba(255,79,216,0.95)",   // ピンク
      "rgba(255,224,107,0.95)",  // 黄色
      "rgba(232,240,255,0.95)"   // 白
    ];
    px.style.background = colors[Math.floor(Math.random() * colors.length)];

    px.style.left = `${originX}px`;
    px.style.top = `${originY}px`;

    // 飛び方を乱数で決定（CSS変数で渡す）
    const x0 = (Math.random() * 40 - 20);
    const y0 = (Math.random() * 10 - 5);

    const x1 = (Math.random() * 400 - 200);
    const y1 = (Math.random() * 220 - 120);

    const x2 = x1 * 1.2;
    const y2 = y1 + (Math.random() * 220 + 160);

    px.style.setProperty("--x0", `${x0}px`);
    px.style.setProperty("--y0", `${y0}px`);
    px.style.setProperty("--x1", `${x1}px`);
    px.style.setProperty("--y1", `${y1}px`);
    px.style.setProperty("--x2", `${x2}px`);
    px.style.setProperty("--y2", `${y2}px`);

    fxLayer.appendChild(px);
    setTimeout(() => px.remove(), 900);
  }
}

// =====================
// 結果表示
// =====================
function showResult(score, limit) {
  const j = judge(score, limit);

  medalEmojiEl.textContent = j.emoji;
  resultTitleEl.textContent = j.title;

  if (j.next === null) {
    resultTextEl.textContent = `結果：${score}回！最高ランク達成！`;
    burstPixels(42);
  } else {
    resultTextEl.textContent = `結果：${score}回！次は ${j.next}回 を目指そう！`;
    // メダルが上ほど派手に
    if (j.emoji === "🥈") burstPixels(32);
    else if (j.emoji === "🥉") burstPixels(24);
    else burstPixels(14);
  }
}

// =====================
// ゲーム開始
// =====================
function startGame() {
  isPlaying = true;

  // 結果欄をリセット
  medalEmojiEl.textContent = "";
  resultTitleEl.textContent = "";
  resultTextEl.textContent = "";

  // ★開始したらクリックボタン有効
  clickBtn.disabled = false;

  timerId = setInterval(() => {
    time--;
    render();

    if (time <= 0) {
      endGame();
    }
  }, 1000);
}

// =====================
// ゲーム終了
// =====================
function endGame() {
  clearInterval(timerId);
  timerId = null;
  isPlaying = false;

  // ★重要：時間切れ後は押せない（＝増えない）
  clickBtn.disabled = true;

  // ハイスコア更新
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }

  render();
  showResult(score, limit);

  // 終了音（低め）
  beep(220, 120);
}

// =====================
// クリック処理
// =====================
clickBtn.addEventListener("click", () => {
  // ★ゲーム中以外は増えない（保険）
  if (!isPlaying) {
    // 初回クリックでスタート（開始クリックを加点しない＝公平）
    startGame();
    beep(660, 60);
    return;
  }

  score++;
  render();

  beep(880, 35);

  // ボタンの“ポップ”演出
  clickBtn.classList.remove("pop");
  void clickBtn.offsetWidth; // ★再発火
  clickBtn.classList.add("pop");
});

// =====================
// 難易度変更
// =====================
difficultyEl.addEventListener("change", () => {
  if (isPlaying) return; // ゲーム中は変更しない

  limit = Number(difficultyEl.value);
  time = limit;

  renderTargets();
  render();
});

// =====================
// リセット
// =====================
resetBtn.addEventListener("click", () => {
  clearInterval(timerId);
  timerId = null;

  score = 0;
  isPlaying = false;

  limit = Number(difficultyEl.value);
  time = limit;

  // 表示クリア
  medalEmojiEl.textContent = "";
  resultTitleEl.textContent = "";
  resultTextEl.textContent = "";

  // ★リセットしたら押せる（初回クリックで開始）
  clickBtn.disabled = false;

  renderTargets();
  render();

  // リセット音
  beep(520, 60);
});

// =====================
// 初期化
// =====================
limit = Number(difficultyEl.value);
time = limit;

renderTargets();
render();

// 初期は押せる（押したらスタート）
clickBtn.disabled = false;
