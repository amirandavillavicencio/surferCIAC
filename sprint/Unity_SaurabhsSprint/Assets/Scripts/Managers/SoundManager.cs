using UnityEngine;

namespace SaurabhSprint.Managers
{
    public class SoundManager : MonoBehaviour
    {
        public static SoundManager Instance { get; private set; }

        [Header("Audio Sources")]
        public AudioSource musicSource;
        public AudioSource sfxSource;

        [Header("Audio Clips")]
        public AudioClip bgmMusic;
        public AudioClip coinClip;
        public AudioClip jumpClip;
        public AudioClip superJumpClip;
        public AudioClip slideClip;
        public AudioClip powerUpClip;
        public AudioClip hoverboardBreakClip;
        public AudioClip jetpackLoopClip;
        public AudioClip policeWhistleClip;
        public AudioClip dogBarkClip;
        public AudioClip sprayPaintClip;
        public AudioClip stumbleClip;
        public AudioClip crashClip;
        public AudioClip buyCharacterClip;
        public AudioClip equipCharacterClip;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            PlayBGM();
        }

        public void PlayBGM()
        {
            if (musicSource != null && bgmMusic != null)
            {
                musicSource.clip = bgmMusic;
                musicSource.loop = true;
                musicSource.Play();
            }
        }

        public void StopBGM()
        {
            if (musicSource != null)
            {
                musicSource.Stop();
            }
        }

        public void PlaySFX(AudioClip clip, float volume = 1f)
        {
            if (sfxSource != null && clip != null)
            {
                sfxSource.PlayOneShot(clip, volume);
            }
        }

        public void PlayCoinSound() => PlaySFX(coinClip, 0.6f);
        public void PlayJumpSound(bool isSuperJump = false) => PlaySFX(isSuperJump ? superJumpClip : jumpClip, 0.8f);
        public void PlaySlideSound() => PlaySFX(slideClip, 0.7f);
        public void PlayPowerUpSound() => PlaySFX(powerUpClip, 0.9f);
        public void PlayHoverboardBreakSound() => PlaySFX(hoverboardBreakClip, 1f);
        public void PlayPoliceWhistle() => PlaySFX(policeWhistleClip, 1f);
        public void PlayDogBark() => PlaySFX(dogBarkClip, 0.9f);
        public void PlaySprayPaint() => PlaySFX(sprayPaintClip, 0.8f);
        public void PlayStumbleSound() => PlaySFX(stumbleClip, 0.9f);
        public void PlayCrashSound() => PlaySFX(crashClip, 1f);
        public void PlayBuySound() => PlaySFX(buyCharacterClip, 1f);
        public void PlayEquipSound() => PlaySFX(equipCharacterClip, 1f);
    }
}
