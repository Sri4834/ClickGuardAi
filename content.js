// Inject the warning modal HTML into the page
function injectWarningModal() {
  const modalContainer = document.createElement("div")
  modalContainer.id = "clickguard-warning-modal"
  modalContainer.style.display = "none"
  modalContainer.style.position = "fixed"
  modalContainer.style.top = "0"
  modalContainer.style.left = "0"
  modalContainer.style.width = "100%"
  modalContainer.style.height = "100%"
  modalContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)"
  modalContainer.style.zIndex = "2147483647" // Max z-index
  modalContainer.style.display = "flex"
  modalContainer.style.alignItems = "center"
  modalContainer.style.justifyContent = "center"

  const modalContent = document.createElement("div")
  modalContent.style.backgroundColor = "white"
  modalContent.style.borderRadius = "8px"
  modalContent.style.padding = "20px"
  modalContent.style.maxWidth = "500px"
  modalContent.style.width = "90%"
  modalContent.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"
  modalContent.style.fontFamily = "Arial, sans-serif"

  modalContent.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <div style="background-color: #ff4d4d; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <h2 id="clickguard-warning-title" style="margin: 0; color: #ff4d4d; font-size: 20px;">Warning: Potentially Dangerous Link</h2>
    </div>
    <p id="clickguard-warning-message" style="margin-bottom: 15px; color: #333; font-size: 14px;">
      ClickGuard.AI has detected that this link may be unsafe.
    </p>
    <div id="clickguard-warning-details" style="background-color: #f8f8f8; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 14px;">
      <p style="margin: 0 0 5px 0; font-weight: bold;">URL:</p>
      <p id="clickguard-warning-url" style="margin: 0 0 10px 0; word-break: break-all; font-family: monospace; font-size: 12px;"></p>
      <p style="margin: 0 0 5px 0; font-weight: bold;">Reasons:</p>
      <ul id="clickguard-warning-reasons" style="margin: 0; padding-left: 20px;"></ul>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <button id="clickguard-back-button" style="background-color: #4CAF50; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">Back to Safety</button>
      <button id="clickguard-whitelist-button" style="background-color: #f8f8f8; color: #333; border: 1px solid #ddd; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-left: 10px;">Whitelist Domain</button>
      <button id="clickguard-proceed-button" style="background-color: #ff4d4d; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-left: 10px;">Proceed Anyway</button>
    </div>
  `

  modalContainer.appendChild(modalContent)
  document.body.appendChild(modalContainer)

  // Add event listeners
  document.getElementById("clickguard-back-button").addEventListener("click", () => {
    modalContainer.style.display = "none"
  })

  document.getElementById("clickguard-whitelist-button").addEventListener("click", () => {
    const url = document.getElementById("clickguard-warning-url").textContent
    // Ensure chrome is defined
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          action: "addToWhitelist",
          url: url,
        },
        () => {
          modalContainer.style.display = "none"
          window.location.href = url
        },
      )
    } else {
      console.error("Chrome runtime is not available.")
      // Optionally, provide a fallback behavior here.
    }
  })

  document.getElementById("clickguard-proceed-button").addEventListener("click", () => {
    const url = document.getElementById("clickguard-warning-url").textContent
    modalContainer.style.display = "none"
    window.location.href = url
  })

  return modalContainer
}

// Show warning modal with analysis results
function showWarningModal(url, analysis) {
  let modal = document.getElementById("clickguard-warning-modal")

  // If the modal doesn't exist yet, create it
  if (!modal) {
    modal = injectWarningModal()
  }

  // Update modal content
  document.getElementById("clickguard-warning-title").textContent =
    analysis.threatLevel === "dangerous" ? "Warning: Dangerous Link Detected!" : "Caution: Suspicious Link Detected"

  document.getElementById("clickguard-warning-message").textContent =
    analysis.threatLevel === "dangerous"
      ? "ClickGuard.AI has detected that this link is likely malicious or phishing."
      : "ClickGuard.AI has detected that this link may be suspicious."

  document.getElementById("clickguard-warning-url").textContent = url

  const reasonsList = document.getElementById("clickguard-warning-reasons")
  reasonsList.innerHTML = ""

  analysis.reasons.forEach((reason) => {
    const li = document.createElement("li")
    li.textContent = reason
    reasonsList.appendChild(li)
  })

  // Show the modal
  modal.style.display = "flex"
}

// Intercept link clicks
function interceptLinks() {
  document.addEventListener(
    "click",
    async (event) => {
      // Find if the click was on a link or a child of a link
      let target = event.target
      while (target && target.tagName !== "A") {
        target = target.parentElement
      }

      // If a link was clicked
      if (target && target.tagName === "A" && target.href) {
        // Get settings
        const { settings } = await chrome.storage.local.get(["settings"])

        // Skip if real-time scanning is disabled
        if (!settings.enableRealTimeScanning) return

        // Check if the URL is whitelisted
        // Ensure chrome is defined
        if (typeof chrome !== "undefined" && chrome.runtime) {
          chrome.runtime.sendMessage(
            {
              action: "analyzeUrl",
              url: target.href,
            },
            (analysis) => {
              if (!analysis.isSafe) {
                // Prevent the default navigation
                event.preventDefault()
                event.stopPropagation()

                // Show warning modal
                showWarningModal(target.href, analysis)
              }
            },
          )
        } else {
          console.error("Chrome runtime is not available.")
          // Optionally, provide a fallback behavior here.
        }
      }
    },
    true,
  ) // Use capture phase to intercept before other handlers
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showWarning") {
    showWarningModal(message.url, message.analysis)
  }
})

// Initialize content script
function initialize() {
  // Wait for the DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", interceptLinks)
  } else {
    interceptLinks()
  }
}

initialize()
