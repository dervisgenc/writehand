import { PRODUCT_NAME } from '@writehand/contracts';
import type { AiText } from '@writehand/ui';

export const aiTr: AiText = {
  title: 'AI bağlantısı',
  description:
    'E-postalarınızı Groq, OpenRouter veya OpenAI’dan aldığınız kendi API anahtarınızla, ChatGPT planınızla ya da bilgisayarınızdaki Claude Code ile hazırlayın.',
  chatgpt: 'ChatGPT üyeliği',
  apiKey: 'API anahtarı',
  claudeCode: 'Claude aboneliği',
  methodHints: {
    chatgpt: 'Plus, Pro veya Business planınızla',
    'api-key': 'Groq, OpenRouter veya OpenAI; ücretsiz modeller de var',
    'claude-code': 'Claude Code ile, bu bilgisayarda',
  },
  methodLabel: 'Bağlantı yöntemi',
  recommended: 'Önerilen',
  experimental: 'Deneysel',
  needsHelper: 'Yardımcı uygulama gerekir',
  helperRequired: `Bu yöntem ${PRODUCT_NAME} yardımcı uygulamasında çalışır ve uygulama henüz bağlı değil. Kurulum sihirbazıyla kurun ya da onsuz çalışan API anahtarı yöntemini seçin.`,
  statusReady: 'Hazır',
  statusSetup: 'Kurulum gerekli',
  statusAction: 'Bağlantı gerekli',
  guide: {
    title: 'Bağlantı rehberi',
    intro:
      'Metin üretmek için aşağıdaki yöntemlerden birini kurun. Her yöntem için ne gerektiğini ve adımları buradan izleyebilirsiniz.',
    requirementsLabel: 'Gerekenler',
    stepsLabel: 'Adımlar',
    notesLabel: 'Bilmeniz gerekenler',
    current: 'Seçili',
    methods: {
      chatgpt: {
        title: 'ChatGPT üyeliği',
        summary: 'ChatGPT planınızın kullanım hakkıyla üretir.',
        requirements: [
          'ChatGPT Plus veya Pro aboneliği ya da bir Business, Enterprise veya Edu çalışma alanı. Ücretsiz hesaplar plan kullanımını desteklemez.',
          `Bu bilgisayarda ${PRODUCT_NAME} yardımcı uygulaması.`,
        ],
        steps: [
          'Yöntem olarak ChatGPT üyeliği’ni seçin.',
          '“Continue with ChatGPT” düğmesine basın. Tarayıcıda açılan sayfada hesabınızı seçip izin verin.',
          'Business, Enterprise veya Edu çalışma alanında bunun yerine “Codex girişiyle bağlan” düğmesine basıp çalışma alanını seçin.',
          'Bu sayfaya dönün; hesap “Bağlı · Metin üretmeye hazır” görünür. Ardından modeli seçin.',
        ],
        notes: [
          'Kullanım ChatGPT planınızın limitlerinden düşer. ChatGPT → Ayarlar → Usage bölümünden takip edebilirsiniz.',
          'Planınızı yeni yükselttiyseniz etkinleşmesi birkaç dakika sürebilir.',
          'Continue with ChatGPT şu an Plus ve Pro planlarına hizmet veriyor; iş hesaplarında kuruluş politikası bunu engelliyor. Codex girişiyle bağlan seçeneği bunun yerine OpenAI’ın Codex uygulamasının girişini kullanır. Deneyseldir: OpenAI bu girişi başka uygulamalar için belgelemiyor ve değiştirebilir.',
          'Codex girişiyle kullanım, planınızın Codex ve diğer iş özellikleriyle paylaşılan limitlerinden düşer. Business çalışma alanlarında haftalık limit dolunca kredi ile devam edilebilir; krediyi çalışma alanı sahipleri faturalandırma ayarlarından ekler.',
          'Erişimi istediğiniz zaman ChatGPT → Ayarlar → Security and login → Sign in with ChatGPT bölümünden kaldırabilirsiniz.',
        ],
      },
      'api-key': {
        title: 'API anahtarı',
        summary:
          'Groq, OpenRouter veya OpenAI’dan aldığınız kendi anahtarınızla, doğrudan bu tarayıcıdan üretir. Yardımcı uygulama gerekmez.',
        requirements: [
          'Groq, OpenRouter veya OpenAI’dan bir API anahtarı. Groq’un ücretsiz planı ve OpenRouter’ın ücretsiz modelleri ödeme yöntemi istemez.',
        ],
        steps: [
          'Yöntem olarak API anahtarı’nı, ardından sağlayıcıyı seçin.',
          'Sağlayıcının sitesinde bir anahtar oluşturun (bağlantılar aşağıda) ve yapıştırın.',
          '“Anahtarı bağla”ya basın ve tarayıcının sağlayıcıya bağlanmasına izin verin.',
          'Modeli seçin. Groq’ta OpenAI’ın ücretsiz açık ağırlıklı modeli openai/gpt-oss-120b sizin için seçilir.',
        ],
        notes: [
          'Groq’un ücretsiz planında dakikalık ve günlük kullanım limitleri vardır. Uzun bir yazışma bu limiti aşabilir; bağlamdan bazı mesajları çıkarın veya biraz sonra yeniden deneyin.',
          'OpenRouter’da ücretsiz modeller listenin başındadır. Metninizin hangi sağlayıcılara gidebileceğine OpenRouter gizlilik ayarlarınız karar verir; bazı ücretsiz modelleri yalnızca istemleri saklayabilen sağlayıcılar sunar.',
          'Ücretli kullanım, ChatGPT veya Claude aboneliğinizden ayrı olarak sağlayıcı tarafından faturalandırılır. OpenAI modelleri her zaman ücretlidir; bu yüzden modeli siz seçersiniz.',
          'Anahtar bu tarayıcıda şifreli saklanır ve yalnızca kendi sağlayıcısına gönderilir. Bir daha gösterilmez; değiştirmek için yeni anahtar bağlayın.',
          'Tarayıcı profilinizi kullanabilen herkes kayıtlı anahtarla metin üretebilir. Harcama limiti olan bir anahtar tercih edin ve ortak bilgisayarlarda anahtarı kaldırın.',
        ],
      },
      'claude-code': {
        title: 'Claude aboneliği',
        summary: 'Bilgisayarınızdaki Claude Code’u kendi Claude hesabınızla kullanır.',
        requirements: [
          'Claude Pro, Max, Team veya Enterprise aboneliği.',
          'Bu bilgisayarda kurulu ve Claude hesabınızla oturum açılmış Claude Code.',
          `${PRODUCT_NAME} yardımcı uygulaması. Claude Code’dan sonra kurulursa Claude Code’u kendiliğinden bulur.`,
        ],
        steps: [
          'Claude Code’u Anthropic’in resmî kurulum adımlarıyla kurun.',
          'Terminalde `claude` yazın ve `/login` ile Claude hesabınıza giriş yapın.',
          'Yardımcı uygulamayı kurun; daha önce kurduysanız Claude Code’dan sonra yeniden kurun.',
          'Yöntem olarak Claude aboneliği’ni seçin. Hesabınız ve planınız burada görünür.',
        ],
        notes: [
          `${PRODUCT_NAME} Claude şifrenizi veya oturum bilgilerinizi görmez ve saklamaz; giriş ve çıkış Claude Code üzerinden yapılır.`,
          'Kullanım, Claude Code ile ortak olan plan limitinizden düşer.',
          'Pro ve Max planlarında Claude gizlilik ayarlarından model eğitimini kapatmadıysanız içerik eğitimde kullanılabilir. Team ve Enterprise planları ticari koşullara tabidir.',
          'Claude Code bir API anahtarıyla oturum açmışsa kullanım o API hesabından ücretlendirilir.',
          'Bu yöntem Anthropic’in üçüncü taraf uygulama kurallarına bağlıdır ve deneysel olarak sunulur. Kurallar değişirse kullanılamayabilir.',
        ],
        linkLabel: 'Claude Code kurulum rehberi',
      },
    },
    helper: {
      title: 'Yardımcı uygulama nedir?',
      summary:
        'ChatGPT ve Claude üyelikleri için gereken, bilgisayarınızda çalışan küçük bir uygulama; API anahtarları onsuz çalışır.',
      requirements: ['macOS, Linux veya Windows. Başka bir yazılım gerekmez.'],
      steps: [
        'Ayarlar → Yardımcı uygulama bölümünden kurulum sihirbazını açın ve gösterdiği tek satırlık komutu çalıştırın.',
        'Yardımcı uygulama birkaç saniye içinde bağlı görünür; ardından burada bir yöntem seçin.',
      ],
      notes: [
        'ChatGPT giriş bilgileri tarayıcıda değil, yalnızca sizin erişebildiğiniz korumalı bir dosyada tutulur.',
        'Yardımcı uygulama yalnızca siz üretim istediğinizde çalışır; arka planda e-posta okumaz veya göndermez.',
      ],
    },
  },
  connect: 'Continue with ChatGPT',
  codexConnect: 'Codex girişiyle bağlan',
  codexHint:
    'ChatGPT Business, Enterprise ve Edu çalışma alanları için. OpenAI’ın Codex uygulamasının girişini kullanır; Codex’in kurulu olması gerekmez. Deneysel.',
  codexSignIn: 'Codex girişi',
  codexConnectionHelp:
    'Bu bağlantı Codex girişini kullanıyor. Kullanım planınızın Codex ile paylaşılan limitlerinden düşer; Business çalışma alanlarında limit dolunca kredi ile devam edilebilir. Oturumu buradan hesabı kaldırarak sonlandırabilirsiniz.',
  codexWarningTitle: 'Codex girişini kullanmadan önce',
  codexWarning: [
    'Yalnızca Continue with ChatGPT’nin kuruluş politikasıyla engellendiği ChatGPT Business, Enterprise veya Edu çalışma alanları için kullanın. Plus ve Pro için Continue with ChatGPT’yi kullanın.',
    `${PRODUCT_NAME}, OpenAI’ın Codex uygulamasının girişini kullanır. OpenAI bu girişi başka uygulamalar için yayımlamadı: her an değişebilir ya da çalışmayı bırakabilir ve OpenAI bu şekilde kullanan hesapları kısıtlayabilir.`,
    'Çalışma alanınızın politikaları geçerlidir. Kullanıp kullanamayacağınızdan emin değilseniz önce çalışma alanı yöneticinize danışın.',
  ],
  codexWarningContinue: 'Anladım, devam et',
  addAccount: 'Farklı hesap veya çalışma alanı ekle',
  reconnect: 'Yeniden bağlan',
  disconnect: 'Bağlantıyı kes',
  account: 'ChatGPT hesabı',
  activeAccount: 'Kullanımdaki hesap',
  useAccount: 'Bu hesabı kullan',
  savedConnection: 'Hesap bağlı. Üretimde kullanmak için Bu hesabı kullan’a basın.',
  renameAccount: 'Yeniden adlandır',
  accountName: 'Bağlantı adı',
  accountNameHint:
    'Örneğin Kişisel veya İş · Şirket adı. Ad yalnızca bu cihazda kullanılır; en fazla 80 karakter.',
  saveAccountName: 'Adı kaydet',
  removeAccount: 'Hesabı kaldır',
  removeAccountTitle: 'Bu bağlantı kaldırılsın mı?',
  removeAccountBody:
    'Bu cihazdaki hesap kaydı ve oturum bilgileri silinir; varsa oturumun OpenAI tarafında iptali denenir. Bekleyen giriş iptal edilir. Yeniden kullanmak için hesabı tekrar eklemeniz gerekir. ChatGPT hesabınız silinmez.',
  confirmRemoveAccount: 'Kaldır',
  savedAccountHint:
    'Listeden bir kayıt seçerek adını değiştirebilir veya kaldırabilirsiniz. Giriş düğmeleri seçili kaydın hesabını ve çalışma alanını kullanır. Başka bir hesap için aşağıdaki ekleme düğmesini kullanın.',
  model: 'Model',
  refresh: 'Yenile',
  checking: 'Bağlantı kontrol ediliyor…',
  signingIn: 'Tarayıcıda açılan ChatGPT girişini tamamlayın.',
  cancel: 'İptal',
  connected: 'Bağlı · Metin üretmeye hazır',
  disconnected: 'Oturum kapalı',
  registrationIncomplete:
    'Hesap bağlantısı tamamlanmadı; bu kaydın hesap bilgisi henüz doğrulanamadı. Continue with ChatGPT ile ilk denemedeki hesap ve çalışma alanını kullanarak yeniden deneyin.',
  generationUnavailable:
    'Hesap doğrulandı ve plan izni alındı; metin üretimi henüz hazır değil. Model listesini yeniden yüklemek için Yenile’ye basın.',
  planDisabled:
    'Hesap doğrulandı; üretim izni yok. Planla üretim için uygun bir Plus/Pro hesabı ve plan kullanım izni gerekir. Ücretsiz hesapla giriş yapmak üretim hakkı sağlamaz.',
  planNote:
    'Uygun Plus ve Pro hesapları Continue with ChatGPT ile plan limitlerini kullanabilir. Business, Enterprise ve Edu çalışma alanları için Codex girişiyle bağlan seçeneğini kullanın.',
  apiNote: (provider) =>
    `Anahtarınız bu tarayıcıda şifreli saklanır ve yalnızca ${provider} hizmetine gönderilir. Ücretli kullanım, ChatGPT veya Claude aboneliğinizden ayrı olarak ${provider} tarafından faturalandırılır.`,
  claudeNote: `Bilgisayarınızda kurulu Claude Code, kendi Claude hesabınızla çalıştırılır; kullanım Claude planınızın limitlerinden düşer. ${PRODUCT_NAME} Claude hesap bilgilerinize erişmez ve bunları saklamaz. Giriş ve çıkış Claude Code üzerinden yapılır.`,
  claudeAccount: 'Claude Code hesabı',
  claudeNotInstalled:
    'Claude Code bu bilgisayarda bulunamadı. Claude Code’u kurun, ardından yardımcı uygulamanın kurulum komutunu yeniden çalıştırıp Yenile’ye basın.',
  claudeNotLoggedIn:
    'Claude Code’da oturum açık değil. Terminalde claude komutunu çalıştırıp /login ile giriş yapın, ardından Yenile’ye basın.',
  claudeApiBilling:
    'Claude Code şu an Claude aboneliği yerine API anahtarı gibi başka bir yöntemle oturum açmış; kullanım o hesaptan ücretlendirilir.',
  claudePrivacy:
    'Üretim istediğinizde metniniz, talimatınız ve seçtiğiniz bağlam Claude Code üzerinden Anthropic’e gönderilir. Claude Code araçsız çalışır, dosyalarınıza erişmez ve oturum kaydı tutmaz. Pro ve Max planları Anthropic’in tüketici koşullarına tabidir: Claude gizlilik ayarlarından model eğitimini kapatmadıysanız içerik eğitimde kullanılabilir. Team ve Enterprise planları ticari koşullara tabidir.',
  provider: 'Sağlayıcı',
  providerHints: {
    groq: 'Hızlı; ücretsiz planında OpenAI’ın GPT-OSS’u gibi ücretsiz modeller var.',
    openrouter: 'Pek çok sağlayıcıdan yüzlerce model; bazıları ücretsiz.',
    openai: 'OpenAI’ın GPT modelleri; kullandıkça ödenir.',
  },
  apiKeyLabel: (provider) => `${provider} API anahtarı`,
  createKey: (provider) => `${provider} API anahtarı oluştur`,
  saveKey: 'Anahtarı bağla',
  removeKey: 'Anahtarı kaldır',
  keySaved: (provider) => `${provider} anahtarı bu tarayıcıda şifreli olarak kayıtlı.`,
  replaceKeyHint:
    'Başka bir anahtar kullanmak için yapıştırıp Anahtarı bağla’ya basın; kayıtlı anahtarın yerini alır.',
  keyFromOtherProvider: (provider) =>
    `Bu bir ${provider} anahtarına benziyor, bu yüzden gönderilmedi. Yukarıdan ${provider} hizmetini seçin ya da seçili sağlayıcının anahtarını yapıştırın.`,
  accessNeeded: (provider) =>
    `Tarayıcı, ${PRODUCT_NAME} uygulamasının ${provider} hizmetine bağlanmasına izin vermiyor. Kayıtlı anahtarı kullanmak için erişime izin verin.`,
  grantAccess: 'Erişime izin ver',
  freeModels: 'Ücretsiz modeller',
  paidModels: 'Ücretli modeller',
  apiPrivacy: (provider) =>
    `Üretim istediğinizde metniniz, talimatınız ve seçtiğiniz bağlam bu tarayıcıdan doğrudan ${provider} hizmetine, ${provider} koşullarına tabi olarak gönderilir. Anahtar, ${provider} kimlik doğrulaması dışında bu tarayıcıdan hiçbir yere çıkmaz.`,
  manageUsage: 'Kullanımı yönet',
  connectionHelp:
    'ChatGPT bağlantınızı Ayarlar → Security and login → Sign in with ChatGPT bölümünden yönetin. Bu bağlantı Plugins listesinde görünmez. İş hesabında kuruluş politikası ve plan uygunluğu ayrıca geçerlidir.',
  welcome: 'ChatGPT planınızı kullanıyorsunuz',
  welcomeBody: `${PRODUCT_NAME} içindeki uygun üretimler ChatGPT planınızın veya kullanılabilir kredilerinizin limitlerini kullanır. Uygulamanın kullanımını ChatGPT ayarlarından yönetebilirsiniz.`,
  gotIt: 'Anladım',
  privacy:
    'Üretim istediğinizde metniniz, talimatınız ve seçtiğiniz bağlam OpenAI’a gönderilir. Eklenti bunları diske kaydetmez. ChatGPT sohbet geçmişinize erişilmez.',
  usePlan: 'ChatGPT planı kullanılıyor',
  useApi: (provider) => `${provider} API anahtarı kullanılıyor`,
  useClaude: 'Claude aboneliği kullanılıyor',
  openSettings: 'AI ayarları',
  notReady: 'Üretim için AI hesabınızı bağlayın',
};
