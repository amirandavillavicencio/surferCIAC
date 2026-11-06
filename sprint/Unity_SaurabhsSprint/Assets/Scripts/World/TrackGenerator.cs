using System.Collections.Generic;
using UnityEngine;
using SaurabhSprint.Player;

namespace SaurabhSprint.World
{
    /// <summary>
    /// Procedural Track Generator for infinite Subway Surfers 3D tracks in Unity.
    /// Spawns track segments, oncoming trains, ramps, hurdles, coins, and power-ups.
    /// </summary>
    public class TrackGenerator : MonoBehaviour
    {
        public static TrackGenerator Instance { get; private set; }

        [Header("Track Prefabs")]
        public GameObject[] trackSegmentPrefabs;
        public GameObject introTrackPrefab;

        [Header("Spawn Settings")]
        public float segmentLength = 50f;
        public int initialSegments = 6;
        public float despawnDistance = 60f;

        private float nextSpawnZ = 0f;
        private List<GameObject> activeSegments = new List<GameObject>();

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        private void Start()
        {
            SpawnInitialTracks();
        }

        private void Update()
        {
            if (PlayerController.Instance == null) return;

            float playerZ = PlayerController.Instance.transform.position.z;

            // Spawn next track ahead
            if (nextSpawnZ - playerZ < segmentLength * initialSegments)
            {
                SpawnTrackSegment();
            }

            // Recycle oldest track segment
            if (activeSegments.Count > 0)
            {
                if (playerZ - activeSegments[0].transform.position.z > despawnDistance)
                {
                    Destroy(activeSegments[0]);
                    activeSegments.RemoveAt(0);
                }
            }
        }

        private void SpawnInitialTracks()
        {
            // Spawn intro segment
            if (introTrackPrefab != null)
            {
                GameObject intro = Instantiate(introTrackPrefab, new Vector3(0, 0, nextSpawnZ), Quaternion.identity);
                activeSegments.Add(intro);
                nextSpawnZ += segmentLength;
            }

            for (int i = 1; i < initialSegments; i++)
            {
                SpawnTrackSegment();
            }
        }

        private void SpawnTrackSegment()
        {
            if (trackSegmentPrefabs == null || trackSegmentPrefabs.Length == 0) return;

            int randomIndex = Random.Range(0, trackSegmentPrefabs.Length);
            GameObject prefab = trackSegmentPrefabs[randomIndex];

            GameObject segment = Instantiate(prefab, new Vector3(0, 0, nextSpawnZ), Quaternion.identity);
            activeSegments.Add(segment);
            nextSpawnZ += segmentLength;
        }

        public void ResetWorld()
        {
            foreach (var seg in activeSegments)
            {
                Destroy(seg);
            }
            activeSegments.Clear();
            nextSpawnZ = 0f;
            SpawnInitialTracks();
        }
    }
}
