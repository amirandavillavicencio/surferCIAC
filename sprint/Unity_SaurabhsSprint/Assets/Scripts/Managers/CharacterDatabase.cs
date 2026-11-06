using System;
using System.Collections.Generic;
using UnityEngine;

namespace SaurabhSprint.Managers
{
    [System.Serializable]
    public class CharacterInfo
    {
        public string id;
        public string displayName;
        public string title;
        public int price;
        public Color primaryColor;
        public Color secondaryColor;
        public bool isDefaultUnlocked;
        public GameObject characterPrefab; // Mixamo or custom 3D model prefab
    }

    public class CharacterDatabase : MonoBehaviour
    {
        public static CharacterDatabase Instance { get; private set; }

        [Header("Character Roster (26 Characters)")]
        public List<CharacterInfo> characters = new List<CharacterInfo>();

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitializeDefaultRoster();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void InitializeDefaultRoster()
        {
            if (characters.Count > 0) return; // If configured via Inspector, keep it

            // 26 Unique Gaming Characters
            AddChar("vortex", "Vortex", "The Street Sprinter", 0, true, new Color(1f, 0.35f, 0.15f), new Color(0.1f, 0.1f, 0.2f));
            AddChar("neon_blade", "Neon Blade", "Cyber Samurai", 1500, false, new Color(0.1f, 1f, 0.7f), new Color(0.8f, 0.1f, 0.9f));
            AddChar("shadow_runner", "Shadow Runner", "Stealth Ninja", 2500, false, new Color(0.2f, 0.2f, 0.25f), new Color(0.85f, 0.1f, 0.2f));
            AddChar("cyber_punk", "Cyber Punk", "Neon Rebel", 3500, false, new Color(1f, 0.1f, 0.6f), new Color(0.1f, 0.9f, 1f));
            AddChar("volt_surge", "Volt Surge", "Lightning Striker", 4500, false, new Color(1f, 0.9f, 0.1f), new Color(0.2f, 0.6f, 1f));
            AddChar("blaze_heart", "Blaze Heart", "Flame Acrobat", 5500, false, new Color(1f, 0.2f, 0.1f), new Color(1f, 0.6f, 0.1f));
            AddChar("frost_bite", "Frost Bite", "Arctic Drifter", 6500, false, new Color(0.6f, 0.9f, 1f), new Color(0.1f, 0.4f, 0.9f));
            AddChar("toxic_hazard", "Toxic Hazard", "Bio Chemist", 7500, false, new Color(0.4f, 1f, 0.1f), new Color(0.1f, 0.3f, 0.1f));
            AddChar("quantum_dash", "Quantum Dash", "Dimension Walker", 8500, false, new Color(0.8f, 0.2f, 1f), new Color(0.2f, 0.9f, 0.9f));
            AddChar("mech_strike", "Mech Strike", "Titan Pilot", 10000, false, new Color(0.8f, 0.7f, 0.2f), new Color(0.3f, 0.3f, 0.4f));
            AddChar("astro_glide", "Astro Glide", "Cosmic Voyager", 12000, false, new Color(0.2f, 0.4f, 1f), new Color(1f, 0.4f, 0.8f));
            AddChar("inferno_rex", "Inferno Rex", "Volcanic Warrior", 14000, false, new Color(0.9f, 0.2f, 0.1f), new Color(0.3f, 0.1f, 0.1f));
            AddChar("chrono_shift", "Chrono Shift", "Time Manipulator", 16000, false, new Color(0.2f, 0.8f, 0.8f), new Color(0.9f, 0.8f, 0.3f));
            AddChar("apex_predator", "Apex Predator", "Jungle Hunter", 18000, false, new Color(0.6f, 0.5f, 0.2f), new Color(0.8f, 0.2f, 0.1f));
            AddChar("sonic_boom", "Sonic Boom", "Soundwave Racer", 20000, false, new Color(0.1f, 0.7f, 1f), new Color(1f, 0.9f, 0.2f));
            AddChar("phantom_ghost", "Phantom Ghost", "Ethereal Wraith", 22500, false, new Color(0.9f, 0.9f, 1f), new Color(0.5f, 0.6f, 0.9f));
            AddChar("laser_pulse", "Laser Pulse", "Photon Engineer", 25000, false, new Color(1f, 0.1f, 0.4f), new Color(0.1f, 1f, 0.5f));
            AddChar("zero_gravity", "Zero Gravity", "Space Acrobat", 28000, false, new Color(0.3f, 0.5f, 1f), new Color(0.9f, 0.3f, 0.9f));
            AddChar("nova_burst", "Nova Burst", "Starlight Vanguard", 31000, false, new Color(1f, 0.8f, 0.2f), new Color(1f, 0.3f, 0.5f));
            AddChar("iron_clad", "Iron Clad", "Heavy Brawler", 35000, false, new Color(0.5f, 0.5f, 0.6f), new Color(0.8f, 0.3f, 0.1f));
            AddChar("viper_strike", "Viper Strike", "Venomous Scout", 40000, false, new Color(0.2f, 0.8f, 0.3f), new Color(0.1f, 0.1f, 0.1f));
            AddChar("storm_bringer", "Storm Bringer", "Thunder Lord", 45000, false, new Color(0.4f, 0.5f, 0.9f), new Color(1f, 1f, 0.4f));
            AddChar("dusk_hunter", "Dusk Hunter", "Twilight Assassin", 50000, false, new Color(0.4f, 0.2f, 0.5f), new Color(0.9f, 0.5f, 0.2f));
            AddChar("solar_flare", "Solar Flare", "Sun Guardian", 60000, false, new Color(1f, 0.6f, 0.1f), new Color(1f, 0.95f, 0.4f));
            AddChar("abyss_walker", "Abyss Walker", "Void Wanderer", 75000, false, new Color(0.15f, 0.1f, 0.3f), new Color(0.6f, 0.1f, 0.9f));
            AddChar("omega_prime", "Omega Prime", "Ultimate Champion", 100000, false, new Color(1f, 0.85f, 0.2f), new Color(0.1f, 0.1f, 0.1f));
        }

        private void AddChar(string id, string name, string title, int price, bool isDefault, Color c1, Color c2)
        {
            characters.Add(new CharacterInfo
            {
                id = id,
                displayName = name,
                title = title,
                price = price,
                isDefaultUnlocked = isDefault,
                primaryColor = c1,
                secondaryColor = c2
            });
        }

        public CharacterInfo GetCharacter(string id)
        {
            return characters.Find(c => c.id == id);
        }

        public CharacterInfo GetCharacterByIndex(int index)
        {
            if (index >= 0 && index < characters.Count) return characters[index];
            return characters[0];
        }

        public int TotalCharacters => characters.Count;
    }
}
