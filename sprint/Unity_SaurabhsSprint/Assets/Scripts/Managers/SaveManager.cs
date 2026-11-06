using UnityEngine;

namespace SaurabhSprint.Managers
{
    public static class SaveManager
    {
        private const string KEY_COINS = "SSP_Coins";
        private const string KEY_HIGHSCORE = "SSP_HighScore";
        private const string KEY_EQUIPPED_CHAR = "SSP_EquippedChar";
        private const string KEY_CHAR_UNLOCKED_PREFIX = "SSP_Unlocked_";
        private const string KEY_UPGRADE_PREFIX = "SSP_Upgrade_";

        public static int GetCoins()
        {
            return PlayerPrefs.GetInt(KEY_COINS, 0);
        }

        public static void AddCoins(int amount)
        {
            int current = GetCoins() + amount;
            PlayerPrefs.SetInt(KEY_COINS, Mathf.Max(0, current));
            PlayerPrefs.Save();
        }

        public static bool SpendCoins(int amount)
        {
            int current = GetCoins();
            if (current >= amount)
            {
                PlayerPrefs.SetInt(KEY_COINS, current - amount);
                PlayerPrefs.Save();
                return true;
            }
            return false;
        }

        public static int GetHighScore()
        {
            return PlayerPrefs.GetInt(KEY_HIGHSCORE, 0);
        }

        public static bool TrySetHighScore(int newScore)
        {
            if (newScore > GetHighScore())
            {
                PlayerPrefs.SetInt(KEY_HIGHSCORE, newScore);
                PlayerPrefs.Save();
                return true;
            }
            return false;
        }

        public static string GetEquippedCharacter()
        {
            return PlayerPrefs.GetString(KEY_EQUIPPED_CHAR, "vortex");
        }

        public static bool IsCharacterUnlocked(string charId, bool isDefaultUnlocked = false)
        {
            if (isDefaultUnlocked || charId == "vortex") return true;
            return PlayerPrefs.GetInt(KEY_CHAR_UNLOCKED_PREFIX + charId, 0) == 1;
        }

        public static void UnlockCharacter(string charId)
        {
            PlayerPrefs.SetInt(KEY_CHAR_UNLOCKED_PREFIX + charId, 1);
            PlayerPrefs.Save();
        }

        public static bool EquipCharacter(string charId)
        {
            // Verify unlocked first to prevent exploit
            if (IsCharacterUnlocked(charId))
            {
                PlayerPrefs.SetString(KEY_EQUIPPED_CHAR, charId);
                PlayerPrefs.Save();
                return true;
            }
            return false;
        }

        public static int GetUpgradeLevel(string powerupKey)
        {
            return PlayerPrefs.GetInt(KEY_UPGRADE_PREFIX + powerupKey, 1);
        }

        public static void IncrementUpgradeLevel(string powerupKey)
        {
            int current = GetUpgradeLevel(powerupKey);
            PlayerPrefs.SetInt(KEY_UPGRADE_PREFIX + powerupKey, current + 1);
            PlayerPrefs.Save();
        }
    }
}
