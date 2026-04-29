const TOGGLE_BUTTON_CLASS = 'toggle-password-custom-button'
const PASSWORD_FIELD_SELECTOR = 'input[type="password"], input[type="text"][data-password="true"]'

let extensionEnabled = true
let showPasswordsByDefault = false
let ourChange = false

function togglePasswordVisibility(field, button) {
  ourChange = true
  if (field.type === 'password') {
    field.type = 'text'
    button.textContent = 'Hide'
  } else {
    field.type = 'password'
    button.textContent = 'Show'
  }
  setTimeout(() => { ourChange = false }, 0)
}

function removeOurToggleButtons() {
  const toggleButtons = document.querySelectorAll(`.${TOGGLE_BUTTON_CLASS}`)
  toggleButtons.forEach((button) => {
    const inputField = button.previousSibling
    if (inputField && inputField.tagName === 'INPUT') {
      inputField.type = 'password'
      delete inputField.dataset.password
    }
    button.remove()
  })
}

function addCustomToggleButton(field) {
  if (
    field.nextSibling &&
    field.nextSibling.classList &&
    field.nextSibling.classList.contains(TOGGLE_BUTTON_CLASS)
  ) {
    return
  }
  field.dataset.password = 'true'
  const toggleButton = document.createElement('button')
  toggleButton.type = 'button'
  toggleButton.classList.add(TOGGLE_BUTTON_CLASS)
  if (showPasswordsByDefault) {
    ourChange = true
    field.type = 'text'
    setTimeout(() => { ourChange = false }, 0)
    toggleButton.textContent = 'Hide'
  } else {
    toggleButton.textContent = 'Show'
  }
  toggleButton.addEventListener('click', () => {
    togglePasswordVisibility(field, toggleButton)
  })
  field.parentNode.insertBefore(toggleButton, field.nextSibling)
}

function addCustomToggleButtons() {
  const passwordFields = document.querySelectorAll(PASSWORD_FIELD_SELECTOR)
  passwordFields.forEach((field) => {
    addCustomToggleButton(field)
  })
}

function removeCustomToggleButtons() {
  removeOurToggleButtons()
}

function injectStylesheet() {
  if (!document.getElementById('toggle-password-styles')) {
    const styleElement = document.createElement('link')
    styleElement.id = 'toggle-password-styles'
    styleElement.rel = 'stylesheet'
    styleElement.href = chrome.runtime.getURL('content.css')
    document.head.appendChild(styleElement)
  }
}

function init() {
  injectStylesheet()
  chrome.storage.sync.get(['extensionEnabled', 'showPasswordsByDefault'], (result) => {
    extensionEnabled = result.extensionEnabled !== false
    showPasswordsByDefault = result.showPasswordsByDefault !== false
    if (extensionEnabled) {
      addCustomToggleButtons()
    } else {
      removeCustomToggleButtons()
    }
  })
}

const observer = new MutationObserver((mutations) => {
  if (!extensionEnabled) return
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches && node.matches('input')) {
          if (
            node.type === 'password' ||
            (node.type === 'text' && node.dataset.password === 'true')
          ) {
            addCustomToggleButton(node)
          }
        } else {
          const passwordFields = node.querySelectorAll?.(PASSWORD_FIELD_SELECTOR)
          if (passwordFields?.length) {
            passwordFields.forEach((field) => {
              addCustomToggleButton(field)
            })
          }
        }
      }
    })
    if (
      mutation.type === 'attributes' &&
      mutation.attributeName === 'type' &&
      mutation.target.tagName === 'INPUT'
    ) {
      const input = mutation.target
      const hasOurButton =
        input.nextSibling &&
        input.nextSibling.classList &&
        input.nextSibling.classList.contains(TOGGLE_BUTTON_CLASS)

      if (input.type === 'password' && hasOurButton && !ourChange) {
        // Site (e.g. React re-render) reset type back to password — re-assert our state
        if (showPasswordsByDefault) {
          ourChange = true
          input.type = 'text'
          setTimeout(() => { ourChange = false }, 0)
          input.nextSibling.textContent = 'Hide'
        } else {
          input.nextSibling.textContent = 'Show'
        }
      } else if (
        input.type === 'password' ||
        (input.type === 'text' && input.dataset.password === 'true')
      ) {
        addCustomToggleButton(input)
      }
    }
  })
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['type'],
})

function applyVisibilityToExistingButtons() {
  const passwordFields = document.querySelectorAll(PASSWORD_FIELD_SELECTOR)
  passwordFields.forEach((field) => {
    const button = field.nextSibling
    if (button && button.classList && button.classList.contains(TOGGLE_BUTTON_CLASS)) {
      ourChange = true
      if (showPasswordsByDefault) {
        field.type = 'text'
        button.textContent = 'Hide'
      } else {
        field.type = 'password'
        button.textContent = 'Show'
      }
      setTimeout(() => { ourChange = false }, 0)
    }
  })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'update') {
    extensionEnabled = request.extensionEnabled !== false
    showPasswordsByDefault = request.showPasswordsByDefault !== false
    if (extensionEnabled) {
      addCustomToggleButtons()
      applyVisibilityToExistingButtons()
    } else {
      removeCustomToggleButtons()
    }
  }
})

init()
