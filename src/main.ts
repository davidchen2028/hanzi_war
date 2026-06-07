import Phaser from "phaser";
import { HomeScene } from "./scenes/HomeScene";
import { CharacterScene } from "./scenes/CharacterScene";
import { GameScene } from "./scenes/GameScene";

const GAME_WIDTH = 420;
const GAME_HEIGHT = 880;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#2a2a2a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [HomeScene, CharacterScene, GameScene],
});
