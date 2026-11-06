using System.Collections;
using UnityEngine;
using SaurabhSprint.Managers;
using SaurabhSprint.Player;

namespace SaurabhSprint.Cutscenes
{
    public class IntroGraffitiScene : MonoBehaviour
    {
        [Header("Scene References")]
        public GameObject sprayCanProp;
        public ParticleSystem sprayParticleEffect;
        public GameObject graffitiDecal;
        public Transform inspectorIntroPos;
        public Transform dogIntroPos;
        public Transform playerIntroPos;

        [Header("Timing")]
        public float paintingDuration = 3f;
        public float whistleDelay = 2.2f;

        private void Start()
        {
            if (GameManager.Instance != null && GameManager.Instance.currentState == GameState.IntroCutscene)
            {
                StartCoroutine(PlayIntroSequence());
            }
        }

        public void TriggerIntro()
        {
            StartCoroutine(PlayIntroSequence());
        }

        private IEnumerator PlayIntroSequence()
        {
            // Activate spray particles and sound
            if (sprayParticleEffect != null)
            {
                sprayParticleEffect.Play();
            }
            if (SoundManager.Instance != null)
            {
                SoundManager.Instance.PlaySprayPaint();
            }

            yield return new WaitForSeconds(whistleDelay);

            // Police Inspector blows whistle & Dog barks
            if (SoundManager.Instance != null)
            {
                SoundManager.Instance.PlayPoliceWhistle();
                SoundManager.Instance.PlayDogBark();
            }

            yield return new WaitForSeconds(paintingDuration - whistleDelay);

            // Stop spraying
            if (sprayParticleEffect != null)
            {
                sprayParticleEffect.Stop();
            }
            if (sprayCanProp != null)
            {
                sprayCanProp.SetActive(false);
            }

            // Start sprint gameplay
            if (GameManager.Instance != null)
            {
                GameManager.Instance.StartGame();
            }
        }
    }
}
