/** @enum {string} */
export const RandomModifierType = {
    RateOfFire: "rateOfFire",
    // Shield: "shield",
    ShotSpeed: "shotSpeed",
    Speed: "speed",
};

/** @enum {string} */
export const ModifierType = {
    ...RandomModifierType,
    ShotSpeed: "shotSpeed",
};

/** @typedef {{type: ModifierType, value: number, expiration: number}} Modifier */
/** @typedef {(timestamp: number) => void} AddRandomModifierFunction */
/** @typedef {(type: ModifierType, value: number, expiration: number) => void} AddModifierFunction */
/** @typedef {(type: ModifierType, timestamp: number) => number} GetModifierFunction */
/** @typedef {() => void} ResetFunction */
/** @typedef {{addModifier: AddModifierFunction, addRandomModifier: AddRandomModifierFunction, getModifier: GetModifierFunction, reset: ResetFunction}} ModifierManager */

/**
 * @description factory for managing modifiers
 * @param {number} baseSpeed base speed of entity
 * @param {number} baseShotSpeed base speed of the shots
 * @param {number} baseRateOfFire base rate of fire
 * @returns {ModifierManager} modifier manager
 */
export function ModifierManager(
    baseSpeed,
    baseShotSpeed,
    baseRateOfFire,
    baseShotCount = 1,
) {
    /** @type {Map<ModifierType, Modifier>} */
    const modifiers = new Map();

    function getBaseByType(type) {
        switch (type) {
            case ModifierType.Speed:
                return baseSpeed;
            case ModifierType.ShotSpeed:
                return baseShotSpeed;
            case ModifierType.RateOfFire:
                return baseRateOfFire;
            case ModifierType.ShotCount:
                return baseShotCount;
            case ModifierType.Shield:
                return 0;
            default:
                throw new Error(`Unknown modifier type ${type}`);
        }
    }

    function addModifier(type, value, expiration) {
        modifiers.set(type, { type, value, expiration });
    }

    function getModifier(type, timestamp) {
        if (modifiers.has(type)) {
            const modifier = modifiers.get(type);
            if (modifier.expiration > timestamp) {
                return modifier.value;
            }
        }
        return getBaseByType(type);
    }

    function getIncreasedValueByType(type, currentValue) {
        switch (type) {
            case ModifierType.Shield:
                return 1;
            case ModifierType.RateOfFire:
                return currentValue * 0.5;
            case ModifierType.Speed:
            case ModifierType.ShotSpeed:
            default:
                return currentValue * 1.5;
        }
    }

    function addRandomModifier(timestamp) {
        const modifierTypes = Object.values(RandomModifierType);
        const randomType =
            modifierTypes[Math.floor(Math.random() * modifierTypes.length)];
        const value = getIncreasedValueByType(
            randomType,
            getModifier(randomType, timestamp),
        );
        const expiration = timestamp + 5000;
        addModifier(randomType, value * 1.5, expiration);
    }

    function reset() {
        modifiers.clear();
    }

    return {
        addModifier,
        addRandomModifier,
        getModifier,
        reset,
    };
}
