# 路卫视觉补丁说明（合并参考）

## 改了什么（仅 Canvas 绘制）
- `drawTower` → 分型：`drawArrowTower` / `drawCannonTower` / `drawFrostTower`
- 升级标识：`drawTowerLevelMarks`（旗/铆钉/冰晶，替代纯 ★ 文字）
- `drawEnemy` → `drawEnemyNormal|Fast|Tank|Boss|Shield|Flyer` + `drawEnemyHpBar`
- `drawGate`、`drawProjectile` 精修；草地轻微点纹理
- 辅助：`roundRectPath`（无 radialGradient，性能友好）

## 未改
- `TOWER_DEFS` 数值（cost/range/rate/damage/splash/slow…）
- `TOTAL_WAVES`（保持协调方 30 波）、`wavePlan`、`START_*`、`SELL_RATIO`、`BASE_*`
- 碰撞 / 射击 / 升级费用公式 / 中文 UI 文案

## 前后对比（文字）
| 对象 | 前 | 后 |
|------|----|----|
| 箭塔 | 色圆+短线 | 石木八角座+旋转箭杆/镞/羽+旗标 |
| 炮塔 | 色圆+方炮管 | 金属方座+铆钉+炮口高光 |
| 霜塔 | 色圆+三角 | 六边冰座+棱柱+冷辉光+雪花点 |
| normal | 色圆/头盔条 | 史莱姆椭圆+触角+眼睛 |
| fast | 菱形 | 尖头+短翼+尾拖影 |
| tank | 六边形 | 圆角厚甲+护肩+观察缝 |
| boss | 圆+冠 | 多层描边+三角角冠+脉动光环+红瞳 |
| shield/flyer | 保留增强 | 厚盾徽记 / 翼骨飞影 |

## 已知问题
- 极小 cellSize 时细节可能糊成一团（竖屏手机正常）
- Boss 脉动仅用 sin 描边，无粒子爆发
