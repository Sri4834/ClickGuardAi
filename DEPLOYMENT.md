# ClickGuard.AI Deployment and Running Instructions

## Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Ensure the trained model file `phishing_url_model.joblib` is present in the `backend` directory. If not, run the training script:
   ```bash
   python train_model.py
   ```

4. Run the Flask backend API:
   ```bash
   python app.py
   ```

   The API will be available at `http://localhost:5000`.

## Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`.

2. Enable "Developer mode" (toggle in the top right).

3. Click "Load unpacked" and select the root directory of this project (`Clickguard-AI`).

4. The extension "ClickGuard.AI" should appear in the extensions list.

5. The extension will intercept navigation and analyze URLs using the backend API.

## Notes

- The backend Flask API must be running and accessible at `http://localhost:5000` for the extension to function properly.

- The extension shows a notification for safe links and blocks dangerous links with icon and tooltip updates.

- You can configure settings and whitelist domains via the extension popup.

## Troubleshooting

- If the extension does not block or analyze links, ensure the backend API is running and accessible.

- Check the extension's background page console for errors.

- Verify permissions in `manifest.json`.

## License

MIT License
