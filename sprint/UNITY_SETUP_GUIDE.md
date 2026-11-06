# 🎮 Saurabh's Sprint - Subway Surfers 3D Unity Setup Guide

नमस्ते सौरभ! आपका **Saurabh's Sprint (Subway Surfers 3D Realistic Game)** का पूरा **Unity C# Architecture** तैयार हो चुका है। 

इस गाइड में आपको स्टेप-बाय-स्टेप बताया गया है कि Unity Hub में प्रोजेक्ट को कैसे खोलें, फ्री 3D कैरेक्टर्स और एनिमेशन्स (Mixamo से) कैसे लोड करें, और गेम को प्ले/बिल्ड कैसे करें।

---

## 📁 1. Unity Project Structure (तैयार Scripts)

आपके प्रोजेक्ट के अंदर [Unity_SaurabhsSprint/Assets/Scripts/](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/) में सारे मॉड्यूलर C# स्क्रिप्ट्स व्यवस्थित हैं:

- **Player**:
  - [PlayerController.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Player/PlayerController.cs) - 3-Lane Movement, Jump Physics, Slide Collider Shrinking, Power-ups, Collisions & Stumbles.
  - [PlayerInput.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Player/PlayerInput.cs) - Mobile Touch Swipes (Up/Down/Left/Right/Double-tap) & PC Keyboard (W/A/S/D/Space).
  - [InspectorChaser.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Player/InspectorChaser.cs) - 3D Police Inspector & K-9 Guard Dog chaser AI.
- **World**:
  - [TrackGenerator.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/World/TrackGenerator.cs) - Infinite procedural track generator & recycler.
  - [Obstacle.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/World/Obstacle.cs) - Low hurdles, high girders, roadblocks, train ramps.
  - [MovingTrain.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/World/MovingTrain.cs) - Oncoming subway trains with headlights.
- **Collectibles**:
  - [Coin.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Collectibles/Coin.cs) - Spinning gold coins + Magnet attraction.
  - [PowerUp.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Collectibles/PowerUp.cs) - Jetpack, Super Jump Sneakers, 2X Multiplier, Magnet, Hoverboard shield.
- **Managers**:
  - [GameManager.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Managers/GameManager.cs) - State machine (Menu, Intro, Playing, Paused, GameOver), scoring, speed curve.
  - [SoundManager.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Managers/SoundManager.cs) - Audio clips (Police whistle, Dog bark, Spray paint, Jumps, Crash).
  - [CharacterDatabase.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Managers/CharacterDatabase.cs) - 26 Gaming Characters roster with prices and colors.
  - [SaveManager.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Managers/SaveManager.cs) - PlayerPrefs persistent storage (Coins, Highscore, Unlocked skins).
- **Camera & Cutscenes**:
  - [CameraController.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Camera/CameraController.cs) - Smooth follow camera with jetpack altitude and screenshake.
  - [IntroGraffitiScene.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/Cutscenes/IntroGraffitiScene.cs) - Subway Surfers spray paint cutscene with whistle and bark.
- **UI**:
  - [UIManager.cs](file:///c:/Users/SAURABH%20KUMAR/OneDrive/Desktop/Saurabh's%20Sprint/Unity_SaurabhsSprint/Assets/Scripts/UI/UIManager.cs) - HUD, Powerup progress bars, Shop modal with buy/equip verification.

---

## 🚀 2. Quick Setup Steps

1. **Unity Hub** खोलें -> `Open` -> सिलेक्ट करें: `c:\Users\SAURABH KUMAR\OneDrive\Desktop\Saurabh's Sprint\Unity_SaurabhsSprint`.
2. [Mixamo.com](https://www.mixamo.com) से फ्री में Characters (Ninja, Cyberpunk, Police Officer, Dog) और Animations (Run, Jump, Slide, Stumble, Crash) डाउनलोड करके Unity में `Assets/Models/` में ड्रैग करें।
3. Hierarchy में GameObjects बनाकर स्क्रिप्ट्स अटैच करें (Player, InspectorChaser, TrackManager, _GameManager, Camera, Canvas).
4. `Play` बटन दबाएं और गेम टेस्ट करें!
