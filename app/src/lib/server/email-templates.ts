import { env } from '$env/dynamic/private'
import type { SongEmailData } from './email'

const getAppName = () => env.APP_NAME || 'Vocal Royale'
const getAppUrl = () => env.ORIGIN || 'http://localhost:3000'

function baseTemplate(title: string, content: string): string {
	const appName = getAppName()

	return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${title} - ${appName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #b82015; font-family: 'Fredoka', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-image: radial-gradient(#a11b11 1.2px, transparent 1.2px); background-size: 12px 12px;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="font-family: 'Bangers', Arial, sans-serif; font-size: 48px; color: #ffcc00; margin: 0; text-shadow: 3px 3px 0 #000;">${appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #5e0e79; border: 2px solid #333; border-radius: 10px; box-shadow: 4px 4px 0 #2a0436; padding: 30px; color: white;">
              ${content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 30px; color: #b3b3b3; font-size: 12px;">
              &copy; 2025 David Weppler
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function songConfirmationTemplate(data: SongEmailData): { subject: string; html: string } {
	const content = `
    <h2 style="font-family: 'Fredoka', Arial, sans-serif; font-size: 24px; margin-top: 0; color: #ffcc00;">
      Dein Song wurde bestätigt!
    </h2>
    <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">
      Ai Gude ${data.firstName}${data.artistName ? ` a.k.a. ${data.artistName}` : ''},
    </p>
    <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">
      Ai subbäää! Dein Song für die ${data.round}. Runde wurde bestätigt:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin: 25px 0; width: 100%;">
      <tr>
        <td style="background-color: rgba(255, 204, 0, 0.15); border: 2px solid #ffcc00; border-radius: 8px; padding: 20px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #cccccc;">Künstler</p>
          <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #ffcc00;">${data.artist}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #cccccc;">Song</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ffcc00;">${data.songTitle}</p>
        </td>
      </tr>
    </table>
    <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">
      Und jetzt schön üben, dass es auch ja fetzt. Viel Erfolg!
    </p>
    <p style="font-size: 16px; line-height: 1.5; margin-top: 25px;">
      Bis dann!<br/>
    </p>
  `

	return {
		subject: `Song bestätigt: ${data.artist} - ${data.songTitle}`,
		html: baseTemplate('Song bestätigt', content)
	}
}

export function songRejectionTemplate(data: SongEmailData): { subject: string; html: string } {
	const appUrl = data.appUrl || getAppUrl()

	const commentSection = data.comment
		? `
      <div style="background-color: rgba(255, 100, 100, 0.1); border: 1px solid rgba(255, 100, 100, 0.3); border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #ff9999;">Anmerkung:</p>
        <p style="margin: 0; font-size: 16px; color: #ffffff; font-style: italic;">"${data.comment}"</p>
      </div>
    `
		: ''

	const content = `
    <h2 style="font-family: 'Fredoka', Arial, sans-serif; font-size: 24px; margin-top: 0; color: #ffcc00;">
      Dein Song wurde leider abgelehnt
    </h2>
    <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">
      Ai Gude ${data.firstName}${data.artistName ? ` a.k.a. ${data.artistName}` : ''},
    </p>
    <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">
      Leider ist dein Song für die ${data.round}. Runde nicht verfügbar:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin: 25px 0; width: 100%;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.05); border: 2px solid #666; border-radius: 8px; padding: 20px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #999999;">Künstler</p>
          <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #cccccc; text-decoration: line-through;">${data.artist}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #999999;">Song</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #cccccc; text-decoration: line-through;">${data.songTitle}</p>
        </td>
      </tr>
    </table>
    ${commentSection}
    <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">
      Bitte wähle einen neuen Song für diese Runde aus:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td align="center" style="background-color: #ffcc00; border: 2px solid #333; border-radius: 12px; box-shadow: 4px 4px 0 #cc9900;">
          <a href="${appUrl}/song-choice" style="display: inline-block; padding: 12px 24px; color: #161616; text-decoration: none; font-weight: 600; font-size: 16px;">
            Neuen Song wählen
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 16px; line-height: 1.5; margin-top: 25px;">
      Ich drück die Daumen für deine nächste Wahl!<br/><br/>
    </p>
  `

	return {
		subject: `Song abgelehnt: ${data.artist} - ${data.songTitle}`,
		html: baseTemplate('Song abgelehnt', content)
	}
}
