import Sprite from "./Sprite.mjs";
import { isFiring } from "./keyboard.mjs";
import { updateShip, sprite, playerModifier } from "./player.mjs";
import {
    updateEnemies,
    checkEnemyCollisions,
    enemies,
    getLowestEnemy,
} from "./enemyManager.mjs";
import { getEnemyFireRate, getEnemyShotsPerFire } from "./level.mjs";
import { StatType, add, getCurrentPlayTime } from "./state.mjs";
import { playShotSound } from "./audio.mjs";
import { ModifierType } from "./modifier.mjs";

/** @typedef {import("./Sprite.mjs").SpriteInstance} SpriteInstance */

/** @type {SpriteInstance[]} */
export const playerShots = [];
let shotFiredTimestamp = 0;
/** @type {SpriteInstance[]} */
export const enemyShots = [];
let enemyShotFiredTimestamp = 0;
const enemyShotSpeed = 300;
/** @type {SpriteInstance[]} */
export const shields = [];

export function resetShots() {
    shotFiredTimestamp = 0;
    enemyShotFiredTimestamp = 0;
}

export function createShields() {
    // group x
    for (let g = 100; g < 500; g += 115) {
        // vertical
        for (let y = 445; y < 475; y += 10) {
            // horizontal
            for (let x = 0; x < 50; x += 10) {
                shields.push(new Sprite(g + x, y, 10, 10));
            }
        }
    }
}

/**
 * @description for removing all of the shots
 */
export function removeShots() {
    enemyShots.length = 0;
    playerShots.length = 0;
}

/**
 * @description get random enemy ids
 * @param {number} max max id
 * @param {number} qty number of ids
 * @param {number[]} ids ids
 * @returns {number[]} ids
 */
function getRandomEnemyIds(max, qty) {
    const ids = new Set();
    for (let i = 0; i < qty; i += 1) {
        const id = Math.floor(Math.random() * max);
        ids.add(id);
    }
    return ids;
}

function updateShields() {
    if (!shields.length) return;
    const lowestEnemy = getLowestEnemy();
    const lowEnemies = [];
    if (lowestEnemy > 445) {
        lowEnemies.push(...enemies.filter((e) => e.getBottom() >= lowestEnemy));
    }
    for (let i = shields.length - 1; i >= 0; i -= 1) {
        let hasHit = false;
        if (lowEnemies.length) {
            for (let e = 0; e < lowEnemies.length; e += 1) {
                hasHit = shields[i].hasCollision(lowEnemies[e]);
                if (hasHit) break;
            }
        }
        if (hasHit || shields[i].isHit()) {
            shields.splice(i, 1);
        }
    }
}

/**
 * @description updates enemy shots
 * @returns {void}
 */
function fireEnemyShots() {
    const playTime = getCurrentPlayTime();
    if (!enemyShotFiredTimestamp) enemyShotFiredTimestamp = playTime;
    if (enemyShotFiredTimestamp + getEnemyFireRate() > playTime) return;
    const enemyCount = enemies.length;
    // get random enemies
    const qty = Math.min(getEnemyShotsPerFire(), enemyCount);
    const ids = getRandomEnemyIds(enemyCount - 1, qty);
    const shotWidth = 5;
    ids.forEach((id) => {
        /** @type {SpriteInstance} */
        const enemySprite = enemies[id];
        enemyShots.push(
            new Sprite(
                enemySprite.getLeft() + (enemySprite.width - shotWidth) / 2,
                enemySprite.getBottom(),
                shotWidth,
                15,
            ),
        );
    });
    enemyShotFiredTimestamp = playTime;
}

/**
 * @description updates the enemy shots
 * @param {number} speedPercent loop speed percent
 */
