import { env } from '$env/dynamic/private'
import type { SongEmailData } from './email'

const DEFAULT_APP_NAME = 'Vocal Royale'
const getAppUrl = () => env.ORIGIN || 'http://localhost:3000'

function baseTemplate(title: string, content: string, appName: string = DEFAULT_APP_NAME): string {
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
		html: baseTemplate('Song bestätigt', content, data.appName || DEFAULT_APP_NAME)
	}
}

// Certificate Email Types and Functions
export interface CertificateEmailData {
	name: string
	artistName: string
	placement: number
	totalParticipants: number
	totalScore: number
	personalizedText: string
	totalVoters: number
	totalJurors: number
	appName?: string
	appUrl?: string
}

interface CertificateColors {
	background: string
	backgroundPattern: string
	badgeColor: string
	badgeShadow: string
	copyrightColor: string
}

function getCertificateColors(placement: number): CertificateColors {
	if (placement === 1) {
		// Gold for 1st place
		return {
			background: '#d4af37',
			backgroundPattern: '#b8962e',
			badgeColor: '#ffd700',
			badgeShadow: '#8b7500',
			copyrightColor: '#5a4a1a' // Dark brown for readability on gold
		}
	} else if (placement === 2) {
		// Silver background for 2nd place, but keep yellow/white text like others
		return {
			background: '#a8a8a8',
			backgroundPattern: '#8e8e8e',
			badgeColor: '#ffcc00',
			badgeShadow: '#cc9900',
			copyrightColor: '#3a3a3a' // Dark gray for readability on silver
		}
	} else if (placement === 3) {
		// Bronze background for 3rd place, but keep yellow/white text like others
		return {
			background: '#A84300',
			backgroundPattern: '#8a3700',
			badgeColor: '#ffcc00',
			badgeShadow: '#cc9900',
			copyrightColor: '#b3b3b3' // Light gray (standard)
		}
	} else {
		// Standard red for all others
		return {
			background: '#b82015',
			backgroundPattern: '#a11b11',
			badgeColor: '#ffcc00',
			badgeShadow: '#cc9900',
			copyrightColor: '#b3b3b3' // Light gray (standard)
		}
	}
}

function getPlacementText(placement: number): string {
	if (placement === 1) return '1. Platz - Sieger!'
	if (placement === 2) return '2. Platz'
	if (placement === 3) return '3. Platz'
	return `${placement}. Platz`
}

function getPlacementEmoji(placement: number): string {
	if (placement === 1) return '&#127942;' // Trophy
	if (placement === 2) return '&#129352;' // 2nd medal
	if (placement === 3) return '&#129353;' // 3rd medal
	return '&#127775;' // Star
}

export function certificateTemplate(data: CertificateEmailData): { subject: string; html: string } {
	const colors = getCertificateColors(data.placement)
	const placementText = getPlacementText(data.placement)
	const emoji = getPlacementEmoji(data.placement)

	const displayName = data.artistName ? `${data.name} a.k.a. ${data.artistName}` : data.name

	const appName = data.appName || DEFAULT_APP_NAME

	const content = `
    <div style="text-align: center; margin-bottom: 25px;">
      <span style="font-size: 64px;">${emoji}</span>
    </div>
    <h2 style="font-family: 'Bangers', Arial, sans-serif; font-size: 32px; margin-top: 0; color: ${colors.badgeColor}; text-align: center; text-shadow: 2px 2px 0 #000;">
      ${placementText}
    </h2>
    <p style="font-size: 18px; line-height: 1.5; margin: 20px 0; text-align: center;">
      Herzlichen Glückwunsch,<br/> 
      <strong>${displayName}</strong>!
    </p>
    <table cellpadding="0" cellspacing="0" style="margin: 25px auto; width: 100%; max-width: 400px;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.1); border: 2px solid ${colors.badgeColor}; border-radius: 12px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #cccccc;">Deine Gesamtwertung</p>
          <p style="margin: 0; font-size: 36px; font-weight: 600; color: ${colors.badgeColor}; font-family: 'Bangers', Arial, sans-serif;">${data.totalScore.toFixed(2)}/5</p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #999999;">Du hast den ${data.placement}. Platz unter ${data.totalParticipants} Teilnehmer*innen erreicht!</p>
          <p style="margin: 12px 0 0 0; font-size: 11px; color: #888888;">${data.totalVoters} Zuschauer*innen und ${data.totalJurors} Jurymitglieder haben abgestimmt</p>
        </td>
      </tr>
    </table>
    <div style="background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 20px; margin: 25px 0;">
      <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #ffffff; font-style: italic;">
        "${data.personalizedText}"
      </p>
    </div>
    <p style="font-size: 16px; line-height: 1.5; margin: 25px 0 0 0; text-align: center;">
      Mega geil, dass du dabei warst!<br/>
      Danke Danke Danke!<br/>
      David 🫶<br/>
    </p>
  `

	// Custom base template with dynamic colors for certificate
	const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Zertifikat - ${appName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background}; font-family: 'Fredoka', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-image: radial-gradient(${colors.backgroundPattern} 1.2px, transparent 1.2px); background-size: 12px 12px;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="font-family: 'Bangers', Arial, sans-serif; font-size: 48px; color: ${colors.badgeColor}; margin: 0; text-shadow: 3px 3px 0 #000;">${appName}</h1>
              <p style="font-family: 'Fredoka', Arial, sans-serif; font-size: 18px; color: #ffffff; margin: 10px 0 0 0;">Urkunde</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #5e0e79; border: 2px solid #333; border-radius: 10px; box-shadow: 4px 4px 0 #2a0436; padding: 30px; color: white;">
              ${content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 30px; color: ${colors.copyrightColor}; font-size: 12px;">
              &copy; 2025 David Weppler
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

	return {
		subject: `Deine ${appName} Urkunde - ${placementText}`,
		html
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
      Sorry :-( Ich drück die Daumen für deine nächste Wahl!<br/><br/>
    </p>
  `

	return {
		subject: `Song abgelehnt: ${data.artist} - ${data.songTitle}`,
		html: baseTemplate('Song abgelehnt', content, data.appName || DEFAULT_APP_NAME)
	}
}
