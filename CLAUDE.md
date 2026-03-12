# Ironforge — Claude Instructions

## Käyttäjä
- Aloittelija, joka ei osaa koodata itsenäisesti
- Tavoite: ammattimainen, tuotantovalmis PWA avustettuna
- Haluaa oppia samalla kun edetään

## Miten toimin

### Selitän aina
- Kerro MITÄ teen ja MIKSI — älä vain tee
- Jos teen arkkitehtuuripäätöksen, perustele se lyhyesti
- Jos jokin käytäntö on "hyvää koodausta", sano se ääneen

### Kysy ennen isoja muutoksia
- Jos muutos koskee useampaa kuin 2-3 tiedostoa, kysy ensin
- Jos olen epävarma mitä käyttäjä haluaa, kysy — älä arvaa
- Ehdota vaihtoehtoja kun niitä on

### Opeta samalla
- Huomauta jos pyyntö voisi aiheuttaa ongelmia pitkällä tähtäimellä
- Selitä testauksen merkitys kun se on relevanttia
- Nosta esiin hyviä käytäntöjä (nimeäminen, rakenne, turvallisuus) lyhyesti

### Älä aliarvioi
- Tee oikeaoppisia ratkaisuja, ei "se toimii kyllä näinkin" -pikakorjauksia
- Tuotantovalmis tarkoittaa: toimii offline, on testattu, ei kaadu reunatapauksissa

### Päivitä nämä ohjeet
- Kun teemme päätöksen joka vaikuttaa tuleviin sessioihin, lisää se tähän tiedostoon
- Esimerkki: "päätetty käyttää X-pattern Y-ongelmaan" → lisää kohtaan Päätökset

---

## Projekti

PWA workout tracking app. Pure vanilla JS/HTML/CSS — ei frameworkkeja, ei build-työkaluja, ei TypeScriptiä.

### Stack
- Vanilla JS, HTML, CSS
- localStorage + Supabase cloud sync
- Service worker (sw.js) offline/PWA-tuki
- Playwright e2e-testit

### Tiedostorakenne
- `app.js` (~900 riviä) — kaikki sovelluslogiikka
- `index.html` — single page, 4 näkymää: dashboard/log/history/settings
- `styles.css` — kaikki tyylit, CSS-muuttujat
- `programs/*.js` — treeniohjelma-pluginit (forge, wendler531, stronglifts5x5)
- `core/` — jaetut apukirjastot

### UI-säännöt
- Sheet-modaalit kaikille overlayeille — ei native dialog-elementtejä
- Toast-ilmoitukset `showToast()`-funktiolla — ei `alert()`-kutsuja
- Bottom nav: 4 välilehteä (dashboard/log/history/settings)
- CSS-muuttujat `styles.css`:stä kaikille väreille ja spacingille

### Ohjelma-plugin-rajapinta
Ohjelmat rekisteröityvät `registerProgram(p)`:llä. Pakollinen rajapinta:
`id, name, getInitialState(), getSessionOptions(), buildSession(), adjustAfterSession(), advanceState(), renderSettings(), saveSettings()`

### Tila
- `profile.activeProgram` — aktiivinen ohjelma-id
- `profile.programs[id]` — ohjelmakohtainen tila
- Apufunktiot: `getActiveProgram()`, `getActiveProgramState()`, `setProgramState(id, state)`

### Koodaussäännöt
- Ei frameworkkeja, ei build-steppejä, ei npm-paketteja tuotantokoodissa
- Pidä app.js-patternit yhtenäisinä — älä tuo uusia paradigmoja
- Kaikki painot kilogrammoina (kg)
- Testaa Playwrightilla: `npm test`

---

## Päätökset
*Tähän kirjataan tehdyt arkkitehtuuripäätökset sitä mukaan kun niitä syntyy.*

- **UI-modaalit**: sheet-pattern (ei native dialog) — yhtenäisyys ja mobiilikäyttökokemus
- **Ohjelmat**: plugin-arkkitehtuuri — helppo lisätä uusia ohjelmia ilman app.js-muutoksia
- **Testaus**: Playwright e2e — testataan kuin oikea käyttäjä, ei yksikkötestejä
