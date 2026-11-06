using System.Collections;
using UnityEngine;
using SaurabhSprint.Managers;

namespace SaurabhSprint.Player
{
    /// <summary>
    /// Core Player Controller for Subway Surfers-style 3D Endless Runner in Unity.
    /// Handles 3-lane navigation, jump physics, sliding collider adjustment, power-ups, and animations.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        public static PlayerController Instance { get; private set; }

        [Header("Lane Settings")]
        public float laneDistance = 2.2f;
        public float laneChangeSpeed = 16f;
        private int currentLane = 1; // 0: Left, 1: Center, 2: Right

        [Header("Jump & Physics")]
        public float jumpForce = 9.5f;
        public float sneakerJumpForce = 15.5f;
        public float gravity = -28f;
        private float verticalVelocity = 0f;

        [Header("Slide Settings")]
        public float slideDuration = 0.75f;
        private bool isSliding = false;
        private float slideTimer = 0f;

        [Header("Power-Up States & Timers")]
        private float magnetTimer = 0f;
        private float jetpackTimer = 0f;
        private float sneakersTimer = 0f;
        private float hoverboardTimer = 0f;

        public bool HasMagnet => magnetTimer > 0f;
        public bool HasJetpack => jetpackTimer > 0f;
        public bool HasSneakers => sneakersTimer > 0f;
        public bool HasHoverboard => hoverboardTimer > 0f;

        public float MagnetTimer => magnetTimer;
        public float JetpackTimer => jetpackTimer;
        public float SneakersTimer => sneakersTimer;
        public float HoverboardTimer => hoverboardTimer;

        public bool IsSliding => isSliding;
        public bool IsJumping => !controller.isGrounded && verticalVelocity > 0.5f;

        [Header("Components & Visual Props")]
        public Animator animator;
        public GameObject hoverboardModel;
        public GameObject jetpackModel;
        public ParticleSystem jetpackFlames;
        public ParticleSystem landingDust;
        public ParticleSystem footstepSparkles;

