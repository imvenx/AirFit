import { boot } from 'quasar/wrappers'
import { createI18n } from 'vue-i18n'
import messages from 'src/i18n'

function getLanguageFromUrl(): string {
  const urlParams = new URLSearchParams(window.location.search)
  const langParam = urlParams.get('lang')
  
  if (langParam && ['en', 'es', 'pt', 'ja', 'ko', 'hi'].includes(langParam)) {
    localStorage.setItem('preferred-language', langParam)
    return langParam
  }
  
  const savedLanguage = localStorage.getItem('preferred-language')
  if (savedLanguage && ['en', 'es', 'pt', 'ja', 'ko', 'hi'].includes(savedLanguage)) {
    return savedLanguage
  }
  
  return navigator.language.split('-')[0] || 'en'
}

export default boot(({ app }) => {
  const i18n = createI18n({
    locale: getLanguageFromUrl(),
    fallbackLocale: 'en',
    messages,
    legacy: false,
    globalInjection: true
  })

  app.use(i18n)
})