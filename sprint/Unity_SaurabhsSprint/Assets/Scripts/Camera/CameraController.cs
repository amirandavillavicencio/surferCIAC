using UnityEngine;
using SaurabhSprint.Player;
using SaurabhSprint.Managers;

namespace SaurabhSprint.Cameras
{
    public class CameraController : MonoBehaviour
    {
        [Header("Target & Follow")]
        public Transform target;
        public Vector3 defaultOffset = new Vector3(0f, 4.5f, -6.5f);
        public Vector3 jetpackOffset = new Vector3(0f, 8f, -9f);
        public float followSpeed = 12f;
        public float lookAhead = 10f;

        [Header("Screen Shake")]
        public float shakeDuration = 0f;
        public float shakeMagnitude = 0.25f;

        private Vector3 currentOffset;
        private Vector3 velocity = Vector3.zero;

        private void Start()
        {
            currentOffset = defaultOffset;
        }

        private void LateUpdate()
        {
            if (target == null) return;

            PlayerController player = target.GetComponent<PlayerController>();
            bool isJetpackActive = player != null && player.HasJetpack;

            // Target offset adjusts dynamically with flight mode
            Vector3 targetOffset = isJetpackActive ? jetpackOffset : defaultOffset;
            currentOffset = Vector3.Lerp(currentOffset, targetOffset, Time.deltaTime * 3f);

            // Follow player position
            Vector3 desiredPosition = new Vector3(
                target.position.x * 0.4f, // Subtle lane follow
                target.position.y + currentOffset.y,
                target.position.z + currentOffset.z
            );

            // Shake offset if active
            if (shakeDuration > 0)
            {
                desiredPosition += Random.insideUnitSphere * shakeMagnitude;
                shakeDuration -= Time.deltaTime;
            }

            transform.position = Vector3.SmoothDamp(transform.position, desiredPosition, ref velocity, 1f / followSpeed);

            // Smoothly look slightly ahead of the player
            Vector3 lookTarget = target.position + Vector3.up * 1.5f + Vector3.forward * lookAhead;
            transform.LookAt(lookTarget);
        }

        public void TriggerShake(float duration = 0.3f, float magnitude = 0.3f)
        {
            shakeDuration = duration;
            shakeMagnitude = magnitude;
        }
    }
}
