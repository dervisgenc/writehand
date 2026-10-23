import { PRODUCT_NAME } from '@writehand/contracts';

import type { WelcomeText } from './extension-text';

export const welcomeTr: WelcomeText = {
  title: 'Hoş geldiniz',
  subtitle: `${PRODUCT_NAME} üç kısa adımda hazır`,
  stepsLabel: 'Kurulum adımları',
  steps: ['Hoş geldiniz', 'Bağlantı', 'Deneyin'],
  back: 'Geri',
  next: 'Devam',
  intro: {
    title: 'Bağlanmanın iki yolu',
    lead: `${PRODUCT_NAME} Outlook Web’in ve Gmail’in içinde çalışır ve seçtiğiniz AI sağlayıcısıyla yazar. Size uygun olanı sonraki adımda seçin; istediğiniz zaman değiştirebilirsiniz.`,
    apiKey: {
      title: 'Kendi API anahtarınız',
      points: [
        'Doğrudan tarayıcıda çalışır; hiçbir şey kurmanız gerekmez.',
        'Groq ve OpenRouter ücretsiz modeller sunar; OpenAI kullandıkça ödenir.',
        'Anahtar bu tarayıcıda şifreli saklanır ve yalnızca kendi sağlayıcısına gönderilir.',
      ],
    },
    plan: {
      title: 'ChatGPT veya Claude üyeliğiniz',
      points: [
        'Zaten sahip olduğunuz aboneliği kullanır: ChatGPT Plus veya Pro ya da Claude Code üzerinden Claude.',
        'Bu bilgisayarda, tek komutla ve yönetici izni olmadan kurulan küçük bir yardımcı uygulama gerekir.',
        'Oturumunuz tarayıcıda değil, bu bilgisayarda kalır. Yardımcı uygulama açık kaynaktır.',
      ],
    },
    source: 'GitHub’daki kaynak kodu',
    doesTitle: 'Ne yapar?',
    does: [
      'Siz istediğinizde, seçtiğiniz metni seçtiğiniz sağlayıcıya iletir.',
      'Her sonucu önce önizlemede gösterir; taslağınız yalnızca siz onaylayınca değişir.',
    ],
    doesNotTitle: 'Ne yapmaz?',
    doesNot: [
      'E-posta göndermez.',
      'Posta kutunuzu arka planda okumaz.',
      'Hiçbir şeyi bizim sunucumuza göndermez; böyle bir sunucu yok.',
    ],
  },
  install: {
    title: 'Yardımcı uygulamayı kurun',
    lead: 'Bu yöntem için bilgisayarınızda küçük bir yardımcı uygulama gerekir. Tek komut onu kullanıcı hesabınıza kurar; yönetici izni gerekmez.',
    system: 'Sisteminiz',
    command: 'Kurulum komutu',
    terminal: {
      darwin: 'Terminal’i açın (Uygulamalar → İzlenceler), komutu yapıştırıp Return’e basın.',
      linux: 'Bir terminal açın (çoğu masaüstünde Ctrl+Alt+T), komutu yapıştırıp Enter’a basın.',
      windows: 'PowerShell’i açın (Başlat’a sağ tıklayıp Terminal’i seçin), komutu yapıştırıp Enter’a basın.',
    },
    waiting: 'Yardımcı uygulama bekleniyor… Komut bittikten birkaç saniye sonra burada görünür.',
    connected: (version) => `Yardımcı uygulama bağlandı (sürüm ${version}).`,
    whatTitle: 'Komut ne yapar?',
    what: [
      'GitHub’daki son sürümden sisteminize uygun programı indirir.',
      'SHA-256 sağlamasını denetler; tutmazsa durur.',
      'Programı yönetici izni olmadan kullanıcı klasörünüze kurar.',
      'Bu eklentinin ulaşabilmesi için onu Firefox, Chrome, Edge ve Brave’e kaydeder.',
    ],
  },
  tryIt: {
    title: 'Deneyin',
    lead: 'Her şeyin çalıştığını uydurma bir e-postayı düzelterek görün. Metin yalnızca seçtiğiniz sağlayıcıya gider; e-posta olarak hiçbir şey gönderilmez.',
    sampleLabel: 'Örnek e-posta',
    sample:
      'Merhaba Deniz,\n\nmesajın için teşekürler. Raporu perşembe gönderebilirim ama önce ekibinden son rakamlar lazım. Çarşambaya kadar paylaşabilirmisin?\n\nSevgiler,\nAlex',
    run: 'Örneği düzelt',
    running: 'Düzeltiliyor…',
    success:
      'Her şey çalışıyor. Outlook’ta ya da Gmail’de bir taslak açın; araç çubuğu taslağın yanında görünür.',
    resultLabel: 'Sonuç',
    openOutlook: 'Outlook’u aç',
    personalOutlook: 'Outlook.com (kişisel)',
    openGmail: 'Gmail’i aç',
    openSettings: 'Ayarlar',
  },
};
