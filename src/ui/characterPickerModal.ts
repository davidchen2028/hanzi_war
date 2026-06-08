import Phaser from "phaser";
import { UNIT_CONFIGS, CHARACTER_PICKER_POOL, getUnitDisplayName } from "../config/units";
import { getFragments, getFragmentsRequired, isUnitUnlocked } from "../services/fragmentService";

export interface CharacterPickerOptions {
  pool?: (string | null)[];
  title?: string;
}
import { bindSafeClick, deferInputAction } from "../utils/safeInput";

const PICKER_COLS = 4;
const PICKER_CELL = 58;
const PICKER_GAP = 8;

export class CharacterPickerModal {
  private container: Phaser.GameObjects.Container;
  private hintText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    onSelect: (unitId: string) => void,
    onClose: () => void,
    options?: CharacterPickerOptions
  ) {
    const pool = options?.pool ?? CHARACTER_PICKER_POOL;
    const pickerTitle = options?.title ?? "选择角色";
    const w = scene.scale.width;
    const h = scene.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    this.container = scene.add.container(0, 0).setDepth(600);

    const mask = scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.6)
      .setInteractive();

    const panelW = 300;
    const panelH = 268;
    const panel = scene.add.graphics();
    panel.fillStyle(0x1e1e1e, 0.98);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
    panel.lineStyle(2, 0x555555, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);

    const title = scene.add
      .text(cx, cy - panelH / 2 + 28, pickerTitle, {
        fontSize: "20px",
        color: "#e0e0e0",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.hintText = scene.add
      .text(cx, cy + panelH / 2 - 22, "", {
        fontSize: "12px",
        color: "#ffab40",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5);

    const gridW = PICKER_COLS * PICKER_CELL + (PICKER_COLS - 1) * PICKER_GAP;
    const startX = cx - gridW / 2 + PICKER_CELL / 2;
    const startY = cy - panelH / 2 + 68 + PICKER_CELL / 2;
    const cells: Phaser.GameObjects.GameObject[] = [];

    pool.forEach((unitId, index) => {
      const col = index % PICKER_COLS;
      const row = Math.floor(index / PICKER_COLS);
      const x = startX + col * (PICKER_CELL + PICKER_GAP);
      const y = startY + row * (PICKER_CELL + PICKER_GAP);
      cells.push(...this.drawPickerCell(scene, x, y, unitId, onSelect));
    });

    const close = () => {
      deferInputAction(scene, () => {
        this.destroy();
        onClose();
      });
    };

    bindSafeClick(mask, scene, close);

    this.container.add([mask, panel, title, this.hintText, ...cells]);
  }

  private showHint(msg: string): void {
    if (!this.hintText) return;
    this.hintText.setText(msg);
    this.hintText.scene.time.delayedCall(2000, () => {
      if (this.hintText?.active) this.hintText.setText("");
    });
  }

  private drawPickerCell(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    unitId: string | null,
    onSelect: (unitId: string) => void
  ): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];

    if (!unitId) {
      const bg = scene.add
        .rectangle(cx, cy, PICKER_CELL, PICKER_CELL, 0x141414)
        .setStrokeStyle(2, 0x333333);
      items.push(bg);
      items.push(
        scene.add
          .text(cx, cy - 6, "?", { fontSize: "22px", color: "#444444" })
          .setOrigin(0.5)
      );
      items.push(
        scene.add
          .text(cx, cy + 18, "待加入", {
            fontSize: "10px",
            color: "#555555",
            fontFamily: "Noto Sans SC, sans-serif",
          })
          .setOrigin(0.5)
      );
      return items;
    }

    const cfg = UNIT_CONFIGS[unitId];
    const isGeneral = cfg.kind === "general";
    const displayName = getUnitDisplayName(unitId);
    const required = getFragmentsRequired(unitId);
    const owned = getFragments(unitId);
    const unlocked = isUnitUnlocked(unitId);
    const hasFragmentGate = required !== null;

    const bg = scene.add
      .rectangle(
        cx,
        cy,
        PICKER_CELL,
        PICKER_CELL,
        unlocked ? (isGeneral ? 0x3d1f1f : 0x243d24) : 0x1a1a1a
      )
      .setStrokeStyle(2, unlocked ? (isGeneral ? 0xe53935 : 0x66bb6a) : 0x444444);

    items.push(bg);
    items.push(
      scene.add
        .text(cx, cy - 16, cfg.icon, { fontSize: "20px", color: unlocked ? "#ffffff" : "#666666" })
        .setOrigin(0.5)
    );
    items.push(
      scene.add
        .text(cx, cy + 2, displayName, {
          fontSize: displayName.length > 2 ? "11px" : "15px",
          color: unlocked ? "#ff5252" : "#666666",
          fontFamily: "Noto Sans SC, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
    );
    if (isGeneral) {
      items.push(
        scene.add
          .text(cx, cy - 28, "将领", {
            fontSize: "9px",
            color: unlocked ? "#e57373" : "#555555",
            fontFamily: "Noto Sans SC, sans-serif",
          })
          .setOrigin(0.5)
      );
    }

    if (hasFragmentGate) {
      items.push(
        scene.add
          .text(cx, cy + 20, `${owned}/${required}`, {
            fontSize: "11px",
            color: unlocked ? "#a5d6a7" : "#888888",
            fontFamily: "Noto Sans SC, sans-serif",
          })
          .setOrigin(0.5)
      );
    }

    if (unlocked) {
      bg.setInteractive({ useHandCursor: true });
      bindSafeClick(bg, scene, () => onSelect(unitId));
    } else if (hasFragmentGate) {
      bg.setInteractive({ useHandCursor: true });
      bindSafeClick(bg, scene, () => {
        this.showHint(`需集齐 ${required} 片碎片才可出战`);
      });
    }

    return items;
  }

  destroy(): void {
    for (const child of [...this.container.list]) {
      const go = child as Phaser.GameObjects.GameObject;
      if (go.input) go.disableInteractive();
    }
    this.container.destroy(true);
  }
}