        private CharacterController controller;
        private Vector3 originalCenter;
        private float originalHeight;
        private bool isStumbling = false;
        private bool isDead = false;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);

            controller = GetComponent<CharacterController>();
            originalCenter = controller.center;
            originalHeight = controller.height;
        }

        private void Start()
        {
            if (hoverboardModel) hoverboardModel.SetActive(false);
            if (jetpackModel) jetpackModel.SetActive(false);
        }

        private void Update()
        {
            if (GameManager.Instance != null && GameManager.Instance.currentState != GameState.Playing)
                return;

            if (isDead) return;

            UpdatePowerUpTimers();
            HandleLaneMovement();
            HandleJumpAndGravity();
            HandleSlide();
            ApplyMovement();

            // Update Animator state
            if (animator != null)
            {
                float forwardSpeed = GameManager.Instance != null ? GameManager.Instance.currentSpeed : 16f;
                animator.SetFloat("Speed", forwardSpeed);
                animator.SetBool("IsGrounded", controller.isGrounded);
            }
        }

        private void UpdatePowerUpTimers()
        {
            float dt = Time.deltaTime;
            if (magnetTimer > 0) magnetTimer -= dt;

            if (jetpackTimer > 0)
            {
                jetpackTimer -= dt;
                if (jetpackTimer <= 0)
                {
                    if (jetpackModel) jetpackModel.SetActive(false);
                    if (jetpackFlames) jetpackFlames.Stop();
                }
            }

            if (sneakersTimer > 0) sneakersTimer -= dt;

            if (hoverboardTimer > 0)
            {
                hoverboardTimer -= dt;
                if (hoverboardTimer <= 0)
                {
                    if (hoverboardModel) hoverboardModel.SetActive(false);
                }
            }
        }

        private void HandleLaneMovement()
        {
            if (PlayerInput.Instance == null) return;

            if (PlayerInput.Instance.SwipeLeft)
            {
                if (currentLane > 0)
                {
                    currentLane--;
                }
            }
            else if (PlayerInput.Instance.SwipeRight)
            {
                if (currentLane < 2)
                {
                    currentLane++;
                }
            }

            if (PlayerInput.Instance.DoubleTap && !HasHoverboard)
            {
                ActivateHoverboard(20f);
            }
        }

        private void HandleJumpAndGravity()
        {
            if (HasJetpack)
            {
                // Smooth jetpack flight elevation (above trains and girders)
                float targetY = 6.2f;
                float currentY = transform.position.y;
                verticalVelocity = (targetY - currentY) * 5.5f;
                return;
            }

            if (controller.isGrounded)
            {
                verticalVelocity = -1f;

                if (PlayerInput.Instance != null && PlayerInput.Instance.SwipeUp)
                {
                    float force = HasSneakers ? sneakerJumpForce : jumpForce;
                    verticalVelocity = force;
                    isSliding = false;

                    if (animator != null) animator.SetTrigger("Jump");
                    if (SoundManager.Instance != null) SoundManager.Instance.PlayJumpSound(HasSneakers);
                }
            }
            else
            {
                verticalVelocity += gravity * Time.deltaTime;

                // Quick dive on downward swipe while in air
                if (PlayerInput.Instance != null && PlayerInput.Instance.SwipeDown)
                {
                    verticalVelocity = -jumpForce * 2.0f;
                    StartSlide();
                }
            }
        }

        private void HandleSlide()
        {
            if (PlayerInput.Instance != null && PlayerInput.Instance.SwipeDown && controller.isGrounded && !isSliding && !HasJetpack)
            {
                StartSlide();
            }

            if (isSliding)
            {
                slideTimer -= Time.deltaTime;
                if (slideTimer <= 0f)
                {
                    StopSlide();
                }
            }
        }

        private void StartSlide()
        {
            isSliding = true;
            slideTimer = slideDuration;

            // Reduce collider height for sliding under overhead girders
            controller.height = originalHeight * 0.45f;
            controller.center = new Vector3(originalCenter.x, originalCenter.y * 0.45f, originalCenter.z);

            if (animator != null) animator.SetTrigger("Slide");
            if (SoundManager.Instance != null) SoundManager.Instance.PlaySlideSound();
        }

        private void StopSlide()
        {
            isSliding = false;
            controller.height = originalHeight;
            controller.center = originalCenter;
        }

        private void ApplyMovement()
        {
            float speed = GameManager.Instance != null ? GameManager.Instance.currentSpeed : 16f;

            // Calculate target X position based on active lane
            float targetX = (currentLane - 1) * laneDistance;
            Vector3 targetPosition = new Vector3(targetX, transform.position.y, transform.position.z);

            // Smooth horizontal lane transition
            Vector3 newPosition = Vector3.Lerp(transform.position, targetPosition, laneChangeSpeed * Time.deltaTime);
            float deltaX = newPosition.x - transform.position.x;

            Vector3 moveDirection = new Vector3(deltaX, verticalVelocity * Time.deltaTime, speed * Time.deltaTime);
            controller.Move(moveDirection);
        }

        // --- POWER-UP ACTIVATIONS ---
        public void ActivateHoverboard(float duration = 20f)
        {
            hoverboardTimer = duration;
            if (hoverboardModel) hoverboardModel.SetActive(true);
            if (SoundManager.Instance != null) SoundManager.Instance.PlayPowerUpSound();
        }

        public void BreakHoverboard()
        {
            hoverboardTimer = 0f;
            if (hoverboardModel) hoverboardModel.SetActive(false);
            if (SoundManager.Instance != null) SoundManager.Instance.PlayHoverboardBreakSound();
        }

        public void ActivateMagnet(float duration = 10f)
        {
            magnetTimer = duration;
            if (SoundManager.Instance != null) SoundManager.Instance.PlayPowerUpSound();
        }

        public void ActivateJetpack(float duration = 8f)
        {
            jetpackTimer = duration;
            if (jetpackModel) jetpackModel.SetActive(true);
            if (jetpackFlames) jetpackFlames.Play();
            if (SoundManager.Instance != null) SoundManager.Instance.PlayPowerUpSound();
        }

        public void ActivateSuperSneakers(float duration = 10f)
        {
            sneakersTimer = duration;
            if (SoundManager.Instance != null) SoundManager.Instance.PlayPowerUpSound();
        }

        // --- STUMBLE & CRASH HANDLING ---
        public void Stumble()
        {
            if (isStumbling || isDead || HasHoverboard || HasJetpack) return;
            isStumbling = true;
            if (animator != null) animator.SetTrigger("Stumble");
            if (SoundManager.Instance != null) SoundManager.Instance.PlayStumbleSound();

            if (InspectorChaser.Instance != null)
            {
                InspectorChaser.Instance.OnPlayerStumble();
            }

            StartCoroutine(StumbleRoutine());
        }

        private IEnumerator StumbleRoutine()
        {
            yield return new WaitForSeconds(0.8f);
            isStumbling = false;
        }

        public void Die()
        {
            if (isDead) return;
            isDead = true;

            if (animator != null) animator.SetTrigger("Crash");
            if (SoundManager.Instance != null) SoundManager.Instance.PlayCrashSound();

            if (GameManager.Instance != null)
            {
                GameManager.Instance.TriggerGameOver();
            }

            if (InspectorChaser.Instance != null)
            {
                InspectorChaser.Instance.OnPlayerCrash();
            }
        }

        private void OnControllerColliderHit(ControllerColliderHit hit)
        {
            if (hit.gameObject.CompareTag("Obstacle"))
            {
                // If hit from above (e.g. landing on train roof), don't crash
                if (hit.normal.y > 0.6f) return;

                if (HasHoverboard)
                {
                    BreakHoverboard();
                    return;
                }

                Die();
            }
        }
    }
}
