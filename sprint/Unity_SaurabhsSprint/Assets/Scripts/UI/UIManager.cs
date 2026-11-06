using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;
using SaurabhSprint.Managers;
using SaurabhSprint.Player;

namespace SaurabhSprint.UI
{
    public class UIManager : MonoBehaviour
    {
        public static UIManager Instance { get; private set; }

        [Header("Panels")]
        public GameObject mainMenuPanel;
        public GameObject inGameHUDPanel;
        public GameObject shopPanel;
        public GameObject pausePanel;
        public GameObject gameOverPanel;

        [Header("HUD Elements")]
        public Text scoreText;
        public Text highScoreText;
        public Text coinsText;
        public Text multiplierText;

        [Header("Power-Up Timers HUD")]
        public GameObject magnetBarObj;
        public Slider magnetSlider;
        public GameObject jetpackBarObj;
        public Slider jetpackSlider;
        public GameObject sneakersBarObj;
        public Slider sneakersSlider;
        public GameObject hoverboardBarObj;
        public Slider hoverboardSlider;

        [Header("Shop Elements")]
        public Text shopCoinBalanceText;
        public Text characterNameText;
        public Text characterTitleText;
        public Text characterPriceText;
        public Button buyButton;
        public Button equipButton;
        public Text equipButtonText;
        public Transform characterPreviewSpot;

        [Header("Game Over Elements")]
        public Text finalScoreText;
        public Text finalHighScoreText;
        public Text finalCoinsEarnedText;

        private int currentShopCharIndex = 0;
        private GameObject currentPreviewModel;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnGameStateChanged += HandleGameStateChanged;
                GameManager.Instance.OnCoinsChanged += UpdateCoinsDisplay;
                GameManager.Instance.OnScoreChanged += UpdateScoreDisplay;
            }