function updateEnemyShots(speedPercent) {
    const shotCount = enemyShots.length;
    if (!shotCount) return;
    const speed = enemyShotSpeed * speedPercent;
    // loop backwards as wwe splice
    for (let i = shotCount - 1; i >= 0; i -= 1) {
        const { getLeft, getTop, isHit, hasCollision } = enemyShots[i];
        const outOfBounds = getTop() > 600;
        if (shields.length) {
            for (let s = 0; s < shields.length; s += 1) {
                const shield = shields[s];
                if (hasCollision(shield)) {
                    shield.hit();
                }
            }
        }
        const hasHit = isHit() || sprite.hasCollision(enemyShots[i]);
        enemyShots[i].update(
            getLeft(),
            getTop() + speed,
            hasHit || outOfBounds,
        );

        if (isHit()) {
            enemyShots.splice(i, 1);
        }
    }
}

/**
 * @description for checking collision with enemy shots
 * @param {SpriteInstance} playerShot player shot
 * @returns {boolean} has collision
 */
function checkEnemyShotCollisions(playerShot) {
    if (!enemyShots.length) return;
    for (let i = 0; i < enemyShots.length; i += 1) {
        const shot = enemyShots[i];
        if (shot.hasCollision(playerShot)) {
            add(StatType.Score, 50);
            add(StatType.Hits);
            return true;
        }
    }
    return false;
}

/**
 * @description updates fired shots
 * @param {number} speedPercent loop speed percent
 * @param {number} loopTime loop timestamp
 */
function updateShots(speedPercent, loopTime) {
    const shotLength = playerShots.length;
    if (!shotLength) return;
    const shotSpeed = playerModifier.getModifier(
        ModifierType.ShotSpeed,
        loopTime,
    );
    const speed = shotSpeed * speedPercent;
    // update player shots, loop backwards as we splice
    for (let i = shotLength - 1; i >= 0; i -= 1) {
        const shot = playerShots[i];
        const outOfBounds = shot.getBottom() < 0;
        let hasHit = false;
        if (shields.length) {
            for (let s = 0; s < shields.length; s += 1) {
                const shield = shields[s];
                hasHit = shot.hasCollision(shield);
                if (hasHit) {
                    shield.hit();
                    break;
                }
            }
        }
        if (!hasHit) {
            hasHit =
                checkEnemyCollisions(shot) || checkEnemyShotCollisions(shot);
        }
        shot.update(
            shot.getLeft(),
            shot.getTop() - speed,
            hasHit || outOfBounds,
        );

        if (shot.isHit()) {
            playerShots.splice(i, 1);
        }
    }
}

/**
 * @description handle firing shots
 * @param {number} loopTime loop timestamp
 */
function fireHander(loopTime) {
    const playTime = getCurrentPlayTime();
    const fireRate = playerModifier.getModifier(
        ModifierType.RateOfFire,
        loopTime,
    );
    if (!isFiring() || shotFiredTimestamp + fireRate >= playTime) return;
    // spawn shot
    shotFiredTimestamp = playTime;
    add(StatType.Shots);
    const shotCount = playerModifier.getModifier(
        ModifierType.ShotCount,
        loopTime,
    );
    const shotWidth = 5;
    const center = sprite.getLeft() + (sprite.width - shotWidth) / 2;
    if (shotCount > 1) {
        // left shot
        const left = new Sprite(center - 15, sprite.getTop(), shotWidth, 15);
        // right shot
        const right = new Sprite(center + 15, sprite.getTop(), shotWidth, 15);
        playerShots.push(left);
        playerShots.push(right);
        playShotSound(loopTime);
        setTimeout(() => playShotSound(loopTime), 50);
        return;
    }

    const shot = new Sprite(center, sprite.getTop(), shotWidth, 15);
    playerShots.push(shot);
    playShotSound(loopTime);
}
/**
 * @description main update for sprites
 * @param {number} loopSpeed loop speed percent
 * @param {number} loopTime loop timestamp
 */
export function update(loopSpeed, loopTime) {
    updateShip(loopSpeed, loopTime);
    updateEnemies(loopSpeed, loopTime);
    updateShots(loopSpeed, loopTime);
    fireHander(loopTime);
    fireEnemyShots();
    updateEnemyShots(loopSpeed);
    updateShields();
}
