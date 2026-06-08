import Phaser from "phaser";
import { UNIT_CONFIGS, GENERAL_PICKER_POOL } from "../config/units";
import { isUnitUnlocked } from "../services/fragmentService";
import { loadGeneral, setGeneral } from "../services/generalService";
import { loadRoster, setRosterSlot } from "../services/rosterService";
import { CharacterDetailModal } from "../ui/characterDetailModal";
import { CharacterPickerModal } from "../ui/characterPickerModal";
import { bindSafeClick, deferInputAction, resetInputState } from "../utils/safeInput";

const UI_DEPTH = 100;
const GRID_COLS = 4;
const CELL_SIZE = 82;
const CELL_GAP = 10;
const GENERAL_SLOT_SIZE = 120;

/** 角色页：出战角色 8 格方阵 */
export class CharacterScene extends Phaser.Scene {
  private detailModal: CharacterDetailModal | null = null;
  private pickerModal: CharacterPickerModal | null = null;

  constructor() {
    super({ key: "CharacterScene" });
  }

  init(): void {
    resetInputState(this);
  }

  create(): void {
    resetInputState(this);
    this.closeAllModals();

    const w = this.scale.width;
    const roster = loadRoster();

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

    roster.forEach((unitId, index) => {
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      const x = startX + col * (CELL_SIZE + CELL_GAP);
      const y = startY + row * (CELL_SIZE + CELL_GAP);
      this.drawRosterCell(x, y, unitId, index);
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
      this.closeAllModals();
      this.scene.start("HomeScene");
    });
  }

  private createCloseButton(x: number, y: number, onClick: () => void): void {
    const size = 36;
    const container = this.add.container(x, y).setDepth(UI_DEPTH + 2);

    const bg = this.add
      .rectangle(0, 0, size, size, 0x37474f, 0.9)
      .setStrokeStyle(1, 0x78909c);

    const label = this.add
      .text(0, 0, "×", {
        fontSize: "26px",
        color: "#eceff1",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(size, size);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
      Phaser.Geom.Rectangle.Contains
    );
    if (container.input) container.input.cursor = "pointer";

    bindSafeClick(container, this, onClick);
  }

  private drawGeneralSlot(cx: number, cy: number): void {
    const generalId = loadGeneral();
    const bg = this.add
      .rectangle(cx, cy, GENERAL_SLOT_SIZE, GENERAL_SLOT_SIZE, generalId ? 0x3d1f1f : 0x1a1a1a)
      .setStrokeStyle(3, 0xe53935)
      .setDepth(UI_DEPTH);

    if (!generalId) {
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

      bg.setInteractive({ useHandCursor: true });
      bindSafeClick(bg, this, () => this.openGeneralPicker());
      return;
    }

    const cfg = UNIT_CONFIGS[generalId];
    const displayName = cfg.name ?? cfg.char;

    this.add
      .text(cx, cy - 22, cfg.icon, { fontSize: "30px" })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    this.add
      .text(cx, cy + 8, displayName, {
        fontSize: displayName.length > 2 ? "14px" : "18px",
        color: "#ff5252",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    this.add
      .text(cx, cy + 36, "将领", {
        fontSize: "11px",
        color: "#e57373",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    bg.setInteractive({ useHandCursor: true });
    bindSafeClick(bg, this, () => this.openDetail(cfg));
  }

  private drawRosterCell(cx: number, cy: number, unitId: string | null, slotIndex: number): void {
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

      bg.setInteractive({ useHandCursor: true });
      bindSafeClick(bg, this, () => this.openPicker(slotIndex));
      return;
    }

    const cfg = UNIT_CONFIGS[unitId];

    this.add
      .text(cx, cy - 14, cfg.icon, { fontSize: "26px" })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    this.add
      .text(cx, cy + 20, cfg.char, {
        fontSize: "16px",
        color: "#ff5252",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    bg.setInteractive({ useHandCursor: true });
    bindSafeClick(bg, this, () => this.openDetail(cfg));
  }

  private openGeneralPicker(): void {
    this.closeAllModals();
    this.pickerModal = new CharacterPickerModal(
      this,
      (unitId) => {
        if (!isUnitUnlocked(unitId)) return;
        setGeneral(unitId);
        deferInputAction(this, () => {
          this.closeAllModals();
          this.scene.restart();
        });
      },
      () => {
        this.pickerModal = null;
      },
      { pool: GENERAL_PICKER_POOL, title: "选择将领" }
    );
  }

  private openPicker(slotIndex: number): void {
    this.closeAllModals();
    this.pickerModal = new CharacterPickerModal(
      this,
      (unitId) => {
        if (!isUnitUnlocked(unitId)) return;
        setRosterSlot(slotIndex, unitId);
        deferInputAction(this, () => {
          this.closeAllModals();
          this.scene.restart();
        });
      },
      () => {
        this.pickerModal = null;
      }
    );
  }

  private openDetail(cfg: (typeof UNIT_CONFIGS)[string]): void {
    this.closeAllModals();
    this.detailModal = new CharacterDetailModal(this, cfg, () => {
      this.detailModal = null;
    });
  }

  private closeAllModals(): void {
    this.detailModal?.destroy();
    this.detailModal = null;
    this.pickerModal?.destroy();
    this.pickerModal = null;
  }

  shutdown(): void {
    this.closeAllModals();
    resetInputState(this);
  }
}