            UpdateHighScoreDisplay();
            ShowPanel(mainMenuPanel);
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnGameStateChanged -= HandleGameStateChanged;
                GameManager.Instance.OnCoinsChanged -= UpdateCoinsDisplay;
                GameManager.Instance.OnScoreChanged -= UpdateScoreDisplay;
            }
        }

        private void Update()
        {
            // Sync Power-Up Bars with PlayerController
            if (GameManager.Instance != null && GameManager.Instance.player != null)
            {
                PlayerController player = GameManager.Instance.player;

                UpdateTimerBar(magnetBarObj, magnetSlider, player.MagnetTimer, 10f);
                UpdateTimerBar(jetpackBarObj, jetpackSlider, player.JetpackTimer, 10f);
                UpdateTimerBar(sneakersBarObj, sneakersSlider, player.SneakersTimer, 10f);
                UpdateTimerBar(hoverboardBarObj, hoverboardSlider, player.HoverboardTimer, 25f);

                if (multiplierText != null)
                {
                    multiplierText.text = "x" + (GameManager.Instance.baseMultiplier * GameManager.Instance.activePowerMultiplier);
                }
            }
        }

        private void UpdateTimerBar(GameObject barObj, Slider slider, float currentTimer, float maxTimer)
        {
            if (barObj == null || slider == null) return;

            if (currentTimer > 0)
            {
                barObj.SetActive(true);
                slider.value = Mathf.Clamp01(currentTimer / maxTimer);
            }
            else
            {
                barObj.SetActive(false);
            }
        }

        private void HandleGameStateChanged(GameState state)
        {
            HideAllPanels();

            switch (state)
            {
                case GameState.Menu:
                    ShowPanel(mainMenuPanel);
                    UpdateHighScoreDisplay();
                    break;
                case GameState.IntroCutscene:
                case GameState.Playing:
                    ShowPanel(inGameHUDPanel);
                    break;
                case GameState.Paused:
                    ShowPanel(pausePanel);
                    break;
                case GameState.GameOver:
                    ShowPanel(gameOverPanel);
                    PopulateGameOverStats();
                    break;
            }
        }

        public void OnTapToPlayClicked()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.StartIntroGraffiti();
            }
        }

        public void OnOpenShopClicked()
        {
            HideAllPanels();
            ShowPanel(shopPanel);
            UpdateShopDisplay();
        }

        public void OnCloseShopClicked()
        {
            HideAllPanels();
            ShowPanel(mainMenuPanel);
        }

        public void NextShopCharacter()
        {
            if (CharacterDatabase.Instance == null) return;
            currentShopCharIndex = (currentShopCharIndex + 1) % CharacterDatabase.Instance.TotalCharacters;
            UpdateShopDisplay();
        }

        public void PrevShopCharacter()
        {
            if (CharacterDatabase.Instance == null) return;
            currentShopCharIndex--;
            if (currentShopCharIndex < 0) currentShopCharIndex = CharacterDatabase.Instance.TotalCharacters - 1;
            UpdateShopDisplay();
        }

        public void OnBuyCurrentCharacter()
        {
            if (CharacterDatabase.Instance == null) return;
            CharacterInfo info = CharacterDatabase.Instance.GetCharacterByIndex(currentShopCharIndex);
            if (info == null) return;

            if (SaveManager.SpendCoins(info.price))
            {
                SaveManager.UnlockCharacter(info.id);
                SaveManager.EquipCharacter(info.id);
                if (SoundManager.Instance != null) SoundManager.Instance.PlayBuySound();
                UpdateShopDisplay();
            }
        }

        public void OnEquipCurrentCharacter()
        {
            if (CharacterDatabase.Instance == null) return;
            CharacterInfo info = CharacterDatabase.Instance.GetCharacterByIndex(currentShopCharIndex);
            if (info == null) return;

            if (SaveManager.IsCharacterUnlocked(info.id, info.isDefaultUnlocked))
            {
                SaveManager.EquipCharacter(info.id);
                if (SoundManager.Instance != null) SoundManager.Instance.PlayEquipSound();
                UpdateShopDisplay();
            }
        }

        private void UpdateShopDisplay()
        {
            if (CharacterDatabase.Instance == null) return;
            CharacterInfo info = CharacterDatabase.Instance.GetCharacterByIndex(currentShopCharIndex);
            if (info == null) return;

            if (shopCoinBalanceText != null) shopCoinBalanceText.text = "🪙 " + SaveManager.GetCoins().ToString("N0");
            if (characterNameText != null) characterNameText.text = info.displayName;
            if (characterTitleText != null) characterTitleText.text = info.title;

            bool isUnlocked = SaveManager.IsCharacterUnlocked(info.id, info.isDefaultUnlocked);
            string equippedId = SaveManager.GetEquippedCharacter();
            bool isEquipped = equippedId == info.id;

            if (isUnlocked)
            {
                if (buyButton != null) buyButton.gameObject.SetActive(false);
                if (equipButton != null)
                {
                    equipButton.gameObject.SetActive(true);
                    equipButton.interactable = !isEquipped;
                    if (equipButtonText != null) equipButtonText.text = isEquipped ? "EQUIPPED" : "EQUIP";
                }
                if (characterPriceText != null) characterPriceText.text = "UNLOCKED";
            }
            else
            {
                if (equipButton != null) equipButton.gameObject.SetActive(false);
                if (buyButton != null)
                {
                    buyButton.gameObject.SetActive(true);
                    buyButton.interactable = SaveManager.GetCoins() >= info.price;
                }
                if (characterPriceText != null) characterPriceText.text = "🪙 " + info.price.ToString("N0");
            }
        }

        private void PopulateGameOverStats()
        {
            if (GameManager.Instance == null) return;
            if (finalScoreText != null) finalScoreText.text = ((int)GameManager.Instance.currentScore).ToString();
            if (finalHighScoreText != null) finalHighScoreText.text = SaveManager.GetHighScore().ToString();
            if (finalCoinsEarnedText != null) finalCoinsEarnedText.text = "+" + GameManager.Instance.sessionCoins.ToString();
        }

        public void OnRestartClicked()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.RestartGame();
            }
        }

        public void OnPauseClicked()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.PauseGame();
            }
        }

        public void OnResumeClicked()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.ResumeGame();
            }
        }

        private void UpdateScoreDisplay(int score)
        {
            if (scoreText != null) scoreText.text = score.ToString();
        }

        private void UpdateCoinsDisplay(int coins)
        {
            if (coinsText != null) coinsText.text = coins.ToString();
        }

        private void UpdateHighScoreDisplay()
        {
            if (highScoreText != null) highScoreText.text = "HIGH SCORE: " + SaveManager.GetHighScore().ToString();
        }

        private void HideAllPanels()
        {
            if (mainMenuPanel != null) mainMenuPanel.SetActive(false);
            if (inGameHUDPanel != null) inGameHUDPanel.SetActive(false);
            if (shopPanel != null) shopPanel.SetActive(false);
            if (pausePanel != null) pausePanel.SetActive(false);
            if (gameOverPanel != null) gameOverPanel.SetActive(false);
        }

        private void ShowPanel(GameObject panel)
        {
            if (panel != null) panel.SetActive(true);
        }
    }
}
