import Phaser from "phaser";
import {
  COLS,
  ROWS,
  RED_BASE,
  BLUE_BASE,
  RED_DEPLOY_MIN_ROW,
  RED_DEPLOY_MAX_ROW,
  BLUE_SPAWN_ROW,
  PLAY_COL_MIN,
  PLAY_COL_MAX,
  DEPLOY_COL_MIN,
  DEPLOY_COL_MAX,
  isBorderWall,
  isDeployColumn,
  isInnerColumn,
  isBaseCell,
  isPlayColumn,
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
  BASE_MAX_HP,
  MAX_ENERGY,
  ENERGY_REGEN,
  CLOUD_ARROW_DAMAGE,
  CLOUD_ARROW_COOLDOWN,
} from "../config/units";
import type { Side, UnitState, BaseWallState } from "../types";

const CELL = 44;
const BOARD_X = 12;
const BOARD_Y = 16;
const HUD_Y = BOARD_Y + ROWS * CELL + 14;
const HUD_DEPTH = 200;
const BOARD_DEPTH = 10;

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

  private redEnergy = MAX_ENERGY;
  private blueEnergy = MAX_ENERGY;
  private redBaseHp = BASE_MAX_HP;
  private blueBaseHp = BASE_MAX_HP;

  private draggingUnitId: string | null = null;
  private dragGhost: Phaser.GameObjects.Text | null = null;
  private dragHoverRect: Phaser.GameObjects.Rectangle | null = null;
  private deployHighlights: Phaser.GameObjects.Rectangle[] = [];
  private cloudArrowReady = true;
  private cloudArrowTimer = 0;
  private skillCooldownGfx!: Phaser.GameObjects.Graphics;
  private skillBtnBg!: Phaser.GameObjects.Rectangle;
  private boardZone!: Phaser.GameObjects.Zone;

  private energyText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Graphics;
  private cardContainers: Phaser.GameObjects.Container[] = [];
  private nextCardText!: Phaser.GameObjects.Text;
  private dialogueBubble!: Phaser.GameObjects.Container;
  private resultText!: Phaser.GameObjects.Text;

  private baseWalls: BaseWallState[] = [];
  private baseWallSprites = new Map<string, Phaser.GameObjects.Container>();
  private nextWallId = 1;

  private aiTimer = 0;
  private tutorialShown = false;
  private gameOver = false;

  constructor() {
    super({ key: "GameScene" });
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

    this.dialogueBubble.setDepth(HUD_DEPTH - 1);

    this.time.delayedCall(1500, () => {
      if (!this.tutorialShown) {
        this.showDialogue("快看，敌方的小兵要冲过来了。");
        this.tutorialShown = true;
        this.spawnUnit("blue", "bing", PLAY_COL_MAX, BLUE_SPAWN_ROW);
      }
    });

    this.time.delayedCall(8000, () => this.hideDialogue());
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = delta / 1000;

    this.redEnergy = Math.min(MAX_ENERGY, this.redEnergy + ENERGY_REGEN * dt);
    this.blueEnergy = Math.min(MAX_ENERGY, this.blueEnergy + ENERGY_REGEN * dt);
    this.updateEnergyUI();

    if (!this.cloudArrowReady) {
      this.cloudArrowTimer -= dt;
      if (this.cloudArrowTimer <= 0) {
        this.cloudArrowReady = true;
        this.cloudArrowTimer = 0;
      }
    }
    this.updateSkillCooldownUI();

    this.updateUnits(dt);
    this.updateAI(dt);
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
    const riverLeft = BOARD_X + PLAY_COL_MIN * CELL;
    const riverW = CELL * (PLAY_COL_MAX - PLAY_COL_MIN + 1);
    g.fillStyle(0x2e3d4a, 0.85);
    g.fillRect(riverLeft, riverTop, riverW, riverH);
    for (const r of RIVER_ROWS) {
      for (let c = PLAY_COL_MIN; c <= PLAY_COL_MAX; c++) {
        const x = BOARD_X + c * CELL;
        const y = BOARD_Y + r * CELL;
        g.lineStyle(1, 0x3d5266, 0.5);
        g.strokeRect(x, y, CELL, CELL);
      }
    }

    const riverMidY = BOARD_Y + (RIVER_ROWS[0] + RIVER_ROWS.length / 2) * CELL;
    this.add
      .text(riverLeft + CELL * 0.55, riverMidY, "楚河", {
        fontSize: "17px",
        color: "#7a9ab0",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(riverLeft + riverW - CELL * 0.55, riverMidY, "汉界", {
        fontSize: "17px",
        color: "#7a9ab0",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5);

    this.drawPalaceLines(PLAY_COL_MIN, 9, PLAY_COL_MAX, 10);
    this.drawPalaceLines(PLAY_COL_MIN, 1, PLAY_COL_MAX, 2);
  }

  private drawPalaceLines(c0: number, r0: number, c1: number, r1: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x555555, 0.5);
    const x0 = BOARD_X + c0 * CELL;
    const y0 = BOARD_Y + r0 * CELL;
    const x1 = BOARD_X + (c1 + 1) * CELL;
    const y1 = BOARD_Y + (r1 + 1) * CELL;
    g.lineBetween(x0, y0, x1, y1);
    g.lineBetween(x1, y0, x0, y1);
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
      .text(0, -2, "墙", {
        fontSize: "18px",
        color,
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hpBarBg = this.add.rectangle(0, 14, 24, 3, 0x333333);
    const hpBar = this.add.rectangle(0, 14, 24, 3, wall.side === "red" ? 0xe53935 : 0x1e88e5);

    container.add([charText, hpBarBg, hpBar]);
    container.setData("hpBar", hpBar);
    container.setData("maxHp", wall.maxHp);

    this.baseWallSprites.set(wall.id, container);
  }

  private updateBaseWallHpBar(wall: BaseWallState): void {
    const sprite = this.baseWallSprites.get(wall.id);
    if (!sprite) return;
    const hpBar = sprite.getData("hpBar") as Phaser.GameObjects.Rectangle;
    const ratio = Math.max(0, wall.hp / wall.maxHp);
    hpBar.width = 24 * ratio;
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
    const redColor = "#e53935";
    const blueColor = "#1e88e5";

    this.addBaseLabel(RED_BASE.col, RED_BASE.row, "大本营", redColor);
    this.addBaseLabel(BLUE_BASE.col, BLUE_BASE.row, "大本营", blueColor);
  }

  private createBoardInputZone(): void {
    this.boardZone = this.add
      .zone(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL)
      .setOrigin(0)
      .setDepth(BOARD_DEPTH + 4);
  }

  private addBaseLabel(col: number, row: number, text: string, color: string): void {
    this.add
      .text(BOARD_X + col * CELL + CELL / 2, BOARD_Y + row * CELL + CELL / 2, text, {
        fontSize: "18px",
        color,
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  // ─── HUD ─────────────────────────────────────────────────

  private createHUD(): void {
    const skillX = BOARD_X;
    const skillY = HUD_Y;

    this.skillBtnBg = this.add
      .rectangle(skillX + 30, skillY + 34, 60, 68, 0x333333)
      .setStrokeStyle(2, 0xff9800)
      .setDepth(HUD_DEPTH);

    this.add
      .text(skillX + 30, skillY + 22, "穿云箭", {
        fontSize: "13px",
        color: "#ff9800",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH + 1);

    this.skillCooldownGfx = this.add.graphics().setDepth(HUD_DEPTH + 2);

    const skillHit = this.add
      .rectangle(skillX + 30, skillY + 34, 60, 68, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(HUD_DEPTH + 3);

    skillHit.on("pointerdown", () => this.fireCloudArrow());

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

  private updateSkillCooldownUI(): void {
    const x = BOARD_X + 4;
    const y = HUD_Y + 58;
    const w = 52;
    const h = 6;

    this.skillCooldownGfx.clear();
    this.skillCooldownGfx.fillStyle(0x222222, 1);
    this.skillCooldownGfx.fillRect(x, y, w, h);

    if (this.cloudArrowReady) {
      this.skillCooldownGfx.fillStyle(0xff9800, 1);
      this.skillCooldownGfx.fillRect(x, y, w, h);
      this.skillBtnBg.setAlpha(1);
      return;
    }

    const ratio = 1 - this.cloudArrowTimer / CLOUD_ARROW_COOLDOWN;
    this.skillCooldownGfx.fillStyle(0xff9800, 1);
    this.skillCooldownGfx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
    this.skillBtnBg.setAlpha(0.55);
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
      .text(34, 30, char, { fontSize: "30px", color: "#e53935", fontFamily: "Noto Sans SC, sans-serif", fontStyle: "bold" })
      .setOrigin(0.5);
    const iconText = this.add.text(50, 46, icon, { fontSize: "14px" }).setOrigin(0.5);
    const costText = this.add
      .text(52, 72, `${cost}`, { fontSize: "14px", color: "#fff", fontFamily: "Noto Sans SC, sans-serif" })
      .setOrigin(0.5);

    container.add([bg, charText, iconText, costText]);
    container.setData("unitId", id);
    container.setData("bg", bg);

    const hit = this.add
      .rectangle(x + 34, y + 42, 68, 84, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(HUD_DEPTH + 3);

    hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver || this.redEnergy < UNIT_CONFIGS[id].cost) return;
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

  private updateCardUI(): void {
    this.cardContainers.forEach((card) => {
      const id = card.getData("unitId") as string;
      const cfg = UNIT_CONFIGS[id];
      const affordable = this.redEnergy >= cfg.cost && !this.gameOver;
      card.setAlpha(affordable ? 1 : 0.45);
      const bg = card.getData("bg") as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, this.draggingUnitId === id ? 0xffff00 : COLORS.deploy);
    });
  }

  // ─── Dialogue & Result ───────────────────────────────────

  private createDialogue(): void {
    this.dialogueBubble = this.add.container(BOARD_X + 20, BOARD_Y + 6 * CELL).setVisible(false);

    const bubble = this.add.graphics();
    bubble.fillStyle(0xffffff, 0.95);
    bubble.fillRoundedRect(0, 0, 260, 48, 8);

    const text = this.add.text(12, 12, "", {
      fontSize: "13px",
      color: "#333",
      fontFamily: "Noto Sans SC, sans-serif",
      wordWrap: { width: 236 },
    });

    this.dialogueBubble.add([bubble, text]);
    this.dialogueBubble.setData("textObj", text);
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
      if (this.redEnergy >= cfg.cost) {
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

  private spawnUnit(side: Side, configId: string, col: number, row: number): void {
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
          target.hp -= cfg.attack;
          unit.attackTimer = cfg.attackInterval;
          this.flashDamage(target);
          if (target.hp <= 0) this.killUnit(target);
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
          wallTarget.hp -= cfg.attack;
          unit.attackTimer = cfg.attackInterval;
          this.flashBaseWall(wallTarget);
          this.updateBaseWallHpBar(wallTarget);
          if (wallTarget.hp <= 0) this.destroyBaseWall(wallTarget);
        }
        this.updateUnitHpBar(unit);
        continue;
      }

      // 攻击大本营（必须站在门口格）
      if (canAttackEnemyBase(unit.col, unit.row, unit.side, (c, r) => this.gateWallIntact(c, r))) {
        if (unit.attackTimer <= 0) {
          if (unit.side === "red") {
            this.blueBaseHp -= cfg.attack;
            this.flashBase("blue");
          } else {
            this.redBaseHp -= cfg.attack;
            this.flashBase("red");
          }
          unit.attackTimer = cfg.attackInterval;
        }
        continue;
      }

      // 移动：moveSpeed = 每秒前进的格数
      unit.moveTimer += dt;
      const stepInterval = 1 / cfg.moveSpeed;
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

  private fireCloudArrow(): void {
    if (!this.cloudArrowReady || this.gameOver) return;

    const targets = this.units.filter((u) => u.hp > 0 && u.side === "blue");
    for (const t of targets) {
      t.hp -= CLOUD_ARROW_DAMAGE;
      this.flashDamage(t);
      if (t.hp <= 0) this.killUnit(t);
    }

    for (const wall of this.baseWalls) {
      if (wall.hp <= 0 || wall.side !== "blue") continue;
      wall.hp -= CLOUD_ARROW_DAMAGE;
      this.flashBaseWall(wall);
      this.updateBaseWallHpBar(wall);
      if (wall.hp <= 0) this.destroyBaseWall(wall);
    }

    this.cloudArrowReady = false;
    this.cloudArrowTimer = CLOUD_ARROW_COOLDOWN;
    this.updateSkillCooldownUI();

    const line = this.add.graphics().setDepth(BOARD_DEPTH + 50);
    line.lineStyle(3, 0xff9800, 1);
    line.lineBetween(BOARD_X, BOARD_Y, BOARD_X + COLS * CELL, BOARD_Y + ROWS * CELL);
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 400,
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

    for (let attempt = 0; attempt < 8; attempt++) {
      const col = DEPLOY_COL_MIN + Math.floor(Math.random() * (DEPLOY_COL_MAX - DEPLOY_COL_MIN + 1));
      if (this.isCellBlocked(col, BLUE_SPAWN_ROW) || this.getUnitAt(col, BLUE_SPAWN_ROW)) continue;

      this.blueEnergy -= cfg.cost;
      this.spawnUnit("blue", pick, col, BLUE_SPAWN_ROW);
      return;
    }
  }

  // ─── Win / Lose ──────────────────────────────────────────

  private checkWinLose(): void {
    if (this.blueBaseHp <= 0) this.endGame("胜利！");
    else if (this.redBaseHp <= 0) this.endGame("失败…");
  }

  private endGame(msg: string): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.cancelDragDeploy();
    this.boardZone.disableInteractive();
    this.resultText.setText(msg).setVisible(true);

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 50, "点击刷新重来", {
        fontSize: "14px",
        color: "#aaa",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(150)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => location.reload());
  }
}
