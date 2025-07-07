# ClickGuard.AI - Real-Time Phishing and Malicious Link Detection Chrome Extension

## Overview

ClickGuard.AI is a Chrome Extension designed to protect users from phishing and malicious links in real-time using AI-based link analysis. It intercepts link clicks, analyzes URLs with an AI model, blocks dangerous links, warns on suspicious links, and allows users to whitelist trusted domains.

## Features

- Real-time URL scanning on all link clicks
- AI-based link analysis (stub for integration with your AI model)
- Blocking and alerting for dangerous and suspicious links
- Digital signature verification placeholder
- User whitelist management with UI controls
- Extension icon changes based on security status
- Local storage for user settings and threat logs
- Cyberpunk-themed UI with TailwindCSS-inspired styling
- Plain HTML, JavaScript, and CSS (no TypeScript, React, or Next.js)

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" (toggle in the top right).
4. Click "Load unpacked" and select the project folder.
5. The ClickGuard.AI extension should appear in your toolbar.

## Usage

- Click the extension icon to open the popup UI.
- Enable or disable real-time scanning and other settings.
- Manage your whitelist of trusted domains.
- View recent threat detections.
- The extension will automatically intercept link clicks and block or warn based on AI analysis.

## AI Model Integration

- The current implementation includes a stub function `analyzeUrlWithAI` in `background.js`.
- Replace this stub with your own AI model integration or API call.
- Ensure the AI model returns an object with `threatLevel` (`safe`, `suspicious`, `dangerous`) and `reasons` array.

## Training with Large Datasets

- The provided training script `backend/train_model.py` expects a large phishing URL dataset CSV file named `phishing_data.csv` in the backend directory.
- The dataset should have columns `url` and `label` (0 for safe, 1 for phishing/malicious).
- You can download large public phishing URL datasets from sources such as:
  - [Phishing Websites Data Set - UCI ML Repository](https://archive.ics.uci.edu/ml/datasets/phishing+websites)
  - [PhishTank](https://www.phishtank.com/)
  - [OpenPhish](https://openphish.com/)
- Place the dataset CSV file as `backend/phishing_data.csv` before running the training script.
- Run `python backend/train_model.py` to train and save the AI model.
- The Flask backend (`backend/app.py`) loads the saved model for inference.

Please ensure you have the required Python dependencies installed from `backend/requirements.txt`.

## Development

- Modify `popup.html`, `popup.js`, and `styles.css` for UI changes.
- Modify `background.js` for link interception and AI integration.
- Icons are located in the `icons/` folder.

## Cyberpunk Theme

- The UI uses a dark cyberpunk theme with neon colors and futuristic fonts.
- Customize `styles.css` to adjust the theme.

## Notes

- Digital signature verification is a placeholder and requires additional implementation.
- Backend integration for logging and threat intelligence is optional and not included.

## License

MIT License

---

© 2024 ClickGuard.AI
