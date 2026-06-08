import Phaser from "phaser";
import {
  COLS,
  ROWS,
  RED_BASE,
  BLUE_BASE,
  PALACE_COL_MIN,
  PALACE_COL_MAX,
  CENTER_COL,
  BLUE_PALACE_ROW_MIN,
  BLUE_PALACE_ROW_MAX,
  RED_PALACE_ROW_MIN,
  RED_PALACE_ROW_MAX,
  RED_DEPLOY_MIN_ROW,
  RED_DEPLOY_MAX_ROW,
  BLUE_SPAWN_MIN_ROW,
  BLUE_SPAWN_MAX_ROW,
  PLAY_COL_MIN,
  PLAY_COL_MAX,
  DEPLOY_COL_MIN,
  DEPLOY_COL_MAX,
  isBorderWall,
  isDeployColumn,
  isInnerColumn,
  isBaseCell,
  isRiverRow,
  isBaseWallPosition,
  canAttackEnemyBase,
  getBaseWallCells,
  BASE_WALL_MAX_HP,
  RIVER_ROWS,
} from "../config/board";
import {
  UNIT_CONFIGS,
  DECK_IDS,
  getRedBaseMaxHp,
  getBlueBaseMaxHp,
  getEmptyFortDurationMs,
  getCloudArrowBlueWave2ClearDelayMs,
  BASE_HP_LEVEL_1,
  MAX_ENERGY,
  ENERGY_REGEN,
  CLOUD_ARROW_SUMMON,
  CLOUD_ARROW_QUOTE,
  CLOUD_ARROW_QUOTE_DURATION_MS,
  CLOUD_ARROW_SUMMON_DELAY_MS,
  CLOUD_ARROW_BLUE_WAVE1,
  CLOUD_ARROW_BLUE_WAVE2,
  EMPTY_FORT_QUOTE,
  BLUE_BASE_LOW_HP_TRIGGER_RATIO,
  LEVEL_2_ENEMY_EMPTY_FORT_WAVE,
  BURN_BOATS_QUOTE,
  BURN_BOATS_ATTACK_MULTIPLIER,
  BURN_BOATS_ENEMY_MULTIPLIER,
  BURN_BOATS_DURATION_SEC,
  BURN_BOATS_COOLDOWN_SEC,
  GENERAL_MISS_STREAK_TRIGGER,
  GENERAL_MISS_SUMMON_UNIT,
  GENERAL_MISS_SUMMON_COUNT,
} from "../config/units";
import type { Side, UnitState, BaseWallState } from "../types";
import { VictoryModal } from "../ui/victoryModal";
import { playBurnBoatsSfx, playCloudArrowSfx } from "../audio/sfx";
import { isUnitUnlocked } from "../services/fragmentService";
import { loadGeneral } from "../services/generalService";
import { resetProgressToLevel1 } from "../services/saveService";
import { bindSafeClick, deferInputAction, resetInputState } from "../utils/safeInput";

const CELL = 44;
const BOARD_X = 12;
const BOARD_Y = 16;
const HUD_Y = BOARD_Y + ROWS * CELL + 14;
const HUD_DEPTH = 200;
const BOARD_DEPTH = 10;
const SKILL_BTN_W = 60;
const SKILL_BTN_H = 68;
const SKILL_BTN_GAP = 8;
/** 技能按钮中心 Y 相对 HUD_Y；进度条在按钮中心下方该偏移处 */
const SKILL_BTN_CENTER_OFFSET_Y = 34;
const SKILL_COOLDOWN_BAR_OFFSET_Y = 24;
const SKILL_COOLDOWN_BAR_H = 6;
const SKILL_COOLDOWN_BAR_W = 52;

const COLORS = {
  red: 0xe53935,
  blue: 0x1e88e5,
  wall: 0x888888,
  grid: 0x444444,
  deploy: 0x4caf50,
};

export class GameScene extends Phaser.Scene {
  private units: UnitState[] = [];
  private unitSprites = new Map<string, Phaser.GameObjects.Container>();
  private nextUnitId = 1;

  private currentLevel = 1;
  private redBaseMaxHp = BASE_HP_LEVEL_1;
  private blueBaseMaxHp = BASE_HP_LEVEL_1;

  private redEnergy = MAX_ENERGY;
  private blueEnergy = MAX_ENERGY;
  private redBaseHp = BASE_HP_LEVEL_1;
  private blueBaseHp = BASE_HP_LEVEL_1;

  private draggingUnitId: string | null = null;
  private dragGhost: Phaser.GameObjects.Text | null = null;
  private dragHoverRect: Phaser.GameObjects.Rectangle | null = null;
  private deployHighlights: Phaser.GameObjects.Rectangle[] = [];
  private cloudArrowReady = true;
  private burnBoatsCooldownSec = 0;
  private burnBoatsActiveSec = 0;
  private cloudArrowQuoteContainer: Phaser.GameObjects.Container | null = null;
  private cloudArrowBlueShieldIds = new Set<string>();
  private cloudArrowBlueWave1Complete = false;
  private cloudArrowBlueWave2Spawned = false;
  private emptyFortActive = false;
  private emptyFortQuoteContainer: Phaser.GameObjects.Container | null = null;
  private emptyFortSafetyTimer: Phaser.Time.TimerEvent | null = null;
  private cloudArrowBlueWave2UnitIds = new Set<string>();
  private cloudArrowBlueWave2ClearTimer: Phaser.Time.TimerEvent | null = null;
  private enemyEmptyFortTriggered = false;
  private generalMissStreak = new Map<string, number>();
  private skillCooldownGfx!: Phaser.GameObjects.Graphics;
  private skillBtnBg!: Phaser.GameObjects.Rectangle;
  private skillLabel!: Phaser.GameObjects.Text;
  private skillHit!: Phaser.GameObjects.Rectangle;
  private generalSkillId: string | null = null;
  private generalSkillCooldownSec = 0;
  private generalSkillCooldownGfx: Phaser.GameObjects.Graphics | null = null;
  private generalSkillBtnBg: Phaser.GameObjects.Rectangle | null = null;
  private generalSkillLabel: Phaser.GameObjects.Text | null = null;
  private generalSkillHit: Phaser.GameObjects.Rectangle | null = null;
  private boardZone!: Phaser.GameObjects.Zone;

  private energyText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Graphics;
  private cardContainers: Phaser.GameObjects.Container[] = [];
  private nextCardText!: Phaser.GameObjects.Text;
  private dialogueBubble!: Phaser.GameObjects.Container;
  private resultText!: Phaser.GameObjects.Text;
  private victoryModal: VictoryModal | null = null;

  private baseWalls: BaseWallState[] = [];
  private baseWallSprites = new Map<string, Phaser.GameObjects.Container>();
  private redBaseContainer!: Phaser.GameObjects.Container;
  private blueBaseContainer!: Phaser.GameObjects.Container;
  private nextWallId = 1;

