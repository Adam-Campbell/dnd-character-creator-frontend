

/**
 * Factory function for creating a new, empty character object
 * @returns 
 */
export function getEmptyCharacter() {
    return {
        race: "095914ea-d0a5-41dd-a003-6b5d4558a3ad",
        class: "44f84547-8935-4ab4-bd29-fb60d0000d04",
        classSkillChoices: [],
        classCantripChoices: [],
        classSpellChoices: [],
        abilityPoints: [
            { id: "0caab33e-f424-4a44-94cd-0c6951e5bdfe", value: '--' },
            { id: "fd107c7f-4536-4b36-bf43-e49d92a3c4c2", value: '--' },
            { id: "b9b14f85-78db-49ea-b07b-b8bdd7a40046", value: '--' },
            { id: "44fbcb3c-d548-4a3c-aa85-4c55e05aabed", value: '--' },
            { id: "468b3218-340b-4263-9450-dc72e6750f16", value: '--' },
            { id: "b15c2aa9-87e7-408d-89a7-3bbd64d981a9", value: '--' },
        ],
        name: "",
        age: null,
        gender: "",
        alignment: "",
        background: "",
        traits: [],
        ideals: [],
        bonds: [],
        flaws: [],
        height: "",
        build: "",
        skinTone: "",
        hairColor: "",
        hairStyle: "",
        hairLength: "",
        hairType: "",
        facialHairStyle: "",
        facialHairLength: "",
        eyeColor: "",
        eyeShape: "",
        distinguishingFeatures: [],
        clothingStyle: "",
        clothingColors: [],
        clothingAccessories: [],
    };
}

/**
 * Combines the different items collections into a single items collection,
 * deletes the original collections.
 * Mutates the data object rather than creating a new one.
 * @param {*} data 
 */
function combineItems(data) {
    data.items = [
        ...data.weapons,
        ...data.armor,
        ...data.items
    ];
    delete data.weapons;
    delete data.armor;
}

/**
 * Denormalises a single class object, replacing id references with actual entities.
 * Mutates the class object rather than creating a new one.
 * @param {*} cls 
 * @param {*} data 
 */
function denormaliseClass(cls, data) {
    // Equipment needs to have its shape changed
    cls.equipment = cls.equipment.map(e => {
        const item = data.items.find(i => i.id === e.id);
        return {
            item: item,
            quantity: e.quantity
        }
    });
    // Abilities need to have their shape changed
    cls.abilities = cls.abilities.map(abilityValuePair => {
        const ability = data.abilities.find(i => i.id === abilityValuePair.id);
        return {
            ...ability,
            value: abilityValuePair.value
        }
    });
    // Proficiencies can just be replaced as-is
    cls.proficiencies.armor = cls.proficiencies.armor.map(a => data.items.find(i => i.id === a));
    cls.proficiencies.weapons = cls.proficiencies.weapons.map(w => data.items.find(i => i.id === w));
    cls.proficiencies.savingThrows = cls.proficiencies.savingThrows.map(s => data.abilities.find(i => i.id === s));
    cls.proficiencies.skills.from = cls.proficiencies.skills.from.map(s => data.skills.find(i => i.id === s));
    // Spellcasting can be replaced as-is, but only if the class is a caster class.
    if (cls.spellcasting.ability !== null) {
        cls.spellcasting.ability = data.abilities.find(a => a.id === cls.spellcasting.ability);
        cls.spellcasting.cantrips.from = cls.spellcasting.cantrips.from.map(c => data.cantrips.find(s => s.id === c));
        cls.spellcasting.spells.from = cls.spellcasting.spells.from.map(s => data.spells.find(s => s.id === s));
    }
}

/**
 * Denormalises a single race, replacing id references with actual entities.
 * Mutates the race object rather than creating a new one.
 * @param {*} race 
 * @param {*} data 
 */
function denormaliseRace(race, data) {
    // We need to change the shape of ability bonuses
    race.abilityBonuses = race.abilityBonuses.map(abilityBonus => {
        const ability = data.abilities.find(a => a.id === abilityBonus.id);
        return {
            ...ability,
            bonus: abilityBonus.bonus
        }
    });
    // Weapon proficiencies can be replaced as-is
    race.weaponProficiencies = race.weaponProficiencies.map(w => data.items.find(i => i.id === w));
}

/**
 * Denormalises the data. Mutates the data object rather than creating a new one.
 * a new one.
 * @param {*} data 
 * @returns 
 */
export function denormaliseData(data) {
    combineItems(data);
    data.classes.forEach(cls => denormaliseClass(cls, data));
    data.races.forEach(race => denormaliseRace(race, data));
    // return the data object just for flexibility
    return data;
}

/**
 * Fetches the static data JSON file, parses it and denormalises it.
 * @returns 
 */
export async function fetchStaticData() {
    try {
        const response = await fetch('./characterData.json');
        const staticData = await response.json();
        denormaliseData(staticData);
        return staticData;
    } catch (error) {
        console.error('Error fetching JSON:', error);
    }
}

