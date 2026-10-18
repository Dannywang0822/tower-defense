# 路卫视觉补丁说明（v7）

## 改了什么（仅视觉）
### CSS / HUD
- 页面氛围：径向暗角背景、面板玻璃感与内高光边
- HUD：生命/金币/波次做成胶囊色块，信息层级更清晰
- 建造栏：三塔用各自主题色描边/选中光晕（绿/橙/青）
- 波次按钮、结束卡、toast 阴影与渐变加强
- **保留** `100dvh` 手机一屏适配与短屏压缩规则

### Canvas
- 地图：底色渐变、草地微点、路径外发光 + 石板分层 + 虚线指引
- 入口/出口：脉动光环
- 塔：地面投影、主题色外环、箭/炮/霜高光与微光效
- 怪：地面投影；快跑拖影加长；Boss 外圈软光；减速光环更明显
- 子弹：短拖尾；选中塔脉动金环 + 射程柔光
- 轻 vignette；水印更淡

## 未改（数值核对）
- `TOWER_DEFS` 全部 cost / range / rate / damage / splash / splashRatio / slow / slowDur
- `TOTAL_WAVES=30`、`START_LIVES=20`、`START_GOLD=120`、`SELL_RATIO`、`BASE_*`
- `wavePlan`、升级费用公式、碰撞与射击逻辑、中文文案逻辑

## 缓存
`index.html` → `styles.css?v=7` / `game.js?v=7`
