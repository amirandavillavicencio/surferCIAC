using UnityEngine;
using SaurabhSprint.Player;
using SaurabhSprint.Managers;

namespace SaurabhSprint.Collectibles
{
    public enum PowerUpType
    {
        Magnet,
        Jetpack,
        SuperSneakers,
        Multiplier2X,
        Hoverboard
    }

    public class PowerUp : MonoBehaviour
    {
        [Header("Power-Up Settings")]
        public PowerUpType powerUpType;
        public float duration = 10f;
        public float rotateSpeed = 90f;
        public float bobbingSpeed = 2f;
        public float bobbingHeight = 0.25f;

        [Header("Effects")]
        public GameObject pickupVFXPrefab;

        private Vector3 startPos;

        private void Start()
        {
            startPos = transform.position;
        }

        private void Update()
        {
            // Spin and hover bobbing animation
            transform.Rotate(Vector3.up, rotateSpeed * Time.deltaTime, Space.World);
            float newY = startPos.y + Mathf.Sin(Time.time * bobbingSpeed) * bobbingHeight;
            transform.position = new Vector3(transform.position.x, newY, transform.position.z);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                PlayerController player = other.GetComponent<PlayerController>();
                if (player != null)
                {
                    ActivatePowerUp(player);
                }

                if (pickupVFXPrefab != null)
                {
                    Instantiate(pickupVFXPrefab, transform.position, Quaternion.identity);
                }

                if (SoundManager.Instance != null)
                {
                    SoundManager.Instance.PlayPowerUpSound();
                }

                Destroy(gameObject);
            }
        }

        private void ActivatePowerUp(PlayerController player)
        {
            switch (powerUpType)
            {
                case PowerUpType.Magnet:
                    player.ActivateMagnet(duration);
                    break;
                case PowerUpType.Jetpack:
                    player.ActivateJetpack(duration);
                    break;
                case PowerUpType.SuperSneakers:
                    player.ActivateSuperSneakers(duration);
                    break;
                case PowerUpType.Multiplier2X:
                    if (GameManager.Instance != null)
                    {
                        GameManager.Instance.ActivateMultiplier(2, duration);
                    }
                    break;
                case PowerUpType.Hoverboard:
                    player.ActivateHoverboard(duration);
                    break;
            }
        }
    }
}
