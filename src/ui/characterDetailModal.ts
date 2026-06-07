import Phaser from "phaser";
import type { UnitConfig } from "../types";

function roleLabel(role: UnitConfig["role"]): string {
  if (role === "tank") return "坦克";
  if (role === "ranged") return "远程";
  return "近战";
}

export class CharacterDetailModal {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, cfg: UnitConfig, onClose: () => void) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    this.container = scene.add.container(0, 0).setDepth(600);

    const mask = scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.6)
      .setInteractive();

    const panelW = 280;
    const panelH = 300;
    const panel = scene.add.graphics();
    panel.fillStyle(0x1e1e1e, 0.98);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
    panel.lineStyle(2, 0x555555, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);

    const avatarY = cy - 108;
    const avatarBg = scene.add
      .rectangle(cx, avatarY, 72, 72, 0x2a2a2a)
      .setStrokeStyle(2, 0x66bb6a);

    const avatarIcon = scene.add.text(cx, avatarY - 10, cfg.icon, { fontSize: "28px" }).setOrigin(0.5);

    const avatarChar = scene.add
      .text(cx, avatarY + 18, cfg.char, {
        fontSize: "26px",
        color: "#e53935",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const lines = [
      `生命值　${cfg.hp}`,
      `攻击力　${cfg.attack}`,
      `射程　　${cfg.attackRange} 格`,
      `移速　　${cfg.moveSpeed} 格/秒`,
      `攻速　　${cfg.attackInterval} 秒/次`,
      `费用　　${cfg.cost > 0 ? cfg.cost : "召唤"}`,
      `定位　　${roleLabel(cfg.role)}`,
    ];

    const statsText = scene.add
      .text(cx, cy + 20, lines.join("\n"), {
        fontSize: "14px",
        color: "#cccccc",
        fontFamily: "Noto Sans SC, sans-serif",
        align: "center",
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    const closeBtn = scene.add
      .rectangle(cx, cy + panelH / 2 - 36, 120, 36, 0x37474f)
      .setStrokeStyle(1, 0x78909c)
      .setInteractive({ useHandCursor: true });

    const closeLabel = scene.add
      .text(cx, cy + panelH / 2 - 36, "关闭", {
        fontSize: "15px",
        color: "#eceff1",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5);

    const close = () => {
      this.destroy();
      onClose();
    };

    mask.on("pointerdown", close);
    closeBtn.on("pointerdown", close);

    this.container.add([
      mask,
      panel,
      avatarBg,
      avatarIcon,
      avatarChar,
      statsText,
      closeBtn,
      closeLabel,
    ]);
  }

  destroy(): void {
    this.container.destroy();
  }
}