  private aiTimer = 0;
  private tutorialShown = false;
  private gameOver = false;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data?: { level?: number }): void {
    this.currentLevel = Math.max(1, data?.level ?? 1);
    this.redBaseMaxHp = getRedBaseMaxHp(this.currentLevel);
    this.blueBaseMaxHp = getBlueBaseMaxHp(this.currentLevel);
    this.resetRoundState();
  }

  shutdown(): void {
    this.cancelDragDeploy();
    this.clearEmptyFortSafetyTimer();
    this.clearCloudArrowBlueWave2Timer();
    this.hideCloudArrowQuote();
    this.hideEmptyFortQuote();
    this.victoryModal?.destroy();
    this.victoryModal = null;
    this.cardContainers = [];
    resetInputState(this);
  }

  create(): void {
    this.input.setTopOnly(true);

    this.drawBoard();
    this.createBaseWalls();
    this.createBases();
    this.createBoardInputZone();
    this.createHUD();
    this.createDialogue();
    this.createResultOverlay();
    this.spawnDeployedGeneral();

    this.dialogueBubble.setDepth(HUD_DEPTH - 1);

    this.time.delayedCall(1500, () => {
      if (!this.tutorialShown) {
        this.showDialogue("快看，敌方的小兵要冲过来了。");
        this.tutorialShown = true;
        this.spawnUnit("blue", "bing", PLAY_COL_MAX, BLUE_SPAWN_MIN_ROW);
      }
    });

    this.time.delayedCall(8000, () => this.hideDialogue());
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = delta / 1000;

    this.redEnergy = Math.min(MAX_ENERGY, this.redEnergy + ENERGY_REGEN * dt);
    this.blueEnergy = Math.min(MAX_ENERGY, this.blueEnergy + ENERGY_REGEN * dt);
    if (this.currentLevel === 2) {
      if (this.burnBoatsActiveSec > 0) {
        this.burnBoatsActiveSec = Math.max(0, this.burnBoatsActiveSec - dt);
      }
      if (this.burnBoatsCooldownSec > 0) {
        this.burnBoatsCooldownSec = Math.max(0, this.burnBoatsCooldownSec - dt);
      }
    }
    if (this.generalSkillId && this.generalSkillCooldownSec > 0) {
      this.generalSkillCooldownSec = Math.max(0, this.generalSkillCooldownSec - dt);
    }

    this.updateEnergyUI();
    this.updateCardUI();
    this.updateSkillCooldownUI();

    if (!this.emptyFortActive) {
      this.updateUnits(dt);
      this.updateAI(dt);
    }
    this.checkWinLose();
  }

  // ─── Board ───────────────────────────────────────────────

  private drawBoard(): void {
    const g = this.add.graphics();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = BOARD_X + c * CELL;
        const y = BOARD_Y + r * CELL;

        if (isBorderWall(c, r) && !isBaseWallPosition(c, r)) {
          this.add
            .text(x + CELL / 2, y + CELL / 2, "墙", {
              fontSize: "18px",
              color: "#888888",
              fontFamily: "Noto Sans SC, sans-serif",
            })
            .setOrigin(0.5)
            .setDepth(BOARD_DEPTH);
          continue;
        }

        if (!isRiverRow(r)) {
          g.fillStyle(0x2a2a2a, 1);
          g.fillRect(x, y, CELL, CELL);
          g.lineStyle(1, COLORS.grid, 0.6);
          g.strokeRect(x, y, CELL, CELL);
        }
      }
    }

    const riverTop = BOARD_Y + RIVER_ROWS[0] * CELL;
    const riverH = RIVER_ROWS.length * CELL;
    const riverLeft = BOARD_X + DEPLOY_COL_MIN * CELL;
    const riverW = CELL * (DEPLOY_COL_MAX - DEPLOY_COL_MIN + 1);

    // 楚河汉界：统一深蓝灰
    const riverFill = 0x2a3848;
    const riverGrid = 0x3d4f62;
    g.fillStyle(riverFill, 1);
    g.fillRect(riverLeft, riverTop, riverW, riverH);

    for (const r of RIVER_ROWS) {
      for (let c = DEPLOY_COL_MIN; c <= DEPLOY_COL_MAX; c++) {
        const x = BOARD_X + c * CELL;
        const y = BOARD_Y + r * CELL;
        g.lineStyle(1, riverGrid, 0.55);
        g.strokeRect(x, y, CELL, CELL);
      }
    }

    const riverMidY = BOARD_Y + (RIVER_ROWS[0] + RIVER_ROWS.length / 2) * CELL;
    const playLeft = BOARD_X + PLAY_COL_MIN * CELL;
    const playW = CELL * (PLAY_COL_MAX - PLAY_COL_MIN + 1);

    this.add
      .text(playLeft + CELL * 0.55, riverMidY, "楚河", {
        fontSize: "18px",
        color: "#8fa3b8",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(playLeft + playW - CELL * 0.55, riverMidY, "汉界", {
        fontSize: "18px",
        color: "#8fa3b8",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.drawPalaceLines(PALACE_COL_MIN, BLUE_PALACE_ROW_MIN, PALACE_COL_MAX, BLUE_PALACE_ROW_MAX);
    this.drawPalaceLines(PALACE_COL_MIN, RED_PALACE_ROW_MIN, PALACE_COL_MAX, RED_PALACE_ROW_MAX);
  }

  /** 宫殿 U 形示意线（与围墙布局一致，不再画斜线九宫） */
  private drawPalaceLines(c0: number, r0: number, c1: number, r1: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x555555, 0.45);
    const x0 = BOARD_X + c0 * CELL;
    const y0 = BOARD_Y + r0 * CELL;
    const x1 = BOARD_X + (c1 + 1) * CELL;
    const y1 = BOARD_Y + (r1 + 1) * CELL;
    const gateX = BOARD_X + CENTER_COL * CELL + CELL / 2;

    g.lineBetween(x0, y0, x1, y0);
    g.lineBetween(x0, y0, x0, y1);
    g.lineBetween(x1, y0, x1, y1);
    g.lineBetween(x0, y1, gateX - CELL / 2, y1);
    g.lineBetween(gateX + CELL / 2, y1, x1, y1);
  }

  private createBaseWalls(): void {
    (["red", "blue"] as Side[]).forEach((side) => {
      getBaseWallCells(side).forEach(({ col, row }) => {
        const wall: BaseWallState = {
          id: `w${this.nextWallId++}`,
          side,
          col,
          row,
          hp: BASE_WALL_MAX_HP,
          maxHp: BASE_WALL_MAX_HP,
        };
        this.baseWalls.push(wall);
        this.createBaseWallSprite(wall);
      });
    });
  }

  private createBaseWallSprite(wall: BaseWallState): void {
    const color = wall.side === "red" ? "#e53935" : "#1e88e5";
    const x = BOARD_X + wall.col * CELL + CELL / 2;
    const y = BOARD_Y + wall.row * CELL + CELL / 2;

    const container = this.add.container(x, y).setDepth(BOARD_DEPTH + 5);

    const charText = this.add
      .text(0, -4, "墙", {
        fontSize: "17px",
        color,
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const barW = 24;
    const hpBarBg = this.add.rectangle(0, 12, barW, 3, 0x333333);
    const hpBar = this.add
      .rectangle(-barW / 2, 12, barW, 3, wall.side === "red" ? 0xe53935 : 0x1e88e5)
      .setOrigin(0, 0.5);

    container.add([charText, hpBarBg, hpBar]);
    container.setData("hpBar", hpBar);
    container.setData("barW", barW);
    container.setData("maxHp", wall.maxHp);

    this.baseWallSprites.set(wall.id, container);
  }

  private updateBaseWallHpBar(wall: BaseWallState): void {
    const sprite = this.baseWallSprites.get(wall.id);
    if (!sprite) return;
    const hpBar = sprite.getData("hpBar") as Phaser.GameObjects.Rectangle;
    const ratio = Math.max(0, wall.hp / wall.maxHp);
    const barW = sprite.getData("barW") as number ?? 24;
    hpBar.width = barW * ratio;
  }

  private destroyBaseWall(wall: BaseWallState): void {
    const sprite = this.baseWallSprites.get(wall.id);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 0.6,
        duration: 250,
        onComplete: () => sprite.destroy(),
      });
    }
    this.baseWallSprites.delete(wall.id);
    wall.hp = 0;

    const x = BOARD_X + wall.col * CELL;
    const y = BOARD_Y + wall.row * CELL;
    const rubble = this.add
      .text(x + CELL / 2, y + CELL / 2, "×", {
        fontSize: "14px",
        color: "#555",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(BOARD_DEPTH);
    this.tweens.add({ targets: rubble, alpha: 0.3, duration: 800 });
  }

  private getAliveBaseWallAt(col: number, row: number): BaseWallState | undefined {
    return this.baseWalls.find((w) => w.hp > 0 && w.col === col && w.row === row);
  }

  private isCellBlocked(col: number, row: number): boolean {
    if (isBorderWall(col, row) || isBaseCell(col, row)) return true;
    if (!isInnerColumn(col)) return true;
    return !!this.getAliveBaseWallAt(col, row);
  }

  private getEnemyBaseWallInRange(unit: UnitState, range: number): BaseWallState | undefined {
    let nearest: BaseWallState | undefined;
    let minDist = Infinity;
    for (const wall of this.baseWalls) {
      if (wall.hp <= 0 || wall.side === unit.side) continue;
      const d = this.manhattan(unit, wall.col, wall.row);
      if (d <= range && d < minDist) {
        minDist = d;
        nearest = wall;
      }
    }
    return nearest;
  }

  private createBases(): void {
    this.redBaseContainer = this.createBaseWithHpBar(RED_BASE, "#e53935", 0xe53935);
    this.blueBaseContainer = this.createBaseWithHpBar(BLUE_BASE, "#1e88e5", 0x1e88e5);
    this.updateBaseHpBars();
  }

  private createBaseWithHpBar(
    base: { col: number; row: number },
    textColor: string,
    barColor: number
  ): Phaser.GameObjects.Container {
    const x = BOARD_X + base.col * CELL + CELL / 2;
    const y = BOARD_Y + base.row * CELL + CELL / 2;
    const container = this.add.container(x, y).setDepth(BOARD_DEPTH + 6);

    const label = this.add
      .text(0, -6, "大本营", {
        fontSize: "18px",
        color: textColor,
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const barW = 40;
    const hpBarBg = this.add.rectangle(0, 14, barW, 5, 0x333333);
    const hpBar = this.add.rectangle(-barW / 2, 14, barW, 5, barColor).setOrigin(0, 0.5);

    container.add([label, hpBarBg, hpBar]);
    container.setData("hpBar", hpBar);
    container.setData("barW", barW);
    return container;
  }

  private updateBaseHpBars(): void {
    this.setBaseHpBarWidth(this.redBaseContainer, this.redBaseHp, this.redBaseMaxHp);
    this.setBaseHpBarWidth(this.blueBaseContainer, this.blueBaseHp, this.blueBaseMaxHp);
    this.checkEnemyEmptyFort();
  }

  /** 第二关：敌方大本营血量低于 50% 时触发空城增援（与穿云箭空城之计同款流程，一场仅一次） */
  private checkEnemyEmptyFort(): void {
    if (
      this.enemyEmptyFortTriggered ||
      this.cloudArrowBlueWave2Spawned ||
      this.gameOver ||
      this.emptyFortActive ||
      this.currentLevel !== 2 ||
      this.blueBaseHp <= 0
    ) {
      return;
    }
    if (this.blueBaseHp / this.blueBaseMaxHp >= BLUE_BASE_LOW_HP_TRIGGER_RATIO) return;

    this.enemyEmptyFortTriggered = true;
    this.cloudArrowBlueWave2Spawned = true;
    this.clearCloudArrowBlueWave2Timer();
    this.beginEmptyFortReinforcement(
      EMPTY_FORT_QUOTE,
      LEVEL_2_ENEMY_EMPTY_FORT_WAVE,
      this.cloudArrowBlueWave2UnitIds,
      () => this.scheduleClearCloudArrowBlueWave2()
    );
  }

  private setBaseHpBarWidth(
    container: Phaser.GameObjects.Container,
    hp: number,
    maxHp: number
  ): void {
    const hpBar = container.getData("hpBar") as Phaser.GameObjects.Rectangle;
    const barW = container.getData("barW") as number;
    const ratio = Math.max(0, hp / maxHp);
    hpBar.width = barW * ratio;
  }

  private createBoardInputZone(): void {
    this.boardZone = this.add
      .zone(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL)
      .setOrigin(0)
      .setDepth(BOARD_DEPTH + 4);
  }

  // ─── HUD ─────────────────────────────────────────────────

  private createHUD(): void {
    this.cardContainers = [];

    this.add
      .text(BOARD_X + COLS * CELL - 4, BOARD_Y - 6, `第 ${this.currentLevel} 关`, {
        fontSize: "13px",
        color: "#ccc",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(1, 1)
      .setDepth(HUD_DEPTH + 1);

    const skillX = BOARD_X;
    const skillY = HUD_Y;
    const useBurnBoats = this.currentLevel === 2;
    const skillColor = useBurnBoats ? 0xe53935 : 0xff9800;
    const skillTextColor = useBurnBoats ? "#e53935" : "#ff9800";

    this.skillBtnBg = this.add
      .rectangle(skillX + 30, skillY + 34, 60, 68, 0x333333)
      .setStrokeStyle(2, skillColor)
      .setDepth(HUD_DEPTH);

    this.skillLabel = this.add
      .text(skillX + 30, skillY + 22, useBurnBoats ? "破釜沉舟" : "穿云箭", {
        fontSize: useBurnBoats ? "11px" : "13px",
        color: skillTextColor,
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH + 1);

    this.skillCooldownGfx = this.add.graphics().setDepth(HUD_DEPTH + 2);

    this.skillHit = this.add
      .rectangle(skillX + 30, skillY + 34, 60, 68, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(HUD_DEPTH + 3);

    bindSafeClick(
      this.skillHit,
      this,
      () => {
        if (this.currentLevel === 2) this.fireBurnBoats();
        else this.fireCloudArrow();
      },
      { hoverPoll: true }
    );

    this.createGeneralSkillButton(skillX, skillY);

    // 手牌
    const cardStartX = BOARD_X + 72;
    DECK_IDS.forEach((id, i) => {
      const cfg = UNIT_CONFIGS[id];
      const cx = cardStartX + i * 76;
      const card = this.createCard(cx, HUD_Y + 4, id, cfg.char, cfg.cost, cfg.icon);
      this.cardContainers.push(card);
    });

    // 下一张
    this.nextCardText = this.add.text(BOARD_X + 72, HUD_Y + 92, "下一张: 兵", {
      fontSize: "12px",
      color: "#888",
      fontFamily: "Noto Sans SC, sans-serif",
    }).setDepth(HUD_DEPTH + 1);

    // 能量条
    this.energyBar = this.add.graphics();
    this.energyText = this.add
      .text(BOARD_X + COLS * CELL / 2, HUD_Y + 108, `${Math.floor(this.redEnergy)}/${MAX_ENERGY}`, {
        fontSize: "14px",
        color: "#fff",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH + 1);

    this.energyBar.setDepth(HUD_DEPTH);

    this.updateEnergyUI();
    this.updateCardUI();
    this.updateSkillCooldownUI();
  }

  /** 左下：将领主动技（无将领则不显示） */
  private createGeneralSkillButton(skillX: number, skillY: number): void {
    const generalId = loadGeneral();
    if (!generalId || !isUnitUnlocked(generalId)) return;

    const cfg = UNIT_CONFIGS[generalId];
    const skill = cfg?.activeSkill;
    if (!cfg || !skill?.implemented) return;

    this.generalSkillId = generalId;
    const btnX = skillX + 30;
    // 第三格：穿云箭下方第二格（与截图底部红框对齐）
    const btnY = skillY + SKILL_BTN_CENTER_OFFSET_Y + (SKILL_BTN_H + SKILL_BTN_GAP) * 2;

    this.generalSkillBtnBg = this.add
      .rectangle(btnX, btnY, SKILL_BTN_W, SKILL_BTN_H, 0x333333)
      .setStrokeStyle(2, 0xe53935)
      .setDepth(HUD_DEPTH);

    const label =
      skill.name.length > 3 ? skill.name : `${skill.skillIcon ?? ""}${skill.name}`;
    this.generalSkillLabel = this.add
      .text(btnX, btnY - 2, label, {
        fontSize: "11px",
        color: "#e53935",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH + 1);

    this.generalSkillCooldownGfx = this.add.graphics().setDepth(HUD_DEPTH + 2);

    this.generalSkillHit = this.add
      .rectangle(btnX, btnY, SKILL_BTN_W, SKILL_BTN_H, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(HUD_DEPTH + 3);

    bindSafeClick(this.generalSkillHit, this, () => this.fireGeneralSkill(), { hoverPoll: true });
  }

  private isBurnBoatsSkill(): boolean {
    return this.currentLevel === 2;
  }

  private isBurnBoatsActive(): boolean {
    return this.currentLevel === 2 && this.burnBoatsActiveSec > 0;
  }

  private getUnitAttack(unit: UnitState, baseAttack: number): number {
    if (!this.isBurnBoatsActive()) return baseAttack;
    if (unit.side === "red") {
      return Math.round(baseAttack * BURN_BOATS_ATTACK_MULTIPLIER);
    }
    if (unit.side === "blue") {
      return Math.max(1, Math.round(baseAttack * BURN_BOATS_ENEMY_MULTIPLIER));
    }
    return baseAttack;
  }

  private getUnitMoveSpeed(unit: UnitState, baseSpeed: number): number {
    if (this.isBurnBoatsActive() && unit.side === "blue") {
      return baseSpeed * BURN_BOATS_ENEMY_MULTIPLIER;
    }
    return baseSpeed;
  }

  private rollUnitStrike(
    unit: UnitState,
    baseAttack: number
  ): { damage: number; missed: boolean; crit: boolean } {
    const cfg = UNIT_CONFIGS[unit.configId];
    const attack = this.getUnitAttack(unit, baseAttack);

    if (cfg.missRate !== undefined && Math.random() < cfg.missRate) {
      return { damage: 0, missed: true, crit: false };
    }

    let damage = attack;
    let crit = false;
    if (cfg.critRate !== undefined && Math.random() < cfg.critRate) {
      damage = Math.round(attack * 2);
      crit = true;
    }
    return { damage, missed: false, crit };
  }

  private onUnitAttackMiss(unit: UnitState): void {
    const cfg = UNIT_CONFIGS[unit.configId];
    if (cfg.kind !== "general") return;

    const streak = (this.generalMissStreak.get(unit.id) ?? 0) + 1;
    if (streak >= GENERAL_MISS_STREAK_TRIGGER) {
      this.generalMissStreak.set(unit.id, 0);
      this.summonJunAroundUnit(unit);
      return;
    }
    this.generalMissStreak.set(unit.id, streak);
  }

  private onUnitAttackHit(unit: UnitState): void {
    if (UNIT_CONFIGS[unit.configId].kind === "general") {
      this.generalMissStreak.set(unit.id, 0);
    }
  }

  private summonJunAroundUnit(center: UnitState): void {
    const slots = this.collectSlotsAroundUnitOrdered(center, 1);
    let spawned = 0;

    for (const slot of slots) {
      if (spawned >= GENERAL_MISS_SUMMON_COUNT) break;
      if (!this.canEnterCell(slot.col, slot.row, "")) continue;
      if (this.getUnitAt(slot.col, slot.row)) continue;
      this.spawnUnit(center.side, GENERAL_MISS_SUMMON_UNIT, slot.col, slot.row);
      spawned++;
    }

    if (spawned > 0) {
      const x = BOARD_X + center.col * CELL + CELL / 2;
      const y = BOARD_Y + center.row * CELL + CELL / 2;
      this.showFloatText(x, y - 20, `未中${GENERAL_MISS_STREAK_TRIGGER}次·军援×${spawned}`);
    }
  }

  private collectSlotsAroundUnitOrdered(
    unit: UnitState,
    radius: number
  ): { col: number; row: number }[] {
    const slots: { col: number; row: number }[] = [];
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dc === 0 && dr === 0) continue;
        slots.push({ col: unit.col + dc, row: unit.row + dr });
      }
    }
    slots.sort((a, b) => {
      const da = Math.abs(a.col - unit.col) + Math.abs(a.row - unit.row);
      const db = Math.abs(b.col - unit.col) + Math.abs(b.row - unit.row);
      return da - db;
    });
    return slots;
  }

  private showFloatText(x: number, y: number, msg: string): void {
    const text = this.add
      .text(x, y, msg, {
        fontSize: "13px",
        color: "#ffeb3b",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(BOARD_DEPTH + 80);
    this.tweens.add({
      targets: text,
      y: y - 28,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  private flashMiss(unit: UnitState): void {
    const sprite = this.unitSprites.get(unit.id);
    if (!sprite) return;
    const x = sprite.x;
    const y = sprite.y - 22;
    this.showFloatText(x, y, "未中");
    this.tweens.add({
      targets: sprite,
      alpha: 0.45,
      duration: 80,
      yoyo: true,
    });
  }

  private flashCrit(target: UnitState): void {
    const sprite = this.unitSprites.get(target.id);
    if (!sprite) return;
    this.tweens.add({
      targets: sprite,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
    });
  }

  private spawnDeployedGeneral(): void {
    const generalId = loadGeneral();
    if (!generalId || !isUnitUnlocked(generalId) || !UNIT_CONFIGS[generalId]) return;

    const slot = this.findGeneralSpawnSlot();
    if (!slot) return;
    this.spawnUnit("red", generalId, slot.col, slot.row);
  }

  private findGeneralSpawnSlot(): { col: number; row: number } | null {
    const preferred = [
      { col: 4, row: RED_DEPLOY_MAX_ROW },
      { col: 3, row: RED_DEPLOY_MAX_ROW },
      { col: 5, row: RED_DEPLOY_MAX_ROW },
      { col: 4, row: RED_DEPLOY_MAX_ROW - 1 },
    ];
    for (const slot of preferred) {
      if (!this.isCellBlocked(slot.col, slot.row) && !this.getUnitAt(slot.col, slot.row)) {
        return slot;
      }
    }
    for (let row = RED_DEPLOY_MAX_ROW; row >= RED_DEPLOY_MIN_ROW; row--) {
      for (let col = DEPLOY_COL_MIN; col <= DEPLOY_COL_MAX; col++) {
        if (!this.isCellBlocked(col, row) && !this.getUnitAt(col, row)) {
          return { col, row };
        }
      }
    }
    return null;
  }

  private updateSkillCooldownUI(): void {
    const x = BOARD_X + 4;
    const y = HUD_Y + SKILL_BTN_CENTER_OFFSET_Y + SKILL_COOLDOWN_BAR_OFFSET_Y;
    const w = SKILL_COOLDOWN_BAR_W;
    const h = SKILL_COOLDOWN_BAR_H;

    this.skillCooldownGfx.clear();
    this.skillCooldownGfx.fillStyle(0x222222, 1);
    this.skillCooldownGfx.fillRect(x, y, w, h);

    if (this.isBurnBoatsSkill()) {
      const ready = this.burnBoatsCooldownSec <= 0 && !this.gameOver;
      const fillRatio = ready
        ? 1
        : 1 - this.burnBoatsCooldownSec / BURN_BOATS_COOLDOWN_SEC;
      const barColor = this.burnBoatsActiveSec > 0 ? 0xff5252 : 0xe53935;
      this.skillCooldownGfx.fillStyle(barColor, 1);
      this.skillCooldownGfx.fillRect(x, y, w * fillRatio, h);
      this.skillBtnBg.setAlpha(ready ? 1 : 0.4);
      this.skillLabel.setColor(
        ready ? (this.burnBoatsActiveSec > 0 ? "#ff5252" : "#e53935") : "#666666"
      );
      if (ready) this.skillHit.setInteractive({ useHandCursor: true });
      else this.skillHit.disableInteractive();
    } else if (this.cloudArrowReady && !this.gameOver) {
      this.skillCooldownGfx.fillStyle(0xff9800, 1);
      this.skillCooldownGfx.fillRect(x, y, w, h);
      this.skillBtnBg.setAlpha(1);
      this.skillLabel.setColor("#ff9800");
      this.skillHit.setInteractive({ useHandCursor: true });
    } else {
      this.skillBtnBg.setAlpha(0.4);
      this.skillLabel.setColor("#666666");
      this.skillHit.disableInteractive();
    }

    // 将领技进度条须每帧刷新，不可因穿云箭/破釜沉舟就绪而跳过
    this.updateGeneralSkillCooldownUI();
  }

  private updateGeneralSkillCooldownUI(): void {
    if (!this.generalSkillId || !this.generalSkillCooldownGfx || !this.generalSkillBtnBg) return;

    const skill = UNIT_CONFIGS[this.generalSkillId]?.activeSkill;
    if (!skill) return;

    const generalBtnY =
      HUD_Y + SKILL_BTN_CENTER_OFFSET_Y + (SKILL_BTN_H + SKILL_BTN_GAP) * 2;
    const x = BOARD_X + 4;
    const y = generalBtnY + SKILL_COOLDOWN_BAR_OFFSET_Y;
    const w = SKILL_COOLDOWN_BAR_W;
    const h = SKILL_COOLDOWN_BAR_H;

    this.generalSkillCooldownGfx.clear();
    this.generalSkillCooldownGfx.fillStyle(0x222222, 1);
    this.generalSkillCooldownGfx.fillRect(x, y, w, h);

    const general = this.findGeneralUnit();
    const ready =
      this.generalSkillCooldownSec <= 0 &&
      !this.gameOver &&
      !!general &&
      !!this.findNearestEnemy(general);
    const fillRatio = ready
      ? 1
      : 1 - this.generalSkillCooldownSec / skill.cooldownSec;

    this.generalSkillCooldownGfx.fillStyle(0xe53935, 1);
    this.generalSkillCooldownGfx.fillRect(x, y, w * fillRatio, h);

    this.generalSkillBtnBg.setAlpha(ready ? 1 : 0.4);
    this.generalSkillLabel?.setColor(ready ? "#e53935" : "#666666");

    if (ready) this.generalSkillHit?.setInteractive({ useHandCursor: true });
    else this.generalSkillHit?.disableInteractive();
  }

  private findGeneralUnit(): UnitState | undefined {
    if (!this.generalSkillId) return undefined;
    return this.units.find(
      (u) => u.hp > 0 && u.side === "red" && u.configId === this.generalSkillId
    );
  }

  private findNearestEnemy(from: UnitState): UnitState | undefined {
    const enemies = this.getEnemyUnits(from.side);
    let nearest: UnitState | undefined;
    let minDist = Infinity;
    for (const enemy of enemies) {
      const d = this.manhattan(from, enemy.col, enemy.row);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private getEnemiesInSquare(
    centerCol: number,
    centerRow: number,
    size: number,
    side: Side
  ): UnitState[] {
    const half = Math.floor(size / 2);
    return this.getEnemyUnits(side).filter((u) => {
      const dc = Math.abs(u.col - centerCol);
      const dr = Math.abs(u.row - centerRow);
      return dc <= half && dr <= half;
    });
  }

  private createCard(
    x: number,
    y: number,
    id: string,
    char: string,
    cost: number,
    icon: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(HUD_DEPTH);

    const bg = this.add.rectangle(34, 42, 68, 84, 0x1b3d1b).setStrokeStyle(2, COLORS.deploy);
    const charText = this.add
      .text(34, 30, char, {
        fontSize: "30px",
        color: "#e53935",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.setData("charText", charText);
    const iconText = this.add.text(50, 46, icon, { fontSize: "14px" }).setOrigin(0.5);
    const costText = this.add
      .text(52, 72, `${cost}`, { fontSize: "14px", color: "#fff", fontFamily: "Noto Sans SC, sans-serif" })
      .setOrigin(0.5);

    container.add([bg, charText, iconText, costText]);
    container.setData("unitId", id);
    container.setData("bg", bg);
    container.setData("costText", costText);

    const hit = this.add
      .rectangle(x + 34, y + 42, 68, 84, 0x000000, 0.001)
      .setDepth(HUD_DEPTH + 3);

    hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.canAffordUnit(id)) return;
      this.startDragDeploy(id, pointer);
    });
    container.setData("hit", hit);

    return container;
  }

  private updateEnergyUI(): void {
    const barX = BOARD_X;
    const barY = HUD_Y + 100;
    const barW = COLS * CELL;
    const barH = 12;
    const ratio = this.redEnergy / MAX_ENERGY;

    this.energyBar.clear();
    this.energyBar.fillStyle(0x333333, 1);
    this.energyBar.fillRect(barX, barY, barW, barH);
    this.energyBar.fillStyle(0xffffff, 1);
    this.energyBar.fillRect(barX, barY, barW * ratio, barH);

    this.energyText.setText(`${Math.floor(this.redEnergy)}/${MAX_ENERGY}`);
  }

  /** 当前能量是否够买该卡牌（与界面显示的能量整数一致） */
  private canAffordUnit(unitId: string): boolean {
    if (this.gameOver) return false;
    return Math.floor(this.redEnergy) >= UNIT_CONFIGS[unitId].cost;
  }

  private updateCardUI(): void {
    this.cardContainers.forEach((card) => {
      const id = card.getData("unitId") as string;
      const affordable = this.canAffordUnit(id);
      const bg = card.getData("bg") as Phaser.GameObjects.Rectangle;
      const charText = card.getData("charText") as Phaser.GameObjects.Text;
      const costText = card.getData("costText") as Phaser.GameObjects.Text;
      const hit = card.getData("hit") as Phaser.GameObjects.Rectangle;

      if (affordable) {
        card.setAlpha(1);
        bg.setFillStyle(0x243d24, 1);
        bg.setStrokeStyle(2, this.draggingUnitId === id ? 0xffff00 : 0x66bb6a);
        charText.setColor("#ff5252");
        costText.setColor("#ffffff");
        hit.setInteractive({ useHandCursor: true });
      } else {
        card.setAlpha(0.35);
        bg.setFillStyle(0x121212, 1);
        bg.setStrokeStyle(2, 0x3a3a3a);
        charText.setColor("#555555");
        costText.setColor("#555555");
        hit.disableInteractive();
      }
    });
  }

  // ─── Dialogue & Result ───────────────────────────────────

  private createDialogue(): void {
    this.dialogueBubble = this.add.container(this.scale.width / 2 - 150, BOARD_Y + 2 * CELL).setVisible(false);

    const bubble = this.add.graphics();
    bubble.fillStyle(0xffffff, 0.95);
    bubble.fillRoundedRect(0, 0, 300, 52, 8);

    const text = this.add.text(12, 14, "", {
      fontSize: "14px",
      color: "#333",
      fontFamily: "Noto Sans SC, sans-serif",
      wordWrap: { width: 276 },
    });

    this.dialogueBubble.add([bubble, text]);
    this.dialogueBubble.setData("textObj", text);
    this.dialogueBubble.setDepth(HUD_DEPTH + 50);
  }

  private showDialogue(msg: string): void {
    const text = this.dialogueBubble.getData("textObj") as Phaser.GameObjects.Text;
    text.setText(msg);
    this.dialogueBubble.setVisible(true);
  }

  private hideDialogue(): void {
    this.dialogueBubble.setVisible(false);
  }

  private createResultOverlay(): void {
    this.resultText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontSize: "32px",
        color: "#fff",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
        backgroundColor: "#000000aa",
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(100);
  }

  // ─── 拖动出兵 ─────────────────────────────────────────────

  private startDragDeploy(id: string, pointer: Phaser.Input.Pointer): void {
    if (this.emptyFortActive) return;
    this.cancelDragDeploy();
    this.draggingUnitId = id;
    const cfg = UNIT_CONFIGS[id];

    this.dragGhost = this.add
      .text(pointer.x, pointer.y, cfg.char, {
        fontSize: "32px",
        color: "#e53935",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(300);

    this.showDeployZone();
    this.updateCardUI();
    this.input.on("pointermove", this.onDragMove, this);
    this.input.on("pointerup", this.onDragEnd, this);
    this.onDragMove(pointer);
  }

  private onDragMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.draggingUnitId || !this.dragGhost) return;

    this.dragGhost.setPosition(pointer.x, pointer.y);
    this.updateDragHover(pointer);
  };

  private onDragEnd = (pointer: Phaser.Input.Pointer): void => {
    if (!this.draggingUnitId) return;

    const col = Math.floor((pointer.x - BOARD_X) / CELL);
    const row = Math.floor((pointer.y - BOARD_Y) / CELL);

    if (this.canDeployAt(col, row)) {
      const id = this.draggingUnitId;
      const cfg = UNIT_CONFIGS[id];
      if (this.canAffordUnit(id)) {
        this.redEnergy -= cfg.cost;
        this.spawnUnit("red", id, col, row);
        const nextId = DECK_IDS[Math.floor(Math.random() * DECK_IDS.length)];
        this.nextCardText.setText(`下一张: ${UNIT_CONFIGS[nextId].char}`);
        this.updateEnergyUI();
      }
    }

    this.cancelDragDeploy();
  };

  private cancelDragDeploy(): void {
    this.draggingUnitId = null;
    this.dragGhost?.destroy();
    this.dragGhost = null;
    this.dragHoverRect?.destroy();
    this.dragHoverRect = null;
    this.clearDeployHighlights();
    this.updateCardUI();
    this.input.off("pointermove", this.onDragMove, this);
    this.input.off("pointerup", this.onDragEnd, this);
  }

  private updateDragHover(pointer: Phaser.Input.Pointer): void {
    this.dragHoverRect?.destroy();
    this.dragHoverRect = null;

    const col = Math.floor((pointer.x - BOARD_X) / CELL);
    const row = Math.floor((pointer.y - BOARD_Y) / CELL);
    if (!this.canDeployAt(col, row)) return;

    this.dragHoverRect = this.add
      .rectangle(
        BOARD_X + col * CELL + CELL / 2,
        BOARD_Y + row * CELL + CELL / 2,
        CELL - 4,
        CELL - 4,
        0xffff00,
        0.45
      )
      .setDepth(BOARD_DEPTH + 15);
  }

  private showDeployZone(): void {
    this.clearDeployHighlights();

    for (let c = DEPLOY_COL_MIN; c <= DEPLOY_COL_MAX; c++) {
      for (let r = RED_DEPLOY_MIN_ROW; r <= RED_DEPLOY_MAX_ROW; r++) {
        if (this.canDeployAt(c, r)) {
          const rect = this.add
            .rectangle(BOARD_X + c * CELL + CELL / 2, BOARD_Y + r * CELL + CELL / 2, CELL - 4, CELL - 4, COLORS.deploy, 0.22)
            .setDepth(BOARD_DEPTH + 3);
          this.deployHighlights.push(rect);
        }
      }
    }
  }

  private clearDeployHighlights(): void {
    this.deployHighlights.forEach((r) => r.destroy());
    this.deployHighlights = [];
  }

  private canDeployAt(col: number, row: number): boolean {
    if (!isDeployColumn(col)) return false;
    if (row < RED_DEPLOY_MIN_ROW || row > RED_DEPLOY_MAX_ROW) return false;
    if (this.isCellBlocked(col, row)) return false;
    return !this.getUnitAt(col, row);
  }

  private gateWallIntact(col: number, row: number): boolean {
    return !!this.getAliveBaseWallAt(col, row);
  }

  // ─── Units ───────────────────────────────────────────────

  private spawnUnit(side: Side, configId: string, col: number, row: number): UnitState {
    const cfg = UNIT_CONFIGS[configId];
    const id = `u${this.nextUnitId++}`;

    const unit: UnitState = {
      id,
      configId,
      side,
      col,
      row,
      hp: cfg.hp,
      attackTimer: 0,
      moveTimer: 0,
      targetId: null,
      wallTargetId: null,
    };
    this.units.push(unit);
    this.createUnitSprite(unit);
    return unit;
  }

  private createUnitSprite(unit: UnitState): void {
    const cfg = UNIT_CONFIGS[unit.configId];
    const color = unit.side === "red" ? "#e53935" : "#1e88e5";
    const x = BOARD_X + unit.col * CELL + CELL / 2;
    const y = BOARD_Y + unit.row * CELL + CELL / 2;

    const container = this.add.container(x, y).setDepth(BOARD_DEPTH + 20);

    const charText = this.add
      .text(0, 0, cfg.char, {
        fontSize: "26px",
        color,
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const iconText = this.add.text(14, 10, cfg.icon, { fontSize: "12px" }).setOrigin(0.5);

    const hpBarBg = this.add.rectangle(0, 18, 28, 4, 0x333333);
    const hpBar = this.add.rectangle(0, 18, 28, 4, unit.side === "red" ? 0xe53935 : 0x1e88e5);

    container.add([charText, iconText, hpBarBg, hpBar]);
    container.setData("hpBar", hpBar);
    container.setData("maxHp", cfg.hp);

    this.unitSprites.set(unit.id, container);
    this.tweenUnitToGrid(unit);
  }

  private tweenUnitToGrid(unit: UnitState, durationMs = 280): void {
    const sprite = this.unitSprites.get(unit.id);
    if (!sprite) return;
    const x = BOARD_X + unit.col * CELL + CELL / 2;
    const y = BOARD_Y + unit.row * CELL + CELL / 2;
    this.tweens.killTweensOf(sprite);
    this.tweens.add({ targets: sprite, x, y, duration: durationMs, ease: "Linear" });
  }

  private getUnitAt(col: number, row: number): UnitState | undefined {
    return this.units.find((u) => u.col === col && u.row === row && u.hp > 0);
  }

  private getEnemyUnits(side: Side): UnitState[] {
    return this.units.filter((u) => u.hp > 0 && u.side !== side);
  }

  private manhattan(a: UnitState, col: number, row: number): number {
    return Math.abs(a.col - col) + Math.abs(a.row - row);
  }

  /** 红方向上(-row)，蓝方向下(+row) */
  private forwardDir(side: Side): number {
    return side === "red" ? -1 : 1;
  }

  private canEnterCell(col: number, row: number, selfId: string): boolean {
    if (!isInnerColumn(col) || row < 1 || row >= ROWS - 1) return false;
    if (this.isCellBlocked(col, row)) return false;
    const occupant = this.getUnitAt(col, row);
    return !occupant || occupant.id === selfId;
  }

  private tryMoveUnitForward(unit: UnitState): boolean {
    const dir = this.forwardDir(unit.side);
    const nextRow = unit.row + dir;
    if (!this.canEnterCell(unit.col, nextRow, unit.id)) return false;
    unit.row = nextRow;
    return true;
  }

  private tryMoveUnitSidestep(unit: UnitState): boolean {
    const dir = this.forwardDir(unit.side);
    const candidates: [number, number][] = [];

    for (const dc of [-1, 1]) {
      const c = unit.col + dc;
      const r = unit.row + dir;
      if (this.canEnterCell(c, r, unit.id)) candidates.push([c, r]);
    }
    for (const dc of [-1, 1]) {
      const c = unit.col + dc;
      if (this.canEnterCell(c, unit.row, unit.id)) candidates.push([c, unit.row]);
    }

    if (candidates.length === 0) return false;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    unit.col = pick[0];
    unit.row = pick[1];
    return true;
  }

  private updateUnits(dt: number): void {
    const alive = this.units.filter((u) => u.hp > 0);

    for (const unit of alive) {
      const cfg = UNIT_CONFIGS[unit.configId];
      unit.attackTimer -= dt;

      const enemies = this.getEnemyUnits(unit.side);
      let target = unit.targetId ? enemies.find((e) => e.id === unit.targetId) : undefined;

      if (!target || target.hp <= 0) {
        target = undefined;
        let minDist = Infinity;
        for (const e of enemies) {
          const d = this.manhattan(unit, e.col, e.row);
          if (d <= cfg.attackRange && d < minDist) {
            minDist = d;
            target = e;
          }
        }
        unit.targetId = target?.id ?? null;
        if (!target) unit.wallTargetId = null;
      }

      if (target) {
        unit.wallTargetId = null;
        if (unit.attackTimer <= 0) {
          const strike = this.rollUnitStrike(unit, cfg.attack);
          unit.attackTimer = cfg.attackInterval;
          if (strike.missed) {
            this.onUnitAttackMiss(unit);
            this.flashMiss(unit);
          } else {
            this.onUnitAttackHit(unit);
            target.hp -= strike.damage;
            this.flashDamage(target);
            if (strike.crit) this.flashCrit(target);
            if (target.hp <= 0) this.killUnit(target);
          }
        }
        this.updateUnitHpBar(unit);
        continue;
      }

      // 攻击敌方大本营围墙
      let wallTarget = unit.wallTargetId
        ? this.baseWalls.find((w) => w.id === unit.wallTargetId && w.hp > 0)
        : undefined;

      if (!wallTarget) {
        wallTarget = this.getEnemyBaseWallInRange(unit, cfg.attackRange);
        unit.wallTargetId = wallTarget?.id ?? null;
      } else if (this.manhattan(unit, wallTarget.col, wallTarget.row) > cfg.attackRange) {
        wallTarget = this.getEnemyBaseWallInRange(unit, cfg.attackRange);
        unit.wallTargetId = wallTarget?.id ?? null;
      }

      if (wallTarget) {
        if (unit.attackTimer <= 0) {
          const strike = this.rollUnitStrike(unit, cfg.attack);
          unit.attackTimer = cfg.attackInterval;
          if (strike.missed) {
            this.onUnitAttackMiss(unit);
            this.flashMiss(unit);
          } else {
            this.onUnitAttackHit(unit);
            wallTarget.hp -= strike.damage;
            this.flashBaseWall(wallTarget);
            this.updateBaseWallHpBar(wallTarget);
            if (wallTarget.hp <= 0) this.destroyBaseWall(wallTarget);
          }
        }
        this.updateUnitHpBar(unit);
        continue;
      }

      // 攻击大本营（必须站在门口格）
      if (
        canAttackEnemyBase(
          unit.col,
          unit.row,
          unit.side,
          cfg.attackRange,
          (c, r) => this.gateWallIntact(c, r)
        )
      ) {
        if (unit.attackTimer <= 0) {
          const strike = this.rollUnitStrike(unit, cfg.attack);
          unit.attackTimer = cfg.attackInterval;
          if (strike.missed) {
            this.onUnitAttackMiss(unit);
            this.flashMiss(unit);
          } else {
            this.onUnitAttackHit(unit);
            if (unit.side === "red") {
              this.blueBaseHp -= strike.damage;
              this.flashBase("blue");
              this.updateBaseHpBars();
            } else {
              this.redBaseHp -= strike.damage;
              this.flashBase("red");
              this.updateBaseHpBars();
            }
          }
        }
        continue;
      }

      // 移动：moveSpeed = 每秒前进的格数
      unit.moveTimer += dt;
      const stepInterval = 1 / this.getUnitMoveSpeed(unit, cfg.moveSpeed);
      if (unit.moveTimer < stepInterval) {
        this.updateUnitHpBar(unit);
        continue;
      }
      unit.moveTimer -= stepInterval;

      const stepMs = Math.round(stepInterval * 900);
      const moved = this.tryMoveUnitForward(unit) || this.tryMoveUnitSidestep(unit);
      if (moved) {
        this.tweenUnitToGrid(unit, stepMs);
      }

      this.updateUnitHpBar(unit);
    }
  }

  private updateUnitHpBar(unit: UnitState): void {
    const sprite = this.unitSprites.get(unit.id);
    if (!sprite) return;
    const hpBar = sprite.getData("hpBar") as Phaser.GameObjects.Rectangle;
    const maxHp = sprite.getData("maxHp") as number;
    const ratio = Math.max(0, unit.hp / maxHp);
    hpBar.width = 28 * ratio;
  }

  private flashDamage(target: UnitState): void {
    const sprite = this.unitSprites.get(target.id);
    if (!sprite) return;
    this.tweens.add({ targets: sprite, alpha: 0.4, duration: 60, yoyo: true });
    this.updateUnitHpBar(target);
  }

  private killUnit(unit: UnitState): void {
    const sprite = this.unitSprites.get(unit.id);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 0.5,
        duration: 200,
        onComplete: () => sprite.destroy(),
      });
    }
    this.unitSprites.delete(unit.id);
    unit.hp = 0;
    unit.targetId = null;
    this.onCloudArrowBlueUnitKilled(unit);
  }

  private flashBaseWall(wall: BaseWallState): void {
    const sprite = this.baseWallSprites.get(wall.id);
    if (!sprite) return;
    this.tweens.add({ targets: sprite, alpha: 0.35, duration: 60, yoyo: true });
  }

  private flashBase(side: Side): void {
    const base = side === "red" ? RED_BASE : BLUE_BASE;
    const x = BOARD_X + base.col * CELL + CELL / 2;
    const y = BOARD_Y + base.row * CELL + CELL / 2;
    const flash = this.add.circle(x, y, 20, side === "red" ? COLORS.red : COLORS.blue, 0.5).setDepth(20);
    this.tweens.add({ targets: flash, alpha: 0, scale: 2, duration: 300, onComplete: () => flash.destroy() });
  }

  // ─── Skills ──────────────────────────────────────────────

  private fireGeneralSkill(): void {
    if (!this.generalSkillId || this.generalSkillCooldownSec > 0 || this.gameOver) return;

    const general = this.findGeneralUnit();
    const cfg = UNIT_CONFIGS[this.generalSkillId];
    const skill = cfg?.activeSkill;
    if (!general || !skill) return;

    const primaryTarget = this.findNearestEnemy(general);
    if (!primaryTarget) {
      const gx = BOARD_X + general.col * CELL + CELL / 2;
      const gy = BOARD_Y + general.row * CELL + CELL / 2;
      this.showFloatText(gx, gy - 28, "无敌人");
      return;
    }

    this.generalSkillCooldownSec = skill.cooldownSec;
    this.updateSkillCooldownUI();

    const quote = skill.skillIcon ? `${skill.skillIcon} ${skill.name}` : skill.name;
    this.showSkillQuote(quote, { holder: "cloudArrow" });
    playCloudArrowSfx();

    this.spawnFingerVfx(general.col, general.row, primaryTarget.col, primaryTarget.row);

    for (const enemy of this.getEnemiesInSquare(
      primaryTarget.col,
      primaryTarget.row,
      skill.areaSize,
      general.side
    )) {
      const doubleChance =
        skill.doubleChanceMin +
        Math.random() * (skill.doubleChanceMax - skill.doubleChanceMin);
      const doubled = Math.random() < doubleChance;
      const damage = doubled ? skill.baseDamage * 2 : skill.baseDamage;
      enemy.hp -= damage;
      this.flashDamage(enemy);
      if (doubled) this.flashCrit(enemy);
      if (enemy.hp <= 0) this.killUnit(enemy);
    }

    const tx = BOARD_X + primaryTarget.col * CELL + CELL / 2;
    const ty = BOARD_Y + primaryTarget.row * CELL + CELL / 2;
    this.tweens.add({
      targets: this.unitSprites.get(general.id),
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 120,
      yoyo: true,
    });
    this.showFloatText(tx, ty - 28, skill.name);
  }

  private spawnFingerVfx(fromCol: number, fromRow: number, toCol: number, toRow: number): void {
    const x0 = BOARD_X + fromCol * CELL + CELL / 2;
    const y0 = BOARD_Y + fromRow * CELL + CELL / 2;
    const x1 = BOARD_X + toCol * CELL + CELL / 2;
    const y1 = BOARD_Y + toRow * CELL + CELL / 2;
    const finger = this.add
      .text(x0, y0, "👆", { fontSize: "22px" })
      .setOrigin(0.5)
      .setDepth(BOARD_DEPTH + 60);
    this.tweens.add({
      targets: finger,
      x: x1,
      y: y1,
      duration: 180,
      onComplete: () => finger.destroy(),
    });
  }

  private fireBurnBoats(): void {
    if (this.burnBoatsCooldownSec > 0 || this.gameOver) return;

    playBurnBoatsSfx();
    this.burnBoatsCooldownSec = BURN_BOATS_COOLDOWN_SEC;
    this.burnBoatsActiveSec = BURN_BOATS_DURATION_SEC;
    this.updateSkillCooldownUI();
    this.showSkillQuote(BURN_BOATS_QUOTE, { holder: "cloudArrow" });
    this.playBurnBoatsVfx();
  }

  private playBurnBoatsVfx(): void {
    const reds = this.units.filter((u) => u.hp > 0 && u.side === "red");
    for (const unit of reds) {
      const sprite = this.unitSprites.get(unit.id);
      if (!sprite) continue;
      this.tweens.add({
        targets: sprite,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeOut",
      });
    }
  }

  private fireCloudArrow(): void {
    if (!this.cloudArrowReady || this.gameOver) return;

    playCloudArrowSfx();

    this.cloudArrowReady = false;
    this.updateSkillCooldownUI();

    this.showCloudArrowQuote();
    this.spawnCloudArrowArmy();
    this.triggerCloudArrowBlueResponse();
    this.playCloudArrowVfx();
  }

  private showCloudArrowQuote(): void {
    this.showSkillQuote(CLOUD_ARROW_QUOTE, { holder: "cloudArrow" });
  }

  /** 穿云箭 / 空城：屏幕中央亮黄荧光标语 */
  private showSkillQuote(
    quote: string,
    options: { holder: "cloudArrow" | "emptyFort" }
  ): void {
    if (options.holder === "cloudArrow") this.hideCloudArrowQuote();
    else this.hideEmptyFortQuote();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const container = this.add.container(cx, cy).setDepth(500);

    const wrap = { width: 360 };
    const glow = this.add
      .text(0, 0, quote, {
        fontSize: "26px",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
        color: "#FFF59D",
        align: "center",
        stroke: "#FFEA00",
        strokeThickness: 12,
        wordWrap: wrap,
      })
      .setOrigin(0.5)
      .setAlpha(0.55);

    const main = this.add
      .text(0, 0, quote, {
        fontSize: "26px",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
        color: "#FFFF00",
        align: "center",
        stroke: "#FFFFFF",
        strokeThickness: 2,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#FFEB3B",
          blur: 20,
          stroke: true,
          fill: true,
        },
        wordWrap: wrap,
      })
      .setOrigin(0.5);

    container.add([glow, main]);

    this.tweens.add({
      targets: container,
      scale: { from: 0.97, to: 1.05 },
      alpha: { from: 0.88, to: 1 },
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    if (options.holder === "cloudArrow") {
      this.cloudArrowQuoteContainer = container;
      this.time.delayedCall(CLOUD_ARROW_QUOTE_DURATION_MS, () => this.hideCloudArrowQuote());
    } else {
      this.emptyFortQuoteContainer = container;
    }
  }

  private hideCloudArrowQuote(): void {
    if (!this.cloudArrowQuoteContainer) return;
    this.tweens.killTweensOf(this.cloudArrowQuoteContainer);
    this.cloudArrowQuoteContainer.destroy();
    this.cloudArrowQuoteContainer = null;
  }

  /** 楚河汉界格位：自上而下、自左而右 */
  private collectRiverSlotsOrdered(): { col: number; row: number }[] {
    const slots: { col: number; row: number }[] = [];
    for (const row of RIVER_ROWS) {
      for (let col = DEPLOY_COL_MIN; col <= DEPLOY_COL_MAX; col++) {
        slots.push({ col, row });
      }
    }
    return slots;
  }

  private canSpawnInRiver(col: number, row: number): boolean {
    if (!isRiverRow(row) || !isDeployColumn(col)) return false;
    if (this.isCellBlocked(col, row)) return false;
    return !this.getUnitAt(col, row);
  }

  private spawnCloudArrowArmy(): void {
    const queue: string[] = [];
    for (const { id, count } of CLOUD_ARROW_SUMMON) {
      for (let i = 0; i < count; i++) queue.push(id);
    }

    const allSlots = this.collectRiverSlotsOrdered();
    let slotCursor = 0;

    const takeNextSlot = (): { col: number; row: number } | null => {
      while (slotCursor < allSlots.length) {
        const slot = allSlots[slotCursor++];
        if (this.canSpawnInRiver(slot.col, slot.row)) return slot;
      }
      return null;
    };

    queue.forEach((unitId, i) => {
      this.time.delayedCall(i * CLOUD_ARROW_SUMMON_DELAY_MS, () => {
        if (this.gameOver) return;
        const slot = takeNextSlot();
        if (!slot) return;
        this.spawnUnit("red", unitId, slot.col, slot.row);
      });
    });
  }

  private triggerCloudArrowBlueResponse(): void {
    this.cloudArrowBlueShieldIds.clear();
    this.cloudArrowBlueWave1Complete = false;
    this.cloudArrowBlueWave2Spawned = false;
    this.spawnBlueUnitsStaggered(CLOUD_ARROW_BLUE_WAVE1, (unitId, unit) => {
      if (unitId === "dun") this.cloudArrowBlueShieldIds.add(unit.id);
    }, () => {
      this.cloudArrowBlueWave1Complete = true;
      this.checkCloudArrowBlueWave2Ready();
    });
  }

  /** 蓝方出兵区：自上而下、自左而右 */
  private collectBlueSpawnSlotsOrdered(): { col: number; row: number }[] {
    const slots: { col: number; row: number }[] = [];
    for (let row = BLUE_SPAWN_MIN_ROW; row <= BLUE_SPAWN_MAX_ROW; row++) {
      for (let col = DEPLOY_COL_MIN; col <= DEPLOY_COL_MAX; col++) {
        slots.push({ col, row });
      }
    }
    return slots;
  }

  private canSpawnBlueUnit(col: number, row: number): boolean {
    if (row < BLUE_SPAWN_MIN_ROW || row > BLUE_SPAWN_MAX_ROW) return false;
    if (!isDeployColumn(col)) return false;
    if (this.isCellBlocked(col, row)) return false;
    return !this.getUnitAt(col, row);
  }

  /** 第二波：宫殿区满时可用楚河汉界落位 */
  private collectBlueWave2SlotsOrdered(): { col: number; row: number }[] {
    return [...this.collectBlueSpawnSlotsOrdered(), ...this.collectRiverSlotsOrdered()];
  }

  private canSpawnBlueWave2Unit(col: number, row: number): boolean {
    if (!isDeployColumn(col)) return false;
    const inPalace =
      row >= BLUE_SPAWN_MIN_ROW && row <= BLUE_SPAWN_MAX_ROW;
    if (!inPalace && !isRiverRow(row)) return false;
    if (this.isCellBlocked(col, row)) return false;
    return !this.getUnitAt(col, row);
  }

  private spawnBlueUnitsStaggered(
    groups: { id: string; count: number }[],
    onSpawned?: (unitId: string, unit: UnitState) => void,
    onQueueComplete?: () => void,
    options?: { includeRiverSlots?: boolean }
  ): void {
    const queue: string[] = [];
    for (const { id, count } of groups) {
      for (let i = 0; i < count; i++) queue.push(id);
    }

    const allSlots = options?.includeRiverSlots
      ? this.collectBlueWave2SlotsOrdered()
      : this.collectBlueSpawnSlotsOrdered();
    const canSpawn = options?.includeRiverSlots
      ? (col: number, row: number) => this.canSpawnBlueWave2Unit(col, row)
      : (col: number, row: number) => this.canSpawnBlueUnit(col, row);

    let slotCursor = 0;
    const takeNextSlot = (): { col: number; row: number } | null => {
      while (slotCursor < allSlots.length) {
        const slot = allSlots[slotCursor++];
        if (canSpawn(slot.col, slot.row)) return slot;
      }
      return null;
    };

    let remaining = queue.length;
    if (remaining === 0) {
      onQueueComplete?.();
      return;
    }

    const finishOne = (): void => {
      remaining--;
      if (remaining <= 0) onQueueComplete?.();
    };

    queue.forEach((unitId, i) => {
      this.time.delayedCall(i * CLOUD_ARROW_SUMMON_DELAY_MS, () => {
        if (this.gameOver) {
          finishOne();
          return;
        }
        const slot = takeNextSlot();
        if (slot) {
          const unit = this.spawnUnit("blue", unitId, slot.col, slot.row);
          onSpawned?.(unitId, unit);
        }
        finishOne();
      });
    });
  }

  private onCloudArrowBlueUnitKilled(unit: UnitState): void {
    this.cloudArrowBlueWave2UnitIds.delete(unit.id);
    if (!this.cloudArrowBlueShieldIds.delete(unit.id)) return;
    this.checkCloudArrowBlueWave2Ready();
  }

  private checkCloudArrowBlueWave2Ready(): void {
    if (this.cloudArrowBlueWave2Spawned || this.gameOver || !this.cloudArrowBlueWave1Complete) return;
    if (this.cloudArrowBlueShieldIds.size > 0) return;
    this.beginEmptyFortAndWave2();
  }

  /** 空城增援：与穿云箭同款标语/音效/停战/撤退/出兵/清场 */
  private beginEmptyFortReinforcement(
    quote: string,
    wave: { id: string; count: number }[],
    waveUnitIds: Set<string>,
    onAfterPause: () => void
  ): void {
    if (this.emptyFortActive || this.gameOver) return;

    this.emptyFortActive = true;
    this.cancelDragDeploy();
    this.retreatAllRedUnits();

    playCloudArrowSfx();
    this.playCloudArrowVfx();
    this.showSkillQuote(quote, { holder: "emptyFort" });

    waveUnitIds.clear();
    this.clearEmptyFortSafetyTimer();
    this.emptyFortSafetyTimer = this.time.delayedCall(getEmptyFortDurationMs(this.currentLevel), () => {
      this.emptyFortSafetyTimer = null;
      if (this.emptyFortActive) {
        this.endEmptyFort();
        onAfterPause();
      }
    });

    this.spawnBlueUnitsStaggered(
      wave,
      (_unitId, unit) => waveUnitIds.add(unit.id),
      undefined,
      { includeRiverSlots: true }
    );
  }

  /** 六盾全灭：触发穿云箭反击空城第二波 */
  private beginEmptyFortAndWave2(): void {
    if (this.cloudArrowBlueWave2Spawned || this.gameOver) return;
    this.cloudArrowBlueWave2Spawned = true;
    this.clearCloudArrowBlueWave2Timer();
    this.beginEmptyFortReinforcement(
      EMPTY_FORT_QUOTE,
      CLOUD_ARROW_BLUE_WAVE2,
      this.cloudArrowBlueWave2UnitIds,
      () => this.scheduleClearCloudArrowBlueWave2()
    );
  }

  private scheduleClearCloudArrowBlueWave2(): void {
    this.clearCloudArrowBlueWave2Timer();
    if (this.gameOver || this.cloudArrowBlueWave2UnitIds.size === 0) return;

    this.cloudArrowBlueWave2ClearTimer = this.time.delayedCall(
      getCloudArrowBlueWave2ClearDelayMs(this.currentLevel),
      () => {
        this.cloudArrowBlueWave2ClearTimer = null;
        this.clearCloudArrowBlueWave2Units();
      }
    );
  }

  private clearCloudArrowBlueWave2Units(): void {
    const ids = [...this.cloudArrowBlueWave2UnitIds];
    this.cloudArrowBlueWave2UnitIds.clear();

    for (const id of ids) {
      const unit = this.units.find((u) => u.id === id && u.hp > 0);
      if (unit) this.killUnit(unit);
    }
  }

  private clearCloudArrowBlueWave2Timer(): void {
    if (!this.cloudArrowBlueWave2ClearTimer) return;
    this.cloudArrowBlueWave2ClearTimer.remove();
    this.cloudArrowBlueWave2ClearTimer = null;
  }

  private clearEmptyFortSafetyTimer(): void {
    if (!this.emptyFortSafetyTimer) return;
    this.emptyFortSafetyTimer.remove();
    this.emptyFortSafetyTimer = null;
  }

  private retreatAllRedUnits(): void {
    const reds = this.units.filter((u) => u.hp > 0 && u.side === "red");
    reds.sort((a, b) => b.row - a.row);

    for (const unit of reds) {
      while (unit.row < RED_DEPLOY_MAX_ROW) {
        const nextRow = unit.row + 1;
        if (!this.canEnterCell(unit.col, nextRow, unit.id)) break;
        unit.row = nextRow;
      }
      this.tweenUnitToGrid(unit, 600);
    }
  }

  private hideEmptyFortQuote(): void {
    if (!this.emptyFortQuoteContainer) return;
    this.tweens.killTweensOf(this.emptyFortQuoteContainer);
    this.emptyFortQuoteContainer.destroy();
    this.emptyFortQuoteContainer = null;
  }

  private endEmptyFort(): void {
    this.clearEmptyFortSafetyTimer();
    if (!this.emptyFortActive) return;
    this.emptyFortActive = false;
    this.hideEmptyFortQuote();
  }

  private playCloudArrowVfx(): void {
    const line = this.add.graphics().setDepth(BOARD_DEPTH + 50);
    line.lineStyle(3, 0xff9800, 0.9);
    line.lineBetween(BOARD_X, BOARD_Y, BOARD_X + COLS * CELL, BOARD_Y + ROWS * CELL);
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 500,
      onComplete: () => line.destroy(),
    });
  }

  // ─── AI ──────────────────────────────────────────────────

  private updateAI(dt: number): void {
    this.aiTimer -= dt;
    if (this.aiTimer > 0) return;
    this.aiTimer = 2 + Math.random() * 2;

    const affordable = DECK_IDS.filter((id) => UNIT_CONFIGS[id].cost <= this.blueEnergy);
    if (affordable.length === 0) return;

    const pick = affordable[Math.floor(Math.random() * affordable.length)];
    const cfg = UNIT_CONFIGS[pick];

    for (let attempt = 0; attempt < 12; attempt++) {
      const col = DEPLOY_COL_MIN + Math.floor(Math.random() * (DEPLOY_COL_MAX - DEPLOY_COL_MIN + 1));
      const row =
        BLUE_SPAWN_MIN_ROW +
        Math.floor(Math.random() * (BLUE_SPAWN_MAX_ROW - BLUE_SPAWN_MIN_ROW + 1));
      if (this.isCellBlocked(col, row) || this.getUnitAt(col, row)) continue;

      this.blueEnergy -= cfg.cost;
      this.spawnUnit("blue", pick, col, row);
      return;
    }
  }

  // ─── Win / Lose ──────────────────────────────────────────

  private checkWinLose(): void {
    if (this.blueBaseHp <= 0) this.endGame("胜利！");
    else if (this.redBaseHp <= 0) this.endGame("失败…");
  }

  private goHome(): void {
    deferInputAction(this, () => {
      if (this.scene.key !== "GameScene") return;
      this.victoryModal?.destroy();
      this.victoryModal = null;
      this.boardZone?.disableInteractive();
      this.skillHit?.disableInteractive();
      this.generalSkillHit?.disableInteractive();
      resetInputState(this);
      this.scene.start("HomeScene");
    });
  }

  private endGame(msg: string): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.cancelDragDeploy();
    this.hideCloudArrowQuote();
    this.clearEmptyFortSafetyTimer();
    this.clearCloudArrowBlueWave2Timer();
    this.cloudArrowBlueWave2UnitIds.clear();
    this.hideEmptyFortQuote();
    this.emptyFortActive = false;
    this.boardZone.disableInteractive();
    this.generalSkillHit?.disableInteractive();

    const won = msg.includes("胜利");
    if (won) {
      this.resultText.setVisible(false);
      this.victoryModal = new VictoryModal(this, {
        clearedLevel: this.currentLevel,
        onHome: () => this.goHome(),
      });
      return;
    }

    resetProgressToLevel1();
    this.resultText.setText(msg).setVisible(true);
    this.time.delayedCall(1200, () => {
      if (this.scene.key !== "GameScene" || !this.gameOver) return;
      this.goHome();
    });
  }

  private resetRoundState(): void {
    this.cancelDragDeploy();
    this.clearEmptyFortSafetyTimer();
    this.clearCloudArrowBlueWave2Timer();
    this.hideCloudArrowQuote();
    this.hideEmptyFortQuote();
    this.victoryModal?.destroy();
    this.victoryModal = null;
    this.cardContainers = [];
    this.units = [];
    this.unitSprites.clear();
    this.nextUnitId = 1;
    this.redBaseHp = this.redBaseMaxHp;
    this.blueBaseHp = this.blueBaseMaxHp;
    this.enemyEmptyFortTriggered = false;
    this.redEnergy = MAX_ENERGY;
    this.blueEnergy = MAX_ENERGY;
    this.gameOver = false;
    this.draggingUnitId = null;
    this.dragGhost = null;
    this.dragHoverRect = null;
    this.deployHighlights = [];
    this.cloudArrowReady = true;
    this.burnBoatsCooldownSec = 0;
    this.burnBoatsActiveSec = 0;
    this.generalSkillId = null;
    this.generalSkillCooldownSec = 0;
    this.generalSkillBtnBg = null;
    this.generalSkillLabel = null;
    this.generalSkillHit = null;
    this.generalSkillCooldownGfx = null;
    this.cloudArrowBlueShieldIds.clear();
    this.cloudArrowBlueWave1Complete = false;
    this.cloudArrowBlueWave2Spawned = false;
    this.emptyFortActive = false;
    this.cloudArrowBlueWave2UnitIds.clear();
    this.generalMissStreak.clear();
    this.aiTimer = 0;
    this.tutorialShown = false;
    this.baseWalls = [];
    this.baseWallSprites.clear();
    this.nextWallId = 1;
  }
}
