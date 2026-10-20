/**
 * 路卫 — Coinpath Defense
 * 竖屏「几」字形路径塔防 · 纯 Canvas
 * 1000 关 × 每关 30 波 · 难度档 · 地图阶
 */
(() => {
  "use strict";

  // ---------- 常量 ----------
  const COLS = 8;
  const ROWS = 12;
  const TOTAL_LEVELS = 1000;
  const WAVES_PER_LEVEL = 30;
  const START_GOLD_BASE = 120;
  const SELL_RATIO = 0.6;
  /** 3★ 专精分支 */
  const BRANCH_DEFS = {
    arrow: {
      rapid: { id: "rapid", name: "连弩", desc: "射速×1.6 · 同时3目标 · 单发×0.7" },
      snipe: { id: "snipe", name: "狙击", desc: "射程+2 · 伤×2.2 · 射速×0.6 · 无视盾减" },
    },
    cannon: {
      mortar: { id: "mortar", name: "迫击", desc: "射程+1.5 · 溅射×1.5 · 射速×0.8" },
      burn: { id: "burn", name: "燃烧", desc: "落点火 2s · 每秒 25% 炮弹伤" },
    },
    frost: {
      freeze: { id: "freeze", name: "冰封", desc: "12% 冻结 1s（Boss 0.4s）" },
      shatter: { id: "shatter", name: "碎冰", desc: "减速中目标全伤害 +25%" },
    },
  };
  const MERGE_MIN_LEVEL = 2; // 合成要求 Lv≥2，缓和 3★ 节奏
  const RUN_SNAPSHOT_KEY = "coinpath_run_v18";
  /** 主动技能池（专家表）：S = 1+0.2×(stage−1)；每关三选二 */
  const SKILL_DEFS = {
    meteor: {
      id: "meteor", short: "火雨", name: "流星火雨", icon: "☄",
      cd: 60, aim: "point", weight: 1,
      desc: "点地图落下火雨，半径 2 格",
      meta: "冷却 60s · 伤 120×S · Boss×0.5",
    },
    reinforce: {
      id: "reinforce", short: "援军", name: "援军", icon: "🛡",
      cd: 45, aim: "instant", weight: 1,
      desc: "路径召唤 3 名拦路兵，持续 8 秒",
      meta: "冷却 45s · 血 200×S · Boss 仅减速",
    },
    hourglass: {
      id: "hourglass", short: "沙漏", name: "时光沙漏", icon: "⌛",
      cd: 75, aim: "instant", weight: 0.7,
      desc: "全场敌人大幅减速 4 秒",
      meta: "冷却 75s · 移速×0.4 · Boss×0.65",
    },
    chain: {
      id: "chain", short: "雷击", name: "连锁雷击", icon: "⚡",
      cd: 50, aim: "enemy", weight: 1,
      desc: "点选 1 只怪，弹射 6 次优先最近",
      meta: "冷却 50s · 每跳 80×S · 衰减 15% · 盾×1.2",
    },
    goldtide: {
      id: "goldtide", short: "金潮", name: "金币潮", icon: "💰",
      cd: 90, aim: "instant", weight: 0.7,
      desc: "立刻得金，且 8 秒内击杀赏金×1.5",
      meta: "冷却 90s · 金 round(25×√阶) · 赏金×1.5",
    },
  };
  const SKILL_IDS = Object.keys(SKILL_DEFS);
  const BASE_HP = 40;
  const BASE_SPEED = 1.0; // 格/秒
  const BASE_REWARD = 8;
  const MAX_PARTICLES = 80;
  const WAVE_REST_DEFAULT = 4;
  const SAVE_KEY = "coinpath_v12";

  /** 地图场景皮肤（仅绘制；路径/可放塔逻辑不变）。按 stage 轮换 */
  const SCENE_SKINS = [
    {
      id: "dusk_castle",
      name: "暮城石砖",
      sky: ["#2e261c", "#1c1812", "#12140e"],
      tileEven: "#2a2418",
      tileOdd: "#322a1c",
      pathFill: "#1a2218",
      pathOuter: "rgba(90,120,60,0.16)",
      pathEdge: "#3a3428",
      pathMid: "#4a5540",
      pathInner: "rgba(140,160,100,0.2)",
      pathDash: "rgba(160,180,90,0.32)",
      accent: "rgba(212,175,85,0.14)",
      vignette: 0.32,
      decor: "brick",
    },
    {
      id: "grave_fog",
      name: "枯墓雾夜",
      sky: ["#1a1e28", "#12161e", "#0a0c12"],
      tileEven: "#1c2028",
      tileOdd: "#242830",
      pathFill: "#14181c",
      pathOuter: "rgba(100,120,140,0.18)",
      pathEdge: "#2a3038",
      pathMid: "#3a4450",
      pathInner: "rgba(160,180,200,0.18)",
      pathDash: "rgba(180,200,220,0.28)",
      accent: "rgba(160,180,200,0.16)",
      vignette: 0.42,
      decor: "fog",
    },
    {
      id: "frost_tundra",
      name: "冰霜雪原",
      sky: ["#1a2838", "#142030", "#0e1824"],
      tileEven: "#1e2c3a",
      tileOdd: "#243444",
      pathFill: "#152430",
      pathOuter: "rgba(120,180,220,0.2)",
      pathEdge: "#3a5568",
      pathMid: "#5a7a90",
      pathInner: "rgba(180,220,255,0.28)",
      pathDash: "rgba(200,230,255,0.35)",
      accent: "rgba(129,212,250,0.18)",
      vignette: 0.28,
      decor: "snow",
    },
    {
      id: "magma_rift",
      name: "熔岩裂隙",
      sky: ["#2a1410", "#1c0e0c", "#120808"],
      tileEven: "#2a1814",
      tileOdd: "#321e18",
      pathFill: "#1a100c",
      pathOuter: "rgba(220,80,40,0.18)",
      pathEdge: "#4a2820",
      pathMid: "#6a3a28",
      pathInner: "rgba(255,120,60,0.28)",
      pathDash: "rgba(255,160,80,0.35)",
      accent: "rgba(255,140,66,0.16)",
      vignette: 0.38,
      decor: "lava",
    },
    {
      id: "toxic_marsh",
      name: "毒沼荒原",
      sky: ["#1a2418", "#121a12", "#0c120c"],
      tileEven: "#1e2818",
      tileOdd: "#263020",
      pathFill: "#141c12",
      pathOuter: "rgba(100,180,60,0.16)",
      pathEdge: "#2a3a24",
      pathMid: "#3a5040",
      pathInner: "rgba(140,220,100,0.22)",
      pathDash: "rgba(160,230,120,0.3)",
      accent: "rgba(156,204,101,0.16)",
      vignette: 0.36,
      decor: "toxic",
    },
  ];

  function sceneSkinFor(stage) {
    // 玩家在开始屏选定的地图皮肤优先；未选则按 stage 轮换（旧行为）
    if (state && Number.isInteger(state.mapIndex) && SCENE_SKINS[state.mapIndex]) {
      return SCENE_SKINS[state.mapIndex];
    }
    const s = Math.max(1, stage | 0);
    return SCENE_SKINS[(s - 1) % SCENE_SKINS.length];
  }
  function skinForIndex(idx) {
    const i = Math.max(0, Math.min(SCENE_SKINS.length - 1, idx | 0));
    return SCENE_SKINS[i];
  }


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

  /** 难度档：选关前选，全局乘子 */
  const DIFFICULTIES = {
    patrol: { key: "patrol", name: "巡城", hp: 1.0, speed: 1.0, reward: 1.0, goldBonus: 0, lives: 20 },
    hold: { key: "hold", name: "固守", hp: 1.25, speed: 1.08, reward: 1.05, goldBonus: 0, lives: 20 },
    blood: { key: "blood", name: "血战", hp: 1.55, speed: 1.15, reward: 1.1, goldBonus: 20, lives: 20 },
    abyss: { key: "abyss", name: "绝境", hp: 2.0, speed: 1.22, reward: 1.15, goldBonus: 40, lives: 15 },
  };

  // 可变路径（随关卡 seed / 地图阶重建）
  let PATH_CELLS = [];
  let PATH_SET = new Set();

  function mapStage(level) {
    return Math.floor((Math.max(1, level) - 1) / 30) + 1;
  }

  function hashSeed(level, diffKey) {
    const diffId = DIFFICULTIES[diffKey] ? DIFFICULTIES[diffKey].key.length + Object.keys(DIFFICULTIES).indexOf(diffKey) * 17 : 0;
    let h = (level * 2654435761) ^ (diffId * 2246822519) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h >>> 0);
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function expandPolyline(waypoints) {
    const cells = [];
    const push = (c, r) => {
      c = Math.max(0, Math.min(COLS - 1, c));
      r = Math.max(0, Math.min(ROWS - 1, r));
      if (!cells.length || cells[cells.length - 1][0] !== c || cells[cells.length - 1][1] !== r) {
        cells.push([c, r]);
      }
    };
    for (let i = 0; i < waypoints.length - 1; i++) {
      let [c0, r0] = waypoints[i];
      let [c1, r1] = waypoints[i + 1];
      push(c0, r0);
      while (c0 !== c1 || r0 !== r1) {
        if (c0 < c1) c0++;
        else if (c0 > c1) c0--;
        else if (r0 < r1) r0++;
        else if (r0 > r1) r0--;
        push(c0, r0);
      }
    }
    return cells;
  }

  /** 6～8 条预置折线骨架（复杂度递增） */
  const PATH_SKELETONS = [
    // 0 经典几字
    [[2, 0], [2, 2], [5, 2], [5, 5], [2, 5], [2, 8], [5, 8], [5, 11]],
    // 1 左偏几字
    [[1, 0], [1, 3], [4, 3], [4, 6], [1, 6], [1, 9], [6, 9], [6, 11]],
    // 2 右偏几字
    [[5, 0], [5, 2], [2, 2], [2, 5], [6, 5], [6, 8], [3, 8], [3, 11]],
    // 3 多折
    [[3, 0], [3, 2], [6, 2], [6, 4], [1, 4], [1, 7], [5, 7], [5, 9], [2, 9], [2, 11]],
    // 4 密折 zigzag
    [[2, 0], [2, 1], [6, 1], [6, 3], [1, 3], [1, 5], [6, 5], [6, 7], [2, 7], [2, 9], [5, 9], [5, 11]],
    // 5 S 密径
    [[1, 0], [1, 2], [6, 2], [6, 4], [2, 4], [2, 6], [6, 6], [6, 8], [1, 8], [1, 10], [4, 10], [4, 11]],
    // 6 蛇形长径
    [[4, 0], [4, 1], [1, 1], [1, 3], [6, 3], [6, 5], [1, 5], [1, 7], [6, 7], [6, 9], [2, 9], [2, 11]],
    // 7 最密迷宫折
    [[2, 0], [2, 1], [5, 1], [5, 2], [1, 2], [1, 4], [6, 4], [6, 6], [1, 6], [1, 8], [7, 8], [7, 10], [3, 10], [3, 11]],
  ];

  function pickSkeletonIndex(stage, seed) {
    const rng = mulberry32(seed);
    // 阶越高，从更密的骨架池里抽
    const maxIdx = Math.min(PATH_SKELETONS.length - 1, 2 + Math.floor((stage - 1) * 0.45));
    const minIdx = Math.min(maxIdx, Math.floor((stage - 1) / 4));
    const span = Math.max(1, maxIdx - minIdx + 1);
    return minIdx + Math.floor(rng() * span);
  }

  function buildPathForLevel(level, diffKey) {
    const stage = mapStage(level);
    const seed = hashSeed(level, diffKey);
    const idx = pickSkeletonIndex(stage, seed);
    const cells = expandPolyline(PATH_SKELETONS[idx]);
    return { cells, seed, stage, skeleton: idx };
  }

  function applyPathCells(cells) {
    PATH_CELLS.length = 0;
    for (const c of cells) PATH_CELLS.push(c);
    PATH_SET = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));
  }

  function normalReward(hpMul) {
    return Math.max(1, Math.round(BASE_REWARD * Math.sqrt(hpMul)));
  }

  /** 关内波型模板 1–30（原表） */
  function baseWavePlan(n) {
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

  function remapKind(kind, stage) {
    if (kind === "shield" && stage < 2) return "tank";
    if (kind === "flyer" && stage < 3) return "fast";
    return kind;
  }

  /**
   * 程序化波次：关内波 w∈[1,30] × 难度档 × 地图阶
   * 依赖 state.level / state.difficulty / state.stage
   */
  function wavePlan(w) {
    const stage = state.stage || 1;
    const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES.patrol;
    const stageHp = 1 + 0.06 * (stage - 1);
    const stageSpd = 1 + 0.02 * (stage - 1);
    const countMul = 1 + 0.015 * (stage - 1);
    const milestoneBoss = state.level % 30 === 0 && w === 30;

    let plan = baseWavePlan(w).map((g) => ({ ...g, kind: remapKind(g.kind, stage) }));

    // 新怪注入（按地图阶解锁）
    if (stage >= 5 && (w === 14 || w === 22 || w === 28)) {
      plan.push({
        kind: "splitter",
        count: Math.max(2, Math.round(2 + stage * 0.25)),
        speedMul: 1.1,
        hpMul: 1.6 + stage * 0.05,
        reward: 15,
      });
    }
    if (stage >= 8 && (w === 16 || w === 25 || w === 29)) {
      plan.push({
        kind: "healer",
        count: Math.max(1, Math.round(1 + stage * 0.12)),
        speedMul: 0.85,
        hpMul: 2.0 + stage * 0.04,
        reward: 20,
      });
    }
    if (stage >= 12 && (w === 19 || w === 23 || w === 27)) {
      plan.push({
        kind: "blinker",
        count: Math.max(2, Math.round(2 + stage * 0.18)),
        speedMul: 1.25,
        hpMul: 1.4 + stage * 0.03,
        reward: 18,
      });
    }

    plan = plan.map((g) => {
      let hpMul = g.hpMul * diff.hp * stageHp;
      let speedMul = g.speedMul * diff.speed * stageSpd;
      let count = Math.max(1, Math.round(g.count * countMul));
      let reward = g.reward != null ? Math.max(1, Math.round(g.reward * diff.reward)) : undefined;
      if (stage >= 4) hpMul *= 1.15; // 3★ 合成对冲
      if (g.kind === "boss") {
        hpMul *= 1 + 0.08 * (stage - 1);
        if (milestoneBoss) hpMul *= 1.35;
      }
      if (milestoneBoss && g.kind !== "boss") {
        count = Math.max(1, Math.round(count * 1.2));
      }
      return { kind: g.kind, count, speedMul, hpMul, reward };
    });

    return plan;
  }

  function restBeforeWave(nextWave) {
    let rest;
    if (nextWave === 30) rest = 6;
    else if (nextWave >= 21) rest = 4.5;
    else if (nextWave >= 13) rest = 3.5;
    else rest = WAVE_REST_DEFAULT;
    if ([5, 10, 15, 20, 25].includes(nextWave)) rest += 1.5;
    // 地图阶越高略多喘息
    rest += Math.min(2, (state.stage - 1) * 0.05);
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
  const btnMenu = document.getElementById("btn-menu");
  const towerBtns = [...document.querySelectorAll(".tower-btn")];
  const elLevel = document.getElementById("hud-level");
  const elDiff = document.getElementById("hud-diff");
  const startOverlay = document.getElementById("start-overlay");
  const startDiffBtns = document.getElementById("start-diff-btns");
  const startLevelInput = document.getElementById("start-level");
  const startLevelMax = document.getElementById("start-level-max");
  const startStageHint = document.getElementById("start-stage-hint");
  const btnStartGame = document.getElementById("btn-start-game");
  const endActions = document.getElementById("end-actions");
  const pauseOverlay = document.getElementById("pause-overlay");
  const btnPause = document.getElementById("btn-pause");
  const btnResume = document.getElementById("btn-resume");
  const btnPauseMenu = document.getElementById("btn-pause-menu");
  const btnHudMenu = document.getElementById("btn-hud-menu");
  const startMapBtns = document.getElementById("start-map-btns");
  const btnMerge = document.getElementById("btn-merge");
  const skillBtnsEl = document.getElementById("skill-btns");
  const branchOverlay = document.getElementById("branch-overlay");
  const branchTitle = document.getElementById("branch-title");
  const branchOptions = document.getElementById("branch-options");
  const skillPickOverlay = document.getElementById("skill-pick-overlay");
  const skillPickOptions = document.getElementById("skill-pick-options");
  const skillPickCount = document.getElementById("skill-pick-count");
  const btnSkillConfirm = document.getElementById("btn-skill-confirm");
  const btnSkillCancel = document.getElementById("btn-skill-cancel");
  const btnContinue = document.getElementById("btn-continue");

  // ---------- 状态 ----------
  let cellSize = 50;
  let pathPoints = [];
  let pathLen = 0;

  const state = {
    difficulty: "patrol",
    mapIndex: 0, // 玩家所选地图皮肤（SCENE_SKINS 下标）
    level: 1,
    stage: 1,
    seed: 0,
    lives: 20,
    gold: START_GOLD_BASE,
    wave: 0,
    kills: 0,
    spent: 0,
    phase: "menu", // menu | idle | countdown | spawning | fighting | won | lost
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
    sessionKills: 0,
    paused: false,
    mergeMode: false,
    mergePicks: [],
    skillAim: null, // null | skillId needing aim
    fires: [],
    allies: [],
    activeSkills: [], // 本关带入的 2 个技能 id
    skillCd: {},
    skillHintShown: false,
    pendingBranchTower: null,
    timeSlowUntil: 0,
    goldTideUntil: 0,
    pendingStart: null, // {level,diff,map} while picking skills
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

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return {
          best: { patrol: 1, hold: 1, blood: 1, abyss: 1 },
          lastDiff: "patrol",
          lastMap: 0,
          lastLevel: 1,
        };
      }
      const data = JSON.parse(raw);
      const best = data.best || {};
      return {
        best: {
          patrol: Math.max(1, Math.min(TOTAL_LEVELS, Number(best.patrol) || 1)),
          hold: Math.max(1, Math.min(TOTAL_LEVELS, Number(best.hold) || 1)),
          blood: Math.max(1, Math.min(TOTAL_LEVELS, Number(best.blood) || 1)),
          abyss: Math.max(1, Math.min(TOTAL_LEVELS, Number(best.abyss) || 1)),
        },
        lastDiff: DIFFICULTIES[data.lastDiff] ? data.lastDiff : "patrol",
        lastMap: Math.max(0, Math.min(SCENE_SKINS.length - 1, Number(data.lastMap) || 0)),
        lastLevel: Math.max(1, Math.min(TOTAL_LEVELS, Number(data.lastLevel) || 1)),
      };
    } catch (_) {
      return {
        best: { patrol: 1, hold: 1, blood: 1, abyss: 1 },
        lastDiff: "patrol",
        lastMap: 0,
        lastLevel: 1,
      };
    }
  }

  function persistSave(patch) {
    const cur = loadSave();
    const next = {
      best: { ...cur.best, ...(patch.best || {}) },
      lastDiff: patch.lastDiff != null ? patch.lastDiff : cur.lastDiff,
      lastMap: patch.lastMap != null ? patch.lastMap : cur.lastMap,
      lastLevel: patch.lastLevel != null ? patch.lastLevel : cur.lastLevel,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch (_) {}
    return next;
  }

  function maxUnlocked(diffKey) {
    const save = loadSave();
    // best = 已通关最高关；可玩到 best+1（封顶 1000）；未通关时 best 记为进度上限
    const cleared = save.best[diffKey] || 1;
    // 约定：best 存「最高可达关卡号」（通关 L 后 best=min(1000,L+1)，初始 1）
    return Math.max(1, Math.min(TOTAL_LEVELS, cleared));
  }

  function recordLevelClear(diffKey, level) {
    const save = loadSave();
    const unlock = Math.min(TOTAL_LEVELS, level + 1);
    const prev = save.best[diffKey] || 1;
    const best = Math.max(prev, unlock);
    persistSave({
      best: { [diffKey]: best },
      lastDiff: diffKey,
      lastLevel: Math.min(TOTAL_LEVELS, level + 1),
    });
  }

  function diffDef() {
    return DIFFICULTIES[state.difficulty] || DIFFICULTIES.patrol;
  }

  function startingGold() {
    return START_GOLD_BASE + (diffDef().goldBonus || 0);
  }

  function startingLives() {
    return diffDef().lives;
  }

  function setupLevel(level, diffKey, opts = {}) {
    const prevStage = state.stage;
    state.difficulty = diffKey;
    state.level = level;
    if (opts.mapIndex != null && Number.isInteger(opts.mapIndex)) {
      state.mapIndex = Math.max(0, Math.min(SCENE_SKINS.length - 1, opts.mapIndex));
    }
    const built = buildPathForLevel(level, diffKey);
    state.stage = built.stage;
    state.seed = built.seed;
    applyPathCells(built.cells);
    if (typeof rebuildPathPixels === "function" && cellSize) {
      rebuildPathPixels();
    }
    // 阶数升级仅 toast，不覆盖玩家所选地图皮肤
    if (opts.toastMap && built.stage > (opts.prevStage || prevStage)) {
      const skinName = (SCENE_SKINS[state.mapIndex] || SCENE_SKINS[0]).name;
      toast(`地图阶升级 · 第 ${built.stage} 阶 · ${skinName}`, 2600);
    }
    return built;
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
  function levelInvested(type, level) {
    const d = TOWER_DEFS[type];
    let inv = d.cost;
    if (level >= 2) inv += Math.round(d.cost * 0.8);
    if (level >= 3) inv += Math.round(d.cost * 1.2);
    return inv;
  }

  function towerStats(type, level, star = 1, branch = null) {
    const d = TOWER_DEFS[type];
    let range = d.range;
    let rate = d.rate;
    let damage = d.damage;
    let slow = d.slow || 0;
    let splash = d.splash || 0;
    let splashRatio = d.splashRatio || 0;

    // 星内 Lv1–3
    if (level >= 2) {
      damage *= 1.4;
      rate *= 1.15;
      if (type === "frost") slow = Math.min(0.5, slow + 0.05);
    }
    if (level >= 3) {
      damage *= 1.35;
      range += 0.4;
      if (type === "frost") slow = Math.min(0.5, slow + 0.05);
    }

    // 星级（相对星内基础的绝对乘子）
    const st = Math.max(1, Math.min(3, star | 0));
    if (st === 2) {
      damage *= 1.8;
      rate *= 1.1;
    } else if (st >= 3) {
      damage *= 3.2;
      rate *= 1.2;
      range += 0.3;
    }

    let multiTarget = 1;
    let ignoreShieldArrow = false;
    let burnGround = false;
    let freezeChance = 0;
    let shatterBonus = false;
    let branchName = "";

    if (st >= 3 && branch) {
      if (type === "arrow" && branch === "rapid") {
        rate *= 1.6;
        multiTarget = 3;
        damage *= 0.7;
        branchName = "连弩";
      } else if (type === "arrow" && branch === "snipe") {
        range += 2;
        damage *= 2.2;
        rate *= 0.6;
        ignoreShieldArrow = true;
        branchName = "狙击";
      } else if (type === "cannon" && branch === "mortar") {
        range += 1.5;
        splash *= 1.5;
        rate *= 0.8;
        branchName = "迫击";
      } else if (type === "cannon" && branch === "burn") {
        burnGround = true;
        branchName = "燃烧";
      } else if (type === "frost" && branch === "freeze") {
        freezeChance = 0.12;
        branchName = "冰封";
      } else if (type === "frost" && branch === "shatter") {
        shatterBonus = true;
        branchName = "碎冰";
      }
    }

    return {
      range,
      rate,
      damage: Math.round(damage * 10) / 10,
      slow,
      slowDur: d.slowDur || 0,
      splash,
      splashRatio,
      color: d.color,
      colorDark: d.colorDark,
      colorLight: d.colorLight,
      name: d.name,
      projectile: d.projectile,
      multiTarget,
      ignoreShieldArrow,
      burnGround,
      freezeChance,
      shatterBonus,
      branchName,
    };
  }

  function upgradeCost(type, level) {
    const d = TOWER_DEFS[type];
    if (level === 1) return Math.round(d.cost * 0.8);
    if (level === 2) return Math.round(d.cost * 1.2);
    return 0;
  }

  function branchLabel(type, branch) {
    const pack = BRANCH_DEFS[type];
    if (!pack || !branch || !pack[branch]) return "";
    return pack[branch].name;
  }

  function hasShatterAura() {
    return state.towers.some((t) => t.shatterBonus);
  }

  // ---------- 实体 ----------
  class Tower {
    constructor(type, c, r, opts = {}) {
      this.type = type;
      this.c = c;
      this.r = r;
      this.level = opts.level != null ? opts.level : 1;
      this.star = opts.star != null ? opts.star : 1;
      this.branch = opts.branch || null;
      this.invested = opts.invested != null ? opts.invested : TOWER_DEFS[type].cost;
      this.mergePips = opts.mergePips != null ? opts.mergePips : 0;
      const p = cellCenter(c, r);
      this.x = p.x;
      this.y = p.y;
      this.cooldown = 0;
      this.angle = -Math.PI / 2;
      this.muzzleFlash = 0;
      this.refresh();
    }
    refresh() {
      const stats = towerStats(this.type, this.level, this.star, this.branch);
      Object.assign(this, stats);
      // invested 由建造/升级/合成维护，不被 stats 覆盖
    }
    upgrade() {
      if (this.level >= 3) return false;
      const cost = upgradeCost(this.type, this.level);
      if (state.gold < cost) return false;
      state.gold -= cost;
      state.spent += cost;
      this.invested += cost;
      this.level++;
      this.refresh();
      return true;
    }
    sellValue() {
      return Math.floor(this.invested * SELL_RATIO);
    }
    displayName() {
      const stars = "★".repeat(this.star) + "☆".repeat(3 - this.star);
      const br = this.branchName ? ` · ${this.branchName}` : "";
      return `${this.name} ${stars} Lv.${this.level}${br}`;
    }
  }

  function visualTierFor(kind) {
    if (kind === "boss") return "boss";
    if (kind === "shield" || kind === "flyer" || kind === "splitter" ||
        kind === "healer" || kind === "blinker") return "elite";
    if (kind === "tank") return "heavy";
    return "normal"; // infantry / fast / spawn
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
      this.freezeUntil = 0;
      this.freezeIcdUntil = 0;
      this.blockedBy = null;
      this.dead = false;
      this.escaped = false;
      this.hitFlash = 0;
      this.priority = kind === "flyer" ? 2 : kind === "blinker" ? 2 : kind === "boss" ? 1 : 0;

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
      } else if (kind === "splitter") {
        this.radius = 0.3;
        this.color = "#c48a5a";
        this.colorDark = "#6b3e22";
        this.splitOnDeath = true;
      } else if (kind === "healer") {
        this.radius = 0.34;
        this.color = "#8bc34a";
        this.colorDark = "#33691e";
        this.healTimer = 0;
      } else if (kind === "blinker") {
        this.radius = 0.26;
        this.color = "#ce93d8";
        this.colorDark = "#6a1b9a";
        this.blinkTimer = 1.5 + Math.random();
      } else if (kind === "spawn") {
        this.radius = 0.2;
        this.color = "#d7a878";
        this.colorDark = "#8d6e4a";
      } else {
        this.radius = 0.32;
        this.color = "#7cb342";
        this.colorDark = "#33691e";
      }
      this.visualTier = visualTierFor(kind);
      // 视觉档：仅改绘制，不改 maxHp/speed/reward
      if (this.visualTier === "elite") {
        this.drawScale = 1.2;
        this.yLift = 3;
      } else if (this.visualTier === "boss") {
        this.drawScale = 1.75;
        this.yLift = 0;
        this.spawnFlashUntil = 0; // 入场时再设
      } else if (this.visualTier === "heavy") {
        this.drawScale = 1.1;
        this.yLift = 1;
      } else {
        this.drawScale = 1.0;
        this.yLift = 0;
      }
      const p = posOnPath(0);
      this.x = p.x;
      this.y = p.y;
      this.angle = p.angle;
    }
    speed(now) {
      if (now < this.freezeUntil) return 0;
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
    tryFreeze(now, isBoss) {
      if (now < this.freezeIcdUntil) return false;
      const dur = isBoss ? 0.4 : 1.0;
      this.freezeUntil = now + dur;
      this.freezeIcdUntil = now + 3;
      return true;
    }
    /** 盾兵：箭伤×0.6，炮溅射×1.2；狙击无视箭减伤 */
    mitigate(amount, style, isSplash, ignoreShieldArrow) {
      if (this.kind !== "shield") return amount;
      if (style === "arrow") {
        if (ignoreShieldArrow) return amount;
        return amount * 0.6;
      }
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
      this.ignoreShieldArrow = !!tower.ignoreShieldArrow;
      this.burnGround = !!tower.burnGround;
      this.freezeChance = tower.freezeChance || 0;
      this.speed = cellSize * (this.style === "cannon" ? 6 : this.style === "arrow" && tower.branch === "snipe" ? 14 : 10);
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
    state.waveWallStart = null;
    state.buildType = null;
    updateBuildButtons();
    updateHUD();
    btnNextWave.disabled = true;
    btnNextWave.textContent = `第 ${n} 波进行中…`;
    const hasBoss = state.spawnQueue.some((q) => q.kind === "boss");
    let label = `第 ${n} 波来袭！`;
    if (n === WAVES_PER_LEVEL) {
      label = state.level >= TOTAL_LEVELS
        ? `⚠ 终局 Boss · 第 ${state.level} 关终章！`
        : `⚠ 本关终波 Boss · 第 ${n} 波！`;
    } else if (hasBoss) label = `⚠ 第 ${n} 波 · Boss 来袭！`;
    else if (n === 15 || n === 20 || n === 25) label = `第 ${n} 波 · 小高潮！`;
    toast(label, hasBoss || n === WAVES_PER_LEVEL ? 2400 : 1600);
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

  /** 速清奖励：按本关内波序号 w 结算墙钟；不受倍速影响 */
  function awardSpeedClearBonus() {
    if (state.waveWallStart == null) return 0;
    const Tclear = (performance.now() - state.waveWallStart) / 1000;
    state.waveWallStart = null;
    const w = state.wave;
    const Tbase = 16 + 2.5 * w;
    const maxGold = Math.min(48, 36 + Math.floor((state.stage - 1) / 5) * 2);
    const gold = Math.max(
      0,
      Math.min(maxGold, Math.round((12 * Tbase) / Math.max(Tclear, 0.5)))
    );
    if (gold > 0) {
      state.gold += gold;
      toast(`速清 +${gold}`, 1800);
    }
    return gold;
  }

  function clearLevelBoard() {
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.explosions = [];
    state.spawnQueue = [];
    state.fires = [];
    state.allies = [];
    state.selected = null;
    state.buildType = null;
    state.mergeMode = false;
    state.mergePicks = [];
    state.skillAim = null;
    state.pendingBranchTower = null;
    if (branchOverlay) branchOverlay.classList.add("hidden");
    selectPanel.classList.add("hidden");
    buildPanel.classList.remove("hidden");
  }

  function advanceToNextLevel() {
    const nextLevel = state.level + 1;
    const diff = state.difficulty;
    const map = state.mapIndex;
    recordLevelClear(diff, state.level);
    clearRunSnapshot();
    clearLevelBoard();
    state.phase = "menu"; // 防止误存快照 / 继续 tick
    state.enemies = [];
    state.projectiles = [];
    // 每关重新三选二
    openSkillPick(nextLevel, diff, map);
  }

  function checkWaveClear() {
    if (state.phase !== "spawning" && state.phase !== "fighting") return;
    if (state.spawnQueue.length > 0) return;
    if (state.enemies.some((e) => !e.dead && !e.escaped)) {
      state.phase = "fighting";
      return;
    }
    awardSpeedClearBonus();
    if (state.wave >= WAVES_PER_LEVEL) {
      if (state.level >= TOTAL_LEVELS) {
        recordLevelClear(state.difficulty, state.level);
        winGame();
        return;
      }
      advanceToNextLevel();
      return;
    }
    beginCountdown(state.wave + 1);
    updateHUD();
  }

  // ---------- 胜负 ----------
  function winGame() {
    state.phase = "won";
    state.ended = true;
    clearRunSnapshot();
    sfx("victory");
    showEnd(true);
  }

  function loseGame() {
    state.phase = "lost";
    state.ended = true;
    clearRunSnapshot();
    sfx("defeat");
    showEnd(false);
  }

  function showEnd(won) {
    overlay.classList.remove("hidden");
    if (startOverlay) startOverlay.classList.add("hidden");
    endTitle.textContent = won ? "通关！" : "防线失守";
    endTitle.className = won ? "win" : "lose";
    endMsg.textContent = won
      ? `以「${diffDef().name}」难度肃清全部 ${TOTAL_LEVELS} 关，城防永固。`
      : `第 ${state.level} 关第 ${state.wave} 波失守。可重开本关或返回选关。`;
    endStats.innerHTML = `
      <li>难度 <span>${diffDef().name}</span></li>
      <li>关卡 <span>${state.level}/${TOTAL_LEVELS}</span></li>
      <li>地图阶 <span>${state.stage}</span></li>
      <li>击杀 <span>${state.kills}</span></li>
      <li>剩余金币 <span>${state.gold}</span></li>
      <li>波次 <span>${state.wave}/${WAVES_PER_LEVEL}</span></li>
      <li>剩余生命 <span>${Math.max(0, state.lives)}</span></li>
    `;
    if (btnRestart) btnRestart.textContent = won ? "再开新档" : "重开本关";
  }

  function resetGame() {
    if (state.phase === "won") {
      clearRunSnapshot();
      showStartMenu();
      return;
    }
    clearRunSnapshot();
    openSkillPick(state.level, state.difficulty, state.mapIndex);
  }

  function beginLevelRun(level, diffKey, mapIndex, opts) {
    opts = opts || {};
    clearRunSnapshot(); // 新开一局清除继续战斗
    clearLevelBoard();
    const mi = mapIndex != null ? mapIndex : menuMap;
    setupLevel(level, diffKey, { mapIndex: Math.max(0, Math.min(SCENE_SKINS.length - 1, mi | 0)) });
    const skills = (opts.skills && opts.skills.length === 2)
      ? opts.skills.slice()
      : (state.activeSkills && state.activeSkills.length === 2 ? state.activeSkills.slice() : ["meteor", "reinforce"]);
    Object.assign(state, {
      lives: startingLives(),
      gold: startingGold(),
      wave: 0,
      kills: 0,
      spent: 0,
      phase: "idle",
      countdown: 0,
      buildType: null,
      selected: null,
      spawnTimer: 0,
      hoverCell: null,
      ended: false,
      speed: 1,
      waveWallStart: null,
      paused: false,
      mergeMode: false,
      mergePicks: [],
      skillAim: null,
      fires: [],
      allies: [],
      activeSkills: skills,
      skillCd: emptySkillCd(skills),
      skillHintShown: false,
      pendingBranchTower: null,
      timeSlowUntil: 0,
      goldTideUntil: 0,
      pendingStart: null,
    });
    if (branchOverlay) branchOverlay.classList.add("hidden");
    if (pauseOverlay) pauseOverlay.classList.add("hidden");
    if (skillPickOverlay) skillPickOverlay.classList.add("hidden");
    if (btnPause) {
      btnPause.setAttribute("aria-pressed", "false");
      btnPause.textContent = "暂停";
    }
    gameNow = 0;
    overlay.classList.add("hidden");
    if (startOverlay) startOverlay.classList.add("hidden");
    selectPanel.classList.add("hidden");
    buildPanel.classList.remove("hidden");
    btnNextWave.disabled = false;
    btnNextWave.classList.remove("waiting");
    btnNextWave.textContent = "开始第 1 波";
    syncSpeedButtons();
    renderSkillButtons();
    updateBuildButtons();
    updateHUD();
    persistSave({ lastDiff: diffKey, lastMap: state.mapIndex, lastLevel: level });
    const sn = skills.map((id) => SKILL_DEFS[id].short).join("·");
    toast(`第 ${level} 关 · ${diffDef().name} · ${(SCENE_SKINS[state.mapIndex] || SCENE_SKINS[0]).name} · ${sn}`, 2200);
  }

  function showStartMenu() {
    state.phase = "menu";
    state.ended = false;
    state.paused = false;
    state.skillAim = null;
    overlay.classList.add("hidden");
    if (pauseOverlay) pauseOverlay.classList.add("hidden");
    if (skillPickOverlay) skillPickOverlay.classList.add("hidden");
    if (btnPause) {
      btnPause.setAttribute("aria-pressed", "false");
      btnPause.textContent = "暂停";
    }
    if (startOverlay) startOverlay.classList.remove("hidden");
    refreshStartMenu();
    refreshContinueButton();
    renderSkillButtons();
  }

  function setPaused(on) {
    if (state.phase === "menu" || state.ended) {
      state.paused = false;
      if (pauseOverlay) pauseOverlay.classList.add("hidden");
      if (btnPause) {
        btnPause.setAttribute("aria-pressed", "false");
        btnPause.textContent = "暂停";
      }
      return;
    }
    // 专精选择中不允许用暂停层盖掉
    if (state.pendingBranchTower) {
      state.paused = true;
      if (pauseOverlay) pauseOverlay.classList.add("hidden");
      return;
    }
    state.paused = !!on;
    if (state.paused) cancelDrag();
    if (pauseOverlay) pauseOverlay.classList.toggle("hidden", !state.paused);
    if (btnPause) {
      btnPause.setAttribute("aria-pressed", state.paused ? "true" : "false");
      btnPause.textContent = state.paused ? "继续" : "暂停";
    }
    if (state.paused) {
      elStatus.textContent = "已暂停";
    } else {
      updateHUD();
    }
  }

  function togglePause() {
    if (state.phase === "menu" || state.ended) return;
    setPaused(!state.paused);
    sfx("click");
  }

  function returnToDifficultySelect() {
    // 从进行中战斗返回：保存继续战斗快照
    if (!state.ended && state.phase !== "menu") {
      saveRunSnapshot();
    }
    state.paused = false;
    if (pauseOverlay) pauseOverlay.classList.add("hidden");
    if (btnPause) {
      btnPause.setAttribute("aria-pressed", "false");
      btnPause.textContent = "暂停";
    }
    showStartMenu();
    sfx("click");
  }


  let menuDiff = "patrol";
  let menuMap = 0;

  function refreshStartMenu() {
    const save = loadSave();
    if (!DIFFICULTIES[menuDiff]) menuDiff = save.lastDiff;
    if (!Number.isInteger(menuMap) || menuMap < 0 || menuMap >= SCENE_SKINS.length) {
      menuMap = save.lastMap | 0;
    }
    if (startDiffBtns) {
      startDiffBtns.querySelectorAll("[data-diff]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.diff === menuDiff);
      });
    }
    if (startMapBtns) {
      startMapBtns.querySelectorAll("[data-map]").forEach((btn) => {
        const i = Number(btn.dataset.map);
        btn.classList.toggle("active", i === menuMap);
      });
    }
    const maxLv = maxUnlocked(menuDiff);
    if (startLevelMax) startLevelMax.textContent = String(maxLv);
    if (startLevelInput) {
      startLevelInput.max = String(maxLv);
      let v = Number(startLevelInput.value) || 1;
      if (save.lastDiff === menuDiff) v = save.lastLevel || 1;
      startLevelInput.value = String(Math.max(1, Math.min(maxLv, v)));
      startLevelInput.min = "1";
    }
    const lv = Number(startLevelInput && startLevelInput.value) || 1;
    const st = mapStage(lv);
    if (startStageHint) {
      const d = DIFFICULTIES[menuDiff];
      const skin = SCENE_SKINS[menuMap] || SCENE_SKINS[0];
      startStageHint.textContent =
        `地图阶 ${st}（路径难度）· ${skin.name} · 生命 ${d.lives} · 开局金 ${START_GOLD_BASE + d.goldBonus} · 怪血×${d.hp}`;
    }
  }

  // ---------- HUD / UI ----------
  function updateHUD() {
    elLives.textContent = String(Math.max(0, state.lives));
    elGold.textContent = String(state.gold);
    elWave.textContent = `${state.wave}/${WAVES_PER_LEVEL}`;
    if (elLevel) elLevel.textContent = `${state.level}/${TOTAL_LEVELS}`;
    if (elDiff) elDiff.textContent = diffDef().name;
    let status = "准备就绪";
    if (state.paused) status = "已暂停";
    else if (state.phase === "menu") status = "选关中";
    else if (state.phase === "countdown") status = `休息 ${state.countdown.toFixed(1)}s`;
    else if (state.phase === "spawning" || state.phase === "fighting") status = `阶${state.stage} · 战斗`;
    else if (state.phase === "won") status = "通关";
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
    updateSkillButtons();
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


  // ---------- 合成 / 专精 / 技能 ----------
  function cancelMergeMode() {
    state.mergeMode = false;
    state.mergePicks = [];
    if (btnMerge) btnMerge.classList.remove("active");
  }

  function cancelSkillAim() {
    state.skillAim = null;
    updateSkillButtons();
  }

  function mergeBlockReason(src, dst) {
    if (!src || !dst || src === dst) return "无效目标";
    if (src.type !== dst.type) return "需同种塔";
    if ((src.star || 1) !== (dst.star || 1)) return "需同星级";
    if (dst.star >= 3) return "已满 3 星";
    if (src.level < MERGE_MIN_LEVEL || dst.level < MERGE_MIN_LEVEL) {
      return `双方需 Lv≥${MERGE_MIN_LEVEL}`;
    }
    return "";
  }

  function canMergeCandidate(anchor, t) {
    return !mergeBlockReason(t, anchor);
  }

  function countMergePartners(anchor) {
    if (!anchor) return 0;
    return state.towers.filter((t) => t !== anchor && canMergeCandidate(anchor, t)).length;
  }

  function enterMergeMode() {
    toast("按住塔拖到另一座同种同星塔上即可合成", 2000);
  }

  /** 拖拽合成：3 合 1。每次喂入 +1 进度，进度满 2（=3 座）升星 */
  function feedMerge(target, src) {
    const pips = (target.mergePips || 0) + (src.mergePips || 0) + 1;
    const invested = target.invested + src.invested;
    state.towers = state.towers.filter((t) => t !== src);
    if (state.selected === src) deselect();
    if (pips < 2) {
      target.mergePips = pips;
      target.invested = invested;
      spawnParticle(target.x, target.y, "#69f0ae", 10);
      sfx("build", target.type);
      toast(`合成进度 ${pips + 1}/3`, 1400);
      updateHUD();
      return;
    }
    const newStar = Math.min(3, target.star + 1);
    state.towers = state.towers.filter((t) => t !== target);
    const merged = new Tower(target.type, target.c, target.r, {
      star: newStar, level: 1, invested, branch: null,
    });
    merged.mergePips = newStar < 3 ? pips - 2 : 0;
    state.towers.push(merged);
    spawnParticle(merged.x, merged.y, merged.color, 18);
    spawnParticle(merged.x, merged.y, "#ffd54f", 12);
    sfx("upgrade");
    selectTower(merged);
    toast(`合成成功：${merged.name} ${"★".repeat(newStar)}`, 2000);
    if (newStar >= 3 && !merged.branch) openBranchPicker(merged);
    updateHUD();
  }

  function tryPickMergeTower() {
    // 旧点选合成已废弃，保留空壳避免误点击崩
    return false;
  }

  function openBranchPicker(tower) {
    if (!branchOverlay || !tower || tower.star < 3) return;
    state.pendingBranchTower = tower;
    state.paused = true; // soft pause while choosing
    if (pauseOverlay) pauseOverlay.classList.add("hidden");
    const pack = BRANCH_DEFS[tower.type];
    if (branchTitle) branchTitle.textContent = `${tower.name} 3★ 专精`;
    if (branchOptions) {
      branchOptions.innerHTML = "";
      Object.values(pack).forEach((b) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "action-btn primary branch-opt";
        btn.innerHTML = `<strong>${b.name}</strong><span>${b.desc}</span>`;
        btn.addEventListener("click", () => {
          chooseBranch(b.id);
        });
        branchOptions.appendChild(btn);
      });
    }
    branchOverlay.classList.remove("hidden");
  }

  function chooseBranch(branchId) {
    const t = state.pendingBranchTower;
    if (!t) return;
    t.branch = branchId;
    t.refresh();
    state.pendingBranchTower = null;
    if (branchOverlay) branchOverlay.classList.add("hidden");
    state.paused = false;
    if (btnPause) {
      btnPause.setAttribute("aria-pressed", "false");
      btnPause.textContent = "暂停";
    }
    toast(`专精：${branchLabel(t.type, branchId)}`, 2000);
    sfx("upgrade");
    if (state.selected === t) refreshSelectPanel();
    updateHUD();
  }

  function skillStageMul() {
    return 1 + 0.2 * ((state.stage || 1) - 1);
  }

  function emptySkillCd(ids) {
    const cd = {};
    (ids || SKILL_IDS).forEach((id) => { cd[id] = 0; });
    return cd;
  }

  function renderSkillButtons() {
    if (!skillBtnsEl) return;
    skillBtnsEl.innerHTML = "";
    const ids = state.activeSkills || [];
    ids.forEach((id) => {
      const def = SKILL_DEFS[id];
      if (!def) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-btn";
      btn.dataset.skill = id;
      btn.title = def.name;
      btn.innerHTML = `<span class="skill-name">${def.short}</span><span class="skill-cd" data-cd="${id}">就绪</span>`;
      btn.addEventListener("click", () => {
        sfx("click");
        onSkillButton(id);
      });
      skillBtnsEl.appendChild(btn);
    });
    updateSkillButtons();
  }

  function updateSkillButtons() {
    if (!skillBtnsEl) return;
    const menu = state.ended || state.phase === "menu";
    skillBtnsEl.querySelectorAll(".skill-btn").forEach((btn) => {
      const id = btn.dataset.skill;
      const def = SKILL_DEFS[id];
      const cd = Math.max(0, (state.skillCd && state.skillCd[id]) || 0);
      const aiming = state.skillAim === id;
      const cdEl = btn.querySelector("[data-cd]");
      let label = "就绪";
      if (aiming) label = def && def.aim === "enemy" ? "点怪" : "点地";
      else if (cd > 0) label = `${Math.ceil(cd)}s`;
      if (cdEl) cdEl.textContent = label;
      btn.disabled = menu || (cd > 0 && !aiming) || (!!state.skillAim && !aiming);
      btn.classList.toggle("ready", cd <= 0 && !menu);
      btn.classList.toggle("aiming", aiming);
    });
  }

  function onSkillButton(id) {
    if (state.ended || state.phase === "menu" || state.paused) return;
    const def = SKILL_DEFS[id];
    if (!def) return;
    if (!(state.activeSkills || []).includes(id)) return;
    if (state.skillAim === id) {
      cancelSkillAim();
      toast("已取消瞄准");
      return;
    }
    const cd = (state.skillCd && state.skillCd[id]) || 0;
    if (cd > 0) {
      toast(`${def.short}冷却 ${Math.ceil(cd)}s`);
      return;
    }
    cancelMergeMode();
    state.buildType = null;
    if (def.aim === "instant") {
      castSkill(id, null, null);
      return;
    }
    state.skillAim = id;
    toast(def.aim === "enemy" ? `点选一只怪释放${def.name}` : `点地图释放${def.name}`, 1800);
    updateBuildButtons();
    updateSkillButtons();
  }

  function castMeteorAt(x, y) {
    const S = skillStageMul();
    const pow = 120 * S;
    const radius = 2 * cellSize;
    let hits = 0;
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      if (dist(x, y, e.x, e.y) <= radius + e.radius * cellSize) {
        let dmg = pow;
        if (e.kind === "boss") dmg *= 0.5;
        damageEnemy(e, dmg, gameNow, "cannon", true);
        hits++;
      }
    }
    state.explosions.push({
      x, y, r: 4, maxR: radius, life: 0.45, maxLife: 0.45, shards: 10, tint: "#ff7043",
    });
    spawnParticle(x, y, "#ff7043", 18);
    sfx("boom");
    state.skillCd.meteor = SKILL_DEFS.meteor.cd;
    cancelSkillAim();
    toast(hits ? `流星火雨 · 命中 ${hits}` : "流星火雨 · 空放", 1600);
    updateSkillButtons();
    updateHUD();
  }

  function castReinforce() {
    if (!pathLen) return;
    const hp = 200 * skillStageMul();
    const slots = [0.35, 0.5, 0.65];
    for (const frac of slots) {
      const prog = pathLen * frac;
      const p = posOnPath(prog);
      state.allies.push({
        x: p.x, y: p.y, progress: prog,
        hp, maxHp: hp, until: gameNow + 8, radius: 0.28,
      });
      spawnParticle(p.x, p.y, "#ffd54f", 8);
    }
    state.skillCd.reinforce = SKILL_DEFS.reinforce.cd;
    sfx("build");
    toast("援军就位 · 拦路 8 秒", 1600);
    cancelSkillAim();
    updateSkillButtons();
  }

  function castHourglass() {
    state.timeSlowUntil = gameNow + 4;
    state.skillCd.hourglass = SKILL_DEFS.hourglass.cd;
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      spawnParticle(e.x, e.y, "#81d4fa", 3);
    }
    sfx("upgrade");
    toast("时光沙漏 · 全场减速 4 秒", 1600);
    cancelSkillAim();
    updateSkillButtons();
  }

  function castGoldTide() {
    const stage = state.stage || 1;
    const gain = Math.round(25 * Math.sqrt(stage));
    state.gold += gain;
    state.goldTideUntil = gameNow + 8;
    state.skillCd.goldtide = SKILL_DEFS.goldtide.cd;
    spawnParticle(canvas.width * 0.5, canvas.height * 0.35, "#ffd54f", 16);
    sfx("upgrade");
    toast(`金币潮 · +${gain} 金 · 8 秒赏金×1.5`, 1800);
    cancelSkillAim();
    updateSkillButtons();
    updateHUD();
  }

  function castChainFrom(seed) {
    const S = skillStageMul();
    const base = 80 * S;
    const hit = [];
    let cur = seed;
    let jumps = 0;
    const maxJumps = 6;
    while (cur && jumps < maxJumps) {
      if (cur.dead || cur.escaped || hit.includes(cur)) break;
      hit.push(cur);
      let dmg = base * Math.pow(0.85, jumps);
      if (cur.kind === "shield") dmg *= 1.2;
      damageEnemy(cur, dmg, gameNow, "arrow", false);
      spawnParticle(cur.x, cur.y, "#ce93d8", 6);
      state.explosions.push({
        x: cur.x, y: cur.y, r: 2, maxR: cellSize * 0.55,
        life: 0.22, maxLife: 0.22, shards: 4, tint: "#e1bee7",
      });
      jumps++;
      // next nearest unhit
      let best = null, bestD = Infinity;
      for (const e of state.enemies) {
        if (e.dead || e.escaped || hit.includes(e)) continue;
        const d = dist(cur.x, cur.y, e.x, e.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best && hit.length >= 2) {
        // draw bolt line via explosion trail particles
        const prev = hit[hit.length - 2];
        const steps = 4;
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          spawnParticle(
            prev.x + (cur.x - prev.x) * t,
            prev.y + (cur.y - prev.y) * t,
            "#b39ddb", 1
          );
        }
      }
      cur = best;
      if (bestD > cellSize * 4.5) break;
    }
    // fix bolt visuals between consecutive hits
    for (let i = 1; i < hit.length; i++) {
      const a = hit[i - 1], b = hit[i];
      for (let k = 1; k < 5; k++) {
        const t = k / 5;
        spawnParticle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, "#e1bee7", 1);
      }
    }
    state.skillCd.chain = SKILL_DEFS.chain.cd;
    sfx("boom");
    toast(hit.length ? `连锁雷击 · ${hit.length} 跳` : "连锁雷击 · 未命中", 1600);
    cancelSkillAim();
    updateSkillButtons();
    updateHUD();
  }

  function castSkill(id, x, y, enemy) {
    if (id === "meteor") castMeteorAt(x, y);
    else if (id === "reinforce") castReinforce();
    else if (id === "hourglass") castHourglass();
    else if (id === "goldtide") castGoldTide();
    else if (id === "chain") {
      if (!enemy) {
        toast("请点选一只怪");
        return;
      }
      castChainFrom(enemy);
    }
  }

  function pickNearestEnemy(x, y, maxDist) {
    let best = null, bestD = maxDist != null ? maxDist : cellSize * 1.6;
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      const d = dist(x, y, e.x, e.y);
      if (d <= bestD + e.radius * cellSize) {
        if (!best || d < bestD) { best = e; bestD = d; }
      }
    }
    return best;
  }

  function weightedSampleSkills(n) {
    const pool = SKILL_IDS.slice();
    const picked = [];
    for (let k = 0; k < n && pool.length; k++) {
      let total = 0;
      const weights = pool.map((id) => {
        const w = SKILL_DEFS[id].weight || 1;
        total += w;
        return w;
      });
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        r -= weights[idx];
        if (r <= 0) break;
      }
      if (idx >= pool.length) idx = pool.length - 1;
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  let skillPickOffered = [];
  let skillPickSelected = [];

  function openSkillPick(level, diffKey, mapIndex) {
    state.pendingStart = { level, diff: diffKey, map: mapIndex };
    state.paused = true; // 选技能时冻结
    if (pauseOverlay) pauseOverlay.classList.add("hidden");
    skillPickOffered = weightedSampleSkills(3);
    skillPickSelected = [];
    if (skillPickCount) skillPickCount.textContent = "0";
    if (btnSkillConfirm) btnSkillConfirm.disabled = true;
    if (skillPickOptions) {
      skillPickOptions.innerHTML = "";
      skillPickOffered.forEach((id) => {
        const def = SKILL_DEFS[id];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skill-pick-opt";
        btn.dataset.skill = id;
        btn.innerHTML =
          `<span class="sp-icon">${def.icon}</span>` +
          `<span class="sp-name">${def.name}</span>` +
          `<span class="sp-desc">${def.desc}</span>` +
          `<span class="sp-meta">${def.meta}</span>`;
        btn.addEventListener("click", () => toggleSkillPick(id, btn));
        skillPickOptions.appendChild(btn);
      });
    }
    if (startOverlay) startOverlay.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");
    if (skillPickOverlay) skillPickOverlay.classList.remove("hidden");
  }

  function toggleSkillPick(id, btn) {
    const i = skillPickSelected.indexOf(id);
    if (i >= 0) {
      skillPickSelected.splice(i, 1);
      btn.classList.remove("selected");
    } else {
      if (skillPickSelected.length >= 2) {
        toast("最多选 2 个技能");
        return;
      }
      skillPickSelected.push(id);
      btn.classList.add("selected");
    }
    if (skillPickCount) skillPickCount.textContent = String(skillPickSelected.length);
    if (btnSkillConfirm) btnSkillConfirm.disabled = skillPickSelected.length !== 2;
    sfx("click");
  }

  function confirmSkillPick() {
    if (skillPickSelected.length !== 2 || !state.pendingStart) return;
    const p = state.pendingStart;
    state.pendingStart = null;
    if (skillPickOverlay) skillPickOverlay.classList.add("hidden");
    beginLevelRun(p.level, p.diff, p.map, { skills: skillPickSelected.slice() });
  }

  function cancelSkillPick() {
    state.pendingStart = null;
    if (skillPickOverlay) skillPickOverlay.classList.add("hidden");
    showStartMenu();
    sfx("click");
  }

  // ---------- 继续战斗快照 ----------
  function clearRunSnapshot() {
    try { localStorage.removeItem(RUN_SNAPSHOT_KEY); } catch (_) {}
    refreshContinueButton();
  }

  function hasRunSnapshot() {
    try {
      const raw = localStorage.getItem(RUN_SNAPSHOT_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!(data && data.v === 18 && data.state && Array.isArray(data.state.activeSkills));
    } catch (_) { return false; }
  }

  function serializeEnemy(e) {
    return {
      kind: e.kind, hp: e.hp, maxHp: e.maxHp, reward: e.reward,
      progress: e.progress, baseSpeed: e.baseSpeed / cellSize,
      slowMul: e.slowMul, slowUntil: e.slowUntil, freezeUntil: e.freezeUntil,
      freezeIcdUntil: e.freezeIcdUntil, radius: e.radius, color: e.color,
      colorDark: e.colorDark, priority: e.priority,
      splitOnDeath: !!e.splitOnDeath, healTimer: e.healTimer || 0,
      blinkTimer: e.blinkTimer || 0, visualTier: e.visualTier,
      drawScale: e.drawScale, yLift: e.yLift,
      spawnFlashUntil: e.spawnFlashUntil || 0,
    };
  }

  function restoreEnemy(data) {
    const e = new Enemy(data.kind, 1, 1, data.reward);
    e.maxHp = data.maxHp;
    e.hp = data.hp;
    e.reward = data.reward;
    e.progress = data.progress;
    e.baseSpeed = data.baseSpeed * cellSize;
    e.slowMul = data.slowMul;
    e.slowUntil = data.slowUntil;
    e.freezeUntil = data.freezeUntil;
    e.freezeIcdUntil = data.freezeIcdUntil;
    e.radius = data.radius;
    e.color = data.color;
    e.colorDark = data.colorDark;
    e.priority = data.priority;
    e.splitOnDeath = data.splitOnDeath;
    e.healTimer = data.healTimer;
    e.blinkTimer = data.blinkTimer;
    e.visualTier = data.visualTier || visualTierFor(data.kind);
    e.drawScale = data.drawScale || e.drawScale;
    e.yLift = data.yLift != null ? data.yLift : e.yLift;
    e.spawnFlashUntil = data.spawnFlashUntil || 0;
    const p = posOnPath(Math.min(e.progress, Math.max(0, pathLen - 0.01)));
    e.x = p.x; e.y = p.y; e.angle = p.angle;
    return e;
  }

  function serializeTower(t) {
    return {
      type: t.type, c: t.c, r: t.r, star: t.star, level: t.level,
      invested: t.invested, branch: t.branch, mergePips: t.mergePips || 0,
    };
  }

  function saveRunSnapshot() {
    if (state.phase === "menu" || state.ended) return;
    if (!["idle", "countdown", "spawning", "fighting"].includes(state.phase)) return;
    try {
      const snap = {
        v: 18,
        gameNow,
        state: {
          difficulty: state.difficulty,
          mapIndex: state.mapIndex,
          level: state.level,
          stage: state.stage,
          seed: state.seed,
          lives: state.lives,
          gold: state.gold,
          wave: state.wave,
          kills: state.kills,
          spent: state.spent,
          phase: state.phase,
          countdown: state.countdown,
          speed: state.speed,
          waveWallStart: state.waveWallStart,
          activeSkills: (state.activeSkills || []).slice(),
          skillCd: Object.assign({}, state.skillCd),
          skillAim: null,
          timeSlowUntil: state.timeSlowUntil || 0,
          goldTideUntil: state.goldTideUntil || 0,
          skillHintShown: !!state.skillHintShown,
          _nextWave: state._nextWave || 0,
          spawnTimer: state.spawnTimer,
          spawnQueue: (state.spawnQueue || []).map((q) => Object.assign({}, q)),
          towers: state.towers.map(serializeTower),
          enemies: state.enemies.filter((e) => !e.dead && !e.escaped).map(serializeEnemy),
          allies: (state.allies || []).map((a) => Object.assign({}, a)),
          fires: (state.fires || []).map((f) => Object.assign({}, f)),
          pendingBranch: state.pendingBranchTower
            ? { c: state.pendingBranchTower.c, r: state.pendingBranchTower.r, branch: state.pendingBranchTower.branch }
            : null,
        },
      };
      localStorage.setItem(RUN_SNAPSHOT_KEY, JSON.stringify(snap));
    } catch (_) {}
    refreshContinueButton();
  }

  function restoreRunSnapshot() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(RUN_SNAPSHOT_KEY) || "null");
    } catch (_) { return false; }
    if (!data || data.v !== 18 || !data.state) return false;
    const s = data.state;
    clearLevelBoard();
    setupLevel(s.level, s.difficulty, { mapIndex: s.mapIndex });
    Object.assign(state, {
      lives: s.lives,
      gold: s.gold,
      wave: s.wave,
      kills: s.kills,
      spent: s.spent,
      phase: s.phase === "menu" ? "idle" : s.phase,
      countdown: s.countdown || 0,
      buildType: null,
      selected: null,
      spawnTimer: s.spawnTimer || 0,
      hoverCell: null,
      ended: false,
      speed: s.speed || 1,
      waveWallStart: s.waveWallStart,
      paused: false,
      mergeMode: false,
      mergePicks: [],
      skillAim: null,
      fires: [],
      allies: [],
      activeSkills: (s.activeSkills || []).slice(),
      skillCd: Object.assign(emptySkillCd(), s.skillCd || {}),
      skillHintShown: !!s.skillHintShown,
      pendingBranchTower: null,
      timeSlowUntil: s.timeSlowUntil || 0,
      goldTideUntil: s.goldTideUntil || 0,
      pendingStart: null,
      _nextWave: s._nextWave || 0,
    });
    state.spawnQueue = (s.spawnQueue || []).map((q) => Object.assign({}, q));
    state.towers = (s.towers || []).map((td) => {
      const t = new Tower(td.type, td.c, td.r, {
        star: td.star, level: td.level, invested: td.invested, branch: td.branch,
      });
      t.mergePips = td.mergePips || 0;
      return t;
    });
    state.enemies = (s.enemies || []).map(restoreEnemy);
    state.allies = (s.allies || []).map((a) => Object.assign({}, a));
    state.fires = (s.fires || []).map((f) => Object.assign({}, f));
    gameNow = data.gameNow || 0;
    if (s.pendingBranch) {
      const t = towerAt(s.pendingBranch.c, s.pendingBranch.r);
      if (t && t.star >= 3 && !t.branch) openBranchPicker(t);
    }
    if (branchOverlay && !state.pendingBranchTower) branchOverlay.classList.add("hidden");
    if (pauseOverlay) pauseOverlay.classList.add("hidden");
    if (btnPause) {
      btnPause.setAttribute("aria-pressed", "false");
      btnPause.textContent = "暂停";
    }
    overlay.classList.add("hidden");
    if (startOverlay) startOverlay.classList.add("hidden");
    if (skillPickOverlay) skillPickOverlay.classList.add("hidden");
    selectPanel.classList.add("hidden");
    buildPanel.classList.remove("hidden");
    btnNextWave.disabled = false;
    if (state.phase === "idle") {
      btnNextWave.classList.remove("waiting");
      btnNextWave.textContent = state.wave > 0 ? `开始第 ${state.wave + 1} 波` : "开始第 1 波";
    } else if (state.phase === "countdown") {
      btnNextWave.classList.add("waiting");
      updateCountdownBtn();
    } else {
      btnNextWave.classList.remove("waiting");
      btnNextWave.textContent = `战斗中 · 第 ${state.wave} 波`;
      btnNextWave.disabled = true;
    }
    syncSpeedButtons();
    renderSkillButtons();
    updateBuildButtons();
    updateHUD();
    toast(`继续战斗 · 第 ${state.level} 关 · 第 ${state.wave} 波`, 2200);
    return true;
  }

  function refreshContinueButton() {
    if (!btnContinue) return;
    const ok = hasRunSnapshot();
    btnContinue.classList.toggle("hidden", !ok);
  }

  function refreshSelectPanel() {
    const t = state.selected;
    if (!t) return;
    selTitle.textContent = t.displayName();
    const slowTxt = t.slow
      ? `<br>减速 ${Math.round(t.slow * 100)}% × ${t.slowDur}s`
      : "";
    const splashTxt = t.splash
      ? `<br>溅射 ${t.splash.toFixed(1)} 格（${Math.round(t.splashRatio * 100)}%）`
      : "";
    const multiTxt = t.multiTarget > 1 ? `<br>多目标 ×${t.multiTarget}` : "";
    const flagTxt = [
      t.ignoreShieldArrow ? "无视盾减" : "",
      t.burnGround ? "落火" : "",
      t.freezeChance ? `冰封 ${Math.round(t.freezeChance * 100)}%` : "",
      t.shatterBonus ? "碎冰光环" : "",
    ].filter(Boolean).join(" · ");
    selStats.innerHTML =
      `伤害 ${t.damage} · 射速 ${t.rate.toFixed(2)}/s<br>` +
      `射程 ${t.range.toFixed(1)} 格` +
      splashTxt +
      slowTxt +
      multiTxt +
      (flagTxt ? `<br>${flagTxt}` : "") +
      `<br>投入 ${t.invested} · 卖出 ${t.sellValue()}`;

    if (t.level >= 3) {
      btnUpgrade.disabled = true;
      btnUpgrade.textContent = "已满级";
    } else {
      const cost = upgradeCost(t.type, t.level);
      btnUpgrade.disabled = state.gold < cost || state.ended || state.mergeMode;
      btnUpgrade.textContent = `升级 Lv.${t.level + 1}（${cost}）`;
    }
    btnSell.disabled = state.ended || state.mergeMode;
    btnSell.textContent = `卖掉 +${t.sellValue()}`;
    if (btnMerge) {
      btnMerge.classList.remove("active");
      btnMerge.disabled = t.star >= 3;
      btnMerge.textContent = t.star >= 3 ? "已满星" : `拖拽合成 ${(t.mergePips||0)+1}/3（Lv≥${MERGE_MIN_LEVEL}）`;
    }
  }

  function selectTower(t) {
    if (state.mergeMode && state.selected && t !== state.selected) {
      if (tryPickMergeTower(t)) return;
    }
    state.selected = t;
    state.buildType = null;
    if (!state.mergeMode) cancelMergeMode();
    buildPanel.classList.add("hidden");
    selectPanel.classList.remove("hidden");
    refreshSelectPanel();
    updateBuildButtons();
  }

  function deselect() {
    cancelMergeMode();
    cancelSkillAim();
    state.selected = null;
    selectPanel.classList.add("hidden");
    buildPanel.classList.remove("hidden");
  }

  // ---------- 输入 ----------
  function cancelDrag() {
    state.drag = null;
  }

  function pointerToCell(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    if (clientX == null || clientY == null || !rect.width || !rect.height) {
      return { c: -1, r: -1, x: 0, y: 0 };
    }
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    return { c, r, x, y };
  }

  function onPointerDown(e) {
    if (state.ended || state.paused) return;
    e.preventDefault();
    const { c, r, x, y } = pointerToCell(e);

    if (state.skillAim) {
      const aim = state.skillAim;
      const def = SKILL_DEFS[aim];
      if (def && def.aim === "point") {
        castSkill(aim, x, y);
        return;
      }
      if (def && def.aim === "enemy") {
        const e = pickNearestEnemy(x, y, cellSize * 1.8);
        if (!e) { toast("请点选一只怪"); return; }
        castSkill(aim, x, y, e);
        return;
      }
    }

    const existing = towerAt(c, r);
    if (existing) {
      // 按下塔：可能是轻点（打开面板）也可能是拖拽合成
      state.drag = { tower: existing, sx: x, sy: y, x, y, moved: false, pid: e.pointerId };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
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
    const { c, r, x, y } = pointerToCell(e);
    state.hoverCell = { c, r };
    const d = state.drag;
    if (d) {
      d.x = x;
      d.y = y;
      if (!d.moved && dist(x, y, d.sx, d.sy) > cellSize * 0.35) {
        d.moved = true;
        if (state.selected) deselect();
        toast("拖到同种同星且 Lv≥" + MERGE_MIN_LEVEL + " 的塔上合成", 1400);
      }
    }
  }

  function onPointerUp(e) {
    const d = state.drag;
    if (!d) return;
    // 忽略其它触点结束，避免多指误清
    if (d.pid != null && e.pointerId != null && d.pid !== e.pointerId) return;
    state.drag = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    if (!state.towers.includes(d.tower)) return;
    if (!d.moved) {
      selectTower(d.tower);
      sfx("click");
      return;
    }
    const c = Math.floor(d.x / cellSize);
    const r = Math.floor(d.y / cellSize);
    const target = towerAt(c, r);
    if (!target || target === d.tower) {
      toast("已放回原位");
      return;
    }
    const why = mergeBlockReason(d.tower, target);
    if (why) {
      toast(why, 1600);
      sfx("click");
      return;
    }
    try {
      feedMerge(target, d.tower);
    } catch (err) {
      console.error("[路卫] merge error", err);
      toast("合成失败，已取消", 1600);
      cancelDrag();
    }
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", (e) => {
    cancelDrag();
    try { if (e && e.pointerId != null) canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener("lostpointercapture", () => { cancelDrag(); });
  window.addEventListener("blur", () => { cancelDrag(); });
  canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  const stage = document.getElementById("stage-wrap");
  if (stage) {
    stage.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  }
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

  towerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      sfx("click");
      if (state.ended || state.paused) return;
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
    if (!state.selected || state.ended || state.paused) return;
    if (state.selected.upgrade()) {
      sfx("upgrade");
      toast(`升级至 Lv.${state.selected.level}`);
      updateHUD();
    } else {
      toast("无法升级");
    }
  });

  btnSell.addEventListener("click", () => {
    if (!state.selected || state.ended || state.paused) return;
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

  if (btnMerge) {
    btnMerge.addEventListener("click", () => {
      sfx("click");
      if (state.ended) return;
      if (state.paused && !state.pendingBranchTower) return;
      if (state.mergeMode) {
        cancelMergeMode();
        refreshSelectPanel();
        toast("已取消合成");
        return;
      }
      enterMergeMode();
    });
  }
  if (btnSkillConfirm) {
    btnSkillConfirm.addEventListener("click", () => {
      sfx("click");
      confirmSkillPick();
    });
  }
  if (btnSkillCancel) {
    btnSkillCancel.addEventListener("click", () => cancelSkillPick());
  }
  if (btnContinue) {
    btnContinue.addEventListener("click", () => {
      sfx("click");
      if (!restoreRunSnapshot()) {
        toast("没有可继续的战斗");
        refreshContinueButton();
      }
    });
  }

  btnNextWave.addEventListener("click", () => {
    if (state.ended || state.paused) return;
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

  if (btnMenu) {
    btnMenu.addEventListener("click", () => {
      returnToDifficultySelect();
    });
  }

  if (startDiffBtns) {
    startDiffBtns.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-diff]");
      if (!btn) return;
      sfx("click");
      menuDiff = btn.dataset.diff;
      refreshStartMenu();
    });
  }
  if (startMapBtns) {
    startMapBtns.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-map]");
      if (!btn) return;
      sfx("click");
      menuMap = Number(btn.dataset.map) | 0;
      refreshStartMenu();
    });
  }
  if (startLevelInput) {
    startLevelInput.addEventListener("input", () => refreshStartMenu());
  }
  if (btnStartGame) {
    btnStartGame.addEventListener("click", () => {
      sfx("click");
      const maxLv = maxUnlocked(menuDiff);
      let lv = Number(startLevelInput && startLevelInput.value) || 1;
      lv = Math.max(1, Math.min(maxLv, Math.floor(lv)));
      openSkillPick(lv, menuDiff, menuMap);
    });
  }


  if (btnPause) {
    btnPause.addEventListener("click", () => togglePause());
  }
  if (btnResume) {
    btnResume.addEventListener("click", () => {
      sfx("click");
      setPaused(false);
    });
  }
  if (btnPauseMenu) {
    btnPauseMenu.addEventListener("click", () => returnToDifficultySelect());
  }
  if (btnHudMenu) {
    btnHudMenu.addEventListener("click", () => {
      if (state.phase === "menu") {
        showStartMenu();
        return;
      }
      returnToDifficultySelect();
    });
  }
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" || ev.key === "p" || ev.key === "P") {
      if (state.phase === "menu" || state.ended) return;
      if (ev.key === "Escape" && state.paused) {
        setPaused(false);
        sfx("click");
      } else if (ev.key !== "Escape" || !state.paused) {
        togglePause();
      }
    }
  });

  document.getElementById("speed-btns").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".speed-btn");
    if (!btn) return;
    sfx("click");
    setGameSpeed(btn.dataset.speed);
  });
  syncSpeedButtons();

  // ---------- 战斗逻辑 ----------
  function findTargets(tower, n = 1) {
    const rangePx = tower.range * cellSize;
    const scored = [];
    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      if (dist(tower.x, tower.y, e.x, e.y) <= rangePx + e.radius * cellSize) {
        scored.push({ e, score: e.priority * 1e6 + e.progress });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, n)).map((x) => x.e);
  }

  function findTarget(tower) {
    return findTargets(tower, 1)[0] || null;
  }

  function spawnSplitlings(parent) {
    const baseHpMul = Math.max(0.2, (parent.maxHp / BASE_HP) * 0.35);
    for (let i = 0; i < 2; i++) {
      const child = new Enemy("spawn", 1.15, baseHpMul, Math.max(1, Math.round(parent.reward * 0.25)));
      child.progress = Math.max(0, parent.progress - cellSize * 0.15 * (i + 1));
      const p = posOnPath(child.progress);
      child.x = p.x;
      child.y = p.y;
      child.angle = p.angle;
      child.baseSpeed = BASE_SPEED * 1.15 * cellSize;
      state.enemies.push(child);
    }
  }

  function damageEnemy(e, amount, now, style, isSplash, opts = {}) {
    if (e.dead) return;
    let raw = amount;
    if (hasShatterAura() && now < e.slowUntil && e.slowMul < 1) {
      raw *= 1.25;
    }
    const dmg = e.mitigate(raw, style, !!isSplash, !!opts.ignoreShieldArrow);
    e.hp -= dmg;
    e.hitFlash = now + 0.1;
    if (e.hp <= 0) {
      e.dead = true;
      e.hp = 0;
      state.kills++;
      let bounty = e.reward;
      if (now < (state.goldTideUntil || 0)) bounty = Math.round(bounty * 1.5);
      state.gold += bounty;
      const n = e.kind === "boss" ? 14 : e.kind === "tank" ? 10 : 7;
      spawnParticle(e.x, e.y, e.color, n);
      sfx("death", e.kind);
      if (e.splitOnDeath || e.kind === "splitter") {
        spawnSplitlings(e);
      }
    } else {
      sfx("hit");
    }
  }

  function hitProjectile(p, now) {
    p.alive = false;
    const target = p.target;
    const opts = { ignoreShieldArrow: !!p.ignoreShieldArrow };
    if (p.splash > 0) {
      sfx("boom");
      for (const e of state.enemies) {
        if (e.dead || e.escaped) continue;
        const d = dist(p.tx, p.ty, e.x, e.y);
        if (d <= p.splash + e.radius * cellSize) {
          const isPrimary = e === target;
          const dmg = isPrimary ? p.damage : p.damage * p.splashRatio;
          damageEnemy(e, dmg, now, p.style, !isPrimary, opts);
        }
      }
      spawnParticle(p.tx, p.ty, "#ffab91", 10);
      state.explosions.push({
        x: p.tx, y: p.ty, r: 4, maxR: p.splash,
        life: 0.32, maxLife: 0.32, shards: 6,
      });
      if (p.burnGround) {
        state.fires.push({
          x: p.tx, y: p.ty,
          r: Math.max(cellSize * 0.7, p.splash * 0.85),
          dps: p.damage * 0.25,
          until: now + 2,
        });
      }
    } else {
      if (target && !target.dead && !target.escaped) {
        damageEnemy(target, p.damage, now, p.style, false, opts);
        if (p.slow > 0) target.applySlow(p.slow, p.slowDur, now);
        if (p.freezeChance > 0 && Math.random() < p.freezeChance) {
          if (target.tryFreeze(now, target.kind === "boss")) {
            spawnParticle(target.x, target.y, "#e1f5fe", 6);
          }
        }
      }
      spawnParticle(p.tx, p.ty, p.color, 4);
    }
  }

  function update(dt, now) {
    if (state.ended || state.phase === "menu" || state.paused) return;

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
          const neo = new Enemy(spec.kind, spec.speedMul, spec.hpMul, spec.reward);
          if (neo.kind === "boss") neo.spawnFlashUntil = gameNow + 0.3;
          state.enemies.push(neo);
          // 终局重叠出场：Boss 后极短间隔
          if (state.wave === WAVES_PER_LEVEL) {
            state.spawnTimer = spec.kind === "boss" ? 0.2 : 0.28;
          } else {
            state.spawnTimer = spec.kind === "boss" ? 0.35 : 0.55;
          }
          state.phase = "spawning";
        }
      }
    }

    // 技能冷却
    if (state.skillCd) {
      for (const id of Object.keys(state.skillCd)) {
        if (state.skillCd[id] > 0) state.skillCd[id] = Math.max(0, state.skillCd[id] - dt);
      }
    }
    // 技能按钮 CD 文案（轻量）
    if ((Math.floor(gameNow * 4) % 2) === 0) updateSkillButtons();

    // 援军衰减
    for (const a of state.allies) {
      a.until -= 0; // until 用绝对 gameNow
    }
    state.allies = state.allies.filter((a) => a.hp > 0 && now < a.until);

    for (const e of state.enemies) {
      if (e.dead || e.escaped) continue;
      let spd = e.speed(now);
      if (now < (state.timeSlowUntil || 0)) {
        spd *= (e.kind === "boss" ? 0.65 : 0.4);
      }
      // 援军拦截
      let blocked = false;
      for (const ally of state.allies) {
        if (ally.hp <= 0) continue;
        const gap = ally.progress - e.progress;
        if (gap >= -cellSize * 0.15 && gap <= cellSize * 0.55) {
          if (e.kind === "boss") {
            spd *= 0.5;
          } else {
            blocked = true;
            ally.hp -= Math.max(8, e.maxHp * 0.015) * dt;
            if (ally.hp <= 0) spawnParticle(ally.x, ally.y, "#ffd54f", 6);
          }
          break;
        }
      }
      if (!blocked) e.progress += spd * dt;
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
      // 闪现贼：周期性沿路径前窜
      if (e.kind === "blinker" && !blocked) {
        e.blinkTimer = (e.blinkTimer || 0) - dt;
        if (e.blinkTimer <= 0) {
          e.progress += cellSize * (1.2 + Math.random() * 0.6);
          e.blinkTimer = 2.2 + Math.random() * 1.2;
          spawnParticle(e.x, e.y, "#ce93d8", 5);
        }
      }
      const p = posOnPath(Math.min(e.progress, pathLen - 0.01));
      e.x = p.x;
      e.y = p.y;
      e.angle = p.angle;
      if (now >= e.slowUntil) e.slowMul = 1;

      // 治疗虫：附近友军回血
      if (e.kind === "healer") {
        e.healTimer = (e.healTimer || 0) - dt;
        if (e.healTimer <= 0) {
          e.healTimer = 2.0;
          const range = cellSize * 1.8;
          for (const ally of state.enemies) {
            if (ally.dead || ally.escaped || ally === e) continue;
            if (dist(e.x, e.y, ally.x, ally.y) <= range) {
              ally.hp = Math.min(ally.maxHp, ally.hp + Math.max(4, Math.round(ally.maxHp * 0.04)));
            }
          }
          spawnParticle(e.x, e.y, "#aed581", 4);
        }
      }
    }

    state.enemies = state.enemies.filter((e) => !e.dead && !e.escaped);
    state.allies = state.allies.filter((a) => a.hp > 0 && now < a.until);

    // 地面火
    for (const f of state.fires) {
      for (const e of state.enemies) {
        if (e.dead || e.escaped) continue;
        if (dist(f.x, f.y, e.x, e.y) <= f.r + e.radius * cellSize) {
          damageEnemy(e, f.dps * dt, now, "cannon", true);
        }
      }
    }
    state.fires = state.fires.filter((f) => now < f.until);

    for (const t of state.towers) {
      t.cooldown -= dt;
      if (t.muzzleFlash > 0) t.muzzleFlash -= dt;
      const targets = findTargets(t, t.multiTarget || 1);
      if (targets.length) {
        t.angle = Math.atan2(targets[0].y - t.y, targets[0].x - t.x);
        if (t.cooldown <= 0) {
          for (const target of targets) {
            state.projectiles.push(new Projectile(t, target, now));
          }
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

    updateSkillButtons();
    checkWaveClear();
    updateHUD();
  }

  // ---------- 绘制 ----------
  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const now = performance.now() / 1000;
    ctx.clearRect(0, 0, w, h);

    const skin = sceneSkinFor(state.stage || 1);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, skin.sky[0]);
    sky.addColorStop(0.55, skin.sky[1]);
    sky.addColorStop(1, skin.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // 氛围层（雾/余晖/熔岩辉光）
    if (skin.decor === "fog") {
      const fog = ctx.createRadialGradient(w * 0.5, h * 0.15, 10, w * 0.5, h * 0.2, h * 0.55);
      fog.addColorStop(0, "rgba(180,200,220,0.12)");
      fog.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, w, h);
    } else if (skin.decor === "lava") {
      const glow = ctx.createRadialGradient(w * 0.3, h * 0.7, 8, w * 0.35, h * 0.75, h * 0.45);
      glow.addColorStop(0, "rgba(255,90,40,0.14)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    } else if (skin.decor === "snow") {
      const chill = ctx.createLinearGradient(0, 0, 0, h * 0.4);
      chill.addColorStop(0, "rgba(180,220,255,0.1)");
      chill.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = chill;
      ctx.fillRect(0, 0, w, h);
    } else if (skin.decor === "toxic") {
      const tox = ctx.createRadialGradient(w * 0.7, h * 0.3, 6, w * 0.7, h * 0.35, h * 0.4);
      tox.addColorStop(0, "rgba(120,200,60,0.1)");
      tox.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = tox;
      ctx.fillRect(0, 0, w, h);
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        if (isPath(c, r)) {
          ctx.fillStyle = skin.pathFill;
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          const even = (c + r) % 2 === 0;
          ctx.fillStyle = even ? skin.tileEven : skin.tileOdd;
          ctx.fillRect(x, y, cellSize, cellSize);
          const seed = (c * 17 + r * 31 + (state.stage || 1) * 7) & 15;
          drawTileDecor(skin, x, y, cellSize, seed, now);
        }
      }
    }

    if (pathPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.strokeStyle = skin.pathOuter;
      ctx.lineWidth = cellSize * 0.9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.strokeStyle = skin.pathEdge;
      ctx.lineWidth = cellSize * 0.64;
      ctx.stroke();
      ctx.strokeStyle = skin.pathMid;
      ctx.lineWidth = cellSize * 0.4;
      ctx.stroke();
      ctx.strokeStyle = skin.pathInner;
      ctx.lineWidth = cellSize * 0.12;
      ctx.stroke();
      ctx.setLineDash([3, 9]);
      ctx.strokeStyle = skin.pathDash;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawSceneWash(skin, w, h);
    if (document.body.dataset.decor !== skin.decor) {
      document.body.dataset.decor = skin.decor;
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

    // 合成材料高亮
    if (state.mergeMode && state.selected) {
      for (const t of state.towers) {
        if (t === state.selected) continue;
        const ok = canMergeCandidate(state.selected, t);
        const picked = state.mergePicks.includes(t);
        if (!ok && !picked) continue;
        ctx.beginPath();
        ctx.arc(t.x, t.y, cellSize * 0.42, 0, Math.PI * 2);
        ctx.strokeStyle = picked ? "rgba(255,213,79,0.95)" : "rgba(129,212,250,0.75)";
        ctx.lineWidth = picked ? 3 : 2;
        ctx.stroke();
      }
    }

    // 地面火
    for (const f of state.fires) {
      const life = Math.max(0, f.until - gameNow);
      const a = 0.25 + 0.2 * Math.min(1, life);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,112,67,${a})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,204,128,${a + 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 技能瞄准预览
    if (state.skillAim && SKILL_DEFS[state.skillAim] && SKILL_DEFS[state.skillAim].aim === "point" && state.hoverCell) {
      const hc = state.hoverCell;
      const p = cellCenter(hc.c, hc.r);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 * cellSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,112,67,0.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,112,67,0.7)";
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const t of state.towers) drawTower(t);
    if (state.drag && state.drag.moved && state.towers.includes(state.drag.tower)) {
      const d = state.drag, src = d.tower;
      for (const t of state.towers) {
        if (t === src) continue;
        const ok = !mergeBlockReason(src, t);
        if (!ok && t.type !== src.type) continue;
        ctx.save();
        ctx.strokeStyle = ok ? "#69f0ae" : "#ff5252";
        ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
        ctx.strokeRect(t.x - cellSize * 0.46, t.y - cellSize * 0.46, cellSize * 0.92, cellSize * 0.92);
        ctx.restore();
      }
      const hov = towerAt(Math.floor(d.x / cellSize), Math.floor(d.y / cellSize));
      const valid = hov && hov !== src && !mergeBlockReason(src, hov);
      ctx.save();
      ctx.globalAlpha = 0.35; ctx.strokeStyle = "#fff"; ctx.setLineDash([4, 4]);
      ctx.strokeRect(src.x - cellSize * 0.45, src.y - cellSize * 0.45, cellSize * 0.9, cellSize * 0.9);
      ctx.restore();
      const ghost = Object.assign(Object.create(Object.getPrototypeOf(src)), src, { x: d.x, y: d.y - cellSize * 0.3 });
      drawTower(ghost, cellSize, 0.75);
      ctx.beginPath(); ctx.arc(d.x, d.y - cellSize * 0.3, cellSize * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = valid ? "#69f0ae" : (hov && hov !== src ? "#ff5252" : "rgba(255,255,255,0.6)");
      ctx.lineWidth = 2.5; ctx.stroke();
    }

    // 援军
    for (const a of state.allies) {
      drawGroundShadow(a.x, a.y, cellSize * 0.22, cellSize * 0.16);
      ctx.fillStyle = "#c8a45a";
      ctx.beginPath();
      ctx.arc(a.x, a.y, cellSize * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5a4020";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#8d6e3a";
      ctx.fillRect(a.x - cellSize * 0.1, a.y - cellSize * 0.18, cellSize * 0.2, cellSize * 0.16);
      const ratio = Math.max(0, a.hp / a.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(a.x - cellSize * 0.2, a.y + cellSize * 0.26, cellSize * 0.4, 3);
      ctx.fillStyle = ratio > 0.35 ? "#8bc34a" : "#e57373";
      ctx.fillRect(a.x - cellSize * 0.2, a.y + cellSize * 0.26, cellSize * 0.4 * ratio, 3);
    }

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

    drawSceneMotes(skin, w, h, now);

    // 轻 vignette（随场景）
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, `rgba(0,0,0,${skin.vignette})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = skin.accent;
    ctx.font = `600 ${Math.max(11, cellSize * 0.3)}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(`路卫 · ${skin.name}`, w / 2, cellSize * 0.4);
  }


  function drawSceneWash(skin, w, h) {
    const tops = {
      brick: "rgba(64,44,20,0.07)",
      fog: "rgba(48,42,78,0.24)",
      snow: "rgba(176,206,240,0.16)",
      lava: "rgba(96,28,0,0.16)",
      toxic: "rgba(18,46,18,0.2)",
    };
    const bots = {
      brick: "rgba(0,0,0,0.1)",
      fog: "rgba(4,6,14,0.2)",
      snow: "rgba(6,14,26,0.16)",
      lava: "rgba(36,6,0,0.22)",
      toxic: "rgba(2,14,6,0.2)",
    };
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tops[skin.decor] || "rgba(0,0,0,0)");
    g.addColorStop(0.55, "rgba(0,0,0,0)");
    g.addColorStop(1, bots[skin.decor] || "rgba(0,0,0,0.08)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (skin.decor === "fog" || skin.decor === "snow" || skin.decor === "brick") {
      const mx = w * 0.82;
      const my = h * 0.055;
      const mr = Math.max(7, Math.min(w, h) * 0.034);
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fillStyle = skin.decor === "brick" ? "rgba(255,226,180,0.38)" : "rgba(230,238,255,0.55)";
      ctx.fill();
    }
  }

  function drawSceneMotes(skin, w, h, now) {
    const n = skin.decor === "fog" ? 12 : 22;
    for (let i = 0; i < n; i++) {
      const seed = i * 97.13;
      if (skin.decor === "snow") {
        const x = ((seed * 13 + Math.sin(now * 0.6 + i) * 14 + now * (16 + (i % 5) * 5)) % (w + 24)) - 12;
        const y = ((seed * 7 + now * (26 + (i % 6) * 8)) % (h + 24)) - 12;
        ctx.globalAlpha = 0.4 + (i % 4) * 0.1;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(x, y, i % 3 === 0 ? 2.1 : 1.4, i % 3 === 0 ? 2.1 : 1.4);
      } else if (skin.decor === "lava") {
        const x = ((seed * 19) % (w + 16)) - 8 + Math.sin(now * 1.3 + i) * 8;
        const y = h - ((seed + now * (20 + (i % 5) * 12)) % (h + 36));
        ctx.globalAlpha = 0.35 + Math.abs(Math.sin(now * 6 + i)) * 0.5;
        ctx.fillStyle = i % 4 === 0 ? "rgba(255,220,120,0.9)" : "rgba(255,130,40,0.8)";
        ctx.beginPath();
        ctx.arc(x, y, i % 5 === 0 ? 2 : 1.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (skin.decor === "fog") {
        const x = ((seed * 11 + now * (7 + (i % 3) * 3)) % (w + 70)) - 30;
        const y = ((seed * 5) % h) + Math.sin(now * 0.35 + i) * 6;
        ctx.globalAlpha = 0.05 + (i % 3) * 0.02;
        ctx.fillStyle = "rgba(190,196,214,0.9)";
        ctx.beginPath();
        ctx.ellipse(x, y, 26 + (i % 4) * 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (skin.decor === "toxic") {
        const x = ((seed * 17 + now * (9 + (i % 4) * 3)) % (w + 16)) - 8;
        const y = ((seed * 9 + Math.sin(now * 0.7 + i) * 18) % (h + 16)) - 8;
        ctx.globalAlpha = 0.22 + (i % 3) * 0.1;
        ctx.fillStyle = "rgba(186,220,110,0.7)";
        ctx.beginPath();
        ctx.arc(x, y, 1.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const x = ((seed * 13 + now * (10 + (i % 4) * 3)) % (w + 20)) - 10;
        const y = ((seed * 23) % (h + 12)) - 6 + Math.sin(now * 0.4 + i) * 6;
        ctx.globalAlpha = 0.14 + (i % 4) * 0.06;
        ctx.fillStyle = "rgba(220,190,130,0.7)";
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawTileDecor(skin, x, y, cs, seed, now) {
    if (skin.decor === "brick") {
      if (seed < 3) {
        ctx.fillStyle = "rgba(90,70,45,0.35)";
        ctx.fillRect(x + 2, y + cs * 0.48, cs - 4, 1);
      }
      if (seed === 4 || seed === 9) {
        ctx.fillStyle = "rgba(120,150,80,0.16)";
        ctx.beginPath();
        ctx.arc(x + cs * 0.35, y + cs * 0.4, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (seed === 7) {
        ctx.fillStyle = "rgba(180,150,90,0.12)";
        ctx.fillRect(x + cs * 0.55, y + cs * 0.2, 3, 2.5);
      }
    } else if (skin.decor === "fog") {
      if (seed % 5 === 0) {
        ctx.fillStyle = "rgba(140,160,180,0.08)";
        ctx.beginPath();
        ctx.ellipse(x + cs * 0.5, y + cs * 0.55, cs * 0.28, cs * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (seed === 2 || seed === 11) {
        const hx = x + cs * 0.28;
        const hy = y + cs * 0.22;
        ctx.fillStyle = "rgba(168,172,186,0.55)";
        ctx.fillRect(hx, hy, cs * 0.16, cs * 0.28);
        ctx.fillRect(hx - cs * 0.03, hy + cs * 0.26, cs * 0.22, cs * 0.045);
        ctx.strokeStyle = "rgba(40,44,58,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx + cs * 0.08, hy + cs * 0.05);
        ctx.lineTo(hx + cs * 0.08, hy + cs * 0.16);
        ctx.moveTo(hx + cs * 0.04, hy + cs * 0.1);
        ctx.lineTo(hx + cs * 0.12, hy + cs * 0.1);
        ctx.stroke();
      }
    } else if (skin.decor === "snow") {
      if (seed < 4) {
        ctx.fillStyle = "rgba(220,240,255,0.14)";
        ctx.fillRect(x + 1, y + 1, cs - 2, cs * 0.18);
      }
      if (seed === 6 || seed === 13) {
        ctx.fillStyle = "rgba(200,230,255,0.35)";
        ctx.beginPath();
        ctx.arc(x + cs * 0.4, y + cs * 0.35, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (skin.decor === "lava") {
      if (seed === 1 || seed === 8 || seed === 14) {
        const pulse = 0.35 + Math.sin(now * 2.5 + seed) * 0.15;
        ctx.strokeStyle = `rgba(255,100,40,${pulse})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + cs * 0.15, y + cs * 0.7);
        ctx.quadraticCurveTo(x + cs * 0.45, y + cs * 0.4, x + cs * 0.85, y + cs * 0.65);
        ctx.stroke();
      }
      if (seed === 3) {
        ctx.fillStyle = "rgba(255,120,50,0.18)";
        ctx.beginPath();
        ctx.arc(x + cs * 0.6, y + cs * 0.55, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (skin.decor === "toxic") {
      if (seed % 4 === 0) {
        ctx.fillStyle = "rgba(120,200,80,0.12)";
        ctx.beginPath();
        ctx.ellipse(x + cs * 0.45, y + cs * 0.6, cs * 0.22, cs * 0.1, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (seed === 5 || seed === 12) {
        ctx.strokeStyle = "rgba(110,160,70,0.55)";
        ctx.lineWidth = 1.15;
        const bx = x + cs * (0.3 + (seed % 3) * 0.12);
        ctx.beginPath();
        ctx.moveTo(bx, y + cs * 0.78);
        ctx.quadraticCurveTo(bx + 2, y + cs * 0.42, bx - 1, y + cs * 0.2);
        ctx.stroke();
        ctx.fillStyle = "rgba(150,190,80,0.4)";
        ctx.beginPath();
        ctx.ellipse(bx - 1, y + cs * 0.2, 2.1, 1.1, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
  function portalColors(decor) {
    if (decor === "fog") return { ring: "rgba(176,186,214,0.8)", fill: "#12141c", stroke: "#c5cbe0", core: "rgba(150,160,190,0.6)", glyph: "#f0eef8" };
    if (decor === "snow") return { ring: "rgba(186,220,255,0.85)", fill: "#15202c", stroke: "#d7ecff", core: "rgba(170,215,255,0.62)", glyph: "#f4fbff" };
    if (decor === "lava") return { ring: "rgba(255,120,40,0.88)", fill: "#1a0a06", stroke: "#ffab70", core: "rgba(255,90,20,0.72)", glyph: "#ffe0b2" };
    if (decor === "toxic") return { ring: "rgba(150,200,80,0.78)", fill: "#101810", stroke: "#c5e1a5", core: "rgba(110,170,60,0.62)", glyph: "#f1f8e9" };
    return { ring: "rgba(140,180,70,0.9)", fill: "#1a2014", stroke: "#8bc34a", core: "rgba(124,179,66,0.7)", glyph: "#0a1008" };
  }

  function gateColors(decor) {
    if (decor === "fog") return { stone: "#5c6070", edge: "#2c3040", cren: "#8a90a4", arch: "#0c0e14", trim: "#d5d8ea", flag: "#ece8f4", pole: "#6a7080", glow: "rgba(190,196,220,0.65)", glyph: "#f7f4ff" };
    if (decor === "snow") return { stone: "#6e7c8c", edge: "#2c3a48", cren: "#d5e2ee", arch: "#101820", trim: "#e3f2fd", flag: "#90caf9", pole: "#546e7a", glow: "rgba(180,220,255,0.7)", glyph: "#f5fbff" };
    if (decor === "lava") return { stone: "#5c3a2e", edge: "#2a1610", cren: "#8a5644", arch: "#0c0604", trim: "#ffb74d", flag: "#e65100", pole: "#6d4c41", glow: "rgba(255,120,40,0.72)", glyph: "#ffe0b2" };
    if (decor === "toxic") return { stone: "#4e5a40", edge: "#243024", cren: "#6e7c58", arch: "#0c120c", trim: "#c5e1a5", flag: "#7cb342", pole: "#5d6b4a", glow: "rgba(160,200,80,0.55)", glyph: "#f1f8e9" };
    return { stone: "#5a4a36", edge: "#3e3428", cren: "#6d5c45", arch: "#1a120c", trim: "#d4af55", flag: "#c62828", pole: "#8d6e63", glow: "rgba(212,175,85,0.7)", glyph: "#ffecb3" };
  }

  function drawZombieSpawn(x, y, now) {
    const skin = sceneSkinFor(state.stage || 1);
    const pal = portalColors(skin.decor);
    const r = cellSize * 0.34;
    const pulse = 0.35 + Math.sin(now * 2.6) * 0.12;
    ctx.beginPath();
    ctx.arc(x, y, r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = pal.ring;
    ctx.globalAlpha = 0.55 + pulse * 0.4;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.globalAlpha = 1;
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
    ctx.fillStyle = pal.fill;
    ctx.fill();
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (skin.decor === "fog") {
      ctx.strokeStyle = "rgba(220,220,235,0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.55);
      ctx.lineTo(x, y + r * 0.12);
      ctx.moveTo(x - r * 0.26, y - r * 0.22);
      ctx.lineTo(x + r * 0.26, y - r * 0.22);
      ctx.stroke();
    } else if (skin.decor === "snow") {
      ctx.strokeStyle = "rgba(225,245,254,0.75)";
      ctx.lineWidth = 1.1;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + now * 0.25;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = pal.core;
    ctx.globalAlpha = 0.75 + pulse * 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.glyph;
    ctx.font = `700 ${Math.max(9, cellSize * 0.22)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("尸", x, y + 0.5);
  }

  /** 出口：城堡门 */
  function drawCastleGate(x, y, now) {
    const skin = sceneSkinFor(state.stage || 1);
    const g = gateColors(skin.decor);
    const s = cellSize;
    const pulse = 0.3 + Math.sin(now * 2.2 + 1.2) * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
    ctx.strokeStyle = g.glow;
    ctx.globalAlpha = 0.45 + pulse;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // 石门主体
    const bw = s * 0.55;
    const bh = s * 0.62;
    roundRectPath(x - bw / 2, y - bh / 2, bw, bh, 3);
    ctx.fillStyle = g.stone;
    ctx.fill();
    ctx.strokeStyle = g.edge;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 城垛顶
    const teeth = 4;
    const tw = bw / teeth;
    for (let i = 0; i < teeth; i++) {
      if (i % 2 === 1) continue;
      ctx.fillStyle = g.cren;
      ctx.fillRect(x - bw / 2 + i * tw, y - bh / 2 - s * 0.1, tw * 0.9, s * 0.12);
      if (skin.decor === "snow") {
        ctx.fillStyle = "rgba(236,246,255,0.92)";
        ctx.fillRect(x - bw / 2 + i * tw, y - bh / 2 - s * 0.1, tw * 0.9, s * 0.04);
      }
    }
    // 拱门洞
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.22, y + bh * 0.35);
    ctx.lineTo(x - bw * 0.22, y - bh * 0.05);
    ctx.quadraticCurveTo(x, y - bh * 0.38, x + bw * 0.22, y - bh * 0.05);
    ctx.lineTo(x + bw * 0.22, y + bh * 0.35);
    ctx.closePath();
    ctx.fillStyle = g.arch;
    ctx.fill();
    if (skin.decor === "lava") {
      ctx.fillStyle = "rgba(255,100,30,0.4)";
      ctx.fill();
    }
    ctx.strokeStyle = g.trim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 小旗
    if (skin.decor === "toxic") {
      ctx.fillStyle = "rgba(110,160,60,0.5)";
      ctx.fillRect(x - bw * 0.32, y + bh * 0.18, 4, 3);
    }
    ctx.strokeStyle = g.pole;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + bw * 0.38, y - bh * 0.45);
    ctx.lineTo(x + bw * 0.38, y - bh * 0.75);
    ctx.stroke();
    const flutter = Math.sin(now * 3) * bw * 0.04;
    ctx.fillStyle = g.flag;
    ctx.beginPath();
    ctx.moveTo(x + bw * 0.38, y - bh * 0.75);
    ctx.lineTo(x + bw * 0.58 + flutter, y - bh * 0.65);
    ctx.lineTo(x + bw * 0.38, y - bh * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = g.glyph;
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

  // ---------- v17 塔外观：等级=材质/层数，星级=饰件/光环，专精=专属部件 ----------
  const TOWER_MAT = [
    null,
    { name: "wood", body: "#8a6440", dark: "#4a3020", line: "#2e1d10", trim: "#b98a55" },
    { name: "stone", body: "#9a958a", dark: "#55514a", line: "#2f2c28", trim: "#c9c2b4" },
    { name: "metal", body: "#6f7c8c", dark: "#2f3846", line: "#141a22", trim: "#ffd54f" },
  ];
  const TOWER_ID = {
    arrow: { main: "#7cb342", light: "#c5e1a5", glow: "rgba(156,204,101," },
    cannon: { main: "#e65100", light: "#ffab40", glow: "rgba(255,138,64," },
    frost: { main: "#29b6f6", light: "#e1f5fe", glow: "rgba(129,212,250," },
  };
  function towerScale(t) {
    return 0.74 + 0.09 * (t.level - 1) + 0.05 * ((t.star || 1) - 1);
  }
  function polyPath(cx, cy, rad, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  function drawStarAura(t, s, id) {
    const st = t.star || 1;
    if (st < 2) return;
    const now = performance.now() / 1000;
    const R = s * (st === 3 ? 0.47 : 0.43);
    ctx.save();
    ctx.lineWidth = st === 3 ? 2.6 : 1.8;
    ctx.strokeStyle = st === 3 ? "rgba(255,213,79,0.9)" : "rgba(220,230,240,0.85)";
    ctx.setLineDash(st === 3 ? [6, 4] : [3, 4]);
    ctx.lineDashOffset = -now * 18;
    ctx.beginPath();
    ctx.arc(t.x, t.y, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (st === 3) {
      const g = ctx.createRadialGradient(t.x, t.y, s * 0.1, t.x, t.y, R * 1.05);
      g.addColorStop(0, id.glow + "0.0)");
      g.addColorStop(1, id.glow + (0.28 + 0.12 * Math.sin(now * 3)) + ")");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x, t.y, R * 1.05, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const a = now * 1.6 + (i * Math.PI) / 2;
        ctx.fillStyle = i % 2 ? "#fff59d" : id.light;
        ctx.beginPath();
        ctx.arc(t.x + Math.cos(a) * R, t.y + Math.sin(a) * R, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawLevelTiers(t, s, w, mat) {
    // 底座层数 = 等级，越高越宽
    for (let i = t.level - 1; i >= 0; i--) {
      const ww = w * (1 + i * 0.12);
      const yy = t.y + s * 0.08 + i * s * 0.05;
      roundRectPath(t.x - ww / 2, yy, ww, s * 0.12, 2);
      ctx.fillStyle = i === 0 ? mat.dark : mat.body;
      ctx.fill();
      ctx.strokeStyle = mat.line;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function drawTowerStars(t, s) {
    const n = t.star || 1;
    const gy = t.y + s * 0.42;
    const col = n === 3 ? "#ffd54f" : n === 2 ? "#e0e0e0" : "#bcaaa4";
    roundRectPath(t.x - s * 0.08 * n - 2, gy - s * 0.07, s * 0.16 * n + 4, s * 0.14, 4);
    ctx.fillStyle = "rgba(20,16,12,0.75)";
    ctx.fill();
    for (let i = 0; i < n; i++) {
      const ox = (i - (n - 1) / 2) * s * 0.16;
      polyPath(t.x + ox, gy, s * 0.06, 4, 0);
      ctx.fillStyle = col;
      ctx.fill();
    }
    if (t.mergePips) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(t.x + s * 0.36, t.y - s * 0.12 + i * s * 0.14, s * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = i < t.mergePips ? "#69f0ae" : "rgba(0,0,0,0.5)";
        ctx.fill();
        ctx.strokeStyle = "#1b5e20";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    if (t.branchName) {
      ctx.font = `bold ${Math.max(9, s * 0.17)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(t.branchName, t.x, t.y - s * 0.44);
      ctx.fillStyle = "#fff3c4";
      ctx.fillText(t.branchName, t.x, t.y - s * 0.44);
    }
    ctx.font = `bold ${Math.max(8, s * 0.15)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText("Lv" + t.level, t.x - s * 0.47, t.y - s * 0.47);
    ctx.fillStyle = ["", "#d7ccc8", "#eeeeee", "#ffd54f"][t.level];
    ctx.fillText("Lv" + t.level, t.x - s * 0.47, t.y - s * 0.47);
  }
  function drawTower(t, s0, alpha) {
    const s = (s0 || cellSize) * towerScale(t);
    const mat = TOWER_MAT[Math.max(1, Math.min(3, t.level))];
    const id = TOWER_ID[t.type];
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    drawGroundShadow(t.x, t.y, s * 0.34, s * 0.28);
    drawStarAura(t, s, id);
    if (t.type === "arrow") drawArrowTower(t, s, mat, id);
    else if (t.type === "cannon") drawCannonTower(t, s, mat, id);
    else drawFrostTower(t, s, mat, id);
    ctx.restore();
    if (alpha == null) drawTowerStars(t, s0 || cellSize);
  }

  /** 箭塔：方形高箭楼 + 绿色尖顶旗；连弩=三联弩臂，狙击=长弩+瞄镜 */
  function drawArrowTower(t, s, mat, id) {
    const w = s * 0.42;
    drawLevelTiers(t, s, w, mat);
    // 高塔身（梯形）
    const top = t.y - s * (0.18 + 0.06 * t.level);
    ctx.beginPath();
    ctx.moveTo(t.x - w / 2, t.y + s * 0.1);
    ctx.lineTo(t.x - w * 0.38, top);
    ctx.lineTo(t.x + w * 0.38, top);
    ctx.lineTo(t.x + w / 2, t.y + s * 0.1);
    ctx.closePath();
    ctx.fillStyle = mat.body;
    ctx.fill();
    ctx.strokeStyle = mat.line;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (mat.name === "wood") {
      ctx.strokeStyle = mat.dark; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(t.x + i * w * 0.2, top); ctx.lineTo(t.x + i * w * 0.24, t.y + s * 0.1); ctx.stroke(); }
    } else {
      ctx.strokeStyle = mat.trim; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(t.x - w * 0.42, (top + t.y) / 2); ctx.lineTo(t.x + w * 0.42, (top + t.y) / 2); ctx.stroke();
    }
    // 绿色尖顶
    ctx.beginPath();
    ctx.moveTo(t.x - w * 0.5, top);
    ctx.lineTo(t.x, top - s * (0.14 + 0.03 * t.level));
    ctx.lineTo(t.x + w * 0.5, top);
    ctx.closePath();
    ctx.fillStyle = id.main;
    ctx.fill();
    ctx.strokeStyle = mat.line; ctx.lineWidth = 1.2; ctx.stroke();
    // 旗帜（2★+ 双旗）
    const flags = (t.star || 1) >= 2 ? [-1, 1] : [1];
    for (const sd of flags) {
      const fx = t.x + sd * w * 0.5;
      ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(fx, top); ctx.lineTo(fx, top - s * 0.2); ctx.stroke();
      ctx.fillStyle = (t.star || 1) >= 3 ? "#ffd54f" : id.light;
      ctx.beginPath(); ctx.moveTo(fx, top - s * 0.2); ctx.lineTo(fx + sd * s * 0.12, top - s * 0.16); ctx.lineTo(fx, top - s * 0.12); ctx.closePath(); ctx.fill();
    }
    // 旋转弩
    ctx.save();
    ctx.translate(t.x, t.y - s * 0.02);
    ctx.rotate(t.angle);
    const arms = t.branch === "rapid" ? [-0.1, 0, 0.1] : [0];
    const len = t.branch === "snipe" ? 0.48 : 0.32;
    for (const oy of arms) {
      ctx.strokeStyle = mat.name === "metal" ? "#cfd8dc" : "#6d4c41";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s * 0.12, oy * s, s * 0.12, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = id.light; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(0, oy * s); ctx.lineTo(s * len, oy * s); ctx.stroke();
      ctx.fillStyle = "#fff8e1";
      ctx.beginPath(); ctx.moveTo(s * (len + 0.07), oy * s); ctx.lineTo(s * len, oy * s - s * 0.05); ctx.lineTo(s * len, oy * s + s * 0.05); ctx.closePath(); ctx.fill();
    }
    if (t.branch === "snipe") {
      roundRectPath(s * 0.08, -s * 0.1, s * 0.16, s * 0.06, 2);
      ctx.fillStyle = "#263238"; ctx.fill();
      ctx.fillStyle = "#ff1744"; ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.07, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = mat.trim; ctx.fill(); ctx.strokeStyle = mat.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  /** 炮塔：矮宽圆形碉堡 + 橙色炮管；Lv↑ 炮管数增加；迫击=粗短臼炮，燃烧=火焰喷口 */
  function drawCannonTower(t, s, mat, id) {
    const w = s * 0.6;
    drawLevelTiers(t, s, w * 0.9, mat);
    // 八角碉堡
    polyPath(t.x, t.y - s * 0.02, w * 0.5, 8, Math.PI / 8);
    ctx.fillStyle = mat.body; ctx.fill();
    ctx.strokeStyle = mat.line; ctx.lineWidth = 2; ctx.stroke();
    polyPath(t.x, t.y - s * 0.02, w * 0.36, 8, Math.PI / 8);
    ctx.fillStyle = mat.dark; ctx.fill();
    // 铆钉/铁箍
    const n = 4 + t.level * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(t.x + Math.cos(a) * w * 0.43, t.y - s * 0.02 + Math.sin(a) * w * 0.43, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = mat.trim; ctx.fill();
    }
    ctx.save();
    ctx.translate(t.x, t.y - s * 0.02);
    ctx.rotate(t.angle);
    const barrels = t.branch === "mortar" ? 1 : Math.min(3, t.level);
    const bw = t.branch === "mortar" ? 0.26 : 0.12;
    const bl = t.branch === "mortar" ? 0.26 : 0.34 + 0.04 * t.level;
    for (let i = 0; i < barrels; i++) {
      const oy = (i - (barrels - 1) / 2) * s * 0.13;
      roundRectPath(0, oy - s * bw / 2, s * bl, s * bw, 2);
      ctx.fillStyle = mat.name === "metal" ? "#37474f" : "#3e2f22"; ctx.fill();
      ctx.strokeStyle = "#111"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = id.main;
      ctx.fillRect(s * (bl - 0.05), oy - s * bw / 2 - 1, s * 0.05, s * bw + 2);
      if (t.branch === "burn") {
        const fl = 0.08 + 0.04 * Math.sin(performance.now() / 70 + i);
        ctx.fillStyle = "#ffca28";
        ctx.beginPath(); ctx.moveTo(s * bl, oy - s * 0.05); ctx.lineTo(s * (bl + fl + 0.06), oy); ctx.lineTo(s * bl, oy + s * 0.05); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ff3d00";
        ctx.beginPath(); ctx.moveTo(s * bl, oy - s * 0.03); ctx.lineTo(s * (bl + fl), oy); ctx.lineTo(s * bl, oy + s * 0.03); ctx.closePath(); ctx.fill();
      }
    }
    ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = id.main; ctx.fill();
    ctx.strokeStyle = mat.line; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = mat.trim; ctx.fill();
    ctx.restore();
  }

  /** 霜塔：六角符文台 + 悬浮冰晶；Lv↑ 晶簇数增加；冰封=冰块立方，碎冰=尖刺放射 */
  function drawFrostTower(t, s, mat, id) {
    const now = performance.now() / 1000;
    drawLevelTiers(t, s, s * 0.4, mat);
    polyPath(t.x, t.y, s * 0.3, 6, -Math.PI / 6);
    ctx.fillStyle = mat.body; ctx.fill();
    ctx.strokeStyle = id.main; ctx.lineWidth = 2;
    ctx.shadowColor = id.glow + "0.7)"; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
    // 符文点
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillStyle = id.light;
      ctx.beginPath(); ctx.arc(t.x + Math.cos(a) * s * 0.22, t.y + Math.sin(a) * s * 0.22, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    const bob = Math.sin(now * 2.2 + t.c) * s * 0.03;
    // 侧晶簇（等级越高越多）
    const side = t.level - 1;
    for (let i = 0; i < side * 2; i++) {
      const a = now * 0.8 + (i / (side * 2)) * Math.PI * 2;
      const px = t.x + Math.cos(a) * s * 0.2, py = t.y - s * 0.06 + Math.sin(a) * s * 0.1;
      ctx.beginPath(); ctx.moveTo(px, py - s * 0.09); ctx.lineTo(px + s * 0.035, py); ctx.lineTo(px, py + s * 0.04); ctx.lineTo(px - s * 0.035, py); ctx.closePath();
      ctx.fillStyle = id.light; ctx.fill();
    }
    ctx.save();
    ctx.translate(t.x, t.y - s * 0.08 + bob);
    if (t.branch === "freeze") {
      roundRectPath(-s * 0.13, -s * 0.13, s * 0.26, s * 0.26, 3);
      ctx.fillStyle = "rgba(179,229,252,0.85)"; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.08); ctx.lineTo(s * 0.02, -s * 0.02); ctx.stroke();
    } else {
      const h = s * (0.2 + 0.04 * t.level);
      ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(s * 0.1, 0); ctx.lineTo(0, s * 0.12); ctx.lineTo(-s * 0.1, 0); ctx.closePath();
      ctx.fillStyle = mat.name === "metal" ? "#4fc3f7" : id.main; ctx.globalAlpha *= 0.92; ctx.fill(); ctx.globalAlpha = Math.min(1, ctx.globalAlpha / 0.92);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.stroke();
      if (t.branch === "shatter") {
        ctx.strokeStyle = "#e1f5fe"; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + now;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12); ctx.lineTo(Math.cos(a) * s * 0.24, Math.sin(a) * s * 0.24); ctx.stroke();
        }
      }
    }
    ctx.rotate(t.angle);
    ctx.fillStyle = id.light;
    ctx.beginPath(); ctx.moveTo(s * 0.12, 0); ctx.lineTo(s * 0.3, -s * 0.04); ctx.lineTo(s * 0.3, s * 0.04); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function bodyFill(base, flash, slow, kind) {
    if (flash) return "#ffffff";
    if (slow && kind !== "flyer") return "#90caf9";
    return base;
  }

  function drawEnemy(e) {
    const tier = e.visualTier || visualTierFor(e.kind);
    const scale = e.drawScale || (tier === "boss" ? 1.75 : tier === "elite" ? 1.2 : tier === "heavy" ? 1.1 : 1);
    const rad = e.radius * cellSize * scale;
    const now = gameNow;
    const slowed = e.slowMul < 1 || now < e.freezeUntil || now < (state.timeSlowUntil || 0);
    const frozen = now < e.freezeUntil;
    const flash = e.hitFlash && now < e.hitFlash;
    const lift = e.yLift || (tier === "elite" ? 3 : 0);
    const ex = e.x;
    const ey = e.y - lift;

    // Boss 入场红边闪 0.3s
    if (tier === "boss" && e.spawnFlashUntil && now < e.spawnFlashUntil) {
      const a = (e.spawnFlashUntil - now) / 0.3;
      ctx.beginPath();
      ctx.arc(ex, ey, rad + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,40,60,${0.75 * a})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, rad + 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,20,40,${0.2 * a})`;
      ctx.fill();
    }

    drawGroundShadow(ex, ey + (tier === "boss" ? 4 : 0), rad * (tier === "boss" ? 1.15 : 0.95), rad * (tier === "boss" ? 1.0 : 0.8));

    // 精英亮描边光环
    if (tier === "elite" && !flash) {
      ctx.beginPath();
      ctx.arc(ex, ey, rad + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,236,179,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Boss 脚下阴影圈 + 高对比描边
    if (tier === "boss") {
      ctx.beginPath();
      ctx.ellipse(ex, ey + rad * 0.55, rad * 1.15, rad * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(40,0,20,0.35)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex, ey, rad + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180,60,120,0.55)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (frozen) {
      ctx.beginPath();
      ctx.arc(ex, ey, rad + 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(224,247,250,0.35)";
      ctx.fill();
    }

    if (slowed) {
      ctx.beginPath();
      ctx.arc(ex, ey, rad + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(129,212,250,0.22)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex, ey, rad + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(179,229,252,0.65)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(ex, ey);
    if (e.angle != null) ctx.rotate(e.angle);

    // 临时提高饱和：精英用更亮的 fill 覆盖
    const savedColor = e.color;
    const savedDark = e.colorDark;
    if (tier === "elite" && !flash) {
      e.color = saturateHex(e.color, 1.25);
      e.colorDark = saturateHex(e.colorDark || e.color, 1.1);
    } else if (tier === "boss" && !flash) {
      e.color = "#6b4a3a";
      e.colorDark = "#2a1018";
    } else if (tier === "normal" && !flash) {
      // 灰绿 / 原色偏灰
      e.color = muteHex(e.color, 0.85);
    }

    if (e.kind === "fast") drawEnemyFast(e, rad, flash, slowed);
    else if (e.kind === "tank") drawEnemyTank(e, rad, flash, slowed);
    else if (e.kind === "boss") drawEnemyBoss(e, rad, flash, slowed, now);
    else if (e.kind === "shield") drawEnemyShield(e, rad, flash, slowed);
    else if (e.kind === "flyer") drawEnemyFlyer(e, rad, flash, slowed);
    else if (e.kind === "splitter") drawEnemySplitter(e, rad, flash, slowed);
    else if (e.kind === "healer") drawEnemyHealer(e, rad, flash, slowed);
    else if (e.kind === "blinker") drawEnemyBlinker(e, rad, flash, slowed);
    else if (e.kind === "spawn") drawEnemySpawn(e, rad, flash, slowed);
    else drawEnemyNormal(e, rad, flash, slowed);

    // 精英饰品
    if (tier === "elite" && !flash) drawEliteOrnament(e, rad);
    // Boss 冠铠已在 drawEnemyBoss；再加深紫描边强化
    if (tier === "boss") {
      ctx.beginPath();
      ctx.arc(0, 0, rad * 1.02, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200,40,100,0.65)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    e.color = savedColor;
    e.colorDark = savedDark;
    ctx.restore();
    drawEnemyHpBar(e, rad, tier);
  }

  function parseHex(h) {
    const s = (h || "#888888").replace("#", "");
    if (s.length !== 6) return [136, 136, 136];
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  function toHex(r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
  }
  function saturateHex(hex, mul) {
    let [r, g, b] = parseHex(hex);
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * mul;
    g = avg + (g - avg) * mul;
    b = avg + (b - avg) * mul;
    return toHex(r, g, b);
  }
  function muteHex(hex, mul) {
    let [r, g, b] = parseHex(hex);
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * mul;
    g = avg + (g - avg) * mul;
    b = avg + (b - avg) * mul;
    return toHex(r * 0.92, g * 0.92, b * 0.88);
  }

  /** 精英饰品：角盔/翅焰/蛛纹/药瓶/残影 */
  function drawEliteOrnament(e, rad) {
    ctx.save();
    if (e.kind === "shield") {
      // 角盔
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.moveTo(-rad * 0.55, -rad * 0.7);
      ctx.lineTo(-rad * 0.35, -rad * 1.25);
      ctx.lineTo(-rad * 0.15, -rad * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rad * 0.15, -rad * 0.7);
      ctx.lineTo(rad * 0.35, -rad * 1.25);
      ctx.lineTo(rad * 0.55, -rad * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === "flyer") {
      // 翅焰
      const t = gameNow;
      ctx.globalAlpha = 0.55 + Math.sin(t * 10) * 0.2;
      ctx.fillStyle = "#ff8a65";
      ctx.beginPath();
      ctx.moveTo(-rad * 0.2, 0);
      ctx.quadraticCurveTo(-rad * 1.4, -rad * 0.9, -rad * 0.5, rad * 0.2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-rad * 0.2, 0);
      ctx.quadraticCurveTo(-rad * 1.4, rad * 0.9, -rad * 0.5, -rad * 0.2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.kind === "splitter") {
      // 蛛纹
      ctx.strokeStyle = "rgba(255,200,120,0.7)";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * rad * 0.95, Math.sin(a) * rad * 0.95);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.kind === "healer") {
      // 药瓶
      ctx.fillStyle = "#aed581";
      ctx.fillRect(rad * 0.55, -rad * 0.55, rad * 0.28, rad * 0.55);
      ctx.fillStyle = "#fff59d";
      ctx.fillRect(rad * 0.58, -rad * 0.7, rad * 0.22, rad * 0.18);
      ctx.strokeStyle = "#33691e";
      ctx.lineWidth = 1;
      ctx.strokeRect(rad * 0.55, -rad * 0.55, rad * 0.28, rad * 0.55);
    } else if (e.kind === "blinker") {
      // 残影
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#e1bee7";
      ctx.beginPath();
      ctx.arc(-rad * 0.85, 0, rad * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-rad * 1.4, 0, rad * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }



  function zFill(base, flash, slow) {
    if (flash) return "#f5f5f5";
    if (slow) return "#90caf9";
    return base;
  }

  function zShade(ctx, x, y, r, light) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    g.addColorStop(0, light);
    g.addColorStop(0.55, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.28)");
    return g;
  }

  /** 普通尸：分层躯干 + 高光腐烂斑 + 微颤 */
  function drawEnemyNormal(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    const t = gameNow;
    const wob = Math.sin(t * 6 + e.progress * 0.02) * rad * 0.04;
    ctx.translate(0, wob);
    ctx.strokeStyle = flash ? "#eceff1" : (slow ? "#64b5f6" : (e.colorDark || "#33691e"));
    ctx.lineWidth = Math.max(1.5, rad * 0.16);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-rad * 0.5, rad * 0.05);
    ctx.lineTo(-rad * 1.02, rad * 0.42);
    ctx.moveTo(rad * 0.48, rad * 0.12);
    ctx.lineTo(rad * 1.02, rad * 0.48);
    ctx.moveTo(-rad * 0.12, rad * 0.5);
    ctx.lineTo(-rad * 0.32, rad * 0.95);
    ctx.moveTo(rad * 0.18, rad * 0.52);
    ctx.lineTo(rad * 0.38, rad * 0.96);
    ctx.stroke();
    // 外轮廓软光
    ctx.beginPath();
    ctx.ellipse(0, rad * 0.15, rad * 0.95, rad * 0.75, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(80,100,40,0.18)";
    ctx.fill();
    // 躯干异形
    ctx.beginPath();
    ctx.moveTo(-rad * 0.72, rad * 0.55);
    ctx.quadraticCurveTo(-rad * 1.08, 0, -rad * 0.55, -rad * 0.72);
    ctx.quadraticCurveTo(0, -rad * 1.08, rad * 0.52, -rad * 0.68);
    ctx.quadraticCurveTo(rad * 1.05, -0.02 * rad, rad * 0.68, rad * 0.55);
    ctx.quadraticCurveTo(0, rad * 0.9, -rad * 0.72, rad * 0.55);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, 0, 0, rad, "rgba(255,255,255,0.22)");
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#33691e";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    if (!flash) {
      ctx.fillStyle = "rgba(40,55,20,0.4)";
      ctx.beginPath();
      ctx.ellipse(-rad * 0.22, rad * 0.12, rad * 0.24, rad * 0.15, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rad * 0.28, -rad * 0.18, rad * 0.16, rad * 0.11, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // 肋骨高光
      ctx.strokeStyle = "rgba(200,220,160,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-rad * 0.35, rad * 0.05);
      ctx.quadraticCurveTo(0, rad * 0.2, rad * 0.35, rad * 0.05);
      ctx.stroke();
    }
    // 眼窝 + 瞳光
    ctx.fillStyle = flash ? "#333" : "#12180c";
    ctx.beginPath();
    ctx.ellipse(-rad * 0.28, -rad * 0.22, rad * 0.17, rad * 0.21, -0.2, 0, Math.PI * 2);
    ctx.ellipse(rad * 0.3, -rad * 0.2, rad * 0.15, rad * 0.19, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = flash ? "#ffffff" : "#e8ffc8";
    ctx.shadowBlur = flash ? 0 : Math.max(3, rad * 0.45);
    ctx.fillStyle = flash ? "#ffffff" : "#dcedc8";
    ctx.beginPath();
    ctx.arc(-rad * 0.22, -rad * 0.24, rad * 0.055, 0, Math.PI * 2);
    ctx.arc(rad * 0.35, -rad * 0.22, rad * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = flash ? "#555" : "#2a1212";
    ctx.beginPath();
    ctx.ellipse(0, rad * 0.28, rad * 0.3, rad * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // 齿
    ctx.fillStyle = "rgba(220,230,180,0.55)";
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(i * rad * 0.14 - rad * 0.04, rad * 0.18, rad * 0.07, rad * 0.1);
    }
  }

  /** 快跑尸：拖影 + 尖爪 + 眼焰 */
  function drawEnemyFast(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    const t = gameNow;
    if (!flash) {
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.08 * i;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(-rad * (1.2 + i * 0.25), 0);
        ctx.lineTo(-rad * 0.3, -rad * 0.4);
        ctx.lineTo(-rad * 0.3, rad * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.moveTo(rad * 1.15, 0);
    ctx.lineTo(-rad * 0.05, -rad * 0.48);
    ctx.lineTo(-rad * 1.0, 0);
    ctx.lineTo(-rad * 0.05, rad * 0.48);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, rad * 0.2, 0, rad, "rgba(255,255,255,0.25)");
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#558b2f";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 短翼抖动
    const flap = Math.sin(t * 14) * 0.15;
    ctx.fillStyle = flash ? "#fff" : "rgba(160,190,100,0.55)";
    ctx.beginPath();
    ctx.moveTo(-rad * 0.15, -rad * 0.15);
    ctx.quadraticCurveTo(-rad * 0.9, -rad * (0.85 + flap), -rad * 0.35, -rad * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-rad * 0.15, rad * 0.15);
    ctx.quadraticCurveTo(-rad * 0.9, rad * (0.85 + flap), -rad * 0.35, rad * 0.05);
    ctx.closePath();
    ctx.fill();
    // 爪
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rad * 0.25, -rad * 0.22);
    ctx.lineTo(rad * 0.85, -rad * 0.75);
    ctx.moveTo(rad * 0.25, rad * 0.22);
    ctx.lineTo(rad * 0.85, rad * 0.75);
    ctx.stroke();
    ctx.fillStyle = flash ? "#333" : "#1e2a10";
    ctx.beginPath();
    ctx.arc(rad * 0.4, 0, rad * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = "#f0ffe0";
    ctx.shadowBlur = flash ? 0 : Math.max(3, rad * 0.4);
    ctx.fillStyle = "#f0ffe0";
    ctx.beginPath();
    ctx.arc(rad * 0.46, -rad * 0.04, rad * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255,220,120,0.55)";
    ctx.beginPath();
    ctx.arc(rad * 0.5, -rad * 0.05, rad * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 坦克尸：厚甲分层 + 铆钉 + 护肩 */
  function drawEnemyTank(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    const dark = flash ? "#bbb" : (slow ? "#64b5f6" : (e.colorDark || "#4a5a32"));
    // 底盘阴影环
    ctx.beginPath();
    ctx.ellipse(0, rad * 0.15, rad * 1.1, rad * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.08, rad * 0.88, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, 0, -rad * 0.1, rad, "rgba(255,255,255,0.18)");
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    // 护肩板
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * rad * 0.9, 0, rad * 0.38, rad * 0.58, sx * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.strokeStyle = flash ? "#ddd" : "rgba(180,200,140,0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // 铆钉
      ctx.fillStyle = flash ? "#fff" : "#c5d6a0";
      ctx.beginPath();
      ctx.arc(sx * rad * 0.9, -rad * 0.25, rad * 0.07, 0, Math.PI * 2);
      ctx.arc(sx * rad * 0.9, rad * 0.25, rad * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    // 胸甲裂纹
    if (!flash) {
      ctx.strokeStyle = "rgba(30,40,20,0.45)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-rad * 0.2, -rad * 0.3);
      ctx.lineTo(0, rad * 0.1);
      ctx.lineTo(rad * 0.25, -rad * 0.15);
      ctx.stroke();
    }
    ctx.fillStyle = flash ? "#333" : "#12180c";
    ctx.beginPath();
    ctx.ellipse(-rad * 0.28, -rad * 0.18, rad * 0.19, rad * 0.15, 0, 0, Math.PI * 2);
    ctx.ellipse(rad * 0.28, -rad * 0.18, rad * 0.19, rad * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = "#c5e1a5";
    ctx.shadowBlur = flash ? 0 : Math.max(3, rad * 0.35);
    ctx.fillStyle = "#a5d6a7";
    ctx.beginPath();
    ctx.arc(-rad * 0.22, -rad * 0.18, rad * 0.065, 0, Math.PI * 2);
    ctx.arc(rad * 0.34, -rad * 0.18, rad * 0.065, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Boss 尸：脉动光环 + 角冠 + 多层甲 */
  function drawEnemyBoss(e, rad, flash, slow, now) {
    const fill = zFill(e.color, flash, slow);
    const pulse = 1 + Math.sin(now * 3) * 0.06;
    // 多层光环
    for (let i = 3; i >= 1; i--) {
      ctx.beginPath();
      ctx.arc(0, 0, rad * (1.15 + i * 0.12) * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200,220,100,${0.12 * i})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, rad * 1.25 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(140,160,60,0.12)";
    ctx.fill();
    // 不规则巨体
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = rad * (0.88 + ((i * 3) % 5) * 0.04 + (i % 2) * 0.1);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, -rad * 0.15, -rad * 0.2, rad * 1.1, "rgba(255,255,220,0.2)");
    ctx.fill();
    ctx.strokeStyle = "#4a4728";
    ctx.lineWidth = 2.6;
    ctx.stroke();
    // 内甲片
    ctx.strokeStyle = "rgba(180,190,120,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.55, 0.2, Math.PI * 1.4);
    ctx.stroke();
    // 角冠
    const horn = flash ? "#fff" : "#dce775";
    ctx.fillStyle = flash ? "#eee" : "#c5c89a";
    [[-0.45, -0.55, -0.3, -1.25, -0.08], [0.45, -0.55, 0.3, -1.25, 0.08]].forEach(([ax, ay, tipx, tipy, bx]) => {
      ctx.beginPath();
      ctx.moveTo(ax * rad, ay * rad);
      ctx.lineTo(tipx * rad, tipy * rad);
      ctx.lineTo(bx * rad, ay * rad);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = horn;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.08, -rad * 0.7);
    ctx.lineTo(0, -rad * 1.4);
    ctx.lineTo(rad * 0.16, -rad * 0.7);
    ctx.closePath();
    ctx.fill();
    // 三眼
    ctx.fillStyle = flash ? "#333" : "#141208";
    ctx.beginPath();
    ctx.arc(-rad * 0.32, -rad * 0.12, rad * 0.17, 0, Math.PI * 2);
    ctx.arc(rad * 0.32, -rad * 0.12, rad * 0.17, 0, Math.PI * 2);
    ctx.arc(0, rad * 0.18, rad * 0.13, 0, Math.PI * 2);
    ctx.fill();
    const eyePulse = 0.55 + Math.sin(now * 5) * 0.25;
    ctx.save();
    ctx.shadowColor = "#ff8a65";
    ctx.shadowBlur = flash ? 0 : Math.max(4, rad * 0.4);
    ctx.fillStyle = `rgba(255,120,80,${eyePulse})`;
    ctx.beginPath();
    ctx.arc(-rad * 0.26, -rad * 0.14, rad * 0.065, 0, Math.PI * 2);
    ctx.arc(rad * 0.38, -rad * 0.14, rad * 0.065, 0, Math.PI * 2);
    ctx.arc(0.04 * rad, rad * 0.16, rad * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 盾尸：立体破盾 + 徽记 */
  function drawEnemyShield(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 0.72, rad * 0.78, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, -rad * 0.15, -rad * 0.2, rad * 0.7, "rgba(255,255,255,0.18)");
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#3e4634";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 破木盾立体
    ctx.fillStyle = flash ? "#eceff1" : "#6d5c45";
    ctx.beginPath();
    ctx.moveTo(rad * 0.2, -rad * 0.9);
    ctx.lineTo(rad * 1.18, -rad * 0.55);
    ctx.lineTo(rad * 1.25, 0.05 * rad);
    ctx.lineTo(rad * 1.12, rad * 0.58);
    ctx.lineTo(rad * 0.2, rad * 0.9);
    ctx.quadraticCurveTo(rad * 0.55, 0, rad * 0.2, -rad * 0.9);
    ctx.closePath();
    ctx.fill();
    // 盾面高光条
    ctx.fillStyle = flash ? "rgba(255,255,255,0.35)" : "rgba(200,180,140,0.25)";
    ctx.beginPath();
    ctx.moveTo(rad * 0.35, -rad * 0.7);
    ctx.lineTo(rad * 0.55, -rad * 0.55);
    ctx.lineTo(rad * 0.5, rad * 0.55);
    ctx.lineTo(rad * 0.32, rad * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3e3428";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 十字徽
    ctx.strokeStyle = flash ? "#fff" : "#c9a86a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rad * 0.55, -rad * 0.45);
    ctx.lineTo(rad * 0.55, rad * 0.45);
    ctx.moveTo(rad * 0.35, 0);
    ctx.lineTo(rad * 1.05, 0);
    ctx.stroke();
    // 裂痕
    ctx.strokeStyle = "rgba(30,20,10,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rad * 0.7, -rad * 0.2);
    ctx.lineTo(rad * 0.95, rad * 0.35);
    ctx.stroke();
    ctx.fillStyle = flash ? "#333" : "#12180c";
    ctx.beginPath();
    ctx.arc(-rad * 0.18, -rad * 0.12, rad * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c5e1a5";
    ctx.beginPath();
    ctx.arc(-rad * 0.14, -rad * 0.14, rad * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 飞影：半透明翼骨 + 飘带 */
  function drawEnemyFlyer(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    const t = gameNow;
    const bob = Math.sin(t * 5 + e.progress * 0.03) * rad * 0.08;
    ctx.translate(0, bob);
    ctx.globalAlpha = 0.9;
    // 翼骨
    const flap = Math.sin(t * 8) * 0.2;
    ctx.fillStyle = flash ? "#fff" : "rgba(176,191,136,0.45)";
    ctx.beginPath();
    ctx.moveTo(-rad * 0.1, -rad * 0.1);
    ctx.quadraticCurveTo(-rad * 1.25, -rad * (1.0 + flap), -rad * 0.4, 0);
    ctx.quadraticCurveTo(-rad * 0.7, -rad * 0.35, -rad * 0.1, -rad * 0.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-rad * 0.1, rad * 0.1);
    ctx.quadraticCurveTo(-rad * 1.25, rad * (1.0 + flap), -rad * 0.4, 0);
    ctx.quadraticCurveTo(-rad * 0.7, rad * 0.35, -rad * 0.1, rad * 0.1);
    ctx.fill();
    // 骨线
    ctx.strokeStyle = "rgba(220,230,180,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.15, 0);
    ctx.lineTo(-rad * 1.05, -rad * (0.7 + flap * 0.5));
    ctx.moveTo(-rad * 0.15, 0);
    ctx.lineTo(-rad * 1.05, rad * (0.7 + flap * 0.5));
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.2, rad * 0.52, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, rad * 0.2, -rad * 0.1, rad, "rgba(255,255,255,0.2)");
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#5a6b3a";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rad * 0.55, 0, rad * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = flash ? "#333" : "#1e2a10";
    ctx.beginPath();
    ctx.arc(rad * 0.65, -rad * 0.05, rad * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8f5d0";
    ctx.beginPath();
    ctx.arc(rad * 0.7, -rad * 0.08, rad * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(200,220,140,0.5)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.4, rad * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** 分裂蛛：多足 + 腹部分裂纹 + 卵囊光 */
  function drawEnemySplitter(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    const t = gameNow;
    // 足
    ctx.strokeStyle = flash ? "#ddd" : (e.colorDark || "#6b3e22");
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const ang = -0.7 + i * 0.45;
      const kick = Math.sin(t * 10 + i) * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        Math.cos(ang) * rad * 0.7,
        Math.sin(ang) * rad * (0.9 + kick),
        Math.cos(ang + 0.3) * rad * 1.25,
        Math.sin(ang) * rad * (1.15 + kick)
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        Math.cos(-ang) * rad * 0.7,
        Math.sin(-ang) * rad * (0.9 + kick),
        Math.cos(-ang - 0.3) * rad * 1.25,
        Math.sin(-ang) * rad * (1.15 + kick)
      );
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(rad * 0.95, 0);
    ctx.lineTo(rad * 0.25, -rad * 0.88);
    ctx.lineTo(-rad * 0.55, -rad * 0.52);
    ctx.lineTo(-rad * 0.75, rad * 0.35);
    ctx.lineTo(rad * 0.18, rad * 0.85);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, rad * 0.1, -rad * 0.15, rad, "rgba(255,220,180,0.22)");
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#6b3e22";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // 分裂纹发光
    const pulse = 0.4 + Math.sin(t * 4) * 0.25;
    ctx.strokeStyle = `rgba(255,160,80,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.15, -rad * 0.25);
    ctx.lineTo(rad * 0.05, rad * 0.1);
    ctx.lineTo(rad * 0.2, rad * 0.4);
    ctx.stroke();
    ctx.fillStyle = flash ? "#333" : "#3e2723";
    ctx.beginPath();
    ctx.arc(rad * 0.4, -rad * 0.18, rad * 0.13, 0, Math.PI * 2);
    ctx.arc(rad * 0.15, -rad * 0.35, rad * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc80";
    ctx.beginPath();
    ctx.arc(rad * 0.44, -rad * 0.2, rad * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 治疗虫：十字辉光 + 脉动环 */
  function drawEnemyHealer(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    const t = gameNow;
    const pulse = 1 + Math.sin(t * 3.5) * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, rad * 1.15 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(174,213,129,${0.25 + Math.sin(t * 3) * 0.1})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, -rad * 0.2, -rad * 0.25, rad, "rgba(255,255,255,0.28)");
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#33691e";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // 发光十字
    const cross = flash ? "#fff" : "#dcedc8";
    ctx.fillStyle = cross;
    ctx.shadowColor = "rgba(174,213,129,0.6)";
    ctx.shadowBlur = 6;
    ctx.fillRect(-rad * 0.13, -rad * 0.5, rad * 0.26, rad * 1.0);
    ctx.fillRect(-rad * 0.45, -rad * 0.13, rad * 0.9, rad * 0.26);
    ctx.shadowBlur = 0;
    // 小触角
    ctx.strokeStyle = fill;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.25, -rad * 0.7);
    ctx.quadraticCurveTo(-rad * 0.4, -rad * 1.0, -rad * 0.15, -rad * 1.05);
    ctx.moveTo(rad * 0.25, -rad * 0.7);
    ctx.quadraticCurveTo(rad * 0.4, -rad * 1.0, rad * 0.15, -rad * 1.05);
    ctx.stroke();
  }

  /** 闪现贼：残影虚线 + 紫晶眼 */
  function drawEnemyBlinker(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    const t = gameNow;
    // 残影
    if (!flash) {
      for (let i = 2; i >= 1; i--) {
        ctx.globalAlpha = 0.15 * i;
        ctx.beginPath();
        ctx.ellipse(-rad * 0.55 * i, 0, rad * 0.7, rad * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.globalAlpha = 0.92;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 0.95, rad * 0.58, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, rad * 0.15, -rad * 0.1, rad, "rgba(255,200,255,0.25)");
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#6a1b9a";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // 紫晶眼
    ctx.fillStyle = flash ? "#fff" : "#f3e5f5";
    ctx.beginPath();
    ctx.arc(rad * 0.38, -rad * 0.06, rad * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ce93d8";
    ctx.beginPath();
    ctx.arc(rad * 0.42, -rad * 0.08, rad * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a148c";
    ctx.beginPath();
    ctx.arc(rad * 0.45, -rad * 0.09, rad * 0.035, 0, Math.PI * 2);
    ctx.fill();
    // 闪现轨迹
    const dashPulse = 0.4 + Math.sin(t * 8) * 0.3;
    ctx.strokeStyle = `rgba(206,147,216,${dashPulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(-rad * 1.35, 0);
    ctx.lineTo(-rad * 0.55, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  function drawEnemySpawn(e, rad, flash, slow) {
    const fill = zFill(e.color, flash, slow);
    const t = gameNow;
    const wob = Math.sin(t * 10) * 0.05;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * (0.9 + wob), rad * (0.75 - wob), 0.2, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = zShade(ctx, -rad * 0.2, -rad * 0.2, rad, "rgba(255,255,255,0.2)");
    ctx.fill();
    ctx.strokeStyle = e.colorDark || "#8d6e4a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = flash ? "#333" : "#4e342e";
    ctx.beginPath();
    ctx.arc(-rad * 0.2, -rad * 0.1, rad * 0.1, 0, Math.PI * 2);
    ctx.arc(rad * 0.25, -rad * 0.08, rad * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

    function drawEnemyHpBar(e, rad, tier) {
    tier = tier || e.visualTier || visualTierFor(e.kind);
    const lift = e.yLift || (tier === "elite" ? 3 : 0);
    const bw = Math.max(rad * 2.4, 16);
    const bh = tier === "boss" ? 7 : tier === "elite" ? 5 : 4;
    const bx = e.x - bw / 2;
    const by = e.y - lift - rad - (tier === "boss" ? 16 : 10);
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
    if (tier === "boss") {
      ctx.strokeStyle = "rgba(200,80,140,0.75)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
    } else if (tier === "elite") {
      ctx.strokeStyle = "rgba(255,224,130,0.45)";
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
    try {
      if (!state.paused && state.phase !== "menu" && !state.ended) {
        const simDt = dt * (state.speed || 1);
        gameNow += simDt;
        update(simDt, gameNow);
      }
      draw();
    } catch (err) {
      cancelDrag();
      console.error("[路卫] frame error", err);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
  }
  requestAnimationFrame(() => requestAnimationFrame(resize));
  const save0 = loadSave();
  menuDiff = save0.lastDiff;
  menuMap = save0.lastMap | 0;
  setupLevel(save0.lastLevel || 1, menuDiff, { mapIndex: menuMap });
  resize();
  updateHUD();
  showStartMenu();
  requestAnimationFrame(frame);

  window.__COINPATH__ = {
    state,
    TOWER_DEFS,
    DIFFICULTIES,
    get PATH_CELLS() { return PATH_CELLS; },
    startWave,
    resetGame,
    beginLevelRun,
    showStartMenu,
    canPlace,
    towerStats,
    upgradeCost,
    wavePlan,
    baseWavePlan,
    mapStage,
    hashSeed,
    buildPathForLevel,
    TOTAL_LEVELS,
    WAVES_PER_LEVEL,
    restBeforeWave,
    setGameSpeed,
    awardSpeedClearBonus,
    setPaused,
    togglePause,
    returnToDifficultySelect,
    sceneSkinFor,
    SCENE_SKINS,
    get menuMap() { return menuMap; },
  };
})();
