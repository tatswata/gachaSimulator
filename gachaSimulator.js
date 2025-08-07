function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function drawGroup(rarity, maxLevel, bigHitRates, slotCount) {
  let group = [];
  for (let i = 0; i < slotCount; i++) {
    const isHit = Math.random() < rarity;
    if (isHit) {
      const bigHitProb = bigHitRates[rarity] || 0;
      const isBigHit = Math.random() < bigHitProb;
      const score = isBigHit ? getRandomInt(1, maxLevel) : 0;
      group.push(score);
    } else {
      group.push(0);
    }
  }
  return group;
}

const bigHitRates = {
  0.05: 1 / 9, // SR
  0.25: 1 / 7, // R
  0.7: 1 / 18, // C
};

let state = {
  rounds: 0,
  topGroups: [],
  running: false,
};

function startGacha() {
  state.rounds = 0;
  state.topGroups = [];
  state.running = true;

  document.getElementById("startButton").disabled = true;
  const mode = document.querySelector('input[name="mode"]:checked').value;

  if (mode === "stat") {
    runStatistics(); // 統計モード
  } else {
    runBulkDraw(); // 1回達成モード
  }
}

function runBulkDraw() {
  const rarity = parseFloat(document.getElementById("rarity").value);
  const maxLevel = parseInt(document.getElementById("maxLevel").value);
  const targetTotal = parseInt(document.getElementById("targetTotal").value);
  const pickCount = parseInt(document.getElementById("pickCount").value);
  const slotCount = parseInt(document.getElementById("slotCount").value);
  const output = document.getElementById("output");

  const mode = document.querySelector('input[name="mode"]:checked').value;
  const BATCH_SIZE = mode === "ultra" ? 10_000_000 : 1000;
  let topTotal = 0;

  for (let i = 0; i < BATCH_SIZE; i++) {
    state.rounds++;

    let group = drawGroup(rarity, maxLevel, bigHitRates, slotCount);
    const groupTotal = group.reduce((a, b) => a + b, 0);
    state.topGroups.push({ group, total: groupTotal });
    state.topGroups.sort((a, b) => b.total - a.total);
    if (state.topGroups.length > pickCount) {
      state.topGroups.length = pickCount;
    }
    topTotal = state.topGroups.reduce((sum, g) => sum + g.total, 0);
    if (topTotal >= targetTotal) break;
  }

  const topGroups = state.topGroups;

  output.innerHTML = `
    ${topTotal >= targetTotal ? "<p><strong>終了！</strong></p>" : ""}
    <p><strong>改造回数:</strong> ${state.rounds}</p>
    <p><strong>スキルの合計点:</strong> ${topTotal}</p>
    <ul>
      ${topGroups
        .map((g) => `<li>${g.group.join(", ")} → 合計 ${g.total}</li>`)
        .join("")}
    </ul>
  `;

  if (topTotal >= targetTotal) {
    document.getElementById("startButton").disabled = false;
    state.running = false;
  } else {
    setTimeout(runBulkDraw, 0);
  }
}

function runStatistics() {
  const rarity = parseFloat(document.getElementById("rarity").value);
  const maxLevel = parseInt(document.getElementById("maxLevel").value);
  const targetTotal = parseInt(document.getElementById("targetTotal").value);
  const pickCount = parseInt(document.getElementById("pickCount").value);
  const slotCount = parseInt(document.getElementById("slotCount").value);

  const TRIALS = 1000;
  const results = [];
  const output = document.getElementById("output");

  // 非同期にしてブラウザがフリーズしないようにする
  function runNextTrial(index) {
    if (index >= TRIALS) {
      // 終了処理
      results.sort((a, b) => a - b);
      const avg = results.reduce((a, b) => a + b, 0) / TRIALS;
      const p95 = results[Math.floor(TRIALS * 0.95)];
      const p5 = results[Math.floor(TRIALS * 0.05)];

      output.innerHTML += `
        <hr>
        <h2>統計結果（${TRIALS} 回シミュレーション）</h2>
        <p><strong>平均:</strong> ${avg.toFixed(2)}回</p>
        <p><strong>上振れ(5%tile):</strong> ${p5}回</p>
        <p><strong>下振れ(95%tile):</strong> ${p95}回</p>
      `;

      document.getElementById("startButton").disabled = false;
      state.running = false;
      return;
    }

    // 1試行
    let rounds = 0;
    let topGroups = [];

    while (true) {
      rounds++;
      let group = drawGroup(rarity, maxLevel, bigHitRates, slotCount);
      const total = group.reduce((a, b) => a + b, 0);
      topGroups.push({ group, total });
      topGroups.sort((a, b) => b.total - a.total);
      if (topGroups.length > pickCount) topGroups.length = pickCount;
      const topTotal = topGroups.reduce((sum, g) => sum + g.total, 0);
      if (topTotal >= targetTotal) {
        results.push(rounds);
        break;
      }
    }

    // --- 途中経過表示 ---
    if ((index + 1) % 100 === 0) {
      const partialAvg = results.reduce((a, b) => a + b, 0) / results.length;
      output.innerHTML = `
        <p><strong>${index + 1} 回中間統計:</strong></p>
        <p>現在の平均改造回数: ${partialAvg.toFixed(2)}</p>
      `;
    }
    if (index === 999) {
      output.innerHTML = "";
    }

    // 次の試行へ（非同期で分割実行）
    setTimeout(() => runNextTrial(index + 1), 0);
  }

  // 開始
  output.innerHTML = "<p>統計モードを開始します…</p>";
  runNextTrial(0);
}
