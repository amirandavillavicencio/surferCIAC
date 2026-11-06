# 🎮 Saurabh's Sprint - Subway Surfers 3D Unity Complete Setup Guide

नमस्ते सौरभ! आपका **Saurabh's Sprint (Subway Surfers 3D Realistic Game)** का पूरा **Unity C# Architecture** तैयार हो चुका है। 

इस गाइड में आपको स्टेप-बाय-स्टेप बताया गया है कि Unity Hub में प्रोजेक्ट को कैसे खोलें, फ्री 3D कैरेक्टर्स और एनिमेशन्स (Mixamo से) कैसे लोड करें, और गेम को प्ले/बिल्ड कैसे करें।

---

## 📁 1. Unity Project Structure (तैयार Scripts)

आपके प्रोजेक्ट के अंदर `Unity_SaurabhsSprint/Assets/Scripts/` में सारे मॉड्यूलर C# स्क्रिप्ट्स व्यवस्थित हैं:

```
Unity_SaurabhsSprint/
└── Assets/
    └── Scripts/
        ├── Player/
        │   ├── PlayerController.cs     # 3-Lane movement, Jump, Slide, Power-ups, Collisions
        │   ├── PlayerInput.cs          # Mobile Swipe (Left/Right/Up/Down) & PC (A/D/W/S/Space)
        │   └── InspectorChaser.cs      # 3D Police Inspector & K-9 Dog AI Chaser
        ├── World/
        │   ├── TrackGenerator.cs       # Infinite procedural track spawner & recycler
        │   ├── Obstacle.cs             # Low hurdles, High girders, Train ramps, Roadblocks
        │   └── MovingTrain.cs          # Approaching Subway trains
        ├── Collectibles/
        │   ├── Coin.cs                 # Spinning gold coins + Magnet attraction
        │   └── PowerUp.cs              # Jetpack, Super Sneakers, Magnet, 2X Multiplier, Hoverboard
        ├── Managers/
        │   ├── GameManager.cs          # Game states (Menu, Intro, Playing, Paused, GameOver)
        │   ├── SoundManager.cs         # SFX (Police whistle, Dog bark, Spray paint, Jumps, BGM)
        │   ├── CharacterDatabase.cs    # 26 Gaming Characters (Vortex, Neon Blade, Shadow Runner, etc.)
        │   └── SaveManager.cs          # Persistent PlayerPrefs (Coins, HighScore, Unlocked Skins)
        ├── Camera/
        │   └── CameraController.cs     # Dynamic camera follow, Jetpack altitude, Screenshake
        ├── Cutscenes/
        │   └── IntroGraffitiScene.cs   # Iconic Subway Surfers graffiti spray opening cutscene
        └── UI/
            └── UIManager.cs            # HUD, Power-Up Timers, Shop (Buy/Equip), Pause & GameOver
```

---

## 🚀 2. Unity Hub में प्रोजेक्ट कैसे Setup करें (Step-by-Step)

### Step 1: Open Unity Hub & Create/Open Project
1. **Unity Hub** खोलें।
2. **Projects** टैब में जाकर **Open** / **Add project from disk** पर क्लिक करें।
3. फोल्डर सेलेक्ट करें: `c:\Users\SAURABH KUMAR\OneDrive\Desktop\Saurabh's Sprint\Unity_SaurabhsSprint`
4. या फिर **New project** -> **3D (URP)** या **3D Core** सिलेक्ट करके बना सकते हैं और `Assets` फोल्डर को उसमें ड्रैग कर सकते हैं।

---

### Step 2: Realistic 3D Characters और Animations कहाँ से लें? (100% Free - Mixamo)
Subway Surfers जैसे असली 3D कैरेक्टर्स और एनिमेशन्स के लिए **Adobe Mixamo** सबसे बेस्ट और 100% फ्री है:

