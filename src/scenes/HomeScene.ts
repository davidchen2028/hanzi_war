import Phaser from "phaser";
import { loadSave, resetProgressToLevel1 } from "../services/saveService";

const UI_DEPTH = 100;

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: "HomeScene" });
  }

  create(): void {
    // GameScene 会开启 setTopOnly，返回首页必须关闭，否则按钮点不到
    this.input.setTopOnly(false);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const progress = loadSave().maxLevelUnlocked;

    this.createButton(52, 28, 72, 36, "角色", 0x3d2c5a, 0x9c7bd8, () => {
      this.scene.start("CharacterScene");
    });

    this.add
      .text(cx, cy - 72, "汉字攻防战", {
        fontSize: "26px",
        color: "#e0e0e0",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);

    this.createButton(cx, cy, 132, 44, `第 ${progress} 关`, 0x2a2a2a, 0x66bb6a, () => {
      this.scene.start("GameScene", { level: progress });
    });

    this.add
      .text(cx, cy + 40, "点击方框开始游戏", {
        fontSize: "12px",
        color: "#888888",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);

    this.createButton(
      cx,
      this.scale.height - 56,
      160,
      40,
      "回到第一关",
      0x37474f,
      0x78909c,
      () => {
        resetProgressToLevel1();
        this.scene.restart();
      }
    );
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    fill: number,
    stroke: number,
    onClick: () => void
  ): void {
    const bg = this.add
      .rectangle(x, y, w, h, fill)
      .setStrokeStyle(2, stroke)
      .setInteractive({ useHandCursor: true })
      .setDepth(UI_DEPTH);

    this.add
      .text(x, y, label, {
        fontSize: label.length > 6 ? "15px" : "18px",
        color: "#ffffff",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);

    bg.on("pointerdown", (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onClick();
    });
  }
}
