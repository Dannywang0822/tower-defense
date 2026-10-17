/**
 * 路卫 — Coinpath Defense
 * 竖屏「几」字形路径塔防 · 纯 Canvas
 */
(() => {
  "use strict";

  // ---------- 常量 ----------
  const COLS = 8;
  const ROWS = 12;
  const TOTAL_WAVES = 12;
  const START_LIVES = 20;
  const START_GOLD = 120;
  const WAVE_REST = 4; // 秒
  const EXTRA_REST_BEFORE = new Set([5, 10]); // 波前多 2s
  const SELL_RATIO = 0.6;
  const BASE_HP = 40;
  const BASE_SPEED = 1.0; // 格/秒
  const BASE_REWARD = 8;

  const TOWER_DEFS = {
    arrow: {
      name: "箭塔",
      cost: 50,
      range: 2.5,
      rate: 1.5, // /s
      damage: 12,
      color: "#66bb6a",
      colorDark: "#2e7d32",
      projectile: "arrow",
    },
    cannon: {
      name: "炮塔",
      cost: 120,
      range: 2.0,
      rate: 0.6,
      damage: 35,
      splash: 1.2,
      splashRatio: 0.5,
      color: "#ef8354",
      colorDark: "#c45c2a",
      projectile: "cannon",
    },
    frost: {
      name: "霜塔",
      cost: 90,
      range: 2.2,
      rate: 1.0,
      damage: 8,
      slow: 0.35,
      slowDur: 1.5,
      color: "#4fc3f7",
      colorDark: "#0277bd",
      projectile: "frost",
    },
  };

  // 「几」字形路径：格坐标 (c,r)，从顶入口到底出口
  // 下 → 右 → 下 → 左 → 下
  const PATH_CELLS = buildPath();

  function buildPath() {
    const cells = [];
    const push = (c, r) => {
      if (!cells.length || cells[cells.length - 1][0] !== c || cells[cells.length - 1][1] !== r) {
        cells.push([c, r]);
      }
    };
    // 入口：顶中偏左列 2，向下到 r=2
    let c = 2, r = 0;
    for (; r <= 2; r++) push(c, r);
    // 右到 c=5
    for (c = 3; c <= 5; c++) push(c, 2);
    // 下到 r=5
    for (r = 3; r <= 5; r++) push(5, r);
    // 左到 c=2
    for (c = 4; c >= 2; c--) push(c, 5);
    // 下到 r=8
    for (r = 6; r <= 8; r++) push(2, r);
    // 右到 c=5
    for (c = 3; c <= 5; c++) push(c, 8);
    // 下到出口 r=11
    for (r = 9; r <= 11; r++) push(5, r);
    return cells;
  }

  const PATH_SET = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));

  // 波次定义：{ count, speedMul, hpMul, kind? }[] 或特殊
  // kind: 'normal' | 'fast' | 'tank' | 'boss'
  function wavePlan(n) {
    // n = 1..12
    switch (n) {
      case 1: return [{ kind: "normal", count: 6, speedMul: 1.0, hpMul: 1.0 }];
      case 2: return [{ kind: "normal", count: 8, speedMul: 1.0, hpMul: 1.1 }];
      case 3: return [{ kind: "normal", count: 10, speedMul: 1.05, hpMul: 1.2 }];
      case 4:
        return [
          { kind: "normal", count: 8, speedMul: 1.0, hpMul: 1.15 },
          { kind: "fast", count: 2, speedMul: 1.4, hpMul: 0.7, reward: 10 },
        ];
      case 5: return [
        { kind: "normal", count: 8, speedMul: 1.1, hpMul: 1.3 },
        { kind: "boss", count: 1, speedMul: 0.75, hpMul: 6, reward: 50 },
      ];
      case 6:
        return [
          { kind: "normal", count: 10, speedMul: 1.05, hpMul: 1.3 },
          { kind: "tank", count: 1, speedMul: 0.65, hpMul: 3.5, reward: 25 },
        ];
      case 7: return [{ kind: "normal", count: 14, speedMul: 1.15, hpMul: 1.5 }];
      case 8:
        return [
          { kind: "fast", count: 10, speedMul: 1.4, hpMul: 0.85, reward: 10 },
          { kind: "tank", count: 2, speedMul: 0.65, hpMul: 3.5, reward: 25 },
        ];
      case 9: return [{ kind: "normal", count: 16, speedMul: 1.2, hpMul: 1.7 }];
      case 10:
        return [
          { kind: "normal", count: 10, speedMul: 1.15, hpMul: 1.55 },
          { kind: "tank", count: 2, speedMul: 0.65, hpMul: 3.5, reward: 25 },
          { kind: "boss", count: 1, speedMul: 0.7, hpMul: 9, reward: 70 },
        ];
      case 11:
        return [
          { kind: "fast", count: 10, speedMul: 1.4, hpMul: 1.0, reward: 10 },
          { kind: "normal", count: 8, speedMul: 1.2, hpMul: 1.25 },
        ];
      case 12:
        return [
          { kind: "boss", count: 1, speedMul: 0.7, hpMul: 12, reward: 80 },
          { kind: "normal", count: 8, speedMul: 1.15, hpMul: 1.5 },
        ];
      default: return [{ kind: "normal", count: 6, speedMul: 1, hpMul: 1 }];
    }
  }

  // ---------- DOM ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const elLives = document.getElementById("hud-lives");
  const elGold = document.getElementById("hud-gold");
  const elWave = document.getElementById("hud-wave");
  const elStatus = document.getElementById("hud-status");
  const elToast = document.getElementById("toast");
  const buildPanel = document.getElementById("build-panel");
  const selectPanel = document.getElementById("select-panel");
  const selTitle = document.getElementById("sel-title");
  const selStats = document.getElementById("sel-stats");
  const btnUpgrade = document.getElementById("btn-upgrade");
  const btnSell = document.getElementById("btn-sell");
  const btnDeselect = document.getElementById("btn-deselect");
  const btnNextWave = document.getElementById("btn-next-wave");
  const overlay = document.getElementById("overlay");
  const endTitle = document.getElementById("end-title");
  const endMsg = document.getElementById("end-msg");
  const endStats = document.getElementById("end-stats");
  const btnRestart = document.getElementById("btn-restart");
  const towerBtns = [...document.querySelectorAll(".tower-btn")];

  // ---------- 状态 ----------
  let cellSize = 50;
  let pathPoints = []; // 像素中心点 polyline
  let pathLen = 0;

  const state = {
    lives: START_LIVES,
    gold: START_GOLD,
    wave: 0, // 已完成/进行中的波号 0=未开始
    kills: 0,
    spent: 0,
    phase: "idle", // idle | countdown | spawning | fighting | won | lost
    countdown: 0,
    buildType: null, // 'arrow'|'cannon'|'frost'|null
    selected: null, // Tower
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    explosions: [],
    spawnQueue: [],
    spawnTimer: 0,
    hoverCell: null,
    ended: false,
  };

  // ---------- 工具 ----------
  function toast(msg, ms = 1600) {
    elToast.textContent = msg;
    elToast.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => elToast.classList.add("hidden"), ms);
  }

  function dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.hypot(dx, dy);
  }

  function cellKey(c, r) {
    return `${c},${r}`;
  }

  function isPath(c, r) {
    return PATH_SET.has(cellKey(c, r));
  }

  function towerAt(c, r) {
    return state.towers.find((t) => t.c === c && t.r === r);
  }

  function canPlace(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (isPath(c, r)) return false;
    if (towerAt(c, r)) return false;
    return true;
  }

  function cellCenter(c, r) {
    return { x: (c + 0.5) * cellSize, y: (r + 0.5) * cellSize };
  }

  function rebuildPathPixels() {
    pathPoints = PATH_CELLS.map(([c, r]) => cellCenter(c, r));
    pathLen = 0;
    const segs = [0];
    for (let i = 1; i < pathPoints.length; i++) {
      pathLen += dist(
        pathPoints[i - 1].x, pathPoints[i - 1].y,
        pathPoints[i].x, pathPoints[i].y
      );
      segs.push(pathLen);
    }
    rebuildPathPixels.segs = segs;
  }

  function posOnPath(progress) {
    // progress 0..pathLen
    const segs = rebuildPathPixels.segs;
    if (progress <= 0) return { ...pathPoints[0], angle: 0 };
    if (progress >= pathLen) {
      const a = pathPoints[pathPoints.length - 2];
      const b = pathPoints[pathPoints.length - 1];
      return { x: b.x, y: b.y, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    let i = 1;
    while (i < segs.length && segs[i] < progress) i++;
    const a = pathPoints[i - 1];
    const b = pathPoints[i];
    const segLen = segs[i] - segs[i - 1];
    const t = segLen > 0 ? (progress - segs[i - 1]) / segLen : 0;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }

  function resize() {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth || 400;
    cellSize = Math.floor(w / COLS);
    canvas.width = cellSize * COLS;
    canvas.height = cellSize * ROWS;
    rebuildPathPixels();
  }

  // ---------- 升级计算 ----------
  function towerStats(type, level) {
    const d = TOWER_DEFS[type];
    let range = d.range;
    let rate = d.rate;
    let damage = d.damage;
    let slow = d.slow || 0;
    let invested = d.cost;

    if (level >= 2) {
      invested += Math.round(d.cost * 0.8);
      damage *= 1.4;
      rate *= 1.15;
      if (type === "frost") slow = Math.min(0.5, slow + 0.05);
    }
    if (level >= 3) {
      invested += Math.round(d.cost * 1.2);
      damage *= 1.35;
      range += 0.4;
      if (type === "frost") slow = Math.min(0.5, slow + 0.05);
    }
    return {
      range,
      rate,
      damage: Math.round(damage * 10) / 10,
      slow,
      slowDur: d.slowDur || 0,
      splash: d.splash || 0,
      splashRatio: d.splashRatio || 0,
      invested,
      color: d.color,
      colorDark: d.colorDark,
      name: d.name,
      projectile: d.projectile,
    };
  }

  function upgradeCost(type, level) {
    const d = TOWER_DEFS[type];
    if (level === 1) return Math.round(d.cost * 0.8);
    if (level === 2) return Math.round(d.cost * 1.2);
    return 0;
  }

  // ---------- 实体 ----------
  class Tower {
    constructor(type, c, r) {
      this.type = type;
      this.c = c;
      this.r = r;
      this.level = 1;
      const p = cellCenter(c, r);
      this.x = p.x;
      this.y = p.y;
      this.cooldown = 0;
      this.angle = -Math.PI / 2;
      this.refresh();
    }
    refresh() {
      Object.assign(this, towerStats(this.type, this.level));
    }
    upgrade() {
      if (this.level >= 3) return false;
      const cost = upgradeCost(this.type, this.level);
      if (state.gold < cost) return false;
      state.gold -= cost;
      state.spent += cost;
      this.level++;
      this.refresh();
      return true;
    }
    sellValue() {
      return Math.floor(this.invested * SELL_RATIO);
    }
  }

  class Enemy {
    constructor(kind, speedMul, hpMul, reward) {
      this.kind = kind;
      this.maxHp = Math.round(BASE_HP * hpMul);
      this.hp = this.maxHp;
      this.baseSpeed = BASE_SPEED * speedMul * cellSize; // px/s
      this.reward = reward != null ? reward : BASE_REWARD;
      this.progress = 0;
      this.slowMul = 1;
      this.slowUntil = 0;
      this.dead = false;
      this.escaped = false;
      this.hitFlash = 0;
      // 视觉
      if (kind === "fast") {
        this.radius = 0.28;
        this.color = "#ffeb3b";
      } else if (kind === "tank") {
        this.radius = 0.42;
        this.color = "#8d6e63";
      } else if (kind === "boss") {
        this.radius = 0.5;
        this.color = "#ce93d8";
      } else {
        this.radius = 0.32;
        this.color = "#ef5350";
      }
      const p = posOnPath(0);
      this.x = p.x;
      this.y = p.y;
      this.angle = p.angle;
    }
    speed(now) {
      const slow = now < this.slowUntil ? this.slowMul : 1;
      return this.baseSpeed * slow;
    }
    applySlow(amount, dur, now) {
      // 叠减不叠伤：取更强减速
      const mul = 1 - amount;
      if (mul < this.slowMul || now >= this.slowUntil) {
        this.slowMul = Math.min(this.slowMul, mul);
      }
      // 若已有更强减速，只刷新时间若同等或更强
      if (mul <= this.slowMul) {
        this.slowMul = mul;
        this.slowUntil = Math.max(this.slowUntil, now + dur);
      } else {
        this.slowUntil = Math.max(this.slowUntil, now + dur * 0.5);
      }
    }
  }

  class Projectile {
    constructor(tower, target, now) {
      this.x = tower.x;
      this.y = tower.y;
      this.tx = target.x;
      this.ty = target.y;
      this.target = target;
      this.damage = tower.damage;
      this.splash = tower.splash * cellSize;
      this.splashRatio = tower.splashRatio;
      this.slow = tower.slow;
      this.slowDur = tower.slowDur;
      this.style = tower.projectile;
      this.speed = cellSize * (this.style === "cannon" ? 6 : 10);
      this.alive = true;
      this.born = now;
      const ang = Math.atan2(this.ty - this.y, this.tx - this.x);
      this.vx = Math.cos(ang) * this.speed;
      this.vy = Math.sin(ang) * this.speed;
      this.color =
        this.style === "frost" ? "#81d4fa" :
        this.style === "cannon" ? "#ffab91" : "#a5d6a7";
    }
  }

  function spawnParticle(x, y, color, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = 40 + Math.random() * 80;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.25,
        max: 0.5,
        color,
        r: 2 + Math.random() * 3,
      });
    }
  }

  // ---------- 波次 ----------
  function queueWave(n) {
    const plan = wavePlan(n);
    const queue = [];
    for (const group of plan) {
      for (let i = 0; i < group.count; i++) {
        queue.push({
          kind: group.kind,
          speedMul: group.speedMul,
          hpMul: group.hpMul,
          reward: group.reward,
        });
      }
    }
    // Boss 与普通同时刷：交错一下，Boss 先出
    if (n === 12) {
      const boss = queue.filter((q) => q.kind === "boss");
      const rest = queue.filter((q) => q.kind !== "boss");
      return [...boss, ...rest];
    }
    return queue;
  }

  function startWave(n) {
    state.wave = n;
    state.spawnQueue = queueWave(n);
    state.spawnTimer = 0.15;
    state.phase = "spawning";
    state.buildType = null;
    updateBuildButtons();
    updateHUD();
    btnNextWave.disabled = true;
    btnNextWave.textContent = `第 ${n} 波进行中…`;
    const hasBoss = state.spawnQueue.some((q) => q.kind === "boss");
    toast(hasBoss ? `⚠ 第 ${n} 波 · Boss 来袭！` : `第 ${n} 波来袭！`, hasBoss ? 2200 : 1600);
  }

  function beginCountdown(nextWave) {
    let rest = WAVE_REST;
    if (EXTRA_REST_BEFORE.has(nextWave)) rest += 2;
    state.countdown = rest;
    state.phase = "countdown";
    state._nextWave = nextWave;
    btnNextWave.disabled = false;
    btnNextWave.classList.add("waiting");
    updateCountdownBtn();
  }

  function updateCountdownBtn() {
    const n = state._nextWave;
    const bonus = Math.max(1, Math.round(state.countdown * 1.25)); // ~5 金量级
    state._earlyBonus = bonus;
    btnNextWave.textContent = `提前第 ${n} 波（+${bonus}金）`;
  }

  function earlyStartWave() {
    if (state.phase !== "countdown") return;
    const bonus = state._earlyBonus || 5;
    state.gold += bonus;
    toast(`提前出击 +${bonus} 金币`);
    const n = state._nextWave;
    btnNextWave.classList.remove("waiting");
    startWave(n);
  }

  function checkWaveClear() {
    if (state.phase !== "spawning" && state.phase !== "fighting") return;
    if (state.spawnQueue.length > 0) return;
    if (state.enemies.some((e) => !e.dead && !e.escaped)) {
      state.phase = "fighting";
      return;
    }
    // 清波
    if (state.wave >= TOTAL_WAVES) {
      winGame();
      return;
    }
    beginCountdown(state.wave + 1);
    updateHUD();
  }

  // ---------- 胜负 ----------
  function winGame() {
    state.phase = "won";
    state.ended = true;
    showEnd(true);
    try {
      const best = Number(localStorage.getItem("coinpath_best_wave") || 0);
      if (state.wave > best) localStorage.setItem("coinpath_best_wave", String(state.wave));
    } catch (_) {}
  }

  function loseGame() {
    state.phase = "lost";
    state.ended = true;
    showEnd(false);
  }

  function showEnd(won) {
    overlay.classList.remove("hidden");
    endTitle.textContent = won ? "胜利！" : "防线失守";
    endTitle.className = won ? "win" : "lose";
    endMsg.textContent = won
      ? "12 波尽数击退，金币之路得以保全。"
      : "怪物涌入出口，路卫未能守住。";
    endStats.innerHTML = `
      <li>击杀 <span>${state.kills}</span></li>
      <li>剩余金币 <span>${state.gold}</span></li>
      <li>到达波次 <span>${state.wave}/${TOTAL_WAVES}</span></li>
      <li>剩余生命 <span>${Math.max(0, state.lives)}</span></li>
    `;
  }

  function resetGame() {
    Object.assign(state, {
      lives: START_LIVES,
      gold: START_GOLD,
      wave: 0,
      kills: 0,
      spent: 0,
      phase: "idle",
      countdown: 0,
      buildType: null,
      selected: null,
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      explosions: [],
      spawnQueue: [],
      spawnTimer: 0,
      hoverCell: null,
      ended: false,
    });
    overlay.classList.add("hidden");
    selectPanel.classList.add("hidden");
    buildPanel.classList.remove("hidden");
    btnNextWave.disabled = false;
    btnNextWave.classList.remove("waiting");
    btnNextWave.textContent = "开始第 1 波";
    updateBuildButtons();
    updateHUD();
    toast("新的防线已就位");
  }

  // ---------- HUD / UI ----------
  function updateHUD() {
    elLives.textContent = String(Math.max(0, state.lives));
    elGold.textContent = String(state.gold);
    elWave.textContent = `${state.wave}/${TOTAL_WAVES}`;
    let status = "准备就绪";
    if (state.phase === "countdown") status = `休息 ${state.countdown.toFixed(1)}s`;
    else if (state.phase === "spawning" || state.phase === "fighting") status = "战斗中";
    else if (state.phase === "won") status = "胜利";
    else if (state.phase === "lost") status = "失败";
    else if (state.phase === "idle") status = "点击下方开始";
    elStatus.textContent = status;
    updateBuildButtons();
    if (state.selected) refreshSelectPanel();
  }

  function updateBuildButtons() {
    towerBtns.forEach((btn) => {
      const type = btn.dataset.type;
      const cost = TOWER_DEFS[type].cost;
      btn.classList.toggle("active", state.buildType === type);
      btn.classList.toggle("disabled", state.gold < cost || state.ended);
      btn.querySelector(".tb-cost").textContent = String(cost);
    });
  }

  function refreshSelectPanel() {
    const t = state.selected;
    if (!t) return;
    selTitle.textContent = `${t.name}  Lv.${t.level}`;
    const slowTxt = t.slow
      ? `<br>减速 ${Math.round(t.slow * 100)}% × ${t.slowDur}s`
      : "";
    const splashTxt = t.splash
      ? `<br>溅射 ${t.splash.toFixed(1)} 格（${Math.round(t.splashRatio * 100)}%）`
      : "";
    selStats.innerHTML =
      `伤害 ${t.damage} · 射速 ${t.rate.toFixed(2)}/s<br>` +
      `射程 ${t.range.toFixed(1)} 格` +
      splashTxt +
      slowTxt +
      `<br>投入 ${t.invested} · 卖出 ${t.sellValue()}`;

    if (t.level >= 3) {
      btnUpgrade.disabled = true;
      btnUpgrade.textContent = "已满级";
    } else {
      const cost = upgradeCost(t.type, t.level);
      btnUpgrade.disabled = state.gold < cost || state.ended;
      btnUpgrade.textContent = `升级 Lv.${t.level + 1}（${cost}）`;
    }
    btnSell.disabled = state.ended;
    btnSell.textContent = `卖掉 +${t.sellValue()}`;
  }

  function selectTower(t) {
    state.selected = t;
    state.buildType = null;
    buildPanel.classList.add("hidden");
    selectPanel.classList.remove("hidden");
    refreshSelectPanel();
    updateBuildButtons();
  }

  function deselect() {
    state.selected = null;
    selectPanel.classList.add("hidden");
    buildPanel.classList.remove("hidden");
  }

  // ---------- 输入 ----------
  function pointerToCell(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    return { c, r, x, y };
  }

  function onPointerDown(e) {
    if (state.ended) return;
    e.preventDefault();
    const { c, r } = pointerToCell(e);
    const existing = towerAt(c, r);
    if (existing) {
      selectTower(existing);
      return;
    }
    if (state.buildType) {
      if (!canPlace(c, r)) {
        toast(isPath(c, r) ? "路径上不能建塔" : "此处无法建造");
        return;
      }
      const cost = TOWER_DEFS[state.buildType].cost;
      if (state.gold < cost) {
        toast("金币不足");
        return;
      }
      state.gold -= cost;
      state.spent += cost;
      const tower = new Tower(state.buildType, c, r);
      state.towers.push(tower);
      spawnParticle(tower.x, tower.y, tower.color, 8);
      selectTower(tower);
      toast(`建造 ${tower.name}`);
      updateHUD();
      return;
    }
    deselect();
  }

  function onPointerMove(e) {
    const ev = e.touches ? e.touches[0] : e;
    if (!ev) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    state.hoverCell = {
      c: Math.floor(x / cellSize),
      r: Math.floor(y / cellSize),
    };
  }

  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("touchstart", onPointerDown, { passive: false });
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    onPointerMove(e);
  }, { passive: false });
  const stage = document.getElementById("stage-wrap");
  if (stage) {
    stage.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  }
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

  towerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.ended) return;
      const type = btn.dataset.type;
      if (state.gold < TOWER_DEFS[type].cost) {
        toast("金币不足");
        return;
      }
      deselect();
      state.buildType = state.buildType === type ? null : type;
      updateBuildButtons();
      if (state.buildType) toast(`选择放置：${TOWER_DEFS[type].name}`);
    });
  });

  btnUpgrade.addEventListener("click", () => {
    if (!state.selected || state.ended) return;
    if (state.selected.upgrade()) {
      toast(`升级至 Lv.${state.selected.level}`);
      updateHUD();
    } else {
      toast("无法升级");
    }
  });

  btnSell.addEventListener("click", () => {
    if (!state.selected || state.ended) return;
    const t = state.selected;
    const val = t.sellValue();
    state.gold += val;
    state.towers = state.towers.filter((x) => x !== t);
    toast(`卖掉 +${val} 金币`);
    deselect();
    updateHUD();
  });

  btnDeselect.addEventListener("click", deselect);

  btnNextWave.addEventListener("click", () => {
    if (state.ended) return;
    if (state.phase === "idle") {
      startWave(1);
      return;
    }
    if (state.phase === "countdown") {
      earlyStartWave();
    }
  });

  btnRestart.addEventListener("click", resetGame);

  // ---------- 战斗逻辑 ----------
  function findTarget(tower) {
    const rangePx = tower.range * cellSize;
    let best = null;
    let bestProg = -1;
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      if (dist(tower.x, tower.y, e.x, e.y) <= rangePx + e.radius * cellSize) {
        if (e.progress > bestProg) {
          bestProg = e.progress;
          best = e;
        }
      }
    }
    return best;
  }

  function damageEnemy(e, amount, now) {
    if (e.dead) return;
    e.hp -= amount;
    e.hitFlash = now + 0.1;
    if (e.hp <= 0) {
      e.dead = true;
      e.hp = 0;
      state.kills++;
      state.gold += e.reward;
      spawnParticle(e.x, e.y, e.color, e.kind === "boss" ? 14 : 7);
    }
  }

  function hitProjectile(p, now) {
    p.alive = false;
    const target = p.target;
    if (p.splash > 0) {
      for (const e of state.enemies) {
        if (e.dead || e.escaped) continue;
        const d = dist(p.tx, p.ty, e.x, e.y);
        if (d <= p.splash + e.radius * cellSize) {
          const isPrimary = e === target;
          const dmg = isPrimary ? p.damage : p.damage * p.splashRatio;
          damageEnemy(e, dmg, now);
        }
      }
      spawnParticle(p.tx, p.ty, "#ffab91", 10);
      state.explosions.push({ x: p.tx, y: p.ty, r: 4, maxR: p.splash, life: 0.28, maxLife: 0.28 });
    } else {
      if (target && !target.dead && !target.escaped) {
        damageEnemy(target, p.damage, now);
        if (p.slow > 0) target.applySlow(p.slow, p.slowDur, now);
      }
      spawnParticle(p.tx, p.ty, p.color, 4);
    }
  }

  function update(dt, now) {
    if (state.ended) return;

    // 倒计时
    if (state.phase === "countdown") {
      state.countdown -= dt;
      updateCountdownBtn();
      if (state.countdown <= 0) {
        btnNextWave.classList.remove("waiting");
        startWave(state._nextWave);
      }
      updateHUD();
    }

    // 刷怪
    if (state.phase === "spawning" || state.phase === "fighting") {
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          const spec = state.spawnQueue.shift();
          state.enemies.push(
            new Enemy(spec.kind, spec.speedMul, spec.hpMul, spec.reward)
          );
          // Boss 后立刻出普通；普通间隔稍密
          state.spawnTimer = spec.kind === "boss" ? 0.35 : 0.55;
          state.phase = "spawning";
        }
      }
    }

    // 敌人移动
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      const spd = e.speed(now);
      e.progress += spd * dt;
      if (e.progress >= pathLen) {
        e.escaped = true;
        state.lives -= 1;
        spawnParticle(e.x, e.y, "#ef5350", 5);
        if (state.lives <= 0) {
          state.lives = 0;
          loseGame();
          return;
        }
        updateHUD();
        continue;
      }
      const p = posOnPath(e.progress);
      e.x = p.x;
      e.y = p.y;
      e.angle = p.angle;
      if (now >= e.slowUntil) e.slowMul = 1;
    }

    // 清理死亡/逃离
    state.enemies = state.enemies.filter((e) => !e.dead && !e.escaped);

    // 塔射击
    for (const t of state.towers) {
      t.cooldown -= dt;
      const target = findTarget(t);
      if (target) {
        t.angle = Math.atan2(target.y - t.y, target.x - t.x);
        if (t.cooldown <= 0) {
          state.projectiles.push(new Projectile(t, target, now));
          t.cooldown = 1 / t.rate;
        }
      }
    }

    // 子弹
    for (const p of state.projectiles) {
      if (!p.alive) continue;
      // 追踪目标（箭/霜）；炮弹飞向命中时位置
      if (p.style !== "cannon" && p.target && !p.target.dead && !p.target.escaped) {
        p.tx = p.target.x;
        p.ty = p.target.y;
        const ang = Math.atan2(p.ty - p.y, p.tx - p.x);
        p.vx = Math.cos(ang) * p.speed;
        p.vy = Math.sin(ang) * p.speed;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (dist(p.x, p.y, p.tx, p.ty) < cellSize * 0.25 || now - p.born > 2) {
        hitProjectile(p, now);
      }
    }
    state.projectiles = state.projectiles.filter((p) => p.alive);

    // 爆炸圈
    for (const ex of state.explosions) {
      const a = Math.max(0, ex.life / ex.maxLife);
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,140,66,${a})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,180,80,${a * 0.2})`;
      ctx.fill();
    }

    // 粒子
    for (const pt of state.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.92;
      pt.vy *= 0.92;
    }
    state.particles = state.particles.filter((pt) => pt.life > 0);

    for (const ex of state.explosions) {
      ex.life -= dt;
      const t = 1 - Math.max(0, ex.life) / ex.maxLife;
      ex.r = ex.maxR * (0.25 + 0.75 * t);
    }
    state.explosions = state.explosions.filter((ex) => ex.life > 0);

    checkWaveClear();
    updateHUD();
  }

  // ---------- 绘制 ----------
  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 草地格子
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        if (isPath(c, r)) {
          ctx.fillStyle = "#1a2430";
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          ctx.fillStyle = (c + r) % 2 === 0 ? "#152018" : "#1a281f";
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    // 路径中线
    if (pathPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.strokeStyle = "#2a3d52";
      ctx.lineWidth = cellSize * 0.62;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.strokeStyle = "#3d5a73";
      ctx.lineWidth = cellSize * 0.38;
      ctx.stroke();
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = "rgba(79,195,247,0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 入口 / 出口标记
    const entry = pathPoints[0];
    const exit = pathPoints[pathPoints.length - 1];
    drawGate(entry.x, entry.y, "#66bb6a", "入");
    drawGate(exit.x, exit.y, "#ef5350", "出");

    // 放置预览
    if (state.buildType && state.hoverCell) {
      const { c, r } = state.hoverCell;
      if (c >= 0 && r >= 0 && c < COLS && r < ROWS) {
        const ok = canPlace(c, r);
        const p = cellCenter(c, r);
        const def = TOWER_DEFS[state.buildType];
        ctx.fillStyle = ok ? "rgba(79,195,247,0.25)" : "rgba(239,83,80,0.3)";
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        ctx.beginPath();
        ctx.arc(p.x, p.y, def.range * cellSize, 0, Math.PI * 2);
        ctx.strokeStyle = ok ? "rgba(79,195,247,0.5)" : "rgba(239,83,80,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // 选中塔射程
    if (state.selected) {
      const t = state.selected;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range * cellSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 塔
    for (const t of state.towers) drawTower(t);

    // 敌人
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      drawEnemy(e);
    }

    // 子弹
    for (const p of state.projectiles) {
      if (!p.alive) continue;
      ctx.beginPath();
      if (p.style === "cannon") {
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else if (p.style === "frost") {
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = "#e1f5fe";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = p.color;
        ctx.fillRect(-6, -1.5, 12, 3);
        ctx.restore();
      }
    }

    // 粒子
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 标题水印
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.font = `600 ${Math.max(12, cellSize * 0.35)}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText("路卫 Coinpath", w / 2, cellSize * 0.45);
  }

  function drawGate(x, y, color, label) {
    ctx.beginPath();
    ctx.arc(x, y, cellSize * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0f1620";
    ctx.font = `700 ${Math.max(10, cellSize * 0.28)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }

  function drawTower(t) {
    const s = cellSize;
    // 底座
    ctx.beginPath();
    ctx.arc(t.x, t.y, s * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = t.colorDark;
    ctx.fill();
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 炮管 / 标志
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    if (t.type === "cannon") {
      ctx.fillStyle = t.color;
      ctx.fillRect(0, -s * 0.1, s * 0.28, s * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.type === "frost") {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(s * 0.28, 0);
      ctx.lineTo(-s * 0.12, -s * 0.14);
      ctx.lineTo(-s * 0.12, s * 0.14);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.3, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = t.color;
      ctx.fill();
    }
    ctx.restore();

    // 等级点
    if (t.level > 1) {
      ctx.fillStyle = "#ffd54f";
      ctx.font = `700 ${Math.max(9, s * 0.22)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("★".repeat(t.level - 1), t.x, t.y - s * 0.34);
    }
  }

  function drawEnemy(e) {
    const rad = e.radius * cellSize;
    const slowed = e.slowMul < 1;
    const now = performance.now() / 1000;
    if (slowed) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, rad + 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(129,212,250,0.28)";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(e.x, e.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = (e.hitFlash && now < e.hitFlash) ? "#ffffff" : (slowed ? "#90caf9" : e.color);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (e.kind === "boss") {
      ctx.strokeStyle = "#e1bee7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, rad + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 血条
    const bw = rad * 2.2;
    const bh = 4;
    const bx = e.x - bw / 2;
    const by = e.y - rad - 8;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = e.hp / e.maxHp > 0.35 ? "#66bb6a" : "#ef5350";
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
  }

  // ---------- 主循环 ----------
  let last = performance.now() / 1000;
  function frame(ts) {
    const now = ts / 1000;
    let dt = now - last;
    last = now;
    if (dt > 0.05) dt = 0.05;
    update(dt, now);
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- 启动 ----------
  window.addEventListener("resize", resize);
  resize();
  updateHUD();
  requestAnimationFrame(frame);

  // 导出供自测（可选）
  window.__COINPATH__ = {
    state,
    TOWER_DEFS,
    PATH_CELLS,
    startWave,
    resetGame,
    canPlace,
    towerStats,
    upgradeCost,
    wavePlan,
    TOTAL_WAVES,
  };
})();
