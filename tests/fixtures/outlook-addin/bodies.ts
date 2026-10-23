/**
 * Synthetic message bodies in the HTML dialects Office.js returns. Every name, address and
 * sentence is made up. The structures follow public descriptions of each editor's output; they
 * were not copied from a real mailbox.
 *
 * - `web*`: Outlook on the web and the new Outlook for Windows (the same editor): user text in
 *   `div.elementToProof`, `#Signature`, `#appendonsend`, `hr`, `#divRplyFwdMsg` and the quote.
 * - `classic*`: classic Outlook for Windows writes Word's HTML (`p.MsoNormal`, `o:p`) and marks the
 *   end of the composed part, the signature and the original message with bookmarks
 *   (`_MailEndCompose`, `_MailAutoSig`, `_MailOriginal`). Not yet checked in a real classic Outlook.
 */

const WEB_HEAD =
  '<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><style type="text/css" style="display:none;"> P {margin-top:0;margin-bottom:0;} </style></head>';
const WEB_LINE_STYLE =
  'font-family: Aptos, Calibri, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);';

const webLine = (text: string) =>
  `<div class="elementToProof" style="${WEB_LINE_STYLE}">${text === '' ? '<br>' : text}</div>`;

const WEB_SIGNATURE =
  '<div id="Signature" class="elementToProof"><div style="font-size: 11pt;">Deniz Örnek<br>Örnek Lojistik</div></div>';

const WEB_QUOTE =
  '<div id="appendonsend"></div><hr style="display:inline-block;width:98%" tabindex="-1">' +
  '<div id="divRplyFwdMsg" dir="ltr"><font face="Calibri, sans-serif" style="font-size:11pt" color="#000000">' +
  '<b>From:</b> Ayşe Kaya &lt;ayse@example.test&gt;<br><b>Sent:</b> Friday, October 9, 2026 10:15<br>' +
  '<b>To:</b> Deniz Örnek &lt;deniz@example.test&gt;<br><b>Subject:</b> Proje toplantısı</font><div>&nbsp;</div></div>' +
  '<div class="elementToProof"><div>Merhaba Deniz, perşembe 14:00 uygun mu? Faturayı da konuşalım.</div></div>';

const web = (body: string) => `<html>${WEB_HEAD}<body dir="ltr">${body}</body></html>`;

/** A reply draft with the user's text, a signature and the quoted earlier message. */
export const WEB_REPLY_DRAFT = web(
  webLine('Toplantı perşembe günü olsun mu?') + webLine('') + WEB_SIGNATURE + WEB_QUOTE,
);

/** A reply draft where the user has not written anything yet. */
export const WEB_EMPTY_REPLY = web(webLine('') + WEB_SIGNATURE + WEB_QUOTE);

/** A new message with text and no signature. */
export const WEB_NEW_MESSAGE = web(
  webLine('Merhaba ekip,') + webLine('') + webLine('Raporu cuma günü paylaşırım.'),
);

/** A new, empty message without a signature. */
export const WEB_EMPTY_NEW_MESSAGE = web(webLine(''));

/** A new message with text and the automatic signature. */
export const WEB_NEW_MESSAGE_WITH_SIGNATURE = web(
  webLine('Raporu cuma günü paylaşırım.') + webLine('') + WEB_SIGNATURE,
);

/** A received message (read mode) with its own signature and the earlier mail it quotes. */
export const WEB_RECEIVED_MESSAGE = web(
  '<div dir="ltr"><div>Merhaba Deniz,</div><div><br></div><div>Perşembe 14:00 bana uyar. Faturayı da gündeme ekleyelim.</div></div>' +
    '<div id="x_Signature"><div>Ayşe Kaya</div></div>' +
    '<div id="x_appendonsend"></div><hr>' +
    '<div id="x_divRplyFwdMsg"><b>From:</b> Deniz Örnek<br><b>Subject:</b> Proje toplantısı</div>' +
    '<div>Toplantı perşembe günü olsun mu?</div>',
);

const CLASSIC_HEAD =
  '<head><meta http-equiv=Content-Type content="text/html; charset=utf-8"><meta name=Generator content="Microsoft Word 15 (filtered medium)">' +
  '<style><!-- p.MsoNormal {margin:0cm;font-size:11.0pt;font-family:"Calibri",sans-serif;} --></style></head>';

const classicLine = (text: string) =>
  `<p class=MsoNormal>${text === '' ? '<o:p>&nbsp;</o:p>' : `${text}<o:p></o:p>`}</p>`;

const classic = (body: string) =>
  `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">${CLASSIC_HEAD}` +
  `<body lang=TR style='word-wrap:break-word'><div class=WordSection1>${body}</div></body></html>`;

const CLASSIC_SIGNATURE = '<p class=MsoNormal><a name="_MailAutoSig">Deniz Örnek<o:p></o:p></a></p>';

const CLASSIC_QUOTE =
  "<div><div style='border:none;border-top:solid #E1E1E1 1.0pt;padding:3.0pt 0cm 0cm 0cm'>" +
  '<p class=MsoNormal><a name="_MailOriginal"><b>From:</b> Ayşe Kaya &lt;ayse@example.test&gt;<br><b>Sent:</b> Friday, October 9, 2026 10:15<br><b>Subject:</b> Proje toplantısı</a><o:p></o:p></p></div></div>' +
  classicLine('Merhaba Deniz, perşembe 14:00 uygun mu? Faturayı da konuşalım.');

/** A classic Outlook reply draft: the user's text, the end-of-compose bookmark, signature and quote. */
export const CLASSIC_REPLY_DRAFT = classic(
  classicLine('Toplantı perşembe günü olsun mu?') +
    '<p class=MsoNormal><a name="_MailEndCompose"><o:p>&nbsp;</o:p></a></p>' +
    CLASSIC_SIGNATURE +
    CLASSIC_QUOTE,
);

/** A classic Outlook new message with the automatic signature and no text yet. */
export const CLASSIC_EMPTY_NEW_MESSAGE_WITH_SIGNATURE = classic(
  classicLine('') +
    '<p class=MsoNormal><a name="_MailEndCompose"><o:p>&nbsp;</o:p></a></p>' +
    CLASSIC_SIGNATURE,
);
