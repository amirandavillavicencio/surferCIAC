using UnityEngine;
using SaurabhSprint.Player;
using SaurabhSprint.Managers;

namespace SaurabhSprint.Player
{
    /// <summary>
    /// 3D Police Inspector & K-9 Guard Dog Chaser System in Unity.
    /// Runs behind the player, falls back over time, rushes in on stumble, and captures on crash.
    /// </summary>
    public class InspectorChaser : MonoBehaviour
    {
        public static InspectorChaser Instance { get; private set; }

        [Header("Chaser Settings")]
        public float closeDistance = 2.5f;
        public float farDistance = 14.0f;
        public float introChaseDuration = 6.0f;
        public float stumbleChaseDuration = 5.0f;

        [Header("Sub-Components")]
        public Animator officerAnimator;
        public Animator dogAnimator;

        private float currentDistance;
        private float targetDistance;
        private float stateTimer = 0f;
        private bool isCatching = false;
        private bool isFallenBack = false;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        private void Start()
        {
            currentDistance = closeDistance;
            targetDistance = closeDistance;
            stateTimer = introChaseDuration;
        }

        private void Update()
        {
            if (PlayerController.Instance == null) return;

            Vector3 playerPos = PlayerController.Instance.transform.position;

            if (isCatching)
            {
                targetDistance = 0.6f;
            }
            else
            {
                if (stateTimer > 0f)
                {
                    stateTimer -= Time.deltaTime;
                    targetDistance = closeDistance;
                    isFallenBack = false;
                }
                else
                {
                    targetDistance = farDistance;
                    isFallenBack = true;
                }
            }

            // Smooth follow distance interpolation
            float lerpSpeed = isCatching ? 12f : (isFallenBack ? 2f : 5f);
            currentDistance = Mathf.Lerp(currentDistance, targetDistance, lerpSpeed * Time.deltaTime);

            // Follow player position along Z and X with smooth lag
            Vector3 targetPos = new Vector3(playerPos.x, playerPos.y, playerPos.z - currentDistance);
            transform.position = Vector3.Lerp(transform.position, targetPos, 10f * Time.deltaTime);

            // Update running animations speed
            float runSpeed = GameManager.Instance != null ? GameManager.Instance.currentSpeed : 16f;
            if (officerAnimator != null) officerAnimator.SetFloat("Speed", runSpeed);
            if (dogAnimator != null) dogAnimator.SetFloat("Speed", runSpeed);
        }

        public void StartIntroChase()
        {
            gameObject.SetActive(true);
            isCatching = false;
            currentDistance = closeDistance;
            targetDistance = closeDistance;
            stateTimer = introChaseDuration;

            if (SoundManager.Instance != null)
            {
                SoundManager.Instance.PlayPoliceWhistle();
                SoundManager.Instance.PlayDogBark();
            }
        }

        public void OnPlayerStumble()
        {
            if (isCatching) return;
            stateTimer = stumbleChaseDuration;
            targetDistance = closeDistance;

            if (SoundManager.Instance != null)
            {
                SoundManager.Instance.PlayPoliceWhistle();
                SoundManager.Instance.PlayDogBark();
            }
        }

        public void OnPlayerCrash()
        {
            isCatching = true;
            if (officerAnimator != null) officerAnimator.SetTrigger("Catch");
            if (dogAnimator != null) dogAnimator.SetTrigger("Bark");

            if (SoundManager.Instance != null)
            {
                SoundManager.Instance.PlayPoliceWhistle();
                SoundManager.Instance.PlayDogBark();
            }
        }
    }
}
