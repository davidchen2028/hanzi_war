import Phaser from "phaser";
import { UNIT_CONFIGS, CHARACTER_ROSTER } from "../config/units";
import { CharacterDetailModal } from "../ui/characterDetailModal";

const UI_DEPTH = 100;
const GRID_COLS = 4;
const CELL_SIZE = 82;
const CELL_GAP = 10;
const GENERAL_SLOT_SIZE = 120;

/** 角色页：出战角色 8 格方阵 */
export class CharacterScene extends Phaser.Scene {
  private detailModal: CharacterDetailModal | null = null;

  constructor() {
    super({ key: "CharacterScene" });
  }

  create(): void {
    this.input.setTopOnly(false);
    this.detailModal = null;

    const w = this.scale.width;

    this.add
      .text(w / 2, 36, "角色", {
        fontSize: "22px",
        color: "#888888",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);

    this.add
      .text(w / 2, 72, "出战角色", {
        fontSize: "26px",
        color: "#e0e0e0",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);

    const gridW = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
    const startX = (w - gridW) / 2 + CELL_SIZE / 2;
    const startY = 108 + CELL_SIZE / 2;

    CHARACTER_ROSTER.forEach((unitId, index) => {
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      const x = startX + col * (CELL_SIZE + CELL_GAP);
      const y = startY + row * (CELL_SIZE + CELL_GAP);
      this.drawRosterCell(x, y, unitId);
    });

    const gridBottomY = startY + CELL_SIZE / 2 + (CELL_SIZE + CELL_GAP);
    const generalTitleY = gridBottomY + 36;

    this.add
      .text(w / 2, generalTitleY, "出战将领", {
        fontSize: "22px",
        color: "#e53935",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);

    this.drawGeneralSlot(w / 2, generalTitleY + 28 + GENERAL_SLOT_SIZE / 2);

    this.createCloseButton(w - 28, 28, () => {
      this.closeModal();
      this.scene.start("HomeScene");
    });
  }

  private createCloseButton(x: number, y: number, onClick: () => void): void {
    const size = 36;
    const bg = this.add
      .rectangle(x, y, size, size, 0x37474f, 0.9)
      .setStrokeStyle(1, 0x78909c)
      .setInteractive({ useHandCursor: true })
      .setDepth(UI_DEPTH + 2);

    this.add
      .text(x, y, "×", {
        fontSize: "26px",
        color: "#eceff1",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 3);

    bg.on("pointerdown", (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onClick();
    });
  }

  private drawGeneralSlot(cx: number, cy: number): void {
    this.add
      .rectangle(cx, cy, GENERAL_SLOT_SIZE, GENERAL_SLOT_SIZE, 0x1a1a1a)
      .setStrokeStyle(3, 0xe53935)
      .setDepth(UI_DEPTH);

    this.add
      .text(cx, cy - 10, "?", {
        fontSize: "36px",
        color: "#444444",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    this.add
      .text(cx, cy + 32, "空位", {
        fontSize: "13px",
        color: "#666666",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);
  }

  private drawRosterCell(cx: number, cy: number, unitId: string | null): void {
    const bg = this.add
      .rectangle(cx, cy, CELL_SIZE, CELL_SIZE, unitId ? 0x243d24 : 0x1a1a1a)
      .setStrokeStyle(2, unitId ? 0x66bb6a : 0x333333)
      .setDepth(UI_DEPTH);

    if (!unitId) {
      this.add
        .text(cx, cy - 8, "?", {
          fontSize: "28px",
          color: "#444444",
          fontFamily: "Noto Sans SC, sans-serif",
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH + 1);

      this.add
        .text(cx, cy + 22, "空位", {
          fontSize: "12px",
          color: "#555555",
          fontFamily: "Noto Sans SC, sans-serif",
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH + 1);
      return;
    }

    const cfg = UNIT_CONFIGS[unitId];

    const charStyle = {
      fontSize: "16px",
      color: "#ff5252",
      fontFamily: "Noto Sans SC, sans-serif",
      fontStyle: "bold" as const,
    };

    this.add
      .text(cx, cy - 14, cfg.icon, { fontSize: "26px" })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    this.add
      .text(cx, cy + 20, cfg.char, charStyle)
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    bg.setInteractive({ useHandCursor: true }).on(
      "pointerdown",
      (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.openDetail(cfg);
      }
    );
  }

  private openDetail(cfg: (typeof UNIT_CONFIGS)[string]): void {
    this.closeModal();
    this.detailModal = new CharacterDetailModal(this, cfg, () => {
      this.detailModal = null;
    });
  }

  private closeModal(): void {
    this.detailModal?.destroy();
    this.detailModal = null;
  }

  shutdown(): void {
    this.closeModal();
  }

}
