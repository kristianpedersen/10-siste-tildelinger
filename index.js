/*
Innholdsfortegnelse:
1. API-URL, NPM og Express
2. Søk
	2.1. Return. Funksjonsdefinisjoner nedenfor.
	2.2. Konverter fra norsk dato til JavaScript-dato
	2.3. Sorter: Nyeste først
	2.4. CAPS LOCK AS -> Caps Lock AS
	2.5. Gjør om til vanlig setning
		2.5.1. Hent relevante felter
		2.5.2. Formattering av feltene: Stor/liten forbokstav, mellomrom på tusenplass, osv.
		2.5.3. Konstruer setning fra data
*/

// 1. API-URL, NPM og Express
const url = "https://data.brreg.no/rofs/od/rofs/stottetildeling/search?language=nob&fylkesnr=3"
const app = require("express")()
const getJSON = require("bent")("json")

app.set("view engine", "pug")
app.get("/", async function renderPugTemplate(_, res) {
	res.render("index", { message: await getBrregData() })
})
app.listen(3000, () => console.log("http://localhost:3000"))

// 2. Søk
// API-et lar oss begrense søket etter dato, men de 10 siste tildelingene kan ha vært den siste uka, måneden, osv.
// For å være sikre henter vi bare ut alt, og sorterer dataene selv.
async function getBrregData() {
	const data = await getJSON(url)

	// 2.1 Return. Funksjonsdefinisjoner nedenfor.
	return data
		.map(convertStringToDate)
		.sort(newestFirst)
		.slice(0, 10)
		.map(createSentence)

	// 2.2. Konverter fra norsk dato til JavaScript-dato
	function convertStringToDate(entry) {
		const [day, month, year] = entry.tildelingsdato.split(".")
		return {
			...entry,
			tildelingsdato: new Date(`${month} ${day} ${year}`)
		}
	}

	// 2.3. Sorter: Nyeste først
	function newestFirst(a, b) {
		return b.tildelingsdato - a.tildelingsdato
	}

	// 2.4. CAPS LOCK AS -> Caps Lock AS
	// Følger eksemplet fra mailen, med stor forbokstav i hvert ord.
	// Egentlig burde det vel skrives "Norsk filminstitutt", med stor forbokstav i kun det første ordet.
	// https://www.korrekturavdelingen.no/forbokstav-stor-liten.htm#statlige
	function capitalizeString(string) {
		// Finnes sikkert en liste med slike akronymer et sted. Tok disse fra de 100 nyeste treffene.
		const ignoredTerms = ["AS", "NO", "AB", "SF", "SA", "ASA", "S.A.R.L."]

		return string
			.split(" ")
			.map(function capitalizeWord(word) {
				if (ignoredTerms.includes(word)) {
					return word
				} else {
					return word[0].toUpperCase() + word.slice(1).toLowerCase()
				}
			})
			.join(" ")
	}

	// 2.5. Gjør om til vanlig setning.
	function createSentence(entry, index) {
		// 2.5.1. Hent relevante felter.
		const {
			formaal,
			naeringBeskrivelse,
			stottegiverNavn,
			stottemottakerNavn,
			tildeltBelop,
		} = entry

		// 2.5.2. Formattering av feltene: Stor/liten forbokstav, mellomrom på tusenplass.
		// lowerCaseFirst brukes i tilfelle formålet inkluderer akronymer (eks. "støtte til SMB-er")
		const lowerCaseFirst = s => s[0].toLowerCase() + s.slice(1)
		const ID = index + 1
		const naering = lowerCaseFirst(naeringBeskrivelse)
		const stoetteTilFormaal = lowerCaseFirst(formaal)
		const stottegiver = capitalizeString(stottegiverNavn)
		const stottemottaker = capitalizeString(stottemottakerNavn)
		const sumNOK = new Intl.NumberFormat("NO").format(tildeltBelop) + " kroner"

		// 2.5.3. Konstruer setning fra data.
		return `
			${ID}: ${stottemottaker}, ${naering}, er tildelt ${sumNOK} som ${stoetteTilFormaal}. 
			Tildelingen skjer via ${stottegiver}.
		`
	}
}