using UnityEngine;

namespace SaurabhSprint.World
{
    /// <summary>
    /// Moving Subway Train obstacle approaching the player.
    /// </summary>
    public class MovingTrain : MonoBehaviour
    {
        [Header("Train Settings")]
        public float moveSpeed = 14f;
        public bool isMoving = true;
        public Light headlightLeft;
        public Light headlightRight;

        private void Update()
        {
            if (isMoving)
            {
                transform.Translate(Vector3.back * moveSpeed * Time.deltaTime, Space.World);
            }
        }
    }
}
