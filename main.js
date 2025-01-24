import { fetchStaticData, getEmptyCharacter } from "./utils.js";

const abilityIndexMap = {
    "strength": 0,
    "dexterity": 1,
    "constitution": 2,
    "intelligence": 3,
    "wisdom": 4,
    "charisma": 5,
    0: "strength",
    1: "dexterity",
    2: "constitution",
    3: "intelligence",
    4: "wisdom",
    5: "charisma"
}

document.addEventListener("alpine:init", () => {
    console.log("alpine has initialised");
    Alpine.prefix("data-")
    Alpine.data('characterGenerator', () => ({
        character: null,
        staticData: null,
        isLoading: true,
        currentPage: "race",

        async init() {
            console.log("cg init ran")
            try {
                console.log("cg init ran")
                this.isLoading = true;
                this.staticData = await fetchStaticData();
                this.character = getEmptyCharacter();
                this.isLoading = false;
                console.log(this.staticData)
            } catch (error) {
                console.error('Error fetching JSON:', error);
            }
        },
        setPage(page) {
            this.currentPage = page;
        },
        /**
         * Return the static data for the race that has been chosen by the user.
         */
        get chosenRace() {
            return this.staticData.races.find(r => r.id === this.character.race);
        },
        /**
         * Return the static data for the class that has been chosen by the user.
         */
        get chosenClass() {
            return this.staticData.classes.find(c => c.id === this.character.class);
        },
        /**
         * Computes the number of skill proficiencies that the user can choose, based on
         * their choice of class and race.
         */
        get computedNumberOfSkillProficiencies() {
            const classSkillProficiencies = this.chosenClass ? this.chosenClass.proficiencies.skills.choose : 0;
            const raceSkillProficiencies = this.chosenRace ? this.chosenRace.additionalSkillProficiencies : 0;
            return classSkillProficiencies + raceSkillProficiencies;
        },
        get isCaster() {
            return this.chosenClass.spellcasting.ability !== null;
        },
        /**
         * Get the current base score for the given ability, with no bonuses applied.
         * @param {*} abilityName 
         * @returns 
         */
        getAbilityBaseScore(abilityName) {
            const idx = abilityIndexMap[abilityName];
            return this.character.abilityPoints[idx].value;
        },
        /**
         * Get the racial ability bonus for the given ability.
         * @param {*} abilityName 
         * @returns 
         */
        getRacialAbilityBonus(abilityName) {
            const idx = abilityIndexMap[abilityName];
            const bonus = this.chosenRace.abilityBonuses[idx];;
            return bonus.bonus;
        },
        /**
         * Get the ability score for the given ability, with racial bonuses applied.
         * @param {*} abilityName 
         * @returns 
         */
        getAdjustedAbilityScore(abilityName) {
            const idx = abilityIndexMap[abilityName];
            const baseScore = this.character.abilityPoints[idx].value;
            const racialBonus = this.getRacialAbilityBonus(abilityName);
            if (baseScore === "--") {
                return "--";
            } else {
                return baseScore + racialBonus;
            }
        },
        /**
         * Get the modifier for the given ability (adjusted).
         * @param {*} abilityName 
         * @returns 
         */
        getAbilityModifier(abilityName) {
            const score = this.getAdjustedAbilityScore(abilityName);
            if (score === "--") {
                return 0;
            }
            return Math.floor((score - 10) / 2);
        },
        /**
         * Adds or removes the given skillId from the classSkillChoices array. Respects the
         * computedNumberOfSkillProficiencies, removing the oldest skill if the user tries to
         * add more than the allowed number.
         * @param {*} skillId 
         */
        toggleSkillProficiency(skillId) {
            const index = this.character.classSkillChoices.indexOf(skillId);

            // If the skill is not already in the array...
            if (index === -1) {
                // ... then add it to the array, if there is space.
                if (this.character.classSkillChoices.length < this.computedNumberOfSkillProficiencies) {
                    this.character.classSkillChoices.push(skillId);
                // If there is not space, then remove the first (oldest) skill from the array,
                // and add the new one at the end
                } else {
                    this.character.classSkillChoices.shift();
                    this.character.classSkillChoices.push(skillId);
                }
            // If the skill is already in the array, remove it.
            } else {
                this.character.classSkillChoices.splice(index, 1); 
            }
        },
        /**
         * Return the static data for the ability with the given id
         * @param {*} abilityId 
         * @returns 
         */
        getAbilityData(abilityId) {
            return this.staticData.abilities.find(a => a.id === abilityId);
        },
        /**
         * Computes the ability point options for the given abilityId, based on which
         * points from the standard array have already been chosen.
         * @param {*} abilityId 
         * @returns 
         */
        computeAbilityPointOptions(abilityId) {
            // Construct an array containing some subset of the options
            // '--', 8, 10, 12, 13, 14, 15,
            // where '--' represents none/unset.
            // Specifically, it should include None, the current value of this ability,
            // and any other value that has not been chosen yet.
            const currentAbilityValue = this.character.abilityPoints.find(a => a.id === abilityId).value;
            const points = [8, 10, 12, 13, 14, 15].filter(p => {
                // If the point is the current abilities value, or if there is no ability with that value,
                // then include it in the list. 
                return p === currentAbilityValue || !this.character.abilityPoints.find(a => a.value === p);
            });
            if (points[0] !== "--") {
                points.unshift("--");
            }
            return points;
        },
        /**
         * Resets the ability points to the default values for the chosen class.
         */
        resetAbilityPoints() {
            const classDefaults = this.chosenClass.abilities;
            for (let i = 0; i < this.character.abilityPoints.length; i++) {
                this.character.abilityPoints[i].value = classDefaults[i].value;
            }
        },
        /**
         * Whenever a different class is chosen, reset the relevant parts of state, either
         * to empty or to the class default.
         * @param {*} e 
         */
        resetStateOnClassChange(e) {
            console.log(e.target.value);
        },
        /**
         * When the user has finished creating their character, POST the character to the server.
         */
        handleSubmit() {
            console.log("submitting")
            const character = JSON.parse(JSON.stringify(this.character));
            console.log(character)
        }
    }));
})

