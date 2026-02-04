export function applyTheme(theme, skipTransition = false) {
  if (skipTransition) {
    document.body.classList.add('no-transition')
  }

  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  }
  if (theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme)
  }

  if (skipTransition) {
    document.body.offsetHeight
    document.body.classList.remove('no-transition')
  }
}

function openThemePicker(selectElement) {
  if (typeof selectElement.showPicker === 'function') {
    selectElement.showPicker()
    return
  }
  selectElement.focus()
  selectElement.click()
}

export function handleThemePillClick(event, selectElement) {
  if (event.target === selectElement) {
    return
  }
  openThemePicker(selectElement)
}
