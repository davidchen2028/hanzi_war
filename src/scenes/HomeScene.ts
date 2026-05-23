import Phaser from "phaser";
import { loadSave, resetProgressToLevel1 } from "../services/saveService";

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: "HomeScene" });
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const progress = loadSave().maxLevelUnlocked;

    this.add
      .text(cx, cy - 72, "汉字攻防战", {
        fontSize: "26px",
        color: "#e0e0e0",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const boxW = 132;
    const boxH = 44;
    const box = this.add
      .rectangle(cx, cy, boxW, boxH, 0x2a2a2a)
      .setStrokeStyle(2, 0x66bb6a);

    this.add
      .text(cx, cy, `第 ${progress} 关`, {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    box.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      this.scene.start("GameScene", { level: progress });
    });

    const btnY = this.scale.height - 56;
    const resetBtnBg = this.add
      .rectangle(cx, btnY, 160, 40, 0x37474f)
      .setStrokeStyle(1, 0x78909c)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cx, btnY, "回到第一关", {
        fontSize: "15px",
        color: "#eceff1",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5);

    resetBtnBg.on("pointerdown", () => {
      resetProgressToLevel1();
      this.scene.restart();
    });
  }
}
