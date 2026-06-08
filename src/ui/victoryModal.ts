import Phaser from "phaser";
import { grantLevelClearRewards } from "../services/fragmentService";
import { saveProgress } from "../services/saveService";
import { bindSafeClick } from "../utils/safeInput";

export interface VictoryModalOptions {
  clearedLevel: number;
  onHome: () => void;
}

export class VictoryModal {
  private container: Phaser.GameObjects.Container;
  private saveBtnLabel: Phaser.GameObjects.Text;
  private mask: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, private options: VictoryModalOptions) {
    // 通关即写入进度，避免未点「保存」时首页仍显示上一关
    const saved = saveProgress(options.clearedLevel);
    const fragmentRewards = grantLevelClearRewards(options.clearedLevel);

    const w = scene.scale.width;
    const h = scene.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    this.container = scene.add.container(0, 0).setDepth(600);

    this.mask = scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.55)
      .setInteractive();

    const panelW = 260;
    const panelH = fragmentRewards.length > 0 ? 228 : 200;
    const panel = scene.add.graphics();
    panel.fillStyle(0x1e1e1e, 0.98);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
    panel.lineStyle(2, 0x444444, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);

    const title = scene.add
      .text(cx, cy - 52, "胜利", {
        fontSize: "32px",
        color: "#ffeb3b",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const sub = scene.add
      .text(cx, cy - 18, `第 ${options.clearedLevel} 关`, {
        fontSize: "14px",
        color: "#aaaaaa",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5);

    const rewardY = cy + 8;
    const rewardText =
      fragmentRewards.length > 0
        ? scene.add
            .text(cx, rewardY, fragmentRewards.map((r) => r.label).join("  "), {
              fontSize: "13px",
              color: "#ce93d8",
              fontFamily: "Noto Sans SC, sans-serif",
            })
            .setOrigin(0.5)
        : null;

    const saveBtnY = fragmentRewards.length > 0 ? cy + 44 : cy + 28;
    const homeBtnY = fragmentRewards.length > 0 ? cy + 94 : cy + 78;

    const saveBtnBg = scene.add
      .rectangle(cx, saveBtnY, 168, 40, 0x2e7d32)
      .setStrokeStyle(1, 0x66bb6a)
      .setInteractive({ useHandCursor: true });

    this.saveBtnLabel = scene.add
      .text(cx, saveBtnY, saved ? "已保存" : "保存", {
        fontSize: "16px",
        color: saved ? "#a5d6a7" : "#ffffff",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    bindSafeClick(saveBtnBg, scene, () => this.onSave());

    const homeBtnBg = scene.add
      .rectangle(cx, homeBtnY, 168, 40, 0x37474f)
      .setStrokeStyle(1, 0x78909c)
      .setInteractive({ useHandCursor: true });

    const homeBtnLabel = scene.add
      .text(cx, homeBtnY, "首页", {
        fontSize: "16px",
        color: "#eceff1",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    bindSafeClick(homeBtnBg, scene, options.onHome);

    this.container.add([
      this.mask,
      panel,
      title,
      sub,
      ...(rewardText ? [rewardText] : []),
      saveBtnBg,
      this.saveBtnLabel,
      homeBtnBg,
      homeBtnLabel,
    ]);
  }

  private onSave(): void {
    const ok = saveProgress(this.options.clearedLevel);
    this.saveBtnLabel.setText(ok ? "已保存" : "保存失败");
    this.saveBtnLabel.setColor(ok ? "#a5d6a7" : "#ef9a9a");
  }

  destroy(): void {
    this.mask.disableInteractive();
    this.container.destroy(true);
  }
}
