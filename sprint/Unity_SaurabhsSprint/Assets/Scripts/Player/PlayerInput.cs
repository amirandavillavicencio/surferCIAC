using UnityEngine;

namespace SaurabhSprint.Player
{
    /// <summary>
    /// Handles player input for both Mobile Touch Swipes and PC Keyboard.
    /// </summary>
    public class PlayerInput : MonoBehaviour
    {
        public static PlayerInput Instance { get; private set; }

        public bool SwipeLeft { get; private set; }
        public bool SwipeRight { get; private set; }
        public bool SwipeUp { get; private set; }
        public bool SwipeDown { get; private set; }
        public bool DoubleTap { get; private set; }

        private Vector2 touchStart;
        private float minSwipeDistance = 45f;
        private float lastTapTime = 0f;
        private float doubleTapThreshold = 0.35f;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        private void Update()
        {
            // Reset input triggers every frame
            SwipeLeft = false;
            SwipeRight = false;
            SwipeUp = false;
            SwipeDown = false;
            DoubleTap = false;

            HandleKeyboardInput();
            HandleTouchInput();
        }

        private void HandleKeyboardInput()
        {
            if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow))
                SwipeLeft = true;
            if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow))
                SwipeRight = true;
            if (Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow))
                SwipeUp = true;
            if (Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow))
                SwipeDown = true;
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.H))
                DoubleTap = true;
        }

        private void HandleTouchInput()
        {
            if (Input.touchCount > 0)
            {
                Touch touch = Input.GetTouch(0);

                if (touch.phase == TouchPhase.Began)
                {
                    touchStart = touch.position;

                    // Double tap detection
                    if (Time.time - lastTapTime < doubleTapThreshold)
                    {
                        DoubleTap = true;
                    }
                    lastTapTime = Time.time;
                }
                else if (touch.phase == TouchPhase.Ended)
                {
                    Vector2 delta = touch.position - touchStart;
                    if (delta.magnitude >= minSwipeDistance)
                    {
                        float x = delta.x;
                        float y = delta.y;

                        if (Mathf.Abs(x) > Mathf.Abs(y))
                        {
                            // Horizontal Swipe
                            if (x > 0) SwipeRight = true;
                            else SwipeLeft = true;
                        }
                        else
                        {
                            // Vertical Swipe
                            if (y > 0) SwipeUp = true;
                            else SwipeDown = true;
                        }
                    }
                }
            }
        }
    }
}
