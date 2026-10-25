import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinTr: AddinOwnText = {
  manifest: {
    description:
      'Outlook’ta e-postaları Writehand yardımcı uygulamasıyla ChatGPT veya Claude planınızla ya da kendi API anahtarınızla düzeltin, çevirin, yanıtlayın ve yazın. Sonuçlar önce önizlemede görünür; onayınız olmadan taslağa bir şey yazılmaz.',
    groupLabel: PRODUCT_NAME,
    buttonLabel: PRODUCT_NAME,
    buttonTooltip: `Bu e-postayı düzeltmek, çevirmek veya yazmak için ${PRODUCT_NAME}’i açın. Onayınız olmadan hiçbir şey yazılmaz veya gönderilmez.`,
    commands: {
      reviseTooltip: `Seçili metni ya da taslağı ${PRODUCT_NAME} bölmesinde düzeltin. Bir şey yazılmadan önce önizlemeyi görürsünüz.`,
      translateTooltip: `Seçili metni ya da taslağı ${PRODUCT_NAME} bölmesinde seçtiğiniz dile çevirin.`,
      writeTooltip: `Ne söylemek istediğinizi ${PRODUCT_NAME} bölmesinde anlatın; e-postayı ya da yanıtı önizleme olarak yazsın.`,
      open: `${PRODUCT_NAME}’i aç`,
    },
  },
  pane: {
    settings: 'Ayarlar',
    back: 'Geri',
    loading: 'Yükleniyor…',
    noItem: 'Başlamak için bir e-posta seçin veya bir taslak açın.',
    outsideOutlook: `${PRODUCT_NAME} Outlook içinde çalışır. Bir e-postanın veya taslağın ${PRODUCT_NAME} düğmesiyle açın.`,
    helperUnavailable:
      'ChatGPT ve Claude planları bu bölmeyi sunan Writehand yardımcı uygulamasında çalışır, ancak uygulama yanıt vermedi. Bir terminalde writehand outlook status komutunu çalıştırın ya da bir API anahtarı kullanın.',
  },
  firstRun: {
    title: `${PRODUCT_NAME}’e hoş geldiniz`,
    lead: 'Bu Outlook uygulamasında bir kez nasıl bağlanacağınızı seçin: yardımcı uygulama üzerinden ChatGPT veya Claude planınız ya da kendi API anahtarınız (Groq ve OpenRouter ücretsiz modeller sunar).',
    steps: ['Bağlantıyı seçin', 'Deneyin'],
    success: 'Her şey çalışıyor. Bir e-posta seçin veya bir taslak açın ve ne yapmak istediğinizi seçin.',
    start: 'Başla',
  },
  ai: {
    description:
      'E-postalarınızı yardımcı uygulama üzerinden ChatGPT veya Claude planınızla ya da Groq, OpenRouter veya OpenAI’dan aldığınız kendi API anahtarınızla hazırlayın.',
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
      'Writehand yardımcı uygulaması yanıt vermedi. Çalıştığını denetleyin (writehand outlook status) ya da bir API anahtarı bağlayın.',
  },
  privacyPoints: [
    `${PRODUCT_NAME} bölmesini bu bilgisayardaki yardımcı uygulama sunar; internetten yalnızca Microsoft’un Office.js kitaplığı yüklenir. Microsoft’a e-posta içeriği veya anahtar gönderilmez.`,
    'Tercihleriniz ve şifreli API anahtarı yalnızca bu cihazdaki bu Outlook uygulamasında saklanır. ChatGPT oturumları bu bilgisayardaki yardımcı uygulamada kalır; tarayıcı eklentisi de onu kullanır. Posta kutunuzda hiçbir şey saklanmaz.',
    `${PRODUCT_NAME} yalnızca açık e-postayı veya taslağı, siz kullanırken okur ve bellekte tutar.`,
    'Metin yalnızca Düzelt, Çevir, Yaz veya Yanıt hazırla’yı seçtiğinizde ve yalnızca seçtiğiniz yönteme gönderilir: yardımcı uygulama üzerinden ChatGPT veya Claude ya da anahtarınızla Groq, OpenRouter veya OpenAI.',
    'Sonuçlar önce önizleme olarak görünür ve taslağınıza ancak onayladıktan sonra yazılır.',
    `${PRODUCT_NAME} asla e-posta göndermez; açtığı yanıt bir taslaktır.`,
  ],
};
