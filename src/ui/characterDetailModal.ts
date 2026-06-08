import Phaser from "phaser";
import type { UnitConfig } from "../types";
import { bindSafeClick, deferInputAction } from "../utils/safeInput";

function roleLabel(role: UnitConfig["role"]): string {
  if (role === "tank") return "坦克";
  if (role === "ranged") return "远程";
  return "近战";
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function buildStatLines(cfg: UnitConfig): string[] {
  const isGeneral = cfg.kind === "general";
  const lines = [
    `生命值　${cfg.hp}`,
    `攻击力　${cfg.attack}`,
    `射程　　${cfg.attackRange} 格`,
    `移速　　${cfg.moveSpeed} 格/秒`,
    `攻速　　${cfg.attackInterval} 秒/次`,
  ];

  if (isGeneral) {
    if (cfg.weaponLabel) {
      lines.push(`武器　　${cfg.weaponLabel}（${cfg.icon}）`);
    }
    if (cfg.critRate !== undefined) {
      lines.push(`暴击率　${pct(cfg.critRate)}（双倍伤害）`);
    }
    if (cfg.missRate !== undefined) {
      lines.push(`未命中率　${pct(cfg.missRate)}`);
    }
    if (cfg.activeSkill) {
      const sk = cfg.activeSkill;
      const skillTitle = sk.skillIcon ? `${sk.skillIcon} ${sk.name}` : sk.name;
      lines.push(`主动技能　${skillTitle}`);
      lines.push(`　　发射手指，以最近敌人为中心 ${sk.areaSize}×${sk.areaSize} 格`);
      lines.push(`　　造成 ${sk.baseDamage} 点伤害`);
      lines.push(
        `　　${pct(sk.doubleChanceMin)}~${pct(sk.doubleChanceMax)} 概率伤害翻倍`
      );
      lines.push(`　　冷却　${sk.cooldownSec} 秒`);
      if (!sk.implemented) {
        lines.push(`　　（战斗中尚未实装）`);
      }
    }
    lines.push(`定位　　将领`);
  } else {
    lines.push(`费用　　${cfg.cost > 0 ? cfg.cost : "召唤"}`);
    lines.push(`定位　　${roleLabel(cfg.role)}`);
  }

  return lines;
}

export class CharacterDetailModal {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, cfg: UnitConfig, onClose: () => void) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const cx = w / 2;
    const cy = h / 2;
    const isGeneral = cfg.kind === "general";
    const displayName = cfg.name ?? cfg.char;
    const lines = buildStatLines(cfg);
    const lineCount = lines.length;

    const panelW = 280;
    const panelH = isGeneral ? 56 + lineCount * 22 + 52 : 300;

    this.container = scene.add.container(0, 0).setDepth(600);

    const mask = scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.6)
      .setInteractive();

    const panel = scene.add.graphics();
    panel.fillStyle(0x1e1e1e, 0.98);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
    panel.lineStyle(2, isGeneral ? 0xe53935 : 0x555555, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);

    const avatarY = cy - panelH / 2 + 56;
    const avatarBg = scene.add
      .rectangle(cx, avatarY, 72, 72, 0x2a2a2a)
      .setStrokeStyle(2, isGeneral ? 0xe53935 : 0x66bb6a);

    const avatarIcon = scene.add.text(cx, avatarY - 10, cfg.icon, { fontSize: "28px" }).setOrigin(0.5);

    const avatarChar = scene.add
      .text(cx, avatarY + (isGeneral ? 8 : 18), isGeneral ? displayName : cfg.char, {
        fontSize: isGeneral ? "16px" : "26px",
        color: "#e53935",
        fontFamily: "Noto Sans SC, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const statsY = isGeneral ? avatarY + 58 : cy + 20;
    const statsText = scene.add
      .text(cx, statsY, lines.join("\n"), {
        fontSize: "14px",
        color: "#cccccc",
        fontFamily: "Noto Sans SC, sans-serif",
        align: "center",
        lineSpacing: 6,
      })
      .setOrigin(0.5, isGeneral ? 0 : 0.5);

    const closeBtnY = cy + panelH / 2 - 36;
    const closeBtn = scene.add
      .rectangle(cx, closeBtnY, 120, 36, 0x37474f)
      .setStrokeStyle(1, 0x78909c)
      .setInteractive({ useHandCursor: true });

    const closeLabel = scene.add
      .text(cx, closeBtnY, "关闭", {
        fontSize: "15px",
        color: "#eceff1",
        fontFamily: "Noto Sans SC, sans-serif",
      })
      .setOrigin(0.5);

    const close = () => {
      deferInputAction(scene, () => {
        this.destroy();
        onClose();
      });
    };

    bindSafeClick(mask, scene, close);
    bindSafeClick(closeBtn, scene, close);

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
    for (const child of [...this.container.list]) {
      const go = child as Phaser.GameObjects.GameObject;
      if (go.input) go.disableInteractive();
    }
    this.container.destroy(true);
  }
}
