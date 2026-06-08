import Phaser from "phaser";

/** 场景进入时重置输入，避免上一场景遗留的 pointer / topOnly 导致按钮偶发失效 */
export function resetInputState(scene: Phaser.Scene): void {
  scene.input.setTopOnly(false);
  const pointers = scene.input.manager?.pointers;
  if (!pointers) return;
  for (const pointer of pointers) {
    pointer.active = false;
    pointer.isDown = false;
  }
}

/** 在 pointer 事件结束后再执行（销毁弹窗、切场景等） */
export function deferInputAction(scene: Phaser.Scene, action: () => void): void {
  scene.time.delayedCall(0, action);
}

export interface BindSafeClickOptions {
  /**
   * 悬停时每帧检测按下并立即触发（仅建议战斗 HUD 技能键使用）。
   * 弹窗/菜单默认关闭，避免短按被吞、需长按才响应。
   */
  hoverPoll?: boolean;
}

/**
 * 绑定按钮点击。
 * - 默认：pointerup 触发（适合弹窗、菜单，轻点即响应）
 * - hoverPoll：悬停时轮询按下 + pointerdown 即时触发（战斗技能键）
 */
export function bindSafeClick(
  target: Phaser.GameObjects.GameObject,
  scene: Phaser.Scene,
  action: () => void,
  options?: BindSafeClickOptions
): void {
  const hoverPoll = options?.hoverPoll ?? false;
  let hovering = false;
  let pointerWasDown = false;
  let firedThisPress = false;

  const runAction = () => deferInputAction(scene, action);

  const isTargetClickable = () => {
    if (!target.active) return false;
    const input = (target as Phaser.GameObjects.GameObject & { input?: { enabled: boolean } }).input;
    return !input || input.enabled;
  };

  const tryFire = (event?: Phaser.Types.Input.EventData) => {
    if (firedThisPress || !isTargetClickable()) return;
    firedThisPress = true;
    event?.stopPropagation();
    runAction();
  };

  const releasePress = () => {
    firedThisPress = false;
    pointerWasDown = false;
  };

  const pollHoverPress = () => {
    if (!hovering || !isTargetClickable()) return;
    const isDown = scene.input.activePointer.isDown;
    if (isDown && !pointerWasDown) tryFire();
    if (!isDown) firedThisPress = false;
    pointerWasDown = isDown;
  };

  const startHoverPoll = () => {
    if (!hoverPoll || hovering) return;
    hovering = true;
    pointerWasDown = scene.input.activePointer.isDown;
    scene.events.on(Phaser.Scenes.Events.UPDATE, pollHoverPress);
  };

  const stopHoverPoll = () => {
    if (!hovering) return;
    hovering = false;
    releasePress();
    scene.events.off(Phaser.Scenes.Events.UPDATE, pollHoverPress);
  };

  if (hoverPoll) {
    target.on(Phaser.Input.Events.POINTER_OVER, startHoverPoll);
    target.on(Phaser.Input.Events.POINTER_OUT, stopHoverPoll);
    target.once(Phaser.GameObjects.Events.DESTROY, stopHoverPoll);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stopHoverPoll);

    target.on(
      Phaser.Input.Events.POINTER_DOWN,
      (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        pointerWasDown = true;
        tryFire(event);
      }
    );
  }

  target.on(
    Phaser.Input.Events.POINTER_UP,
    (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!hoverPoll) {
        tryFire(event);
      }
      releasePress();
    }
  );
}
