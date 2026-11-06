using UnityEngine;
using SaurabhSprint.Player;
using SaurabhSprint.Managers;

namespace SaurabhSprint.Collectibles
{
    /// <summary>
    /// Gold Coin collectible with rotation, magnet attractor, and pickup VFX in Unity.
    /// </summary>
    public class Coin : MonoBehaviour
    {
        public float rotationSpeed = 180f;
        public int coinValue = 1;
        public float magnetPullSpeed = 18f;

        [Header("Effects")]
        public GameObject pickupVFXPrefab;

        private void Update()
        {
            // Continuous coin spin
            transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime, Space.World);

            // Magnet Attraction
            if (PlayerController.Instance != null && PlayerController.Instance.HasMagnet)
            {
                Vector3 playerPos = PlayerController.Instance.transform.position + Vector3.up * 0.8f;
                float dist = Vector3.Distance(transform.position, playerPos);

                if (dist < 15f)
                {
                    transform.position = Vector3.MoveTowards(transform.position, playerPos, magnetPullSpeed * Time.deltaTime);
                }
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                if (GameManager.Instance != null)
                {
                    GameManager.Instance.AddCoin(coinValue);
                }

                if (SoundManager.Instance != null)
                {
                    SoundManager.Instance.PlayCoinSound();
                }

                if (pickupVFXPrefab != null)
                {
                    Instantiate(pickupVFXPrefab, transform.position, Quaternion.identity);
                }

                Destroy(gameObject);
            }
        }
    }
}
