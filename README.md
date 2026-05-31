# 🎙️✨ VoiceCX AI: Voice-First Smart E-Commerce Assistant ✨🎙️

[![Licence](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Firebase](https://img.shields.io/badge/Database-Firestore-orange.svg?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-blueviolet.svg?style=for-the-badge&logo=google-gemini)](https://aistudio.google.com/)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript%20ES6+-yellow.svg?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS3](https://img.shields.io/badge/Styling-Glassmorphism%20CSS-blue.svg?style=for-the-badge&logo=css3)](https://www.w3.org/Style/CSS/)

---

## 🌟 🌌 Project Inspiration & Vision

Traditional e-commerce websites require a constant loop of typing in search bars, clicking checkboxes to filter categories, opening cart drawers, checking out, and reviewing order listings. 

**VoiceCX AI** completely flips the script by designing a **Voice-First** shopping interface! Designed for a high-intensity hackathon prototype, VoiceCX AI allows users to speak naturally to a visual, glowing assistant to buy tech gadgets. Whether you are driving, multitasking, or require accessibility support, VoiceCX AI brings conversational commerce to your browser.

---

## 🎨 🔮 Design Aesthetics & Color Palette

The user interface utilizes a premium **Deep Space Blue/Purple Glassmorphic** theme to deliver a highly interactive, futuristic, AI-native aesthetic:

*   🌌 **Background**: `linear-gradient(135deg, #0b0d19 0%, #15112e 50%, #070510 100%)` representing deep space.
*   🔮 **Glass Panels**: Semi-transparent overlays (`rgba(22, 21, 44, 0.6)`) with subtle white borders (`rgba(255, 255, 255, 0.08)`) and high blur filters to construct premium translucent cards.
*   🧪 **Aura Visualizer Colors**:
    *   🟣 **Idle**: Slow-pulsing Violet (`#7c4dff`) representing rest.
    *   🟢 **Listening**: Bright Neon Cyan (`#00e5ff`) indicating active microphone capture.
    *   🔵 **Thinking**: Rotating Deep Cobalt Blue representing Gemini API requests.
    *   💗 **Speaking**: Rhythmic Hot Pink/Magenta (`#ff007f`) synchronized with speech synthesis.

---

## 🚀 🔋 Core Key Features

### 1. 🎙️ Natural Voice Interaction Loop
*   **Speech-to-Text (STT)**: Utilizes the browser's native `webkitSpeechRecognition` to capture voices with zero lag.
*   **Text-to-Speech (TTS)**: Translates AI replies back to spoken words via `speechSynthesis`, prioritising high-quality natural English voices.
*   **Speech Caption Overlay**: A floating translucent status caption bar at the bottom displaying spoken text for accessibility.

### 2. 🧠 Gemini 2.0 Flash Intent Classification
*   Connects to Google's generative models using your API key.
*   Forces Gemini to return a clean **JSON Action Schema** classifying:
    *   `intent`: (`browse` | `add_to_cart` | `remove_from_cart` | `view_cart` | `checkout` | `clear_cart` | `general_query`)
    *   `sentiment`: Customer mood tracking (positive, neutral, negative).
    *   `priority`: Urgency mapping (low, medium, high).
    *   `action`: Specific instructions executed instantly by the front-end (e.g. adding items to cart, clearing items, checkout).

### 3. 💾 Hybrid Dual Database Layer
*   **Cloud Firestore Mode**: Dynamically checks if hosted on Firebase. If true, it automatically syncs cart, inventory catalog, and order history collections to Cloud Firestore.
*   **LocalStorage Fallback Mode**: Bypasses Firestore when running locally to avoid script 404 MIME errors, caching cart and orders state locally.

### 🔌 4. Bulletproof Local NLP Fallback Engine
*   If the Gemini API key hits rate limits (HTTP 429) or the internet drops out, a local rule-based string parser takes over, showing a toast notification while executing commands (adding watch, checking out) locally. **Your hackathon demo will never crash!**

---

## 🧩 📊 Interactive UI State Machine

The visual visualizer card transitions dynamically through four distinct CSS states:

```
    [ IDLE ]  <--- (Speech synthesis completes) ---+
       |                                           |
  (Click Orb)                                      |
       v                                           |
 [ LISTENING ] --> (Speech captured) --> [ THINKING ] ---> [ SPEAKING ]
```

*   `state-idle`: Core aura orb animates a slow breathing pulse.
*   `state-listening`: The orb pulses faster, accompanied by expanding ripple ring animations.
*   `state-thinking`: The outer ring transforms into a dotted border spinning rapidly to represent processing.
*   `state-speaking`: The orb pulses at high-frequency using hot magenta glow filters to mimic vocal waves.

---

## 🎙️ 📋 Example Voice Commands

Simply click the microphone button or the glowing visualizer orb and speak:

| Goal | Spoken Example Commands | Visual Action Executed |
| :--- | :--- | :--- |
| **🔍 Search Store** | *"Show me tech gadgets"*, *"Filter audio items"*, *"Do you have headphones?"* | Category tab switches; grid filters matching items |
| **🛒 Add to Cart** | *"Add the smart watch"*, *"Put AeroBuds Pro in my cart"*, *"Order the neocharge"* | Adds product to cart; flashes card with a neon cyan glow |
| **👜 View Cart** | *"Open my cart"*, *"What is in my shopping bag?"*, *"Show cart"* | Focuses cart layout sidebar |
| **➖ Remove Item** | *"Remove the charger"*, *"Take the keyboard out of my cart"* | Cart calculates totals; item fades out |
| **🧹 Clear Cart** | *"Empty my shopping cart"*, *"Clear cart"* | Resets cart state to empty |
| **💳 Checkout** | *"Checkout my order"*, *"Place order"*, *"Buy these items"* | Fulfills order, creates tracking ID, and adds to orders log |

---

## 📂 📁 Folder Structure

```directory
voicecx-ai/
├── .firebase/             # Firebase Hosting cache configuration
├── .firebaserc            # Firebase project environment variables
├── app.js                 # Database layers, speech engines, & Gemini client logic
├── firebase.json          # Hosting rewrites and asset ignore arrays
├── index.html             # UI Structure, glassmorphism CSS, and HTML dashboard
├── README.md              # Detailed project overview and installation guides
└── walkthrough.md         # Developer verification logs and testing details
```

---

## 🛠️ ⚙️ Setup & Installation

Follow these steps to run the project locally on your machine:

### 1. Clone the repository
```bash
git clone https://github.com/your-username/voicecx-ai.git
cd voicecx-ai
```

### 2. Configure the Gemini API Key
1. Visit **[Google AI Studio](https://aistudio.google.com/)** and log in.
2. Click **Create API Key** -> **Create API Key in new project**.
3. Copy the key (starts with `AQ.` or `AIzaSy`).
4. Paste it in `app.js` on line 1:
   ```javascript
   const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
   ```

### 3. Spin up a Local Server
Run a local server to handle web speech permissions properly:
```bash
# Option A: Python server
python -m http.server 5500

# Option B: Node serve package
npx serve .
```
Access the application at `http://localhost:5500` or the port displayed.

---

## 🌐 ☁️ Firebase Hosting Deployment

To host this project on Firebase and enable Cloud Firestore synchronization:

1.  **Install Firebase CLI**:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login & Initialize**:
    ```bash
    firebase login
    firebase init hosting
    ```
    *Select your project `voicecx-ai`, set the public directory to `.`, and configure rewrites to `index.html`.*

3.  **Deploy**:
    ```bash
    firebase deploy
    ```
    *Once deployed, the app will automatically load `/___/firebase/init.js` and connect to your Firestore database!*

---

## 📄 📜 License

This project is open-source and licensed under the **MIT License**. Check out the `LICENSE` file for more details.

---

### 🙌 🏆 Hackathon Acknowledgements
Developed with 💜 using Vanilla CSS, the Web Speech API, and Google's Gemini 2.0 Flash model. May the voice-first revolution begin! 🚀🎙️
