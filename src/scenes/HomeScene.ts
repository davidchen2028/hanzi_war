import Phaser from "phaser";
import { clearAllSave, loadSave } from "../services/saveService";
import { bindSafeClick, resetInputState } from "../utils/safeInput";

const UI_DEPTH = 100;

export class HomeScene extends Phaser.Scene {
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private readonly onSpaceStart = (): void => this.startCurrentLevel();

  constructor() {
    super({ key: "HomeScene" });
  }

  init(): void {
    resetInputState(this);
  }

  create(): void {
    resetInputState(this);

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
      this.startCurrentLevel();
    });

    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) ?? null;
    this.spaceKey?.on("down", this.onSpaceStart);

    this.add
      .text(cx, cy + 40, "点击方框或按空格开始", {
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
      "清除存档",
      0x37474f,
      0x78909c,
      () => {
        if (!clearAllSave()) return;
        this.scene.stop("CharacterScene");
        this.scene.stop("GameScene");
        this.scene.restart();
      }
    );
  }

  shutdown(): void {
    this.spaceKey?.off("down", this.onSpaceStart);
    this.spaceKey = null;
  }

  private startCurrentLevel(): void {
    const progress = loadSave().maxLevelUnlocked;
    this.scene.start("GameScene", { level: progress });
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
    const container = this.add.container(x, y).setDepth(UI_DEPTH);

    const bg = this.add
      .rectangle(0, 0, w, h, fill)
      .setStrokeStyle(2, stroke);

    const text = this.add
      .text(0, 0, label, {
        fontSize: label.length > 6 ? "15px" : "18px",
        color: "#ffffff",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );

    if (container.input) {
      container.input.cursor = "pointer";
    }

    bindSafeClick(container, this, onClick);
  }
}
