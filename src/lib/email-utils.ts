export const escHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Strip CR/LF to prevent SMTP header injection in subject lines.
export const escSubject = (s: string) => String(s).replace(/[\r\n]/g, '')
