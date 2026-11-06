using UnityEngine;
using UnityEngine.SceneManagement;
using System;
using SaurabhSprint.Player;
using SaurabhSprint.UI;

namespace SaurabhSprint.Managers
{
    public enum GameState
    {
        Menu,
        IntroCutscene,
        Playing,
        Paused,
        GameOver
    }

    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Game State")]
        public GameState currentState = GameState.Menu;

        [Header("Speed & Progression")]
        public float initialSpeed = 16f;
        public float maxSpeed = 38f;
        public float speedAccelerationRate = 0.15f; // speed increase per 100 meters
        public float currentSpeed;

        [Header("Scoring")]
        public float currentScore = 0f;
        public int sessionCoins = 0;
        public int baseMultiplier = 1;
        public int activePowerMultiplier = 1;
        private float multiplierTimer = 0f;

        [Header("References")]
        public PlayerController player;
        public InspectorChaser chaser;

        public event Action<GameState> OnGameStateChanged;
        public event Action<int> OnCoinsChanged;
        public event Action<int> OnScoreChanged;

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
            currentSpeed = initialSpeed;
            SetState(GameState.Menu);
        }

        private void Update()
        {
            if (currentState == GameState.Playing)
            {
                // Smooth speed acceleration
                if (currentSpeed < maxSpeed)
                {
                    currentSpeed += (speedAccelerationRate * Time.deltaTime);
                }

                // Score accumulation based on speed and multiplier
                float addedScore = currentSpeed * baseMultiplier * activePowerMultiplier * Time.deltaTime;
                currentScore += addedScore;
                OnScoreChanged?.Invoke((int)currentScore);

                // Multiplier timer
                if (multiplierTimer > 0)
                {
                    multiplierTimer -= Time.deltaTime;
                    if (multiplierTimer <= 0)
                    {
                        activePowerMultiplier = 1;
                    }
                }
            }
        }

        public void SetState(GameState newState)
        {
            currentState = newState;
            OnGameStateChanged?.Invoke(newState);

            switch (newState)
            {
                case GameState.Menu:
                    Time.timeScale = 1f;
                    break;
                case GameState.IntroCutscene:
                    Time.timeScale = 1f;
                    break;
                case GameState.Playing:
                    Time.timeScale = 1f;
                    break;
                case GameState.Paused:
                    Time.timeScale = 0f;
                    break;
                case GameState.GameOver:
                    Time.timeScale = 1f;
                    SaveManager.AddCoins(sessionCoins);
                    SaveManager.TrySetHighScore((int)currentScore);
                    break;
            }
        }

        public void StartIntroGraffiti()
        {
            SetState(GameState.IntroCutscene);
        }

        public void StartGame()
        {
            currentScore = 0;
            sessionCoins = 0;
            currentSpeed = initialSpeed;
            activePowerMultiplier = 1;
            SetState(GameState.Playing);

            if (chaser != null)
            {
                chaser.StartIntroChase();
            }
        }

        public void AddCoin(int amount = 1)
        {
            sessionCoins += amount;
            OnCoinsChanged?.Invoke(sessionCoins);
        }

        public void ActivateMultiplier(int multiplier, float duration)
        {
            activePowerMultiplier = multiplier;
            multiplierTimer = duration;
        }

        public void TriggerGameOver()
        {
            if (currentState == GameState.GameOver) return;
            SetState(GameState.GameOver);
        }

        public void PauseGame()
        {
            if (currentState == GameState.Playing)
            {
                SetState(GameState.Paused);
            }
        }

        public void ResumeGame()
        {
            if (currentState == GameState.Paused)
            {
                SetState(GameState.Playing);
            }
        }

        public void RestartGame()
        {
            Time.timeScale = 1f;
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
        }
    }
}
