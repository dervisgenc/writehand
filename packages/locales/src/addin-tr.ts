import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinTr: AddinOwnText = {
  manifest: {
    description:
      'Outlook’ta e-postaları Groq, OpenRouter veya OpenAI’dan aldığınız kendi anahtarınızla düzeltin, çevirin, yanıtlayın ve yazın. Sonuçlar önce önizleme olarak görünür; onayınız olmadan taslağınıza hiçbir şey yazılmaz.',
    groupLabel: PRODUCT_NAME,
    buttonLabel: PRODUCT_NAME,
    buttonTooltip: `Bu e-postayı düzeltmek, çevirmek veya yazmak için ${PRODUCT_NAME}’i açın. Onayınız olmadan hiçbir şey yazılmaz veya gönderilmez.`,
  },
  pane: {
    settings: 'Ayarlar',
    back: 'Geri',
    loading: 'Yükleniyor…',
    noItem: 'Başlamak için bir e-posta seçin veya bir taslak açın.',
    outsideOutlook: `${PRODUCT_NAME} Outlook içinde çalışır. Bir e-postanın veya taslağın ${PRODUCT_NAME} düğmesiyle açın.`,
  },
  firstRun: {
    title: `${PRODUCT_NAME}’e hoş geldiniz`,
    lead: 'Kendi API anahtarınızı bu Outlook uygulamasında bir kez bağlayın. Groq ve OpenRouter ücretsiz modeller sunar.',
    steps: ['API anahtarı bağlayın', 'Deneyin'],
    success: 'Her şey çalışıyor. Bir e-posta seçin veya bir taslak açın ve ne yapmak istediğinizi seçin.',
    start: 'Başla',
  },
  ai: {
    description:
      'E-postalarınızı Groq, OpenRouter veya OpenAI’dan aldığınız kendi API anahtarınızla hazırlayın.',
    apiNote: (provider) =>
      `Anahtarınız bu Outlook uygulamasında şifreli saklanır ve yalnızca ${provider} hizmetine gönderilir. Ücretli kullanım ${provider} tarafından faturalandırılır.`,
    keySaved: (provider) => `${provider} anahtarı bu Outlook uygulamasında şifreli olarak kayıtlı.`,
    apiPrivacy: (provider) =>
      `Üretim istediğinizde metniniz, talimatınız ve seçtiğiniz bağlam bu Outlook uygulamasından doğrudan ${provider} hizmetine, ${provider} koşullarına tabi olarak gönderilir. Anahtar, ${provider} kimlik doğrulaması dışında bu Outlook uygulamasından hiçbir yere çıkmaz.`,
  },
  errors: {
    CLIPBOARD_UNAVAILABLE: 'Outlook panoya yazmaya izin vermedi. Metni seçip Ctrl+C ile kopyalayın.',
    AI_KEY_STORAGE_FAILED:
      'Bu Outlook uygulaması anahtarı güvenli biçimde saklayamadı veya okuyamadı; hiçbir şey kaydedilmedi. Yeniden deneyin; sorun sürerse Outlook bu bilgisayarda eklentiler için veri saklamıyordur.',
    AI_HOST_UNAVAILABLE:
      'ChatGPT ve Claude planları Outlook’ta henüz kullanılamıyor. Bunun yerine bir API anahtarı bağlayın.',
  },
  privacyPoints: [
    `${PRODUCT_NAME} sayfası her açılışta kendi web adresinden, Microsoft’un Office.js kitaplığı ise Microsoft’tan yüklenir. İkisine de e-posta içeriği veya anahtar gönderilmez.`,
    'Tercihleriniz ve şifreli API anahtarı yalnızca bu cihazdaki bu Outlook uygulamasında saklanır. Eşitlenmez, posta kutunuzda saklanmaz ve tarayıcı eklentisiyle paylaşılmaz.',
    `${PRODUCT_NAME} yalnızca açık e-postayı veya taslağı, siz kullanırken okur ve bellekte tutar.`,
    'Metin yalnızca Düzelt, Çevir, Yaz veya Yanıt hazırla’yı seçtiğinizde, seçtiğiniz yapay zekâ sağlayıcısına (Groq, OpenRouter veya OpenAI) gönderilir.',
    'Sonuçlar önce önizleme olarak görünür ve taslağınıza ancak onayladıktan sonra yazılır.',
    `${PRODUCT_NAME} asla e-posta göndermez; açtığı yanıt bir taslaktır.`,
  ],
};
