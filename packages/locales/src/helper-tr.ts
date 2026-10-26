import type { HelperText } from '@writehand/ui';

export const helperTr: HelperText = {
  title: 'Yardımcı uygulama',
  description:
    'Bilgisayarınızdaki bu küçük program ChatGPT veya Claude üyeliğinizi bağlar ve oturum bilgilerinizi korur. API anahtarları onsuz çalışır.',
  states: {
    checking: 'Denetleniyor…',
    permission: 'İzin gerekli',
    missing: 'Kurulu değil',
    outdated: 'Güncelleme gerekli',
    connected: 'Bağlı',
  },
  permissionBody:
    'Önce eklentinin bu bilgisayardaki yardımcı uygulamayla konuşmasına izin verin. Tarayıcınız onay isteyecek.',
  grant: 'İzin ver',
  missingBody:
    'Yardımcı uygulama henüz kurulu değil ya da çalışmıyor. Kurulum sihirbazı onu tek komutla kurar.',
  outdatedBody: 'Kurulu yardımcı uygulama, eklentinin bu sürümü için eski. Devam etmek için güncelleyin.',
  version: (version, system) => `Sürüm ${version} · ${system}`,
  browsers: (names) => `Kayıtlı tarayıcılar: ${names}`,
  development: 'Kaynak koddan geliştirme kurulumu; kendini güncellemez.',
  checkUpdates: 'Güncellemeleri denetle',
  checkUpdatesHint:
    'Yardımcı uygulama günde en fazla bir kez GitHub’dan en son sürüm numarasını alır. Başka hiçbir şey gönderilmez.',
  updateAvailable: (version) => `Sürüm ${version} hazır.`,
  upToDate: 'Yardımcı uygulama güncel.',
  update: 'Güncelle',
  updating: 'Güncelleniyor…',
  updated: (version) => `Sürüm ${version} kuruldu.`,
  openWizard: 'Kurulum sihirbazını aç',
  uninstallTitle: 'Nasıl kaldırılır?',
  uninstallBody: (flag) =>
    `Bu komut yardımcı uygulamayı bilgisayardan ve bütün tarayıcılardan kaldırır. ChatGPT oturumlarını kapatıp kayıtlı giriş bilgilerini de silmek için sonuna ${flag} ekleyin.`,
  copy: 'Kopyala',
  copied: 'Kopyalandı',
};
