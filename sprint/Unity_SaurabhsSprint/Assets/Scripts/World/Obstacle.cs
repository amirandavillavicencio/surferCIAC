using UnityEngine;
using SaurabhSprint.Player;
using SaurabhSprint.Managers;

namespace SaurabhSprint.World
{
    public enum ObstacleType
    {
        LowHurdle,       // Jump over
        HighGirder,      // Slide under
        Roadblock,       // Switch lane / Fatal
        TrainFront,      // Fatal / Crash
        TrainRamp,       // Walk / Jump onto train roof
        LightPole        // Side obstacle
    }

    public class Obstacle : MonoBehaviour
    {
        [Header("Obstacle Settings")]
        public ObstacleType obstacleType = ObstacleType.Roadblock;
        public bool isFatal = true;
        public bool allowsRampClimb = false;

        [Header("Collision Effects")]
        public GameObject hitVFXPrefab;

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                PlayerController player = other.GetComponent<PlayerController>();
                if (player == null) return;

                // If it's a ramp, the player can climb onto the roof smoothly without crashing
                if (obstacleType == ObstacleType.TrainRamp || allowsRampClimb)
                {
                    return; 
                }

                // Check if player is sliding and obstacle is high girder
                if (obstacleType == ObstacleType.HighGirder && player.IsSliding)
                {
                    // Player successfully slipped underneath!
                    return;
                }

                // Check if player is high in the air (jetpack or high jump) over low hurdle
                if (obstacleType == ObstacleType.LowHurdle && player.IsJumping && player.transform.position.y > 1.2f)
                {
                    // Player jumped over successfully!
                    return;
                }

                // If player has active hoverboard, absorb hit and trigger shield burst
                if (player.HasHoverboard)
                {
                    player.BreakHoverboard();
                    TriggerHitEffects(transform.position);
                    return;
                }

                // Frontal or fatal collision
                if (isFatal)
                {
                    TriggerHitEffects(player.transform.position + Vector3.up * 1f);
                    player.Die();
                }
                else
                {
                    // Non-fatal stumble / brush
                    player.Stumble();
                }
            }
        }

        private void TriggerHitEffects(Vector3 pos)
        {
            if (hitVFXPrefab != null)
            {
                Instantiate(hitVFXPrefab, pos, Quaternion.identity);
            }
            if (SoundManager.Instance != null)
            {
                SoundManager.Instance.PlayCrashSound();
            }
        }
    }
}
