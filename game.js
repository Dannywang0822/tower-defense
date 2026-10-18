/**
 * 路卫 — Coinpath Defense
 * 竖屏「几」字形路径塔防 · 纯 Canvas · 30 波
 */
(() => {
  "use strict";

  // ---------- 常量 ----------
  const COLS = 8;
  const ROWS = 12;
  const TOTAL_WAVES = 30;
  const START_LIVES = 20;
  const START_GOLD = 120;
  const WAVE_REST_DEFAULT = 4;
  const SELL_RATIO = 0.6;
  const BASE_HP = 40;
  const BASE_SPEED = 1.0; // 格/秒
  const BASE_REWARD = 8;
  const MAX_PARTICLES = 80;

  const TOWER_DEFS = {
    arrow: {
      name: "箭塔",
      cost: 50,
      range: 2.5,
      rate: 1.5,
      damage: 12,
      color: "#9ccc65",
      colorDark: "#558b2f",
      colorLight: "#dcedc8",
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
      color: "#e8985a",
      colorDark: "#a85a2a",
      colorLight: "#ffccbc",
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
      color: "#81d4fa",
      colorDark: "#0277bd",
      colorLight: "#e1f5fe",
      projectile: "frost",
    },
  };

  const PATH_CELLS = buildPath();

  function buildPath() {
    const cells = [];
    const push = (c, r) => {
      if (!cells.length || cells[cells.length - 1][0] !== c || cells[cells.length - 1][1] !== r) {
        cells.push([c, r]);
      }
    };
    let c = 2, r = 0;
    for (; r <= 2; r++) push(c, r);
    for (c = 3; c <= 5; c++) push(c, 2);
    for (r = 3; r <= 5; r++) push(5, r);
    for (c = 4; c >= 2; c--) push(c, 5);
    for (r = 6; r <= 8; r++) push(2, r);
    for (c = 3; c <= 5; c++) push(c, 8);
    for (r = 9; r <= 11; r++) push(5, r);
    return cells;
  }

  const PATH_SET = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));

  function normalReward(hpMul) {
    return Math.max(1, Math.round(BASE_REWARD * Math.sqrt(hpMul)));
  }

  /** 波次 1–30；第12为中Boss检定，第30为终局 */
  function wavePlan(n) {
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
      case 13: return [{ kind: "normal", count: 14, speedMul: 1.2, hpMul: 1.8 }];
      case 14:
        return [
          { kind: "normal", count: 12, speedMul: 1.2, hpMul: 1.9 },
          { kind: "fast", count: 6, speedMul: 1.4, hpMul: 0.7 * 1.9, reward: 10 },
        ];
      case 15:
        return [
          { kind: "normal", count: 10, speedMul: 1.15, hpMul: 2.0 },
          { kind: "tank", count: 3, speedMul: 0.65, hpMul: 3.5 * 1.15, reward: 28 },
        ];
      case 16:
        return [
          { kind: "fast", count: 16, speedMul: 1.25, hpMul: 0.7 * 2.1, reward: 11 },
          { kind: "normal", count: 4, speedMul: 1.25, hpMul: 2.1 },
        ];
      case 17:
        return [
          { kind: "normal", count: 12, speedMul: 1.2, hpMul: 2.3 },
          { kind: "tank", count: 4, speedMul: 0.65, hpMul: 3.5 * 1.25, reward: 30 },
        ];
      case 18:
        return [
          { kind: "boss", count: 1, speedMul: 0.75, hpMul: 8, reward: 60 },
          { kind: "normal", count: 10, speedMul: 1.2, hpMul: 2.3 },
        ];
      case 19: return [{ kind: "normal", count: 18, speedMul: 1.25, hpMul: 2.5 }];
      case 20:
        return [
          { kind: "fast", count: 10, speedMul: 1.4, hpMul: 0.7 * 2.6, reward: 12 },
          { kind: "tank", count: 5, speedMul: 0.65, hpMul: 3.5 * 1.35, reward: 32 },
        ];
      case 21:
        return [
          { kind: "shield", count: 8, speedMul: 0.85, hpMul: 2.8, reward: 18 },
          { kind: "normal", count: 8, speedMul: 1.2, hpMul: 2.8 },
        ];
      case 22:
        return [
          { kind: "normal", count: 14, speedMul: 1.2, hpMul: 2.8 },
          { kind: "shield", count: 6, speedMul: 0.85, hpMul: 2.8, reward: 18 },
          { kind: "tank", count: 2, speedMul: 0.65, hpMul: 3.5 * 1.4, reward: 34 },
        ];
      case 23: return [{ kind: "fast", count: 20, speedMul: 1.35, hpMul: 0.7 * 2.5, reward: 12 }];
      case 24:
        return [
          { kind: "boss", count: 1, speedMul: 0.7, hpMul: 10, reward: 75 },
          { kind: "fast", count: 6, speedMul: 1.4, hpMul: 0.7 * 2.8, reward: 12 },
          { kind: "tank", count: 2, speedMul: 0.65, hpMul: 3.5 * 1.45, reward: 34 },
        ];
      case 25:
        return [
          { kind: "shield", count: 12, speedMul: 0.85, hpMul: 3.0, reward: 20 },
          { kind: "normal", count: 8, speedMul: 1.2, hpMul: 3.0 },
          { kind: "tank", count: 3, speedMul: 0.65, hpMul: 3.5 * 1.5, reward: 36 },
        ];
      case 26:
        return [
          { kind: "flyer", count: 10, speedMul: 1.6, hpMul: 1.2, reward: 14 },
          { kind: "normal", count: 10, speedMul: 1.25, hpMul: 3.0 },
        ];
      case 27:
        return [
          { kind: "flyer", count: 10, speedMul: 1.6, hpMul: 1.25, reward: 16 },
          { kind: "shield", count: 8, speedMul: 0.85, hpMul: 3.2, reward: 20 },
          { kind: "tank", count: 4, speedMul: 0.65, hpMul: 3.5 * 1.55, reward: 38 },
        ];
      case 28:
        // ~24 混编：40%快跑 30%盾 20%普 10%坦克
        return [
          { kind: "fast", count: 10, speedMul: 1.4, hpMul: 0.7 * 3.4, reward: 14 },
          { kind: "shield", count: 7, speedMul: 0.85, hpMul: 3.4, reward: 22 },
          { kind: "normal", count: 5, speedMul: 1.25, hpMul: 3.4 },
          { kind: "tank", count: 2, speedMul: 0.65, hpMul: 3.5 * 1.6, reward: 40 },
        ];
      case 29:
        return [
          { kind: "flyer", count: 12, speedMul: 1.6, hpMul: 1.3, reward: 16 },
          { kind: "tank", count: 6, speedMul: 0.65, hpMul: 3.5 * 1.65, reward: 42 },
          { kind: "shield", count: 8, speedMul: 0.85, hpMul: 3.6, reward: 24 },
        ];
      case 30:
        return [
          { kind: "boss", count: 1, speedMul: 0.65, hpMul: 16, reward: 120 },
          { kind: "flyer", count: 8, speedMul: 1.6, hpMul: 1.35, reward: 16 },
          { kind: "shield", count: 6, speedMul: 0.85, hpMul: 3.8, reward: 24 },
          { kind: "tank", count: 4, speedMul: 0.65, hpMul: 3.5 * 1.8, reward: 45 },
        ];
      default: return [{ kind: "normal", count: 6, speedMul: 1, hpMul: 1 }];
    }
  }

  function restBeforeWave(nextWave) {
    let rest;
    if (nextWave === 30) rest = 6;
    else if (nextWave >= 21) rest = 4.5;
    else if (nextWave >= 13) rest = 3.5;
    else rest = WAVE_REST_DEFAULT;
    if ([5, 10, 15, 20, 25].includes(nextWave)) rest += 1.5;
    return rest;
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
  let pathPoints = [];
  let pathLen = 0;

  const state = {
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
    speed: 1, // 1–4；刷新/重开回 1x
    waveWallStart: null, // 本波首怪出现的 performance.now()（墙钟）
  };

  /** 模拟时钟（秒），随倍速推进；慢速/闪白/弹道寿命用它，避免墙钟与倍速错位 */
  let gameNow = 0;

  // ---------- 工具 ----------
  function toast(msg, ms = 1600) {
    elToast.textContent = msg;
    elToast.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => elToast.classList.add("hidden"), ms);
  }

  function sfx(name, variant) {
    try {
      const api = window.CoinpathAudio;
      if (api) api.play(name, variant);
    } catch (_) {}
  }

  function sfxShot(style) {
    try {
      const api = window.CoinpathAudio;
      if (api) api.playShot(style);
    } catch (_) {}
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
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
    const availW = Math.max(1, wrap.clientWidth || 400);
    const availH = Math.max(1, wrap.clientHeight || 600);
    const cellByW = Math.floor(availW / COLS);
    const cellByH = Math.floor(availH / ROWS);
    cellSize = Math.max(8, Math.min(cellByW, cellByH));
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
      colorLight: d.colorLight,
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
      this.muzzleFlash = 0;
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
      this.baseSpeed = BASE_SPEED * speedMul * cellSize;
      if (reward != null) {
        this.reward = reward;
      } else if (kind === "normal") {
        this.reward = normalReward(hpMul);
      } else {
        this.reward = BASE_REWARD;
      }
      this.progress = 0;
      this.slowMul = 1;
      this.slowUntil = 0;
      this.dead = false;
      this.escaped = false;
      this.hitFlash = 0;
      this.priority = kind === "flyer" ? 2 : kind === "boss" ? 1 : 0;

      if (kind === "fast") {
        this.radius = 0.26;
        this.color = "#c5e1a5";
        this.colorDark = "#558b2f";
      } else if (kind === "tank") {
        this.radius = 0.44;
        this.color = "#8d9e6f";
        this.colorDark = "#4a5a32";
      } else if (kind === "boss") {
        this.radius = 0.52;
        this.color = "#9e9d6b";
        this.colorDark = "#4a4728";
      } else if (kind === "shield") {
        this.radius = 0.38;
        this.color = "#7a8a62";
        this.colorDark = "#3e4634";
      } else if (kind === "flyer") {
        this.radius = 0.24;
        this.color = "#b0bf88";
        this.colorDark = "#5a6b3a";
      } else {
        this.radius = 0.32;
        this.color = "#7cb342";
        this.colorDark = "#33691e";
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
      const mul = 1 - amount;
      if (mul <= this.slowMul) {
        this.slowMul = mul;
        this.slowUntil = Math.max(this.slowUntil, now + dur);
      } else {
        this.slowUntil = Math.max(this.slowUntil, now + dur * 0.5);
      }
    }
    /** 盾兵：箭伤×0.6，炮溅射×1.2；其余直伤 */
    mitigate(amount, style, isSplash) {
      if (this.kind !== "shield") return amount;
      if (style === "arrow") return amount * 0.6;
      if (style === "cannon" && isSplash) return amount * 1.2;
      return amount;
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
        this.style === "cannon" ? "#ffab91" : "#c8e6c9";
    }
  }

  function spawnParticle(x, y, color, n = 6) {
    const room = MAX_PARTICLES - state.particles.length;
    if (room <= 0) return;
    const count = Math.min(n, room);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / Math.max(1, n) + Math.random() * 0.4;
      const sp = 40 + Math.random() * 80;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.22,
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
    // Boss 波：Boss 先出，其余紧随
    const bosses = queue.filter((q) => q.kind === "boss");
    if (bosses.length) {
      const rest = queue.filter((q) => q.kind !== "boss");
      return [...bosses, ...rest];
    }
    return queue;
  }

  function startWave(n) {
    state.wave = n;
    state.spawnQueue = queueWave(n);
    state.spawnTimer = 0.15;
    state.phase = "spawning";
    state.waveWallStart = null; // 首怪真正出现时再记墙钟
    state.buildType = null;
    updateBuildButtons();
    updateHUD();
    btnNextWave.disabled = true;
    btnNextWave.textContent = `第 ${n} 波进行中…`;
    const hasBoss = state.spawnQueue.some((q) => q.kind === "boss");
    let label = `第 ${n} 波来袭！`;
    if (n === 30) label = "⚠ 终局 Boss · 第 30 波！";
    else if (hasBoss) label = `⚠ 第 ${n} 波 · Boss 来袭！`;
    else if (n === 15 || n === 20 || n === 25) label = `第 ${n} 波 · 小高潮！`;
    toast(label, hasBoss || n === 30 ? 2400 : 1600);
    sfx("wave");
  }

  function beginCountdown(nextWave) {
    state.countdown = restBeforeWave(nextWave);
    state.phase = "countdown";
    state._nextWave = nextWave;
    btnNextWave.disabled = false;
    btnNextWave.classList.add("waiting");
    updateCountdownBtn();
  }

  function updateCountdownBtn() {
    const n = state._nextWave;
    const bonus = Math.max(1, Math.round(state.countdown * 1.25));
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

  /** 速清奖励：墙钟秒结算，不受倍速影响（避免 4x 刷奖励） */
  function awardSpeedClearBonus() {
    if (state.waveWallStart == null) return 0;
    const Tclear = (performance.now() - state.waveWallStart) / 1000;
    state.waveWallStart = null;
    const w = state.wave;
    const Tbase = 16 + 2.5 * w;
    const gold = Math.max(
      0,
      Math.min(36, Math.round((12 * Tbase) / Math.max(Tclear, 0.5)))
    );
    if (gold > 0) {
      state.gold += gold;
      toast(`速清 +${gold}`, 1800);
    }
    return gold;
  }

  function checkWaveClear() {
    if (state.phase !== "spawning" && state.phase !== "fighting") return;
    if (state.spawnQueue.length > 0) return;
    if (state.enemies.some((e) => !e.dead && !e.escaped)) {
      state.phase = "fighting";
      return;
    }
    // 本波全部清完（击杀或漏光）→ 速清奖励；与「提前下一波」并存
    awardSpeedClearBonus();
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
    sfx("victory");
    showEnd(true);
    try {
      const best = Number(localStorage.getItem("coinpath_best_wave") || 0);
      if (state.wave > best) localStorage.setItem("coinpath_best_wave", String(state.wave));
    } catch (_) {}
  }

  function loseGame() {
    state.phase = "lost";
    state.ended = true;
    sfx("defeat");
    showEnd(false);
  }

  function showEnd(won) {
    overlay.classList.remove("hidden");
    endTitle.textContent = won ? "胜利！" : "防线失守";
    endTitle.className = won ? "win" : "lose";
    endMsg.textContent = won
      ? "30 波尽数击退，金币之路得以保全。"
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
      speed: 1,
      waveWallStart: null,
    });
    gameNow = 0;
    overlay.classList.add("hidden");
    selectPanel.classList.add("hidden");
    buildPanel.classList.remove("hidden");
    btnNextWave.disabled = false;
    btnNextWave.classList.remove("waiting");
    btnNextWave.textContent = "开始第 1 波";
    syncSpeedButtons();
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

  function syncSpeedButtons() {
    const btns = document.querySelectorAll(".speed-btn");
    btns.forEach((b) => {
      const s = Number(b.dataset.speed);
      b.classList.toggle("active", s === state.speed);
    });
  }

  function setGameSpeed(mult) {
    const s = Math.max(1, Math.min(4, Math.round(Number(mult) || 1)));
    state.speed = s;
    syncSpeedButtons();
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
      sfx("click");
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
      sfx("build", tower.type);
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
      sfx("click");
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
      sfx("upgrade");
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
    sfx("sell");
    toast(`卖掉 +${val} 金币`);
    deselect();
    updateHUD();
  });

  btnDeselect.addEventListener("click", deselect);

  btnNextWave.addEventListener("click", () => {
    if (state.ended) return;
    sfx("click");
    if (state.phase === "idle") {
      startWave(1);
      return;
    }
    if (state.phase === "countdown") {
      earlyStartWave();
    }
  });

  btnRestart.addEventListener("click", () => {
    sfx("click");
    resetGame();
  });

  document.getElementById("speed-btns").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".speed-btn");
    if (!btn) return;
    sfx("click");
    setGameSpeed(btn.dataset.speed);
  });
  syncSpeedButtons();

  // ---------- 战斗逻辑 ----------
  function findTarget(tower) {
    const rangePx = tower.range * cellSize;
    let best = null;
    let bestScore = -Infinity;
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      if (dist(tower.x, tower.y, e.x, e.y) <= rangePx + e.radius * cellSize) {
        // 飞影高优先；同优先取路径最前
        const score = e.priority * 1e6 + e.progress;
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
    }
    return best;
  }

  function damageEnemy(e, amount, now, style, isSplash) {
    if (e.dead) return;
    const dmg = e.mitigate(amount, style, !!isSplash);
    e.hp -= dmg;
    e.hitFlash = now + 0.1;
    if (e.hp <= 0) {
      e.dead = true;
      e.hp = 0;
      state.kills++;
      state.gold += e.reward;
      const n = e.kind === "boss" ? 14 : e.kind === "tank" ? 10 : 7;
      spawnParticle(e.x, e.y, e.color, n);
      sfx("death", e.kind);
    } else {
      sfx("hit");
    }
  }

  function hitProjectile(p, now) {
    p.alive = false;
    const target = p.target;
    if (p.splash > 0) {
      sfx("boom");
      for (const e of state.enemies) {
        if (e.dead || e.escaped) continue;
        const d = dist(p.tx, p.ty, e.x, e.y);
        if (d <= p.splash + e.radius * cellSize) {
          const isPrimary = e === target;
          const dmg = isPrimary ? p.damage : p.damage * p.splashRatio;
          damageEnemy(e, dmg, now, p.style, !isPrimary);
        }
      }
      spawnParticle(p.tx, p.ty, "#ffab91", 10);
      state.explosions.push({
        x: p.tx, y: p.ty, r: 4, maxR: p.splash,
        life: 0.32, maxLife: 0.32, shards: 6,
      });
    } else {
      if (target && !target.dead && !target.escaped) {
        damageEnemy(target, p.damage, now, p.style, false);
        if (p.slow > 0) target.applySlow(p.slow, p.slowDur, now);
      }
      spawnParticle(p.tx, p.ty, p.color, 4);
    }
  }

  function update(dt, now) {
    if (state.ended) return;

    if (state.phase === "countdown") {
      const prevCountdown = state.countdown;
      state.countdown -= dt;
      const prevSec = Math.ceil(prevCountdown);
      const nextSec = Math.ceil(Math.max(0, state.countdown));
      if (nextSec < prevSec && nextSec >= 1 && nextSec <= 3) sfx("tick");
      updateCountdownBtn();
      if (state.countdown <= 0) {
        btnNextWave.classList.remove("waiting");
        startWave(state._nextWave);
      }
      updateHUD();
    }

    if (state.phase === "spawning" || state.phase === "fighting") {
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          const spec = state.spawnQueue.shift();
          if (state.waveWallStart == null) {
            state.waveWallStart = performance.now();
          }
          state.enemies.push(
            new Enemy(spec.kind, spec.speedMul, spec.hpMul, spec.reward)
          );
          // 终局重叠出场：Boss 后极短间隔
          if (state.wave === 30) {
            state.spawnTimer = spec.kind === "boss" ? 0.2 : 0.28;
          } else {
            state.spawnTimer = spec.kind === "boss" ? 0.35 : 0.55;
          }
          state.phase = "spawning";
        }
      }
    }

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
        sfx("leak");
        updateHUD();
        continue;
      }
      const p = posOnPath(e.progress);
      e.x = p.x;
      e.y = p.y;
      e.angle = p.angle;
      if (now >= e.slowUntil) e.slowMul = 1;
    }

    state.enemies = state.enemies.filter((e) => !e.dead && !e.escaped);

    for (const t of state.towers) {
      t.cooldown -= dt;
      if (t.muzzleFlash > 0) t.muzzleFlash -= dt;
      const target = findTarget(t);
      if (target) {
        t.angle = Math.atan2(target.y - t.y, target.x - t.x);
        if (t.cooldown <= 0) {
          state.projectiles.push(new Projectile(t, target, now));
          t.cooldown = 1 / t.rate;
          t.muzzleFlash = 0.08;
          sfxShot(t.projectile);
        }
      }
    }

    for (const p of state.projectiles) {
      if (!p.alive) continue;
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
    const now = performance.now() / 1000;
    ctx.clearRect(0, 0, w, h);

    // 城堡夜景底：暖石色天幕
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#1e1a14");
    sky.addColorStop(0.5, "#16120e");
    sky.addColorStop(1, "#10140e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        if (isPath(c, r)) {
          ctx.fillStyle = "#1a2218";
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          const even = (c + r) % 2 === 0;
          ctx.fillStyle = even ? "#2a2418" : "#322a1c";
          ctx.fillRect(x, y, cellSize, cellSize);
          // 石砖缝 + 偶发苔点
          const seed = (c * 17 + r * 31) & 15;
          if (seed < 3) {
            ctx.fillStyle = "rgba(90,70,45,0.35)";
            ctx.fillRect(x + 2, y + cellSize * 0.48, cellSize - 4, 1);
          }
          if (seed === 4 || seed === 9) {
            ctx.fillStyle = "rgba(120,150,80,0.16)";
            ctx.beginPath();
            ctx.arc(x + cellSize * 0.35, y + cellSize * 0.4, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
          // 城垛感边缘碎石
          if (seed === 7) {
            ctx.fillStyle = "rgba(180,150,90,0.12)";
            ctx.fillRect(x + cellSize * 0.55, y + cellSize * 0.2, 3, 2.5);
          }
        }
      }
    }

    if (pathPoints.length > 1) {
      // 护城河/泥路外晕（尸潮走道）
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.strokeStyle = "rgba(90,120,60,0.16)";
      ctx.lineWidth = cellSize * 0.9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      // 石板外缘
      ctx.strokeStyle = "#3a3428";
      ctx.lineWidth = cellSize * 0.64;
      ctx.stroke();
      // 泥石内道
      ctx.strokeStyle = "#4a5540";
      ctx.lineWidth = cellSize * 0.4;
      ctx.stroke();
      // 中心湿痕
      ctx.strokeStyle = "rgba(140,160,100,0.2)";
      ctx.lineWidth = cellSize * 0.12;
      ctx.stroke();
      // 尸潮脚印虚线
      ctx.setLineDash([3, 9]);
      ctx.strokeStyle = "rgba(160,180,90,0.32)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const entry = pathPoints[0];
    const exit = pathPoints[pathPoints.length - 1];
    drawZombieSpawn(entry.x, entry.y, now);
    drawCastleGate(exit.x, exit.y, now);

    // 放置预览
    if (state.buildType && state.hoverCell) {
      const { c, r } = state.hoverCell;
      if (c >= 0 && r >= 0 && c < COLS && r < ROWS) {
        const ok = canPlace(c, r);
        const p = cellCenter(c, r);
        const def = TOWER_DEFS[state.buildType];
        ctx.fillStyle = ok ? "rgba(212,175,85,0.22)" : "rgba(229,115,115,0.28)";
        ctx.fillRect(c * cellSize + 2, r * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.strokeStyle = ok ? "rgba(212,175,85,0.9)" : "rgba(229,115,115,0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(c * cellSize + 2, r * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, def.range * cellSize, 0, Math.PI * 2);
        ctx.fillStyle = ok ? "rgba(212,175,85,0.07)" : "rgba(229,115,115,0.07)";
        ctx.fill();
        ctx.strokeStyle = ok ? "rgba(212,175,85,0.5)" : "rgba(229,115,115,0.5)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (state.selected) {
      const t = state.selected;
      const pulse = 0.35 + Math.sin(now * 3.2) * 0.08;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range * cellSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,175,85,${pulse * 0.22})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,213,79,${0.45 + pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, cellSize * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,213,79,0.85)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(t.x, t.y, cellSize * 0.48, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,175,85,0.25)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    for (const t of state.towers) drawTower(t);
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      drawEnemy(e);
    }

    // 爆炸
    for (const ex of state.explosions) {
      const a = Math.max(0, ex.life / ex.maxLife);
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,140,66,${a})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,220,120,${a * 0.75})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,180,80,${a * 0.2})`;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      const shards = ex.shards || 6;
      for (let i = 0; i < shards; i++) {
        const ang = (Math.PI * 2 * i) / shards;
        const rr = ex.r * (0.7 + 0.3 * (1 - a));
        ctx.fillStyle = `rgba(255,200,100,${a * 0.9})`;
        ctx.beginPath();
        ctx.arc(ex.x + Math.cos(ang) * rr, ex.y + Math.sin(ang) * rr, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const p of state.projectiles) {
      if (!p.alive) continue;
      drawProjectile(p);
    }

    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 轻 vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(212,175,85,0.14)";
    ctx.font = `600 ${Math.max(11, cellSize * 0.32)}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText("路卫 · 城堡防线", w / 2, cellSize * 0.42);
  }

  function drawProjectile(p) {
    const speed = Math.hypot(p.vx, p.vy) || 1;
    const tx = (p.vx / speed) * 8;
    const ty = (p.vy / speed) * 8;
    if (p.style === "cannon") {
      ctx.strokeStyle = "rgba(255,171,118,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - tx, p.y - ty);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffab76";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x - 1.2, p.y - 1.2, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff3e0";
      ctx.fill();
      ctx.strokeStyle = "#bf360c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.style === "frost") {
      ctx.strokeStyle = "rgba(129,212,250,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x - tx * 0.8, p.y - ty * 0.8);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = "#e1f5fe";
      ctx.fillStyle = "#81d4fa";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.strokeStyle = "rgba(200,230,201,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x - tx, p.y - ty);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = "#c8e6c9";
      ctx.fillRect(-7, -1.2, 11, 2.4);
      ctx.fillStyle = "#ffecb3";
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(2, -2.8);
      ctx.lineTo(2, 2.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#558b2f";
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(-10, -2.5);
      ctx.lineTo(-8.5, 0);
      ctx.lineTo(-10, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /** 入口：僵尸裂隙 */
  function drawZombieSpawn(x, y, now) {
    const r = cellSize * 0.34;
    const pulse = 0.35 + Math.sin(now * 2.6) * 0.12;
    ctx.beginPath();
    ctx.arc(x, y, r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(140,180,70,${pulse})`;
    ctx.lineWidth = 4;
    ctx.stroke();
    // 不规则裂口
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + now * 0.2;
      const rr = r * (0.85 + (i % 2) * 0.18);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "#1a2014";
    ctx.fill();
    ctx.strokeStyle = "#8bc34a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(124,179,66,${0.55 + pulse * 0.3})`;
    ctx.fill();
    ctx.fillStyle = "#0a1008";
    ctx.font = `700 ${Math.max(9, cellSize * 0.22)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("尸", x, y + 0.5);
  }

  /** 出口：城堡门 */
  function drawCastleGate(x, y, now) {
    const s = cellSize;
    const pulse = 0.3 + Math.sin(now * 2.2 + 1.2) * 0.1;
    // 暖金光环
    ctx.beginPath();
    ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(212,175,85,${pulse})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // 石门主体
    const bw = s * 0.55;
    const bh = s * 0.62;
    roundRectPath(x - bw / 2, y - bh / 2, bw, bh, 3);
    ctx.fillStyle = "#5a4a36";
    ctx.fill();
    ctx.strokeStyle = "#3e3428";
    ctx.lineWidth = 2;
    ctx.stroke();
    // 城垛顶
    const teeth = 4;
    const tw = bw / teeth;
    for (let i = 0; i < teeth; i++) {
      if (i % 2 === 1) continue;
      ctx.fillStyle = "#6d5c45";
      ctx.fillRect(x - bw / 2 + i * tw, y - bh / 2 - s * 0.1, tw * 0.9, s * 0.12);
    }
    // 拱门洞
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.22, y + bh * 0.35);
    ctx.lineTo(x - bw * 0.22, y - bh * 0.05);
    ctx.quadraticCurveTo(x, y - bh * 0.38, x + bw * 0.22, y - bh * 0.05);
    ctx.lineTo(x + bw * 0.22, y + bh * 0.35);
    ctx.closePath();
    ctx.fillStyle = "#1a120c";
    ctx.fill();
    ctx.strokeStyle = "#d4af55";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 小旗
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + bw * 0.38, y - bh * 0.45);
    ctx.lineTo(x + bw * 0.38, y - bh * 0.75);
    ctx.stroke();
    ctx.fillStyle = "#c62828";
    ctx.beginPath();
    ctx.moveTo(x + bw * 0.38, y - bh * 0.75);
    ctx.lineTo(x + bw * 0.58, y - bh * 0.65);
    ctx.lineTo(x + bw * 0.38, y - bh * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffecb3";
    ctx.font = `700 ${Math.max(9, s * 0.2)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("门", x, y + bh * 0.12);
  }

  function roundRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawGroundShadow(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y + ry * 0.85, rx, ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fill();
  }

  function drawBattlements(cx, cy, w, h, n) {
    const tw = w / n;
    for (let i = 0; i < n; i++) {
      if (i % 2 === 1) continue;
      ctx.fillStyle = "#7a6a52";
      ctx.fillRect(cx - w / 2 + i * tw + 1, cy - h / 2 - h * 0.22, tw - 2, h * 0.24);
    }
  }

  function drawTowerLevelMarks(t, s) {
    if (t.level <= 1) return;
    const n = t.level - 1;
    for (let i = 0; i < n; i++) {
      const ox = (i - (n - 1) / 2) * s * 0.14;
      const gy = t.y - s * 0.48;
      // 金旗标记
      ctx.strokeStyle = "#8d6e63";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(t.x + ox, gy);
      ctx.lineTo(t.x + ox, gy - s * 0.14);
      ctx.stroke();
      ctx.fillStyle = t.type === "frost" ? "#81d4fa" : t.type === "cannon" ? "#e8985a" : "#ffd54f";
      ctx.beginPath();
      ctx.moveTo(t.x + ox, gy - s * 0.14);
      ctx.lineTo(t.x + ox + s * 0.1, gy - s * 0.1);
      ctx.lineTo(t.x + ox, gy - s * 0.06);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawTower(t) {
    const s = cellSize;
    drawGroundShadow(t.x, t.y, s * 0.32, s * 0.28);
    if (t.type === "arrow") drawArrowTower(t, s);
    else if (t.type === "cannon") drawCannonTower(t, s);
    else drawFrostTower(t, s);
    drawTowerLevelMarks(t, s);
  }

  /** 箭塔：石质箭楼 + 城垛 + 旗帜 */
  function drawArrowTower(t, s) {
    const bw = s * 0.52;
    const bh = s * 0.48;
    // 石基
    roundRectPath(t.x - bw / 2, t.y - bh / 2, bw, bh, 3);
    ctx.fillStyle = "#6d5c45";
    ctx.fill();
    ctx.strokeStyle = "#3e3428";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // 砖缝
    ctx.strokeStyle = "rgba(40,32,24,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(t.x - bw / 2 + 3, t.y);
    ctx.lineTo(t.x + bw / 2 - 3, t.y);
    ctx.stroke();
    drawBattlements(t.x, t.y - bh * 0.05, bw * 0.95, bh * 0.7, 4);
    // 绿旗
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(t.x + bw * 0.28, t.y - bh * 0.55);
    ctx.lineTo(t.x + bw * 0.28, t.y - bh * 0.95);
    ctx.stroke();
    ctx.fillStyle = t.color || "#9ccc65";
    ctx.beginPath();
    ctx.moveTo(t.x + bw * 0.28, t.y - bh * 0.95);
    ctx.lineTo(t.x + bw * 0.52, t.y - bh * 0.82);
    ctx.lineTo(t.x + bw * 0.28, t.y - bh * 0.7);
    ctx.closePath();
    ctx.fill();
    // 旋转箭台
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#8a7660";
    ctx.fill();
    ctx.strokeStyle = "#3e3428";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = "#dcedc8";
    ctx.lineWidth = 2.4;
    ctx.shadowColor = "rgba(156,204,101,0.4)";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(s * 0.02, 0);
    ctx.lineTo(s * 0.32, 0);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffecb3";
    ctx.beginPath();
    ctx.moveTo(s * 0.38, 0);
    ctx.lineTo(s * 0.28, -s * 0.06);
    ctx.lineTo(s * 0.28, s * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** 炮塔：石堡炮台 */
  function drawCannonTower(t, s) {
    const bw = s * 0.56;
    const bh = s * 0.5;
    roundRectPath(t.x - bw / 2, t.y - bh / 2, bw, bh, 4);
    ctx.fillStyle = "#5a4a36";
    ctx.fill();
    ctx.strokeStyle = "#2e281e";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawBattlements(t.x, t.y, bw * 0.9, bh * 0.75, 5);
    // 铜钉
    for (const [ox, oy] of [[-0.18, -0.14], [0.18, -0.14], [-0.18, 0.14], [0.18, 0.14]]) {
      ctx.beginPath();
      ctx.arc(t.x + ox * s, t.y + oy * s, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#d4af55";
      ctx.fill();
    }
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    roundRectPath(s * 0.02, -s * 0.09, s * 0.3, s * 0.18, 2);
    ctx.fillStyle = "#4e4030";
    ctx.fill();
    ctx.strokeStyle = "#2a2218";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.32, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = t.color || "#e8985a";
    ctx.shadowColor = "rgba(232,152,90,0.5)";
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(s * 0.32, 0, s * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = "#1a120c";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "#8a7660";
    ctx.fill();
    ctx.restore();
  }

  /** 霜塔：符文石塔 */
  function drawFrostTower(t, s) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, s * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(129,212,250,0.1)";
    ctx.fill();
    // 石六角底座
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const px = t.x + Math.cos(a) * s * 0.26;
      const py = t.y + Math.sin(a) * s * 0.26;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "#5a5348";
    ctx.fill();
    ctx.strokeStyle = "#81d4fa";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(129,212,250,0.4)";
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // 冰晶
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.26);
    ctx.lineTo(s * 0.1, -s * 0.02);
    ctx.lineTo(s * 0.05, s * 0.14);
    ctx.lineTo(-s * 0.05, s * 0.14);
    ctx.lineTo(-s * 0.1, -s * 0.02);
    ctx.closePath();
    ctx.fillStyle = t.color || "#81d4fa";
    ctx.globalAlpha = 0.88;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#e1f5fe";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.rotate(t.angle);
    ctx.beginPath();
    ctx.moveTo(s * 0.08, 0);
    ctx.lineTo(s * 0.28, -s * 0.05);
    ctx.lineTo(s * 0.28, s * 0.05);
    ctx.closePath();
    ctx.fillStyle = t.colorLight || "#e1f5fe";
    ctx.fill();
    ctx.restore();
  }

  function bodyFill(base, flash, slow, kind) {
    if (flash) return "#ffffff";
    if (slow && kind !== "flyer") return "#90caf9";
    return base;
  }

  function drawEnemy(e) {
    const rad = e.radius * cellSize;
    const now = gameNow; // 与受击闪白/减速同一模拟时钟
    const slowed = e.slowMul < 1;
    const flash = e.hitFlash && now < e.hitFlash;

    drawGroundShadow(e.x, e.y, rad * 0.95, rad * 0.8);

    if (slowed) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, rad + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(129,212,250,0.22)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e.x, e.y, rad + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(179,229,252,0.65)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.angle != null) ctx.rotate(e.angle);

    if (e.kind === "fast") drawEnemyFast(e, rad, flash, slowed);
    else if (e.kind === "tank") drawEnemyTank(e, rad, flash, slowed);
    else if (e.kind === "boss") drawEnemyBoss(e, rad, flash, slowed, now);
    else if (e.kind === "shield") drawEnemyShield(e, rad, flash, slowed);
    else if (e.kind === "flyer") drawEnemyFlyer(e, rad, flash, slowed);
    else drawEnemyNormal(e, rad, flash, slowed);

    ctx.restore();
    drawEnemyHpBar(e, rad);
  }

  /** 普通尸：歪斜躯干 + 绿灰腐烂感 */
  function drawEnemyNormal(e, rad, flash, slow) {
    const fill = bodyFill(e.color, flash, slow, e.kind);
    // 异形轮廓
    ctx.beginPath();
    ctx.moveTo(-rad * 0.7, rad * 0.55);
    ctx.quadraticCurveTo(-rad * 1.05, 0, -rad * 0.55, -rad * 0.7);
    ctx.quadraticCurveTo(0, -rad * 1.05, rad * 0.5, -rad * 0.65);
    ctx.quadraticCurveTo(rad * 1.0, -0.05 * rad, rad * 0.65, rad * 0.55);
    ctx.quadraticCurveTo(0, rad * 0.85, -rad * 0.7, rad * 0.55);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#33691e";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 腐烂斑
    if (!flash) {
      ctx.fillStyle = "rgba(60,80,30,0.35)";
      ctx.beginPath();
      ctx.ellipse(-rad * 0.2, rad * 0.1, rad * 0.22, rad * 0.14, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rad * 0.25, -rad * 0.15, rad * 0.15, rad * 0.1, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 空洞眼
    ctx.fillStyle = flash ? "#333" : "#1a2010";
    ctx.beginPath();
    ctx.ellipse(-rad * 0.28, -rad * 0.2, rad * 0.16, rad * 0.2, -0.2, 0, Math.PI * 2);
    ctx.ellipse(rad * 0.3, -rad * 0.18, rad * 0.14, rad * 0.18, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c5e1a5";
    ctx.beginPath();
    ctx.arc(-rad * 0.22, -rad * 0.22, rad * 0.05, 0, Math.PI * 2);
    ctx.arc(rad * 0.34, -rad * 0.2, rad * 0.045, 0, Math.PI * 2);
    ctx.fill();
    // 张口
    ctx.fillStyle = flash ? "#555" : "#2e1a1a";
    ctx.beginPath();
    ctx.ellipse(0, rad * 0.25, rad * 0.28, rad * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 快跑尸：瘦长冲刺 */
  function drawEnemyFast(e, rad, flash, slow) {
    const fill = bodyFill(e.color, flash, slow, e.kind);
    if (!flash) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(-rad * 1.6, 0);
      ctx.lineTo(-rad * 0.4, -rad * 0.35);
      ctx.lineTo(-rad * 0.4, rad * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.moveTo(rad * 1.1, 0);
    ctx.lineTo(-rad * 0.1, -rad * 0.45);
    ctx.lineTo(-rad * 0.95, 0);
    ctx.lineTo(-rad * 0.1, rad * 0.45);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#558b2f";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 爪
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rad * 0.2, -rad * 0.25);
    ctx.lineTo(rad * 0.7, -rad * 0.7);
    ctx.moveTo(rad * 0.2, rad * 0.25);
    ctx.lineTo(rad * 0.7, rad * 0.7);
    ctx.stroke();
    ctx.fillStyle = flash ? "#333" : "#2e3a18";
    ctx.beginPath();
    ctx.arc(rad * 0.35, 0, rad * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dcedc8";
    ctx.beginPath();
    ctx.arc(rad * 0.4, -rad * 0.04, rad * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 坦克尸：臃肿蛮尸 */
  function drawEnemyTank(e, rad, flash, slow) {
    const fill = bodyFill(e.color, flash, slow, e.kind);
    const dark = flash ? "#bbb" : (slow ? "#64b5f6" : (e.colorDark || "#4a5a32"));
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.05, rad * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // 鼓包肩
    ctx.beginPath();
    ctx.ellipse(-rad * 0.85, 0, rad * 0.35, rad * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(rad * 0.85, 0, rad * 0.35, rad * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();
    if (!flash) {
      ctx.fillStyle = "rgba(50,60,30,0.4)";
      ctx.beginPath();
      ctx.ellipse(0, rad * 0.15, rad * 0.4, rad * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = flash ? "#333" : "#1a2010";
    ctx.beginPath();
    ctx.ellipse(-rad * 0.28, -rad * 0.15, rad * 0.18, rad * 0.14, 0, 0, Math.PI * 2);
    ctx.ellipse(rad * 0.28, -rad * 0.15, rad * 0.18, rad * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a5d6a7";
    ctx.beginPath();
    ctx.arc(-rad * 0.22, -rad * 0.15, rad * 0.06, 0, Math.PI * 2);
    ctx.arc(rad * 0.34, -rad * 0.15, rad * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Boss 尸：巨型尸王 */
  function drawEnemyBoss(e, rad, flash, slow, now) {
    const fill = bodyFill(e.color, flash, slow, e.kind);
    const pulse = 1 + Math.sin(now * 3) * 0.05;
    ctx.beginPath();
    ctx.arc(0, 0, rad * 1.3 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,140,60,0.14)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, rad * 1.2 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180,200,100,0.45)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // 不规则巨体
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = rad * (0.9 + (i % 2) * 0.18);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#4a4728";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // 角状骨刺
    ctx.fillStyle = flash ? "#eee" : "#c5c89a";
    ctx.beginPath();
    ctx.moveTo(-rad * 0.4, -rad * 0.6);
    ctx.lineTo(-rad * 0.25, -rad * 1.2);
    ctx.lineTo(-rad * 0.05, -rad * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rad * 0.4, -rad * 0.6);
    ctx.lineTo(rad * 0.25, -rad * 1.2);
    ctx.lineTo(rad * 0.05, -rad * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -rad * 0.7);
    ctx.lineTo(0, -rad * 1.35);
    ctx.lineTo(rad * 0.15, -rad * 0.7);
    ctx.closePath();
    ctx.fillStyle = flash ? "#fff" : "#dce775";
    ctx.fill();
    // 三眼感（略抽象）
    ctx.fillStyle = flash ? "#333" : "#1a1808";
    ctx.beginPath();
    ctx.arc(-rad * 0.3, -rad * 0.1, rad * 0.16, 0, Math.PI * 2);
    ctx.arc(rad * 0.3, -rad * 0.1, rad * 0.16, 0, Math.PI * 2);
    ctx.arc(0, rad * 0.15, rad * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a65";
    ctx.beginPath();
    ctx.arc(-rad * 0.25, -rad * 0.12, rad * 0.06, 0, Math.PI * 2);
    ctx.arc(rad * 0.35, -rad * 0.12, rad * 0.06, 0, Math.PI * 2);
    ctx.arc(0.04 * rad, rad * 0.13, rad * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 盾尸：破甲盾僵尸 */
  function drawEnemyShield(e, rad, flash, slow) {
    const fill = bodyFill(e.color, flash, slow, e.kind);
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 0.7, rad * 0.75, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#3e4634";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 破木盾
    ctx.fillStyle = flash ? "#eceff1" : "#6d5c45";
    ctx.beginPath();
    ctx.moveTo(rad * 0.25, -rad * 0.85);
    ctx.lineTo(rad * 1.15, -rad * 0.5);
    ctx.lineTo(rad * 1.2, 0.05 * rad);
    ctx.lineTo(rad * 1.1, rad * 0.55);
    ctx.lineTo(rad * 0.25, rad * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3e3428";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = flash ? "#fff" : "#a1887f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rad * 0.5, -rad * 0.4);
    ctx.lineTo(rad * 0.5, rad * 0.4);
    ctx.moveTo(rad * 0.5, 0);
    ctx.lineTo(rad * 1.0, 0);
    ctx.stroke();
    ctx.fillStyle = flash ? "#333" : "#1a2010";
    ctx.beginPath();
    ctx.arc(-rad * 0.15, -rad * 0.1, rad * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 飞尸：飘浮怨灵尸 */
  function drawEnemyFlyer(e, rad, flash, slow) {
    const fill = bodyFill(e.color, flash, slow, e.kind);
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.25, rad * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#5a6b3a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 残翼
    ctx.beginPath();
    ctx.moveTo(-rad * 0.2, -rad * 0.2);
    ctx.quadraticCurveTo(-rad * 1.1, -rad * 0.9, -rad * 0.5, -rad * 0.05);
    ctx.closePath();
    ctx.fillStyle = flash ? "#fff" : "rgba(176,191,136,0.55)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-rad * 0.2, rad * 0.2);
    ctx.quadraticCurveTo(-rad * 1.1, rad * 0.9, -rad * 0.5, rad * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rad * 0.55, 0, rad * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = flash ? "#333" : "#2e3a18";
    ctx.beginPath();
    ctx.arc(rad * 0.65, -rad * 0.05, rad * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dcedc8";
    ctx.beginPath();
    ctx.arc(rad * 0.7, -rad * 0.08, rad * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(200,220,140,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.35, rad * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawEnemyHpBar(e, rad) {
    const bw = Math.max(rad * 2.4, 16);
    const bh = e.kind === "boss" ? 5 : 4;
    const bx = e.x - bw / 2;
    const by = e.y - rad - (e.kind === "boss" ? 14 : 10);
    roundRectPath(bx - 1, by - 1, bw + 2, bh + 2, 2);
    ctx.fillStyle = "rgba(20,24,12,0.65)";
    ctx.fill();
    const ratio = Math.max(0, e.hp / e.maxHp);
    // 尸潮感：黄绿→土黄→暗褐红，避免血腥夸张
    const col = ratio > 0.5 ? "#9ccc65" : ratio > 0.25 ? "#c0a050" : "#a06050";
    if (ratio > 0) {
      roundRectPath(bx, by, bw * ratio, bh, 1.5);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.fillStyle = "rgba(220,240,180,0.3)";
      ctx.fillRect(bx + 1, by + 1, Math.max(0, bw * ratio - 2), 1.5);
    }
    if (e.kind === "boss") {
      ctx.strokeStyle = "rgba(180,200,100,0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
    }
  }


  // ---------- 主循环 ----------
  let last = performance.now() / 1000;
  function frame(ts) {
    const wallNow = ts / 1000;
    let dt = wallNow - last;
    last = wallNow;
    if (dt > 0.05) dt = 0.05;
    const simDt = dt * (state.speed || 1);
    gameNow += simDt;
    update(simDt, gameNow);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
  }
  requestAnimationFrame(() => requestAnimationFrame(resize));
  resize();
  updateHUD();
  requestAnimationFrame(frame);

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
    restBeforeWave,
    setGameSpeed,
    awardSpeedClearBonus,
  };
})();