1. [Mixamo.com](https://www.mixamo.com) पर जाएं (फ्री Adobe ID से लॉगिन करें)।
2. **Characters Tab** में जाकर अपने मनपसंद 3D कैरेक्टर्स डाउनलोड करें (जैसे: *Sporty Boy, Cyberpunk, Ninja, Police Officer, Dog/Mutant*).
3. **Animations Tab** से ये जरूरी एनिमेशन्स डाउनलोड करें:
   - `Standard Run / Fast Run` (Loop checked)
   - `Jump Over / Running Jump`
   - `Slide / Running Slide`
   - `Stumble / Trip Over`
   - `Fall Back Death / Crash`
   - `Spray Can Painting` (Intro Scene के लिए)
   - `Whistle Blow` (Police Officer के लिए)
   - `Dog Run / Dog Bark` (Dog के लिए)
4. डाउनलोड करते समय **Format: FBX for Unity** चुनें।
5. Unity में `Assets/Models/` फोल्डर बनाकर सारी FBX फाइल्स को ड्रैग कर दें।
6. FBX को सेलेक्ट करके **Rig** टैब में `Animation Type: Humanoid` सेट करके **Apply** करें।

---

## 🕹️ 3. Main Scene Setup (Prefabs & Components)

### 1. Player Setup:
- Hierarchy में एक Empty GameObject बनाएं: `Player`.
- `CharacterController` component जोड़ें (`Center: 0, 1, 0`, `Height: 2`, `Radius: 0.4`).
- `PlayerController.cs` और `PlayerInput.cs` स्क्रिप्ट्स जोड़ें।
- अपना 3D Character Model (FBX) Player के अंदर Child object की तरह रखें।
- `Animator` जोड़ें और उसमें `Run`, `Jump`, `Slide`, `Stumble`, `Crash` एनिमेशन स्टेट्स जोड़ें।

### 2. Police Inspector & Dog Setup:
- Hierarchy में Empty GameObject बनाएं: `InspectorChaser`.
- `InspectorChaser.cs` स्क्रिप्ट अटैच करें।
- अंदर Police Model और Dog Model रखें।

### 3. Track & World Setup:
- Hierarchy में Empty GameObject बनाएं: `TrackManager`.
- `TrackGenerator.cs` स्क्रिप्ट अटैच करें।
- 3 Tracks (Lanes at `X = -2.2, 0, +2.2`) का एक Track Segment Prefab बनाकर लिस्ट में जोड़ दें।

### 4. Game Managers:
- Hierarchy में Empty GameObject बनाएं: `_GameManager`.
- `GameManager.cs`, `SoundManager.cs`, `CharacterDatabase.cs`, `SaveManager` अटैच करें।

### 5. Camera:
- `Main Camera` को सेलेक्ट करें और `CameraController.cs` अटैच करें। `Target` में `Player` को ड्रैग करें।

### 6. Canvas / UI:
- Canvas बनाएं और `UIManager.cs` अटैच करें।
- HUD Text (Score, Coins, HighScore), Power-Up Slider Bars, और Shop Panels को inspector में लिंक करें।

---

## 🎯 4. Features Included in this 3D Unity Build

| Feature | Details |
|---|---|
| **26 Gaming Characters** | Vortex, Neon Blade, Shadow Runner, Cyber Punk, Volt Surge, Omega Prime etc. |
| **Strict Shop Verification** | बिना Coins देकर Buy किए कोई भी Locked Character Equip नहीं होगा |
| **Inspector & Dog AI** | गेम स्टार्ट पे 6s चेस, फिर पीछे हटेगा; स्टंबल होने पे तुरंत पास आएगा; क्रैश पे पकड़ेगा |
| **Graffiti Intro Cutscene** | ट्रेन पे स्प्रे पेंटिंग -> सीटी की आवाज -> डॉग बार्क -> रनिंग स्टार्ट |
| **5 Power-Ups** | Jetpack (आसमान में उड़ना), Super Jump Sneakers, 2X Multiplier, Magnet, Hoverboard (Shield) |
| **Obstacles Variety** | Moving Trains, Low Hurdles (Jump), High Girders (Slide), Train Ramps (छत पर दौड़ना) |
| **Controls** | Mobile Swipe (Touch) + PC Keyboard (W/A/S/D, Arrow keys, Space) |

---

## 📦 5. Export / Build Game

- **Windows PC (.exe)**: `File -> Build Settings -> PC, Mac & Linux Standalone -> Build`
- **Android Mobile (.apk)**: `File -> Build Settings -> Android -> Switch Platform -> Build`
